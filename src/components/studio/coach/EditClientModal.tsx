"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { resendInvite, saveClient, setStatus } from "@/app/app/coach/actions";
import { Field } from "@/components/studio/Field";
import { SubmitButton } from "@/components/studio/SubmitButton";
import { buttonDanger, field, heading } from "@/components/studio/theme";
import type { Client } from "@/lib/studio/types";
import { cn } from "@/lib/utils";
import { Icon } from "./icons";

const PLANS = ["personal", "online", "specialty"] as const;

/**
 * Everything administrative about one client — name, plan, credits, goals,
 * limitations, the invite link and archiving — behind one control in the
 * masthead.
 *
 * It lives in a dialog rather than on the page because Sara edits a profile
 * about once a month and reads the client's plan and history every day: a
 * permanent form would put the rarest job at the top of the busiest screen.
 */
export function EditClientModal({ client }: { client: Client }) {
  const t = useTranslations("Studio.clients");
  const common = useTranslations("Studio.common");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  function openModal() {
    setOpen(true);
    dialogRef.current?.showModal();
  }

  function closeModal() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        aria-haspopup="dialog"
        className="inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 font-sans text-xs font-semibold text-cream/70 ring-1 ring-cream/15 transition-colors hover:bg-cream/5 hover:text-cream hover:ring-cream/30"
      >
        <Icon name="settings" className="h-4 w-4" />
        <span className="hidden sm:inline">{t("editProfile")}</span>
      </button>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === dialogRef.current) closeModal();
        }}
        className="m-auto max-h-[85vh] w-[min(36rem,calc(100vw-2rem))] overflow-y-auto rounded-[1.25rem] border-0 bg-ink-lift p-6 text-cream ring-1 ring-cream/10 backdrop:bg-ink/70 backdrop:backdrop-blur-sm sm:p-7"
      >
        {open && (
          <>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className={cn(heading, "truncate text-xl")}>{t("editProfile")}</h2>
                <p className="mt-1 font-sans text-xs text-cream/45">{client.email}</p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                aria-label={common("close")}
                className="shrink-0 text-cream/50 transition-colors hover:text-cream"
              >
                <Icon name="close" className="h-5 w-5" />
              </button>
            </div>

            <form
              action={async (formData) => {
                await saveClient(formData);
                closeModal();
              }}
              className="mt-5 grid gap-4 sm:grid-cols-2"
            >
              <input type="hidden" name="clientId" value={client.id} />
              <Field label={t("nameLabel")} htmlFor="edit-name" required className="sm:col-span-2">
                <input
                  id="edit-name"
                  name="name"
                  defaultValue={client.name}
                  required
                  className={field}
                />
              </Field>
              <Field label={t("planLabel")} htmlFor="edit-plan" required>
                <select
                  id="edit-plan"
                  name="plan"
                  defaultValue={client.profile.plan}
                  className={field}
                >
                  {PLANS.map((plan) => (
                    <option key={plan} value={plan}>
                      {t(`plan.${plan}`)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("sessionsLeft")} htmlFor="edit-sessions">
                <input
                  id="edit-sessions"
                  name="sessionsLeft"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={client.profile.sessionsLeft}
                  className={field}
                />
              </Field>
              <Field label={t("goalsLabel")} htmlFor="edit-goals" className="sm:col-span-2">
                <textarea
                  id="edit-goals"
                  name="goals"
                  rows={2}
                  defaultValue={client.profile.goals}
                  placeholder={t("goalsPlaceholder")}
                  className={field}
                />
              </Field>
              <Field label={t("injuriesLabel")} htmlFor="edit-injuries" className="sm:col-span-2">
                <textarea
                  id="edit-injuries"
                  name="injuries"
                  rows={2}
                  defaultValue={client.profile.injuries}
                  placeholder={t("injuriesPlaceholder")}
                  className={field}
                />
              </Field>
              <div className="flex justify-end sm:col-span-2">
                <SubmitButton pendingLabel={common("saving")}>{common("save")}</SubmitButton>
              </div>
            </form>

            <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-cream/10 pt-4">
              <form
                action={async (formData) => {
                  await resendInvite(formData);
                  closeModal();
                }}
              >
                <input type="hidden" name="clientId" value={client.id} />
                <SubmitButton
                  variant="ghost"
                  className="px-5 py-2.5 text-xs"
                  pendingLabel={common("sending")}
                >
                  {t("resendInvite")}
                </SubmitButton>
              </form>
              <form
                action={async (formData) => {
                  await setStatus(formData);
                  closeModal();
                }}
                className="ml-auto"
              >
                <input type="hidden" name="clientId" value={client.id} />
                <input
                  type="hidden"
                  name="status"
                  value={client.status === "archived" ? "active" : "archived"}
                />
                {client.status === "archived" ? (
                  <SubmitButton variant="ghost" className="px-5 py-2.5 text-xs">
                    {t("restore")}
                  </SubmitButton>
                ) : (
                  <button type="submit" className={cn(buttonDanger, "text-xs")}>
                    {t("archive")}
                  </button>
                )}
              </form>
            </div>
          </>
        )}
      </dialog>
    </>
  );
}
