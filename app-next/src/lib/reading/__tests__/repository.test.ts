import { describe, expect, it } from "vitest";
import { READING_LIB } from "@/content/reading";
import { getArticle, listArticles, recommendedId } from "@/lib/reading/repository";

describe("listArticles", () => {
  it("trả về đúng READING_LIB", () => {
    expect(listArticles()).toEqual(READING_LIB);
  });
});

describe("getArticle", () => {
  it("có id → trả article", () => {
    const a = getArticle("tea");
    expect(a).toBeDefined();
    expect(a?.id).toBe("tea");
    expect(a?.sentences.length).toBeGreaterThan(0);
    expect(a?.quiz.length).toBeGreaterThan(0);
  });

  it("sai id → undefined", () => {
    expect(getArticle("khong-ton-tai")).toBeUndefined();
  });
});

describe("recommendedId", () => {
  const ids = READING_LIB.map((x) => x.id);

  it("chưa đọc gì → bài đầu tiên", () => {
    expect(recommendedId([], {})).toBe(ids[0]);
  });

  it("bài đầu đã đọc → bài unread tiếp theo theo thứ tự LIB", () => {
    expect(recommendedId([], { [ids[0]]: { pct: 100 }, [ids[1]]: { pct: 50 } })).toBe(ids[2]);
  });

  it("pct=0 vẫn tính là unread", () => {
    expect(recommendedId([], { [ids[0]]: { pct: 0 } })).toBe(ids[0]);
  });

  it("bài giữa đã đọc, bài trước đó chưa → vẫn chọn bài trước", () => {
    expect(recommendedId([], { [ids[2]]: { pct: 100 } })).toBe(ids[0]);
  });

  it("tất cả đã đọc → bài đầu tiên", () => {
    const progress = Object.fromEntries(ids.map((id) => [id, { pct: 100 }]));
    expect(recommendedId([], progress)).toBe(ids[0]);
  });
});
