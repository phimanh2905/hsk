import { vocab } from "@/content/vocab";

export type CommandItem = { label: string; href: string; group: string };

const PAGES: ReadonlyArray<CommandItem> = [
  { label: "Trang chủ", href: "/", group: "Trang" },
  /* Final review F4: trang chủ mới bỏ grid khóa học → /course chỉ còn tới được qua
     palette (sidebar/bottom-nav không có mục này — quyết định sản phẩm, chưa thêm). */
  { label: "Khoá học", href: "/course", group: "Trang" },
  { label: "Lộ trình HSK", href: "/roadmap", group: "Trang" },
  { label: "Ôn tập SRS", href: "/review", group: "Trang" },
  { label: "Hanzi Studio", href: "/hanzi", group: "Luyện tập" },
  { label: "Bảng âm Pinyin", href: "/pinyin", group: "Luyện tập" },
  { label: "Thư viện bài đọc", href: "/reading", group: "Luyện tập" },
  { label: "Luyện nói", href: "/shadowing", group: "Luyện tập" },
  { label: "Từ điển", href: "/dictionary", group: "Tra cứu" },
  { label: "Sổ tay từ vựng", href: "/my-vocab", group: "Cá nhân" },
  { label: "Thống kê tiến độ", href: "/progress", group: "Cá nhân" }
];

/* Gộp route tĩnh + tiêu đề bài học từ content/vocab (defensive — vocab có thể rỗng ở test).
   Shape thật: Record<book, Record<pageId, { title?: string; words?: unknown[] }>> — `words`, không phải `rows`. */
export function buildCommandIndex(): CommandItem[] {
  const out: CommandItem[] = [...PAGES];
  try {
    for (const pages of Object.values(vocab ?? {}) as Array<Record<string, { title?: string; words?: Array<{ hanzi?: string }> }>>) {
      for (const page of Object.values(pages ?? {})) {
        const title = typeof page?.title === "string" ? page.title : "";
        const first = Array.isArray(page?.words) ? page.words[0]?.hanzi : undefined;
        if (title) out.push({ label: `${title}${first ? ` · ${first}` : ""}`, href: "/dictionary", group: "Từ vựng" });
      }
    }
  } catch {
    /* vocab hỏng/không có → chỉ dùng route tĩnh */
  }
  return out;
}