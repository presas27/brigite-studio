import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ClientTabs, type ClientTab } from "@/components/studio/coach/ClientTabs";
import { EditClientModal } from "@/components/studio/coach/EditClientModal";
import { PageHeader } from "@/components/studio/PageHeader";
import { requireClientAccess } from "@/lib/studio/auth";
import { listCheckins, listSubmissions, unreadCount } from "@/lib/studio/coaching";

/**
 * The client page. One masthead, one tab strip, and a panel that swaps —
 * plan, check-ins, messages and videos are segments of this route rather than
 * destinations of their own, so Sara never loses the person she is working on.
 *
 * The masthead is deliberately thin: a back arrow cut to the weight of the
 * name beside it, and the name. Everything administrative — plan, credits,
 * status, the invite link — sits behind the profile control on the right.
 */
export default async function ClientLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const { viewer, client } = await requireClientAccess(clientId);
  if (viewer.role !== "coach") redirect("/app/aluno");

  const t = await getTranslations("Studio.clients");

  const base = `/app/coach/alunos/${client.id}`;
  const tabs: ClientTab[] = [
    { href: base, label: t("tab.overview") },
    { href: `${base}/plano`, label: t("tab.plan") },
    {
      href: `${base}/checkins`,
      label: t("tab.checkins"),
      badge: listCheckins(client.id).filter((checkin) => checkin.repliedAt == null).length,
    },
    { href: `${base}/progresso`, label: t("tab.progresso") },
    {
      href: `${base}/mensagens`,
      label: t("tab.messages"),
      badge: unreadCount(client.id, viewer.id),
    },
    {
      href: `${base}/videos`,
      label: t("tab.videos"),
      badge: listSubmissions({ clientId: client.id, status: "pending" }).length,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/app/coach/alunos"
        title={client.name}
        action={<EditClientModal client={client} />}
      />

      <ClientTabs tabs={tabs} label={client.name} />

      <div className="pt-2">{children}</div>
    </div>
  );
}
