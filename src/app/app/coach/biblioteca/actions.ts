"use server";

import { revalidatePath } from "next/cache";
import { requireCoach } from "@/lib/studio/auth";
import { archiveExercise, createExercise, updateExercise } from "@/lib/studio/library";
import { store } from "@/lib/studio/media";
import type { Tracking } from "@/lib/studio/types";

/**
 * Server actions for Sara's own exercise library. Every export starts with
 * `requireCoach()` — the library is coach-authored, never client-editable.
 */

const LIBRARY_PATH = "/app/coach/biblioteca";

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
  return { status: "ok" };
}

export async function archiveExerciseAction(exerciseId: string): Promise<void> {
  await requireCoach();
  archiveExercise(exerciseId);
  revalidatePath(LIBRARY_PATH);
}
