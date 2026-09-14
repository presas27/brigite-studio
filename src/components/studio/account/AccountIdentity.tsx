"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { saveAccount, type SaveAccountState } from "@/app/app/conta/actions";
import { Avatar } from "@/components/studio/Avatar";
import { Field } from "@/components/studio/Field";
import { MorphHeight } from "@/components/studio/MorphHeight";
import { SubmitButton } from "@/components/studio/SubmitButton";
import { Icon } from "@/components/studio/coach/icons";
import { buttonGhost, chip, chipAccent, field, heading, surface } from "@/components/studio/theme";
import { cn } from "@/lib/utils";

export type AccountChip = { label: string; accent?: boolean };

const INITIAL: SaveAccountState = { ok: false };

/**
 * Who is signed in, and the only two things about it this person can change.
 *
 * The page used to open on three stacked forms — name, password, coach — which
 * made a settings screen look like a data-entry screen and put a one-click
 * destructive action a thumb's width from a text input. So the card reads
 * first: photo, name, email, the facts as chips. Editing is a mode you ask
 * for, and it swaps in place rather than pushing the page around.
 *
 * The email is shown inside the form but disabled: it is the login, Better
 * Auth owns it, and leaving it out of the edit view would only make people
 * hunt for it.
 */
export function AccountIdentity({
  name,
  email,
  locale,
  locales,
  chips,
}: {
  name: string;
  email: string;
  locale: string;
  locales: { code: string; label: string }[];
  chips: AccountChip[];
}) {
  const t = useTranslations("Studio.account");
  const common = useTranslations("Studio.common");
  const [state, formAction] = useActionState(saveAccount, INITIAL);
  const [editing, setEditing] = useState(false);

  // Leave edit mode the moment the action comes back happy. Adjusting during
  // render rather than in an effect: `useActionState` hands back a new object
  // per run, so the identity check fires once per save and React re-renders
  // before painting instead of showing the open form for a frame.
  const [settled, setSettled] = useState(state);
  if (settled !== state) {
    setSettled(state);
    if (state.ok) setEditing(false);
  }

  const mode = editing ? "edit" : state.ok ? "saved" : "view";

  return (
    <section className={cn(surface, "p-5 sm:p-6")}>
      <div className="flex items-center gap-4 sm:gap-5">
        <Avatar name={name} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 className={cn(heading, "truncate text-xl sm:text-2xl")}>{name}</h2>
          <p className="mt-1 truncate font-sans text-sm text-cream/55">{email}</p>
          {chips.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {chips.map((item) => (
                <span key={item.label} className={item.accent ? chipAccent : chip}>
                  {item.label}
                </span>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setEditing((value) => !value)}
          aria-expanded={editing}
          aria-label={editing ? common("cancel") : t("editDetails")}
          className={cn(buttonGhost, "shrink-0 self-start px-3 py-2 text-xs sm:px-4")}
        >
          <Icon name={editing ? "close" : "settings"} className="h-4 w-4" />
          <span className="hidden sm:inline">{editing ? common("cancel") : t("editDetails")}</span>
        </button>
      </div>

      <MorphHeight contentKey={mode}>
        {editing ? (
          <form action={formAction} className="mt-5 space-y-4 border-t border-cream/10 pt-5">
            <Field label={t("nameLabel")} htmlFor="account-name" required>
              <input
                id="account-name"
                name="name"
                defaultValue={name}
                required
                maxLength={200}
                autoComplete="name"
                className={field}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("emailLabel")} htmlFor="account-email" hint={t("emailHint")}>
                <input id="account-email" value={email} readOnly disabled className={field} />
              </Field>
              <Field label={t("languageLabel")} htmlFor="account-locale">
                <select id="account-locale" name="locale" defaultValue={locale} className={field}>
                  {locales.map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="flex flex-wrap gap-2">
              <SubmitButton pendingLabel={common("saving")}>{common("save")}</SubmitButton>
              <button type="button" onClick={() => setEditing(false)} className={buttonGhost}>
                {common("cancel")}
              </button>
            </div>
          </form>
        ) : state.ok ? (
          <p className="mt-4 border-t border-cream/10 pt-4 font-sans text-sm text-accent-ink">
            {t("saved")}
          </p>
        ) : null}
      </MorphHeight>
    </section>
  );
}
