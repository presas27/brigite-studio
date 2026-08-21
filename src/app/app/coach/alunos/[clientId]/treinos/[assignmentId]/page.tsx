import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { Icon } from "@/components/studio/coach/icons";
import { SessionReportView } from "@/components/studio/report/SessionReportView";
import { buttonQuiet } from "@/components/studio/theme";
import { requireClientAccess } from "@/lib/studio/auth";
import { sessionReport } from "@/lib/studio/report";
import { cn } from "@/lib/utils";

/**
 * The report for one session, read from the coach's side.
 *
 * It sits under the client's tab strip rather than on a page of its own, so
 * opening a session never costs Sara the person she is working on — the same
 * reason every other panel here is a route segment.
 */
export default async function ClientSessionReportPage({
  params,
}: {
  params: Promise<{ clientId: string; assignmentId: string }>;
}) {
  const { clientId, assignmentId } = await params;
  const { viewer, client } = await requireClientAccess(clientId);
  if (viewer.role !== "coach") redirect("/app/aluno");

  const report = sessionReport(assignmentId);
  // Guard the id in the URL, not just its existence: an assignment belonging to
  // another client must not be readable by walking this route.
  if (!report || report.assignment.clientId !== client.id) notFound();

  const [t, tPlan, common, locale] = await Promise.all([
    getTranslations("Studio.report"),
    getTranslations("Studio.plan"),
    getTranslations("Studio.common"),
    getLocale(),
  ]);

  return (
    <div className="space-y-4">
      <Link href={`/app/coach/alunos/${client.id}/treinos`} className={cn(buttonQuiet, "-ml-2.5")}>
        <Icon name="arrowLeft" className="h-3.5 w-3.5" />
        {t("back")}
      </Link>

      <SessionReportView report={report} locale={locale} t={t} tPlan={tPlan} common={common} />
    </div>
  );
}
