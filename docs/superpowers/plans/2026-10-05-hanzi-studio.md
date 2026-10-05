# Hanzi Studio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port 100% mock `opendesign_hsk/hanzi.html` ("Hanzi Studio — 汉字工坊") thành trang `/hanzi` mới trong `app-next`, thay thế hoàn toàn màn "Phân tích Hán tự".

**Architecture:** Route group `(wide)` mới cho container 1280px; client root `hanzi-studio.tsx` sở hữu state lọc/chọn/mode/pane; presentational components trong `src/components/hanzi/studio/`; hook `useStudioStrokes` port animation bút thuận; pure lib `stroke-quiz.ts` chấm điểm hướng nét; content module `hanzi-studio.ts` chứa 12 chữ demo.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind v4 (semantic tokens trong `globals.css`), vitest + testing-library (jsdom).

**Spec:** `docs/superpowers/specs/2026-10-05-hanzi-studio-design.md` — executors đọc cả spec và plan.

## Global Constraints

- Mọi màu dùng semantic token (`action-primary`, `learning-mastered`, `amber-wash`, `surface-muted`, `border-subtle`…) — cấm hard-code hex (design system skill).
- Glyph Hán luôn kèm class `zh` (font Noto Sans SC), không dùng font Inter cho chữ Hán.
- Min touch target 44px (`min-h-11`) cho nút bấm thường; pager/zcard giữ min-h theo mock (40px/128px đã ≥ 44 hoặc là control nhỏ có `min-h-10`).
- Giữ nguyên copy tiếng Việt của mock: "Kho Hán tự", "Xem mẫu bút thuận", "Tự luyện viết (chấm điểm)", "Nét trước/Phát lại/Nét sau", "Xóa bảng/Hoàn tác/Gợi ý nét mờ", "Độ chuẩn xác", "BỘ THỦ/CẤU TRÚC/ÂM HÁN-VIỆT", "Mẹo nhớ", "Không có chữ nào khớp bộ lọc."
- Giữ `data-od-id` của mock làm hook e2e/test.
- Không đụng `content/hanzi.ts`, `content/hanzi-strokes.ts`, `components/hanzi/{draw-pad,draw-modal,stroke-player}.tsx`, `/hanzi/[char]` — chúng phục vụ nơi khác.
- `search-card.tsx` GIỮ (dùng bởi `hanzi-detail.tsx`); chỉ `hanzi-home.tsx` + test của nó bị xoá (Task 9).
- Test: vitest, `globals: true` (describe/it/expect global nhưng file hiện tại import tường minh — làm theo style import tường minh từ `vitest`).
- Chạy test 1 file: `npx vitest run <path>` (cwd `app-next/`).

## Review Focus

1. **Filter đổi làm `page` vượt số trang** — kỳ vọng: luôn kẹp về trang hợp lệ (`clampPage`), không render list rỗng do slice ngoài range. → Test pin ở Task 9.
2. **Vẽ quá số nét của chữ (idx vượt `d.length`)** — kỳ vọng: không crash, nét thừa vẫn được chấm theo hướng nét mẫu cuối. → Test pin ở Task 6.
3. **Nét quá ngắn (chấm/DOT) và nét gập (T)** — kỳ vọng: DOT chỉ được chấp nhận khi nét mẫu là SE/S; T chỉ cần > 4 điểm. → Test pin ở Task 2.
4. **Đổi chữ giữa lúc đang phát animation** — kỳ vọng: timer cũ bị huỷ, không set class lên path của chữ mới, không văng exception. → Test pin ở Task 5.
5. **Chọn chữ trên mobile (<1024px) phải chuyển sang pane "Bàn luyện viết"; desktop giữ cả 2 pane** — kỳ vọng theo mock `select()`. → Test pin ở Task 9.

*(Ngoài test: soát thủ công dark mode — nét `todo`/`hint` phải còn thấy được trên nền `#111318`.)*

---

### Task 1: Content module `hanzi-studio.ts`

**Files:**
- Create: `app-next/src/content/hanzi-studio.ts`
- Test: `app-next/src/content/__tests__/hanzi-studio.test.ts`

**Interfaces:**
- Consumes: không (data thuần).
- Produces: `type StrokeDir = "E" | "SE" | "S" | "SW" | "W" | "N" | "NE" | "T"`; `type StudioChar` (fields `ch, py, hv, mean, n, hsk, st, rad, struct, tip, order, d, p`); `STUDIO_CHARS: StudioChar[]` (12 chữ); `STUDIO_LEVELS`; `type StudioLevel`.

- [ ] **Step 1: Write the failing test**

```ts
// app-next/src/content/__tests__/hanzi-studio.test.ts
import { describe, it, expect } from "vitest";
import { STUDIO_CHARS, STUDIO_LEVELS } from "../hanzi-studio";

describe("STUDIO_CHARS (dữ liệu demo 12 chữ — port mock)", () => {
  it("đủ 12 chữ đúng thứ tự mock, không trùng", () => {
    expect(STUDIO_CHARS.map((c) => c.ch)).toEqual(
      ["爱", "好", "人", "大", "国", "汉", "书", "口", "日", "木", "水", "心"]
    );
  });

  it("mỗi chữ: d.length === p.length === order.length === n", () => {
    for (const c of STUDIO_CHARS) {
      expect(c.d.length, `${c.ch}: d`).toBe(c.n);
      expect(c.p.length, `${c.ch}: p`).toBe(c.n);
      expect(c.order.length, `${c.ch}: order`).toBe(c.n);
    }
  });

  it("hsk thuộc bảng level (trừ 'all'); st chỉ là done/mid/new", () => {
    const levels = STUDIO_LEVELS.filter((l) => l !== "all");
    for (const c of STUDIO_CHARS) {
      expect(levels, `${c.ch}: hsk`).toContain(c.hsk);
      expect(["done", "mid", "new"], `${c.ch}: st`).toContain(c.st);
    }
  });

  it("mỗi path là SVG path 300×300 bắt đầu bằng M", () => {
    for (const c of STUDIO_CHARS) {
      for (const p of c.p) expect(p.startsWith("M"), `${c.ch}: ${p.slice(0, 12)}`).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && npx vitest run src/content/__tests__/hanzi-studio.test.ts`
Expected: FAIL — không resolve được `../hanzi-studio`.

- [ ] **Step 3: Write the data module**

Port nguyên 12 chữ từ `opendesign_hsk/hanzi.html` (mảng `CHARS`, dòng 259–293) — copy chính xác từng ký tự:

```ts
// app-next/src/content/hanzi-studio.ts
/* Hanzi Studio — 12 chữ demo, port 1:1 CHARS array của opendesign_hsk/hanzi.html.
   Spec 2026-10-05 §1: demo data tách biệt (st done/mid/new hardcode), sau này swap
   ra data thật mà không đụng UI. Không liên quan content/hanzi.ts (màn [char]). */

export type StrokeDir = "E" | "SE" | "S" | "SW" | "W" | "N" | "NE" | "T";

export type StudioChar = {
  ch: string;
  py: string;
  hv: string;
  mean: string;
  n: number;
  hsk: "HSK 1" | "HSK 2" | "HSK 3" | "HSK 4-6";
  st: "done" | "mid" | "new";
  rad: string;      // "爫 (Trảo)" — render tách phần Hán đầu + phần mô tả sau
  struct: string;
  tip: string;
  order: [string, string][]; // tên nét + tên pinyin của nét
  d: StrokeDir[];   // hướng mong muốn mỗi nét (input chấm điểm; "T" = nét gập)
  p: string[];      // SVG path 300×300 mỗi nét
};

export const STUDIO_LEVELS = ["all", "HSK 1", "HSK 2", "HSK 3", "HSK 4-6"] as const;
export type StudioLevel = (typeof STUDIO_LEVELS)[number];

export const STUDIO_CHARS: StudioChar[] = [
  { ch: "爱", py: "ài", hv: "ÁI", mean: "Yêu, thích, quý trọng", n: 10, hsk: "HSK 2", st: "new", rad: "爫 (Trảo)", struct: "Trên – Giữa – Dưới", tip: "Trên là móng vuốt (爫), dưới là bạn bè (友) che chở — yêu là nâng niu, che chở.",
    order: [["Phẩy", "piě"], ["Chấm", "diǎn"], ["Chấm", "diǎn"], ["Phẩy", "piě"], ["Chấm", "diǎn"], ["Phẩy ngang", "héngpiě"], ["Ngang", "héng"], ["Phẩy", "piě"], ["Phẩy ngang", "héngpiě"], ["Mác", "nà"]],
    d: ["SW", "SE", "SE", "SW", "SE", "E", "E", "SW", "E", "SE"],
    p: ["M156,32 C140,58 124,76 108,92", "M188,58 C190,66 191,74 192,82", "M132,96 C134,102 135,108 136,114", "M92,130 C140,128 185,124 216,102", "M150,148 C151,154 152,160 153,166", "M120,176 C150,174 180,174 200,170", "M100,196 C135,195 170,195 205,193", "M150,206 C136,226 123,242 111,256", "M102,262 C142,260 184,255 216,240", "M152,212 C172,230 192,246 212,258"] },
  { ch: "好", py: "hǎo · hào", hv: "HẢO · HIẾU", mean: "Tốt đẹp; yêu thích", n: 6, hsk: "HSK 2", st: "mid", rad: "女 (Nữ)", struct: "Trái – Phải", tip: "Người phụ nữ (女) bên đứa trẻ (子) — điều tốt đẹp. Trong 爱好 đọc là hào.",
    order: [["Gập phẩy", "zhépiě"], ["Phẩy", "piě"], ["Ngang", "héng"], ["Phẩy ngang", "héngpiě"], ["Sổ móc", "shùgōu"], ["Ngang", "héng"]],
    d: ["T", "SW", "E", "E", "S", "E"],
    p: ["M118,66 C104,116 92,158 76,202", "M148,84 C134,122 120,156 104,190", "M70,205 C100,203 125,203 150,201", "M168,112 C200,110 228,106 248,96", "M208,116 C208,160 208,200 206,232 C205,242 197,246 190,242", "M165,248 C195,246 222,246 250,244"] },
  { ch: "人", py: "rén", hv: "NHÂN", mean: "Người", n: 2, hsk: "HSK 1", st: "done", rad: "人 (Nhân)", struct: "Độc thể", tip: "Một nét phẩy, một nét mác — hình người đang bước.",
    order: [["Phẩy", "piě"], ["Mác", "nà"]], d: ["SW", "SE"],
    p: ["M150,60 C135,110 115,155 90,200", "M150,60 C165,110 185,155 210,200"] },
  { ch: "大", py: "dà", hv: "ĐẠI", mean: "Lớn, to", n: 3, hsk: "HSK 1", st: "done", rad: "大 (Đại)", struct: "Độc thể", tip: "Người (人) dang tay rộng — to lớn.",
    order: [["Ngang", "héng"], ["Phẩy", "piě"], ["Mác", "nà"]], d: ["E", "SW", "SE"],
    p: ["M80,90 C120,89 180,89 220,88", "M150,90 C135,135 115,175 95,215", "M150,90 C165,135 185,175 205,215"] },
  { ch: "国", py: "guó", hv: "QUỐC", mean: "Đất nước", n: 8, hsk: "HSK 2", st: "new", rad: "囗 (Vi)", struct: "Bao quanh", tip: "Khung bao (囗) ôm viên ngọc (玉) — đất nước giữ báu vật.",
    order: [["Sổ", "shù"], ["Gập ngang", "héngzhé"], ["Ngang", "héng"], ["Ngang", "héng"], ["Ngang", "héng"], ["Sổ", "shù"], ["Ngang", "héng"], ["Sổ", "shù"]],
    d: ["S", "T", "E", "E", "E", "S", "E", "S"],
    p: ["M85,85 C85,128 85,172 85,215", "M85,85 C128,85 172,85 215,85 C215,128 215,172 215,215", "M85,215 C128,215 172,215 215,215", "M120,125 C140,125 160,125 180,125", "M120,148 C140,148 160,148 180,148", "M150,125 C150,145 150,165 150,185", "M120,185 C140,185 160,185 180,185", "M168,148 C168,164 168,180 168,196"] },
  { ch: "汉", py: "hàn", hv: "HÁN", mean: "Dân tộc Hán; Trung Quốc", n: 5, hsk: "HSK 2", st: "mid", rad: "氵 (Thủy)", struct: "Trái – Phải", tip: "Ba chấm nước (氵) bên chữ viết tắt của “người” — tên dân tộc.",
    order: [["Chấm", "diǎn"], ["Chấm", "diǎn"], ["Hất", "tí"], ["Phẩy ngang", "héngpiě"], ["Mác", "nà"]],
    d: ["SE", "SE", "E", "E", "SE"],
    p: ["M115,78 C116,84 117,90 118,96", "M135,112 C136,118 137,124 138,130", "M118,152 C132,148 146,142 158,134", "M170,120 C200,118 225,114 245,104", "M190,150 C205,170 220,188 238,202"] },
  { ch: "书", py: "shū", hv: "THƯ", mean: "Sách; viết", n: 4, hsk: "HSK 2", st: "new", rad: "乙 (Ất)", struct: "Độc thể", tip: "Nét折叠层 như trang sách gấp — viết thành sách.",
    order: [["Gập ngang", "héngzhé"], ["Gập ngang móc", "héngzhégōu"], ["Sổ", "shù"], ["Chấm", "diǎn"]],
    d: ["T", "T", "S", "SE"],
    p: ["M100,80 C133,80 166,80 200,80 C200,100 200,120 200,140", "M100,140 C133,140 166,140 195,140 C195,165 195,190 192,212 C191,221 183,224 175,220", "M150,140 C150,170 150,200 150,230", "M150,248 C151,252 152,256 153,260"] },
  { ch: "口", py: "kǒu", hv: "KHẨU", mean: "Miệng", n: 3, hsk: "HSK 1", st: "done", rad: "口 (Khẩu)", struct: "Độc thể", tip: "Khung vuông mở — cái miệng đang nói.",
    order: [["Sổ", "shù"], ["Gập ngang", "héngzhé"], ["Ngang", "héng"]], d: ["S", "T", "E"],
    p: ["M100,90 C100,130 100,170 100,210", "M100,90 C133,90 166,90 200,90 C200,130 200,170 200,210", "M100,210 C133,210 166,210 200,210"] },
  { ch: "日", py: "rì", hv: "NHẬT", mean: "Ngày; mặt trời", n: 4, hsk: "HSK 1", st: "done", rad: "日 (Nhật)", struct: "Độc thể", tip: "Ô vuông thêm nét ngang giữa — mặt trời lên.",
    order: [["Sổ", "shù"], ["Gập ngang", "héngzhé"], ["Ngang", "héng"], ["Ngang", "héng"]], d: ["S", "T", "E", "E"],
    p: ["M110,80 C110,127 110,173 110,220", "M110,80 C137,80 163,80 190,80 C190,127 190,173 190,220", "M110,150 C137,150 163,150 190,150", "M110,220 C137,220 163,220 190,220"] },
  { ch: "木", py: "mù", hv: "MỘC", mean: "Gỗ, cây", n: 4, hsk: "HSK 2", st: "mid", rad: "木 (Mộc)", struct: "Độc thể", tip: "Cây có cành phẩy – mác hai bên thân sổ.",
    order: [["Ngang", "héng"], ["Sổ", "shù"], ["Phẩy", "piě"], ["Mác", "nà"]], d: ["E", "S", "SW", "SE"],
    p: ["M80,110 C120,109 180,109 220,108", "M150,70 C150,123 150,177 150,230", "M150,110 C130,140 110,170 95,200", "M150,110 C170,140 190,170 205,200"] },
  { ch: "水", py: "shuǐ", hv: "THỦY", mean: "Nước", n: 4, hsk: "HSK 2", st: "mid", rad: "水 (Thủy)", struct: "Độc thể", tip: "Dòng sổ móc giữa, hai bên phẩy – mác như nước bắn.",
    order: [["Sổ móc", "shùgōu"], ["Phẩy ngang", "héngpiě"], ["Phẩy", "piě"], ["Mác", "nà"]], d: ["S", "E", "SW", "SE"],
    p: ["M150,60 C150,110 150,150 150,185 C150,195 142,198 134,194", "M110,112 C150,110 190,108 222,98", "M150,122 C130,152 115,182 105,212", "M150,122 C170,152 190,182 206,210"] },
  { ch: "心", py: "xīn", hv: "TÂM", mean: "Trái tim; tâm trí", n: 4, hsk: "HSK 2", st: "done", rad: "心 (Tâm)", struct: "Độc thể", tip: "Nét卧钩 ôm hai chấm — trái tim包容.",
    order: [["Chấm", "diǎn"], ["Nét nằm móc", "wògōu"], ["Chấm", "diǎn"], ["Chấm", "diǎn"]], d: ["SE", "T", "SE", "SE"],
    p: ["M95,148 C96,154 97,160 98,166", "M95,150 C115,205 150,228 200,224 C214,223 221,216 222,206", "M168,148 C169,154 170,160 171,166", "M196,162 C197,168 198,174 199,180"] },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app-next && npx vitest run src/content/__tests__/hanzi-studio.test.ts`
Expected: PASS (4 test).

- [ ] **Step 5: Commit**

```bash
git add app-next/src/content/hanzi-studio.ts app-next/src/content/__tests__/hanzi-studio.test.ts
git commit -m "feat(content): hanzi-studio — 12 chữ demo port từ opendesign_hsk/hanzi.html"
```

---

### Task 2: Pure lib `stroke-quiz.ts`

**Files:**
- Create: `app-next/src/lib/hanzi/stroke-quiz.ts`
- Test: `app-next/src/lib/hanzi/__tests__/stroke-quiz.test.ts`

**Interfaces:**
- Consumes: `StrokeDir` từ `@/content/hanzi-studio`.
- Produces: `bucket(dx, dy): Bucket` (`"E"|"SE"|"S"|"SW"|"W"|"N"|"NE"|"DOT"`), `matchStroke(pts, exp): boolean`, `type InkPoint = { x: number; y: number }`.

- [ ] **Step 1: Write the failing test**

```ts
// app-next/src/lib/hanzi/__tests__/stroke-quiz.test.ts
import { describe, it, expect } from "vitest";
import { bucket, matchStroke } from "../stroke-quiz";

describe("bucket (8 hướng 45°, port mock)", () => {
  it("len < 14 → DOT bất kể hướng", () => {
    expect(bucket(5, 0)).toBe("DOT");
    expect(bucket(0, -10)).toBe("DOT");
    expect(bucket(9, 9)).toBe("DOT"); // hypot ≈ 12.7
  });
  it("ranh giới ±22.5° quanh trục", () => {
    expect(bucket(100, 0)).toBe("E");
    expect(bucket(100, 100)).toBe("SE");
    expect(bucket(0, 100)).toBe("S");
    expect(bucket(-100, 100)).toBe("SW");
    expect(bucket(-100, 0)).toBe("W");
    expect(bucket(-100, -100)).toBe("NE");
    expect(bucket(0, -100)).toBe("N");
    expect(bucket(100, -100)).toBe("NE"); // góc phần tư trên-phải
  });
  it("góc lẻ đúng ô", () => {
    expect(bucket(60, 20)).toBe("E");   // ~18°
    expect(bucket(60, 60)).toBe("SE");  // 45°
    expect(bucket(20, 60)).toBe("SE");  // ~72°
    expect(bucket(-50, 120)).toBe("SW");
  });
});

describe("matchStroke (so hướng đầu–cuối)", () => {
  const pts = (arr: [number, number][]) => arr.map(([x, y]) => ({ x, y }));
  it("T: chỉ cần > 4 điểm", () => {
    expect(matchStroke(pts([[0, 0], [5, 5], [10, 0], [15, 5], [20, 0], [25, 5]]), "T")).toBe(true);
    expect(matchStroke(pts([[0, 0], [10, 0], [20, 0]]), "T")).toBe(false);
  });
  it("DOT: chỉ chấp nhận khi exp là SE hoặc S", () => {
    expect(matchStroke(pts([[100, 100], [103, 102]]), "SE")).toBe(true);
    expect(matchStroke(pts([[100, 100], [103, 102]]), "S")).toBe(true);
    expect(matchStroke(pts([[100, 100], [103, 102]]), "E")).toBe(false);
  });
  it("đúng hướng / sai hướng", () => {
    expect(matchStroke(pts([[0, 0], [50, 3], [100, 0]]), "E")).toBe(true);
    expect(matchStroke(pts([[0, 0], [50, 3], [100, 0]]), "S")).toBe(false);
    expect(matchStroke(pts([[100, 0], [60, 50], [20, 100]]), "SW")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && npx vitest run src/lib/hanzi/__tests__/stroke-quiz.test.ts`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Write the implementation**

```ts
// app-next/src/lib/hanzi/stroke-quiz.ts
/* Chấm điểm nét vẽ tay — port 1:1 bucket()/matchStroke() của opendesign_hsk/hanzi.html.
   Pure functions (spec 2026-10-05 §3), không DOM. acc% tính tại UI: done ? round(ok/done*100) : null. */

import type { StrokeDir } from "@/content/hanzi-studio";

export type Bucket = "E" | "SE" | "S" | "SW" | "W" | "N" | "NE" | "DOT";
export type InkPoint = { x: number; y: number };

export function bucket(dx: number, dy: number): Bucket {
  const len = Math.hypot(dx, dy);
  if (len < 14) return "DOT";
  const a = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (a >= -22.5 && a < 22.5) return "E";
  if (a >= 22.5 && a < 67.5) return "SE";
  if (a >= 67.5 && a < 112.5) return "S";
  if ((a >= 112.5 && a < 157.5) || (a < -157.5 && a >= -180)) return "SW";
  if (a >= -157.5 && a < -112.5) return "W";
  if (a >= -67.5 && a < -22.5) return "NE";
  return "N";
}

export function matchStroke(pts: InkPoint[], exp: StrokeDir): boolean {
  if (exp === "T") return pts.length > 4;
  const f = pts[0];
  const l = pts[pts.length - 1];
  const b = bucket(l.x - f.x, l.y - f.y);
  if (b === "DOT") return exp === "SE" || exp === "S";
  return b === exp;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app-next && npx vitest run src/lib/hanzi/__tests__/stroke-quiz.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app-next/src/lib/hanzi/stroke-quiz.ts app-next/src/lib/hanzi/__tests__/stroke-quiz.test.ts
git commit -m "feat(lib): stroke-quiz — bucket 8 hướng + matchStroke port từ mock"
```

---

### Task 3: Route group `(wide)` + chuyển `/hanzi`

**Files:**
- Create: `app-next/src/app/(wide)/layout.tsx`
- Move: `app-next/src/app/(app)/hanzi/` → `app-next/src/app/(wide)/hanzi/` (git mv, giữ `[char]/`)

**Interfaces:**
- Consumes: không.
- Produces: vị trí mới `src/app/(wide)/hanzi/*` (URL vẫn `/hanzi`); Task 4–9 viết file vào `src/app/(wide)/hanzi/` và `src/components/hanzi/studio/`.

- [ ] **Step 1: Move thư mục bằng git mv**

```bash
cd app-next && mkdir -p "src/app/(wide)" && git mv "src/app/(app)/hanzi" "src/app/(wide)/hanzi"
```

- [ ] **Step 2: Create `(wide)/layout.tsx`**

```tsx
// app-next/src/app/(wide)/layout.tsx
/* Route group (wide) — container 1280px cho trang mock max-width lớn (Hanzi Studio,
   spec 2026-10-05 §4). Shell nằm ở root layout nên URL không đổi; (app) giữ max-w-5xl. */

export default function WideLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-[1280px] px-4 py-6 pb-28 lg:pb-6">{children}</div>;
}
```

- [ ] **Step 3: Verify không còn tham chiếu cũ + tests vẫn xanh**

Run: `cd app-next && grep -rn '(app)/hanzi' src ; npx vitest run "src/app/(wide)/hanzi" && npm run typecheck`
Expected: grep không ra kết quả nào; test `hanzi-home.test.tsx` (chưa xoá) PASS; typecheck sạch.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(app): route group (wide) 1280px + chuyển /hanzi khỏi (app)"
```

---

### Task 4: `SegControl` (segmented góc bo nhẹ)

**Files:**
- Create: `app-next/src/components/hanzi/studio/seg-control.tsx`
- Test: `app-next/src/components/hanzi/studio/__tests__/seg-control.test.tsx`

**Interfaces:**
- Consumes: `cn` từ `@/lib/cn`.
- Produces: `SegControl<K extends string>({ tabs: {key: K; label: ReactNode}[], value: K, onChange: (k: K) => void, label: string, radius?: "xl" | "2xl", className?: string })`.

- [ ] **Step 1: Write the failing test**

```tsx
// app-next/src/components/hanzi/studio/__tests__/seg-control.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { SegControl } from "../seg-control";

afterEach(cleanup);

const TABS = [
  { key: "a" as const, label: "Tab A" },
  { key: "b" as const, label: "Tab B" },
];

describe("SegControl", () => {
  it("aria-pressed theo value; label → aria-label group", () => {
    const { container } = render(
      <SegControl label="Nhóm" tabs={TABS} value="b" onChange={() => {}} />
    );
    const group = container.querySelector('[role="group"][aria-label="Nhóm"]')!;
    const btns = group.querySelectorAll("button");
    expect(btns[0].getAttribute("aria-pressed")).toBe("false");
    expect(btns[1].getAttribute("aria-pressed")).toBe("true");
  });

  it("click → onChange với key đúng", () => {
    const onChange = vi.fn();
    const { container } = render(
      <SegControl label="Nhóm" tabs={TABS} value="a" onChange={onChange} />
    );
    act(() => { container.querySelectorAll("button")[1].click(); });
    expect(onChange).toHaveBeenCalledWith("b");
  });

  it("radius=2xl → rounded-2xl (speed-seg mock); mặc định rounded-xl", () => {
    const { container } = render(
      <SegControl label="N" tabs={TABS} value="a" onChange={() => {}} radius="2xl" />
    );
    expect(container.firstElementChild!.className).toContain("rounded-2xl");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && npx vitest run src/components/hanzi/studio/__tests__/seg-control.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Write the component**

```tsx
// app-next/src/components/hanzi/studio/seg-control.tsx
"use client";

/* Segmented góc bo nhẹ (rounded-12/16) — port .mode-tabs/.speed-seg/.pane-tabs của
   opendesign_hsk/hanzi.html. KHÔNG dùng SegmentedTabs (rounded-full) cho 3 chỗ này —
   mock chúng là khung chữ nhật bo. API mirror SegmentedTabs. */
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function SegControl<K extends string>({
  tabs,
  value,
  onChange,
  label,
  radius = "xl",
  className,
}: {
  tabs: ReadonlyArray<{ key: K; label: ReactNode }>;
  value: K;
  onChange: (k: K) => void;
  label: string;
  radius?: "xl" | "2xl";
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "flex gap-0.5 border border-border-default bg-surface-muted p-[3px]",
        radius === "2xl" ? "rounded-2xl" : "rounded-xl",
        className,
      )}
    >
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          aria-pressed={t.key === value}
          onClick={() => onChange(t.key)}
          className={cn(
            "min-h-11 flex-1 rounded-[9px] px-3 text-[13px] font-bold transition-colors",
            t.key === value
              ? "border border-border-default bg-surface-elevated text-text-primary shadow-xs"
              : "border border-transparent text-text-secondary hover:text-text-primary",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app-next && npx vitest run src/components/hanzi/studio/__tests__/seg-control.test.tsx`
Expected: PASS (3 test).

- [ ] **Step 5: Commit**

```bash
git add app-next/src/components/hanzi/studio/seg-control.tsx app-next/src/components/hanzi/studio/__tests__/seg-control.test.tsx
git commit -m "feat(hanzi): SegControl — segmented góc bo cho mode-tabs/speed/pane (port mock)"
```

---

### Task 5: Hook `useStudioStrokes` + CSS hint

**Files:**
- Create: `app-next/src/components/hanzi/studio/use-studio-strokes.ts`
- Modify: `app-next/src/app/globals.css` (thêm 1 rule sau `.hz-ink-path`)
- Test: `app-next/src/components/hanzi/studio/__tests__/use-studio-strokes.test.tsx`

**Interfaces:**
- Consumes: `StudioChar` từ `@/content/hanzi-studio`; CSS `.hz-st` (+ `.todo/.done/.now` có sẵn từ review port).
- Produces: `useStudioStrokes(svgRef, char, opts?: { onPlayEnd?: () => void })` → api `{ build, playAll, stop, stepTo(i), stepBy(delta), setSpeed(m), showHint(i), clearHint, total }`; `type StudioStrokesApi = ReturnType<typeof useStudioStrokes>`. CSS class `hz-st hint` (mới).

- [ ] **Step 1: Thêm CSS `.hz-st.hint` vào globals.css**

Sửa `app-next/src/app/globals.css` — chèn ngay sau dòng `.hz-ink-path { … }`:

```css
.hz-st.hint { stroke: var(--action-primary); opacity: .3; stroke-dasharray: 6 8; }
```

- [ ] **Step 2: Write the failing test**

```tsx
// app-next/src/components/hanzi/studio/__tests__/use-studio-strokes.test.tsx
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { useRef } from "react";
import { useStudioStrokes } from "../use-studio-strokes";
import { STUDIO_CHARS } from "@/content/hanzi-studio";

const AI = STUDIO_CHARS.find((c) => c.ch === "爱")!; // 10 nét

/* jsdom không có getTotalLength — hook dùng nó để set dasharray/offset */
beforeAll(() => {
  Object.defineProperty(SVGElement.prototype, "getTotalLength", {
    configurable: true,
    value() { return 100; },
  });
});

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.useRealTimers(); cleanup(); });

function Harness({ char = AI, onPlayEnd }: { char?: typeof AI; onPlayEnd?: () => void }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const api = useStudioStrokes(svgRef, char, { onPlayEnd });
  return (
    <div>
      <svg ref={svgRef} data-testid="strokes" />
      <button data-testid="build" onClick={() => api.build()}>build</button>
      <button data-testid="play" onClick={() => api.playAll()}>play</button>
      <button data-testid="step-to3" onClick={() => api.stepTo(3)}>step-to3</button>
      <button data-testid="step-by1" onClick={() => api.stepBy(1)}>step-by1</button>
      <button data-testid="speed2" onClick={() => api.setSpeed(2)}>speed2</button>
      <button data-testid="hint1" onClick={() => api.showHint(1)}>hint1</button>
      <span data-testid="total">{api.total}</span>
    </div>
  );
}

const classes = (el: Element) => el.getAttribute("class") ?? "";

describe("useStudioStrokes", () => {
  it("build: đủ path, toàn bộ todo; total sync theo char", () => {
    const { container } = render(<Harness />);
    expect(container.querySelector('[data-testid="total"]')!.textContent).toBe("10");
    const paths = container.querySelectorAll('[data-testid="strokes"] > path');
    expect(paths.length).toBe(10);
    paths.forEach((p) => expect(classes(p)).toBe("hz-st todo"));
  });

  it("playAll: nét lần lượt todo → now → done, hết chữ gọi onPlayEnd", () => {
    const onPlayEnd = vi.fn();
    const { container } = render(<Harness onPlayEnd={onPlayEnd} />);
    const paths = container.querySelectorAll('[data-testid="strokes"] > path');
    act(() => { (container.querySelector('[data-testid="play"]') as HTMLButtonElement).click(); });
    expect(classes(paths[0])).toBe("hz-st now"); // đang animate nét 0
    act(() => { vi.advanceTimersByTime(780); }); // 720ms + 60ms đệm (speed 1)
    expect(classes(paths[0])).toBe("hz-st done");
    expect(classes(paths[1])).toBe("hz-st now");
    act(() => { vi.advanceTimersByTime(780 * 9); }); // đủ cho 9 nét còn lại
    paths.forEach((p) => expect(classes(p)).toBe("hz-st done"));
    expect(onPlayEnd).toHaveBeenCalledTimes(1);
  });

  it("setSpeed(2) rút ngắn duration (360ms + 60ms)", () => {
    const { container } = render(<Harness />);
    const paths = container.querySelectorAll('[data-testid="strokes"] > path');
    act(() => {
      (container.querySelector('[data-testid="speed2"]') as HTMLButtonElement).click();
      (container.querySelector('[data-testid="play"]') as HTMLButtonElement).click();
    });
    act(() => { vi.advanceTimersByTime(420); });
    expect(classes(paths[0])).toBe("hz-st done");
  });

  it("stepTo/stepBy tĩnh: reveal tới i, không timer", () => {
    const { container } = render(<Harness />);
    const paths = container.querySelectorAll('[data-testid="strokes"] > path');
    act(() => { (container.querySelector('[data-testid="step-to3"]') as HTMLButtonElement).click(); });
    expect(classes(paths[2])).toBe("hz-st done");
    expect(classes(paths[3])).toBe("hz-st todo");
    act(() => { (container.querySelector('[data-testid="step-by1"]') as HTMLButtonElement).click(); });
    expect(classes(paths[3])).toBe("hz-st done");
  });

  it("showHint: path class hint thêm vào cuối; clearHint xoá", () => {
    const { container } = render(<Harness />);
    act(() => { (container.querySelector('[data-testid="hint1"]') as HTMLButtonElement).click(); });
    const strokes = container.querySelector('[data-testid="strokes"]')!;
    expect(strokes.children.length).toBe(11); // 10 nét + 1 hint
    expect(classes(strokes.children[10])).toBe("hz-st hint");
    act(() => { (container.querySelector('[data-testid="build"]') as HTMLButtonElement).click(); });
    expect(strokes.children.length).toBe(10); // build xoá cả hint
  });

  it("đang phát mà build (đổi chữ) → timer cũ huỷ, không văng", () => {
    const { container } = render(<Harness />);
    act(() => { (container.querySelector('[data-testid="play"]') as HTMLButtonElement).click(); });
    act(() => { (container.querySelector('[data-testid="build"]') as HTMLButtonElement).click(); });
    expect(() => vi.advanceTimersByTime(2000)).not.toThrow();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd app-next && npx vitest run src/components/hanzi/studio/__tests__/use-studio-strokes.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 4: Write the hook**

```ts
// app-next/src/components/hanzi/studio/use-studio-strokes.ts
"use client";

/* Bút thuận Hanzi Studio — port animate()/playAll()/paintIdle()/showHint() của
   opendesign_hsk/hanzi.html. Khác useStrokePlayer (review): nét mờ hiện SẴN toàn chữ
   (.hz-st todo), trạng thái per-nét qua class, hint là path append cuối svg.
   setTimeout chain giữ đúng mock để fake timers test được (rAF khó advance). */
import { useCallback, useEffect, useRef } from "react";
import type { StudioChar } from "@/content/hanzi-studio";

const NS = "http://www.w3.org/2000/svg";

export function useStudioStrokes(
  svgRef: React.RefObject<SVGSVGElement | null>,
  char: StudioChar,
  opts?: { onPlayEnd?: () => void },
) {
  const pathsRef = useRef<SVGPathElement[]>([]);
  const hintRef = useRef<SVGPathElement | null>(null);
  const stepRef = useRef(-1);
  const speedRef = useRef(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const charRef = useRef(char);
  charRef.current = char;
  const onPlayEndRef = useRef(opts?.onPlayEnd);
  onPlayEndRef.current = opts?.onPlayEnd;

  const stop = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const clearHint = useCallback(() => {
    hintRef.current?.remove();
    hintRef.current = null;
  }, []);

  const paintIdle = useCallback(() => {
    pathsRef.current.forEach((el, i) => {
      el.style.transition = "";
      el.style.strokeDasharray = "";
      el.style.strokeDashoffset = "";
      el.setAttribute("class", "hz-st " + (i <= stepRef.current ? "done" : "todo"));
    });
  }, []);

  /* Dựng lại path theo charRef — reset step về -1 (mock buildGrid + paintIdle) */
  const build = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;
    stop();
    clearHint();
    stepRef.current = -1;
    svg.innerHTML = "";
    pathsRef.current = charRef.current.p.map((d) => {
      const el = document.createElementNS(NS, "path") as SVGPathElement;
      el.setAttribute("d", d);
      svg.appendChild(el);
      return el;
    });
    paintIdle();
  }, [svgRef, stop, clearHint, paintIdle]);

  const animate = (i: number, done: () => void) => {
    const el = pathsRef.current[i];
    if (!el) { done(); return; }
    stepRef.current = i;
    const len = el.getTotalLength();
    el.setAttribute("class", "hz-st now");
    el.style.transition = "none";
    el.style.strokeDasharray = String(len);
    el.style.strokeDashoffset = String(len);
    void el.getBoundingClientRect(); // reflow — port mock
    const dur = Math.max(280, 720 / speedRef.current);
    el.style.transition = `stroke-dashoffset ${dur}ms ease`;
    el.style.strokeDashoffset = "0";
    timerRef.current = setTimeout(() => {
      el.setAttribute("class", "hz-st done");
      el.style.transition = "";
      el.style.strokeDasharray = "";
      el.style.strokeDashoffset = "";
      timerRef.current = null;
      done();
    }, dur + 60);
  };

  const playAll = useCallback(() => {
    if (timerRef.current !== null) return; // đang phát — port mock if(timer)return
    stepRef.current = -1;
    paintIdle();
    let i = 0;
    const next = () => {
      if (i >= pathsRef.current.length) {
        stepRef.current = pathsRef.current.length - 1;
        paintIdle();
        onPlayEndRef.current?.();
        return;
      }
      animate(i, () => { i++; next(); });
    };
    next();
  }, [paintIdle]);

  const stepTo = useCallback((i: number) => {
    stop();
    stepRef.current = Math.max(-1, Math.min(pathsRef.current.length - 1, i));
    paintIdle();
  }, [stop, paintIdle]);

  const stepBy = useCallback((delta: number) => {
    stop();
    stepRef.current = Math.max(-1, Math.min(pathsRef.current.length - 1, stepRef.current + delta));
    paintIdle();
  }, [stop, paintIdle]);

  const setSpeed = useCallback((m: number) => { speedRef.current = m > 0 ? m : 1; }, []);

  const showHint = useCallback((i: number) => {
    clearHint();
    if (i < 0 || i >= pathsRef.current.length) return;
    const svg = svgRef.current;
    if (!svg) return;
    const el = document.createElementNS(NS, "path") as SVGPathElement;
    el.setAttribute("d", charRef.current.p[i]);
    el.setAttribute("class", "hz-st hint");
    svg.appendChild(el);
    hintRef.current = el;
  }, [svgRef, clearHint]);

  useEffect(() => stop, [stop]); // unmount giữa lúc phát → huỷ timer

  return { build, playAll, stop, stepTo, stepBy, setSpeed, showHint, clearHint, total: char.p.length };
}

export type StudioStrokesApi = ReturnType<typeof useStudioStrokes>;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd app-next && npx vitest run src/components/hanzi/studio/__tests__/use-studio-strokes.test.tsx`
Expected: PASS (6 test).

- [ ] **Step 6: Commit**

```bash
git add app-next/src/components/hanzi/studio/use-studio-strokes.ts app-next/src/components/hanzi/studio/__tests__/use-studio-strokes.test.tsx app-next/src/app/globals.css
git commit -m "feat(hanzi): useStudioStrokes — animation bút thuận port mock + CSS .hz-st.hint"
```

---

### Task 6: `StudioGrid` — ô thiên tự + vẽ + chấm điểm

**Files:**
- Create: `app-next/src/components/hanzi/studio/studio-grid.tsx`
- Modify: `app-next/src/app/globals.css` (thêm 2 rule sau rule Task 5)
- Test: `app-next/src/components/hanzi/studio/__tests__/studio-grid.test.tsx`

**Interfaces:**
- Consumes: `useStudioStrokes`, `matchStroke/InkPoint` từ `@/lib/hanzi/stroke-quiz`, `StudioChar`.
- Produces:
  - `type GridStats = { done: number; ok: number; total: number }`
  - `type StudioGridApi = { play, stepPrev, stepNext, setSpeed, clearInk, undoInk, setHint(on) }`
  - `StudioGrid({ char, mode: "watch"|"draw", apiRef?: React.Ref<StudioGridApi>, onStats?: (s: GridStats) => void })`

- [ ] **Step 1: Thêm CSS mực đúng/sai vào globals.css**

Chèn ngay sau rule `.hz-st.hint` (Task 5):

```css
.hz-ink-path.good { stroke: var(--text-primary); }
.hz-ink-path.bad { stroke: var(--action-primary); }
```

- [ ] **Step 2: Write the failing test**

```tsx
// app-next/src/components/hanzi/studio/__tests__/studio-grid.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { createRef } from "react";
import { StudioGrid, type StudioGridApi, type GridStats } from "../studio-grid";
import { STUDIO_CHARS } from "@/content/hanzi-studio";

const REN = STUDIO_CHARS.find((c) => c.ch === "人")!; // 2 nét: SW, SE — đơn giản để vẽ

beforeAll(() => {
  Object.defineProperty(SVGElement.prototype, "getTotalLength", {
    configurable: true, value() { return 100; },
  });
});

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.useRealTimers(); cleanup(); });

/* vẽ 1 nét trên ink svg: xuống ở (x0,y0), kéo tới (x1,y1) — toạ độ client 0..300 */
function drawStroke(svg: SVGSVGElement, x0: number, y0: number, x1: number, y1: number) {
  const fire = (type: string, x: number, y: number) =>
    act(() => { svg.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y })); });
  fire("pointerdown", x0, y0);
  // 5 điểm giữa để qua ngưỡng pts.length >= 4 và min-distance 3px
  for (let i = 1; i <= 4; i++) fire("pointermove", x0 + ((x1 - x0) * i) / 5, y0 + ((y1 - y0) * i) / 5);
  fire("pointerup", x1, y1);
}

function setup(props?: { mode?: "watch" | "draw"; onStats?: (s: GridStats) => void }) {
  const apiRef = createRef<StudioGridApi>();
  const stats: GridStats[] = [];
  const utils = render(
    <StudioGrid
      char={REN}
      mode={props?.mode ?? "watch"}
      apiRef={apiRef}
      onStats={(s) => { stats.push(s); props?.onStats?.(s); }}
    />,
  );
  const ink = utils.container.querySelector('svg[aria-label="Bảng tự luyện viết"]')!;
  // jsdom getBoundingClientRect trả 0 — stub về hình vuông 300
  ink.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 300, height: 300, x: 0, y: 0, right: 300, bottom: 300, toJSON: () => ({}) }) as DOMRect;
  return { ...utils, apiRef, stats, ink: ink as SVGSVGElement };
}

describe("StudioGrid — watch", () => {
  it("nét mẫu: đủ path class todo; hint mờ khi bật setHint", () => {
    const { container, apiRef } = setup();
    const strokeSvg = container.querySelector('svg[role="img"]')!;
    expect(strokeSvg.querySelectorAll("path").length).toBe(2);
    strokeSvg.querySelectorAll("path").forEach((p) =>
      expect(p.getAttribute("class")).toBe("hz-st todo"));
    act(() => apiRef.current!.setHint(true));
    expect(strokeSvg.querySelectorAll("path").length).toBe(3); // +1 hint
    expect(strokeSvg.lastElementChild!.getAttribute("class")).toBe("hz-st hint");
  });

  it("api.play phát tuần tự; stepPrev/stepNext reveal tĩnh", () => {
    const { container, apiRef } = setup();
    const paths = container.querySelectorAll('svg[role="img"] > path');
    act(() => apiRef.current!.play());
    expect(paths[0].getAttribute("class")).toBe("hz-st now");
    act(() => { vi.advanceTimersByTime(800); });
    expect(paths[0].getAttribute("class")).toBe("hz-st done");
    act(() => apiRef.current!.stepNext());
    expect(paths[1].getAttribute("class")).toBe("hz-st done");
    act(() => apiRef.current!.stepPrev());
    expect(paths[1].getAttribute("class")).toBe("hz-st todo");
  });
});

describe("StudioGrid — draw", () => {
  it("mode draw: nét mẫu thành done (mẫu tham chiếu); ink svg hiện", () => {
    const { container, ink } = setup({ mode: "draw" });
    container.querySelectorAll('svg[role="img"] > path').forEach((p) =>
      expect(p.getAttribute("class")).toBe("hz-st done"));
    expect((ink as SVGElement).classList.contains("hidden")).toBe(false);
  });

  it("vẽ đúng hướng → good + stats ok; sai hướng → bad", () => {
    const onStats = vi.fn();
    const { ink, stats } = setup({ mode: "draw", onStats });
    // nét 1 mong đợi SW: vẽ từ phải-trên xuống trái-dưới
    drawStroke(ink, 200, 60, 100, 200);
    const polylines = ink.querySelectorAll("polyline");
    expect(polylines.length).toBe(1);
    expect(polylines[0].getAttribute("class")).toBe("hz-ink-path good");
    expect(stats.at(-1)).toEqual({ done: 1, ok: 1, total: 2 });
    // nét 2 mong đợi SE: vẽ ngược (S→N) → bad
    drawStroke(ink, 100, 200, 200, 60);
    expect(ink.querySelectorAll("polyline")[1].getAttribute("class")).toBe("hz-ink-path bad");
    expect(stats.at(-1)).toEqual({ done: 2, ok: 1, total: 2 });
  });

  it("vẽ quá số nét không crash, chấm theo hướng nét mẫu cuối", () => {
    const { ink, stats } = setup({ mode: "draw" });
    drawStroke(ink, 200, 60, 100, 200); // nét 1 SW ✓
    drawStroke(ink, 100, 60, 200, 200); // nét 2 SE ✓ (vẽ đúng hết để idxNeo không can thiệp)
    drawStroke(ink, 200, 60, 100, 200); // nét thừa — d[idx] neo về nét cuối (SE), nhưng vẽ SW → bad
    expect(ink.querySelectorAll("polyline").length).toBe(3);
    expect(stats.at(-1)!.done).toBe(3);
    expect(stats.at(-1)!.ok).toBe(2);
  });

  it("undoInk/clearInk cập nhật stats; setHint hiện nét kế", () => {
    const { ink, apiRef, container } = setup({ mode: "draw" });
    drawStroke(ink, 200, 60, 100, 200);
    act(() => apiRef.current!.undoInk());
    expect(ink.querySelectorAll("polyline").length).toBe(0);
    act(() => apiRef.current!.setHint(true));
    const strokeSvg = container.querySelector('svg[role="img"]')!;
    expect(strokeSvg.lastElementChild!.getAttribute("class")).toBe("hz-st hint"); // nét 0 mẫu
    drawStroke(ink, 200, 60, 100, 200); // nét 0 đúng → hint chuyển sang nét 1
    expect(strokeSvg.lastElementChild!.getAttribute("d")).toBe(REN.p[1]);
    act(() => apiRef.current!.clearInk());
    expect(ink.querySelectorAll("polyline").length).toBe(0);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd app-next && npx vitest run src/components/hanzi/studio/__tests__/studio-grid.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 4: Write the component**

```tsx
// app-next/src/components/hanzi/studio/studio-grid.tsx
"use client";

/* Ô thiên tự — port .grid-box + khối vẽ/chấm điểm của opendesign_hsk/hanzi.html.
   Nét mẫu (watch) qua useStudioStrokes; mực vẽ imperative như mock (polyline append).
   Scoring qua lib/hanzi/stroke-quiz (pure); thống kê đẩy lên workbench qua onStats. */
import { useCallback, useEffect, useImperativeHandle, useRef } from "react";
import type { StudioChar } from "@/content/hanzi-studio";
import { matchStroke, type InkPoint } from "@/lib/hanzi/stroke-quiz";
import { useStudioStrokes } from "./use-studio-strokes";

const NS = "http://www.w3.org/2000/svg";

export type GridStats = { done: number; ok: number; total: number };

export type StudioGridApi = {
  play: () => void;
  stepPrev: () => void;
  stepNext: () => void;
  setSpeed: (m: number) => void;
  clearInk: () => void;
  undoInk: () => void;
  setHint: (on: boolean) => void;
};

export function StudioGrid({
  char,
  mode,
  apiRef,
  onStats,
}: {
  char: StudioChar;
  mode: "watch" | "draw";
  apiRef?: React.Ref<StudioGridApi>;
  onStats?: (s: GridStats) => void;
}) {
  const strokeSvgRef = useRef<SVGSVGElement | null>(null);
  const inkSvgRef = useRef<SVGSVGElement | null>(null);
  const strokesRef = useRef<{ el: SVGPolylineElement; ok: boolean }[]>([]);
  const drawingRef = useRef<{ el: SVGPolylineElement; pts: InkPoint[] } | null>(null);
  const hintOnRef = useRef(false);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const charRef = useRef(char);
  charRef.current = char;
  const onStatsRef = useRef(onStats);
  onStatsRef.current = onStats;

  const api = useStudioStrokes(strokeSvgRef, char);

  const emitStats = useCallback(() => {
    const done = strokesRef.current.length;
    const ok = strokesRef.current.filter((s) => s.ok).length;
    onStatsRef.current?.({ done, ok, total: charRef.current.n });
  }, []);

  const showHint = useCallback(() => {
    // hint chỉ tồn tại ở draw mode (mock buildGrid: if(hintOn&&mode==='draw'))
    if (!hintOnRef.current || modeRef.current !== "draw") return;
    const total = charRef.current.p.length;
    const n = strokesRef.current.length;
    if (n >= total) { api.clearHint(); return; } // mock: đủ nét thì không hint
    api.showHint(Math.min(n, total - 1));
  }, [api]);

  const clearInk = useCallback(() => {
    if (inkSvgRef.current) inkSvgRef.current.innerHTML = "";
    strokesRef.current = [];
    drawingRef.current = null;
    showHint();
    emitStats();
  }, [showHint, emitStats]);

  const undoInk = useCallback(() => {
    strokesRef.current.pop()?.el.remove();
    showHint();
    emitStats();
  }, [showHint, emitStats]);

  useImperativeHandle(apiRef, () => ({
    play: () => { if (modeRef.current === "watch") api.playAll(); },
    stepPrev: () => api.stepBy(-1),
    stepNext: () => api.stepBy(1),
    setSpeed: api.setSpeed,
    clearInk,
    undoInk,
    setHint: (on: boolean) => {
      hintOnRef.current = on;
      if (on) showHint();
      else api.clearHint();
    },
  }), [api, clearInk, undoInk, showHint]);

  /* Đổi chữ: dựng lại nét mẫu, xoá mực; draw mode hiện cả chữ làm mẫu + hint nếu bật */
  useEffect(() => {
    api.build();
    if (inkSvgRef.current) inkSvgRef.current.innerHTML = "";
    strokesRef.current = [];
    drawingRef.current = null;
    emitStats();
    if (modeRef.current === "draw") {
      api.stepTo(char.p.length - 1);
      showHint();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [char]);

  /* Đổi mode (bỏ lần mount đầu — mock select() khởi tạo im lặng) */
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    api.stop();
    if (mode === "watch") {
      clearInk();
      api.stepTo(-1);
      api.playAll();
    } else {
      api.stepTo(char.p.length - 1);
      showHint();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  /* --- vẽ tay (port pointer handlers của mock) --- */
  const svgPoint = (e: MouseEvent): InkPoint => {
    const r = inkSvgRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * 300, y: ((e.clientY - r.top) / r.height) * 300 };
  };

  const onPointerDown = useCallback((e: Event) => {
    if (modeRef.current !== "draw") return;
    const ev = e as PointerEvent;
    try { inkSvgRef.current?.setPointerCapture(ev.pointerId); } catch { /* jsdom */ }
    const pt = svgPoint(ev);
    const el = document.createElementNS(NS, "polyline") as SVGPolylineElement;
    el.setAttribute("class", "hz-ink-path good"); // đổi thành bad khi nhả nếu lệch hướng
    el.setAttribute("points", `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`);
    inkSvgRef.current?.appendChild(el);
    drawingRef.current = { el, pts: [pt] };
  }, []);

  const onPointerMove = useCallback((e: Event) => {
    const drawing = drawingRef.current;
    if (!drawing) return;
    const pt = svgPoint(e as PointerEvent);
    const last = drawing.pts[drawing.pts.length - 1];
    if (Math.hypot(pt.x - last.x, pt.y - last.y) < 3) return; // mock: lọc rung
    drawing.pts.push(pt);
    drawing.el.setAttribute("points", drawing.el.getAttribute("points") + " " + `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`);
  }, []);

  const finishStroke = useCallback(() => {
    const drawing = drawingRef.current;
    if (!drawing) return;
    drawingRef.current = null;
    const c = charRef.current;
    const idx = strokesRef.current.length;
    const ok = drawing.pts.length >= 4 && matchStroke(drawing.pts, c.d[Math.min(idx, c.d.length - 1)]);
    drawing.el.setAttribute("class", "hz-ink-path " + (ok ? "good" : "bad"));
    strokesRef.current.push({ el: drawing.el, ok });
    showHint();
    emitStats();
  }, [showHint, emitStats]);

  useEffect(() => {
    const ink = inkSvgRef.current;
    if (!ink) return;
    ink.addEventListener("pointerdown", onPointerDown);
    ink.addEventListener("pointermove", onPointerMove);
    ink.addEventListener("pointerup", finishStroke);
    ink.addEventListener("pointercancel", finishStroke);
    return () => {
      ink.removeEventListener("pointerdown", onPointerDown);
      ink.removeEventListener("pointermove", onPointerMove);
      ink.removeEventListener("pointerup", finishStroke);
      ink.removeEventListener("pointercancel", finishStroke);
    };
  }, [onPointerDown, onPointerMove, finishStroke]);

  return (
    <div
      data-od-id="tianzi-grid"
      className="relative mx-auto aspect-square w-full max-w-[340px] overflow-hidden rounded-2xl border border-border-subtle bg-surface-elevated max-[480px]:max-w-[280px]"
    >
      <svg viewBox="0 0 300 300" aria-hidden="true" className="absolute inset-0 h-full w-full">
        <rect x="4" y="4" width="292" height="292" fill="none" stroke="var(--text-secondary)" strokeOpacity="0.45" strokeWidth="1.5" rx="4" />
        <line x1="150" y1="4" x2="150" y2="296" stroke="var(--text-secondary)" strokeOpacity="0.45" strokeWidth="1" strokeDasharray="7 6" />
        <line x1="4" y1="150" x2="296" y2="150" stroke="var(--text-secondary)" strokeOpacity="0.45" strokeWidth="1" strokeDasharray="7 6" />
        <line x1="4" y1="4" x2="296" y2="296" stroke="var(--text-secondary)" strokeOpacity="0.32" strokeWidth="1" strokeDasharray="5 7" />
        <line x1="296" y1="4" x2="4" y2="296" stroke="var(--text-secondary)" strokeOpacity="0.32" strokeWidth="1" strokeDasharray="5 7" />
      </svg>
      <svg
        ref={strokeSvgRef}
        viewBox="0 0 300 300"
        role="img"
        aria-label={`Hoạt họa bút thuận chữ ${char.ch}`}
        className="absolute inset-0 h-full w-full"
      />
      <svg
        ref={inkSvgRef}
        viewBox="0 0 300 300"
        aria-label="Bảng tự luyện viết"
        className={`absolute inset-0 h-full w-full ${mode === "draw" ? "" : "hidden"}`}
        style={{ touchAction: "none" }}
      />
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd app-next && npx vitest run src/components/hanzi/studio/__tests__/studio-grid.test.tsx`
Expected: PASS (7 test).

- [ ] **Step 6: Commit**

```bash
git add app-next/src/components/hanzi/studio/studio-grid.tsx app-next/src/components/hanzi/studio/__tests__/studio-grid.test.tsx app-next/src/app/globals.css
git commit -m "feat(hanzi): StudioGrid — thiên tự + watch/draw + chấm điểm hướng nét (port mock)"
```

---

### Task 7: `StudioCatalog` — kho Hán tự

**Files:**
- Create: `app-next/src/components/hanzi/studio/studio-catalog.tsx`
- Test: `app-next/src/components/hanzi/studio/__tests__/studio-catalog.test.tsx`

**Interfaces:**
- Consumes: `StudioChar`, `StudioLevel`; `Check` từ `@/components/ui/icon` (lucide); `cn`.
- Produces: `StudioCatalog({ chars, total, page, pages, level, cur, onSelect, onPage })`.

- [ ] **Step 1: Write the failing test**

```tsx
// app-next/src/components/hanzi/studio/__tests__/studio-catalog.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { STUDIO_CHARS } from "@/content/hanzi-studio";
import { StudioCatalog } from "../studio-catalog";

afterEach(cleanup);

const setup = (over: Partial<Parameters<typeof StudioCatalog>[0]> = {}) =>
  render(
    <StudioCatalog
      chars={STUDIO_CHARS}
      total={12}
      page={1}
      pages={1}
      level="all"
      cur="爱"
      onSelect={() => {}}
      onPage={() => {}}
      {...over}
    />,
  );

describe("StudioCatalog", () => {
  it("catCount + pager label đúng copy mock", () => {
    const { getByTestId } = setup({ level: "HSK 2" });
    expect(getByTestId("cat-count").textContent).toBe("12 chữ mẫu · HSK 2");
    expect(getByTestId("pager-label").textContent).toBe("Trang 1 / 1 · 12 chữ mẫu");
  });

  it("zcard: glyph, pinyin · số nét, spill theo st, badge done có check", () => {
    const { getByODId } = setup();
    const card = getByODId("zcard-爱");
    expect(card.textContent).toContain("ài · 10 nét");
    expect(card.textContent).toContain("Mới");
    const doneCard = getByODId("zcard-人");
    expect(doneCard.textContent).toContain("Đã thuộc");
    expect(doneCard.querySelector(".bg-learning-mastered")).not.toBeNull();
    const midCard = getByODId("zcard-好");
    expect(midCard.textContent).toContain("Đang luyện");
    expect(midCard.querySelector(".bg-learning-progress")).not.toBeNull();
  });

  it("card active có aria-pressed + border accent; click → onSelect(ch)", () => {
    const onSelect = vi.fn();
    const { getByODId } = setup({ onSelect });
    expect(getByODId("zcard-爱").getAttribute("aria-pressed")).toBe("true");
    expect(getByODId("zcard-好").getAttribute("aria-pressed")).toBe("false");
    act(() => getByODId("zcard-好").click());
    expect(onSelect).toHaveBeenCalledWith("好");
  });

  it("pager disable ở biên, onPage nhận trang mới", () => {
    const onPage = vi.fn();
    const { getByLabelText } = setup({ page: 2, pages: 3, onPage });
    const prev = getByLabelText("Trang trước") as HTMLButtonElement;
    const next = getByLabelText("Trang sau") as HTMLButtonElement;
    expect(prev.disabled).toBe(false);
    expect(next.disabled).toBe(false);
    act(() => next.click());
    expect(onPage).toHaveBeenCalledWith(3);
  });

  it("biên: page=1 → prev disabled; page=pages → next disabled", () => {
    const { getByLabelText, rerender } = setup({});
    expect((getByLabelText("Trang trước") as HTMLButtonElement).disabled).toBe(true);
    rerender(
      <StudioCatalog
        chars={STUDIO_CHARS} total={12} page={1} pages={1} level="all" cur="爱"
        onSelect={() => {}} onPage={() => {}}
      />,
    );
    expect((getByLabelText("Trang sau") as HTMLButtonElement).disabled).toBe(true);
  });

  it("rỗng → empty state đúng copy", () => {
    const { getByText } = setup({ chars: [], total: 0 });
    expect(getByText("Không có chữ nào khớp bộ lọc.")).toBeTruthy();
  });
});
```

Giải thích `getByODId`: thêm helper cuối file test (dùng chung pattern `data-od-id` của mock):

```ts
function getByODId(id: string) {
  return document.querySelector(`[data-od-id="${id}"]`) as HTMLElement;
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && npx vitest run src/components/hanzi/studio/__tests__/studio-catalog.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Write the component**

```tsx
// app-next/src/components/hanzi/studio/studio-catalog.tsx
"use client";

/* Panel "Kho Hán tự" — port #paneCatalog (.zcard/.zbadge/.spill/.pager) của
   opendesign_hsk/hanzi.html. Presentational: data đã lọc + phân trang từ root. */
import { Check } from "@/components/ui/icon";
import type { StudioChar, StudioLevel } from "@/content/hanzi-studio";
import { cn } from "@/lib/cn";

const SPILL_LABEL = { done: "Đã thuộc", mid: "Đang luyện", new: "Mới" } as const;

const SPILL_CLASS = {
  done: "text-learning-mastered border-learning-mastered",
  mid: "text-learning-progress border-learning-progress/45 bg-amber-wash",
  new: "text-text-secondary border-border-subtle bg-surface-muted",
} as const;

function ZBadge({ st }: { st: StudioChar["st"] }) {
  if (st === "done") {
    return (
      <span aria-hidden="true" className="absolute right-[7px] top-[7px] grid h-[18px] w-[18px] place-items-center rounded-full bg-learning-mastered text-white">
        <Check size={11} strokeWidth={3.4} />
      </span>
    );
  }
  if (st === "mid") {
    return <span aria-hidden="true" className="absolute right-[7px] top-[7px] h-[18px] w-[18px] rounded-full bg-learning-progress" />;
  }
  return <span aria-hidden="true" className="absolute right-[7px] top-[7px] h-[18px] w-[18px] rounded-full border-[1.5px] border-dashed border-border-strong" />;
}

const PAGER_BTN =
  "min-h-10 min-w-10 rounded-[10px] border border-border-subtle bg-surface-elevated font-extrabold text-text-primary disabled:opacity-40";

export function StudioCatalog({
  chars, total, page, pages, level, cur, onSelect, onPage,
}: {
  chars: StudioChar[];
  total: number;
  page: number;
  pages: number;
  level: StudioLevel;
  cur: string;
  onSelect: (ch: string) => void;
  onPage: (p: number) => void;
}) {
  return (
    <section
      aria-label="Kho Hán tự"
      data-od-id="char-catalog"
      className="rounded-card border border-border-subtle bg-surface-elevated p-[18px] shadow-xs"
    >
      <div className="mb-3 flex items-baseline justify-between gap-2.5">
        <h2 className="text-[14.5px] font-bold">Kho Hán tự</h2>
        <span className="text-xs text-text-secondary" data-testid="cat-count">
          {total} chữ mẫu{level === "all" ? "" : " · " + level}
        </span>
      </div>

      <div className="max-h-[680px] overflow-y-auto pr-2 [scrollbar-width:thin]">
        {chars.length === 0 ? (
          <p className="py-5 text-center text-[13px] text-text-secondary">
            Không có chữ nào khớp bộ lọc.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2.5 min-[1400px]:grid-cols-4">
            {chars.map((c) => (
              <button
                key={c.ch}
                type="button"
                data-od-id={`zcard-${c.ch}`}
                aria-pressed={c.ch === cur}
                onClick={() => onSelect(c.ch)}
                className={cn(
                  "relative flex min-h-32 w-full flex-col items-center justify-center gap-0.5 rounded-[14px] border bg-surface-muted px-2 pb-2.5 pt-3 text-center transition-all hover:-translate-y-0.5 hover:shadow-md",
                  c.ch === cur
                    ? "border-2 border-action-primary bg-rose-wash px-[7px] pb-[9px] pt-[11px] shadow-xs"
                    : "border-border-subtle",
                )}
              >
                <ZBadge st={c.st} />
                <span className="zh text-4xl leading-[1.3] text-text-primary">{c.ch}</span>
                <span className="text-xs text-text-secondary">{c.py} · {c.n} nét</span>
                <span className={cn("whitespace-nowrap rounded-full border px-2.5 py-px text-[10.5px] font-extrabold", SPILL_CLASS[c.st])}>
                  {SPILL_LABEL[c.st]}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        data-od-id="catalog-pager"
        className="mt-3 flex items-center justify-center gap-3 text-[12.5px] font-bold text-text-secondary"
      >
        <button type="button" aria-label="Trang trước" disabled={page <= 1} onClick={() => onPage(page - 1)} className={PAGER_BTN}>
          ◀
        </button>
        <span data-testid="pager-label">Trang {page} / {pages} · {total} chữ mẫu</span>
        <button type="button" aria-label="Trang sau" disabled={page >= pages} onClick={() => onPage(page + 1)} className={PAGER_BTN}>
          ▶
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app-next && npx vitest run src/components/hanzi/studio/__tests__/studio-catalog.test.tsx`
Expected: PASS (6 test).

- [ ] **Step 5: Commit**

```bash
git add app-next/src/components/hanzi/studio/studio-catalog.tsx app-next/src/components/hanzi/studio/__tests__/studio-catalog.test.tsx
git commit -m "feat(hanzi): StudioCatalog — kho Hán tự zcard/badge/spill/pager (port mock)"
```

---

### Task 8: `StudioWorkbench` — bàn luyện viết

**Files:**
- Create: `app-next/src/components/hanzi/studio/studio-workbench.tsx`
- Test: `app-next/src/components/hanzi/studio/__tests__/studio-workbench.test.tsx`

**Interfaces:**
- Consumes: `StudioGrid` + `StudioGridApi` + `GridStats` (Task 6), `SegControl` (Task 4), `Button`, `IconButton`, `Volume2` icon, `useTts`, `useToastSafe`, `StudioChar`.
- Produces: `StudioWorkbench({ char, mode, onMode, apiRef })` — contains `StudioGrid`; meter + toast hoàn thành đọc từ stats nội bộ.

- [ ] **Step 1: Write the failing test**

```tsx
// app-next/src/components/hanzi/studio/__tests__/studio-workbench.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { createRef } from "react";
import { STUDIO_CHARS } from "@/content/hanzi-studio";
import { StudioWorkbench, type StudioGridApi } from "../studio-workbench";

const AI = STUDIO_CHARS.find((c) => c.ch === "爱")!;

const speakMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/tts/use-tts", () => ({
  useTts: () => ({ speak: speakMock, cancel: () => {}, speaking: false }),
}));

function getByODId(id: string) {
  return document.querySelector(`[data-od-id="${id}"]`) as HTMLElement;
}

afterEach(cleanup);

const setup = (over: Partial<Parameters<typeof StudioWorkbench>[0]> = {}) => {
  const apiRef = createRef<StudioGridApi>();
  const utils = render(
    <StudioWorkbench char={AI} mode="watch" onMode={() => {}} apiRef={apiRef} {...over} />,
  );
  return { ...utils, apiRef };
};

describe("StudioWorkbench", () => {
  it("wb-head: glyph, pinyin, nghĩa; nút loa speak(ch+ch) rate 0.85", () => {
    const { getByLabelText } = setup();
    expect(getByODId("workbench").textContent).toContain("ài");
    expect(getByODId("workbench").textContent).toContain("Yêu, thích, quý trọng");
    act(() => getByLabelText("Phát âm").click());
    expect(speakMock).toHaveBeenCalledWith("爱爱", { rate: 0.85 });
  });

  it("watch mode: watchBar hiện, drawBar ẩn, meter ẩn", () => {
    const { getByODId } = setup({ mode: "watch" });
    expect(getByODId("watch-controls").className).not.toContain("hidden");
    expect(getByODId("draw-controls").className).toContain("hidden");
    expect(document.querySelector('[data-od-id="accuracy-meter"]')).toBeNull();
  });

  it("draw mode: drawBar hiện + meter hiện 'Độ chuẩn xác: — · Nét 0/10'", () => {
    const { getByODId } = setup({ mode: "draw" });
    expect(getByODId("draw-controls").className).not.toContain("hidden");
    expect(getByODId("accuracy-meter").textContent).toContain("Độ chuẩn xác: — · Nét 0/10");
  });

  it("mode tabs: click 'Tự luyện viết' → onMode('draw')", () => {
    const onMode = vi.fn();
    const { getByText } = setup({ onMode });
    act(() => getByText("Tự luyện viết (chấm điểm)").click());
    expect(onMode).toHaveBeenCalledWith("draw");
  });

  it("speed seg: click 1.5x → api.setSpeed (qua grid)", () => {
    const { getByText } = setup();
    act(() => getByText("1.5x").click());
    // asserted gián tiếp: không văng; wiring api→grid được pin ở studio-grid test
    expect(getByText("1.5x").getAttribute("aria-pressed")).toBe("true");
  });

  it("chips: bộ thủ (Hán jade), cấu trúc, Hán-Việt; mẹo nhớ", () => {
    const { getByODId } = setup();
    const meta = getByODId("char-meta");
    expect(meta.textContent).toContain("BỘ THỦ");
    expect(meta.querySelector(".text-learning-mastered")!.textContent).toBe("爫");
    expect(meta.textContent).toContain("Trên – Giữa – Dưới");
    expect(meta.textContent).toContain("ÁI");
    expect(getByODId("mnemonic").textContent).toContain("Móng vuốt");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && npx vitest run src/components/hanzi/studio/__tests__/studio-workbench.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Write the component**

```tsx
// app-next/src/components/hanzi/studio/studio-workbench.tsx
"use client";

/* Bàn luyện chữ — port .panel#paneWork của opendesign_hsk/hanzi.html:
   wb-head + mode-tabs + 2 toolbar (watch/draw) + meter + chips + tip.
   Animation/thiên tự/mực nằm ở StudioGrid; workbench lo UI + stats hiển thị. */
import { useEffect, useState } from "react";
import { Lightbulb, Undo2, Volume2 } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { useToastSafe } from "@/components/shell/toast-provider";
import { useTts } from "@/lib/tts/use-tts";
import type { StudioChar } from "@/content/hanzi-studio";
import { cn } from "@/lib/cn";
import { SegControl } from "./seg-control";
import { StudioGrid, type GridStats, type StudioGridApi } from "./studio-grid";

const SPEED_TABS = [
  { key: "0.75" as const, label: "0.75x" },
  { key: "1" as const, label: "1.0x" },
  { key: "1.5" as const, label: "1.5x" },
];

const TOOL_BTN = "rounded-2xl text-[12.5px] font-bold";

export function StudioWorkbench({
  char, mode, onMode, apiRef,
}: {
  char: StudioChar;
  mode: "watch" | "draw";
  onMode: (m: "watch" | "draw") => void;
  apiRef: React.Ref<StudioGridApi>;
}) {
  const toast = useToastSafe();
  const { speak } = useTts();
  const [speed, setSpeed] = useState<"0.75" | "1" | "1.5">("1");
  const [hintOn, setHintOn] = useState(false);
  const [stats, setStats] = useState<GridStats>({ done: 0, ok: 0, total: char.n });

  useEffect(() => {
    setSpeed("1");
    setHintOn(false);
    setStats({ done: 0, ok: 0, total: char.n });
    apiRef.current?.setHint(false); // grid không rebuild theo state workbench — bảo nó tắt hint
  }, [char]);

  /* Toast hoàn thành — port say() trong updateMeter của mock */
  useEffect(() => {
    if (stats.total > 0 && stats.done === stats.total) {
      const acc = Math.round((stats.ok / stats.done) * 100);
      toast(acc >= 80
        ? `Xuất sắc: ${acc}% — đúng thứ tự và hướng nét`
        : `Xong ${stats.total} nét — chuẩn xác ${acc}%, xem lại gợi ý nhé`);
    }
  }, [stats, toast]);

  const acc = stats.done > 0 ? Math.round((stats.ok / stats.done) * 100) : null;
  const [radCh, ...radRest] = char.rad.split(" ");

  return (
    <section
      aria-label="Bàn luyện chữ"
      data-od-id="workbench"
      className="rounded-card border border-border-subtle bg-surface-elevated p-[18px] shadow-xs"
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-3">
        <span className="zh text-[44px] font-bold leading-[1.2] text-text-primary">{char.ch}</span>
        <span className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-muted py-1 pl-4 pr-1 text-[13px] font-bold">
          {char.py}
          <IconButton
            label="Phát âm"
            variant="ghost"
            className="h-8 min-h-8 w-8 min-w-8 rounded-full"
            onClick={() => speak(char.ch + char.ch, { rate: 0.85 })}
          >
            <Volume2 size={14} strokeWidth={2} aria-hidden="true" />
          </IconButton>
        </span>
        <span className="text-[13px] text-text-secondary">{char.mean}</span>
      </div>

      <div data-od-id="mode-tabs" className="my-3">
        <SegControl
          label="Chế độ luyện"
          tabs={[
            { key: "watch" as const, label: "Xem mẫu bút thuận" },
            { key: "draw" as const, label: "Tự luyện viết (chấm điểm)" },
          ]}
          value={mode}
          onChange={onMode}
        />
      </div>

      <StudioGrid char={char} mode={mode} apiRef={apiRef} onStats={setStats} />

      {mode === "watch" ? (
        <div data-od-id="watch-controls" className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <Button type="button" variant="secondary" className={TOOL_BTN} onClick={() => apiRef.current?.stepPrev?.()}>
            Nét trước
          </Button>
          <Button type="button" className={TOOL_BTN} onClick={() => apiRef.current?.play()}>
            Phát lại
          </Button>
          <Button type="button" variant="secondary" className={TOOL_BTN} onClick={() => apiRef.current?.stepNext?.()}>
            Nét sau
          </Button>
          <SegControl
            label="Tốc độ"
            radius="2xl"
            tabs={SPEED_TABS}
            value={speed}
            onChange={(k) => { setSpeed(k); apiRef.current?.setSpeed(parseFloat(k)); }}
          />
        </div>
      ) : (
        <div data-od-id="draw-controls" className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <Button type="button" variant="secondary" className={TOOL_BTN} onClick={() => apiRef.current?.clearInk()}>
            Xóa bảng
          </Button>
          <Button type="button" variant="secondary" className={TOOL_BTN} onClick={() => apiRef.current?.undoInk()}>
            <Undo2 size={14} strokeWidth={1.5} aria-hidden="true" /> Hoàn tác
          </Button>
          <Button
            type="button"
            variant="secondary"
            aria-pressed={hintOn}
            className={cn(TOOL_BTN, hintOn && "border-action-primary text-action-primary")}
            onClick={() => {
              const next = !hintOn;
              setHintOn(next);
              apiRef.current?.setHint(next);
            }}
          >
            <Lightbulb size={14} strokeWidth={1.5} aria-hidden="true" /> Gợi ý nét mờ
          </Button>
        </div>
      )}

      {mode === "draw" && (
        <div data-od-id="accuracy-meter" className="mt-2.5 text-center">
          <span className="text-[13px] font-extrabold">
            Độ chuẩn xác: {acc === null ? "—" : acc + "%"} · Nét {stats.done}/{stats.total}
          </span>
          <small className="block text-xs font-normal text-text-secondary">
            So hướng vẽ với bút thuận mẫu theo từng nét
          </small>
          <div className="mx-auto mt-1.5 h-1.5 max-w-[280px] overflow-hidden rounded-full bg-surface-muted">
            <i className="block h-full rounded-full bg-learning-mastered transition-[width] duration-300" style={{ width: `${acc ?? 0}%` }} />
          </div>
        </div>
      )}

      <div data-od-id="char-meta" className="mt-3.5 flex flex-wrap gap-2">
        <div className="min-w-[150px] flex-1 rounded-xl border border-border-subtle bg-surface-muted px-3 py-2 text-[12.5px]">
          <small className="block text-[10.5px] font-extrabold tracking-[0.07em] text-text-secondary/70">BỘ THỦ</small>
          <b className="text-[13px]">
            <span className="zh text-learning-mastered">{radCh}</span> {radRest.join(" ")}
          </b>
        </div>
        <div className="min-w-[150px] flex-1 rounded-xl border border-border-subtle bg-surface-muted px-3 py-2 text-[12.5px]">
          <small className="block text-[10.5px] font-extrabold tracking-[0.07em] text-text-secondary/70">CẤU TRÚC</small>
          <b className="text-[13px]">{char.struct}</b>
        </div>
        <div className="min-w-[150px] flex-1 rounded-xl border border-border-subtle bg-surface-muted px-3 py-2 text-[12.5px]">
          <small className="block text-[10.5px] font-extrabold tracking-[0.07em] text-text-secondary/70">ÂM HÁN-VIỆT</small>
          <b className="text-[13px]">{char.hv}</b>
        </div>
      </div>

      <div
        data-od-id="mnemonic"
        className="mt-2.5 rounded-xl border border-learning-progress/35 bg-amber-wash px-3.5 py-2.5 text-[12.5px] text-text-secondary"
      >
        <b className="text-text-primary">Mẹo nhớ:</b> {char.tip}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app-next && npx vitest run src/components/hanzi/studio/__tests__/studio-workbench.test.tsx`
Expected: PASS (6 test). Nếu test "watch mode … meter ẩn" fail vì `accuracy-meter` vẫn tồn tại: kiểm tra điều kiện `mode === "draw"`.

- [ ] **Step 5: Commit**

```bash
git add app-next/src/components/hanzi/studio/studio-workbench.tsx app-next/src/components/hanzi/studio/__tests__/studio-workbench.test.tsx
git commit -m "feat(hanzi): StudioWorkbench — bàn luyện viết 2 mode + meter + chips (port mock)"
```

---

### Task 9: Root `HanziStudio` + page + dọn màn cũ

**Files:**
- Create: `app-next/src/app/(wide)/hanzi/hanzi-studio.tsx`
- Modify: `app-next/src/app/(wide)/hanzi/page.tsx`
- Delete: `app-next/src/app/(wide)/hanzi/hanzi-home.tsx`, `app-next/src/app/(wide)/hanzi/__tests__/hanzi-home.test.tsx`
- Test: `app-next/src/app/(wide)/hanzi/__tests__/hanzi-studio.test.tsx`

**Interfaces:**
- Consumes: `STUDIO_CHARS/STUDIO_LEVELS/StudioLevel`, `StudioCatalog`, `StudioWorkbench`, `StudioGridApi`, `SegmentedTabs`, `Search` icon.
- Produces: `default export HanziStudio` (client root); `export function clampPage(page: number, pages: number): number` (pure, cho test Review Focus #1).

- [ ] **Step 1: Write the failing test**

```tsx
// app-next/src/app/(wide)/hanzi/__tests__/hanzi-studio.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act, fireEvent } from "@testing-library/react";
import HanziStudio, { clampPage } from "../hanzi-studio";

afterEach(cleanup);

function getByODId(id: string) {
  return document.querySelector(`[data-od-id="${id}"]`) as HTMLElement;
}
const zcards = () => document.querySelectorAll("[data-od-id^='zcard-']");

describe("clampPage (Review Focus #1)", () => {
  it("kẹp về [1, pages]", () => {
    expect(clampPage(0, 3)).toBe(1);
    expect(clampPage(2, 3)).toBe(2);
    expect(clampPage(9, 3)).toBe(3);
    expect(clampPage(1, 0)).toBe(1); // pages tối thiểu 1
  });
});

describe("HanziStudio", () => {
  it("mặc định level HSK 2 (theo mock) → 8 chữ, đang chọn 爱", () => {
    const { getByText } = render(<HanziStudio />);
    expect(zcards().length).toBe(8);
    expect(getByText("Trang 1 / 1 · 8 chữ mẫu")).toBeTruthy();
  });

  it("lọc cấp độ HSK 1 → 4 chữ 人 大 口 日", () => {
    const { getByText } = render(<HanziStudio />);
    act(() => getByText("HSK 1").click());
    expect(zcards().length).toBe(4);
  });

  it("state pill 'Đã thuộc nét' + level HSK 2 → 1 chữ (心)", () => {
    const { getByText } = render(<HanziStudio />);
    act(() => {
      getByText("HSK 2").click();
      getByText(/^Đã thuộc nét \(/).click();
    });
    expect(zcards().length).toBe(1);
    expect(document.querySelector("[data-od-id='zcard-心']")).not.toBeNull();
  });

  it("'Cần luyện lại' = mid + new (st !== done) — port ý nghĩa nhãn (spec §5)", () => {
    const { getByText } = render(<HanziStudio />);
    act(() => getByText("HSK 2").click());
    act(() => getByText(/^Cần luyện lại \(/).click());
    // HSK 2: 爱 new, 好 mid, 国 new, 汉 mid, 书 new, 木 mid, 水 mid = 7
    expect(zcards().length).toBe(7);
  });

  it("search 'ai' → chỉ 爱 (substring trên ch+py+hv)", () => {
    const { container } = render(<HanziStudio />);
    const input = document.querySelector('input[type="search"]') as HTMLInputElement;
    act(() => { fireEvent.change(input, { target: { value: "ai" } }); });
    expect(zcards().length).toBe(1);
    expect(container.querySelector("[data-od-id='zcard-爱']")).not.toBeNull();
  });

  it("search rác → empty state + count pills theo level", () => {
    const { getByText } = render(<HanziStudio />);
    const input = document.querySelector('input[type="search"]') as HTMLInputElement;
    act(() => { fireEvent.change(input, { target: { value: "zzzz" } }); });
    expect(getByText("Không có chữ nào khớp bộ lọc.")).toBeTruthy();
  });

  it("chọn chữ: workbench đổi glyph + card active; desktop giữ pane catalog", () => {
    const { getByText } = render(<HanziStudio />);
    act(() => getByText("HSK 1").click());
    act(() => getByODId("zcard-大").click());
    const wb = getByODId("workbench");
    expect(wb.querySelector(".zh")!.textContent).toBe("大");
    expect(getByODId("zcard-大").getAttribute("aria-pressed")).toBe("true");
    // jsdom innerWidth = 1024 → không chuyển pane: catalog vẫn hiện
    expect(getByODId("char-catalog").parentElement!.className).not.toContain("hidden");
  });

  it("mobile (<1024px): chọn chữ → pane chuyển sang work (catalog ẩn)", () => {
    const innerWidth = Object.getOwnPropertyDescriptor(window, "innerWidth");
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 800 });
    try {
      const { getByText } = render(<HanziStudio />);
      act(() => getByODId("zcard-好").click());
      const catalogWrap = getByODId("char-catalog").parentElement!;
      expect(catalogWrap.className).toContain("hidden");
      const workWrap = getByODId("workbench").parentElement!;
      expect(workWrap.className).not.toContain("hidden");
    } finally {
      if (innerWidth) Object.defineProperty(window, "innerWidth", innerWidth);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && npx vitest run "src/app/(wide)/hanzi/__tests__/hanzi-studio.test.tsx"`
Expected: FAIL — `hanzi-studio` chưa tồn tại.

- [ ] **Step 3: Write the root component**

```tsx
// app-next/src/app/(wide)/hanzi/hanzi-studio.tsx
"use client";

/* Hanzi Studio — port 1:1 opendesign_hsk/hanzi.html (spec 2026-10-05).
   Root sở hữu state (level/state/q/cur/mode/pane/page); catalog + workbench presentational.
   Bỏ topbar của mock (shell đã có streak/theme); toast qua ToastProvider; TTS qua useTts. */
import { useRef, useState } from "react";
import { Search } from "@/components/ui/icon";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { STUDIO_CHARS, STUDIO_LEVELS, type StudioLevel } from "@/content/hanzi-studio";
import { SegControl } from "@/components/hanzi/studio/seg-control";
import { StudioCatalog } from "@/components/hanzi/studio/studio-catalog";
import { StudioWorkbench } from "@/components/hanzi/studio/studio-workbench";
import type { StudioGridApi } from "@/components/hanzi/studio/studio-grid";
import { cn } from "@/lib/cn";

const PAGE_SIZE = 12;
type StateFilter = "all" | "done" | "todo";

export function clampPage(page: number, pages: number): number {
  return Math.min(Math.max(1, page), Math.max(1, pages));
}

const LEVEL_TABS = STUDIO_LEVELS.map((lv) => ({ key: lv, label: lv === "all" ? "Tất cả" : lv }));
const STATE_PILLS: { key: StateFilter; label: string }[] = [
  { key: "all", label: "Tất cả" },
  { key: "done", label: "Đã thuộc nét" },
  { key: "todo", label: "Cần luyện lại" },
];

export default function HanziStudio() {
  const [level, setLevel] = useState<StudioLevel>("HSK 2"); // mock mở ở HSK 2
  const [stateFilter, setStateFilter] = useState<StateFilter>("all");
  const [q, setQ] = useState("");
  const [cur, setCur] = useState("爱");
  const [mode, setMode] = useState<"watch" | "draw">("watch");
  const [pane, setPane] = useState<"catalog" | "work">("catalog");
  const [page, setPage] = useState(1);
  const apiRef = useRef<StudioGridApi>(null);

  const byLevel = STUDIO_CHARS.filter((c) => level === "all" || c.hsk === level);
  const counts: Record<StateFilter, number> = {
    all: byLevel.length,
    done: byLevel.filter((c) => c.st === "done").length,
    todo: byLevel.filter((c) => c.st !== "done").length, // mock lọc st==='todo' (không tồn tại) — port theo nhãn
  };

  const query = q.trim().toLowerCase();
  const filtered = byLevel.filter((c) => {
    if (stateFilter === "done" && c.st !== "done") return false;
    if (stateFilter === "todo" && c.st === "done") return false;
    if (query && !(c.ch + c.py + c.hv).toLowerCase().includes(query)) return false;
    return true;
  });

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = clampPage(page, pages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const curChar = STUDIO_CHARS.find((c) => c.ch === cur) ?? STUDIO_CHARS[0];

  const select = (ch: string) => {
    setCur(ch);
    if (typeof window !== "undefined" && window.innerWidth < 1024) setPane("work"); // mock select()
    requestAnimationFrame(() => apiRef.current?.play()); // mock: chọn chữ → playAll (watch)
  };

  const pillBtn = (active: boolean) =>
    cn(
      "min-h-9 rounded-full border px-3.5 text-[12.5px] font-bold transition-colors",
      active
        ? "border-action-primary bg-rose-wash text-action-primary"
        : "border-border-subtle bg-surface-elevated text-text-secondary hover:text-text-primary",
    );

  return (
    <div className="flex flex-col gap-4">
      <header data-od-id="studio-header">
        <h1 className="text-[22px] font-bold tracking-tight">
          <span className="zh text-action-primary">汉字工坊</span> · Hanzi Studio
        </h1>
        <p className="mt-0.5 text-[13px] text-text-secondary">
          Khám phá kết cấu, thứ tự nét và rèn luyện trí nhớ cơ bắp
        </p>
      </header>

      <div
        data-od-id="studio-filters"
        className="flex flex-wrap items-center gap-2.5 rounded-card border border-border-subtle bg-surface-elevated px-3.5 py-3 shadow-xs"
      >
        <SegmentedTabs
          label="Lọc cấp độ"
          tabs={LEVEL_TABS}
          value={level}
          onChange={setLevel}
          className="max-w-full overflow-x-auto"
        />
        <label className="ml-auto flex h-10 min-w-[200px] items-center gap-2 rounded-full border border-border-subtle bg-surface-muted px-3.5">
          <Search size={15} strokeWidth={2} aria-hidden="true" className="shrink-0 text-text-secondary" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Lọc chữ, pinyin, Hán-Việt…"
            aria-label="Lọc chữ Hán"
            className="w-full border-0 bg-transparent text-[13px] text-text-primary outline-none placeholder:text-text-secondary/60"
          />
        </label>
      </div>

      <div role="group" aria-label="Lọc trạng thái" data-od-id="state-pills" className="flex flex-wrap gap-2">
        {STATE_PILLS.map((p) => (
          <button
            key={p.key}
            type="button"
            aria-pressed={stateFilter === p.key}
            onClick={() => setStateFilter(p.key)}
            className={pillBtn(stateFilter === p.key)}
          >
            {p.label} ({counts[p.key]})
          </button>
        ))}
      </div>

      <SegControl
        label="Chuyển khung"
        tabs={[
          { key: "catalog" as const, label: "Danh sách chữ" },
          { key: "work" as const, label: "Bàn luyện viết" },
        ]}
        value={pane}
        onChange={setPane}
        className="sticky top-16 z-[15] lg:hidden"
      />

      <div className="grid items-start gap-4 lg:grid-cols-[5fr_7fr]">
        <div className={cn(pane !== "catalog" && "hidden lg:block")}>
          <StudioCatalog
            chars={paged}
            total={filtered.length}
            page={safePage}
            pages={pages}
            level={level}
            cur={cur}
            onSelect={select}
            onPage={setPage}
          />
        </div>
        <div className={cn(pane !== "work" && "hidden lg:block")}>
          <StudioWorkbench char={curChar} mode={mode} onMode={setMode} apiRef={apiRef} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Update `page.tsx`, xoá màn cũ**

```tsx
// app-next/src/app/(wide)/hanzi/page.tsx (thay toàn bộ)
/* /hanzi (G2) — Hanzi Studio: luyện viết & chiết tự (port opendesign_hsk/hanzi.html,
   spec 2026-10-05). Server SSG; tương tác trong HanziStudio. Chi tiết chữ: /hanzi/[char]. */

import type { Metadata } from "next";
import HanziStudio from "./hanzi-studio";

export const metadata: Metadata = { title: "Hanzi Studio" };

export default function HanziPage() {
  return <HanziStudio />;
}
```

```bash
cd app-next && git rm "src/app/(wide)/hanzi/hanzi-home.tsx" "src/app/(wide)/hanzi/__tests__/hanzi-home.test.tsx"
```

Kiểm tra `search-card.tsx` vẫn còn (dùng bởi `hanzi-detail.tsx` — không xoá).

- [ ] **Step 5: Run test to verify it passes**

Run: `cd app-next && npx vitest run "src/app/(wide)/hanzi" src/components/hanzi/studio`
Expected: PASS — test root mới + mọi test studio cũ + `hanzi-detail` test (nếu có) không hư.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(hanzi): Hanzi Studio thay thế màn Phân tích Hán tự tại /hanzi (port mock)"
```

---

### Task 10: Verification toàn bộ

**Files:** không tạo/sửa (chỉ chạy kiểm chứng; sửa nếu phát hiện lỗi).

- [ ] **Step 1: Typecheck + lint + toàn bộ unit tests**

```bash
cd app-next && npm run typecheck && npm run lint && npm test
```

Expected: cả 3 sạch; tổng suite (trước đây 557 test + các test mới) PASS.

- [ ] **Step 2: Build production**

```bash
cd app-next && npm run build
```

Expected: build thành công; route `/hanzi` nằm trong output.

- [ ] **Step 3: Soát trực quan bằng browser (spec §5–§6)**

```bash
cd app-next && npm run dev
```

Dùng skill browser-use để mở `http://localhost:3100/hanzi` và kiểm:
1. Light + dark (toggle theme của shell): nét `todo` mờ vẫn thấy được, hint nét đứt accent rõ.
2. Chọn chữ → workbench đổi, animation bút thuận tự phát, toast "Hoàn thành N nét".
3. Mode Tự luyện viết: vẽ đúng/sai hướng → mực đen/đỏ + meter %; Hoàn tác/Xóa bảng/Gợi ý nét mờ chạy.
4. Thu hẹp < 1024px: pane-tabs hiện, chọn chữ nhảy sang bàn luyện.
5. So khớp tỉ mỉ với `opendesign_hsk/hanzi.html` mở cạnh bên (cùng viewport).

Lỗi tìm thấy → sửa + chạy lại Step 1, commit `fix(hanzi): …`.

- [ ] **Step 4: Commit cuối (nếu có fix) + báo cáo**

```bash
git status --short
```

Expected: sạch (không file sót). Báo cáo kết quả Task này vào message kết thúc phiên.
