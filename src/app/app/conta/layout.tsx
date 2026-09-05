import { redirect } from "next/navigation";
import { AlunoChrome } from "@/components/studio/aluno/AlunoChrome";
import { CoachChrome } from "@/components/studio/coach/CoachChrome";
import { AddWorkoutModal } from "@/components/studio/workout/AddWorkoutModal";
import { currentUser } from "@/lib/studio/auth";
import { clientAlerts } from "@/lib/studio/clientConsole";
import { coachAlerts, findCheckin, unreadCount, unreadTotal } from "@/lib/studio/coaching";
import { weekKey } from "@/lib/studio/dates";
import { getThemeMode } from "@/lib/studio/theme-mode";
import { myCoach } from "@/lib/studio/users";

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
    const [unread, alerts] = await Promise.all([unreadTotal(), coachAlerts()]);

    const badges: Record<string, number> = {};
    if (unread > 0) badges["/app/coach/mensagens"] = unread;

    return (
      <CoachChrome
        name={user.name}
        email={user.email}
        themeMode={themeMode}
        badges={badges}
        alerts={alerts}
        quickAdd={<AddWorkoutModal compact />}
      >
        {children}
      </CoachChrome>
    );
  }

  const [unread, checkin, alerts, coach] = await Promise.all([
    unreadCount(user.id),
    findCheckin(user.id, weekKey()),
    clientAlerts(user.id),
    myCoach(),
  ]);

  const badges: Record<string, number> = {};
  if (unread > 0) badges["/app/aluno/mensagens"] = unread;
  if (checkin?.submittedAt == null) badges["/app/aluno/checkin"] = 1;

  return (
    <AlunoChrome
      clientId={user.id}
      name={user.name}
      email={user.email}
      themeMode={themeMode}
      badges={badges}
      alerts={alerts}
      solo={!coach}
    >
      {children}
    </AlunoChrome>
  );
}
