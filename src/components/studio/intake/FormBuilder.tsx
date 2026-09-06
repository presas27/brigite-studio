"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/studio/coach/icons";
import { Field } from "@/components/studio/Field";
import { buttonGhost, buttonPrimary, field, muted, surface } from "@/components/studio/theme";
import { cn } from "@/lib/utils";
import type { IntakeFieldType } from "@/app/app/coach/formulario/actions";
import { saveCoachForm } from "@/app/app/coach/formulario/actions";

export type BuilderField = {
  id: string;
  position: number;
  type: IntakeFieldType;
  label: string;
  hint: string;
  required: boolean;
  options: string[];
  section?: string;
  sensitive?: boolean;
  showIf?: { fieldId: string; equals: string };
};

const TYPES: IntakeFieldType[] = [
  "text",
  "textarea",
  "number",
  "date",
  "yesno",
  "select",
  "multiselect",
  "checkbox",
];

function mintId() {
  return `f_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * The coach's intake form, as a list she can grow and reorder.
 *
 * A field is a question. The published toggle is the only thing that makes
 * the form bind an invite — a draft with ten questions still lets people
 * accept, because an unpublished form is a note to self, not a gate.
 */
export function FormBuilder({
  initialTitle,
  initialIntro,
  initialPublished,
  initialFields,
}: {
  initialTitle: string;
  initialIntro: string;
  initialPublished: boolean;
  initialFields: BuilderField[];
}) {
  const t = useTranslations("Studio.intake");
  const common = useTranslations("Studio.common");
  const [title, setTitle] = useState(initialTitle);
  const [intro, setIntro] = useState(initialIntro);
  const [published, setPublished] = useState(initialPublished);
  const [fields, setFields] = useState(initialFields);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState(false);

  function update(id: string, patch: Partial<BuilderField>) {
    setFields((current) => current.map((field) => (field.id === id ? { ...field, ...patch } : field)));
    setSaved(false);
  }

  function move(id: string, dir: -1 | 1) {
    setFields((current) => {
      const index = current.findIndex((field) => field.id === id);
      const next = index + dir;
      if (index < 0 || next < 0 || next >= current.length) return current;
      const copy = [...current];
      [copy[index], copy[next]] = [copy[next], copy[index]];
      return copy.map((field, position) => ({ ...field, position }));
    });
    setSaved(false);
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        setFailed(false);
        startTransition(async () => {
          try {
            await saveCoachForm({
              title,
              intro,
              published,
              fields: fields.map((field, position) => ({ ...field, position })),
            });
            setSaved(true);
          } catch {
            setFailed(true);
          }
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("titleLabel")} htmlFor="intake-title">
          <input
            id="intake-title"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              setSaved(false);
            }}
            placeholder={t("titlePlaceholder")}
            className={field}
          />
        </Field>
        <label className="flex items-center gap-3 self-end rounded-[1rem] bg-cream/5 px-4 py-3 ring-1 ring-cream/10">
          <input
            type="checkbox"
            checked={published}
            onChange={(event) => {
              setPublished(event.target.checked);
              setSaved(false);
            }}
            className="h-4 w-4 accent-[var(--accent-ink,#c4a484)]"
          />
          <span className="font-sans text-sm text-cream">{t("published")}</span>
        </label>
      </div>

      <Field label={t("introLabel")} htmlFor="intake-intro" hint={t("introHint")}>
        <textarea
          id="intake-intro"
          rows={3}
          value={intro}
          onChange={(event) => {
            setIntro(event.target.value);
            setSaved(false);
          }}
          placeholder={t("introPlaceholder")}
          className={cn(field, "resize-y")}
        />
      </Field>

      <ul className="space-y-3">
        {fields.map((item, index) => (
          <li key={item.id} className={cn(surface, "space-y-3 p-4")}>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={item.type}
                onChange={(event) => update(item.id, { type: event.target.value as IntakeFieldType })}
                className={cn(field, "w-auto py-2 text-sm")}
                aria-label={t("typeLabel")}
              >
                {TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`types.${type}`)}
                  </option>
                ))}
              </select>
              <label className="ml-auto flex items-center gap-2 font-sans text-xs text-cream/70">
                <input
                  type="checkbox"
                  checked={item.sensitive ?? false}
                  onChange={(event) => update(item.id, { sensitive: event.target.checked })}
                />
                {t("sensitive")}
              </label>
              <label className="flex items-center gap-2 font-sans text-xs text-cream/70">
                <input
                  type="checkbox"
                  checked={item.required}
                  onChange={(event) => update(item.id, { required: event.target.checked })}
                />
                {t("required")}
              </label>
              <button type="button" onClick={() => move(item.id, -1)} disabled={index === 0} className="p-1.5 text-cream/45 hover:text-cream disabled:opacity-30" aria-label={t("moveUp")}>
                <Icon name="chevron" className="h-3.5 w-3.5 -rotate-90" />
              </button>
              <button type="button" onClick={() => move(item.id, 1)} disabled={index === fields.length - 1} className="p-1.5 text-cream/45 hover:text-cream disabled:opacity-30" aria-label={t("moveDown")}>
                <Icon name="chevron" className="h-3.5 w-3.5 rotate-90" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setFields((current) => current.filter((field) => field.id !== item.id));
                  setSaved(false);
                }}
                className="p-1.5 text-cream/45 hover:text-silk"
                aria-label={common("remove")}
              >
                <Icon name="trash" className="h-3.5 w-3.5" />
              </button>
            </div>
            <input
              value={item.section ?? ""}
              onChange={(event) => update(item.id, { section: event.target.value })}
              placeholder={t("sectionPlaceholder")}
              className={cn(field, "text-xs font-medium text-accent-ink")}
            />
            <input
              value={item.label}
              onChange={(event) => update(item.id, { label: event.target.value })}
              placeholder={t("questionPlaceholder")}
              className={field}
            />
            <input
              value={item.hint}
              onChange={(event) => update(item.id, { hint: event.target.value })}
              placeholder={t("hintPlaceholder")}
              className={cn(field, "text-sm")}
            />
            {(item.type === "select" || item.type === "multiselect") && (
              <input
                value={item.options.join(", ")}
                onChange={(event) =>
                  update(item.id, {
                    options: event.target.value.split(",").map((option) => option.trim()).filter(Boolean),
                  })
                }
                placeholder={t("optionsPlaceholder")}
                className={cn(field, "text-sm")}
              />
            )}
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => {
          setFields((current) => [
            ...current,
            {
              id: mintId(),
              position: current.length,
              type: "text",
              label: "",
              hint: "",
              required: true,
              options: [],
            },
          ]);
          setSaved(false);
        }}
        className={cn(buttonGhost, "w-full justify-center")}
      >
        <Icon name="plus" className="h-4 w-4" />
        {t("addField")}
      </button>

      {fields.length === 0 && <p className={muted}>{t("emptyFields")}</p>}
      {failed && (
        <p role="alert" className="font-sans text-sm text-silk">
          {t("saveFailed")}
        </p>
      )}
      {saved && <p className="font-sans text-sm text-accent-ink">{t("saved")}</p>}

      <button type="submit" disabled={pending} className={cn(buttonPrimary, "px-6 py-3")}>
        {pending ? common("saving") : common("save")}
      </button>
    </form>
  );
}
