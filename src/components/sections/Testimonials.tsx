import { testimonials } from "@/lib/testimonials";
import { TestimonialCard } from "@/components/ui/TestimonialCard";

/**
 * Testimonials — three cards in a row.
 */
export function Testimonials() {
  return (
    <section id="testimonials" className="w-full px-6 py-24 md:px-10 lg:py-32">
      <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-3 md:gap-8">
        {testimonials.map((testimonial, i) => (
          <TestimonialCard key={i} testimonial={testimonial} />
        ))}
      </div>
    </section>
  );
}
