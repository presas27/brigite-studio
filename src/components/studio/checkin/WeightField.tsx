import { eyebrow } from "../theme";

/**
 * The one typed number on the check-in. It sits in the dial row, so it borrows
 * their column and their type: a small box, the digits in the display face at
 * the same weight as the value in a dial, unit underneath. Optional — a blank
 * box is a valid answer and the hint says so.
 */
export function WeightField({
  label,
  hint,
  unit,
  defaultValue,
}: {
  label: string;
  hint: string;
  unit: string;
  defaultValue?: number | null;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <label htmlFor="checkin-weight" className={eyebrow}>
        {label}
      </label>
      <div className="flex h-[7.5rem] flex-col items-center justify-center gap-1.5">
        <input
          id="checkin-weight"
          name="weightKg"
          type="number"
          step="0.1"
          min="0"
          inputMode="decimal"
          placeholder="–"
          defaultValue={defaultValue ?? ""}
          className={[
            "w-[6.5rem] rounded-[1rem] bg-cream/5 px-2 py-2 text-center",
            "font-display text-[2rem] leading-none tracking-[0.01em] text-cream",
            "placeholder:text-cream/25 ring-1 ring-cream/15 outline-none transition",
            "focus:ring-2 focus:ring-caramel/70",
            "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
          ].join(" ")}
        />
        <span className="font-sans text-[0.65rem] font-medium text-cream/40">
          {unit.toUpperCase()} {hint.charAt(0).toUpperCase() + hint.slice(1)}
        </span>
      </div>
    </div>
  );
}
