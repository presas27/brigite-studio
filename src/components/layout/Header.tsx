import Link from "next/link";
import { useTranslations } from "next-intl";
import { site } from "@/lib/site";
import { Logo } from "./Logo";
import { MobileNav } from "./MobileNav";
import { LocaleToggle } from "./LocaleToggle";

/**
 * Top navigation bar — opaque white, full-width, sticky. The inline nav
 * shows from `md` up; below that it collapses into the MobileNav hamburger.
 */
export function Header() {
  const t = useTranslations("Nav");

  return (
    <header className="sticky top-0 z-50 w-full bg-white">
      <div className="flex h-20 items-center justify-between px-6 md:px-10 lg:px-12">
        <Logo />

        <nav aria-label={t("primary")} className="hidden md:block">
          <ul className="flex items-center gap-6 font-serif text-base font-medium text-foreground md:gap-9 md:text-lg">
            {site.nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="transition-opacity hover:opacity-60"
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
                  aria-label={t("instagram")}
                  className="block transition-opacity hover:opacity-60"
                >
                  <svg
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-7 w-7"
                  >
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <circle cx="12" cy="12" r="4.2" />
                    <circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none" />
                  </svg>
                </a>
              </li>
            )}
            <li>
              <LocaleToggle />
            </li>
          </ul>
        </nav>

        <MobileNav />
      </div>
    </header>
  );
}
