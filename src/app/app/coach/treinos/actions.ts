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
  moveItem,
  removeBlock,
  removeItem,
  updateBlock,
  updateItem,
  updateWorkout,
} from "@/lib/studio/library";
import type { BlockKind } from "@/lib/studio/types";

/**
 * Server actions for the workout builder. Every export starts with
 * `requireCoach()`. Rows carry their ids as hidden fields rather than bound
 * closures, so one form can wire several buttons (save / move / remove) to
 * different actions via `formAction` while sharing the same hidden inputs.
 */

const LIST_PATH = "/app/coach/treinos";
const workoutPath = (workoutId: string) => `${LIST_PATH}/${workoutId}`;

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

/** Create a workout and jump straight into its editor. */
export async function createWorkoutAction(formData: FormData): Promise<void> {
  await requireCoach();
  const name = textField(formData, "name").trim();
  if (!name) return;

  const id = createWorkout({
    name,
    focus: textField(formData, "focus"),
    notes: textField(formData, "notes"),
  });
  revalidatePath(LIST_PATH);
  redirect(workoutPath(id));
}

export async function updateWorkoutAction(formData: FormData): Promise<void> {
  await requireCoach();
  const workoutId = idField(formData, "workoutId");
  if (!workoutId) return;

  const name = textField(formData, "name").trim();
  updateWorkout(workoutId, {
    name: name || undefined,
    focus: textField(formData, "focus"),
    notes: textField(formData, "notes"),
  });
  revalidatePath(workoutPath(workoutId));
}

export async function archiveWorkoutAction(formData: FormData): Promise<void> {
  await requireCoach();
  const workoutId = idField(formData, "workoutId");
  if (!workoutId) return;
  archiveWorkout(workoutId);
  revalidatePath(LIST_PATH);
}

/** Deep-copies the workout under "<name> (cópia)" and stays on the list. */
export async function duplicateWorkoutAction(formData: FormData): Promise<void> {
  await requireCoach();
  const workoutId = idField(formData, "workoutId");
  if (!workoutId) return;
  const source = findWorkout(workoutId);
  if (!source) return;

  const t = await getTranslations("Studio.workouts");
  duplicateWorkout(workoutId, `${source.name} ${t("copySuffix")}`);
  revalidatePath(LIST_PATH);
}

export async function addBlockAction(formData: FormData): Promise<void> {
  await requireCoach();
  const workoutId = idField(formData, "workoutId");
  if (!workoutId) return;

  addBlock(workoutId, {
    kind: textField(formData, "kind") as BlockKind,
    label: textField(formData, "label"),
    rounds: intField(formData, "rounds"),
    restSeconds: intField(formData, "restSeconds"),
  });
  revalidatePath(workoutPath(workoutId));
}

export async function updateBlockAction(formData: FormData): Promise<void> {
  await requireCoach();
  const workoutId = idField(formData, "workoutId");
  const blockId = idField(formData, "blockId");
  if (!workoutId || !blockId) return;

  updateBlock(blockId, {
    kind: textField(formData, "kind") as BlockKind,
    label: textField(formData, "label"),
    rounds: intField(formData, "rounds"),
    restSeconds: intField(formData, "restSeconds"),
  });
  revalidatePath(workoutPath(workoutId));
}

export async function removeBlockAction(formData: FormData): Promise<void> {
  await requireCoach();
  const workoutId = idField(formData, "workoutId");
  const blockId = idField(formData, "blockId");
  if (!workoutId || !blockId) return;
  removeBlock(blockId);
  revalidatePath(workoutPath(workoutId));
}

export async function addItemAction(formData: FormData): Promise<void> {
  await requireCoach();
  const workoutId = idField(formData, "workoutId");
  const blockId = idField(formData, "blockId");
  const exerciseId = idField(formData, "exerciseId");
  if (!workoutId || !blockId || !exerciseId) return;

  addItem(blockId, { exerciseId });
  revalidatePath(workoutPath(workoutId));
}

export async function updateItemAction(formData: FormData): Promise<void> {
  await requireCoach();
  const workoutId = idField(formData, "workoutId");
  const itemId = idField(formData, "itemId");
  if (!workoutId || !itemId) return;

  updateItem(itemId, {
    sets: intField(formData, "sets"),
    reps: textField(formData, "reps"),
    seconds: nullableIntField(formData, "seconds"),
    tempo: textField(formData, "tempo"),
    restSeconds: intField(formData, "restSeconds"),
    rpe: textField(formData, "rpe"),
    notes: textField(formData, "notes"),
  });
  revalidatePath(workoutPath(workoutId));
}

export async function removeItemAction(formData: FormData): Promise<void> {
  await requireCoach();
  const workoutId = idField(formData, "workoutId");
  const itemId = idField(formData, "itemId");
  if (!workoutId || !itemId) return;
  removeItem(itemId);
  revalidatePath(workoutPath(workoutId));
}

export async function moveItemUpAction(formData: FormData): Promise<void> {
  await requireCoach();
  const workoutId = idField(formData, "workoutId");
  const itemId = idField(formData, "itemId");
  if (!workoutId || !itemId) return;
  moveItem(itemId, -1);
  revalidatePath(workoutPath(workoutId));
}

export async function moveItemDownAction(formData: FormData): Promise<void> {
  await requireCoach();
  const workoutId = idField(formData, "workoutId");
  const itemId = idField(formData, "itemId");
  if (!workoutId || !itemId) return;
  moveItem(itemId, 1);
  revalidatePath(workoutPath(workoutId));
}
