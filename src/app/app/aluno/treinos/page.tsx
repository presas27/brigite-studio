import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { WorkoutLibrary } from "@/components/studio/aluno/WorkoutLibrary";
import { Empty } from "@/components/studio/Empty";
import { PageHeader } from "@/components/studio/PageHeader";
import { AddWorkoutModal } from "@/components/studio/workout/AddWorkoutModal";
import { requireClient } from "@/lib/studio/auth";
import { dayKey } from "@/lib/studio/dates";
import { clientWorkouts } from "@/lib/studio/plan";
import type { ClientWorkout } from "@/lib/studio/types";
import { startWorkout } from "./actions";

export const metadata: Metadata = { title: "Treinos" };

/** Where a solo client's own workouts are built. */
const EDIT_BASE = "/app/aluno/treinos/editar";

/**
 * Every workout of every phase in this aluna's plan — always all of them, on
 * any day — and, for someone training alone, the workouts they built.
 *
 * The plan page draws the calendar: which workout the coach suggests for which
 * day. This page is the other half of that, and deliberately ignores the
 * calendar: someone who has twenty minutes on a Tuesday and wants Thursday's
 * mobility session should be one tap away from doing it, not blocked by a
 * date. Tapping a workout writes today's session for it — or opens the one
 * already there.
 *
 * With no coach there is no plan to be handed: the "new workout" button and
 * the edit links are how this person writes their own.
 */
export default async function AlunoTreinosPage() {
  const client = await requireClient();
  const t = await getTranslations("Studio.aluno");
  const solo = client.profile.coachId === null;

  const workouts = await clientWorkouts(client.id);

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("workouts.title")}
        lead={solo ? t("workouts.leadSolo") : t("workouts.lead")}
        action={solo ? <AddWorkoutModal compact /> : undefined}
      />

      {workouts.length === 0 ? (
        <Empty
          title={t("workouts.empty")}
          hint={solo ? t("workouts.emptyHintSolo") : t("workouts.emptyHint")}
        />
      ) : (
        <WorkoutLibrary
          workouts={workouts}
          focuses={workoutFocuses(workouts)}
          today={dayKey()}
          startAction={startWorkout}
          editBase={solo ? EDIT_BASE : undefined}
        />
      )}
    </div>
  );
}

/** Distinct focuses across the plan, with counts — the library's category filter. */
function workoutFocuses(workouts: ClientWorkout[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const workout of workouts) {
    const focus = workout.focus.trim();
    if (!focus) continue;
    counts.set(focus, (counts.get(focus) ?? 0) + 1);
  }
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => a.tag.localeCompare(b.tag));
}
