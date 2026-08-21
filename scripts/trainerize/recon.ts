/**
 * Reconnaissance run against a logged-in Trainerize account.
 *
 * Trainerize has no export: the help centre states plainly that workouts and
 * programs cannot be exported or transferred, and the built-in exercise library
 * does not come out either. The only route to the library is the app itself.
 *
 * Rather than guess at their internal API, this script watches one. It drives
 * the real Chrome profile — already authenticated, so no credentials are
 * handled here — and records every JSON response the app makes, along with the
 * shape of each payload. That observed contract is what `pull.ts` then replays
 * directly, so the extraction never depends on scrolling a virtual list.
 *
 * Navigation is confined to trainerize.com.
 */
import { chromium, type Response } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const PROFILE = join(homedir(), "Library/Application Support/Google/Chrome");
const OUT_DIR = join(process.cwd(), ".data");
const HOME = "https://www.trainerize.com/";
/** Long enough for a dashboard to settle; short enough to stay a probe. */
const WATCH_MS = 25_000;

type Seen = {
  url: string;
  method: string;
  status: number;
  /** Field names of the first object in the largest array found, if any. */
  arrayKeys: string[] | null;
  arrayLength: number;
  topLevelKeys: string[];
};

/** The biggest array anywhere in the payload — a listing endpoint's giveaway. */
function largestArray(value: unknown, depth = 0): unknown[] | null {
  if (depth > 6 || value == null || typeof value !== "object") return null;
  let best: unknown[] | null = Array.isArray(value) ? value : null;
  for (const child of Object.values(value as Record<string, unknown>)) {
    const found = largestArray(child, depth + 1);
    if (found && (!best || found.length > best.length)) best = found;
  }
  return best;
}

async function summarise(response: Response): Promise<Seen | null> {
  const type = response.headers()["content-type"] ?? "";
  if (!type.includes("json")) return null;
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return null;
  }
  const array = largestArray(body);
  const first = array?.[0];
  return {
    url: response.url(),
    method: response.request().method(),
    status: response.status(),
    arrayKeys:
      first && typeof first === "object" && !Array.isArray(first)
        ? Object.keys(first as Record<string, unknown>)
        : null,
    arrayLength: array?.length ?? 0,
    topLevelKeys:
      body && typeof body === "object" && !Array.isArray(body)
        ? Object.keys(body as Record<string, unknown>)
        : [],
  };
}

const context = await chromium.launchPersistentContext(PROFILE, {
  channel: "chrome",
  headless: false,
  viewport: null,
  args: ["--profile-directory=Default"],
});

const seen: Seen[] = [];
context.on("response", (response) => {
  if (!response.url().includes("trainerize.com")) return;
  void summarise(response).then((entry) => entry && seen.push(entry));
});

const page = context.pages()[0] ?? (await context.newPage());
await page.goto(HOME, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(WATCH_MS);

/** Anything in the chrome that looks like a way into the library. */
const links = await page.$$eval("a[href]", (nodes) =>
  nodes
    .map((node) => ({
      text: (node.textContent ?? "").trim().slice(0, 60),
      href: (node as HTMLAnchorElement).href,
    }))
    .filter((link) => /exercis|librar|workout|program/i.test(link.text + link.href))
    .slice(0, 40),
);

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(
  join(OUT_DIR, "trainerize-recon.json"),
  JSON.stringify({ landedOn: page.url(), title: await page.title(), links, seen }, null, 2),
);
await page.screenshot({ path: join(OUT_DIR, "trainerize-recon.png"), fullPage: false });

console.log(`landed on ${page.url()}`);
console.log(`${seen.length} JSON responses, ${links.length} candidate links`);
await context.close();
