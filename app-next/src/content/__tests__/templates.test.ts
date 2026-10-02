import { describe, it, expect } from "vitest";
import { fileTemplates, templateGroups, templateById } from "../templates";

describe("fileTemplates (SPEC-16 §A: 9 mẫu / 3 nhóm)", () => {
  it("đủ 9 template với id data gốc, đúng nhóm", () => {
    expect(fileTemplates.map((t) => t.id)).toEqual([
      "stroke-order", "big-char", "vocab", "vocab-check",
      "pinyin-write", "paragraph", "lined-paper", "grid-paper", "cover",
    ]);
    expect(fileTemplates.filter((t) => t.group === "hanzi")).toHaveLength(2);
    expect(fileTemplates.filter((t) => t.group === "vocab")).toHaveLength(3);
    expect(fileTemplates.filter((t) => t.group === "paper")).toHaveLength(4);
  });
  it("mỗi template có thumb SVG inline (không ảnh ngoài) + tên/mô tả giữ nguyên văn", () => {
    for (const t of fileTemplates) {
      expect(t.thumb).toMatch(/^<svg/);
      expect(t.thumb).not.toMatch(/<image|http/);
    }
    expect(templateById("stroke-order")).toMatchObject({
      name: "Luyện viết theo thứ tự nét",
      desc: "Mỗi chữ: ô mẫu đánh số nét → từng bước thêm nét (nét mới tô đỏ) → hàng chữ mờ để tô.",
    });
    expect(templateById("grid-paper")?.name).toBe("Giấy ô trống");
    expect(templateById("nope")).toBeNull();
  });
  it("3 nhóm đúng nhãn SPEC-16", () => {
    expect(templateGroups.map((g) => g.label)).toEqual(["Mẫu chữ Hán", "Mẫu từ vựng", "Đoạn văn & giấy ô"]);
  });
});
