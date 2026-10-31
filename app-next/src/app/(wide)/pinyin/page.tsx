/* /pinyin — Pinyin Lab: ma trận âm & 4 thanh điệu + luyện phản xạ tai nghe
   (port opendesign_hsk/pinyin.html, spec 2026-10-05). Static SSG; query
   ?mode=&drill= được đọc client trong PinyinLabRoot (useSearchParams). */

import type { Metadata } from "next";
import { Suspense } from "react";
import PinyinLabRoot from "./pinyin-lab-root";

export const metadata: Metadata = {
  title: "Pinyin Lab",
  description: "Làm chủ ngữ âm, vị trí đặt lưỡi và phản xạ 4 thanh điệu tiếng Trung.",
};

export default function PinyinPage() {
  return (
    <Suspense fallback={null}>
      <PinyinLabRoot />
    </Suspense>
  );
}
