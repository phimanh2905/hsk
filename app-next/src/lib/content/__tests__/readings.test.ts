import { describe, it, expect } from "vitest";
import type { ReadingDoc } from "@/lib/content/readings";

describe("ReadingDoc contract", () => {
  it("sentence + question shapes", () => {
    const doc: ReadingDoc = {
      id: "hsk1-reading-1", level: "hsk1", ord: 1,
      title: "我的家", titleVi: "Gia đình của tôi",
      sentences: [{ zh: "我家在北京。", py: "Wǒ jiā zài Běijīng.", vi: "Nhà tôi ở Bắc Kinh.", audio: "sent-1.mp3", durSec: 2.4 }],
      vocab: [{ word: "家", py: "jiā", vi: "nhà" }],
      questions: [{ q: "我家有几口人？", qVi: "Nhà tôi có mấy người?", options: ["三口", "四口"], answer: 0, evidence: [{ si: 2, s: 0, e: 6 }] }],
      audioDir: "audio/reading/hsk1-reading-1", chars: 120, durationSec: 45,
    };
    expect(doc.sentences[0].durSec).toBeGreaterThan(0);
    expect(doc.questions[0].evidence?.[0].si).toBe(2);
  });
});
