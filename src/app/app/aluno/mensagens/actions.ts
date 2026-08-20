"use server";

import { revalidatePath } from "next/cache";
import { requireClient } from "@/lib/studio/auth";
import { markThreadRead, sendMessage } from "@/lib/studio/coaching";
import type { ComposerState } from "@/components/studio/chat/Composer";
import { MAX_MESSAGE_LENGTH } from "@/components/studio/chat/Composer";

/** Send a message from the client to Sara. One thread per client — no id to bind. */
export async function send(_prev: ComposerState, formData: FormData): Promise<ComposerState> {
  const client = await requireClient();

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { ok: false, error: "required" };
  if (body.length > MAX_MESSAGE_LENGTH) return { ok: false, error: "tooLong" };

  sendMessage({ clientId: client.id, authorId: client.id, body });
  revalidatePath("/app/aluno/mensagens");
  return { ok: true };
}

/** See `MarkThreadRead` for why this runs from a client effect, never during render. */
export async function markThreadReadAction(): Promise<void> {
  const client = await requireClient();
  markThreadRead(client.id, client.id);
  revalidatePath("/app/aluno/mensagens");
}
