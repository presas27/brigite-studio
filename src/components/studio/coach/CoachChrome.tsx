"use client";

import { StudioChrome, type ChromeSection } from "@/components/studio/chrome/StudioChrome";
import type { ThemeMode } from "@/lib/studio/theme-mode";
import type { CoachAlert } from "@/lib/studio/types";
import { NotificationsMenu } from "./NotificationsMenu";

/**
 * The rail in four runs, in the order Sara's attention actually moves:
 * where she lands, the people she already trains, the material she builds
 * from, and the business around it.
 *
 * Leads sit in their own run on purpose. Someone who filled in a form is not
 * an aluna and should not read as one — putting the two side by side made the
 * rail claim a relationship that does not exist yet.
 */
const SECTIONS: ChromeSection[] = [
  { items: [{ href: "/app/coach", labelKey: "overview", icon: "overview" }] },
  {
    titleKey: "sections.coaching",
    items: [
      { href: "/app/coach/alunos", labelKey: "clients", icon: "clients" },
      { href: "/app/coach/calendario", labelKey: "calendar", icon: "calendar" },
      { href: "/app/coach/checkins", labelKey: "checkin", icon: "checkin" },
      { href: "/app/coach/videos", labelKey: "videos", icon: "video" },
      { href: "/app/coach/mensagens", labelKey: "messages", icon: "message", urgentBadge: true },
    ],
  },
  {
    titleKey: "sections.library",
    items: [
      { href: "/app/coach/treinos", labelKey: "workouts", icon: "library" },
      { href: "/app/coach/exercicios", labelKey: "exercises", icon: "dumbbell" },
    ],
  },
  {
    titleKey: "sections.business",
    items: [{ href: "/app/coach/leads", labelKey: "leads", icon: "leads" }],
  },
];

/**
 * Coach navigation. Sara works on a laptop with a lot of client state to move
 * between, so this is a persistent rail rather than a tab strip — a phone-first
 * tab bar cannot hold nine destinations without hiding most of them.
 *
 * The frame itself is `StudioChrome`, shared with the aluna area; this file is
 * only the coach's rail contents and her bell.
 */
export function CoachChrome({
  name,
  email,
  themeMode,
  badges,
  alerts,
  quickAdd,
  children,
}: {
  name: string;
  email: string;
  themeMode: ThemeMode;
  /** Counts keyed by href — rendered as a caramel pip on the nav item. */
  badges: Record<string, number>;
  /** The topbar's add control. Rendered by the layout so it can be a server component. */
  quickAdd: React.ReactNode;
  /** Feeds the bell's dropdown — same list as the overview's "Precisa de ti" panel. */
  alerts: CoachAlert[];
  children: React.ReactNode;
}) {
  return (
    <StudioChrome
      role="coach"
      homeHref="/app/coach"
      sections={SECTIONS}
      name={name}
      email={email}
      themeMode={themeMode}
      badges={badges}
      actions={quickAdd}
      notifications={<NotificationsMenu alerts={alerts} />}
    >
      {children}
    </StudioChrome>
  );
}
