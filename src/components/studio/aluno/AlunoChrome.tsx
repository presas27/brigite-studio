"use client";

import { StudioChrome, type ChromeSection } from "@/components/studio/chrome/StudioChrome";
import type { ClientAlert } from "@/lib/studio/clientConsole";
import type { ThemeMode } from "@/lib/studio/theme-mode";
import { AlunoNotifications } from "./AlunoNotifications";

/**
 * The rail in three runs, in the order an aluna's attention moves: where she
 * lands, the training itself, the loop with Sara, and then the numbers.
 *
 * Progress sits last on purpose. Records and charts are the part you visit on
 * a Sunday; putting them level with today's session would make the app look
 * like a dashboard, and an aluna opening it mid-warm-up needs a workout, not a
 * dashboard.
 */
const SECTIONS: ChromeSection[] = [
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
      { href: "/app/aluno/mensagens", labelKey: "messages", icon: "message", urgentBadge: true },
    ],
  },
  {
    titleKey: "sections.progress",
    items: [{ href: "/app/aluno/evolucao", labelKey: "evolucao", icon: "trend" }],
  },
];

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
  children: React.ReactNode;
}) {
  return (
    <StudioChrome
      role="client"
      homeHref="/app/aluno"
      sections={SECTIONS}
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
