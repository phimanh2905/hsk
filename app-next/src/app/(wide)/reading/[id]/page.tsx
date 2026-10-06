/* /reading/[id] — Reader bài đọc (redesign 2026-10-05). Server SSG mỏng:
   params là Promise (Next 16), article lấy từ content module, toàn bộ tương tác
   (scaffold, karaoke, quiz, XP) nằm trong ReadingReaderRoot. KHÔNG đọc progress
   ở server — localStorage chỉ có phía client, root tự đọc sau mount. */

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { READING_LIB } from "@/content/reading";
import { getArticle } from "@/lib/reading/repository";
import ReadingReaderRoot from "../reading-reader-root";

export function generateStaticParams() {
  return READING_LIB.map((item) => ({ id: item.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const item = READING_LIB.find((i) => i.id === id);
  return {
    title: item ? `${item.title} · ${item.vi}` : "Bài đọc",
    description: item?.ex,
  };
}

export default async function ReadingArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = getArticle(id);
  if (!article) notFound();
  return <ReadingReaderRoot article={article} />;
}
