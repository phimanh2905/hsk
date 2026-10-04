/* Nhãn tiêu đề hiển thị ở breadcrumb topbar (app-shell.html .crumb).
   Route chưa có trong bảng → fallback = segment cuối, viết hoa chữ đầu. */
const TITLES: Record<string, string> = {
  "": "Trang chủ",
  course: "Khoá học",
  lesson: "Bài học",
  roadmap: "Lộ trình HSK",
  review: "Ôn tập SRS",
  hanzi: "Hanzi Studio",
  pinyin: "Bảng âm Pinyin",
  reading: "Thư viện đọc hiểu",
  shadowing: "Luyện nói & Đọc",
  dictionary: "Từ điển",
  notebook: "Sổ tay",
  "my-vocab": "Sổ tay từ vựng",
  "my-grammar": "Sổ tay ngữ pháp",
  progress: "Thống kê tiến độ",
  "create-file": "Tạo tập viết in",
  radicals: "Bộ thủ",
  "sound-rules": "Quy tắc phát âm",
  "certificate-test": "Thi chứng chỉ",
  /* Ngoài nhóm (app): Topbar mount ở root layout nên các route này cũng đi qua topbar. */
  leaderboard: "Bảng xếp hạng",
  feedback: "Góp ý",
  terms: "Điều khoản",
  privacy: "Quyền riêng tư",
  "delete-account": "Xoá tài khoản",
};

export function pageTitle(pathname: string): string {
  const seg = pathname.split("/").filter(Boolean);
  if (seg.length === 0) return TITLES[""];
  const key = seg[0];
  if (TITLES[key]) return TITLES[key];
  const last = seg[seg.length - 1].replace(/-/g, " ");
  return last.charAt(0).toUpperCase() + last.slice(1);
}
