/* Nhãn tiêu đề hiển thị ở breadcrumb topbar (app-shell.html .crumb).
   Route chưa có trong bảng → fallback = segment cuối, viết hoa chữ đầu. */
const TITLES: Record<string, string> = {
  "": "Trang chủ",
  course: "Khoá học",
  roadmap: "Lộ trình HSK",
  review: "Ôn tập SRS",
  hanzi: "Hanzi Studio",
  pinyin: "Bảng âm Pinyin",
  reading: "Thư viện đọc hiểu",
  shadowing: "Luyện nói & Đọc",
  dictionary: "Từ điển",
  "my-vocab": "Sổ tay từ vựng",
  "my-grammar": "Sổ tay ngữ pháp",
  progress: "Thống kê tiến độ",
  "create-file": "Tạo tập viết in",
  radicals: "Bộ thủ",
  "sound-rules": "Quy tắc phát âm",
  "certificate-test": "Thi chứng chỉ",
};

export function pageTitle(pathname: string): string {
  const seg = pathname.split("/").filter(Boolean);
  if (seg.length === 0) return TITLES[""];
  const key = seg[0];
  if (TITLES[key]) return TITLES[key];
  const last = seg[seg.length - 1].replace(/-/g, " ");
  return last.charAt(0).toUpperCase() + last.slice(1);
}
