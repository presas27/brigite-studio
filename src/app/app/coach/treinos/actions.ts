"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireBuilder } from "@/lib/studio/auth";
import { parseDurationInput, parseMinutesInput } from "@/lib/studio/duration";
import {
  addBlock,
  addItem,
  archiveWorkout,
  createWorkout,
  duplicateWorkout,
  findWorkout,
  groupItems,
  moveBlock,
  moveItem,
  removeBlock,
  removeItem,
  reorderItems,
  tailBlockId,
  updateBlock,
  updateItem,
  updateWorkout,
} from "@/lib/studio/library";
import type { BlockKind, Role, WorkoutType } from "@/lib/studio/types";

/**
 * Server actions for the workout builder. Every export starts with
 * `requireBuilder()` — a coach, or a client training alone, who builds their
 * own. Rows carry their ids as hidden fields rather than bound closures, so
 * one form can wire several buttons (save / move / remove) to different
 * actions via `formAction` while sharing the same hidden inputs.
 */

/**
 * Where the workout being edited actually lives. A coach's library template is
 * edited under `/app/coach/treinos`; a client-scoped copy inside its training
 * phase; a solo client's own template under their workouts. Revalidating the
 * wrong one would leave the screen showing stale blocks. One indexed read per
 * mutation buys correctness for all three.
 */
async function workoutPath(workoutId: string, role: Role): Promise<string> {
  if (role === "client") return `/app/aluno/treinos/editar/${workoutId}`;
  const workout = await findWorkout(workoutId);
  if (workout?.clientId && workout.phaseId) {
    return `/app/coach/alunos/${workout.clientId}/plano/fase/${workout.phaseId}/treino/${workoutId}`;
  }
  return `/app/coach/treinos/${workoutId}`;
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
  const builder = await requireBuilder();
  const name = textField(formData, "name").trim();
  if (!name) return;

  const id = await createWorkout({
    name,
    focus: textField(formData, "focus"),
    instructions: textField(formData, "instructions"),
    workoutType: workoutTypeField(formData),
    estimatedMinutes: parseMinutesInput(textField(formData, "estimatedMinutes")),
  });
  refresh();
  redirect(await workoutPath(id, builder.role));
}

/**
 * Name, focus and duration, from the settings dialog. The instructions are
 * deliberately absent: they are the builder's field, saved by
 * `updateInstructionsAction`, and a dialog that posted an empty textarea it
 * never showed would wipe them.
 */
export async function updateWorkoutAction(formData: FormData): Promise<void> {
  await requireBuilder();
  const workoutId = idField(formData, "workoutId");
  if (!workoutId) return;

  const name = textField(formData, "name").trim();
  await updateWorkout(workoutId, {
    name: name || undefined,
    focus: textField(formData, "focus"),
    estimatedMinutes: parseMinutesInput(textField(formData, "estimatedMinutes")),
  });
  refresh();
}

/**
 * The workout's general instructions — the free text at the top of the builder,
 * above the exercise list. Saved on blur like every other builder field.
 */
export async function updateInstructionsAction(formData: FormData): Promise<void> {
  await requireBuilder();
  const workoutId = idField(formData, "workoutId");
  if (!workoutId) return;
  await updateWorkout(workoutId, { instructions: textField(formData, "instructions") });
  refresh();
}

export async function archiveWorkoutAction(formData: FormData): Promise<void> {
  await requireBuilder();
  const workoutId = idField(formData, "workoutId");
  if (!workoutId) return;
  await archiveWorkout(workoutId);
  refresh();
}

/** Deep-copies the workout under "<name> (cópia)" and stays on the list. */
export async function duplicateWorkoutAction(formData: FormData): Promise<void> {
  await requireBuilder();
  const workoutId = idField(formData, "workoutId");
  if (!workoutId) return;
  const source = await findWorkout(workoutId);
  if (!source) return;

  const t = await getTranslations("Studio.workouts");
  await duplicateWorkout(workoutId, `${source.name} ${t("copySuffix")}`);
  refresh();
}

/**
 * Append an empty plain block. Blocks are the unit the builder works in — a
 * plain one is an exercise sequence, a superset or circuit is the same list
 * read a different way — so "new block" is how a coach starts a section.
 */
export async function addBlockAction(workoutId: string): Promise<void> {
  await requireBuilder();
  if (!workoutId) return;
  await addBlock(workoutId, { kind: "normal" });
  refresh();
}

/** The block's own name — "Aquecimento", "Alongamentos". Blank is fine. */
export async function setBlockLabelAction(
  workoutId: string,
  blockId: string,
  label: string,
): Promise<void> {
  await requireBuilder();
  if (!workoutId || !blockId) return;
  await updateBlock(blockId, { label });
  refresh();
}

/** Remove a block and, with it, the exercises inside it. */
export async function removeBlockAction(workoutId: string, blockId: string): Promise<void> {
  await requireBuilder();
  if (!workoutId || !blockId) return;
  await removeBlock(blockId);
  refresh();
}

export async function updateItemAction(formData: FormData): Promise<void> {
  await requireBuilder();
  const workoutId = idField(formData, "workoutId");
  const itemId = idField(formData, "itemId");
  if (!workoutId || !itemId) return;

  const mode = textField(formData, "measureMode");
  const duration = parseDurationInput(textField(formData, "durationText"));
  const reps =
    mode === "duration" ? "" : textField(formData, "reps");
  const seconds =
    mode === "duration" ? duration : mode === "reps" ? null : nullableIntField(formData, "seconds");

  await updateItem(itemId, {
    sets: intField(formData, "sets"),
    reps,
    seconds,
    tempo: textField(formData, "tempo"),
    restSeconds: intField(formData, "restSeconds"),
    rpe: textField(formData, "rpe"),
    notes: textField(formData, "notes"),
  });
  refresh();
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
  await requireBuilder();
  if (!workoutId || !blockId || !Array.isArray(itemIds)) return;
  await reorderItems(blockId, itemIds.map(String).filter(Boolean));
  refresh();
}

/** Switch a block between per-exercise sets and rounds of the whole list. */
export async function setBlockKindAction(
  workoutId: string,
  blockId: string,
  kind: BlockKind,
): Promise<void> {
  await requireBuilder();
  if (!workoutId || !blockId) return;
  // Leaving the circuit resets the round count: "3 rounds of sets of 3" is a
  // prescription nobody means, and it silently doubles the volume.
  await updateBlock(blockId, { kind, ...(kind === "normal" ? { rounds: 1 } : {}) });
  refresh();
}

/** Add an exercise from the picker. Returns nothing — the grid re-renders. */
export async function addExerciseAction(
  workoutId: string,
  blockId: string,
  exerciseId: string,
): Promise<void> {
  await requireBuilder();
  if (!workoutId || !blockId || !exerciseId) return;
  await addItem(blockId, { exerciseId });
  refresh();
}

export async function removeItemAction(formData: FormData): Promise<void> {
  await requireBuilder();
  const workoutId = idField(formData, "workoutId");
  const itemId = idField(formData, "itemId");
  if (!workoutId || !itemId) return;
  await removeItem(itemId);
  refresh();
}

export async function moveItemUpAction(formData: FormData): Promise<void> {
  await requireBuilder();
  const workoutId = idField(formData, "workoutId");
  const itemId = idField(formData, "itemId");
  if (!workoutId || !itemId) return;
  await moveItem(itemId, -1);
  refresh();
}

export async function moveItemDownAction(formData: FormData): Promise<void> {
  await requireBuilder();
  const workoutId = idField(formData, "workoutId");
  const itemId = idField(formData, "itemId");
  if (!workoutId || !itemId) return;
  await moveItem(itemId, 1);
  refresh();
}

/* ------------------------------------------------------- grouping and order */

/**
 * Add an exercise with no block named — the toolbar's "Add exercise", as
 * opposed to a block's own picker. It lands at the end of the workout, in the
 * last plain block or in a new one, never inside somebody's circuit.
 */
export async function appendExerciseAction(
  workoutId: string,
  exerciseId: string,
): Promise<void> {
  await requireBuilder();
  if (!workoutId || !exerciseId) return;
  await addItem(await tailBlockId(workoutId), { exerciseId });
  refresh();
}

/** Insert a rest row at the end of the workout, same rule as above. */
export async function addRestAction(workoutId: string): Promise<void> {
  await requireBuilder();
  if (!workoutId) return;
  await addItem(await tailBlockId(workoutId), { kind: "rest", seconds: 60 });
  refresh();
}

/**
 * Combine the selected exercises into a super set (two exercises back to back)
 * or a circuit (three or more, repeated for a number of rounds). The new block
 * takes the place the selection held. Fewer than two selected is a no-op —
 * `groupItems` refuses it.
 */
export async function groupItemsAction(
  workoutId: string,
  itemIds: string[],
  kind: "superset" | "circuit",
  rounds?: number,
): Promise<void> {
  await requireBuilder();
  if (!workoutId || !Array.isArray(itemIds)) return;
  await groupItems(workoutId, itemIds.map(String).filter(Boolean), kind, rounds);
  refresh();
}

/**
 * Move a whole block one slot up or down, plain blocks included. Typed rather
 * than form-encoded for the same reason as `reorderItemsAction`: it is fired
 * from a transition after the block has already moved on screen.
 */
export async function moveBlockAction(
  workoutId: string,
  blockId: string,
  direction: -1 | 1,
): Promise<void> {
  await requireBuilder();
  if (!workoutId || !blockId) return;
  await moveBlock(blockId, direction);
  refresh();
}

/** How many times a circuit's list is repeated. */
export async function setRoundsAction(
  workoutId: string,
  blockId: string,
  rounds: number,
): Promise<void> {
  await requireBuilder();
  if (!workoutId || !blockId || !Number.isFinite(rounds)) return;
  await updateBlock(blockId, { rounds });
  refresh();
}
