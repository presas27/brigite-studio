/**
 * Owns the session error boundary. A route group without a layout does not
 * wrap `error.tsx` around the page — a crash then surfaces as the site-wide
 * "something broke" instead of the way back to workouts.
 */
export default function SessaoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
