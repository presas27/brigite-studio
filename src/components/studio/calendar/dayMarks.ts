import type { IconName } from "@/components/studio/coach/icons";

export const DAY_MARK_KINDS = [
  "workout",
  "cardio",
  "meal",
  "water",
  "appointment",
  "photos",
  "bodyStats",
  "sleep",
] as const;

export type DayMarkKind = (typeof DAY_MARK_KINDS)[number];

export type DayMark = {
  kind: DayMarkKind;
  icon: IconName;
  /** Solid disc behind the glyph — the colour is the reminder, the icon is the name. */
  swatch: string;
};

/**
 * Things an aluna can pin on a day. Not logs: a coloured mark on the cell,
 * nothing to fill in. Colours follow the usual training-app speed-dial so
 * a month of mixed pins still reads at a glance.
 */
export const DAY_MARKS: DayMark[] = [
  { kind: "workout", icon: "squat", swatch: "bg-[#3b82f6]" },
  { kind: "cardio", icon: "flame", swatch: "bg-[#22c55e]" },
  { kind: "meal", icon: "library", swatch: "bg-[#f43f5e]" },
  { kind: "water", icon: "clock", swatch: "bg-[#2b7fff]" },
  { kind: "appointment", icon: "phone", swatch: "bg-[#eab308]" },
  { kind: "photos", icon: "eye", swatch: "bg-[#fb923c]" },
  { kind: "bodyStats", icon: "ruler", swatch: "bg-[#f97316]" },
  { kind: "sleep", icon: "checkin", swatch: "bg-[#f59e0b]" },
];

export function markByKind(kind: DayMarkKind): DayMark {
  return DAY_MARKS.find((mark) => mark.kind === kind) ?? DAY_MARKS[0];
}

export function isDayMarkKind(value: string): value is DayMarkKind {
  return (DAY_MARK_KINDS as readonly string[]).includes(value);
}
