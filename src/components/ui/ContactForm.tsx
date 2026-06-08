"use client";

import { useState } from "react";

const fieldClass =
  "w-full rounded-2xl bg-[#f3f3f2] px-5 py-4 font-sans text-base text-foreground placeholder:text-foreground/40 outline-none transition focus:ring-2 focus:ring-[#7d6049]/40";

const labelClass = "block font-serif text-xl font-bold tracking-tight";

const initial = { name: "", phone: "", email: "", message: "" };

/**
 * Contact form. Visual replica of the reference; submission is a stub
 * for now — wire it to a Resend-backed server action / route handler
 * when email delivery is ready.
 */
export function ContactForm() {
  const [values, setValues] = useState(initial);

  function update(field: keyof typeof initial) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((v) => ({ ...v, [field]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // TODO: send via Resend (server action / API route).
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[1.5rem] border border-black/10 bg-white p-8 sm:p-12"
    >
      <div className="space-y-7">
        <div className="space-y-3">
          <label htmlFor="name" className={labelClass}>
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="Joana Santos"
            value={values.name}
            onChange={update("name")}
            className={fieldClass}
          />
        </div>

        <div className="space-y-3">
          <label htmlFor="phone" className={labelClass}>
            Phone Number
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            placeholder="+3519xxxxxxxx"
            value={values.phone}
            onChange={update("phone")}
            className={fieldClass}
          />
        </div>

        <div className="space-y-3">
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="jane@framer.com"
            value={values.email}
            onChange={update("email")}
            className={fieldClass}
          />
        </div>

        <div className="space-y-3">
          <label htmlFor="message" className={labelClass}>
            Message
          </label>
          <textarea
            id="message"
            name="message"
            placeholder="Hey!"
            value={values.message}
            onChange={update("message")}
            rows={5}
            className={`${fieldClass} min-h-40 resize-y`}
          />
        </div>
      </div>

      <button
        type="submit"
        className="mt-9 w-full rounded-full bg-[#7d6049] py-4 font-sans text-base font-semibold text-white transition-colors hover:bg-[#6b5240]"
      >
        Submit
      </button>
    </form>
  );
}
