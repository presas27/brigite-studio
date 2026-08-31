import { PrintLauncher } from "./PrintLauncher";

/**
 * The paper. Every print format renders inside this: the launcher bar (screen
 * only), a masthead, then the sheet's own content.
 *
 * Deliberately not themed. The app is wine on near-black, which a printer
 * either renders as a solid block of toner or — with "background graphics" off,
 * the default everywhere — drops entirely, leaving cream text on white paper.
 * So the sheet is its own light document: neutral greys, hairline rules, no
 * fills. It is the one place in the app that ignores the studio palette, and
 * that is why it uses Tailwind's default neutrals instead of the tokens.
 */
export function PrintSheet({
  title,
  subtitle,
  meta,
  children,
}: {
  title: string;
  /** Who and what this sheet is for — the client's name, and the workout's type. */
  subtitle: string;
  /** Right-hand column of the masthead: date range, session counts, generated-on. */
  meta: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[210mm] bg-white px-6 py-8 font-sans text-neutral-900 print:px-0 print:py-0">
      <PrintLauncher />

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-neutral-300 pb-4">
        <div className="min-w-0">
          <h1 className="text-2xl leading-tight font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-neutral-600">{subtitle}</p>
        </div>
        <ul className="shrink-0 text-right text-xs text-neutral-500">
          {meta.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </header>

      {children}
    </div>
  );
}
