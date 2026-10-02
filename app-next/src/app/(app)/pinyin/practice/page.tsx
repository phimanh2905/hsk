/* /pinyin/practice (D2) — Bài tập Pinyin: 10 câu luân phiên nghe/thanh điệu.
   Client page; logic trong PracticeClient (buildQuestion thuần, test được). */

import PracticeClient from "@/components/pinyin/practice-client";

export const metadata = {
  title: "Bài tập Pinyin",
  description: "Bài tập Pinyin 10 câu luân phiên luyện nghe và nhận diện thanh điệu.",
};

export default function PinyinPracticePage() {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-extrabold tracking-tight">Bài tập Pinyin</h1>
      <p className="text-sm font-semibold text-text-secondary mt-1">
        Luyện nghe và gõ pinyin — nhận biết thanh điệu
      </p>
      <div className="mt-6">
        <PracticeClient />
      </div>
    </div>
  );
}
