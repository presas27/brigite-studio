"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { setUserLocale } from "@/i18n/locale";
import { locales, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

/**
 * PT/EN language toggle. Writes the chosen locale to a cookie via a server
 * action; the action triggers a re-render so the page swaps language in
 * place without changing the URL. Active language is conveyed with
 * `aria-pressed`, not colour alone.
 */
export function LocaleToggle({ className }: { className?: string }) {
  const active = useLocale();
  const t = useTranslations("Nav");
  const [isPending, startTransition] = useTransition();

  function select(locale: Locale) {
    if (locale === active || isPending) return;
    startTransition(() => {
      setUserLocale(locale);
    });
  }

  return (
    <div
      role="group"
      aria-label={t("language")}
      className={cn(
        "inline-flex items-center font-serif text-base font-medium",
        isPending && "opacity-60",
        className,
      )}
    >
      {locales.map((locale, i) => {
        const isActive = locale === active;
        return (
          <span key={locale} className="flex items-center">
            {i > 0 && (
              <span aria-hidden className="mx-1.5 text-foreground/30">
                /
              </span>
            )}
            <button
              type="button"
              onClick={() => select(locale)}
              aria-pressed={isActive}
              aria-label={
                locale === "pt"
                  ? t("switchToPortuguese")
                  : t("switchToEnglish")
              }
              className={cn(
                "uppercase tracking-wide transition-opacity hover:opacity-60",
                isActive ? "text-foreground" : "text-foreground/45",
              )}
            >
              {locale}
            </button>
          </span>
        );
      })}
    </div>
  );
}
