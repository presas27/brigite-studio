/**
 * Alpha cut-outs from the SARA_SOL studio shoot. Matting is done by the
 * system Vision framework (scripts/matte.swift) — soft alpha that
 * handles hair and the shoot's non-uniform background shadows, which
 * defeated the old threshold flood-fill. This script drives it, then
 * trims, resizes and encodes RGBA webp into public/images/sara/.
 *
 * Usage, from the project root:
 *   bun scripts/cutout.ts             # writes PICKS to public/images/sara/
 *   bun scripts/cutout.ts candidates  # hero pose candidates + dark previews in /tmp/cutouts
 */
import { spawnSync } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";

const SRC_DIR = path.join(homedir(), "Downloads", "SARA_SOL");
const OUT_DIR = "public/images/sara";
const PREVIEW_DIR = "/tmp/cutouts";
const MATTE = "scripts/matte.swift";

// Bump the -vN suffix whenever an image is regenerated. The Next image
// optimizer caches by URL in .next/cache/images, so overwriting a file
// under the same name keeps serving the stale variant in dev and prod.
// `brightSliver` kills near-background-bright pixels hugging the
// contour — right for dark outfits, wrong for white/light clothing.
const PICKS: Array<{
  file: string;
  out: string;
  width: number;
  brightSliver?: boolean;
}> = [
  { file: "sara_hero.jpg", out: "hero-cutout-v5.webp", width: 1200 },
  {
    file: "GCK00007-Edit.jpg",
    out: "about-cutout-v5.webp",
    width: 1100,
    brightSliver: true,
  },
];

const HERO_CANDIDATES = [
  "GCK00007",
  "GCK00010",
  "GCK00030",
  "GCK00035",
  "GCK00080",
  "GCK00082",
];

async function cutout(
  src: string,
  dest: string,
  width: number,
  brightSliver = false,
) {
  const matted = path.join(tmpdir(), `matte-${path.basename(src)}.png`);
  const proc = spawnSync("swift", [MATTE, src, matted], { encoding: "utf8" });
  if (proc.status !== 0) {
    throw new Error(`matte failed for ${src}: ${proc.stderr}`);
  }

  // Vision's soft edge is wide and carries the studio's warm-gray
  // background in its semi-transparent pixels, which reads as a halo on
  // dark surfaces. Two-step cleanup: measure the true background color
  // from the original where the matte says "background", then un-blend
  // it out of every edge pixel and steepen the alpha ramp.
  const { data, info } = await sharp(matted)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { data: orig } = await sharp(src)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const n = info.width * info.height;

  let bgR = 0;
  let bgG = 0;
  let bgB = 0;
  let bgCount = 0;
  for (let p = 0; p < n; p++) {
    if (data[p * 4 + 3] === 0) {
      bgR += orig[p * 3];
      bgG += orig[p * 3 + 1];
      bgB += orig[p * 3 + 2];
      bgCount++;
    }
  }
  bgR /= bgCount;
  bgG /= bgCount;
  bgB /= bgCount;

  // Vision keeps enclosed background pockets (e.g. between ponytail and
  // shoulder) fully opaque, so edge math alone can't remove them. Within
  // a band near the transparent region, suppress pixels whose original
  // color matches the background — the deeper into the figure, the less
  // we trust color similarity, which protects teeth and highlights.
  const BAND = 120; // px at source resolution
  const dist = new Int32Array(n).fill(-1);
  const queue = new Int32Array(n);
  let head = 0;
  let tail = 0;
  for (let p = 0; p < n; p++) {
    if (data[p * 4 + 3] < 8) {
      dist[p] = 0;
      queue[tail++] = p;
    }
  }
  while (head < tail) {
    const p = queue[head++];
    const d = dist[p];
    if (d >= BAND) continue;
    const x = p % info.width;
    const y = (p / info.width) | 0;
    const push = (q: number) => {
      if (dist[q] === -1) {
        dist[q] = d + 1;
        queue[tail++] = q;
      }
    };
    if (x > 0) push(p - 1);
    if (x < info.width - 1) push(p + 1);
    if (y > 0) push(p - info.width);
    if (y < info.height - 1) push(p + info.width);
  }
  const CD_LO = 15; // color distance to bg: below = surely background,
  const CD_HI = 45; // above = surely subject
  for (let p = 0; p < n; p++) {
    const d = dist[p];
    if (d <= 0) continue; // transparent already, or outside the band
    const i = p * 4;
    const dr = orig[p * 3] - bgR;
    const dg = orig[p * 3 + 1] - bgG;
    const db = orig[p * 3 + 2] - bgB;
    const cd = Math.sqrt(dr * dr + dg * dg + db * db);
    const bySimilarity = Math.min(1, Math.max(0, (cd - CD_LO) / (CD_HI - CD_LO)));
    const byDepth = d / BAND;
    data[i + 3] = Math.round(data[i + 3] * Math.max(bySimilarity, byDepth));
  }

  // Choke: shave the outermost ring of the matte. Vision's edge is a
  // couple of pixels generous and that ring carries the lightest
  // background blend, which reads as a pale outline at high zoom.
  const CHOKE = 3; // px fully removed at source resolution
  const FEATHER = 5; // px to ramp back to full alpha
  for (let p = 0; p < n; p++) {
    const d = dist[p];
    if (d <= 0 || d > CHOKE + FEATHER) continue;
    const f = Math.min(1, Math.max(0, (d - CHOKE) / FEATHER));
    data[p * 4 + 3] = Math.round(data[p * 4 + 3] * f);
  }

  // Bright slivers of background caught between hair strands hug the
  // contour but sit brighter than the measured background, so the
  // similarity window misses them. Anything at least as bright as the
  // background in every channel this close to the edge is background;
  // skin and hair always fail in one channel, and the earring sits
  // deeper than this band.
  const SLIVER_BAND = 12;
  if (brightSliver) {
    for (let p = 0; p < n; p++) {
      const d = dist[p];
      if (d <= 0 || d > SLIVER_BAND) continue;
      if (
        orig[p * 3] > bgR - 12 &&
        orig[p * 3 + 1] > bgG - 12 &&
        orig[p * 3 + 2] > bgB - 12
      ) {
        data[p * 4 + 3] = 0;
      }
    }
  }

  const LO = 0.12; // alpha ramp remap: below LO drops out,
  const HI = 0.92; // above HI goes fully opaque
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    const a = data[i + 3];
    if (a === 0 || a === 255) continue;
    const t = Math.min(1, Math.max(0, (a / 255 - LO) / (HI - LO)));
    const a2 = Math.round(t * 255);
    if (a2 === 0) {
      data[i + 3] = 0;
      continue;
    }
    // Un-blend the measured background out of the edge pixel.
    const w = 255 - a;
    for (let c = 0; c < 3; c++) {
      const bg = c === 0 ? bgR : c === 1 ? bgG : bgB;
      data[i + c] = Math.min(
        255,
        Math.max(0, Math.round((data[i + c] * 255 - w * bg) / a)),
      );
    }
    data[i + 3] = a2;
  }

  // Top-left pixel is transparent, so trim() drops the clear borders.
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .trim({ threshold: 8 })
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 82, alphaQuality: 100, effort: 5 })
    .toFile(dest);
  await rm(matted, { force: true });

  const out = await sharp(dest).metadata();
  console.log(
    `${path.basename(src)} -> ${dest} ${out.width}x${out.height} alpha:${out.hasAlpha}`,
  );
}

/** Composite a cut-out onto a dark swatch so edge halos are visible. */
async function preview(webp: string, dest: string, bgHex: { r: number; g: number; b: number }) {
  const buf = await sharp(webp).resize({ height: 760 }).toBuffer();
  const meta = await sharp(buf).metadata();
  await sharp({
    create: {
      width: (meta.width ?? 500) + 80,
      height: 840,
      channels: 3,
      background: bgHex,
    },
  })
    .composite([{ input: buf, top: 40, left: 40 }])
    .png()
    .toFile(dest);
}

const mode = process.argv[2] ?? "picks";

if (mode === "candidates") {
  await mkdir(PREVIEW_DIR, { recursive: true });
  for (const name of HERO_CANDIDATES) {
    const out = path.join(PREVIEW_DIR, `${name}.webp`);
    await cutout(path.join(SRC_DIR, `${name}-Edit.jpg`), out, 1200, true);
    // Hero sits on the caramel gradient's dark end; About card is near-black.
    await preview(out, path.join(PREVIEW_DIR, `${name}-brown.png`), { r: 107, g: 63, b: 36 });
    await preview(out, path.join(PREVIEW_DIR, `${name}-ink.png`), { r: 20, g: 16, b: 12 });
  }
  console.log(`previews in ${PREVIEW_DIR}`);
} else {
  await mkdir(OUT_DIR, { recursive: true });
  for (const pick of PICKS) {
    await cutout(
      path.join(SRC_DIR, pick.file),
      path.join(OUT_DIR, pick.out),
      pick.width,
      pick.brightSliver,
    );
  }
}
