"use server";

import { revalidatePath } from "next/cache";
import { requireCoach } from "@/lib/studio/auth";
import { addReviewComment, finishReview, removeReviewComment } from "@/lib/studio/coaching";
import type { Verdict } from "@/lib/studio/types";

/**
 * Every view that surfaces a submission's state: the review page itself, the
 * queue it sits in, the coach's "Hoje" console (submission alerts), and the
 * client's own list (reply and comments become visible there).
 */
function revalidateReview(submissionId: string): void {
  revalidatePath(`/app/coach/videos/${submissionId}`);
  revalidatePath("/app/coach/videos");
  revalidatePath("/app/coach");
  revalidatePath("/app/aluno/videos");
}

/** Pin a comment to the frame currently open in the review player. */
export async function addComment(submissionId: string, tMs: number, body: string): Promise<void> {
  await requireCoach();
  const trimmed = body.trim();
  if (!trimmed) return;
  addReviewComment(submissionId, tMs, trimmed);
  revalidateReview(submissionId);
}

export async function deleteComment(commentId: string, submissionId: string): Promise<void> {
  await requireCoach();
  removeReviewComment(commentId);
  revalidateReview(submissionId);
}

/** Close the review: overall verdict plus the message the client will read. */
export async function finish(submissionId: string, verdict: Verdict, reply: string): Promise<void> {
  await requireCoach();
  finishReview(submissionId, verdict, reply.trim());
  revalidateReview(submissionId);
}
