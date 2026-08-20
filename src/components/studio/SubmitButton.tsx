"use client";

import { useFormStatus } from "react-dom";
import { buttonGhost, buttonPrimary } from "./theme";
import { cn } from "@/lib/utils";

type SubmitButtonProps = {
  children: React.ReactNode;
  /** Shown while the enclosing form is submitting. Falls back to `children`. */
  pendingLabel?: string;
  variant?: "primary" | "ghost";
  className?: string;
  /** Passed through for `<button formAction>` multi-action forms. */
  formAction?: (formData: FormData) => void | Promise<void>;
  name?: string;
  value?: string;
  disabled?: boolean;
};

/**
 * Submit control that disables itself and swaps its label while the server
 * action runs. `useFormStatus` means it needs no state of its own and works for
 * every form in the app, including ones with several `formAction` buttons.
 */
export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  className,
  formAction,
  name,
  value,
  disabled,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      formAction={formAction}
      name={name}
      value={value}
      disabled={pending || disabled}
      aria-busy={pending}
      className={cn(variant === "primary" ? buttonPrimary : buttonGhost, className)}
    >
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}
