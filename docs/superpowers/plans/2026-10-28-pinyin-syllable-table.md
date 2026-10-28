# Bảng Pinyin 405 âm tiết — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trang `/pinyin/bang-am` SSG render bảng 405 âm tiết (initial × final), click ô → dialog chi tiết với 5 nút nghe + ví dụ; cross-link với Pinyin Lab; celebrate quiz.

**Architecture:** Route mới trong `(wide)`; data thuần tĩnh từ `src/content/pinyin.ts` (không API). Util pure `applyTone` tạo dấu thanh; component client `SyllableTable` quản dialog + deep-link `?sy=`. TTS tái dùng `useTts`.

**Tech Stack:** Next.js 16 App Router, TypeScript strict, Tailwind v4 (tokens Hanzi), Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-10-28-pinyin-syllable-table-design.md`

## Global Constraints

- Chạy mọi lệnh từ `app-next/`; package manager **pnpm** (không npm).
- **Không thêm package mới**; không sửa `src/content/pinyin.ts` (seed source).
- Design system Hanzi: chỉ dùng semantic tokens (`border-border-subtle`, `bg-surface-elevated`, `text-text-secondary`, …) — không hard-code màu primitive; target chạm ≥44px.
- Tests: Vitest jsdom, file `*.test.ts(x)` cạnh source hoặc `__tests__/`; chạy 1 file: `pnpm vitest run <path>`.
- StrictMode-safe: không side-effect trong render; guard mount qua ref.
- Port dev 3100 (đã chạy sẵn khi test browser).

---

### Task 1: Util `applyTone` — tạo dấu thanh pinyin

**Files:**
- Create: `src/lib/pinyin/tone-mark.ts`
- Test: `src/lib/pinyin/__tests__/tone-mark.test.ts`

**Interfaces:**
- Consumes: nothing (pure).
- Produces: `type Tone = 1 | 2 | 3 | 4 | 5`; `applyTone(syllable: string, tone: Tone): string`; `toneForms(base: string): [string, string, string, string, string]` (tone 1→5). Task 3+ dùng `toneForms`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { applyTone, toneForms } from "../tone-mark";
import { pinyinValid } from "@/content/pinyin";

describe("applyTone", () => {
  it("tone 5 trả nguyên văn", () => {
    expect(applyTone("ba", 5)).toBe("ba");
  });
  it("đặt dấu trên nguyên âm chính", () => {
    expect(applyTone("ba", 4)).toBe("bà");
    expect(applyTone("mao", 1)).toBe("māo");
    expect(applyTone("hou", 2)).toBe("hóu");
    expect(applyTone("zhei", 1)).toBe("zhēi");
    expect(applyTone("er", 3)).toBe("ěr");
  });
  it("iu → dấu trên u, ui → dấu trên i", () => {
    expect(applyTone("liu", 2)).toBe("liú");
    expect(applyTone("dui", 4)).toBe("duì");
    expect(applyTone("zhui", 1)).toBe("zhuī");
  });
  it("nguyên âm đơn và y/w", () => {
    expect(applyTone("yi", 1)).toBe("yī");
    expect(applyTone("wu", 4)).toBe("wù");
    expect(applyTone("yu", 1)).toBe("yū");
    expect(applyTone("wo", 3)).toBe("wǒ");
  });
  it("ü: nü/lü → ǖǘǚǜ, üe → dấu trên e", () => {
    expect(applyTone("nü", 3)).toBe("nǚ");
    expect(applyTone("lü", 2)).toBe("lǘ");
    expect(applyTone("yue", 4)).toBe("yuè");
    expect(applyTone("xue", 3)).toBe("xuě");
  });
  it("âm không có nguyên âm → trả nguyên văn, không throw", () => {
    expect(applyTone("xyz", 2)).toBe("xyz");
  });
  it("full-matrix: 405 ô × tone 1..4 luôn sinh âm có dấu hợp lệ", () => {
    const re = /^[a-zü][a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]*$/;
    for (const finals of Object.values(pinyinValid)) {
      for (const base of Object.values(finals)) {
        for (const t of [1, 2, 3, 4] as const) {
          const out = applyTone(base, t);
          expect(out).not.toBe(base);
          expect(out).toMatch(re);
        }
      }
    }
  });
  it("toneForms trả đủ 5 dạng theo thứ tự", () => {
    expect(toneForms("ma")).toEqual(["mā", "má", "mǎ", "mà", "ma"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/pinyin/__tests__/tone-mark.test.ts`
Expected: FAIL — không tìm thấy module `../tone-mark`.

- [ ] **Step 3: Write minimal implementation**

```ts
/* Đặt dấu thanh lên nguyên âm chính của âm tiết pinyin. Pure — dùng cho
   Bảng Pinyin (/pinyin/bang-am); dữ liệu gốc pinyinValid là âm không dấu.
   Quy tắc: iu → u (liú), ui → i (duì); còn lại ưu tiên a > o > e > ü > i > u. */
export type Tone = 1 | 2 | 3 | 4 | 5;

const MARKS: Record<Exclude<Tone, 5>, string> = {
  1: "\u0304", 2: "\u0301", 3: "\u030C", 4: "\u0300",
};

function mainVowelIndex(s: string): number {
  if (/iu$/.test(s)) return s.length - 2;
  if (/ui$/.test(s)) return s.length - 1;
  for (const v of ["a", "o", "e", "ü", "i", "u"]) {
    const i = s.indexOf(v);
    if (i >= 0) return i;
  }
  return -1;
}

export function applyTone(syllable: string, tone: Tone): string {
  if (tone === 5) return syllable;
  const s = syllable.normalize("NFC");
  const i = mainVowelIndex(s);
  if (i < 0) return s;
  return (s.slice(0, i) + s[i] + MARKS[tone] + s.slice(i + 1)).normalize("NFC");
}

export function toneForms(base: string): [string, string, string, string, string] {
  return [1, 2, 3, 4, 5].map((t) => applyTone(base, t)) as [string, string, string, string, string];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/pinyin/__tests__/tone-mark.test.ts`
Expected: PASS (tất cả describe). Nếu full-matrix fail ở ô nào, sửa `mainVowelIndex` theo ô đó — KHÔNG nới test.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pinyin/tone-mark.ts src/lib/pinyin/__tests__/tone-mark.test.ts
git commit -m "feat(pinyin): applyTone/toneForms — util dấu thanh cho bảng âm tiết"
```

---

### Task 2: Data model bảng (cột/hàng/đếm ô)

**Files:**
- Create: `src/lib/pinyin/syllable-table-data.ts`
- Test: `src/lib/pinyin/__tests__/syllable-table-data.test.ts`

**Interfaces:**
- Consumes: `pinyinInitials`, `pinyinFinals`, `pinyinValid` từ `@/content/pinyin`.
- Produces: `interface SyllableCell { initial: string; final: string; base: string; hasExample: boolean }`; `buildSyllableTable(): { initials: string[]; finals: string[]; cells: Map<string, SyllableCell> }` với key ô = `${initial}|${final}`; `SYLLABLE_CELL_COUNT: number` (= 405); `examplesFor(base: string): [string, string, string][]` (tối đa 4 mục, mảng rỗng nếu không có).

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import { buildSyllableTable, examplesFor, SYLLABLE_CELL_COUNT } from "../syllable-table-data";

describe("buildSyllableTable", () => {
  const t = buildSyllableTable();
  it("đúng 405 ô hợp lệ", () => {
    expect(t.cells.size).toBe(405);
    expect(SYLLABLE_CELL_COUNT).toBe(405);
  });
  it("22 hàng initial theo thứ tự pinyinInitials, Ø đầu tiên", () => {
    expect(t.initials.length).toBe(22);
    expect(t.initials[0]).toBe("Ø");
  });
  it("36 cột final theo thứ tự pinyinFinals, không có '-i' (zhi-class không nằm trong pinyinValid)", () => {
    expect(t.finals).not.toContain("-i");
    expect(t.finals).toContain("i");
    expect(t.finals).toContain("ü");
  });
  it("ô ba = initial b final a", () => {
    expect(t.cells.get("b|a")).toEqual({ initial: "b", final: "a", base: "ba", hasExample: true });
  });
  it("ô rỗng không nằm trong map", () => {
    expect(t.cells.has("b|i")).toBe(false);
  });
  it("mọi ô có base đều nằm trong hàng/cột khai báo", () => {
    for (const [key, cell] of t.cells) {
      expect(t.initials).toContain(cell.initial);
      expect(t.finals).toContain(cell.final);
      expect(key).toBe(`${cell.initial}|${cell.final}`);
    }
  });
});
describe("examplesFor", () => {
  it("trả tối đa 4 ví dụ từ pinyinExamples", () => {
    const ex = examplesFor("ba");
    expect(ex.length).toBeGreaterThan(0);
    expect(ex.length).toBeLessThanOrEqual(4);
    expect(ex[0]).toEqual(["八", "bā", "tám"]);
  });
  it("âm không có ví dụ → mảng rỗng", () => {
    expect(examplesFor("zhzzz")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/lib/pinyin/__tests__/syllable-table-data.test.ts`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 3: Write minimal implementation**

```ts
/* Data model cho Bảng Pinyin 405 âm tiết. Tất cả thuần tĩnh từ pinyin.ts
   (seed source — KHÔNG sửa file đó). Cột = final có ít nhất 1 ô, xếp theo
   thứ tự pinyinFinals; "-i" (zhi-class) không có trong pinyinValid nên tự loại. */
import { pinyinExamples, pinyinFinals, pinyinInitials, pinyinValid } from "@/content/pinyin";

export interface SyllableCell {
  initial: string;
  final: string;
  base: string;
  hasExample: boolean;
}

export const SYLLABLE_CELL_COUNT = 405;

export function buildSyllableTable() {
  const cells = new Map<string, SyllableCell>();
  for (const [initial, finals] of Object.entries(pinyinValid)) {
    for (const [final, base] of Object.entries(finals)) {
      cells.set(`${initial}|${final}`, { initial, final, base, hasExample: base in pinyinExamples });
    }
  }
  const present = new Set(Object.values(pinyinValid).flatMap((m) => Object.keys(m)));
  const finals = pinyinFinals.filter((f) => present.has(f));
  return { initials: [...pinyinInitials], finals, cells };
}

export function examplesFor(base: string): [string, string, string][] {
  return (pinyinExamples[base] ?? []).slice(0, 4);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/lib/pinyin/__tests__/syllable-table-data.test.ts`
Expected: PASS. Nếu cells.size ≠ 405 → dữ liệu đã đổi; dừng và báo cáo (không hardcode đếm).

- [ ] **Step 5: Commit**

```bash
git add src/lib/pinyin/syllable-table-data.ts src/lib/pinyin/__tests__/syllable-table-data.test.ts
git commit -m "feat(pinyin): data model bảng 405 âm tiết từ pinyinValid"
```

---

### Task 3: Component `SyllableTable` + dialog chi tiết

**Files:**
- Create: `src/components/pinyin/table/syllable-table.tsx` (client, desktop grid + mobile wrap)
- Create: `src/components/pinyin/table/syllable-dialog.tsx` (client)
- Test: `src/components/pinyin/table/__tests__/syllable-table.test.tsx`

**Interfaces:**
- Consumes: `buildSyllableTable`, `examplesFor`, `SyllableCell` (Task 2); `toneForms` (Task 1); `useTts` (`speak(text, { rate })`); `Dialog` từ `@/components/ui/dialog`; `Icon` từ `@/components/ui/icon` (lucide name).
- Produces: `SyllableTable({ initialSy }: { initialSy?: string | null })` — component client dùng được độc lập; `SyllableDialog({ cell, onClose }: { cell: SyllableCell; onClose: () => void })` export để test riêng.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SyllableTable } from "../syllable-table";
import { SyllableDialog } from "../syllable-dialog";

const speak = vi.fn();
vi.mock("@/lib/tts/use-tts", () => ({
  useTts: () => ({ speak, cancel: vi.fn(), speaking: false }),
}));

describe("SyllableDialog", () => {
  beforeEach(() => speak.mockClear());
  const cell = { initial: "b", final: "a", base: "ba", hasExample: true };
  it("hiện âm gốc, chips, 5 nút thanh theo thứ tự", () => {
    render(<SyllableDialog cell={cell} onClose={() => {}} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(within(screen.getByRole("dialog")).getByText("bā")).toBeInTheDocument();
    expect(within(screen.getByRole("dialog")).getByText("mà")).toBeInTheDocument();
    expect(within(screen.getByRole("dialog")).getByText("ma")).toBeInTheDocument();
  });
  it("click nút thanh gọi speak với pinyin có dấu", async () => {
    render(<SyllableDialog cell={cell} onClose={() => {}} />);
    await userEvent.click(within(screen.getByRole("dialog")).getByText("mǎ"));
    expect(speak).toHaveBeenCalledWith("mǎ", expect.objectContaining({ rate: 0.95 }));
  });
  it("hiện ví dụ từ pinyinExamples (chữ Hán + nghĩa)", () => {
    render(<SyllableDialog cell={cell} onClose={() => {}} />);
    expect(screen.getByText("八")).toBeInTheDocument();
    expect(screen.getByText("tám")).toBeInTheDocument();
  });
  it("âm không có ví dụ → không render mục ví dụ", () => {
    render(<SyllableDialog cell={{ initial: "Ø", final: "ueng", base: "weng", hasExample: false }} onClose={() => {}} />);
    expect(screen.queryByText(/Ví dụ/i)).not.toBeInTheDocument();
  });
});

describe("SyllableTable", () => {
  beforeEach(() => {
    speak.mockClear();
    window.history.replaceState(null, "", "/pinyin/bang-am");
  });
  it("render 405 ô hợp lệ dạng nút", () => {
    render(<SyllableTable />);
    const buttons = screen.getAllByRole("button", { name: /âm tiết/i });
    expect(buttons.length).toBe(405);
  });
  it("click ô ba mở dialog", async () => {
    render(<SyllableTable />);
    await userEvent.click(screen.getByRole("button", { name: /âm tiết ba/i }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("八")).toBeInTheDocument();
  });
  it("Esc đóng dialog và xoá ?sy khỏi URL", async () => {
    render(<SyllableTable />);
    await userEvent.click(screen.getByRole("button", { name: /âm tiết ba/i }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(window.location.search).toBe("");
  });
  it("mount với ?sy=ba mở sẵn dialog, không tự phát audio", () => {
    window.history.replaceState(null, "", "/pinyin/bang-am?sy=ba");
    render(<SyllableTable />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(speak).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/pinyin/table`
Expected: FAIL — module chưa tồn tại.

- [ ] **Step 3: Write `syllable-dialog.tsx`**

```tsx
"use client";
/* Dialog chi tiết 1 âm tiết: 5 nút thanh (tone 1-5) + ví dụ từ pinyinExamples.
   TTS qua useTts (Kokoro) — rate 0.95, chậm 0.65. Pure presentational. */
import { useState } from "react";
import { Volume2 } from "lucide-react";
import { toneForms, type Tone } from "@/lib/pinyin/tone-mark";
import { examplesFor, type SyllableCell } from "@/lib/pinyin/syllable-table-data";
import { useTts } from "@/lib/tts/use-tts";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";

const TONE_LABELS = ["Thanh 1", "Thanh 2", "Thanh 3", "Thanh 4", "Thanh nhẹ"];

export function SyllableDialog({ cell, onClose }: { cell: SyllableCell; onClose: () => void }) {
  const { speak } = useTts();
  const [tone, setTone] = useState<Tone>(1);
  const forms = toneForms(cell.base);
  const examples = examplesFor(cell.base);

  return (
    <Dialog open onClose={onClose} labelledBy="syllable-dialog-title" role="dialog">
      <div className="flex items-center gap-3">
        <h2 id="syllable-dialog-title" className="zh text-3xl font-bold text-text-primary">
          {forms[tone - 1]}
        </h2>
        <span className="rounded-full border border-border-subtle bg-secondary-background px-2 py-0.5 text-xs text-text-secondary">
          {cell.initial === "Ø" ? "không thanh mẫu" : cell.initial} · {cell.final}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-2">
        {forms.map((form, i) => (
          <button
            key={form}
            type="button"
            onClick={() => { setTone((i + 1) as Tone); speak(form, { rate: 0.95 }); }}
            aria-pressed={tone === i + 1}
            className={`flex min-h-[44px] cursor-pointer flex-col items-center justify-center rounded-card border px-1 py-1.5 text-sm font-bold transition-colors ${
              tone === i + 1
                ? "border-border-default bg-main text-main-foreground"
                : "border-border-subtle bg-background text-foreground hover:bg-main-hi"
            }`}
          >
            <span className="zh">{form}</span>
            <span className="text-[10px] font-normal text-text-secondary">{TONE_LABELS[i]}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-end">
        <Button variant="ghost" size="sm" onClick={() => speak(forms[tone - 1], { rate: 0.65 })}>
          <Icon name={Volume2} className="size-4" aria-hidden="true" /> Nghe chậm
        </Button>
      </div>

      {examples.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-bold text-text-primary">Ví dụ</h3>
          <ul className="mt-2 flex flex-col gap-1.5">
            {examples.map(([hanzi, py, vi]) => (
              <li key={hanzi} className="flex items-baseline gap-2 text-sm">
                <span className="zh text-lg text-text-primary">{hanzi}</span>
                <span className="zh text-text-secondary">{py}</span>
                <span className="text-text-secondary">{vi}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Dialog>
  );
}
```

Lưu ý adapter: nếu `Button`/`Icon` API khác (`variant`/`size`/`name` prop), bám theo `src/components/ui/button.tsx` + `src/components/ui/icon.tsx` thực tế — đọc 2 file trước khi viết; giữ luồng giữ nguyên.

- [ ] **Step 4: Write `syllable-table.tsx`**

```tsx
"use client";
/* Bảng Pinyin 405 âm tiết (/pinyin/bang-am). Desktop: ma trận initial × final
   (scroll ngang khi hẹp). Mobile (<md): nhóm chip theo hàng initial. Dialog qua
   state nội bộ; deep-link ?sy=<base> đọc/ghi bằng history.replaceState (SSG-safe). */
import { useEffect, useRef, useState } from "react";
import { buildSyllableTable, type SyllableCell } from "@/lib/pinyin/syllable-table-data";
import { SyllableDialog } from "./syllable-dialog";

const table = buildSyllableTable();

export function SyllableTable({ initialSy }: { initialSy?: string | null }) {
  const [open, setOpen] = useState<SyllableCell | null>(null);
  const bootedRef = useRef(false);

  /* Mount: đọc ?sy → mở sẵn dialog (không tự phát audio). */
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    const sy = initialSy ?? new URLSearchParams(window.location.search).get("sy");
    if (!sy) return;
    for (const cell of table.cells.values()) {
      if (cell.base === sy) { setOpen(cell); return; }
    }
  }, [initialSy]);

  const openCell = (cell: SyllableCell) => {
    setOpen(cell);
    window.history.replaceState(null, "", `/pinyin/bang-am?sy=${cell.base}`);
  };
  const closeCell = () => {
    setOpen(null);
    window.history.replaceState(null, "", "/pinyin/bang-am");
  };

  const cellButton = (cell: SyllableCell, extra = "") => (
    <button
      key={`${cell.initial}|${cell.final}`}
      type="button"
      onClick={() => openCell(cell)}
      aria-label={`âm tiết ${cell.base}`}
      className={`zh min-h-[44px] min-w-[44px] cursor-pointer rounded-base border px-2 py-1 text-sm font-bold transition-colors ${
        open?.base === cell.base
          ? "border-border-default bg-main text-main-foreground"
          : `border-border-subtle bg-background text-foreground hover:bg-main-hi ${extra}`
      }`}
    >
      {cell.base}
    </button>
  );

  return (
    <div>
      {/* Desktop: bảng ma trận */}
      <div className="hidden overflow-x-auto rounded-card border border-border-subtle bg-surface-elevated p-3 shadow-xs md:block">
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-surface-elevated px-2 py-1 text-left text-xs text-text-secondary">
                声母＼韵母
              </th>
              {table.finals.map((f) => (
                <th key={f} className="zh min-w-[48px] px-2 py-1 text-xs font-bold text-text-secondary">{f}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.initials.map((ini) => (
              <tr key={ini}>
                <th className="sticky left-0 z-10 bg-surface-elevated px-2 py-1 text-left text-sm font-bold text-text-primary">
                  <span className="zh">{ini}</span>
                  {ini === "Ø" && <span className="ml-1 text-[10px] font-normal text-text-secondary">không thanh mẫu</span>}
                </th>
                {table.finals.map((f) => {
                  const cell = table.cells.get(`${ini}|${f}`);
                  return (
                    <td key={f} className="p-0.5">
                      {cell ? cellButton(cell) : <span className="block min-h-[44px] min-w-[44px]" aria-hidden="true" />}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: nhóm theo initial, chip wrap */}
      <div className="flex flex-col gap-4 md:hidden">
        {table.initials.map((ini) => (
          <section key={ini} className="rounded-card border border-border-subtle bg-surface-elevated p-3 shadow-xs">
            <h3 className="mb-2 text-sm font-bold text-text-primary">
              <span className="zh">{ini}</span>
              {ini === "Ø" && <span className="ml-1 text-[10px] font-normal text-text-secondary">không thanh mẫu</span>}
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {table.finals.map((f) => {
                const cell = table.cells.get(`${ini}|${f}`);
                return cell ? cellButton(cell) : null;
              })}
            </div>
          </section>
        ))}
      </div>

      {open && <SyllableDialog cell={open} onClose={closeCell} />}
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run src/components/pinyin/table`
Expected: PASS. Nếu `getAllByRole` trả ≠ 405 → kiểm tra ô rỗng có vô tình render button; ô rỗng phải là `<span aria-hidden>`.

- [ ] **Step 6: Commit**

```bash
git add src/components/pinyin/table
git commit -m "feat(pinyin): SyllableTable + dialog 5 thanh — bảng 405 âm tiết"
```

---

### Task 4: Route `/pinyin/bang-am` + metadata + sitemap

**Files:**
- Create: `src/app/(wide)/pinyin/bang-am/page.tsx`
- Modify: `src/app/sitemap.ts` (thêm `"/pinyin/bang-am"` vào mảng routes cạnh `/pinyin/practice`)
- Test: `src/app/(wide)/pinyin/bang-am/__tests__/page.test.tsx`

**Interfaces:**
- Consumes: `SyllableTable` (Task 3), pattern metadata từ `src/app/(wide)/hanzi/page.tsx`.
- Produces: route SSG công khai; header + 2 CTA cross-link theo spec §4.1.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SyllableTablePage from "../page";

describe("/pinyin/bang-am page", () => {
  it("render h1 + mô tả phân vai + 2 CTA", () => {
    render(<SyllableTablePage />);
    expect(screen.getByRole("heading", { level: 1, name: /Bảng Pinyin/i })).toBeInTheDocument();
    expect(screen.getByText(/405/)).toBeInTheDocument();
    const practice = screen.getByRole("link", { name: /Luyện phản xạ tai/i });
    expect(practice).toHaveAttribute("href", "/pinyin?mode=quiz");
    const roadmap = screen.getByRole("link", { name: /Học lộ trình/i });
    expect(roadmap).toHaveAttribute("href", "/roadmap/pinyin");
  });
  it("chứa bảng 405 ô", () => {
    render(<SyllableTablePage />);
    expect(screen.getAllByRole("button", { name: /âm tiết/i }).length).toBe(405);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run "src/app/(wide)/pinyin/bang-am"`
Expected: FAIL — page chưa tồn tại.

- [ ] **Step 3: Write the page**

```tsx
/* /pinyin/bang-am — Bảng Pinyin 405 âm tiết (spec 2026-10-28). SSG server
   component; tương tác trong SyllableTable. Vai trò: TRA (đối chiếu Lab = HỌC).
   Deep-link ?sy=<base> do SyllableTable tự đọc. */
import type { Metadata } from "next";
import Link from "next/link";
import SyllableTable from "@/components/pinyin/table/syllable-table";

export const metadata: Metadata = {
  title: "Bảng Pinyin · 405 âm tiết",
  description:
    "Bảng Pinyin đầy đủ 405 âm tiết chuẩn tiếng Trung — bấm vào bất kỳ âm để nghe phát âm 4 thanh điệu và ví dụ thực tế.",
};

export default function BangAmPage() {
  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-[22px] font-bold tracking-tight">
          <span className="zh text-action-primary">拼音表</span> · Bảng Pinyin · 405 âm tiết
        </h1>
        <p className="mt-0.5 text-[13px] text-text-secondary">
          Tra cứu nhanh — bấm ô bất kỳ để xem chi tiết và nghe phát âm. Muốn luyện phản xạ, dùng{" "}
          <Link href="/pinyin" className="underline">Pinyin Lab</Link>.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/pinyin?mode=quiz"
            className="inline-flex min-h-[44px] items-center rounded-button border border-border-default bg-main px-4 py-2 text-sm font-bold text-main-foreground shadow-xs transition-colors hover:bg-main-hi"
          >
            Luyện phản xạ tai
          </Link>
          <Link
            href="/roadmap/pinyin"
            className="inline-flex min-h-[44px] items-center rounded-button border border-border-subtle bg-surface-elevated px-4 py-2 text-sm font-bold text-foreground shadow-xs transition-colors hover:bg-main-hi"
          >
            Học lộ trình
          </Link>
        </div>
      </header>
      <SyllableTable />
    </div>
  );
}
```

Sửa `src/app/sitemap.ts`: thêm `"/pinyin/bang-am",` vào dòng routes chứa `"/pinyin", "/pinyin/practice"`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run "src/app/(wide)/pinyin/bang-am"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(wide)/pinyin/bang-am" src/app/sitemap.ts
git commit -m "feat(pinyin): route /pinyin/bang-am SSG + metadata + sitemap"
```

---

### Task 5: Lab cross-link + celebrate quiz

**Files:**
- Modify: `src/app/(wide)/pinyin/pinyin-lab-root.tsx` (thêm link sau `SoundMatrix`, chỉ mode matrix)
- Modify: `src/components/pinyin/lab/quiz-view.tsx` (tổng kết + streak)
- Create: `src/components/pinyin/lab/confetti-burst.tsx`
- Test: `src/components/pinyin/lab/__tests__/celebrate.test.tsx`

**Interfaces:**
- Consumes: Link (next/link); cấu trúc tổng kết hiện có tại `quiz-view.tsx:131-137` (`p.done`, `p.score`, `p.streak`).
- Produces: `ConfettiBurst({ count?: number })` — overlay `aria-hidden pointer-events-none`.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConfettiBurst } from "../confetti-burst";
import { QuizView } from "../quiz-view";

describe("ConfettiBurst", () => {
  it("render overlay aria-hidden + pointer-events-none", () => {
    const { container } = render(<ConfettiBurst />);
    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveAttribute("aria-hidden", "true");
    expect(el.className).toContain("pointer-events-none");
  });
});

describe("QuizView celebrate", () => {
  const base = {
    qi: 10, total: 10, score: 9, streak: 0, done: true, opts: [],
    target: null, picked: null, playing: false,
    onChoose: () => {}, onNext: () => {}, onReplay: () => {}, onSlow: () => {}, onReset: () => {},
  };
  it("score >= 8 → hiện confetti", () => {
    const { container } = render(<QuizView {...base} />);
    expect(container.querySelector("[aria-hidden='true'].pointer-events-none")).not.toBeNull();
  });
  it("score < 8 → không confetti", () => {
    const { container } = render(<QuizView {...base} score={4} />);
    expect(container.querySelector(".pointer-events-none")).toBeNull();
  });
  it("streak >= 5 giữa phiên → badge chuỗi nổi bật", () => {
    render(<QuizView {...base} done={false} qi={5} score={5} streak={5} target={null} />);
    expect(screen.getByTestId("streak-celebrate")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/components/pinyin/lab/__tests__/celebrate.test.tsx`
Expected: FAIL — `ConfettiBurst` chưa tồn tại; QuizView chưa có testid.

- [ ] **Step 3: Implement**

`confetti-burst.tsx`:

```tsx
"use client";
/* Burst confetti thuần CSS khi tổng kết quiz đậu — không dependency mới.
   Overlay aria-hidden, pointer-events-none để không chặn click/a11y. */
const COLORS = ["bg-main", "bg-action-primary", "bg-feedback-success", "bg-accent", "bg-peach"];

export function ConfettiBurst({ count = 28 }: { count?: number }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={`absolute top-0 block size-2 rounded-[2px] ${COLORS[i % COLORS.length]}`}
          style={{
            left: `${(i * 97) % 100}%`,
            animation: `confetti-fall ${1.4 + (i % 5) * 0.25}s ease-in ${(i % 7) * 0.12}s 1 forwards`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}
```

Thêm keyframes vào CSS global đang dùng theme (`src/app/globals.css` hoặc file tailwind theme tương ứng — grep `@keyframes` để tìm đúng chỗ):

```css
@keyframes confetti-fall {
  0% { transform: translateY(-10px) rotate(0deg); opacity: 1; }
  100% { transform: translateY(320px) rotate(540deg); opacity: 0; }
}
```

`quiz-view.tsx`: trong nhánh tổng kết `p.done` (dòng ~131) render `{p.score >= 8 && <ConfettiBurst />}` (bọc phần tổng kết bằng `relative`); dòng streak hiện có (dòng ~44) bọc badge khi `p.streak >= 5 && !p.done`: `<span data-testid="streak-celebrate" className="animate-pulse …">🔥 Chuỗi {p.streak}!</span>` thay/bên cạnh text hiện tại.

`pinyin-lab-root.tsx`: ngay dưới `SoundMatrix` (khối `data-od-id="sound-matrix"`, chỉ khi `cat !== "tone"`) thêm:

```tsx
<p className="mt-2 text-xs text-text-secondary">
  Muốn tra toàn bộ tổ hợp? <Link href="/pinyin/bang-am" className="underline">Xem đủ 405 âm tiết →</Link>
</p>
```

với `import Link from "next/link";`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run src/components/pinyin/lab`
Expected: PASS cả test cũ lẫn mới (nếu test cũ QuizView fail vì DOM thay đổi — chỉ sửa selector test, không đổi logic).

- [ ] **Step 5: Commit**

```bash
git add src/components/pinyin/lab src/app/(wide)/pinyin/pinyin-lab-root.tsx
git commit -m "feat(pinyin): celebrate quiz (confetti + streak badge) + cross-link lab→bảng"
```

---

### Task 6: Gate tổng — typecheck/lint/test toàn bộ

- [ ] **Step 1:** `pnpm typecheck` — 0 lỗi.
- [ ] **Step 2:** `pnpm lint` — 0 lỗi.
- [ ] **Step 3:** `pnpm test` — full suite xanh (~1400+ test).
- [ ] **Step 4:** Nếu đỏ → sửa rồi chạy lại cả 3 bước; commit fix riêng `fix(pinyin): ...`.

---

### Task 7: Browser QA (control-browser, :3100) — chạy sau khi implement xong

Chạy lần lượt 12 test case ở spec §5.2 (T1–T12) trên `http://localhost:3100/pinyin/bang-am`.
Mọi case phải PASS; case fail → fix → chạy lại từ T1. Ghi kết quả từng case vào báo cáo cuối.
