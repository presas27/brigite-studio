export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-9 w-56 rounded bg-cream/10" />
      <div className="h-48 rounded-[1.25rem] bg-cream/[0.04] ring-1 ring-cream/10" />
      <div className="space-y-2">
        <div className="h-16 rounded-[1.25rem] bg-cream/[0.04] ring-1 ring-cream/10" />
        <div className="h-16 rounded-[1.25rem] bg-cream/[0.04] ring-1 ring-cream/10" />
      </div>
    </div>
  );
}
