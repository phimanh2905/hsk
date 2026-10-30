import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertValidInput,
  DraftValidationError,
  generateReading,
  validateDraftDoc,
  type DraftDoc,
} from "../reading-generate";

const SAMPLE_TEXT =
  "我的家人很喜欢一起吃饭，因为饭菜很香。每天晚上我们都会一起做很多菜，有时候是饺子，有时候是炒面。妈妈做的菜最好吃，爸爸负责洗碗，我负责摆桌子。吃完饭以后，我们常常一起看电视，或者去公园里散步，聊一聊学校里发生的事情。这样的日子很幸福，我希望以后永远都能这样生活下去。";

function validDoc(): DraftDoc {
  return {
    sentences: [
      { zh: "我的家人很喜欢一起吃饭。", py: "wǒ de jiārén hěn xǐhuān yìqǐ chīfàn", vi: "Gia đình tôi rất thích ăn cơm cùng nhau." },
      { zh: "每天晚上我们都会做很多菜。", py: "měitiān wǎnshang wǒmen dōu huì zuò hěn duō cài", vi: "Mỗi tối chúng tôi đều nấu nhiều món." },
      { zh: "妈妈做的菜最好吃。", py: "māma zuò de cài zuì hǎochī", vi: "Món mẹ nấu là ngon nhất." },
    ],
    vocab: [
      { word: "家人", py: "jiārén", vi: "gia đình" },
      { word: "做菜", py: "zuò cài", vi: "nấu ăn" },
      { word: "好吃", py: "hǎochī", vi: "ngon" },
    ],
    questions: [
      { q: "谁做的菜最好吃？", qVi: "Ai nấu món ngon nhất?", options: ["妈妈", "爸爸", "我"], answer: 0, evidence: [{ si: 2, s: 0, e: 4 }] },
      { q: "谁负责洗碗？", qVi: "Ai rửa bát?", options: ["妈妈", "爸爸"], answer: 1, evidence: [{ si: 2, s: 0, e: 4 }] },
      { q: "吃完饭以后他们做什么？", qVi: "Sau khi ăn xong họ làm gì?", options: ["看电视或者散步", "写作业", "睡觉"], answer: 0, evidence: [{ si: 1, s: 0, e: 5 }] },
    ],
  };
}

function llmResponse(content: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content: typeof content === "string" ? content : JSON.stringify(content) } }],
    }),
  } as unknown as Response;
}

describe("assertValidInput", () => {
  it("chấp nhận văn bản hợp lệ", () => {
    expect(() => assertValidInput(SAMPLE_TEXT)).not.toThrow();
  });

  it("quá ngắn", () => {
    expect(() => assertValidInput("我喜欢吃饭")).toThrow("Văn bản quá ngắn (tối thiểu 100 ký tự)");
  });

  it("quá dài", () => {
    expect(() => assertValidInput("今天天气很好。" + "我们去了很多地方看风景。" .repeat(300))).toThrow(
      "Văn bản quá dài (tối đa 3000 ký tự)"
    );
  });

  it("ratio Hán < 0.3", () => {
    const mostlyLatin = "a".repeat(80) + "b".repeat(40) + "中".repeat(2);
    expect(() => assertValidInput(mostlyLatin)).toThrow("Văn bản chưa đủ tiếng Trung");
  });
});

describe("validateDraftDoc", () => {
  it("chấp nhận doc hợp lệ", () => {
    expect(validateDraftDoc(validDoc(), SAMPLE_TEXT)).toEqual(validDoc());
  });

  it("throw khi raw không phải object", () => {
    expect(() => validateDraftDoc(null, SAMPLE_TEXT)).toThrow(DraftValidationError);
    expect(() => validateDraftDoc("nope", SAMPLE_TEXT)).toThrow(DraftValidationError);
  });

  it("throw khi sentences ít hơn 3", () => {
    const doc = validDoc();
    doc.sentences = doc.sentences.slice(0, 2);
    expect(() => validateDraftDoc(doc, SAMPLE_TEXT)).toThrow(/câu/);
  });

  it("throw khi thiếu py ở một câu (zh/py/vi không cùng độ dài)", () => {
    const doc = validDoc();
    const raw = {
      sentences: doc.sentences.map((s, i) => (i === 1 ? { zh: s.zh, vi: s.vi } : s)),
      vocab: doc.vocab,
      questions: doc.questions,
    };
    expect(() => validateDraftDoc(raw, SAMPLE_TEXT)).toThrow(/zh\/py\/vi/);
  });

  it("throw khi thiếu vi ở một câu", () => {
    const doc = validDoc();
    const raw = {
      sentences: doc.sentences.map((s, i) => (i === 0 ? { zh: s.zh, py: s.py } : s)),
      vocab: doc.vocab,
      questions: doc.questions,
    };
    expect(() => validateDraftDoc(raw, SAMPLE_TEXT)).toThrow(/zh\/py\/vi/);
  });

  it("throw khi câu zh không có chữ Hán", () => {
    const doc = validDoc();
    doc.sentences[0] = { zh: "hello world.", py: "hello", vi: "xin chào" };
    expect(() => validateDraftDoc(doc, SAMPLE_TEXT)).toThrow(/Hán|tiếng Trung/);
  });

  it("throw khi vocab dưới 3", () => {
    const doc = validDoc();
    doc.vocab = doc.vocab.slice(0, 2);
    expect(() => validateDraftDoc(doc, SAMPLE_TEXT)).toThrow(/từ vựng|vocab/i);
  });

  it("throw khi vocab trên 12", () => {
    const doc = validDoc();
    doc.vocab = Array.from({ length: 13 }, (_, i) => ({ word: `词${i}`, py: `c${i}`, vi: `từ ${i}` }));
    expect(() => validateDraftDoc(doc, SAMPLE_TEXT)).toThrow(/từ vựng|vocab/i);
  });

  it("throw khi questions dưới 3", () => {
    const doc = validDoc();
    doc.questions = [];
    expect(() => validateDraftDoc(doc, SAMPLE_TEXT)).toThrow(/câu hỏi|question/i);
  });

  it("throw khi questions trên 5", () => {
    const doc = validDoc();
    doc.questions = Array.from({ length: 6 }, () => doc.questions[0]);
    expect(() => validateDraftDoc(doc, SAMPLE_TEXT)).toThrow(/câu hỏi|question/i);
  });

  it("throw khi options ít hơn 2", () => {
    const doc = validDoc();
    doc.questions[0].options = ["妈妈"];
    expect(() => validateDraftDoc(doc, SAMPLE_TEXT)).toThrow(/đáp án|option|lựa chọn/i);
  });

  it("throw khi options nhiều hơn 4", () => {
    const doc = validDoc();
    doc.questions[0].options = ["a", "b", "c", "d", "e"];
    expect(() => validateDraftDoc(doc, SAMPLE_TEXT)).toThrow(/đáp án|option|lựa chọn/i);
  });

  it("throw khi answer ngoài range", () => {
    const doc = validDoc();
    doc.questions[0].answer = 3;
    expect(() => validateDraftDoc(doc, SAMPLE_TEXT)).toThrow(/đáp án|answer/i);
  });

  it("throw khi evidence si ngoài range câu", () => {
    const doc = validDoc();
    doc.questions[0].evidence = [{ si: 99, s: 0, e: 2 }];
    expect(() => validateDraftDoc(doc, SAMPLE_TEXT)).toThrow(/evidence/i);
  });

  it("throw khi evidence e vượt độ dài câu", () => {
    const doc = validDoc();
    doc.questions[0].evidence = [{ si: 0, s: 0, e: 999 }];
    expect(() => validateDraftDoc(doc, SAMPLE_TEXT)).toThrow(/evidence/i);
  });

  it("throw khi evidence s >= e", () => {
    const doc = validDoc();
    doc.questions[0].evidence = [{ si: 0, s: 3, e: 3 }];
    expect(() => validateDraftDoc(doc, SAMPLE_TEXT)).toThrow(/evidence/i);
  });
});

describe("generateReading với READING_FAKE_LLM=1", () => {
  beforeEach(() => {
    process.env.READING_FAKE_LLM = "1";
  });
  afterEach(() => {
    delete process.env.READING_FAKE_LLM;
  });

  it("trả doc giả pass validate, đúng số câu", async () => {
    const doc = await generateReading(SAMPLE_TEXT);
    expect(validateDraftDoc(doc, SAMPLE_TEXT)).toEqual(doc);
    expect(doc.sentences.length).toBe(5);
    expect(doc.sentences[0].zh).toContain("我的家人");
    expect(doc.vocab.length).toBeGreaterThanOrEqual(3);
    expect(doc.vocab.length).toBeLessThanOrEqual(12);
    expect(doc.questions.length).toBeGreaterThanOrEqual(3);
    expect(doc.questions.length).toBeLessThanOrEqual(5);
  });

  it("throw assertValidInput trước khi tạo doc", async () => {
    await expect(generateReading("太短了。")).rejects.toThrow("Văn bản quá ngắn (tối thiểu 100 ký tự)");
  });
});

describe("generateReading gọi chatJson (mock fetch)", () => {
  beforeEach(() => {
    process.env.READING_FAKE_LLM = "";
    delete process.env.READING_FAKE_LLM;
    process.env.CONTENT_LLM_BASE_URL = "https://llm.test/v1";
    process.env.CONTENT_LLM_KEY = "key-test";
    process.env.CONTENT_LLM_MODEL = "test-model";
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.CONTENT_LLM_BASE_URL;
    delete process.env.CONTENT_LLM_KEY;
    delete process.env.CONTENT_LLM_MODEL;
  });

  it("thành công ngay lần 1", async () => {
    const fetchMock = vi.fn().mockResolvedValue(llmResponse(validDoc()));
    vi.stubGlobal("fetch", fetchMock);
    const doc = await generateReading(SAMPLE_TEXT);
    expect(doc.sentences).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/chat/completions");
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body.model).toBe("test-model");
    expect(body.temperature).toBe(0.3);
    expect(body.response_format).toEqual({ type: "json_object" });
  });

  it("retry khi JSON lệch schema, thành công lần 2", async () => {
    const bad = llmResponse({ sentences: [], vocab: [], questions: [] });
    const good = llmResponse("```json\n" + JSON.stringify(validDoc()) + "\n```");
    const fetchMock = vi.fn().mockResolvedValueOnce(bad).mockResolvedValueOnce(good);
    vi.stubGlobal("fetch", fetchMock);
    const doc = await generateReading(SAMPLE_TEXT);
    expect(doc.sentences).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const body2 = JSON.parse(((fetchMock.mock.calls[1] as unknown[])[1] as RequestInit).body as string) as {
      messages: { role: string }[];
    };
    expect(body2.messages.length).toBeGreaterThan(2);
    expect(body2.messages.some((m) => m.role === "assistant")).toBe(true);
  });

  it("hết 3 lần thử → DraftValidationError", async () => {
    const bad = llmResponse({ sentences: [], vocab: [], questions: [] });
    const fetchMock = vi.fn().mockResolvedValue(bad);
    vi.stubGlobal("fetch", fetchMock);
    await expect(generateReading(SAMPLE_TEXT)).rejects.toThrow("AI trả về dữ liệu không hợp lệ, thử lại sau");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("thiếu env → NO_LLM", async () => {
    delete process.env.CONTENT_LLM_BASE_URL;
    delete process.env.CONTENT_LLM_KEY;
    delete process.env.CONTENT_LLM_MODEL;
    await expect(generateReading(SAMPLE_TEXT)).rejects.toThrow("NO_LLM");
  });
});
