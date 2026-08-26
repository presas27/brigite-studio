import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { markThreadReadAction, send } from "@/app/app/coach/mensagens/actions";
import { Composer } from "@/components/studio/chat/Composer";
import { MarkThreadRead } from "@/components/studio/chat/MarkThreadRead";
import { MessageThread } from "@/components/studio/chat/MessageThread";
import { Empty } from "@/components/studio/Empty";
import { surface } from "@/components/studio/theme";
import { requireClientAccess } from "@/lib/studio/auth";
import { messagesFor } from "@/lib/studio/coaching";
import { cn } from "@/lib/utils";

/**
 * Messages tab. The inbox at /app/coach/mensagens still lists every thread —
 * it just hands off to here, so a thread always opens with the client's plan
 * and history one tab away.
 */
export default async function ClientMessagesPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const { viewer, client } = await requireClientAccess(clientId);
  if (viewer.role !== "coach") redirect("/app/aluno/mensagens");

  const [t, locale, messages] = await Promise.all([
    getTranslations("Studio.messages"),
    getLocale(),
    messagesFor(clientId),
  ]);

  return (
    <>
      <div className={cn(surface, "p-4 sm:p-6")}>
        {messages.length === 0 ? (
          <Empty title={t("empty")} hint={t("emptyHint")} />
        ) : (
          <MessageThread
            messages={messages}
            meId={viewer.id}
            meLabel={t("you")}
            otherLabel={client.name.split(" ")[0] || client.name}
            locale={locale}
          />
        )}
        <div className="mt-6 border-t border-cream/10 pt-4">
          <Composer action={send.bind(null, clientId)} />
        </div>
      </div>
      <MarkThreadRead action={markThreadReadAction.bind(null, clientId)} />
    </>
  );
}
