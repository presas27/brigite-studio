import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Field } from "@/components/studio/Field";
import { PageHeader } from "@/components/studio/PageHeader";
import { SubmitButton } from "@/components/studio/SubmitButton";
import { InstallApp } from "@/components/studio/InstallApp";
import { ThemeToggle } from "@/components/studio/ThemeToggle";
import { chip, chipAccent, eyebrow, field, muted, surface } from "@/components/studio/theme";
import { currentUser } from "@/lib/studio/auth";
import { findClient, myCoach } from "@/lib/studio/users";
import { getThemeMode } from "@/lib/studio/theme-mode";
import { locales } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { redirect } from "next/navigation";
import { changePasswordAction, leaveCoachAction, saveAccount } from "./actions";

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
  searchParams: Promise<{ guardado?: string; senha?: string }>;
}) {
  const [user, sp, t, tClients, common, locale, theme] = await Promise.all([
    currentUser(),
    searchParams,
    getTranslations("Studio.account"),
    getTranslations("Studio.clients"),
    getTranslations("Studio.common"),
    getLocale(),
    getThemeMode(),
  ]);
  if (!user) redirect("/app/entrar");

  const { guardado, senha } = sp;

  const client = user.role === "client" ? await findClient(user.id) : undefined;
  const coach = client ? await myCoach() : undefined;
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "long" });

  return (
    <div className="max-w-2xl space-y-8">
      <PageHeader
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

      <InstallApp />

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

      {client && (
        <section className={cn(surface, "flex flex-wrap items-center justify-between gap-4 p-5")}>
          <div className="min-w-0">
            <p className={eyebrow}>{t("coachLabel")}</p>
            <p className={cn(muted, "mt-1")}>
              {coach ? t("coachedBy", { name: coach.name }) : t("trainingAlone")}
            </p>
          </div>
          {coach && (
            <form action={leaveCoachAction}>
              <SubmitButton variant="ghost" pendingLabel={common("saving")}>
                {t("leaveCoach")}
              </SubmitButton>
            </form>
          )}
        </section>
      )}

      <form action={changePasswordAction} className={cn(surface, "space-y-5 p-5 sm:p-6")}>
        <p className={eyebrow}>{t("passwordTitle")}</p>
        {senha === "1" && <p className="font-sans text-sm text-accent-ink">{t("passwordChanged")}</p>}
        {senha === "0" && (
          <p className="font-sans text-sm text-silk" role="alert">
            {t("passwordFailed")}
          </p>
        )}
        <Field label={t("currentPassword")} htmlFor="current-password">
          <input
            id="current-password"
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
            className={field}
          />
        </Field>
        <Field label={t("newPassword")} htmlFor="new-password" hint={t("passwordHint")}>
          <input
            id="new-password"
            name="newPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={field}
          />
        </Field>
        <SubmitButton pendingLabel={common("saving")}>{t("changePassword")}</SubmitButton>
      </form>
    </div>
  );
}
