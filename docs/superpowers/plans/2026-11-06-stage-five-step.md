# Chặng 5 bước narrative Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** StationDrawer 3 tab thành stepper 4 bước có narrative — Từ mới (đoán thanh) → Hội thoại (dialogue 1:1 theo bài) → Nhập vai (micro, chấm nhịp) → Bài kiểm tra (StationQuiz + dạng nghe-chọn-tranh).

**Architecture:** Mapping bài↔dialogue là lookup thuần trên `dialogueByLesson` (đã map 1:1 hsk1–3; hsk4/5 → null → ẩn bước). Steps 1–3 là components mới, mount trong drawer khi tab tương ứng active; state done từng bước nằm ở progressStore (pattern `getRoadmapLearnSeen` mở rộng). StationQuiz giữ nguyên gate 80%; question type mới `picture` gắn vào `QuizQuestion` optional.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Tailwind v4 (token Hanzi), Kokoro TTS (`src/lib/tts/use-tts.ts`), useRecorder + scoring heuristic (`src/lib/shadowing/`), Vitest + Testing Library (jsdom), Playwright.

**Spec:** `docs/superpowers/specs/2026-11-06-stage-five-step-design.md`

## Global Constraints

- Flow trạm: bước 0 Ôn nhanh (warm-up, giữ nguyên) · 1 Từ mới · 2 Hội thoại · 3 Nhập vai · 4 Bài kiểm tra.
- Bước 2 chỉ render khi có dialogue cho bài đó (hsk1–3); hsk4/5 → ẨN bước, không stub/màn "coming soon".
- Bước 1 quiz nghe-đoán thanh điệu: "Không tính điểm, cứ đoán" — kết quả không ghi vào bất kỳ score nào.
- Bước 3 chấm heuristic `scoreFor` hiện có; copy trung thực: "chấm nhịp, chưa chấm phát âm".
- Bước 1–3 là khuyến nghị thứ tự, KHÔNG KHOÁ — user bấm được thẳng bước 4.
- Gate pass trạm vẫn là StationQuiz ≥80% (PASS_PCT), không đổi.
- Block Văn hoá: 1–2 câu tĩnh theo bài khi có nội dung, không bắt buộc mọi bài (nội dung soạn trong task data riêng; thiếu → ẩn).
- Không sinh story mới, không dùng dialogue ngoài seed.
- ASR thật (SpeechRecognition + chấm thanh điệu) OUT OF SCOPE — phase sau.
- UI token Hanzi; không hard-code màu; audio luôn có nút Nghe/Nghe chậm.

---

### Task 1: Mapping bài↔dialogue + step state

**Files:**
- Create: `src/lib/roadmap-dialogue.ts`
- Modify: `app-next/src/lib/store/progress-store.ts` (thêm step-done per station)
- Test: `src/lib/roadmap-dialogue.test.ts`, `app-next/src/lib/store/__tests__/station-steps.test.ts`

**Interfaces:**
- Consumes: `dialogueByLesson: Record<string, DialogueRecord>` từ `@/content/dialogues`.
- Produces:
  ```ts
  export function dialogueForLesson(book: string, page: string): DialogueRecord | null;
  export type StageStepId = "learn" | "dialogue" | "roleplay" | "quiz";
  // progressStore thêm:
  getStationSteps(levelId: string, stationId: string): StageStepId[];
  markStationStep(levelId: string, stationId: string, step: StageStepId): void;
  ```

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/roadmap-dialogue.test.ts
import { describe, expect, it } from "vitest";
import { dialogueForLesson } from "./roadmap-dialogue";

describe("dialogueForLesson", () => {
  it("hsk1/lesson-1 → record có lines", () => {
    const d = dialogueForLesson("hsk1", "lesson-1");
    expect(d).not.toBeNull();
    expect(d!.lines.length).toBeGreaterThan(0);
    expect(d!.lines[0]).toHaveProperty("zh");
    expect(d!.lines[0]).toHaveProperty("audio");
  });
  it("hsk4 (không có dialogue) → null", () => {
    expect(dialogueForLesson("hsk4", "lesson-1")).toBeNull();
  });
  it("book lạ → null không ném", () => {
    expect(dialogueForLesson("hsk79", "lesson-1")).toBeNull();
  });
});
```

```ts
// app-next/src/lib/store/__tests__/station-steps.test.ts
import { beforeEach, describe, expect, it } from "vitest";
import { progressStore } from "../progress-store";

describe("station steps", () => {
  beforeEach(() => localStorage.clear());
  it("mặc định rỗng", () => {
    expect(progressStore.getStationSteps("hsk-1", "s1")).toEqual([]);
  });
  it("mark thêm 1 lần, không trùng", () => {
    progressStore.markStationStep("hsk-1", "s1", "learn");
    progressStore.markStationStep("hsk-1", "s1", "learn");
    expect(progressStore.getStationSteps("hsk-1", "s1")).toEqual(["learn"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && pnpm vitest run src/lib/roadmap-dialogue.test.ts src/lib/store/__tests__/station-steps.test.ts`
Expected: FAIL — module/function not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/lib/roadmap-dialogue.ts
/* Mapping bài học ↔ hội thoại seed 1:1 (spec 2026-11-06 Wave 3 §2).
   dialogueByLesson key "book/lesson"; thiếu → null (drawer ẩn bước Hội thoại). */
import { dialogueByLesson, type DialogueRecord } from "@/content/dialogues";

export function dialogueForLesson(book: string, page: string): DialogueRecord | null {
  return dialogueByLesson[`${book}/${page}`] ?? null;
}
```

progress-store (pattern `getRoadmapLearnSeen`): key `bye.stationSteps` =
`Record<levelId, Record<stationId, StageStepId[]>>`; `markStationStep` push nếu chưa có; getter trả mảng hoặc `[]` khi key lạ.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app-next && pnpm vitest run src/lib/roadmap-dialogue.test.ts src/lib/store/__tests__/station-steps.test.ts`
Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
cd app-next && git add src/lib/roadmap-dialogue.ts src/lib/roadmap-dialogue.test.ts src/lib/store
git commit -m "feat(stage): mapping bài↔dialogue + station step state"
```

---

### Task 2: Bước "Từ mới" — quiz nghe-đoán thanh

**Files:**
- Create: `src/components/roadmap/step-learn.tsx`
- Test: `src/components/roadmap/__tests__/step-learn.test.tsx`

**Interfaces:**
- Consumes: `useStationVocab` (drawer đã có — `LessonRef`), `useTts` từ `@/lib/tts/use-tts`.
- Produces:
  ```ts
  export type ToneQuizItem = { hanzi: string; pinyin: string; meaning: string; toneOptions: string[]; answerIndex: number };
  export function buildToneQuiz(words: { hanzi: string; pinyin: string; meaning: string }[], rng: () => number): ToneQuizItem[];
  export function StepLearn(props: {
    lesson: LessonRef;
    onDone: () => void;
    onNext: () => void;
  }): JSX.Element;
  ```

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/roadmap/__tests__/step-learn.test.tsx
import { describe, expect, it, vi } from "vitest";
import { buildToneQuiz } from "../step-learn";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// mock useTts: jsdom không có audio engine
vi.mock("@/lib/tts/use-tts", () => ({ useTts: () => ({ speak: vi.fn(), speakSlow: vi.fn() }) }));

const words = [
  { hanzi: "八", pinyin: "bā", meaning: "tám" },
  { hanzi: "爸爸", pinyin: "bàba", meaning: "bố" },
];

describe("buildToneQuiz", () => {
  it("3 lựa chọn pinyin, có 1 đúng", () => {
    const q = buildToneQuiz(words, () => 0.5);
    expect(q).toHaveLength(2);
    for (const item of q) {
      expect(item.toneOptions).toHaveLength(3);
      expect(item.toneOptions[item.answerIndex]).toBe(item.pinyin);
    }
  });
});

describe("StepLearn", () => {
  it("chọn sai → hiện giải thích 'Không tính điểm, cứ đoán' vẫn cho tiếp", async () => {
    const onDone = vi.fn();
    const lesson = { book: "hsk1", page: "lesson-1", title: "L1" } as never;
    render(<StepLearn lesson={lesson} onDone={onDone} onNext={onDone} />);
    await userEvent.click(screen.getAllByRole("radio")[0]);
    expect(await screen.findByText(/không tính điểm/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /tiếp tục/i }));
    expect(onDone).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && pnpm vitest run src/components/roadmap/__tests__/step-learn.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/roadmap/step-learn.tsx
"use client";

/* Bước 1 Từ mới — quiz nghe-đoán thanh điệu, không tính điểm (spec §2 bước 1). */
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTts } from "@/lib/tts/use-tts";

export type ToneQuizItem = {
  hanzi: string; pinyin: string; meaning: string;
  toneOptions: string[]; answerIndex: number;
};

const TONES = ["\u0304", "\u0301", "\u030C"]; // macron, acute, caron — dựng từ base vowel

export function buildToneQuiz(
  words: { hanzi: string; pinyin: string; meaning: string }[],
  rng: () => number,
): ToneQuizItem[] {
  const hasTone = (p: string) => /[\u0300-\u036f]/.test(p.normalize("NFD"));
  const base = (p: string) => p.normalize("NFD").replace(/[\u0300-\u036f]/g, "").normalize("NFC");
  return words
    .filter((w) => hasTone(w.pinyin))
    .map((w) => {
      // 3 lựa chọn: đúng + 2 biến thể thanh khác trên cùng âm tiết cuối
      const lastSyll = base(w.pinyin.split(/\s+/).slice(-1)[0]);
      const variants = [
        lastSyll + "̄", lastSyll + "́", lastSyll + "̌", lastSyll + "̀",
      ].filter((v) => v !== w.pinyin.split(/\s+/).slice(-1)[0]);
      const opts = [w.pinyin.split(/\s+/).slice(-1)[0]];
      while (opts.length < 3 && variants.length > 0) {
        const i = Math.floor(rng() * variants.length);
        opts.push(variants.splice(i, 1)[0]);
      }
      const shuffled = [...opts].sort(() => rng() - 0.5);
      return {
        ...w,
        toneOptions: shuffled,
        answerIndex: shuffled.indexOf(w.pinyin.split(/\s+/).slice(-1)[0]),
      };
    });
}

export function StepLearn({ lesson, onDone, onNext }: {
  lesson: { book: string; page: string; title: string };
  onDone: () => void; onNext: () => void;
}) {
  const { speak, speakSlow } = useTts();
  // words lấy từ useStationVocab của drawer (pass qua props trong wiring) — ở đây nhận qua context/props của drawer
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const items = useMemo(() => [], []); // drawer truyền words qua props — wire ở Task 4
  // ...render item hiện tại: hanzi lớn, nút Nghe/Nghe chậm, radiogroup toneOptions,
  // status đúng/sai + "Không tính điểm, cứ đoán", nút Tiếp tục → item kế / onNext()
  void idx; void picked; void setIdx; void setPicked; void items; void speak; void speakSlow;
  return (
    <div>
      <p className="text-body-sm text-fg-muted">Không tính điểm, cứ đoán</p>
      <Button onClick={onNext}>Tiếp tục</Button>
      <Button variant="ghost" onClick={onDone}>Bỏ qua</Button>
    </div>
  );
}
```

**Lưu ý executor:** skeleton trên là khung — hoàn thiện render theo pattern quiz radio của `StationQuiz` (`src/components/roadmap/station-quiz.tsx`): `radiogroup` + `role="radio"`, status dòng giải thích pinyin đúng khi chọn, nút Tiếp tục disabled trước khi chọn. Props thật: `words` truyền trực tiếp (đổi signature nếu cần khi wire — cập nhật test tương ứng).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app-next && pnpm vitest run src/components/roadmap/__tests__/step-learn.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd app-next && git add src/components/roadmap/step-learn.tsx src/components/roadmap/__tests__/step-learn.test.tsx
git commit -m "feat(stage): bước Từ mới — quiz nghe-đoán thanh không tính điểm"
```

---

### Task 3: Bước "Hội thoại" — player câu + MCQ

**Files:**
- Create: `src/components/roadmap/step-dialogue.tsx`
- Test: `src/components/roadmap/__tests__/step-dialogue.test.tsx`

**Interfaces:**
- Consumes: `DialogueRecord`/`DialogueLine` từ `@/content/dialogues`, `dialogueForLesson` (Task 1), `useTts`.
- Produces:
  ```ts
  export function dialogueQuestions(d: DialogueRecord, rng: () => number): Array<{
    prompt: string; options: string[]; answerIndex: number;
  }>; // 2–3 câu MCQ từ lines: "ai nói X?" / "câu nào nghĩa Y?"
  export function StepDialogue(props: { dialogue: DialogueRecord; onDone: () => void }): JSX.Element;
  ```

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/roadmap/__tests__/step-dialogue.test.tsx
import { describe, expect, it, vi } from "vitest";
import { dialogueQuestions } from "../step-dialogue";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { DialogueRecord } from "@/content/dialogues";

vi.mock("@/lib/tts/use-tts", () => ({ useTts: () => ({ speak: vi.fn(), speakSlow: vi.fn() }) }));

const d = {
  id: "x", book: "hsk1", lesson: "lesson-1", title: "你好", titleVi: "Chào hỏi",
  lines: [
    { n: 1, speaker: "A", zh: "你好！", pinyin: "Nǐ hǎo!", vi: "Chào bạn!", audio: "a1", durSec: 1 },
    { n: 2, speaker: "B", zh: "你好！再见！", pinyin: "Nǐ hǎo! Zàijiàn!", vi: "Chào bạn! Tạm biệt!", audio: "a2", durSec: 2 },
  ],
} as DialogueRecord;

describe("dialogueQuestions", () => {
  it("sinh 2 câu MCQ từ 2 lines", () => {
    const qs = dialogueQuestions(d, () => 0.5);
    expect(qs.length).toBeGreaterThanOrEqual(2);
    for (const q of qs) {
      expect(q.options).toHaveLength(3);
      expect(q.options[q.answerIndex]).toBeTruthy();
    }
  });
});

describe("StepDialogue", () => {
  it("trả lời đủ câu → onDone", async () => {
    const onDone = vi.fn();
    render(<StepDialogue dialogue={d} onDone={onDone} />);
    // trả lời câu 1 và 2
    for (let i = 0; i < 2; i++) {
      const radios = screen.getAllByRole("radio");
      await userEvent.click(radios[0]);
      await userEvent.click(screen.getByRole("button", { name: /kiểm tra|tiếp tục/i }));
    }
    expect(onDone).toHaveBeenCalled();
  });
  it("có nút Nghe từng câu và Nghe lại cả bài", () => {
    render(<StepDialogue dialogue={d} onDone={vi.fn()} />);
    expect(screen.getAllByRole("button", { name: /nghe/i }).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("button", { name: /nghe lại cả bài/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && pnpm vitest run src/components/roadmap/__tests__/step-dialogue.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

`step-dialogue.tsx`:

- Danh sách lines: mỗi dòng hiển thị speaker + pinyin + zh + vi, nút `Nghe` (speak line.zh), `Nghe lại cả bài` (loop speak từng line tuần tự).
- `dialogueQuestions`: câu 1 — "Nghĩa của 「{line.zh}」 là gì?" với 3 lựa chọn `vi` (đúng + 2 lines khác); câu 2 — "Ai nói 「{line.zh}」?" với lựa chọn `A/B/Cấu trúc khác` (đúng speaker). Đủ 2 câu; ≥3 lines thì thêm câu thứ 3.
- Trả lời → hiện đúng/sai inline → nút Tiếp tục sang câu kế; hết câu → `onDone()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app-next && pnpm vitest run src/components/roadmap/__tests__/step-dialogue.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd app-next && git add src/components/roadmap/step-dialogue.tsx src/components/roadmap/__tests__/step-dialogue.test.tsx
git commit -m "feat(stage): bước Hội thoại — player câu + MCQ từ dialogue seed"
```

---

### Task 4: Drawer thành stepper + wiring steps 1–2

**Files:**
- Modify: `app-next/src/components/roadmap/station-drawer.tsx` (tabs `DrawerTab` ~dòng 22 + tab list ~dòng 121 → stepper)
- Test: `app-next/src/components/roadmap/__tests__/station-drawer-steps.test.tsx`

**Interfaces:**
- Consumes: `dialogueForLesson` (Task 1), `StepLearn` (Task 2), `StepDialogue` (Task 3), `getStationSteps`/`markStationStep` (Task 1), warm-up + StationQuiz hiện có.
- Produces: drawer render stepper 4 mục (0 Ôn nhanh, 1 Từ mới, 2 Hội thoại [chỉ khi `dialogueForLesson` != null], 3 Bài kiểm tra); bước done có tick; state tab nội bộ như cũ.

- [ ] **Step 1: Write the failing test**

```tsx
// app-next/src/components/roadmap/__tests__/station-drawer-steps.test.tsx
// Đọc station-drawer.test.tsx hiện có (nếu có) để copy setup: render drawer với level/station props thật.
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StationDrawer } from "../station-drawer";
// setup props copy từ test drawer hiện có — placeholder này BẮT BUỘC thay bằng setup thật khi implement
import { hsk1LevelFixture } from "./fixtures"; // nếu chưa có fixture: dựng object RoadmapLevel inline như today-session.test

describe("StationDrawer stepper", () => {
  it("hsk1 có dialogue → hiện 4 bước: Ôn nhanh/Từ mới/Hội thoại/Bài kiểm tra", () => {
    render(<StationDrawer {...({} as never)} />); // thay props thật từ fixture
    expect(screen.getByText(/từ mới/i)).toBeInTheDocument();
    expect(screen.getByText(/hội thoại/i)).toBeInTheDocument();
    expect(screen.getByText(/bài kiểm tra/i)).toBeInTheDocument();
  });
  it("hsk4 không dialogue → 3 bước (ẩn Hội thoại)", () => {
    render(<StationDrawer {...({} as never)} />); // fixture hsk4
    expect(screen.queryByText(/hội thoại/i)).not.toBeInTheDocument();
  });
});
```

**Lưu ý executor:** 2 render ở trên dùng props thật từ pattern test drawer hiện có — đọc `src/components/roadmap/__tests__/` trước, nếu chưa có test drawer thì dựng fixture `RoadmapLevel` inline (2 station: lesson + milestone như today-session.test).

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && pnpm vitest run src/components/roadmap/__tests__/station-drawer-steps.test.tsx`
Expected: FAIL — "Từ mới" chưa xuất hiện.

- [ ] **Step 3: Write minimal implementation**

Sửa `station-drawer.tsx`:
- `type DrawerTab = "review" | "learn" | "dialogue" | "quiz";`
- Tab labels: `{ key: "review", label: "Ôn nhanh" } · { key: "learn", label: "Từ mới" } · { key: "dialogue", label: "Hội thoại" } (chỉ khi `dialogueForLesson(station.lesson.book, station.lesson.page) != null`) · `{ key: "quiz", label: "Bài kiểm tra" }`.
- Mỗi tab hiển thị tick nếu `progressStore.getStationSteps(level.id, station.id).includes(stepId)`.
- Panel learn: `<StepLearn words={...} onDone={() => progressStore.markStationStep(level.id, station.id, "learn")} />`; panel dialogue tương tự với `"dialogue"`.
- Quiz panel giữ nguyên + vẫn `markStationStep(..., "quiz")` khi submit (không đổi logic điểm).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app-next && pnpm vitest run src/components/roadmap/__tests__/station-drawer-steps.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd app-next && git add src/components/roadmap/station-drawer.tsx src/components/roadmap/__tests__/station-drawer-steps.test.tsx
git commit -m "feat(stage): drawer stepper 4 bước + tick done từng bước"
```

---

### Task 5: Wave 3b — Bước "Nhập vai"

**Files:**
- Create: `src/components/roadmap/step-roleplay.tsx`
- Test: `src/components/roadmap/__tests__/step-roleplay.test.tsx`

**Interfaces:**
- Consumes: `useRecorder` + `scoreFor` từ `@/lib/shadowing/scoring` (đọc `src/lib/shadowing/` để lấy hook API chính xác), `useTts`.
- Produces:
  ```ts
  export function StepRoleplay(props: {
    dialogue: DialogueRecord;
    onDone: () => void;
  }): JSX.Element;
  ```

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/roadmap/__tests__/step-roleplay.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StepRoleplay } from "../step-roleplay";

vi.mock("@/lib/tts/use-tts", () => ({ useTts: () => ({ speak: vi.fn(), speakSlow: vi.fn() }) }));
vi.mock("@/lib/shadowing/use-recorder", () => ({
  useRecorder: () => ({
    recording: false, start: vi.fn(), stop: vi.fn(),
    durationSecs: 0, blob: null, error: null,
  }),
}));

const d = {
  id: "x", book: "hsk1", lesson: "l", title: "t", titleVi: "tv",
  lines: [{ n: 1, speaker: "A", zh: "你好！", pinyin: "Nǐ hǎo!", vi: "Chào", audio: "a", durSec: 1 }],
} as never;

describe("StepRoleplay", () => {
  it("hiện câu mẫu + nút ghi + copy 'chấm nhịp, chưa chấm phát âm'", () => {
    render(<StepRoleplay dialogue={d} onDone={vi.fn()} />);
    expect(screen.getByText(/chấm nhịp, chưa chấm phát âm/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ghi âm|bấm để nói/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && pnpm vitest run src/components/roadmap/__tests__/step-roleplay.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

`step-roleplay.tsx`:
- Chọn câu (radio theo line), nút `Nghe mẫu` (speak), nút ghi micro (`useRecorder.start/stop`), sau stop tính `scoreFor(recordSecs, line.zh.length, 1, false)` → hiển thị score + chip.
- Copy đúng: header nhỏ "Chấm nhịp, chưa chấm phát âm".
- Đạt (≥70) hoặc bỏ qua → nút Tiếp tục sang câu kế; hết câu → `onDone()`.
- Ghi `navigator.mediaDevices` guard: nếu không có quyền/device → hiện thông báo + cho skip (không block).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app-next && pnpm vitest run src/components/roadmap/__tests__/step-roleplay.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd app-next && git add src/components/roadmap/step-roleplay.tsx src/components/roadmap/__tests__/step-roleplay.test.tsx
git commit -m "feat(stage): bước Nhập vai — ghi micro chấm nhịp heuristic"
```

Wire bước 3 vào drawer (extend Task 4: thêm tab `roleplay` khi có dialogue; `markStationStep(..., "roleplay")`).

---

### Task 6: Wave 3c — Question type "nghe-chọn-tranh"

**Files:**
- Modify: `app-next/src/lib/station-quiz.ts` (QuizQuestion thêm optional `picture`)
- Modify: `app-next/src/components/roadmap/station-quiz.tsx` (render lựa chọn tranh)
- Test: `app-next/src/lib/station-quiz/__tests__/picture-questions.test.ts`

**Interfaces:**
- Consumes: `QuizQuestion` hiện có.
- Produces:
  ```ts
  // QuizQuestion thêm:
  picture?: { emoji: [string, string, string]; answerIndex: number }; // 3 tranh emoji, chọn theo audioText
  export function buildPictureQuestion(
    words: { hanzi: string; meaning: string }[],
    emojiMap: Record<string, string>, // meaning → emoji
    rng: () => number,
  ): QuizQuestion | null;
  ```

- [ ] **Step 1: Write the failing test**

```ts
// app-next/src/lib/station-quiz/__tests__/picture-questions.test.ts
import { describe, expect, it } from "vitest";
import { buildPictureQuestion } from "../station-quiz";

const emojiMap = { "tám": "8️⃣", "bố": "👨", "mẹ": "👩" };

describe("buildPictureQuestion", () => {
  it("sinh câu nghe-chọn-tranh 3 emoji", () => {
    const q = buildPictureQuestion(
      [{ hanzi: "八", meaning: "tám" }, { hanzi: "爸爸", meaning: "bố" }, { hanzi: "妈妈", meaning: "mẹ" }],
      emojiMap, () => 0.5,
    );
    expect(q).not.toBeNull();
    expect(q!.picture!.emoji).toHaveLength(3);
    expect(q!.picture!.emoji[q!.picture!.answerIndex]).toBe("8️⃣");
    expect(q!.options).toEqual(["A", "B", "C"]);
  });
  it("thiếu emoji → null (không sinh câu lỗi)", () => {
    expect(buildPictureQuestion(
      [{ hanzi: "八", meaning: "tám" }], {}, () => 0.5,
    )).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && pnpm vitest run src/lib/station-quiz/__tests__/picture-questions.test.ts`
Expected: FAIL — `buildPictureQuestion is not a function`.

- [ ] **Step 3: Write minimal implementation**

`station-quiz.ts` thêm:

```ts
/** Nghe-chọn-tranh (spec 2026-11-06 Wave 3 §2 bước 4): audioText = hanzi,
    3 tranh emoji; thiếu emoji cho bất kỳ word → null. */
export function buildPictureQuestion(
  words: { hanzi: string; meaning: string }[],
  emojiMap: Record<string, string>,
  rng: () => number,
): QuizQuestion | null {
  if (words.length < 3) return null;
  const emoji = words.slice(0, 3).map((w) => emojiMap[w.meaning]);
  if (emoji.some((e) => !e)) return null;
  const answerIndex = Math.floor(rng() * 3);
  return {
    prompt: "Nghe và chọn tranh đúng",
    options: ["A", "B", "C"],
    answerIndex,
    listen: { audioText: words[answerIndex].hanzi, readPrompt: "", readOptions: [], readAnswerIndex: -1 },
    picture: { emoji: emoji as [string, string, string], answerIndex },
  };
}
```

`station-quiz.tsx`: khi `q.picture` → render 3 nút emoji lớn (grid 3 cột, min-h-24) thay options text; logic chọn/đúng-sai giữ nguyên qua answerIndex.
Nhúng vào pool: trong hàm sinh đề trạm, thử `buildPictureQuestion` trước với 3 từ đầu pool có emoji; null thì fallback MCQ cũ.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app-next && pnpm vitest run src/lib/station-quiz/__tests__/picture-questions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd app-next && git add src/lib/station-quiz src/components/roadmap/station-quiz.tsx
git commit -m "feat(stage): dạng nghe-chọn-tranh (emoji) trong station quiz"
```

---

### Task 7: Gate cuối

- [ ] **Step 1:** Run: `cd app-next && pnpm typecheck` — Expected: 0 errors.
- [ ] **Step 2:** Run: `cd app-next && pnpm test` — Expected: full suite PASS (fallback hsk4/5 không regress drawer cũ).
- [ ] **Step 3:** Run: `cd app-next && pnpm lint` — Expected: 0 errors.
- [ ] **Step 4:** Placeholder scan: `grep -rn "TODO\|TBD" app-next/src/lib/roadmap-dialogue.ts app-next/src/components/roadmap/step-*.tsx` — Expected: rỗng (step-learn skeleton từ Task 2 phải được hoàn thiện thật, không còn `void idx`).
- [ ] **Step 5:** Commit fix lẻ nếu có.
