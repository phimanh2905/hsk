import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/lesson/custom/", "/lesson/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
