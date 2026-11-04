# Onboarding + Placement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Người mới vào `/` chốt mục tiêu học (đích HSK + phút/ngày) inline trên hero, làm bài test trình độ ladder 3–15 câu → app gán trạm bắt đầu trong Journey (cờ "Bắt đầu ở đây" + badge "bỏ qua được" + exempt gate pinyin).

**Architecture:** Client-side thuần (static-first — không thêm worker route). State mới `bye.onboarding.v1` trong ProgressStore (localStorage). Placement là pure generator riêng (`src/lib/exam/placement.ts`) + runner component nhỏ, KHÔNG tái dùng exam-runner (flow đó gắn thi demo + lưu D1). Journey đọc placement từ onboarding state để tính cờ/badge/gate.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Tailwind v4 + Hanzi design tokens, Vitest (jsdom), Playwright.

**Spec:** `docs/superpowers/specs/2026-11-04-onboarding-placement-design.md`

## Global Constraints

- Làm trên nhánh `onboarding-placement` (checkout từ `main` hiện hành). KHÔNG push/deploy nếu owner chưa yêu cầu.
- Repo BẮT BUỘC pnpm. Test unit: `pnpm vitest run <file>` từ `app-next/`. Full: `pnpm test && pnpm typecheck && pnpm lint`.
- Design system Hanzi: chỉ dùng semantic tokens (`bg-surface-elevated`, `text-text-secondary`, `bg-action-primary`,…) — cấm hard-code màu primitive. Icon qua `@/components/ui/icon` (lucide + `ICON_STROKE`). Nút ≥ 44px (`min-h-12`).
- Mọi key localStorage mới: const `"bye.<ten>.v1"` + methods bọc try/catch + emit `"bye:progress"` (CustomEvent trên window).
- Component client: mounted-gate SSR-safe (`if (!mounted) return null` trước khi đọc localStorage).
- Copy UI tiếng Việt. Test id prefix `data-testid="onboarding-*"` / `"placement-*"`.
- Commit mỗi task: `feat(onboarding): <nội dung>` — KHÔNG `--no-verify` trừ khi hook fail vì lý do môi trường (ghi rõ trong báo cáo).

---

### Task 1: Onboarding state trong ProgressStore

**Files:**
- Modify: `app-next/src/lib/store/progress-store.ts`
- Test: `app-next/src/lib/store/__tests__/progress-store-onboarding.test.ts`

**Interfaces:**
- Consumes: pattern `readJSON/writeJSON` + `emitProgress()` có sẵn trong class.
- Produces (Task 4, 5, 6 dùng):
  ```ts
  export type GoalLevel = "hsk1" | "hsk2" | "hsk3" | "hsk4" | "hsk5";
  export type StageId = "pinyin" | "hsk1" | "hsk2" | "hsk3" | "hsk4" | "hsk5";
  export type PlacementBlocks = Partial<
    Record<"hsk1" | "hsk2" | "hsk3" | "hsk4" | "hsk5", { correct: number; total: 3 }>
  >;
  export type OnboardingState = {
    goal: GoalLevel;
    minutes: 10 | 15 | 30;
    skipped?: 1; // đã "Bỏ qua" — hero không hỏi lại; không có ý nghĩa học tập
    placement?: { suggestedStage: StageId; blocks: PlacementBlocks; seed: number; at: number };
    at: number;
  };
  // interface ProgressStoreApi thêm:
  getOnboarding(): OnboardingState | null;
  setOnboarding(s: OnboardingState): void;
  ```

- [ ] **Step 1: Viết test thất bại**

```ts
// app-next/src/lib/store/__tests__/progress-store-onboarding.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ProgressStore, type OnboardingState } from "../progress-store";

beforeEach(() => localStorage.clear());

const full: OnboardingState = {
  goal: "hsk5",
  minutes: 15,
  placement: { suggestedStage: "hsk2", blocks: { hsk1: { correct: 3, total: 3 } }, seed: 42, at: 1700000000000 },
  at: 1700000000000,
};

describe("onboarding state", () => {
  it("mặc định null khi chưa set", () => {
    expect(new ProgressStore().getOnboarding()).toBeNull();
  });

  it("roundtrip goal+minutes+placement", () => {
    const s = new ProgressStore();
    s.setOnboarding(full);
    expect(s.getOnboarding()).toEqual(full);
  });

  it("skip-only state (không placement) roundtrip", () => {
    const s = new ProgressStore();
    s.setOnboarding({ goal: "hsk2", minutes: 10, skipped: 1, at: 1 });
    expect(s.getOnboarding()).toEqual({ goal: "hsk2", minutes: 10, skipped: 1, at: 1 });
  });

  it("emit 'bye:progress' khi setOnboarding", () => {
    const s = new ProgressStore();
    const spy = vi.fn();
    window.addEventListener("bye:progress", spy);
    s.setOnboarding(full);
    expect(spy).toHaveBeenCalled();
    window.removeEventListener("bye:progress", spy);
  });

  it("JSON hỏng → null (không throw)", () => {
    localStorage.setItem("bye.onboarding.v1", "{oops");
    expect(new ProgressStore().getOnboarding()).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy test thất bại**

Run: `cd app-next && pnpm vitest run src/lib/store/__tests__/progress-store-onboarding.test.ts`
Expected: FAIL — `getOnboarding is not a function`

- [ ] **Step 3: Implement**

Trong `progress-store.ts`:
1. Thêm types (mục Interfaces) gần các type khác ở đầu file (sau `RoadmapGateRec`).
2. Trong `ProgressStoreApi` thêm 2 method.
3. Trong class `ProgressStore` (theo pattern getter/setter hiện có — xem 1 method gần nhất để copy khối try/catch + emit):

```ts
/* Onboarding lần đầu (spec 2026-11-04) — key bye.onboarding.v1 */
ONBOARDING_KEY = "bye.onboarding.v1";

getOnboarding(): OnboardingState | null {
  return this.readJSON<OnboardingState | null>(this.ONBOARDING_KEY, null);
}
setOnboarding(s: OnboardingState): void {
  this.writeJSON(this.ONBOARDING_KEY, s);
  this.emitProgress();
}
```

> Lưu ý executor: tên helper thật trong class là gì (`readJSON`/`writeJSON`/`emitProgress` hay khác) — mở file, copy y hệt 1 getter/setter kề bên (vd `getRoadmapGate`/`setRoadmapGate`) và thay tên key. Nếu class không lưu key là field thì thêm const module-level `const ONBOARDING_KEY = "bye.onboarding.v1";` cạnh các const key khác.

- [ ] **Step 4: Chạy test pass**

Run: `pnpm vitest run src/lib/store/__tests__/progress-store-onboarding.test.ts`
Expected: PASS 5/5

- [ ] **Step 5: Commit**

```bash
git add src/lib/store/progress-store.ts src/lib/store/__tests__/progress-store-onboarding.test.ts
git commit -m "feat(onboarding): onboarding state trong ProgressStore (bye.onboarding.v1)"
```

---

### Task 2: Placement generator + ladder (pure)

**Files:**
- Create: `app-next/src/lib/exam/placement.ts`
- Test: `app-next/src/lib/exam/__tests__/placement.test.ts`

**Interfaces:**
- Consumes: `VocabData` (`Record<string, Record<string, VocabLesson>>` từ `@/lib/content/vocab`), `VocabWord` (`@/content/vocab`).
- Produces (Task 3, 4 dùng):
  ```ts
  export type PlacementStage = "hsk1" | "hsk2" | "hsk3" | "hsk4" | "hsk5";
  export const PLACEMENT_LEVELS: PlacementStage[]; // ["hsk1",…,"hsk5"]
  export const PLACEMENT_PASS = 2; // đạt ≥2/3 per block
  export type PlacementQuestion = {
    kind: "meaning" | "cloze";
    prompt: string;            // meaning: `Từ 心 nghĩa là gì?` · cloze: câu có __
    options: string[];         // 4 lựa chọn (1 đúng)
    answer: string;
  };
  export type PlacementBlock = { level: PlacementStage; questions: PlacementQuestion[] };
  export function generatePlacementBlocks(data: VocabData, seed: number): PlacementBlock[];
  export function placementSuggestedStage(
    blocks: Partial<Record<PlacementStage, { correct: number; total: number }>>,
  ): StageId; // import StageId từ @/lib/store/progress-store
  ```

- [ ] **Step 1: Viết test thất bại**

```ts
// app-next/src/lib/exam/__tests__/placement.test.ts
import { describe, it, expect } from "vitest";
import { generatePlacementBlocks, placementSuggestedStage, PLACEMENT_LEVELS } from "../placement";
import type { VocabData } from "@/lib/content/vocab";

/* fixture 6 từ/level — đủ cho 2 meaning + 1 cloze + 3 distractor */
function fakeLevel(hanziList: string[]): Record<string, { title: string; words: { hanzi: string; pinyin: string; hanViet: string; meaning: string; pos: string; example: { zh: string; pinyinPerChar: { c: string; py: string }[]; vi: string }[] }[] }> {
  const lessons: Record<string, { title: string; words: { hanzi: string; pinyin: string; hanViet: string; meaning: string; pos: string; example: { zh: string; pinyinPerChar: { c: string; py: string }[]; vi: string }[] }[] }> = {};
  hanziList.forEach((h, i) => {
    lessons[`l${i}`] = {
      title: `Bài ${i}`,
      words: [{
        hanzi: h, pinyin: `py${i}`, hanViet: `hv${i}`, meaning: `nghĩa ${h}`, pos: "v",
        example: { zh: `Tôi ${h} bạn`, pinyinPerChar: [], vi: `Tôi ${h} bạn` },
      }],
    };
  });
  return lessons;
}

const DATA: VocabData = {
  hsk1: fakeLevel(["一", "二", "三", "四", "五", "六"]),
  hsk2: fakeLevel(["七", "八", "九", "十", "十一", "十二"]),
  hsk3: fakeLevel(["人", "大", "小", "上", "下", "中"]),
  hsk4: fakeLevel(["天", "地", "水", "火", "山", "田"]),
  hsk5: fakeLevel(["金", "木", "水", "火", "土", "风"]),
};

describe("generatePlacementBlocks", () => {
  it("đủ 5 block × 3 câu, đúng level", () => {
    const blocks = generatePlacementBlocks(DATA, 42);
    expect(blocks.map((b) => b.level)).toEqual(PLACEMENT_LEVELS);
    for (const b of blocks) {
      expect(b.questions).toHaveLength(3);
      for (const q of b.questions) {
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options).size).toBe(4); // distractor không trùng
        expect(q.options).toContain(q.answer);
      }
    }
  });

  it("deterministic: cùng seed → cùng đề", () => {
    expect(generatePlacementBlocks(DATA, 7)).toEqual(generatePlacementBlocks(DATA, 7));
    expect(generatePlacementBlocks(DATA, 7)).not.toEqual(generatePlacementBlocks(DATA, 8));
  });

  it("meaning question: prompt chứa hanzi, answer là meaning", () => {
    const blocks = generatePlacementBlocks(DATA, 1);
    const q = blocks[0].questions.find((x) => x.kind === "meaning")!;
    expect(q.answer).toMatch(/^nghĩa /);
  });

  it("cloze question: prompt chứa __", () => {
    const blocks = generatePlacementBlocks(DATA, 1);
    const q = blocks[0].questions.find((x) => x.kind === "cloze")!;
    expect(q.prompt).toContain("__");
  });
});

describe("placementSuggestedStage", () => {
  const b = (correct: number) => ({ correct, total: 3 });
  it("fail ngay hsk1 → pinyin", () => {
    expect(placementSuggestedStage({ hsk1: b(1) })).toBe("pinyin");
  });
  it("pass hsk1, fail hsk2 → hsk1", () => {
    expect(placementSuggestedStage({ hsk1: b(3), hsk2: b(1) })).toBe("hsk1");
  });
  it("pass hết → hsk5", () => {
    expect(placementSuggestedStage({ hsk1: b(3), hsk2: b(2), hsk3: b(3), hsk4: b(2), hsk5: b(3) })).toBe("hsk5");
  });
  it("block thiếu coi như fail (dừng ở block trước)", () => {
    expect(placementSuggestedStage({ hsk1: b(3) })).toBe("hsk1");
    expect(placementSuggestedStage({})).toBe("pinyin");
  });
});
```

- [ ] **Step 2: Chạy test thất bại**

Run: `pnpm vitest run src/lib/exam/__tests__/placement.test.ts`
Expected: FAIL — module không tồn tại

- [ ] **Step 3: Implement**

```ts
// app-next/src/lib/exam/placement.ts
/* Placement test (spec 2026-11-04 §4) — ladder 5 block × 3 câu trắc nghiệm đọc.
   Pure + deterministic theo seed (distractor xoay vòng như exam/generate.ts).
   KHÔNG nghe (chưa có audio per-vocab), KHÔNG tự luận. */
import type { VocabData, VocabLesson } from "@/lib/content/vocab";
import type { VocabWord } from "@/content/vocab";
import type { StageId } from "@/lib/store/progress-store";

export type PlacementStage = "hsk1" | "hsk2" | "hsk3" | "hsk4" | "hsk5";
export const PLACEMENT_LEVELS: PlacementStage[] = ["hsk1", "hsk2", "hsk3", "hsk4", "hsk5"];
export const PLACEMENT_PASS = 2;

export type PlacementQuestion = { kind: "meaning" | "cloze"; prompt: string; options: string[]; answer: string };
export type PlacementBlock = { level: PlacementStage; questions: PlacementQuestion[] };

/* Distractor deterministic: các từ kế tiếp trong danh sách, khác từ gốc (như exam/generate.ts optionSet). */
function distractors(words: VocabWord[], idx: number, value: (w: VocabWord) => string): string[] {
  const n = words.length;
  const out: string[] = [];
  for (let k = 1; out.length < 3 && k < n; k++) {
    const v = value(words[(idx + k) % n]);
    if (v !== value(words[idx]) && !out.includes(v)) out.push(v);
  }
  return out;
}

/* Xáo options: xoay phải `shift` bước — đáp án không luôn đứng đầu. */
function rotate(arr: string[], shift: number): string[] {
  const n = arr.length;
  return arr.map((_, i) => arr[(i - (shift % n) + n) % n]);
}

function meaningQ(words: VocabWord[], idx: number): PlacementQuestion {
  const w = words[idx];
  const options = rotate([w.meaning, ...distractors(words, idx, (x) => x.meaning)], idx);
  return { kind: "meaning", prompt: `Từ ${w.hanzi} (${w.pinyin}) nghĩa là gì?`, options, answer: w.meaning };
}

function clozeQ(words: VocabWord[], idx: number): PlacementQuestion | null {
  const w = words[idx];
  const pos = w.example.zh.indexOf(w.hanzi);
  if (pos < 0 || w.hanzi.length === 0) return null;
  const options = rotate([w.hanzi, ...distractors(words, idx, (x) => x.hanzi)], idx);
  return {
    kind: "cloze",
    prompt: w.example.zh.slice(0, pos) + "__" + w.example.zh.slice(pos + w.hanzi.length),
    options,
    answer: w.hanzi,
  };
}

function flatten(data: VocabData, level: PlacementStage): VocabWord[] {
  const lessons: Record<string, VocabLesson> = data[level] ?? {};
  return Object.values(lessons).flatMap((l) => l.words);
}

export function generatePlacementBlocks(data: VocabData, seed: number): PlacementBlock[] {
  return PLACEMENT_LEVELS.map((level, li) => {
    const words = flatten(data, level);
    if (words.length < 4) throw new Error(`placement: thiếu từ cho ${level}`);
    const offset = (seed + li * 3) % words.length;
    const questions: PlacementQuestion[] = [
      meaningQ(words, offset % words.length),
      meaningQ(words, (offset + 2) % words.length),
    ];
    const cloze = clozeQ(words, (offset + 4) % words.length) ?? meaningQ(words, (offset + 4) % words.length);
    questions.push(cloze);
    return { level, questions };
  });
}

/** Ladder: pass (≥ PLACEMENT_PASS) thì lên block kế; block đầu fail → stage trước, hsk1 fail → "pinyin". */
export function placementSuggestedStage(
  blocks: Partial<Record<PlacementStage, { correct: number; total: number }>>,
): StageId {
  let last: StageId = "pinyin";
  for (const level of PLACEMENT_LEVELS) {
    const b = blocks[level];
    if (!b || b.correct < PLACEMENT_PASS) break;
    last = level;
  }
  return last;
}
```

> Executor: nếu `@/lib/store/progress-store` import vào file pure gây vấn đề circular, định nghĩa `type StageId = "pinyin" | "hsk1" | … | "hsk5"` trực tiếp trong `placement.ts` và progress-store import ngược từ đây — chọn 1 hướng duy nhất (ưu tiên: type sống ở `placement.ts` vì lib thuần).

- [ ] **Step 4: Chạy test pass**

Run: `pnpm vitest run src/lib/exam/__tests__/placement.test.ts`
Expected: PASS 8/8

- [ ] **Step 5: Commit**

```bash
git add src/lib/exam/placement.ts src/lib/exam/__tests__/placement.test.ts
git commit -m "feat(onboarding): placement generator + ladder (pure, deterministic)"
```

---

### Task 3: Placement runner component

**Files:**
- Create: `app-next/src/components/home/placement-test.tsx`

**Interfaces:**
- Consumes: `generatePlacementBlocks`, `placementSuggestedStage`, `PLACEMENT_LEVELS` (Task 2); `loadVocab` từ `@/lib/content/vocab-client`; `StageId`, `PlacementBlocks` (Task 1).
- Produces (Task 4 dùng):
  ```ts
  export type PlacementResult = { suggestedStage: StageId; blocks: PlacementBlocks; seed: number };
  export default function PlacementTest({ onComplete, onCancel }: {
    onComplete: (r: PlacementResult) => void;
    onCancel: () => void;
  }): JSX.Element | null;
  ```
  Test ids: `placement-question` (container), `placement-option` (button, attr `data-correct="true|false"`), `placement-progress`, `placement-cancel`.

- [ ] **Step 1: Implement** (component nhỏ, UI covered bởi e2e Task 7 + unit Task 4; logic chấm đã unit test ở Task 2)

```tsx
// app-next/src/components/home/placement-test.tsx
"use client";

/* Runner bài test trình độ (spec 2026-11-04 §4): ladder từng block, dừng khi fail.
   Tách khỏi exam-runner: không lưu D1, không sections nghe/viết. */

import { useEffect, useMemo, useState } from "react";
import { X } from "@/components/ui/icon";
import { loadVocab } from "@/lib/content/vocab-client";
import type { VocabData } from "@/lib/content/vocab";
import {
  generatePlacementBlocks, placementSuggestedStage, PLACEMENT_LEVELS,
  type PlacementStage,
} from "@/lib/exam/placement";
import type { PlacementBlocks, StageId } from "@/lib/store/progress-store";

export type PlacementResult = { suggestedStage: StageId; blocks: PlacementBlocks; seed: number };

const BTN_OPTION =
  "min-h-12 w-full rounded-control border border-border-default bg-surface-elevated px-4 py-3 text-left text-[15px] font-medium text-text-primary hover:bg-surface-muted hover:border-border-strong focus-visible:outline-none focus-visible:ring-3 ring-action-focus";

export default function PlacementTest({ onComplete, onCancel }: {
  onComplete: (r: PlacementResult) => void;
  onCancel: () => void;
}) {
  const [data, setData] = useState<VocabData | null>(null);
  const [error, setError] = useState(false);
  const [qi, setQi] = useState(0); // index câu toàn cục qua các block
  const [blocks, setBlocks] = useState<PlacementBlocks>({});
  const seed = useMemo(() => Date.now(), []);

  useEffect(() => {
    loadVocab().then(setData).catch(() => setError(true));
  }, []);

  const allBlocks = useMemo(() => (data ? generatePlacementBlocks(data, seed) : []), [data, seed]);
  const flat = useMemo(() => allBlocks.flatMap((b) => b.questions.map((q) => ({ ...q, blockLevel: b.level }))), [allBlocks]);

  if (error) {
    return (
      <div data-testid="placement-error" className="rounded-card border border-border-default bg-surface-elevated p-5 text-[14px] text-text-secondary">
        Không tải được dữ liệu test. <button onClick={onCancel} className="font-bold text-action-primary underline">Quay lại</button>
      </div>
    );
  }
  if (!data) return null;

  const q = flat[qi];
  const levelOf = PLACEMENT_LEVELS[Math.min(PLACEMENT_LEVELS.length - 1, Math.floor(qi / 3))] as PlacementStage;

  const answer = (i: number) => {
    const correct = q.options[i] === q.answer;
    const cur = blocks[q.blockLevel] ?? { correct: 0, total: 3 };
    const next = { ...cur, correct: cur.correct + (correct ? 1 : 0) };
    const nextBlocks = { ...blocks, [q.blockLevel]: next };
    const isLastOfBlock = qi % 3 === 2;
    if (isLastOfBlock && next.correct < 2) {
      // fail block → dừng ladder, xuất kết quả
      onComplete({ suggestedStage: placementSuggestedStage(nextBlocks), blocks: nextBlocks, seed });
      return;
    }
    if (qi + 1 >= flat.length) {
      onComplete({ suggestedStage: placementSuggestedStage(nextBlocks), blocks: nextBlocks, seed });
      return;
    }
    setBlocks(nextBlocks);
    setQi(qi + 1);
  };

  return (
    <div className="rounded-card border border-border-default bg-surface-elevated p-5 md:p-6">
      <div className="flex items-center justify-between">
        <p data-testid="placement-progress" className="text-[12px] font-bold uppercase tracking-[0.08em] text-text-secondary">
          {levelOf.toUpperCase()} · Câu {qi + 1}/15
        </p>
        <button onClick={onCancel} data-testid="placement-cancel" aria-label="Thoát test"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-text-secondary hover:bg-surface-muted">
          <X size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-surface-muted">
        <div className="h-full rounded-full bg-action-primary" style={{ width: `${Math.round(((qi + 1) / 15) * 100)}%` }} />
      </div>
      <p data-testid="placement-question" className="zh mt-5 text-lg font-bold leading-relaxed">
        {q.kind === "cloze" ? q.prompt : q.prompt}
      </p>
      <div className="mt-4 flex flex-col gap-2.5">
        {q.options.map((opt, i) => (
          <button key={i} data-testid="placement-option" data-correct={opt === q.answer ? "true" : "false"}
            onClick={() => answer(i)} className={BTN_OPTION}>
            <span className="zh">{opt}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

> Executor: `prompt` nghĩa/cloze đều render 1 dòng là đủ; không cần nhánh kind. Kiểm tra `@/components/ui/icon` có export `X` (grep); nếu không, dùng icon lucide tương đương sẵn trong file đó.

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: 0 error mới

- [ ] **Step 3: Commit**

```bash
git add src/components/home/placement-test.tsx
git commit -m "feat(onboarding): placement runner component (ladder UI)"
```

---

### Task 4: OnboardingHero flow 3 bước

**Files:**
- Create: `app-next/src/components/home/onboarding-hero.tsx`
- Test: `app-next/src/components/home/__tests__/onboarding-hero.test.tsx`

**Interfaces:**
- Consumes: `getOnboarding/setOnboarding` (Task 1), `PlacementTest` + `PlacementResult` (Task 3).
- Produces: `export default function OnboardingHero({ onDone }: { onDone: () => void })` — component tự setOnboarding trước khi gọi `onDone()`.
- Test ids: `onboarding-hero`, `onboarding-goal-hsk1…hsk5`, `onboarding-minutes-10|15|30`, `onboarding-next`, `onboarding-take-test`, `onboarding-skip-test`, `onboarding-skip`, `onboarding-result` (nút cuối `onboarding-start-journey` → Link `/roadmap`).

- [ ] **Step 1: Viết test thất bại**

```tsx
// app-next/src/components/home/__tests__/onboarding-hero.test.tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProgressStore } from "@/lib/store/progress-store";

const { PlacementTestMock } = vi.hoisted(() => ({ PlacementTestMock: vi.fn() }));
vi.mock("../placement-test", () => ({ default: PlacementTestMock }));

import OnboardingHero from "../onboarding-hero";

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

function goalStep() {
  return render(<OnboardingHero onDone={() => {}} />);
}

describe("OnboardingHero", () => {
  it("bước 1: chọn goal + minutes rồi Tiếp tục → bước offer", () => {
    goalStep();
    expect(screen.getByTestId("onboarding-hero")).toBeTruthy();
    fireEvent.click(screen.getByTestId("onboarding-goal-hsk5"));
    fireEvent.click(screen.getByTestId("onboarding-minutes-15"));
    fireEvent.click(screen.getByTestId("onboarding-next"));
    expect(screen.getByTestId("onboarding-take-test")).toBeTruthy();
  });

  it("bước 2: Bỏ qua test → setOnboarding không placement + onDone", () => {
    const onDone = vi.fn();
    render(<OnboardingHero onDone={onDone} />);
    fireEvent.click(screen.getByTestId("onboarding-goal-hsk2"));
    fireEvent.click(screen.getByTestId("onboarding-minutes-10"));
    fireEvent.click(screen.getByTestId("onboarding-next"));
    fireEvent.click(screen.getByTestId("onboarding-skip-test"));
    const s = new ProgressStore().getOnboarding();
    expect(s).toMatchObject({ goal: "hsk2", minutes: 10 });
    expect(s?.placement).toBeUndefined();
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("bước 2: chọn Làm test → render PlacementTest; onComplete → lưu + màn result", () => {
    PlacementTestMock.mockImplementation(({ onComplete }: { onComplete: (r: unknown) => void }) => (
      <button data-testid="mock-test-finish" onClick={() => onComplete({ suggestedStage: "hsk3", blocks: { hsk1: { correct: 3, total: 3 }, hsk2: { correct: 2, total: 3 } }, seed: 9 })} />
    ));
    render(<OnboardingHero onDone={() => {}} />);
    fireEvent.click(screen.getByTestId("onboarding-goal-hsk5"));
    fireEvent.click(screen.getByTestId("onboarding-minutes-30"));
    fireEvent.click(screen.getByTestId("onboarding-next"));
    fireEvent.click(screen.getByTestId("onboarding-take-test"));
    fireEvent.click(screen.getByTestId("mock-test-finish"));
    const s = new ProgressStore().getOnboarding();
    expect(s?.placement?.suggestedStage).toBe("hsk3");
    expect(screen.getByTestId("onboarding-result")).toBeTruthy();
    expect(screen.getByTestId("onboarding-start-journey").getAttribute("href")).toBe("/roadmap");
  });

  it("Bỏ qua toàn flow (bước 1) → setOnboarding skipped + onDone", () => {
    const onDone = vi.fn();
    render(<OnboardingHero onDone={onDone} />);
    fireEvent.click(screen.getByTestId("onboarding-skip"));
    const s = new ProgressStore().getOnboarding();
    expect(s?.skipped).toBe(1);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Chạy test thất bại**

Run: `pnpm vitest run src/components/home/__tests__/onboarding-hero.test.tsx`
Expected: FAIL — không tìm thấy `onboarding-hero`

- [ ] **Step 3: Implement**

```tsx
// app-next/src/components/home/onboarding-hero.tsx
"use client";

/* Onboarding hero 3 bước (spec 2026-11-04 §3): goal → offer test → test/result.
   Toàn bộ optional — Bỏ qua mọi lúc. Lưu bye.onboarding.v1 qua progressStore. */

import { useState } from "react";
import Link from "next/link";
import { Play, Sparkles, ICON_STROKE } from "@/components/ui/icon";
import { progressStore, type GoalLevel, type OnboardingState } from "@/lib/store/progress-store";
import PlacementTest, { type PlacementResult } from "./placement-test";

const btnPrimary =
  "inline-flex w-full min-h-12 items-center justify-center gap-2 rounded-control border border-transparent bg-action-primary px-6 text-[15px] font-semibold text-white hover:bg-action-primary-hover active:bg-action-primary-active focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2 sm:w-auto";
const btnGhost =
  "inline-flex w-full min-h-12 items-center justify-center gap-2 rounded-control border border-border-default bg-surface-muted px-6 text-[15px] font-semibold text-text-primary hover:bg-surface-elevated hover:border-border-strong focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2 sm:w-auto";
const chip =
  "min-h-12 rounded-control border px-4 text-[14px] font-semibold focus-visible:outline-none focus-visible:ring-3 ring-action-focus";

const STAGE_LABEL: Record<string, string> = {
  pinyin: "Nền tảng Pinyin",
  hsk1: "HSK 1", hsk2: "HSK 2", hsk3: "HSK 3", hsk4: "HSK 4", hsk5: "HSK 5",
};

type Step = "goal" | "offer" | "test" | "result";

export default function OnboardingHero({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<Step>("goal");
  const [goal, setGoal] = useState<GoalLevel>("hsk5");
  const [minutes, setMinutes] = useState<10 | 15 | 30>(15);
  const [result, setResult] = useState<PlacementResult | null>(null);

  const save = (extra: Partial<OnboardingState> = {}) => {
    progressStore.setOnboarding({ goal, minutes, at: Date.now(), ...extra });
  };

  return (
    <section
      data-testid="onboarding-hero"
      aria-label="Bắt đầu hành trình"
      className="relative overflow-hidden rounded-card border border-border-default bg-surface-elevated p-5 shadow-xs md:p-[22px]"
    >
      <span aria-hidden="true"
        className="zh pointer-events-none absolute -top-6 right-2 select-none text-[140px] font-extrabold leading-none text-text-primary opacity-[0.055] md:text-[210px]">
        {step === "result" ? "路" : "学"}
      </span>
      <div className="relative z-[1]">
        {step === "goal" && (
          <>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-secondary">BẮT ĐẦU HÀNH TRÌNH</p>
            <h2 className="mt-3 text-xl font-bold tracking-tight md:text-2xl">
              Bạn học tiếng Trung để đạt HSK nào?
            </h2>
            <div className="mt-4 flex flex-wrap gap-2.5" role="group" aria-label="Chọn đích HSK">
              {(["hsk1", "hsk2", "hsk3", "hsk4", "hsk5"] as GoalLevel[]).map((g) => (
                <button key={g} data-testid={`onboarding-goal-${g}`} onClick={() => setGoal(g)}
                  aria-pressed={goal === g}
                  className={`${chip} ${goal === g ? "border-action-primary bg-action-primary text-white" : "border-border-default bg-surface-muted text-text-primary hover:bg-surface-elevated"}`}>
                  {STAGE_LABEL[g]}
                </button>
              ))}
            </div>
            <p className="mt-4 text-[13.5px] text-text-secondary">Mỗi ngày bạn có thể học bao nhiêu phút?</p>
            <div className="mt-2 flex flex-wrap gap-2.5" role="group" aria-label="Chọn phút mỗi ngày">
              {([10, 15, 30] as const).map((m) => (
                <button key={m} data-testid={`onboarding-minutes-${m}`} onClick={() => setMinutes(m)}
                  aria-pressed={minutes === m}
                  className={`${chip} ${minutes === m ? "border-action-primary bg-action-primary text-white" : "border-border-default bg-surface-muted text-text-primary hover:bg-surface-elevated"}`}>
                  {m} phút
                </button>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button data-testid="onboarding-next" onClick={() => setStep("offer")} className={btnPrimary}>
                Tiếp tục
              </button>
              <button data-testid="onboarding-skip" onClick={() => { save({ skipped: 1 }); onDone(); }} className={btnGhost}>
                Bỏ qua
              </button>
            </div>
          </>
        )}

        {step === "offer" && (
          <>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-secondary">MỤC TIÊU CỦA BẠN</p>
            <h2 className="mt-3 text-xl font-bold tracking-tight md:text-2xl">
              Đích: {STAGE_LABEL[goal]} · {minutes} phút/ngày
            </h2>
            <p className="mt-2 text-[13.5px] text-text-secondary">
              Làm nhanh bài test 3–15 câu để biết bạn nên bắt đầu từ trạm nào — hoặc bắt đầu từ đầu cùng mọi người.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button data-testid="onboarding-take-test" onClick={() => setStep("test")} className={btnPrimary}>
                <Sparkles size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
                Làm test trình độ (~3 phút)
              </button>
              <button data-testid="onboarding-skip-test" onClick={() => { save(); onDone(); }} className={btnGhost}>
                Bỏ qua — bắt đầu từ đầu
              </button>
            </div>
          </>
        )}

        {step === "test" && (
          <PlacementTest
            onCancel={() => setStep("offer")}
            onComplete={(r) => { save({ placement: { ...r, at: Date.now() } }); setResult(r); setStep("result"); }}
          />
        )}

        {step === "result" && result && (
          <>
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-secondary">KẾT QUẢ TEST</p>
            <h2 className="mt-3 text-xl font-bold tracking-tight md:text-2xl">
              Bạn nên bắt đầu từ <span className="zh">{STAGE_LABEL[result.suggestedStage]}</span>
            </h2>
            <p className="mt-2 text-[13.5px] text-text-secondary">
              Trạm thấp hơn vẫn mở tự do — bạn có thể quay lại ôn bất cứ lúc nào.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link data-testid="onboarding-start-journey" href="/roadmap" className={btnPrimary}>
                <Play size={16} strokeWidth={ICON_STROKE} aria-hidden="true" className="fill-current" />
                Vào Journey
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
```

> Executor: `Sparkles` phải tồn tại trong `@/components/ui/icon` — grep trước; không có thì chọn icon lucide có sẵn. Copy class chip nút theo `btnPrimary` style tokens.

- [ ] **Step 4: Chạy test pass**

Run: `pnpm vitest run src/components/home/__tests__/onboarding-hero.test.tsx`
Expected: PASS 4/4

- [ ] **Step 5: Commit**

```bash
git add src/components/home/onboarding-hero.tsx src/components/home/__tests__/onboarding-hero.test.tsx
git commit -m "feat(onboarding): hero flow 3 bước goal → offer → test/result"
```

---

### Task 5: Tích hợp Home (HomeHero + LandingIntro + page.tsx)

**Files:**
- Create: `app-next/src/components/home/home-hero.tsx`
- Create: `app-next/src/components/home/landing-intro.tsx`
- Modify: `app-next/src/app/(app)/page.tsx`

**Interfaces:**
- Consumes: `OnboardingHero` (Task 4), `HeroAction` (hiện có), `useHomeSummary` (hiện có), `progressStore.getOnboarding` (Task 1).
- Produces: `HomeHero` (swap nội bộ) + `LandingIntro` (tự gate: null khi `!mounted || lessonsDone > 0`).

- [ ] **Step 1: HomeHero**

```tsx
// app-next/src/components/home/home-hero.tsx
"use client";

/* Swap hero: chưa onboarding + progress 0 → flow onboarding; còn lại → HeroAction cũ. */

import { useEffect, useState } from "react";
import HeroAction from "./hero-action";
import OnboardingHero from "./onboarding-hero";
import { progressStore, type OnboardingState } from "@/lib/store/progress-store";
import { useHomeSummary } from "@/lib/home-summary";

export default function HomeHero() {
  const s = useHomeSummary();
  const [ob, setOb] = useState<OnboardingState | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const sync = () => setOb(progressStore.getOnboarding());
    sync();
    setMounted(true);
    window.addEventListener("bye:progress", sync);
    return () => window.removeEventListener("bye:progress", sync);
  }, []);
  if (!s.mounted || !mounted) return null;
  if (ob == null && s.lessonsDone === 0) {
    return <OnboardingHero onDone={() => setOb(progressStore.getOnboarding())} />;
  }
  return <HeroAction />;
}
```

- [ ] **Step 2: LandingIntro** — section "HSK là gì" (static, Hanzi tokens)

```tsx
// app-next/src/components/home/landing-intro.tsx
"use client";

/* Section "HSK là gì" dưới hero (spec 2026-11-04 §2) — chỉ hiện khi guest progress 0. */

import { useHomeSummary } from "@/lib/home-summary";

const LEVELS = [
  { id: "HSK 1", words: 500, note: "Câu chào, số, giờ — đạt nhanh, giữ động lực" },
  { id: "HSK 2", words: 1272, note: "Giao tiếp thường ngày đơn giản" },
  { id: "HSK 3", words: 2245, note: "Đọc hiểu đoạn ngắn" },
  { id: "HSK 4", words: 3245, note: "Trò chuyện trôi chảy chủ đề rộng" },
  { id: "HSK 5", words: 4316, note: "Đọc báo, xem phim, làm việc bằng tiếng Trung" },
];

export default function LandingIntro() {
  const s = useHomeSummary();
  if (!s.mounted || s.lessonsDone > 0) return null;
  return (
    <section data-testid="landing-intro" aria-label="HSK là gì"
      className="rounded-card border border-border-default bg-surface-elevated p-5 md:p-6">
      <h2 className="text-lg font-bold tracking-tight md:text-xl">HSK là gì?</h2>
      <p className="mt-2 text-[13.5px] text-text-secondary">
        HSK là kỳ thi chuẩn tiếng Trung của Trung Quốc, chia 9 cấp. Con đường phổ biến nhất:
        học lần lượt HSK 1 → 5. Ứng lượng từ mỗi cấp:
      </p>
      <ul className="mt-4 flex flex-col gap-2.5">
        {LEVELS.map((l) => (
          <li key={l.id} className="flex items-baseline gap-3 text-[14px]">
            <span className="w-16 shrink-0 font-bold text-text-primary">{l.id}</span>
            <span className="w-14 shrink-0 text-text-secondary">{l.words} từ</span>
            <span className="text-text-secondary">{l.note}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

> Executor: kiểm tra số từ thật trong `src/content/courses.ts` (hoặc vocabMeta) và thay `words` cho khớp — comment ghi rõ nguồn số liệu.

- [ ] **Step 3: Sửa `page.tsx`** — mở `app-next/src/app/(app)/page.tsx`, thay import `HeroAction` → `HomeHero`, đổi thẻ render `<HeroAction />` thành `<HomeHero />`, và chèn `<LandingIntro />` ngay sau hero trong cùng container. Giữ nguyên mọi component khác.

- [ ] **Step 4: Chạy full unit + typecheck + lint**

Run: `pnpm vitest run && pnpm typecheck && pnpm lint`
Expected: 0 fail mới, 0 error lint mới (warning React Compiler là pre-existing)

- [ ] **Step 5: Commit**

```bash
git add src/components/home/home-hero.tsx src/components/home/landing-intro.tsx "src/app/(app)/page.tsx"
git commit -m "feat(onboarding): tích hợp home — hero swap + section HSK là gì"
```

---

### Task 6: Journey — cờ, badge bỏ qua, gate exempt

**Files:**
- Modify: `app-next/src/lib/roadmap-progress.ts`
- Modify: `app-next/src/app/(app)/roadmap/roadmap-client.tsx`
- Test: `app-next/src/lib/__tests__/roadmap-placement.test.ts` (mới) + sửa `app-next/src/app/(app)/roadmap/__tests__/roadmap-client.test.tsx`

**Interfaces:**
- Consumes: `OnboardingState/StageId` (Task 1).
- Produces (dùng trong roadmap-client + test):
  ```ts
  // roadmap-progress.ts thêm:
  export const ROADMAP_STAGES: StageId[]; // ["pinyin","hsk1","hsk2","hsk3","hsk4","hsk5"]
  export function roadmapStageIndex(id: StageId): number; // pinyin=0 … hsk5=5
  export function suggestedStartStage(
    onboarding: { placement?: { suggestedStage: StageId } } | null,
  ): StageId | null; // chỉ khi CÓ placement; skip-only → null
  export function gateStatus(levelId: string, store: GateStore, pinyinDoneCount: number,
    suggestedStage?: StageId | null): GateStatus; // tham số mới optional
  ```

- [ ] **Step 1: Viết test thất bại**

```ts
// app-next/src/lib/__tests__/roadmap-placement.test.ts
import { describe, it, expect } from "vitest";
import { roadmapStageIndex, suggestedStartStage, gateStatus } from "../roadmap-progress";
import type { ProgressStoreApi } from "../store/progress-store";

const fakeGateStore = {
  getRoadmapDone: () => [],
  getStationProgress: () => ({}),
  getRoadmapGate: () => null,
} as unknown as ProgressStoreApi;

describe("roadmapStageIndex", () => {
  it("pinyin=0, hsk5=5", () => {
    expect(roadmapStageIndex("pinyin")).toBe(0);
    expect(roadmapStageIndex("hsk5")).toBe(5);
  });
});

describe("suggestedStartStage", () => {
  it("có placement → suggestedStage", () => {
    expect(suggestedStartStage({ placement: { suggestedStage: "hsk3" } })).toBe("hsk3");
  });
  it("skip-only / null → null", () => {
    expect(suggestedStartStage(null)).toBeNull();
    expect(suggestedStartStage({})).toBeNull();
  });
});

describe("gateStatus với suggestedStage", () => {
  it("suggestedStage ≥ hsk1 → exempt hsk-1", () => {
    expect(gateStatus("hsk-1", fakeGateStore, 0, "hsk2")).toBe("exempt");
  });
  it("suggestedStage = pinyin → giữ hành vi cũ", () => {
    expect(gateStatus("hsk-1", fakeGateStore, 0, "pinyin")).toBe("locked");
  });
  it("không truyền → giữ hành vi cũ", () => {
    expect(gateStatus("hsk-1", fakeGateStore, 0)).toBe("locked");
    expect(gateStatus("hsk-2", fakeGateStore, 0, "hsk5")).toBe("open");
  });
});
```

- [ ] **Step 2: Chạy test thất bại**

Run: `pnpm vitest run src/lib/__tests__/roadmap-placement.test.ts`
Expected: FAIL — hàm chưa tồn tại

- [ ] **Step 3: Implement roadmap-progress.ts**

```ts
import type { StageId } from "@/lib/store/progress-store";

export const ROADMAP_STAGES: StageId[] = ["pinyin", "hsk1", "hsk2", "hsk3", "hsk4", "hsk5"];

export function roadmapStageIndex(id: StageId): number {
  return ROADMAP_STAGES.indexOf(id);
}

/** Stage bắt đầu gợi ý — chỉ khi user CÓ kết quả placement (skip-only không tính). */
export function suggestedStartStage(
  onboarding: { placement?: { suggestedStage: StageId } } | null,
): StageId | null {
  return onboarding?.placement?.suggestedStage ?? null;
}
```

Sửa `gateStatus` (thêm tham số cuối optional, trước các check hiện có):

```ts
export function gateStatus(
  levelId: string, store: GateStore, pinyinDoneCount: number,
  suggestedStage?: StageId | null,
): GateStatus {
  if (levelId !== "hsk-1") return "open";
  if (suggestedStage != null && roadmapStageIndex(suggestedStage) >= roadmapStageIndex("hsk1")) return "exempt";
  if (pinyinDoneCount >= PINYIN_SESSIONS) return "exempt";
  const gate = store.getRoadmapGate(GATE_STORE_ID);
  if (gate != null && gate.pct >= PASS_PCT) return "open";
  return "locked";
}
```

- [ ] **Step 4: Sửa roadmap-client.tsx**

1. Grep `gateStatus(` trong `roadmap-client.tsx` — truyền thêm tham số thứ 4 = `suggested` (biến tính từ `suggestedStartStage(progressStore.getOnboarding())` — thêm 1 dòng ngay sau các biến `pinyinPct/pinyinDone` hiện có; import `suggestedStartStage, roadmapStageIndex` từ `@/lib/roadmap-progress`).
2. Cờ `journey-start`: hiện điều kiện `mounted && overall === 0` nằm trong nhãn banner pinyin. Đổi thành:
   ```tsx
   const flagLevel: StageId | null = suggested ?? (overall === 0 ? "pinyin" : null);
   ```
   Trong banner pinyin thay `mounted && overall === 0` → `mounted && flagLevel === "pinyin"`. Trong nhánh banner level có trạm (else-branch), thêm cạnh `currentLabel`:
   ```tsx
   {mounted && flagLevel === level.id && (
     <span data-testid="journey-start" className="text-[11px] font-extrabold text-learning-streak">
       🚩 Bắt đầu ở đây
     </span>
   )}
   ```
3. Badge bỏ qua — trong cùng nhánh banner level, trước dòng gate:
   ```tsx
   {mounted && suggested != null && roadmapStageIndex(level.id) < roadmapStageIndex(suggested) && (
     <span data-testid="skippable-badge" className="text-[11px] font-bold text-text-secondary">
       Bỏ qua được (theo test)
     </span>
   )}
   ```

- [ ] **Step 5: Sửa test roadmap-client hiện có**

`roadmap-client.test.tsx` dòng ~115 test "Task 9" đang assert flag ở pinyin khi overall=0 — giữ nguyên (vẫn đúng vì không có onboarding state). Thêm 2 test:
- set `bye.onboarding.v1` = `{goal:"hsk5",minutes:15,placement:{suggestedStage:"hsk2",blocks:{hsk1:{correct:3,total:3}},seed:1,at:Date.now()},at:Date.now()}` trước render → cờ `journey-start` nằm trong banner hsk-2 (không ở pinyin), badge `skippable-badge` hiện ở banner pinyin + hsk-1.
- gate hsk-1 hiển thị "Đã miễn" khi có suggestedStage hsk2 (assert text của `entry-gate-status`).
> Executor: copy setup localStorage từ test Task 9 kề bên (helper mock progressStore nếu file dùng mock — bám theo pattern có sẵn).

- [ ] **Step 6: Chạy test**

Run: `pnpm vitest run src/lib/__tests__/roadmap-placement.test.ts src/app/\(app\)/roadmap/__tests__/roadmap-client.test.tsx`
Expected: PASS (cả test cũ)

- [ ] **Step 7: Commit**

```bash
git add src/lib/roadmap-progress.ts "src/app/(app)/roadmap/roadmap-client.tsx" src/lib/__tests__/roadmap-placement.test.ts "src/app/(app)/roadmap/__tests__/roadmap-client.test.tsx"
git commit -m "feat(onboarding): journey — cờ theo placement + badge bỏ qua + exempt gate"
```

---

### Task 7: E2E onboarding (Playwright)

**Files:**
- Create: `app-next/e2e/onboarding-placement.spec.ts`

**Interfaces:**
- Consumes: test ids Task 3–6. `pnpm test:e2e` tự start dev :3100.
- Produces: spec e2e duy nhất chạy trọn luồng.

- [ ] **Step 1: Viết spec**

```ts
// app-next/e2e/onboarding-placement.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Onboarding + placement", () => {
  test("guest: goal → test ladder pass hết → journey cờ ở hsk5 + badge bỏ qua", async ({ page }) => {
    await page.goto("/");
    const hero = page.getByTestId("onboarding-hero");
    await expect(hero).toBeVisible();

    // Bước 1
    await page.getByTestId("onboarding-goal-hsk5").click();
    await page.getByTestId("onboarding-minutes-15").click();
    await page.getByTestId("onboarding-next").click();

    // Bước 2 → làm test
    await page.getByTestId("onboarding-take-test").click();

    // Trả lời đúng hết → suggested hsk5
    for (let i = 0; i < 15; i++) {
      await page.locator('[data-testid="placement-option"][data-correct="true"]').first().click();
    }
    await expect(page.getByTestId("onboarding-result")).toBeVisible();
    await expect(page.getByTestId("onboarding-result")).toContainText("HSK 5");

    // Vào Journey
    await page.getByTestId("onboarding-start-journey").click();
    await expect(page).toHaveURL(/\/roadmap/);

    // Cờ ở banner hsk-5; badge bỏ qua ở pinyin + hsk-1..4; không flag ở pinyin
    const banners = page.locator("main");
    await expect(banners.getByTestId("skippable-badge").first()).toBeVisible();
  });

  test("skip-only: goal → bỏ qua test → cờ vẫn ở pinyin", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("onboarding-hero").waitFor();
    await page.getByTestId("onboarding-goal-hsk2").click();
    await page.getByTestId("onboarding-minutes-10").click();
    await page.getByTestId("onboarding-next").click();
    await page.getByTestId("onboarding-skip-test").click();
    await page.goto("/roadmap");
    await expect(page.getByTestId("journey-start")).toBeVisible(); // pinyin banner
  });

  test("ladder fail hsk1 → suggested pinyin, không badge", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("onboarding-goal-hsk5").click();
    await page.getByTestId("onboarding-minutes-15").click();
    await page.getByTestId("onboarding-next").click();
    await page.getByTestId("onboarding-take-test").click();
    // 2 câu đầu đúng, câu 3 sai → block hsk1 fail
    for (let i = 0; i < 3; i++) {
      const correct = i < 2;
      await page.locator(`[data-testid="placement-option"][data-correct="${correct ? "true" : "false"}"]`).first().click();
    }
    await expect(page.getByTestId("onboarding-result")).toContainText("Pinyin");
    await page.getByTestId("onboarding-start-journey").click();
    await expect(page).toHaveURL(/\/roadmap/);
    await expect(page.getByTestId("skippable-badge")).toHaveCount(0);
  });
});
```

> Executor: locator trực tiếp `[data-testid="placement-option"][data-correct="…"]` (attr nằm trên chính element). Landing page render `<LandingIntro/>` — assert `data-testid="landing-intro"` visible ở test 1 nếu muốn.

- [ ] **Step 2: Chạy**

Run: `pnpm test:e2e -- onboarding-placement`
Expected: 3/3 PASS. Dev server :3100 tự start (script đã có). Nếu port bận, script tự kill.

- [ ] **Step 3: Commit**

```bash
git add e2e/onboarding-placement.spec.ts
git commit -m "test(e2e): onboarding + placement luồng guest trọn vẹn"
```

---

### Task 8: Full verification

- [ ] **Step 1:** `pnpm vitest run` — PASS toàn bộ (baseline 1678+ test, 0 fail mới)
- [ ] **Step 2:** `pnpm typecheck && pnpm lint` — 0 error mới
- [ ] **Step 3:** `pnpm test:e2e` — PASS toàn bộ suite hiện có + spec mới
- [ ] **Step 4:** Báo cáo tổng: số test pass/fail, commit list, deviating notes.
