import { notFound } from "next/navigation";
import { requireClientAccess } from "@/lib/studio/auth";
import { findAssignment, lastLogsForExercise, logsFor } from "@/lib/studio/plan";
import type { SetLog } from "@/lib/studio/types";
import { PageHeader } from "@/components/studio/PageHeader";
import { SessionLogger } from "@/components/studio/session/SessionLogger";
import { beginSession, finishSession, logSet, skipSession, unlogSet } from "./actions";

/**
 * The workout logger. Rendered entirely from `assignment.snapshot` — the
 * workout as it existed when Sara assigned it — never from the live workout
 * template, so editing a template later cannot rewrite a session the client
 * already saw or logged against.
 */
export default async function TreinoPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  const assignment = findAssignment(assignmentId);
  if (!assignment) notFound();

  const { client } = await requireClientAccess(assignment.clientId);

  const exerciseIds = Array.from(
    new Set(assignment.snapshot.blocks.flatMap((block) => block.items.map((item) => item.exerciseId))),
  );
  const previousByExercise: Record<string, SetLog[]> = {};
  for (const exerciseId of exerciseIds) {
    previousByExercise[exerciseId] = lastLogsForExercise(client.id, exerciseId, assignment.id);
  }
  const initialLogs = logsFor(assignment.id);

  return (
    <div className="space-y-8">
      <PageHeader
        backHref="/app/aluno"
        title={assignment.snapshot.name}
        lead={assignment.snapshot.focus || undefined}
      />
      <SessionLogger
        assignment={assignment}
        initialLogs={initialLogs}
        previousByExercise={previousByExercise}
        logSetAction={logSet}
        unlogSetAction={unlogSet}
        beginAction={beginSession.bind(null, assignment.id)}
        finishAction={finishSession.bind(null, assignment.id)}
        skipAction={skipSession.bind(null, assignment.id)}
      />
    </div>
  );
}
