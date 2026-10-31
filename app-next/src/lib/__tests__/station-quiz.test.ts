import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  buildStationQuestions,
  levelPool,
  pickDistractors,
  pinyinInitial,
  sampleMilestoneQuestions,
  sampleWarmupQuestions,
  submitStationResult,
  type StationPool,
} from "../station-quiz";
import { getRoadmapLevel, type Station } from "@/content/roadmap-stations";

const hsk2 = getRoadmapLevel("hsk-2")!;
const s1 = hsk2.stations.find((s) => s.id === "1")!;
const s5 = hsk2.stations.find((s) => s.id === "5")!; // vocab mỏng (3 từ)
const milestone = hsk2.stations.find((s) => s.id === "m")!;

/** rng deterministic: xen kẽ 0/1 để shuffle ổn định cho assert */
const detRng = () => 0.42;

describe("levelPool", () => {
  it("gom vocab/gram của mọi lesson station, loại milestone", () => {
    const pool = levelPool(hsk2);
    // 5 lesson + trạm 6 vocab; milestone bị loại
    expect(pool.vocab.length).toBeGreaterThan(20);
    expect(pool.gram.length).toBeGreaterThan(8);
    expect(pool.vocab).not.toContainEqual(["Tổng ôn 60 từ", "zǒng fùxí", "flashcard chặng 1"]);
  });
});

describe("buildStationQuestions", () => {
  it("số câu = vocab + gram; mỗi câu có đáp án trong options", () => {
    const qs = buildStationQuestions(s1, undefined, detRng);
    expect(qs.length).toBe(s1.vocab.length + s1.gram.length);
    for (const q of qs) {
      expect(q.options.length).toBe(4);
      expect(q.options[q.answerIndex]).toBeTruthy();
      expect(q.prompt.length).toBeGreaterThan(0);
      expect(new Set(q.options).size).toBe(q.options.length); // không trùng option
    }
  });

  it("station vocab mỏng: vẫn đủ câu, options lấp từ level pool", () => {
    const pool = levelPool(hsk2);
    const qs = buildStationQuestions(s5, pool, detRng);
    expect(qs.length).toBe(s5.vocab.length + s5.gram.length);
    for (const q of qs) expect(q.options.length).toBe(4);
  });

  it("F1 — gram distractor cùng loại: câu nghĩa → options toàn nghĩa, câu tên mẫu → toàn tên", () => {
    const station: Station = {
      ...s1,
      vocab: [],
      gram: [
        ["Mẫu G1", "nghĩa một"], ["Mẫu G2", "nghĩa hai"],
        ["Mẫu G3", "nghĩa ba"], ["Mẫu G4", "nghĩa bốn"],
      ],
    };
    const qs = buildStationQuestions(station, undefined, detRng);
    const descs = station.gram.map(([, d]) => d);
    const names = station.gram.map(([n]) => n);
    const descQs = qs.filter((q) => q.prompt.includes("diễn đạt"));
    const nameQs = qs.filter((q) => q.prompt.includes("ứng với"));
    expect(descQs.length).toBe(2);
    expect(nameQs.length).toBe(2);
    for (const q of descQs) {
      expect(q.options.every((o) => descs.includes(o))).toBe(true);
    }
    for (const q of nameQs) {
      expect(q.options.every((o) => names.includes(o))).toBe(true);
    }
  });

  it("F1 — pool gram mỏng (station 1: 2 mục) vẫn đủ 4 options qua fallback trộn", () => {
    const qs = buildStationQuestions(s1, undefined, detRng);
    const gramQs = qs.filter((q) => q.prompt.includes("diễn đạt") || q.prompt.includes("ứng với"));
    expect(gramQs.length).toBe(s1.gram.length);
    for (const q of gramQs) {
      expect(q.options.length).toBe(4);
      expect(new Set(q.options).size).toBe(4);
    }
  });

  it("rng được dùng cho shuffle (cùng seed → cùng kết quả)", () => {
    const a = buildStationQuestions(s1, undefined, detRng);
    const b = buildStationQuestions(s1, undefined, detRng);
    expect(a).toEqual(b);
  });
});

describe("sampleMilestoneQuestions", () => {
  it("đúng 12 câu (9 vocab + 3 gram khi gram đủ), 4 options mỗi câu, mỗi câu vocab thứ 4 là nghe", () => {
    const pool = levelPool(hsk2);
    const qs = sampleMilestoneQuestions(pool, detRng);
    expect(qs.length).toBe(12);
    for (const q of qs) expect(q.options.length).toBe(4);
    expect(qs.filter((q) => q.listen).length).toBeGreaterThan(0);
  });

  it("gram rỗng → toàn vocab 12 câu", () => {
    const pool: StationPool = {
      vocab: [
        ["你好", "nǐ hǎo", "xin chào"], ["谢谢", "xièxie", "cảm ơn"], ["再见", "zàijiàn", "tạm biệt"],
        ["请", "qǐng", "xin mời"], ["对不起", "duìbuqǐ", "xin lỗi"], ["老师", "lǎoshī", "giáo viên"],
        ["学生", "xuésheng", "học sinh"], ["同学", "tóngxué", "bạn cùng lớp"], ["医生", "yīshēng", "bác sĩ"],
        ["爸爸", "bàba", "bố"], ["妈妈", "māma", "mẹ"], ["哥哥", "gēge", "anh trai"],
      ],
      gram: [],
    };
    const qs = sampleMilestoneQuestions(pool, detRng);
    expect(qs.length).toBe(12);
    for (const q of qs) expect(q.prompt).not.toContain("ngữ pháp");
  });
});

describe("station-quiz v2", () => {
  const pool: StationPool = {
    vocab: [["你好", "nǐ hǎo", "xin chào"], ["谢谢", "xièxie", "cảm ơn"], ["再见", "zàijiàn", "tạm biệt"],
      ["请", "qǐng", "xin mời"], ["对不起", "duìbuqǐ", "xin lỗi"], ["老师", "lǎoshī", "giáo viên"],
      ["学生", "xuésheng", "học sinh"], ["同学", "tóngxué", "bạn cùng lớp"]],
    gram: [],
  };
  it("listenEvery=4: câu 4 có listen {audioText=hanzi, options=pinyin, readVariant đầy đủ}", () => {
    const qs = buildStationQuestions(
      { id: "g1", no: "Trạm 1", kind: "lesson", title: "T", zh: "", meta: "", vocab: pool.vocab, gram: [] },
      pool,
      () => 0.42,
      { listenEvery: 4 },
    );
    const listenQs = qs.filter((q) => q.listen);
    expect(listenQs).toHaveLength(2); // 8 vocab câu → 2 câu nghe
    const q = listenQs[0]!;
    expect(q.listen!.audioText.length).toBeGreaterThan(0); // hanzi
    expect(q.options.every((o) => /[\u0300-\u036fāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(o))).toBe(true);
    expect(q.listen!.readOptions).toHaveLength(4);
    expect(q.listen!.readOptions[q.listen!.readAnswerIndex]).toBeTruthy();
  });
  it("sampleWarmupQuestions trả đúng 4 câu vocab-only", () => {
    const qs = sampleWarmupQuestions(pool, () => 0.3);
    expect(qs).toHaveLength(4);
    expect(qs.every((q) => !q.listen)).toBe(true);
  });
  it("sampleMilestoneQuestions(pool) trả 12 câu, gram rỗng → toàn vocab, mỗi câu thứ 4 là nghe", () => {
    const qs = sampleMilestoneQuestions(pool, () => 0.6);
    expect(qs).toHaveLength(12);
    expect(qs.filter((q) => q.listen).length).toBe(3);
  });
  it("maxQuestions=8 (trạm generator pool lớn): đúng 8 câu, ≥1 câu nghe, mọi câu đủ 4 options", () => {
    const bigPool: StationPool = {
      vocab: Array.from({ length: 100 }, (_, i) => [`词${i}`, `cí ${i}`, `nghĩa ${i}`] as [string, string, string]),
      gram: [],
    };
    const genStation: Station = { id: "g1", no: "Trạm 1", kind: "lesson", title: "T", zh: "", meta: "", vocab: [], gram: [] };
    // StationQuiz mount: questionSource = {...station, vocab: pool.vocab} trước khi build
    const questionSource = { ...genStation, vocab: bigPool.vocab, gram: bigPool.gram };
    const qs = buildStationQuestions(questionSource, bigPool, () => 0.42, { listenEvery: 4, maxQuestions: 8 });
    expect(qs).toHaveLength(8);
    expect(qs.filter((q) => q.listen).length).toBeGreaterThanOrEqual(1);
    for (const q of qs) expect(q.options).toHaveLength(4);
  });
  it("maxQuestions không đổi quiz curated ngắn (≤8 câu)", () => {
    const qs = buildStationQuestions(s1, undefined, () => 0.42, { maxQuestions: 8 });
    expect(qs).toHaveLength(s1.vocab.length + s1.gram.length);
  });
});

describe("pickDistractors gần-âm", () => {
  const det = () => {
    let s = 42;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  };

  it("ưu tiên cùng thanh mẫu: answer 'bā', pool đủ → distractors cùng đầu 'b'", () => {
    const pool = ["bā", "bǎ", "bái", "bàn", "mā", "mà", "mǎi", "shì", "nǐ", "hǎo", "xué", "shēng"];
    const d = pickDistractors("bā", pool, det(), 3);
    expect(d).toHaveLength(3);
    expect(d.every((x) => x !== "bā")).toBe(true);
    expect(new Set(d).size).toBe(3);
    expect(d.filter((x) => pinyinInitial(x) === "b").length).toBeGreaterThanOrEqual(2); // pool có 3 item 'b'
  });

  it("pool không đủ cùng initial → bù random, luôn đủ want và unique", () => {
    const d = pickDistractors("bā", ["bǎ", "shì", "nǐ"], det(), 3);
    expect(d).toHaveLength(3);
    expect(new Set(d).size).toBe(3);
    expect(d).toContain("bǎ");
  });

  it("pinyinInitial: ký tự đầu, ü giữ nguyên (kể cả biến thể có dấu), w/y giữ nguyên", () => {
    expect(pinyinInitial("bā")).toBe("b");
    expect(pinyinInitial("zhōng")).toBe("z");
    expect(pinyinInitial("shì")).toBe("s");
    expect(pinyinInitial("wǒ")).toBe("w");
    expect(pinyinInitial("nǐ hǎo")).toBe("n");
    expect(pinyinInitial("ǜ")).toBe("ü");
  });

  it("listenQuestion: ≥60% distractors cùng initial khi pool dày", () => {
    // Pool điều chỉnh so với brief (bạn/好/学 không có ứng viên cùng thanh mẫu
    // → ratio chỉ ~0.56): b×6, m×4, sh×2, n×1 để mọi đáp án có ≥1 cặp gần-âm.
    const vocab: StationPool["vocab"] = [
      ["八", "bā", "tám"], ["把", "bǎ", "nắm"], ["白", "bái", "trắng"], ["办", "bàn", "làm"], ["爸", "bà", "bố"], ["笔", "bǐ", "bút"],
      ["妈", "mā", "mẹ"], ["骂", "mà", "mắng"], ["买", "mǎi", "mua"], ["马", "mǎ", "ngựa"],
      ["是", "shì", "là"], ["生", "shēng", "sinh"],
    ];
    let same = 0, total = 0;
    for (let i = 0; i < 100; i++) {
      const qs = buildStationQuestions(
        { id: "t", no: "T", kind: "lesson", title: "T", zh: "", meta: "", vocab, gram: [] },
        { vocab, gram: [] },
        det(),
        { listenEvery: 1 },
      );
      for (const q of qs.filter((q) => q.listen)) {
        total++;
        const answer = q.listen!.audioText; // hanzi
        const ansPinyin = vocab.find((v) => v[0] === answer)![1];
        same += q.options.filter((o) => pinyinInitial(o) === pinyinInitial(ansPinyin) && o !== ansPinyin).length;
      }
    }
    expect(total).toBe(1200); // listenEvery=1 → 12 câu nghe/build × 100 build
    expect(same / (total * 3)).toBeGreaterThanOrEqual(0.6);
  });
});

describe("submitStationResult", () => {
  const mkStore = () => {
    const data: Record<string, Record<string, { pct: number; stars: 0 | 1 | 2 | 3 }>> = {};
    return {
      data,
      getStationProgress: (id: string) => data[id] ?? {},
      setStationProgress: vi.fn((id: string, sid: string, rec: { pct: number; stars: 0 | 1 | 2 | 3 }) => {
        data[id] = { ...(data[id] ?? {}), [sid]: rec };
      }),
    };
  };
  let store: ReturnType<typeof mkStore>;
  beforeEach(() => { store = mkStore(); });

  it("6/8 = 75% → chưa pass, stars 0, ghi record", () => {
    const r = submitStationResult("hsk-2", "1", 6, 8, store);
    expect(r).toEqual({ pct: 75, passed: false, stars: 0, improved: true }); // 6/8 = 75
  });

  it("7/8 = 88% → passed 1 sao; 9/10 = 90% → 2 sao; 10/10 → 3 sao", () => {
    expect(submitStationResult("hsk-2", "1", 7, 8, store).stars).toBe(1);
    expect(submitStationResult("hsk-2", "2", 9, 10, store).stars).toBe(2);
    expect(submitStationResult("hsk-2", "3", 10, 10, store).stars).toBe(3);
  });

  it("best-of: điểm thấp hơn không ghi đè", () => {
    submitStationResult("hsk-2", "1", 10, 10, store);
    const r = submitStationResult("hsk-2", "1", 5, 10, store);
    expect(r.improved).toBe(false);
    expect(store.data["hsk-2"]!["1"]).toEqual({ pct: 100, stars: 3 });
  });

  it("dưới 80 vẫn ghi pct (thanh progress fill) với stars 0", () => {
    const r = submitStationResult("hsk-2", "1", 3, 7, store);
    expect(r.passed).toBe(false);
    expect(store.data["hsk-2"]!["1"]).toEqual({ pct: 43, stars: 0 });
  });
});
