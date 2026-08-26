import { notFound } from "next/navigation";
import { requireClientAccess } from "@/lib/studio/auth";
import { findAssignment, lastLogsForExercise, logsFor } from "@/lib/studio/plan";
import type { SetLog } from "@/lib/studio/types";
import { SessionPlayer } from "@/components/studio/session/SessionPlayer";
import {
  beginSession,
  discardSession,
  finishSession,
  logSet,
  skipSession,
  unlogSet,
} from "./actions";

/**
 * The workout player.
 *
 * It lives in the `(sessao)` route group rather than under `aluno/`, which is
 * the whole point: a session takes the screen on its own, with no rail and no
 * topbar competing with the set in front of her.
 *
 * Rendered entirely from `assignment.snapshot` — the workout as it existed when
 * Sara assigned it — never from the live workout template, so editing a template
 * later cannot rewrite a session the client already saw or logged against.
 */
export default async function TreinoPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  const assignment = await findAssignment(assignmentId);
  if (!assignment) notFound();

  const { client } = await requireClientAccess(assignment.clientId);

  const exerciseIds = Array.from(
    new Set(assignment.snapshot.blocks.flatMap((block) => block.items.map((item) => item.exerciseId))),
  );

  const [initialLogs, previousLogsList] = await Promise.all([
    logsFor(assignment.id),
    Promise.all(
      exerciseIds.map((exerciseId) => lastLogsForExercise(client.id, exerciseId, assignment.id)),
    ),
  ]);
  const previousByExercise: Record<string, SetLog[]> = {};
  exerciseIds.forEach((exerciseId, index) => {
    previousByExercise[exerciseId] = previousLogsList[index];
  });

  return (
    <SessionPlayer
      assignment={assignment}
      initialLogs={initialLogs}
      previousByExercise={previousByExercise}
      logSetAction={logSet}
      unlogSetAction={unlogSet}
      beginAction={beginSession.bind(null, assignment.id)}
      finishAction={finishSession.bind(null, assignment.id)}
      skipAction={skipSession.bind(null, assignment.id)}
      discardAction={discardSession.bind(null, assignment.id)}
    />
  );
}
