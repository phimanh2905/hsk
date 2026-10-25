# Wave 0 — Vá journey đang gãy (thuần client) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Làm từng task đúng thứ tự, KHÔNG nhảy cóc; mỗi task kết thúc bằng commit conventional.

**Goal:** Vá 4 journey đang gãy được audit chứng minh — (W0.1) `markPageDone` không bao giờ được gọi → dashboard `lessonsDone` luôn = 0; (W0.2) Hanzi Studio không lưu kết quả quiz viết; (W0.3) sound-rules quiz không lưu điểm; (W0.4) /reading không lưu bài dán. Toàn bộ lưu qua `ProgressStore` (localStorage, key `bye.*`) — thuần client, không đụng D1/better-auth.

**Architecture:** `src/lib/store/progress-store.ts` là điểm truy cập persistence DUY NHẤT. Wave 0 thêm 3 nhóm key mới (`bye.hanzi.quiz`, `bye.soundrules.best`, `bye.reading.drafts`) + wire `markPageDone` (key `bye.pageDone` đã có sẵn) vào đúng 4 điểm tích: `LessonProvider.grade()` (flash deck hết bài), `StudioGrid` quiz `onComplete`, `SoundQuiz` khi trả lời đủ câu, `ReadingClient.createDoc()`. UI hiển thị: badge "đã luyện" trên catalog + trang detail /hanzi/[char], dòng "Kết quả tốt nhất" trên sound-rules, khôi phục bản nháp trên /reading. Store bắn sự kiện `bye:progress` (tiền lệ sẵn) để dashboard tự sync.

**Tech Stack:** Next.js 16 App Router + TypeScript, React 19, vitest + @testing-library/react (jsdom, colocated `*.test.ts(x)`), Playwright e2e (port 3100, `pnpm dev`). Package manager **bắt buộc `pnpm`** (npm làm hỏng node_modules).

**Spec:** /Volumes/samsung512/Code/hsk/docs/superpowers/specs/2026-10-24-hsk15-roadmap-design.md

## Global Constraints

- Làm việc trong `app-next/`. Mọi lệnh chạy từ `app-next/`. **KHÔNG dùng npm** — chỉ `pnpm`.
- KHÔNG sửa `ProgressStoreApi` của method hiện có; chỉ THÊM method/type mới (append cuối interface + class, giữ singleton `progressStore`).
- Mọi read/write localStorage trong store phải bọc try/catch trả mặc định (pattern `readJSON`/`writeJSON` sẵn có — DÙNG lại, đừng tự viết `localStorage.getItem` trong component).
- Component KHÔNG đọc localStorage trực tiếp — luôn qua `progressStore` (ruling đã có trong file store, comment dòng 112-113).
- Ghi store phải `dispatchProgress()` để dashboard/`useHomeSummary` (listener `bye:progress`) tự cập nhật.
- SSR/hydration: state đọc progress chỉ được set sau mount (pattern `useEffect` như `LessonProvider` dòng 82-88).
- Unit test: `pnpm test` (vitest run). E2E: `pnpm test:e2e` (tự khởi `pnpm dev` port 3100 qua `webServer` trong `playwright.config.ts`). KHÔNG chạy `pnpm build`.
- Commit per task, conventional commits (`feat:`, `test:`, `chore:`), làm từ nhánh hiện tại của worker.
- KHÔNG sửa file ngoài danh sách Files của từng task.

## Interfaces Produces (wave sau phụ thuộc — tên CHÍNH XÁC)

Thêm vào `ProgressStoreApi` (`app-next/src/lib/store/progress-store.ts`) và class `ProgressStore`:

```ts
/* Kết quả luyện viết 1 Hán tự (Hanzi Studio draw quiz) — key bye.hanzi.quiz */
export type HanziQuizRec = {
  attempts: number; // tổng số lần hoàn thành quiz
  best: number;     // điểm tốt nhất (0-100, % nét đúng); Wave 0 chưa có score → best giữ 0, wave sau truyền score
  last: number;     // epoch ms lần hoàn thành gần nhất
};

/* Bản nháp bài đọc — key bye.reading.drafts */
export type ReadingDraft = { text: string; at: string }; // at = ISO string

// --- trong interface ProgressStoreApi (append sau setWordNote) ---
getHanziQuiz(ch: string): HanziQuizRec | null;
listHanziQuiz(): Record<string, HanziQuizRec>;
recordHanziQuiz(ch: string, score?: number): void;
getSoundRulesBest(): number;
recordSoundRulesResult(correct: number): void;
getReadingDrafts(): ReadingDraft[];
saveReadingDraft(text: string): void;
```

Lệch tên so với đề xuất ban đầu (đã nêu rõ): `getSoundRulesBest()/setSoundRulesBest(score)` → **`getSoundRulesBest()/recordSoundRulesResult(correct)`** để khớp convention `getPinyinLabBest()/recordPinyinLabResult` (chỉ ghi khi điểm cao hơn). Thêm **`listHanziQuiz()`** (không có trong đề xuất) vì catalog cần map toàn bộ để render badge — component không được lặp localStorage. Method còn lại giữ nguyên tên đề xuất: `getHanziQuiz(char)` / `recordHanziQuiz(char, result?)` (đổi tham số thứ 2 thành `score?: number` — record tự tăng `attempts`/set `last`, wave sau chỉ cần truyền điểm), `getReadingDrafts()/saveReadingDraft(text)`.

W0.1 dùng method CÓ SẴN, không đổi chữ ký: `markPageDone(book: string, page: string)`.

---

## Task 1 — ProgressStore: hanzi quiz (`bye.hanzi.quiz`)

**Files:**
- Modify: `app-next/src/lib/store/progress-store.ts`
- Test: `app-next/src/lib/store/__tests__/progress-store-hanzi-quiz.test.ts` (Create mới)

**Interfaces:** Consumes: helpers `readJSON`/`writeJSON`/`dispatchProgress` (private trong file). Produces: type `HanziQuizRec`, methods `getHanziQuiz(ch)`, `listHanziQuiz()`, `recordHanziQuiz(ch, score?)` (xem Interfaces Produces ở đầu plan).

**Steps:**
- [ ] Viết test fail — tạo `app-next/src/lib/store/__tests__/progress-store-hanzi-quiz.test.ts` (pattern copy từ `progress-store-pinyin-lab.test.ts`):

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { progressStore } from "../progress-store";

describe("progressStore hanzi quiz", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("chưa luyện → getHanziQuiz trả null, listHanziQuiz trả {}", () => {
    expect(progressStore.getHanziQuiz("水")).toBeNull();
    expect(progressStore.listHanziQuiz()).toEqual({});
  });

  it("recordHanziQuiz lần 1: attempts=1, last>0, best=0 khi không truyền score", () => {
    progressStore.recordHanziQuiz("水");
    const rec = progressStore.getHanziQuiz("水");
    expect(rec).not.toBeNull();
    expect(rec!.attempts).toBe(1);
    expect(rec!.best).toBe(0);
    expect(rec!.last).toBeGreaterThan(0);
  });

  it("recordHanziQuiz nhiều lần: attempts tăng, last cập nhật, best giữ max score", () => {
    progressStore.recordHanziQuiz("水", 60);
    expect(progressStore.getHanziQuiz("水")!.best).toBe(60);
    progressStore.recordHanziQuiz("水", 40); // thấp hơn → best giữ 60
    const mid = progressStore.getHanziQuiz("水")!;
    expect(mid.attempts).toBe(2);
    expect(mid.best).toBe(60);
    progressStore.recordHanziQuiz("水", 90);
    const rec = progressStore.getHanziQuiz("水")!;
    expect(rec!.attempts).toBe(3);
    expect(rec!.best).toBe(90);
    expect(rec!.last).toBeGreaterThanOrEqual(mid.last);
  });

  it("listHanziQuiz trả map theo chữ; chữ khác tách record riêng", () => {
    progressStore.recordHanziQuiz("水");
    progressStore.recordHanziQuiz("火", 50);
    const all = progressStore.listHanziQuiz();
    expect(Object.keys(all).sort()).toEqual(["火", "水"]);
    expect(all["火"].best).toBe(50);
    expect(all["水"].best).toBe(0);
  });

  it("JSON hỏng trong localStorage → trả mặc định, không throw", () => {
    localStorage.setItem("bye.hanzi.quiz", "{oops");
    expect(progressStore.listHanziQuiz()).toEqual({});
    expect(progressStore.getHanziQuiz("水")).toBeNull();
  });

  it("record vào key JSON hỏng → tự ghi lại từ {}", () => {
    localStorage.setItem("bye.hanzi.quiz", "not-json");
    progressStore.recordHanziQuiz("口");
    expect(progressStore.getHanziQuiz("口")!.attempts).toBe(1);
  });
});
```

- [ ] Chạy `pnpm test -- progress-store-hanzi-quiz` → verify FAIL (method chưa tồn tại, TS error).
- [ ] Implement — sửa `app-next/src/lib/store/progress-store.ts`:
  - Sau type `WordMeta` (sau dòng 36), thêm:

```ts
/* Kết quả luyện viết 1 Hán tự (Wave 0 W0.2 — Hanzi Studio draw quiz), key bye.hanzi.quiz */
export type HanziQuizRec = {
  attempts: number; // tổng số lần hoàn thành quiz
  best: number;     // điểm tốt nhất 0-100 (% nét đúng); Wave 0 caller chưa truyền score → best 0
  last: number;     // epoch ms lần hoàn thành gần nhất
};
```

  - Trong `interface ProgressStoreApi`, ngay sau dòng `setWordNote(hanzi: string, note: string): void;` (dòng 81), thêm:

```ts
  getHanziQuiz(ch: string): HanziQuizRec | null;
  listHanziQuiz(): Record<string, HanziQuizRec>;
  recordHanziQuiz(ch: string, score?: number): void;
```

  - Trong `class ProgressStore`, ngay sau method `setWordNote` (sau dòng 588, trước dấu `}` đóng class dòng 589), thêm:

```ts
  /* ---------- hanzi quiz (bye.hanzi.quiz — Wave 0 W0.2) ---------- */

  private readHanziQuiz(): Record<string, HanziQuizRec> {
    const v = readJSON<Record<string, HanziQuizRec>>("bye.hanzi.quiz", {});
    return v && typeof v === "object" ? v : {};
  }

  getHanziQuiz(ch: string): HanziQuizRec | null {
    const rec = this.readHanziQuiz()[ch];
    return rec && typeof rec === "object" && typeof rec.attempts === "number" ? rec : null;
  }

  listHanziQuiz(): Record<string, HanziQuizRec> {
    return this.readHanziQuiz();
  }

  recordHanziQuiz(ch: string, score?: number): void {
    if (!ch) return;
    const all = this.readHanziQuiz();
    const cur = all[ch];
    all[ch] = {
      attempts: (typeof cur?.attempts === "number" ? cur.attempts : 0) + 1,
      best: Math.max(typeof cur?.best === "number" ? cur.best : 0, typeof score === "number" && score >= 0 ? score : 0),
      last: Date.now(),
    };
    writeJSON("bye.hanzi.quiz", all);
    dispatchProgress();
  }
```

- [ ] Chạy `pnpm test -- progress-store-hanzi-quiz` → PASS. Chạy `pnpm test` toàn bộ → không test nào đỏ (file khác không phụ thuộc).
- [ ] `pnpm typecheck` → không lỗi mới.
- [ ] Commit: `feat(store): thêm ProgressStore hanzi quiz bye.hanzi.quiz (W0.2)`

## Task 2 — ProgressStore: sound-rules best (`bye.soundrules.best`)

**Files:**
- Modify: `app-next/src/lib/store/progress-store.ts`
- Test: `app-next/src/lib/store/__tests__/progress-store-soundrules.test.ts` (Create mới)

**Interfaces:** Consumes: `readNum`/`writeNum`/`dispatchProgress`. Produces: `getSoundRulesBest(): number`, `recordSoundRulesResult(correct: number): void` (chỉ ghi khi cao hơn, như `recordPinyinLabResult`).

**Steps:**
- [ ] Viết test fail — tạo `app-next/src/lib/store/__tests__/progress-store-soundrules.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { progressStore } from "../progress-store";

describe("progressStore sound rules best", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("mặc định best = 0", () => {
    expect(progressStore.getSoundRulesBest()).toBe(0);
  });

  it("recordSoundRulesResult: ghi khi cao hơn, giữ khi thấp hơn hoặc bằng", () => {
    progressStore.recordSoundRulesResult(3);
    expect(progressStore.getSoundRulesBest()).toBe(3);
    progressStore.recordSoundRulesResult(1);
    expect(progressStore.getSoundRulesBest()).toBe(3);
    progressStore.recordSoundRulesResult(3);
    expect(progressStore.getSoundRulesBest()).toBe(3);
    progressStore.recordSoundRulesResult(5);
    expect(progressStore.getSoundRulesBest()).toBe(5);
  });

  it("điểm âm bỏ qua (không ghi)", () => {
    progressStore.recordSoundRulesResult(-1);
    expect(progressStore.getSoundRulesBest()).toBe(0);
  });
});
```

- [ ] `pnpm test -- progress-store-soundrules` → FAIL.
- [ ] Implement — `app-next/src/lib/store/progress-store.ts`:
  - Interface (tiếp sau 3 method Task 1):

```ts
  getSoundRulesBest(): number;
  recordSoundRulesResult(correct: number): void;
```

  - Class (tiếp sau block hanzi quiz):

```ts
  /* ---------- sound rules best (bye.soundrules.best — Wave 0 W0.3) ---------- */

  getSoundRulesBest(): number {
    return readNum("bye.soundrules.best");
  }

  recordSoundRulesResult(correct: number): void {
    if (correct <= this.getSoundRulesBest()) return;
    writeNum("bye.soundrules.best", correct);
    dispatchProgress();
  }
```

- [ ] `pnpm test -- progress-store-soundrules` → PASS; `pnpm test` toàn bộ xanh; `pnpm typecheck` sạch.
- [ ] Commit: `feat(store): thêm sound rules best bye.soundrules.best (W0.3)`

## Task 3 — ProgressStore: reading drafts (`bye.reading.drafts`)

**Files:**
- Modify: `app-next/src/lib/store/progress-store.ts`
- Test: `app-next/src/lib/store/__tests__/progress-store-reading-drafts.test.ts` (Create mới)

**Interfaces:** Consumes: `readJSON`/`writeJSON`/`dispatchProgress`. Produces: type `ReadingDraft = { text: string; at: string }`, `getReadingDrafts(): ReadingDraft[]` (mới nhất trước, tối đa 5), `saveReadingDraft(text: string): void` (bỏ qua text rỗng/trắng; trùng đúng bài gần nhất → không thêm).

**Steps:**
- [ ] Viết test fail — tạo `app-next/src/lib/store/__tests__/progress-store-reading-drafts.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { progressStore } from "../progress-store";

describe("progressStore reading drafts", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("không có draft → getReadingDrafts trả []", () => {
    expect(progressStore.getReadingDrafts()).toEqual([]);
  });

  it("saveReadingDraft: thêm đầu mảng, mới nhất trước", () => {
    progressStore.saveReadingDraft("第一篇");
    progressStore.saveReadingDraft("第二篇");
    const drafts = progressStore.getReadingDrafts();
    expect(drafts.length).toBe(2);
    expect(drafts[0].text).toBe("第二篇");
    expect(drafts[1].text).toBe("第一篇");
    expect(drafts[0].at).toBeTruthy();
  });

  it("text rỗng hoặc chỉ whitespace → bỏ qua", () => {
    progressStore.saveReadingDraft("   ");
    progressStore.saveReadingDraft("");
    expect(progressStore.getReadingDrafts()).toEqual([]);
  });

  it("dán lại đúng bài gần nhất (trim bằng nhau) → không nhân bản", () => {
    progressStore.saveReadingDraft("同一个内容");
    progressStore.saveReadingDraft("  同一个内容  ");
    const drafts = progressStore.getReadingDrafts();
    expect(drafts.length).toBe(1);
    expect(drafts[0].text).toBe("同一个内容");
  });

  it("giữ tối đa 5 draft, cũ nhất bị đẩy ra", () => {
    for (let i = 1; i <= 7; i++) progressStore.saveReadingDraft(`bài ${i}`);
    const drafts = progressStore.getReadingDrafts();
    expect(drafts.length).toBe(5);
    expect(drafts[0].text).toBe("bài 7");
    expect(drafts[4].text).toBe("bài 3");
  });
});
```

- [ ] `pnpm test -- progress-store-reading-drafts` → FAIL.
- [ ] Implement — `app-next/src/lib/store/progress-store.ts`:
  - Sau type `HanziQuizRec`, thêm:

```ts
/* Bản nháp bài đọc (Wave 0 W0.4 — /reading auto-save), key bye.reading.drafts */
export type ReadingDraft = { text: string; at: string };
```

  - Interface (tiếp sau Task 2):

```ts
  getReadingDrafts(): ReadingDraft[];
  saveReadingDraft(text: string): void;
```

  - Class (tiếp sau block sound rules):

```ts
  /* ---------- reading drafts (bye.reading.drafts — Wave 0 W0.4) ---------- */

  getReadingDrafts(): ReadingDraft[] {
    const v = readJSON<ReadingDraft[]>("bye.reading.drafts", []);
    if (!Array.isArray(v)) return [];
    return v.filter(
      (d): d is ReadingDraft => !!d && typeof d === "object" && typeof d.text === "string" && typeof d.at === "string"
    );
  }

  saveReadingDraft(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    const drafts = this.getReadingDrafts();
    if (drafts[0]?.text === trimmed) return; // dán lại đúng bài gần nhất — không nhân bản
    drafts.unshift({ text: trimmed, at: new Date().toISOString() });
    writeJSON("bye.reading.drafts", drafts.slice(0, 5));
    dispatchProgress();
  }
```

- [ ] `pnpm test -- progress-store-reading-drafts` → PASS; `pnpm test` toàn bộ xanh; `pnpm typecheck` sạch.
- [ ] Commit: `feat(store): thêm reading drafts bye.reading.drafts (W0.4)`

## Task 4 — W0.1: gọi `markPageDone` khi flash deck hoàn thành

Ngưỡng chọn (đã chốt với spec): bài được tính DONE khi learner chấm điểm hết flash deck (mode flash — mode mặc định/mode bắt buộc duy nhất đi đủ cả bài, `grade()` từ cuối → `done=true`). Custom deck (`book`/`page` không truyền) KHÔNG mark — dashboard `lessonsTotal` chỉ đếm pages của `courses`, không tính custom deck. File sửa duy nhất là provider nên cả 6 mode phụ đều được (chung provider).

**Files:**
- Modify: `app-next/src/components/lesson/lesson-provider.tsx` (hàm `grade`, dòng 116-128)
- Test: `app-next/src/components/lesson/__tests__/lesson-provider.test.tsx` (Modify — thêm describe mới)

**Interfaces:** Consumes: `progressStore.markPageDone(book, page)` (có sẵn), `progressStore.getPageDone`, context `LessonProvider` props `book?/page?`. Produces: hành vi side-effect — flash hết bài của `book/page` → key `bye.pageDone` có `"<book>/<page>": 1` → dashboard `readHomeSummary().lessonsDone` đếm được qua `listPageDone()` (không đổi chữ ký gì).

**Steps:**
- [ ] Viết test fail — mở `app-next/src/components/lesson/__tests__/lesson-provider.test.tsx`, append CUỐI FILE (dưới cùng, giữ nguyên phần trên):

```tsx
describe("LessonProvider — markPageDone khi flash deck hoàn thành (W0.1)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function DoneProbe() {
    const { revealed, setRevealed, grade, done } = useLesson();
    return (
      <div>
        <span data-done={String(done)} />
        <button onClick={() => setRevealed(true)}>reveal</button>
        <button onClick={() => grade(3)}>g3</button>
      </div>
    );
  }

  it("chấm từ cuối cùng → bye.pageDone có 'hsk1/lesson-1'", () => {
    const { container } = render(
      <LessonProvider items={items} book="hsk1" page="lesson-1">
        <DoneProbe />
      </LessonProvider>
    );
    act(() => screen.getByText("reveal").click());
    act(() => screen.getByText("g3").click()); // items chỉ có 1 phần tử → grade xong là done
    expect(container.querySelector("[data-done='true']")).toBeTruthy();
    expect(progressStore.getPageDone("hsk1", "lesson-1")).toBe(true);
    expect(progressStore.listPageDone("hsk1")).toContain("hsk1/lesson-1");
  });

  it("chấm giữa bài (chưa hết) → KHÔNG mark", () => {
    const two: LessonItem[] = [
      ...items,
      { ...items[0], index: 1, itemKey: "hsk1.lesson-1.1" },
    ];
    const { container } = render(
      <LessonProvider items={two} book="hsk1" page="lesson-1">
        <DoneProbe />
      </LessonProvider>
    );
    act(() => screen.getByText("reveal").click());
    act(() => screen.getByText("g3").click()); // từ đầu tiên → done=false
    expect(container.querySelector("[data-done='true']")).toBeFalsy();
    expect(progressStore.listPageDone("hsk1")).toEqual([]);
  });

  it("custom deck (không book/page) → không mark, không throw", () => {
    render(
      <LessonProvider items={items}>
        <DoneProbe />
      </LessonProvider>
    );
    act(() => screen.getByText("reveal").click());
    act(() => screen.getByText("g3").click());
    expect(progressStore.listPageDone()).toEqual([]);
  });
});
```

  Lưu ý: file này đã import sẵn `describe/it/expect/vi`, `render/screen/act`, `progressStore`, `LessonProvider/useLesson`, `LessonItem` và có `items` module-scope — chỉ cần thêm `beforeEach` vào import từ "vitest" ở dòng 1 (đổi thành `import { describe, it, expect, vi, beforeEach } from "vitest";`).

- [ ] `pnpm test -- lesson-provider` → verify FAIL (2 case đầu).
- [ ] Implement — sửa `app-next/src/components/lesson/lesson-provider.tsx`, hàm `grade` (dòng 116-128). Thay dòng 126 `if (index >= items.length - 1) setDone(true);` bằng:

```tsx
    if (index >= items.length - 1) {
      setDone(true);
      // W0.1: flash deck hết bài → mark bài done (dashboard lessonsDone đọc bye.pageDone).
      // Custom deck không có book/page → bỏ qua (dashboard lessonsTotal không đếm deck tùy chỉnh).
      if (book && page) progressStore.markPageDone(book, page);
    }
```

  (`book`, `page` là props đã có trong scope của `LessonProvider`; `progressStore` đã import sẵn dòng 10. Không cần thêm vào deps của `useMemo` vì `grade` closure sẽ được tạo lại mỗi render — deps line 152 đã liệt kê đúng các state, closure `book/page` là props bất biến trong đời provider.)

- [ ] `pnpm test -- lesson-provider` → PASS. `pnpm test` toàn bộ xanh (đặc biệt `quiz.test.tsx`, `flash` tests không đụng).
- [ ] `pnpm typecheck` sạch.
- [ ] Commit: `feat(lesson): markPageDone khi flash deck hoàn thành (W0.1)`

## Task 5 — W0.2: StudioGrid ghi `recordHanziQuiz` khi quiz viết hoàn thành

**Files:**
- Modify: `app-next/src/components/hanzi/studio/studio-grid.tsx` (2 chỗ gọi `writer.startQuiz()` — dòng 83 và 98; import)
- Test: `app-next/src/components/hanzi/studio/__tests__/studio-grid.test.tsx` (Modify — thêm describe)

**Interfaces:** Consumes: `progressStore.recordHanziQuiz(ch)` (Task 1), `useWriter().startQuiz(onComplete?)` (chữ ký đã hỗ trợ `onComplete` — xem `use-writer.ts` dòng 20, 52). Produces: hành vi side-effect — hoàn thành quiz draw cho glyph `sel.g` → `bye.hanzi.quiz[sel.g]` attempts +1 (chữ HSK lẫn chữ trong tray lẫn bộ thủ có stroke data đều ghi, vì quiz draw chạy cho mọi `sel.g` có data nét).

**Steps:**
- [ ] Viết test fail — mở `app-next/src/components/hanzi/studio/__tests__/studio-grid.test.tsx`, append CUỐI FILE (file đã có `writerFns` mock `useWriter`, helper `setup`, mock `loadWriterCharData`, `DATA` 3 nét; cần thêm import `progressStore` ở đầu file — thêm dòng `import { progressStore } from "@/lib/store/progress-store";` sau các import hiện có):

```tsx
describe("StudioGrid — recordHanziQuiz khi draw quiz hoàn thành (W0.2)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("draw mode: startQuiz nhận onComplete; gọi onComplete → ghi bye.hanzi.quiz cho sel.g", async () => {
    await setup({ sel: { kind: "char", g: "水" }, mode: "draw" });
    // ready effect đã gọi startQuiz với onComplete
    expect(writerFns.startQuiz).toHaveBeenCalled();
    const onComplete = writerFns.startQuiz.mock.calls[0][0] as (() => void) | undefined;
    expect(typeof onComplete).toBe("function");
    expect(progressStore.getHanziQuiz("水")).toBeNull();
    onComplete!();
    const rec = progressStore.getHanziQuiz("水");
    expect(rec).not.toBeNull();
    expect(rec!.attempts).toBe(1);
  });

  it("watch mode: startQuiz KHÔNG được gọi (không ghi progress)", async () => {
    await setup({ sel: { kind: "char", g: "火" }, mode: "watch" });
    expect(writerFns.startQuiz).not.toHaveBeenCalled();
    expect(progressStore.getHanziQuiz("火")).toBeNull();
  });
});
```

  Chú ý: `writerFns.startQuiz` là `vi.fn()` không nhận đối số — mock hiện tại `startQuiz: vi.fn()`, gọi với callback vẫn ghi lại `mock.calls[0][0]`. Không cần đổi mock.

- [ ] `pnpm test -- studio-grid` → verify FAIL (case 1 fail vì chưa truyền onComplete; case 2 đã pass — chấp nhận, case 1 là test chính).
- [ ] Implement — sửa `app-next/src/components/hanzi/studio/studio-grid.tsx`:
  - Thêm import sau dòng 12 (`import { useWriter } from "./use-writer";`):

```tsx
import { progressStore } from "@/lib/store/progress-store";
```

  - Dòng 83 (ready effect, nhánh draw): thay `writer.startQuiz();` bằng:

```tsx
      writer.startQuiz(() => progressStore.recordHanziQuiz(sel.g));
```

  - Dòng 98 (mode effect, nhánh draw): thay `writer.startQuiz();` bằng:

```tsx
      writer.startQuiz(() => progressStore.recordHanziQuiz(sel.g));
```

  (Cả 2 effect đều đóng trên `sel.g` hiện hành; writer bị `reset()` khi đổi glyph → quiz cũ cancel, onComplete cũ không bắn nữa nên không ghi nhầm chữ khác.)

- [ ] `pnpm test -- studio-grid` → PASS (cả test cũ: mock `startQuiz` không nhận đối số nên không vỡ).
- [ ] `pnpm test` toàn bộ xanh; `pnpm typecheck` sạch.
- [ ] Commit: `feat(hanzi): ghi kết quả quiz viết vào bye.hanzi.quiz (W0.2)`

## Task 6 — W0.2: hiển thị "đã luyện" trên catalog + trang detail

**Files:**
- Modify: `app-next/src/components/hanzi/studio/studio-catalog.tsx` (thêm prop `practiced`, badge trên card chữ HSK)
- Modify: `app-next/src/app/(wide)/hanzi/hanzi-studio.tsx` (state `practiced` + listener `bye:progress`, truyền prop)
- Modify: `app-next/src/app/(wide)/hanzi/[char]/hanzi-detail.tsx` (chip "Đã luyện viết")
- Test: `app-next/src/components/hanzi/studio/__tests__/studio-catalog.test.tsx` (Modify — thêm case)
- Test: `app-next/src/app/(wide)/hanzi/[char]/__tests__/hanzi-detail.test.tsx` (Modify — thêm case)

**Interfaces:** Consumes: `progressStore.listHanziQuiz()` / `getHanziQuiz(char)` (Task 1), event `bye:progress`. Produces: prop `StudioCatalog.practiced?: Record<string, HanziQuizRec>` (import type từ `@/lib/store/progress-store`) — presentational, KHÔNG tự đọc store (giữ contract hiện tại của catalog, comment dòng 3).

**Steps:**
- [ ] Viết test fail — trong `app-next/src/components/hanzi/studio/__tests__/studio-catalog.test.tsx` (đọc file trước, giữ nguyên helper render hiện có), thêm describe dùng chung props render sẵn của file, ví dụ (tên helper/props chỉnh theo file thật — mọi render thêm `practiced`):

```tsx
describe("StudioCatalog — badge đã luyện (W0.2)", () => {
  it("chữ có record trong practiced → hiện badge 'Đã luyện'", () => {
    render(
      <StudioCatalog
        mode="hsk"
        rads={[]}
        chars={[{ ch: "水", py: "shuǐ", level: "HSK 1" } as never]}
        totalLabel="1 chữ HSK · 1 trang"
        page={1}
        pages={1}
        cur="水"
        onSelect={() => {}}
        onPage={() => {}}
        practiced={{ 水: { attempts: 2, best: 0, last: 1 } }}
      />
    );
    expect(screen.getByTestId("practiced-水")).toBeTruthy();
    expect(screen.getByTestId("practiced-水").textContent).toContain("Đã luyện");
  });

  it("chưa luyện → không badge", () => {
    render(
      <StudioCatalog
        mode="hsk"
        rads={[]}
        chars={[{ ch: "水", py: "shuǐ", level: "HSK 1" } as never]}
        totalLabel="1 chữ HSK · 1 trang"
        page={1}
        pages={1}
        cur="水"
        onSelect={() => {}}
        onPage={() => {}}
      />
    );
    expect(screen.queryByTestId("practiced-水")).toBeNull();
  });
});
```

  (Nếu file test hiện tại render `StudioCatalog` bằng một helper/props khác, dùng y nguyên cách render của file và chỉ thêm prop `practiced` — đây là prop optional nên case "chưa luyện" chỉ là render không truyền.)

- [ ] Trong `app-next/src/app/(wide)/hanzi/[char]/__tests__/hanzi-detail.test.tsx` (đọc file trước; file render `HanziDetail` với `char` prop — giữ nguyên cách render của nó), thêm case:

```tsx
it("có record bye.hanzi.quiz cho char → hiện chip 'Đã luyện viết'", () => {
  progressStore.recordHanziQuiz("水");
  render(<HanziDetail char="水" />);
  expect(screen.getByTestId("practiced-detail")).toBeTruthy();
});
```

  (thêm `import { progressStore } from "@/lib/store/progress-store";` và `beforeEach(() => localStorage.clear());` nếu file chưa có.)

- [ ] `pnpm test -- studio-catalog hanzi-detail` → FAIL.
- [ ] Implement `studio-catalog.tsx`:
  - Thêm import sau dòng 5 (`import type { StudioRadical, StudioCharMeta } ...`):

```tsx
import type { HanziQuizRec } from "@/lib/store/progress-store";
```

  - Props: thêm `practiced` vào signature dòng 65-79:

```tsx
export function StudioCatalog({
  mode, rads, chars, totalLabel, page, pages, cur, onSelect, onPage, onModeChange, practiced,
}: {
  /* ...các field giữ nguyên... */
  onModeChange?: (m: "rad" | "hsk") => void;
  /* W0.2: map chữ → HanziQuizRec — cha (hanzi-studio) đọc store, catalog chỉ render. */
  practiced?: Record<string, HanziQuizRec>;
}) {
```

  - Trong nhánh `chars` grid (dòng 133-148), thêm badge dưới dòng level của mỗi card:

```tsx
            {chars.map((c) => (
              <button
                key={c.ch}
                type="button"
                data-od-id={`zcard-${c.ch}`}
                aria-pressed={c.ch === cur}
                onClick={() => onSelect({ kind: "char", g: c.ch })}
                className={cn(CARD_BASE, c.ch === cur ? CARD_ACTIVE : "border-border-subtle")}
              >
                <span className="zh text-[34px] leading-[1.25] text-text-primary">{c.ch}</span>
                <span className="text-[11px] font-bold text-text-secondary">{c.py}</span>
                {practiced?.[c.ch] ? (
                  <span
                    data-testid={`practiced-${c.ch}`}
                    className="text-[9.5px] font-extrabold text-feedback-success"
                  >
                    ✓ Đã luyện
                  </span>
                ) : (
                  <span className="whitespace-nowrap text-[10.5px] text-text-secondary">{c.level}</span>
                )}
              </button>
            ))}
```

  (Khi đã luyện, badge thay dòng level — card không cao thêm, không vỡ grid 4 cột.)

- [ ] Implement `hanzi-studio.tsx`:
  - Thêm import:

```tsx
import { progressStore, type HanziQuizRec } from "@/lib/store/progress-store";
```

  - Trong `HanziStudio()`, sau dòng `const apiRef = ...` (dòng 58):

```tsx
  /* W0.2: trạng thái "đã luyện" — chỉ đọc sau mount (hydration); re-sync khi store bắn bye:progress */
  const [practiced, setPracticed] = useState<Record<string, HanziQuizRec>>({});
  useEffect(() => {
    const sync = () => setPracticed(progressStore.listHanziQuiz());
    sync();
    window.addEventListener("bye:progress", sync);
    return () => window.removeEventListener("bye:progress", sync);
  }, []);
```

  - Truyền prop ở JSX `<StudioCatalog` (dòng 208-219), thêm trước `onModeChange`:

```tsx
            practiced={practiced}
```

- [ ] Implement `hanzi-detail.tsx`:
  - Thêm imports:

```tsx
import { useEffect } from "react"; // gộp vào import useRef, useState dòng 5
import { progressStore, type HanziQuizRec } from "@/lib/store/progress-store";
```

  - Trong `HanziDetail`, sau dòng `const [contains, setContains] = useState(false);` (dòng 69):

```tsx
  /* W0.2: trạng thái "đã luyện viết" — đọc sau mount để tránh lệch hydration */
  const [quizRec, setQuizRec] = useState<HanziQuizRec | null>(null);
  useEffect(() => {
    const sync = () => setQuizRec(progressStore.getHanziQuiz(char));
    sync();
    window.addEventListener("bye:progress", sync);
    return () => window.removeEventListener("bye:progress", sync);
  }, [char]);
```

  - Trong header trung tâm (khối `<div className="flex items-center gap-3 flex-wrap mt-5">`, sau `</IconButton>` dòng 185), thêm:

```tsx
          {quizRec ? (
            <span
              data-testid="practiced-detail"
              className="text-xs font-extrabold text-feedback-success border border-feedback-success rounded-full px-3 py-1"
            >
              ✓ Đã luyện viết · {quizRec.attempts} lần
            </span>
          ) : null}
```

- [ ] `pnpm test -- studio-catalog hanzi-detail` → PASS; `pnpm test` toàn bộ xanh; `pnpm typecheck` sạch.
- [ ] Commit: `feat(hanzi): hiển thị trạng thái đã luyện trên catalog và detail (W0.2)`

## Task 7 — W0.3: SoundQuiz lưu best + hiển thị

**Files:**
- Modify: `app-next/src/components/sound-rules/quiz-client.tsx` (dòng 13-18 state, thêm effect + dòng best)
- Test: `app-next/src/components/sound-rules/__tests__/quiz-client.test.tsx` (Create mới)

**Interfaces:** Consumes: `progressStore.getSoundRulesBest()` / `recordSoundRulesResult(correct)` (Task 2), `soundRulesData.quiz` (5 câu, field `answer`). Produces: side-effect — trả lời đủ `quiz.length` câu → `bye.soundrules.best` = max điểm; dòng `[data-best]` hiển thị best hiện tại.

**Steps:**
- [ ] Viết test fail — tạo `app-next/src/components/sound-rules/__tests__/quiz-client.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import SoundQuiz from "../quiz-client";
import { soundRulesData } from "@/content/soundrules";
import { progressStore } from "@/lib/store/progress-store";

vi.stubGlobal("speechSynthesis", { speak: vi.fn(), cancel: vi.fn(), speaking: false });

beforeEach(() => {
  localStorage.clear();
});

function answerAll(correctIndexes: number[]) {
  soundRulesData.quiz.forEach((q, qi) => {
    const want = correctIndexes.includes(qi) ? q.answer : (q.answer + 1) % q.options.length;
    act(() => screen.getByText(q.options[want]).click());
  });
}

describe("SoundQuiz — lưu best (W0.3)", () => {
  it("trả lời đủ câu → recordSoundRulesResult với số câu đúng", () => {
    render(<SoundQuiz />);
    // câu 0 đúng, còn lại sai
    answerAll([0]);
    expect(progressStore.getSoundRulesBest()).toBe(1);
    expect(screen.getByTestId("sound-quiz-best").textContent).toContain("1/5");
  });

  it("lượt sau điểm thấp hơn → best giữ nguyên", () => {
    const { unmount } = render(<SoundQuiz />);
    answerAll(soundRulesData.quiz.map((_, i) => i)); // 5/5
    unmount();
    expect(progressStore.getSoundRulesBest()).toBe(5);
    render(<SoundQuiz />);
    answerAll([0]); // 1/5
    expect(progressStore.getSoundRulesBest()).toBe(5);
    expect(screen.getByTestId("sound-quiz-best").textContent).toContain("5/5");
  });
});
```

- [ ] `pnpm test -- quiz-client` → FAIL (`sound-quiz-best` chưa tồn tại).
- [ ] Implement — sửa `app-next/src/components/sound-rules/quiz-client.tsx`:
  - Thêm imports đầu file:

```tsx
import { useEffect, useState } from "react";
import { progressStore } from "@/lib/store/progress-store";
```

  (đổi dòng 6 `import { useState } from "react";` thành `useEffect, useState`.)
  - Trong `SoundQuiz()`, sau dòng `const { speak } = useTts();` (dòng 15):

```tsx
  /* W0.3: đủ câu → lưu best; best đọc sau mount + re-sync qua bye:progress */
  const [best, setBest] = useState(0);
  const answered = Object.keys(picked).length;
  useEffect(() => {
    setBest(progressStore.getSoundRulesBest());
  }, []);
  useEffect(() => {
    if (answered === quiz.length) {
      progressStore.recordSoundRulesResult(correct);
      setBest(progressStore.getSoundRulesBest());
    }
  }, [answered, correct]);
```

  - Dòng 86-88, sau thẻ `<p data-quiz-result>...</p>` thêm:

```tsx
      <p className="mt-1 text-xs font-bold text-text-secondary" data-sound-quiz-best>
        Kỷ lục: {best}/{quiz.length} câu đúng
      </p>
```

- [ ] `pnpm test -- quiz-client` → PASS; `pnpm test` toàn bộ xanh; `pnpm typecheck` sạch.
- [ ] Commit: `feat(sound-rules): lưu và hiển thị kỷ lục quiz bye.soundrules.best (W0.3)`

## Task 8 — W0.4: Reading auto-save draft + khôi phục

**Files:**
- Modify: `app-next/src/app/(app)/reading/reading-client.tsx` (`ReadingClientInner` — khôi phục khi mount, lưu trong `createDoc`, sidebar list bản nháp)
- Test: `app-next/src/app/(app)/reading/__tests__/reading-client.test.tsx` (Modify — thêm describe)

**Interfaces:** Consumes: `progressStore.getReadingDrafts()` / `saveReadingDraft(text)` (Task 3). Produces: hành vi — bấm "Tạo bài đọc" thành công → draft lưu (text đã slice ≤3000, `body` sau extractTitle); mount lại → textarea chứa draft mới nhất; sidebar Card "Bản nháp đã lưu" liệt kê tối đa 5 draft, bấm → nạp lại vào textarea + tạo doc.

**Steps:**
- [ ] Viết test fail — mở `reading-client.test.tsx`, append CUỐI FILE (file đã có mock `useSession`, stub `speechSynthesis`, `localStorage.clear()` trong `beforeEach`; import thêm `progressStore` nếu chưa có):

```tsx
describe("ReadingClient — bản nháp tự lưu (W0.4)", () => {
  it("Tạo bài đọc → draft lưu vào bye.reading.drafts", async () => {
    const user = userEvent.setup();
    render(<ReadingClient />);
    await user.type(screen.getByLabelText("Nội dung bài đọc"), "第一篇测试文章。");
    await user.click(screen.getByText("Tạo bài đọc"));
    const drafts = progressStore.getReadingDrafts();
    expect(drafts.length).toBe(1);
    expect(drafts[0].text).toContain("第一篇测试文章");
  });

  it("mount lại → textarea khôi phục draft mới nhất", async () => {
    progressStore.saveReadingDraft("昨天的旧文章。今天很好。");
    progressStore.saveReadingDraft("最新的一篇文章。今天很好。");
    render(<ReadingClient />);
    const input = screen.getByLabelText("Nội dung bài đọc") as HTMLTextAreaElement;
    await waitFor(() => expect(input.value).toBe("最新的一篇文章。今天很好。"));
    expect(screen.getByText("Bản nháp đã lưu")).toBeTruthy();
    expect(screen.getByText("最新的一篇文章。今天很好。")).toBeTruthy();
  });

  it("bấm draft cũ trong sidebar → nạp lại vào textarea", async () => {
    progressStore.saveReadingDraft("文章甲。内容很长很好。");
    progressStore.saveReadingDraft("文章乙。内容也很长。");
    const user = userEvent.setup();
    render(<ReadingClient />);
    await user.click(screen.getByText("文章甲。内容很长很好。"));
    const input = screen.getByLabelText("Nội dung bài đọc") as HTMLTextAreaElement;
    expect(input.value).toBe("文章甲。内容很长很好。");
  });
});
```

  Nếu file chưa import `waitFor` thì thêm vào import `@testing-library/react`.

- [ ] `pnpm test -- reading-client` → FAIL.
- [ ] Implement — sửa `reading-client.tsx` trong `ReadingClientInner`:
  - Thêm import:

```tsx
import { useEffect } from "react"; // đổi dòng 7 thành: import { useEffect, useState } from "react";
import { progressStore, type ReadingDraft } from "@/lib/store/progress-store";
```

  - Trong `ReadingClientInner`, sau `const k = useKaraoke(...)` (dòng 158):

```tsx
  /* W0.4: bản nháp tự lưu — khôi phục sau mount (hydration), sidebar liệt kê để mở lại */
  const [drafts, setDrafts] = useState<ReadingDraft[]>([]);
  useEffect(() => {
    const list = progressStore.getReadingDrafts();
    setDrafts(list);
    if (list[0]) setText(list[0].text);
  }, []);
```

  - Trong `createDoc` (dòng 167-192), sau khi `setDoc({...})` thành công (ngay sau đóng ngoặc `setDoc({ ... });` và TRƯỚC `};` — lưu `sliced` để khớp nội dung đã tạo):

```tsx
    progressStore.saveReadingDraft(sliced);
    setDrafts(progressStore.getReadingDrafts());
```

  - Thêm hàm mở draft (sau `openDemo`):

```tsx
  const openDraft = (d: ReadingDraft) => {
    k.stop();
    setText(syncCounter(d.text));
    createDocFromText(d.text); // tái dùng pipeline tạo doc
  };
```

  - Refactor nhỏ: tách thân `createDoc` hiện có thành 2 hàm để tránh nhân bản logic (giữ hành vi y nguyên, toast "Hãy dán..." chỉ ở `createDoc`):

```tsx
  const createDocFromText = (rawFull: string) => {
    const raw = rawFull.trim();
    if (!raw) return;
    k.stop();
    const sliced = raw.slice(0, MAX);
    const { title, body } = extractTitle(sliced);
    const sentenceMap: Record<string, ReadingSentence> = {};
    readingData.demoDoc.sentences.forEach((s) => {
      sentenceMap[s.zh] = s;
    });
    const sentences = buildSentences(body, sentenceMap);
    if (!sentences.length) return false;
    const isDemoFull = normalize(body) === normalize(zhFull(readingData.demoDoc));
    setDoc({
      title: title || sentences[0].zh,
      meta: `${sentences.length} câu · ${body.length} ký tự`,
      sentences,
      extras: isDemoFull ? readingData.demoDoc : null,
    });
    return true;
  };

  const createDoc = () => {
    if (!text.trim()) {
      toast("Hãy dán văn bản tiếng Trung vào ô trước nhé!");
      return;
    }
    if (createDocFromText(text)) {
      progressStore.saveReadingDraft(text.slice(0, MAX));
      setDrafts(progressStore.getReadingDrafts());
    } else {
      toast("Không tìm thấy câu tiếng Trung nào trong văn bản.");
    }
  };
```

  - Sidebar: trong `<aside>`, GIỮ Card "Bài đọc mẫu", THAY Card `<AccountBox />` (dòng 219-221) bằng:

```tsx
          {drafts.length > 0 && (
            <Card className="p-4">
              <h2 className="font-extrabold mb-2">Bản nháp đã lưu</h2>
              <div className="space-y-1">
                {drafts.map((d, i) => (
                  <button
                    key={`${d.at}-${i}`}
                    type="button"
                    onClick={() => openDraft(d)}
                    className="w-full text-left px-3 py-2.5 rounded-control hover:bg-surface-paper"
                  >
                    <span className="zh font-bold text-sm line-clamp-2">{d.text.slice(0, 60)}</span>
                    <span className="block text-xs text-text-secondary mt-0.5">
                      {new Date(d.at).toLocaleString("vi-VN")}
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          )}
          <Card className="p-4">
            <AccountBox />
          </Card>
```

  (Giữ `AccountBox` — đăng nhập vẫn hiển thị; draft là localStorage, không cần đăng nhập.)

- [ ] `pnpm test -- reading-client` → PASS (cả 3 case cũ không vỡ vì draft rỗng khi `localStorage.clear()`).
- [ ] `pnpm test` toàn bộ xanh; `pnpm typecheck` sạch.
- [ ] Commit: `feat(reading): auto-save và khôi phục bản nháp bye.reading.drafts (W0.4)`

## Task 9 — E2E: markPageDone + hanzi quiz persist

**Files:**
- Test: `app-next/e2e/wave0-journey.spec.ts` (Create mới)

**Interfaces:** Consumes: DOM thật — flash reveal `[data-od-id="reveal-button"]` (`srs-deck.tsx`), nút chấm "Đã thuộc · Tốt" (`srs-deck.tsx` dòng 38), catalog badge `[data-testid^="practiced-"]` (Task 6), detail chip `[data-testid="practiced-detail"]` (Task 6), `[data-sound-quiz-best]` (Task 7), `[data-od-id="decomp"]`. Produces: acceptance test cho W0.1 + W0.2 persist.

**Steps:**
- [ ] Tạo `app-next/e2e/wave0-journey.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

/* Wave 0 acceptance (spec 2026-10-24):
   - W0.1: hoàn thành flash deck → bye.pageDone ghi "hsk1/lesson-1" → dashboard lessonsDone > 0.
   - W0.2: bye.hanzi.quiz persist → catalog badge + detail chip "Đã luyện".
     Quiz thật cần vẽ nét tay → không mô phỏng được bằng chuột đáng tin cậy;
     test persist bằng cách seed localStorage (đúng key/range Task 1) rồi verify UI hiển thị.
   - W0.3: smoke UI quiz (điểm best đã phủ bởi unit test Task 7). */

test("W0.1 — flash deck hoàn thành → bye.pageDone + dashboard lessonsDone", async ({ page }) => {
  await page.goto("/lesson/hsk1/lesson-1", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("flash-stage")).toBeVisible({ timeout: 20_000 });

  // chấm hết deck: lật thẻ → chấm "Đã thuộc · Tốt" → lặp đến khi deck ẩn (done)
  const reveal = page.locator('[data-od-id="reveal-button"]');
  const good = page.getByRole("button", { name: "Đã thuộc · Tốt" });
  for (let i = 0; i < 40; i++) {
    if (!(await reveal.isVisible().catch(() => false))) break; // done=true → SrsDeck unmount
    await reveal.click();
    await good.click();
  }
  // deck ẩn = màn hoàn thành
  await expect(reveal).toHaveCount(0);

  const pageDone = await page.evaluate(() => localStorage.getItem("bye.pageDone"));
  expect(pageDone).toContain("hsk1/lesson-1");

  // dashboard đếm được
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  const lessonsDone = await page.evaluate(() => {
    const map = JSON.parse(localStorage.getItem("bye.pageDone") || "{}") as Record<string, number>;
    return Object.values(map).filter((v) => v === 1).length;
  });
  expect(lessonsDone).toBeGreaterThan(0);
});

test("W0.2 — seed bye.hanzi.quiz → catalog badge 'Đã luyện' và detail chip", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "bye.hanzi.quiz",
      JSON.stringify({ 好: { attempts: 2, best: 0, last: Date.now() } })
    );
  });
  // catalog: tìm chữ 好 qua search (chế độ HSK) — badge phải hiện
  await page.goto("/hanzi", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  const searchInput = page.getByLabel("Tìm bộ thủ");
  await expect(async () => {
    await searchInput.fill("好");
    await expect(page.locator('[data-testid="practiced-好"]')).toBeVisible();
  }).toPass({ timeout: 30_000 });

  // detail /hanzi/好 — chip "Đã luyện viết · 2 lần"
  await page.goto("/hanzi/%E5%A5%BD", { waitUntil: "domcontentloaded" });
  await expect(page.getByTestId("practiced-detail")).toContainText("Đã luyện viết");
  await expect(page.getByTestId("practiced-detail")).toContainText("2 lần");
});

/* W0.3: chọn đáp án SAI hết thì correct=0, recordSoundRulesResult(0) với best=0
   KHÔNG ghi (`correct <= best`) — muốn ghi thì phải chọn ĐÚNG, nhưng e2e không đọc
   được soundRulesData ở client. Quyết định: điểm best đã phủ đủ bởi unit test
   Task 7; e2e chỉ smoke UI (trả lời 1 câu → khóa, không pageerror). */
test("W0.3 smoke — sound-rules quiz chọn đáp án → khóa câu + không lỗi", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  await page.goto("/sound-rules", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  const firstOption = page.locator("div.border.rounded-card.p-3 button").first();
  await firstOption.click();
  await expect(firstOption).toBeDisabled();
  expect(pageErrors).toEqual([]);
});
```

  (Điểm best đã được unit test Task 7 phủ đủ 0-5 câu, đúng/sai, persist.)

- [ ] Chạy `pnpm test:e2e -- wave0-journey` → PASS (cần `pnpm dev` port 3100 tự khởi qua webServer; nếu port bận, kill bằng `lsof -ti:3100 | xargs kill -9`).
- [ ] Chạy toàn bộ e2e `pnpm test:e2e` → mọi spec xanh (đặc biệt `learning-flow.spec.ts` — Task 4 không đổi UI, chỉ thêm side-effect). Unit `pnpm test` vẫn xanh.
- [ ] Commit: `test(e2e): wave0 journey — pageDone, hanzi quiz persist, sound-rules smoke`

---

## Self-review (đã thực hiện khi viết plan)

**Spec coverage Wave 0:**
- W0.1 markPageDone → Task 4 + e2e Task 9 (dashboard `lessonsDone` đọc `listPageDone()` — `home-summary.ts` dòng 85, không cần sửa).
- W0.2 lưu quiz draw + hiển thị catalog/detail → Tasks 1, 5, 6 + e2e Task 9.
- W0.3 lưu điểm best → Tasks 2, 7 (e2e chỉ smoke — điểm đã phủ unit).
- W0.4 auto-save drafts → Task 8 (khôi phục + sidebar; AccountBox giữ nguyên).
- Acceptance "e2e mới cho markPageDone + hanzi quiz persist; toàn bộ test hiện có xanh" → Task 9 + bước chạy full suite ở mỗi task.

**Placeholder scan:** không có "TBD"/"phù hợp"/"tương tự Task N"; mọi test đều là code thật; mọi edit ghi rõ line/mốc và code thay thế hoàn chỉnh.

**Type consistency:** `HanziQuizRec { attempts, best, last }` dùng thống nhất ở Tasks 1, 5 (chỉ `recordHanziQuiz(ch)` — best giữ 0), 6, 9 (seed khớp shape); `ReadingDraft { text, at }` thống nhất ở Tasks 3, 8; `recordSoundRulesResult(correct: number)` thống nhất ở Tasks 2, 7. Props mới đều optional → không vỡ caller hiện có.

**Rủi ro đã ghi rõ:** (a) HanziWriter quiz thật cần vẽ tay → e2e persist bằng seed localStorage (nêu trong comment spec Task 9); (b) ngưỡng W0.1 = flash deck hoàn thành, custom deck không mark — đã ghi quyết định trong Task 4; (c) `soundRulesData.quiz.length` = 5 → `recordSoundRulesResult(0)` không ghi (điều kiện `correct <= best`) — unit test Task 7 đã test đúng hành vi này.
