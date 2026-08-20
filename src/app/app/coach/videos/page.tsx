import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireCoach } from "@/lib/studio/auth";
import { listSubmissions } from "@/lib/studio/coaching";
import { findClient } from "@/lib/studio/users";
import { Empty } from "@/components/studio/Empty";
import { PageHeader } from "@/components/studio/PageHeader";
import { VideoQueueFilters } from "@/components/studio/video/VideoQueueFilters";
import { VideoQueueRow } from "@/components/studio/video/VideoQueueRow";

export const metadata: Metadata = { title: "Vídeos" };

/**
 * Sara's review queue. Pending clips always sort first regardless of the
 * status filter — a "reviewed" clip that's newer than a still-pending one
 * must never bury the one waiting on her.
 */
export default async function CoachVideosPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; aluno?: string }>;
}) {
  await requireCoach();
  const { estado, aluno } = await searchParams;
  const t = await getTranslations("Studio.videos");

  const status = estado === "pending" || estado === "reviewed" ? estado : undefined;
  const clientFilter = aluno ? findClient(aluno) : undefined;

  const submissions = listSubmissions({
    status,
    clientId: clientFilter?.id,
    limit: 200,
  }).sort((a, b) => {
    if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
    return b.createdAt - a.createdAt;
  });

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} />

      <VideoQueueFilters status={status} clientFilter={clientFilter} />

      {submissions.length === 0 ? (
        <Empty title={t("empty")} hint={t("coachEmptyHint")} />
      ) : (
        <ul className="space-y-3">
          {submissions.map((submission) => (
            <li key={submission.id}>
              <VideoQueueRow submission={submission} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
