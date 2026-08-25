import { createHash } from "node:crypto";
import { searchKey } from "@/lib/utils";
import { get, run, tx, type Row } from "./db";
import { withStableIds } from "./id";
import {
  addBlock,
  addItem,
  createExercise,
  createWorkout,
  exerciseNameKeys,
  listExercises,
} from "./library";
import { TRAINERIZE_LIBRARY } from "./library-trainerize";
import { coach, createClient, createUser, setClientStatus } from "./users";
import type { ExerciseSeed } from "./types";

/**
 * First-boot seed. Creates Sara's coach account, the hand-written starter
 * library that reflects what she actually teaches — força, mobilidade,
 * equilibrismo and aerial work — on top of it whatever came out of her
 * Trainerize account (`library-trainerize.ts`, generated), a few master
 * workouts, and the two clients the pilot runs with.
 *
 * The clients arrive empty: active accounts, no plan, no history, no
 * measurements. This used to fabricate a month of completed sessions so the
 * preview had charts to draw, and that is exactly wrong for a pilot — Sara
 * would be reading adherence numbers that nobody earned. She writes the plans;
 * Iris does the sessions; every number on screen is then true.
 */

const COACH_EMAIL = process.env.STUDIO_COACH_EMAIL ?? "hello@brigitestudio.com";

/**
 * Who the pilot runs with, and the only accounts the quick sign-in on
 * `/app/entrar` will hand a session to.
 *
 * Addresses are on the studio's own domain because the pilot signs in by
 * button, not by email. Swap them for the real ones when the magic link has to
 * reach an inbox.
 */
export const PILOT_CLIENTS = [
  { email: "iris@brigitestudio.com", name: "Iris Fernandes" },
  { email: "guilherme@brigitestudio.com", name: "Guilherme Presas" },
] as const;

/**
 * The library Sara filmed herself. The demo workouts below are built out of
 * these names, so this list stays hand-written even after the Trainerize
 * import: aerial, hand balancing and mobility progressions are exactly what a
 * commercial database does not have.
 */
const STARTER_LIBRARY: ExerciseSeed[] = [
  {
    name: "Agachamento com barra",
    cues: "Pés à largura dos ombros\nJoelhos alinhados com os pés\nTronco firme na descida",
    tags: ["força", "membros inferiores"],
    tracking: "reps",
  },
  {
    name: "Peso morto romeno",
    cues: "Anca atrás, coluna neutra\nBarra colada às pernas\nSente os isquiotibiais",
    tags: ["força", "cadeia posterior"],
    tracking: "reps",
  },
  {
    name: "Elevação na barra",
    cues: "Omoplatas ativas antes de puxar\nSem balanço\nQueixo acima da barra",
    tags: ["força", "membros superiores"],
    tracking: "reps",
  },
  {
    name: "Prancha frontal",
    cues: "Costelas para baixo\nGlúteos ativos\nRespiração contínua",
    tags: ["core"],
    tracking: "hold",
  },
  {
    name: "Parada de mãos à parede",
    cues: "Mãos à largura dos ombros\nEmpurra o chão\nColuna longa, sem arco lombar",
    tags: ["equilibrismo", "força"],
    tracking: "hold",
  },
  {
    name: "Parada de cabeça controlada",
    cues: "Triângulo estável antes de subir\nEntra e sai devagar\nSem saltar",
    tags: ["equilibrismo"],
    tracking: "hold",
  },
  {
    name: "Mobilidade de ombro com bastão",
    cues: "Amplitude sem dor\nMovimento lento\nSem compensar com a lombar",
    tags: ["mobilidade", "ombro"],
    tracking: "reps",
  },
  {
    name: "Abertura de anca em posição de sapo",
    cues: "Peso distribuído\nRespira na posição\nSem forçar o joelho",
    tags: ["mobilidade", "anca"],
    tracking: "hold",
  },
  {
    name: "Ponte de ombros",
    cues: "Abre o peito\nEmpurra o chão com as mãos\nPescoço relaxado",
    tags: ["mobilidade", "coluna"],
    tracking: "hold",
  },
  {
    name: "Subida de tecido — trepar",
    cues: "Fecha a chave com o pé antes de subir\nBraços a puxar em conjunto\nDesce sempre controlada",
    tags: ["aéreo", "força"],
    tracking: "reps",
  },
  {
    name: "Inversão em argolas aéreas",
    cues: "Core ativo antes de inverter\nOmbros longe das orelhas\nSaída controlada",
    tags: ["aéreo"],
    tracking: "reps",
  },
  {
    name: "Suspensão em trapézio",
    cues: "Pega firme, ombros ativos\nRespira\nDesce antes de perder a forma",
    tags: ["aéreo", "força"],
    tracking: "hold",
  },
];

/**
 * What the seeded library currently says, in sixteen hex characters. Computed
 * once per process: `seedStudio` runs on every request, and comparing one
 * indexed row against this is what keeps that check from turning into a scan of
 * two thousand exercises.
 */
const LIBRARY_FINGERPRINT = createHash("sha1")
  .update([...STARTER_LIBRARY, ...TRAINERIZE_LIBRARY].map((entry) => entry.name).join("\n"))
  .digest("hex")
  .slice(0, 16);

/**
 * Insert every seeded exercise the library does not already hold, matched on
 * name (accents and case folded). Archived rows count as present: a movement
 * Sara archived on purpose must not reappear on the next boot, and neither is
 * anything she edited overwritten — this only ever adds what is missing.
 *
 * Separate from `seed` because a local checkout keeps its database across
 * restarts, so re-running the Trainerize import has to reach a library that was
 * already seeded. One transaction: two thousand inserts on a cold start are one
 * commit, not two thousand.
 */
function syncLibrary(): void {
  tx(() => {
    const present = exerciseNameKeys();
    for (const entry of [...STARTER_LIBRARY, ...TRAINERIZE_LIBRARY]) {
      const key = searchKey(entry.name).trim();
      if (!key || present.has(key)) continue;
      present.add(key);
      createExercise({
        name: entry.name,
        cues: entry.cues,
        cuesEn: entry.cuesEn ?? "",
        tags: entry.tags,
        tracking: entry.tracking,
        videoUrl: entry.videoUrl ?? null,
      });
    }
    run(
      "INSERT INTO meta (key, value) VALUES ('library', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      LIBRARY_FINGERPRINT,
    );
  });
}

/** Ensure the coach account and the seeded library exist. Safe to call often. */
export function seedStudio(): void {
  if (coach()) {
    const seeded = get<Row>("SELECT value FROM meta WHERE key = 'library'");
    if (String(seeded?.value ?? "") !== LIBRARY_FINGERPRINT) syncLibrary();
    return;
  }
  withStableIds(seed);
}

/**
 * The seed itself, under deterministic ids: an ephemeral host rebuilds these
 * rows on every cold start, and a link one instance rendered has to still
 * resolve on the instance that serves the click. See `id.ts`.
 */
function seed(): void {
  createUser({
    email: COACH_EMAIL,
    name: "Sara Brigites",
    role: "coach",
    locale: "pt",
    status: "active",
  });

  syncLibrary();

  const byName = new Map(listExercises().map((exercise) => [exercise.name, exercise.id]));

  const strength = createWorkout({
    name: "Força — corpo inteiro A",
    focus: "Força",
    notes: "Aquece 8 minutos antes. Progride carga só com técnica limpa.",
  });
  const mainBlock = addBlock(strength, { kind: "normal", label: "Principal", restSeconds: 120 });
  for (const [name, sets, reps] of [
    ["Agachamento com barra", 4, "6-8"],
    ["Peso morto romeno", 3, "8-10"],
    ["Elevação na barra", 4, "AMRAP"],
  ] as const) {
    const exerciseId = byName.get(name);
    if (exerciseId) addItem(mainBlock, { exerciseId, sets, reps, restSeconds: 120, rpe: "7-8" });
  }
  const coreBlock = addBlock(strength, { kind: "circuit", label: "Core", rounds: 3, restSeconds: 45 });
  for (const name of ["Prancha frontal", "Ponte de ombros"]) {
    const exerciseId = byName.get(name);
    if (exerciseId) addItem(coreBlock, { exerciseId, sets: 1, seconds: 40, restSeconds: 30 });
  }

  const mobility = createWorkout({
    name: "Mobilidade e equilibrismo",
    focus: "Mobilidade",
    notes: "Sem pressa. Filma a parada de mãos para eu ver a linha.",
  });
  const mobilityBlock = addBlock(mobility, { kind: "normal", label: "Mobilidade", restSeconds: 45 });
  for (const name of [
    "Mobilidade de ombro com bastão",
    "Abertura de anca em posição de sapo",
  ]) {
    const exerciseId = byName.get(name);
    if (exerciseId) addItem(mobilityBlock, { exerciseId, sets: 3, reps: "10", seconds: 45 });
  }
  const balanceBlock = addBlock(mobility, { kind: "normal", label: "Equilibrismo", restSeconds: 90 });
  for (const name of ["Parada de mãos à parede", "Parada de cabeça controlada"]) {
    const exerciseId = byName.get(name);
    if (exerciseId) addItem(balanceBlock, { exerciseId, sets: 5, seconds: 20, restSeconds: 90 });
  }

  const aerial = createWorkout({
    name: "Aéreo — base",
    focus: "Aéreo",
    notes: "Nunca treines aéreo sozinha. Colchão sempre.",
  });
  const aerialBlock = addBlock(aerial, { kind: "normal", label: "Tecido", restSeconds: 120 });
  for (const name of ["Subida de tecido — trepar", "Inversão em argolas aéreas", "Suspensão em trapézio"]) {
    const exerciseId = byName.get(name);
    if (exerciseId) addItem(aerialBlock, { exerciseId, sets: 3, reps: "3", seconds: 20, restSeconds: 120 });
  }

  for (const person of PILOT_CLIENTS) {
    const client = createClient({
      email: person.email,
      name: person.name,
      plan: "online",
      // Left blank on purpose. Goals and injuries are facts about a real
      // person, and Sara is the one who takes them down.
      goals: "",
      injuries: "",
    });
    setClientStatus(client.id, "active");
  }
}
