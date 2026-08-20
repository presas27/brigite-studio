"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { Assignment, SetLog } from "@/lib/studio/types";
import { SubmitButton } from "../SubmitButton";
import {
  chip,
  chipAccent,
  chipOnAccent,
  eyebrow,
  eyebrowOnAccent,
  heading,
  muted,
  surface,
  surfaceAccent,
} from "../theme";
import { cn } from "@/lib/utils";
import { ItemLogger } from "./ItemLogger";
import { isFullyEmpty, type SetValue } from "./SetRow";

type LogSetInput = {
  assignmentId: string;
  itemId: string;
  exerciseId: string;
  setIndex: number;
  reps: number | null;
  loadKg: number | null;
  seconds: number | null;
  rpe: number | null;
};

type UnlogSetInput = { assignmentId: string; itemId: string; setIndex: number };

/** Every set slot for this assignment, keyed `itemId:setIndex`. */
type Entries = Record<string, SetValue>;

/**
 * `entries` plus which of those keys have not yet been confirmed by the
 * server — the offline queue. Kept as one object so a write to either always
 * lands in local storage together, atomically.
 */
type SessionState = { entries: Entries; pending: Set<string> };

/**
 * The workout logger. Every keystroke updates local state and local storage
 * synchronously, then asks the server to persist it in the background. A
 * dropped connection leaves the write in `pending`; an `online` event or the
 * retry interval below tries again. Nothing the client typed is ever only in
 * memory.
 */
export function SessionLogger({
  assignment,
  initialLogs,
  previousByExercise,
  logSetAction,
  unlogSetAction,
  beginAction,
  finishAction,
  skipAction,
}: {
  assignment: Assignment;
  initialLogs: SetLog[];
  previousByExercise: Record<string, SetLog[]>;
  logSetAction: (input: LogSetInput) => Promise<void>;
  unlogSetAction: (input: UnlogSetInput) => Promise<void>;
  beginAction: () => Promise<void>;
  finishAction: (formData: FormData) => void | Promise<void>;
  skipAction: (formData: FormData) => void | Promise<void>;
}) {
  const t = useTranslations("Studio.session");
  const planT = useTranslations("Studio.plan");
  const workoutsT = useTranslations("Studio.workouts");

  const storageKey = `studio:session:${assignment.id}`;

  const itemsById = useMemo(() => {
    const byId: Record<string, { exerciseId: string }> = {};
    for (const block of assignment.snapshot.blocks) {
      for (const item of block.items) byId[item.id] = { exerciseId: item.exerciseId };
    }
    return byId;
  }, [assignment.snapshot.blocks]);

  const [session, setSession] = useState<SessionState>(() => {
    const entries: Entries = {};
    for (const log of initialLogs) {
      entries[`${log.itemId}:${log.setIndex}`] = {
        reps: log.reps,
        loadKg: log.loadKg,
        seconds: log.seconds,
        rpe: log.rpe,
      };
    }
    return { entries, pending: new Set() };
  });
  const [online, setOnline] = useState(true);
  const [justSynced, setJustSynced] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);

  // Mirrors `session` so callbacks scheduled by earlier renders (the debounced
  // syncs, the retry interval) read the latest values instead of the closure
  // they were created in. Every `setSession` below assigns this ref in the same
  // handler, which is why it is never written during render.
  const sessionRef = useRef(session);
  const timersRef = useRef<Record<string, number | undefined>>({});
  const beganRef = useRef(false);
  const prevPendingSize = useRef(0);

  function persistLocal(next: SessionState) {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        storageKey,
        JSON.stringify({ entries: next.entries, pending: Array.from(next.pending) }),
      );
    } catch {
      // Private browsing / full quota: this tab still holds the value in
      // memory, it just cannot survive a reload — the server sync below is
      // the fallback that matters.
    }
  }

  async function syncEntry(key: string) {
    const [itemId, setIndexRaw] = key.split(":");
    const item = itemsById[itemId];
    const value = sessionRef.current.entries[key];
    if (!item || !value) return;
    const setIndex = Number(setIndexRaw);

    try {
      if (isFullyEmpty(value)) {
        await unlogSetAction({ assignmentId: assignment.id, itemId, setIndex });
      } else {
        await logSetAction({
          assignmentId: assignment.id,
          itemId,
          exerciseId: item.exerciseId,
          setIndex,
          reps: value.reps,
          loadKg: value.loadKg,
          seconds: value.seconds,
          rpe: value.rpe,
        });
      }
      const pending = new Set(sessionRef.current.pending);
      pending.delete(key);
      const next = { entries: sessionRef.current.entries, pending };
      sessionRef.current = next;
      persistLocal(next);
      setSession(next);
    } catch {
      // Network failure or offline: the key stays in `pending`. The `online`
      // listener and the interval in the mount effect below will retry it.
    }
  }

  function flushPending() {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    for (const key of sessionRef.current.pending) void syncEntry(key);
  }

  function updateSet(itemId: string, setIndex: number, value: SetValue) {
    const key = `${itemId}:${setIndex}`;
    const entries = { ...sessionRef.current.entries, [key]: value };
    const pending = new Set(sessionRef.current.pending).add(key);
    const next = { entries, pending };
    sessionRef.current = next;
    persistLocal(next);
    setSession(next);

    clearTimeout(timersRef.current[key]);
    timersRef.current[key] = window.setTimeout(() => void syncEntry(key), 500);
  }

  // Rehydrate anything a previous, possibly offline, visit queued but never
  // delivered, then start trying to deliver whatever is still pending.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const raw = window.localStorage.getItem(storageKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { entries: Entries; pending: string[] };
        const next = {
          entries: { ...sessionRef.current.entries, ...parsed.entries },
          pending: new Set(parsed.pending ?? []),
        };
        sessionRef.current = next;
        setSession(next);
      } catch {
        // Corrupt local record — keep whatever the server already sent.
      }
    }

    setOnline(navigator.onLine);
    flushPending();

    function handleOnline() {
      setOnline(true);
      flushPending();
    }
    function handleOffline() {
      setOnline(false);
    }
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    const interval = setInterval(flushPending, 5000);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
    // Mount-only: this rehydrates local storage and starts the retry loop
    // once, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The session counts as begun the moment the client actually opens it, not
  // when the coach assigned it.
  useEffect(() => {
    if (beganRef.current) return;
    if (assignment.status === "scheduled" && assignment.startedAt == null) {
      beganRef.current = true;
      void beginAction();
    }
  }, [assignment.status, assignment.startedAt, beginAction]);

  useEffect(() => {
    const had = prevPendingSize.current;
    prevPendingSize.current = session.pending.size;
    if (had > 0 && session.pending.size === 0) {
      setJustSynced(true);
      const timeout = setTimeout(() => setJustSynced(false), 3000);
      return () => clearTimeout(timeout);
    }
  }, [session.pending.size]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    async function acquire() {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void lock.release();
          return;
        }
        sentinel = lock;
        setWakeLockActive(true);
        lock.addEventListener("release", () => setWakeLockActive(false));
      } catch {
        // Hidden tab, battery saver, unsupported context — the log itself
        // does not depend on the screen staying on.
      }
    }
    void acquire();

    function handleVisibility() {
      if (document.visibilityState === "visible" && !cancelled) void acquire();
    }
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      void sentinel?.release();
    };
  }, []);

  const totalSets = useMemo(
    () =>
      assignment.snapshot.blocks.reduce(
        (sum, block) => sum + block.items.reduce((itemSum, item) => itemSum + item.sets, 0),
        0,
      ),
    [assignment.snapshot.blocks],
  );
  const doneSets = useMemo(
    () => Object.values(session.entries).filter((value) => !isFullyEmpty(value)).length,
    [session.entries],
  );

  const syncStatus = session.pending.size > 0 ? (online ? "syncing" : "queued") : justSynced ? "synced" : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        {wakeLockActive && <span className={chipAccent}>{t("keepScreenOn")}</span>}
        {syncStatus && (
          <span className={cn(chip, "gap-1.5")}>
            <span
              aria-hidden
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                syncStatus === "synced" ? "bg-caramel" : "animate-pulse bg-butter",
              )}
            />
            {syncStatus === "queued" && t("offlineQueued")}
            {syncStatus === "syncing" && t("offlineSyncing")}
            {syncStatus === "synced" && t("offlineSynced")}
          </span>
        )}
      </div>

      {assignment.note && (
        <p className="rounded-[1rem] bg-cream/5 p-4 text-sm leading-relaxed text-cream/75">{assignment.note}</p>
      )}

      {assignment.snapshot.notes && (
        <div className={cn(surface, "p-4")}>
          <p className={eyebrow}>{t("coachNote")}</p>
          <p className="mt-1 text-sm leading-relaxed whitespace-pre-line text-cream/80">
            {assignment.snapshot.notes}
          </p>
        </div>
      )}

      <div className="space-y-6">
        {assignment.snapshot.blocks.map((block) => (
          <section key={block.id} className={cn(surface, "space-y-5 p-5")}>
            <p className={eyebrow}>
              {block.label || workoutsT(`blockKind.${block.kind}`)}
              {block.kind !== "normal" && block.rounds > 1
                ? ` · ${workoutsT("rounds", { count: block.rounds })}`
                : ""}
            </p>
            <div className="space-y-6">
              {block.items.map((item) => (
                <ItemLogger
                  key={item.id}
                  item={item}
                  assignmentId={assignment.id}
                  entries={session.entries}
                  previous={previousByExercise[item.exerciseId] ?? []}
                  onChangeSet={(setIndex, value) => updateSet(item.id, setIndex, value)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {assignment.status !== "scheduled" ? (
        // Finishing a session is the one moment worth celebrating in this screen,
        // so the summary — and only the summary — lands on gold.
        <div className={cn(surfaceAccent, "space-y-2 p-6 sm:p-8")}>
          <p className={eyebrowOnAccent}>{t("summary")}</p>
          <p className={cn(heading, "text-[2.25rem] sm:text-[2.75rem]")}>
            {t("doneSets", { done: doneSets, total: totalSets })}
          </p>
          <span className={chipOnAccent}>{planT(`status.${assignment.status}`)}</span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3 border-t border-cream/10 pt-6">
          <form action={finishAction}>
            <SubmitButton pendingLabel={t("finishing")}>{t("finish")}</SubmitButton>
          </form>
          <form action={skipAction}>
            <SubmitButton variant="ghost">{t("skip")}</SubmitButton>
          </form>
          <span className={muted}>{t("doneSets", { done: doneSets, total: totalSets })}</span>
        </div>
      )}
    </div>
  );
}
