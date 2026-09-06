"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "@/components/studio/coach/icons";
import { field } from "@/components/studio/theme";
import { MorphHeight } from "@/components/studio/MorphHeight";
import { cn, searchKey } from "@/lib/utils";
export type CategoryOption = { value: string; label: string; count: number };

/**
 * Single-select category filter, generic over whatever the page is filtering
 * by — exercise tags, workout focuses, client plans. Closed it reads like a
 * normal field, open it is a searchable list — click to browse every option,
 * or type to jump straight to it. Picking one applies the filter immediately.
 */
export function CategoryDropdown({
  options,
  value,
  onChangeAction,
}: {
  options: CategoryOption[];
  value: string | null;
  onChangeAction: (value: string | null) => void;
}) {
  const common = useTranslations("Studio.common");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const results = useMemo(() => {
    const needle = searchKey(query.trim());
    if (!needle) return options;
    return options.filter(({ label }) => searchKey(label).includes(needle));
  }, [options, query]);

  const selected = options.find((option) => option.value === value);

  function choose(next: string | null) {
    onChangeAction(next);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) setQuery("");
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(field, "flex w-44 items-center justify-between gap-2 py-2.5 text-left text-sm")}
      >
        <span className={cn("truncate", !selected && "text-cream/55")}>
          {selected ? selected.label : common("allCategories")}
        </span>
        <Icon
          name="chevron"
          className={cn(
            "h-3.5 w-3.5 shrink-0 rotate-90 text-cream/40 transition-transform",
            open && "-rotate-90",
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-[1rem] bg-ink-lift shadow-2xl shadow-black/40 ring-1 ring-cream/15">
          <div className="border-b border-cream/10 p-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={common("searchPlaceholder")}
              aria-label={common("search")}
              className="w-full rounded-[0.6rem] bg-cream/5 px-2.5 py-1.5 font-sans text-sm text-cream placeholder:text-cream/35 outline-none"
            />
          </div>
          <MorphHeight contentKey={`${query}:${results.length}`} fade={false} appear>
            <ul role="listbox" className="max-h-64 overflow-y-auto p-1">
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === null}
                  onClick={() => choose(null)}
                  className={cn(
                    "flex w-full items-center rounded-[0.6rem] px-3 py-2 text-left font-sans text-sm transition-colors",
                    value === null ? "bg-caramel/15 text-accent-ink" : "text-cream/80 hover:bg-cream/5",
                  )}
                >
                  {common("allCategories")}
                </button>
              </li>
              {results.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={value === option.value}
                    onClick={() => choose(option.value)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-[0.6rem] px-3 py-2 text-left font-sans text-sm transition-colors",
                      value === option.value
                        ? "bg-caramel/15 text-accent-ink"
                        : "text-cream/80 hover:bg-cream/5",
                    )}
                  >
                    <span className="truncate">{option.label}</span>
                    <span className="text-xs text-cream/40">{option.count}</span>
                  </button>
                </li>
              ))}
              {results.length === 0 && (
                <li className="px-3 py-2 font-sans text-sm text-cream/40">{common("noMatches")}</li>
              )}
            </ul>
          </MorphHeight>
        </div>
      )}
    </div>
  );
}
