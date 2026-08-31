"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

/**
 * The bar that only the screen sees, and the one line of behaviour a print page
 * needs: open the browser's print dialog once, by itself.
 *
 * Fired from an effect rather than during render, and guarded by a ref, because
 * `window.print()` blocks the tab until the dialog closes — a second call from a
 * re-render would queue a second dialog behind the first. Cancelling the dialog
 * leaves the sheet on screen with the buttons below, which is the same page a
 * coach would want if they meant to read it rather than print it.
 *
 * No PDF library: every browser's print dialog can already save to PDF, and the
 * sheet is laid out for A4 so what it saves is what it shows.
 */
export function PrintLauncher() {
  const t = useTranslations("Studio.print");
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    // One frame, so the sheet (and its SVG charts) is painted before the dialog
    // freezes the tab and takes its snapshot.
    const frame = requestAnimationFrame(() => window.print());
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 print:hidden">
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2 font-sans text-xs font-semibold text-white transition-colors hover:bg-neutral-700"
      >
        {t("print")}
      </button>
      <button
        type="button"
        onClick={() => window.close()}
        className="inline-flex items-center gap-2 rounded-full px-4 py-2 font-sans text-xs font-semibold text-neutral-600 ring-1 ring-neutral-300 transition-colors hover:bg-neutral-100"
      >
        {t("close")}
      </button>
      <p className="font-sans text-xs text-neutral-500">{t("pdfHint")}</p>
    </div>
  );
}
