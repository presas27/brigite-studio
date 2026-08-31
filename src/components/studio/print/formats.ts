/**
 * The print formats, and the query string that carries them.
 *
 * Shared by the menu that builds the URL and the page that reads it, so the two
 * cannot drift: a format the menu can name is a format the sheet can render,
 * and an unknown one falls back to the full workout rather than to a blank page.
 */

export const PRINT_FORMATS = ["completo", "instrucoes", "registo", "medida", "progresso"] as const;

export type PrintFormat = (typeof PRINT_FORMATS)[number];

/** The switchable parts of a workout sheet. `medida` is the only format that lets a coach set them. */
export type PrintSections = {
  /** Prescribed sets, reps/duration and rest. */
  prescription: boolean;
  /** The workout's instructions, plus each exercise's cues and notes. */
  instructions: boolean;
  /** What the session needs on the floor, read out of the exercises' tags. */
  equipment: boolean;
  /** Exercise stills. */
  images: boolean;
  /** Blank columns for the client to write weight, reps and rest into. */
  tracking: boolean;
};

/** The four sections a coach can toggle on the custom format, in menu order. */
export const CUSTOM_SECTIONS = ["instructions", "equipment", "images", "tracking"] as const;

export type CustomSection = (typeof CUSTOM_SECTIONS)[number];

/**
 * What each format shows.
 *
 * `completo` mirrors the builder — everything the coach sees on the workout
 * page, which is a prescription and never a logging grid. `registo` is its
 * opposite: the names, the target, and empty boxes. `instrucoes` is the sheet a
 * client reads at home, with nothing to fill in.
 */
const SECTIONS: Record<Exclude<PrintFormat, "medida" | "progresso">, PrintSections> = {
  completo: {
    prescription: true,
    instructions: true,
    equipment: true,
    images: true,
    tracking: false,
  },
  instrucoes: {
    prescription: true,
    instructions: true,
    equipment: false,
    images: false,
    tracking: false,
  },
  registo: {
    prescription: true,
    instructions: false,
    equipment: false,
    images: false,
    tracking: true,
  },
};

/** The custom format's starting point: everything on, so a coach removes rather than builds. */
export const DEFAULT_CUSTOM: Record<CustomSection, boolean> = {
  instructions: true,
  equipment: true,
  images: true,
  tracking: true,
};

export function isPrintFormat(value: string | undefined): value is PrintFormat {
  return value != null && (PRINT_FORMATS as readonly string[]).includes(value);
}

/**
 * The sections a URL asks for. `medida` reads them from `secoes`, a
 * comma-separated list of the four toggles; every other format ignores it.
 * The prescription is never optional — a workout sheet without the sets and
 * reps is a list of exercise names.
 */
export function sectionsFor(format: PrintFormat, secoes: string | undefined): PrintSections {
  if (format === "progresso") return SECTIONS.completo;
  if (format !== "medida") return SECTIONS[format];

  const asked = new Set((secoes ?? "").split(",").filter(Boolean));
  return {
    prescription: true,
    instructions: asked.has("instructions"),
    equipment: asked.has("equipment"),
    images: asked.has("images"),
    tracking: asked.has("tracking"),
  };
}

/** The print URL for one format. `basePath` is the workout's own `…/imprimir`. */
export function printHref(
  basePath: string,
  format: PrintFormat,
  extra: Record<string, string> = {},
): string {
  const params = new URLSearchParams({ formato: format, ...extra });
  return `${basePath}?${params.toString()}`;
}
