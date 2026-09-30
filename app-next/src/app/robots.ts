import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/lesson/custom/", "/lesson/"] }],
    sitemap: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://nhaihsk.example"}/sitemap.xml`,
  };
}
