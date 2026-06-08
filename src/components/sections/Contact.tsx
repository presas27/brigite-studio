import { ContactForm } from "@/components/ui/ContactForm";

/**
 * Get in touch — contact form section.
 */
export function Contact() {
  return (
    <section id="contact" className="w-full px-6 py-24 md:px-10 lg:py-32">
      <div className="mx-auto max-w-3xl">
        <ContactForm />
      </div>
    </section>
  );
}
