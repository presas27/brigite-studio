"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { sendContactEmail, type ContactFormState } from "@/app/actions/contact";

const fieldClass =
  "w-full rounded-[1rem] bg-cream/5 px-4 py-3 font-sans text-base text-cream placeholder:text-cream/35 ring-1 ring-cream/15 outline-none transition focus:ring-2 focus:ring-caramel/70";

const labelClass =
  "block font-sans text-xs font-medium uppercase tracking-[0.12em] text-cream/60";

const initial = { name: "", phone: "", email: "", message: "" };

const initialState: ContactFormState = { status: "idle" };

/** Digits only, with an optional leading "+" for the country prefix. */
function sanitizePhone(raw: string) {
  const cleaned = raw.replace(/[^\d+]/g, "");
  return cleaned.startsWith("+")
    ? `+${cleaned.slice(1).replaceAll("+", "")}`
    : cleaned.replaceAll("+", "");
}

/**
 * Contact form. Submits to the Resend-backed `sendContactEmail` server
 * action, which notifies Sara and sends the visitor a confirmation.
 */
export function ContactForm() {
  const t = useTranslations("Contact");
  const [values, setValues] = useState(initial);
  const [state, formAction, pending] = useActionState(sendContactEmail, initialState);

  // Reset the fields once per successful submit — the "previous render"
  // pattern, adjusting state during render instead of in an effect.
  const [prevStatus, setPrevStatus] = useState(state.status);
  if (state.status !== prevStatus) {
    setPrevStatus(state.status);
    if (state.status === "success") setValues(initial);
  }

  function update(field: keyof typeof initial) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setValues((v) => ({ ...v, [field]: e.target.value }));
  }

  return (
    <form
      action={formAction}
      className="rounded-[1.5rem] bg-cream/[0.03] p-6 ring-1 ring-cream/10 sm:p-8"
    >
      <div className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="name" className={labelClass}>
              {t("nameLabel")}
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder={t("namePlaceholder")}
              value={values.name}
              onChange={update("name")}
              className={fieldClass}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="phone" className={labelClass}>
              {t("phoneLabel")}
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              placeholder={t("phonePlaceholder")}
              value={values.phone}
              onChange={(e) =>
                setValues((v) => ({ ...v, phone: sanitizePhone(e.target.value) }))
              }
              className={fieldClass}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className={labelClass}>
            {t("emailLabel")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder={t("emailPlaceholder")}
            value={values.email}
            onChange={update("email")}
            className={fieldClass}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="message" className={labelClass}>
            {t("messageLabel")}
          </label>
          <textarea
            id="message"
            name="message"
            required
            placeholder={t("messagePlaceholder")}
            value={values.message}
            onChange={update("message")}
            rows={4}
            className={`${fieldClass} min-h-32 resize-y`}
          />
        </div>
      </div>

      {/* Honeypot — invisible to people, irresistible to bots. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-px w-px opacity-0"
      />

      <button
        type="submit"
        disabled={pending}
        className="mt-7 w-full rounded-full bg-butter py-3.5 font-sans text-base font-semibold text-ink transition-colors hover:bg-cream disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? t("sending") : t("submit")}
      </button>

      <p aria-live="polite" className="mt-4 min-h-6 text-center font-sans text-sm">
        {state.status === "success" && (
          <span className="text-[#8fc79a]">{t("success")}</span>
        )}
        {state.status === "error" && (
          <span className="text-[#e08a7d]">{t("error")}</span>
        )}
      </p>
    </form>
  );
}
