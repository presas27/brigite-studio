import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ClientTabs, type ClientTab } from "@/components/studio/coach/ClientTabs";
import { EditClientModal } from "@/components/studio/coach/EditClientModal";
import { PageHeader } from "@/components/studio/PageHeader";
import { requireClientAccess } from "@/lib/studio/auth";
import { listCheckins, unreadCount } from "@/lib/studio/coaching";

/**
 * The client page. One masthead, one tab strip, and a panel that swaps —
 * plan, check-ins and messages are segments of this route rather than
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
    { href: `${base}/treinos`, label: t("tab.sessions") },
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
  ];

  return (
    <div className="space-y-6">
      {/* Pinned band: the client's name and the tab strip stay put while the panel
          below scrolls, so Sara never loses the person she is working on.

          Two offsets, because there are two scrollers. Below `lg` the document scrolls
          and the topbar is sticky inside it, so this band clears it by the topbar's own
          height (`top-[65px]`, its `py-3` plus content). At `lg` and up `<main>` carries
          its own scrollbar (`lg:overflow-y-auto` in `StudioChrome`) and the topbar is
          outside it, so the offset is measured from `<main>`'s scrollport instead — and
          Chrome insets that rect by the scroller's own padding (`sm:py-8`, 2rem). Left at
          `top-0` the band pins 2rem low and the content scrolls through the gap in plain
          sight. `lg:-top-8` cancels the padding back out so it pins flush under the
          topbar, while `lg:-mt-8 lg:pt-8` moves that same 2rem inside the band — the
          name keeps its air and the background now covers the gap, pinned or not.

          Bled to the edges with negative margins so the band spans the full content
          width, exactly like the topbar above it, then padded back in to line the content
          up. Fully opaque: this sits directly over scrolling cards, and at that overlap
          even a 5% see-through reads as ghosted text. */}
      <div className="sticky top-[65px] z-10 -mx-4 space-y-4 bg-background px-4 pb-px sm:-mx-6 sm:px-6 lg:-top-8 lg:-mt-8 lg:pt-8">
        <PageHeader
          backHref="/app/coach/alunos"
          title={client.name}
          action={<EditClientModal client={client} />}
        />

        <ClientTabs tabs={tabs} label={client.name} />
      </div>

      <div className="pt-2">{children}</div>
    </div>
  );
}
