import { eyebrow } from "./theme";
import { cn } from "@/lib/utils";

type FieldProps = {
  label: string;
  /** Ties the label to the control. Must match the input's `id`. */
  htmlFor?: string;
  hint?: string;
  error?: string;
  /** `true` renders the label with a subtle required marker. */
  required?: boolean;
  className?: string;
  children: React.ReactNode;
};

/**
 * Label + control + hint/error wrapper. The control itself is plain HTML with
 * the `field` class from `theme.ts` — no prop forwarding, so native attributes
 * (inputMode, step, pattern, autoComplete) all just work.
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className={eyebrow}>
        {label}
        {required && <span className="ml-1 text-accent-ink/70">*</span>}
      </label>
      {children}
      {error ? (
        <p className="font-sans text-xs text-silk" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="font-sans text-xs text-cream/45">{hint}</p>
      )}
    </div>
  );
}
