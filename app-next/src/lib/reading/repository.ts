/* Data-access mỏng cho Thư viện bài đọc — tách lớp để sau này cắm be-v2 API
   mà không phải đổi UI. Hiện tại đọc trực tiếp từ content module. */

import {
  READING_ARTICLES,
  READING_LIB,
  type ReadingArticle,
  type ReadingLibItem,
} from "@/content/reading";

export function listArticles(): ReadingLibItem[] {
  return READING_LIB;
}

export function getArticle(id: string): ReadingArticle | undefined {
  return READING_ARTICLES[id];
}

/** Bài gợi ý: bài đầu theo thứ tự READING_LIB chưa đọc (pct thiếu hoặc <=0);
 *  nếu tất cả đã đọc → bài đầu tiên. Pure, không đọc localStorage. */
export function recommendedId(
  savedIds: string[],
  progress: Record<string, { pct: number }>,
): string {
  void savedIds;
  const first = READING_LIB[0];
  if (!first) return "";
  for (const item of READING_LIB) {
    const p = progress[item.id];
    if (!p || p.pct <= 0) return item.id;
  }
  return first.id;
}
