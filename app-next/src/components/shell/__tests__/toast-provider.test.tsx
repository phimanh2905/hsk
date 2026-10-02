import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { ToastProvider, useToast } from "../toast-provider";

function Fire() {
  const toast = useToast();
  return <button onClick={() => toast("Đã thêm vào ôn tập")}>fire</button>;
}

describe("useToast", () => {
  it("hiện toast rồi tự ẩn sau 2600ms, chỉ 1 toast tại một thời điểm", () => {
    vi.useFakeTimers();
    render(<ToastProvider><Fire /></ToastProvider>);
    act(() => screen.getByText("fire").click());
    expect(screen.getByText("Đã thêm vào ôn tập")).toBeInTheDocument();
    act(() => screen.getByText("fire").click()); // toast thứ 2 thay thế
    act(() => vi.advanceTimersByTime(2600));
    expect(screen.queryByText("Đã thêm vào ôn tập")).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
