import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ToastProvider } from "@/components/shell/toast-provider";
import AiWidget from "../ai-widget";

const mockUseSession = vi.fn();

vi.mock("@/lib/use-session", () => ({
  useSession: () => mockUseSession(),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} data-testid="next-link">
      {children}
    </a>
  ),
}));

function fetchOk(text: string) {
  return Promise.resolve(
    new Response(JSON.stringify({ text }), { status: 200 })
  );
}

function renderWidget() {
  return render(
    <ToastProvider>
      <AiWidget />
    </ToastProvider>
  );
}

async function openAndAsk(question: string) {
  fireEvent.click(screen.getByRole("button", { name: /Hỏi AI/ }));
  fireEvent.change(screen.getByPlaceholderText("Nhập câu hỏi…"), {
    target: { value: question },
  });
  fireEvent.click(screen.getByRole("button", { name: "Gửi" }));
}

beforeEach(() => {
  localStorage.clear();
  mockUseSession.mockReturnValue({ loggedIn: true, name: "A", image: null, isPending: false, logout: async () => {} });
  vi.stubGlobal(
    "fetch",
    vi.fn(() => fetchOk("Xin chào!"))
  );
});

describe("AiWidget", () => {
  it("user gửi tin → fetch POST /api/ai với lịch sử messages chứa câu hỏi", async () => {
    renderWidget();
    await openAndAsk("HSK 1 học gì?");
    await waitFor(() => expect(fetch).toHaveBeenCalled());

    expect(fetch).toHaveBeenCalledWith(
      "/api/ai",
      expect.objectContaining({ method: "POST" })
    );
    const body = JSON.parse(
      (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body
    );
    expect(body.messages).toEqual([
      { role: "user", content: "HSK 1 học gì?" },
    ]);
  });

  it("response ok → render text reply vào panel; reply sau đó gửi lên dạng assistant", async () => {
    vi.stubGlobal("fetch", vi.fn(() => fetchOk("HSK 1 gồm 500 từ vựng nhé!")));
    renderWidget();
    await openAndAsk("HSK 1 học gì?");
    await waitFor(() =>
      expect(screen.getByText("HSK 1 gồm 500 từ vựng nhé!")).toBeInTheDocument()
    );
    // lịch sử tiếp theo gửi kèm reply dạng assistant (bỏ message chào)
    fireEvent.change(screen.getByPlaceholderText("Nhập câu hỏi…"), {
      target: { value: "Câu 2" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Gửi" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    const body = JSON.parse(
      (fetch as ReturnType<typeof vi.fn>).mock.calls[1][1].body
    );
    expect(body.messages).toEqual([
      { role: "user", content: "HSK 1 học gì?" },
      { role: "assistant", content: "HSK 1 gồm 500 từ vựng nhé!" },
      { role: "user", content: "Câu 2" },
    ]);
  });

  it("res 429 → toast đúng thông báo rate limit", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "rateLimit" }), { status: 429 })
        )
      )
    );
    renderWidget();
    await openAndAsk("Hỏi nhanh");
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Bạn hỏi nhanh quá, chờ chút nhé!"
      )
    );
  });

  it("res 502 → toast trợ lý đang bận", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "upstreamDown" }), { status: 502 })
        )
      )
    );
    renderWidget();
    await openAndAsk("Hỏi");
    await waitFor(() =>
      expect(screen.getByRole("status")).toHaveTextContent(
        "Trợ lý AI đang bận, thử lại sau nhé!"
      )
    );
  });

  it("res 401 → hiện nút mời đăng nhập", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 })
        )
      )
    );
    renderWidget();
    await openAndAsk("Hỏi");
    await waitFor(() =>
      expect(screen.getByText("Đăng nhập để hỏi Tiểu Ngữ")).toBeInTheDocument()
    );
  });

  it("pending=true → hiện bubble '…' thay reply", async () => {
    let resolveFetch: (r: Response) => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            resolveFetch = resolve;
          })
      )
    );
    renderWidget();
    await openAndAsk("Hỏi chậm");
    expect(screen.getByText("…")).toBeInTheDocument();
    resolveFetch(fetchOk("Trả lời"));
    await waitFor(() =>
      expect(screen.getByText("Trả lời")).toBeInTheDocument()
    );
    expect(screen.queryByText("…")).toBeNull();
  });

  it("loggedIn: false → thay input bằng Link đăng nhập, không gọi fetch khi bấm gửi", () => {
    mockUseSession.mockReturnValue({ loggedIn: false, name: "", image: null, isPending: false, logout: async () => {} });
    renderWidget();
    fireEvent.click(screen.getByRole("button", { name: /Hỏi AI/ }));
    expect(screen.queryByPlaceholderText("Nhập câu hỏi…")).toBeNull();
    const link = screen.getByText("Đăng nhập để hỏi Tiểu Ngữ").closest("a");
    expect(link).toHaveAttribute("href", "/login");
    expect(screen.queryByRole("button", { name: "Gửi" })).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});
