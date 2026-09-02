/**
 * Trainerize exercise library → studio seed data.
 *
 * Trainerize has no first-class library export, so what leaves the account is
 * whatever the browser could be made to hand over: a spreadsheet saved out of
 * the library grid, or the JSON payload of the listing endpoint (see
 * `recon.ts`). Both land here, and both are read by *header name* rather than
 * by column position — the export's shape is not ours to control.
 *
 * Usage:
 *   bun run trainerize:import                     # every file in scripts/trainerize/export
 *   bun run trainerize:import path/to/export.csv  # one file or folder
 *
 * Writes `src/lib/studio/library-trainerize.ts`, which the seed inserts into
 * the library. It has to be seed data and not a local `INSERT`: on the preview
 * deployment the database lives in `/tmp` and is rebuilt from the seed on every
 * cold start, so anything not in the bundle disappears with the lambda.
 *
 * The output is sorted by name and free of ids, so re-running it on an updated
 * export produces a diff that can be read.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import type { ExerciseSeed, Tracking } from "@/lib/studio/types";
import { searchKey } from "@/lib/utils";

const DEFAULT_INPUT = join(process.cwd(), "scripts/trainerize/export");
const OUT_FILE = join(process.cwd(), "src/lib/studio/library-trainerize.ts");
const READABLE: Record<string, true> = { ".csv": true, ".tsv": true, ".txt": true, ".json": true };

/** What a column means to us. Anything else is reported and dropped. */
type Role = "name" | "cues" | "tracking" | "video" | "tags" | "source";

/**
 * Header aliases. The first pattern that matches a header claims it, and when
 * two columns claim the same role the earlier pattern wins — position in the
 * file decides nothing.
 *
 * That ordering is load-bearing on Trainerize's own payload, which carries both
 * `recordType` (how the set is logged: `strength`, `timedLongerBetter`…) and
 * `type` (where the exercise came from: `system` or `custom`). Read positionally
 * they collide and every exercise lands on "reps"; read by priority,
 * `recordType` is the tracking and `type` is provenance.
 */
const HEADER_ROLES: { role: Role; pattern: RegExp }[] = [
  { role: "name", pattern: /^(exercise|exercise name|name|nome|title|titulo|movement)$/ },
  { role: "tracking", pattern: /^(record type|recordtype|log type|set type|exercise type|tracking|track|measure|measurement|units?)$/ },
  { role: "source", pattern: /^(type|source|origin|owner|tipo)$/ },
  { role: "cues", pattern: /instruc|descri|cue|note|comment|how to|coaching|detail/ },
  { role: "video", pattern: /video|youtube|vimeo|url|link|media/ },
  { role: "tags", pattern: /tag|categor|muscle|body|target|equipment|group|focus|region|discipline|difficulty|level|skill/ },
];

/**
 * The part of Trainerize's `recordType` vocabulary that actually says how a set
 * is measured. `timedLongerBetter` is an isometric — hold the shape as long as
 * you can — where `timedFasterBetter` is a clock to beat.
 *
 * `strength`, `endurance` and `general` are deliberately absent. They are the
 * platform's default for everything that is not on a clock, and a static
 * hamstring stretch arrives under one of them exactly as a back squat does — so
 * reading them as "reps" is what put two thousand movements, warm-up
 * stretches included, on a rep-and-kilo field. They fall through to the
 * movement's own tags and name instead.
 */
const RECORD_TYPES: Record<string, Tracking> = {
  timedlongerbetter: "hold",
  timedstrength: "hold",
  timedfasterbetter: "time",
  cardio: "distance",
};

/**
 * Set types that say only "some number of repetitions". Trainerize's three
 * defaults plus the wordings a spreadsheet uses for the same thing — every one
 * of them a non-answer, and every one of them the reason the movement's own
 * name and categories have to be read.
 */
const UNSPECIFIC =
  /^(strength|endurance|general|reps?|repetitions?|weight|bodyweight|weightreps|weightandreps|repsweight|repsandweight)$/;

/**
 * A `type` column saying `system` or `custom` is provenance, not a category.
 * Trainerize's own catalogue comes through as `system`; what Sara built herself
 * is `custom`. Only the borrowed ones get marked, so her own library reads
 * clean and one filter chip separates 2200 gym exercises from her 26.
 */
const SOURCE_TAG: Record<string, string> = { system: "trainerize" };

/** Values a spreadsheet uses to mean "nothing", which must not become tags. */
const EMPTY_VALUES: Record<string, true> = {
  "-": true,
  "--": true,
  "n/a": true,
  na: true,
  none: true,
  null: true,
  undefined: true,
  other: true,
  outros: true,
  "0": true,
};

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  deg: "°",
};

/** Accent- and case-folded, punctuation collapsed to single spaces. */
function fold(value: string): string {
  return searchKey(value)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, body: string) => {
    if (body.startsWith("#")) {
      const code = body[1]?.toLowerCase() === "x" ? parseInt(body.slice(2), 16) : Number(body.slice(1));
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : match;
    }
    return ENTITIES[body.toLowerCase()] ?? match;
  });
}

/**
 * Cell → text the app can render. Trainerize instructions arrive as HTML, and
 * the cues field is one cue per line, so block tags become newlines and
 * everything else goes.
 */
function cleanText(value: string): string {
  return decodeEntities(
    value
      .replace(/<\s*br\s*\/?\s*>/gi, "\n")
      .replace(/<\s*\/\s*(p|div|li|tr|h[1-6])\s*>/gi, "\n")
      .replace(/<[^>]*>/g, ""),
  )
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

/** `,`, `;` or tab — whichever appears most in the header line. */
function pickDelimiter(headerLine: string): string {
  const counts = [",", ";", "\t"].map((candidate) => ({
    candidate,
    count: headerLine.split(candidate).length - 1,
  }));
  counts.sort((a, b) => b.count - a.count);
  return counts[0].count > 0 ? counts[0].candidate : ",";
}

/** RFC 4180-ish: quoted cells may hold the delimiter, newlines and `""`. */
function parseRows(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char !== '"') {
        cell += char;
        continue;
      }
      if (text[index + 1] === '"') {
        cell += '"';
        index += 1;
        continue;
      }
      quoted = false;
      continue;
    }
    if (char === '"' && cell === "") {
      quoted = true;
      continue;
    }
    if (char === delimiter) {
      row.push(cell);
      cell = "";
      continue;
    }
    if (char === "\r") continue;
    if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += char;
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((candidate) => candidate.some((value) => value.trim() !== ""));
}

function parseDelimited(text: string): Record<string, string>[] {
  const body = text.replace(/^\uFEFF/, "");
  const rows = parseRows(body, pickDelimiter(body.split("\n", 1)[0] ?? ""));
  const header = rows.shift();
  if (!header) return [];
  return rows.map((values) => {
    const record: Record<string, string> = {};
    header.forEach((key, index) => {
      const name = key.trim();
      if (name) record[name] = values[index] ?? "";
    });
    return record;
  });
}

/** The biggest array of objects anywhere in a payload — a listing's giveaway. */
function largestObjectArray(value: unknown, depth = 0): Record<string, unknown>[] {
  if (depth > 8 || value == null || typeof value !== "object") return [];
  if (Array.isArray(value)) {
    const objects = value.filter(
      (entry): entry is Record<string, unknown> =>
        entry != null && typeof entry === "object" && !Array.isArray(entry),
    );
    const nested = value.map((entry) => largestObjectArray(entry, depth + 1));
    return [objects, ...nested].reduce((best, current) =>
      current.length > best.length ? current : best,
    );
  }
  return Object.values(value)
    .map((entry) => largestObjectArray(entry, depth + 1))
    .reduce((best, current) => (current.length > best.length ? current : best), []);
}

/** Flatten one level: a nested object is not a column, an array of names is. */
function flatten(entry: Record<string, unknown>): Record<string, string> {
  const record: Record<string, string> = {};
  for (const [key, value] of Object.entries(entry)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      const parts = value
        .map((item) =>
          item != null && typeof item === "object"
            ? String((item as Record<string, unknown>).name ?? (item as Record<string, unknown>).title ?? "")
            : String(item),
        )
        .filter(Boolean);
      if (parts.length > 0) record[key] = parts.join(", ");
      continue;
    }
    if (typeof value === "object") continue;
    record[key] = String(value);
  }
  return record;
}

function parseJson(text: string): Record<string, string>[] {
  const parsed: unknown = JSON.parse(text);
  const entries = Array.isArray(parsed)
    ? parsed.filter(
        (entry): entry is Record<string, unknown> =>
          entry != null && typeof entry === "object" && !Array.isArray(entry),
      )
    : largestObjectArray(parsed);
  return entries.map(flatten);
}

function inputFiles(target: string): string[] {
  const stats = statSync(target);
  if (!stats.isDirectory()) return [target];
  return readdirSync(target)
    .filter((entry) => READABLE[extname(entry).toLowerCase()])
    .sort()
    .map((entry) => join(target, entry));
}

/**
 * The set type as the export words it, mapped onto the four the logger knows,
 * or `null` when it does not say. Trainerize's `recordType` vocabulary is
 * exact, so it is tried first; a spreadsheet's freer wording (`Weight & Reps`,
 * `Distance & Time`) falls through to the patterns. Anything that reduces to
 * "some number of repetitions" is a non-answer and returns `null`, so the
 * movement itself gets the last word — see `trackingFromMovement`.
 */
function trackingFrom(value: string): Tracking | null {
  const key = fold(value);
  if (!key) return null;
  const exact = key.replace(/ /g, "");
  const known = RECORD_TYPES[exact];
  if (known) return known;
  // Before the fuzzy patterns, because they are fuzzy: "endurance" contains
  // "dura" and would otherwise read as a duration.
  if (UNSPECIFIC.test(exact)) return null;
  if (/dist|km|metro|meter|metre|mile|milha|pace/.test(key)) return "distance";
  if (/hold|isom|estat|static|plank|prancha/.test(key)) return "hold";
  if (/time|tempo|dura|second|segund|min/.test(key)) return "time";
  return null;
}

/** A shape held still: the name says so outright. */
const HELD = /\bhold\b|isometr|wall sit|\bl sit\b|\bhangs?$/;

/**
 * Stretching, mobilising, rolling. All of it is measured on a clock — nobody
 * prescribes eight repetitions of a hamstring stretch — so the only question
 * left is whether the shape is held or moved through, which the tags answer.
 */
const STRETCHED =
  /stretch|alongament|\bpose\b|\bopener\b|mobili|foam roll|thread the needle|cat cow|\bpigeon\b|puppy/;

/** Counted in ground covered rather than in repetitions. */
const TRAVELLED = /farmer walk|\bcarry\b|sled (drag|push|pull)|shuttle run/;

/**
 * How the movement itself is measured, from its name and its categories —
 * what the export's set type could not say.
 *
 * Trainerize files a stretch under `staticStretches` and a warm-up drill under
 * `dynamicWarmUp`. A movement carrying `staticStretches` is a shape entered and
 * held; one carrying only `dynamicWarmUp` and reading as a stretch is moved
 * through for a while, so it gets the clock rather than the hold. Everything
 * else is repetitions, which is what the overwhelming majority of a strength
 * library is.
 */
function trackingFromMovement(name: string, tags: string[]): Tracking {
  const key = fold(name);
  const filed = tags.map((tag) => fold(tag).replace(/ /g, ""));
  if (TRAVELLED.test(key)) return "distance";
  if (HELD.test(key)) return "hold";
  if (filed.includes("staticstretches") || filed.includes("static")) return "hold";
  if (STRETCHED.test(key)) return filed.includes("dynamicwarmup") ? "time" : "hold";
  return "reps";
}

/**
 * A demo we can actually show. An http(s) link passes through; a bare
 * `[A-Za-z0-9_-]{11}` is a YouTube id, which is how Trainerize stores the
 * videos Sara filmed herself, and becomes a watch URL.
 *
 * Vimeo's numeric ids are deliberately left behind: those point at Trainerize's
 * own footage, which is theirs and not embeddable from here.
 */
function videoFrom(values: string[]): string | undefined {
  const trimmed = values.map((value) => value.trim()).filter(Boolean);
  const url = trimmed.find((value) => /^https?:\/\/\S+$/.test(value));
  if (url) return url;
  const id = trimmed.find((value) => /^[A-Za-z0-9_-]{11}$/.test(value));
  return id ? `https://www.youtube.com/watch?v=${id}` : undefined;
}

type Report = {
  files: string[];
  rows: number;
  kept: number;
  unnamed: number;
  duplicates: number;
  inferredTracking: number;
  videos: number;
  borrowed: number;
  ignoredHeaders: Set<string>;
  trackingCounts: Record<Tracking, number>;
};

function collect(files: string[]): { seeds: ExerciseSeed[]; report: Report } {
  const report: Report = {
    files,
    rows: 0,
    kept: 0,
    unnamed: 0,
    duplicates: 0,
    inferredTracking: 0,
    videos: 0,
    borrowed: 0,
    ignoredHeaders: new Set(),
    trackingCounts: { reps: 0, time: 0, hold: 0, distance: 0 },
  };
  const byKey = new Map<string, ExerciseSeed>();

  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const row of extname(file).toLowerCase() === ".json" ? parseJson(text) : parseDelimited(text)) {
      report.rows += 1;

      /**
       * Candidates per role, carrying the priority of the pattern that claimed
       * them: two columns can both look like a tracking column, and the more
       * specific alias has to win regardless of which came first in the file.
       */
      const columns: Record<Role, { priority: number; value: string }[]> = {
        name: [],
        cues: [],
        tracking: [],
        video: [],
        tags: [],
        source: [],
      };
      for (const [header, value] of Object.entries(row)) {
        const key = fold(header);
        const priority = HEADER_ROLES.findIndex((candidate) => candidate.pattern.test(key));
        if (priority < 0) {
          if (value.trim()) report.ignoredHeaders.add(header.trim());
          continue;
        }
        if (value.trim()) columns[HEADER_ROLES[priority].role].push({ priority, value });
      }
      for (const candidates of Object.values(columns)) candidates.sort((a, b) => a.priority - b.priority);
      const valuesOf = (role: Role): string[] => columns[role].map((candidate) => candidate.value);

      const name = cleanText(valuesOf("name")[0] ?? "").split("\n")[0] ?? "";
      if (!name) {
        report.unnamed += 1;
        continue;
      }
      const key = fold(name);
      if (byKey.has(key)) {
        report.duplicates += 1;
        continue;
      }

      const tags: string[] = [];
      const tagKeys = new Set<string>();
      /** Provenance first, so the borrowed ones read as borrowed at a glance. */
      for (const value of valuesOf("source")) {
        const marker = SOURCE_TAG[fold(value).replace(/ /g, "")];
        if (marker) {
          tags.push(marker);
          tagKeys.add(marker);
          report.borrowed += 1;
        }
      }
      for (const value of valuesOf("tags")) {
        for (const piece of decodeEntities(value).split(/[,;|\n]+/)) {
          const tag = piece.replace(/\s+/g, " ").trim().toLowerCase();
          const tagKey = fold(tag);
          // `n/a` survives only because the slash is not a separator: an
          // equipment cell reading "dumbbell/kettlebell" is one label, and
          // splitting it would leave "n" and "a" as categories.
          if (tagKey.length < 2 || EMPTY_VALUES[tag] || tagKeys.has(tagKey)) continue;
          tagKeys.add(tagKey);
          tags.push(tag);
        }
      }

      let tracking = trackingFrom(valuesOf("tracking")[0] ?? "");
      if (!tracking) {
        tracking = trackingFromMovement(name, tags);
        report.inferredTracking += 1;
      }
      report.trackingCounts[tracking] += 1;

      const videoUrl = videoFrom(valuesOf("video"));
      if (videoUrl) report.videos += 1;

      /**
       * Trainerize is an English platform and its instructions come out in
       * English, so they land in `cuesEn`. The Portuguese column stays empty
       * until Sara writes it — an honest blank she can see and fill, rather
       * than English text pretending to be her voice.
       */
      byKey.set(key, {
        name,
        cues: "",
        cuesEn: cleanText(valuesOf("cues").join("\n")),
        tags,
        tracking,
        ...(videoUrl ? { videoUrl } : {}),
      });
      report.kept += 1;
    }
  }

  const seeds = [...byKey.values()].sort((a, b) => a.name.localeCompare(b.name, "pt"));
  return { seeds, report };
}

function serialise(seed: ExerciseSeed): string {
  const lines = [
    "  {",
    `    name: ${JSON.stringify(seed.name)},`,
    `    cues: ${JSON.stringify(seed.cues)},`,
  ];
  if (seed.cuesEn) lines.push(`    cuesEn: ${JSON.stringify(seed.cuesEn)},`);
  lines.push(
    `    tags: [${seed.tags.map((tag) => JSON.stringify(tag)).join(", ")}],`,
    `    tracking: ${JSON.stringify(seed.tracking)},`,
  );
  if (seed.videoUrl) lines.push(`    videoUrl: ${JSON.stringify(seed.videoUrl)},`);
  lines.push("  },");
  return lines.join("\n");
}

function render(seeds: ExerciseSeed[], report: Report): string {
  const sources = report.files.map((file) => relative(process.cwd(), file)).join(", ") || "—";
  const body = seeds.length === 0 ? "[]" : `[\n${seeds.map(serialise).join("\n")}\n]`;
  return `/**
 * GENERATED — do not edit by hand. Run \`bun run trainerize:import\`.
 *
 * Sara's Trainerize library, carried over as seed data: names, English cues,
 * categories and how each movement is logged. The Portuguese cues are hers to
 * write, so they arrive empty. The ones she filmed herself carry their YouTube
 * link; Trainerize's own Vimeo footage is theirs and stays behind.
 *
 * Source: ${sources}
 * Exercises: ${seeds.length}
 */
import type { ExerciseSeed } from "./types";

export const TRAINERIZE_LIBRARY: ExerciseSeed[] = ${body};
`;
}

const targets = process.argv.slice(2);
const files = (targets.length > 0 ? targets : [DEFAULT_INPUT]).flatMap((target) => {
  try {
    return inputFiles(target);
  } catch {
    console.error(`sem acesso a ${target}`);
    return [];
  }
});

if (files.length === 0) {
  console.error(
    `nada para importar. Põe o export do Trainerize (.csv, .tsv ou .json) em ${relative(process.cwd(), DEFAULT_INPUT)}/ ou passa o caminho como argumento.`,
  );
  process.exit(1);
}

const { seeds, report } = collect(files);
writeFileSync(OUT_FILE, render(seeds, report));

console.log(`ficheiros: ${report.files.map((file) => relative(process.cwd(), file)).join(", ")}`);
console.log(`linhas lidas: ${report.rows}`);
console.log(`exercícios: ${report.kept} (sem nome: ${report.unnamed}, repetidos: ${report.duplicates})`);
console.log(
  `registo: ${(Object.entries(report.trackingCounts) as [Tracking, number][])
    .filter(([, count]) => count > 0)
    .map(([tracking, count]) => `${tracking} ${count}`)
    .join(", ")} (inferido pelo nome: ${report.inferredTracking})`,
);
console.log(`com link de vídeo: ${report.videos}`);
console.log(`da biblioteca do Trainerize (tag "trainerize"): ${report.borrowed}, dela: ${report.kept - report.borrowed}`);
if (report.ignoredHeaders.size > 0) {
  console.log(`colunas ignoradas: ${[...report.ignoredHeaders].join(", ")}`);
}
console.log(`escrito em ${relative(process.cwd(), OUT_FILE)}`);
