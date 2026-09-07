export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-40 rounded bg-cream/10" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-36 rounded-[1.25rem] bg-cream/[0.04] ring-1 ring-cream/10" />
        <div className="h-36 rounded-[1.25rem] bg-cream/[0.04] ring-1 ring-cream/10" />
      </div>
      <div className="h-44 rounded-[1.25rem] bg-cream/[0.04] ring-1 ring-cream/10" />
    </div>
  );
}
