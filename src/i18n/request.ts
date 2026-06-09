import { getRequestConfig } from "next-intl/server";
import { getUserLocale } from "./locale";

/**
 * Per-request next-intl config. `getUserLocale` already validates the
 * cookie and falls back to the default, so the dynamic import is always
 * for a known-good messages file.
 */
export default getRequestConfig(async () => {
  const locale = await getUserLocale();

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
