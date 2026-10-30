// src/app/api/v1/reading/__tests__/routes.test.ts
// Test /api/v1/reading/*: mock auth + db (dispatch theo bảng) + mock generateReading.
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const getSession = vi.fn();
const generateReadingMock = vi.fn();

vi.mock("@/lib/auth", () => ({ getAuth: () => ({ api: { getSession } }) }));
vi.mock("@/lib/server/reading-generate", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/reading-generate")>();
  return { ...actual, generateReading: (t: string) => generateReadingMock(t) };
});

import { READING_DAILY_LIMIT, hoChiMinhDay } from "@/lib/server/reading-quota";
import { readingUsage } from "@/lib/db/schema";
import { DraftValidationError } from "@/lib/server/reading-generate";
import { GET as getQuota } from "../quota/route";
import { POST as postGenerate } from "../generate/route";
import { GET as getDrafts } from "../drafts/route";
import { PATCH as patchDraft, DELETE as deleteDraft } from "../drafts/[id]/route";

/* ---- mock db ---- */
type UsageRow = { userId: string; day: string; count: number };
let usageRows: UsageRow[] = [];
const draftRows: Record<string, unknown>[] = [];
let draftInsertCalls = 0;
let updateReturnEmpty = false;
let lastUpdateSet: Record<string, unknown> | null = null;

vi.mock("@/lib/db", () => ({
  createDb: () => ({
    select: () => ({
      from: (table: unknown) => {
        const result = table === readingUsage ? usageRows : draftRows;
        const chain = {
          where: () => chain,
          orderBy: () => Promise.resolve(result),
          then: (
            res: (v: unknown) => unknown,
            rej: (e: unknown) => unknown
          ) => Promise.resolve(result).then(res, rej),
        };
        return chain;
      },
    }),
    insert: (table: unknown) => {
      const run = (v: Record<string, unknown>) => {
        if (table === readingUsage) {
          const row = usageRows.find((r) => r.userId === v.userId && r.day === v.day);
          if (row) row.count += 1;
          else usageRows.push({ userId: v.userId as string, day: v.day as string, count: 1 });
        } else {
          draftRows.push(v);
          draftInsertCalls += 1;
        }
      };
      return {
        values: (v: Record<string, unknown>) => ({
          // Route await trực tiếp values() (draft insert) hoặc qua onConflictDoUpdate
          // (usage upsert) — object phải thenable cho cả hai đường.
          then: (
            res: (x: unknown) => unknown,
            rej: (e: unknown) => unknown
          ) => Promise.resolve().then(() => run(v)).then(res, rej),
          onConflictDoUpdate: () =>
            Promise.resolve().then(() => run(v)),
        }),
      };
    },
    update: () => ({
      set: (v: Record<string, unknown>) => ({
        where: () => ({
          returning: () => {
            lastUpdateSet = v;
            return Promise.resolve(
              updateReturnEmpty ? [] : [{ ...(draftRows[0] ?? { id: "d1" }), ...v }]
            );
          },
        }),
      }),
    }),
  }),
}));

function req(method: string, url: string, body?: unknown) {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }) as unknown as NextRequest;
}
const ctx = (id = "rd_abc123") => ({ params: Promise.resolve({ id }) });
const BASE = "http://localhost:3100/api/v1/reading";

const SAMPLE = "我爱学习中文，每天都很开心。".repeat(9); // ≥100 ký tự, ratio Hán = 1
function makeDoc() {
  return {
    sentences: [
      { zh: "我爱学习中文，每天都很开心。", py: "wǒ ài xuéxí zhōngwén", vi: "Tôi yêu học tiếng Trung." },
      { zh: "中文很难，但是很有意思。", py: "zhōngwén hěn nán", vi: "Tiếng Trung khó nhưng thú vị." },
      { zh: "我会继续努力。", py: "wǒ huì jìxù nǔlì", vi: "Tôi sẽ tiếp tục cố gắng." },
    ],
    vocab: [{ word: "中文", py: "zhōngwén", vi: "tiếng Trung" }],
    questions: [{ q: "q?", qVi: "câu hỏi", options: ["a", "b"], answer: 0, evidence: [{ si: 0, s: 0, e: 2 }] }],
  };
}
const today = () => hoChiMinhDay();

beforeEach(() => {
  vi.clearAllMocks();
  usageRows = [];
  draftRows.length = 0;
  draftInsertCalls = 0;
  updateReturnEmpty = false;
  lastUpdateSet = null;
  getSession.mockResolvedValue({ user: { id: "u1" } });
  generateReadingMock.mockResolvedValue(makeDoc());
});

describe("auth", () => {
  it.each([
    ["generate", () => postGenerate(req("POST", `${BASE}/generate`, { text: SAMPLE }))],
    ["drafts", () => getDrafts(req("GET", `${BASE}/drafts`))],
    ["quota", () => getQuota(req("GET", `${BASE}/quota`))],
    ["patch", () => patchDraft(req("PATCH", `${BASE}/drafts/x`, { title: "t" }), ctx())],
    ["delete", () => deleteDraft(req("DELETE", `${BASE}/drafts/x`), ctx())],
  ])("401 khi guest (%s)", async (_name, call) => {
    getSession.mockResolvedValue(null);
    expect((await call()).status).toBe(401);
  });
});

describe("POST /api/v1/reading/generate", () => {
  it("200 tạo draft + usage+1 + remaining giảm", async () => {
    const res = await postGenerate(req("POST", `${BASE}/generate`, { text: SAMPLE }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.remaining).toBe(READING_DAILY_LIMIT - 1);
    expect(json.draft).toMatchObject({
      textZh: SAMPLE,
      chars: (SAMPLE.match(/\p{Script=Han}/gu) ?? []).length,
      createdAt: expect.any(Number),
      updatedAt: expect.any(Number),
    });
    expect(json.draft.id).toMatch(/^rd_[0-9a-f-]{12}$/);
    expect(json.draft.title).toBe(makeDoc().sentences[0].zh.slice(0, 40));
    expect(json.draft.doc).toMatchObject({ sentences: expect.any(Array) });
    expect(usageRows).toEqual([{ userId: "u1", day: today(), count: 1 }]);
    expect(draftInsertCalls).toBe(1);
  });

  it("validate input fail → 400, không đụng usage, không gọi LLM", async () => {
    const res = await postGenerate(req("POST", `${BASE}/generate`, { text: "太短了" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBeTruthy();
    expect(generateReadingMock).not.toHaveBeenCalled();
    expect(draftInsertCalls).toBe(0);
    expect(usageRows).toEqual([]);
  });

  it("LLM validate fail → 502, usage 0", async () => {
    generateReadingMock.mockRejectedValue(new DraftValidationError("Dữ liệu AI trả về không đúng định dạng"));
    const res = await postGenerate(req("POST", `${BASE}/generate`, { text: SAMPLE }));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toBeTruthy();
    expect(usageRows).toEqual([]);
  });

  it("LLM lỗi khác → 500, usage 0", async () => {
    generateReadingMock.mockRejectedValue(new Error("boom"));
    const res = await postGenerate(req("POST", `${BASE}/generate`, { text: SAMPLE }));
    expect(res.status).toBe(500);
    expect(usageRows).toEqual([]);
  });

  it("đủ limit → 429 kèm nextAt, không gọi LLM", async () => {
    usageRows.push({ userId: "u1", day: today(), count: READING_DAILY_LIMIT });
    const res = await postGenerate(req("POST", `${BASE}/generate`, { text: SAMPLE }));
    expect(res.status).toBe(429);
    const json = await res.json();
    expect(json.nextAt).toBeGreaterThan(Date.now());
    expect(generateReadingMock).not.toHaveBeenCalled();
    expect(draftInsertCalls).toBe(0);
  });
});

describe("GET /api/v1/reading/quota", () => {
  it("shape {used, limit, nextAt}", async () => {
    usageRows.push({ userId: "u1", day: today(), count: 2 });
    const json = await (await getQuota(req("GET", `${BASE}/quota`))).json();
    expect(json).toEqual({
      used: 2,
      limit: READING_DAILY_LIMIT,
      nextAt: expect.any(Number),
    });
    expect(json.nextAt).toBeGreaterThan(Date.now());
  });
  it("chưa dùng → used 0", async () => {
    const json = await (await getQuota(req("GET", `${BASE}/quota`))).json();
    expect(json.used).toBe(0);
  });
});

describe("GET /api/v1/reading/drafts", () => {
  it("trả {drafts: [...]} theo rows", async () => {
    draftRows.push({ id: "rd_1", title: "t", textZh: "x", doc: {}, chars: 1, createdAt: 1, updatedAt: 2, userId: "u1" });
    const json = await (await getDrafts(req("GET", `${BASE}/drafts`))).json();
    expect(json.drafts).toHaveLength(1);
    expect(json.drafts[0]).toMatchObject({ id: "rd_1", title: "t" });
  });
});

describe("PATCH /api/v1/reading/drafts/[id]", () => {
  it("rename ok → title trim + updatedAt mới, trả draft", async () => {
    const before = Date.now() - 10_000;
    draftRows.push({ id: "rd_abc123", title: "cũ", textZh: "x", doc: {}, chars: 1, createdAt: before, updatedAt: before, userId: "u1" });
    const res = await patchDraft(req("PATCH", `${BASE}/drafts/rd_abc123`, { title: "  Tiêu đề mới  " }), ctx());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.draft.title).toBe("Tiêu đề mới");
    expect(lastUpdateSet).toMatchObject({ title: "Tiêu đề mới", updatedAt: expect.any(Number) });
    expect((lastUpdateSet!.updatedAt as number)).toBeGreaterThan(before);
  });

  it.each([
    ["rỗng sau trim", { title: "   " }],
    ["quá 255", { title: "a".repeat(256) }],
    ["thiếu title", {}],
  ])("400 khi title %s", async (_n, body) => {
    const res = await patchDraft(req("PATCH", `${BASE}/drafts/rd_abc123`, body), ctx());
    expect(res.status).toBe(400);
  });

  it("404 khi draft thuộc user khác", async () => {
    updateReturnEmpty = true;
    const res = await patchDraft(req("PATCH", `${BASE}/drafts/rd_khac`, { title: "t" }), ctx());
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/v1/reading/drafts/[id]", () => {
  it("tombstone: set deletedAt + updatedAt, 204", async () => {
    draftRows.push({ id: "rd_abc123", title: "t", textZh: "x", doc: {}, chars: 1, createdAt: 1, updatedAt: 2, userId: "u1" });
    const res = await deleteDraft(req("DELETE", `${BASE}/drafts/rd_abc123`), ctx());
    expect(res.status).toBe(204);
    expect(lastUpdateSet!.deletedAt).toBeGreaterThan(0);
    expect(lastUpdateSet!.updatedAt).toBe(lastUpdateSet!.deletedAt);
  });
  it("404 khi draft thuộc user khác", async () => {
    updateReturnEmpty = true;
    const res = await deleteDraft(req("DELETE", `${BASE}/drafts/rd_khac`), ctx());
    expect(res.status).toBe(404);
  });
});
