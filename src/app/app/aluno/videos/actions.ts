"use server";

import { revalidatePath } from "next/cache";
import { requireClient } from "@/lib/studio/auth";
import { createSubmission } from "@/lib/studio/coaching";
import { findExercise } from "@/lib/studio/library";
import { store } from "@/lib/studio/media";
import { findAssignment } from "@/lib/studio/plan";

export type SubmitVideoState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; code: "noFile" | "fileType" | "fileSize" | "generic" };

/**
 * Send a technique clip for review — either an uploaded file or a link the
 * client already has somewhere else (YouTube, Drive). Exactly one of the two
 * is required.
 */
export async function submitVideo(
  _prev: SubmitVideoState,
  formData: FormData,
): Promise<SubmitVideoState> {
  const client = await requireClient();

  const fileEntry = formData.get("file");
  const file = fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : null;
  const videoUrl = String(formData.get("videoUrl") ?? "").trim();
  if (!file && !videoUrl) return { status: "error", code: "noFile" };

  const exerciseId = String(formData.get("exerciseId") ?? "").trim() || null;
  const exercise = exerciseId ? findExercise(exerciseId) : undefined;

  const rawAssignmentId = String(formData.get("assignmentId") ?? "").trim() || null;
  const assignment = rawAssignmentId ? findAssignment(rawAssignmentId) : undefined;
  const assignmentId = assignment?.clientId === client.id ? rawAssignmentId : null;

  const note = String(formData.get("note") ?? "").trim();

  let mediaId: string | null = null;
  if (file) {
    const result = await store({ ownerId: client.id, file });
    if (!result.ok) {
      const code = result.reason === "type" ? "fileType" : result.reason === "size" ? "fileSize" : "noFile";
      return { status: "error", code };
    }
    mediaId = result.mediaId;
  }

  createSubmission({
    clientId: client.id,
    assignmentId,
    exerciseId: exercise?.id ?? null,
    mediaId,
    videoUrl: file ? null : videoUrl,
    note,
  });

  revalidatePath("/app/aluno/videos");
  revalidatePath("/app/coach/videos");
  revalidatePath("/app/coach");
  return { status: "success" };
}
