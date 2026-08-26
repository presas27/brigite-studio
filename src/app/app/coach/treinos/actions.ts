"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireCoach } from "@/lib/studio/auth";
import {
  addBlock,
  addItem,
  archiveWorkout,
  createWorkout,
  duplicateWorkout,
  findWorkout,
  groupItems,
  looseBlockId,
  moveItem,
  removeBlock,
  removeItem,
  reorderItems,
  ungroupBlock,
  updateBlock,
  updateItem,
  updateWorkout,
} from "@/lib/studio/library";
import type { BlockKind, WorkoutType } from "@/lib/studio/types";

/**
 * Server actions for the workout builder. Every export starts with
 * `requireCoach()`. Rows carry their ids as hidden fields rather than bound
 * closures, so one form can wire several buttons (save / move / remove) to
 * different actions via `formAction` while sharing the same hidden inputs.
 */

const LIST_PATH = "/app/coach/treinos";

/**
 * Where the workout being edited actually lives. A library template is edited
 * under `/app/coach/treinos`; a client-scoped copy is edited inside its
 * training phase, and revalidating the library path would leave that screen
 * showing stale blocks. One indexed read per mutation buys correctness for
 * both.
 */
async function workoutPath(workoutId: string): Promise<string> {
  const workout = await findWorkout(workoutId);
  if (workout?.clientId && workout.phaseId) {
    return `/app/coach/alunos/${workout.clientId}/plano/fase/${workout.phaseId}/treino/${workoutId}`;
  }
  return `${LIST_PATH}/${workoutId}`;
}

/** `Number.parseInt`, but an invalid or missing value means "leave unchanged". */
function intField(formData: FormData, key: string): number | undefined {
  const raw = formData.get(key);
  if (raw == null) return undefined;
  const parsed = Number.parseInt(String(raw), 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/** Same, but an explicitly blank field means "clear it" (for nullable `seconds`). */
function nullableIntField(formData: FormData, key: string): number | null | undefined {
  const raw = formData.get(key);
  if (raw == null) return undefined;
  const trimmed = String(raw).trim();
  if (trimmed === "") return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function textField(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "");
}

function idField(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

const WORKOUT_TYPES: readonly WorkoutType[] = ["regular", "circuit", "interval"];

/** Anything the form did not offer falls back to `regular`, never to a throw. */
function workoutTypeField(formData: FormData): WorkoutType {
  const raw = textField(formData, "workoutType").trim() as WorkoutType;
  return WORKOUT_TYPES.includes(raw) ? raw : "regular";
}

/** Create a library workout and jump straight into its editor. */
export async function createWorkoutAction(formData: FormData): Promise<void> {
  const coach = await requireCoach();
  const name = textField(formData, "name").trim();
  if (!name) return;

  const id = await createWorkout({
    name,
    focus: textField(formData, "focus"),
    notes: textField(formData, "notes"),
    workoutType: workoutTypeField(formData),
    coachId: coach.id,
  });
  revalidatePath(LIST_PATH);
  redirect(await workoutPath(id));
}

export async function updateWorkoutAction(formData: FormData): Promise<void> {
  await requireCoach();
  const workoutId = idField(formData, "workoutId");
  if (!workoutId) return;

  const name = textField(formData, "name").trim();
  await updateWorkout(workoutId, {
    name: name || undefined,
    focus: textField(formData, "focus"),
    notes: textField(formData, "notes"),
  });
  revalidatePath(await workoutPath(workoutId));
}

/**
 * The workout's general instructions — the free text at the top of the builder,
 * above the exercise list. Saved on blur like every other builder field.
 */
export async function updateInstructionsAction(formData: FormData): Promise<void> {
  await requireCoach();
  const workoutId = idField(formData, "workoutId");
  if (!workoutId) return;
  await updateWorkout(workoutId, { instructions: textField(formData, "instructions") });
  revalidatePath(await workoutPath(workoutId));
}

export async function archiveWorkoutAction(formData: FormData): Promise<void> {
  await requireCoach();
  const workoutId = idField(formData, "workoutId");
  if (!workoutId) return;
  await archiveWorkout(workoutId);
  revalidatePath(LIST_PATH);
}

/** Deep-copies the workout under "<name> (cópia)" and stays on the list. */
export async function duplicateWorkoutAction(formData: FormData): Promise<void> {
  await requireCoach();
  const workoutId = idField(formData, "workoutId");
  if (!workoutId) return;
  const source = await findWorkout(workoutId);
  if (!source) return;

  const t = await getTranslations("Studio.workouts");
  await duplicateWorkout(workoutId, `${source.name} ${t("copySuffix")}`);
  revalidatePath(LIST_PATH);
}

export async function addBlockAction(formData: FormData): Promise<void> {
  await requireCoach();
  const workoutId = idField(formData, "workoutId");
  if (!workoutId) return;

  await addBlock(workoutId, {
    kind: textField(formData, "kind") as BlockKind,
    label: textField(formData, "label"),
    rounds: intField(formData, "rounds"),
    restSeconds: intField(formData, "restSeconds"),
  });
  revalidatePath(await workoutPath(workoutId));
}

export async function updateBlockAction(formData: FormData): Promise<void> {
  await requireCoach();
  const workoutId = idField(formData, "workoutId");
  const blockId = idField(formData, "blockId");
  if (!workoutId || !blockId) return;

  await updateBlock(blockId, {
    kind: textField(formData, "kind") as BlockKind,
    label: textField(formData, "label"),
    rounds: intField(formData, "rounds"),
    restSeconds: intField(formData, "restSeconds"),
  });
  revalidatePath(await workoutPath(workoutId));
}

export async function removeBlockAction(formData: FormData): Promise<void> {
  await requireCoach();
  const workoutId = idField(formData, "workoutId");
  const blockId = idField(formData, "blockId");
  if (!workoutId || !blockId) return;
  await removeBlock(blockId);
  revalidatePath(await workoutPath(workoutId));
}

export async function addItemAction(formData: FormData): Promise<void> {
  await requireCoach();
  const workoutId = idField(formData, "workoutId");
  const blockId = idField(formData, "blockId");
  const exerciseId = idField(formData, "exerciseId");
  if (!workoutId || !blockId || !exerciseId) return;

  await addItem(blockId, { exerciseId });
  revalidatePath(await workoutPath(workoutId));
}

export async function updateItemAction(formData: FormData): Promise<void> {
  await requireCoach();
  const workoutId = idField(formData, "workoutId");
  const itemId = idField(formData, "itemId");
  if (!workoutId || !itemId) return;

  await updateItem(itemId, {
    sets: intField(formData, "sets"),
    reps: textField(formData, "reps"),
    seconds: nullableIntField(formData, "seconds"),
    tempo: textField(formData, "tempo"),
    restSeconds: intField(formData, "restSeconds"),
    rpe: textField(formData, "rpe"),
    notes: textField(formData, "notes"),
  });
  revalidatePath(await workoutPath(workoutId));
}

/**
 * Commit a drag. The client posts the target block's whole running order, so
 * one call covers reordering inside a block and dropping a card into another
 * one — the item is adopted by whichever block sends its id.
 *
 * Typed rather than form-encoded because it is fired from a transition after
 * the card has already moved on screen, not from a submit.
 */
export async function reorderItemsAction(
  workoutId: string,
  blockId: string,
  itemIds: string[],
): Promise<void> {
  await requireCoach();
  if (!workoutId || !blockId || !Array.isArray(itemIds)) return;
  await reorderItems(blockId, itemIds.map(String).filter(Boolean));
  revalidatePath(await workoutPath(workoutId));
}

/** Switch a block between per-exercise sets and rounds of the whole list. */
export async function setBlockKindAction(
  workoutId: string,
  blockId: string,
  kind: BlockKind,
): Promise<void> {
  await requireCoach();
  if (!workoutId || !blockId) return;
  // Leaving the circuit resets the round count: "3 rounds of sets of 3" is a
  // prescription nobody means, and it silently doubles the volume.
  await updateBlock(blockId, { kind, ...(kind === "normal" ? { rounds: 1 } : {}) });
  revalidatePath(await workoutPath(workoutId));
}

/** Add an exercise from the picker. Returns nothing — the grid re-renders. */
export async function addExerciseAction(
  workoutId: string,
  blockId: string,
  exerciseId: string,
): Promise<void> {
  await requireCoach();
  if (!workoutId || !blockId || !exerciseId) return;
  await addItem(blockId, { exerciseId });
  revalidatePath(await workoutPath(workoutId));
}

export async function removeItemAction(formData: FormData): Promise<void> {
  await requireCoach();
  const workoutId = idField(formData, "workoutId");
  const itemId = idField(formData, "itemId");
  if (!workoutId || !itemId) return;
  await removeItem(itemId);
  revalidatePath(await workoutPath(workoutId));
}

export async function moveItemUpAction(formData: FormData): Promise<void> {
  await requireCoach();
  const workoutId = idField(formData, "workoutId");
  const itemId = idField(formData, "itemId");
  if (!workoutId || !itemId) return;
  await moveItem(itemId, -1);
  revalidatePath(await workoutPath(workoutId));
}

export async function moveItemDownAction(formData: FormData): Promise<void> {
  await requireCoach();
  const workoutId = idField(formData, "workoutId");
  const itemId = idField(formData, "itemId");
  if (!workoutId || !itemId) return;
  await moveItem(itemId, 1);
  revalidatePath(await workoutPath(workoutId));
}

/* ----------------------------------------------- supersets and circuits */

/**
 * Add an exercise to the ungrouped list. The builder's "Add exercise" button
 * sits outside every group, so this is where a new exercise lands until the
 * coach combines it with another one.
 */
export async function addLooseExerciseAction(
  workoutId: string,
  exerciseId: string,
): Promise<void> {
  await requireCoach();
  if (!workoutId || !exerciseId) return;
  await addItem(await looseBlockId(workoutId), { exerciseId });
  revalidatePath(await workoutPath(workoutId));
}

/**
 * Combine the selected exercises into a super set (two exercises back to back)
 * or a circuit (three or more, repeated for a number of rounds). Fewer than two
 * selected is a no-op — `groupItems` refuses it.
 */
export async function groupItemsAction(
  workoutId: string,
  itemIds: string[],
  kind: "superset" | "circuit",
  rounds?: number,
): Promise<void> {
  await requireCoach();
  if (!workoutId || !Array.isArray(itemIds)) return;
  await groupItems(workoutId, itemIds.map(String).filter(Boolean), kind, rounds);
  revalidatePath(await workoutPath(workoutId));
}

/** Break a group up, returning its exercises to the ungrouped list. */
export async function ungroupBlockAction(workoutId: string, blockId: string): Promise<void> {
  await requireCoach();
  if (!workoutId || !blockId) return;
  await ungroupBlock(blockId);
  revalidatePath(await workoutPath(workoutId));
}

/** How many times a circuit's list is repeated. */
export async function setRoundsAction(
  workoutId: string,
  blockId: string,
  rounds: number,
): Promise<void> {
  await requireCoach();
  if (!workoutId || !blockId || !Number.isFinite(rounds)) return;
  await updateBlock(blockId, { rounds });
  revalidatePath(await workoutPath(workoutId));
}
