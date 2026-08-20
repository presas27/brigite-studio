import { requireClient } from "@/lib/studio/auth";
import { unreadCount } from "@/lib/studio/coaching";
import { getThemeMode } from "@/lib/studio/theme-mode";
import { StudioShell } from "@/components/studio/StudioShell";

/**
 * Chrome for every `/app/aluno/*` route: gate, then the shared shell with the
 * client's own nav. The messages badge counts what the coach wrote that this
 * client has not read — `unreadCount` takes the same id twice on purpose,
 * client id as thread owner, client id again as the reader.
 */
export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  const client = await requireClient();
  const unread = unreadCount(client.id, client.id);
  const badges = unread > 0 ? { "/app/aluno/mensagens": unread } : undefined;

  return (
    <StudioShell
      role="client"
      name={client.name}
      email={client.email}
      themeMode={await getThemeMode()}
      badges={badges}
    >
      {children}
    </StudioShell>
  );
}
