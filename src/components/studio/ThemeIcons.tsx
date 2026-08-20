/**
 * `SunMedium` and `MoonStar` from Lucide (ISC licensed), inlined as path data
 * rather than pulled in as a dependency — two glyphs is not worth a package,
 * and the theme toggle in the Developh dashboard uses exactly these, so keeping
 * the geometry identical keeps the two products' switches feeling like one.
 *
 * Lucide's defaults are preserved: 24×24 box, 2px round-capped stroke.
 */

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function SunIcon({ className }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v1" />
      <path d="M12 20v1" />
      <path d="M3 12h1" />
      <path d="M20 12h1" />
      <path d="m18.364 5.636-.707.707" />
      <path d="m6.343 17.657-.707.707" />
      <path d="m5.636 5.636.707.707" />
      <path d="m17.657 17.657.707.707" />
    </svg>
  );
}

export function MoonIcon({ className }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <path d="M18 5h4" />
      <path d="M20 3v4" />
      <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401" />
    </svg>
  );
}
