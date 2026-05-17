import type { MetadataRoute } from "next";
import { getSiteBaseUrl } from "@/lib/payments/config";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteBaseUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/", "/login-admin"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
