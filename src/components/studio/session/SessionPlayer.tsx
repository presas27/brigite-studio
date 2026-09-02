"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { buildSessionQueue, type SessionStep } from "@/lib/studio/session-queue";
import type { Assignment, AssignmentStatus, SetLog } from "@/lib/studio/types";
import { isRestItem } from "@/lib/studio/types";
import { EffortDial } from "./EffortDial";
import { ExerciseNoteButton } from "./ExerciseNoteButton";
import { ExerciseStage } from "./ExerciseStage";
import { ExitSheet } from "./ExitSheet";
import { RestScreen } from "./RestScreen";
import { SessionListModal } from "./SessionListModal";
import { SessionSummary } from "./SessionSummary";
import { StepProgress } from "./StepProgress";
import {
  EMPTY_SET,
  isFullyEmpty,
  useSessionLog,
  type LogSetInput,
  type UnlogSetInput,
} from "./useSessionLog";
import { Icon } from "../coach/icons";
import { buttonGhost, buttonPrimary, heading } from "../theme";
import { cn } from "@/lib/utils";

type Phase = "exercise" | "rest" | "effort" | "summary";

/**
 * The width every band of the player lines up on. Wide enough that a demo and
 * the numbers beside it both get real room on a laptop, capped so the two
 * columns never drift so far apart that reading one loses the other.
 */
const FRAME = "mx-auto w-full max-w-[76rem]";

/**
 * The session, one set at a time.
 *
 * Everything on screen answers "what am I doing right now" — the exercise, its
 * demo, the two numbers it wants back. The rest of the workout is one tap away
 * in the list, and the only other thing the screen offers is a way out that
 * never costs her the work she already did.
 *
 * The queue comes from `buildSessionQueue`, so supersets run round by round and
 * plain blocks run exercise by exercise, and neither this component nor the
 * screens under it have to know the difference.
 */
export function SessionPlayer({
  assignment,
  initialLogs,
  initialNotes,
  previousByExercise,
  logSetAction,
  unlogSetAction,
  saveNoteAction,
  beginAction,
  finishAction,
  skipAction,
  discardAction,
}: {
  assignment: Assignment;
  initialLogs: SetLog[];
  /** This session's notes, keyed by the snapshot `itemId` they belong to. */
  initialNotes: Record<string, string>;
  previousByExercise: Record<string, SetLog[]>;
  logSetAction: (input: LogSetInput) => Promise<void>;
  unlogSetAction: (input: UnlogSetInput) => Promise<void>;
  saveNoteAction: (input: {
    assignmentId: string;
    itemId: string;
    exerciseId: string;
    body: string;
  }) => Promise<void>;
  beginAction: () => Promise<void>;
  finishAction: (input: { effort: number | null; extraRestSeconds: number }) => Promise<void>;
  skipAction: () => Promise<void>;
  discardAction: () => Promise<void>;
}) {
  const t = useTranslations("Studio.session");
  const router = useRouter();

  const steps = useMemo(() => buildSessionQueue(assignment.snapshot), [assignment.snapshot]);
  const exerciseByItem = useMemo(() => {
    const byItem: Record<string, string> = {};
    for (const step of steps) byItem[step.itemId] = step.exerciseId;
    return byItem;
  }, [steps]);

  const { entries, hydrated, updateSet, flushSet, clearLocal, syncStatus } = useSessionLog({
    assignmentId: assignment.id,
    initialLogs,
    exerciseByItem,
    logSetAction,
    unlogSetAction,
  });

  // Notes are held here and written straight through, unlike the set logs: a
  // note is one deliberate save behind a dialog, not a value that changes on
  // every keystroke, so there is nothing to debounce and no queue to replay.
  // The optimistic update is what keeps the block on screen while the write
  // travels.
  const [notes, setNotes] = useState(initialNotes);
  const saveNote = useCallback(
    async (itemId: string, exerciseId: string, body: string) => {
      const trimmed = body.trim();
      setNotes((current) => {
        const next = { ...current };
        if (trimmed) next[itemId] = trimmed;
        else delete next[itemId];
        return next;
      });
      await saveNoteAction({ assignmentId: assignment.id, itemId, exerciseId, body: trimmed });
    },
    [assignment.id, saveNoteAction],
  );

  const isLogged = useCallback(
    (step: SessionStep) => {
      const value = entries[step.key];
      return value != null && !isFullyEmpty(value);
    },
    [entries],
  );

  // Resume where she stopped: the first set with nothing in it. There is no
  // "current step" stored anywhere — this derivation is the same answer, and it
  // survives a reload, a second device and a cleared tab without any state to
  // keep in sync.
  const [index, setIndex] = useState(() => {
    const firstOpen = steps.findIndex((step) => {
      const value = initialLogs.find((log) => `${log.itemId}:${log.setIndex}` === step.key);
      return value == null;
    });
    return firstOpen === -1 ? Math.max(0, steps.length - 1) : firstOpen;
  });
  const [phase, setPhase] = useState<Phase>(
    assignment.status === "scheduled" ? "exercise" : "summary",
  );
  const [enterAs, setEnterAs] = useState<"set" | "exercise">("exercise");
  const [restKey, setRestKey] = useState(0);
  const [restFrom, setRestFrom] = useState(0);
  const [effort, setEffort] = useState<number | null>(assignment.effort);
  const [finalStatus, setFinalStatus] = useState<AssignmentStatus>(assignment.status);
  const [listOpen, setListOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [finishFailed, setFinishFailed] = useState(false);
  const beganRef = useRef(false);

  // Rest she added on top of what Sara prescribed. Kept in local storage next
  // to the set log so a reload mid-session does not quietly forget it, and
  // sent once, when the session is submitted.
  const extraRestKey = `studio:session:${assignment.id}:extraRest`;
  const [extraRest, setExtraRest] = useState(() => {
    if (typeof window === "undefined") return 0;
    const stored = Number(window.localStorage.getItem(extraRestKey));
    return Number.isFinite(stored) && stored > 0 ? stored : 0;
  });
  const [reportedExtraRest, setReportedExtraRest] = useState(assignment.extraRestSeconds);
  // How long the session ran. Stamped when it closes rather than derived at
  // render time, so the summary shows the length of the workout and not the
  // length of time the tab has been open since.
  const [durationMinutes, setDurationMinutes] = useState<number | null>(() =>
    assignment.startedAt != null && assignment.doneAt != null
      ? Math.max(1, Math.round((assignment.doneAt - assignment.startedAt) / 60_000))
      : null,
  );

  function addExtraRest(seconds: number) {
    setExtraRest((current) => {
      const next = current + seconds;
      try {
        window.localStorage.setItem(extraRestKey, String(next));
      } catch {
        // Private browsing: the total still holds for this session, it just
        // cannot survive a reload. Nothing else depends on it.
      }
      return next;
    });
  }

  // The session counts as begun the moment the client actually opens it, not
  // when the coach assigned it.
  useEffect(() => {
    if (beganRef.current) return;
    if (assignment.status === "scheduled" && assignment.startedAt == null) {
      beganRef.current = true;
      void beginAction();
    }
  }, [assignment.status, assignment.startedAt, beginAction]);

  const step = steps[index];
  const doneCount = useMemo(() => steps.filter(isLogged).length, [steps, isLogged]);
  // Reps × load, over every set that had both. A plank contributes nothing to
  // it, which is correct: there is no weight on the bar to total up.
  const volumeKg = useMemo(
    () =>
      steps.reduce((total, candidate) => {
        const value = entries[candidate.key];
        if (candidate.tracking !== "reps" || value?.reps == null || value.loadKg == null) return total;
        return total + value.reps * value.loadKg;
      }, 0),
    [steps, entries],
  );
  // The session's own instructions, plus whatever Sara wrote for this one day.
  // Neither belongs to any single set, so they live in the list — reachable all
  // session instead of only on the first screen.
  const coachNote = [assignment.snapshot.instructions, assignment.note]
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n\n");

  // Sets logged offline live in local storage and only land in `entries` after
  // mount, so the resume point computed from the server's logs alone can be
  // behind. Correct it on the single render where the local copy arrives, and
  // never again — after that, where she is is her business.
  const [resumed, setResumed] = useState(false);
  if (hydrated && !resumed) {
    setResumed(true);
    const firstOpen = steps.findIndex((candidate) => !isLogged(candidate));
    if (firstOpen > 0) setIndex(firstOpen);
  }

  const goTo = useCallback(
    (target: number) => {
      const clamped = Math.max(0, Math.min(steps.length - 1, target));
      setEnterAs(steps[clamped]?.itemId === steps[index]?.itemId ? "set" : "exercise");
      setIndex(clamped);
      setPhase("exercise");
    },
    [index, steps],
  );

  function handleNext() {
    if (!step) return;
    flushSet(step.itemId, step.setIndex);

    if (index >= steps.length - 1) {
      setPhase("effort");
      return;
    }
    if (step.restSeconds > 0) {
      setRestFrom(index);
      setRestKey((key) => key + 1);
      setPhase("rest");
      return;
    }
    goTo(index + 1);
  }

  async function handleFinish(withEffort: number | null) {
    setFinishing(true);
    setFinishFailed(false);
    try {
      await finishAction({ effort: withEffort, extraRestSeconds: extraRest });
      setReportedExtraRest(extraRest);
      if (assignment.startedAt != null) {
        setDurationMinutes(Math.max(1, Math.round((Date.now() - assignment.startedAt) / 60_000)));
      }
      setFinalStatus("done");
      setPhase("summary");
    } catch {
      // Unlike a logged set, closing the session has no offline queue behind
      // it — so say so instead of leaving her looking at a button that did
      // nothing. Everything she typed is still safe.
      setFinishFailed(true);
    } finally {
      setFinishing(false);
    }
  }

  async function handleSkip() {
    await skipAction();
    setFinalStatus("skipped");
    setExitOpen(false);
    setPhase("summary");
  }

  async function handleDiscard() {
    await discardAction();
    clearLocal();
    setExtraRest(0);
    try {
      window.localStorage.removeItem(extraRestKey);
    } catch {
      // See `addExtraRest`.
    }
    setExitOpen(false);
    router.push("/app/aluno");
  }

  if (steps.length === 0) {
    return (
      <Shell>
        <Centred>
          <div className="mx-auto max-w-md space-y-4 text-center">
            <h1 className={cn(heading, "text-2xl")}>{assignment.snapshot.name}</h1>
            <p className="text-sm text-cream/60">{t("emptyWorkout")}</p>
            <button type="button" onClick={() => router.push("/app/aluno")} className={buttonPrimary}>
              {t("backToApp")}
            </button>
          </div>
        </Centred>
      </Shell>
    );
  }

  if (phase === "summary") {
    return (
      <Shell>
        <Centred>
          <SessionSummary
            name={assignment.snapshot.name}
            status={finalStatus}
            doneCount={doneCount}
            totalCount={steps.length}
            effort={effort}
            extraRestSeconds={reportedExtraRest}
            durationMinutes={durationMinutes}
            volumeKg={volumeKg}
          />
        </Centred>
      </Shell>
    );
  }

  // Every phase's controls are defined once and rendered twice: inside the
  // composition on a wide screen, and in the bar pinned to the bottom of a
  // phone, where a thumb can reach them without looking.
  // Going back is rare and going on is the whole session, so on a phone they
  // are not two halves of a row: back is an icon, on is the button.
  const stepActions = (
    <>
      <button
        type="button"
        onClick={() => goTo(index - 1)}
        disabled={index === 0}
        aria-label={t("previousStep")}
        className={cn(
          buttonGhost,
          // `h-14` pins the height explicitly: on mobile this button is icon-only
          // (the label is `md:inline`), so with no text line-box to size against
          // it would otherwise render shorter than "Next" beside it.
          "h-14 shrink-0 rounded-[0.9rem] px-5 text-base md:h-auto md:max-w-[13rem] md:flex-1 md:px-6 md:py-3.5",
        )}
      >
        <Icon name="chevron" className="h-4 w-4 rotate-180" />
        <span className="hidden md:inline">{t("previousStep")}</span>
      </button>
      <button
        type="button"
        onClick={handleNext}
        className={cn(
          buttonPrimary,
          "h-14 flex-1 rounded-[0.9rem] text-base md:h-auto md:max-w-[13rem] md:py-3.5",
        )}
      >
        {index >= steps.length - 1 ? t("lastSet") : t("nextStep")}
        <Icon name="chevron" className="h-4 w-4" />
      </button>
    </>
  );

  const restActions = (
    <button
      type="button"
      onClick={() => goTo(restFrom + 1)}
      className={cn(buttonPrimary, "flex-1 py-3.5 text-base md:max-w-[13rem]")}
    >
      {t("skipRest")}
      <Icon name="chevron" className="h-4 w-4" />
    </button>
  );

  const effortActions = (
    <>
      <button
        type="button"
        onClick={() => setPhase("exercise")}
        className={cn(buttonGhost, "flex-1 py-3.5 text-base md:max-w-[13rem]")}
      >
        <Icon name="chevron" className="h-4 w-4 rotate-180" />
        {t("goBack")}
      </button>
      <button
        type="button"
        disabled={finishing}
        onClick={() => void handleFinish(effort)}
        className={cn(buttonPrimary, "flex-1 py-3.5 text-base md:max-w-[13rem]")}
      >
        {finishing ? t("finishing") : t("finish")}
      </button>
    </>
  );

  return (
    <Shell>
      {/* Sticky, not fixed: the exercise name lives in this row on a phone and
          a long one wraps to a second line, so the band's height is not a
          number the content below it can be padded past — it has to take its
          own room in the flow. */}
      {/* The top inset is what keeps the close button and the exercise name
          clear of the clock and the battery when the app runs installed. */}
      <header className="sticky top-0 z-20 bg-background/90 px-[max(1.25rem,env(safe-area-inset-left))] pt-[calc(1rem+env(safe-area-inset-top))] pb-3 backdrop-blur-sm md:px-8 lg:px-10">
        <div
          className={cn(
            FRAME,
            "flex items-start justify-end gap-4 md:items-center md:justify-start",
          )}
        >
          {/* The exercise, on the line with the way out of it. A phone has no
              room for a title band of its own — the stage's own `h1` is
              `md:block` for exactly this reason — and the name is what the
              screen is about, so it takes this row's spare width and wraps
              inside it rather than running under the close button. */}
          {phase === "exercise" && step && !isRestItem(step.item) && (
            <h1 className={cn(heading, "min-w-0 flex-1 text-[1.5rem] leading-[1.1] md:hidden")}>
              {step.item.exerciseName}
            </h1>
          )}

          {syncStatus && (
            <span className="mr-auto flex shrink-0 items-center gap-1.5 font-sans text-xs text-cream/50 md:order-2 md:mr-0">
              <span
                aria-hidden
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  syncStatus === "synced" ? "bg-accent-ink" : "animate-pulse bg-butter",
                )}
              />
              {syncStatus === "queued" && t("offlineShort")}
            </span>
          )}

          <button
            type="button"
            onClick={() => setExitOpen(true)}
            aria-label={t("stopSession")}
            className="-m-2 order-3 shrink-0 p-2 text-cream/55 transition-colors hover:text-cream md:order-1"
          >
            <Icon name="close" className="h-5 w-5" />
          </button>

          {/* The map of the session is the obvious thing to press when you want
              to see the map of the session — so the bar opens the list, and
              there is no separate control competing with it. On a phone this
              lives in the bottom panel instead, where her thumb already is. */}
          <button
            type="button"
            onClick={() => setListOpen(true)}
            aria-label={t("openList")}
            className="hidden min-w-0 flex-1 rounded-[4px] py-1 transition-opacity hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-ink md:order-2 md:block"
          >
            <StepProgress steps={steps} currentIndex={index} isLogged={isLogged} />
          </button>

          <span className="hidden shrink-0 font-sans text-xs tabular-nums text-cream/50 md:order-3 md:block">
            {index + 1}/{steps.length}
          </span>
        </div>
      </header>

      <div
        className={cn(
          "flex flex-1 flex-col px-5 md:px-8 md:pb-12 lg:px-10",
          // Room for whichever bar is pinned to the bottom of a phone: the
          // exercise panel (numbers or clock — they come out the same height,
          // both being one row of controls under the fields) or the slimmer
          // rest/effort bar. A reserve much bigger than the bar it clears
          // reads as the screen being shoved upwards, so it is measured, not
          // padded generously.
          phase === "exercise" ? "pb-[15rem]" : "pb-[7.5rem]",
        )}
      >
        <main
          className={cn(
            FRAME,
            "flex flex-1 flex-col py-3",
            phase === "exercise" ? "md:justify-center" : "justify-center",
          )}
        >
          {phase === "exercise" && step && isRestItem(step.item) && (
            <RestScreen
              key={step.key}
              seconds={step.item.seconds ?? 60}
              next={steps[index + 1] ?? null}
              nextIsNewExercise
              onDone={() => {
                if (index >= steps.length - 1) setPhase("effort");
                else goTo(index + 1);
              }}
              onExtend={addExtraRest}
              actions={
                <button
                  type="button"
                  onClick={() => {
                    if (index >= steps.length - 1) setPhase("effort");
                    else goTo(index + 1);
                  }}
                  className={buttonGhost}
                >
                  {t("skipRest")}
                </button>
              }
            />
          )}

          {phase === "exercise" && step && !isRestItem(step.item) && (
            <ExerciseStage
              step={step}
              enterAs={enterAs}
              value={entries[step.key] ?? EMPTY_SET}
              previous={previousByExercise[step.exerciseId]?.find(
                (log) => log.setIndex === step.setIndex,
              )}
              actions={stepActions}
              progress={
                <div className="flex items-center gap-3">
                  <StepProgress
                    variant="line"
                    steps={steps}
                    currentIndex={index}
                    isLogged={isLogged}
                  />
                  <span className="shrink-0 font-sans text-xs tabular-nums text-cream/45">
                    {index + 1}/{steps.length}
                  </span>
                </div>
              }
              onOpenList={() => setListOpen(true)}
              note={
                <ExerciseNoteButton
                  exerciseName={step.item.exerciseName}
                  note={notes[step.itemId] ?? ""}
                  onSaveAction={(body) => saveNote(step.itemId, step.exerciseId, body)}
                />
              }
              onChange={(value) => updateSet(step.itemId, step.setIndex, value)}
            />
          )}

          {phase === "rest" && (
            <RestScreen
              key={restKey}
              seconds={steps[restFrom]?.restSeconds ?? 60}
              next={steps[restFrom + 1] ?? null}
              nextIsNewExercise={steps[restFrom]?.changesExercise ?? false}
              onDone={() => goTo(restFrom + 1)}
              onExtend={addExtraRest}
              actions={restActions}
            />
          )}

          {phase === "effort" && (
            <div className="mx-auto flex w-full max-w-md flex-col gap-6">
              <div className="space-y-1 text-center">
                <h1 className={cn(heading, "text-[1.75rem] lg:text-[2.5rem]")}>{t("effortTitle")}</h1>
                <p className="text-sm text-cream/55">
                  {t("doneSets", { done: doneCount, total: steps.length })}
                </p>
              </div>
              <EffortDial value={effort} onChange={setEffort} />
              {finishFailed && (
                <p role="alert" className="text-center text-sm text-silk">
                  {t("saveFailed")}
                </p>
              )}
              <div className="hidden items-center justify-center gap-3 md:flex">{effortActions}</div>
            </div>
          )}
        </main>
      </div>

      {/* Rest and effort keep a bar pinned to the bottom of a phone; the
          exercise screen has its own panel down there and needs none. On a wide
          screen every phase carries its controls inside its own composition. */}
      {phase !== "exercise" && (
        <footer className="fixed inset-x-0 bottom-0 z-20 bg-background/90 px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-sm md:hidden">
          <div className={cn(FRAME, "flex items-center gap-3")}>
            {phase === "rest" && restActions}
            {phase === "effort" && effortActions}
          </div>
        </footer>
      )}

      <SessionListModal
        open={listOpen}
        onCloseAction={() => setListOpen(false)}
        steps={steps}
        currentIndex={index}
        isLogged={isLogged}
        onJump={goTo}
        title={assignment.snapshot.name}
        note={coachNote}
      />

      <ExitSheet
        open={exitOpen}
        onCloseAction={() => setExitOpen(false)}
        doneCount={doneCount}
        totalCount={steps.length}
        onSubmit={() => {
          setExitOpen(false);
          setPhase("effort");
        }}
        onLeave={() => router.push("/app/aluno")}
        onDiscard={handleDiscard}
        onSkip={handleSkip}
      />
    </Shell>
  );
}

/**
 * The player's own canvas. `studio` is what anchors the app's light palette in
 * `globals.css`, and this route deliberately renders outside the console shell
 * that usually provides it.
 */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="studio relative flex min-h-dvh flex-col bg-background text-foreground">
      {children}
    </div>
  );
}

/** Centres a single card on the canvas — the summary and the empty state. */
function Centred({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 items-center justify-center px-5 py-10">{children}</div>;
}
