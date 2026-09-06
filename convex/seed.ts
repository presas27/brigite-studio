import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";
import { components, internal } from "./_generated/api";
import { createAuth } from "./auth";
import { exerciseKeys, insertExercise, insertWorkout } from "./model/library";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "../src/lib/studio/pilot";
import { TRAINERIZE_LIBRARY } from "../src/lib/studio/library-trainerize";
import { searchKey } from "../src/lib/utils";
import type { ExerciseSeed } from "../src/lib/studio/types";

/**
 * Provisioning. Run once per deployment, by hand, from the CLI:
 *
 * ```
 * npx convex run seed:accounts
 * npx convex run seed:importLibrary
 * npx convex run seed:retrackLibrary
 * npx convex run seed:masterWorkouts
 * ```
 *
 * Everything here is `internal`, which means the only caller that can reach it
 * is the Convex CLI with the deployment's admin key. That is deliberate and it
 * is also the reason this is no longer a function the app calls on a request:
 * the studio used to re-seed itself on every page load because the database it
 * ran on could vanish between two clicks. It cannot now. Creating Sara's
 * account is a thing that happens once, in the open, by someone who meant it.
 *
 * Every step is idempotent, so re-running one after adding exercises to
 * `library-trainerize.ts` imports only what is new and corrects only what the
 * seed now measures differently.
 */

/**
 * The library Sara filmed herself. The master workouts below are built out of
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
 * The three provisioned accounts: Sara, a client she trains, a client training
 * alone (`src/lib/studio/pilot.ts`).
 *
 * An action, because creating a login is Better Auth's job and it runs its
 * own transaction. Each login is then attached to the studio row with that
 * address (`users.linkLogin`), which keeps the row's id — and every plan,
 * message and session already written against it — when this is re-run on a
 * deployment that had the pilot data.
 *
 * The clients arrive empty otherwise: no fabricated history. Sara writes the
 * plans; the clients do the sessions; every number on screen is then true.
 */
export const accounts = internalAction({
  args: {},
  handler: async (ctx) => {
    const linked: string[] = [];

    for (const account of DEMO_ACCOUNTS) {
      const existing = await ctx.runQuery(components.betterAuth.adapter.findOne, {
        model: "user",
        where: [{ field: "email", value: account.email }],
      });

      let authId: string;
      if (existing && typeof existing === "object" && "_id" in existing) {
        authId = String(existing._id);
      } else {
        const created = await createAuth(ctx).api.signUpEmail({
          body: { email: account.email, name: account.name, password: DEMO_PASSWORD },
        });
        authId = created.user.id;
      }

      await ctx.runMutation(internal.users.linkLogin, {
        authId,
        email: account.email,
        name: account.name,
        role: account.role,
        coachEmail: account.coachEmail,
      });
      linked.push(account.email);
    }

    return { linked };
  },
});
/**
 * Seed Sara's client onboarding/intake form with all 6 sections requested:
 * 1. Dados pessoais
 * 2. Contacto de emergência
 * 3. Objetivos e fitness
 * 4. Saúde (com alertas de sensibilidade e campos condicionais)
 * 5. Comentários finais
 * 6. Consentimento
 */
export const intakeForm = internalMutation({
  args: {},
  handler: async (ctx) => {
    const coach = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "coach"))
      .first();
    if (!coach) throw new Error("No coach found to assign intake form");

    const fields = [
      // SECÇÃO 1 — Dados pessoais
      {
        id: "name",
        position: 0,
        section: "SECÇÃO 1 — Dados pessoais",
        type: "text" as const,
        label: "Nome completo",
        hint: "O teu nome e apelido",
        required: true,
        options: [],
      },
      {
        id: "birthdate",
        position: 1,
        section: "SECÇÃO 1 — Dados pessoais",
        type: "date" as const,
        label: "Data de nascimento",
        hint: "",
        required: false,
        options: [],
      },
      {
        id: "email",
        position: 2,
        section: "SECÇÃO 1 — Dados pessoais",
        type: "text" as const,
        label: "Email",
        hint: "Email de contacto e acesso à plataforma",
        required: true,
        options: [],
      },
      {
        id: "phone",
        position: 3,
        section: "SECÇÃO 1 — Dados pessoais",
        type: "text" as const,
        label: "Telefone",
        hint: "Número de telemóvel para contacto",
        required: false,
        options: [],
      },
      {
        id: "address",
        position: 4,
        section: "SECÇÃO 1 — Dados pessoais",
        type: "textarea" as const,
        label: "Morada",
        hint: "Opcional",
        required: false,
        options: [],
      },

      // SECÇÃO 2 — Contacto de emergência
      {
        id: "emergency_name",
        position: 5,
        section: "SECÇÃO 2 — Contacto de emergência",
        type: "text" as const,
        label: "Nome",
        hint: "Nome da pessoa de contacto em caso de emergência",
        required: false,
        options: [],
      },
      {
        id: "emergency_phone",
        position: 6,
        section: "SECÇÃO 2 — Contacto de emergência",
        type: "text" as const,
        label: "Telefone",
        hint: "Contacto telefónico de emergência",
        required: false,
        options: [],
      },
      {
        id: "emergency_relation",
        position: 7,
        section: "SECÇÃO 2 — Contacto de emergência",
        type: "text" as const,
        label: "Relação",
        hint: "Ex: cônjuge, familiar, amigo/a",
        required: false,
        options: [],
      },

      // SECÇÃO 3 — Objetivos e fitness
      {
        id: "fitness_goals",
        position: 8,
        section: "SECÇÃO 3 — Objetivos e fitness",
        type: "multiselect" as const,
        label: "What are your fitness goals?",
        hint: "Seleção múltipla de objetivos",
        required: true,
        options: ["Flexibility", "Health (General)", "Posture", "Muscular strength/power"],
      },
      {
        id: "other_fitness_goals",
        position: 9,
        section: "SECÇÃO 3 — Objetivos e fitness",
        type: "textarea" as const,
        label: "Other fitness goals (if not selected above)",
        hint: "Campo de texto livre",
        required: false,
        options: [],
      },
      {
        id: "exercise_regularly",
        position: 10,
        section: "SECÇÃO 3 — Objetivos e fitness",
        type: "yesno" as const,
        label: "Do you exercise regularly?",
        hint: "I currently exercise regularly",
        required: true,
        options: [],
      },
      {
        id: "cardio_ability",
        position: 11,
        section: "SECÇÃO 3 — Objetivos e fitness",
        type: "select" as const,
        label: "Rate your ability to perform cardio exercises",
        hint: "Escala de avaliação",
        required: true,
        options: ["Poor", "Fair", "Good", "Excellent"],
      },
      {
        id: "exercise_experience",
        position: 12,
        section: "SECÇÃO 3 — Objetivos e fitness",
        type: "select" as const,
        label: "Rate your experience with exercise",
        hint: "Nível de experiência",
        required: true,
        options: ["Beginner", "Intermediate", "Advanced"],
      },
      {
        id: "equipment_access",
        position: 13,
        section: "SECÇÃO 3 — Objetivos e fitness",
        type: "multiselect" as const,
        label: "What equipment do you have access to?",
        hint: "Equipamento disponível para os teus treinos",
        required: true,
        options: [
          "Resistance bands",
          "TRX bands",
          "Dumbbells",
          "Barbell",
          "Kettlebell",
          "Pull-up bar",
          "Bench",
          "Full gym access",
          "None / Bodyweight only",
        ],
      },
      {
        id: "workout_days",
        position: 14,
        section: "SECÇÃO 3 — Objetivos e fitness",
        type: "multiselect" as const,
        label: "On which days are you available to work out?",
        hint: "Dias da semana disponíveis",
        required: true,
        options: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
      },
      {
        id: "workout_frequency",
        position: 15,
        section: "SECÇÃO 3 — Objetivos e fitness",
        type: "select" as const,
        label: "How frequently do you have time to exercise?",
        hint: "Frequência semanal",
        required: true,
        options: ["1-2 dias/semana", "2-3 dias/semana", "4-5 dias/semana", "6-7 dias/semana"],
      },

      // SECÇÃO 4 — Saúde
      {
        id: "injuries_yesno",
        position: 16,
        section: "SECÇÃO 4 — Saúde",
        type: "yesno" as const,
        label:
          "Do you have any existing injuries or conditions that I should be aware of while building your training plan?",
        hint: "",
        required: true,
        sensitive: true,
        options: [],
      },
      {
        id: "injuries_details",
        position: 17,
        section: "SECÇÃO 4 — Saúde",
        type: "textarea" as const,
        label: "Se sim, por favor descreva as lesões ou condições existentes",
        hint: "Detalhes sobre localização, dor ou restrições de movimento",
        required: false,
        sensitive: true,
        showIf: { fieldId: "injuries_yesno", equals: "yes" },
        options: [],
      },
      {
        id: "smoke",
        position: 18,
        section: "SECÇÃO 4 — Saúde",
        type: "yesno" as const,
        label: "Do you smoke tobacco products?",
        hint: "",
        required: true,
        options: [],
      },
      {
        id: "medical_conditions_yesno",
        position: 19,
        section: "SECÇÃO 4 — Saúde",
        type: "yesno" as const,
        label: "Tem alguma condição médica relevante (cardíaca, respiratória, diabetes, etc.)?",
        hint: "",
        required: true,
        sensitive: true,
        options: [],
      },
      {
        id: "medical_conditions_details",
        position: 20,
        section: "SECÇÃO 4 — Saúde",
        type: "textarea" as const,
        label: "Se sim, por favor especifique a condição médica relevante",
        hint: "",
        required: false,
        sensitive: true,
        showIf: { fieldId: "medical_conditions_yesno", equals: "yes" },
        options: [],
      },
      {
        id: "medication_yesno",
        position: 21,
        section: "SECÇÃO 4 — Saúde",
        type: "yesno" as const,
        label: "Toma alguma medicação relevante para o treino?",
        hint: "",
        required: true,
        sensitive: true,
        options: [],
      },
      {
        id: "medication_details",
        position: 22,
        section: "SECÇÃO 4 — Saúde",
        type: "textarea" as const,
        label: "Se sim, por favor especifique a medicação relevante",
        hint: "",
        required: false,
        sensitive: true,
        showIf: { fieldId: "medication_yesno", equals: "yes" },
        options: [],
      },
      {
        id: "pregnancy",
        position: 23,
        section: "SECÇÃO 4 — Saúde",
        type: "yesno" as const,
        label: "Está grávida ou no pós-parto?",
        hint: "Mostrar/responder se relevante",
        required: false,
        sensitive: true,
        options: [],
      },
      {
        id: "medical_clearance",
        position: 24,
        section: "SECÇÃO 4 — Saúde",
        type: "select" as const,
        label: "Tem autorização médica para praticar exercício físico?",
        hint: "",
        required: true,
        options: ["Sim", "Não", "Não aplicável"],
      },

      // SECÇÃO 5 — Comentários finais
      {
        id: "final_comments",
        position: 25,
        section: "SECÇÃO 5 — Comentários finais",
        type: "textarea" as const,
        label: "Any other comments about what you would like to see in your fitness plan?",
        hint: "Opcional",
        required: false,
        options: [],
      },

      // SECÇÃO 6 — Consentimento
      {
        id: "consent_responsibility",
        position: 26,
        section: "SECÇÃO 6 — Consentimento",
        type: "checkbox" as const,
        label:
          "Confirmo que as informações fornecidas são verdadeiras e assumo a responsabilidade pela prática de exercício físico.",
        hint: "",
        required: true,
        options: [],
      },
      {
        id: "consent_terms",
        position: 27,
        section: "SECÇÃO 6 — Consentimento",
        type: "checkbox" as const,
        label: "Aceito os termos e condições do serviço",
        hint: "",
        required: true,
        options: [],
      },
    ];

    const existing = await ctx.db
      .query("intakeForms")
      .withIndex("by_coach", (q) => q.eq("coachId", coach._id))
      .first();

    const formPayload = {
      coachId: coach._id,
      title: "Formulário de Inscrição — Brigite's Studio",
      intro:
        "Bem-vindo/a ao Brigite's Studio! Por favor, preenche este formulário inicial para podermos desenhar o teu plano de treino personalizado com toda a segurança.",
      published: true,
      updatedAt: Date.now(),
      fields,
    };

    if (existing) {
      await ctx.db.patch("intakeForms", existing._id, formPayload);
      return { action: "updated", formId: existing._id, fieldCount: fields.length };
    }

    const formId = await ctx.db.insert("intakeForms", formPayload);
    return { action: "created", formId, fieldCount: fields.length };
  },
});

export const clearIntakeResponses = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("intakeResponses").collect();
    for (const row of all) {
      await ctx.db.delete(row._id);
    }
    return all.length;
  },
});

/**
 * Remove an account outright: the login, the studio row, the profile, and any
 * invites addressed to it. Admin-only, by the CLI — the app has no delete
 * button on purpose (archiving keeps history). What the person wrote or
 * trained stays: rows that point at the id are not touched, the same as an
 * archived account.
 *
 * ```
 * npx convex run seed:removeAccount '{"email": "x@y.com"}'
 * ```
 */
export const removeAccount = internalAction({
  args: { email: v.string() },
  handler: async (ctx, { email }): Promise<{ removed: boolean }> => {
    const login = await ctx.runQuery(components.betterAuth.adapter.findOne, {
      model: "user",
      where: [{ field: "email", value: email.trim().toLowerCase() }],
    });
    if (login && typeof login === "object" && "_id" in login) {
      const authId = String(login._id);
      for (const model of ["session", "account"] as const) {
        await ctx.runMutation(components.betterAuth.adapter.deleteMany, {
          input: { model, where: [{ field: "userId", value: authId }] },
          paginationOpts: { cursor: null, numItems: 200 },
        });
      }
      await ctx.runMutation(components.betterAuth.adapter.deleteOne, {
        input: { model: "user", where: [{ field: "_id", value: authId }] },
      });
    }
    const removed = await ctx.runMutation(internal.users.removeByEmail, { email });
    return { removed: removed || login !== null };
  },
});

/** One chunk of the seeded library. Skips anything the library already holds. */
export const exerciseBatch = internalMutation({
  args: {
    entries: v.array(
      v.object({
        name: v.string(),
        cues: v.string(),
        cuesEn: v.optional(v.string()),
        tags: v.array(v.string()),
        tracking: v.union(
          v.literal("reps"),
          v.literal("time"),
          v.literal("hold"),
          v.literal("distance"),
        ),
        videoUrl: v.optional(v.union(v.null(), v.string())),
      }),
    ),
  },
  handler: async (ctx, { entries }) => {
    // Archived rows count as present: a movement Sara archived on purpose must
    // not reappear, and nothing she edited is overwritten. This only ever adds
    // what is missing.
    const present = await exerciseKeys(ctx);

    let inserted = 0;
    for (const entry of entries) {
      const key = searchKey(entry.name).trim();
      if (!key || present.has(key)) continue;
      present.add(key);
      await insertExercise(ctx, {
        name: entry.name,
        cues: entry.cues,
        cuesEn: entry.cuesEn ?? "",
        tags: entry.tags,
        tracking: entry.tracking,
        videoUrl: entry.videoUrl ?? null,
      });
      inserted += 1;
    }
    return inserted;
  },
});

/**
 * Import the whole seeded library — Sara's own entries plus whatever came out
 * of her Trainerize account.
 *
 * An action driving batched mutations rather than one big mutation: two
 * thousand inserts is more than one transaction should carry, and a batch that
 * fails leaves the ones before it in place, so re-running finishes the job.
 */
const BATCH = 200;

export const importLibrary = internalAction({
  args: {},
  handler: async (ctx) => {
    const entries = [...STARTER_LIBRARY, ...TRAINERIZE_LIBRARY];
    let inserted = 0;

    for (let start = 0; start < entries.length; start += BATCH) {
      inserted += await ctx.runMutation(internal.seed.exerciseBatch, {
        entries: entries.slice(start, start + BATCH),
      });
    }

    return { total: entries.length, inserted };
  },
});

/** One chunk of the tracking correction. See `retrackLibrary`. */
export const retrackBatch = internalMutation({
  args: {
    entries: v.array(
      v.object({
        name: v.string(),
        tracking: v.union(
          v.literal("reps"),
          v.literal("time"),
          v.literal("hold"),
          v.literal("distance"),
        ),
      }),
    ),
  },
  handler: async (ctx, { entries }) => {
    let corrected = 0;
    for (const entry of entries) {
      if (entry.tracking === "reps") continue;
      const doc = await ctx.db
        .query("exercises")
        .withIndex("by_archived_and_name", (q) =>
          q.eq("archived", false).eq("name", entry.name.trim()),
        )
        .unique();
      // Only the ones still on the blanket default move. A movement Sara has
      // since set herself is hers, and a row she renamed is not this row.
      if (!doc || doc.tracking !== "reps") continue;
      await ctx.db.patch("exercises", doc._id, { tracking: entry.tracking });
      corrected += 1;
    }
    return corrected;
  },
});

/**
 * Bring the library's tracking back in line with the seed.
 *
 * The first Trainerize import read `recordType` as the answer to how a set is
 * measured, and Trainerize files a static hamstring stretch under the same
 * `strength`/`endurance`/`general` default as a back squat — so two thousand
 * movements landed on reps, and a client asked to hold a stretch for 45s was
 * shown a rep field and a kilo field. `library-trainerize.ts` now derives it
 * from the movement itself; `importLibrary` only ever adds what is missing, so
 * this is what reaches the rows already imported.
 *
 * Idempotent and safe to re-run: it only ever moves a row off "reps", and only
 * when the seed has something more specific to say about it.
 */
export const retrackLibrary = internalAction({
  args: {},
  handler: async (ctx) => {
    const entries = [...STARTER_LIBRARY, ...TRAINERIZE_LIBRARY].map((entry) => ({
      name: entry.name,
      tracking: entry.tracking,
    }));
    let corrected = 0;

    for (let start = 0; start < entries.length; start += BATCH) {
      corrected += await ctx.runMutation(internal.seed.retrackBatch, {
        entries: entries.slice(start, start + BATCH),
      });
    }

    return { total: entries.length, corrected };
  },
});

/**
 * Three master workouts in the library, built from the starter names.
 *
 * They are templates, not anybody's plan: `clientId` and `phaseId` stay null,
 * so they show in the library and get copied into a client's phase when Sara
 * puts one there.
 */
export const masterWorkouts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const coach = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "coach"))
      .first();
    if (!coach) throw new Error("Run seed:accounts first — there is no coach to own these");

    const coachId = coach._id;
    const exercises = await ctx.db.query("exercises").collect();
    if (exercises.length === 0) {
      throw new Error("Run seed:importLibrary first — the library is empty");
    }
    const byName = new Map(exercises.map((exercise) => [exercise.name, exercise._id]));

    // Existing library templates, read once: three inserts must not re-read the
    // whole table three times, and nothing else writes to it while this runs.
    const templates = await ctx.db
      .query("workouts")
      .withIndex("by_client", (q) => q.eq("clientId", null))
      .collect();

    /** Add one workout, unless a template of that name is already there. */
    async function template(
      name: string,
      focus: string,
      instructions: string,
      blocks: {
        kind: "normal" | "circuit";
        label: string;
        rounds?: number;
        restSeconds: number;
        items: {
          exercise: string;
          sets: number;
          reps?: string;
          seconds?: number | null;
          restSeconds?: number;
          rpe?: string;
        }[];
      }[],
    ) {
      if (templates.some((workout) => workout.name === name)) return false;

      const workoutId = await insertWorkout(ctx, {
        name,
        focus,
        instructions,
        workoutType: "regular",
        coachId,
        clientId: null,
        phaseId: null,
        sourceWorkoutId: null,
        position: 0,
      });

      let blockPosition = 0;
      for (const block of blocks) {
        const blockId = await ctx.db.insert("workoutBlocks", {
          workoutId,
          position: blockPosition,
          kind: block.kind,
          label: block.label,
          rounds: block.rounds ?? 1,
          restSeconds: block.restSeconds,
        });
        blockPosition += 1;

        let itemPosition = 0;
        for (const item of block.items) {
          const exerciseId = byName.get(item.exercise);
          if (!exerciseId) continue;
          await ctx.db.insert("workoutItems", {
            blockId,
            position: itemPosition,
            exerciseId,
            sets: item.sets,
            reps: item.reps ?? "",
            seconds: item.seconds ?? null,
            tempo: "",
            restSeconds: item.restSeconds ?? 60,
            rpe: item.rpe ?? "",
            notes: "",
          });
          itemPosition += 1;
        }
      }
      return true;
    }

    const added: string[] = [];

    if (
      await template(
        "Força — corpo inteiro A",
        "Força",
        "Aquece 8 minutos antes. Progride carga só com técnica limpa.",
        [
          {
            kind: "normal",
            label: "Principal",
            restSeconds: 120,
            items: [
              { exercise: "Agachamento com barra", sets: 4, reps: "6-8", restSeconds: 120, rpe: "7-8" },
              { exercise: "Peso morto romeno", sets: 3, reps: "8-10", restSeconds: 120, rpe: "7-8" },
              { exercise: "Elevação na barra", sets: 4, reps: "AMRAP", restSeconds: 120, rpe: "7-8" },
            ],
          },
          {
            kind: "circuit",
            label: "Core",
            rounds: 3,
            restSeconds: 45,
            items: [
              { exercise: "Prancha frontal", sets: 1, seconds: 40, restSeconds: 30 },
              { exercise: "Ponte de ombros", sets: 1, seconds: 40, restSeconds: 30 },
            ],
          },
        ],
      )
    ) {
      added.push("Força — corpo inteiro A");
    }

    if (
      await template(
        "Mobilidade e equilibrismo",
        "Mobilidade",
        "Sem pressa. Filma a parada de mãos para eu ver a linha.",
        [
          {
            kind: "normal",
            label: "Mobilidade",
            restSeconds: 45,
            items: [
              { exercise: "Mobilidade de ombro com bastão", sets: 3, reps: "10", seconds: 45 },
              { exercise: "Abertura de anca em posição de sapo", sets: 3, reps: "10", seconds: 45 },
            ],
          },
          {
            kind: "normal",
            label: "Equilibrismo",
            restSeconds: 90,
            items: [
              { exercise: "Parada de mãos à parede", sets: 5, seconds: 20, restSeconds: 90 },
              { exercise: "Parada de cabeça controlada", sets: 5, seconds: 20, restSeconds: 90 },
            ],
          },
        ],
      )
    ) {
      added.push("Mobilidade e equilibrismo");
    }

    if (
      await template("Aéreo — base", "Aéreo", "Nunca treines aéreo sozinha. Colchão sempre.", [
        {
          kind: "normal",
          label: "Tecido",
          restSeconds: 120,
          items: [
            { exercise: "Subida de tecido — trepar", sets: 3, reps: "3", seconds: 20, restSeconds: 120 },
            { exercise: "Inversão em argolas aéreas", sets: 3, reps: "3", seconds: 20, restSeconds: 120 },
            { exercise: "Suspensão em trapézio", sets: 3, reps: "3", seconds: 20, restSeconds: 120 },
          ],
        },
      ])
    ) {
      added.push("Aéreo — base");
    }

    return { added };
  },
});
