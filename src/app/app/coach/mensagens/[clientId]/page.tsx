import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireClientAccess } from "@/lib/studio/auth";
import { messagesFor } from "@/lib/studio/coaching";
import { Empty } from "@/components/studio/Empty";
import { PageHeader } from "@/components/studio/PageHeader";
import { surface } from "@/components/studio/theme";
import { Composer } from "@/components/studio/chat/Composer";
import { MarkThreadRead } from "@/components/studio/chat/MarkThreadRead";
import { MessageThread } from "@/components/studio/chat/MessageThread";
import { cn } from "@/lib/utils";
import { markThreadReadAction, send } from "../actions";

export default async function CoachThreadPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const { viewer, client } = await requireClientAccess(clientId);
  // This route is Sara's console for one client's thread. `requireClientAccess`
  // already lets a client through for their own id, but that visit belongs on
  // their single-thread view instead.
  if (viewer.role !== "coach") redirect("/app/aluno/mensagens");

  const t = await getTranslations("Studio.messages");
  const locale = await getLocale();
  const messages = messagesFor(clientId);

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/app/coach/mensagens"
        backLabel={t("threadsTitle")}
        kicker={t("title")}
        title={client.name}
      />
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
    </div>
  );
}
