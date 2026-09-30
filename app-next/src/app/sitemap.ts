import type { MetadataRoute } from "next";
import { books } from "@/content/courses";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "/", "/course", ...books.map((b) => `/course/${b.slug}`),
    "/pinyin", "/pinyin/practice", "/radicals", "/sound-rules", "/roadmap", "/roadmap/pinyin",
  ].map((p) => ({ url: BASE + p, lastModified: new Date() }));
}
