import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import type { Testimonial } from "@/lib/testimonials";

/**
 * Testimonial card — name + avatar top-right, handle below on the left,
 * "SEE COMMENT →" anchored at the bottom.
 */
export function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  const t = useTranslations("Testimonials");
  return (
    <article className="flex min-h-[22rem] flex-col rounded-[2rem] bg-white p-8 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.25)] sm:min-h-[26rem] sm:p-10 lg:min-h-[30rem]">
      <div className="flex items-center justify-end gap-4">
        <span className="font-serif text-2xl font-bold tracking-tight">
          {testimonial.name}
        </span>
        <span
          className="relative size-12 shrink-0 overflow-hidden rounded-full bg-[#e8e8e6]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #dedede 0 5px, #efefed 5px 10px)",
          }}
        >
          {testimonial.avatar ? (
            <Image
              src={testimonial.avatar}
              alt={testimonial.name}
              fill
              sizes="48px"
              className="object-cover"
            />
          ) : null}
        </span>
      </div>

      <p className="mt-6 font-serif text-lg font-bold tracking-tight">
        {testimonial.handle}
      </p>

      <Link
        href={testimonial.href ?? "#"}
        className="mt-auto inline-flex items-center gap-2 font-serif text-sm font-medium uppercase tracking-[0.18em] transition-opacity hover:opacity-60"
      >
        {t("seeComment")}
        <span aria-hidden>→</span>
      </Link>
    </article>
  );
}
