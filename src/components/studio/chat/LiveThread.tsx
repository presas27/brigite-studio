"use client";

import { useCallback } from "react";
import { useMutation, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Empty } from "@/components/studio/Empty";
import type { Message } from "@/lib/studio/types";
import { Composer, MAX_MESSAGE_LENGTH, type ComposerState } from "./Composer";
import { MarkThreadRead } from "./MarkThreadRead";
import { MessageThread } from "./MessageThread";

/**
 * The 1:1 thread, subscribed.
 *
 * The page still renders the messages it already had so the first paint is
 * not a blank panel; `useQuery` takes over the moment the socket has a
 * newer answer, which is how a message the other side just sent appears
 * without anyone hitting reload.
 */
export function LiveThread({
  clientId,
  meId,
  meLabel,
  otherLabel,
  locale,
  initialMessages,
}: {
  clientId: string;
  meId: string;
  meLabel: string;
  otherLabel: string;
  locale: string;
  initialMessages: Message[];
}) {
  const t = useTranslations("Studio.messages");
  const id = clientId as Id<"users">;
  const messages = useQuery(api.coaching.messagesFor, { clientId: id }) ?? initialMessages;
  const send = useMutation(api.coaching.sendMessage);
  const markRead = useMutation(api.coaching.markThreadRead);

  const sendAction = useCallback(
    async (_prev: ComposerState, formData: FormData): Promise<ComposerState> => {
      const body = String(formData.get("body") ?? "").trim();
      if (!body) return { ok: false, error: "required" };
      if (body.length > MAX_MESSAGE_LENGTH) return { ok: false, error: "tooLong" };
      await send({ clientId: id, body });
      return { ok: true };
    },
    [send, id],
  );

  return (
    <>
      {messages.length === 0 ? (
        <Empty title={t("empty")} hint={t("emptyHint")} />
      ) : (
        <MessageThread
          messages={messages}
          meId={meId}
          meLabel={meLabel}
          otherLabel={otherLabel}
          locale={locale}
        />
      )}
      <div className="mt-6 border-t border-cream/10 pt-4">
        <Composer action={sendAction} />
      </div>
      <MarkThreadRead action={() => markRead({ clientId: id })} />
    </>
  );
}
