import { redirect } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AlunoChrome } from "@/components/studio/aluno/AlunoChrome";
import { buttonPrimary } from "@/components/studio/theme";
import { requireClient } from "@/lib/studio/auth";
import { clientAlerts } from "@/lib/studio/clientConsole";
import { findCheckin, unreadCount } from "@/lib/studio/coaching";
import { dayKey, weekKey } from "@/lib/studio/dates";
import { assignmentsOn, nextAssignment } from "@/lib/studio/plan";
import { getThemeMode } from "@/lib/studio/theme-mode";
import { myPendingIntake } from "@/lib/studio/intake";
import { cn } from "@/lib/utils";

/**
 * Chrome for every `/app/aluno/*` route: gate, then the same rail the coach
 * works in, filled with the aluna's own destinations.
 *
 * The counts are computed here rather than per page so the rail is a standing
 * answer to "is there anything for me" — an aluna should be able to tell
 * without navigating, exactly as Sara can.
 *
 * Every read below is independent of the others, so they run as one wave —
 * five network round trips otherwise, for a chrome that wraps every page.
 */
export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  const client = await requireClient();
  const pending = await myPendingIntake().catch(() => null);
  if (pending) redirect(`/app/convite/${pending.token}`);
  const t = await getTranslations("Studio.session");

  const today = dayKey();
  const [unread, checkin, todaysAssignments, next, alerts] = await Promise.all([
    unreadCount(client.id),
    findCheckin(client.id, weekKey()),
    assignmentsOn(client.id, today),
    nextAssignment(client.id, today),
    clientAlerts(client.id),
  ]);

  const badges: Record<string, number> = {};
  if (unread > 0) badges["/app/aluno/mensagens"] = unread;

  // One pip, not a count: a week has exactly one check-in, so a number here
  // would only ever say "1" and would read as a quantity of work.
  if (checkin?.submittedAt == null) badges["/app/aluno/checkin"] = 1;

  // The topbar's one action is the session she is here for: today's if there is
  // one, otherwise the next one ahead — never a dead button.
  const session =
    todaysAssignments.find((assignment) => assignment.status === "scheduled") ?? next;

  return (
    <AlunoChrome
      clientId={client.id}
      name={client.name}
      email={client.email}
      themeMode={await getThemeMode()}
      badges={badges}
      alerts={alerts}
      solo={client.profile.coachId === null}
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
