import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { LiveThread } from "@/components/studio/chat/LiveThread";
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
    <div className={cn(surface, "p-4 sm:p-6")}>
      <LiveThread
        clientId={clientId}
        meId={viewer.id}
        meLabel={t("you")}
        otherLabel={client.name.split(" ")[0] || client.name}
        locale={locale}
        initialMessages={messages}
      />
    </div>
  );
}
