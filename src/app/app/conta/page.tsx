import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/studio/PageHeader";
import { InstallApp } from "@/components/studio/InstallApp";
import { AccountIdentity, type AccountChip } from "@/components/studio/account/AccountIdentity";
import { AccountSettings } from "@/components/studio/account/AccountSettings";
import { surfaceLink } from "@/components/studio/theme";
import { dateFormatter, languageLabel } from "@/components/studio/format";
import { currentUser } from "@/lib/studio/auth";
import { findClient, myCoach } from "@/lib/studio/users";
import { getThemeMode } from "@/lib/studio/theme-mode";
import { locales } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { redirect } from "next/navigation";
import { BillingCard } from "@/components/studio/BillingCard";
import { isAdmin } from "@/lib/studio/billing";

export const metadata: Metadata = {
  title: "Conta",
  robots: { index: false, follow: false },
};

/**
 * Account details, shared by both roles — the same three things (who you are,
 * what language, which theme) with the client's plan appended when relevant.
 * One page beats two nearly identical ones behind a role check.
 *
 * It reads before it writes: an identity card with the facts, then one card of
 * settings rows. Everything that takes a form — the name, the password, ending
 * the coaching — is a mode or a dialog you open. The old shape was three
 * always-open forms stacked down a scroll, which made a page you visit to
 * check something look like a page you came to fill in.
 */
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ faturacao?: string }>;
}) {
  const [user, sp, t, tClients, locale, theme, admin] = await Promise.all([
    currentUser(),
    searchParams,
    getTranslations("Studio.account"),
    getTranslations("Studio.clients"),
    getLocale(),
    getThemeMode(),
    isAdmin(),
  ]);
  if (!user) redirect("/app/entrar");

  const client = user.role === "client" ? await findClient(user.id) : undefined;
  const coach = client ? await myCoach() : undefined;

  const dateFormat = dateFormatter(locale, { dateStyle: "medium" });

  const chips: AccountChip[] = [{ label: t(`role.${user.role}`), accent: true }];
  if (client) {
    chips.push({ label: tClients(`plan.${client.profile.plan}`) });
    if (client.profile.startedAt != null) {
      chips.push({ label: `${t("memberSince")} · ${dateFormat.format(client.profile.startedAt)}` });
    }
  }
  chips.push({ label: languageLabel(locale, user.locale) });

  return (
    <div className="max-w-2xl space-y-5">
      <PageHeader
        title={t("title")}
        lead={t("lead")}
        backHref={user.role === "coach" ? "/app/coach" : "/app/aluno"}
      />

      <AccountIdentity
        name={user.name}
        email={user.email}
        locale={user.locale}
        locales={locales.map((code) => ({ code, label: languageLabel(locale, code) }))}
        chips={chips}
      />

      <AccountSettings
        themeMode={theme}
        isClient={client !== undefined}
        coachName={coach?.name ?? null}
        goals={client?.profile.goals || undefined}
      />

      {user.role === "coach" && <BillingCard notice={sp.faturacao} />}

      {admin && (
        <Link
          href="/app/admin"
          className={cn(surfaceLink, "block px-5 py-4 font-sans text-sm text-cream")}
        >
          {t("adminLink")}
        </Link>
      )}

      <InstallApp />

    </div>
  );
}
