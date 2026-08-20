import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireCoach } from "@/lib/studio/auth";
import { findSubmission } from "@/lib/studio/coaching";
import { PageHeader } from "@/components/studio/PageHeader";
import { ReviewPlayer } from "@/components/studio/video/ReviewPlayer";

export const metadata: Metadata = { title: "Feedback" };

/** The annotated review for one submitted clip. */
export default async function CoachVideoReviewPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  await requireCoach();
  const { submissionId } = await params;
  const submission = findSubmission(submissionId);
  if (!submission) notFound();

  const t = await getTranslations("Studio.videos");

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/app/coach/videos"
        title={submission.exerciseName ?? t("reviewTitle")}
        lead={submission.clientName}
      />
      <ReviewPlayer submission={submission} />
    </div>
  );
}
