import { describe, it, expect } from "vitest";
import { normDict } from "../dictation";

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
