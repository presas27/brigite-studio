import { getRequestConfig } from "next-intl/server";
import { getUserLocale } from "./locale";

/**
 * Static per-locale loaders. Plain string `import()` paths let the bundler
 * code-split each messages file into its own chunk (a `${locale}` template
 * path cannot be split). `getUserLocale` validates the cookie and falls back
 * to the default, so the locale is always a known key here.
 */
const messages = {
  pt: () => import("../../messages/pt.json"),
  en: () => import("../../messages/en.json"),
} as const;

export default getRequestConfig(async () => {
  const locale = await getUserLocale();

  return {
    locale,
    messages: (await messages[locale]()).default,
  };
});
