"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/studio/coach/icons";
import { buttonGhost, field, muted, surface } from "@/components/studio/theme";
import { dayKey, shiftDay } from "@/lib/studio/dates";
import { cn } from "@/lib/utils";
import {
  CUSTOM_SECTIONS,
  DEFAULT_CUSTOM,
  printHref,
  type CustomSection,
  type PrintFormat,
} from "./formats";

/** The five formats, in menu order. Icons are the app's own glyphs. */
const OPTIONS: { format: PrintFormat; icon: "list" | "library" | "checkin" | "settings" | "trend" }[] =
  [
    { format: "completo", icon: "list" },
    { format: "instrucoes", icon: "library" },
    { format: "registo", icon: "checkin" },
    { format: "medida", icon: "settings" },
    { format: "progresso", icon: "trend" },
  ];

/** How far back the progression report looks when the coach has not said. */
const DEFAULT_RANGE_DAYS = 30;

/**
 * Print, on the workout a coach is looking at.
 *
 * A popover rather than a dialog, and the same click-outside/Escape handling as
 * the schedule menu next door, because picking a format is a one-click decision
 * and four of the five are exactly that. The two that need more — the custom
 * section list and the progression date range — open in place, in the popover,
 * with a way back to the list.
 *
 * Printing itself happens on a page, not here: each option opens the workout's
 * `imprimir` route in a new tab, which lays itself out for A4 and calls
 * `window.print()` on arrival. So the sheet has a URL a coach can bookmark or
 * re-print, the browser's own "Save as PDF" is the PDF export, and this
 * component never has to know what a sheet looks like.
 */
export function PrintMenu({ basePath, clientName }: { basePath: string; clientName: string }) {
  const t = useTranslations("Studio.print");
  const common = useTranslations("Studio.common");
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<"menu" | "medida" | "progresso">("menu");
  const [custom, setCustom] = useState<Record<CustomSection, boolean>>(DEFAULT_CUSTOM);
  const today = dayKey();
  const [from, setFrom] = useState(shiftDay(today, -DEFAULT_RANGE_DAYS));
  const [to, setTo] = useState(today);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /** Open the sheet in its own tab and put the menu away. */
  function print(format: PrintFormat, extra: Record<string, string> = {}) {
    window.open(printHref(basePath, format, extra), "_blank", "noopener");
    setOpen(false);
    setPanel("menu");
  }

  function choose(format: PrintFormat) {
    if (format === "medida" || format === "progresso") {
      setPanel(format);
      return;
    }
    print(format);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setPanel("menu");
          setOpen((value) => !value);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("print")}
        title={t("print")}
        className="inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 font-sans text-xs font-semibold text-cream/70 ring-1 ring-cream/15 transition-colors hover:bg-cream/5 hover:text-cream hover:ring-cream/30"
      >
        <Icon name="print" className="h-4 w-4" />
        <span className="hidden sm:inline">{t("print")}</span>
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            surface,
            "absolute top-full right-0 z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] p-2 shadow-xl",
          )}
        >
          {panel === "menu" && (
            <div className="flex flex-col">
              {OPTIONS.map(({ format, icon }) => (
                <button
                  key={format}
                  type="button"
                  role="menuitem"
                  onClick={() => choose(format)}
                  className="flex items-start gap-3 rounded-[0.85rem] px-3 py-2.5 text-left transition-colors hover:bg-cream/5"
                >
                  <Icon name={icon} className="mt-0.5 h-4 w-4 shrink-0 text-accent-ink" />
                  <span>
                    <span className="block font-sans text-sm font-semibold text-cream">
                      {t(`format.${format}`)}
                    </span>
                    <span className={cn(muted, "mt-0.5 block text-xs")}>
                      {t(`format.${format}Hint`)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {panel === "medida" && (
            <div className="space-y-3 p-2">
              <p className="font-sans text-sm font-semibold text-cream">{t("format.medida")}</p>
              <div className="space-y-2">
                {CUSTOM_SECTIONS.map((section) => (
                  <label
                    key={section}
                    className="flex items-center gap-2.5 font-sans text-sm text-cream/85"
                  >
                    <input
                      type="checkbox"
                      checked={custom[section]}
                      onChange={(event) =>
                        setCustom({ ...custom, [section]: event.target.checked })
                      }
                      className="h-4 w-4 shrink-0 accent-caramel"
                    />
                    {t(`section.${section}`)}
                  </label>
                ))}
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-cream/10 pt-3">
                <button
                  type="button"
                  onClick={() => setPanel("menu")}
                  className="font-sans text-xs font-medium text-cream/50 transition-colors hover:text-cream"
                >
                  {common("cancel")}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    print("medida", {
                      secoes: CUSTOM_SECTIONS.filter((section) => custom[section]).join(","),
                    })
                  }
                  className={cn(buttonGhost, "px-4 py-2 text-xs")}
                >
                  {t("print")}
                </button>
              </div>
            </div>
          )}

          {panel === "progresso" && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                print("progresso", { de: from, ate: to });
              }}
              className="space-y-3 p-2"
            >
              <p className="font-sans text-sm font-semibold text-cream">
                {t("format.progresso")}
              </p>
              <p className={cn(muted, "text-xs")}>{t("rangeLead", { name: clientName })}</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1">
                  <span className="block font-sans text-xs text-cream/55">{t("from")}</span>
                  <input
                    type="date"
                    value={from}
                    max={to}
                    onChange={(event) => setFrom(event.target.value)}
                    className={cn(field, "py-2 text-sm")}
                  />
                </label>
                <label className="space-y-1">
                  <span className="block font-sans text-xs text-cream/55">{t("to")}</span>
                  <input
                    type="date"
                    value={to}
                    min={from}
                    onChange={(event) => setTo(event.target.value)}
                    className={cn(field, "py-2 text-sm")}
                  />
                </label>
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-cream/10 pt-3">
                <button
                  type="button"
                  onClick={() => setPanel("menu")}
                  className="font-sans text-xs font-medium text-cream/50 transition-colors hover:text-cream"
                >
                  {common("cancel")}
                </button>
                <button type="submit" className={cn(buttonGhost, "px-4 py-2 text-xs")}>
                  {t("print")}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
