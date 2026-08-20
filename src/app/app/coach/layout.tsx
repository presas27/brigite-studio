import { CoachChrome } from "@/components/studio/coach/CoachChrome";
import { AddWorkoutModal } from "@/components/studio/workout/AddWorkoutModal";
import { requireCoach } from "@/lib/studio/auth";
import { coachAlerts, listSubmissions, unreadCount } from "@/lib/studio/coaching";
import { listLeads } from "@/lib/studio/leads";
import { getThemeMode } from "@/lib/studio/theme-mode";
import { listClients } from "@/lib/studio/users";

/**
 * Shell for every coach screen: persistent sidebar, topbar, main column.
 *
 * The badge counts are computed here rather than per page so the rail is a
 * standing answer to "does anything need me" — Sara should be able to tell
 * without navigating.
 */
export default async function CoachLayout({ children }: { children: React.ReactNode }) {
  const coach = await requireCoach();

  const pendingVideos = listSubmissions({ status: "pending" }).length;
  const unreadMessages = listClients().reduce(
    (total, client) => total + unreadCount(client.id, coach.id),
    0,
  );

  const badges: Record<string, number> = {};
  if (pendingVideos > 0) badges["/app/coach/videos"] = pendingVideos;
  if (unreadMessages > 0) badges["/app/coach/mensagens"] = unreadMessages;

  const newLeads = listLeads("new").length;
  if (newLeads > 0) badges["/app/coach/leads"] = newLeads;

  return (
    <CoachChrome
      name={coach.name}
      email={coach.email}
      themeMode={await getThemeMode()}
      badges={badges}
      alerts={coachAlerts(coach.id)}
      quickAdd={<AddWorkoutModal />}
    >
      {children}
    </CoachChrome>
  );
}
