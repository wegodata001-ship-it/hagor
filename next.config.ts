import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** Supabase storage hosts vary per project; use `<img>` or pass absolute URLs. */
  images: {
    unoptimized: true,
  },
  /** Large banner images via Server Actions (upsertBanner FormData). */
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
