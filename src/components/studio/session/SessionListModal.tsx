"use client";

import { useTranslations } from "next-intl";
import type { SessionStep } from "@/lib/studio/session-queue";
import { isRestItem } from "@/lib/studio/types";
import { Modal } from "../Modal";
import { Icon } from "../coach/icons";
import { eyebrow } from "../theme";
import { cn } from "@/lib/utils";
import { prescriptionOf } from "./prescription";

type Row = {
  itemId: string;
  name: string;
  /** Every step of this exercise, in the order the session runs them. */
  indexes: number[];
  done: number;
  /** "8 reps · rest 60s" — the set count is the badge beside it. */
  detail: string;
  current: boolean;
  /** A rest the coach placed between exercises: a pause in the list, not a thing to log. */
  rest: boolean;
};

/**
 * The session as a list — the map you check between sets, not the thing you
 * work from. Blocks in order, one row per exercise, and a tap takes the player
 * to the first set of it still unlogged.
 */
export function SessionListModal({
  open,
  onCloseAction,
  steps,
  currentIndex,
  isLogged,
  onJump,
  title,
  note,
}: {
  open: boolean;
  onCloseAction: () => void;
  steps: SessionStep[];
  currentIndex: number;
  isLogged: (step: SessionStep) => boolean;
  onJump: (index: number) => void;
  title: string;
  /** Sara's note for the session, shown above the list. */
  note: string;
}) {
  const t = useTranslations("Studio.session");
  const common = useTranslations("Studio.common");
  const workoutsT = useTranslations("Studio.workouts");

  const labels = { reps: common("reps"), meters: t("metersShort"), sets: common("sets") };
  const rest = common("rest").toLowerCase();
  const blocks: { id: string; label: string; kind: string; rows: Row[] }[] = [];
  steps.forEach((step, index) => {
    let block = blocks.find((entry) => entry.id === step.blockId);
    if (!block) {
      block = { id: step.blockId, label: step.blockLabel, kind: step.blockKind, rows: [] };
      blocks.push(block);
    }
    let row = block.rows.find((entry) => entry.itemId === step.itemId);
    if (!row) {
      row = {
        itemId: step.itemId,
        name: step.item.exerciseName,
        indexes: [],
        done: 0,
        detail: isRestItem(step.item)
          ? `${step.item.seconds ?? 0}s`
          : [
              prescriptionOf(step, labels),
              step.item.restSeconds > 0 ? `${rest} ${step.item.restSeconds}s` : null,
            ]
              .filter(Boolean)
              .join(" · "),
        current: false,
        rest: isRestItem(step.item),
      };
      block.rows.push(row);
    }
    row.indexes.push(index);
    if (isLogged(step)) row.done += 1;
    if (index === currentIndex) row.current = true;
  });

  return (
    <Modal open={open} onCloseAction={onCloseAction} title={title} width="30rem">
      <div className="space-y-5">
        {note && (
          <div className="rounded-[1rem] bg-cream/5 p-3.5">
            <p className={eyebrow}>{t("coachNote")}</p>
            <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-cream/80">{note}</p>
          </div>
        )}

        {blocks.map((block) => (
          <section key={block.id} className="space-y-2">
            <p className={eyebrow}>
              {block.label || workoutsT(`blockKind.${block.kind}`)}
            </p>
            <ul className="space-y-1">
              {block.rows.map((row) => {
                const target = row.indexes.find((index) => !isLogged(steps[index])) ?? row.indexes[0];
                const complete = row.done === row.indexes.length;
                return (
                  <li key={row.itemId}>
                    <button
                      type="button"
                      onClick={() => {
                        onJump(target);
                        onCloseAction();
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-[0.85rem] px-3 text-left transition-colors",
                        row.rest ? "py-1.5" : "py-2.5",
                        row.current ? "bg-caramel/15 ring-1 ring-caramel/30" : "hover:bg-cream/5",
                      )}
                    >
                      {row.rest ? (
                        <>
                          <span
                            aria-hidden
                            className="grid h-6 w-6 shrink-0 place-items-center text-cream/40"
                          >
                            <Icon name="clock" className="h-3.5 w-3.5" />
                          </span>
                          <span className="min-w-0 flex-1 truncate font-sans text-xs text-cream/50">
                            {row.name} · {row.detail}
                          </span>
                        </>
                      ) : (
                        <>
                          <span
                            aria-hidden
                            className={cn(
                              "grid h-6 w-6 shrink-0 place-items-center rounded-full font-sans text-[0.65rem] font-semibold tabular-nums",
                              complete
                                ? "bg-caramel/25 text-accent-ink"
                                : "bg-cream/5 text-cream/55 ring-1 ring-cream/10",
                            )}
                          >
                            {complete ? <Icon name="check" className="h-3 w-3" /> : row.indexes.length}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-sans text-sm text-cream">{row.name}</span>
                            {row.detail && (
                              <span className="block font-sans text-xs text-cream/50">{row.detail}</span>
                            )}
                          </span>
                          <span className="shrink-0 font-sans text-xs tabular-nums text-cream/50">
                            {row.done}/{row.indexes.length}
                          </span>
                        </>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  );
}
