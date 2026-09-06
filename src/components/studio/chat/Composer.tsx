"use client";

import { useActionState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { SubmitButton } from "@/components/studio/SubmitButton";
import { AutoResizeTextarea } from "@/components/studio/AutoResizeTextarea";
import { field } from "@/components/studio/theme";
import { cn } from "@/lib/utils";
export type ComposerState = { ok: boolean; error?: "required" | "tooLong" };

const initial: ComposerState = { ok: false };

/** Sane cap for a coaching chat message — long enough for a paragraph, not a novel. */
export const MAX_MESSAGE_LENGTH = 4000;

/**
 * Message composer: one textarea, one send button.
 *
 * The textarea is intentionally uncontrolled — React never re-renders its DOM
 * value across a server-action round trip, so a successful send must clear it
 * imperatively via the form ref rather than by resetting some `body` state.
 */
export function Composer({
  action,
}: {
  action: (state: ComposerState, formData: FormData) => Promise<ComposerState>;
}) {
  const t = useTranslations("Studio.messages");
  const common = useTranslations("Studio.common");
  const errors = useTranslations("Studio.errors");
  const [state, formAction] = useActionState(action, initial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <div className="space-y-2">
      <form ref={formRef} action={formAction} className="flex items-end gap-2">
        <AutoResizeTextarea
          name="body"
          rows={2}
          required
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder={t("placeholder")}
          className={cn(field, "min-h-11 flex-1 py-2.5")}
        />
        <SubmitButton pendingLabel={common("sending")} className="shrink-0">
          {common("send")}
        </SubmitButton>
      </form>
      {state.error && (
        <p className="font-sans text-xs text-silk" role="alert">
          {state.error === "tooLong" ? errors("tooLong") : errors("required")}
        </p>
      )}
    </div>
  );
}
