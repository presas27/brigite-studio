import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/** One public page. Locale is a cookie, not a URL, so it is not listed twice. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: site.url,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
