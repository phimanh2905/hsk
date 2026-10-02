import Link from "next/link";
import { roadmapStages, roadmapCopy } from "@/content/roadmap";
import JourneyCard from "@/components/roadmap/journey-card";

export const metadata = {
  title: "Lộ trình",
  description: "Một con đường liền mạch từ bảng Pinyin đến HSK 7-9 — vào thẳng chặng bạn muốn, không cần học lại từ đầu.",
};

/* Roadmap tổng quan (E1) — port từ clone/roadmap.html + clone/js/roadmap.js + SPEC-05 §1.
   Badge "🚧 Tính năng đang phát triển" + JourneyCard + timeline dọc 6 chặng + card Tổng ôn + đoạn kết. */

const STAGE_HREF: Record<string, string> = {
  Pinyin: "/roadmap/pinyin",
  "HSK 1": "/course/hsk1",
  "HSK 2": "/course/hsk2",
  "HSK 3": "/course/hsk3",
  "HSK 4–6": "/course/hsk4",
  "HSK 7–9": "/course/hsk79",
};

export default function RoadmapPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      {/* Header */}
      <section className="mb-6">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <h1 className="text-3xl font-extrabold tracking-tight">Lộ trình</h1>
          <span className="pill text-xs py-1">{roadmapCopy.badge}</span>
        </div>
        <p className="text-nhai-muted">
          Một con đường liền mạch từ bảng Pinyin đến HSK 7–9. Đã có nền tảng? Vào thẳng chặng bạn muốn — không cần
          học lại từ đầu.
        </p>
      </section>

      {/* Hành trình của bạn */}
      <JourneyCard />

      {/* Timeline 6 chặng */}
      <section className="mb-8">
        <div className="relative">
          {roadmapStages.map((s, i) => (
            <Link
              key={s.marker}
              href={STAGE_HREF[s.book] ?? "/course"}
              className={`relative flex gap-4 group mb-5 last:mb-0`}
            >
              <div className="flex flex-col items-center shrink-0">
                <span className="zh w-14 h-14 rounded-full bg-nhai-main text-white font-extrabold flex items-center justify-center shadow-neo text-sm group-hover:-translate-y-0.5 transition-transform">
                  {s.marker}
                </span>
                {i < roadmapStages.length - 1 && <span className="flex-1 w-0.5 bg-nhai-border mt-1" />}
              </div>
              <div className="card shadow-neo p-5 flex-1 group-hover:-translate-y-0.5 transition-transform">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="text-lg font-extrabold">{s.title}</h3>
                  <span className="pill text-xs py-0.5">{s.level}</span>
                  <span className="text-xs font-semibold text-nhai-muted ml-auto">Chưa bắt đầu</span>
                </div>
                <p className="text-sm text-nhai-muted mb-3">{s.desc}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {s.tags.map((t) => (
                    <span key={t} className="pill text-xs py-0.5">
                      {t}
                    </span>
                  ))}
                  <span className="text-sm font-bold text-nhai-main ml-auto">Vào học →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Card Tổng ôn */}
      <div className="mb-8">
        <Link href="/review" className="card shadow-neo p-5 flex-1 block hover:-translate-y-0.5 transition-transform">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h3 className="text-lg font-extrabold">🗂️ Tổng ôn</h3>
            <span className="text-xs font-semibold text-nhai-muted ml-auto">SRS · 21 ngày</span>
          </div>
          <p className="text-sm text-nhai-muted mb-3">{roadmapCopy.reviewDesc}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="pill text-xs py-0.5">Từ vựng</span>
            <span className="pill text-xs py-0.5">Ngữ pháp</span>
            <span className="text-sm font-bold text-nhai-main ml-auto">Vào ôn →</span>
          </div>
        </Link>
      </div>

      {/* Đích đến */}
      <section className="card shadow-neo p-5 mb-4">
        <p className="font-bold mb-1">Đích đến: HSK 7–9</p>
        <p className="text-sm text-nhai-muted">{roadmapCopy.ending}</p>
      </section>

      <p className="text-xs text-nhai-muted text-center py-4">Nhai tiếng Trung mỗi ngày — facebook.com/groups/nhaihsk</p>
    </main>
  );
}
