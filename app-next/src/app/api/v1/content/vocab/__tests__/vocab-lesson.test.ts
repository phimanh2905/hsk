import { describe, expect, it, vi } from "vitest";
const getVocabLesson = vi.fn();
vi.mock("@/lib/content/vocab", () => ({ getVocabLesson: (...a: unknown[]) => getVocabLesson(...a) }));
import { GET } from "@/app/api/v1/content/vocab-lesson/route";

describe("GET /api/v1/content/vocab-lesson", () => {
  it("trả lesson khi đủ book+page", async () => {
    getVocabLesson.mockResolvedValue({ title: "Bài 1", words: [] });
    const res = await GET(new Request("http://x/api?book=hsk1&page=lesson-1"));
    expect(res.status).toBe(200);
    expect((await res.json()).lesson.title).toBe("Bài 1");
  });
  it("thiếu param → 400; không thấy → 404", async () => {
    expect((await GET(new Request("http://x/api"))).status).toBe(400);
    getVocabLesson.mockResolvedValue(null);
    expect((await GET(new Request("http://x/api?book=hsk1&page=lesson-999"))).status).toBe(404);
  });
});
