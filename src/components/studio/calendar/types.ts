import type { AssignmentStatus } from "@/lib/studio/types";

/**
 * One training session as the calendar needs it: who, what, and whether it
 * happened. Deliberately not the full `Assignment` — that carries the frozen
 * workout snapshot (every block, every set), and a month of those would cross
 * the server/client boundary for nothing.
 */
export type CalendarSession = {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  status: AssignmentStatus;
  workoutName: string;
  focus: string;
  /** Where this session opens. The coach lands on the aluna's week; the aluna lands in the session itself. */
  href: string;
};

export type CalendarView = "month" | "week";

/**
 * What each mark on the grid is *about*.
 *
 * The coach's calendar is a room full of people, so a cell names who; the
 * aluna's calendar is one person's month, so naming her seven times a week
 * would say nothing — there, a cell names the workout instead.
 */
export type CalendarSubject = "client" | "workout";

/** Sessions keyed by `YYYY-MM-DD`. Days with none are simply absent. */
export type SessionsByDay = Record<string, CalendarSession[]>;

/**
 * The colour language of the whole page, in one place: gold happened, red was
 * missed, neutral is still ahead. Every mark on the calendar — tape, dot,
 * agenda row — is one of these three, so a month reads as texture before it
 * reads as text.
 *
 * Missed also gets struck through. Red at brand strength is too dark to carry
 * a label on the ink canvas, so the strike does the work colour cannot, and
 * the status survives being read in greyscale.
 */
export const STATUS_MARK: Record<AssignmentStatus, string> = {
  done: "bg-accent-ink",
  scheduled: "bg-cream/30",
  skipped: "bg-silk",
};

export const STATUS_TAPE: Record<AssignmentStatus, string> = {
  done: "bg-caramel/12 text-cream/85",
  scheduled: "bg-cream/[0.06] text-cream/75",
  skipped: "bg-silk/[0.14] text-cream/55 line-through decoration-cream/35",
};

/** "Maria Silva" -> "Maria". A day cell has room for one word. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? name;
}
