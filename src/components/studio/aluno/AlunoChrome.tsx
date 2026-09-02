"use client";

import { StudioChrome, type ChromeSection } from "@/components/studio/chrome/StudioChrome";
import type { ClientAlert } from "@/lib/studio/clientConsole";
import type { ThemeMode } from "@/lib/studio/theme-mode";
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
        { href: "/app/aluno/treinos", labelKey: "workouts", icon: "dumbbell" },
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
 * Aluna navigation. Same frame as the coach's — one app, one way of moving
 * through it — with her own eight destinations and her own bell.
 *
 * The rail collapses to icons on a laptop and becomes a drawer on a phone,
 * which is the shape that matters here: most of these screens get opened
 * between sets, one-handed.
 */
export function AlunoChrome({
  name,
  email,
  themeMode,
  badges,
  alerts,
  quickAction,
  solo,
  children,
}: {
  name: string;
  email: string;
  themeMode: ThemeMode;
  /** Counts keyed by href — rendered as a caramel pip on the nav item. */
  badges: Record<string, number>;
  /** Feeds the bell — the same list as the landing screen's "Para ti" panel. */
  alerts: ClientAlert[];
  /** The topbar's primary control: start or resume today's session. */
  quickAction?: React.ReactNode;
  /** Training with no coach: no thread to open. */
  solo: boolean;
  children: React.ReactNode;
}) {
  return (
    <StudioChrome
      role="client"
      homeHref="/app/aluno"
      sections={sections(solo)}
      name={name}
      email={email}
      themeMode={themeMode}
      badges={badges}
      actions={quickAction}
      notifications={<AlunoNotifications alerts={alerts} />}
    >
      {children}
    </StudioChrome>
  );
}
