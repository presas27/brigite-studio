"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SetLog } from "@/lib/studio/types";

/**
 * The numbers for one logged set. There is no dedicated "distance" column in
 * `SetLog` — distance is a count (metres), not a duration, so it shares the
 * `reps` field. `time`/`hold` share `seconds`, since both are durations.
 * `tracking` alone decides which of these the player shows and writes.
 */
export type SetValue = {
  reps: number | null;
  loadKg: number | null;
  seconds: number | null;
  rpe: number | null;
};

export const EMPTY_SET: SetValue = { reps: null, loadKg: null, seconds: null, rpe: null };

export function isFullyEmpty(value: SetValue): boolean {
  return value.reps == null && value.loadKg == null && value.seconds == null && value.rpe == null;
}

export type LogSetInput = {
  assignmentId: string;
  itemId: string;
  exerciseId: string;
  setIndex: number;
  reps: number | null;
  loadKg: number | null;
  seconds: number | null;
  rpe: number | null;
};

export type UnlogSetInput = { assignmentId: string; itemId: string; setIndex: number };

/** Every set slot for this assignment, keyed `itemId:setIndex`. */
type Entries = Record<string, SetValue>;

/**
 * `entries` plus which of those keys the server has not confirmed — the offline
 * queue. Kept as one object so a write to either always lands in local storage
 * together, atomically.
 */
type SessionState = { entries: Entries; pending: Set<string> };

export type SyncStatus = "syncing" | "queued" | "synced" | null;

/**
 * The session's log, and everything that keeps it safe.
 *
 * Every keystroke updates local state and local storage synchronously, then
 * asks the server to persist it in the background. A dropped connection leaves
 * the write in `pending`; an `online` event or the retry interval tries again.
 * Nothing the client typed is ever only in memory — a gym basement with no
 * signal is the normal case, not the edge case.
 *
 * It also holds the screen wake lock, because a phone that sleeps mid-set is
 * the same class of problem: the session is a thing that happens over 45
 * minutes, not a form that is filled in one go.
 */
export function useSessionLog({
  assignmentId,
  initialLogs,
  exerciseByItem,
  logSetAction,
  unlogSetAction,
}: {
  assignmentId: string;
  initialLogs: SetLog[];
  exerciseByItem: Record<string, string>;
  logSetAction: (input: LogSetInput) => Promise<void>;
  unlogSetAction: (input: UnlogSetInput) => Promise<void>;
}) {
  const storageKey = `studio:session:${assignmentId}`;

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
  const [hydrated, setHydrated] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  // Mirrors `session` so callbacks scheduled by earlier renders (the debounced
  // syncs, the retry interval) read the latest values instead of the closure
  // they were created in. Every `setSession` below assigns this ref in the same
  // handler, which is why it is never written during render.
  const sessionRef = useRef(session);
  const timersRef = useRef<Record<string, number | undefined>>({});
  const prevPendingSize = useRef(0);

  const persistLocal = useCallback(
    (next: SessionState) => {
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
    },
    [storageKey],
  );

  const syncEntry = useCallback(
    async (key: string) => {
      const [itemId, setIndexRaw] = key.split(":");
      const exerciseId = exerciseByItem[itemId];
      const value = sessionRef.current.entries[key];
      if (!exerciseId || !value) return;
      const setIndex = Number(setIndexRaw);

      try {
        if (isFullyEmpty(value)) {
          await unlogSetAction({ assignmentId, itemId, setIndex });
        } else {
          await logSetAction({
            assignmentId,
            itemId,
            exerciseId,
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
        // listener and the retry interval below will come back to it.
      }
    },
    [assignmentId, exerciseByItem, logSetAction, unlogSetAction, persistLocal],
  );

  const flushPending = useCallback(() => {
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    for (const key of sessionRef.current.pending) void syncEntry(key);
  }, [syncEntry]);

  const updateSet = useCallback(
    (itemId: string, setIndex: number, value: SetValue) => {
      const key = `${itemId}:${setIndex}`;
      const entries = { ...sessionRef.current.entries, [key]: value };
      const pending = new Set(sessionRef.current.pending).add(key);
      const next = { entries, pending };
      sessionRef.current = next;
      persistLocal(next);
      setSession(next);

      clearTimeout(timersRef.current[key]);
      timersRef.current[key] = window.setTimeout(() => void syncEntry(key), 500);
    },
    [persistLocal, syncEntry],
  );

  /** Push a set to the server now, without waiting out the debounce. */
  const flushSet = useCallback(
    (itemId: string, setIndex: number) => {
      const key = `${itemId}:${setIndex}`;
      clearTimeout(timersRef.current[key]);
      if (sessionRef.current.pending.has(key)) void syncEntry(key);
    },
    [syncEntry],
  );

  /** Forget the local copy — used when the session is discarded on the server. */
  const clearLocal = useCallback(() => {
    for (const timer of Object.values(timersRef.current)) clearTimeout(timer);
    timersRef.current = {};
    const next = { entries: {}, pending: new Set<string>() };
    sessionRef.current = next;
    setSession(next);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        // Same as `persistLocal`: nothing here is load-bearing.
      }
    }
  }, [storageKey]);

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
    setHydrated(true);
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
    // Mount-only: this rehydrates local storage and starts the retry loop once,
    // not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      } catch {
        // Hidden tab, battery saver, unsupported context — the log itself does
        // not depend on the screen staying on.
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

  const syncStatus: SyncStatus = useMemo(
    () => (session.pending.size > 0 ? (online ? "syncing" : "queued") : justSynced ? "synced" : null),
    [session.pending.size, online, justSynced],
  );

  const doneCount = useMemo(
    () => Object.values(session.entries).filter((value) => !isFullyEmpty(value)).length,
    [session.entries],
  );

  return {
    entries: session.entries,
    /** True once local storage has been folded in — see `SessionPlayer`. */
    hydrated,
    updateSet,
    flushSet,
    clearLocal,
    syncStatus,
    doneCount,
  };
}
