import { describe, expect, it } from "vitest";
import { diffChars } from "../diff-chars";

const states = (r: ReturnType<typeof diffChars>) => r.marks.map((m) => m.state).join("");

describe("diffChars", () => {
  it("khớp hoàn toàn", () => {
    const r = diffChars("我没你们", "我没你们");
    expect(states(r)).toBe("okokokok");
    expect(r).toMatchObject({ errors: 0, missing: 0, total: 4 });
  });
  it("sai 1 chữ giữa câu", () => {
    const r = diffChars("我妹你们", "我没你们");
    expect(states(r)).toBe("okbadokok");
    expect(r.errors).toBe(1);
    expect(r.missing).toBe(0);
  });
  it("thiếu chữ cuối", () => {
    const r = diffChars("我没你", "我没你们");
    expect(r.missing).toBe(1);
    expect(r.errors).toBe(0);
  });
  it("thừa chữ ở giữa đẩy lệch", () => {
    const r = diffChars("我们没你们", "我没你们");
    // two-pointer: 我 ok, 们 bad (src tiến, want không), 没 ok... — sai >=1, không crash
    expect(r.errors).toBeGreaterThanOrEqual(1);
  });
  it("dấu câu và khoảng trắng của src → skip, không tính lỗi", () => {
    // 我=ok ，=skip 没=ok ' '=skip 你=ok 们=ok 。=skip
    const r = diffChars("我，没 你们。", "我没你们");
    expect(states(r)).toBe("okskipokskipokokskip");
    expect(r.errors).toBe(0);
  });
  it("dấu câu trong want không tính vào total", () => {
    const r = diffChars("我没你们", "我，没你们。");
    expect(r.total).toBe(4);
    expect(r.errors).toBe(0);
  });
  it("NFKC + lowercase: số/chữ full-width và hoa vẫn khớp", () => {
    const r = diffChars("ＡＢ１", "ab1");
    expect(states(r)).toBe("okokok");
  });
  it("pinyin không so được với hán tự → toàn bad + missing = total", () => {
    const r = diffChars("wo mei", "我没你们");
    expect(r.errors).toBe(5); // 6 ký tự ASCII, khoảng trắng skip → 5 bad
    expect(r.missing).toBe(4);
  });
  it("src rỗng → missing = total, marks rỗng", () => {
    const r = diffChars("", "我没你们");
    expect(r.marks).toHaveLength(0);
    expect(r.missing).toBe(4);
  });
  it("want rỗng → mọi ký tự src là bad", () => {
    const r = diffChars("我没", "");
    expect(states(r)).toBe("badbad");
    expect(r.errors).toBe(2);
    expect(r.missing).toBe(0);
  });
  it("thiếu chữ giữa câu (omission) → missing, không ok", () => {
    const r = diffChars("我你们", "我没你们");
    expect(r.errors).toBe(0);
    expect(r.missing).toBe(1);
    // 我=ok, 你=ok (resync), 们=ok — nhưng missing=1 nên tổng thể không "chính xác"
    expect(states(r)).toBe("okokok");
  });
  it("subsequence bỏ 2 chữ giữa (啊离 vs 啊我才离) → vẫn có lỗi", () => {
    const r = diffChars("啊离", "啊我才离");
    // errors=0 nhưng skippedWant=2 không được errors che phủ → missing=2, không pass
    expect(r.errors).toBe(0);
    expect(r.missing).toBe(2);
  });
  it("dấu thanh pinyin (diacritics) bỏ qua qua stripTones", () => {
    const r = diffChars("wǒ měi", "wo mei");
    expect(r.errors).toBe(0);
  });
});
