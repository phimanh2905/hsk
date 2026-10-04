# Lesson Flashcard Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port 100% UI của `opendesign_hsk/lesson.html` (flashcard SRS + stroke studio) vào `app-next`, thay mode Flash cũ; 6 mode khác giữ nguyên dưới topbar mới.

**Architecture:** 7 component mới trong `src/components/lesson/flash/` (topbar, flashcard, srs-deck, flash-stage, stroke-studio, exit-modal, shortcuts-modal) + 2 primitive mở rộng (`Progress`, `Dialog`) + `progressStore.recordReview` + mở rộng `lesson-provider`. `hanzi-writer` làm char-data loader; hoạt họa nét port 1:1 dashoffset của mockup.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4 (token `--hz-*` trong `globals.css`), Vitest 5 + RTL, pnpm.

**Spec:** `docs/superpowers/specs/2026-10-04-lesson-flashcard-redesign-design.md` (đọc cùng plan — spec là nguồn chân lý về phạm vi & quyết định).

## Global Constraints

- Package manager **pnpm**; chạy test 1 file: `pnpm exec vitest run <đường-dẫn-file>`; toàn bộ: `pnpm test`; kèm `pnpm typecheck` và `pnpm lint` trước mỗi commit.
- Chỉ dùng token semantic Tailwind (`bg-surface-muted`, `text-text-secondary`, `bg-action-primary`, `bg-amber-wash`, `bg-rose-wash`, `text-learning-mastered`, `border-border-default`…). Cấm hex trong JSX. Raw `var(--…)` chỉ được trong thuộc tính SVG/CSS hoặc giá trị shadow-arbitrary.
- Icon **chỉ** import từ `@/components/ui/icon` (re-export lucide-react) với `strokeWidth={ICON_STROKE}` (hoặc số literal như `2.4` khi mockup ghi rõ) + `aria-hidden="true"`.
- Named export cho mọi component mới (`export function X` / `export default` chỉ cho page-level như `FlashStage`); props là inline type literal, `className?: string` luôn cuối, gộp bằng `cn()` từ `@/lib/cn`.
- Copy UI tiếng Việt; comment tiếng Việt đầu file cite selector mockup (vd `port [data-od-id="flashcard"] của opendesign lesson.html`).
- Mọi giá trị đọc `localStorage` phải nằm trong `useEffect` sau mount (rule hydration của dự án).
- Touch target ≥44px (`min-h-11` hoặc `min-h-10` cho tile 40px vuông).
- Test: Vitest + RTL trong `__tests__/` cạnh component, import `{ describe, it, expect, vi }` từ `"vitest"` tường minh, `it()` tiếng Việt, assert cả role/label/text lẫn token class.
- 1 commit mỗi task, format: `feat(lesson|ui|store): <nội dung> (port <selector mockup>)`.
- Sau Task 12 (xoá code cũ), chạy `pnpm test && pnpm typecheck && pnpm lint` toàn repo phải pass trước khi commit.

## Review Focus

Năm đầu vào/failure mode spec ngầm định nhưng không task test nào cover sẵn — mỗi dòng đã được pin vào task tương ứng bên dưới:

1. **`localStorage` autoplay đọc trước mount** → hydration mismatch. Pin: Task 4, test "autoplay đọc localStorage sau mount".
2. **Grade khi thẻ chưa revealed** (bấm 1/2/3 khi chưa lật) → phải no-op, không ghi SRS không chuyển từ. Pin: Task 4, test "grade chỉ chạy khi revealed".
3. **Thứ tự Escape** (sheet mở → Esc chỉ đóng sheet; modal mở → Esc chỉ đóng modal; không gì mở → mới mở exit modal). Pin: Task 10 test "Escape gọi onClose của sheet" + Task 12 test "FlashStage mở exit modal khi không có modal".
4. **Custom deck không có ví dụ** (`example.zh === hanzi`) → khối example ẩn, không crash. Pin: Task 9, test "ẩn example khi deck không có ví dụ riêng".
5. **`hanzi-writer` load data lỗi / chữ không có data** → nodata state, controls disabled, không crash. Pin: Task 10, test "load data lỗi hiển thị nodata".

---

### Task 1: Progress — thêm `stacked` + `fill` jade

**Files:**
- Modify: `app-next/src/components/ui/progress.tsx`
- Modify: `app-next/src/components/ui/__tests__/progress.test.tsx`

**Interfaces:**
- Consumes: không (primitive).
- Produces: `Progress({ value, max = 100, label?: ReactNode, ariaLabel?, gradient?, stacked?, fill?: "primary" | "jade", className? })` — `stacked`: label trên, track 6px (`h-1.5`) dưới, ẩn %; `fill="jade"`: fill `bg-learning-mastered`. Task 7 (`LessonTopbar`) gọi với `stacked fill="jade" label={<ReactNode>}`.

- [ ] **Step 1: Thêm 2 test mới vào cuối `__tests__/progress.test.tsx`** (giữ nguyên test cũ)

```tsx
it("stacked: label trên track 6px, ẩn %, fill jade (port .progress-zone/.fill lesson.html)", () => {
  render(
    <Progress
      value={8}
      max={15}
      stacked
      fill="jade"
      ariaLabel="Tiến độ từ vựng"
      label={<span>Bài 4 · <b>8/15 từ (53%)</b></span>}
    />
  );
  const bar = screen.getByRole("progressbar", { name: "Tiến độ từ vựng" });
  expect(bar.className).toContain("h-1.5");
  const fill = bar.firstElementChild as HTMLElement;
  expect(fill.className).toContain("bg-learning-mastered");
  expect(fill.style.width).toBe("53%");
  expect(screen.queryByText(/%$/)).not.toBeInTheDocument(); // không render span % riêng
});

it("mặc định giữ hành vi cũ: fill primary, hiện %", () => {
  render(<Progress value={50} ariaLabel="Tiến độ" />);
  const bar = screen.getByRole("progressbar", { name: "Tiến độ" });
  expect(bar.className).toContain("h-2.5");
  expect((bar.firstElementChild as HTMLElement).className).toContain("bg-action-primary");
  expect(screen.getByText("50%")).toBeInTheDocument();
});
```

- [ ] **Step 2: Chạy test xác nhận fail**

Run: `pnpm exec vitest run src/components/ui/__tests__/progress.test.tsx`
Expected: FAIL — 2 it mới (stacked/`h-1.5`/jade chưa tồn tại; `50%` chưa render đúng vì label là string cũ). Nếu test cũ cũng fail → dừng, xem lại Step 3.

- [ ] **Step 3: Sửa `ui/progress.tsx`** — thay toàn bộ file:

```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Progress({
  value,
  max = 100,
  label,
  ariaLabel,
  gradient,
  stacked,
  fill = "primary",
  className,
}: {
  value: number;
  max?: number;
  label?: ReactNode;
  ariaLabel?: string;
  gradient?: boolean;
  /** stacked: label trên, track mảnh dưới, ẩn % (port .progress-zone của opendesign lesson.html) */
  stacked?: boolean;
  /** màu fill: vermilion (mặc định) hoặc jade (port .fill của opendesign lesson.html) */
  fill?: "primary" | "jade";
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0;
  const name = ariaLabel ?? (typeof label === "string" ? label : "") ?? "";
  const fillClass = gradient
    ? "bg-gradient-to-r from-learning-mastered to-action-primary"
    : fill === "jade"
      ? "bg-learning-mastered"
      : "bg-action-primary";
  return (
    <div
      className={cn(
        stacked ? "flex min-w-0 flex-col items-stretch gap-1.5" : "flex items-center gap-3",
        className,
      )}
    >
      {label && stacked && (
        <div className="min-w-0 whitespace-nowrap overflow-hidden text-ellipsis text-xs text-text-secondary">
          {label}
        </div>
      )}
      {label && !stacked && <span className="text-sm text-text-primary">{label}</span>}
      <div
        role="progressbar"
        aria-label={name}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className={cn(
          "relative flex-1 overflow-hidden rounded-full bg-border-subtle",
          stacked ? "h-1.5" : "h-2.5",
        )}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-700", fillClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {label && !stacked && typeof label === "string" && (
        <span className="text-sm font-medium tabular-nums text-text-primary">{pct}%</span>
      )}
    </div>
  );
}
```

Chú ý: % chỉ render khi `label` là string và không `stacked` — hành vi cũ của các chỗ đang gọi với label string không đổi.

- [ ] **Step 4: Chạy test**

Run: `pnpm exec vitest run src/components/ui/__tests__/progress.test.tsx`
Expected: PASS toàn bộ (cũ + mới).

- [ ] **Step 5: Commit**

```bash
git add app-next/src/components/ui/progress.tsx app-next/src/components/ui/__tests__/progress.test.tsx
git commit -m "feat(ui): Progress stacked + fill jade (port .progress-zone/.fill lesson.html)"
```

---

### Task 2: Dialog — thêm prop `role` (alertdialog)

**Files:**
- Modify: `app-next/src/components/ui/dialog.tsx`
- Modify: `app-next/src/components/ui/__tests__/dialog.test.tsx`

**Interfaces:**
- Consumes: không.
- Produces: `Dialog({ open, onClose, labelledBy, role?: "dialog" | "alertdialog", className?, children })` — mặc định `"dialog"`. Task 5 dùng `role="alertdialog"`.

- [ ] **Step 1: Thêm test vào `__tests__/dialog.test.tsx`**

```tsx
it("role=alertdialog render alertdialog (port #exitModal lesson.html)", () => {
  render(
    <Dialog open onClose={vi.fn()} labelledBy="t" role="alertdialog">
      <h2 id="t">Rời khỏi Bài 4?</h2>
    </Dialog>
  );
  expect(screen.getByRole("alertdialog", { name: "Rời khỏi Bài 4?" })).toBeInTheDocument();
});

it("mặc định role=dialog", () => {
  render(
    <Dialog open onClose={vi.fn()} labelledBy="t2">
      <h2 id="t2">X</h2>
    </Dialog>
  );
  expect(screen.getByRole("dialog", { name: "X" })).toBeInTheDocument();
});
```

- [ ] **Step 2: Chạy test xác nhận fail**

Run: `pnpm exec vitest run src/components/ui/__tests__/dialog.test.tsx`
Expected: FAIL it mới thứ nhất (`getByRole("alertdialog")` không tìm thấy — vẫn render `dialog`).

- [ ] **Step 3: Sửa `ui/dialog.tsx`** — thêm `role` vào props và phần tử:

Trong signature thêm `role = "dialog",` sau `labelledBy,`; type thêm `role?: "dialog" | "alertdialog";`. Đổi phần tử trong:

```tsx
      <div
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
```

- [ ] **Step 4: Chạy test**

Run: `pnpm exec vitest run src/components/ui/__tests__/dialog.test.tsx`
Expected: PASS toàn bộ.

- [ ] **Step 5: Commit**

```bash
git add app-next/src/components/ui/dialog.tsx app-next/src/components/ui/__tests__/dialog.test.tsx
git commit -m "feat(ui): Dialog hỗ trợ role alertdialog (port #exitModal lesson.html)"
```

---

### Task 3: `progressStore.recordReview` — 3 mức nhớ SRS

**Files:**
- Modify: `app-next/src/lib/store/progress-store.ts` (interface `ProgressStoreApi` + class `ProgressStore`, khu `/* ---------- SRS ---------- */` sau `countSrsNew()`)
- Modify: `app-next/src/lib/store/__tests__/progress-store.test.ts`

**Interfaces:**
- Consumes: `readSrsItems()` / `writeSrsItems()` / `dispatchProgress()` (private, đã có trong file).
- Produces: `progressStore.recordReview(key: string, grade: 1 | 2 | 3): void` — ghi `SrsItem` với `status`/`dueAt` theo grade. Task 4 gọi `progressStore.recordReview(item.itemKey, level)`.

- [ ] **Step 1: Thêm test vào `__tests__/progress-store.test.ts`** (import `progressStore` theo cách file đang dùng)

```ts
describe("recordReview — chấm điểm SRS từ flashcard (port srs-deck lesson.html)", () => {
  it("grade 1 → learning + due sau 1 phút, tăng reviewCount", () => {
    localStorage.clear();
    progressStore.recordReview("hsk1.lesson-4.0", 1);
    const it = progressStore.getSrs("hsk1.lesson-4.0")!;
    expect(it.status).toBe("learning");
    expect(it.dueAt).toBeGreaterThan(Date.now() + 50_000);
    expect(it.reviewCount).toBe(1);
    expect(it.lastReviewedAt).not.toBeNull();
  });

  it("grade 2 → learning + due sau 5 phút", () => {
    localStorage.clear();
    progressStore.recordReview("hsk1.lesson-4.1", 2);
    const it = progressStore.getSrs("hsk1.lesson-4.1")!;
    expect(it.status).toBe("learning");
    expect(it.dueAt).toBeGreaterThan(Date.now() + 4 * 60_000);
    expect(it.dueAt).toBeLessThan(Date.now() + 6 * 60_000);
  });

  it("grade 3 → learned, dueAt null; review lại từ đã có thì cộng dồn reviewCount", () => {
    localStorage.clear();
    progressStore.recordReview("hsk1.lesson-4.2", 3);
    const it = progressStore.getSrs("hsk1.lesson-4.2")!;
    expect(it.status).toBe("learned");
    expect(it.dueAt).toBeNull();
    progressStore.recordReview("hsk1.lesson-4.2", 1);
    expect(progressStore.getSrs("hsk1.lesson-4.2")!.reviewCount).toBe(2);
  });
});
```

- [ ] **Step 2: Chạy test xác nhận fail**

Run: `pnpm exec vitest run src/lib/store/__tests__/progress-store.test.ts`
Expected: FAIL — `recordReview is not a function`.

- [ ] **Step 3: Implement.** Trong `progress-store.ts`:

(1) Thêm vào interface `ProgressStoreApi` (sau `toggleSrs(key: string): boolean;`):

```ts
  /** Chấm điểm 1 từ từ flashcard SRS (port 3 nút grade của opendesign lesson.html). */
  recordReview(key: string, grade: 1 | 2 | 3): void;
```

(2) Thêm method vào class `ProgressStore`, ngay sau `countSrsNew()`:

```ts
  /* grade 1 → learning + 1 phút · 2 → learning + 5 phút · 3 → learned (port .grades lesson.html) */
  recordReview(key: string, grade: 1 | 2 | 3): void {
    const items = this.readSrsItems();
    const now = Date.now();
    const cur = items[key];
    items[key] = {
      key,
      status: grade === 3 ? "learned" : "learning",
      dueAt: grade === 1 ? now + 60_000 : grade === 2 ? now + 300_000 : null,
      reviewCount: (cur?.reviewCount ?? 0) + 1,
      lastReviewedAt: now,
      updatedAt: now,
    };
    this.writeSrsItems(items);
    dispatchProgress();
  }
```

- [ ] **Step 4: Chạy test**

Run: `pnpm exec vitest run src/lib/store/__tests__/progress-store.test.ts`
Expected: PASS toàn bộ.

- [ ] **Step 5: Commit**

```bash
git add app-next/src/lib/store/progress-store.ts app-next/src/lib/store/__tests__/progress-store.test.ts
git commit -m "feat(store): recordReview 3 mức nhớ SRS (port .grades lesson.html)"
```

---

### Task 4: LessonProvider — thêm `revealed` / `autoplay` / `grade` / `done`

**Files:**
- Modify: `app-next/src/components/lesson/lesson-provider.tsx` (thay toàn bộ)
- Modify: `app-next/src/components/lesson/__tests__/lesson-provider.test.tsx`

**Interfaces:**
- Consumes: `progressStore.recordReview` (Task 3), `useToastSafe()` từ `@/components/shell/toast-provider`.
- Produces (bổ sung vào `useLesson()` context, Task 8/9/12 phụ thuộc):
  - `revealed: boolean`, `setRevealed(v: boolean): void`
  - `autoplay: boolean`, `toggleAutoplay(): void` (persist `nhai.lesson.autoplay`)
  - `grade(level: 1 | 2 | 3): void` — no-op khi `!revealed`; ghi `recordReview`, toast, `setRevealed(false)`, tăng `index`, hết bài → `done`
  - `done: boolean`
  - type export mới: `export type GradeLevel = 1 | 2 | 3;`
  - `setMode` đồng thời reset `revealed`/`done` về false.

- [ ] **Step 1: Thêm test vào `__tests__/lesson-provider.test.tsx`** (file đã có `items`, `Probe`, wrapper mẫu — thêm probe + describe mới)

```tsx
function FlashProbe({ onG }: { onG?: (lv: 1 | 2 | 3) => void }) {
  const { revealed, setRevealed, grade, done, autoplay, toggleAutoplay, index } = useLesson();
  return (
    <div>
      <span data-revealed={revealed} data-done={done} data-autoplay={autoplay} data-index={index} />
      <button onClick={() => setRevealed(true)}>reveal</button>
      <button onClick={() => { grade(1); onG?.(1); }}>g1</button>
      <button onClick={() => toggleAutoplay()}>toggle-auto</button>
    </div>
  );
}

describe("Flash SRS state (port opendesign lesson.html)", () => {
  it("grade chỉ chạy khi revealed: chưa lật → no-op, lật rồi → recordReview + sang từ tiếp", () => {
    const spy = vi.spyOn(progressStore, "recordReview");
    const { container } = render(
      <LessonProvider items={[...items, { ...items[0], index: 1, itemKey: "hsk1.lesson-1.1", hanzi: "再见" }]}>
        <FlashProbe />
      </LessonProvider>
    );
    act(() => screen.getByText("g1").click());
    expect(spy).not.toHaveBeenCalled(); // chưa revealed
    act(() => screen.getByText("reveal").click());
    act(() => screen.getByText("g1").click());
    expect(spy).toHaveBeenCalledWith("hsk1.lesson-1.0", 1);
    expect(container.querySelector("[data-revealed='false']")).toBeTruthy();
    expect(container.querySelector("[data-index='1']")).toBeTruthy();
    spy.mockRestore();
  });

  it("grade từ cuối → done=true và index giữ nguyên", () => {
    const spy = vi.spyOn(progressStore, "recordReview");
    const { container } = render(
      <LessonProvider items={[...items, { ...items[0], index: 1, itemKey: "hsk1.lesson-1.1", hanzi: "再见" }]}>
        <FlashProbe />
      </LessonProvider>
    );
    act(() => screen.getByText("reveal").click());
    act(() => screen.getByText("g1").click()); // từ 1 → index 1
    act(() => screen.getByText("reveal").click());
    act(() => screen.getByText("g1").click()); // từ cuối → done
    expect(container.querySelector("[data-done='true']")).toBeTruthy();
    expect(container.querySelector("[data-index='1']")).toBeTruthy();
    spy.mockRestore();
  });

  it("autoplay đọc localStorage sau mount (không đọc lúc render đầu — hydration)", async () => {
    localStorage.setItem("nhai.lesson.autoplay", "1");
    const { container } = render(
      <LessonProvider items={items}>
        <FlashProbe />
      </LessonProvider>
    );
    expect(container.querySelector("[data-autoplay='false']")).toBeTruthy(); // render đầu = false
    await act(async () => {}); // flush effect
    expect(container.querySelector("[data-autoplay='true']")).toBeTruthy();
    localStorage.removeItem("nhai.lesson.autoplay");
  });

  it("toggleAutoplay persist localStorage", async () => {
    const { container } = render(
      <LessonProvider items={items}>
        <FlashProbe />
      </LessonProvider>
    );
    await act(async () => {}); // mount xong
    act(() => screen.getByText("toggle-auto").click());
    expect(container.querySelector("[data-autoplay='true']")).toBeTruthy();
    expect(localStorage.getItem("nhai.lesson.autoplay")).toBe("1");
    localStorage.removeItem("nhai.lesson.autoplay");
  });
});
```

Lưu ý: `it` thứ 3 dùng `await` → khai báo `it("...", async () => {...})`. Import `progressStore`: `import { progressStore } from "@/lib/store/progress-store";`

- [ ] **Step 2: Chạy test xác nhận fail**

Run: `pnpm exec vitest run src/components/lesson/__tests__/lesson-provider.test.tsx`
Expected: FAIL — TS/property `revealed`, `grade`… không tồn tại trên ctx.

- [ ] **Step 3: Thay toàn bộ `lesson-provider.tsx`:**

```tsx
"use client";

/* LessonProvider (C1) — state machine chế độ học, port clone/js/lesson.js:16-25 (S).
   Bổ sung state flash SRS theo opendesign lesson.html: revealed, autoplay (persist),
   grade 1|2|3 (recordReview vào progress-store) và done (hết bài). */

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { VocabWord } from "@/content/vocab";
import { progressStore } from "@/lib/store/progress-store";
import { useToastSafe } from "@/components/shell/toast-provider";

export type LessonMode = "flash" | "quiz" | "typing" | "reading" | "listen" | "dance" | "battle";

export type LessonItem = VocabWord & { index: number; itemKey: string };

export type KnownFlag = "known" | "unknown";

export type GradeLevel = 1 | 2 | 3;

const AUTOPLAY_KEY = "nhai.lesson.autoplay";

const GRADE_TOAST: Record<GradeLevel, string> = {
  1: "Chưa thuộc — ôn lại sau 1 phút",
  2: "Mơ hồ — ôn lại sau 5 phút",
  3: "Đã thuộc — tuyệt vời!",
};

type LessonCtx = {
  items: LessonItem[];
  book?: string;
  page?: string;
  deckName?: string;
  mode: LessonMode;
  setMode(m: LessonMode): void;
  index: number;
  setIndex(i: number): void;
  known: Record<number, KnownFlag>;
  markKnown(i: number, f: KnownFlag): void;
  revealed: boolean;
  setRevealed(v: boolean): void;
  autoplay: boolean;
  toggleAutoplay(): void;
  grade(level: GradeLevel): void;
  done: boolean;
};

const LessonContext = createContext<LessonCtx | null>(null);

export function useLesson(): LessonCtx {
  const ctx = useContext(LessonContext);
  if (!ctx) throw new Error("useLesson phải dùng trong <LessonProvider>");
  return ctx;
}

export function LessonProvider({
  items,
  book,
  page,
  deckName,
  children,
}: {
  items: LessonItem[];
  book?: string;
  page?: string;
  deckName?: string;
  children: ReactNode;
}) {
  const [mode, setMode] = useState<LessonMode>("flash");
  const [index, setIndex] = useState(0);
  const [known, setKnown] = useState<Record<number, KnownFlag>>({});
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);
  const [autoplay, setAutoplay] = useState(false);
  const toast = useToastSafe();

  // RULING Task 12: đọc localStorage SAU mount (hydration) — render đầu luôn autoplay=false
  useEffect(() => {
    try {
      setAutoplay(localStorage.getItem(AUTOPLAY_KEY) === "1");
    } catch {
      /* silent */
    }
  }, []);

  // persist autoplay, bỏ qua lần mount đầu (tránh ghi đè giá trị đã lưu)
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    try {
      localStorage.setItem(AUTOPLAY_KEY, autoplay ? "1" : "0");
    } catch {
      /* silent */
    }
  }, [autoplay]);

  // RULING Task 12: đổi mode reset index về 0; flash SRS reset luôn revealed/done
  const setModeAndReset = (m: LessonMode) => {
    setMode(m);
    setIndex(0);
    setRevealed(false);
    setDone(false);
  };

  // grade (port grade() của mockup): chỉ khi revealed; hết bài → done
  const grade = (level: GradeLevel) => {
    if (!revealed) return;
    const item = items[index];
    if (!item) return;
    progressStore.recordReview(item.itemKey, level);
    toast(GRADE_TOAST[level]);
    setRevealed(false);
    if (index >= items.length - 1) setDone(true);
    else setIndex(index + 1);
  };

  const toggleAutoplay = () => setAutoplay((v) => !v);

  const value = useMemo<LessonCtx>(
    () => ({
      items,
      book,
      page,
      deckName,
      mode,
      setMode: setModeAndReset,
      index,
      setIndex,
      known,
      markKnown: (i: number, f: KnownFlag) => setKnown((k) => ({ ...k, [i]: f })),
      revealed,
      setRevealed,
      autoplay,
      toggleAutoplay,
      grade,
      done,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, book, page, deckName, mode, index, known, revealed, autoplay, done]
  );

  return <LessonContext.Provider value={value}>{children}</LessonContext.Provider>;
}
```

- [ ] **Step 4: Chạy test**

Run: `pnpm exec vitest run src/components/lesson/__tests__/lesson-provider.test.tsx`
Expected: PASS toàn bộ (cũ + mới).

- [ ] **Step 5: Commit**

```bash
git add app-next/src/components/lesson/lesson-provider.tsx app-next/src/components/lesson/__tests__/lesson-provider.test.tsx
git commit -m "feat(lesson): provider revealed/autoplay/grade/done (port lesson.html state)"
```

---

### Task 5: `Kbd` + `ExitModal`

**Files:**
- Create: `app-next/src/components/lesson/flash/kbd.tsx`
- Create: `app-next/src/components/lesson/flash/exit-modal.tsx`
- Test: `app-next/src/components/lesson/flash/__tests__/exit-modal.test.tsx`

**Interfaces:**
- Consumes: `Dialog` với `role="alertdialog"` (Task 2), `Button`.
- Produces:
  - `export function Kbd({ children, className? }: { children: ReactNode; className?: string })`
  - `export function ExitModal({ open, onClose, lessonTitle, className? }: { open: boolean; onClose: () => void; lessonTitle?: string; className?: string })` — nút "Về lộ trình" gọi `router.push("/roadmap")`. Task 12 mount nó trong `LessonBody`.

- [ ] **Step 1: Viết test `__tests__/exit-modal.test.tsx`**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExitModal } from "../exit-modal";
import { Kbd } from "../kbd";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

describe("ExitModal (port #exitModal của opendesign lesson.html)", () => {
  it("alertdialog confirm thoát với tên bài", () => {
    render(<ExitModal open onClose={vi.fn()} lessonTitle="Bài 4: Sở thích & Thời gian rảnh" />);
    expect(screen.getByRole("alertdialog", { name: "Rời khỏi Bài 4: Sở thích & Thời gian rảnh?" })).toBeInTheDocument();
    expect(screen.getByText(/Tiến độ đã được lưu/)).toBeInTheDocument();
  });

  it("Ở lại học → đóng; Về lộ trình → router.push /roadmap", async () => {
    const onClose = vi.fn();
    render(<ExitModal open onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Ở lại học" }));
    expect(onClose).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Về lộ trình" }));
    expect(push).toHaveBeenCalledWith("/roadmap");
  });

  it("open=false → không render", () => {
    render(<ExitModal open={false} onClose={vi.fn()} />);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});

describe("Kbd (port .hint kbd/.keys kbd)", () => {
  it("kbd viền + nền surface muted", () => {
    const { container } = render(<Kbd>Space</Kbd>);
    const kbd = container.querySelector("kbd")!;
    expect(kbd.textContent).toBe("Space");
    expect(kbd.className).toContain("border-border-default");
    expect(kbd.className).toContain("bg-surface-muted");
  });
});
```

- [ ] **Step 2: Chạy test xác nhận fail**

Run: `pnpm exec vitest run src/components/lesson/flash/__tests__/exit-modal.test.tsx`
Expected: FAIL — không tìm thấy module `../exit-modal` / `../kbd`.

- [ ] **Step 3: Tạo `flash/kbd.tsx`**

```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/* Phím tắt kbd (port .hint kbd + .keys kbd của opendesign lesson.html). */
export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-block font-sans text-[11px] font-bold leading-[1.5] rounded-[5px] border border-border-default bg-surface-muted px-[7px] py-px text-text-secondary",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
```

- [ ] **Step 4: Tạo `flash/exit-modal.tsx`**

```tsx
"use client";

/* Modal xác nhận thoát bài học (port div#exitModal [data-od-id="exit-modal"]
   của opendesign lesson.html). "Về lộ trình" → /roadmap như location.href='roadmap.html'. */

import { useRouter } from "next/navigation";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function ExitModal({
  open,
  onClose,
  lessonTitle,
  className,
}: {
  open: boolean;
  onClose: () => void;
  lessonTitle?: string;
  className?: string;
}) {
  const router = useRouter();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      role="alertdialog"
      labelledBy="exit-modal-title"
      className={cn("max-w-[400px] rounded-[20px]", className)}
    >
      <h2 id="exit-modal-title" className="text-base font-extrabold">
        Rời khỏi {lessonTitle ?? "bài học"}?
      </h2>
      <p className="mt-2 mb-4 text-[13.5px] text-text-secondary">
        Tiến độ đã được lưu · streak hôm nay vẫn giữ. Quay lại lộ trình để tiếp tục sau.
      </p>
      <div className="flex gap-2.5">
        <Button type="button" variant="secondary" className="min-h-12 flex-1" onClick={onClose}>
          Ở lại học
        </Button>
        <Button
          type="button"
          variant="danger"
          className="min-h-12 flex-1"
          onClick={() => router.push("/roadmap")}
        >
          Về lộ trình
        </Button>
      </div>
    </Dialog>
  );
}
```

- [ ] **Step 5: Chạy test**

Run: `pnpm exec vitest run src/components/lesson/flash/__tests__/exit-modal.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app-next/src/components/lesson/flash/kbd.tsx app-next/src/components/lesson/flash/exit-modal.tsx app-next/src/components/lesson/flash/__tests__/exit-modal.test.tsx
git commit -m "feat(lesson): Kbd + ExitModal (port #exitModal lesson.html)"
```

---

### Task 6: `ShortcutsModal`

**Files:**
- Create: `app-next/src/components/lesson/flash/shortcuts-modal.tsx`
- Test: `app-next/src/components/lesson/flash/__tests__/shortcuts-modal.test.tsx`

**Interfaces:**
- Consumes: `Dialog`, `Button`, `Kbd` (Task 5).
- Produces: `export function ShortcutsModal({ open, onClose, className? }: { open: boolean; onClose: () => void; className?: string })`. Task 12 mount trong `LessonBody`.

- [ ] **Step 1: Viết test**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShortcutsModal } from "../shortcuts-modal";

describe("ShortcutsModal (port #keysModal của opendesign lesson.html)", () => {
  it("liệt kê đủ 6 phím tắt", () => {
    render(<ShortcutsModal open onClose={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Phím tắt học nhanh" })).toBeInTheDocument();
    for (const key of ["Space", "1", "2", "3", "R", "Esc"]) {
      expect(screen.getAllByText(key).length).toBeGreaterThan(0);
    }
    expect(screen.getByText("Lật / xem nghĩa · phát lại audio")).toBeInTheDocument();
  });

  it("Đã hiểu → đóng", async () => {
    const onClose = vi.fn();
    render(<ShortcutsModal open onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "Đã hiểu" }));
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Chạy test xác nhận fail**

Run: `pnpm exec vitest run src/components/lesson/flash/__tests__/shortcuts-modal.test.tsx`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 3: Tạo `flash/shortcuts-modal.tsx`**

```tsx
"use client";

/* Modal phím tắt (port div#keysModal [data-od-id="shortcuts-modal"]
   của opendesign lesson.html). */

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { Kbd } from "./kbd";

const SHORTCUTS: { label: string; key: string }[] = [
  { label: "Lật / xem nghĩa · phát lại audio", key: "Space" },
  { label: "Chưa thuộc · lặp sau 1 phút", key: "1" },
  { label: "Mơ hồ · lặp sau 5 phút", key: "2" },
  { label: "Đã thuộc · từ tiếp theo", key: "3" },
  { label: "Phát lại âm thanh chữ Hán", key: "R" },
  { label: "Thoát bài học", key: "Esc" },
];

export function ShortcutsModal({
  open,
  onClose,
  className,
}: {
  open: boolean;
  onClose: () => void;
  className?: string;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      labelledBy="keys-modal-title"
      className={cn("max-w-[400px] rounded-[20px]", className)}
    >
      <h2 id="keys-modal-title" className="text-base font-extrabold">
        Phím tắt học nhanh
      </h2>
      <div className="my-3 mb-4 grid gap-2 text-[13px] text-text-secondary">
        {SHORTCUTS.map((s) => (
          <div key={s.key} className="flex items-center justify-between gap-3">
            <span>{s.label}</span>
            <Kbd>{s.key}</Kbd>
          </div>
        ))}
      </div>
      <Button type="button" variant="secondary" className="min-h-12 w-full" onClick={onClose}>
        Đã hiểu
      </Button>
    </Dialog>
  );
}
```

- [ ] **Step 4: Chạy test**

Run: `pnpm exec vitest run src/components/lesson/flash/__tests__/shortcuts-modal.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app-next/src/components/lesson/flash/shortcuts-modal.tsx app-next/src/components/lesson/flash/__tests__/shortcuts-modal.test.tsx
git commit -m "feat(lesson): ShortcutsModal (port #keysModal lesson.html)"
```

---

### Task 7: `LessonTopbar`

**Files:**
- Create: `app-next/src/components/lesson/flash/lesson-topbar.tsx`
- Test: `app-next/src/components/lesson/flash/__tests__/lesson-topbar.test.tsx`

**Interfaces:**
- Consumes: `Progress` với `stacked`/`fill` (Task 1), `useTheme()` từ `@/components/shell/theme-provider` (app layout đã bọc `ThemeProvider`).
- Produces: `export function LessonTopbar({ title, current, total, autoplay, onToggleAutoplay, onExit, onShortcuts, className }: { title: ReactNode; current: number; total: number; autoplay: boolean; onToggleAutoplay(): void; onExit(): void; onShortcuts(): void; className?: string })`. Task 12 gọi trong `LessonBody`.

- [ ] **Step 1: Viết test**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "@/components/shell/theme-provider";
import { LessonTopbar } from "../lesson-topbar";

function mount(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

describe("LessonTopbar (port header[data-od-id=lesson-topbar] của opendesign lesson.html)", () => {
  it("hiển thị nhãn tiến độ + track jade với aria-valuenow", () => {
    mount(
      <LessonTopbar
        title="Bài 4: Sở thích & Thời gian rảnh"
        current={8}
        total={15}
        autoplay
        onToggleAutoplay={vi.fn()}
        onExit={vi.fn()}
        onShortcuts={vi.fn()}
      />
    );
    expect(screen.getByText(/Bài 4: Sở thích & Thời gian rảnh/)).toBeInTheDocument();
    expect(screen.getByText(/8\/15 từ/)).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Tiến độ từ vựng" }).getAttribute("aria-valuenow")).toBe("53");
  });

  it("tile thoát + phím tắt gọi callback; autoplay thể hiện aria-pressed + dot", async () => {
    const onExit = vi.fn();
    const onShortcuts = vi.fn();
    const onToggle = vi.fn();
    mount(
      <LessonTopbar
        title="Bài 4"
        current={1}
        total={15}
        autoplay
        onToggleAutoplay={onToggle}
        onExit={onExit}
        onShortcuts={onShortcuts}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Thoát bài học" }));
    expect(onExit).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Phím tắt" }));
    expect(onShortcuts).toHaveBeenCalled();
    const auto = screen.getByRole("button", { name: "Tự động phát âm" });
    expect(auto.getAttribute("aria-pressed")).toBe("true");
    await userEvent.click(auto);
    expect(onToggle).toHaveBeenCalled();
  });

  it("tile theme chuyển sáng/tối qua ThemeProvider", async () => {
    mount(
      <LessonTopbar
        title="Bài 4"
        current={1}
        total={15}
        autoplay={false}
        onToggleAutoplay={vi.fn()}
        onExit={vi.fn()}
        onShortcuts={vi.fn()}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "Chế độ sáng tối" }));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    document.documentElement.classList.remove("dark");
    localStorage.removeItem("nhai.theme");
  });
});
```

- [ ] **Step 2: Chạy test xác nhận fail**

Run: `pnpm exec vitest run src/components/lesson/flash/__tests__/lesson-topbar.test.tsx`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 3: Tạo `flash/lesson-topbar.tsx`**

```tsx
"use client";

/* Topbar bài học (port header[data-od-id="lesson-topbar"] của opendesign lesson.html):
   tile thoát · nhãn tiến độ + track jade · autoplay/phím tắt/theme. Dùng chung mọi mode. */

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Progress } from "@/components/ui/progress";
import { useTheme } from "@/components/shell/theme-provider";
import { ICON_STROKE, Keyboard, SunMoon, Volume2, X } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

/* Tile 40px của topbar (port .tile) — pressed có viền + dot accent (port [aria-pressed=true]::after) */
function TopbarTile({
  label,
  title,
  pressed,
  onClick,
  children,
}: {
  label: string;
  title: string;
  pressed?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "relative grid h-10 w-10 min-h-11 place-items-center rounded-control border border-transparent text-text-secondary transition-colors",
        "hover:bg-surface-muted hover:text-text-primary",
        "focus-visible:outline-none focus-visible:ring-3 ring-action-focus",
        pressed && "border-border-default bg-surface-muted text-action-primary",
      )}
    >
      {children}
      {pressed && (
        <span aria-hidden="true" className="absolute bottom-[5px] h-1 w-1 rounded-full bg-action-primary" />
      )}
    </button>
  );
}

export function LessonTopbar({
  title,
  current,
  total,
  autoplay,
  onToggleAutoplay,
  onExit,
  onShortcuts,
  className,
}: {
  title: ReactNode;
  current: number;
  total: number;
  autoplay: boolean;
  onToggleAutoplay(): void;
  onExit(): void;
  onShortcuts(): void;
  className?: string;
}) {
  const { theme, setTheme } = useTheme();
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <header
      data-od-id="lesson-topbar"
      className={cn(
        "sticky top-0 z-20 border-b border-border-default bg-surface-paper/88 px-4 py-2.5 backdrop-blur-md no-print",
        className,
      )}
    >
      <div className="mx-auto grid max-w-[880px] grid-cols-[auto_1fr_auto] items-center gap-3.5">
        <TopbarTile label="Thoát bài học" title="Thoát bài học" onClick={onExit}>
          <X size={17} strokeWidth={2.4} aria-hidden="true" />
        </TopbarTile>

        {/* tiến độ (port .progress-zone) */}
        <div className="min-w-0 text-center" data-od-id="lesson-progress">
          <Progress
            stacked
            fill="jade"
            ariaLabel="Tiến độ từ vựng"
            value={current}
            max={total}
            label={
              <span>
                {title} · <b className="font-bold text-text-primary">{current}/{total} từ ({pct}%)</b>
              </span>
            }
          />
        </div>

        <div className="flex gap-1" data-od-id="lesson-controls">
          <TopbarTile label="Tự động phát âm" title="Tự động phát âm" pressed={autoplay} onClick={onToggleAutoplay}>
            <Volume2 size={17} strokeWidth={ICON_STROKE} aria-hidden="true" />
          </TopbarTile>
          <TopbarTile label="Phím tắt" title="Phím tắt" onClick={onShortcuts}>
            <Keyboard size={17} strokeWidth={ICON_STROKE} aria-hidden="true" />
          </TopbarTile>
          <TopbarTile
            label="Chế độ sáng tối"
            title="Sáng / tối"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <SunMoon size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
          </TopbarTile>
        </div>
      </div>
    </header>
  );
}
```

Chú ý `useEffect` import thừa sẽ báo lint — nếu không dùng thì bỏ khỏi import.

- [ ] **Step 4: Chạy test**

Run: `pnpm exec vitest run src/components/lesson/flash/__tests__/lesson-topbar.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app-next/src/components/lesson/flash/lesson-topbar.tsx app-next/src/components/lesson/flash/__tests__/lesson-topbar.test.tsx
git commit -m "feat(lesson): LessonTopbar (port lesson-topbar lesson.html)"
```

---

### Task 8: Rose tokens + `SrsDeck`

**Files:**
- Modify: `app-next/src/app/globals.css` (3 chỗ: `:root`, `html.dark`, `@theme inline`)
- Create: `app-next/src/components/lesson/flash/srs-deck.tsx`
- Test: `app-next/src/components/lesson/flash/__tests__/srs-deck.test.tsx`

**Interfaces:**
- Consumes: `useLesson()` — `revealed`, `setRevealed`, `grade`, `done` (Task 4), `Kbd`.
- Produces: `export function SrsDeck({ className? }: { className?: string })` — chưa revealed: nút reveal; revealed: grid 3 nút grade `data-grade="1|2|3"` + `data-od-id="grade-again|grade-hard|grade-good"`; `done` → `null`. Token mới: `bg-rose-wash`, `border-rose-line`, `text-rose-ink`.

- [ ] **Step 1: Thêm rose tokens vào `globals.css`**

Trong khối `:root` (dòng có `--hz-amber…`), thêm ngay sau:

```css
  --hz-rose-wash: #fef2f2;  --hz-rose-line: #fecaca;  --hz-rose-ink: #b91c1c;
```

Trong khối `html.dark` (dòng `--hz-amber…`), thêm ngay sau:

```css
  --hz-rose-wash: rgba(127, 29, 29, .25);  --hz-rose-line: rgba(127, 29, 29, .5);  --hz-rose-ink: #fca5a5;
```

Trong `@theme inline` (sau `--color-amber-ink…`):

```css
  --color-rose-wash: var(--hz-rose-wash);
  --color-rose-line: var(--hz-rose-line);
  --color-rose-ink: var(--hz-rose-ink);
```

- [ ] **Step 2: Viết test `__tests__/srs-deck.test.tsx`**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LessonProvider, useLesson } from "../../lesson-provider";
import type { LessonItem } from "../../lesson-provider";
import * as progressStoreMod from "@/lib/store/progress-store";
import { SrsDeck } from "../srs-deck";

const items: LessonItem[] = [
  { hanzi: "爱好", pinyin: "àihào", hanViet: "ÁI HẢO", meaning: "Sở thích", pos: "Danh từ",
    example: { zh: "我的爱好是看书。", pinyinPerChar: [], vi: "Sở thích của tôi là đọc sách." }, index: 0, itemKey: "hsk1.lesson-4.0" },
];

function Harness() {
  const { revealed, setRevealed } = useLesson();
  return (
    <div>
      <button onClick={() => setRevealed(!revealed)}>toggle</button>
      <SrsDeck />
    </div>
  );
}

function mount() {
  return render(
    <LessonProvider items={items} book="hsk1" page="lesson-4">
      <Harness />
    </LessonProvider>
  );
}

describe("SrsDeck (port [data-od-id=srs-deck] của opendesign lesson.html)", () => {
  it("chưa revealed: nút reveal 56px + kbd Space; click → setRevealed", async () => {
    const { container } = mount();
    const btn = screen.getByRole("button", { name: /Chạm để xem nghĩa & ví dụ/ });
    expect(btn.className).toContain("min-h-[56px]");
    expect(container.querySelector("kbd")).toBeInTheDocument();
    await userEvent.click(btn);
    // sau khi reveal, nút reveal biến mất, 3 nút grade hiện
    expect(screen.getByRole("button", { name: /Chưa thuộc/ })).toBeInTheDocument();
  });

  it("revealed: 3 nút grade đúng tone + hotkey badge + data-grade", () => {
    const { container } = mount();
    act(() => screen.getByText("toggle").click());
    const again = screen.getByRole("button", { name: /Chưa thuộc/ });
    expect(again.getAttribute("data-grade")).toBe("1");
    expect(again.getAttribute("data-od-id")).toBe("grade-again");
    expect(again.className).toContain("bg-rose-wash");
    expect(again.className).toContain("text-rose-ink");
    const hard = screen.getByRole("button", { name: /Mơ hồ · Khó/ });
    expect(hard.className).toContain("bg-amber-wash");
    expect(hard.getAttribute("data-grade")).toBe("2");
    const good = screen.getByRole("button", { name: /Đã thuộc · Tốt/ });
    expect(good.className).toContain("bg-action-primary");
    expect(good.getAttribute("data-grade")).toBe("3");
    expect(container.querySelectorAll("[data-grade]").length).toBe(3);
  });

  it("click grade 1 → recordReview key đúng", async () => {
    const spy = vi.spyOn(progressStoreMod.progressStore, "recordReview");
    mount();
    act(() => screen.getByText("toggle").click());
    await userEvent.click(screen.getByRole("button", { name: /Chưa thuộc/ }));
    expect(spy).toHaveBeenCalledWith("hsk1.lesson-4.0", 1);
    spy.mockRestore();
  });
});
```

- [ ] **Step 3: Chạy test xác nhận fail**

Run: `pnpm exec vitest run src/components/lesson/flash/__tests__/srs-deck.test.tsx`
Expected: FAIL — module `../srs-deck` chưa tồn tại.

- [ ] **Step 4: Tạo `flash/srs-deck.tsx`**

```tsx
"use client";

/* Deck chấm điểm SRS (port div[data-od-id="srs-deck"] của opendesign lesson.html):
   nút reveal 56px ⇄ 3 nút grade (rose / amber / primary) có hotkey badge. */

import { useLesson } from "../lesson-provider";
import { Kbd } from "./kbd";
import { cn } from "@/lib/cn";

type GradeDef = {
  level: 1 | 2 | 3;
  label: string;
  sub: string;
  hotkey: string;
  odId: string;
  tone: string;
};

const GRADES: GradeDef[] = [
  {
    level: 1,
    label: "Chưa thuộc",
    sub: "Ôn lại sau 1 phút",
    hotkey: "1",
    odId: "grade-again",
    tone: "bg-rose-wash border-rose-line text-rose-ink",
  },
  {
    level: 2,
    label: "Mơ hồ · Khó",
    sub: "Ôn lại sau 5 phút",
    hotkey: "2",
    odId: "grade-hard",
    tone: "bg-amber-wash border-[color-mix(in_srgb,var(--hz-amber)_40%,transparent)] text-amber-ink",
  },
  {
    level: 3,
    label: "Đã thuộc · Tốt",
    sub: "Chuyển từ tiếp theo",
    hotkey: "3",
    odId: "grade-good",
    tone: "bg-action-primary border-action-primary text-white shadow-[0_4px_12px_rgba(200,60,50,.25)] hover:bg-action-primary-hover hover:border-action-primary-hover",
  },
];

export function SrsDeck({ className }: { className?: string }) {
  const { revealed, setRevealed, grade, done } = useLesson();

  // màn completion ẩn cả reveal lẫn grades (port mockup: revealBtn.hidden = true)
  if (done) return null;

  if (!revealed) {
    return (
      <button
        type="button"
        data-od-id="reveal-button"
        onClick={() => setRevealed(true)}
        className={cn(
          "flex min-h-[56px] w-full items-center justify-center gap-2.5 rounded-[16px] border border-border-default bg-surface-muted text-sm font-bold text-text-primary transition hover:brightness-[.97] active:scale-[.99] focus-visible:outline-none focus-visible:ring-3 ring-action-focus",
          className,
        )}
      >
        Chạm để xem nghĩa &amp; ví dụ
        <Kbd>Space</Kbd>
      </button>
    );
  }

  return (
    <div data-od-id="srs-deck" className={cn("grid grid-cols-3 gap-2.5 max-[480px]:grid-cols-1", className)}>
      {GRADES.map((g) => (
        <button
          key={g.level}
          type="button"
          data-grade={g.level}
          data-od-id={g.odId}
          onClick={() => grade(g.level)}
          className={cn(
            "relative flex min-h-[76px] flex-col items-center justify-center gap-0.5 rounded-[16px] border px-2 py-3 text-[13.5px] font-bold transition hover:brightness-[.97] active:scale-[.99] focus-visible:outline-none focus-visible:ring-3 ring-action-focus",
            g.tone,
          )}
        >
          <span
            aria-hidden="true"
            className="absolute right-2 top-1.5 rounded border border-current px-1 text-[10px] font-extrabold leading-[1.5] opacity-55"
          >
            {g.hotkey}
          </span>
          {g.label}
          <small className="text-[11.5px] font-normal opacity-90">{g.sub}</small>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Chạy test + typecheck (token mới phải build được)**

Run: `pnpm exec vitest run src/components/lesson/flash/__tests__/srs-deck.test.tsx && pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app-next/src/app/globals.css app-next/src/components/lesson/flash/srs-deck.tsx app-next/src/components/lesson/flash/__tests__/srs-deck.test.tsx
git commit -m "feat(lesson): rose tokens + SrsDeck (port srs-deck lesson.html)"
```

---

### Task 9: Ripple CSS + `Flashcard`

**Files:**
- Modify: `app-next/src/app/globals.css` (thêm keyframes ripple cuối file, cạnh `@keyframes shake`)
- Create: `app-next/src/components/lesson/flash/flashcard.tsx`
- Test: `app-next/src/components/lesson/flash/__tests__/flashcard.test.tsx`

**Interfaces:**
- Consumes: `useLesson()` — `items`, `index`, `revealed`, `setRevealed`, `done`; `useTts()` (`speak(text, { lang: "zh-CN" })`); `pinyinLine()` từ `@/lib/pinyin-utils`; `Kbd`.
- Produces: `export function Flashcard({ onOpenStroke, className }: { onOpenStroke?: () => void; className?: string })` — article `data-od-id="flashcard"`, `aria-live="polite"`. Task 12 gọi với `onOpenStroke`.

- [ ] **Step 1: Thêm ripple vào `globals.css`** (cuối file, sau `@keyframes shake`)

```css
/* ripple nút phát âm (port .speaker.ripple của opendesign lesson.html) */
@keyframes ripple {
  from { transform: scale(1); opacity: .8; }
  to { transform: scale(1.55); opacity: 0; }
}
.speaker-ripple {
  position: absolute; inset: 0; border-radius: 50%;
  border: 2px solid var(--action-primary);
  animation: ripple .7s ease-out;
  pointer-events: none;
}
@media (prefers-reduced-motion: reduce) {
  .speaker-ripple { animation: none; }
}
```

- [ ] **Step 2: Viết test `__tests__/flashcard.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LessonProvider } from "../../lesson-provider";
import type { LessonItem } from "../../lesson-provider";
import { Flashcard } from "../flashcard";

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
```

- [ ] **Step 3: Chạy test xác nhận fail**

Run: `pnpm exec vitest run src/components/lesson/flash/__tests__/flashcard.test.tsx`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 4: Tạo `flash/flashcard.tsx`**

```tsx
"use client";

/* Thẻ flashcard (port article[data-od-id="flashcard"] của opendesign lesson.html):
   counter → glyph → pinyin → speaker ripple + Xem nét viết → panel reveal → hint.
   Click card reveal; click nút con không reveal (stopPropagation, port closest check mockup). */

import { useState } from "react";
import { useLesson } from "../lesson-provider";
import { useTts } from "@/lib/tts/use-tts";
import { pinyinLine } from "@/lib/pinyin-utils";
import { ICON_STROKE, PenTool, Volume2 } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { Kbd } from "./kbd";

export function Flashcard({
  onOpenStroke,
  className,
}: {
  onOpenStroke?: () => void;
  className?: string;
}) {
  const { items, index, revealed, setRevealed, done } = useLesson();
  const { speak } = useTts();
  const [rippled, setRippled] = useState(false);

  const item = items[index];
  if (!item) return null;

  // custom deck (C10): fallback example.zh = hanzi → coi như không có ví dụ riêng
  const hasExample = Boolean(item.example) && item.example.zh !== item.hanzi;

  const playWord = () => {
    speak(item.hanzi, { lang: "zh-CN" });
    setRippled(true);
    setTimeout(() => setRippled(false), 700); // khớp duration ripple .7s
  };

  const glyph = done ? "棒" : item.hanzi;
  const pinyin = done ? "bàng" : item.pinyin;
  const pos = done ? "Hoàn thành" : item.pos;
  const meaning = done
    ? `Xong ${items.length}/${items.length} từ — quay lại lộ trình để mở trạm tiếp theo`
    : item.meaning;

  return (
    <article
      data-od-id="flashcard"
      aria-live="polite"
      aria-label={done ? "Thẻ hoàn thành" : revealed ? "Thẻ đã lật, chấm điểm ghi nhớ bên dưới" : "Thẻ ghi nhớ, chạm để xem nghĩa"}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        if (done) return;
        if (!revealed) setRevealed(true);
        else playWord();
      }}
      className={cn(
        "mx-auto w-full max-w-[560px] cursor-pointer rounded-[24px] border border-border-default bg-surface-elevated px-8 pb-7 pt-9 text-center shadow-md transition-shadow hover:shadow-lg active:scale-[.99] max-[480px]:px-5",
        className,
      )}
    >
      <div className="text-[11.5px] font-extrabold uppercase tracking-[.12em] text-text-secondary">
        {done ? "HOÀN THÀNH" : `THẺ ${index + 1} / ${items.length}`}
      </div>
      <div className="hanzi mt-2.5 text-[68px] font-semibold leading-[1.35] tracking-[.08em] max-[480px]:text-[60px]">
        {glyph}
      </div>
      <div className="text-[21px] tracking-[.02em] text-text-secondary">{pinyin}</div>

      <div className="mt-3.5 flex items-center justify-center gap-3">
        <button
          type="button"
          data-od-id="audio-button"
          aria-label="Phát âm từ vựng"
          onClick={(e) => {
            e.stopPropagation();
            playWord();
          }}
          className="relative grid h-[52px] w-[52px] place-items-center rounded-full bg-surface-muted text-action-primary transition hover:-translate-y-px hover:brightness-95 focus-visible:outline-none focus-visible:ring-3 ring-action-focus"
        >
          <Volume2 size={22} strokeWidth={ICON_STROKE} aria-hidden="true" />
          {rippled && <span aria-hidden="true" className="speaker-ripple" />}
        </button>
        {!done && (
          <button
            type="button"
            data-od-id="stroke-link"
            onClick={(e) => {
              e.stopPropagation();
              onOpenStroke?.();
            }}
            className="inline-flex min-h-11 items-center gap-1.5 px-2 text-[12.5px] font-bold text-text-secondary hover:text-action-primary"
          >
            <PenTool size={14} strokeWidth={ICON_STROKE} aria-hidden="true" />
            Xem nét viết
          </button>
        )}
      </div>

      {/* panel reveal (port .reveal/.reveal.open) */}
      <div
        className={cn(
          "overflow-hidden transition-[max-height,opacity] duration-300 ease-out",
          revealed || done ? "max-h-[480px] opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <hr className="my-[18px] border-border-default" />
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <span className="rounded-full border border-border-default bg-surface-muted px-3 py-1 text-[11.5px] font-extrabold tracking-[.06em] text-text-secondary">
            {pos}
          </span>
        </div>
        <p className="mt-2.5 text-base font-bold">{meaning}</p>
        {!done && hasExample && (
          <div className="mt-3.5 rounded-[16px] border border-border-default bg-surface-muted px-4 py-3.5 text-left">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="zh text-[17px] font-bold">{item.example.zh}</div>
                <div className="mt-0.5 text-[13px] text-text-secondary">
                  {pinyinLine(item.example.pinyinPerChar)}
                </div>
                <div className="mt-1 text-[13.5px] text-text-secondary">{item.example.vi}</div>
              </div>
              <button
                type="button"
                aria-label="Phát âm câu ví dụ"
                onClick={(e) => {
                  e.stopPropagation();
                  speak(item.example.zh, { lang: "zh-CN" });
                }}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-border-default bg-surface-elevated text-text-secondary hover:border-action-primary hover:text-action-primary"
              >
                <Volume2 size={14} strokeWidth={ICON_STROKE} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* hint (port #cardHint — đổi nội dung theo revealed) */}
      <p className="mt-3 text-xs text-text-secondary">
        {done ? (
          <>
            Nhấn <Kbd>Esc</Kbd> để về lộ trình
          </>
        ) : revealed ? (
          <>
            Chấm mức độ ghi nhớ bên dưới <Kbd>1</Kbd> <Kbd>2</Kbd> <Kbd>3</Kbd>
          </>
        ) : (
          <>
            Chạm thẻ hoặc nhấn <Kbd>Space</Kbd> để xem nghĩa
          </>
        )}
      </p>
    </article>
  );
}
```

- [ ] **Step 5: Chạy test**

Run: `pnpm exec vitest run src/components/lesson/flash/__tests__/flashcard.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app-next/src/app/globals.css app-next/src/components/lesson/flash/flashcard.tsx app-next/src/components/lesson/flash/__tests__/flashcard.test.tsx
git commit -m "feat(lesson): Flashcard (port flashcard lesson.html)"
```

---

### Task 10: `StrokeStudio` — sheet nét chữ & bút thuận (hanzi-writer + hoạt họa + tự luyện viết)

**Files:**
- Dependency: `hanzi-writer` (install bước 0)
- Modify: `app-next/src/app/globals.css` (thêm class `.hz-st*`, `.hz-ink-path`)
- Create: `app-next/src/components/lesson/flash/stroke-studio.tsx`
- Test: `app-next/src/components/lesson/flash/__tests__/stroke-studio.test.tsx`

**Interfaces:**
- Consumes: `HanziWriter.loadCharacterData(char)` → `Promise<{ strokes: string[]; medians: number[][][] }>`; `hanziChars` từ `@/content/hanzi` (radical/strokes/composition/level per-char, có thể không có); `useTts().speak`; `useToastSafe()`.
- Produces: `export function StrokeStudio({ open, onClose, word, pinyin, className }: { open: boolean; onClose: () => void; word: string; pinyin?: string; className?: string })` — `open=false` → `null`. Task 11 (`FlashStage`) gọi `open={strokeOpen} onClose={...} word={item.hanzi} pinyin={item.pinyin}`.

**Quyết định kỹ thuật (theo spec §5):** dùng `hanzi-writer` chỉ làm **data loader** (CDN + cache); render SVG + hoạt họa port 1:1 từ mockup (dasharray/dashoffset) vì cần trạng thái từng nét `todo/done/now` đúng như mockup.

- [ ] **Step 0: Cài dependency + thêm CSS**

```bash
pnpm --dir app-next add hanzi-writer
```

Thêm vào cuối `globals.css` (sau block ripple của Task 9):

```css
/* Stroke Studio — nét chữ & mực luyện viết (port .st/.ink-path của opendesign lesson.html) */
.hz-st { fill: none; stroke: var(--text-primary); stroke-linecap: round; stroke-linejoin: round; stroke-width: 13; }
.hz-st.todo { opacity: .14; }
.hz-st.done { opacity: 1; }
.hz-st.now { stroke: var(--action-primary); opacity: 1; }
.hz-ink-path { fill: none; stroke: var(--action-primary); stroke-width: 11; stroke-linecap: round; stroke-linejoin: round; }
```

- [ ] **Step 1: Viết test `__tests__/stroke-studio.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HanziWriter from "hanzi-writer";
import { StrokeStudio } from "../stroke-studio";

vi.mock("hanzi-writer", () => ({
  default: { loadCharacterData: vi.fn() },
}));
const mockedLoad = vi.mocked(HanziWriter.loadCharacterData);

const FAKE = { strokes: ["M10,10 L100,100", "M50,50 L200,200"], medians: [] };

function stubSvg() {
  const w = window as unknown as Record<string, { prototype: Record<string, unknown> } | undefined>;
  if (!w.SVGPathElement) w.SVGPathElement = class {} as never;
  w.SVGPathElement!.prototype.getTotalLength = () => 100;
  if (!w.SVGSVGElement) w.SVGSVGElement = class {} as never;
  w.SVGSVGElement!.prototype.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 300, height: 300 }) as DOMRect;
}

describe("StrokeStudio (port [data-od-id=stroke-modal] của opendesign lesson.html)", () => {
  beforeEach(() => {
    localStorage.clear();
    stubSvg();
    mockedLoad.mockReset();
  });

  it("open=false → null; char-tabs chọn chữ với aria-pressed; render đủ path nét", async () => {
    mockedLoad.mockResolvedValue(FAKE as never);
    const { container, rerender } = render(
      <StrokeStudio open={false} onClose={vi.fn()} word="爱好" pinyin="àihào" />
    );
    expect(container.querySelector('[data-od-id="stroke-modal"]')).toBeNull();

    rerender(<StrokeStudio open onClose={vi.fn()} word="爱好" pinyin="àihào" />);
    const tabs = screen.getByRole("group", { name: "Chọn chữ" });
    expect(tabs.querySelectorAll("button").length).toBe(2); // 爱 + 好 (unique)
    expect(tabs.querySelectorAll("button")[0].getAttribute("aria-pressed")).toBe("true");
    await waitFor(() => expect(container.querySelectorAll("path.hz-st").length).toBe(2));
    expect(screen.getByText("àihào")).toBeInTheDocument(); // py-pill fallback pinyin của từ
  });

  it("Review Focus 5: load data lỗi → nodata, không crash, nút điều khiển disabled", async () => {
    mockedLoad.mockRejectedValue(new Error("offline"));
    render(<StrokeStudio open onClose={vi.fn()} word="爱好" pinyin="àihào" />);
    expect(await screen.findByText(/bổ sung dữ liệu bút thuận/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Phát lại" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Nét trước" })).toBeDisabled();
  });

  it("autoplay khi có data: cả 2 nét chuyển done sau hoạt họa", async () => {
    mockedLoad.mockResolvedValue(FAKE as never);
    const { container } = render(<StrokeStudio open onClose={vi.fn()} word="爱" pinyin="ài" />);
    await waitFor(
      () => expect(container.querySelectorAll("path.hz-st.done").length).toBe(2),
      { timeout: 3000 }
    );
  });

  it("Tự luyện viết: bật → vẽ nét pointer, đếm, hoàn tác, xóa hết", async () => {
    mockedLoad.mockResolvedValue(FAKE as never);
    const { container } = render(<StrokeStudio open onClose={vi.fn()} word="爱" pinyin="ài" />);
    await waitFor(() => expect(container.querySelector("path.hz-st")).toBeTruthy());
    await userEvent.click(screen.getByRole("button", { name: /Tự luyện viết/ }));
    const ink = screen.getByLabelText("Bảng tự luyện viết");
    expect(ink).toBeVisible();
    fireEvent.pointerDown(ink, { pointerId: 1, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(ink, { pointerId: 1, clientX: 60, clientY: 60 });
    fireEvent.pointerMove(ink, { pointerId: 1, clientX: 150, clientY: 90 });
    fireEvent.pointerUp(ink, { pointerId: 1 });
    expect(screen.getByText(/1 nét đã viết/)).toBeInTheDocument();
    expect(container.querySelectorAll("polyline.hz-ink-path").length).toBe(1);
    await userEvent.click(screen.getByRole("button", { name: "Hoàn tác" }));
    expect(screen.getByText(/0 nét đã viết/)).toBeInTheDocument();
  });

  it("Escape → onClose", async () => {
    const onClose = vi.fn();
    render(<StrokeStudio open onClose={onClose} word="爱" pinyin="ài" />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("mẹo ghi nhớ chỉ hiện với chữ có data TIPS", async () => {
    mockedLoad.mockResolvedValue(FAKE as never);
    render(<StrokeStudio open onClose={vi.fn()} word="爱好" pinyin="àihào" />);
    expect(await screen.findByText("MẸO GHI NHỚ")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Chạy test xác nhận fail**

Run: `pnpm exec vitest run src/components/lesson/flash/__tests__/stroke-studio.test.tsx`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 3: Tạo `flash/stroke-studio.tsx`** — file hoàn chỉnh:

```tsx
"use client";

/* Stroke Studio — sheet nét chữ & bút thuận (port section[data-od-id="stroke-modal"]
   của opendesign lesson.html). Data nét: HanziWriter.loadCharacterData (CDN, cache);
   render + hoạt họa dashoffset port 1:1 từ mockup để giữ trạng thái todo/done/now per nét.
   Tự luyện viết: SVG polyline pointer events (port inkSvg của mockup). */

import { useCallback, useEffect, useRef, useState } from "react";
import HanziWriter from "hanzi-writer";
import { hanziChars } from "@/content/hanzi";
import { useTts } from "@/lib/tts/use-tts";
import { useToastSafe } from "@/components/shell/toast-provider";
import { ICON_STROKE, PenTool, RotateCcw, Volume2, X } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

const SPEEDS = [0.75, 1, 1.5] as const;

/* Mẹo ghi nhớ per-char (port STROKE_DATA.*.tip của mockup — chỉ 2 chữ demo có data) */
const TIPS: Record<string, string> = {
  "爱": "Phía trên là móng vuốt (爫), phía dưới là bạn bè (友) che chở — yêu (爱) là nâng niu, che chở.",
  "好": "Người phụ nữ (女) bên đứa trẻ (子) — điều tốt đẹp (好). Trong 爱好 đọc là hào (sở thích).",
};

type CharData = { strokes: string[]; medians: number[][][] };

const toolBtn =
  "inline-flex min-h-11 items-center gap-1.5 rounded-[16px] border border-border-default bg-surface-elevated px-3.5 text-[12.5px] font-bold text-text-primary transition hover:-translate-y-px disabled:pointer-events-none disabled:opacity-50";

export function StrokeStudio({
  open,
  onClose,
  word,
  pinyin,
  className,
}: {
  open: boolean;
  onClose: () => void;
  word: string;
  pinyin?: string;
  className?: string;
}) {
  const { speak } = useTts();
  const toast = useToastSafe();

  const chars = Array.from(new Set(Array.from(word.replace(/\s+/g, ""))));
  const [cur, setCur] = useState(chars[0] ?? "");
  const [data, setData] = useState<CharData | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [sCur, setSCur] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [practice, setPractice] = useState(false);
  const [ink, setInk] = useState<string[]>([]);
  const [curInk, setCurInk] = useState<string | null>(null);

  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const inkRef = useRef<SVGSVGElement | null>(null);
  const drawingRef = useRef(false);
  const playingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  /* tô trạng thái tĩnh theo số nét đã hiển thị (port paintIdle) */
  const paintIdle = useCallback((upTo: number) => {
    pathRefs.current.forEach((el, i) => {
      if (!el) return;
      el.style.transition = "";
      el.style.strokeDasharray = "";
      el.style.strokeDashoffset = "";
    });
    setSCur(upTo);
  }, []);

  const animateStroke = useCallback(
    (i: number, onDone: () => void) => {
      const el = pathRefs.current[i];
      if (!el) {
        onDone();
        return;
      }
      const len = el.getTotalLength?.() ?? 100;
      el.style.transition = "none";
      el.style.strokeDasharray = String(len);
      el.style.strokeDashoffset = String(len);
      void el.getBoundingClientRect();
      const dur = Math.max(280, 720 / speed);
      requestAnimationFrame(() => {
        el.style.transition = `stroke-dashoffset ${dur}ms ease`;
        el.style.strokeDashoffset = "0";
      });
      timerRef.current = setTimeout(() => {
        el.style.transition = "";
        el.style.strokeDasharray = "";
        el.style.strokeDashoffset = "";
        onDone();
      }, dur + 60);
    },
    [speed]
  );

  /* phát lại toàn bộ nét (port playAll) */
  const playAll = useCallback(() => {
    if (!data) return;
    clearTimers();
    playingRef.current = true;
    setPlaying(true);
    setSCur(-1);
    let i = 0;
    const next = () => {
      if (!playingRef.current) return;
      if (i >= data.strokes.length) {
        playingRef.current = false;
        setPlaying(false);
        paintIdle(data.strokes.length - 1);
        toast(`Hoàn thành ${data.strokes.length} nét chữ “${cur}”`);
        return;
      }
      const step = i;
      setSCur(step);
      animateStroke(step, () => {
        i++;
        next();
      });
    };
    next();
  }, [data, cur, animateStroke, paintIdle, toast]);

  /* load data khi mở sheet / đổi chữ (port selectChar) */
  useEffect(() => {
    if (!open) return;
    playingRef.current = false;
    clearTimers();
    setPlaying(false);
    setSCur(-1);
    setPractice(false);
    setInk([]);
    setCurInk(null);
    if (!cur) return;
    let alive = true;
    setLoading(true);
    setFailed(false);
    setData(null);
    HanziWriter.loadCharacterData(cur)
      .then((d: CharData) => {
        if (!alive) return;
        setLoading(false);
        setData(d);
      })
      .catch(() => {
        if (!alive) return;
        setLoading(false);
        setFailed(true);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cur]);

  /* autoplay khi data sẵn sàng (port selectChar → playAll) */
  useEffect(() => {
    if (data) playAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  /* dọn timer khi unmount */
  useEffect(() => clearTimers, []);

  /* Esc đóng sheet (port keydown Escape → closeStrokeModal) */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  /* Nét trước / Nét sau / click row (port strokePrev/strokeNext/orow click) */
  const stepTo = (n: number) => {
    if (!data || practice || playing) return;
    clearTimers();
    playingRef.current = false;
    setPlaying(false);
    const clamped = Math.max(-1, Math.min(data.strokes.length - 1, n));
    paintIdle(clamped);
    if (clamped >= 0) toast(`Nét ${clamped + 1}/${data.strokes.length}`);
  };

  const replay = () => {
    if (!data || practice) return;
    playingRef.current = false;
    setPlaying(false);
    requestAnimationFrame(() => playAll());
  };

  const togglePractice = () => {
    setPractice((v) => {
      const nv = !v;
      if (nv) {
        clearTimers();
        playingRef.current = false;
        setPlaying(false);
      } else {
        setInk([]);
        setCurInk(null);
      }
      return nv;
    });
  };

  /* tự luyện viết (port inkSvg pointer handlers) */
  const svgPoint = (e: React.PointerEvent): string => {
    const r = inkRef.current!.getBoundingClientRect();
    const x = Math.round(((e.clientX - r.left) / r.width) * 3000) / 10;
    const y = Math.round(((e.clientY - r.top) / r.height) * 3000) / 10;
    return `${x},${y}`;
  };
  const onInkDown = (e: React.PointerEvent) => {
    if (!practice) return;
    inkRef.current?.setPointerCapture(e.pointerId);
    setCurInk(svgPoint(e));
    drawingRef.current = true;
  };
  const onInkMove = (e: React.PointerEvent) => {
    if (!drawingRef.current || !curInk) return;
    setCurInk((pts) => `${pts} ${svgPoint(e)}`);
  };
  const onInkUp = () => {
    if (!drawingRef.current || !curInk) return;
    const pts = curInk.trim().split(/\s+/);
    if (pts.length >= 3) {
      setInk((arr) => {
        const next = [...arr, curInk];
        if (data && next.length === data.strokes.length) {
          toast(`Đủ ${data.strokes.length} nét — đối chiếu với thứ tự mẫu bên phải`);
        }
        return next;
      });
    }
    setCurInk(null);
    drawingRef.current = false;
  };

  if (!open) return null;

  const info = hanziChars[cur];
  const totalStrokes = data?.strokes.length ?? info?.strokes ?? null;
  const curPy = info?.pinyin ?? pinyin ?? "—";
  const stClass = (i: number) =>
    playing
      ? i < sCur
        ? "done"
        : i === sCur
          ? "now"
          : "todo"
      : i <= sCur
        ? "done"
        : "todo";

  return (
    <div
      data-od-id="stroke-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Nét chữ và bút thuận"
      className={cn("fixed inset-0 z-[600]", className)}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <section
        className={cn(
          "absolute left-1/2 top-1/2 max-h-[min(640px,calc(100vh-48px))] w-[min(860px,calc(100%-32px))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[24px] border border-border-default bg-surface-paper p-5 shadow-md",
          "max-[640px]:bottom-0 max-[640px]:left-0 max-[640px]:right-0 max-[640px]:top-auto max-[640px]:max-h-[92vh] max-[640px]:w-full max-[640px]:translate-x-0 max-[640px]:translate-y-0 max-[640px]:rounded-b-none",
        )}
      >
        {/* head: char tabs · py-pill · close (port .sheet-head) */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div
            role="group"
            aria-label="Chọn chữ"
            className="flex gap-0.5 rounded-full border border-border-default bg-surface-muted p-0.5"
          >
            {chars.map((c) => {
              const count = (c === cur ? data?.strokes.length : undefined) ?? hanziChars[c]?.strokes ?? null;
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={c === cur}
                  onClick={() => setCur(c)}
                  className={cn(
                    "flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-[13px] font-bold transition-colors",
                    c === cur
                      ? "border-border-default bg-surface-elevated text-text-primary shadow-xs"
                      : "border-transparent bg-transparent text-text-secondary hover:text-text-primary",
                  )}
                >
                  <span className="hanzi text-base">{c}</span>
                  {count != null && <small className="text-[11px] font-normal text-text-secondary">{count} nét</small>}
                </button>
              );
            })}
          </div>
          <span className="mx-auto inline-flex items-center gap-1 rounded-full border border-border-default bg-surface-muted py-1 pl-4 pr-1 text-[13px] font-bold text-text-primary">
            <span>{curPy}</span>
            <button
              type="button"
              aria-label="Phát âm chữ Hán"
              onClick={() => speak(cur, { lang: "zh-CN" })}
              className="grid h-8 w-8 place-items-center rounded-full text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
            >
              <Volume2 size={14} strokeWidth={ICON_STROKE} aria-hidden="true" />
            </button>
          </span>
          <button
            type="button"
            aria-label="Đóng bảng nét chữ"
            onClick={onClose}
            className="ml-auto grid h-10 w-10 place-items-center rounded-control text-text-secondary hover:bg-surface-muted hover:text-text-primary"
          >
            <X size={16} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </div>

        {/* body 2 cột (port .sheet-body) */}
        <div className="mt-4 grid grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] gap-4.5 max-[760px]:grid-cols-1">
          <div>
            <div className="relative mx-auto aspect-square w-[min(320px,100%)] overflow-hidden rounded-[16px] border border-border-default bg-surface-elevated">
              {/* lưng lưới (port .grid-bg) */}
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 300 300" aria-hidden="true">
                <rect x="4" y="4" width="292" height="292" fill="none" stroke="var(--hz-slate)" strokeWidth="1.5" rx="4" />
                <line x1="150" y1="4" x2="150" y2="296" stroke="var(--hz-slate)" strokeWidth="1" strokeDasharray="7 6" />
                <line x1="4" y1="150" x2="296" y2="150" stroke="var(--hz-slate)" strokeWidth="1" strokeDasharray="7 6" />
                <line x1="4" y1="4" x2="296" y2="296" stroke="var(--hz-slate)" strokeWidth="1" strokeDasharray="5 7" opacity=".7" />
                <line x1="296" y1="4" x2="4" y2="296" stroke="var(--hz-slate)" strokeWidth="1" strokeDasharray="5 7" opacity=".7" />
              </svg>
              {/* nét chữ */}
              <svg
                viewBox="0 0 300 300"
                role="img"
                aria-label={`Hoạt họa bút thuận chữ ${cur}`}
                className="absolute inset-0 h-full w-full"
              >
                {data?.strokes.map((d, i) => (
                  <path
                    key={i}
                    ref={(el) => {
                      pathRefs.current[i] = el;
                    }}
                    d={d}
                    className={`hz-st ${stClass(i)}`}
                  />
                ))}
                {failed && (
                  <text x="150" y="150" textAnchor="middle" fontSize="14" fill="var(--hz-slate)">
                    Không tải được dữ liệu nét chữ
                  </text>
                )}
              </svg>
              {/* tự luyện viết (port inkSvg) */}
              <svg
                ref={inkRef}
                viewBox="0 0 300 300"
                aria-label="Bảng tự luyện viết"
                className="absolute inset-0 h-full w-full"
                style={{ display: practice ? "block" : "none", touchAction: "none" }}
                onPointerDown={onInkDown}
                onPointerMove={onInkMove}
                onPointerUp={onInkUp}
              >
                {ink.map((pts, i) => (
                  <polyline key={i} points={pts} className="hz-ink-path" />
                ))}
                {curInk && <polyline points={curInk} className="hz-ink-path" />}
              </svg>
              {loading && (
                <div className="absolute inset-0 grid place-items-center text-[13px] text-text-secondary">
                  Đang tải nét chữ…
                </div>
              )}
            </div>

            {/* toolbar (port .toolbar) */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2" data-od-id="stroke-toolbar">
              <button
                type="button"
                aria-label="Nét trước"
                onClick={() => stepTo(sCur - 1)}
                disabled={!data || practice || playing}
                className={toolBtn}
              >
                Nét trước
              </button>
              <button
                type="button"
                onClick={replay}
                disabled={!data || practice}
                className={cn(toolBtn, "border-action-primary bg-action-primary text-white hover:bg-action-primary-hover")}
              >
                <RotateCcw size={14} strokeWidth={ICON_STROKE} aria-hidden="true" />
                Phát lại
              </button>
              <button
                type="button"
                aria-label="Nét sau"
                onClick={() => stepTo(sCur + 1)}
                disabled={!data || practice || playing}
                className={toolBtn}
              >
                Nét sau
              </button>
              <div
                role="group"
                aria-label="Tốc độ hoạt họa"
                className="flex gap-0.5 rounded-[16px] border border-border-default bg-surface-muted p-0.5"
              >
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={speed === s}
                    onClick={() => setSpeed(s)}
                    className={cn(
                      "min-h-[38px] rounded-[12px] border border-transparent px-2.5 text-xs font-bold transition-colors",
                      speed === s
                        ? "border-border-default bg-surface-elevated text-text-primary shadow-xs"
                        : "text-text-secondary",
                    )}
                  >
                    {s}x
                  </button>
                ))}
              </div>
              <button
                type="button"
                aria-pressed={practice}
                onClick={togglePractice}
                className={cn(toolBtn, practice && "border-action-primary text-action-primary")}
              >
                <PenTool size={14} strokeWidth={ICON_STROKE} aria-hidden="true" />
                Tự luyện viết
              </button>
            </div>

            {/* practice bar (port .practice-bar) */}
            {practice && (
              <div className="mt-2.5 flex items-center justify-center gap-2 text-[12.5px] font-bold text-text-secondary">
                <button
                  type="button"
                  className={toolBtn}
                  onClick={() => setInk((arr) => arr.slice(0, -1))}
                  disabled={ink.length === 0}
                >
                  Hoàn tác
                </button>
                <button
                  type="button"
                  className={toolBtn}
                  onClick={() => setInk([])}
                  disabled={ink.length === 0}
                >
                  Xóa hết
                </button>
                <span data-testid="ink-count">{ink.length} nét đã viết{totalStrokes != null ? ` / ${totalStrokes}` : ""}</span>
              </div>
            )}
          </div>

          {/* info col (port .info-col) */}
          <div className="flex min-w-0 flex-col gap-3">
            {failed && (
              <div className="px-3 py-7 text-center text-[13px] text-text-secondary">
                Chữ “{cur}” sẽ được bổ sung dữ liệu bút thuận.
                <br />
                Kiểm tra kết nối mạng rồi thử lại.
              </div>
            )}
            {info && (
              <div className="flex items-center gap-3.5 rounded-[16px] border border-border-default bg-surface-elevated px-4 py-3.5">
                <span className="hanzi grid h-14 w-14 shrink-0 place-items-center rounded-[14px] border border-learning-mastered bg-learning-mastered/10 text-[28px] font-bold text-learning-mastered">
                  {info.radical}
                </span>
                <span className="min-w-0">
                  <b className="block text-sm">{info.radical} — bộ chính của {cur}</b>
                  <span className="line-clamp-2 text-[12.5px] text-text-secondary">{info.meaning}</span>
                </span>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <div className="min-w-[120px] flex-1 rounded-[12px] border border-border-default bg-surface-elevated px-3 py-2.5">
                <small className="block text-[11px] font-bold tracking-[.06em] text-text-secondary">TỔNG SỐ NÉT</small>
                <b className="text-[13.5px]">
                  {totalStrokes != null ? `${totalStrokes} nét` : "—"}
                  {info ? ` • ${info.level}` : ""}
                </b>
              </div>
              {info?.composition && (
                <div className="min-w-[120px] flex-1 rounded-[12px] border border-border-default bg-surface-elevated px-3 py-2.5">
                  <small className="block text-[11px] font-bold tracking-[.06em] text-text-secondary">THÀNH PHẦN</small>
                  <b className="hanzi text-[13.5px]">{info.composition.join(" + ")}</b>
                </div>
              )}
            </div>
            <div className="max-h-[165px] overflow-y-auto rounded-[16px] border border-border-default bg-surface-elevated p-2">
              <h4 className="px-2 pb-1 pt-1.5 text-[11px] font-extrabold tracking-[.08em] text-text-secondary">
                DANH SÁCH BÚT THUẬN
              </h4>
              {!data && (
                <p className="px-2 pb-2 text-[13px] text-text-secondary">
                  {loading ? "Đang tải…" : "Chưa có dữ liệu nét cho chữ này."}
                </p>
              )}
              {data?.strokes.map((_, i) => {
                const active = !playing && sCur === i;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => stepTo(i)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-[10px] px-2 py-2 text-left text-[13px] text-text-primary hover:bg-surface-muted",
                      active && "bg-surface-muted shadow-[inset_3px_0_0_var(--action-primary)]",
                    )}
                  >
                    <span
                      className={cn(
                        "grid h-6 w-6 place-items-center rounded-full border text-[11px] font-extrabold",
                        active ? "border-action-primary bg-action-primary text-white" : "border-border-default bg-surface-muted",
                      )}
                    >
                      {i + 1}
                    </span>
                    <span>Nét {i + 1}</span>
                  </button>
                );
              })}
            </div>
            {TIPS[cur] && (
              <div className="rounded-[16px] border border-border-default bg-surface-elevated px-3.5 py-3">
                <h4 className="pb-1 text-[11px] font-extrabold tracking-[.08em] text-text-secondary">MẸO GHI NHỚ</h4>
                <p className="text-[13px] text-text-secondary">{TIPS[cur]}</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 4: Chạy test**

Run: `pnpm exec vitest run src/components/lesson/flash/__tests__/stroke-studio.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app-next/src/app/globals.css app-next/src/components/lesson/flash/stroke-studio.tsx app-next/src/components/lesson/flash/__tests__/stroke-studio.test.tsx app-next/package.json app-next/pnpm-lock.yaml
git commit -m "feat(lesson): StrokeStudio hanzi-writer + tự luyện viết (port stroke-modal lesson.html)"
```

---

### Task 11: `FlashStage` + tích hợp `lesson-client` + xoá flash mode cũ

**Files:**
- Create: `app-next/src/components/lesson/flash/flash-stage.tsx`
- Test: `app-next/src/components/lesson/flash/__tests__/flash-stage.test.tsx`
- Modify: `app-next/src/components/lesson/modes/index.ts` (bỏ flash khỏi registry)
- Modify: `app-next/src/components/lesson/lesson-client.tsx` (thay toàn bộ)
- Delete: `app-next/src/components/lesson/modes/flashcard.tsx`, `app-next/src/components/lesson/__tests__/flashcard.test.tsx`
- Modify: `app-next/e2e/learning-flow.spec.ts`

**Interfaces:**
- Consumes: `Flashcard` (T9), `SrsDeck` (T8), `StrokeStudio` (T10), `LessonTopbar` (T7), `ExitModal` (T5), `ShortcutsModal` (T6), `useLesson` (T4), `useKeyboard`, `useTts`.
- Produces: `export default function FlashStage({ onRequestExit }: { onRequestExit: () => void })` — `data-testid="flash-stage"`, chứa Flashcard + SrsDeck + StrokeStudio + hotkeys Space/1/2/3/r/R/Esc + autoplay 350ms.

- [ ] **Step 1: Viết test `__tests__/flash-stage.test.tsx`**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { LessonProvider } from "../../lesson-provider";
import type { LessonItem } from "../../lesson-provider";
import { progressStore } from "@/lib/store/progress-store";
import FlashStage from "../flash-stage";

const items: LessonItem[] = [
  { hanzi: "爱好", pinyin: "àihào", hanViet: "ÁI HẢO", meaning: "Sở thích", pos: "Danh từ",
    example: { zh: "我的爱好是看书。", pinyinPerChar: [], vi: "Sở thích của tôi là đọc sách." }, index: 0, itemKey: "hsk1.lesson-4.0" },
  { hanzi: "音乐", pinyin: "yīnyuè", hanViet: "ÂM NHẠC", meaning: "Âm nhạc", pos: "Danh từ",
    example: { zh: "她喜欢听音乐。", pinyinPerChar: [], vi: "Cô ấy thích nghe nhạc." }, index: 1, itemKey: "hsk1.lesson-4.1" },
];

describe("FlashStage (port main.stage của opendesign lesson.html)", () => {
  beforeEach(() => localStorage.clear());

  it("Review Focus 6: items rỗng → không crash, không render card", () => {
    const { container } = render(
      <LessonProvider items={[]}>
        <FlashStage onRequestExit={vi.fn()} />
      </LessonProvider>
    );
    expect(container.querySelector('[data-od-id="flashcard"]')).toBeNull();
  });

  it("hotkey Space reveal → phím 2 grade → recordReview + sang từ tiếp", () => {
    const spy = vi.spyOn(progressStore, "recordReview");
    const { container } = render(
      <LessonProvider items={items} book="hsk1" page="lesson-4">
        <FlashStage onRequestExit={vi.fn()} />
      </LessonProvider>
    );
    act(() => fireEvent.keyDown(window, { key: " " })); // Space → reveal
    expect(container.querySelector('[aria-label="Thẻ đã lật, chấm điểm ghi nhớ bên dưới"]')).toBeTruthy();
    act(() => fireEvent.keyDown(window, { key: "1" })); // grade 1 → recordReview + từ tiếp
    expect(spy).toHaveBeenCalledWith("hsk1.lesson-4.0", 1);
    expect(screen.getByText("THẺ 2 / 2")).toBeInTheDocument(); // đã sang từ tiếp
    spy.mockRestore();
  });

  it("phím 3 khi CHƯA reveal → no-op (Review Focus 2, pin từ Task 4)", () => {
    const spy = vi.spyOn(progressStore, "recordReview");
    render(
      <LessonProvider items={items}>
        <FlashStage onRequestExit={vi.fn()} />
      </LessonProvider>
    );
    act(() => fireEvent.keyDown(window, { key: "3" }));
    expect(spy).not.toHaveBeenCalled();
    expect(screen.getByText("THẺ 1 / 2")).toBeInTheDocument();
    spy.mockRestore();
  });

  it("Escape khi không có modal → onRequestExit", () => {
    const onRequestExit = vi.fn();
    render(
      <LessonProvider items={items}>
        <FlashStage onRequestExit={onRequestExit} />
      </LessonProvider>
    );
    act(() => fireEvent.keyDown(window, { key: "Escape" }));
    expect(onRequestExit).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Chạy test xác nhận fail**

Run: `pnpm exec vitest run src/components/lesson/flash/__tests__/flash-stage.test.tsx`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 3: Tạo `flash/flash-stage.tsx`**

```tsx
"use client";

/* Sân khấu flash SRS (port main.stage của opendesign lesson.html):
   Flashcard + SrsDeck + StrokeStudio. Hotkeys Space/1/2/3/R/Esc (port keydown mockup)
   — bỏ qua khi có modal/sheet mở; autoplay 350ms khi sang từ mới (port render(n)). */

import { useEffect, useRef, useState } from "react";
import { useLesson } from "../lesson-provider";
import { useTts } from "@/lib/tts/use-tts";
import { useKeyboard } from "@/lib/use-keyboard";
import { Flashcard } from "./flashcard";
import { SrsDeck } from "./srs-deck";
import { StrokeStudio } from "./stroke-studio";

/* có dialog/sheet mở → hotkeys học không chạy (guard như mockup: modals đang mở thì return) */
function anyModalOpen(): boolean {
  return (
    typeof document !== "undefined" &&
    Boolean(document.querySelector('[role="dialog"], [role="alertdialog"]'))
  );
}

export default function FlashStage({ onRequestExit }: { onRequestExit: () => void }) {
  const { items, index, revealed, setRevealed, grade, done, autoplay } = useLesson();
  const { speak } = useTts();
  const [strokeOpen, setStrokeOpen] = useState(false);

  const item = items[index];
  const playWord = () => {
    if (item && !done) speak(item.hanzi, { lang: "zh-CN" });
  };

  /* autoplay: sang từ mới → 350ms sau phát âm; bỏ lần mount đầu (render(false) mockup) */
  const first = useRef(true);
  const autoRef = useRef({ autoplay, item, done });
  autoRef.current = { autoplay, item, done };
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const { autoplay: a, item: w, done: d } = autoRef.current;
    if (!a || !w || d) return;
    const id = setTimeout(() => speak(w.hanzi, { lang: "zh-CN" }), 350);
    return () => clearTimeout(id);
  }, [index, speak]);

  useKeyboard({
    " ": (e) => {
      if (anyModalOpen()) return;
      e.preventDefault();
      if (!revealed) setRevealed(true);
      else playWord();
    },
    1: () => {
      if (!anyModalOpen()) grade(1);
    },
    2: () => {
      if (!anyModalOpen()) grade(2);
    },
    3: () => {
      if (!anyModalOpen()) grade(3);
    },
    r: () => {
      if (!anyModalOpen()) playWord();
    },
    R: () => {
      if (!anyModalOpen()) playWord();
    },
    Escape: () => {
      // sheet/modal tự đóng Esc riêng; chỉ mở exit modal khi không gì đang mở
      if (anyModalOpen()) return;
      onRequestExit();
    },
  });

  if (!item) return null;

  return (
    <div className="flex flex-col items-center gap-[18px]" data-testid="flash-stage">
      <Flashcard onOpenStroke={() => setStrokeOpen(true)} />
      {!done && <SrsDeck className="w-full max-w-[560px]" />}
      <StrokeStudio
        open={strokeOpen}
        onClose={() => setStrokeOpen(false)}
        word={item.hanzi}
        pinyin={item.pinyin}
      />
    </div>
  );
}
```

- [ ] **Step 4: Chạy test flash-stage**

Run: `pnpm exec vitest run src/components/lesson/flash/__tests__/flash-stage.test.tsx`
Expected: PASS.

- [ ] **Step 5: Thay `modes/index.ts`** — toàn bộ file:

```tsx
"use client";

/* Mode registry — mode flash đã thay bằng FlashStage (flash/flash-stage.tsx, port
   main.stage của opendesign lesson.html) nên không qua registry nữa; 6 mode còn lại giữ nguyên. */

import type { ComponentType } from "react";
import type { LessonMode } from "../lesson-provider";
import QuizMode from "./quiz";
import TypingMode from "./typing";
import ReadingMode from "./reading";
import ListenMode from "./listen";
import DanceMode from "./dance";
import BattleMode from "./battle";

export const modeRegistry: Partial<Record<LessonMode, ComponentType>> = {
  quiz: QuizMode,
  typing: TypingMode,
  reading: ReadingMode,
  listen: ListenMode,
  dance: DanceMode,
  battle: BattleMode,
};

export const modeLabels: Record<LessonMode, { name: string; badge: string }> = {
  flash: { name: "Flashcard", badge: "" },
  quiz: { name: "Trắc nghiệm", badge: "" },
  typing: { name: "Gõ từ", badge: "" },
  reading: { name: "Đọc hiểu", badge: "" },
  listen: { name: "Nghe ghép câu", badge: "" },
  dance: { name: "Hanzi Dance", badge: "Chưa học" },
  battle: { name: "Đấu trí", badge: "Xếp hạng" },
};

export const modeOrder: LessonMode[] = ["flash", "quiz", "typing", "reading", "listen", "dance", "battle"];
```

- [ ] **Step 6: Thay toàn bộ `lesson-client.tsx`:**

```tsx
"use client";

/* LessonClient — khung trang bài học, port opendesign lesson.html:
   LessonTopbar (mọi mode) → mode Flash render FlashStage (main.stage), các mode khác
   giữ layout cũ. Sidebar chế độ + WordList giữ nguyên (spec §4). */

import { useState } from "react";
import { LessonProvider, useLesson } from "./lesson-provider";
import type { LessonItem, LessonMode } from "./lesson-provider";
import { modeRegistry, modeLabels, modeOrder } from "./modes";
import { pinyinLine } from "@/lib/pinyin-utils";
import { useTts } from "@/lib/tts/use-tts";
import { progressStore } from "@/lib/store/progress-store";
import { useToastSafe } from "@/components/shell/toast-provider";
import WordList from "./word-list";
import FlashStage from "./flash/flash-stage";
import { LessonTopbar } from "./flash/lesson-topbar";
import { ExitModal } from "./flash/exit-modal";
import { ShortcutsModal } from "./flash/shortcuts-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { IconButton } from "@/components/ui/icon-button";
import { ChevronLeft, ChevronRight, Printer, Star, Volume2 } from "@/components/ui/icon";

/* Item có câu ví dụ RIÊNG không? Custom deck (C10) fallback example.zh = hanzi
   khi row không có exampleZh — coi như không có ví dụ (khớp clone example:null). */
function hasOwnExample(w: LessonItem): boolean {
  return Boolean(w.example) && w.example.zh !== w.hanzi;
}

function ExampleTab() {
  const { items } = useLesson();
  const { speak } = useTts();
  return (
    <div id="tab-examples" className="space-y-2">
      {items
        .filter(hasOwnExample)
        .map((w) => (
          <Card key={w.itemKey} className="p-3 flex items-start justify-between gap-3">
            <div>
              <div className="zh text-lg font-bold">{w.example.zh}</div>
              <div className="text-xs text-text-secondary mt-0.5">
                {pinyinLine(w.example.pinyinPerChar)}
              </div>
              <div className="text-sm mt-1">→ {w.example.vi}</div>
            </div>
            <IconButton
              label="Phát âm câu ví dụ"
              className="shrink-0"
              onClick={() => speak(w.example.zh)}
            >
              <Volume2 size={20} strokeWidth={1.5} />
            </IconButton>
          </Card>
        ))}
    </div>
  );
}

/* "Thêm cả bài vào ôn tập" — port clone/js/lesson.js:130-140, idempotent qua
   progressStore.addSrsBatch (spec 10 §3.2: từ đã có trong SRS không thêm lại). */
function AddAllButton() {
  const { items } = useLesson();
  const toast = useToastSafe();
  return (
    <Button
      type="button"
      id="btn-add-all"
      variant="secondary"
      className="w-full"
      onClick={() => {
        const added = progressStore.addSrsBatch(items.map((it) => it.itemKey));
        toast(added > 0 ? `Đã thêm ${added} từ vào ôn tập` : "Tất cả từ đã có trong bộ ôn tập");
        // nhai:progress để Topbar update (đồng bộ nhai.srs.new như clone)
        window.dispatchEvent(new CustomEvent("nhai:progress"));
      }}
    >
      <Star size={16} strokeWidth={1.5} aria-hidden="true" />
      Thêm cả bài vào ôn tập
    </Button>
  );
}

function LessonBody({ topbarTitle }: { topbarTitle: string }) {
  const { items, index, setIndex, mode, setMode, autoplay, toggleAutoplay } = useLesson();
  const [tab, setTab] = useState<"vocab" | "examples">("vocab");
  const [exitOpen, setExitOpen] = useState(false);
  const [keysOpen, setKeysOpen] = useState(false);
  const Mode = modeRegistry[mode];
  // customNoExample (clone/js/lesson.js:66,118): deck không có ví dụ nào → ẩn Đọc hiểu + Nghe ghép câu
  const hasExample = items.some(hasOwnExample);

  return (
    <div>
      {/* topbar bài học (port header[data-od-id="lesson-topbar"]) — dùng chung mọi mode */}
      <LessonTopbar
        title={topbarTitle}
        current={Math.min(index + 1, items.length)}
        total={items.length}
        autoplay={autoplay}
        onToggleAutoplay={toggleAutoplay}
        onExit={() => setExitOpen(true)}
        onShortcuts={() => setKeysOpen(true)}
      />

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_240px]">
        {/* khu chính */}
        <div className="relative min-w-0">
          {mode === "flash" ? (
            /* flash SRS mới (port main.stage) — thay tabs + flashcard 3D cũ */
            <FlashStage onRequestExit={() => setExitOpen(true)} />
          ) : (
            <div className="relative">
              {/* Watermark bản đồ Việt Nam (SPEC-14 §1, port lesson.html:64) */}
              <img
                src="/assets/vietnam-map.svg"
                alt=""
                aria-hidden="true"
                data-watermark
                className="absolute left-8 top-1/3 opacity-[0.08] pointer-events-none select-none w-40"
              />

              {/* tabs — counter — controls của mode (giữ nguyên cho 6 mode cũ) */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 no-print">
                <div className="flex gap-1">
                  <Chip data-tab="vocab" selected={tab === "vocab"} onClick={() => setTab("vocab")}>
                    Từ vựng
                  </Chip>
                  <Chip data-tab="examples" selected={tab === "examples"} onClick={() => setTab("examples")}>
                    Ví dụ
                  </Chip>
                </div>
                <Chip className="text-xs" data-testid="mode-counter">
                  {Math.min(index + 1, items.length)} / {items.length}
                </Chip>
                <div id="mode-tools" className="flex flex-wrap items-center gap-2" />
              </div>

              {tab === "examples" ? (
                <ExampleTab />
              ) : (
                <div id="tab-vocab">
                  <div id="mode-content">{Mode ? <Mode /> : null}</div>

                  {/* điều hướng từ */}
                  <div className="flex items-center justify-between gap-2 mt-3 no-print">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={index === 0}
                      onClick={() => setIndex(Math.max(0, index - 1))}
                    >
                      <ChevronLeft size={16} strokeWidth={1.5} aria-hidden="true" />
                      Trước
                    </Button>
                    <span className="zh text-[32px] font-extrabold" data-testid="current-word">
                      {items[index]?.hanzi}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={index >= items.length - 1}
                      onClick={() => setIndex(Math.min(items.length - 1, index + 1))}
                    >
                      Sau
                      <ChevronRight size={16} strokeWidth={1.5} aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* danh sách từ cuối trang — luôn hiện (port lesson.js:229-280) */}
          <div className="mt-6">
            <WordList />
          </div>
        </div>

        {/* sidebar chế độ học (port lesson.js:110-141) — giữ nguyên */}
        <aside className="no-print">
          <Card className="p-3">
            <div className="text-sm font-extrabold mb-2">Chọn chế độ học</div>
            <div id="sidebar-modes">
              {modeOrder.map((id: LessonMode) => {
                if (!hasExample && (id === "reading" || id === "listen")) return null;
                const meta = modeLabels[id];
                const active = mode === id;
                return (
                  <Button
                    key={id}
                    type="button"
                    data-mode={id}
                    variant={active ? "primary" : "ghost"}
                    className={
                      "w-full justify-between mb-2 " +
                      (active ? "" : "border border-border-default")
                    }
                    onClick={() => setMode(id)}
                  >
                    <span>{meta.name}</span>
                    <span
                      className={
                        "text-xs font-bold whitespace-nowrap " +
                        (active ? "text-white/80" : "text-text-secondary")
                      }
                    >
                      {meta.badge}
                    </span>
                  </Button>
                );
              })}
            </div>
            <Button
              type="button"
              id="btn-print"
              variant="ghost"
              size="sm"
              className="w-full mb-2 border border-border-default"
              onClick={() => window.print()}
            >
              <Printer size={16} strokeWidth={1.5} aria-hidden="true" />
              In file
            </Button>
            <AddAllButton />
          </Card>
        </aside>
      </div>

      {/* modals dùng chung mọi mode (port #exitModal/#keysModal) */}
      <ExitModal open={exitOpen} onClose={() => setExitOpen(false)} lessonTitle={topbarTitle} />
      <ShortcutsModal open={keysOpen} onClose={() => setKeysOpen(false)} />
    </div>
  );
}

export default function LessonClient({
  items,
  book,
  page,
  deckName,
  title,
}: {
  items?: LessonItem[];
  book?: string;
  page?: string;
  deckName?: string;
  title?: string;
}) {
  const num = page ? (/^lesson-(\d+)$/.exec(page)?.[1] ?? page) : null;
  const heading = title ?? deckName ?? "Bài học";
  const topbarTitle = book && num ? `Bài ${num}: ${heading}` : heading;
  return (
    <LessonProvider items={items ?? []} book={book} page={page} deckName={deckName}>
      <div className="mx-auto max-w-[880px]">
        <LessonBody topbarTitle={topbarTitle} />
      </div>
    </LessonProvider>
  );
}
```

- [ ] **Step 7: Xoá flash mode cũ + cập nhật e2e**

```bash
git rm app-next/src/components/lesson/modes/flashcard.tsx app-next/src/components/lesson/__tests__/flashcard.test.tsx
```

Trong `e2e/learning-flow.spec.ts`, thay 2 dòng giữa test "home → course → lesson → flip → star từ":

```ts
  // CŨ: await page.getByText("Click để lật").click();
  // CŨ: await expect(page.locator("#mode-content").getByText("Xin chào", { exact: true })).toBeVisible();
  // MỚI:
  await page.getByRole("article", { name: "Thẻ ghi nhớ, chạm để xem nghĩa" }).click();
  await expect(page.getByText("Xin chào", { exact: true })).toBeVisible(); // nghĩa trong panel reveal
```

(Restar phần "Thêm vào bộ thẻ ôn tập" giữ nguyên — WordList vẫn còn.)

- [ ] **Step 8: Chạy toàn bộ test lesson + typecheck + lint**

Run: `pnpm exec vitest run src/components/lesson && pnpm typecheck && pnpm lint`
Expected: PASS. Nếu `custom-deck-modes.test.tsx` fail vì giả định UI flash cũ → sửa test đó để chỉ assert sidebar button (file này đã chỉ assert button name — thường pass).

- [ ] **Step 9: Commit**

```bash
git add -A app-next/src/components/lesson app-next/e2e/learning-flow.spec.ts
git commit -m "feat(lesson): FlashStage tích hợp + xoá flashcard mode cũ (port main.stage lesson.html)"
```

---

### Task 12: Regression toàn repo + e2e smoke + finalize

**Files:**
- Không tạo file mới (chạy kiểm chứng; sửa lỗi phát hiện nếu có)

**Interfaces:**
- Consumes: mọi task trước.
- Produces: branch sạch, toàn bộ test/typecheck/lint pass, e2e smoke pass.

- [ ] **Step 1: Full test suite**

Run: `pnpm test`
Expected: PASS toàn repo (bao gồm các test home-dashboard đã có trên branch).

- [ ] **Step 2: Typecheck + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 3: E2E smoke (cần dev server)**

```bash
lsof -ti:3100 | xargs kill 2>/dev/null; cd app-next && pnpm dev --port 3100 &
# chờ server sẵn rồi:
pnpm test:e2e -- e2e/learning-flow.spec.ts
```

Expected: test "home → course → lesson → flip → star từ" PASS với UI mới (reveal qua click card, nghĩa hiện, star WordList vẫn hoạt động). Nếu fail vì selector — kiểm tra `aria-label` card và text nghĩa.

- [ ] **Step 4: Đối chiếu spec từng mục** (checklist tay, sửa ngay nếu thiếu)

- [ ] Topbar: thoát / progress jade / autoplay / phím tắt / theme — Task 7
- [ ] Flashcard: counter, glyph, pinyin, speaker ripple, xem nét viết, reveal, example + mini-audio, hint — Task 9
- [ ] SrsDeck: reveal ⇄ 3 grade rose/amber/primary + hotkey — Task 8
- [ ] recordReview 3 mức + dueAt — Task 3; provider grade/done/autoplay — Task 4
- [ ] Completion 棒 — Task 9
- [ ] Hotkeys Space/1/2/3/R/Esc + guard modal — Task 11
- [ ] StrokeStudio: char-tabs, py-pill, grid, hoạt họa, tốc độ, tự luyện viết, info col, nodata — Task 10
- [ ] Exit/Shortcuts modal — Task 5, 6
- [ ] 6 mode cũ hoạt động dưới topbar mới — Task 11
- [ ] E2E smoke pass — bước 3

- [ ] **Step 5: Commit cuối (nếu có sửa)**

```bash
git add -A && git commit -m "chore(lesson): regression + e2e smoke flash SRS mới"
```

---

## Ghi chú thực thi

- Task phụ thuộc: 1→7, 2→5, 3→4, 4→(8,9,10,11), 5→6, (8,9,10)→11, 11→12. Có thể chạy song song: (T1, T2, T3) → (T4, T5) → (T6, T7, T8, T9, T10) → T11 → T12.
- Mọi code trong plan đã đối chiếu với API thật của repo (Progress/Dialog/store/provider/useKeyboard/useTts/toast/theme, `VocabWord.example.pinyinPerChar`, `hanziChars`). Nếu chạy ra khác biệt nhỏ (tên import, dòng chính xác), ưu tiên code thật trong repo và giữ nguyên interface trong phần **Interfaces**.
- Kết thúc: báo cáo theo superpowers:verification-before-completion (evidence trước khi claim xong).
