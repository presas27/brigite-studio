import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { formatDayKey } from "@/components/studio/format";
import { isPrintFormat, sectionsFor, type PrintFormat } from "@/components/studio/print/formats";
import { PrintSheet } from "@/components/studio/print/PrintSheet";
import { ProgressionSheet } from "@/components/studio/print/ProgressionSheet";
import { WorkoutSheet } from "@/components/studio/print/WorkoutSheet";
import { requireClientAccess } from "@/lib/studio/auth";
import { dayKey, shiftDay } from "@/lib/studio/dates";
import { equipmentOf } from "@/lib/studio/equipment";
import { findExercise, findWorkout } from "@/lib/studio/library";
import { workoutProgression } from "@/lib/studio/plan";
import { isRestItem } from "@/lib/studio/types";

export const metadata: Metadata = {
  title: "Imprimir",
  robots: { index: false, follow: false, nocache: true },
};

/** Narrows a query-string value to a `YYYY-MM-DD` day key. */
function dayParam(value: string | undefined): value is string {
  return value != null && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * The printable sheet for one client's copy of one workout.
 *
 * It lives in the `(impressao)` route group — the same trick the session player
 * uses with `(sessao)` — so the URL still reads as the workout's own while the
 * page renders outside `CoachLayout`. There is no sidebar to hide from the
 * printer and no scroll container to fight: the sheet is the document.
 *
 * The gate is the one the workout page uses, repeated rather than trusted: a
 * print URL is a URL, and it can be opened directly.
 */
export default async function PrintWorkoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string; phaseId: string; workoutId: string }>;
  searchParams: Promise<{ formato?: string; secoes?: string; de?: string; ate?: string }>;
}) {
  const [{ clientId, phaseId, workoutId }, query] = await Promise.all([params, searchParams]);
  const [{ viewer, client }, workout, t, tWorkouts, locale] = await Promise.all([
    requireClientAccess(clientId),
    findWorkout(workoutId),
    getTranslations("Studio.print"),
    getTranslations("Studio.workouts"),
    getLocale(),
  ]);
  if (viewer.role !== "coach") redirect("/app/aluno");
  if (!workout || workout.clientId !== clientId || workout.phaseId !== phaseId) notFound();

  const format: PrintFormat = isPrintFormat(query.formato) ? query.formato : "completo";
  const sections = sectionsFor(format, query.secoes);
  // Position is the running order, and the builder shows nothing outside a
  // block: the sheet reads top to bottom in the same order, or it is a
  // different workout on paper than the one on screen.
  const blocks = [...workout.blocks].sort((a, b) => a.position - b.position);
  const subtitle = `${client.name} · ${tWorkouts(`type.${workout.workoutType}`)}`;

  if (format === "progresso") {
    const to = dayParam(query.ate) ? query.ate : dayKey();
    const from = dayParam(query.de) ? query.de : shiftDay(to, -30);
    const progression = await workoutProgression(clientId, workoutId, from, to);

    return (
      <PrintSheet
        title={workout.name}
        subtitle={subtitle}
        meta={[
          `${formatDayKey(from, locale)} – ${formatDayKey(to, locale)}`,
          t("sessionCount", { count: progression.sessions.length }),
          t("generatedOn", { date: formatDayKey(dayKey(), locale) }),
        ]}
      >
        <h2 className="mb-4 text-sm font-semibold text-neutral-700">{t("progressionTitle")}</h2>
        <ProgressionSheet blocks={blocks} progression={progression} />
      </PrintSheet>
    );
  }

  // Only the exercises this workout actually uses: reading the whole library to
  // get five sets of tags would be a few thousand rows for a sheet of paper.
  const exerciseIds = [
    ...new Set(
      blocks
        .flatMap((block) => block.items)
        .filter((item) => !isRestItem(item) && item.exerciseId)
        .map((item) => item.exerciseId),
    ),
  ];
  const equipment = sections.equipment
    ? equipmentOf(
        (await Promise.all(exerciseIds.map(findExercise))).filter(
          (exercise): exercise is NonNullable<typeof exercise> => exercise != null,
        ),
      )
    : [];

  return (
    <PrintSheet
      title={workout.name}
      subtitle={subtitle}
      meta={[
        t(`format.${format}`),
        ...(workout.focus ? [workout.focus] : []),
        t("generatedOn", { date: formatDayKey(dayKey(), locale) }),
      ]}
    >
      <WorkoutSheet
        workout={workout}
        blocks={blocks}
        equipment={equipment}
        sections={sections}
      />
    </PrintSheet>
  );
}
