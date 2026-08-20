import { dayKey, shiftDay } from "./db";
import { addBlock, addItem, createExercise, createWorkout, listExercises } from "./library";
import { assignWorkout } from "./plan";
import { coach, createClient, createUser, setClientStatus } from "./users";

/**
 * First-boot seed. Creates Sara's coach account and a starter library that
 * reflects what she actually teaches — força, mobilidade, equilibrismo and
 * aerial work — because a generic gym database is exactly what the app is
 * replacing.
 *
 * Idempotent: it does nothing once a coach exists. `STUDIO_DEMO=1` additionally
 * creates one demo client with a week of plan, so the app is explorable
 * immediately.
 */

const COACH_EMAIL = process.env.STUDIO_COACH_EMAIL ?? "hello@brigitestudio.com";

type Recipe = {
  name: string;
  cues: string;
  tags: string[];
  tracking: "reps" | "time" | "hold" | "distance";
};

const STARTER_LIBRARY: Recipe[] = [
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

/** Ensure the coach account and starter library exist. Safe to call often. */
export function seedStudio(): void {
  if (coach()) return;

  createUser({
    email: COACH_EMAIL,
    name: "Sara Brigites",
    role: "coach",
    locale: "pt",
    status: "active",
  });

  for (const recipe of STARTER_LIBRARY) {
    createExercise({
      name: recipe.name,
      cues: recipe.cues,
      tags: recipe.tags,
      tracking: recipe.tracking,
    });
  }

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

  if (process.env.STUDIO_DEMO !== "1") return;

  const demo = createClient({
    email: "aluna.demo@brigitestudio.com",
    name: "Joana Santos",
    plan: "online",
    goals: "Primeira parada de mãos livre e mobilidade de ombro para tecido.",
    injuries: "Ombro direito sensível em fim de amplitude.",
  });
  setClientStatus(demo.id, "active");

  const monday = shiftDay(dayKey(), -((new Date().getUTCDay() + 6) % 7));
  const plan: [string, number][] = [
    [strength, 0],
    [mobility, 1],
    [aerial, 3],
    [strength, 4],
    [mobility, 5],
  ];
  for (const [workoutId, offset] of plan) {
    assignWorkout({ clientId: demo.id, workoutId, date: shiftDay(monday, offset) });
  }
}
