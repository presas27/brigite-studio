import { getLocale, getTranslations } from "next-intl/server";
import { requireClient } from "@/lib/studio/auth";
import { messagesFor } from "@/lib/studio/coaching";
import { Empty } from "@/components/studio/Empty";
import { PageHeader } from "@/components/studio/PageHeader";
import { surface } from "@/components/studio/theme";
import { Composer } from "@/components/studio/chat/Composer";
import { MarkThreadRead } from "@/components/studio/chat/MarkThreadRead";
import { MessageThread } from "@/components/studio/chat/MessageThread";
import { cn } from "@/lib/utils";
import { markThreadReadAction, send } from "./actions";

/** A client has exactly one conversation — with Sara — so there is no thread list. */
export default async function ClientMessagesPage() {
  const client = await requireClient();
  const t = await getTranslations("Studio.messages");
  const locale = await getLocale();
  const messages = messagesFor(client.id);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} />
      <div className={cn(surface, "p-4 sm:p-6")}>
        {messages.length === 0 ? (
          <Empty title={t("empty")} hint={t("emptyHint")} />
        ) : (
          <MessageThread
            messages={messages}
            meId={client.id}
            meLabel={t("you")}
            otherLabel={t("coach")}
            locale={locale}
          />
        )}
        <div className="mt-6 border-t border-cream/10 pt-4">
          <Composer action={send} />
        </div>
      </div>
      <MarkThreadRead action={markThreadReadAction} />
    </div>
  );
}
