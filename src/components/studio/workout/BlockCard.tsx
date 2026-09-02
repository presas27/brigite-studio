"use client";

import { useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  removeBlockAction,
  setBlockKindAction,
  setBlockLabelAction,
  setRoundsAction,
} from "@/app/app/coach/treinos/actions";
import { Icon } from "@/components/studio/coach/icons";
import { Modal } from "@/components/studio/Modal";
import { buttonDanger, buttonGhost, buttonQuiet, surface } from "@/components/studio/theme";
import type { View } from "@/components/studio/ViewToggle";
import type { BlockKind, Exercise, WorkoutBlock } from "@/lib/studio/types";
import { cn } from "@/lib/utils";
import { ExerciseList } from "./ExerciseList";
import { ExercisePicker } from "./ExercisePicker";
import { smallField } from "./parts";

type DragProps = {
  draggingId: string | null;
  overId: string | null;
  onDragStartAction: (itemId: string, blockId: string) => void;
  onDragEndAction: () => void;
  onDragOverItemAction: (itemId: string) => void;
  onDropOnItemAction: (blockId: string, index: number) => void;
  onDropAtEndAction: (blockId: string) => void;
  onNudgeAction: (blockId: string, itemId: string, delta: -1 | 1) => void;
};

type Selection = {
  selected: Set<string>;
  onToggleAction: (itemId: string, checked: boolean) => void;
};

type Props = DragProps & {
  workoutId: string;
  block: WorkoutBlock;
  /** Whether another block sits above / below this one, for the move controls. */
  canMoveUp: boolean;
  canMoveDown: boolean;
  /** Move the whole block one slot, exercises and all. */
  onMoveAction: (delta: -1 | 1) => void;
  exercises: Exercise[];
  selection: Selection;
  view: View;
};

/** The three kinds a coach chooses between. `interval` exists in older data. */
const KINDS: readonly BlockKind[] = ["normal", "superset", "circuit"];

/**
 * One block: its name and kind, move controls, round count when the whole list
 * repeats, then its exercises in whichever view the builder is in, then a picker
 * that adds straight into it.
 *
 * Every part of a workout is a block — a plain one is "three sets of this, then
 * three sets of that", a superset or circuit is the same list read a different
 * way — so this card is the only shape the builder has, and changing a section
 * from a sequence into a circuit is a change of `kind`, not a regrouping. That
 * is also what makes order editable at all: a block moves as one thing, and
 * before this the ungrouped exercises were not a block and could not move.
 */
export function BlockCard({
  workoutId,
  block,
  exercises,
  selection,
  view,
  draggingId,
  overId,
  onDragStartAction,
  onDragEndAction,
  onDragOverItemAction,
  onDropOnItemAction,
  onDropAtEndAction,
  onNudgeAction,
  canMoveUp,
  canMoveDown,
  onMoveAction,
}: Props) {
  const t = useTranslations("Studio.workouts");
  const common = useTranslations("Studio.common");
  const roundsRef = useRef<HTMLInputElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [, startTransition] = useTransition();

  // A superset is exercises back to back, each still logging its own sets, and a
  // plain block is one exercise at a time — both count sets per exercise. A
  // circuit is the whole list repeated, so the round count replaces them.
  const rounds = block.kind === "circuit" || block.kind === "interval";
  const kinds = KINDS.includes(block.kind) ? KINDS : [...KINDS, block.kind];

  function commitRounds() {
    const value = Number.parseInt(roundsRef.current?.value ?? "", 10);
    if (!Number.isFinite(value)) return;
    startTransition(async () => {
      await setRoundsAction(workoutId, block.id, Math.max(1, value));
    });
  }

  function commitKind(kind: BlockKind) {
    if (kind === block.kind) return;
    startTransition(async () => {
      await setBlockKindAction(workoutId, block.id, kind);
    });
  }

  function commitLabel(label: string) {
    if (label === block.label) return;
    startTransition(async () => {
      await setBlockLabelAction(workoutId, block.id, label);
    });
  }

  function remove() {
    startTransition(async () => {
      await removeBlockAction(workoutId, block.id);
    });
  }

  return (
    <section
      aria-label={block.label.trim() || t(`blockKind.${block.kind}`)}
      className={cn(surface, "space-y-3 p-3 sm:p-4")}
    >
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => onMoveAction(-1)}
            disabled={!canMoveUp}
            aria-label={t("moveBlockUp")}
            title={t("moveBlockUp")}
            className={cn(buttonQuiet, "px-1.5")}
          >
            <Icon name="chevron" className="h-4 w-4 -rotate-90" />
          </button>
          <button
            type="button"
            onClick={() => onMoveAction(1)}
            disabled={!canMoveDown}
            aria-label={t("moveBlockDown")}
            title={t("moveBlockDown")}
            className={cn(buttonQuiet, "px-1.5")}
          >
            <Icon name="chevron" className="h-4 w-4 rotate-90" />
          </button>
        </div>

        <input
          type="text"
          defaultValue={block.label}
          placeholder={t("blockLabelPlaceholder")}
          aria-label={t("blockLabelLabel")}
          onBlur={(event) => commitLabel(event.currentTarget.value)}
          className={cn(smallField, "w-40 sm:w-52")}
        />

        <select
          value={block.kind}
          aria-label={t("blockKindLabel")}
          onChange={(event) => commitKind(event.currentTarget.value as BlockKind)}
          className={cn(smallField, "w-auto")}
        >
          {kinds.map((kind) => (
            <option key={kind} value={kind}>
              {t(`blockKind.${kind}`)}
            </option>
          ))}
        </select>

        {rounds && (
          <label className="flex items-center gap-2 font-sans text-xs text-cream/55">
            <input
              ref={roundsRef}
              type="number"
              min={1}
              defaultValue={block.rounds}
              aria-label={t("roundsLabel")}
              onBlur={commitRounds}
              className={cn(smallField, "w-16 text-center")}
            />
            {t("roundsShort")}
          </label>
        )}

        <button
          type="button"
          onClick={() => (block.items.length > 0 ? setConfirmOpen(true) : remove())}
          aria-label={t("removeBlock")}
          title={t("removeBlock")}
          className={cn(buttonQuiet, "ml-auto")}
        >
          <Icon name="trash" className="h-4 w-4" />
        </button>
      </div>

      <div
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          onDropAtEndAction(block.id);
        }}
      >
        <ExerciseList
          workoutId={workoutId}
          rows={block.items.map((item) => ({ item, blockId: block.id }))}
          view={view}
          dense
          circuit={rounds}
          selectedIds={selection.selected}
          onToggleAction={selection.onToggleAction}
          draggingId={draggingId}
          overId={overId}
          onDragStartAction={onDragStartAction}
          onDragEndAction={onDragEndAction}
          onDragOverAction={onDragOverItemAction}
          onDropOnAction={onDropOnItemAction}
          onNudgeAction={onNudgeAction}
          footer={
            <ExercisePicker
              workoutId={workoutId}
              blockId={block.id}
              exercises={exercises}
              compact={view === "list"}
            />
          }
        />
      </div>

      <Modal
        open={confirmOpen}
        onCloseAction={() => setConfirmOpen(false)}
        title={t("removeBlock")}
        lead={t("removeBlockConfirmBody", { count: block.items.length })}
        width="24rem"
      >
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setConfirmOpen(false)}
            className={cn(buttonGhost, "px-4 py-2 text-sm")}
          >
            {common("cancel")}
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmOpen(false);
              remove();
            }}
            className={cn(buttonDanger, "px-4 py-2 text-sm")}
          >
            {t("delete")}
          </button>
        </div>
      </Modal>
    </section>
  );
}
