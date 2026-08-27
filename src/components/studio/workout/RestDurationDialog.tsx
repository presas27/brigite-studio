"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { removeItemAction, updateItemAction } from "@/app/app/coach/treinos/actions";
import { Field } from "@/components/studio/Field";
import { Modal } from "@/components/studio/Modal";
import { SubmitButton } from "@/components/studio/SubmitButton";
import { buttonDanger, buttonGhost } from "@/components/studio/theme";
import { REST_PRESETS, formatRestDuration } from "@/lib/studio/duration";
import type { WorkoutItem } from "@/lib/studio/types";
import { cn } from "@/lib/utils";
import { smallField } from "./parts";

export function RestDurationDialog({
  workoutId,
  item,
  open,
  onCloseAction,
}: {
  workoutId: string;
  item: WorkoutItem;
  open: boolean;
  onCloseAction: () => void;
}) {
  const t = useTranslations("Studio.workouts");
  const common = useTranslations("Studio.common");
  const removeForm = useRef<HTMLFormElement>(null);
  const current = item.seconds ?? 60;
  const known = REST_PRESETS.includes(current as (typeof REST_PRESETS)[number]);
  const [seconds, setSeconds] = useState(current);
  const [custom, setCustom] = useState(known ? "" : String(current));

  return (
    <Modal open={open} onCloseAction={onCloseAction} title={t("restTitle")}>
      <form
        action={async (formData) => {
          await updateItemAction(formData);
          onCloseAction();
        }}
        className="space-y-4"
      >
        <input type="hidden" name="workoutId" value={workoutId} />
        <input type="hidden" name="itemId" value={item.id} />
        <input type="hidden" name="measureMode" value="duration" />
        <input type="hidden" name="durationText" value={custom.trim() || String(seconds)} />
        <input type="hidden" name="sets" value="1" />
        <input type="hidden" name="reps" value="" />
        <input type="hidden" name="restSeconds" value="0" />
        <input type="hidden" name="tempo" value="" />
        <input type="hidden" name="rpe" value="" />
        <input type="hidden" name="notes" value={item.notes} />

        <div className="flex flex-wrap gap-2">
          {REST_PRESETS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setSeconds(value);
                setCustom("");
              }}
              className={cn(
                buttonGhost,
                "px-3 py-1.5 text-xs",
                custom.trim() === "" && value === seconds && "bg-cream/10 ring-accent-ink/70",
              )}
            >
              {formatRestDuration(value)}
            </button>
          ))}
        </div>

        <Field label={t("restCustom")} htmlFor={`rest-${item.id}-custom`}>
          <input
            id={`rest-${item.id}-custom`}
            inputMode="numeric"
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            placeholder="75"
            className={smallField}
          />
        </Field>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-cream/10 pt-4">
          <button
            type="button"
            onClick={() => removeForm.current?.requestSubmit()}
            className={cn(buttonDanger, "text-xs")}
          >
            {t("removeRest")}
          </button>
          <SubmitButton pendingLabel={common("saving")}>{common("save")}</SubmitButton>
        </div>
      </form>

      <form
        ref={removeForm}
        action={async (formData) => {
          await removeItemAction(formData);
          onCloseAction();
        }}
        className="hidden"
      >
        <input type="hidden" name="workoutId" value={workoutId} />
        <input type="hidden" name="itemId" value={item.id} />
      </form>
    </Modal>
  );
}
