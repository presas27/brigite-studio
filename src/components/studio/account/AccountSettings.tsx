"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import {
  changePasswordAction,
  leaveCoachAction,
  type PasswordState,
} from "@/app/app/conta/actions";
import { Field } from "@/components/studio/Field";
import { Modal } from "@/components/studio/Modal";
import { SubmitButton } from "@/components/studio/SubmitButton";
import { SignOutButton } from "@/components/studio/SignOutButton";
import { ThemeToggle } from "@/components/studio/ThemeToggle";
import { buttonGhost, field, muted, surface } from "@/components/studio/theme";
import type { ThemeMode } from "@/lib/studio/theme-mode";
import { cn } from "@/lib/utils";

const PASSWORD_INITIAL: PasswordState = { status: "idle" };

/**
 * Everything that is a setting rather than a fact: appearance, password, the
 * coach a client trains with, and the way out of the session.
 *
 * One card of rows instead of a card per concern. Each row says what it is and
 * carries its one control; the two that need a form open it in a dialog, so
 * the page stays the height of a phone screen instead of three scrolls of
 * inputs nobody came to fill in. Sign-out is last because the phone dock hides
 * the topbar chip that carries it everywhere else.
 */
export function AccountSettings({
  themeMode,
  isClient,
  coachName,
  goals,
}: {
  themeMode: ThemeMode;
  isClient: boolean;
  coachName: string | null;
  goals?: string;
}) {
  const t = useTranslations("Studio.account");
  const tClients = useTranslations("Studio.clients");

  return (
    <section className={cn(surface, "divide-y divide-cream/10")}>
      <Row
        title={t("appearanceLabel")}
        lead={t("appearanceHint")}
        action={<ThemeToggle initial={themeMode} />}
      />

      <PasswordRow />

      {isClient && (
        <CoachRow coachName={coachName}>
          {goals ? (
            <p className={cn(muted, "mt-1")}>
              <span className="text-cream/45">{tClients("goalsLabel")}: </span>
              {goals}
            </p>
          ) : null}
        </CoachRow>
      )}

      <Row title={t("signOut")} lead={t("signOutHint")} action={<SignOutButton />} />
    </section>
  );
}

function Row({
  title,
  lead,
  children,
  action,
}: {
  title: string;
  lead?: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0 flex-1">
        <p className="font-sans text-sm font-medium text-cream">{title}</p>
        {lead && <p className={cn(muted, "mt-0.5")}>{lead}</p>}
        {children}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/** Password, behind a dialog: rare, two fields, and nothing to read when closed. */
function PasswordRow() {
  const t = useTranslations("Studio.account");
  const common = useTranslations("Studio.common");
  const [state, formAction] = useActionState(changePasswordAction, PASSWORD_INITIAL);
  const [open, setOpen] = useState(false);

  // Close on success, during render rather than in an effect: the dialog must
  // not survive a frame past the change it asked for.
  const [settled, setSettled] = useState(state);
  if (settled !== state) {
    setSettled(state);
    if (state.status === "ok") setOpen(false);
  }

  return (
    <>
      <Row
        title={t("passwordTitle")}
        lead={state.status === "ok" ? t("passwordChanged") : t("passwordRowHint")}
        action={
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            className={cn(buttonGhost, "px-4 py-2 text-xs")}
          >
            {t("changePasswordShort")}
          </button>
        }
      />

      <Modal
        open={open}
        onCloseAction={() => setOpen(false)}
        title={t("passwordTitle")}
        lead={t("passwordRowHint")}
        width="26rem"
      >
        <form action={formAction} className="space-y-4">
          {(state.status === "failed" || state.status === "tooShort") && (
            <p className="font-sans text-sm text-silk" role="alert">
              {state.status === "tooShort" ? t("passwordHint") : t("passwordFailed")}
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
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className={buttonGhost}>
              {common("cancel")}
            </button>
            <SubmitButton pendingLabel={common("saving")}>{t("changePassword")}</SubmitButton>
          </div>
        </form>
      </Modal>
    </>
  );
}

/**
 * The coach, and the one way out of the relationship.
 *
 * Leaving used to be a bare submit button sitting on the page: one stray tap
 * detached a student from her coach, silently, with a re-invite and the whole
 * intake form as the only way back. It asks now — and the dialog names the
 * coach and says what is lost, because "are you sure?" on its own is a button
 * people learn to click through.
 */
function CoachRow({ coachName, children }: { coachName: string | null; children?: React.ReactNode }) {
  const t = useTranslations("Studio.account");
  const common = useTranslations("Studio.common");
  const [open, setOpen] = useState(false);

  // No effect to close it after the action lands: the dialog exists only while
  // there is a coach to leave, so the answer to "is it open" includes that.

  return (
    <>
      <Row
        title={t("coachLabel")}
        lead={coachName ? t("coachedBy", { name: coachName }) : t("trainingAlone")}
        action={
          coachName && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-haspopup="dialog"
              className="inline-flex cursor-pointer items-center rounded-full px-4 py-2 font-sans text-xs font-semibold text-silk ring-1 ring-silk/30 transition-colors hover:bg-silk/10 hover:ring-silk/50"
            >
              {t("leaveCoach")}
            </button>
          )
        }
      >
        {children}
      </Row>

      <Modal
        open={open && coachName !== null}
        onCloseAction={() => setOpen(false)}
        title={t("leaveCoachTitle", { name: coachName ?? "" })}
        lead={t("leaveCoachWarning", { name: coachName ?? "" })}
        width="26rem"
      >
        <form action={leaveCoachAction} className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => setOpen(false)} className={buttonGhost} autoFocus>
            {common("cancel")}
          </button>
          <SubmitButton variant="danger" pendingLabel={common("saving")}>
            {t("leaveCoachConfirm")}
          </SubmitButton>
        </form>
      </Modal>
    </>
  );
}
