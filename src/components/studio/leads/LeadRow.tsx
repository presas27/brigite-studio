"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  convertLeadAction,
  saveLeadNotesAction,
  setLeadStatusAction,
} from "@/app/app/coach/leads/actions";
import { Field } from "@/components/studio/Field";
import { Modal } from "@/components/studio/Modal";
import { SubmitButton } from "@/components/studio/SubmitButton";
import { buttonPrimary, chip, chipAccent, field, muted, surfaceLink } from "@/components/studio/theme";
import type { Lead, LeadStatus } from "@/lib/studio/types";
import { cn } from "@/lib/utils";

const NEXT: LeadStatus[] = ["new", "talking", "won", "lost"];

/**
 * One enquiry. The row is a summary you can scan a page of; everything that
 * takes a decision — the full message, the reply, the private note, moving it
 * along the pipeline — is behind the click.
 *
 * The dot on the left is the only status marker in the row: a new lead is the
 * one thing here that is costing money while it waits, so it is the only one
 * that gets the gold.
 */
export function LeadRow({ lead, relative }: { lead: Lead; relative: string }) {
  const t = useTranslations("Studio.leads");
  const common = useTranslations("Studio.common");
  const clients = useTranslations("Studio.clients");
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  function move(status: LeadStatus) {
    startTransition(async () => {
      await setLeadStatusAction(lead.id, status);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(surfaceLink, "flex w-full flex-wrap items-center gap-4 p-4 text-left")}
      >
        <span
          aria-hidden
          className={cn(
            "h-2 w-2 shrink-0 rounded-full",
            lead.status === "new" ? "bg-accent-ink" : "bg-cream/20",
          )}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-sans text-sm font-semibold text-cream">
            {lead.name}
          </span>
          <span className="mt-0.5 block truncate font-sans text-xs text-cream/50">
            {lead.email}
            {lead.phone && ` · ${lead.phone}`}
          </span>
        </span>
        <span className="hidden min-w-0 flex-[2] truncate font-sans text-sm text-cream/60 lg:block">
          {lead.message || t("noMessage")}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {lead.interest && <span className={chip}>{clients(`plan.${lead.interest}`)}</span>}
          <span className={chip}>{t(`source.${lead.source}`)}</span>
          <span className="w-20 text-right font-sans text-xs text-cream/45">{relative}</span>
        </span>
      </button>

      <Modal
        open={open}
        onCloseAction={() => setOpen(false)}
        title={lead.name}
        lead={`${t(`source.${lead.source}`)} · ${relative}`}
        width="34rem"
      >
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`mailto:${lead.email}`}
              className="font-sans text-sm text-accent-ink transition-colors hover:text-cream"
            >
              {lead.email}
            </a>
            {lead.phone && <span className={chip}>{lead.phone}</span>}
            {lead.interest && <span className={chipAccent}>{clients(`plan.${lead.interest}`)}</span>}
          </div>

          <div>
            <h3 className="font-sans text-xs font-medium text-cream/55">{t("message")}</h3>
            <p className="mt-1.5 text-sm leading-relaxed whitespace-pre-line text-cream/85">
              {lead.message || t("noMessage")}
            </p>
          </div>

          <div>
            <h3 className="font-sans text-xs font-medium text-cream/55">{t("statusLabel")}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {NEXT.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => move(status)}
                  aria-pressed={lead.status === status}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 font-sans text-xs font-semibold transition-colors",
                    lead.status === status
                      ? "bg-accent-fill text-ink"
                      : "text-cream/60 ring-1 ring-cream/15 hover:bg-cream/5 hover:text-cream",
                  )}
                >
                  {t(`status.${status}`)}
                </button>
              ))}
            </div>
          </div>

          <form action={saveLeadNotesAction} className="space-y-2">
            <input type="hidden" name="leadId" value={lead.id} />
            <Field label={t("notesLabel")} hint={t("notesHint")} htmlFor={`lead-${lead.id}-notes`}>
              <textarea
                id={`lead-${lead.id}-notes`}
                name="notes"
                rows={2}
                defaultValue={lead.notes}
                className={field}
              />
            </Field>
            <SubmitButton variant="ghost" className="px-4 py-2 text-xs" pendingLabel={common("saving")}>
              {common("save")}
            </SubmitButton>
          </form>

          <div className="flex flex-wrap items-center gap-3 border-t border-cream/10 pt-4">
            <a href={`mailto:${lead.email}`} className={cn(buttonPrimary, "px-5 py-2.5 text-xs")}>
              {t("reply")}
            </a>
            {lead.clientId ? (
              <a
                href={`/app/coach/alunos/${lead.clientId}`}
                className="font-sans text-xs text-accent-ink transition-colors hover:text-cream"
              >
                {t("openClient")}
              </a>
            ) : (
              <form action={convertLeadAction}>
                <input type="hidden" name="leadId" value={lead.id} />
                <SubmitButton variant="ghost" className="px-5 py-2.5 text-xs">
                  {t("convert")}
                </SubmitButton>
              </form>
            )}
            <p className={cn(muted, "basis-full text-xs")}>{t("convertHint")}</p>
          </div>
        </div>
      </Modal>
    </>
  );
}
