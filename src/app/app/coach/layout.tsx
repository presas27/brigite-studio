import { CoachChrome } from "@/components/studio/coach/CoachChrome";
import { AddWorkoutModal } from "@/components/studio/workout/AddWorkoutModal";
import { requireCoach } from "@/lib/studio/auth";
import { coachAlerts, unreadTotal } from "@/lib/studio/coaching";
import { listLeads } from "@/lib/studio/leads";
import { getThemeMode } from "@/lib/studio/theme-mode";

/**
 * Shell for every coach screen: persistent sidebar, topbar, main column.
 *
 * The badge counts are computed here rather than per page so the rail is a
 * standing answer to "does anything need me" — Sara should be able to tell
 * without navigating.
 */
export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const coach = await requireCoach();

  const [unreadMessages, newLeads, alerts, themeMode] = await Promise.all([
    unreadTotal(),
    listLeads("new").then((leads) => leads.length),
    coachAlerts(),
    getThemeMode(),
  ]);

  const badges: Record<string, number> = {};
  if (unreadMessages > 0) badges["/app/coach/mensagens"] = unreadMessages;
  if (newLeads > 0) badges["/app/coach/leads"] = newLeads;

  return (
    <CoachChrome
      name={coach.name}
      email={coach.email}
      themeMode={themeMode}
      badges={badges}
      alerts={alerts}
      quickAdd={<AddWorkoutModal compact />}
    >
      {children}
    </CoachChrome>
  );
}
