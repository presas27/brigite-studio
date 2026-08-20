import { permanentRedirect } from "next/navigation";

/**
 * The thread moved into the client page as its Messages tab. Kept as a
 * redirect so older links — bookmarks, notification emails — still land on
 * the right conversation.
 */
export default async function CoachThreadRedirect({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  permanentRedirect(`/app/coach/alunos/${clientId}/mensagens`);
}
