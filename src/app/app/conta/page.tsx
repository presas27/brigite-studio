import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Field } from "@/components/studio/Field";
import { PageHeader } from "@/components/studio/PageHeader";
import { SubmitButton } from "@/components/studio/SubmitButton";
import { ThemeToggle } from "@/components/studio/ThemeToggle";
import { chip, chipAccent, eyebrow, field, muted, surface } from "@/components/studio/theme";
import { currentUser } from "@/lib/studio/auth";
import { findClient } from "@/lib/studio/users";
import { getThemeMode } from "@/lib/studio/theme-mode";
import { locales } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { redirect } from "next/navigation";
import { saveAccount } from "./actions";

export const metadata: Metadata = {
  title: "Conta",
  robots: { index: false, follow: false },
};

/**
 * Account details, shared by both roles — the same three things (who you are,
 * what language, which theme) with the client's plan appended when relevant.
 * One page beats two nearly identical ones behind a role check.
 */
export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ guardado?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/app/entrar");

  const { guardado } = await searchParams;
  const [t, tClients, common, locale, theme] = await Promise.all([
    getTranslations("Studio.account"),
    getTranslations("Studio.clients"),
    getTranslations("Studio.common"),
    getLocale(),
    getThemeMode(),
  ]);

  const client = user.role === "client" ? findClient(user.id) : undefined;
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "long" });

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader
        kicker={t(`role.${user.role}`)}
        title={t("title")}
        lead={t("lead")}
        backHref={user.role === "coach" ? "/app/coach" : "/app/aluno"}
      />

      {guardado === "1" && (
        <p className={cn(surface, "px-4 py-3 font-sans text-sm text-accent-ink")}>{t("saved")}</p>
      )}

      <form action={saveAccount} className={cn(surface, "space-y-5 p-5 sm:p-6")}>
        <Field label={t("nameLabel")} htmlFor="account-name" required>
          <input
            id="account-name"
            name="name"
            defaultValue={user.name}
            required
            maxLength={200}
            autoComplete="name"
            className={field}
          />
        </Field>

        <Field label={t("emailLabel")} htmlFor="account-email" hint={t("emailHint")}>
          <input id="account-email" value={user.email} readOnly disabled className={field} />
        </Field>

        <Field label={t("languageLabel")} htmlFor="account-locale">
          <select id="account-locale" name="locale" defaultValue={user.locale} className={field}>
            {locales.map((code) => (
              <option key={code} value={code}>
                {new Intl.DisplayNames([locale], { type: "language" }).of(code) ?? code}
              </option>
            ))}
          </select>
        </Field>

        <SubmitButton pendingLabel={common("saving")}>{common("save")}</SubmitButton>
      </form>

      <section className={cn(surface, "flex flex-wrap items-center justify-between gap-4 p-5")}>
        <div className="min-w-0">
          <p className={eyebrow}>{t("appearanceLabel")}</p>
          <p className={cn(muted, "mt-1")}>{t("appearanceHint")}</p>
        </div>
        <ThemeToggle initial={theme} />
      </section>

      {client && (
        <section className={cn(surface, "space-y-3 p-5")}>
          <p className={eyebrow}>{tClients("profile")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className={chipAccent}>{tClients(`plan.${client.profile.plan}`)}</span>
            <span className={chip}>{tClients(`status.${client.status}`)}</span>
            {client.profile.startedAt != null && (
              <span className={chip}>
                {t("memberSince")} · {dateFormat.format(client.profile.startedAt)}
              </span>
            )}
          </div>
          {client.profile.goals && (
            <p className={muted}>
              <span className={cn(eyebrow, "mr-2")}>{tClients("goalsLabel")}</span>
              {client.profile.goals}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
