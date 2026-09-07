import { CoachChrome } from "@/components/studio/coach/CoachChrome";
import { AddWorkoutModal } from "@/components/studio/workout/AddWorkoutModal";
import { requireCoach } from "@/lib/studio/auth";
import { coachShell } from "@/lib/studio/coaching";
import { getThemeMode } from "@/lib/studio/theme-mode";

/**
 * Shell for every coach screen: persistent sidebar, topbar, main column.
 *
 * Badge counts and the bell come from one Convex query (`coachShell`) rather
 * than unread + alerts as two roster walks. The chrome resubscribes live.
 */
export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const coach = await requireCoach();

  const [shell, themeMode] = await Promise.all([coachShell(), getThemeMode()]);

  const badges: Record<string, number> = {};
  if (shell.unread > 0) badges["/app/coach/mensagens"] = shell.unread;

  return (
    <CoachChrome
      name={coach.name}
      email={coach.email}
      themeMode={themeMode}
      badges={badges}
      alerts={shell.alerts}
      quickAdd={<AddWorkoutModal compact />}
    >
      {children}
    </CoachChrome>
  );
}
