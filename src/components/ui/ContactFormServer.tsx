import { headers } from "next/headers";
import { createFormToken } from "@/lib/form-token";
import { ContactForm } from "./ContactForm";

/**
 * Server wrapper that mints a fresh timing token for each visitor and hands it
 * to the client form. Reading `headers()` opts this subtree into per-request
 * dynamic rendering, so the token's timestamp is never frozen by static cache
 * — that freshness is what makes the "submitted too fast" bot check work.
 */
export async function ContactFormServer() {
  await headers();
  return <ContactForm token={createFormToken()} />;
}
