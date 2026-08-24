"use client";

import { useTranslations } from "next-intl";
import { saveCuesAction, type FieldState } from "@/app/app/coach/exercicios/actions";
import { field, muted } from "../theme";
import { InlineEditPanel, PanelEmpty } from "./InlineEditPanel";
import { cn } from "@/lib/utils";

function lines(cues: string): string[] {
  return cues
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * The cues, in both languages, edited where they are read.
 *
 * Two languages because the library holds both kinds of exercise: what Sara
 * wrote herself, in Portuguese, and what came over from Trainerize, in English.
 * Neither is a translation of the other yet, and a client reads whichever their
 * app is set to — so both sides are shown to her at once rather than hidden
 * behind a language switch she would have to remember to flip.
 */
export function ExerciseCues({
  exerciseId,
  cues,
  cuesEn,
}: {
  exerciseId: string;
  cues: string;
  cuesEn: string;
}) {
  const t = useTranslations("Studio.library");
  const save = saveCuesAction.bind(null, exerciseId);

  const pt = lines(cues);
  const en = lines(cuesEn);

  return (
    <InlineEditPanel
      label={t("cuesLabel")}
      action={save as (state: FieldState, formData: FormData) => Promise<FieldState>}
      hint={t("cuesHint")}
      read={
        <div className="space-y-4">
          <CueList label={t("cuesPtLabel")} items={pt} empty={t("cuesEmpty")} />
          <CueList label={t("cuesEnLabel")} items={en} empty={t("cuesEmpty")} />
        </div>
      }
      edit={
        <>
          <label className="block space-y-1.5">
            <span className="font-sans text-xs font-medium text-cream/55">{t("cuesPtLabel")}</span>
            <textarea name="cues" rows={5} defaultValue={cues} className={cn(field, "text-sm")} />
          </label>
          <label className="block space-y-1.5">
            <span className="font-sans text-xs font-medium text-cream/55">{t("cuesEnLabel")}</span>
            <textarea name="cuesEn" rows={5} defaultValue={cuesEn} className={cn(field, "text-sm")} />
          </label>
        </>
      }
    />
  );
}

function CueList({ label, items, empty }: { label: string; items: string[]; empty: string }) {
  return (
    <div className="space-y-1.5">
      <p className="font-sans text-xs font-medium text-cream/40">{label}</p>
      {items.length > 0 ? (
        <ul className={cn(muted, "list-disc space-y-1 pl-4")}>
          {items.map((line, index) => (
            // Cue lines have no stable identity beyond order; index is safe here.
            <li key={index}>{line}</li>
          ))}
        </ul>
      ) : (
        <PanelEmpty>{empty}</PanelEmpty>
      )}
    </div>
  );
}
