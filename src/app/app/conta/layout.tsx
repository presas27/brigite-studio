import { redirect } from "next/navigation";
import { AlunoChrome } from "@/components/studio/aluno/AlunoChrome";
import { CoachChrome } from "@/components/studio/coach/CoachChrome";
import { AddWorkoutModal } from "@/components/studio/workout/AddWorkoutModal";
import { currentUser } from "@/lib/studio/auth";
import { clientAlerts } from "@/lib/studio/clientConsole";
import { coachAlerts, findCheckin, listSubmissions, unreadCount } from "@/lib/studio/coaching";
import { weekKey } from "@/lib/studio/db";
import { getThemeMode } from "@/lib/studio/theme-mode";
import { listClients } from "@/lib/studio/users";

/**
 * The account page is the one screen both roles share, so it borrows whichever
 * chrome the reader already works in.
 *
 * Giving it a shell of its own was the older arrangement, and it made the
 * settings page the one place in the app where the navigation changed shape
 * under you — reached from the account menu, it has to look like the app you
 * left, not like a third product.
 */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/app/entrar");

  const themeMode = await getThemeMode();

  if (user.role === "coach") {
    const badges: Record<string, number> = {};

    const pendingVideos = listSubmissions({ status: "pending" }).length;
    if (pendingVideos > 0) badges["/app/coach/videos"] = pendingVideos;

    const unread = listClients().reduce(
      (total, client) => total + unreadCount(client.id, user.id),
      0,
    );
    if (unread > 0) badges["/app/coach/mensagens"] = unread;

    return (
      <CoachChrome
        name={user.name}
        email={user.email}
        themeMode={themeMode}
        badges={badges}
        alerts={coachAlerts(user.id)}
        quickAdd={<AddWorkoutModal />}
      >
        {children}
      </CoachChrome>
    );
  }

  const badges: Record<string, number> = {};

  const unread = unreadCount(user.id, user.id);
  if (unread > 0) badges["/app/aluno/mensagens"] = unread;

  const pending = listSubmissions({ clientId: user.id, status: "pending", limit: 20 }).length;
  if (pending > 0) badges["/app/aluno/videos"] = pending;

  if (findCheckin(user.id, weekKey())?.submittedAt == null) badges["/app/aluno/checkin"] = 1;

  return (
    <AlunoChrome
      name={user.name}
      email={user.email}
      themeMode={themeMode}
      badges={badges}
      alerts={clientAlerts(user.id)}
    >
      {children}
    </AlunoChrome>
  );
}
