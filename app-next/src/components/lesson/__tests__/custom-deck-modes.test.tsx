import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, act } from "@testing-library/react";
import { ThemeProvider } from "@/components/shell/theme-provider";
import LessonClient from "../lesson-client";
import type { LessonItem } from "../lesson-provider";

/* LessonClient dùng LessonTopbar (useTheme) + ExitModal (useRouter) ở mọi mode */
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

function mount(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

function click(el: HTMLElement) {
  act(() => {
    fireEvent.click(el);
  });
}

/* Fix hasExample (customNoExample — clone/js/lesson.js:66,118): deck không có
   câu ví dụ riêng (example.zh === hanzi fallback) → ẩn mode Reading + Listen
   khỏi sidebar; deck có example → bình thường. */

const withExample: LessonItem = {
  hanzi: "你好",
  pinyin: "nǐ hǎo",
  hanViet: "NHĨ HẢO",
  meaning: "Xin chào",
  pos: "",
  example: { zh: "李明，你好。", pinyinPerChar: [], vi: "Chào Lý Minh" },
  index: 0,
  itemKey: "deck.d1.0",
};

const noExample: LessonItem = {
  ...withExample,
  example: { zh: "你好", pinyinPerChar: [], vi: "Xin chào" }, // fallback zh === hanzi
  itemKey: "deck.d2.0",
};

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("LessonClient hasExample guard (custom deck)", () => {
  it("deck không example riêng → sidebar ẩn Đọc hiểu + Nghe ghép câu, tab Ví dụ trống", () => {
    mount(<LessonClient items={[noExample]} deckName="Bộ của tôi" />);
    expect(screen.queryByRole("button", { name: /Đọc hiểu/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Nghe ghép câu/ })).toBeNull();
    // các mode còn lại vẫn hiện
    expect(screen.getByRole("button", { name: /Flashcard/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Trắc nghiệm/ })).toBeInTheDocument();
    // tab Ví dụ (chỉ có ở mode ≠ flash) không render item không có example riêng
    // (không có card + nút loa câu ví dụ)
    click(screen.getByRole("button", { name: /Gõ từ/ }));
    click(screen.getByRole("button", { name: "Ví dụ" }));
    expect(screen.queryByRole("button", { name: "Phát âm câu ví dụ" })).toBeNull();
  });
  it("deck có example → Reading/Listen vẫn hiện trong sidebar", () => {
    mount(<LessonClient items={[withExample]} deckName="Bộ của tôi" />);
    expect(screen.getByRole("button", { name: /Đọc hiểu/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Nghe ghép câu/ })).toBeInTheDocument();
  });
});

/* Một overlay duy nhất (final review): mở sheet nét chữ rồi bấm X ở topbar không được
   để hai lớp overlay cùng mở — X phải đóng sheet và mở ExitModal. */
describe("LessonClient overlay đơn nhất", () => {
  it("mở sheet nét chữ → bấm X topbar: đóng sheet, mở ExitModal", () => {
    mount(<LessonClient items={[withExample]} deckName="Bộ của tôi" />);
    click(screen.getByRole("button", { name: "Xem nét viết" }));
    expect(screen.getByRole("dialog", { name: "Nét chữ và bút thuận" })).toBeInTheDocument();
    click(screen.getByRole("button", { name: "Thoát bài học" }));
    expect(screen.queryByRole("dialog", { name: "Nét chữ và bút thuận" })).toBeNull();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("mở ExitModal rồi mở sheet → ExitModal đóng, chỉ còn sheet", () => {
    mount(<LessonClient items={[withExample]} deckName="Bộ của tôi" />);
    click(screen.getByRole("button", { name: "Thoát bài học" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    click(screen.getByRole("button", { name: "Ở lại học" }));
    click(screen.getByRole("button", { name: "Xem nét viết" }));
    expect(screen.getByRole("dialog", { name: "Nét chữ và bút thuận" })).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });
});
