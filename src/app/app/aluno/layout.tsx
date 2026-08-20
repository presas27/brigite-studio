import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AlunoChrome } from "@/components/studio/aluno/AlunoChrome";
import { buttonPrimary } from "@/components/studio/theme";
import { requireClient } from "@/lib/studio/auth";
import { clientAlerts } from "@/lib/studio/clientConsole";
import { findCheckin, listSubmissions, unreadCount } from "@/lib/studio/coaching";
import { dayKey, weekKey } from "@/lib/studio/db";
import { assignmentsOn, nextAssignment } from "@/lib/studio/plan";
import { getThemeMode } from "@/lib/studio/theme-mode";
import { cn } from "@/lib/utils";

/**
 * Chrome for every `/app/aluno/*` route: gate, then the same rail the coach
 * works in, filled with the aluna's own destinations.
 *
 * The counts are computed here rather than per page so the rail is a standing
 * answer to "is there anything for me" — an aluna should be able to tell
 * without navigating, exactly as Sara can.
 *
 * `unreadCount` takes the same id twice on purpose: client id as thread owner,
 * client id again as the reader.
 */
export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  const client = await requireClient();
  const t = await getTranslations("Studio.session");

  const badges: Record<string, number> = {};

  const unread = unreadCount(client.id, client.id);
  if (unread > 0) badges["/app/aluno/mensagens"] = unread;

  const pending = listSubmissions({ clientId: client.id, status: "pending", limit: 20 }).length;
  if (pending > 0) badges["/app/aluno/videos"] = pending;

  // One pip, not a count: a week has exactly one check-in, so a number here
  // would only ever say "1" and would read as a quantity of work.
  if (findCheckin(client.id, weekKey())?.submittedAt == null) badges["/app/aluno/checkin"] = 1;

  // The topbar's one action is the session she is here for: today's if there is
  // one, otherwise the next one ahead — never a dead button.
  const today = dayKey();
  const session =
    assignmentsOn(client.id, today).find((assignment) => assignment.status === "scheduled") ??
    nextAssignment(client.id, today);

  return (
    <AlunoChrome
      name={client.name}
      email={client.email}
      themeMode={await getThemeMode()}
      badges={badges}
      alerts={clientAlerts(client.id)}
      quickAction={
        session && (
          <Link
            href={`/app/aluno/treino/${session.id}`}
            className={cn(buttonPrimary, "px-5 py-2.5 text-xs")}
          >
            {session.startedAt ? t("resume") : t("start")}
          </Link>
        )
      }
    >
      {children}
    </AlunoChrome>
  );
}
