/**
 * Shared class strings for the studio app.
 *
 * The marketing site is editorial — big display type, caramel gradients, lots of
 * air. The app borrows the same palette and faces but trades spectacle for
 * density: flat `ink-lift` surfaces and controls big enough to hit with sweaty
 * hands mid-set. Exported as constants rather than wrapper components so pages
 * compose plain HTML and Tailwind stays greppable.
 *
 * The caramel gradient carries a rule: **one accent surface per screen, on the
 * single thing that matters** — today's session, the adherence headline, the
 * sign-in hero, the moment a session is finished. Everything else stays flat, so
 * the gold always means "this one". Spread it across every card and it stops
 * meaning anything.
 */

/** Card surface. Add `p-5` or `p-6` at the call site. */
export const surface = "rounded-[1.25rem] bg-ink-lift ring-1 ring-cream/10";

/** Surface that reads as interactive (links, list rows). */
export const surfaceLink =
  "rounded-[1.25rem] bg-ink-lift ring-1 ring-cream/10 transition-colors hover:bg-surface-hover hover:ring-cream/20";

/**
 * The one gold surface on a screen. Same treatment as the featured plan card on
 * the marketing site: caramel gradient, film grain over it to kill banding, and
 * ink text. Everything nested inside must be ink-based — `field`, `eyebrow` and
 * `buttonGhost` are cream and will disappear here. Use the `-onAccent` variants.
 */
export const surfaceAccent =
  "gradient-caramel grain relative overflow-hidden rounded-[1.25rem] text-ink";

/** Interactive version of `surfaceAccent`, for a hero card that is a link. */
export const surfaceAccentLink =
  "gradient-caramel grain relative overflow-hidden rounded-[1.25rem] text-ink transition-shadow duration-300 hover:shadow-[0_32px_64px_-24px_rgba(217,160,91,0.3)]";

/** Section heading — condensed display face, always uppercase. */
export const heading = "font-display uppercase leading-none tracking-[0.01em]";

/** Small all-caps label used above fields and section groups. */
export const eyebrow =
  "font-sans text-xs font-medium uppercase tracking-[0.12em] text-cream/55";

/** Text input / textarea / select. Matches the site contact form. */
export const field =
  "w-full rounded-[1rem] bg-cream/5 px-4 py-3 font-sans text-base text-cream placeholder:text-cream/35 ring-1 ring-cream/15 outline-none transition focus:ring-2 focus:ring-caramel/70 disabled:opacity-50";

/** Compact variant for inline numeric entry (set logging, sets/reps grids). */
export const fieldCompact =
  "w-full rounded-[0.75rem] bg-cream/5 px-3 py-2 text-center font-mono text-base text-cream placeholder:text-cream/30 ring-1 ring-cream/15 outline-none transition focus:ring-2 focus:ring-caramel/70";

/** Primary action. Cream pill, dark ink text. */
export const buttonPrimary =
  "inline-flex items-center justify-center gap-2 rounded-full bg-butter px-6 py-3 font-sans text-sm font-semibold text-ink transition-colors hover:bg-primary-hover disabled:opacity-50";

/** Secondary action. Outlined, sits on any surface. */
export const buttonGhost =
  "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-sans text-sm font-semibold text-cream ring-1 ring-cream/20 transition-colors hover:bg-cream/5 hover:ring-cream/35 disabled:opacity-50";

/** Destructive action. Never the visual default. */
export const buttonDanger =
  "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 font-sans text-sm font-semibold text-silk ring-1 ring-silk/35 transition-colors hover:bg-silk/10 disabled:opacity-50";

/** Small chip: tags, statuses, filters. */
export const chip =
  "inline-flex items-center gap-1.5 rounded-full bg-cream/5 px-3 py-1 font-sans text-xs text-cream/70 ring-1 ring-cream/10";

export const chipAccent =
  "inline-flex items-center gap-1.5 rounded-full bg-caramel/15 px-3 py-1 font-sans text-xs text-accent-ink ring-1 ring-caramel/25";

/** Muted body copy. */
export const muted = "text-sm leading-relaxed text-cream/60";

/* --- Variants for use inside `surfaceAccent` ------------------------------- */
/* The gold surface flips the contrast: text is ink, so anything cream-based
   vanishes. These four are the ink-side twins of the ones above. */

export const eyebrowOnAccent =
  "font-sans text-xs font-medium uppercase tracking-[0.12em] text-brown-deep/75";

export const mutedOnAccent = "text-sm leading-relaxed text-ink/70";

/** Primary action on gold — dark pill, exactly like the featured plan card. */
export const buttonOnAccent =
  "inline-flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 font-sans text-sm font-semibold text-on-dark transition-colors hover:bg-ink-hover disabled:opacity-50";

/** Secondary action on gold. */
export const buttonGhostOnAccent =
  "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-sans text-sm font-semibold text-ink ring-1 ring-brown-deep/30 transition-colors hover:bg-ink/5 hover:ring-brown-deep/50 disabled:opacity-50";

export const chipOnAccent =
  "inline-flex items-center gap-1.5 rounded-full bg-ink/10 px-3 py-1 font-sans text-xs text-ink/75 ring-1 ring-brown-deep/20";

/** Inset panel on gold — for Sara's session note, which must read as a quote. */
export const panelOnAccent = "rounded-[1rem] bg-ink/[0.07] ring-1 ring-brown-deep/15";
