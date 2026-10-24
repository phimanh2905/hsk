import { describe, expect, it } from "vitest";
import { dialogueByLesson, type DialogueRecord } from "../dialogues";

/* Data thật do pipeline thủ công sinh (gen-dialogues -> render-dialogue-audio.py
   -> merge-audio-timing.mts). Khi chưa chạy merge (data rỗng) các assertion chỉ
   chạy trên record có sẵn; khi data đã gen đủ hsk1-3, kiểm tra đầy đủ. */
const records = Object.values(dialogueByLesson) as DialogueRecord[];

describe("dialogues static content", () => {
  it("có data cho hsk1/lesson-1, 8–15 dòng", () => {
    const rec = dialogueByLesson["hsk1/lesson-1" as keyof typeof dialogueByLesson] as
      | DialogueRecord
      | undefined;
    if (records.length === 0) {
      console.warn("dialogueByLesson rỗng — chưa chạy merge-audio-timing (data pipeline thủ công)");
      return;
    }
    expect(rec).toBeDefined();
    expect(rec!.lines.length).toBeGreaterThanOrEqual(8);
    expect(rec!.lines.length).toBeLessThanOrEqual(15);
  });

  it("mọi line có audio đúng pattern và durSec > 0", () => {
    for (const rec of records) {
      for (const line of rec.lines) {
        expect(line.audio).toMatch(new RegExp(`^${rec.book}/lesson-\\d+-\\d+$`));
        expect(line.audio).toBe(`${rec.book}/${rec.lesson}-${line.n}`);
        expect(line.durSec).toBeGreaterThan(0);
      }
    }
  });

  it("speaker xen kẽ A/B bắt đầu A, n tăng dần từ 1", () => {
    for (const rec of records) {
      rec.lines.forEach((line, i) => {
        expect(line.n).toBe(i + 1);
        expect(line.speaker).toBe(i % 2 === 0 ? "A" : "B");
      });
    }
  });

  it("id của record khớp key trong dialogueByLesson", () => {
    for (const [key, value] of Object.entries(dialogueByLesson)) {
      const rec = value as DialogueRecord;
      expect(rec.id).toBe(key);
      expect(rec.book).toBe(key.split("/")[0]);
      expect(rec.lesson).toBe(key.split("/")[1]);
    }
  });
});
