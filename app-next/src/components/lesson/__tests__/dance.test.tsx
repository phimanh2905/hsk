import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LessonProvider, type LessonItem } from "../lesson-provider";
import DanceMode from "../modes/dance";

const word: LessonItem = {
  hanzi: "你好", pinyin: "nǐ hǎo", hanViet: "NHĨ HẢO", meaning: "Xin chào", pos: "Cụm từ",
  example: { zh: "李明，你好。", pinyinPerChar: [], vi: "Chào Lý Minh" }, index: 0, itemKey: "hsk1.lesson-1.0",
};

beforeEach(() => localStorage.clear());

describe("DanceMode", () => {
  it("Bắt đầu -> hiện chữ + input; gõ đúng -> emoji nhảy + sang từ kế", async () => {
    const user = userEvent.setup();
    render(<LessonProvider items={[word]} book="hsk1" page="lesson-1"><DanceMode /></LessonProvider>);
    await user.click(screen.getByRole("button", { name: /Bắt đầu/ }));
    expect(screen.getByText("你好")).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText(/Gõ pinyin/), "ni3 hao3");
    await user.keyboard("{Enter}");
    // nhân vật nhảy = icon Music2 trong vùng data-dancers (restyle: emoji → Lucide)
    expect(document.querySelector("[data-dancers] svg")).not.toBeNull();
    expect(screen.getByText(/Hết lượt|1 \/ 1/)).toBeInTheDocument();
  });
  it("3 pill chọn nhạc hiển thị", () => {
    render(<LessonProvider items={[word]} book="hsk1" page="lesson-1"><DanceMode /></LessonProvider>);
    for (const name of ["Làng Lá", "Lãm Làng", "Nhạc của tôi"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });
});
