import Link from "next/link";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 * Brand monogram "Bs". Typographic placeholder until the final logo
 * asset is provided — drop an <svg>/<Image> here to swap it out.
 */
export function Logo({ className }: { className?: string }) {
  const t = useTranslations("Nav");
  return (
    <Link
      href="/"
      aria-label={t("logoHome")}
      className={cn(
        "inline-flex items-baseline font-serif leading-none text-foreground select-none",
        className,
      )}
    >
      <span className="text-4xl font-medium tracking-tight">B</span>
      <span className="-ml-0.5 text-2xl font-medium tracking-tight">s</span>
    </Link>
  );
}
