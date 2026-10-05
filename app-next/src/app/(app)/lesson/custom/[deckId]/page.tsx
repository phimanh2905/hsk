"use client";
/* Route /lesson/custom/[deckId] — học deck tự tạo (C10), port clone/js/lesson.js loadData() nhánh ?custom=<deckId>.
   Deck đọc từ `bye.decks`; itemKey `deck.<deckId>.<ord>` — không ghi page_dones (không có nút hoàn thành bài). */
import { use } from "react";
import Link from "next/link";
import LessonClient from "@/components/lesson/lesson-client";
import type { LessonItem } from "@/components/lesson/lesson-provider";
import { getDeck } from "@/lib/store/decks";
import { Card } from "@/components/ui/card";

export default function CustomLessonPage({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = use(params);
  const deck = getDeck(deckId);
  if (!deck || deck.rows.length === 0) {
    return (
      <Card className="max-w-[760px] mx-auto mt-8 p-8 text-center">
        <p>Bộ thẻ này không tồn tại hoặc đang trống.</p>
        <Link href="/my-vocab" className="inline-flex min-h-11 items-center justify-center rounded-control border border-transparent bg-action-primary px-5 font-semibold text-white hover:bg-action-primary-hover mt-4">Về bộ từ vựng của tôi</Link>
      </Card>
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
