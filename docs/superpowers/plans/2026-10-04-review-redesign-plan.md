# Review Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port 100% UI mock `opendesign_hsk/review.html` thành trang `/review` mới trong `app-next`, wire dữ liệu SRS thật + ghi grade thật (1 phút / 5 phút / 3–7 ngày).

**Architecture:** Feature-folder `src/components/review/` (6 component mới), logic thuần trong `src/lib/srs-session.ts` + mở rộng `src/lib/stats/review.ts`, store ghi qua `progressStore.recordReview()`. Trang giữ pattern mounted-gate + tick `nhai:progress`. Session là overlay full-screen cùng trang; stroke studio dùng lại `useStrokePlayer` mở rộng.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4 CSS-first (token trong `globals.css`, KHÔNG có tailwind.config), Vitest jsdom colocated `__tests__/`, icon chỉ qua `@/components/ui/icon`.

**Spec:** `docs/superpowers/specs/2026-10-04-review-redesign-design.md` — executor đọc cả spec và plan.

## Global Constraints

- Làm việc trong `/Users/manhphi/Documents/Development/App/hsk/app-next`, nhánh `home-dashboard-redesign`. Test chạy từ `app-next/`: `pnpm vitest run <file>`.
- Icon: chỉ import từ `@/components/ui/icon` (barrel lucide-react, `ICON_STROKE = 1.5`). Cấm import `lucide-react` trực tiếp.
- Màu/radius: chỉ token Tailwind (`bg-surface-elevated`, `text-action-primary`, `rounded-card`…). Cấm hard-code hex trong component.
- Font Hán tự: class `zh` (đã định nghĩa trong `globals.css`).
- Touch target 44px (`min-h-11`) trừ **nút mini 32px trong bảng/cards của vocab-inspector** — ngoại lệ được spec §3 chỉ định (nút icon 32px có `aria-label`).
- `useTts`/`useToastSafe` phải dùng được trong test jsdom: speechSynthesis không tồn tại trong jsdom → test phải stub (xem Task 12).
- Commit mỗi task, message kiểu `feat(review): ...` (tiếng Việt không dấu, theo convention git log hiện có).
- KHÔNG đổi `SrsItem` shape, KHÔNG thêm dependency mới, KHÔNG đụng shell (Topbar/SidebarNav/BottomNav).

## Review Focus

1. **localStorage rỗng / JSON hỏng** → trang vẫn render (hero 0 từ, buckets "Trống"), không crash. Pin ở Task 12 test 1.
2. **Key SRS không resolve được** (book/page lạ, deck đã xoá) → bị loại khỏi queue/buckets, mem% không bao giờ NaN. Pin ở Task 3 test.
3. **Hydration**: render SSR phải bằng render client đầu tiên (mounted gate — mọi số là 0/rỗng trước mount). Pin ở Task 12 test 1.
4. **`recordReview` trên key không tồn tại** → trả `null`, không throw, không ghi. Pin ở Task 4 test.
5. **Session 0 từ** → CTA vẫn bấm được nhưng chỉ toast "Chưa có từ đến hạn…", overlay không mở. Pin ở Task 12 test 1.

---

### Task 1: Wash tokens + `Card tone` + `Progress tone`

**Files:**
- Modify: `app-next/src/app/globals.css` (:root, html.dark, @theme inline)
- Modify: `app-next/src/components/ui/card.tsx`
- Modify: `app-next/src/components/ui/progress.tsx`
- Test: `app-next/src/components/ui/__tests__/card.test.tsx` (mới), `progress.test.tsx` (mới)

**Interfaces:**
- Produces: `Card` nhận `tone?: "rose" | "amber" | "jade"`; `Progress` nhận `tone?: "jade" | "vermilion" | "amber"` (mặc định `"jade"` — cũ không có fill jade, mặc định mới không phá caller cũ vì caller cũ dùng mặc định vermilion; kiểm tra: grep caller `Progress` trước khi đổi, nếu caller nào cần đỏ vermilion cũ thì truyền `tone="vermilion"`).
- Produces: token Tailwind `bg-rose-wash`, `bg-jade-wash` (dark tự flip).

- [ ] **Step 1: Thêm tokens vào `globals.css`**

Trong khối `:root`, ngay sau dòng `--hz-amber: ...`:

```css
  --hz-rose-wash: #fef2f2;  --hz-jade-wash: #ecfdf5;
```

Trong khối `html.dark`, ngay sau dòng `--hz-amber-wash: #312512; --hz-amber-ink: #f5d98b;`:

```css
  --hz-rose-wash: rgba(127,29,29,.25);  --hz-jade-wash: rgba(6,95,70,.25);
```

Trong khối `@theme inline`, ngay sau dòng `--color-amber-ink: ...`:

```css
  --color-rose-wash: var(--hz-rose-wash);
  --color-jade-wash: var(--hz-jade-wash);
```

- [ ] **Step 2: Write failing test cho Card tone**

`app-next/src/components/ui/__tests__/card.test.tsx`:


```tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { Card } from "../card";

afterEach(cleanup);

describe("Card tone", () => {
  it("tone rose → bg-rose-wash; không tone → bg-surface-elevated", () => {
    const { container, rerender } = render(<Card tone="rose" />);
    expect(container.firstElementChild!.className).toContain("bg-rose-wash");
    rerender(<Card />);
    expect(container.firstElementChild!.className).toContain("bg-surface-elevated");
  });
  it("tone amber/jade map đúng wash", () => {
    const { container, rerender } = render(<Card tone="amber" />);
    expect(container.firstElementChild!.className).toContain("bg-amber-wash");
    rerender(<Card tone="jade" />);
    expect(container.firstElementChild!.className).toContain("bg-jade-wash");
  });
});
```

- [ ] **Step 3: Run test verify FAIL**

Run: `pnpm vitest run src/components/ui/__tests__/card.test.tsx`
Expected: FAIL — `bg-rose-wash` không xuất hiện (prop `tone` chưa tồn tại, TS có thể báo lỗi prop).

- [ ] **Step 4: Implement Card tone**

Sửa `card.tsx`:

```tsx
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const shadows = {
  none: "",
  xs: "shadow-xs",
  md: "shadow-md",
} as const;

const tones = {
  neutral: "",
  rose: "bg-rose-wash border-learning-due/30",
  amber: "bg-amber-wash border-learning-streak/30",
  jade: "bg-jade-wash border-learning-mastered/30",
} as const;

export function Card({
  shadow = "xs",
  tone = "neutral",
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & {
  shadow?: keyof typeof shadows;
  tone?: keyof typeof tones;
}) {
  return (
    <div
      className={cn(
        "rounded-card border border-border-default bg-surface-elevated p-6",
        shadows[shadow],
        tone !== "neutral" && tones[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 5: Write failing test cho Progress tone**

`app-next/src/components/ui/__tests__/progress.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { Progress } from "../progress";

afterEach(cleanup);

describe("Progress tone", () => {
  it("mặc định (không tone) giữ fill action-primary; gradient vẫn ưu tiên", () => {
    const { container } = render(<Progress value={40} />);
    expect(container.querySelector(".bg-action-primary")).not.toBeNull();
    const { container: c2 } = render(<Progress value={40} gradient />);
    expect(c2.querySelector('[class*="bg-gradient"]')).not.toBeNull();
  });
  it("size sm → track h-1.5; mặc định h-2.5", () => {
    const { container } = render(<Progress value={40} size="sm" />);
    expect(container.querySelector(".h-1\\.5")).not.toBeNull();
    const { container: c2 } = render(<Progress value={40} />);
    expect(c2.querySelector(".h-2\\.5")).not.toBeNull();
  });
  it("tone vermilion/amber đổi class fill", () => {
    const { container } = render(<Progress value={40} tone="vermilion" />);
    expect(container.querySelector(".bg-action-primary")).not.toBeNull();
    const { container: c2 } = render(<Progress value={40} tone="amber" />);
    expect(c2.querySelector(".bg-learning-progress")).not.toBeNull();
  });
  it("fill width theo value + role progressbar", () => {
    const { container } = render(<Progress value={45} ariaLabel="Độ bền" />);
    expect(container.querySelector('[role="progressbar"]')).not.toBeNull();
    expect((container.querySelector('[role="progressbar"] > div') as HTMLElement).style.width).toBe("45%");
  });
});
```

- [ ] **Step 6: Run verify FAIL** — `pnpm vitest run src/components/ui/__tests__/progress.test.tsx` → FAIL (`tone` chưa tồn tại).

- [ ] **Step 7: Implement Progress tone** — sửa `progress.tsx`, thay class fill:

```tsx
const toneFill = {
  jade: "bg-learning-mastered",
  vermilion: "bg-action-primary",
  amber: "bg-learning-progress",
} as const;
```

Signature thêm `tone = "vermilion" as const` (giữ mặc định vermilion = hành vi cũ) và `size = "md" as const` (track: `size === "sm" ? "h-1.5" : "h-2.5"` — membar của review dùng `sm`), fill div:

```tsx
<div
  className={cn(
    "h-full rounded-full transition-[width] duration-700",
    gradient ? "bg-gradient-to-r from-learning-mastered to-action-primary" : toneFill[tone],
  )}
  style={{ width: `${pct}%` }}
/>
```

với prop type `tone?: keyof typeof toneFill`. Sau đó grep caller hiện có của `Progress` (`grep -rn "<Progress" src/`) — caller nào mong fill jade (ví dụ membar sau này) tự truyền tone; không sửa caller cũ.

- [ ] **Step 8: Run verify PASS** — cả 2 file test PASS.

- [ ] **Step 9: Commit**

```bash
git add app-next/src/app/globals.css app-next/src/components/ui/card.tsx app-next/src/components/ui/progress.tsx app-next/src/components/ui/__tests__/card.test.tsx app-next/src/components/ui/__tests__/progress.test.tsx
git commit -m "feat(ui): rose/jade wash tokens + Card tone + Progress tone cho review redesign"
```

---

### Task 2: `memoryStrength` + `Grade` + `applyGrade` trong `lib/stats/review.ts`

**Files:**
- Modify: `app-next/src/lib/stats/review.ts`
- Test: `app-next/src/lib/stats/__tests__/review.test.ts` (mới)

**Interfaces:**
- Produces (Task 3, 4, 5, 11, 12 phụ thuộc):
  - `export type Grade = "forgot" | "hard" | "good";`
  - `export function memoryStrength(it: SrsItem, now: number): number` — 5..100
  - `export function memTone(m: number): "weak" | "mid" | "strong"` — ngưỡng <55 weak, <=80 mid, còn lại strong
  - `export function memLabel(m: number): "Yếu" | "Vừa" | "Sâu"` — <50 Yếu, <70 Vừa
  - `export function applyGrade(it: SrsItem, grade: Grade, now: number): SrsItem`
- Module này KHÔNG import progressStore (chỉ `import type { SrsItem }`) — tránh cycle với Task 4.

- [ ] **Step 1: Write failing test**

`app-next/src/lib/stats/__tests__/review.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { memoryStrength, memTone, memLabel, applyGrade, type Grade } from "../review";
import type { SrsItem } from "@/lib/store/progress-store";

const NOW = 1_800_000_000_000;
const DAY = 86_400_000;

function item(over: Partial<SrsItem> = {}): SrsItem {
  return { key: "hsk1.lesson-1.0", status: "new", dueAt: null, reviewCount: 0, lastReviewedAt: null, updatedAt: NOW, ...over };
}

describe("memoryStrength", () => {
  it("new chưa ôn = 25", () => {
    expect(memoryStrength(item(), NOW)).toBe(25);
  });
  it("base theo status + cap +10 theo reviewCount", () => {
    expect(memoryStrength(item({ status: "learning", reviewCount: 2 }), NOW)).toBe(57);
    expect(memoryStrength(item({ status: "learning", reviewCount: 50 }), NOW)).toBe(65);
    expect(memoryStrength(item({ status: "learned", reviewCount: 4 }), NOW)).toBe(84);
    expect(memoryStrength(item({ status: "known", reviewCount: 9 }), NOW)).toBe(100);
  });
  it("quá hạn decay -4/ngày, floor 5", () => {
    expect(memoryStrength(item({ status: "learning", reviewCount: 3, dueAt: NOW - 2 * DAY }), NOW)).toBe(50);
    expect(memoryStrength(item({ status: "new", dueAt: NOW - 100 * DAY }), NOW)).toBe(5);
  });
  it("chưa đến hạn không decay", () => {
    expect(memoryStrength(item({ status: "learning", reviewCount: 3, dueAt: NOW + 3 * DAY }), NOW)).toBe(58);
  });
});

describe("memTone / memLabel", () => {
  it("ngưỡng tone 55/80", () => {
    expect(memTone(54)).toBe("weak");
    expect(memTone(55)).toBe("mid");
    expect(memTone(80)).toBe("mid");
    expect(memTone(81)).toBe("strong");
  });
  it("ngưỡng label 50/70", () => {
    expect(memLabel(49)).toBe("Yếu");
    expect(memLabel(50)).toBe("Vừa");
    expect(memLabel(69)).toBe("Vừa");
    expect(memLabel(70)).toBe("Sâu");
  });
});

describe("applyGrade", () => {
  const cases: [Grade, Partial<SrsItem>, Partial<SrsItem>][] = [
    ["forgot", { status: "learning" }, { status: "learning", dueAt: NOW + 60_000 }],
    ["hard", { status: "learning" }, { status: "learning", dueAt: NOW + 300_000 }],
    ["good", { status: "learning", reviewCount: 0 }, { status: "learning", dueAt: NOW + 3 * DAY }],
    ["good", { status: "learned", reviewCount: 3 }, { status: "learned", dueAt: NOW + 7 * DAY }],
  ];
  it.each(cases)("%s từ %s → dueAt/status đúng bảng spec 2.1", (grade, from, to) => {
    const next = applyGrade(item({ ...from, lastReviewedAt: NOW - DAY }), grade, NOW);
    expect(next.status).toBe(to.status);
    expect(next.dueAt).toBe(to.dueAt);
    expect(next.reviewCount).toBe((from.reviewCount ?? 0) + 1);
    expect(next.lastReviewedAt).toBe(NOW);
    expect(next.updatedAt).toBe(NOW);
  });
  it("good thăng cấp: learning đạt 3 lần ôn → learned; learned đạt 6 lần → known", () => {
    expect(applyGrade(item({ status: "learning", reviewCount: 2 }), "good", NOW).status).toBe("learned");
    expect(applyGrade(item({ status: "learned", reviewCount: 5 }), "good", NOW).status).toBe("known");
  });
  it("forgot/hard luôn kéo về learning (kể cả learned/known)", () => {
    expect(applyGrade(item({ status: "known" }), "forgot", NOW).status).toBe("learning");
    expect(applyGrade(item({ status: "learned" }), "hard", NOW).status).toBe("learning");
  });
  it("không mutate item gốc", () => {
    const orig = item({ status: "learning" });
    const next = applyGrade(orig, "good", NOW);
    expect(orig.status).toBe("learning");
    expect(next).not.toBe(orig);
  });
});
```

- [ ] **Step 2: Run verify FAIL** — `pnpm vitest run src/lib/stats/__tests__/review.test.ts` → FAIL (memoryStrength/applyGrade chưa tồn tại).

- [ ] **Step 3: Implement** — thêm vào cuối `src/lib/stats/review.ts`:

```ts
/* ---------- Review redesign (spec 2026-10-04 §2.1, §2.3) ---------- */

export type Grade = "forgot" | "hard" | "good";

const MEM_BASE: Record<SrsItem["status"], number> = { new: 25, learning: 55, learned: 80, known: 92 };

/* Độ bền trí nhớ suy diễn (spec §2.3): base theo status, + min(reviewCount, 10),
   -4/ngày khi quá hạn (floor 5). Không thêm trường mới vào SrsItem. */
export function memoryStrength(it: SrsItem, now: number): number {
  let m = MEM_BASE[it.status] ?? 25;
  m += Math.min(it.reviewCount, 10);
  if (it.dueAt != null && it.dueAt < now) m -= Math.floor((now - it.dueAt) / DAY) * 4;
  return Math.max(5, Math.min(100, Math.round(m)));
}

export type MemTone = "weak" | "mid" | "strong";

export function memTone(m: number): MemTone {
  return m < 55 ? "weak" : m <= 80 ? "mid" : "strong";
}

export function memLabel(m: number): "Yếu" | "Vừa" | "Sâu" {
  return m < 50 ? "Yếu" : m < 70 ? "Vừa" : "Sâu";
}

/* Bảng grade spec §2.1. Thăng cấp khi "good" (quyết định plan, spec không định nghĩa):
   learning/new đạt 3 lần ôn → learned; learned đạt 6 lần → known. */
export function applyGrade(it: SrsItem, grade: Grade, now: number): SrsItem {
  const reviewCount = it.reviewCount + 1;
  let status: SrsItem["status"];
  let dueAt: number;
  if (grade === "forgot") {
    status = "learning";
    dueAt = now + 60_000;
  } else if (grade === "hard") {
    status = "learning";
    dueAt = now + 300_000;
  } else {
    if (it.status === "known") status = "known";
    else if (it.status === "learned") status = reviewCount >= 6 ? "known" : "learned";
    else status = reviewCount >= 3 ? "learned" : "learning";
    dueAt = now + (status === "learned" || status === "known" ? 7 : 3) * DAY;
  }
  return { ...it, status, dueAt, reviewCount, lastReviewedAt: now, updatedAt: now };
}
```

- [ ] **Step 4: Run verify PASS** — `pnpm vitest run src/lib/stats/__tests__/review.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add app-next/src/lib/stats/review.ts app-next/src/lib/stats/__tests__/review.test.ts
git commit -m "feat(review): memoryStrength + memTone/memLabel + applyGrade (spec 2.1, 2.3)"
```

---

### Task 3: `lib/srs-session.ts` — resolve word, level, lastLabel, buildQueue

**Files:**
- Create: `app-next/src/lib/srs-session.ts`
- Test: `app-next/src/lib/__tests__/srs-session.test.ts` (mới)

**Interfaces:**
- Consumes: `memoryStrength` từ Task 2; `progressStore.getDeckItem` hiện có; `vocab` từ `@/content/vocab`; type `SrsItem`.
- Produces (Task 8, 11, 12 phụ thuộc):
  - `export type ReviewableWord = { key: string; zh: string; pinyin: string; meaning: string; level: string; mem: number; lastLabel: string; isNew: boolean };`
  - `export function srsLevelFromKey(key: string): string` — `hsk1.…` → `"HSK 1"`, còn lại (deck/notebook) → `"HSK 2"`
  - `export function formatLastLabel(ts: number | null, now: number): string`
  - `export function resolveWord(key: string): { zh: string; pinyin: string; meaning: string } | null`
  - `export function buildQueue(items: SrsItem[], level: string, now: number): ReviewableWord[]`

- [ ] **Step 1: Write failing test**

`app-next/src/lib/__tests__/srs-session.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { buildQueue, srsLevelFromKey, formatLastLabel, resolveWord } from "../srs-session";
import { progressStore, type SrsItem } from "@/lib/store/progress-store";
import { vocab } from "@/content/vocab";

const NOW = 1_800_000_000_000;
const DAY = 86_400_000;

beforeEach(() => localStorage.clear());

function item(key: string, over: Partial<SrsItem> = {}): SrsItem {
  return { key, status: "new", dueAt: NOW, reviewCount: 0, lastReviewedAt: null, updatedAt: NOW, ...over };
}

describe("srsLevelFromKey", () => {
  it("hsk1/hsk3 prefix → HSK N; deck.* → HSK 2", () => {
    expect(srsLevelFromKey("hsk1.lesson-1.0")).toBe("HSK 1");
    expect(srsLevelFromKey("hsk3.lesson-2.5")).toBe("HSK 3");
    expect(srsLevelFromKey("deck.abc.0")).toBe("HSK 2");
  });
});

describe("formatLastLabel", () => {
  it("null → Chưa ôn; hôm nay / hôm qua / N ngày trước", () => {
    expect(formatLastLabel(null, NOW)).toBe("Chưa ôn");
    expect(formatLastLabel(NOW - 3600_000, NOW)).toBe("Hôm nay");
    expect(formatLastLabel(NOW - 1 * DAY, NOW)).toBe("Hôm qua");
    expect(formatLastLabel(NOW - 3 * DAY, NOW)).toBe("3 ngày trước");
  });
});

describe("resolveWord", () => {
  it("key vocab → word từ content/vocab", () => {
    const [book] = Object.keys(vocab);
    const [page] = Object.keys(vocab[book]);
    const w = vocab[book][page].words[0];
    const r = resolveWord(`${book}.${page}.0`);
    expect(r).toEqual({ zh: w.hanzi, pinyin: w.pinyin, meaning: w.meaning });
  });
  it("key không tồn tại → null", () => {
    expect(resolveWord("hsk9.khong-ton-tai.999")).toBeNull();
    expect(resolveWord("rác")).toBeNull();
  });
  it("key deck → row từ progressStore decks", () => {
    const deck = progressStore.createDeck("vocab", "Deck test");
    progressStore.getDeckItem; // noop cho TS biết dùng store
    // ghi trực tiếp 1 row qua createDeck rồi tự chèn row bằng saveDecks nội bộ không đượcExpose
    // → dùng addSrsBatch-style: tạo deck rồi mutate mảng rows qua listDecks không được; dùng cách dưới
    // (ProgressStore không có addRow → mock qua localStorage JSON chuẩn shape DeckItem[])
    const decks = JSON.parse(localStorage.getItem("nhai.decks")!);
    decks[0].rows = [{ hanzi: "爱", pinyin: "ài", meaning: "Yêu" }];
    localStorage.setItem("nhai.decks", JSON.stringify(decks));
    expect(resolveWord(`deck.${deck.id}.0`)).toEqual({ zh: "爱", pinyin: "ài", meaning: "Yêu" });
    expect(resolveWord(`deck.${deck.id}.7`)).toBeNull(); // row ngoài phạm vi
  });
});

describe("buildQueue", () => {
  it("lọc theo level + loại key không resolve", () => {
    const [book] = Object.keys(vocab);
    const [page] = Object.keys(vocab[book]);
    const key = `${book}.${page}.0`;
    const items = [item(key), item("hsk9.xxx.999"), item("hsk1.lesson-1.0")];
    const queue = buildQueue(items, srsLevelFromKey(key), NOW);
    expect(queue.map((w) => w.key)).toEqual([key]);
    expect(queue[0].zh.length).toBeGreaterThan(0);
    expect(queue[0].mem).toBe(25);
    expect(queue[0].isNew).toBe(true);
  });
  it("đến hạn trước, chưa hạn sau; cùng nhóm sort theo key", () => {
    const [book] = Object.keys(vocab);
    const [page] = Object.keys(vocab[book]);
    const a = `${book}.${page}.0`, b = `${book}.${page}.1`, c = `${book}.${page}.2`;
    const items = [
      item(b, { status: "learning", dueAt: NOW + DAY }),   // chưa hạn
      item(a, { status: "learning", dueAt: NOW - DAY }),   // đến hạn
      item(c, { status: "learning", dueAt: NOW - 2 * DAY }), // đến hạn
    ];
    const queue = buildQueue(items, "HSK 1", NOW);
    // 2 item đến hạn sort theo key: a ("...0") trước c ("...2"); b chưa hạn sau
    expect(queue.map((w) => w.key)).toEqual([a, c, b]);
  });
  it("queue rỗng khi không có item nào khớp", () => {
    expect(buildQueue([], "HSK 2", NOW)).toEqual([]);
  });
});
```

Lưu ý Step 1 đã lẫn "ghi chú suy nghĩ" vào test `resolveWord` deck — viết bản sạch: bỏ 2 dòng comment `progressStore.getDeckItem; // noop...` và comment block `// ghi trực tiếp...`, chỉ giữ:

```ts
  it("key deck → row từ progressStore decks", () => {
    const deck = progressStore.createDeck("vocab", "Deck test");
    const decks = JSON.parse(localStorage.getItem("nhai.decks")!);
    decks[0].rows = [{ hanzi: "爱", pinyin: "ài", meaning: "Yêu" }];
    localStorage.setItem("nhai.decks", JSON.stringify(decks));
    expect(resolveWord(`deck.${deck.id}.0`)).toEqual({ zh: "爱", pinyin: "ài", meaning: "Yêu" });
    expect(resolveWord(`deck.${deck.id}.7`)).toBeNull();
  });
```

- [ ] **Step 2: Run verify FAIL** — `pnpm vitest run src/lib/__tests__/srs-session.test.ts` → FAIL (module chưa tồn tại).

- [ ] **Step 3: Implement `src/lib/srs-session.ts`**

```ts
/* SRS session data (spec 2026-10-04 §2.2, §2.4). Thuần function — memoryStrength
   từ lib/stats/review, đọc decks qua progressStore (client singleton, jsdom OK). */

import { vocab } from "@/content/vocab";
import { progressStore, type SrsItem } from "@/lib/store/progress-store";
import { memoryStrength } from "@/lib/stats/review";

const DAY = 86_400_000;

export type ReviewableWord = {
  key: string;
  zh: string;
  pinyin: string;
  meaning: string;
  level: string;
  mem: number;
  lastLabel: string;
  isNew: boolean;
};

export function srsLevelFromKey(key: string): string {
  const m = /^hsk(\d+)\./.exec(key);
  return m ? `HSK ${m[1]}` : "HSK 2";
}

export function formatLastLabel(ts: number | null, now: number): string {
  if (ts == null) return "Chưa ôn";
  const days = Math.floor((now - ts) / DAY);
  if (days <= 0) return "Hôm nay";
  if (days === 1) return "Hôm qua";
  return `${days} ngày trước`;
}

export function resolveWord(key: string): { zh: string; pinyin: string; meaning: string } | null {
  const dm = /^deck\.([^.]+)\.(\d+)$/.exec(key);
  if (dm) {
    for (const kind of ["vocab", "grammar"] as const) {
      const deck = progressStore.getDeckItem(kind, dm[1]);
      const row = deck?.rows[Number(dm[2])];
      if (row) return { zh: row.hanzi, pinyin: row.pinyin ?? "", meaning: row.meaning ?? "" };
    }
    return null;
  }
  const m = /^([^.]+)\.([^.]+)\.(\d+)$/.exec(key);
  if (!m) return null;
  const word = vocab[m[1]]?.[m[2]]?.words[Number(m[3])];
  return word ? { zh: word.hanzi, pinyin: word.pinyin, meaning: word.meaning } : null;
}

/* Đến hạn (status != known && dueAt <= now) → 0; new/learning → 1; learned/known → 2. */
function orderBucket(it: SrsItem, now: number): number {
  if (it.status !== "known" && it.dueAt != null && it.dueAt <= now) return 0;
  if (it.status === "new" || it.status === "learning") return 1;
  return 2;
}

export function buildQueue(items: SrsItem[], level: string, now: number): ReviewableWord[] {
  const entries: { it: SrsItem; w: ReviewableWord }[] = [];
  for (const it of items) {
    if (srsLevelFromKey(it.key) !== level) continue;
    const r = resolveWord(it.key);
    if (!r) continue; // Review Focus #2 — key lạ bị loại, không NaN
    entries.push({
      it,
      w: {
        key: it.key,
        ...r,
        level,
        mem: memoryStrength(it, now),
        lastLabel: formatLastLabel(it.lastReviewedAt, now),
        isNew: it.reviewCount === 0,
      },
    });
  }
  entries.sort((a, b) => orderBucket(a.it, now) - orderBucket(b.it, now) || a.w.key.localeCompare(b.w.key));
  return entries.map((e) => e.w);
}
```

- [ ] **Step 4: Run verify PASS** — `pnpm vitest run src/lib/__tests__/srs-session.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add app-next/src/lib/srs-session.ts app-next/src/lib/__tests__/srs-session.test.ts
git commit -m "feat(review): lib/srs-session — resolveWord, srsLevelFromKey, formatLastLabel, buildQueue"
```

---

### Task 4: `progressStore.recordReview(key, grade, now?)`

**Files:**
- Modify: `app-next/src/lib/store/progress-store.ts` (interface `ProgressStoreApi` + class `ProgressStore`)
- Test: `app-next/src/lib/store/__tests__/record-review.test.ts` (mới)

**Interfaces:**
- Consumes: `applyGrade`, `type Grade` từ Task 2 (`import { applyGrade, type Grade } from "@/lib/stats/review"` — stats/review chỉ import type SrsItem nên KHÔNG cycle).
- Produces: `recordReview(key: string, grade: Grade, now?: number): SrsItem | null` — mutate + `writeSrsItems` + `dispatchProgress()`; key lạ → `null`, không ghi.

- [ ] **Step 1: Write failing test**

`app-next/src/lib/store/__tests__/record-review.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { progressStore } from "../progress-store";

const NOW = 1_800_000_000_000;

beforeEach(() => localStorage.clear());

describe("progressStore.recordReview", () => {
  it("ghi grade good: reviewCount+1, lastReviewedAt, dueAt 3 ngày (learning)", () => {
    progressStore.toggleSrs("hsk1.lesson-1.0");
    const next = progressStore.recordReview("hsk1.lesson-1.0", "good", NOW)!;
    expect(next.status).toBe("learning");
    expect(next.dueAt).toBe(NOW + 3 * 86_400_000);
    expect(next.reviewCount).toBe(1);
    // persist thật
    expect(progressStore.getSrs("hsk1.lesson-1.0")!.reviewCount).toBe(1);
  });
  it("bắn nhai:progress", () => {
    progressStore.toggleSrs("hsk1.lesson-1.0");
    const spy = vi.fn();
    window.addEventListener("nhai:progress", spy);
    progressStore.recordReview("hsk1.lesson-1.0", "forgot", NOW);
    expect(spy).toHaveBeenCalledTimes(1);
    window.removeEventListener("nhai:progress", spy);
  });
  it("key không tồn tại → null, không throw (Review Focus #4)", () => {
    expect(progressStore.recordReview("hsk1.khong-co.0", "good", NOW)).toBeNull();
  });
});
```

- [ ] **Step 2: Run verify FAIL** — `pnpm vitest run src/lib/store/__tests__/record-review.test.ts` → FAIL (method chưa có, TS lỗi).

- [ ] **Step 3: Implement**

Trong `progress-store.ts`:

1. Đầu file (sau imports hiện có): `import { applyGrade, type Grade } from "@/lib/stats/review";`
2. Interface `ProgressStoreApi` — thêm sau `addSrsBatch(keys: string[]): number;`:

```ts
  recordReview(key: string, grade: Grade, now?: number): SrsItem | null;
```

3. Class `ProgressStore` — thêm method ngay sau `addSrsBatch`:

```ts
  /* Review redesign spec §2.2 — ghi grade ôn tập; key lạ → null, không ghi. */
  recordReview(key: string, grade: Grade, now: number = Date.now()): SrsItem | null {
    const items = this.readSrsItems();
    const cur = items[key];
    if (!cur) return null;
    items[key] = applyGrade(cur, grade, now);
    this.writeSrsItems(items);
    dispatchProgress();
    return items[key];
  }
```

- [ ] **Step 4: Run verify PASS** — `pnpm vitest run src/lib/store/__tests__/record-review.test.ts` → PASS. Chạy thêm `pnpm vitest run src/lib/stats` để chắc không cycle import.

- [ ] **Step 5: Commit**

```bash
git add app-next/src/lib/store/progress-store.ts app-next/src/lib/store/__tests__/record-review.test.ts
git commit -m "feat(review): progressStore.recordReview ghi grade + dispatch nhai:progress"
```

---

### Task 5: `components/review/mem-bar.tsx`

**Files:**
- Create: `app-next/src/components/review/mem-bar.tsx`
- Test: `app-next/src/components/review/__tests__/mem-bar.test.tsx` (mới)

**Interfaces:**
- Consumes: `memTone`, `memLabel` từ Task 2.
- Produces: `MemBar({ value, className? })` — track 6px + `%` + pill nhãn; tone class theo `memTone`.

- [ ] **Step 1: Write failing test**

```tsx
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import { MemBar } from "../mem-bar";

afterEach(cleanup);

describe("MemBar", () => {
  it("hiện % + nhãn; tone weak → fill action-primary + pill feedback-error-text", () => {
    const { container } = render(<MemBar value={45} />);
    expect(container.textContent).toContain("45%");
    expect(container.textContent).toContain("Yếu");
    expect(container.querySelector(".bg-action-primary")).not.toBeNull();
    expect(container.querySelector(".text-feedback-error-text")).not.toBeNull();
  });
  it("mid → amber fill + pill amber-ink; strong → jade fill + pill mastered", () => {
    const { container } = render(<MemBar value={60} />);
    expect(container.querySelector(".bg-learning-progress")).not.toBeNull();
    expect(container.textContent).toContain("Vừa");
    const { container: c2 } = render(<MemBar value={90} />);
    expect(c2.querySelector(".bg-learning-mastered")).not.toBeNull();
    expect(c2.textContent).toContain("Sâu");
  });
  it("width fill = value%", () => {
    const { container } = render(<MemBar value={72} />);
    expect((container.querySelector(".bg-learning-mastered") as HTMLElement).style.width).toBe("72%");
  });
});
```

- [ ] **Step 2: Run verify FAIL** — module chưa tồn tại.

- [ ] **Step 3: Implement** (bọc `Progress` từ Task 1 với `size="sm"` + tone theo memTone — đúng spec §3)

```tsx
import { cn } from "@/lib/cn";
import { Progress } from "@/components/ui/progress";
import { memLabel, memTone, type MemTone } from "@/lib/stats/review";

const TONE_FILL: Record<MemTone, "vermilion" | "amber" | "jade"> = {
  weak: "vermilion",
  mid: "amber",
  strong: "jade",
};

const PILL: Record<MemTone, string> = {
  weak: "text-feedback-error-text border-feedback-error/40 bg-feedback-error/10",
  mid: "text-amber-ink border-learning-streak/40 bg-amber-wash",
  strong: "text-learning-mastered border-learning-mastered/40 bg-jade-wash",
};

/* Độ bền trí nhớ (mock .membar, spec §3): Progress sm + % + pill nhãn Yếu/Vừa/Sâu. */
export function MemBar({ value, className }: { value: number; className?: string }) {
  const tone = memTone(value);
  return (
    <span className={cn("flex min-w-40 items-center gap-2", className)}>
      <Progress
        value={value}
        tone={TONE_FILL[tone]}
        size="sm"
        className="flex-1"
        ariaLabel={`Độ bền trí nhớ ${value}%`}
      />
      <b className="min-w-9 text-right text-xs tabular-nums">{value}%</b>
      <span className={cn("whitespace-nowrap rounded-full border px-2 py-0.5 text-[10.5px] font-extrabold", PILL[tone])}>
        {memLabel(value)}
      </span>
    </span>
  );
}
```

- [ ] **Step 4: Run verify PASS.**
- [ ] **Step 5: Commit**

```bash
git add app-next/src/components/review/mem-bar.tsx app-next/src/components/review/__tests__/mem-bar.test.tsx
git commit -m "feat(review): MemBar do-ben tri nho (track + % + pill Yeu/Vua/Sau)"
```

---

### Task 6: `components/review/memory-hero.tsx`

**Files:**
- Create: `app-next/src/components/review/memory-hero.tsx`
- Test: `app-next/src/components/review/__tests__/memory-hero.test.tsx`

**Interfaces:**
- Produces: `MemoryHero({ count, avgMem, estMinutes, urgent, emptyQueue, onStart })` — `count/avgMem/estMinutes/urgent: number`, `emptyQueue: boolean`, `onStart: () => void`. CTA có `data-testid="start-session"`; số trong h1 có `data-testid="hero-count"`.

- [ ] **Step 1: Write failing test**

```tsx
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { MemoryHero } from "../memory-hero";

afterEach(cleanup);

describe("MemoryHero", () => {
  it("render kicker, h1 count tô vermilion, 3 stat", () => {
    const { container } = render(
      <MemoryHero count={18} avgMem={82} estMinutes={6} urgent={5} emptyQueue={false} onStart={() => {}} />
    );
    expect(container.textContent).toContain("TỔNG QUAN TRÍ NHỚ HÔM NAY");
    expect(container.querySelector('[data-testid="hero-count"]')!.textContent).toBe("18 từ");
    expect(container.textContent).toContain("82%");
    expect(container.textContent).toContain("~6 phút");
    expect(container.textContent).toContain("Cần ôn gấp");
  });
  it("CTA label theo emptyQueue; click gọi onStart", () => {
    const onStart = vi.fn();
    const { rerender } = render(
      <MemoryHero count={18} avgMem={82} estMinutes={6} urgent={5} emptyQueue={false} onStart={onStart} />
    );
    fireEvent.click(screen_getStart());
    expect(onStart).toHaveBeenCalledTimes(1);
    rerender(<MemoryHero count={0} avgMem={0} estMinutes={0} urgent={0} emptyQueue onStart={onStart} />);
    expect(screen_getStart().textContent).toContain("Ôn thử tất cả (0 từ)");
  });
});

function screen_getStart(): HTMLElement {
  return document.querySelector('[data-testid="start-session"]')!;
}
```

(Helper đặt cuối file, dùng `document.querySelector` cho gọn.)

- [ ] **Step 2: Run verify FAIL.**

- [ ] **Step 3: Implement**

```tsx
"use client";

import { Button } from "@/components/ui/button";
import { Play } from "@/components/ui/icon";

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="stat">
      <b className="block text-[19px] leading-tight">{value}</b>
      <span className="text-xs text-text-secondary">{label}</span>
    </div>
  );
}

/* Hero tổng quan (mock .hero, spec §3): kicker + h1 số tô vermilion + 3 stat + CTA lg. */
export function MemoryHero({
  count, avgMem, estMinutes, urgent, emptyQueue, onStart,
}: {
  count: number;
  avgMem: number;
  estMinutes: number;
  urgent: number;
  emptyQueue: boolean;
  onStart: () => void;
}) {
  return (
    <section
      aria-label="Tổng quan trí nhớ hôm nay"
      className="grid items-center gap-4 rounded-card border border-border-default bg-surface-elevated p-6 shadow-xs md:grid-cols-[1fr_auto]"
    >
      <div>
        <div className="text-[11px] font-extrabold tracking-[0.1em] text-text-secondary">
          TỔNG QUAN TRÍ NHỚ HÔM NAY
        </div>
        <h1 className="mt-1.5 text-[21px] leading-snug tracking-tight">
          Hôm nay có{" "}
          <span data-testid="hero-count" className="font-extrabold text-action-primary">
            {count} từ
          </span>{" "}
          cần kích hoạt lại trí nhớ
        </h1>
        <div className="mt-2.5 flex flex-wrap gap-4">
          <Stat value={`${avgMem}%`} label="Tỉ lệ ghi nhớ TB" />
          <Stat value={`~${estMinutes} phút`} label="Ước tính hoàn thành" />
          <Stat value={`${urgent} từ`} label="Cần ôn gấp" />
        </div>
      </div>
      <Button
        size="lg"
        data-testid="start-session"
        onClick={onStart}
        className="min-h-14 w-full rounded-2xl px-8 shadow-[0_4px_14px_rgba(200,60,50,.28)] md:w-auto"
      >
        <Play size={16} aria-hidden="true" />
        {emptyQueue ? `Ôn thử tất cả (${count} từ)` : `Bắt đầu ôn tập ngay (${count} từ)`}
      </Button>
    </section>
  );
}
```

- [ ] **Step 4: Run verify PASS.**
- [ ] **Step 5: Commit**

```bash
git add app-next/src/components/review/memory-hero.tsx app-next/src/components/review/__tests__/memory-hero.test.tsx
git commit -m "feat(review): MemoryHero tong quan tri nho + CTA bat dau on tap"
```

---

### Task 7: `components/review/srs-buckets.tsx`

**Files:**
- Create: `app-next/src/components/review/srs-buckets.tsx`
- Test: `app-next/src/components/review/__tests__/srs-buckets.test.tsx`

**Interfaces:**
- Consumes: `Card` với `tone` từ Task 1; icons `Flame`, `Clock3`, `CheckCircle2` từ barrel.
- Produces: `export type BucketData = { count: number; words: { zh: string; key: string }[] };` và `SrsBuckets({ weak, cons, mast, onChipClick })`.

- [ ] **Step 1: Write failing test**

```tsx
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { SrsBuckets, type BucketData } from "../srs-buckets";

afterEach(cleanup);

const bucket = (n: number): BucketData => ({
  count: n,
  words: Array.from({ length: Math.min(n, 3) }, (_, i) => ({ zh: `字${i}`, key: `k${i}` })),
});

describe("SrsBuckets", () => {
  it("3 bucket đúng tên + desc + count", () => {
    const { container } = render(
      <SrsBuckets weak={bucket(5)} cons={bucket(8)} mast={bucket(5)} onChipClick={() => {}} />
    );
    expect(container.textContent).toContain("Yếu · Dễ quên");
    expect(container.textContent).toContain("Cần ôn gấp trong hôm nay");
    expect(container.textContent).toContain("Đang củng cố");
    expect(container.textContent).toContain("Ôn định kỳ 3 ngày một lần");
    expect(container.textContent).toContain("Đã khắc sâu");
    expect(container.textContent).toContain("Ôn nhắc lại sau 7 ngày");
    expect(container.querySelectorAll('[data-testid="bucket"]')).toHaveLength(3);
  });
  it("tối đa 3 chips/bucket; count 0 → 'Trống'", () => {
    const { container } = render(
      <SrsBuckets weak={bucket(5)} cons={bucket(0)} mast={bucket(1)} onChipClick={() => {}} />
    );
    const buckets = container.querySelectorAll('[data-testid="bucket"]');
    expect(buckets[0].querySelectorAll("button")).toHaveLength(3);
    expect(buckets[1].textContent).toContain("Trống");
    expect(buckets[2].querySelectorAll("button")).toHaveLength(1);
  });
  it("tone class: rose/amber/jade wash (Task 1)", () => {
    const { container } = render(
      <SrsBuckets weak={bucket(1)} cons={bucket(0)} mast={bucket(0)} onChipClick={() => {}} />
    );
    const [rose, amber, jade] = Array.from(container.querySelectorAll('[data-testid="bucket"]'));
    expect(rose.className).toContain("bg-rose-wash");
    expect(amber.className).toContain("bg-amber-wash");
    expect(jade.className).toContain("bg-jade-wash");
  });
  it("click chip → onChipClick(zh)", () => {
    const onChipClick = vi.fn();
    const { container } = render(
      <SrsBuckets weak={bucket(1)} cons={bucket(0)} mast={bucket(0)} onChipClick={onChipClick} />
    );
    fireEvent.click(container.querySelector('[data-testid="bucket"] button')!);
    expect(onChipClick).toHaveBeenCalledWith("字0");
  });
});
```

- [ ] **Step 2: Run verify FAIL.**

- [ ] **Step 3: Implement**

```tsx
"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Flame, Clock3, CheckCircle2 } from "@/components/ui/icon";

export type BucketData = { count: number; words: { zh: string; key: string }[] };

const TONE = {
  rose: { card: "rose", head: "text-learning-due", icon: Flame },
  amber: { card: "amber", head: "text-amber-ink", icon: Clock3 },
  jade: { card: "jade", head: "text-learning-mastered", icon: CheckCircle2 },
} as const;

function Bucket({ tone, title, desc, data, onChipClick }: {
  tone: keyof typeof TONE;
  title: string;
  desc: string;
  data: BucketData;
  onChipClick: (zh: string) => void;
}) {
  const t = TONE[tone];
  const Icon = t.icon;
  return (
    <Card tone={t.card} data-testid="bucket" className="p-4 transition-transform hover:-translate-y-0.5">
      <div className={`flex items-center gap-2 text-[13.5px] font-extrabold ${t.head}`}>
        <Icon size={16} aria-hidden="true" />
        {title}
        <span className="ml-auto text-xs font-bold opacity-80">{data.count} từ</span>
      </div>
      <p className="mb-2.5 mt-1 text-xs text-text-secondary">{desc}</p>
      <div className="flex flex-wrap gap-1.5">
        {data.words.length === 0 ? (
          <span className="text-xs text-text-secondary">Trống</span>
        ) : (
          data.words.map((w) => (
            <button
              key={w.key}
              type="button"
              onClick={() => onChipClick(w.zh)}
              className="zh min-h-10 rounded-[10px] border border-border-default bg-surface-elevated px-3 py-1.5 text-[15px] font-bold transition-colors hover:border-action-primary hover:text-action-primary"
            >
              {w.zh}
            </button>
          ))
        )}
      </div>
    </Card>
  );
}

/* 3 Leitner buckets (mock .buckets, spec §3): rose Yếu / amber Đang củng cố / jade Đã khắc sâu. */
export function SrsBuckets({ weak, cons, mast, onChipClick }: {
  weak: BucketData;
  cons: BucketData;
  mast: BucketData;
  onChipClick: (zh: string) => void;
}) {
  return (
    <section aria-label="Trạng thái trí nhớ" className="grid gap-3 md:grid-cols-3">
      <Bucket tone="rose" title="Yếu · Dễ quên" desc="Cần ôn gấp trong hôm nay" data={weak} onChipClick={onChipClick} />
      <Bucket tone="amber" title="Đang củng cố" desc="Ôn định kỳ 3 ngày một lần" data={cons} onChipClick={onChipClick} />
      <Bucket tone="jade" title="Đã khắc sâu" desc="Ôn nhắc lại sau 7 ngày" data={mast} onChipClick={onChipClick} />
    </section>
  );
}
```

- [ ] **Step 4: Run verify PASS.**
- [ ] **Step 5: Commit**

```bash
git add app-next/src/components/review/srs-buckets.tsx app-next/src/components/review/__tests__/srs-buckets.test.tsx
git commit -m "feat(review): SrsBuckets 3 Leitner buckets + chips hanzi"
```

---

### Task 8: `components/review/vocab-inspector.tsx`

**Files:**
- Create: `app-next/src/components/review/vocab-inspector.tsx`
- Test: `app-next/src/components/review/__tests__/vocab-inspector.test.tsx`

**Interfaces:**
- Consumes: `SegmentedTabs` hiện có; `MemBar` từ Task 5; `ReviewableWord` từ Task 3; icons `Search`, `Volume2`, `Pencil`.
- Produces: `VocabInspector({ words, onListen, onStroke })` — `words: ReviewableWord[]`, `onListen(zh: string)`, `onStroke(zh: string)`. State nội bộ: filter `all|urgent|new`, query. Filter counts: Tất cả = `words.length`, Cấp bách = mem<55, Từ mới = isNew. Bảng ẩn `<768px` (`hidden md:block`), mobile-cards `md:hidden`.

- [ ] **Step 1: Write failing test**

```tsx
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { VocabInspector } from "../vocab-inspector";
import type { ReviewableWord } from "@/lib/srs-session";

afterEach(cleanup);

function word(over: Partial<ReviewableWord>): ReviewableWord {
  return {
    key: "hsk1.lesson-1.0", zh: "爱", pinyin: "ài", meaning: "Yêu", level: "HSK 1",
    mem: 45, lastLabel: "2 ngày trước", isNew: false, ...over,
  };
}

const words = [
  word({ key: "k1", zh: "爱", pinyin: "ài", meaning: "Yêu", mem: 45 }),
  word({ key: "k2", zh: "苹果", pinyin: "píngguǒ", meaning: "Quả táo", mem: 68 }),
  word({ key: "k3", zh: "你好", pinyin: "nǐ hǎo", meaning: "Xin chào", mem: 95, isNew: true }),
];

describe("VocabInspector", () => {
  it("bảng desktop: header 6 cột + hàng dữ liệu + membar + lần ôn cuối", () => {
    const { container } = render(<VocabInspector words={words} onListen={() => {}} onStroke={() => {}} />);
    expect(container.textContent).toContain("Hán tự");
    expect(container.textContent).toContain("Độ bền trí nhớ");
    expect(container.textContent).toContain("Lần ôn cuối");
    expect(container.textContent).toContain("ài");
    expect(container.textContent).toContain("Quả táo");
    expect(container.textContent).toContain("2 ngày trước");
  });
  it("filter Cấp bách chỉ còn mem<55; Từ mới chỉ isNew", () => {
    const { container, getByText } = render(<VocabInspector words={words} onListen={() => {}} onStroke={() => {}} />);
    fireEvent.click(getByText(/Cấp bách/));
    expect(container.textContent).toContain("Yêu");
    expect(container.textContent).not.toContain("Quả táo");
    fireEvent.click(getByText(/Từ mới/));
    expect(container.textContent).toContain("Xin chào");
    expect(container.textContent).not.toContain("Yêu");
  });
  it("search theo zh/pinyin/meaning; không khớp → empty state", () => {
    const { container } = render(<VocabInspector words={words} onListen={() => {}} onStroke={() => {}} />);
    const input = container.querySelector("input[type='search']")!;
    fireEvent.change(input, { target: { value: "táo" } });
    expect(container.textContent).toContain("Quả táo");
    expect(container.textContent).not.toContain("Yêu");
    fireEvent.change(input, { target: { value: "zzz" } });
    expect(container.textContent).toContain("Không có từ nào khớp bộ lọc hiện tại.");
  });
  it("nút nghe/nét gọi callback với zh đúng", () => {
    const onListen = vi.fn(), onStroke = vi.fn();
    const { container } = render(<VocabInspector words={words} onListen={onListen} onStroke={onStroke} />);
    const row = container.querySelector("tbody tr")!;
    fireEvent.click(row.querySelector('[aria-label^="Nghe"]')!);
    expect(onListen).toHaveBeenCalledWith("爱");
    fireEvent.click(row.querySelector('[aria-label^="Xem nét viết"]')!);
    expect(onStroke).toHaveBeenCalledWith("爱");
  });
});
```

- [ ] **Step 2: Run verify FAIL.**

- [ ] **Step 3: Implement**

```tsx
"use client";

import { useState } from "react";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { MemBar } from "./mem-bar";
import { Search, Volume2, Pencil } from "@/components/ui/icon";
import type { ReviewableWord } from "@/lib/srs-session";

type Filter = "all" | "urgent" | "new";

const MINI =
  "grid h-8 w-8 place-items-center rounded-[8px] border border-transparent bg-surface-muted text-text-secondary transition-colors hover:border-border-default hover:bg-surface-elevated hover:text-text-primary";

function RowActions({ w, onListen, onStroke }: { w: ReviewableWord; onListen: (zh: string) => void; onStroke: (zh: string) => void }) {
  return (
    <span className="flex gap-1.5">
      <button type="button" className={MINI} aria-label={`Nghe ${w.zh}`} onClick={() => onListen(w.zh)}>
        <Volume2 size={15} strokeWidth={1.5} aria-hidden="true" />
      </button>
      <button type="button" className={MINI} aria-label={`Xem nét viết ${w.zh}`} onClick={() => onStroke(w.zh)}>
        <Pencil size={15} strokeWidth={1.5} aria-hidden="true" />
      </button>
    </span>
  );
}

/* Vocab inspector (mock .panel, spec §3): seg filter + search local + bảng (≥md) / cards (<md)
   từ CÙNG mảng pool — không lệch dữ liệu giữa 2 render. */
export function VocabInspector({ words, onListen, onStroke }: {
  words: ReviewableWord[];
  onListen: (zh: string) => void;
  onStroke: (zh: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const urgentCount = words.filter((w) => w.mem < 55).length;
  const pool = words.filter((w) => {
    if (filter === "urgent" && w.mem >= 55) return false;
    if (filter === "new" && !w.isNew) return false;
    if (query) {
      const q = query.toLowerCase();
      if (!`${w.zh}${w.pinyin}${w.meaning}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <section aria-label="Từ cần ôn" className="overflow-hidden rounded-card border border-border-default bg-surface-elevated shadow-xs">
      <div className="flex flex-wrap items-center gap-2.5 border-b border-border-default p-4">
        <SegmentedTabs<Filter>
          label="Lọc từ vựng"
          value={filter}
          onChange={setFilter}
          tabs={[
            { key: "all", label: `Tất cả (${words.length})` },
            { key: "urgent", label: `Cấp bách (${urgentCount})` },
            { key: "new", label: "Từ mới" },
          ]}
        />
        <label className="ml-auto flex h-10 min-w-44 items-center gap-2 rounded-full border border-border-default bg-surface-muted px-3.5 md:ml-0 md:w-full md:max-w-72">
          <Search size={15} strokeWidth={1.5} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm từ, pinyin, nghĩa…"
            aria-label="Tìm từ vựng"
            className="w-full bg-transparent text-[13px] outline-none placeholder:text-text-secondary/70"
          />
        </label>
      </div>

      {/* bảng ≥md */}
      <div className="hidden md:block">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {["Hán tự", "Pinyin", "Nghĩa", "Độ bền trí nhớ", "Lần ôn cuối", "Thao tác"].map((h) => (
                <th key={h} className="border-b border-border-default px-3 py-2.5 text-left text-[11px] font-extrabold tracking-wider text-text-secondary/80">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pool.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <div className="p-7 text-center text-[13.5px] text-text-secondary">
                    Không có từ nào khớp bộ lọc hiện tại.
                  </div>
                </td>
              </tr>
            ) : (
              pool.map((w) => (
                <tr key={w.key} className="transition-colors hover:bg-surface-muted">
                  <td className="zh whitespace-nowrap px-3 py-2.5 text-[19px] font-bold">{w.zh}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-text-secondary">{w.pinyin}</td>
                  <td className="px-3 py-2.5 text-text-secondary">{w.meaning}</td>
                  <td className="px-3 py-2.5"><MemBar value={w.mem} /></td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[12.5px] text-text-secondary">{w.lastLabel}</td>
                  <td className="px-3 py-2.5"><RowActions w={w} onListen={onListen} onStroke={onStroke} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* cards <md — cùng pool */}
      <div className="grid gap-2.5 p-3.5 md:hidden">
        {pool.length === 0 && (
          <div className="p-7 text-center text-[13.5px] text-text-secondary">Không có từ nào khớp bộ lọc hiện tại.</div>
        )}
        {pool.map((w) => (
          <div key={w.key} className="rounded-[14px] border border-border-default bg-surface-muted p-3">
            <div className="flex items-center gap-2.5">
              <span className="zh text-xl font-bold">{w.zh}</span>
              <span className="text-[12.5px] text-text-secondary">{w.pinyin}</span>
              <span className="ml-auto"><RowActions w={w} onListen={onListen} onStroke={onStroke} /></span>
            </div>
            <div className="mt-0.5 text-[13px] text-text-secondary">{w.meaning} · {w.lastLabel}</div>
            <div className="mt-2.5 flex items-center"><MemBar value={w.mem} className="flex-1 min-w-0" /></div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run verify PASS.**
- [ ] **Step 5: Commit**

```bash
git add app-next/src/components/review/vocab-inspector.tsx app-next/src/components/review/__tests__/vocab-inspector.test.tsx
git commit -m "feat(review): VocabInspector seg filter + search + bang/cards + MemBar"
```

---

### Task 9: `STROKE_PATH_DATA` (爱/好) + mở rộng `useStrokePlayer` (stepTo/setSpeed/onStep, hỗ trợ path viewBox 300)

**Files:**
- Modify: `app-next/src/content/hanzi-strokes.ts`
- Modify: `app-next/src/components/hanzi/stroke-player.tsx`
- Test: `app-next/src/content/__tests__/hanzi-strokes.test.ts` (mở rộng nếu đã có — kiểm tra `ls src/content/__tests__/`; nếu file tồn tại thì thêm `describe` mới, không xoá test cũ), `app-next/src/components/hanzi/__tests__/stroke-player-step.test.tsx` (mới)

**Interfaces:**
- Produces:
  - `export type StrokePathEntry = { py: string; total: number; rad: { name: string; desc: string }; order: [string, string][]; paths: string[] };`
  - `export const STROKE_PATH_DATA: Record<string, StrokePathEntry>` — có `"爱"`, `"好"`.
  - `useStrokePlayer(containerRef, char, deps?, opts?: { onStep?: (i: number) => void })` — API thêm: `stepTo(i: number)` (clamp -1..total-1; -1 = chưa nét nào), `setSpeed(mult: number)`, `total: number`, `source: "polyline" | "path" | "generic"`. `play()` giữ nguyên hành vi. `hasCustomStrokes` giữ nguyên (true khi có polyline HOẶC path data).
  - Thứ tự nguồn (spec §4): `STROKE_DATA[char]` → `STROKE_PATH_DATA[char]` → `genericStrokes()`.
- Back-compat: caller hiện có của `useStrokePlayer` (grep `useStrokePlayer` — `hanzi-detail.tsx`) không cần sửa.

- [ ] **Step 1: Write failing test cho STROKE_PATH_DATA**

Thêm vào `src/content/__tests__/hanzi-strokes.test.ts` (tạo mới nếu chưa có):

```ts
import { describe, it, expect } from "vitest";
import { STROKE_PATH_DATA, STROKE_DATA } from "../hanzi-strokes";

describe("STROKE_PATH_DATA", () => {
  it("có 爱 và 好, paths/order khớp total", () => {
    expect(Object.keys(STROKE_PATH_DATA)).toEqual(expect.arrayContaining(["爱", "好"]));
    for (const [ch, entry] of Object.entries(STROKE_PATH_DATA)) {
      expect(entry.paths.length).toBe(entry.total);
      expect(entry.order.length).toBe(entry.total);
      expect(entry.py.length).toBeGreaterThan(0);
      expect(entry.rad.name.length).toBeGreaterThan(0);
      for (const p of entry.paths) expect(p.startsWith("M")).toBe(true);
    }
    expect(STROKE_PATH_DATA["爱"].total).toBe(10);
    expect(STROKE_PATH_DATA["好"].total).toBe(6);
  });
  it("STROKE_DATA (polyline) vẫn nguyên vẹn với 你", () => {
    expect(STROKE_DATA["你"].length).toBe(7);
  });
});
```

- [ ] **Step 2: Run verify FAIL** — `pnpm vitest run src/content/__tests__/hanzi-strokes.test.ts`.

- [ ] **Step 3: Implement STROKE_PATH_DATA** — thêm vào cuối `src/content/hanzi-strokes.ts` (port 1:1 paths từ mock `review.html` dòng 467–474, viewBox 300; `rad` tách name/desc từ chuỗi HTML của mock):

```ts
/* Dữ liệu nét dạng SVG path (port opendesign_hsk/review.html — demo stroke studio).
   Toạ độ viewBox 300×300; dùng khi STROKE_DATA không có chữ. rad tách name/desc để render <b>. */
export type StrokePathEntry = {
  py: string;
  total: number;
  rad: { name: string; desc: string };
  order: [string, string][];
  paths: string[];
};

export const STROKE_PATH_DATA: Record<string, StrokePathEntry> = {
  "爱": {
    py: "ài", total: 10,
    rad: { name: "爫 — Bộ Trảo", desc: "“Móng vuốt” · 4 nét · Trên–Giữa–Dưới" },
    order: [["Phẩy", "piě"], ["Chấm", "diǎn"], ["Chấm", "diǎn"], ["Phẩy", "piě"], ["Chấm", "diǎn"], ["Phẩy ngang", "héngpiě"], ["Ngang", "héng"], ["Phẩy", "piě"], ["Phẩy ngang", "héngpiě"], ["Mác", "nà"]],
    paths: [
      "M156,32 C140,58 124,76 108,92", "M188,58 C190,66 191,74 192,82", "M132,96 C134,102 135,108 136,114",
      "M92,130 C140,128 185,124 216,102", "M150,148 C151,154 152,160 153,166", "M120,176 C150,174 180,174 200,170",
      "M100,196 C135,195 170,195 205,193", "M150,206 C136,226 123,242 111,256", "M102,262 C142,260 184,255 216,240",
      "M152,212 C172,230 192,246 212,258",
    ],
  },
  "好": {
    py: "hǎo · hào", total: 6,
    rad: { name: "女 — Bộ Nữ", desc: "“Phụ nữ” · 3 nét · Trái–Phải (女 + 子)" },
    order: [["Gập phẩy", "zhépiě"], ["Phẩy", "piě"], ["Ngang", "héng"], ["Phẩy ngang", "héngpiě"], ["Sổ móc", "shùgōu"], ["Ngang", "héng"]],
    paths: [
      "M118,66 C104,116 92,158 76,202", "M148,84 C134,122 120,156 104,190", "M70,205 C100,203 125,203 150,201",
      "M168,112 C200,110 228,106 248,96", "M208,116 C208,160 208,200 206,232 C205,242 197,246 190,242",
      "M165,248 C195,246 222,246 250,244",
    ],
  },
};
```

- [ ] **Step 4: Write failing test cho stepTo/setSpeed/onStep**

`src/components/hanzi/__tests__/stroke-player-step.test.tsx`:

```tsx
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { useRef } from "react";
import { useStrokePlayer } from "../stroke-player";

afterEach(cleanup);

function Harness({ ch, onStep }: { ch: string; onStep?: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const api = useStrokePlayer(ref, ch, undefined, { onStep });
  return (
    <div>
      <div ref={ref} data-testid="host" />
      <button data-testid="step-next" onClick={() => api.stepTo((api.cur ?? -1) + 1)}>next</button>
      <button data-testid="play" onClick={() => api.play()}>play</button>
      <button data-testid="speed" onClick={() => api.setSpeed(1.5)}>speed</button>
      <span data-testid="total">{api.total}</span>
      <span data-testid="source">{api.source}</span>
    </div>
  );
}

describe("useStrokePlayer stepTo/setSpeed (path source 爱)", () => {
  it("source=path, total=10; stepTo reveal nét theo dashoffset", () => {
    const { container } = render(<Harness ch="爱" />);
    expect(container.querySelector('[data-testid="source"]')!.textContent).toBe("path");
    expect(container.querySelector('[data-testid="total"]')!.textContent).toBe("10");
    const host = container.querySelector('[data-testid="host"]')!;
    const strokes = host.querySelectorAll("path");
    expect(strokes.length).toBe(10);
    // bước tới nét 0
    act(() => { (container.querySelector('[data-testid="step-next"]') as HTMLButtonElement).click(); });
    expect((strokes[0] as SVGElement).style.strokeDashoffset).toBe("0");
    expect((strokes[1] as SVGElement).style.strokeDashoffset).toBe("1");
  });
  it("stepTo clamp: -1 không reveal gì, quá total kẹp cuối", () => {
    const { container } = render(<Harness ch="好" />);
    const host = container.querySelector('[data-testid="host"]')!;
    const strokes = host.querySelectorAll("path");
    expect(strokes.length).toBe(6);
    act(() => { (container.querySelector('[data-testid="step-next"]') as HTMLButtonElement).click(); });
    // clamp test qua onStep spy bên dưới; ở đây chỉ chắc chưa văng exception khi bấm liên tục
    for (let i = 0; i < 10; i++) {
      act(() => { (container.querySelector('[data-testid="step-next"]') as HTMLButtonElement).click(); });
    }
    expect((strokes[5] as SVGElement).style.strokeDashoffset).toBe("0");
  });
  it("onStep callback nhận index sau stepTo", () => {
    const onStep = vi.fn();
    const { container } = render(<Harness ch="好" onStep={onStep} />);
    act(() => { (container.querySelector('[data-testid="step-next"]') as HTMLButtonElement).click(); });
    expect(onStep).toHaveBeenLastCalledWith(0);
  });
  it("chữ không có data → source=generic, total=4", () => {
    const { container } = render(<Harness ch="吗" />);
    expect(container.querySelector('[data-testid="source"]')!.textContent).toBe("generic");
    expect(container.querySelector('[data-testid="total"]')!.textContent).toBe("4");
  });
});
```

API cần thêm `cur` vào return để harness bấm next: trả về `cur: number` (getter value qua closure — dùng state ref, expose `cur` như field cập nhật qua `onStep`; đơn giản nhất: `useStrokePlayer` trả object mới mỗi render là khó vì không có state. Giải pháp: harness giữ index riêng — **sửa Harness**: `<button onClick={() => api.stepTo(nextIdx())}>` với `const nextIdx = useRef(-1)` tăng mỗi lần bấm; onStep spy kiểm tra index. Viết lại step-next của Harness:

```tsx
function Harness({ ch, onStep }: { ch: string; onStep?: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const idx = useRef(-1);
  const api = useStrokePlayer(ref, ch, undefined, { onStep });
  return (
    <div>
      <div ref={ref} data-testid="host" />
      <button data-testid="step-next" onClick={() => api.stepTo(++idx.current)}>next</button>
      <button data-testid="play" onClick={() => api.play()}>play</button>
      <button data-testid="speed" onClick={() => api.setSpeed(1.5)}>speed</button>
      <span data-testid="total">{api.total}</span>
      <span data-testid="source">{api.source}</span>
    </div>
  );
}
```

(Dùng bản Harness này — không có `api.cur`.)

- [ ] **Step 5: Run verify FAIL.**

- [ ] **Step 6: Implement mở rộng `stroke-player.tsx`**

Thay đổi chính trong `useStrokePlayer`:

1. Import thêm: `import { STROKE_DATA, STROKE_PATH_DATA, genericStrokes, type StrokePolyline } from "@/content/hanzi-strokes";` và signature:

```ts
export interface StrokePlayerApi {
  play: () => void;
  stepTo: (i: number) => void;
  setSpeed: (mult: number) => void;
  showArrows: (on: boolean) => void;
  setZoom: (on: boolean) => void;
  hasCustomStrokes: boolean;
  total: number;
  source: "polyline" | "path" | "generic";
}

export function useStrokePlayer(
  containerRef: React.RefObject<HTMLElement | null>,
  char: string,
  deps?: unknown[],
  opts?: { onStep?: (i: number) => void },
): StrokePlayerApi
```

2. Trong effect tạo SVG: quyết định nguồn và tạo phần tử tương ứng:

```ts
const pathEntry = STROKE_PATH_DATA[char] ?? null;
const polylines = STROKE_DATA[char] ?? null;
const source: StrokePlayerApi["source"] = polylines ? "polyline" : pathEntry ? "path" : "generic";
const total = polylines ? polylines.length : pathEntry ? pathEntry.paths.length : genericStrokes().length;
```

- `source === "polyline"`: polyline từ `STROKE_DATA[char]`, viewBox `"0 0 100 100"` (như hiện tại).
- `source === "path"`: tạo phần tử `path` với `d = p` từ `pathEntry.paths`, viewBox `"0 0 300 300"`.
- `source === "generic"`: polyline từ `genericStrokes()`, viewBox `"0 0 100 100"`.

Giữ mọi thuộc tính nét (`pathLength="1"`, dashoffset 1, stroke `var(--action-primary)`, width 4.5, round caps). Trong effect, sau khi dựng xong: `setMeta({ total, source })` (state, không chỉ ref — để DOM cập nhật `data-testid="total"`/`"source"` sau mount; refs thường không trigger re-render). Khởi tạo `curRef = -1`, `speedRef = 1`.

3. `play()` — giữ nguyên logic rAF nhưng `DUR` động: `const dur = Math.max(120, 420 / speedRef.current);` thay hằng số.

4. Thêm:

```ts
const stepTo = (i: number) => {
  if (rafRef.current !== null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  const total = pathsRef.current.length;
  const clamped = Math.max(-1, Math.min(total - 1, i));
  curRef.current = clamped;
  pathsRef.current.forEach((p, idx) => {
    p.style.transition = "";
    p.style.strokeDasharray = "1";
    p.style.strokeDashoffset = idx <= clamped ? "0" : "1";
  });
  opts?.onStep?.(clamped);
};

const setSpeed = (mult: number) => { speedRef.current = mult > 0 ? mult : 1; };
```

5. State + return: thêm `const [meta, setMeta] = useState<{ total: number; source: StrokePlayerApi["source"] }>({ total: 0, source: "generic" });` ở đầu hook (effect gọi `setMeta` sau khi dựng SVG → re-render, DOM hiển thị đúng). Return:

```ts
return { play, stepTo, setSpeed, showArrows, setZoom, hasCustomStrokes, total: meta.total, source: meta.source };
```

Chú ý: caller cũ `hanzi-detail.tsx` gọi `useStrokePlayer(ref, char, deps)` — signature mới vẫn tương thích (tham số 4 optional).

- [ ] **Step 7: Run verify PASS** — cả test mới lẫn test cũ `src/components/hanzi/__tests__/draw-pad.test.tsx` + `hanzi-detail.test.tsx` PASS (`pnpm vitest run src/components/hanzi src/content`).

- [ ] **Step 8: Commit**

```bash
git add app-next/src/content/hanzi-strokes.ts app-next/src/components/hanzi/stroke-player.tsx app-next/src/content/__tests__/hanzi-strokes.test.ts app-next/src/components/hanzi/__tests__/stroke-player-step.test.tsx
git commit -m "feat(review): STROKE_PATH_DATA ai/hao + useStrokePlayer stepTo/setSpeed/onStep"
```

---

### Task 10: `components/review/stroke-studio.tsx`

**Files:**
- Create: `app-next/src/components/review/stroke-studio.tsx`
- Test: `app-next/src/components/review/__tests__/stroke-studio.test.tsx`

**Interfaces:**
- Consumes: `Dialog` (`@/components/ui/dialog`, props `open/onClose/labelledBy/className`), `IconButton`, `useStrokePlayer` (Task 9), `STROKE_PATH_DATA`, `useTts`, icons `X`, `Volume2`.
- Produces: `StrokeStudio({ word, onClose })` — `word: string` (cả từ/cụm), `onClose: () => void`. Tabs theo chữ duy nhất (giữ thứ tự xuất hiện), head có py-pill + nút audio, body 2 cột: grid-box (thiên tự) + toolbar (Nét trước / Phát lại / Nét sau / speed-seg 0.75x/1x/1.5x) | rad-line + order-list. Chữ không có data → rad-line nodata "Chữ 'X' sẽ được bổ sung dữ liệu bút thuận." + order-list "Chưa có dữ liệu nét cho chữ này."

- [ ] **Step 1: Write failing test**

```tsx
import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, fireEvent } from "@testing-library/react";
import { StrokeStudio } from "../stroke-studio";

afterEach(cleanup);

beforeEach(() => {
  // jsdom thiếu speechSynthesis — stub tối thiểu cho useTts
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: { cancel: vi.fn(), speak: vi.fn(), getVoices: () => [], speaking: false, pending: false },
  });
});

describe("StrokeStudio", () => {
  it("từ 1 chữ có data (爱): 10 nét trong order list, py-pill hiện ài", () => {
    const { container } = render(<StrokeStudio word="爱" onClose={() => {}} />);
    expect(container.textContent).toContain("ài");
    expect(container.textContent).toContain("Bộ Trảo");
    expect(container.querySelectorAll("[data-testid='order-row']")).toHaveLength(10);
    expect(container.textContent).toContain("Phát lại");
  });
  it("từ nhiều chữ (爱好): 2 tab theo chữ, tab active có aria-pressed", () => {
    const { container } = render(<StrokeStudio word="爱好" onClose={() => {}} />);
    const tabs = container.querySelectorAll("[data-testid='char-tab']");
    expect(tabs).toHaveLength(2);
    expect(tabs[0].getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(tabs[1]);
    expect(tabs[1].getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelectorAll("[data-testid='order-row']")).toHaveLength(6); // 好 6 nét
  });
  it("chữ không có data: nodata rad-line + order list", () => {
    const { container } = render(<StrokeStudio word="吗" onClose={() => {}} />);
    expect(container.textContent).toContain("sẽ được bổ sung dữ liệu bút thuận");
    expect(container.textContent).toContain("Chưa có dữ liệu nét cho chữ này.");
  });
  it("speed-seg aria-pressed chuyển; click order-row không văng", () => {
    const { container } = render(<StrokeStudio word="爱" onClose={() => {}} />);
    const seg = container.querySelectorAll("[data-testid='speed-btn']");
    expect(seg).toHaveLength(3);
    fireEvent.click(seg[2]);
    expect(seg[2].getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(container.querySelector("[data-testid='order-row']")!);
  });
  it("nút đóng gọi onClose", () => {
    const onClose = vi.fn();
    const { container } = render(<StrokeStudio word="爱" onClose={onClose} />);
    fireEvent.click(container.querySelector("[aria-label='Đóng bảng nét chữ']")!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run verify FAIL.**

- [ ] **Step 3: Implement**

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { IconButton } from "@/components/ui/icon-button";
import { useStrokePlayer } from "@/components/hanzi/stroke-player";
import { STROKE_PATH_DATA } from "@/content/hanzi-strokes";
import { useTts } from "@/lib/tts/use-tts";
import { X, Volume2 } from "@/components/ui/icon";

const SPEEDS = [0.75, 1, 1.5] as const;

/* Stroke studio (mock .sheet, spec §3/§4): sheet modal thiên tự + bút thuận.
   Animation nét do useStrokePlayer lo; component này lo UI + chọn chữ + tốc độ. */
export function StrokeStudio({ word, onClose }: { word: string; onClose: () => void }) {
  const chars = useMemo(() => Array.from(new Set(word.split(""))), [word]);
  const [ch, setCh] = useState(chars[0]);
  const [speed, setSpeed] = useState<number>(1);
  const [cur, setCur] = useState(-1);
  const hostRef = useRef<HTMLDivElement>(null);
  const { speak } = useTts();

  useEffect(() => setCh(chars[0]), [chars]); // word đổi → về chữ đầu
  useEffect(() => setCur(-1), [ch]); // đổi chữ → reset con trỏ nét (curRef trong hook cũng tự reset theo effect)

  const api = useStrokePlayer(hostRef, ch, undefined, { onStep: setCur });
  const entry = STROKE_PATH_DATA[ch];
  const total = api.total;
  const hasData = !!entry || api.source !== "generic";

  useEffect(() => { api.setSpeed(speed); }, [speed]); // eslint-disable-line react-hooks/exhaustive-deps

  const order: [string, string][] = entry
    ? entry.order
    : Array.from({ length: total }, (_, i) => [`Nét ${i + 1}`, ""] as [string, string]);

  return (
    <Dialog
      open
      onClose={onClose}
      labelledBy="stroke-studio-title"
      className="w-[min(780px,calc(100%-32px))] max-h-[min(620px,calc(100vh-48px))] overflow-y-auto rounded-[20px] p-5"
    >
      <h2 id="stroke-studio-title" className="sr-only">Nét chữ và bút thuận</h2>
      <div className="flex flex-wrap items-center gap-2.5">
        <div role="group" aria-label="Chọn chữ" className="flex max-w-full gap-0.5 overflow-x-auto rounded-full border border-border-default bg-surface-muted p-[3px]">
          {chars.map((c) => (
            <button
              key={c}
              type="button"
              data-testid="char-tab"
              aria-pressed={c === ch}
              onClick={() => setCh(c)}
              className="flex min-h-10 items-center gap-2 whitespace-nowrap rounded-full px-3.5 text-[13px] font-bold text-text-secondary aria-pressed:bg-surface-elevated aria-pressed:text-text-primary aria-pressed:shadow-xs"
            >
              <span className="zh text-base">{c}</span>
              {STROKE_PATH_DATA[c] && <small className="text-[11px] text-text-secondary/70">{STROKE_PATH_DATA[c].total} nét</small>}
            </button>
          ))}
        </div>
        <span className="mx-auto inline-flex items-center gap-2 rounded-full border border-border-default bg-surface-muted py-1 pl-4 pr-1 text-[13px] font-bold">
          {entry?.py ?? "—"}
          <button
            type="button"
            aria-label="Phát âm chữ Hán"
            onClick={() => speak(ch)}
            className="grid h-8 w-8 place-items-center rounded-full text-text-secondary hover:bg-surface-elevated hover:text-text-primary"
          >
            <Volume2 size={14} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </span>
        <IconButton label="Đóng bảng nét chữ" variant="ghost" onClick={onClose} className="ml-auto">
          <X size={16} strokeWidth={1.5} aria-hidden="true" />
        </IconButton>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          {/* grid-box: lưới thiên tự tĩnh (mock .grid-box) + SVG nét từ useStrokePlayer */}
          <div className="relative mx-auto aspect-square w-[min(300px,100%)] overflow-hidden rounded-card border border-border-default bg-surface-elevated">
            <svg viewBox="0 0 300 300" aria-hidden="true" className="absolute inset-0 h-full w-full">
              <rect x="4" y="4" width="292" height="292" fill="none" stroke="var(--border-default)" strokeWidth="1.5" rx="4" />
              <line x1="150" y1="4" x2="150" y2="296" stroke="var(--border-default)" strokeWidth="1" strokeDasharray="7 6" />
              <line x1="4" y1="150" x2="296" y2="150" stroke="var(--border-default)" strokeWidth="1" strokeDasharray="7 6" />
              <line x1="4" y1="4" x2="296" y2="296" stroke="var(--border-default)" strokeWidth="1" strokeDasharray="5 7" opacity=".7" />
              <line x1="296" y1="4" x2="4" y2="296" stroke="var(--border-default)" strokeWidth="1" strokeDasharray="5 7" opacity=".7" />
            </svg>
            <div ref={hostRef} className="absolute inset-0" />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <button type="button" className="tool-btn" onClick={() => api.stepTo(cur - 1)}>Nét trước</button>
            <button
              type="button"
              className="tool-btn bg-action-primary text-white border-action-primary hover:bg-action-primary-hover"
              onClick={() => api.play()}
            >
              Phát lại
            </button>
            <button type="button" className="tool-btn" onClick={() => api.stepTo(cur + 1)}>Nét sau</button>
            <div role="group" aria-label="Tốc độ" className="flex gap-0.5 rounded-2xl border border-border-default bg-surface-muted p-[3px]">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  data-testid="speed-btn"
                  aria-pressed={s === speed}
                  onClick={() => setSpeed(s)}
                  className="min-h-9 rounded-xl px-2.5 text-xs font-bold text-text-secondary aria-pressed:bg-surface-elevated aria-pressed:text-text-primary"
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
        <div>
          <p className="mb-2.5 rounded-xl border border-border-default bg-surface-elevated px-3 py-2.5 text-[12.5px] text-text-secondary">
            {entry ? (<><b className="text-learning-mastered">{entry.rad.name}</b> · {entry.rad.desc}</>) : (
              <>Chữ “{ch}” sẽ được bổ sung dữ liệu bút thuận.</>
            )}
          </p>
          <div aria-label="Danh sách bút thuận" className="max-h-41 overflow-y-auto rounded-card border border-border-default bg-surface-elevated p-2">
            {hasData ? (
              order.map(([name, py], i) => (
                <button
                  key={i}
                  type="button"
                  data-testid="order-row"
                  onClick={() => api.stepTo(i)}
                  className={`flex w-full items-center gap-2.5 rounded-[10px] px-2 py-2 text-left text-[13px] ${
                    i === cur ? "bg-surface-muted shadow-[inset_3px_0_0_var(--action-primary)]" : ""
                  }`}
                >
                  <span className={`grid h-6 w-6 place-items-center rounded-full border text-[11px] font-extrabold ${
                    i === cur ? "border-action-primary bg-action-primary text-white" : "border-border-default bg-surface-muted"
                  }`}>
                    {i + 1}
                  </span>
                  <span>{name}</span>
                  {py && <small className="ml-auto text-xs text-text-secondary">{py}</small>}
                </button>
              ))
            ) : (
              <div className="p-6 text-center text-[13px] text-text-secondary">Chưa có dữ liệu nét cho chữ này.</div>
            )}
          </div>
        </div>
      </div>
    </Dialog>
  );
}
```

Cần `import { useRef } ...` — thêm `useRef` vào import React đầu. Lưu ý pattern `aria-pressed:` variant của Tailwind (Tailwind v4 hỗ trợ `aria-pressed:`). Class `tool-btn` không tồn tại — dùng class inline: thay 3 nút Nét trước/Phát lại/Nét sau bằng:

```tsx
const TOOL =
  "inline-flex min-h-11 items-center gap-1.5 rounded-2xl border border-border-default bg-surface-elevated px-3.5 text-[12.5px] font-bold hover:border-border-strong";
```

và nút Phát lại: `cn(TOOL, "border-action-primary bg-action-primary text-white hover:bg-action-primary-hover")` (import `cn` từ `@/lib/cn`).

- [ ] **Step 4: Run verify PASS** — `pnpm vitest run src/components/review/__tests__/stroke-studio.test.tsx`.

- [ ] **Step 5: Commit**

```bash
git add app-next/src/components/review/stroke-studio.tsx app-next/src/components/review/__tests__/stroke-studio.test.tsx
git commit -m "feat(review): StrokeStudio sheet — char tabs, speed seg, order list, grid-box"
```

---

### Task 11: `components/review/srs-session.tsx` — overlay phiên ôn

**Files:**
- Create: `app-next/src/components/review/srs-session.tsx`
- Test: `app-next/src/components/review/__tests__/srs-session.test.tsx`

**Interfaces:**
- Consumes: `ReviewableWord` (Task 3), `Grade` (Task 2), `useTts`, `IconButton`, icon `X`.
- Produces: `SrsSession({ words, onGrade, onExit })` — `words: ReviewableWord[]` (snapshot, không đổi giữa phiên), `onGrade(key: string, grade: Grade): void`, `onExit(score: number, total: number): void`. Hành vi (spec §5): Space reveal / phát âm lại; 1/2/3 grade; Escape exit; card click reveal; auto phát âm khi sang thẻ mới; aria-live trên card; focus nút thoát khi mở, trả focus khi unmount.

- [ ] **Step 1: Write failing test**

```tsx
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, cleanup, fireEvent, act } from "@testing-library/react";
import { SrsSession } from "../srs-session";
import type { ReviewableWord } from "@/lib/srs-session";

afterEach(cleanup);

beforeEach(() => {
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: { cancel: vi.fn(), speak: vi.fn(), getVoices: () => [], speaking: false, pending: false },
  });
});

function word(key: string, zh: string): ReviewableWord {
  return { key, zh, pinyin: "p", meaning: "m", level: "HSK 1", mem: 40, lastLabel: "Chưa ôn", isNew: true };
}

const words = [word("k1", "爱"), word("k2", "好"), word("k3", "你")];

describe("SrsSession", () => {
  it("render dialog + glyph; chưa reveal thì py/mean ẩn, nút grade ẩn", () => {
    const { container } = render(<SrsSession words={words} onGrade={() => {}} onExit={() => {}} />);
    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    expect(container.querySelector("[data-testid='sess-glyph']")!.textContent).toBe("爱");
    expect(container.querySelector("[data-testid='sess-py']")!.className).toContain("hidden");
    expect(container.querySelector("[data-testid='sess-grades']")!.className).toContain("hidden");
    expect(container.textContent).toContain("Từ 1 / 3");
  });
  it("click card / Space → reveal; Space lần nữa → phát âm lại (không đổi state)", () => {
    const { container } = render(<SrsSession words={words} onGrade={() => {}} onExit={() => {}} />);
    fireEvent.click(container.querySelector("[data-testid='sess-card']")!);
    expect(container.querySelector("[data-testid='sess-py']")!.className).not.toContain("hidden");
    expect(container.querySelector("[data-testid='sess-grades']")!.className).not.toContain("hidden");
    act(() => { fireEvent.keyDown(window, { code: "Space" }); });
    expect(container.querySelector("[data-testid='sess-grades']")!.className).not.toContain("hidden"); // vẫn reveal
  });
  it("grade qua phím 1/2/3 + click: điểm tăng khi nhớ, hết hàng → onExit(score,total)", () => {
    const onGrade = vi.fn();
    const onExit = vi.fn();
    const { container } = render(<SrsSession words={words} onGrade={onGrade} onExit={onExit} />);
    fireEvent.click(container.querySelector("[data-testid='sess-card']")!);
    act(() => { fireEvent.keyDown(window, { key: "3" }); }); // nhớ → 1 điểm, sang thẻ 2
    expect(onGrade).toHaveBeenLastCalledWith("k1", "good");
    expect(container.querySelector("[data-testid='sess-glyph']")!.textContent).toBe("好");
    expect(container.textContent).toContain("1 nhớ");
    fireEvent.click(container.querySelector("[data-testid='sess-card']")!);
    act(() => { fireEvent.keyDown(window, { key: "1" }); }); // quên → 0 điểm thêm
    expect(onGrade).toHaveBeenLastCalledWith("k2", "forgot");
    fireEvent.click(container.querySelector("[data-testid='sess-card']")!);
    act(() => { fireEvent.keyDown(window, { key: "3" }); });
    expect(onExit).toHaveBeenCalledWith(2, 3);
  });
  it("grade chưa reveal → bỏ qua", () => {
    const onGrade = vi.fn();
    const { container } = render(<SrsSession words={words} onGrade={onGrade} onExit={() => {}} />);
    act(() => { fireEvent.keyDown(window, { key: "3" }); });
    expect(onGrade).not.toHaveBeenCalled();
  });
  it("Escape → onExit; click nút thoát → onExit", () => {
    const onExit = vi.fn();
    const { container } = render(<SrsSession words={words} onGrade={() => {}} onExit={onExit} />);
    act(() => { fireEvent.keyDown(window, { key: "Escape" }); });
    expect(onExit).toHaveBeenCalledWith(0, 3);
    onExit.mockClear();
    fireEvent.click(container.querySelector("[aria-label='Thoát phiên ôn tập']")!);
    expect(onExit).toHaveBeenCalledTimes(1);
  });
  it("progress label + track width theo idx", () => {
    const { container } = render(<SrsSession words={words} onGrade={() => {}} onExit={() => {}} />);
    expect(container.textContent).toContain("0 nhớ");
    const fill = container.querySelector("[data-testid='sess-fill']") as HTMLElement;
    expect(fill.style.width).toBe("0%");
  });
});
```

- [ ] **Step 2: Run verify FAIL.**

- [ ] **Step 3: Implement**

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { X } from "@/components/ui/icon";
import { useTts } from "@/lib/tts/use-tts";
import type { ReviewableWord } from "@/lib/srs-session";
import type { Grade } from "@/lib/stats/review";

const GRADES: { grade: Grade; label: string; hint: string; cls: string }[] = [
  { grade: "forgot", label: "Quên", hint: "Sau 1 phút", cls: "bg-feedback-error/10 border-feedback-error/40 text-feedback-error-text" },
  { grade: "hard", label: "Khó", hint: "Sau 5 phút", cls: "bg-amber-wash border-learning-streak/40 text-amber-ink" },
  { grade: "good", label: "Nhớ", hint: "Từ tiếp theo", cls: "bg-action-primary border-action-primary text-white" },
];

/* Overlay phiên ôn (mock .session, spec §3/§5). words là snapshot — dashboard
   ghi grade qua onGrade; mem%/buckets cập nhật sau khi phiên kết thúc. */
export function SrsSession({ words, onGrade, onExit }: {
  words: ReviewableWord[];
  onGrade: (key: string, grade: Grade) => void;
  onExit: (score: number, total: number) => void;
}) {
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const { speak } = useTts();
  const exitRef = useRef<HTMLButtonElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    prevFocusRef.current = document.activeElement as HTMLElement | null;
    exitRef.current?.focus();
    return () => prevFocusRef.current?.focus?.();
  }, []);

  const w = words[idx];
  const finish = (s: number) => onExit(s, words.length);

  /* phát âm thẻ mới khi chưa reveal (mock renderSess(false) → speak) */
  useEffect(() => {
    if (w && !revealed) speak(w.zh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  const reveal = () => setRevealed(true);

  const grade = (g: Grade) => {
    if (!revealed || !w) return;
    const s = g === "good" ? score + 1 : score;
    onGrade(w.key, g);
    if (idx >= words.length - 1) { finish(s); return; }
    setIdx(idx + 1);
    setRevealed(false);
    setScore(s);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { finish(score); return; }
      if (!w) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (revealed) speak(w.zh);
        else reveal();
        return;
      }
      if (e.key === "1") grade("forgot");
      else if (e.key === "2") grade("hard");
      else if (e.key === "3") grade("good");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const pct = words.length ? Math.round((idx / words.length) * 100) : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Phiên ôn tập"
      className="fixed inset-0 z-60 flex flex-col bg-surface-paper"
    >
      <header className="sticky top-0 border-b border-border-default bg-surface-paper/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[720px] items-center gap-2.5 px-4 py-2.5">
          <IconButton ref={exitRef} label="Thoát phiên ôn tập" variant="ghost" onClick={() => finish(score)}>
            <X size={16} strokeWidth={1.5} aria-hidden="true" />
          </IconButton>
          <div className="flex-1 text-center">
            <div className="text-xs text-text-secondary">Từ {idx + 1} / {words.length}</div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border-subtle">
              <div data-testid="sess-fill" className="h-full rounded-full bg-learning-mastered transition-[width]" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <span data-testid="sess-score" aria-live="polite" className="text-xs font-bold text-text-secondary">{score} nhớ</span>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col items-center justify-center gap-4 p-5">
        <div
          data-testid="sess-card"
          aria-live="polite"
          onClick={() => { if (!revealed) reveal(); }}
          className="w-[min(480px,100%)] cursor-pointer rounded-[24px] border border-border-default bg-surface-elevated p-8 text-center shadow-xs active:scale-[.99]"
        >
          <div data-testid="sess-glyph" className="zh text-[64px] leading-[1.35]">{w?.zh}</div>
          <div data-testid="sess-py" className={`mt-1 text-xl text-text-secondary ${revealed ? "" : "hidden"}`}>{w?.pinyin}</div>
          <div data-testid="sess-mean" className={`mt-3 font-bold ${revealed ? "" : "hidden"}`}>
            {w?.meaning} · độ bền {w?.mem}%
          </div>
        </div>

        <div className="grid w-[min(480px,100%)] gap-2.5">
          {!revealed && (
            <button
              type="button"
              onClick={reveal}
              className="min-h-[54px] rounded-2xl border border-border-default bg-surface-muted text-sm font-bold"
            >
              Chạm để xem nghĩa · Space
            </button>
          )}
          {revealed && (
            <div data-testid="sess-grades" className="grid gap-2.5 max-[480px]:grid-cols-1 min-[480px]:grid-cols-3">
              {GRADES.map((g) => (
                <button
                  key={g.grade}
                  type="button"
                  data-grade={g.grade}
                  onClick={() => grade(g.grade)}
                  className={`flex min-h-[72px] flex-col items-center gap-0.5 rounded-2xl border px-2 py-3 text-[13.5px] font-bold ${g.cls}`}
                >
                  {g.label}
                  <small className="text-[11px] font-normal opacity-85">{g.hint}</small>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

Lưu ý: `IconButton` có nhận `ref` không — kiểm tra `src/components/ui/icon-button.tsx`; nếu không forwardRef thì bỏ `ref={exitRef}` và focus qua `container.querySelector` trong effect:

```ts
document.querySelector<HTMLButtonElement>("[aria-label='Thoát phiên ôn tập']")?.focus();
```

- [ ] **Step 4: Run verify PASS.**
- [ ] **Step 5: Commit**

```bash
git add app-next/src/components/review/srs-session.tsx app-next/src/components/review/__tests__/srs-session.test.tsx
git commit -m "feat(review): SrsSession overlay — reveal, 3 grade, Space/1/2/3/Escape, aria-live"
```

---

### Task 12: Viết lại `review-dashboard.tsx` + cập nhật test + e2e

**Files:**
- Modify: `app-next/src/app/(app)/review/review-dashboard.tsx` (viết lại toàn bộ)
- Modify: `app-next/src/app/(app)/review/__tests__/review-dashboard.test.tsx` (viết lại)
- Modify: `app-next/e2e/personal-tools.spec.ts` (1 dòng expectation)
- Modify: `app-next/src/app/(app)/review/page.tsx` — chỉ giữ nguyên (đã render `<ReviewDashboard />`), kiểm tra không cần đổi.

**Interfaces:**
- Consumes: tất cả Task 1–11.
- Giữ: h1 mới chứa "cần kích hoạt lại trí nhớ" (e2e ghé vào text này). Empty state giữ copy cũ "Bộ thẻ đang trống" + link `/course` khi `srs.length === 0`.

- [ ] **Step 1: Write failing test (viết lại `review-dashboard.test.tsx`)**

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, act, cleanup, fireEvent } from "@testing-library/react";
import ReviewDashboard from "../review-dashboard";
import { progressStore } from "@/lib/store/progress-store";

afterEach(cleanup);

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: { cancel: vi.fn(), speak: vi.fn(), getVoices: () => [], speaking: false, pending: false },
  });
});

describe("ReviewDashboard (redesign 2026-10-04)", () => {
  it("localStorage trống → hero 0 từ, empty card, CTA bấm chỉ toast (Review Focus #1/#3/#5)", () => {
    const { container } = render(<ReviewDashboard />);
    expect(container.querySelector('[data-testid="hero-count"]')!.textContent).toBe("0 từ");
    expect(screen.getByText("Bộ thẻ đang trống")).toBeInTheDocument();
    expect(screen.getByText("Vào kệ sách →")).toHaveAttribute("href", "/course");
    fireEvent.click(container.querySelector('[data-testid="start-session"]')!);
    expect(container.querySelector('[role="dialog"][aria-label="Phiên ôn tập"]')).toBeNull();
  });
  it("toggleSrs hsk1 → mặc định HSK 2 rỗng; chuyển HSK 1 → 1 từ bucket Yếu (mem 25)", () => {
    progressStore.toggleSrs("hsk1.lesson-1.0");
    const { container } = render(<ReviewDashboard />);
    fireEvent.click(screen.getByText("HSK 1"));
    expect(container.querySelector('[data-testid="hero-count"]')!.textContent).toBe("1 từ");
    const buckets = container.querySelectorAll('[data-testid="bucket"]');
    expect(buckets[0].textContent).toContain("1 từ"); // weak — mem new = 25 < 55
    expect(buckets[0].textContent).toContain("爱");
  });
  it("chạy phiên: mở session → reveal → grade good → điểm 1 nhớ", () => {
    progressStore.toggleSrs("hsk1.lesson-1.0");
    const { container } = render(<ReviewDashboard />);
    fireEvent.click(screen.getByText("HSK 1"));
    fireEvent.click(container.querySelector('[data-testid="start-session"]')!);
    const sess = container.querySelector('[role="dialog"][aria-label="Phiên ôn tập"]')!;
    expect(sess).not.toBeNull();
    fireEvent.click(sess.querySelector("[data-testid='sess-card']")!);
    act(() => { fireEvent.keyDown(window, { key: "3" }); });
    // 1 từ → hết phiên, overlay đóng + toast hiện
    expect(container.querySelector('[role="dialog"][aria-label="Phiên ôn tập"]')).toBeNull();
    expect(progressStore.getSrs("hsk1.lesson-1.0")!.reviewCount).toBe(1);
    expect(progressStore.getSrs("hsk1.lesson-1.0")!.status).toBe("learning");
  });
  it("nút nét chữ mở StrokeStudio", () => {
    progressStore.toggleSrs("hsk1.lesson-1.0");
    const { container } = render(<ReviewDashboard />);
    fireEvent.click(screen.getByText("HSK 1"));
    const listenRow = container.querySelector("tbody tr");
    if (listenRow) {
      fireEvent.click(listenRow.querySelector('[aria-label^="Xem nét viết"]')!);
      expect(container.querySelector("#stroke-studio-title")).not.toBeNull();
    }
  });
});
```

- [ ] **Step 2: Run verify FAIL** — `pnpm vitest run "src/app/(app)/review"` → FAIL (dashboard cũ chưa có hero-count v.v.).

- [ ] **Step 3: Viết lại `review-dashboard.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { progressStore } from "@/lib/store/progress-store";
import { buildQueue, srsLevelFromKey, type ReviewableWord } from "@/lib/srs-session";
import type { BucketData } from "@/components/review/srs-buckets";
import { MemoryHero } from "@/components/review/memory-hero";
import { SrsBuckets } from "@/components/review/srs-buckets";
import { VocabInspector } from "@/components/review/vocab-inspector";
import { SrsSession } from "@/components/review/srs-session";
import { StrokeStudio } from "@/components/review/stroke-studio";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { Card } from "@/components/ui/card";
import { useTts } from "@/lib/tts/use-tts";
import { useToastSafe } from "@/components/shell/toast-provider";

/* Review redesign (spec 2026-10-04) — compose hero/buckets/inspector/session/studio.
   mounted-gate + tick nhai:progress như dashboard cũ; session giữ snapshot queue. */

const LEVELS = ["HSK 1", "HSK 2", "HSK 3"] as const;

function bucketize(words: ReviewableWord[]): { weak: BucketData; cons: BucketData; mast: BucketData } {
  const weak: BucketData = { count: 0, words: [] };
  const cons: BucketData = { count: 0, words: [] };
  const mast: BucketData = { count: 0, words: [] };
  for (const w of words) {
    const b = w.mem < 55 ? weak : w.mem <= 80 ? cons : mast;
    b.count += 1;
    if (b.words.length < 3) b.words.push({ zh: w.zh, key: w.key });
  }
  return { weak, cons, mast };
}

export default function ReviewDashboard() {
  const [mounted, setMounted] = useState(false);
  const [tick, setTick] = useState(0);
  const [level, setLevel] = useState<string>("HSK 2");
  const [queue, setQueue] = useState<ReviewableWord[]>([]);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [strokeWord, setStrokeWord] = useState<string | null>(null);
  const { speak } = useTts();
  const toast = useToastSafe();

  useEffect(() => {
    setMounted(true);
    const sync = () => setTick((t) => t + 1);
    window.addEventListener("nhai:progress", sync);
    return () => window.removeEventListener("nhai:progress", sync);
  }, []);

  const now = Date.now();
  const srs = mounted ? progressStore.getAllSrs() : [];
  const words = mounted ? buildQueue(srs, level, now) : [];
  const { weak, cons, mast } = bucketize(words);
  const avgMem = words.length ? Math.round(words.reduce((s, w) => s + w.mem, 0) / words.length) : 0;
  const dueCount = srs.filter(
    (it) => srsLevelFromKey(it.key) === level && it.status !== "known" && it.dueAt != null && it.dueAt <= now
  ).length;
  const estMinutes = Math.max(1, Math.ceil(dueCount / 3)); // ~20 giây/từ
  const urgent = weak.count;
  // tick chỉ ép re-render qua store event; không dùng trực tiếp (tránh lint unused)
  void tick;

  const startSession = () => {
    if (words.length === 0) {
      toast(`Chưa có từ đến hạn ở ${level}`);
      return;
    }
    setQueue(words);
    setSessionOpen(true);
  };

  return (
    <div className="mb-6 flex flex-col gap-4">
      <SegmentedTabs
        label="Lọc cấp độ HSK"
        value={level}
        onChange={setLevel}
        tabs={LEVELS.map((l) => ({ key: l, label: l }))}
        className="self-start"
      />

      <MemoryHero
        count={words.length}
        avgMem={avgMem}
        estMinutes={estMinutes}
        urgent={urgent}
        emptyQueue={dueCount === 0}
        onStart={startSession}
      />

      <SrsBuckets weak={weak} cons={cons} mast={mast} onChipClick={(zh) => speak(zh)} />

      {srs.length === 0 ? (
        <Card className="p-8 text-center">
          <h2 className="mb-2 text-xl font-extrabold tracking-tight">Bộ thẻ đang trống</h2>
          <p className="mb-4 text-text-secondary">
            Bấm nút ⭐ cạnh mỗi từ trong bài học để thêm từ vào bộ thẻ ôn.
          </p>
          <Link href="/course" className="font-bold text-action-primary hover:underline">
            Vào kệ sách →
          </Link>
        </Card>
      ) : (
        <VocabInspector words={words} onListen={(zh) => speak(zh)} onStroke={(zh) => setStrokeWord(zh)} />
      )}

      {sessionOpen && (
        <SrsSession
          words={queue}
          onGrade={(key, grade) => progressStore.recordReview(key, grade)}
          onExit={(score, total) => {
            setSessionOpen(false);
            toast(`Xong phiên ôn: ${score}/${total} từ nhớ tốt`);
          }}
        />
      )}

      {strokeWord && <StrokeStudio word={strokeWord} onClose={() => setStrokeWord(null)} />}
    </div>
  );
}
```

Chú ý: title `page.tsx` metadata "Ôn tập ngắt quãng" giữ nguyên.

- [ ] **Step 4: Run verify PASS** — `pnpm vitest run "src/app/(app)/review"` → PASS.

- [ ] **Step 5: Cập nhật e2e** — `e2e/personal-tools.spec.ts` đổi:

```ts
    ["/review", "cần kích hoạt lại trí nhớ"],
```

- [ ] **Step 6: Commit**

```bash
git add "app-next/src/app/(app)/review/review-dashboard.tsx" "app-next/src/app/(app)/review/__tests__/review-dashboard.test.tsx" app-next/e2e/personal-tools.spec.ts
git commit -m "feat(review): rewrite review-dashboard compose hero/buckets/inspector/session/studio"
```

---

### Task 13: Verification toàn bộ

**Files:** không tạo/sửa — chỉ chạy kiểm chứng.

- [ ] **Step 1: Full unit test suite**

Run: `pnpm vitest run`
Expected: toàn bộ PASS (kể cả test cũ của home/dashboard — nếu test cũ ngoài review fail vì token Progress mặc định đổi, xem Review Focus; mặc định Progress giữ `"vermilion"` như cũ nên không thể fail vì màu).

- [ ] **Step 2: Type check + build**

Run: `pnpm exec tsc --noEmit` (nếu script có `pnpm typecheck` thì dùng script)
Expected: 0 lỗi. Sau đó `pnpm build` — PASS (Next 16; route /review prerender không đụng localStorage vì dashboard client + mounted gate).

- [ ] **Step 3: e2e smoke (nếu môi trường chạy được Playwright)**

Run: `pnpm exec playwright test e2e/personal-tools.spec.ts e2e/hydration.spec.ts`
Expected: PASS. Nếu Playwright cần dev server: `pnpm dev` (port 3100) ở terminal riêng rồi chạy lại.

- [ ] **Step 4: Kiểm chứng thủ công (spec §7)**

Mở `http://localhost:3100/review`, soi light/dark × viewport 420/760/1024:
1. Hero/buckets/inspector khớp mock (khoảng cách, tone wash, membar).
2. Chạy 1 phiên ôn: Space reveal, phím 1/2/3, Escape — toast kết thúc.
3. Stroke studio: tabs 爱/好, Nét trước/sau, tốc độ 0.75x, danh sách bút thuận, chữ lạ → nodata.
4. Đổi filter HSK → counts thay đổi; ghi grade xong mem% bucket đổi (dữ liệu thật ghi vào localStorage `nhai.srs.items`).

- [ ] **Step 5: Commit cuối (nếu còn file thay đổi lẻ) + báo cáo**

```bash
git status --short   # phải sạch
```

Báo cáo kết quả: số test pass, kết quả build, link commit range.
