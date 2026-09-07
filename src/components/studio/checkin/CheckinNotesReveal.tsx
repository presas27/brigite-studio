"use client";

import { useState } from "react";
import { AutoResizeTextarea } from "@/components/studio/AutoResizeTextarea";
import { MorphHeight } from "@/components/studio/MorphHeight";
import { Icon } from "@/components/studio/coach/icons";
import { field } from "@/components/studio/theme";
import { cn } from "@/lib/utils";

/**
 * One full-width control that grows into a single note. The textarea stays
 * mounted so a closed panel still submits whatever was typed.
 */
export function CheckinNotesReveal({
  label,
  placeholder,
  defaultValue = "",
}: {
  label: string;
  placeholder: string;
  defaultValue?: string;
}) {
  const [open, setOpen] = useState(defaultValue.trim().length > 0);

  return (
    <div className="overflow-hidden rounded-[1.15rem] ring-1 ring-cream/15">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-2.5 px-4 py-3 text-left font-sans text-sm font-medium transition-colors",
          open ? "text-cream" : "text-cream/70 hover:bg-cream/[0.04] hover:text-cream",
        )}
      >
        <Icon
          name="chevron"
          className={cn("h-3.5 w-3.5 shrink-0 transition-transform duration-200", open && "rotate-90")}
        />
        {label}
      </button>
      <MorphHeight
        appear={false}
        fade={false}
        contentKey={open ? "open" : "shut"}
        durationMs={420}
        ease="cubic-bezier(0.22, 1, 0.36, 1)"
      >
        <div className={open ? "border-t border-cream/10 px-3 pb-3 pt-2" : "h-0 overflow-hidden"}>
          <AutoResizeTextarea
            id="checkin-wins"
            name="wins"
            rows={4}
            placeholder={placeholder}
            defaultValue={defaultValue}
            className={cn(field, "min-h-[7rem]")}
          />
        </div>
      </MorphHeight>
    </div>
  );
}
