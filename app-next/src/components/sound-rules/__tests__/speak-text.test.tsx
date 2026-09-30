import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import SoundRulesPage from "@/app/(app)/sound-rules/page";
import { soundRulesData } from "@/content/soundrules";

const speak = vi.fn();
vi.mock("@/lib/tts/use-tts", () => ({
  useTts: () => ({ speak, speaking: false, cancel: vi.fn() }),
}));

describe("SoundRules TTS ví dụ (D4 fix round 1)", () => {
  it("click ví dụ ở bảng thanh điệu + rules → speak đúng pinyin", () => {
    render(<SoundRulesPage />);
    const ex = soundRulesData.toneRows[0].examples[0]; // 些 ta xiē
    act(() => screen.getByTitle(`Nghe: ${ex[2]}`).click());
    expect(speak).toHaveBeenLastCalledWith(ex[2]);
    const ruleEx = soundRulesData.initialRules[0].examples[1]; // 铁 thiết tiě
    act(() => screen.getByTitle(`Nghe: ${ruleEx[2]}`).click());
    expect(speak).toHaveBeenLastCalledWith(ruleEx[2]);
    // mỗi ví dụ ở bảng thanh điệu + initial + final rules đều là nút speak
    const expected =
      soundRulesData.toneRows.flatMap((r) => r.examples).length +
      soundRulesData.initialRules.flatMap((r) => r.examples).length +
      soundRulesData.finalRules.flatMap((r) => r.examples).length;
    expect(screen.getAllByTitle(/^Nghe: /).length).toBe(expected);
  });
});
