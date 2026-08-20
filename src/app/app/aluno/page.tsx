import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requireClient } from "@/lib/studio/auth";
import { dayKey, weekKey } from "@/lib/studio/db";
import { adherence, assignmentsOn, nextAssignment } from "@/lib/studio/plan";
import { findCheckin } from "@/lib/studio/coaching";
import { Empty } from "@/components/studio/Empty";
import { PageHeader } from "@/components/studio/PageHeader";
import {
  buttonOnAccent,
  chipAccent,
  eyebrow,
  eyebrowOnAccent,
  heading,
  mutedOnAccent,
  panelOnAccent,
  surface,
  surfaceAccent,
  surfaceLink,
} from "@/components/studio/theme";
import { cn } from "@/lib/utils";

/**
 * The client's landing screen: what to do right now. Today's assignment
 * takes priority; with none scheduled, the next one ahead stands in, clearly
 * labelled as such — the client should never wonder which day this session
 * belongs to.
 */
export default async function AlunoHojePage() {
  const client = await requireClient();
  const t = await getTranslations("Studio");
  const locale = await getLocale();

  const today = dayKey();
  const todays = assignmentsOn(client.id, today);
  const fallback = todays.length === 0 ? nextAssignment(client.id, today) : undefined;
  const primary = todays[0] ?? fallback;

  const week = adherence(client.id);
  const checkin = findCheckin(client.id, weekKey());
  const needsCheckin = !checkin?.submittedAt;

  return (
    <div className="space-y-8">
      <PageHeader title={t("nav.today")} lead={t("session.todayLead")} />

      {!primary ? (
        <Empty title={t("session.todayEmpty")} hint={t("session.todayEmptyHint")} />
      ) : (
        // The screen's one gold surface. Everything nested here is ink-side.
        <div className={cn(surfaceAccent, "space-y-6 p-6 sm:p-8")}>
          <div>
            <p className={eyebrowOnAccent}>
              {todays.length > 0
                ? t("nav.today")
                : `${t("session.nextUp")} · ${new Intl.DateTimeFormat(locale, {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  }).format(new Date(`${primary.date}T12:00:00`))}`}
            </p>
            <h2 className={cn(heading, "mt-2 text-[2rem] sm:text-[2.75rem]")}>
              {primary.snapshot.name}
            </h2>
            {primary.snapshot.focus && (
              <p className={cn(mutedOnAccent, "mt-1")}>{primary.snapshot.focus}</p>
            )}
          </div>

          {primary.snapshot.notes && (
            <p className={cn(panelOnAccent, "p-4 text-sm leading-relaxed text-ink/80")}>
              {primary.snapshot.notes}
            </p>
          )}

          <div className="space-y-2">
            {primary.snapshot.blocks.map((block) => (
              <div key={block.id} className="flex flex-wrap items-baseline gap-2 text-sm">
                <span className={eyebrowOnAccent}>
                  {block.label || t(`workouts.blockKind.${block.kind}`)}
                </span>
                <span className="text-ink/70">
                  {block.items.map((item) => item.exerciseName).join(" · ")}
                </span>
              </div>
            ))}
          </div>

          <Link
            href={`/app/aluno/treino/${primary.id}`}
            className={cn(buttonOnAccent, "w-full px-8 py-4 text-base sm:w-auto")}
          >
            {primary.startedAt ? t("session.resume") : t("session.start")}
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className={cn(surface, "p-5")}>
          <p className={eyebrow}>{t("progress.adherence")}</p>
          <p className="mt-1 font-mono text-2xl text-cream">
            {t("progress.sessionsDone", { done: week.done, total: week.total })}
          </p>
        </div>
        {needsCheckin && (
          <Link
            href="/app/aluno/checkin"
            className={cn(surfaceLink, "flex items-center gap-2 p-5 text-sm text-cream/80")}
          >
            <span className={chipAccent}>{t("nav.checkin")}</span>
            {t("session.checkinNudge")}
          </Link>
        )}
      </div>
    </div>
  );
}
