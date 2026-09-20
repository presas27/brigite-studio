import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

/**
 * Response headers every route gets. No CSP yet: the marketing site inlines
 * GSAP-driven styles and the app embeds YouTube, and a policy written blind
 * would break one of them — it needs a report-only pass first.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  images: {
    /**
     * AVIF first. The hero photo is a wide studio frame whose backdrop is a
     * smooth grey sweep — WebP spends its bitrate on that gradient's noise.
     * Measured on the 3840px master: WebP 345 KB vs AVIF 16 KB at equal
     * SSIM. Every browser the site targets decodes AVIF; WebP is the
     * fallback for the rest.
     */
    formats: ["image/avif", "image/webp"],
  },
  /**
   * Tree-shake the animation barrels so a page that uses one `Reveal` does not
   * download every Motion or GSAP export.
   */
  experimental: {
    optimizePackageImports: ["motion", "gsap", "@gsap/react"],
    turbopackFileSystemCacheForBuild: true,
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
