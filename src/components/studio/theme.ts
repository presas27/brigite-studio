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
 * The one brand surface on a screen. Same treatment as the featured plan card
 * on the marketing site: the wine gradient, film grain over it to kill banding,
 * and `on-dark` text. It stays wine in BOTH themes — that is what keeps the
 * app recognisable when the canvas flips to paper — so everything nested in it
 * must use `on-dark`/`ink` and never `cream`, which inverts. Use the
 * `-onAccent` variants below.
 */
export const surfaceAccent =
  "gradient-caramel grain relative overflow-hidden rounded-[1.25rem] text-on-dark";

/** Interactive version of `surfaceAccent`, for a hero card that is a link. */
export const surfaceAccentLink =
  "gradient-caramel grain relative overflow-hidden rounded-[1.25rem] text-on-dark transition-shadow duration-300 hover:shadow-[0_32px_64px_-24px_rgba(143,42,58,0.4)]";

/** Section heading — condensed display face, always uppercase. */
export const heading = "font-display uppercase leading-none tracking-[0.01em]";

/**
 * Small label used above fields and section groups. Sentence case, body face,
 * no letterspacing: a label names the thing under it and then gets out of the
 * way. Caps and tracked-out letters turn every label into a small headline and
 * make a dense screen shout.
 */
export const eyebrow = "font-sans text-xs font-medium text-cream/55";

/** Text input / textarea / select. Matches the site contact form. */
export const field =
  "w-full rounded-[1rem] bg-cream/5 px-4 py-3 font-sans text-base text-cream placeholder:text-cream/35 ring-1 ring-cream/15 outline-none transition focus:ring-2 focus:ring-accent-ink/70 disabled:opacity-50";

/** Compact variant for inline numeric entry (set logging, sets/reps grids). */
export const fieldCompact =
  "w-full rounded-[0.75rem] bg-cream/5 px-3 py-2 text-center font-sans tabular-nums text-base text-cream placeholder:text-cream/30 ring-1 ring-cream/15 outline-none transition focus:ring-2 focus:ring-accent-ink/70";

/** Primary action. Light pill on dark, deep-wine pill on paper; label inverts. */
export const buttonPrimary =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-butter px-6 py-3 font-sans text-sm font-semibold text-on-primary transition-[transform,background-color,color] duration-150 ease-out hover:bg-primary-hover active:scale-[0.97] active:duration-75 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";

/** Secondary action. Outlined, sits on any surface. */
export const buttonGhost =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-6 py-3 font-sans text-sm font-semibold text-cream ring-1 ring-cream/20 transition-[transform,background-color,color,box-shadow] duration-150 ease-out hover:bg-cream/5 hover:ring-cream/35 active:scale-[0.97] active:duration-75 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";

/**
 * Third action tier, below `buttonGhost`: row actions that must not compete
 * with the row's content. An outlined pill per action turns a list into a wall
 * of buttons; these read as text until the pointer is on them.
 */
export const buttonQuiet =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full px-2.5 py-1.5 font-sans text-xs font-medium text-cream/50 transition-[transform,background-color,color] duration-150 ease-out hover:bg-cream/8 hover:text-cream active:scale-[0.96] active:duration-75 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";

/** Destructive action. Never the visual default. */
export const buttonDanger =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-2.5 font-sans text-sm font-semibold text-silk ring-1 ring-silk/35 transition-[transform,background-color,color,box-shadow] duration-150 ease-out hover:bg-silk/10 active:scale-[0.97] active:duration-75 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";
/** Small chip: tags, statuses, filters. */
export const chip =
  "inline-flex items-center gap-1.5 rounded-full bg-cream/5 px-3 py-1 font-sans text-xs text-cream/70 ring-1 ring-cream/10";

export const chipAccent =
  "inline-flex items-center gap-1.5 rounded-full bg-caramel/15 px-3 py-1 font-sans text-xs text-accent-ink ring-1 ring-caramel/25";

/** Muted body copy. */
export const muted = "text-sm leading-relaxed text-cream/60";

/* --- Variants for use inside `surfaceAccent` ------------------------------- */
/* The brand surface does not follow the theme: it is wine on paper too. So the
   twins below are `on-dark`-based rather than cream-based — `cream` would go
   dark under the light theme and disappear into the wine. */

export const eyebrowOnAccent = "font-sans text-xs font-medium text-on-dark/70";

export const mutedOnAccent = "text-sm leading-relaxed text-on-dark/75";

/** Primary action on the brand surface — the sand pill, as in the hero. */
export const buttonOnAccent =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-on-dark px-6 py-3 font-sans text-sm font-semibold text-ink transition-[transform,background-color,color] duration-150 ease-out hover:bg-on-dark/85 active:scale-[0.97] active:duration-75 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";

/** Secondary action on the brand surface. */
export const buttonGhostOnAccent =
  "inline-flex cursor-pointer items-center justify-center gap-2 rounded-full px-6 py-3 font-sans text-sm font-semibold text-on-dark ring-1 ring-on-dark/35 transition-[transform,background-color,color,box-shadow] duration-150 ease-out hover:bg-on-dark/10 hover:ring-on-dark/55 active:scale-[0.97] active:duration-75 disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100";
export const chipOnAccent =
  "inline-flex items-center gap-1.5 rounded-full bg-on-dark/12 px-3 py-1 font-sans text-xs text-on-dark/85 ring-1 ring-on-dark/25";

/** Inset panel on the brand surface — Sara's session note, which reads as a
    quote. Sunk into the wine rather than lifted off it. */
export const panelOnAccent = "rounded-[1rem] bg-ink/25 ring-1 ring-on-dark/15";
