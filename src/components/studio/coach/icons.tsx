/**
 * The app's icon set. Hand-drawn 24×24 stroke paths rather than a dependency —
 * a couple of dozen glyphs is not worth a package, and drawing them here keeps them all
 * on the same grid, weight and cap style, which is what actually makes an icon
 * set look like a set.
 *
 * Everything inherits `currentColor` and a 1.6 stroke, sized by className.
 */

const PATHS: Record<string, string> = {
  overview: "M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5M9.5 20v-6h5v6",
  message: "M4 5h16v11H8l-4 3.5V5Z",
  leads: "M4 13h4.5l1.3 2.5h4.4L15.5 13H20M4.4 12.7 7 5.5h10l2.6 7.2M4 13v5.5h16V13",
  clients: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2.1.7 3.5 2.4 3.5 5.2",
  calendar: "M4 6h16v14H4V6ZM8 3v4M16 3v4M4 11h16M9 15h2M14 15h2",
  video: "M3 6h11v12H3V6Zm11 4 6-3.5v11L14 14",
  checkin: "M8 4h8v3H8V4Zm-2 3h12v14H6V7Zm3 6 2 2 4-4",
  library: "M4 4h5v16H4V4Zm7 0h4v16h-4V4Zm7 1.5 3 14.5",
  dumbbell: "M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10",
  bell: "M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9ZM10 18a2 2 0 0 0 4 0",
  // Warning triangle, for the error boundaries. Drawn on the same 24 grid with
  // the bang as two subpaths, so the stroke weight matches the rest of the set
  // instead of arriving as a filled glyph from somewhere else.
  alert: "M12 4.4 21 19.6H3L12 4.4ZM12 10v3.6M12 16.8h.01",
  // Printer: paper behind, tray in front, sheet coming out. Three strokes, so
  // it still reads as a printer at 16px instead of as a stack of rectangles.
  print:
    "M7 8V3.5h10V8M7 17.5H5.5A1.5 1.5 0 0 1 4 16V10a1.5 1.5 0 0 1 1.5-1.5h13A1.5 1.5 0 0 1 20 10v6a1.5 1.5 0 0 1-1.5 1.5H17M7 14h10v6.5H7V14Z",
  plus: "M12 5v14M5 12h14",
  check: "m5 12.6 4.6 4.6L19 8",
  chevron: "m9 6 6 6-6 6",
  arrowLeft: "M20 12H4.5M11 5l-7 7 7 7",
  grip: "M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01",
  trash: "M4 7h16M9.5 7V4h5v3M6.5 7l.9 13h9.2l.9-13M10 11v5.5M14 11v5.5",
  menu: "M4 7h16M4 12h16M4 17h16",
  // Sidebar-collapse toggle: a rounded panel split into a narrow rail (left)
  // and the main pane (right) — not a plain rectangle, and not a bare
  // chevron in a circle. The arrow lives in the wide pane, not the rail. Two
  // separate glyphs rather than one rotated 180°, because the rail always
  // stays on the left; only the arrow direction flips between the two states.
  panelLeftClose:
    "M6.5 4.5H17.5A3 3 0 0 1 20.5 7.5V16.5A3 3 0 0 1 17.5 19.5H6.5A3 3 0 0 1 3.5 16.5V7.5A3 3 0 0 1 6.5 4.5ZM9 4.5V19.5M16 9.5 13.5 12 16 14.5",
  panelLeftOpen:
    "M6.5 4.5H17.5A3 3 0 0 1 20.5 7.5V16.5A3 3 0 0 1 17.5 19.5H6.5A3 3 0 0 1 3.5 16.5V7.5A3 3 0 0 1 6.5 4.5ZM9 4.5V19.5M13.5 9.5 16 12 13.5 14.5",
  close: "M6 6l12 12M18 6 6 18",
  // The set's own transport, for an exercise measured in seconds. Drawn as
  // outlines like everything else here rather than the solid glyphs a media
  // player uses — a filled triangle in this set reads as a different family.
  play: "M9 6.2 17.8 12 9 17.8Z",
  pause: "M9.5 6v12M14.5 6v12",
  // Six teeth on a true 60° grid: flanks step out from a 5.9 root circle to an
  // 8.5 tip circle, hub at 2.7. Fewer, wider teeth survive the 16px rendering.
  settings:
    "M10.18 6.39L10.23 3.69A8.5 8.5 0 0 1 13.77 3.69L13.82 6.39A5.9 5.9 0 0 1 15.95 7.62L18.32 6.31A8.5 8.5 0 0 1 20.08 9.37L17.77 10.77A5.9 5.9 0 0 1 17.77 13.23L20.08 14.63A8.5 8.5 0 0 1 18.32 17.69L15.95 16.38A5.9 5.9 0 0 1 13.82 17.61L13.77 20.31A8.5 8.5 0 0 1 10.23 20.31L10.18 17.61A5.9 5.9 0 0 1 8.05 16.38L5.68 17.69A8.5 8.5 0 0 1 3.92 14.63L6.23 13.23A5.9 5.9 0 0 1 6.23 10.77L3.92 9.37A8.5 8.5 0 0 1 5.68 6.31L8.05 7.62A5.9 5.9 0 0 1 10.18 6.39ZM12 9.3a2.7 2.7 0 1 0 0 5.4a2.7 2.7 0 1 0 0 -5.4Z",
  chart: "M4 20V4M4 20h16M8 16v-5M12.5 16V8M17 16v-3",
  logout: "M14 20H6V4h8M11 12h9m0 0-3-3m3 3-3 3",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14ZM21 21l-4.35-4.35",
  grid: "M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z",
  list: "M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01",
  // Trend line with the arrow head drawn as two strokes off the same corner,
  // so it stays a corner at 16px instead of collapsing into a blob.
  trend: "M3.5 17.5 9.5 11.5 13 15 20.5 7.5M20.5 7.5H15.75M20.5 7.5V12.25",
  // A ruler on the diagonal — the tick marks are what stop it reading as a
  // plain rectangle at small sizes, so they are part of the glyph, not detail.
  ruler:
    "M3.1 15.3 15.3 3.1a1.4 1.4 0 0 1 2 0l3.6 3.6a1.4 1.4 0 0 1 0 2L8.7 20.9a1.4 1.4 0 0 1-2 0l-3.6-3.6a1.4 1.4 0 0 1 0-2ZM7 11.4l2.2 2.2M10.2 8.2l2.2 2.2M13.4 5l2.2 2.2",
  // History: a clock the arrow winds backwards. The near-full ring leaves a gap
  // on the left exactly wide enough for the arrow head, so the two read as one
  // gesture rather than a clock with a tick stuck to it.
  history:
    "M4.4 8.6A8.5 8.5 0 1 1 3.5 12.4M4.4 8.6 3.5 4.2M4.4 8.6 8.8 7.7M12 7.6V12l3.4 2",
  clock: "M12 7v5l3.5 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
  flame: "M12.5 3c.4 2.6-.6 4.2-1.9 5.4-1.5 1.4-2.6 2.8-2.6 4.6a5 5 0 0 0 10 0c0-3.4-2.3-5.9-5.5-10ZM12 20a2.4 2.4 0 0 0 2.4-2.4c0-1.4-2.4-3.1-2.4-3.1s-2.4 1.7-2.4 3.1A2.4 2.4 0 0 0 12 20Z",
};

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  className,
  strokeWidth = 1.6,
}: {
  name: IconName;
  className?: string;
  /** Bump it when the glyph sits next to heavy display type and 1.6 reads thin. */
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
