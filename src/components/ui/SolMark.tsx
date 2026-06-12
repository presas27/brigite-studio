const PETAL =
  "M50 34C58 28 60 16 56 5C52 14 48 22 47 30C47 33 48 34 50 34Z";

/**
 * The studio's sun mark, named after the SARA_SOL shoot. Ten tapered
 * petals lean clockwise so it reads as a sun, a stage spotlight and a
 * body turning on an aerial hoop at once. Colored via `currentColor`,
 * sized via className; any rotation is the parent's job.
 */
export function SolMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden className={className} fill="currentColor">
      <circle cx="50" cy="50" r="10" />
      {Array.from({ length: 10 }, (_, i) => (
        <path key={i} d={PETAL} transform={`rotate(${i * 36} 50 50)`} />
      ))}
    </svg>
  );
}
