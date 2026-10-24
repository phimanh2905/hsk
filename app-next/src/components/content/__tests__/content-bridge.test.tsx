import { describe, it, expect, afterEach, vi } from "vitest";
import { render, act, cleanup } from "@testing-library/react";
import { ContentBridge } from "../content-bridge";
import { getVocabData } from "@/lib/srs-session";
import { loadVocab } from "@/lib/content/vocab-client";

/* Mock loader thay vì fetch — loadVocab cache promise module-level, fetch stub
   bị cache reuse giữa các test (promise lỗi đầu tiên → test sau cũng lỗi). */
vi.mock("@/lib/content/vocab-client", () => ({ loadVocab: vi.fn() }));

const data = { hsk1: { "lesson-1": { words: [] } } };

afterEach(cleanup);

describe("ContentBridge", () => {
  /* srs-session là module singleton (vocabData giữ giữa các test) — case lỗi
     chạy trước để assert null còn đúng ý. */
  it("API lỗi → giữ null, không bắn event", async () => {
    vi.mocked(loadVocab).mockRejectedValueOnce(new Error("HTTP 500"));
    const onTick = vi.fn();
    window.addEventListener("bye:progress", onTick);
    await act(async () => {
      render(<ContentBridge />);
    });
    window.removeEventListener("bye:progress", onTick);
    expect(getVocabData()).toBeNull();
    expect(onTick).not.toHaveBeenCalled();
  });

  it("nạp vocab rồi inject vào srs-session + bắn bye:progress", async () => {
    vi.mocked(loadVocab).mockResolvedValueOnce(data as never);
    const onTick = vi.fn();
    window.addEventListener("bye:progress", onTick);
    await act(async () => {
      render(<ContentBridge />);
    });
    window.removeEventListener("bye:progress", onTick);
    expect(getVocabData()).not.toBeNull();
    expect(onTick).toHaveBeenCalledTimes(1);
  });
});
