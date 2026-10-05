/* /reading — Thư viện bài đọc (redesign 2026-10-05). Server mỏng; toàn bộ
   tương tác (filter/search/save) nằm trong ReadingLibraryRoot. */

import type { Metadata } from "next";
import ReadingLibraryRoot from "./reading-library-root";

export const metadata: Metadata = {
  title: "Thư viện bài đọc",
  description: "Bài đọc tiếng Trung theo cấp độ HSK — lọc, tìm kiếm, lưu và luyện quiz.",
};

export default function ReadingPage() {
  return <ReadingLibraryRoot />;
}
