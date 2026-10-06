import type { MetadataRoute } from "next";
import { books } from "@/content/courses";
import { SITE_URL } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "/", "/course", ...books.map((b) => `/course/${b.slug}`),
    "/pinyin", "/pinyin/practice", "/radicals", "/sound-rules", "/roadmap", "/roadmap/pinyin",
    "/dictionary", "/hanzi", "/reading",
  ].map((p) => ({ url: SITE_URL + p, lastModified: new Date() }));
}
