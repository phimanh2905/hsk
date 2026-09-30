"use client";
/* Route /lesson/custom/[deckId] — học deck tự tạo (C10), port clone/js/lesson.js loadData() nhánh ?custom=<deckId>.
   Deck đọc từ `nhai.decks`; itemKey `deck.<deckId>.<ord>` — không ghi page_dones (không có nút hoàn thành bài). */
import { use } from "react";
import Link from "next/link";
import LessonClient from "@/components/lesson/lesson-client";
import type { LessonItem } from "@/components/lesson/lesson-provider";
import { getDeck } from "@/lib/store/decks";

export default function CustomLessonPage({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = use(params);
  const deck = getDeck(deckId);
  if (!deck || deck.rows.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p>Bộ thẻ này không tồn tại hoặc đang trống.</p>
        <Link href="/my-vocab" className="btn-main inline-block mt-4 px-6 py-2">Về bộ từ vựng của tôi</Link>
      </div>
    );
  }
  const items: LessonItem[] = deck.rows.map((r, i) => ({
    hanzi: r.hanzi,
    pinyin: r.pinyin ?? "",
    hanViet: (r.hanViet ?? "").toUpperCase(),
    meaning: r.meaning ?? "",
    pos: "",
    example: { zh: r.exampleZh ?? r.hanzi, pinyinPerChar: [], vi: r.meaning ?? "" },
    index: i,
    itemKey: `deck.${deckId}.${i}`,
  }));
  return <LessonClient items={items} deckName={deck.name} />;
}
