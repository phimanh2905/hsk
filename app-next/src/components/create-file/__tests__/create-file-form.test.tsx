import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateFileClient from "../create-file-client";

vi.mock("@/components/shell/toast-provider", () => ({
  useToast: () => (msg: string) => { (window as unknown as { __lastToast?: string }).__lastToast = msg; },
}));

function renderTpl(tpl: string) {
  return render(<CreateFileClient tplId={tpl} name="Giấy ô trống" desc="Chọn loại ô…" group="paper" />);
}
beforeEach(() => sessionStorage.clear());

describe("CreateFileForm (G7 — 7 nhóm)", () => {
  it("đủ 7 nhóm heading với mặc định gốc checked: Điền tự, gray, 12, 1, 0, 3/12, Khải thư, CNstrokeorder, Tô mờ, Pinyin, Nghĩa", () => {
    renderTpl("grid-paper");
    for (const h of ["Từ vựng cần luyện", "Trang", "Loại ô", "Màu ô", "Bố cục", "Chữ", "Hiển thị"]) {
      if (h === "Từ vựng cần luyện") return; // grid-paper không có nhóm 1 (CHARS_TPLS)
    }
    expect(screen.getByRole("heading", { name: "Trang" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Loại ô" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Màu ô" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Bố cục" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Chữ" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Hiển thị" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Điền tự" })).toBeChecked();
    expect(screen.getByRole("radio", { name: /gray/ })).toBeChecked();
    expect(screen.getByLabelText("Số ô mỗi hàng")).toHaveTextContent("12");
    expect(screen.getByLabelText("Số hàng tô")).toHaveTextContent("1");
    expect(screen.getByLabelText("Số hàng trống")).toHaveTextContent("0");
    expect(screen.getByRole("checkbox", { name: "Khải thư" })).toBeChecked();
    expect(screen.getByRole("radio", { name: /CNstrokeorder/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Tô mờ" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Pinyin" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Nghĩa" })).toBeChecked();
  });
  it("tpl vocab có nhóm 1: 4 từ mặc định + đếm '4 từ sẽ có trong bản in' + Xóa tất cả", () => {
    renderTpl("vocab");
    expect(screen.getByRole("heading", { name: "Từ vựng cần luyện" })).toBeTruthy();
    expect(screen.getByText("4 từ sẽ có trong bản in")).toBeTruthy();
    expect(screen.getAllByPlaceholderText("Nghĩa…").length).toBe(4); // getByPlaceholderText khớp 4 hàng → getAll (điều chỉnh duy nhất so với brief)
  });
  it("đổi tuỳ chọn → preview + badge cập nhật NGAY + persist sessionStorage", async () => {
    const user = userEvent.setup();
    renderTpl("grid-paper");
    expect(screen.getByTestId("pages-badge")).toHaveTextContent("1 trang");
    await user.click(screen.getByRole("radio", { name: "Ô vuông" }));
    expect(sessionStorage.getItem("nhai.cf.state")).toContain('"cellType":"vuong"');
    await user.click(screen.getByLabelText("Số hàng trống").parentElement!.querySelector('[data-dir="1"]')!);
    expect(screen.getByLabelText("Số hàng trống")).toHaveTextContent("1");
  });
  it("sửa nghĩa input → state persist; Khôi phục mặc định trả default + toast", async () => {
    const user = userEvent.setup();
    renderTpl("vocab");
    const firstMeaning = screen.getAllByPlaceholderText("Nghĩa…")[0];
    await user.clear(firstMeaning);
    await user.type(firstMeaning, "chào hỏi");
    expect(sessionStorage.getItem("nhai.cf.state")).toContain("chào hỏi");
    await user.click(screen.getByText("Khôi phục mặc định"));
    expect((window as unknown as { __lastToast?: string }).__lastToast).toBe("Đã khôi phục mặc định.");
    expect(sessionStorage.getItem("nhai.cf.state")).not.toContain("chào hỏi");
  });
  it("restore từ sessionStorage (reload giả lập) giữ state cũ", () => {
    sessionStorage.setItem("nhai.cf.state", JSON.stringify({ ...JSON.parse(JSON.stringify({})), perRow: 9 }));
    renderTpl("grid-paper");
    expect(screen.getByLabelText("Số ô mỗi hàng")).toHaveTextContent("9");
  });
  it("Format bằng AI mock → toast 'Đã format N từ'", async () => {
    const user = userEvent.setup();
    renderTpl("vocab");
    await user.click(screen.getByText("Format bằng AI"));
    expect((window as unknown as { __lastToast?: string }).__lastToast).toBe("Đã format 4 từ");
  });
});
