import Link from "next/link";
import { useTranslations } from "next-intl";
import { site } from "@/lib/site";
import { SolMark } from "@/components/ui/SolMark";
import { Reveal } from "@/components/motion/Reveal";

/**
 * Footer — anchor nav and copyright up top, then the wordmark at full
 * width with its bottom edge clipped by the viewport, anchored to the
 * floor.
 */
export function Footer() {
  const t = useTranslations("Nav");
  const year = new Date().getFullYear();

  return (
    <footer className="w-full overflow-hidden border-t border-cream/10 bg-ink px-6 pt-14 md:px-10 lg:px-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <nav aria-label={t("footerNav")}>
          <ul className="flex flex-wrap items-center gap-x-7 gap-y-2 text-sm text-cream/60">
            {site.nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="link-grow transition-colors hover:text-cream"
                >
                  {t(item.key)}
                </Link>
              </li>
            ))}
            {site.social.instagram && (
              <li>
                <a
                  href={site.social.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-grow transition-colors hover:text-cream"
                >
                  {t("instagram")}
                </a>
              </li>
            )}
          </ul>
        </nav>

        <p className="flex items-center gap-3 text-xs text-cream/50">
          <SolMark className="h-4 w-4 text-bronze" />© {year} {site.name}
        </p>
      </div>

      <Reveal y={48} start="top 98%" className="mt-14">
        <p className="-mb-[0.14em] whitespace-nowrap text-center font-display text-[clamp(3.5rem,11.5vw,12.5rem)] uppercase leading-[0.8] tracking-tight text-cream">
          Brigite&rsquo;s Studio
        </p>
      </Reveal>
    </footer>
  );
}
