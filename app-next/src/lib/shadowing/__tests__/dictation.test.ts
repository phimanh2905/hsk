import { describe, it, expect } from "vitest";
import { normDict, diffNormalized } from "../dictation";

describe("normDict (chuẩn hoá bỏ dấu cách + dấu thanh)", () => {
  it("bỏ dấu thanh pinyin + khoảng trắng", () => {
    expect(normDict("nǐ hǎo")).toBe("nihao");
    expect(normDict("Wǒ shì qiè nǚ yōuhún.")).toBe("woshiqienvyouhun");
  });
  it("bỏ dấu câu Trung/Anh và ký tự trang trí", () => {
    expect(normDict("退! 退! 退!")).toBe("退退退");
    expect(normDict("师傅, 十万元。")).toBe("师傅十万元");
    expect(normDict("电子遗言? 这么高级啊?")).toBe("电子遗言这么高级啊");
  });
});

describe("diffNormalized (highlight chữ sai)", () => {
  it("đúng hết → mọi ký tự ok", () => {
    const r = diffNormalized("退! 退!", "退 退");
    expect(r.filter((x) => x.ok === false)).toHaveLength(0);
  });
  it("ký tự sai → ok=false, ký tự bị strip → ok=null", () => {
    const r = diffNormalized("师傅, 十万块。", "师傅, 十万元。"); // 块 sai, 元 đúng
    const wrong = r.filter((x) => x.ok === false).map((x) => x.char);
    expect(wrong).toEqual(["块"]);
    expect(r.find((x) => x.char === ",")?.ok).toBeNull();
  });
});
