"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Field } from "@/components/studio/Field";
import { field } from "@/components/studio/theme";
import { WORKOUT_DURATION_PRESETS } from "@/lib/studio/duration";

const CUSTOM = "custom";

export function EstimatedDurationField({
  id,
  defaultMinutes,
}: {
  id: string;
  defaultMinutes?: number | null;
}) {
  const t = useTranslations("Studio.workouts");
  const preset =
    defaultMinutes != null &&
    WORKOUT_DURATION_PRESETS.includes(defaultMinutes as (typeof WORKOUT_DURATION_PRESETS)[number])
      ? String(defaultMinutes)
      : defaultMinutes
        ? CUSTOM
        : "";
  const [choice, setChoice] = useState(preset);
  const minutes =
    choice === CUSTOM
      ? defaultMinutes && !WORKOUT_DURATION_PRESETS.includes(defaultMinutes as never)
        ? String(defaultMinutes)
        : ""
      : choice;

  return (
    <Field label={t("estimatedDurationLabel")} htmlFor={id}>
      <select
        id={id}
        value={choice}
        onChange={(event) => setChoice(event.target.value)}
        className={field}
      >
        <option value="">{t("estimatedDurationEmpty")}</option>
        {WORKOUT_DURATION_PRESETS.map((value) => (
          <option key={value} value={value}>
            {t("durationMinutes", { count: value })}
          </option>
        ))}
        <option value={CUSTOM}>{t("estimatedDurationCustom")}</option>
      </select>
      {choice === CUSTOM && (
        <input
          type="number"
          min={1}
          name="estimatedMinutes"
          defaultValue={minutes}
          placeholder={t("estimatedDurationPlaceholder")}
          className={`${field} mt-2`}
        />
      )}
      {choice !== CUSTOM && <input type="hidden" name="estimatedMinutes" value={choice} />}
    </Field>
  );
}
