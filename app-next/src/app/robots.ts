import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

/* output:export (build:static) yêu cầu metadata routes khai báo tĩnh rõ ràng. */
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/lesson/custom/", "/lesson/"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
