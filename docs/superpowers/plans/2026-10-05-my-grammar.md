# My Grammar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port 100% mock `opendesign_hsk/my-grammar.html` ("Sổ tay ngữ pháp") thành trang `/my-grammar` mới: hero + ribbon filters (level/chủ điểm/search) + grid card điểm ngữ pháp (công thức blocks, bẫy người Việt, ví dụ phát âm, ★ lưu) — nội dung từ content module mới, trạng thái ★ persist qua `progressStore`.

**Architecture:** Content tĩnh `content/grammar-points.ts` (6 điểm port mock); store `bye.grammarMeta` (pattern `wordMeta` my-vocab); pure lib `lib/my-grammar.ts` (filter + hero metrics); component tree `src/components/my-grammar/` mirror `components/my-vocab/`. Route chuyển `(wide)` (đã tồn tại).

**Tech Stack:** Next.js 16, React 19, Tailwind v4 semantic tokens, vitest + testing-library (jsdom).

**Spec:** `docs/superpowers/specs/2026-10-05-my-grammar-design.md` — executors đọc cả spec và plan.

## Global Constraints

- Mọi màu dùng semantic token (`action-primary`, `learning-mastered`, `learning-progress`, `jade-wash`, `amber-wash`, `amber-ink`, `surface-muted`, `border-subtle`…) — cấm hard-code hex.
- Hán tự luôn kèm class `zh`.
- Copy giữ đúng mock: "SỔ TAY CẤU TRÚC NGỮ PHÁP HSK", "Ôn theo phản xạ: nhận diện cấu trúc trong 3 giây, đặt câu đúng trong 10 giây.", "🎯 Luyện phản xạ cấu trúc hôm nay", "Cấp độ", "Chủ điểm", "+ Thêm cấu trúc mới", "⭐ Đã lưu", "Tất cả", "VÍ DỤ NGỮ CẢNH", "Bẫy người Việt:", "Luyện tập cấu trúc này", "Không tìm thấy cấu trúc phù hợp. Thử từ khóa khác hoặc bấm “Tất cả”.", "Lưu cấu trúc", "Tùy chọn: ghim · ẩn ví dụ · báo lỗi công thức", "Tạo cấu trúc mới: nhập tên + công thức + 1 ví dụ để lưu", "Đang phát âm: X", "Đã lưu ★ {title}"/"Đã bỏ lưu {title}", "Tìm kiếm cấu trúc, ví dụ...", pill hero "📘 … mẫu"/"⭐ … yêu thích"/"📦 … cấu trúc".
- Hero h1 **deviation đã chốt**: "Sổ tay có {total} cấu trúc · {savedCount} cấu trúc đã lưu" (mock 42/8/72% không suy được — không grammar SRS).
- Result line dùng **topic label** ("Câu chữ 把 / 被") thay raw key "ba" của mock (mock để lọt key — sửa có chủ ý).
- Giữ `data-od-id` của mock làm hook e2e/test.
- Không đụng `NotebookList`, `content/notebooks.ts`, `/notebook/[kind]/[id]`, `bye.wordMeta` (my-vocab).
- Root không gọi `Date.now()`-shaped render trước mount — ở đây không dùng Date.now() nên chỉ cần mounted gate cho store read (pattern NotebookList).
- Test: vitest, import tường minh, `act(() => el.click())`.
- Chạy 1 file: `npx vitest run <path>` (cwd `app-next/`).

## Review Focus

1. **Pitfall tách [bold, rest] sai chỗ** — kỳ vọng: mỗi điểm có đúng cặp bold/rest port từ `<b>` mock; render "Bẫy người Việt: <b>{bold}</b>{rest}" ghép lại đúng câu gốc. → Test pin ở Task 1 + Task 7.
2. **Topic "saved" khi chưa lưu gì** — kỳ vọng: grid rỗng → empty state hiện, result line "0 cấu trúc". → Test pin ở Task 8.
3. **Mặc định level "HSK 4"** (đúng mock) — kỳ vọng: mở trang chỉ thấy 2 card (lian, yue), KHÔNG phải 6. → Test pin ở Task 8.
4. **Toggle saved nhanh 2 lần / re-render** — kỳ vọng: store toggle về đúng giá trị, entry xoá sạch khi bỏ lưu (không để `{}`), event bye:progress đồng bộ grid. → Test pin ở Task 2 + Task 8.
5. **Search q có ký tự Hán + dấu** — kỳ vọng: substring lowercase trên title+hz+def+ex (hz+py+vi) hoạt động với both "把" và "so sánh". → Test pin ở Task 3.

---

### Task 1: Content module `grammar-points.ts`

**Files:**
- Create: `app-next/src/content/grammar-points.ts`
- Test: `app-next/src/content/__tests__/grammar-points.test.ts`

**Interfaces:**
- Produces: `type GrammarTopic`, `type GrammarPoint`, `GRAMMAR_POINTS` (6 điểm), `GRAMMAR_TOPICS`, `GRAMMAR_LEVELS` — đúng spec §2.1.

- [ ] **Step 1: Write the failing test**

```ts
// app-next/src/content/__tests__/grammar-points.test.ts
import { describe, it, expect } from "vitest";
import { GRAMMAR_POINTS, GRAMMAR_TOPICS, GRAMMAR_LEVELS } from "../grammar-points";

describe("GRAMMAR_POINTS (port mock 6 điểm)", () => {
  it("đủ 6 điểm đúng id/thứ tự; level/topic hợp lệ", () => {
    expect(GRAMMAR_POINTS.map((p) => p.id)).toEqual(["ba", "bi", "lian", "bongu", "bei", "yue"]);
    const levels = GRAMMAR_LEVELS.filter((l) => l !== "all");
    for (const p of GRAMMAR_POINTS) {
      expect(levels, p.id).toContain(p.level);
      expect(["ba", "bi", "bongu", "hutu"], p.id).toContain(p.topic);
    }
  });

  it("mỗi điểm: def, formula ≥ 2 blocks (≥ 1 key), pitfall [bold, rest] không rỗng, ex ≥ 1", () => {
    for (const p of GRAMMAR_POINTS) {
      expect(p.def.length, p.id).toBeGreaterThan(10);
      expect(p.formula.length, p.id).toBeGreaterThanOrEqual(2);
      expect(p.formula.some(([, k]) => k === "key"), `formula key ${p.id}`).toBe(true);
      expect(p.pitfall.length, `pitfall 3 phần ${p.id}`).toBe(3);
      expect(p.pitfall[1].length, `pit bold ${p.id}`).toBeGreaterThan(3);
      expect(p.pitfall[2].length, `pit rest ${p.id}`).toBeGreaterThan(3);
      expect(p.ex.length, p.id).toBeGreaterThanOrEqual(1);
      for (const e of p.ex) {
        expect(e.hz).toBeTruthy();
        expect(e.py).toBeTruthy();
        expect(e.vi).toBeTruthy();
      }
    }
  });

  it("pitfall 3 phần ghép lại đúng câu mock (Review Focus #1)", () => {
    const concat = (p: (typeof GRAMMAR_POINTS)[number]) => p.pitfall[0] + p.pitfall[1] + p.pitfall[2];
    const ba = GRAMMAR_POINTS.find((p) => p.id === "ba")!;
    expect(concat(ba)).toBe("Động từ không được đứng đơn độc sau tân ngữ — phải có bổ ngữ, 了, hoặc thành phần khác.");
    const bi = GRAMMAR_POINTS.find((p) => p.id === "bi")!;
    expect(concat(bi)).toBe("Không thêm 很 / 非常 trước tính từ trong câu 比 — mức độ nằm ở phần số lượng.");
    const lian = GRAMMAR_POINTS.find((p) => p.id === "lian")!;
    expect(concat(lian)).toBe("连 phải đi với 也 hoặc 都 — thiếu là sai cấu trúc, người Việt hay bỏ quên.");
  });

  it("ví dụ port đúng mock (3 câu chốt)", () => {
    expect(GRAMMAR_POINTS[0].ex[0]).toEqual({ hz: "请把书打开。", py: "Qǐng bǎ shū dǎkāi.", vi: "Xin hãy mở sách ra." });
    expect(GRAMMAR_POINTS[1].ex[0]).toEqual({ hz: "他比我高五厘米。", py: "Tā bǐ wǒ gāo wǔ límǐ.", vi: "Anh ấy cao hơn tôi 5 cm." });
    expect(GRAMMAR_POINTS[5].ex[0]).toEqual({ hz: "越学越有意思。", py: "Yuè xué yuè yǒu yìsi.", vi: "Càng học càng thấy thú vị." });
  });

  it("GRAMMAR_TOPICS đủ 6 mục (all + 4 topic + saved); GRAMMAR_LEVELS đủ 7", () => {
    expect(GRAMMAR_TOPICS.map(([k]) => k)).toEqual(["all", "ba", "bi", "bongu", "hutu", "saved"]);
    expect(GRAMMAR_TOPICS[1][1]).toBe("Câu chữ 把 / 被");
    expect(GRAMMAR_LEVELS).toEqual(["all", "HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5", "HSK 6"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && npx vitest run src/content/__tests__/grammar-points.test.ts`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Write the data module**

```ts
// app-next/src/content/grammar-points.ts
/* Sổ tay ngữ pháp — 6 điểm port 1:1 opendesign_hsk/my-grammar.html DATA array
   (spec 2026-10-05 §2.1). pitfall tách <b>…</b> của mock thành [bold, rest].
   Content giáo dục tĩnh; trạng thái ★ "Đã lưu" là user data (bye.grammarMeta). */

export type GrammarTopic = "ba" | "bi" | "bongu" | "hutu";

export type GrammarPoint = {
  id: string;
  title: string;
  hz: string;
  level: "HSK 1" | "HSK 2" | "HSK 3" | "HSK 4" | "HSK 5" | "HSK 6";
  topic: GrammarTopic;
  def: string;
  formula: [label: string, isKey?: "key"][];
  pitfall: [lead: string, bold: string, rest: string]; // ghép 3 phần = đúng câu mock; render "Bẫy người Việt: {lead}<b>{bold}</b>{rest}"
  ex: { hz: string; py: string; vi: string }[];
};

export const GRAMMAR_TOPICS: [key: GrammarTopic | "all" | "saved", label: string][] = [
  ["all", "Tất cả"],
  ["ba", "Câu chữ 把 / 被"],
  ["bi", "Câu so sánh 比"],
  ["bongu", "Bổ ngữ kết quả / khả năng"],
  ["hutu", "Hư từ & Liên từ"],
  ["saved", "⭐ Đã lưu"],
];

export const GRAMMAR_LEVELS = ["all", "HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5", "HSK 6"] as const;

export const GRAMMAR_POINTS: GrammarPoint[] = [
  { id: "ba", title: "CÂU CHỮ 把", hz: "把字句", level: "HSK 3", topic: "ba",
    def: "Xử lý tân ngữ và kết quả hành động — nhấn mạnh cách xử lý sự vật.",
    formula: [["S"], ["把", "key"], ["Tân ngữ"], ["Động từ"], ["Thành phần khác"]],
    pitfall: ["Động từ ", "không được đứng đơn độc", " sau tân ngữ — phải có bổ ngữ, 了, hoặc thành phần khác."],
    ex: [
      { hz: "请把书打开。", py: "Qǐng bǎ shū dǎkāi.", vi: "Xin hãy mở sách ra." },
      { hz: "把门关上吧。", py: "Bǎ mén guānshang ba.", vi: "Hãy đóng cửa lại đi." },
    ] },
  { id: "bi", title: "CÂU SO SÁNH 比", hz: "比字句", level: "HSK 2", topic: "bi",
    def: "So sánh mức độ / tính chất giữa hai đối tượng.",
    formula: [["A"], ["比", "key"], ["B"], ["Tính từ"], ["Số lượng cụ thể"]],
    pitfall: ["", "Không thêm 很 / 非常", " trước tính từ trong câu 比 — mức độ nằm ở phần số lượng."],
    ex: [{ hz: "他比我高五厘米。", py: "Tā bǐ wǒ gāo wǔ límǐ.", vi: "Anh ấy cao hơn tôi 5 cm." }] },
  { id: "lian", title: "LIÊN TỪ 连…也 / 都…", hz: "连字句", level: "HSK 4", topic: "hutu",
    def: "Nhấn mạnh trường hợp cực đoan — “đến cả… cũng…”/“ngay cả…”.",
    formula: [["连", "key"], ["Trường hợp cực đoan"], ["也 / 都", "key"], ["Vị ngữ"]],
    pitfall: ["连 phải đi với 也 hoặc 都 — ", "thiếu là sai cấu trúc", ", người Việt hay bỏ quên."],
    ex: [{ hz: "他连一杯水也不喝。", py: "Tā lián yì bēi shuǐ yě bù hē.", vi: "Anh ấy đến một ngụm nước cũng không uống." }] },
  { id: "bongu", title: "BỔ NGỮ KẾT QUẢ", hz: "到 / 见 / 完", level: "HSK 3", topic: "bongu",
    def: "Biểu thị hành động đạt được kết quả cụ thể.",
    formula: [["Động từ"], ["到 / 见 / 完", "key"], ["Tân ngữ"]],
    pitfall: ["Bổ ngữ kết quả ", "đứng sát động từ", " — không chèn tân ngữ vào giữa như tiếng Việt."],
    ex: [
      { hz: "我听见了。", py: "Wǒ tīngjiàn le.", vi: "Tôi nghe thấy rồi." },
      { hz: "作业做完了。", py: "Zuòyè zuò wán le.", vi: "Bài tập làm xong rồi." },
    ] },
  { id: "bei", title: "CÂU CHỮ 被", hz: "被字句", level: "HSK 3", topic: "ba",
    def: "Câu bị động — chủ ngữ chịu tác động của hành động.",
    formula: [["S (chịu tác động)"], ["被", "key"], ["Tác nhân"], ["Động từ"], ["Thành phần khác"]],
    pitfall: ["Sau 被 thường ", "không dùng động từ đơn độc", " — cần bổ ngữ hoặc trợ từ đi kèm."],
    ex: [{ hz: "我的手机被他拿走了。", py: "Wǒ de shǒujī bèi tā ná zǒu le.", vi: "Điện thoại của tôi bị anh ấy cầm đi mất rồi." }] },
  { id: "yue", title: "CÀNG… CÀNG…", hz: "越…越…", level: "HSK 4", topic: "hutu",
    def: "Diễn tả hai sự việc cùng tăng tiến theo nhau.",
    formula: [["越", "key"], ["Điều kiện"], ["越", "key"], ["Kết quả"]],
    pitfall: ["Hai vế 越 ", "phải song hành cùng chủ ngữ logic", " — không đổi chủ ngữ giữa chừng."],
    ex: [{ hz: "越学越有意思。", py: "Yuè xué yuè yǒu yìsi.", vi: "Càng học càng thấy thú vị." }] },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app-next && npx vitest run src/content/__tests__/grammar-points.test.ts`
Expected: PASS (5 test) — với pitfall 3 phần đã sửa ở bước 3.

- [ ] **Step 5: Commit**

```bash
git add app-next/src/content/grammar-points.ts app-next/src/content/__tests__/grammar-points.test.ts
git commit -m "feat(content): grammar-points — 6 điểm ngữ pháp port từ mock (formula/pitfall/ex)"
```

---

### Task 2: `progressStore` — grammar meta

**Files:**
- Modify: `app-next/src/lib/store/progress-store.ts` (type `GrammarMeta` + class + `ProgressStoreApi`)
- Test: `app-next/src/lib/store/__tests__/progress-store-grammar-meta.test.ts`

**Interfaces:**
- Produces: `type GrammarMeta = { saved?: 1 }`; `progressStore.getGrammarMeta()`, `progressStore.toggleGrammarSaved(id): boolean` (Task 8 dùng).

- [ ] **Step 1: Write the failing test**

```ts
// app-next/src/lib/store/__tests__/progress-store-grammar-meta.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { progressStore } from "../progress-store";

describe("progressStore grammar meta (Review Focus #4)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("mặc định {}", () => {
    expect(progressStore.getGrammarMeta()).toEqual({});
  });

  it("toggleGrammarSaved: bật → true; tắt → xoá entry sạch khỏi bye.grammarMeta", () => {
    expect(progressStore.toggleGrammarSaved("ba")).toBe(true);
    expect(JSON.parse(localStorage.getItem("bye.grammarMeta")!)["ba"]).toEqual({ saved: 1 });
    expect(progressStore.toggleGrammarSaved("ba")).toBe(false);
    expect(JSON.parse(localStorage.getItem("bye.grammarMeta")!)["ba"]).toBeUndefined();
  });

  it("toggle nhanh 2 lần về đúng giá trị ban đầu", () => {
    const a = progressStore.toggleGrammarSaved("bi");
    const b = progressStore.toggleGrammarSaved("bi");
    expect([a, b]).toEqual([true, false]);
    expect(progressStore.getGrammarMeta()).toEqual({});
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && npx vitest run src/lib/store/__tests__/progress-store-grammar-meta.test.ts`
Expected: FAIL — không có method.

- [ ] **Step 3: Implement**

Trong `progress-store.ts` — type cạnh `WordMeta` (Task 2 plan my-vocab; nếu my-vocab chưa chạy thì cạnh `VocabBookEntry`):

```ts
export type GrammarMeta = { saved?: 1 };
```

2 method vào class (gần cụm word meta) + signature vào `ProgressStoreApi`:

```ts
  /* ---------- grammar meta (bye.grammarMeta — spec 2026-10-05 §2.2) ---------- */

  getGrammarMeta(): Record<string, GrammarMeta> {
    return readJSON<Record<string, GrammarMeta>>("bye.grammarMeta", {});
  }

  toggleGrammarSaved(id: string): boolean {
    const all = this.getGrammarMeta();
    const saved = all[id]?.saved ? undefined : (1 as const);
    const next: GrammarMeta = { saved };
    if (!saved) delete all[id];
    else all[id] = next;
    writeJSON("bye.grammarMeta", all);
    dispatchProgress();
    return !!saved;
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app-next && npx vitest run src/lib/store/__tests__/progress-store-grammar-meta.test.ts`
Expected: PASS (3 test).

- [ ] **Step 5: Commit**

```bash
git add app-next/src/lib/store/progress-store.ts app-next/src/lib/store/__tests__/progress-store-grammar-meta.test.ts
git commit -m "feat(store): grammar meta — toggle saved per điểm ngữ pháp (bye.grammarMeta)"
```

---

### Task 3: Pure lib `my-grammar.ts`

**Files:**
- Create: `app-next/src/lib/my-grammar.ts`
- Test: `app-next/src/lib/__tests__/my-grammar.test.ts`

**Interfaces:**
- Consumes: `GRAMMAR_POINTS` types từ `@/content/grammar-points`.
- Produces: `filterPoints(points, f, savedIds)`, `grammarHero(points, savedIds)` — đúng spec §2.3.

- [ ] **Step 1: Write the failing test**

```ts
// app-next/src/lib/__tests__/my-grammar.test.ts
import { describe, it, expect } from "vitest";
import { filterPoints, grammarHero } from "../my-grammar";
import { GRAMMAR_POINTS } from "@/content/grammar-points";

const ids = (list: { id: string }[]) => list.map((p) => p.id);

describe("filterPoints", () => {
  it("level: HSK 4 → lian, yue; all → 6", () => {
    expect(ids(filterPoints(GRAMMAR_POINTS, { level: "HSK 4", topic: "all", q: "" }, []))).toEqual(["lian", "yue"]);
    expect(filterPoints(GRAMMAR_POINTS, { level: "all", topic: "all", q: "" }, []).length).toBe(6);
  });
  it("topic: ba → ba + bei; saved qua savedIds (Review Focus #2)", () => {
    expect(ids(filterPoints(GRAMMAR_POINTS, { level: "all", topic: "ba", q: "" }, []))).toEqual(["ba", "bei"]);
    expect(ids(filterPoints(GRAMMAR_POINTS, { level: "all", topic: "saved", q: "" }, ["bi", "yue"]))).toEqual(["bi", "yue"]);
  });
  it("q: Hán, không dấu, ví dụ py — kết hợp level (Review Focus #5)", () => {
    expect(ids(filterPoints(GRAMMAR_POINTS, { level: "all", topic: "all", q: "把" }, []))).toEqual(["ba"]);
    expect(ids(filterPoints(GRAMMAR_POINTS, { level: "all", topic: "all", q: "so sánh" }, []))).toEqual(["bi"]);
    expect(ids(filterPoints(GRAMMAR_POINTS, { level: "all", topic: "all", q: "límǐ" }, []))).toEqual(["bi"]);
    expect(ids(filterPoints(GRAMMAR_POINTS, { level: "HSK 2", topic: "all", q: "把" }, []))).toEqual([]);
  });
});

describe("grammarHero", () => {
  it("total/savedCount; topLevel = level cao nhất có điểm, topCount theo level đó", () => {
    const h = grammarHero(GRAMMAR_POINTS, ["ba", "bi"]);
    expect(h.total).toBe(6);
    expect(h.savedCount).toBe(2);
    expect(h.topLevel).toBe("HSK 4"); // cao nhất trong {2,3,4}
    expect(h.topCount).toBe(2);       // lian + yue
  });
  it("rỗng → topLevel null", () => {
    expect(grammarHero([], [])).toEqual({ total: 0, savedCount: 0, topLevel: null, topCount: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && npx vitest run src/lib/__tests__/my-grammar.test.ts`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Write the implementation**

```ts
// app-next/src/lib/my-grammar.ts
/* Sổ tay ngữ pháp — filter + hero metrics (spec 2026-10-05 §2.3). Pure functions. */

import type { GrammarPoint } from "@/content/grammar-points";

export type GrammarFilters = { level: string; topic: string; q: string };

export function filterPoints(points: GrammarPoint[], f: GrammarFilters, savedIds: string[]): GrammarPoint[] {
  const q = f.q.trim().toLowerCase();
  return points.filter((p) => {
    if (f.level !== "all" && p.level !== f.level) return false;
    if (f.topic === "saved") { if (!savedIds.includes(p.id)) return false; }
    else if (f.topic !== "all" && p.topic !== f.topic) return false;
    if (q) {
      const hay = (p.title + p.hz + p.def + p.ex.map((e) => e.hz + e.py + e.vi).join("")).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function grammarHero(points: GrammarPoint[], savedIds: string[]): {
  total: number; savedCount: number; topLevel: string | null; topCount: number;
} {
  const savedCount = points.filter((p) => savedIds.includes(p.id)).length;
  let topLevel: string | null = null;
  let topCount = 0;
  let topNum = 0;
  const byLevel = new Map<string, number>();
  for (const p of points) byLevel.set(p.level, (byLevel.get(p.level) ?? 0) + 1);
  for (const [level, count] of byLevel) {
    const num = Number(/^HSK (\d+)$/.exec(level)?.[1] ?? 0);
    if (num > topNum) { topNum = num; topLevel = level; topCount = count; }
  }
  return { total: points.length, savedCount, topLevel, topCount };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app-next && npx vitest run src/lib/__tests__/my-grammar.test.ts`
Expected: PASS (5 test).

- [ ] **Step 5: Commit**

```bash
git add app-next/src/lib/my-grammar.ts app-next/src/lib/__tests__/my-grammar.test.ts
git commit -m "feat(lib): my-grammar — filterPoints + grammarHero (pure)"
```

---

### Task 4: Chuyển `/my-grammar` sang `(wide)`

**Files:**
- Move: `app-next/src/app/(app)/my-grammar/` → `app-next/src/app/(wide)/my-grammar/`

- [ ] **Step 1: Verify (wide) + move**

```bash
cd app-next && cat "src/app/(wide)/layout.tsx" && git mv "src/app/(app)/my-grammar" "src/app/(wide)/my-grammar"
```

Expected: layout tồn tại (pinyin-lab đã tạo). Nếu thiếu — dừng, tạo theo spec §3 trước.

- [ ] **Step 2: Verify + commit**

Run: `cd app-next && grep -rn '(app)/my-grammar' src ; npm run typecheck`
Expected: grep rỗng; typecheck sạch.

```bash
git add -A && git commit -m "refactor(app): chuyển /my-grammar sang route group (wide)"
```

---

### Task 5: `GrammarHero`

**Files:**
- Create: `app-next/src/components/my-grammar/grammar-hero.tsx`
- Test: `app-next/src/components/my-grammar/__tests__/grammar-hero.test.tsx`

**Interfaces:**
- Produces: `GrammarHero({ total, savedCount, topLevel, topCount, onReview }: { total: number; savedCount: number; topLevel: string | null; topCount: number; onReview: () => void })`.

- [ ] **Step 1: Write the failing test**

```tsx
// app-next/src/components/my-grammar/__tests__/grammar-hero.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { GrammarHero } from "../grammar-hero";

afterEach(cleanup);

describe("GrammarHero", () => {
  it("eyebrow + h1 deviation + p + 3 pills + CTA (spec §5.1)", () => {
    const onReview = vi.fn();
    const { getByText } = render(
      <GrammarHero total={6} savedCount={2} topLevel="HSK 4" topCount={2} onReview={onReview} />,
    );
    expect(getByText("SỔ TAY CẤU TRÚC NGỮ PHÁP HSK")).toBeTruthy();
    expect(document.body.textContent).toContain("Sổ tay có 6 cấu trúc · 2 cấu trúc đã lưu");
    expect(document.body.textContent).toContain("Ôn theo phản xạ: nhận diện cấu trúc trong 3 giây");
    expect(getByText("📘 HSK 4: 2 mẫu")).toBeTruthy();
    expect(getByText("⭐ 2 yêu thích")).toBeTruthy();
    expect(getByText("📦 6 cấu trúc")).toBeTruthy();
    act(() => getByText("🎯 Luyện phản xạ cấu trúc hôm nay").click());
    expect(onReview).toHaveBeenCalledTimes(1);
  });
  it("topLevel null → pill ẩn", () => {
    render(<GrammarHero total={0} savedCount={0} topLevel={null} topCount={0} onReview={() => {}} />);
    expect(document.body.textContent).not.toContain("📘");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && npx vitest run src/components/my-grammar/__tests__/grammar-hero.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Write the component**

```tsx
// app-next/src/components/my-grammar/grammar-hero.tsx
"use client";

/* Hero — port .hero của mock; h1/pill 3 deviation đã chốt (spec §5.1): số liệu thật. */
import { Button } from "@/components/ui/button";

export function GrammarHero({
  total, savedCount, topLevel, topCount, onReview,
}: {
  total: number;
  savedCount: number;
  topLevel: string | null;
  topCount: number;
  onReview: () => void;
}) {
  return (
    <section
      data-od-id="grammar-hero"
      aria-label="Tổng quan sổ tay ngữ pháp"
      className="grid items-center gap-6 rounded-[24px] border border-border-subtle bg-surface-elevated/85 p-6 shadow-md max-[860px]:justify-items-center max-[860px]:grid-cols-1 sm:grid-cols-[1fr_auto]"
    >
      <div>
        <div className="text-xs font-bold tracking-[0.08em] text-jade-ink" style={{ color: "var(--hz-jade-ink, #144d38)" }}>
          SỔ TAY CẤU TRÚC NGỮ PHÁP HSK
        </div>
        <h1 className="mt-1 text-[21px] leading-[1.35] text-text-primary">
          Sổ tay có {total} cấu trúc · {savedCount} cấu trúc đã lưu
        </h1>
        <p className="mt-1.5 text-[13.5px] text-text-secondary">
          Ôn theo phản xạ: nhận diện cấu trúc trong 3 giây, đặt câu đúng trong 10 giây.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {topLevel && (
            <span className="rounded-full border border-border-subtle bg-surface-muted px-3.5 py-[7px] text-[12.5px] font-bold text-text-primary">
              📘 {topLevel}: {topCount} mẫu
            </span>
          )}
          <span className="rounded-full border border-amber-line bg-amber-wash px-3.5 py-[7px] text-[12.5px] font-bold text-amber-ink">
            ⭐ {savedCount} yêu thích
          </span>
          <span className="rounded-full border border-jade-line bg-jade-wash px-3.5 py-[7px] text-[12.5px] font-bold" style={{ color: "var(--hz-jade-ink, #144d38)" }}>
            📦 {total} cấu trúc
          </span>
        </div>
      </div>
      <Button
        onClick={onReview}
        className="min-h-[52px] max-w-[300px] rounded-[14px] px-[26px] text-[14px] leading-[1.4] shadow-[0_4px_14px_rgba(200,60,50,.28)]"
      >
        🎯 Luyện phản xạ cấu trúc hôm nay
      </Button>
    </section>
  );
}
```

**Chú ý token:** `text-jade-ink`/`jade-ink` — kiểm `globals.css` có `--color-jade-ink` chưa (`grep -n "jade-ink" src/app/globals.css`); nếu chưa, dùng `style={{ color: "var(--hz-jade-ink, #144d38)" }}` như trên hoặc thêm token vào `@theme inline` (`--color-jade-ink: var(--hz-jade-ink);`) — **ưu tiên thêm token** rồi bỏ style inline.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app-next && npx vitest run src/components/my-grammar/__tests__/grammar-hero.test.tsx`
Expected: PASS (2 test).

- [ ] **Step 5: Commit**

```bash
git add app-next/src/components/my-grammar/ app-next/src/app/globals.css
git commit -m "feat(my-grammar): GrammarHero — hero số liệu thật (port mock, deviation h1)"
```

---

### Task 6: `GrammarFilters`

**Files:**
- Create: `app-next/src/components/my-grammar/grammar-filters.tsx`
- Test: `app-next/src/components/my-grammar/__tests__/grammar-filters.test.tsx`

**Interfaces:**
- Produces: `GrammarChip` (chip inline, active = vermilion + ring) + `GrammarFilters({ level, onLevel, topic, onTopic, q, onQ, onAdd, result, searchRef }: { level: string; onLevel: (l: string) => void; topic: string; onTopic: (t: string) => void; q: string; onQ: (v: string) => void; onAdd: () => void; result: string; searchRef?: React.Ref<HTMLInputElement> })`.

- [ ] **Step 1: Write the failing test**

```tsx
// app-next/src/components/my-grammar/__tests__/grammar-filters.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act, fireEvent } from "@testing-library/react";
import { GrammarFilters } from "../grammar-filters";

afterEach(cleanup);

const base = {
  level: "HSK 4", onLevel: vi.fn(), topic: "all", onTopic: vi.fn(),
  q: "", onQ: vi.fn(), onAdd: vi.fn(), result: "2 cấu trúc · HSK 4 · mọi chủ điểm",
};

describe("GrammarFilters", () => {
  it("level ribbon đủ 7 chip + '+ Thêm cấu trúc mới'; HSK 4 active", () => {
    const { getByText } = render(<GrammarFilters {...base} />);
    expect(document.querySelectorAll('[role="group"][aria-label="Lọc theo cấp độ HSK"] button').length).toBe(8); // 7 chip + add
    expect(getByText("HSK 4").getAttribute("aria-pressed")).toBe("true");
    expect(getByText("+ Thêm cấu trúc mới")).toBeTruthy();
  });
  it("topic ribbon đủ 6 chip theo GRAMMAR_TOPICS; onTopic/onLevel/onAdd gọi đúng", () => {
    const onTopic = vi.fn();
    const onAdd = vi.fn();
    const { getByText } = render(<GrammarFilters {...base} onTopic={onTopic} onAdd={onAdd} />);
    expect(document.querySelectorAll('[role="group"][aria-label="Lọc theo chủ điểm"] button').length).toBe(6);
    expect(getByText("Câu chữ 把 / 被")).toBeTruthy();
    expect(getByText("⭐ Đã lưu")).toBeTruthy();
    act(() => getByText("Câu chữ 把 / 被").click());
    expect(onTopic).toHaveBeenCalledWith("ba");
    act(() => getByText("HSK 2").click());
    expect(base.onLevel).toHaveBeenCalledWith("HSK 2");
    act(() => getByText("+ Thêm cấu trúc mới").click());
    expect(onAdd).toHaveBeenCalledTimes(1);
  });
  it("result line aria-live + search kbd /", () => {
    const { getByText, getByLabelText } = render(<GrammarFilters {...base} />);
    expect(getByText("2 cấu trúc · HSK 4 · mọi chủ điểm").getAttribute("aria-live")).toBe("polite");
    expect(getByLabelText("Tìm kiếm cấu trúc ngữ pháp")).toBeTruthy();
    expect(document.querySelector("kbd")!.textContent).toBe("/");
  });
  it("search gõ → onQ", () => {
    const onQ = vi.fn();
    const { getByLabelText } = render(<GrammarFilters {...base} onQ={onQ} />);
    act(() => { fireEvent.change(getByLabelText("Tìm kiếm cấu trúc ngữ pháp"), { target: { value: "把" } }); });
    expect(onQ).toHaveBeenCalledWith("把");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && npx vitest run src/components/my-grammar/__tests__/grammar-filters.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Write the component**

```tsx
// app-next/src/components/my-grammar/grammar-filters.tsx
"use client";

/* Filters — port .filters/.chip/.btn-add của mock + search page-local (my-vocab precedent). */
import type { Ref } from "react";
import { Search } from "@/components/ui/icon";
import { GRAMMAR_LEVELS, GRAMMAR_TOPICS } from "@/content/grammar-points";
import { cn } from "@/lib/cn";

export function GrammarChip({
  pressed, onClick, children, className,
}: {
  pressed: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "min-h-10 whitespace-nowrap rounded-full border px-4 py-2 text-[12.5px] font-bold transition-colors",
        pressed
          ? "border-action-primary text-action-primary ring-3 ring-action-primary/15"
          : "border-border-subtle bg-surface-elevated text-text-secondary hover:border-border-strong hover:text-text-primary",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function GrammarFilters({
  level, onLevel, topic, onTopic, q, onQ, onAdd, result, searchRef,
}: {
  level: string;
  onLevel: (l: string) => void;
  topic: string;
  onTopic: (t: string) => void;
  q: string;
  onQ: (v: string) => void;
  onAdd: () => void;
  result: string;
  searchRef?: Ref<HTMLInputElement>;
}) {
  return (
    <section data-od-id="grammar-filters" aria-label="Bộ lọc ngữ pháp" className="flex flex-col gap-2.5">
      <div role="group" aria-label="Lọc theo cấp độ HSK" data-od-id="level-ribbon" className="flex flex-wrap items-center gap-2">
        <span className="min-w-[64px] text-[11px] font-bold tracking-[0.08em] text-text-secondary/70">Cấp độ</span>
        {GRAMMAR_LEVELS.map((l) => (
          <GrammarChip key={l} pressed={level === l} onClick={() => onLevel(l)}>{l === "all" ? "Tất cả" : l}</GrammarChip>
        ))}
        <button
          type="button"
          data-od-id="add-grammar"
          onClick={onAdd}
          className="ml-auto inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border-subtle bg-surface-muted px-4 text-[12.5px] font-bold text-text-primary hover:border-border-strong"
        >
          + Thêm cấu trúc mới
        </button>
      </div>
      <div role="group" aria-label="Lọc theo chủ điểm" data-od-id="topic-ribbon" className="flex flex-wrap items-center gap-2">
        <span className="min-w-[64px] text-[11px] font-bold tracking-[0.08em] text-text-secondary/70">Chủ điểm</span>
        {GRAMMAR_TOPICS.map(([key, label]) => (
          <GrammarChip key={key} pressed={topic === key} onClick={() => onTopic(key)}>{label}</GrammarChip>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <p className="text-[12.5px] text-text-secondary" aria-live="polite" data-testid="result-line">{result}</p>
        <label className="ml-auto flex h-11 min-w-[200px] flex-[0_1_280px] items-center gap-2 rounded-full border border-border-subtle bg-surface-elevated pl-3.5 pr-2">
          <Search size={15} strokeWidth={2} aria-hidden="true" className="shrink-0 text-text-secondary" />
          <input
            ref={searchRef}
            type="search"
            value={q}
            onChange={(e) => onQ(e.target.value)}
            placeholder="Tìm kiếm cấu trúc, ví dụ..."
            aria-label="Tìm kiếm cấu trúc ngữ pháp"
            className="w-full border-0 bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-secondary/60"
          />
          <kbd className="rounded-md border border-border-subtle bg-surface-muted px-2 py-0.5 text-[11px] font-bold text-text-secondary">/</kbd>
        </label>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app-next && npx vitest run src/components/my-grammar/__tests__/grammar-filters.test.tsx`
Expected: PASS (4 test).

- [ ] **Step 5: Commit**

```bash
git add app-next/src/components/my-grammar/grammar-filters.tsx app-next/src/components/my-grammar/__tests__/grammar-filters.test.tsx
git commit -m "feat(my-grammar): GrammarFilters — level/topic ribbon + search + result line (port mock)"
```

---

### Task 7: `GrammarCard`

**Files:**
- Create: `app-next/src/components/my-grammar/grammar-card.tsx`
- Test: `app-next/src/components/my-grammar/__tests__/grammar-card.test.tsx`

**Interfaces:**
- Consumes: `GrammarPoint`, `Link` (next/link), `useTts` (speak example tự lo trong card).
- Produces: `GrammarCard({ point, saved, onToggleSave, onMenu }: { point: GrammarPoint; saved: boolean; onToggleSave: (id: string) => void; onMenu: (id: string) => void })`.

- [ ] **Step 1: Write the failing test**

```tsx
// app-next/src/components/my-grammar/__tests__/grammar-card.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { GRAMMAR_POINTS } from "@/content/grammar-points";
import { GrammarCard } from "../grammar-card";

const speakMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/tts/use-tts", () => ({
  useTts: () => ({ speak: speakMock, cancel: () => {}, speaking: false }),
}));

afterEach(() => { cleanup(); speakMock.mockClear(); });

const ba = GRAMMAR_POINTS[0];

describe("GrammarCard", () => {
  it("level pill + title + hz + def + formula blocks (key jade) nối +", () => {
    const { container, getByOD } = render(
      <GrammarCard point={ba} saved={false} onToggleSave={() => {}} onMenu={() => {}} />,
    );
    expect(getByOD("grammar-ba").textContent).toContain("CÂU CHỮ 把");
    expect(getByOD("grammar-ba").textContent).toContain("把字句");
    expect(getByOD("grammar-ba").textContent).toContain("HSK 3");
    expect(document.body.textContent).toContain("Xử lý tân ngữ và kết quả hành động");
    const blocks = container.querySelectorAll("[data-formula] > span[data-block]");
    expect(blocks.length).toBe(ba.formula.length);
    expect(container.querySelectorAll("[data-formula] > [data-plus]").length).toBe(ba.formula.length - 1);
    const keyBlock = container.querySelector('[data-block="key"]')!;
    expect(keyBlock.textContent).toBe("把");
    expect(keyBlock.className).toContain("bg-jade-wash");
  });
  it("pitfall: 'Bẫy người Việt:' + <b>bold</b> + rest ghép đúng (Review Focus #1)", () => {
    render(<GrammarCard point={ba} saved={false} onToggleSave={() => {}} onMenu={() => {}} />);
    expect(document.body.textContent).toContain("Bẫy người Việt:");
    expect(document.body.textContent).toContain(
      "Động từ không được đứng đơn độc sau tân ngữ — phải có bổ ngữ, 了, hoặc thành phần khác."
    );
    const bold = document.querySelector("[data-pitfall] b")!;
    expect(bold.textContent).toBe("không được đứng đơn độc");
  });
  it("ví dụ: đủ hz/py/vi + speak từng câu (rate 0.95) + toast copy ở root", () => {
    const { getByLabelText } = render(
      <GrammarCard point={ba} saved={false} onToggleSave={() => {}} onMenu={() => {}} />,
    );
    expect(document.body.textContent).toContain("VÍ DỤ NGỮ CẢNH");
    expect(document.body.textContent).toContain("请把书打开。");
    expect(document.body.textContent).toContain("Xin hãy mở sách ra.");
    act(() => getByLabelText("Nghe phát âm câu 1").click());
    expect(speakMock).toHaveBeenCalledWith("请把书打开。", { rate: 0.95 });
    act(() => getByLabelText("Nghe phát âm câu 2").click());
    expect(speakMock).toHaveBeenCalledWith("把门关上吧。", { rate: 0.95 });
  });
  it("★ aria-pressed theo saved + onToggleSave(id); ⋮ → onMenu(id); footer link /review", () => {
    const onToggleSave = vi.fn();
    const onMenu = vi.fn();
    const { getByLabelText, getByText, rerender } = render(
      <GrammarCard point={ba} saved={false} onToggleSave={onToggleSave} onMenu={onMenu} />,
    );
    const star = getByLabelText("Lưu cấu trúc");
    expect(star.getAttribute("aria-pressed")).toBe("false");
    act(() => star.click());
    expect(onToggleSave).toHaveBeenCalledWith("ba");
    act(() => getByLabelText("Tùy chọn").click());
    expect(onMenu).toHaveBeenCalledWith("ba");
    rerender(<GrammarCard point={ba} saved onToggleSave={onToggleSave} onMenu={onMenu} />);
    expect(getByLabelText("Lưu cấu trúc").getAttribute("aria-pressed")).toBe("true");
    expect(getByLabelText("Lưu cấu trúc").className).toContain("bg-amber-wash");
    expect(getByText("Luyện tập cấu trúc này").getAttribute("href")).toBe("/review");
  });
});

function getByOD(id: string) {
  return document.querySelector(`[data-od-id="${id}"]`) as HTMLElement;
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && npx vitest run src/components/my-grammar/__tests__/grammar-card.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Write the component**

```tsx
// app-next/src/components/my-grammar/grammar-card.tsx
"use client";

/* Card điểm ngữ pháp — port .gcard của mock: lvl pill, title, ★/⋮, def, formula
   blocks, pitfall (Bẫy người Việt), examples + 🔊, footer link review. */
import Link from "next/link";
import { useTts } from "@/lib/tts/use-tts";
import type { GrammarPoint } from "@/content/grammar-points";
import { cn } from "@/lib/cn";

export function GrammarCard({
  point, saved, onToggleSave, onMenu,
}: {
  point: GrammarPoint;
  saved: boolean;
  onToggleSave: (id: string) => void;
  onMenu: (id: string) => void;
}) {
  const { speak } = useTts();

  return (
    <article
      data-od-id={`grammar-${point.id}`}
      className="flex flex-col gap-3 rounded-[20px] border border-border-subtle bg-surface-elevated/85 p-5 shadow-xs transition-transform hover:-translate-y-0.5"
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 shrink-0 rounded-full border border-jade-line bg-jade-wash px-2.5 py-[3px] text-[10.5px] font-bold" style={{ color: "var(--hz-jade-ink, #144d38)" }}>
          {point.level}
        </span>
        <div className="text-[15px] font-bold leading-[1.4] text-text-primary">
          📌 {point.title} <span className="zh text-[17px]">({point.hz})</span>
        </div>
        <div className="ml-auto flex shrink-0 gap-1.5">
          <button
            type="button"
            aria-label="Lưu cấu trúc"
            aria-pressed={saved}
            onClick={() => onToggleSave(point.id)}
            className={cn(
              "grid h-9 w-9 place-items-center rounded-[9px] border border-border-subtle bg-surface-elevated text-[15px]",
              saved ? "border-amber-line bg-amber-wash text-amber-ink" : "text-text-secondary hover:border-border-strong hover:text-text-primary",
            )}
          >
            ★
          </button>
          <button
            type="button"
            aria-label="Tùy chọn"
            onClick={() => onMenu(point.id)}
            className="grid h-9 w-9 place-items-center rounded-[9px] border border-border-subtle bg-surface-elevated text-[15px] text-text-secondary hover:border-border-strong hover:text-text-primary"
          >
            ⋮
          </button>
        </div>
      </div>

      <p className="text-[13px] text-text-secondary">{point.def}</p>

      <div
        data-formula
        aria-label="Công thức cấu trúc"
        className="flex flex-wrap items-center gap-1.5 rounded-xl border border-dashed border-border-subtle bg-surface-paper px-3 py-2.5"
      >
        {point.formula.map(([label, key], i) => (
          <span key={label + i} className="contents">
            {i > 0 && <span data-plus className="text-xs font-bold text-text-secondary/70">+</span>}
            <span
              data-block={key === "key" ? "key" : "plain"}
              className={cn(
                "whitespace-nowrap rounded-lg border px-[11px] py-[5px] text-[12.5px] font-bold",
                key === "key"
                  ? "zh border-learning-mastered bg-jade-wash text-[14px] text-[color:var(--hz-jade-ink,#144d38)]"
                  : "border-border-subtle bg-surface-muted text-text-primary",
              )}
            >
              {label}
            </span>
          </span>
        ))}
      </div>

      <div data-pitfall className="flex gap-2 rounded-[10px] border border-amber-line border-l-[3px] border-l-learning-progress bg-amber-wash px-3 py-2.5 text-[12.5px] text-text-primary">
        <span aria-hidden="true">⚠️</span>
        <span>
          <b className="text-amber-ink">Bẫy người Việt:</b> {point.pitfall[0]}
          <b className="text-amber-ink">{point.pitfall[1]}</b>
          {point.pitfall[2]}
        </span>
      </div>

      <div className="flex flex-col gap-2.5 border-t border-border-subtle pt-2.5">
        <span className="text-[11px] font-bold tracking-[0.08em] text-text-secondary/70">VÍ DỤ NGỮ CẢNH</span>
        {point.ex.map((e, i) => (
          <div key={e.hz} className="grid grid-cols-[1fr_auto] items-center gap-x-2.5 gap-y-1">
            <div>
              <div className="zh text-[19px] leading-[1.6] text-text-primary">{e.hz}</div>
              <div className="text-[12.5px] text-text-secondary">{e.py}</div>
              <div className="text-[13px] text-text-primary">{e.vi}</div>
            </div>
            <button
              type="button"
              aria-label={`Nghe phát âm câu ${i + 1}`}
              onClick={() => speak(e.hz, { rate: 0.95 })}
              className="grid h-10 w-10 place-items-center self-center rounded-full border border-border-subtle bg-surface-elevated text-base text-[color:var(--hz-jade-ink,#144d38)] hover:border-learning-mastered hover:bg-jade-wash"
            >
              🔊
            </button>
          </div>
        ))}
      </div>

      <Link
        href="/review"
        className="mt-0.5 inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-[11px] border border-border-subtle bg-surface-muted px-4 text-[12.5px] font-bold text-text-primary hover:border-border-strong"
      >
        Luyện tập cấu trúc này
      </Link>
    </article>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app-next && npx vitest run src/components/my-grammar/__tests__/grammar-card.test.tsx`
Expected: PASS (4 test).

- [ ] **Step 5: Commit**

```bash
git add app-next/src/components/my-grammar/grammar-card.tsx app-next/src/components/my-grammar/__tests__/grammar-card.test.tsx
git commit -m "feat(my-grammar): GrammarCard — formula/pitfall/examples + ★ save (port mock)"
```

---

### Task 8: Root `MyGrammarRoot` + page

**Files:**
- Create: `app-next/src/components/my-grammar/my-grammar-root.tsx`
- Modify: `app-next/src/app/(wide)/my-grammar/page.tsx` (thay body, giữ LoginGate)
- Test: `app-next/src/components/my-grammar/__tests__/my-grammar-root.test.tsx`

**Interfaces:**
- Consumes: Task 1–7 + `progressStore` + `useKeyboard` + `useToastSafe` + `useRouter`.
- Produces: `default export MyGrammarRoot()`.

- [ ] **Step 1: Write the failing test**

```tsx
// app-next/src/components/my-grammar/__tests__/my-grammar-root.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import MyGrammarRoot from "../my-grammar-root";
import { progressStore } from "@/lib/store/progress-store";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: () => {}, back: () => {} }),
}));

function getByOD(id: string) {
  return document.querySelector(`[data-od-id="${id}"]`) as HTMLElement;
}
const cardIds = () => [...document.querySelectorAll('[data-od-id^="grammar-"]')].map((el) => el.getAttribute("data-od-id"));

beforeEach(() => {
  localStorage.clear();
  pushMock.mockReset();
});
afterEach(cleanup);

describe("MyGrammarRoot", () => {
  it("Review Focus #3: mặc định level HSK 4 → đúng 2 card (lian, yue) + hero + result line", () => {
    render(<MyGrammarRoot />);
    expect(getByOD("grammar-hero")).toBeTruthy();
    expect(cardIds()).toEqual(["grammar-lian", "grammar-yue"]);
    expect(document.querySelector('[data-testid="result-line"]')!.textContent).toBe("2 cấu trúc · HSK 4 · mọi chủ điểm");
  });

  it("'Tất cả' (level) → 6 card; topic ba → 2 card (ba, bei) + result line dùng label", () => {
    const { getByText } = render(<MyGrammarRoot />);
    act(() => getByText("Tất cả", { selector: '[aria-label="Lọc theo cấp độ HSK"] button' }).click());
    expect(cardIds().length).toBe(6);
    act(() => getByText("Câu chữ 把 / 被").click());
    expect(cardIds()).toEqual(["grammar-ba", "grammar-bei"]);
    expect(document.querySelector('[data-testid="result-line"]')!.textContent).toContain("Câu chữ 把 / 被");
  });

  it("Review Focus #2: topic 'Đã lưu' khi chưa lưu → empty state + result '0 cấu trúc'", () => {
    const { getByText } = render(<MyGrammarRoot />);
    act(() => getByText("⭐ Đã lưu").click());
    expect(cardIds().length).toBe(0);
    expect(document.body.textContent).toContain("Không tìm thấy cấu trúc phù hợp. Thử từ khóa khác hoặc bấm “Tất cả”.");
    expect(document.querySelector('[data-testid="result-line"]')!.textContent).toBe("0 cấu trúc · HSK 4 · ⭐ Đã lưu");
  });

  it("Review Focus #4: ★ toggle lưu store + toast copy; grid sync qua bye:progress", () => {
    const { getByLabelText, getByText } = render(<MyGrammarRoot />);
    const star = getByLabelText("Lưu cấu trúc"); // card đầu = lian (HSK 4)
    act(() => star.click());
    expect(progressStore.getGrammarMeta()["lian"]).toEqual({ saved: 1 });
    act(() => getByText("⭐ Đã lưu").click());
    expect(cardIds()).toEqual(["grammar-lian"]);
    act(() => getByLabelText("Lưu cấu trúc").click()); // bỏ lưu
    expect(cardIds().length).toBe(0); // sync qua event
    expect(progressStore.getGrammarMeta()["lian"]).toBeUndefined();
  });

  it("search 'so sánh' → card bi (kết hợp level all) (Review Focus #5)", () => {
    const { getByText, getByLabelText } = render(<MyGrammarRoot />);
    act(() => getByText("Tất cả", { selector: '[aria-label="Lọc theo cấp độ HSK"] button' }).click()); // level all
    const input = getByLabelText("Tìm kiếm cấu trúc ngữ pháp") as HTMLInputElement;
    act(() => { fireEvent.change(input, { target: { value: "so sánh" } }); });
    expect(cardIds()).toEqual(["grammar-bi"]);
  });

  it("'/' focus search; add/menu toast demo copy mock", () => {
    render(<MyGrammarRoot />);
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "/", bubbles: true })); });
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Tìm kiếm cấu trúc ngữ pháp");
    // toast demo: useToastSafe no-op trong mount đơn lẻ — pin qua code (copy mock trong root)
  });
});
```

(`fireEvent` import từ `@testing-library/react`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && npx vitest run src/components/my-grammar/__tests__/my-grammar-root.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Write the root + page**

```tsx
// app-next/src/components/my-grammar/my-grammar-root.tsx
"use client";

/* Sổ tay ngữ pháp root — port 1:1 opendesign_hsk/my-grammar.html (spec 2026-10-05).
   Content tĩnh GRAMMAR_POINTS + saved qua bye.grammarMeta. Default level "HSK 4" đúng mock.
   Keyboard "/" focus search. Toast demo cho add/menu đúng copy mock. */
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GRAMMAR_POINTS, GRAMMAR_TOPICS } from "@/content/grammar-points";
import { filterPoints, grammarHero } from "@/lib/my-grammar";
import { progressStore } from "@/lib/store/progress-store";
import { useKeyboard } from "@/lib/use-keyboard";
import { useToastSafe } from "@/components/shell/toast-provider";
import { GrammarHero } from "./grammar-hero";
import { GrammarFilters } from "./grammar-filters";
import { GrammarCard } from "./grammar-card";

export default function MyGrammarRoot() {
  const router = useRouter();
  const toast = useToastSafe();
  const [mounted, setMounted] = useState(false);
  const [level, setLevel] = useState("HSK 4"); // mock mở ở HSK 4
  const [topic, setTopic] = useState<string>("all");
  const [q, setQ] = useState("");
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setMounted(true);
    setSavedIds(
      Object.entries(progressStore.getGrammarMeta())
        .filter(([, m]) => m.saved)
        .map(([id]) => id),
    );
  }, []);

  /* sync khi toggle phát bye:progress */
  useEffect(() => {
    const refresh = () =>
      setSavedIds(
        Object.entries(progressStore.getGrammarMeta())
          .filter(([, m]) => m.saved)
          .map(([id]) => id),
      );
    window.addEventListener("bye:progress", refresh);
    return () => window.removeEventListener("bye:progress", refresh);
  }, []);

  const filtered = useMemo(
    () => (mounted ? filterPoints(GRAMMAR_POINTS, { level, topic, q }, savedIds) : []),
    [mounted, level, topic, q, savedIds],
  );
  const hero = useMemo(
    () => (mounted ? grammarHero(GRAMMAR_POINTS, savedIds) : { total: 0, savedCount: 0, topLevel: null, topCount: 0 }),
    [mounted, savedIds],
  );

  useKeyboard({
    "/": (e) => { e.preventDefault(); searchRef.current?.focus(); },
  });

  const topicLabel = topic === "all" ? "mọi chủ điểm" : (GRAMMAR_TOPICS.find(([k]) => k === topic)?.[1] ?? topic);

  return (
    <div className="flex flex-col gap-4">
      <GrammarHero
        total={hero.total}
        savedCount={hero.savedCount}
        topLevel={hero.topLevel}
        topCount={hero.topCount}
        onReview={() => router.push("/review")}
      />

      <GrammarFilters
        level={level}
        onLevel={setLevel}
        topic={topic}
        onTopic={setTopic}
        q={q}
        onQ={setQ}
        onAdd={() => toast("Tạo cấu trúc mới: nhập tên + công thức + 1 ví dụ để lưu")}
        result={`${filtered.length} cấu trúc · ${level} · ${topicLabel}`}
        searchRef={searchRef}
      />

      {filtered.length > 0 ? (
        <section data-od-id="grammar-grid" aria-label="Lưới thẻ điểm ngữ pháp" className="grid grid-cols-1 gap-5 min-[901px]:grid-cols-2">
          {filtered.map((p) => (
            <GrammarCard
              key={p.id}
              point={p}
              saved={savedIds.includes(p.id)}
              onToggleSave={(id) => {
                const saved = progressStore.toggleGrammarSaved(id);
                toast(saved ? `Đã lưu ★ ${GRAMMAR_POINTS.find((x) => x.id === id)!.title}` : `Đã bỏ lưu ${GRAMMAR_POINTS.find((x) => x.id === id)!.title}`);
              }}
              onMenu={(id) => toast("Tùy chọn: ghim · ẩn ví dụ · báo lỗi công thức")}
            />
          ))}
        </section>
      ) : (
        <div className="rounded-[20px] border border-border-subtle bg-surface-elevated/85 p-9 text-center text-[13.5px] text-text-secondary shadow-xs">
          Không tìm thấy cấu trúc phù hợp. Thử từ khóa khác hoặc bấm “Tất cả”.
        </div>
      )}
    </div>
  );
}
```

```tsx
// app-next/src/app/(wide)/my-grammar/page.tsx (thay toàn bộ)
/* /my-grammar — Sổ tay ngữ pháp (port opendesign_hsk/my-grammar.html, spec 2026-10-05).
   LoginGate giữ nguyên; content + saved store trong MyGrammarRoot. */

import type { Metadata } from "next";
import { LoginGate } from "@/components/personal/login-gate";
import { notebookSubGate } from "@/content/notebooks";
import MyGrammarRoot from "@/components/my-grammar/my-grammar-root";

export const metadata: Metadata = { title: "Sổ tay ngữ pháp" };

export default function MyGrammarPage() {
  return (
    <LoginGate pageSub={notebookSubGate.grammar}>
      <MyGrammarRoot />
    </LoginGate>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `cd app-next && npx vitest run src/components/my-grammar src/lib/__tests__/my-grammar.test.ts`
Expected: PASS — toàn bộ test my-grammar (root 6 + các task trước).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(my-grammar): Sổ tay ngữ pháp mới — hero/filters/grid + saved store"
```

---

### Task 9: Verification toàn bộ

**Files:** không tạo/sửa (chỉ chạy kiểm chứng; sửa nếu phát hiện lỗi).

- [ ] **Step 1: Typecheck + lint + toàn bộ unit tests**

```bash
cd app-next && npm run typecheck && npm run lint && npm test
```

Expected: cả 3 sạch; suite đầy đủ PASS (tests notebook-list/detail giữ nguyên — không đụng).

- [ ] **Step 2: Build production**

```bash
cd app-next && npm run build
```

Expected: build thành công; `/my-grammar` trong output.

- [ ] **Step 3: Soát trực quan bằng browser (spec §4–§6)**

```bash
cd app-next && npm run dev
```

Dùng skill browser-use mở `http://localhost:3100/my-grammar` (đăng nhập session test nếu cần) và kiểm:
1. Hero: pills + CTA; ★ toggle → pill "⭐ N yêu thích" tăng, toast copy mock.
2. Level ribbon: mặc định HSK 4 (2 card) → "Tất cả" (6); chủ điểm lọc; result line cập nhật.
3. Card: formula blocks key jade; pitfall bold đúng; 🔊 phát âm từng ví dụ; ⋮ toast.
4. Search "把"/"so sánh"; "/" focus; empty state khi search rác.
5. Dark mode tương phản (hero, formula key, pitfall amber).
6. So khớp với `opendesign_hsk/my-grammar.html` mở cạnh bên (viewport 1280px).

Lỗi tìm thấy → sửa + chạy lại Step 1, commit `fix(my-grammar): …`.

- [ ] **Step 4: Commit cuối (nếu có fix) + báo cáo**

```bash
git status --short
```

Expected: sạch. Báo cáo kết quả vào message kết thúc phiên.
