import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LessonProvider } from "../../lesson-provider";
import type { LessonItem } from "../../lesson-provider";
import { Flashcard } from "../flashcard";
import { SrsDeck } from "../srs-deck";

const fullItem: LessonItem = {
  hanzi: "爱好", pinyin: "àihào", hanViet: "ÁI HẢO", meaning: "Sở thích, hứng thú, đam mê", pos: "Danh từ · Động từ",
  example: { zh: "我的爱好是看书和听音乐。", pinyinPerChar: [], vi: "Sở thích của tôi là đọc sách và nghe nhạc." },
  index: 0, itemKey: "hsk1.lesson-4.0",
};
const noExampleItem: LessonItem = {
  ...fullItem, hanzi: "练习", pinyin: "liànxí", index: 1, itemKey: "custom.deck.0",
  example: { zh: "练习", pinyinPerChar: [], vi: "Luyện tập" }, // fallback custom deck (C10): zh === hanzi
};

describe("Flashcard (port article[data-od-id=flashcard] của opendesign lesson.html)", () => {
  beforeEach(() => localStorage.clear());

  it("chưa revealed: counter, glyph hanzi, pinyin; aria-label đúng; example ẩn", () => {
    render(
      <LessonProvider items={[fullItem]}>
        <Flashcard />
      </LessonProvider>
    );
    const card = screen.getByRole("article", { name: "Thẻ ghi nhớ, chạm để xem nghĩa" });
    expect(card).toBeInTheDocument();
    expect(screen.getByText("THẺ 1 / 1")).toBeInTheDocument();
    expect(screen.getByText("爱好")).toHaveClass("hanzi");
    expect(screen.getByText("àihào")).toBeInTheDocument();
    expect(screen.queryByText("我的爱好是看书和听音乐。")).not.toBeInTheDocument();
  });

  it("click card → reveal: meaning + example + hint đổi sang phím 1 2 3", async () => {
    render(
      <LessonProvider items={[fullItem]}>
        <Flashcard />
      </LessonProvider>
    );
    await userEvent.click(screen.getByRole("article"));
    expect(screen.getByText("Sở thích, hứng thú, đam mê")).toBeInTheDocument();
    expect(screen.getByText("我的爱好是看书和听音乐。")).toBeInTheDocument();
    expect(screen.getByText("Sở thích của tôi là đọc sách và nghe nhạc.")).toBeInTheDocument();
    expect(screen.getByRole("article", { name: "Thẻ đã lật, chấm điểm ghi nhớ bên dưới" })).toBeInTheDocument();
    expect(screen.getByText(/Chấm mức độ ghi nhớ bên dưới/)).toBeInTheDocument();
  });

  it("click nút audio KHÔNG reveal, chỉ phát âm (stopPropagation, port e.stopPropagation mockup)", async () => {
    render(
      <LessonProvider items={[fullItem]}>
        <Flashcard />
      </LessonProvider>
    );
    await userEvent.click(screen.getByRole("button", { name: "Phát âm từ vựng" }));
    expect(screen.getByRole("article", { name: "Thẻ ghi nhớ, chạm để xem nghĩa" })).toBeInTheDocument();
    expect(screen.queryByText("Sở thích, hứng thú, đam mê")).not.toBeInTheDocument();
  });

  it("Xem nét viết → onOpenStroke", async () => {
    const onOpenStroke = vi.fn();
    render(
      <LessonProvider items={[fullItem]}>
        <Flashcard onOpenStroke={onOpenStroke} />
      </LessonProvider>
    );
    await userEvent.click(screen.getByRole("button", { name: /Xem nét viết/ }));
    expect(onOpenStroke).toHaveBeenCalled();
  });

  it("Review Focus 4: custom deck không có ví dụ riêng → ẩn example, không crash", async () => {
    render(
      <LessonProvider items={[fullItem, noExampleItem]}>
        <Flashcard />
        <SrsDeck />
      </LessonProvider>
    );
    await userEvent.click(screen.getByRole("article")); // từ 1 có example
    act(() => screen.getAllByRole("button", { name: /Đã thuộc · Tốt/ })[0].click()); // qua từ 2
    expect(screen.getByText("练习")).toBeInTheDocument();
    expect(screen.queryByText("Luyện tập")).not.toBeInTheDocument(); // khối example ẩn
  });

  it("done: thẻ 棒 Hoàn thành + hint Esc, ẩn link nét viết", () => {
    render(
      <LessonProvider items={[fullItem]} >
        <Flashcard />
        <SrsDeck />
      </LessonProvider>
    );
    // ép done qua grade flow
    act(() => screen.getByRole("article").click());
    act(() => screen.getAllByRole("button", { name: /Đã thuộc · Tốt/ })[0].click());
    expect(screen.getByText("棒")).toBeInTheDocument();
    expect(screen.getByText(/Nhấn/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Xem nét viết/ })).not.toBeInTheDocument();
  });
});
