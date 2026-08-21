import type { BlockKind, Tracking, WorkoutItem, WorkoutSnapshot } from "./types";

/**
 * One step of a session: a single set of a single exercise, in the order it is
 * actually performed. The player walks this list and nothing else — every
 * "where am I" question in the UI is answered by an index into it.
 *
 * `key` is `itemId:setIndex`, the same key `set_logs` is written under, so a
 * step lines up with its stored value and with the previous session's numbers
 * without any translation.
 */
export type SessionStep = {
  key: string;
  itemId: string;
  exerciseId: string;
  item: WorkoutItem;
  tracking: Tracking;
  /** 0-based, and the index this set is logged under. */
  setIndex: number;
  /** 1-based, for display. */
  setNumber: number;
  /** How many sets of this exercise the session holds in total. */
  setCount: number;
  blockId: string;
  blockLabel: string;
  blockKind: BlockKind;
  /** Round inside an interleaved block, 1-based. `null` in a normal block. */
  round: number | null;
  roundCount: number | null;
  /** Rest to run after this step. 0 means go straight to the next one. */
  restSeconds: number;
  /** True when the step after this one is a different exercise. */
  changesExercise: boolean;
  /** True when the step after this one belongs to a different block. */
  changesBlock: boolean;
};

/** A superset is performed round by round; a plain block, exercise by exercise. */
function isInterleaved(kind: BlockKind): boolean {
  return kind === "superset" || kind === "circuit" || kind === "interval";
}

/**
 * Flatten a workout snapshot into the order it is trained in.
 *
 * A normal block runs one exercise at a time: all four sets of the squat, then
 * all three of the row. An interleaved block runs a round at a time — A1, A2,
 * rest, A1, A2 — because that is what makes it a superset rather than two
 * exercises that happen to be adjacent. An item with fewer sets than the block
 * has rounds simply drops out of the later rounds.
 */
export function buildSessionQueue(snapshot: WorkoutSnapshot): SessionStep[] {
  const steps: SessionStep[] = [];

  const blocks = [...snapshot.blocks].sort((a, b) => a.position - b.position);
  for (const block of blocks) {
    const items = [...block.items].sort((a, b) => a.position - b.position);
    if (items.length === 0) continue;

    const label = block.label.trim();

    if (!isInterleaved(block.kind)) {
      for (const item of items) {
        for (let setIndex = 0; setIndex < Math.max(1, item.sets); setIndex += 1) {
          steps.push(makeStep({ block: { id: block.id, kind: block.kind, label }, item, setIndex, setCount: Math.max(1, item.sets), round: null, roundCount: null, restSeconds: item.restSeconds }));
        }
      }
      continue;
    }

    // `rounds` is the block's own count when the coach set one; otherwise the
    // longest item decides how many times round the loop goes.
    const roundCount = Math.max(
      block.rounds > 1 ? block.rounds : 0,
      ...items.map((item) => Math.max(1, item.sets)),
    );

    // Inside a block that already counts rounds, an item left at one set is not
    // an item done once — it is an item that inherits the block's count, which
    // is how the workout builder writes a three-round circuit. An item that
    // does state its own count keeps it and drops out of the rounds past it.
    const roundsFor = (item: WorkoutItem) =>
      block.rounds > 1 && item.sets <= 1 ? roundCount : Math.max(1, item.sets);

    for (let round = 0; round < roundCount; round += 1) {
      const inRound = items.filter((item) => round < roundsFor(item));
      inRound.forEach((item, indexInRound) => {
        const last = indexInRound === inRound.length - 1;
        steps.push(
          makeStep({
            block: { id: block.id, kind: block.kind, label },
            item,
            setIndex: round,
            setCount: roundsFor(item),
            round: round + 1,
            roundCount,
            // Inside a round you move straight to the next exercise unless the
            // coach asked for a pause; the real rest belongs to the round.
            restSeconds: last ? block.restSeconds : item.restSeconds,
          }),
        );
      });
    }
  }

  // Whether a step changes exercise or block is a property of the pair, so it
  // can only be filled in once the whole list exists. The last step of a
  // session never rests — the effort question comes straight after it.
  return steps.map((step, index) => {
    const next = steps[index + 1];
    return {
      ...step,
      changesExercise: next != null && next.itemId !== step.itemId,
      changesBlock: next != null && next.blockId !== step.blockId,
      restSeconds: next == null ? 0 : Math.max(0, step.restSeconds),
    };
  });
}

function makeStep(input: {
  block: { id: string; kind: BlockKind; label: string };
  item: WorkoutItem;
  setIndex: number;
  setCount: number;
  round: number | null;
  roundCount: number | null;
  restSeconds: number;
}): SessionStep {
  const { block, item, setIndex } = input;
  return {
    key: `${item.id}:${setIndex}`,
    itemId: item.id,
    exerciseId: item.exerciseId,
    item,
    tracking: item.tracking,
    setIndex,
    setNumber: setIndex + 1,
    setCount: input.setCount,
    blockId: block.id,
    blockLabel: block.label,
    blockKind: block.kind,
    round: input.round,
    roundCount: input.roundCount,
    restSeconds: input.restSeconds,
    changesExercise: false,
    changesBlock: false,
  };
}
