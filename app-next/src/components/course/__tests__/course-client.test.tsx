import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CourseClient from "../course-client";

const openLogin = vi.fn();
const speak = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams("skill=grammar"),
  usePathname: () => "/course/hsk1"
}));

vi.mock("@/components/shell/login-modal", () => ({
  useLoginModal: () => ({ openLogin }),
  useMockLogin: () => ({ loggedIn: localStorage.getItem("nhai.mockLogin") === "1" })
}));

vi.mock("@/lib/tts/use-tts", () => ({
  useTts: () => ({ speak })
}));

beforeEach(() => {
  localStorage.clear();
  openLogin.mockClear();
  speak.mockClear();
});

afterEach(cleanup);

describe("CourseClient grammar card (SPEC-15 §3, fix round 1)", () => {
  it("chưa login: click 🔊 mở Login modal, không speak", async () => {
    render(<CourseClient slug="hsk1" />);
    await userEvent.click(screen.getAllByRole("button", { name: "Đọc mẫu" })[0]);
    expect(openLogin).toHaveBeenCalledOnce();
    expect(speak).not.toHaveBeenCalled();
  });

  it("đã login: click 🔊 gọi speak(title, zh-CN)", async () => {
    localStorage.setItem("nhai.mockLogin", "1");
    render(<CourseClient slug="hsk1" />);
    await userEvent.click(screen.getAllByRole("button", { name: "Đọc mẫu" })[0]);
    expect(speak).toHaveBeenCalledWith("Bài 1 — Ngữ pháp", { lang: "zh-CN" });
    expect(openLogin).not.toHaveBeenCalled();
  });
});
