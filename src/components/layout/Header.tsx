import Link from "next/link";
import { useTranslations } from "next-intl";
import { site } from "@/lib/site";
import { Logo } from "./Logo";
import { MobileNav } from "./MobileNav";
import { LocaleToggle } from "./LocaleToggle";
import { HeaderMotion } from "./HeaderMotion";

/**
 * Top navigation — a floating dark pill. The inline nav shows from `md`
 * up with the contact link promoted to an outline pill; below that it
 * collapses into the MobileNav hamburger.
 */
export function Header() {
  const t = useTranslations("Nav");
  const links = site.nav.filter((item) => item.key !== "contact");

  return (
    <HeaderMotion>
      <Logo />

      <nav aria-label={t("primary")} className="hidden md:block">
        <ul className="flex items-center gap-7 text-sm font-medium uppercase tracking-wide lg:gap-9">
          {links.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="text-cream/75 transition-colors duration-150 hover:text-cream"
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
                className="block text-cream/75 transition-colors duration-150 hover:text-cream"
              >
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
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
          <li>
            <Link
              href="#contacto"
              className="inline-flex h-10 items-center rounded-full px-5 text-cream ring-1 ring-cream/40 transition-colors duration-200 hover:bg-butter hover:text-on-primary hover:ring-butter"
            >
              {t("contact")}
            </Link>
          </li>
        </ul>
      </nav>

      <MobileNav />
    </HeaderMotion>
  );
}
