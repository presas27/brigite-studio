"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { DAY_MARK_KINDS, isDayMarkKind, type DayMarkKind } from "./dayMarks";

const STORAGE_KEY = "brigite.dayMarks.v1";

type MarksByDay = Record<string, DayMarkKind[]>;

type Api = {
  date: string | null;
  open: boolean;
  marksOn: (date: string) => DayMarkKind[];
  openFor: (date: string) => void;
  close: () => void;
  toggle: (kind: DayMarkKind, day?: string) => void;
  remove: (date: string, kind: DayMarkKind) => void;
};

const DayMarksContext = createContext<Api | null>(null);

function readMarks(): MarksByDay {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const next: MarksByDay = {};
    for (const [date, kinds] of Object.entries(parsed as Record<string, unknown>)) {
      if (!Array.isArray(kinds)) continue;
      next[date] = kinds.filter((kind): kind is DayMarkKind => typeof kind === "string" && isDayMarkKind(kind));
    }
    return next;
  } catch {
    return {};
  }
}

function writeMarks(marks: MarksByDay) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(marks));
}

/**
 * Pins on the aluna's calendar. Local on purpose: these are reminders she
 * puts on a day, not coaching data, so they should not wait on a mutation.
 */
export function DayMarksProvider({ children }: { children: React.ReactNode }) {
  const [marks, setMarks] = useState<MarksByDay>({});
  const [date, setDate] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setMarks(readMarks());
  }, []);

  const persist = useCallback((next: MarksByDay) => {
    setMarks(next);
    writeMarks(next);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const openFor = useCallback((next: string) => {
    setDate(next);
    setOpen(true);
  }, []);

  const marksOn = useCallback(
    (day: string) => marks[day] ?? [],
    [marks],
  );

  const toggle = useCallback(
    (kind: DayMarkKind, dayArg?: string) => {
      const target = dayArg ?? date;
      if (!target) return;
      const current = marks[target] ?? [];
      const nextKinds = current.includes(kind)
        ? current.filter((item) => item !== kind)
        : [...current, kind].sort(
            (a, b) => DAY_MARK_KINDS.indexOf(a) - DAY_MARK_KINDS.indexOf(b),
          );
      const next = { ...marks };
      if (nextKinds.length === 0) delete next[target];
      else next[target] = nextKinds;
      persist(next);
    },
    [date, marks, persist],
  );

  const remove = useCallback(
    (day: string, kind: DayMarkKind) => {
      const current = marks[day] ?? [];
      const nextKinds = current.filter((item) => item !== kind);
      const next = { ...marks };
      if (nextKinds.length === 0) delete next[day];
      else next[day] = nextKinds;
      persist(next);
    },
    [marks, persist],
  );

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-day-add-menu]")) return;
      if (target.closest("[data-plan-cell]")) return;
      setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const value = useMemo<Api>(
    () => ({ date, open, marksOn, openFor, close, toggle, remove }),
    [date, open, marksOn, openFor, close, toggle, remove],
  );

  return <DayMarksContext.Provider value={value}>{children}</DayMarksContext.Provider>;
}

export function useDayMarks(): Api {
  const value = useContext(DayMarksContext);
  if (value) return value;
  return NOOP;
}

const NOOP: Api = {
  date: null,
  open: false,
  marksOn: () => [],
  openFor: () => {},
  close: () => {},
  toggle: () => {},
  remove: () => {},
};
