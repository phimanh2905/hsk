/* 3 sổ chuyên đề tĩnh của dashboard /notebook (spec §3.3) — số liệu là biên tập
   theo mock notebook.html, KHÔNG đếm runtime. Sổ "Câu làm sai" là dữ liệu thật
   (notebook_entries) nên không nằm trong list này. */
export type NotebookBookId = "confusables" | "idioms" | "speaking";

export type NotebookBook = {
  id: NotebookBookId;
  icon: string;
  title: string;
  sub: string;
  big: string;
  badge: string;
  badgeTone: "ok" | "soft";
  cta: string;
};

export const notebookBooks: ReadonlyArray<NotebookBook> = [
  { id: "confusables", icon: "🔍", title: "CHỮ HÁN DỄ NHẦM", sub: "形近字 / 易混字", big: "18 cặp chữ hay nhầm", badge: "Đã thuộc: 12 cặp", badgeTone: "ok", cta: "Luyện phân biệt" },
  { id: "idioms", icon: "🐉", title: "THÀNH NGỮ HSK", sub: "成语 / 惯用语", big: "32 thành ngữ bỏ túi", badge: "HSK 4 – HSK 5", badgeTone: "soft", cta: "Học thành ngữ" },
  { id: "speaking", icon: "💼", title: "KHẨU NGỮ THỰC TẾ", sub: "口语 · Giao tiếp & VP", big: "12 mẫu câu thực tế", badge: "Giao tiếp VP", badgeTone: "soft", cta: "Luyện giao tiếp" },
];
