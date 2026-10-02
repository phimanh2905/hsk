/* Roadmap Pinyin (E2) — port từ clone/roadmap-pinyin.html + clone/js/roadmap-pinyin.js
   + SPEC-05 §2 + SPEC-21 §A: stepper 6 bước (`?step=n`, Suspense) + timeline 8 buổi
   khoá tuần tự (unlock qua Bài kiểm tra — Task 27 ghi markRoadmapSession). */

import { Suspense } from "react";
import StepsClient from "@/components/roadmap/steps-client";
import TimelineClient from "@/components/roadmap/timeline-client";

export const metadata = {
  title: "Lộ trình Pinyin",
  description: "Bảng chữ cái Pinyin — học theo lộ trình 8 buổi, mỗi buổi 15-20 phút, hoàn thành bài kiểm tra để mở buổi tiếp theo.",
};

export default function RoadmapPinyinPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Bảng chữ cái Pinyin — Học theo lộ trình</h1>
        <p className="text-sm text-nhai-muted mt-1">
          8 buổi, mỗi buổi 15–20 phút — hoàn thành bài kiểm tra để mở buổi tiếp theo.
        </p>
      </header>

      <Suspense fallback={null}>
        <StepsClient />
      </Suspense>

      <TimelineClient />
    </main>
  );
}
