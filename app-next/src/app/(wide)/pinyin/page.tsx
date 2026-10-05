/* /pinyin — Pinyin Lab: ma trận âm & 4 thanh điệu + luyện phản xạ tai nghe
   (port opendesign_hsk/pinyin.html, spec 2026-10-05). Server SSG đọc searchParams
   cho mode/drill; tương tác trong PinyinLabRoot. */

import type { Metadata } from "next";
import PinyinLabRoot from "./pinyin-lab-root";

export const metadata: Metadata = {
  title: "Pinyin Lab",
  description: "Làm chủ ngữ âm, vị trí đặt lưỡi và phản xạ 4 thanh điệu tiếng Trung.",
};

export default async function PinyinPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; drill?: string }>;
}) {
  const sp = await searchParams;
  return (
    <PinyinLabRoot
      initialMode={sp.mode === "quiz" ? "quiz" : "matrix"}
      initialDrill={typeof sp.drill === "string" ? sp.drill : null}
    />
  );
}
