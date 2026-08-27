"use server";

import { refresh } from "next/cache";
import { requireClientAccess, requireCoach } from "@/lib/studio/auth";
import { markThreadRead, sendMessage } from "@/lib/studio/coaching";
import type { ComposerState } from "@/components/studio/chat/Composer";
import { MAX_MESSAGE_LENGTH } from "@/components/studio/chat/Composer";

/**
 * Send a message from Sara to one client's thread. `clientId` arrives bound
 * via `send.bind(null, clientId)` from the thread page, so the composer form
 * itself carries no client-identifying field.
 */
export async function send(
  clientId: string,
  _prev: ComposerState,
  formData: FormData,
): Promise<ComposerState> {
  await requireCoach();
  await requireClientAccess(clientId);

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { ok: false, error: "required" };
  if (body.length > MAX_MESSAGE_LENGTH) return { ok: false, error: "tooLong" };

  await sendMessage({ clientId, body });
  refresh();
  return { ok: true };
}

/** See `MarkThreadRead` for why this runs from a client effect, never during render. */
export async function markThreadReadAction(clientId: string): Promise<void> {
  await requireCoach();
  await requireClientAccess(clientId);
  await markThreadRead(clientId);
  refresh();
}
