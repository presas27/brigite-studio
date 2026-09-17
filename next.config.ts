import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

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
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
