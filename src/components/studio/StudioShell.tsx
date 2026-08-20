import { getTranslations } from "next-intl/server";
import { SolMark } from "@/components/ui/SolMark";
import type { ThemeMode } from "@/lib/studio/theme-mode";
import { AccountMenu } from "./AccountMenu";
import { Nav, type NavItem } from "./Nav";
import { ThemeToggle } from "./ThemeToggle";

/**
 * Chrome for every signed-in studio page: brand mark, the role's tab bar, and
 * sign-out. Deliberately not the marketing Header — no site navigation, no
 * language toggle competing for attention, no links back out into the funnel.
 */
export async function StudioShell({
  role,
  name,
  email,
  themeMode,
  badges,
  children,
}: {
  role: "coach" | "client";
  name: string;
  email: string;
  themeMode: ThemeMode;
  /** Optional counts keyed by nav href, e.g. `{ "/app/coach/videos": 3 }`. */
  badges?: Record<string, number>;
  children: React.ReactNode;
}) {
  const t = await getTranslations("Studio");

  const coachItems: NavItem[] = [
    { href: "/app/coach", label: t("nav.today") },
    { href: "/app/coach/alunos", label: t("nav.clients") },
    { href: "/app/coach/treinos", label: t("nav.workouts") },
    { href: "/app/coach/biblioteca", label: t("nav.library") },
    { href: "/app/coach/videos", label: t("nav.videos") },
    { href: "/app/coach/mensagens", label: t("nav.messages") },
  ];

  const clientItems: NavItem[] = [
    { href: "/app/aluno", label: t("nav.today") },
    { href: "/app/aluno/plano", label: t("nav.plan") },
    { href: "/app/aluno/videos", label: t("nav.videos") },
    { href: "/app/aluno/checkin", label: t("nav.checkin") },
    { href: "/app/aluno/mensagens", label: t("nav.messages") },
    { href: "/app/aluno/progresso", label: t("nav.progress") },
  ];

  const items = (role === "coach" ? coachItems : clientItems).map((item) => ({
    ...item,
    badge: badges?.[item.href],
  }));

  return (
    <div className="studio flex min-h-dvh flex-col">
      {/* A caramel hairline instead of a grey rule — the brand thread that runs
          across every screen without spending the gold surface budget. */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-[linear-gradient(90deg,transparent,var(--caramel)_18%,var(--caramel-deep)_82%,transparent)] after:opacity-60">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-3 px-4 py-3 sm:px-6">
          <p className="flex items-center gap-2 font-display text-sm uppercase tracking-[0.08em]">
            <SolMark className="h-4 w-4 text-accent-ink" />
            {t("brand")}
          </p>
          <div className="order-3 w-full sm:order-2 sm:w-auto sm:flex-1">
            <Nav items={items} ariaLabel={t("nav.menu")} />
          </div>
          <div className="order-2 ml-auto flex items-center gap-2 sm:order-3 sm:ml-0">
            <ThemeToggle initial={themeMode} />
            <AccountMenu name={name} email={email} role={role} />
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-5xl grow px-4 py-8 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
