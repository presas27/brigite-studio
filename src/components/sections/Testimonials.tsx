import { testimonials } from "@/lib/testimonials";
import { TestimonialCard } from "@/components/ui/TestimonialCard";

/**
 * Testimonials — three cards in a row.
 */
export function Testimonials() {
  return (
    <section id="testimonials" className="w-full px-6 py-16 md:px-10 md:py-24 lg:py-32">
      <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3">
        {testimonials.map((testimonial, i) => (
          <TestimonialCard key={i} testimonial={testimonial} />
        ))}
      </div>
    </section>
  );
}
