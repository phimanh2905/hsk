export type CommandItem = { label: string; href: string; group: string };
export type LessonIndexEntry = { title: string; first?: string };

const PAGES: ReadonlyArray<CommandItem> = [
  { label: "Trang chủ", href: "/", group: "Trang" },
  /* Final review F4: trang chủ mới bỏ grid khóa học → /course chỉ còn tới được qua
     palette (sidebar/bottom-nav không có mục này — quyết định sản phẩm, chưa thêm). */
  { label: "Khoá học", href: "/course", group: "Trang" },
  { label: "Lộ trình HSK", href: "/roadmap", group: "Trang" },
  { label: "Ôn tập SRS", href: "/review", group: "Trang" },
  { label: "Hanzi Studio", href: "/hanzi", group: "Luyện tập" },
  { label: "Bảng âm Pinyin", href: "/pinyin", group: "Luyện tập" },
  { label: "Thư viện đọc hiểu", href: "/reading", group: "Luyện tập" },
  { label: "Luyện nói", href: "/shadowing", group: "Luyện tập" },
  { label: "Từ điển", href: "/dictionary", group: "Tra cứu" },
  { label: "Sổ tay từ vựng", href: "/my-vocab", group: "Cá nhân" },
  { label: "Sổ tay & Ghi chép", href: "/notebook", group: "Cá nhân" },
  { label: "Thống kê tiến độ", href: "/progress", group: "Cá nhân" }
];

/* Gộp route tĩnh + tiêu đề bài học (meta nạp qua API content, xem command-palette).
   Defensive: lessons rỗng (API lỗi/chưa load) → chỉ route tĩnh. */
export function buildCommandIndex(lessons: LessonIndexEntry[]): CommandItem[] {
  const out: CommandItem[] = [...PAGES];
  for (const l of lessons) {
    if (!l.title) continue;
    out.push({ label: `${l.title}${l.first ? ` · ${l.first}` : ""}`, href: "/dictionary", group: "Từ vựng" });
  }
  return out;
}