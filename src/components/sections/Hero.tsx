/**
 * Hero — full-bleed photo with a left-side dark gradient for legibility.
 *
 * The photo lives at /images/hero.jpg. Until that asset is dropped in,
 * a neutral studio-grey gradient stands in (listed as the CSS fallback),
 * so nothing looks broken.
 */
export function Hero() {
  return (
    <section className="relative isolate flex min-h-[calc(100svh-5rem)] items-center overflow-hidden">
      {/* Photo layer (falls back to a grey gradient if the image is missing) */}
      <div
        aria-hidden
        className="absolute inset-0 -z-20 bg-cover bg-[position:75%_center]"
        style={{
          backgroundImage:
            "url('/images/hero.jpg'), linear-gradient(115deg, #a6a39f 0%, #74716d 55%, #54514e 100%)",
        }}
      />

      {/* Dark gradient overlay — readable text on the left, photo on the right */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(24,20,18,0.92) 0%, rgba(24,20,18,0.6) 32%, rgba(24,20,18,0.15) 58%, rgba(24,20,18,0) 78%)",
        }}
      />

      <div className="w-full px-6 py-20 md:px-10 lg:px-24">
        <div className="max-w-xl text-white">
          <h1 className="font-serif text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            Brigite&rsquo;s studio
          </h1>

          <p className="mt-7 font-serif text-3xl font-bold leading-tight sm:text-4xl">
            Strenght, Mobility &amp; Performance
          </p>

          <p className="mt-7 max-w-md font-serif text-lg leading-relaxed text-white/90 sm:text-xl">
            Designed for beginners, fitness enthusiasts, performers and athletes
            alike, my coaching supports you in building strength, improving
            mobility and developing confidence in your body at every stage of
            your journey.
          </p>
        </div>
      </div>
    </section>
  );
}
