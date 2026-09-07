import { redirect } from "next/navigation";
import { AlunoChrome } from "@/components/studio/aluno/AlunoChrome";
import { requireClient } from "@/lib/studio/auth";
import { clientChrome } from "@/lib/studio/clientConsole";
import { getThemeMode } from "@/lib/studio/theme-mode";
import { myPendingIntake } from "@/lib/studio/intake";

/**
 * Chrome for every `/app/aluno/*` route: gate, then the same rail the coach
 * works in, filled with the aluna's own destinations.
 *
 * Auth and pending-intake run together. Badges, the bell, and the session
 * button come from one Convex query (`clientChrome`) instead of five overlapping
 * reads — and the chrome resubscribes live so a message does not wait on a reload.
 */
export default async function AlunoLayout({ children }: { children: React.ReactNode }) {
  const pendingPromise = myPendingIntake().catch(() => null);
  const client = await requireClient();
  const pending = await pendingPromise;
  if (pending) {
    redirect(pending.token ? `/app/convite/${pending.token}` : "/app/onboarding");
  }

  const [chrome, themeMode] = await Promise.all([clientChrome(client.id), getThemeMode()]);

  return (
    <AlunoChrome
      clientId={client.id}
      name={client.name}
      email={client.email}
      themeMode={themeMode}
      initialChrome={chrome}
      solo={client.profile.coachId === null}
    >
      {children}
    </AlunoChrome>
  );
}
