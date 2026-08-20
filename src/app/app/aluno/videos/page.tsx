import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireClient } from "@/lib/studio/auth";
import { listSubmissions } from "@/lib/studio/coaching";
import { listExercises } from "@/lib/studio/library";
import { findAssignment } from "@/lib/studio/plan";
import { Empty } from "@/components/studio/Empty";
import { PageHeader } from "@/components/studio/PageHeader";
import { eyebrow } from "@/components/studio/theme";
import { SubmissionCard } from "@/components/studio/video/SubmissionCard";
import { VideoSubmitForm } from "@/components/studio/video/VideoSubmitForm";

export const metadata: Metadata = { title: "Vídeos" };

/**
 * Client video screen: send a clip for review, see every clip sent so far
 * with Sara's feedback. `exercicio`/`treino` arrive from links elsewhere in
 * the app (the session logger's "send a video of this") to pre-fill context.
 */
export default async function ClientVideosPage({
  searchParams,
}: {
  searchParams: Promise<{ exercicio?: string; treino?: string }>;
}) {
  const client = await requireClient();
  const { exercicio, treino } = await searchParams;
  const t = await getTranslations("Studio.videos");

  const exercises = listExercises();
  const assignment = treino ? findAssignment(treino) : undefined;
  const assignmentId = assignment?.clientId === client.id ? treino : undefined;

  const submissions = listSubmissions({ clientId: client.id });

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} lead={t("clientLead")} />

      <VideoSubmitForm
        exercises={exercises}
        initialExerciseId={exercicio}
        assignmentId={assignmentId}
      />

      <section aria-labelledby="sent-clips" className="space-y-3">
        <h2 id="sent-clips" className={eyebrow}>
          {t("sentTitle")}
        </h2>
        {submissions.length === 0 ? (
          <Empty title={t("empty")} hint={t("clientEmptyHint")} />
        ) : (
          <div className="space-y-4">
            {submissions.map((submission) => (
              <SubmissionCard key={submission.id} submission={submission} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
