import Link from "next/link";
import { FolderOpen, ICON_STROKE } from "@/components/ui/icon";
import { roadmapStages, roadmapCopy } from "@/content/roadmap";
import JourneyCard from "@/components/roadmap/journey-card";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";

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
          <Chip className="text-xs py-1">{roadmapCopy.badge}</Chip>
        </div>
        <p className="text-text-secondary">
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
                <span className="zh w-14 h-14 rounded-full bg-action-primary text-white font-extrabold flex items-center justify-center text-sm group-hover:-translate-y-0.5 transition-transform">
                  {s.marker}
                </span>
                {i < roadmapStages.length - 1 && <span className="flex-1 w-0.5 bg-border-default mt-1" />}
              </div>
              <Card className="p-5 flex-1 group-hover:-translate-y-0.5 transition-transform">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="text-lg font-extrabold">{s.title}</h3>
                  <Chip className="text-xs py-0.5">{s.level}</Chip>
                  <span className="text-xs font-semibold text-text-secondary ml-auto">Chưa bắt đầu</span>
                </div>
                <p className="text-sm text-text-secondary mb-3">{s.desc}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {s.tags.map((t) => (
                    <Chip key={t} className="text-xs py-0.5">
                      {t}
                    </Chip>
                  ))}
                  <span className="text-sm font-bold text-action-primary ml-auto">Vào học →</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Card Tổng ôn */}
      <div className="mb-8">
        <Link href="/review" className="block hover:-translate-y-0.5 transition-transform">
          <Card className="p-5">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h3 className="text-lg font-extrabold flex items-center gap-2">
                <FolderOpen size={20} strokeWidth={ICON_STROKE} className="text-action-primary" aria-hidden="true" />
                Tổng ôn
              </h3>
              <span className="text-xs font-semibold text-text-secondary ml-auto">SRS · 21 ngày</span>
            </div>
            <p className="text-sm text-text-secondary mb-3">{roadmapCopy.reviewDesc}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Chip className="text-xs py-0.5">Từ vựng</Chip>
              <Chip className="text-xs py-0.5">Ngữ pháp</Chip>
              <span className="text-sm font-bold text-action-primary ml-auto">Vào ôn →</span>
            </div>
          </Card>
        </Link>
      </div>

      {/* Đích đến */}
      <Card className="p-5 mb-4">
        <p className="font-bold mb-1">Đích đến: HSK 7–9</p>
        <p className="text-sm text-text-secondary">{roadmapCopy.ending}</p>
      </Card>

      <p className="text-xs text-text-secondary text-center py-4">Nhai tiếng Trung mỗi ngày — facebook.com/groups/nhaihsk</p>
    </main>
  );
}
