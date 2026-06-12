import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * Wordmark in the display face. Typographic placeholder until the final
 * logo asset is provided — drop an <svg>/<Image> here to swap it out.
 */
export function Logo({ className }: { className?: string }) {
  const t = useTranslations("Nav");
  return (
    <Link
      href="/"
      aria-label={t("logoHome")}
      className={cn(
        "whitespace-nowrap font-display text-xl uppercase leading-none tracking-wide text-cream select-none",
        className,
      )}
    >
      Brigite&apos;s Studio
    </Link>
  );
}
