import { headers } from "next/headers";

/**
 * Origin of the current request, so an emailed link points at the host Sara is
 * actually using — dev server, preview deployment or production — rather than
 * the hardcoded canonical URL.
 */
export async function requestOrigin(): Promise<string | undefined> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  if (!host) return undefined;
  return `${requestHeaders.get("x-forwarded-proto") ?? "http"}://${host}`;
}
