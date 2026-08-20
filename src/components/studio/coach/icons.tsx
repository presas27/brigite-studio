/**
 * The app's icon set. Hand-drawn 24×24 stroke paths rather than a dependency —
 * fourteen glyphs is not worth a package, and drawing them here keeps them all
 * on the same grid, weight and cap style, which is what actually makes an icon
 * set look like a set.
 *
 * Everything inherits `currentColor` and a 1.6 stroke, sized by className.
 */

const PATHS: Record<string, string> = {
  overview: "M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5M9.5 20v-6h5v6",
  message: "M4 5h16v11H8l-4 3.5V5Z",
  clients: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 20c0-3.3 2.9-5.5 6.5-5.5s6.5 2.2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c2.1.7 3.5 2.4 3.5 5.2",
  calendar: "M4 6h16v14H4V6ZM8 3v4M16 3v4M4 11h16M9 15h2M14 15h2",
  video: "M3 6h11v12H3V6Zm11 4 6-3.5v11L14 14",
  checkin: "M8 4h8v3H8V4Zm-2 3h12v14H6V7Zm3 6 2 2 4-4",
  library: "M4 4h5v16H4V4Zm7 0h4v16h-4V4Zm7 1.5 3 14.5",
  dumbbell: "M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10",
  search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Zm4.8-1.7L20 20",
  bell: "M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5h-15S6 13 6 9ZM10 18a2 2 0 0 0 4 0",
  plus: "M12 5v14M5 12h14",
  chevron: "m9 6 6 6-6 6",
  menu: "M4 7h16M4 12h16M4 17h16",
  close: "M6 6l12 12M18 6 6 18",
  settings:
    "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm8-3.5-2 .4-.6 1.5 1.2 1.7-1.6 1.6-1.7-1.2-1.5.6-.4 2h-2.2l-.4-2-1.5-.6-1.7 1.2-1.6-1.6L5.2 14l-.6-1.5-2-.4V9.9l2-.4L5.2 8 4 6.3l1.6-1.6 1.7 1.2 1.5-.6.4-2h2.2l.4 2 1.5.6 1.7-1.2L16.6 6.3 15.4 8l.6 1.5 2 .4v2.2Z",
  chart: "M4 20V4M4 20h16M8 16v-5M12.5 16V8M17 16v-3",
  logout: "M14 20H6V4h8M11 12h9m0 0-3-3m3 3-3 3",
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
