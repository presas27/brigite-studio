import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  images: {
    /**
     * YouTube poster frames. Exercise demos are links, not uploads, so the only
     * picture the library has for a movement is the one YouTube already serves.
     */
    remotePatterns: [{ protocol: "https", hostname: "i.ytimg.com", pathname: "/vi/**" }],
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
