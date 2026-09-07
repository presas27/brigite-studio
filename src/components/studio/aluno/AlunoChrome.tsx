"use client";

import Link from "next/link";
import { useAuthedQuery } from "@/components/studio/useAuthedQuery";
import { useTranslations } from "next-intl";
import { StudioChrome, type ChromeSection } from "@/components/studio/chrome/StudioChrome";
import { buttonPrimary } from "@/components/studio/theme";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { ClientChrome } from "@/lib/studio/clientConsole";
import type { ThemeMode } from "@/lib/studio/theme-mode";
import { cn } from "@/lib/utils";
import { AlunoDock } from "./AlunoDock";
import { AlunoNotifications } from "./AlunoNotifications";

/**
 * The rail in three runs, in the order an aluna's attention moves: where she
 * lands, the training itself, the loop with the coach, and then the numbers.
 *
 * Progress sits last on purpose. Records and charts are the part you visit on
 * a Sunday; putting them level with today's session would make the app look
 * like a dashboard, and an aluna opening it mid-warm-up needs a workout, not a
 * dashboard.
 *
 * Someone training alone has nobody to message, so that item is not offered
 * to them; the check-in stays, because a weekly reading of energy, sleep and
 * weight is theirs whether or not anyone replies.
 */
function sections(solo: boolean): ChromeSection[] {
  return [
    { items: [{ href: "/app/aluno", labelKey: "today", icon: "overview" }] },
    {
      titleKey: "sections.training",
      items: [
        { href: "/app/aluno/plano", labelKey: "plan", icon: "calendar" },
        { href: "/app/aluno/treinos", labelKey: "workouts", icon: "squat" },
      ],
    },
    {
      titleKey: "sections.coaching",
      items: [
        { href: "/app/aluno/checkin", labelKey: "checkin", icon: "checkin" },
        ...(solo
          ? []
          : [{ href: "/app/aluno/mensagens", labelKey: "messages", icon: "message", urgentBadge: true } as const]),
      ],
    },
    {
      titleKey: "sections.progress",
      items: [{ href: "/app/aluno/evolucao", labelKey: "evolucao", icon: "trend" }],
    },
  ];
}

/**
 * Aluna navigation. Same frame as the coach's on a laptop; on a phone the rail
 * and topbar give way to a floating glass dock — one-handed, between sets.
 */
export function AlunoChrome({
  clientId,
  name,
  email,
  themeMode,
  initialChrome,
  solo,
  children,
}: {
  clientId: string;
  name: string;
  email: string;
  themeMode: ThemeMode;
  initialChrome: ClientChrome;
  /** Training with no coach: no thread to open. */
  solo: boolean;
  children: React.ReactNode;
}) {
  const t = useTranslations("Studio.session");
  const live = useAuthedQuery(api.plan.clientChrome, { clientId: clientId as Id<"users"> });
  const chrome = live ?? initialChrome;

  const badges: Record<string, number> = {};
  if (chrome.unread > 0) badges["/app/aluno/mensagens"] = chrome.unread;
  if (chrome.checkinPending) badges["/app/aluno/checkin"] = 1;

  const session =
    chrome.today.find((assignment) => assignment.status === "scheduled") ?? chrome.next;
  const nav = sections(solo);
  return (
    <StudioChrome
      role="client"
      homeHref="/app/aluno"
      sections={nav}
      name={name}
      email={email}
      themeMode={themeMode}
      badges={badges}
      mobileChrome="dock"
      mobileDock={
        <AlunoDock
          items={nav.flatMap((section) => section.items)}
          badges={badges}
          name={name}
          alerts={chrome.alerts}
          session={
            session
              ? {
                  href: `/app/aluno/treino/${session.id}`,
                  label: session.startedAt ? t("resume") : t("start"),
                }
              : null
          }
        />
      }
      actions={
        session && (
          <Link
            href={`/app/aluno/treino/${session.id}`}
            className={cn(buttonPrimary, "whitespace-nowrap px-5 py-2.5 text-xs")}
          >
            {session.startedAt ? t("resume") : t("start")}
          </Link>
        )
      }
      notifications={<AlunoNotifications alerts={chrome.alerts} />}
    >
      {children}
    </StudioChrome>
  );
}
