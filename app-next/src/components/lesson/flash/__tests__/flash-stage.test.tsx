import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { LessonProvider } from "../../lesson-provider";
import type { LessonItem } from "../../lesson-provider";
import { progressStore } from "@/lib/store/progress-store";
import { Dialog } from "@/components/ui/dialog";
import FlashStage from "../flash-stage";

const items: LessonItem[] = [
  {
    hanzi: "爱好",
    pinyin: "àihào",
    hanViet: "ÁI HẢO",
    meaning: "Sở thích",
    pos: "Danh từ",
    example: { zh: "我的爱好是看书。", pinyinPerChar: [], vi: "Sở thích của tôi là đọc sách." },
    index: 0,
    itemKey: "hsk1.lesson-4.0",
  },
  {
    hanzi: "音乐",
    pinyin: "yīnyuè",
    hanViet: "ÂM NHẠC",
    meaning: "Âm nhạc",
    pos: "Danh từ",
    example: { zh: "她喜欢听音乐。", pinyinPerChar: [], vi: "Cô ấy thích nghe nhạc." },
    index: 1,
    itemKey: "hsk1.lesson-4.1",
  },
];

describe("FlashStage (port main.stage của opendesign lesson.html)", () => {
  beforeEach(() => localStorage.clear());

  it("Review Focus 6: items rỗng → không crash, không render card", () => {
    const { container } = render(
      <LessonProvider items={[]}>
        <FlashStage onRequestExit={vi.fn()} strokeOpen={false} onStrokeOpen={vi.fn()} />
      </LessonProvider>
    );
    expect(container.querySelector('[data-od-id="flashcard"]')).toBeNull();
  });

  it("hotkey Space reveal → phím 1 grade → recordReview + sang từ tiếp", () => {
    const spy = vi.spyOn(progressStore, "recordReview");
    const { container } = render(
      <LessonProvider items={items} book="hsk1" page="lesson-4">
        <FlashStage onRequestExit={vi.fn()} strokeOpen={false} onStrokeOpen={vi.fn()} />
      </LessonProvider>
    );
    act(() => {
      fireEvent.keyDown(window, { key: " " });
    }); // Space → reveal
    expect(
      container.querySelector('[aria-label="Thẻ đã lật, chấm điểm ghi nhớ bên dưới"]')
    ).toBeTruthy();
    act(() => {
      fireEvent.keyDown(window, { key: "1" });
    }); // grade 1 → recordReview + từ tiếp
    expect(spy).toHaveBeenCalledWith("hsk1.lesson-4.0", 1);
    expect(screen.getByText("THẺ 2 / 2")).toBeInTheDocument(); // đã sang từ tiếp
    spy.mockRestore();
  });

  it("phím 3 khi CHƯA reveal → no-op (Review Focus 2, pin từ Task 4)", () => {
    const spy = vi.spyOn(progressStore, "recordReview");
    render(
      <LessonProvider items={items}>
        <FlashStage onRequestExit={vi.fn()} strokeOpen={false} onStrokeOpen={vi.fn()} />
      </LessonProvider>
    );
    act(() => {
      fireEvent.keyDown(window, { key: "3" });
    });
    expect(spy).not.toHaveBeenCalled();
    expect(screen.getByText("THẺ 1 / 2")).toBeInTheDocument();
    spy.mockRestore();
  });

  it("Escape khi không có modal → onRequestExit", () => {
    const onRequestExit = vi.fn();
    render(
      <LessonProvider items={items}>
        <FlashStage onRequestExit={onRequestExit} strokeOpen={false} onStrokeOpen={vi.fn()} />
      </LessonProvider>
    );
    act(() => {
      fireEvent.keyDown(window, { key: "Escape" });
    });
    expect(onRequestExit).toHaveBeenCalled();
  });

  it("đã grade thẻ cuối (done): Space + 1 KHÔNG recordReview lần nữa", () => {
    const spy = vi.spyOn(progressStore, "recordReview");
    render(
      <LessonProvider items={[items[0]]} book="hsk1" page="lesson-4">
        <FlashStage onRequestExit={vi.fn()} strokeOpen={false} onStrokeOpen={vi.fn()} />
      </LessonProvider>
    );
    act(() => {
      fireEvent.keyDown(window, { key: " " });
    });
    act(() => {
      fireEvent.keyDown(window, { key: "3" });
    });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("hsk1.lesson-4.0", 3);
    expect(screen.getByText("HOÀN THÀNH")).toBeInTheDocument();
    spy.mockClear();
    // trước fix: Space set revealed=true rồi "1" grade lại chính từ vừa chấm
    act(() => {
      fireEvent.keyDown(window, { key: " " });
    });
    act(() => {
      fireEvent.keyDown(window, { key: "1" });
    });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("Dialog đang mở: Escape chỉ đóng dialog, KHÔNG kích hoạt onRequestExit", () => {
    const onRequestExit = vi.fn();
    const onClose = vi.fn();
    render(
      <LessonProvider items={items}>
        <FlashStage onRequestExit={onRequestExit} strokeOpen={false} onStrokeOpen={vi.fn()} />
        <Dialog open onClose={onClose} labelledBy="exit-modal-title">
          <h2 id="exit-modal-title">Rời khỏi bài học?</h2>
        </Dialog>
      </LessonProvider>,
    );
    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(onClose).toHaveBeenCalledOnce();
    expect(onRequestExit).not.toHaveBeenCalled();
  });
});
