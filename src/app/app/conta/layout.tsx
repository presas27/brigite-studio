import { redirect } from "next/navigation";
import { StudioShell } from "@/components/studio/StudioShell";
import { currentUser } from "@/lib/studio/auth";
import { unreadCount } from "@/lib/studio/coaching";
import { getThemeMode } from "@/lib/studio/theme-mode";
import { listClients } from "@/lib/studio/users";

/**
 * The account page is the one screen both roles share, so it gets the simple
 * tab shell rather than the coach's sidebar — it is a settings page, not a
 * working surface, and Sara reaches it from the account menu in either chrome.
 */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/app/entrar");

  const unread =
    user.role === "coach"
      ? listClients().reduce((total, client) => total + unreadCount(client.id, user.id), 0)
      : unreadCount(user.id, user.id);

  const badgeHref = user.role === "coach" ? "/app/coach/mensagens" : "/app/aluno/mensagens";

  return (
    <StudioShell
      role={user.role}
      name={user.name}
      email={user.email}
      themeMode={await getThemeMode()}
      badges={unread > 0 ? { [badgeHref]: unread } : undefined}
    >
      {children}
    </StudioShell>
  );
}
