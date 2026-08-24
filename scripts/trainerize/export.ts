/**
 * Pull Sara's exercise library out of Trainerize.
 *
 * Trainerize has no export. The help centre is explicit — workouts and programs
 * cannot be exported or transferred, the only official CSV is the client list —
 * so the app itself is the only route to the library.
 *
 * Rather than guess at their internal API, this script watches one and then
 * replays it. It opens a real browser window against a profile of its own,
 * waits for a manual login (no credentials are handled here, and the session is
 * reused on later runs), lands on the exercise library, and harvests every JSON
 * response that carries a list of exercise-shaped records. It then re-issues the
 * best of those requests with the paging numbers walked forward, which is what
 * makes the extraction independent of scrolling a virtual list.
 *
 * Usage:
 *   bun run trainerize:export                 # subdomain from TRAINERIZE_SUBDOMAIN
 *   bun run trainerize:export brigitestudios  # or as an argument
 *
 * Writes `scripts/trainerize/export/library.json`, which `import.ts` turns into
 * seed data, plus a report of what was observed in `.data/` — the report is the
 * thing to read when a run comes back thin.
 *
 * Navigation is confined to the account's own Trainerize subdomain.
 */
import { chromium, type APIResponse, type Request, type Response } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SUBDOMAIN = process.argv[2] ?? process.env.TRAINERIZE_SUBDOMAIN ?? "brigitestudios";
const ORIGIN = `https://${SUBDOMAIN}.trainerize.com`;
/**
 * `mode=all&level=trainer` is the whole library, hers and Trainerize's own.
 * `TRAINERIZE_LIBRARY_URL` overrides it — for a narrower view (`mode=custom`),
 * or to point the run at a local stand-in.
 */
const LIBRARY =
  process.env.TRAINERIZE_LIBRARY_URL ?? `${ORIGIN}/app/ExerciseLibrary.aspx?mode=all&level=trainer`;

/**
 * A profile of our own, not the system Chrome one: Chrome refuses DevTools on a
 * default data directory, which is what makes driving the real profile fail
 * before the first page loads. The session lives here, so the login is asked
 * for once and not on every run.
 */
const PROFILE_DIR = join(process.cwd(), ".data/trainerize-profile");
const OUT_DIR = join(process.cwd(), "scripts/trainerize/export");
const REPORT = join(process.cwd(), ".data/trainerize-export-report.json");

const LOGIN_TIMEOUT_MS = 6 * 60 * 1_000;
/** Paging safety net: 40 pages of anything is already a very large library. */
const MAX_PAGES = 40;

type Record_ = Record<string, unknown>;

type Capture = {
  url: string;
  method: string;
  postData: string | null;
  request: Request;
  records: Record_[];
};

/** The biggest array of objects anywhere in a payload — a listing's giveaway. */
function largestObjectArray(value: unknown, depth = 0): Record_[] {
  if (depth > 8 || value == null || typeof value !== "object") return [];
  if (Array.isArray(value)) {
    const objects = value.filter(
      (entry): entry is Record_ => entry != null && typeof entry === "object" && !Array.isArray(entry),
    );
    const nested = value.map((entry) => largestObjectArray(entry, depth + 1));
    return [objects, ...nested].reduce((best, current) => (current.length > best.length ? current : best));
  }
  return Object.values(value)
    .map((entry) => largestObjectArray(entry, depth + 1))
    .reduce((best, current) => (current.length > best.length ? current : best), []);
}

/**
 * Does this record look like an exercise? A name-ish string field and enough
 * other fields to be a row rather than a menu entry. Deliberately loose: the
 * cost of a false positive is a column the importer reports as ignored, the
 * cost of a false negative is a missing library.
 */
function looksLikeExercise(record: Record_): boolean {
  const keys = Object.keys(record);
  if (keys.length < 3) return false;
  return keys.some(
    (key) =>
      /^(name|title|exercisename|exercise_name|displayname)$/i.test(key.replace(/[^a-z_]/gi, "")) &&
      typeof record[key] === "string" &&
      String(record[key]).trim() !== "",
  );
}

/** Stable identity for merging pages: whatever id the payload carries, else the name. */
function identify(record: Record_): string {
  for (const key of Object.keys(record)) {
    if (/^(id|exerciseid|exercise_id|guid|key)$/i.test(key.replace(/[^a-z_]/gi, ""))) {
      const value = record[key];
      if (typeof value === "string" || typeof value === "number") return `id:${value}`;
    }
  }
  for (const key of Object.keys(record)) {
    if (/name|title/i.test(key) && typeof record[key] === "string") return `name:${String(record[key]).toLowerCase()}`;
  }
  return `json:${JSON.stringify(record)}`;
}

const OFFSET_KEYS = ["start", "offset", "skip", "from", "begin", "startindex", "startrow"];
const PAGE_KEYS = ["page", "pageindex", "pagenumber", "pagenum", "index"];
const SIZE_KEYS = ["count", "limit", "pagesize", "take", "num", "rows", "size", "length", "max"];

type Paging = {
  where: "query" | "body";
  /** The number that moves, and whether it counts records or pages. */
  key: string;
  step: "records" | "pages";
  from: number;
  size: number;
};

/** Find the number in a request that means "give me the next slice". */
function findPaging(params: Record<string, string | number>, where: "query" | "body", fallbackSize: number): Paging | null {
  const entries = Object.entries(params).map(([key, value]) => ({
    key,
    flat: key.toLowerCase().replace(/[^a-z]/g, ""),
    value: Number(value),
  }));
  const numeric = entries.filter((entry) => Number.isFinite(entry.value));
  const size = numeric.find((entry) => SIZE_KEYS.includes(entry.flat) && entry.value > 0);
  const offset = numeric.find((entry) => OFFSET_KEYS.includes(entry.flat));
  if (offset) {
    return { where, key: offset.key, step: "records", from: offset.value, size: size?.value ?? fallbackSize };
  }
  const page = numeric.find((entry) => PAGE_KEYS.includes(entry.flat));
  if (page) {
    return { where, key: page.key, step: "pages", from: page.value, size: size?.value ?? fallbackSize };
  }
  return null;
}

async function readJson(response: Response | APIResponse): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

mkdirSync(PROFILE_DIR, { recursive: true });
mkdirSync(OUT_DIR, { recursive: true });

console.log(`a abrir o ${ORIGIN} num perfil dedicado (${PROFILE_DIR})`);
const context = await chromium.launchPersistentContext(PROFILE_DIR, {
  channel: "chrome",
  headless: false,
  viewport: null,
  args: ["--hide-crash-restore-bubble"],
});

const captures: Capture[] = [];
const observed: { url: string; method: string; status: number; records: number; keys: string[] }[] = [];

context.on("response", (response) => {
  void (async () => {
    if (!(response.headers()["content-type"] ?? "").includes("json")) return;
    const body = await readJson(response);
    if (body == null) return;
    const array = largestObjectArray(body);
    const records = array.filter(looksLikeExercise);
    observed.push({
      url: response.url(),
      method: response.request().method(),
      status: response.status(),
      records: records.length,
      keys: records[0] ? Object.keys(records[0]) : array[0] ? Object.keys(array[0]) : [],
    });
    if (records.length === 0) return;
    captures.push({
      url: response.url(),
      method: response.request().method(),
      postData: response.request().postData(),
      request: response.request(),
      records,
    });
  })();
});

const page = await context.newPage();
await page.goto(LIBRARY, { waitUntil: "domcontentloaded", timeout: 60_000 });

/**
 * A login screen is not a failure, it is the expected first run. What follows a
 * successful login is the account's dashboard, not the page we asked for, so
 * waiting for the library's own URL would wait forever.
 *
 * Instead: watch, and act only when the address changes to something that is
 * not a login screen — that is the moment the session exists. Never navigate on
 * a timer while a login screen is up; that would wipe a half-typed password.
 */
const LOGIN_URL = /log[-_]?in|sign[-_]?in|auth|password|forgot/i;
const deadline = Date.now() + LOGIN_TIMEOUT_MS;
let landed = /ExerciseLibrary/i.test(page.url());
let lastSeen = page.url();

if (!landed) console.log("\n>>> faz login na janela que abriu. Eu espero, e sigo sozinho. <<<\n");
while (!landed && Date.now() < deadline) {
  const url = page.url();
  if (/ExerciseLibrary/i.test(url)) {
    landed = true;
    break;
  }
  if (url !== lastSeen && !LOGIN_URL.test(url)) {
    lastSeen = url;
    console.log(`login feito (${url}) — a voltar à biblioteca`);
    await page.goto(LIBRARY, { waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => {});
    continue;
  }
  lastSeen = url;
  await page.waitForTimeout(2_000);
}

if (!landed) {
  console.error("não cheguei à biblioteca — sem sessão não há nada para tirar");
  await context.close();
  process.exit(1);
}

console.log(`na biblioteca (${page.url()}) — a deixar a lista carregar`);
await page.waitForTimeout(6_000);

/**
 * Scroll the grid to the end. A virtual list only asks for what is on screen,
 * so every screenful is another listing request for the harvester to catch.
 * Stops when the page stops growing twice in a row, not on a fixed count.
 */
let stalled = 0;
let lastHeight = 0;
for (let step = 0; step < 60 && stalled < 2; step += 1) {
  const height = await page.evaluate(() => {
    const scrollers = Array.from(document.querySelectorAll<HTMLElement>("*")).filter(
      (node) => node.scrollHeight > node.clientHeight + 200 && node.clientHeight > 200,
    );
    const target = scrollers.sort((a, b) => b.scrollHeight - a.scrollHeight)[0];
    if (target) {
      target.scrollTop = target.scrollHeight;
      return target.scrollHeight;
    }
    window.scrollTo(0, document.body.scrollHeight);
    return document.body.scrollHeight;
  });
  await page.waitForTimeout(900);
  stalled = height === lastHeight ? stalled + 1 : 0;
  lastHeight = height;
}

/**
 * One page of a library is one endpoint. A dashboard also ships marketing
 * tiles, tag lists and gym directories, and every one of those is an array of
 * objects with a `name` in it — indistinguishable from an exercise record by
 * shape alone, and pure noise once imported.
 *
 * So the endpoint is the anchor: group the captures by the path that produced
 * them, and keep only the path that produced the most records. The listing call
 * wins by construction — it is the only one that fires once per page of a
 * library — and everything else is dropped whole rather than filtered record by
 * record.
 */
const byPath = new Map<string, Capture[]>();
for (const capture of captures) {
  const url = new URL(capture.url);
  const path = `${url.origin}${url.pathname}`;
  const bucket = byPath.get(path);
  if (bucket) bucket.push(capture);
  else byPath.set(path, [capture]);
}

const ranked = [...byPath.entries()]
  .map(([path, list]) => ({
    path,
    list,
    total: list.reduce((sum, capture) => sum + capture.records.length, 0),
  }))
  .sort((a, b) => b.total - a.total || b.list.length - a.list.length);

for (const group of ranked) {
  console.log(`  ${group.total} registos em ${group.list.length} respostas — ${group.path}`);
}

const chosen = ranked[0];
const byId = new Map<string, Record_>();
for (const capture of chosen?.list ?? []) {
  for (const record of capture.records) byId.set(identify(record), record);
}
console.log(`endpoint escolhido: ${chosen?.path ?? "nenhum"} — ${byId.size} exercícios distintos até aqui`);

/**
 * Replay the richest request of that endpoint with its paging walked forward.
 * Scrolling gets what the grid felt like rendering; this gets the rest.
 */
const best = [...(chosen?.list ?? [])].sort((a, b) => b.records.length - a.records.length)[0];
let paging: Paging | null = null;
if (best) {
  const url = new URL(best.url);
  const query: Record<string, string> = Object.fromEntries(url.searchParams);
  let body: Record_ | null = null;
  try {
    const parsed: unknown = best.postData ? JSON.parse(best.postData) : null;
    if (parsed != null && typeof parsed === "object" && !Array.isArray(parsed)) body = parsed as Record_;
  } catch {
    body = null;
  }

  paging =
    findPaging(query, "query", best.records.length) ??
    (body
      ? findPaging(
          Object.fromEntries(
            Object.entries(body).filter(([, value]) => typeof value === "number" || typeof value === "string"),
          ) as Record<string, string | number>,
          "body",
          best.records.length,
        )
      : null);

  if (!paging) {
    console.log("sem parâmetro de paginação reconhecível — fica o que o scroll trouxe");
  } else {
    console.log(`a paginar por ${paging.where}.${paging.key} (${paging.step}, ${paging.size} por página)`);
    /**
     * The captured request's own headers — that is what carries the session —
     * minus the ones the transport owns. A stale `content-length` on a rewritten
     * body is a 400, and HTTP/2 pseudo-headers (`:authority`, `:method`…) are
     * not valid header names outside the protocol frame: passing them through
     * throws before the request leaves.
     */
    const headers = Object.fromEntries(
      Object.entries(await best.request.allHeaders()).filter(
        ([key]) => !key.startsWith(":") && !["content-length", "host"].includes(key.toLowerCase()),
      ),
    );

    /**
     * Resume where the scroll stopped instead of walking the list again: with a
     * record cursor, what the grid already fetched is a contiguous prefix, so
     * the next slice starts past it. Both conventions survive this — `from` is
     * whatever the app itself sent, 0- or 1-based.
     */
    const walked = byId.size;
    for (let index = 0; index < MAX_PAGES; index += 1) {
      const next =
        paging.step === "pages"
          ? paging.from + Math.ceil(walked / paging.size) + index
          : paging.from + walked + index * paging.size;
      const before = byId.size;

      const target = new URL(best.url);
      let data = best.postData ?? undefined;
      if (paging.where === "query") {
        target.searchParams.set(paging.key, String(next));
      } else if (body) {
        data = JSON.stringify({ ...body, [paging.key]: next });
      }

      const outcome = await page.request
        .fetch(target.toString(), {
          method: best.method,
          headers,
          ...(data ? { data } : {}),
          failOnStatusCode: false,
        })
        .then((response) => ({ response, error: null }))
        .catch((error: unknown) => ({ response: null, error }));
      if (!outcome.response || !outcome.response.ok()) {
        const reason = outcome.response
          ? `HTTP ${outcome.response.status()}`
          : String(outcome.error instanceof Error ? outcome.error.message : outcome.error).split("\n")[0];
        console.log(`a partir de ${paging.key}=${next}: ${reason} — paro aqui`);
        break;
      }
      const records = largestObjectArray(await readJson(outcome.response)).filter(looksLikeExercise);
      for (const record of records) byId.set(identify(record), record);
      if (byId.size === before) {
        console.log(`${paging.key}=${next}: nada de novo — fim da lista`);
        break;
      }
      console.log(`${paging.key}=${next}: +${byId.size - before} (total ${byId.size})`);
    }
  }
}

/**
 * Nothing on the wire means the grid is server-rendered. Read the DOM instead,
 * under the field names the importer already understands.
 */
if (byId.size === 0) {
  console.log("nenhum JSON com exercícios — a ler a grelha do DOM");
  const scraped = await page.evaluate(() => {
    const rows = Array.from(
      document.querySelectorAll<HTMLElement>(
        "[class*=exercise] li, [class*=exercise] tr, li[class*=exercise], tr[class*=exercise], [class*=exerciseItem]",
      ),
    );
    return rows
      .map((row) => {
        const text = (row.innerText ?? "").split("\n").map((line) => line.trim()).filter(Boolean);
        const link = row.querySelector("a[href]") as HTMLAnchorElement | null;
        return { name: text[0] ?? "", type: text[1] ?? "", tags: text.slice(2).join(", "), url: link?.href ?? "" };
      })
      .filter((row) => row.name.length > 1);
  });
  for (const record of scraped) byId.set(identify(record as Record_), record as Record_);
  console.log(`${scraped.length} linhas lidas do DOM`);
}

const records = [...byId.values()];
writeFileSync(
  join(OUT_DIR, "library.json"),
  JSON.stringify({ capturedAt: new Date().toISOString(), source: best?.url ?? page.url(), records }, null, 2),
);
mkdirSync(join(process.cwd(), ".data"), { recursive: true });
writeFileSync(
  REPORT,
  JSON.stringify(
    {
      landedOn: page.url(),
      endpoint: chosen?.path ?? null,
      exercises: records.length,
      paging,
      /** Every endpoint that produced records, so a wrong pick is visible. */
      endpoints: ranked.map((group) => ({
        path: group.path,
        records: group.total,
        responses: group.list.length,
      })),
      sampleKeys: records[0] ? Object.keys(records[0]) : [],
      sample: records[0] ?? null,
      observed: observed.sort((a, b) => b.records - a.records).slice(0, 40),
    },
    null,
    2,
  ),
);

console.log(`\n${records.length} exercícios em scripts/trainerize/export/library.json`);
console.log(`relatório em ${REPORT}`);
console.log("a seguir: bun run trainerize:import");
await context.close();
