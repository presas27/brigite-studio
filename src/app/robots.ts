import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * Marketing site is public. `/app` and auth flows are private even if a
 * crawler finds a URL — they are also `noindex` in their own metadata.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app/", "/entrar", "/onboarding", "/convite/", "/comecar", "/repor", "/conta"],
    },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
