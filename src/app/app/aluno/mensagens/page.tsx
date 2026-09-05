import { getLocale, getTranslations } from "next-intl/server";
import { requireClient } from "@/lib/studio/auth";
import { messagesFor } from "@/lib/studio/coaching";
import { myCoach } from "@/lib/studio/users";
import { PageHeader } from "@/components/studio/PageHeader";
import { LiveThread } from "@/components/studio/chat/LiveThread";
import { surface } from "@/components/studio/theme";
import { cn } from "@/lib/utils";

/** A client has exactly one conversation — with their coach — so there is no thread list. */
export default async function ClientMessagesPage() {
  const client = await requireClient();
  const t = await getTranslations("Studio.messages");
  const locale = await getLocale();
  const [messages, coach] = await Promise.all([messagesFor(client.id), myCoach()]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} lead={t("clientLead")} />
      <div className={cn(surface, "p-4 sm:p-6")}>
        <LiveThread
          clientId={client.id}
          meId={client.id}
          meLabel={t("you")}
          otherLabel={coach?.name.split(" ")[0] || t("coach")}
          locale={locale}
          initialMessages={messages}
        />
      </div>
    </div>
  );
}
