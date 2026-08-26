"use server";

import { revalidatePath } from "next/cache";
import { requireCoach } from "@/lib/studio/auth";
import { replyToCheckin } from "@/lib/studio/coaching";

/**
 * Sara's reply to one client's check-in, from the studio-wide board. Unlike
 * the per-client action, `clientId` is not in scope here — the form carries
 * `checkinId` directly instead of relying on a bound argument.
 */
export async function reply(formData: FormData): Promise<void> {
  await requireCoach();

  const checkinId = String(formData.get("checkinId") ?? "");
  const text = String(formData.get("reply") ?? "").trim();
  if (!checkinId || !text) return;

  await replyToCheckin(checkinId, text);
  revalidatePath("/app/coach/checkins");
  revalidatePath("/app/coach");
}
