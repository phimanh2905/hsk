"use client";

/* Section "HSK là gì" dưới hero (spec 2026-11-04 §2) — chỉ hiện khi guest progress 0. */

import { useHomeSummary } from "@/lib/home-summary";

/* Nguồn số liệu: scripts/content/data/vocab/hskN.json — lượng từ vựng HSK 3.0
   thực tế trong app cho từng level (khớp cardMeta trong src/content/courses.ts
   và seed D1 content-vocabs). KHÔNG phải số từ chính thức của đề thi HSK 3.0. */
const LEVELS = [
  { id: "HSK 1", words: 500, note: "Câu chào, số, giờ — đạt nhanh, giữ động lực" },
  { id: "HSK 2", words: 771, note: "Giao tiếp thường ngày đơn giản" },
  { id: "HSK 3", words: 970, note: "Đọc hiểu đoạn ngắn" },
  { id: "HSK 4", words: 999, note: "Trò chuyện trôi chảy chủ đề rộng" },
  { id: "HSK 5", words: 1071, note: "Đọc báo, xem phim, làm việc bằng tiếng Trung" },
];

export default function LandingIntro() {
  const s = useHomeSummary();
  if (!s.mounted || s.lessonsDone > 0) return null;
  return (
    <section data-testid="landing-intro" aria-label="HSK là gì"
      className="rounded-card border border-border-default bg-surface-elevated p-5 md:p-6">
      <h2 className="text-lg font-bold tracking-tight md:text-xl">HSK là gì?</h2>
      <p className="mt-2 text-[13.5px] text-text-secondary">
        HSK là kỳ thi chuẩn tiếng Trung của Trung Quốc, chia 9 cấp. Con đường phổ biến nhất:
        học lần lượt HSK 1 → 5. Ứng lượng từ mỗi cấp:
      </p>
      <ul className="mt-4 flex flex-col gap-2.5">
        {LEVELS.map((l) => (
          <li key={l.id} className="flex items-baseline gap-3 text-[14px]">
            <span className="w-16 shrink-0 font-bold text-text-primary">{l.id}</span>
            <span className="w-14 shrink-0 text-text-secondary">{l.words} từ</span>
            <span className="text-text-secondary">{l.note}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
