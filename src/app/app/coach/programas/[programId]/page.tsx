import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AddModal } from "@/components/studio/AddModal";
import { Empty } from "@/components/studio/Empty";
import { PageHeader } from "@/components/studio/PageHeader";
import { ProgramPhaseForm } from "@/components/studio/programs/ProgramPhaseForm";
import { ProgramPhaseList } from "@/components/studio/programs/ProgramPhaseList";
import { requireCoach } from "@/lib/studio/auth";
import { listWorkouts } from "@/lib/studio/library";
import { findProgram, programPhases } from "@/lib/studio/programs";
import {
  addPhaseAction,
  addWorkoutAction,
  removePhaseAction,
  removeWorkoutAction,
  updatePhaseAction,
} from "../actions";

export const metadata: Metadata = {
  title: "Programa",
  robots: { index: false, follow: false },
};

/**
 * One program: its phases in order, and the sessions inside each.
 *
 * The library list is fetched here rather than inside the picker so the picker
 * stays a client component with no data of its own — the same division the
 * client's phase page uses for "add from library".
 */
export default async function ProgramPage({
  params,
}: {
  params: Promise<{ programId: string }>;
}) {
  const [{ programId }] = await Promise.all([params, requireCoach()]);

  const [program, phases, libraryWorkouts, t, common] = await Promise.all([
    findProgram(programId),
    programPhases(programId),
    listWorkouts(),
    getTranslations("Studio.programs"),
    getTranslations("Studio.common"),
  ]);

  // `findProgram` returns nothing for a program that is not this coach's, so a
  // stale link and somebody else's id land in the same place.
  if (!program) notFound();

  const lead = [
    program.focus || null,
    t("phaseCount", { count: phases.length }),
    program.notes || null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/app/coach/programas"
        title={program.name}
        lead={lead}
        action={
          <AddModal label={t("addPhase")} title={t("addPhaseTitle")}>
            <ProgramPhaseForm
              action={addPhaseAction.bind(null, programId)}
              submitLabel={common("add")}
            />
          </AddModal>
        }
      />

      {phases.length === 0 ? (
        <Empty title={t("phasesEmpty")} hint={t("phasesEmptyHint")} />
      ) : (
        <ProgramPhaseList
          phases={phases}
          libraryWorkouts={libraryWorkouts}
          addWorkoutAction={addWorkoutAction}
          removeWorkoutAction={removeWorkoutAction}
          removePhaseAction={removePhaseAction}
          updatePhaseAction={updatePhaseAction}
        />
      )}
    </div>
  );
}
