"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireClientAccess } from "@/lib/studio/auth";
import { replyToCheckin } from "@/lib/studio/coaching";

function checkinsPath(clientId: string): string {
  return `/app/coach/alunos/${clientId}/checkins`;
}

/** Sara's reply to one week's check-in. Redirects with the id so the page can flash `checkin.replySent`. */
export async function reply(clientId: string, checkinId: string, formData: FormData): Promise<void> {
  const { viewer } = await requireClientAccess(clientId);
  if (viewer.role !== "coach") redirect("/app/aluno");

  const text = String(formData.get("reply") ?? "").trim();
  if (!text) return;

  replyToCheckin(checkinId, text);
  revalidatePath(checkinsPath(clientId));
  redirect(`${checkinsPath(clientId)}?respondido=${checkinId}`);
}
