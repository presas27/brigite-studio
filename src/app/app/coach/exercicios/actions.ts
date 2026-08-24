"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCoach } from "@/lib/studio/auth";
import { archiveExercise, createExercise, updateExercise } from "@/lib/studio/library";
import { store } from "@/lib/studio/media";
import type { Tracking } from "@/lib/studio/types";

/**
 * Server actions for Sara's own exercise library. Every export starts with
 * `requireCoach()` — the library is coach-authored, never client-editable.
 */

const LIBRARY_PATH = "/app/coach/exercicios";

export type ExerciseFormState =
  | { status: "idle" }
  | { status: "ok" }
  | { status: "error"; reason: "required" | "fileType" | "fileSize" | "noFile" };

/** `store()`'s reasons, in the same order, mapped onto `Studio.errors` keys. */
const STORE_REASON: Record<"type" | "size" | "empty", ExerciseFormState & { status: "error" }> = {
  type: { status: "error", reason: "fileType" },
  size: { status: "error", reason: "fileSize" },
  empty: { status: "error", reason: "noFile" },
};

function parseTags(raw: FormDataEntryValue | null): string[] {
  return String(raw ?? "")
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}

/** Uploads the file field when one was actually chosen. `undefined` mediaId means "unchanged". */
async function resolveMedia(
  coachId: string,
  formData: FormData,
): Promise<{ ok: true; mediaId?: string } | { ok: false; state: ExerciseFormState }> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.name === "") return { ok: true };

  const result = await store({ ownerId: coachId, file });
  if (!result.ok) return { ok: false, state: STORE_REASON[result.reason] };
  return { ok: true, mediaId: result.mediaId };
}

export async function createExerciseAction(
  _prev: ExerciseFormState,
  formData: FormData,
): Promise<ExerciseFormState> {
  const coach = await requireCoach();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { status: "error", reason: "required" };

  const media = await resolveMedia(coach.id, formData);
  if (!media.ok) return media.state;

  createExercise({
    name,
    cues: String(formData.get("cues") ?? ""),
    tags: parseTags(formData.get("tags")),
    tracking: String(formData.get("tracking") ?? "reps") as Tracking,
    videoUrl: String(formData.get("videoUrl") ?? "").trim() || null,
    mediaId: media.mediaId ?? null,
  });

  revalidatePath(LIBRARY_PATH);
  return { status: "ok" };
}

export async function updateExerciseAction(
  exerciseId: string,
  _prev: ExerciseFormState,
  formData: FormData,
): Promise<ExerciseFormState> {
  const coach = await requireCoach();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { status: "error", reason: "required" };

  const media = await resolveMedia(coach.id, formData);
  if (!media.ok) return media.state;

  updateExercise(exerciseId, {
    name,
    cues: String(formData.get("cues") ?? ""),
    tags: parseTags(formData.get("tags")),
    tracking: String(formData.get("tracking") ?? "reps") as Tracking,
    videoUrl: String(formData.get("videoUrl") ?? "").trim() || null,
    // Only touch mediaId when a new upload actually landed — otherwise a save
    // with no file re-selected would wipe the exercise's existing demo.
    ...(media.mediaId ? { mediaId: media.mediaId } : {}),
  });

  revalidatePath(LIBRARY_PATH);
  revalidatePath(`${LIBRARY_PATH}/${exerciseId}`);
  return { status: "ok" };
}

/**
 * Archiving happens from the exercise's own page, and that page is exactly what
 * stops existing — so it ends on the library rather than on a row that is no
 * longer listed.
 */
export async function archiveExerciseAction(exerciseId: string): Promise<void> {
  await requireCoach();
  archiveExercise(exerciseId);
  revalidatePath(LIBRARY_PATH);
  redirect(LIBRARY_PATH);
}

/**
 * State for the exercise page's inline editors (cues, tags, video link). Each
 * saves one field, so none of `ExerciseFormState`'s upload failures apply, and
 * the only thing that can be refused is a video link that is not usable as one
 * — cues and tags are legitimately empty.
 */
export type FieldState = { status: "idle" } | { status: "ok" } | { status: "error"; reason: "url" };

export async function saveCuesAction(
  exerciseId: string,
  _prev: FieldState,
  formData: FormData,
): Promise<FieldState> {
  await requireCoach();

  // Cues are one per line; a stray blank line from trimming or pasting is
  // noise, not content, so it's dropped rather than preserved as an empty cue.
  updateExercise(exerciseId, {
    cues: String(formData.get("cues") ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n"),
    cuesEn: String(formData.get("cuesEn") ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n"),
  });

  revalidatePath(LIBRARY_PATH);
  revalidatePath(`${LIBRARY_PATH}/${exerciseId}`);
  return { status: "ok" };
}

export async function saveTagsAction(
  exerciseId: string,
  _prev: FieldState,
  formData: FormData,
): Promise<FieldState> {
  await requireCoach();

  // The client posts the full tag list on every save, so a duplicate here
  // means the same tag was added twice client-side, not two distinct tags.
  const tags = [...new Set(parseTags(formData.get("tags")))];

  updateExercise(exerciseId, { tags });

  revalidatePath(LIBRARY_PATH);
  revalidatePath(`${LIBRARY_PATH}/${exerciseId}`);
  return { status: "ok" };
}

export async function saveVideoUrlAction(
  exerciseId: string,
  _prev: FieldState,
  formData: FormData,
): Promise<FieldState> {
  await requireCoach();
  const videoUrl = String(formData.get("videoUrl") ?? "").trim();

  if (!videoUrl) {
    updateExercise(exerciseId, { videoUrl: null });
    revalidatePath(LIBRARY_PATH);
    revalidatePath(`${LIBRARY_PATH}/${exerciseId}`);
    return { status: "ok" };
  }

  // Protocol check, not a YouTube-shaped regex: the panel embeds YouTube
  // links but a link to anything else is still a valid demo to share, while
  // a `javascript:` string rendered into an anchor's href is not.
  try {
    const parsed = new URL(videoUrl);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return { status: "error", reason: "url" };
    }
  } catch {
    return { status: "error", reason: "url" };
  }

  updateExercise(exerciseId, { videoUrl });
  revalidatePath(LIBRARY_PATH);
  revalidatePath(`${LIBRARY_PATH}/${exerciseId}`);
  return { status: "ok" };
}
