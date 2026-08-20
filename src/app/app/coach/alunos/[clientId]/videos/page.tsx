import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Empty } from "@/components/studio/Empty";
import { VideoQueueRow } from "@/components/studio/video/VideoQueueRow";
import { requireClientAccess } from "@/lib/studio/auth";
import { listSubmissions } from "@/lib/studio/coaching";

/**
 * Videos tab — this client's clips only. Pending first regardless of age, the
 * same rule the full review queue follows: a reviewed clip never buries one
 * still waiting on Sara.
 */
export default async function ClientVideosPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const { viewer } = await requireClientAccess(clientId);
  if (viewer.role !== "coach") redirect("/app/aluno/videos");

  const t = await getTranslations("Studio.clients");

  const submissions = listSubmissions({ clientId, limit: 100 }).sort((a, b) => {
    if (a.status !== b.status) return a.status === "pending" ? -1 : 1;
    return b.createdAt - a.createdAt;
  });

  if (submissions.length === 0) {
    return <Empty title={t("videosEmpty")} hint={t("videosEmptyHint")} />;
  }

  return (
    <ul className="space-y-3">
      {submissions.map((submission) => (
        <li key={submission.id}>
          <VideoQueueRow submission={submission} />
        </li>
      ))}
    </ul>
  );
}
