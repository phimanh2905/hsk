/* AUTO-GENERATED bởi scripts/content/src/merge-audio-timing.mts (W3.3) — KHÔNG sửa tay.
   Nguồn: data/dialogues/dialogues-hskN.json (gen-dialogues) + timing-hskN.json
   (render-dialogue-audio.py: Kokoro zf_001/zm_009, mp3 24kHz mono).
   Line audio = "<book>/<lesson>-<n>" tương đối tới public/ (pages tự prefix).
   Types khai báo tại đây để src không phụ thuộc scripts/.
   HIỆN TRẠNG: chưa chạy merge trên data thật (gen-dialogues + render chưa chạy)
   nên map rỗng — chạy lại generator sẽ thay thế toàn bộ file này. */

export type DialogueLine = {
  n: number;
  speaker: "A" | "B";
  zh: string;
  pinyin: string;
  vi: string;
  audio: string;
  durSec: number;
};

export type DialogueRecord = {
  id: string;
  book: string;
  lesson: string;
  title: string;
  titleVi: string;
  lines: DialogueLine[];
};

export const dialogueByLesson = {} as const;
