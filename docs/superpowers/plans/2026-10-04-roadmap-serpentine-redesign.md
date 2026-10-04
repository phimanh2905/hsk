# Roadmap Serpentine Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thay trang `/roadmap` của `app-next` bằng UI serpentine 100% theo mock `opendesign_hsk/roadmap.html` — level switcher HSK, milestone banner, serpentine path 4 trạng thái, right drawer từ vựng/ngữ pháp.

**Architecture:** Feature components mới trong `src/components/roadmap/` (Phương án A đã duyệt), tái dụng primitives `ui/` (SegmentedTabs, Chip) + `useTts`/`useToast`. Data tĩnh trong `src/content/roadmap-stations.ts` (zod); trạng thái done/active/locked derive từ `progressStore` qua `src/lib/roadmap-progress.ts`. Server `page.tsx` mỏng + client island `roadmap-client.tsx`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4 (CSS-first tokens `--hz-*`), Vitest + React Testing Library, zod.

**Spec:** `docs/superpowers/specs/2026-10-04-roadmap-serpentine-redesign-design.md`

## Global Constraints

- Mọi lệnh chạy từ thư mục `app-next/`. Test: `npx vitest run <đường-dẫn-file>`; typecheck: `npx tsc --noEmit`; dev server port **3100** (`npm run dev`).
- **Chỉ dùng semantic tokens** trong components — cấm raw hex (Ngoại lệ duy nhất: overlay `bg-[rgba(17,19,24,0.45)]` trong drawer, copy nguyên từ mock). Icon chỉ import qua `@/components/ui/icon` với `ICON_STROKE`, icon có `aria-hidden="true"`.
- File kebab-case, component PascalCase, comment tiếng Việt ngắn giải thích "port từ mock X".
- Touch target: nút thường `min-h-11` (44px), nút launch drawer `min-h-12` (48px).
- localStorage chỉ đọc/ghi qua `progressStore` (bọc try/catch); hook dùng mount-gate SSR-safe: trước mount trả state rỗng/mặc định, không bao giờ đọc localStorage lúc render.
- Test colocated `__tests__/*.test.tsx` cạnh file được test.
- Mỗi task kết thúc bằng 1 commit, message `feat(roadmap): ...` / `test(roadmap): ...`.
- Lớp `.zh` (font Noto Sans SC) có sẵn trong `globals.css` — dùng cho mọi chữ Hán.

## Review Focus

1. **SSR hydration mismatch** — khi progressStore rỗng, HTML server và lần render client đầu phải giống hệt nhau (mọi derive từ record rỗng phải deterministic, không đọc localStorage lúc render). → Test pin ở Task 4.
2. **JSON hỏng trong `nhai.roadmap.stations.v1`** — store phải trả `{}` thay vì crash. → Test pin ở Task 3.
3. **`?level=` sai/garbage** — trang fallback về `hsk-2`, không crash. → Test pin ở Task 12.
4. **Milestone khóa sai** — khi còn ≥1 trạm lesson chưa done, milestone phải `locked` kể cả khi record có dữ liệu lạ cho milestone. → Test pin ở Task 4.
5. **Drawer chưa mở mà bấm Escape** — phải no-op, không throw, không gọi onClose. → Test pin ở Task 11.

---

### Task 1: Token `--color-jade` + keyframes pulse

**Files:**
- Modify: `src/app/globals.css` (block `@theme inline` ~dòng 104-109, và cuối file)

**Interfaces:**
- Consumes: primitive `--hz-jade` (đã có: light `#2d7d5b`, dark `#4caf8a`).
- Produces: Tailwind utilities `bg-jade`, `text-jade`, `border-jade` + class `.hz-node-pulse` — Task 6/8/9/12 dùng.

- [ ] **Step 1: Thêm mapping semantic jade vào `@theme inline`**

Trong block `@theme inline`, ngay sau dòng `--color-learning-due: var(--learning-due);` thêm:

```css
  /* port roadmap.html: jade dùng cho progress fill + node done (spec 2026-10-04 §7) */
  --color-jade: var(--hz-jade);
```

- [ ] **Step 2: Thêm keyframes pulse cuối file (sau block `@keyframes shake`)**

```css
/* Node trạm active — halo pulse (port roadmap.html @keyframes pulse) */
@keyframes hz-node-pulse {
  0%, 100% { box-shadow: 0 0 0 5px color-mix(in srgb, var(--action-primary) 16%, transparent); }
  50% { box-shadow: 0 0 0 10px color-mix(in srgb, var(--action-primary) 7%, transparent); }
}
.hz-node-pulse { animation: hz-node-pulse 2.2s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .hz-node-pulse { animation: none; }
}
```

- [ ] **Step 3: Verify**

Run: `grep -n "color-jade\|hz-node-pulse" src/app/globals.css`
Expected: thấy cả 3 chỗ (mapping, keyframes, media reduce).

- [ ] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(roadmap): token --color-jade + keyframes hz-node-pulse (port roadmap.html)"
```

---

### Task 2: Content module `roadmap-stations.ts`

**Files:**
- Create: `src/content/roadmap-stations.ts`
- Test: `src/content/__tests__/roadmap-stations.test.ts`

**Interfaces:**
- Consumes: zod.
- Produces (Task 4/5/6/12 dùng đúng tên này):
  - `type Station = { id, no, title, zh, meta, kind: "lesson"|"milestone", vocab: [zh,py,vi][], gram: [name,desc][] }`
  - `type LevelId = "hsk-1"|"hsk-2"|"hsk-3"|"hsk-4-6"`
  - `type RoadmapLevel = { id: LevelId, label, kicker, title, status: "available"|"upcoming", stations: Station[] }`
  - `const roadmapLevels: RoadmapLevel[]` (validate zod lúc load)
  - `function getRoadmapLevel(id: string): RoadmapLevel | null`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { roadmapLevels, getRoadmapLevel } from "../roadmap-stations";

describe("roadmap-stations content", () => {
  it("có đủ 4 level đúng thứ tự id", () => {
    expect(roadmapLevels.map((l) => l.id)).toEqual(["hsk-1", "hsk-2", "hsk-3", "hsk-4-6"]);
  });
  it("HSK 2 available, 7 trạm, trạm thứ 6 là milestone (theo mock)", () => {
    const hsk2 = getRoadmapLevel("hsk-2")!;
    expect(hsk2.status).toBe("available");
    expect(hsk2.stations).toHaveLength(7);
    expect(hsk2.stations.map((s) => s.kind)).toEqual([
      "lesson", "lesson", "lesson", "lesson", "lesson", "milestone", "lesson",
    ]);
  });
  it("HSK 1 banner-only (stations rỗng), HSK 3 + 4–6 upcoming", () => {
    expect(getRoadmapLevel("hsk-1")!.stations).toHaveLength(0);
    expect(getRoadmapLevel("hsk-3")!.status).toBe("upcoming");
    expect(getRoadmapLevel("hsk-4-6")!.status).toBe("upcoming");
  });
  it("mọi trạm đều có vocab + grammar không rỗng", () => {
    for (const l of roadmapLevels) {
      for (const s of l.stations) {
        expect(s.vocab.length).toBeGreaterThan(0);
        expect(s.gram.length).toBeGreaterThan(0);
      }
    }
  });
  it("getRoadmapLevel trả null cho id lạ", () => {
    expect(getRoadmapLevel("hsk-99")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test verify FAIL**

Run: `npx vitest run src/content/__tests__/roadmap-stations.test.ts`
Expected: FAIL — không tìm thấy module `../roadmap-stations`.

- [ ] **Step 3: Implement content module**

```ts
import { z } from "zod";

/* Port 1:1 STATIONS + levels từ opendesign_hsk/roadmap.html (mock serpentine).
   KHÔNG lưu side (suy ra từ index) và KHÔNG lưu state/pct/stars (derive từ
   progressStore — spec 2026-10-04 §4). */

export const stationSchema = z.object({
  id: z.string(),
  no: z.string(),
  title: z.string(),
  zh: z.string(),
  meta: z.string(),
  kind: z.enum(["lesson", "milestone"]),
  vocab: z.array(z.tuple([z.string(), z.string(), z.string()])),
  gram: z.array(z.tuple([z.string(), z.string()])),
});
export type Station = z.infer<typeof stationSchema>;

export const levelIdSchema = z.enum(["hsk-1", "hsk-2", "hsk-3", "hsk-4-6"]);
export type LevelId = z.infer<typeof levelIdSchema>;

export const roadmapLevelSchema = z.object({
  id: levelIdSchema,
  label: z.string(),
  kicker: z.string(),
  title: z.string(),
  status: z.enum(["available", "upcoming"]),
  stations: z.array(stationSchema),
});
export type RoadmapLevel = z.infer<typeof roadmapLevelSchema>;

export const roadmapLevels: RoadmapLevel[] = [
  {
    id: "hsk-1",
    label: "HSK 1",
    kicker: "NỀN TẢNG · PHÁT ÂM",
    title: "Nền tảng: Pinyin & nét cơ bản",
    status: "available",
    stations: [], // banner-only — dẫn về /roadmap/pinyin (spec §4)
  },
  {
    id: "hsk-2",
    label: "HSK 2",
    kicker: "CHẶNG 1 · NỀN TẢNG GIAO TIẾP",
    title: "Chặng 1: Giao tiếp thường nhật",
    status: "available",
    stations: [
      {
        id: "1", no: "Trạm 1", kind: "lesson",
        title: "Chào hỏi & Làm quen", zh: "你好",
        meta: "15/15 từ · 100% · 3 điểm ngữ pháp",
        vocab: [
          ["你好", "nǐ hǎo", "xin chào"], ["谢谢", "xièxie", "cảm ơn"],
          ["再见", "zàijiàn", "tạm biệt"], ["请", "qǐng", "xin mời"],
          ["对不起", "duìbuqǐ", "xin lỗi"],
        ],
        gram: [
          ["Câu chào + tên", "我叫… / 你叫什么？"],
          ["Phủ định cơ bản", "不 + động từ / tính từ"],
        ],
      },
      {
        id: "2", no: "Trạm 2", kind: "lesson",
        title: "Số đếm & Mua sắm", zh: "数字",
        meta: "15/15 từ · 100% · 2 điểm ngữ pháp",
        vocab: [
          ["买", "mǎi", "mua"], ["多少钱", "duōshao qián", "bao nhiêu tiền"],
          ["便宜", "piányi", "rẻ"], ["贵", "guì", "đắt"], ["个", "gè", "lượng từ"],
        ],
        gram: [["Hỏi giá", "…多少钱？"], ["Lượng từ 个", "Số + 个 + danh từ"]],
      },
      {
        id: "3", no: "Trạm 3", kind: "lesson",
        title: "Thời gian & Lịch trình", zh: "时间",
        meta: "15/15 từ · 100% · 2 điểm ngữ pháp",
        vocab: [
          ["今天", "jīntiān", "hôm nay"], ["明天", "míngtiān", "ngày mai"],
          ["几点", "jǐ diǎn", "mấy giờ"], ["上班", "shàngbān", "đi làm"],
          ["休息", "xiūxi", "nghỉ ngơi"],
        ],
        gram: [["Trạng từ thời gian", "今天 / 明天 + V"], ["Hỏi giờ", "现在几点？"]],
      },
      {
        id: "4", no: "Trạm 4", kind: "lesson",
        title: "Sở thích & Thời gian rảnh", zh: "爱好",
        meta: "8/15 từ vựng · 55% · Còn ~6 phút",
        vocab: [
          ["爱好", "àihào", "sở thích"], ["空闲", "kòngxián", "rảnh rỗi"],
          ["打球", "dǎ qiú", "chơi bóng"], ["音乐", "yīnyuè", "âm nhạc"],
          ["电影", "diànyǐng", "phim"], ["喜欢", "xǐhuan", "thích"],
          ["觉得", "juéde", "cảm thấy"], ["有意思", "yǒu yìsi", "thú vị"],
        ],
        gram: [
          ["Câu chữ 把", "把 + tân ngữ + V + 补语"],
          ["Biểu đạt sở thích", "喜欢 + V / 觉得…有意思"],
        ],
      },
      {
        id: "5", no: "Trạm 5", kind: "lesson",
        title: "Đi lại & Chỉ đường", zh: "问路",
        meta: "Khóa · mở sau khi xong Bài 4",
        vocab: [
          ["地铁", "dìtiě", "tàu điện ngầm"], ["怎么走", "zěnme zǒu", "đi thế nào"],
          ["附近", "fùjìn", "gần đây"],
        ],
        gram: [["Hỏi đường", "请问，…怎么走？"], ["Phương vị", "在…旁边 / 对面"]],
      },
      {
        id: "m", no: "Milestone", kind: "milestone",
        title: "Ôn tập chặng & Mini test", zh: "复习",
        meta: "Khóa · mở sau Trạm 5 · Đánh giá năng lực HSK 2",
        vocab: [["Tổng ôn 60 từ", "zǒng fùxí", "flashcard chặng 1"]],
        gram: [["Tổng hợp ngữ pháp", "把 · Hỏi giá · Hỏi giờ"], ["Mini test 20 câu", "Nghe · Đọc · Viết"]],
      },
      {
        id: "6", no: "Trạm 6", kind: "lesson",
        title: "Thời tiết & Bốn mùa", zh: "天气",
        meta: "Khóa · mở sau Milestone",
        vocab: [["天气", "tiānqì", "thời tiết"], ["下雨", "xià yǔ", "mưa"], ["冷", "lěng", "lạnh"]],
        gram: [["Miêu tả thời tiết", "今天… / 明天会…"], ["So sánh", "比 + adj"]],
      },
    ],
  },
  {
    id: "hsk-3",
    label: "HSK 3",
    kicker: "CHẶNG 2 · MỞ RỘNG XÃ HỘI",
    title: "Chặng 2: Mở rộng xã hội",
    status: "upcoming",
    stations: [],
  },
  {
    id: "hsk-4-6",
    label: "HSK 4–6",
    kicker: "NÂNG CAO · HỌC THUẬT & NGHỀ NGHIỆP",
    title: "Chặng nâng cao: Học thuật & nghề nghiệp",
    status: "upcoming",
    stations: [],
  },
];

// Validate lúc load (pattern của src/content/*) — lỗi schema ném ngay, không chờ render.
roadmapLevels.forEach((l) => roadmapLevelSchema.parse(l));

export function getRoadmapLevel(id: string): RoadmapLevel | null {
  return roadmapLevels.find((l) => l.id === id) ?? null;
}
```

- [ ] **Step 4: Run test verify PASS**

Run: `npx vitest run src/content/__tests__/roadmap-stations.test.ts`
Expected: PASS 5/5.

- [ ] **Step 5: Commit**

```bash
git add src/content/roadmap-stations.ts src/content/__tests__/roadmap-stations.test.ts
git commit -m "feat(roadmap): content module roadmap-stations (zod, seed 7 trạm HSK 2 từ mock)"
```

---

### Task 3: progressStore — station progress

**Files:**
- Modify: `src/lib/store/progress-store.ts` (interface `ProgressStoreApi` ~dòng 33, class `ProgressStore` — thêm method cạnh `getRoadmapDone`)
- Test: `src/lib/store/__tests__/progress-store-stations.test.ts` (folder `__tests__` đã tồn tại cạnh store; nếu chưa thì tạo)

**Interfaces:**
- Consumes: helpers `readJSON`/`writeJSON`, hằng `PROGRESS_EVENT` sẵn có trong file.
- Produces (Task 4 dùng):
  - `type StationProgress = { pct: number; stars: 0 | 1 | 2 | 3 }`
  - `progressStore.getStationProgress(levelId: string): Record<string, StationProgress>`
  - `progressStore.setStationProgress(levelId: string, stationId: string, rec: StationProgress): void`

- [ ] **Step 1: Write the failing test**

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { ProgressStore } from "../progress-store";

describe("progressStore — station progress (nhai.roadmap.stations.v1)", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("roundtrip set/get theo level, level khác trả rỗng", () => {
    const store = new ProgressStore();
    store.setStationProgress("hsk-2", "4", { pct: 55, stars: 0 });
    store.setStationProgress("hsk-2", "1", { pct: 100, stars: 3 });
    expect(store.getStationProgress("hsk-2")).toEqual({
      "1": { pct: 100, stars: 3 },
      "4": { pct: 55, stars: 0 },
    });
    expect(store.getStationProgress("hsk-1")).toEqual({});
  });

  it("set phát sự kiện nhai:progress để hook sync", () => {
    const store = new ProgressStore();
    const listener = vi.fn();
    window.addEventListener("nhai:progress", listener);
    store.setStationProgress("hsk-2", "1", { pct: 100, stars: 3 });
    expect(listener).toHaveBeenCalled();
  });

  it("JSON hỏng trong localStorage → trả {} không crash", () => {
    localStorage.setItem("nhai.roadmap.stations.v1", "{not json");
    const store = new ProgressStore();
    expect(store.getStationProgress("hsk-2")).toEqual({});
  });
});
```

- [ ] **Step 2: Run test verify FAIL**

Run: `npx vitest run src/lib/store/__tests__/progress-store-stations.test.ts`
Expected: FAIL — `getStationProgress is not a function` / không tồn tại export.

- [ ] **Step 3: Implement trong `progress-store.ts`**

Thêm type (cạnh các type đầu file):

```ts
export type StationProgress = { pct: number; stars: 0 | 1 | 2 | 3 };
```

Thêm key (cạnh `ROADMAP_LEARN_SEEN_KEY`):

```ts
/* Lộ trình serpentine (spec 2026-10-04): Record<levelId, Record<stationId, {pct, stars}>> */
const ROADMAP_STATIONS_KEY = "nhai.roadmap.stations.v1";
```

Thêm 2 dòng vào interface `ProgressStoreApi`:

```ts
  getStationProgress(levelId: string): Record<string, StationProgress>;
  setStationProgress(levelId: string, stationId: string, rec: StationProgress): void;
```

Thêm vào class `ProgressStore` (cạnh `getRoadmapDone`, bọc try/catch như các method khác — `readJSON`/`writeJSON` đã tự catch, vòng ngoài thêm try/catch cho dispatch):

```ts
  getStationProgress(levelId: string): Record<string, StationProgress> {
    try {
      const all = readJSON<Record<string, Record<string, StationProgress>>>(ROADMAP_STATIONS_KEY, {});
      return all[levelId] ?? {};
    } catch {
      return {};
    }
  }

  setStationProgress(levelId: string, stationId: string, rec: StationProgress): void {
    try {
      const all = readJSON<Record<string, Record<string, StationProgress>>>(ROADMAP_STATIONS_KEY, {});
      all[levelId] = { ...all[levelId], [stationId]: rec };
      writeJSON(ROADMAP_STATIONS_KEY, all);
      window.dispatchEvent(new CustomEvent(PROGRESS_EVENT));
    } catch {
      /* silent */
    }
  }
```

- [ ] **Step 4: Run test verify PASS**

Run: `npx vitest run src/lib/store/__tests__/progress-store-stations.test.ts`
Expected: PASS 3/3. Chạy thêm test store hiện có để chắc không regress: `npx vitest run src/lib/store/`
Expected: PASS toàn bộ.

- [ ] **Step 5: Commit**

```bash
git add src/lib/store/progress-store.ts src/lib/store/__tests__/progress-store-stations.test.ts
git commit -m "feat(roadmap): progressStore.getStationProgress/setStationProgress (key nhai.roadmap.stations.v1)"
```

---

### Task 4: `roadmap-progress.ts` — derive trạng thái + banner + hook

**Files:**
- Create: `src/lib/roadmap-progress.ts`
- Test: `src/lib/__tests__/roadmap-progress.test.ts`

**Interfaces:**
- Consumes: `RoadmapLevel`, `LevelId`, `getRoadmapLevel` (Task 2); `progressStore`, `StationProgress` (Task 3).
- Produces (Task 8/9/10/11/12 dùng đúng tên này):
  - `type StationState = "done" | "active" | "locked"`
  - `type StationView = { station: Station; state: StationState; pct: number; stars: number }`
  - `deriveStationStates(level: RoadmapLevel, record: Record<string, StationProgress>): StationView[]`
  - `type BannerSummary = { pct: number; currentTitle: string | null; remainingToMilestone: number | null }`
  - `bannerSummary(level: RoadmapLevel, views: StationView[]): BannerSummary`
  - `useRoadmapProgress(level: RoadmapLevel): { views: StationView[]; mounted: boolean }`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { getRoadmapLevel } from "@/content/roadmap-stations";
import { deriveStationStates, bannerSummary } from "../roadmap-progress";

const hsk2 = getRoadmapLevel("hsk-2")!;
const stateOf = (record: Record<string, { pct: number; stars: number }>, id: string) =>
  deriveStationStates(hsk2, record).find((v) => v.station.id === id)!.state;

describe("deriveStationStates", () => {
  it("Review Focus #1 — store rỗng: deterministic, trạm 1 active, còn lại locked", () => {
    const views = deriveStationStates(hsk2, {});
    expect(views.map((v) => v.state)).toEqual([
      "active", "locked", "locked", "locked", "locked", "locked", "locked",
    ]);
    expect(views[0].pct).toBe(0);
  });

  it("trạm 1 done 3 sao → trạm 2 active với pct riêng", () => {
    const rec = { "1": { pct: 100, stars: 3 as const } };
    expect(stateOf(rec, "1")).toBe("done");
    expect(stateOf(rec, "2")).toBe("active");
    const v2 = deriveStationStates(hsk2, rec).find((v) => v.station.id === "2")!;
    expect(v2.pct).toBe(0);
  });

  it("trạm active giữ pct từ record (55%)", () => {
    const rec = { "4": { pct: 55, stars: 0 as const } };
    // trạm 4 active giả định khi 1–3 done
    const rec2 = { ...rec, "1": { pct: 100, stars: 3 as const }, "2": { pct: 100, stars: 3 as const }, "3": { pct: 100, stars: 3 as const } };
    const v4 = deriveStationStates(hsk2, rec2).find((v) => v.station.id === "4")!;
    expect(v4.state).toBe("active");
    expect(v4.pct).toBe(55);
  });

  it("Review Focus #4 — milestone luôn locked khi còn lesson chưa done, kể cả record lạ", () => {
    const rec = { m: { pct: 100, stars: 3 as const } }; // milestone có record nhưng trạm 1 chưa done
    expect(stateOf(rec, "m")).toBe("locked");
  });

  it("tất cả lesson done → milestone active; milestone done khi record 100", () => {
    const allDone = Object.fromEntries(
      ["1", "2", "3", "4", "5", "6"].map((id) => [id, { pct: 100, stars: 3 as const }]),
    );
    expect(stateOf(allDone, "m")).toBe("active");
    const recM = { ...allDone, m: { pct: 100, stars: 3 as const } };
    expect(stateOf(recM, "m")).toBe("done");
  });

  it("active chỉ gán cho lesson đầu tiên chưa done (dù record rải rác)", () => {
    const rec = { "2": { pct: 50, stars: 0 as const } };
    expect(stateOf(rec, "1")).toBe("active");
    expect(stateOf(rec, "2")).toBe("locked");
  });
});

describe("bannerSummary", () => {
  it("pct = trung bình pct các trạm lesson (milestone không tính)", () => {
    const rec: Record<string, { pct: number; stars: 0 }> = {};
    ["1", "2", "3"].forEach((id) => (rec[id] = { pct: 100, stars: 0 }));
    rec["4"] = { pct: 50, stars: 0 };
    const views = deriveStationStates(hsk2, rec);
    // 3 trăm + 1 nửa trên 6 lesson = (100+100+100+50+0+0)/6 ≈ 58
    expect(bannerSummary(hsk2, views).pct).toBe(58);
  });
  it("currentTitle = 'Trạm 4: Sở thích & Thời gian rảnh'", () => {
    const rec: Record<string, { pct: number; stars: 0 }> = {};
    ["1", "2", "3"].forEach((id) => (rec[id] = { pct: 100, stars: 0 }));
    const views = deriveStationStates(hsk2, rec);
    expect(bannerSummary(hsk2, views).currentTitle).toBe("Trạm 4: Sở thích & Thời gian rảnh");
  });
  it("remainingToMilestone = số lesson trước milestone chưa done", () => {
    const rec: Record<string, { pct: number; stars: 0 }> = {};
    ["1", "2", "3"].forEach((id) => (rec[id] = { pct: 100, stars: 0 }));
    const views = deriveStationStates(hsk2, rec);
    expect(bannerSummary(hsk2, views).remainingToMilestone).toBe(2); // trạm 4, 5
  });
  it("level không trạm (hsk-1): pct 100, current null", () => {
    const hsk1 = getRoadmapLevel("hsk-1")!;
    const s = bannerSummary(hsk1, deriveStationStates(hsk1, {}));
    expect(s.pct).toBe(100);
    expect(s.currentTitle).toBeNull();
  });
});
```

- [ ] **Step 2: Run test verify FAIL**

Run: `npx vitest run src/lib/__tests__/roadmap-progress.test.ts`
Expected: FAIL — module `../roadmap-progress` không tồn tại.

- [ ] **Step 3: Implement `src/lib/roadmap-progress.ts`**

```ts
"use client";

/* Derive trạng thái trạm serpentine từ progressStore (spec 2026-10-04 §5).
   Thuần + mount-gate SSR-safe như lib/home-summary.ts. */

import { useEffect, useState } from "react";
import type { RoadmapLevel, Station } from "@/content/roadmap-stations";
import { progressStore, type StationProgress } from "@/lib/store/progress-store";

export type StationState = "done" | "active" | "locked";

export type StationView = {
  station: Station;
  state: StationState;
  pct: number; // 0–100
  stars: number; // 0–3
};

export function deriveStationStates(
  level: RoadmapLevel,
  record: Record<string, StationProgress>,
): StationView[] {
  let allLessonsDone = true;
  const base = level.stations.map((station) => {
    const rec = record[station.id] ?? null;
    if (station.kind === "milestone") {
      return { station, rec, done: rec != null && rec.pct >= 100, isLesson: false };
    }
    const done = rec != null && rec.pct >= 100;
    if (!done) allLessonsDone = false;
    return { station, rec, done, isLesson: true };
  });

  let activeAssigned = false;
  return base.map(({ station, rec, done, isLesson }) => {
    if (!isLesson) {
      // Milestone chỉ mở khi toàn bộ lesson xong (Review Focus #4)
      if (done) return { station, state: "done", pct: 100, stars: rec?.stars ?? 0 };
      if (allLessonsDone) return { station, state: "active", pct: 0, stars: 0 };
      return { station, state: "locked", pct: 0, stars: 0 };
    }
    if (done) return { station, state: "done", pct: 100, stars: rec?.stars ?? 0 };
    if (!activeAssigned) {
      activeAssigned = true;
      return { station, state: "active", pct: rec?.pct ?? 0, stars: rec?.stars ?? 0 };
    }
    return { station, state: "locked", pct: 0, stars: 0 };
  });
}

export type BannerSummary = {
  pct: number;
  currentTitle: string | null;
  remainingToMilestone: number | null;
};

export function bannerSummary(level: RoadmapLevel, views: StationView[]): BannerSummary {
  const lessons = views.filter((v) => v.station.kind === "lesson");
  const pct =
    lessons.length > 0
      ? Math.round(lessons.reduce((s, v) => s + v.pct, 0) / lessons.length)
      : 100;
  const current = views.find((v) => v.state === "active" && v.station.kind === "lesson") ?? null;
  const milestoneIdx = level.stations.findIndex((s) => s.kind === "milestone");
  const remaining =
    milestoneIdx >= 0
      ? lessons.filter(
          (v) =>
            level.stations.findIndex((s) => s.id === v.station.id) < milestoneIdx &&
            v.state !== "done",
        ).length
      : null;
  return { pct, currentTitle: current ? `${current.station.no}: ${current.station.title}` : null, remainingToMilestone: remaining };
}

/* mounted=false trước effect → view rỗng khi SSR, không đọc localStorage lúc render. */
export function useRoadmapProgress(level: RoadmapLevel): { views: StationView[]; mounted: boolean } {
  const [record, setRecord] = useState<Record<string, StationProgress>>({});
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const sync = () => {
      try {
        setRecord(progressStore.getStationProgress(level.id));
      } catch {
        setRecord({});
      }
    };
    sync();
    setMounted(true);
    window.addEventListener("nhai:progress", sync);
    return () => window.removeEventListener("nhai:progress", sync);
  }, [level.id]);
  return { views: deriveStationStates(level, record), mounted };
}
```

- [ ] **Step 4: Run test verify PASS**

Run: `npx vitest run src/lib/__tests__/roadmap-progress.test.ts`
Expected: PASS 10/10.

- [ ] **Step 5: Commit**

```bash
git add src/lib/roadmap-progress.ts src/lib/__tests__/roadmap-progress.test.ts
git commit -m "feat(roadmap): deriveStationStates + bannerSummary + useRoadmapProgress"
```

---

### Task 5: `LevelSwitcher`

**Files:**
- Create: `src/components/roadmap/level-switcher.tsx`
- Test: `src/components/roadmap/__tests__/level-switcher.test.tsx`

**Interfaces:**
- Consumes: `SegmentedTabs` (`ui/segmented-tabs.tsx` — props `tabs/value/onChange/label/className`), `LevelId` (Task 2).
- Produces: `LevelSwitcher({ levels: {id: LevelId; label: string}[], value: LevelId, onChange: (id: LevelId) => void, className? })` — Task 6/12 dùng.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LevelSwitcher } from "../level-switcher";

const levels = [
  { id: "hsk-1" as const, label: "HSK 1" },
  { id: "hsk-2" as const, label: "HSK 2" },
  { id: "hsk-3" as const, label: "HSK 3" },
  { id: "hsk-4-6" as const, label: "HSK 4–6" },
];

describe("LevelSwitcher", () => {
  it("render 4 nút, group aria-label đúng mock", () => {
    render(<LevelSwitcher levels={levels} value="hsk-2" onChange={() => {}} />);
    expect(screen.getByRole("group", { name: "Chọn cấp độ HSK" })).toBeTruthy();
    for (const l of levels) expect(screen.getByRole("button", { name: l.label })).toBeTruthy();
    expect(screen.getByRole("button", { name: "HSK 2" })).toHaveAttribute("aria-pressed", "true");
  });
  it("click gọi onChange với LevelId đúng", async () => {
    const onChange = vi.fn();
    render(<LevelSwitcher levels={levels} value="hsk-2" onChange={onChange} />);
    await userEvent.click(screen.getByRole("button", { name: "HSK 4–6" }));
    expect(onChange).toHaveBeenCalledWith("hsk-4-6");
  });
});
```

- [ ] **Step 2: Run test verify FAIL**

Run: `npx vitest run src/components/roadmap/__tests__/level-switcher.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Implement**

```tsx
"use client";

/* Level switcher topbar (port .levels của opendesign_hsk/roadmap.html) —
   mỏng bọc SegmentedTabs, giữ aria-pressed của primitive (spec §8). */
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import type { LevelId } from "@/content/roadmap-stations";

export function LevelSwitcher({
  levels,
  value,
  onChange,
  className,
}: {
  levels: ReadonlyArray<{ id: LevelId; label: string }>;
  value: LevelId;
  onChange: (id: LevelId) => void;
  className?: string;
}) {
  return (
    <SegmentedTabs
      label="Chọn cấp độ HSK"
      tabs={levels.map((l) => ({ key: l.id, label: l.label }))}
      value={value}
      onChange={onChange}
      className={className}
    />
  );
}
```

- [ ] **Step 4: Run test verify PASS**

Run: `npx vitest run src/components/roadmap/__tests__/level-switcher.test.tsx`
Expected: PASS 2/2.

- [ ] **Step 5: Commit**

```bash
git add src/components/roadmap/level-switcher.tsx src/components/roadmap/__tests__/level-switcher.test.tsx
git commit -m "feat(roadmap): LevelSwitcher bọc SegmentedTabs (port .levels mock)"
```

---

### Task 6: `RoadmapTopbar`

**Files:**
- Create: `src/components/roadmap/roadmap-topbar.tsx`
- Test: `src/components/roadmap/__tests__/roadmap-topbar.test.tsx`

**Interfaces:**
- Consumes: `LevelSwitcher` (Task 5), icon `ArrowLeft` + `ICON_STROKE` qua barrel.
- Produces: `RoadmapTopbar({ levels, value, onLevelChange, pct })` — Task 12 dùng. KHÔNG có theme toggle (shell toàn cục đã có — spec §6).

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RoadmapTopbar } from "../roadmap-topbar";

const levels = [
  { id: "hsk-1" as const, label: "HSK 1" },
  { id: "hsk-2" as const, label: "HSK 2" },
];

describe("RoadmapTopbar", () => {
  it("back-link về Home", () => {
    render(<RoadmapTopbar levels={levels} value="hsk-2" onLevelChange={() => {}} pct={30} />);
    expect(screen.getByRole("link", { name: /Home/ }).getAttribute("href")).toBe("/");
  });
  it("head-progress hiện % + progressbar con", () => {
    render(<RoadmapTopbar levels={levels} value="hsk-2" onLevelChange={() => {}} pct={30} />);
    expect(screen.getByText("30%")).toBeTruthy();
  });
  it("không có nút theme toggle (shell đã có — spec §6)", () => {
    render(<RoadmapTopbar levels={levels} value="hsk-2" onLevelChange={() => {}} pct={0} />);
    expect(screen.queryByRole("button", { name: /chế độ sáng tối/i })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test verify FAIL**

Run: `npx vitest run src/components/roadmap/__tests__/roadmap-topbar.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Implement**

```tsx
"use client";

/* Topbar roadmap (port .topbar của opendesign_hsk/roadmap.html):
   back-link + level switcher + head-progress. Theme toggle thuộc shell toàn
   cục nên KHÔNG port (spec §6). Sticky + backdrop-blur như mock. */
import Link from "next/link";
import { ArrowLeft, ICON_STROKE } from "@/components/ui/icon";
import { LevelSwitcher } from "./level-switcher";
import type { LevelId } from "@/content/roadmap-stations";

export function RoadmapTopbar({
  levels,
  value,
  onLevelChange,
  pct,
}: {
  levels: ReadonlyArray<{ id: LevelId; label: string }>;
  value: LevelId;
  onLevelChange: (id: LevelId) => void;
  pct: number;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border-default bg-surface-paper/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2.5 px-6 py-2.5 max-[640px]:px-4">
        <Link
          href="/"
          className="inline-flex min-h-10 items-center gap-2 rounded-control border border-border-default bg-surface-elevated py-1 pl-2.5 pr-3.5 text-[13px] font-bold hover:border-border-strong"
        >
          <ArrowLeft size={15} strokeWidth={2.4} aria-hidden="true" />
          Home
        </Link>
        <LevelSwitcher
          className="mx-auto max-[640px]:order-last max-[640px]:w-full"
          levels={levels}
          value={value}
          onChange={onLevelChange}
        />
        <div className="flex items-center gap-2 text-[12.5px] font-bold text-text-secondary" aria-label={`Tiến độ ${pct}%`}>
          <span>{pct}%</span>
          <span className="h-1.5 w-[90px] overflow-hidden rounded-full bg-ring-track">
            <span className="block h-full rounded-full bg-jade transition-[width] duration-700" style={{ width: `${pct}%` }} />
          </span>
        </div>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Run test verify PASS**

Run: `npx vitest run src/components/roadmap/__tests__/roadmap-topbar.test.tsx`
Expected: PASS 3/3.

- [ ] **Step 5: Commit**

```bash
git add src/components/roadmap/roadmap-topbar.tsx src/components/roadmap/__tests__/roadmap-topbar.test.tsx
git commit -m "feat(roadmap): RoadmapTopbar back-link + switcher + head-progress (port .topbar)"
```

---

### Task 7: `MilestoneBanner`

**Files:**
- Create: `src/components/roadmap/milestone-banner.tsx`
- Test: `src/components/roadmap/__tests__/milestone-banner.test.tsx`

**Interfaces:**
- Consumes: `cn` (`@/lib/cn`).
- Produces: `MilestoneBanner({ kicker, title, sub: ReactNode, pct, currentLabel: ReactNode, endLabel: ReactNode, ariaLabel, className? })` — Task 12 dùng cho cả 3 dạng level.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MilestoneBanner } from "../milestone-banner";

describe("MilestoneBanner", () => {
  it("render kicker, title, progressbar với aria-valuenow", () => {
    render(
      <MilestoneBanner
        kicker="CHẶNG 1 · NỀN TẢNG GIAO TIẾP"
        title="Chặng 1: Giao tiếp thường nhật"
        sub={<>Đã đạt: <b>6/20 bài</b> hoàn thành (30%)</>}
        pct={30}
        ariaLabel="Tiến độ chặng 1"
        currentLabel={<>Trạm hiện tại: <b>Trạm 4: Sở thích</b></>}
        endLabel={<>Còn <b>2 bài</b> tới mốc kiểm tra</>}
      />,
    );
    expect(screen.getByText("CHẶNG 1 · NỀN TẢNG GIAO TIẾP")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Chặng 1: Giao tiếp thường nhật" })).toBeTruthy();
    expect(screen.getByRole("progressbar", { name: "Tiến độ chặng 1" }).getAttribute("aria-valuenow")).toBe("30");
  });
  it("meta row 2 đầu hiện cả currentLabel và endLabel", () => {
    render(
      <MilestoneBanner
        kicker="K" title="T" sub="S" pct={0} ariaLabel="P"
        currentLabel="Trạm hiện tại: X" endLabel="Còn 14 bài"
      />,
    );
    expect(screen.getByText(/Trạm hiện tại: X/)).toBeTruthy();
    expect(screen.getByText(/Còn 14 bài/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test verify FAIL**

Run: `npx vitest run src/components/roadmap/__tests__/milestone-banner.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Implement**

```tsx
/* Banner tiến độ chặng (port .banner của opendesign_hsk/roadmap.html).
   sub/currentLabel/endLabel là ReactNode vì client island nhúng <b>/<Link>. */
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function MilestoneBanner({
  kicker,
  title,
  sub,
  pct,
  currentLabel,
  endLabel,
  ariaLabel,
  className,
}: {
  kicker: string;
  title: string;
  sub: ReactNode;
  pct: number;
  currentLabel: ReactNode;
  endLabel: ReactNode;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <section
      aria-label={ariaLabel}
      className={cn("rounded-card border border-border-default bg-surface-elevated p-5 shadow-xs", className)}
    >
      <p className="text-[11px] font-extrabold tracking-[0.1em] text-text-secondary">{kicker}</p>
      <h1 className="mt-1 text-xl tracking-[-0.01em]">{title}</h1>
      <p className="mt-0.5 text-[13px] text-text-secondary">{sub}</p>
      <div
        role="progressbar"
        aria-label={ariaLabel}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="mt-3 h-2 overflow-hidden rounded-full bg-ring-track"
      >
        <div
          className="h-full rounded-full bg-jade transition-[width] duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between gap-4 text-xs text-text-secondary">
        <span>{currentLabel}</span>
        <span className="text-right">{endLabel}</span>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run test verify PASS**

Run: `npx vitest run src/components/roadmap/__tests__/milestone-banner.test.tsx`
Expected: PASS 2/2.

- [ ] **Step 5: Commit**

```bash
git add src/components/roadmap/milestone-banner.tsx src/components/roadmap/__tests__/milestone-banner.test.tsx
git commit -m "feat(roadmap): MilestoneBanner kicker+title+progress jade (port .banner)"
```

---

### Task 8: `StationNode`

**Files:**
- Create: `src/components/roadmap/station-node.tsx`
- Test: `src/components/roadmap/__tests__/station-node.test.tsx`

**Interfaces:**
- Consumes: `cn`, icon barrel (`Check`, `Play`, `Lock`, `Trophy`, `ICON_STROKE`), class `.hz-node-pulse` (Task 1).
- Produces: `StationNode({ state: StationState, milestone?: boolean, label, onClick? })` — Task 10 dùng.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StationNode } from "../station-node";

describe("StationNode", () => {
  it("done: aria-label đầy đủ, không pulse", () => {
    render(<StationNode state="done" label="Trạm 1: Chào hỏi — hoàn thành" onClick={() => {}} />);
    const node = screen.getByRole("button", { name: "Trạm 1: Chào hỏi — hoàn thành" });
    expect(node.className).not.toContain("hz-node-pulse");
    expect(node.className).toContain("border-jade");
  });
  it("active: có class pulse, disabled animation qua CSS reduced-motion (class tĩnh)", () => {
    render(<StationNode state="active" label="Trạm 4 — đang học" />);
    expect(screen.getByRole("button").className).toContain("hz-node-pulse");
  });
  it("locked: nền muted", () => {
    render(<StationNode state="locked" label="Trạm 5 — đang khóa" />);
    expect(screen.getByRole("button").className).toContain("bg-surface-muted");
  });
  it("milestone: diamond 45° + trophy, vẫn bấm được", async () => {
    const onClick = vi.fn();
    render(<StationNode state="locked" milestone label="Milestone — đang khóa" onClick={onClick} />);
    const node = screen.getByRole("button", { name: "Milestone — đang khóa" });
    expect(node.className).toContain("rotate-45");
    await userEvent.click(node);
    expect(onClick).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test verify FAIL**

Run: `npx vitest run src/components/roadmap/__tests__/station-node.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Implement**

```tsx
"use client";

/* Node tròn 56px giữa spine (port .node của opendesign_hsk/roadmap.html):
   done=Check jade, active=Play + pulse, locked=Lock muted; milestone là
   diamond 48px rotate-45 nền amber-wash (port .node.mile). */
import { Check, Lock, Play, Trophy, ICON_STROKE } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { StationState } from "@/lib/roadmap-progress";

export function StationNode({
  state,
  milestone = false,
  label,
  onClick,
}: {
  state: StationState;
  milestone?: boolean;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        "grid shrink-0 place-items-center rounded-full border-2 bg-surface-elevated transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-md",
        "h-14 w-14 min-h-14 min-w-14",
        milestone
          ? "h-12 w-12 min-h-12 min-w-12 rotate-45 rounded-[15px] border-learning-streak bg-amber-wash text-amber-ink"
          : state === "done"
            ? "border-jade text-jade"
            : state === "active"
              ? "border-action-primary text-action-primary hz-node-pulse"
              : "border-border-default bg-surface-muted text-text-secondary",
        state === "locked" && "cursor-not-allowed",
      )}
    >
      <span className={cn("grid place-items-center", milestone && "rotate-[-45deg]")} aria-hidden="true">
        {milestone ? (
          <Trophy size={20} strokeWidth={ICON_STROKE} />
        ) : state === "done" ? (
          <Check size={22} strokeWidth={2.6} />
        ) : state === "active" ? (
          <Play size={13} className="fill-current" strokeWidth={ICON_STROKE} />
        ) : (
          <Lock size={20} strokeWidth={ICON_STROKE} />
        )}
      </span>
    </button>
  );
}
```

- [ ] **Step 4: Run test verify PASS**

Run: `npx vitest run src/components/roadmap/__tests__/station-node.test.tsx`
Expected: PASS 4/4.

- [ ] **Step 5: Commit**

```bash
git add src/components/roadmap/station-node.tsx src/components/roadmap/__tests__/station-node.test.tsx
git commit -m "feat(roadmap): StationNode 4 state + diamond milestone (port .node)"
```

---

### Task 9: `StationCard`

**Files:**
- Create: `src/components/roadmap/station-card.tsx`
- Test: `src/components/roadmap/__tests__/station-card.test.tsx`

**Interfaces:**
- Consumes: `StationView` (Task 4), `cn`, icon barrel (`Star`, `Play`, `Trophy`, `ICON_STROKE`).
- Produces: `StationCard({ view, side: "left"|"right", onOpen(id), onContinue(id) })` — Task 10 dùng. Active card là `<div>` (card bọc CTA button — mock cũng vậy), còn lại là `<button>`.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StationCard } from "../station-card";
import { getRoadmapLevel } from "@/content/roadmap-stations";
import type { StationView } from "@/lib/roadmap-progress";

const hsk2 = getRoadmapLevel("hsk-2")!;
const mkView = (id: string, state: StationView["state"]): StationView => ({
  station: hsk2.stations.find((s) => s.id === id)!,
  state,
  pct: state === "done" ? 100 : state === "active" ? 55 : 0,
  stars: state === "done" ? 3 : 0,
});

describe("StationCard", () => {
  it("done: title + meta + 3 sao, click mở drawer", async () => {
    const onOpen = vi.fn();
    render(<StationCard view={mkView("1", "done")} side="left" onOpen={onOpen} onContinue={() => {}} />);
    expect(screen.getByText(/Trạm 1: Chào hỏi & Làm quen/)).toBeTruthy();
    expect(screen.getByLabelText("Đạt 3/3 sao")).toBeTruthy();
    await userEvent.click(screen.getByRole("button"));
    expect(onOpen).toHaveBeenCalledWith("1");
  });

  it("active: float-badge ĐANG HỌC · 55% + CTA Vào bài học (onContinue, không onOpen)", async () => {
    const onOpen = vi.fn();
    const onContinue = vi.fn();
    render(<StationCard view={mkView("4", "active")} side="right" onOpen={onOpen} onContinue={onContinue} />);
    expect(screen.getByText(/ĐANG HỌC · 55%/)).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /Vào bài học/ }));
    expect(onContinue).toHaveBeenCalledWith("4");
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("locked: meta khóa, không sao", () => {
    render(<StationCard view={mkView("5", "locked")} side="left" onOpen={() => {}} onContinue={() => {}} />);
    expect(screen.getByText(/Khóa · mở sau khi xong Bài 4/)).toBeTruthy();
    expect(screen.queryByLabelText(/sao/)).toBeNull();
  });

  it("milestone: MILESTONE + diamond gem, click mở drawer", async () => {
    const onOpen = vi.fn();
    render(<StationCard view={mkView("m", "locked")} side="right" onOpen={onOpen} onContinue={() => {}} />);
    expect(screen.getByText(/MILESTONE: Ôn tập chặng/)).toBeTruthy();
    expect(screen.getByRole("button").className).not.toContain("border-action-primary");
    await userEvent.click(screen.getByRole("button"));
    expect(onOpen).toHaveBeenCalledWith("m");
  });
});
```

- [ ] **Step 2: Run test verify FAIL**

Run: `npx vitest run src/components/roadmap/__tests__/station-card.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Implement**

```tsx
"use client";

/* Card trạm (port .station của opendesign_hsk/roadmap.html) — 4 biến thể:
   done (3 sao), active (float-badge + mini-bar + CTA), locked (mờ), milestone
   (diamond gem trophy). Connector nét đứt card→node port qua after: pseudo
   (.station::after), mobile <760px thu 13px. */
import { Play, Star, Trophy, ICON_STROKE } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { StationView } from "@/lib/roadmap-progress";

function connectorClasses(side: "left" | "right"): string {
  return cn(
    "relative after:absolute after:top-1/2 after:border-t-2 after:border-dashed after:border-border-default after:content-['']",
    side === "left"
      ? "after:right-[-25px] after:w-[25px] max-[760px]:after:right-auto max-[760px]:after:left-[-13px] max-[760px]:after:w-[13px]"
      : "after:left-[-25px] after:w-[25px] max-[760px]:after:left-[-13px] max-[760px]:after:w-[13px]",
  );
}

export function StationCard({
  view,
  side,
  onOpen,
  onContinue,
}: {
  view: StationView;
  side: "left" | "right";
  onOpen: (stationId: string) => void;
  onContinue: (stationId: string) => void;
}) {
  const { station, state, pct, stars } = view;
  const base = cn(
    "w-full max-w-[340px] max-[760px]:max-w-none rounded-card border bg-surface-elevated p-4 text-left shadow-xs",
    "transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:shadow-md",
    connectorClasses(side),
    state === "active" && "border-2 border-action-primary",
    state === "locked" && "cursor-not-allowed bg-surface-muted opacity-85",
  );

  // Milestone: diamond gem + tiêu đề MILESTONE (port .mile-diamond)
  if (station.kind === "milestone") {
    return (
      <button type="button" onClick={() => onOpen(station.id)} className={base}>
        <span className="flex items-center gap-2.5">
          <span className="grid h-11 w-11 shrink-0 rotate-45 place-items-center rounded-xl border border-learning-streak bg-amber-wash">
            <Trophy size={18} strokeWidth={ICON_STROKE} className="-rotate-45 text-learning-streak" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-extrabold">MILESTONE: Ôn tập chặng &amp; Mini test</span>
            <span className="mt-1 block text-[12.5px] text-text-secondary">{station.meta}</span>
          </span>
        </span>
      </button>
    );
  }

  // Active: div vì bên trong có CTA button (như mock .station.current)
  if (state === "active") {
    return (
      <div className={base}>
        <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-action-primary px-3 py-1 text-[11px] font-extrabold tracking-[0.06em] text-white">
          <Star size={11} className="fill-current" aria-hidden="true" />
          {station.no.toUpperCase()} ĐANG HỌC · {pct}%
        </span>
        <h3 className="text-sm leading-snug">
          {station.title} <span className="zh font-bold text-text-secondary">{station.zh}</span>
        </h3>
        <p className="mt-1 text-[12.5px] text-text-secondary">
          Tiến độ: <b className="text-text-primary">{pct}%</b>
        </p>
        <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-ring-track">
          <div className="h-full rounded-full bg-jade" style={{ width: `${pct}%` }} />
        </div>
        <button
          type="button"
          onClick={() => onContinue(station.id)}
          className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-control border border-action-primary bg-action-primary px-4 text-[13.5px] font-bold text-white hover:bg-action-primary-hover"
        >
          <Play size={13} className="fill-current" aria-hidden="true" />
          Vào bài học
        </button>
      </div>
    );
  }

  // Done / locked: cả card là button mở drawer
  return (
    <button type="button" onClick={() => onOpen(station.id)} className={base}>
      <h3 className="text-sm leading-snug">
        {station.no}: {station.title} <span className="zh font-bold text-text-secondary">{station.zh}</span>
      </h3>
      <p className="mt-1 text-[12.5px] text-text-secondary">{station.meta}</p>
      {state === "done" && (
        <span className="mt-2 flex gap-0.5 text-amber-ink" aria-label={`Đạt ${stars}/3 sao`}>
          {[0, 1, 2].map((i) => (
            <Star key={i} size={13} className={cn(i < stars ? "fill-current" : "opacity-30")} aria-hidden="true" />
          ))}
        </span>
      )}
    </button>
  );
}
```

- [ ] **Step 4: Run test verify PASS**

Run: `npx vitest run src/components/roadmap/__tests__/station-card.test.tsx`
Expected: PASS 4/4.

- [ ] **Step 5: Commit**

```bash
git add src/components/roadmap/station-card.tsx src/components/roadmap/__tests__/station-card.test.tsx
git commit -m "feat(roadmap): StationCard 4 biến thể + connector nét đứt (port .station)"
```

---

### Task 10: `SerpentinePath`

**Files:**
- Create: `src/components/roadmap/serpentine-path.tsx`
- Test: `src/components/roadmap/__tests__/serpentine-path.test.tsx`

**Interfaces:**
- Consumes: `StationView` (Task 4), `StationNode` (Task 8), `StationCard` (Task 9).
- Produces: `SerpentinePath({ views, onOpen(id), onContinue(id) })` — Task 12 dùng.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SerpentinePath } from "../serpentine-path";
import { getRoadmapLevel } from "@/content/roadmap-stations";
import { deriveStationStates } from "@/lib/roadmap-progress";

const hsk2 = getRoadmapLevel("hsk-2")!;

describe("SerpentinePath", () => {
  it("store rỗng: 1 node đang học + 6 node đang khóa (5 lesson + milestone)", () => {
    render(<SerpentinePath views={deriveStationStates(hsk2, {})} onOpen={() => {}} onContinue={() => {}} />);
    expect(screen.getAllByRole("button", { name: /— đang học$/ })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: /— đang khóa/ })).toHaveLength(6);
  });

  it("card xen kẽ trái/phải: label node chứa aria đúng mock", () => {
    render(<SerpentinePath views={deriveStationStates(hsk2, {})} onOpen={() => {}} onContinue={() => {}} />);
    expect(screen.getByRole("button", { name: "Trạm 1: Chào hỏi & Làm quen — đang học" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Milestone ôn tập chặng — đang khóa" }),
    ).toBeTruthy();
  });

  it("click node khóa gọi onOpen với id đúng", async () => {
    const onOpen = vi.fn();
    render(<SerpentinePath views={deriveStationStates(hsk2, {})} onOpen={onOpen} onContinue={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Trạm 2: Số đếm & Mua sắm — đang khóa" }));
    expect(onOpen).toHaveBeenCalledWith("2");
  });

  it("CTA 'Vào bài học' của card active gọi onContinue", async () => {
    const onContinue = vi.fn();
    render(<SerpentinePath views={deriveStationStates(hsk2, {})} onOpen={() => {}} onContinue={onContinue} />);
    await userEvent.click(screen.getByRole("button", { name: /Vào bài học/ }));
    expect(onContinue).toHaveBeenCalledWith("1");
  });
});
```

- [ ] **Step 2: Run test verify FAIL**

Run: `npx vitest run src/components/roadmap/__tests__/serpentine-path.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Implement**

```tsx
"use client";

/* Serpentine path (port .path-wrap của opendesign_hsk/roadmap.html):
   spine nét đứt giữa, grid [1fr 72px 1fr] xen kẽ trái/phải (side suy ra từ
   index — spec §4), <760px thu còn [56px 1fr] 1 cột. */
import { StationCard } from "./station-card";
import { StationNode } from "./station-node";
import type { StationView } from "@/lib/roadmap-progress";

export function SerpentinePath({
  views,
  onOpen,
  onContinue,
}: {
  views: StationView[];
  onOpen: (stationId: string) => void;
  onContinue: (stationId: string) => void;
}) {
  return (
    <div className="relative pt-2">
      {/* spine — aria-hidden, mobile dịch về left 28px (= 56px/2) */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-1/2 top-0 w-0 -translate-x-1/2 border-l-2 border-dashed border-border-default max-[760px]:left-7 max-[760px]:translate-x-0"
      />
      <div className="relative flex flex-col gap-1">
        {views.map((v, i) => {
          const side = i % 2 === 0 ? ("left" as const) : ("right" as const);
          const nodeLabel =
            v.station.kind === "milestone"
              ? `Milestone ôn tập chặng — ${v.state === "locked" ? "đang khóa" : v.state === "active" ? "đang học" : "hoàn thành"}`
              : `${v.station.no}: ${v.station.title} — ${v.state === "locked" ? "đang khóa" : v.state === "active" ? "đang học" : "hoàn thành"}`;
          const card = (
            <StationCard view={v} side={side} onOpen={onOpen} onContinue={onContinue} />
          );
          const slotClass =
            "min-w-0 max-[760px]:col-start-2 max-[760px]:row-start-1 max-[760px]:justify-self-stretch";
          return (
            <div
              key={v.station.id}
              className="grid min-h-[132px] grid-cols-[1fr_72px_1fr] items-center max-[760px]:min-h-0 max-[760px]:grid-cols-[56px_1fr] max-[760px]:py-2.5"
            >
              <div className={cn(slotClass, side === "left" && "justify-self-end")}>
                {side === "left" ? card : null}
              </div>
              <div className="relative z-[1] flex justify-center max-[760px]:col-start-1 max-[760px]:row-start-1">
                <StationNode
                  state={v.state}
                  milestone={v.station.kind === "milestone"}
                  label={nodeLabel}
                  onClick={() => onOpen(v.station.id)}
                />
              </div>
              <div className={cn(slotClass, side === "right" && "justify-self-start")}>
                {side === "right" ? card : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

Lưu ý: trên desktop slot trái luôn là cột 1, node cột 2, slot phải cột 3 theo thứ tự DOM — không cần col-start tường minh. Trên mobile cả 2 slot card ép `col-start-2 row-start-1`, node `col-start-1 row-start-1`. Thêm `import { cn } from "@/lib/cn";` vào đầu file.

- [ ] **Step 4: Run test verify PASS**

Run: `npx vitest run src/components/roadmap/__tests__/serpentine-path.test.tsx`
Expected: PASS 4/4.

- [ ] **Step 5: Commit**

```bash
git add src/components/roadmap/serpentine-path.tsx src/components/roadmap/__tests__/serpentine-path.test.tsx
git commit -m "feat(roadmap): SerpentinePath spine + grid xen kẽ trái/phải (port .path-wrap)"
```

---

### Task 11: `StationDrawer`

**Files:**
- Create: `src/components/roadmap/station-drawer.tsx`
- Test: `src/components/roadmap/__tests__/station-drawer.test.tsx`

**Interfaces:**
- Consumes: `StationView` (Task 4), `Chip` tone doing/todo, `SegmentedTabs`, `useTts` (`{ speak, cancel, speaking }`), `useToastSafe` (`(msg) => void`), icon barrel (`X`, `Volume2`, `MonitorPlay`, `PencilLine`, `HelpCircle`, `ICON_STROKE`).
- Produces: `StationDrawer({ view: StationView | null, open: boolean, onClose: () => void })` — Task 12 dùng.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StationDrawer } from "../station-drawer";
import { getRoadmapLevel } from "@/content/roadmap-stations";
import type { StationView } from "@/lib/roadmap-progress";

const tts = vi.hoisted(() => ({ speak: vi.fn(), cancel: vi.fn(), speaking: false }));
vi.mock("@/lib/tts/use-tts", () => ({ useTts: () => tts }));

const hsk2 = getRoadmapLevel("hsk-2")!;
const mkView = (id: string, state: StationView["state"]): StationView => ({
  station: hsk2.stations.find((s) => s.id === id)!,
  state,
  pct: state === "done" ? 100 : state === "active" ? 55 : 0,
  stars: state === "done" ? 3 : 0,
});

beforeEach(() => {
  tts.speak.mockClear();
});

describe("StationDrawer", () => {
  it("đóng: panel translate ra ngoài, overlay không chặn pointer", () => {
    render(<StationDrawer view={null} open={false} onClose={() => {}} />);
    expect(screen.getByRole("dialog", { hidden: true }).className).toContain("translate-x-[102%]");
  });

  it("mở trạm active: status ĐANG HỌC, title, sub, 2 tab, 3 nút launch", () => {
    render(<StationDrawer view={mkView("4", "active")} open onClose={() => {}} />);
    expect(screen.getByText(/ĐANG HỌC · TRẠM 4/)).toBeTruthy();
    expect(screen.getByText(/Bài 4: Sở thích & Thời gian rảnh/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Từ vựng mới" })).toHaveAttribute("aria-pressed", "true");
    for (const act of ["Học Flashcard", "Luyện viết Hanzi", "Thi trắc nghiệm Quiz"]) {
      expect(screen.getByRole("button", { name: act })).toBeTruthy();
    }
  });

  it("vocab row: nút audio gọi speak(zh)", async () => {
    render(<StationDrawer view={mkView("4", "active")} open onClose={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Nghe phát âm 爱好" }));
    expect(tts.speak).toHaveBeenCalledWith("爱好");
  });

  it("tab Ngữ pháp trọng tâm: hiện điểm ngữ pháp", async () => {
    render(<StationDrawer view={mkView("4", "active")} open onClose={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Ngữ pháp trọng tâm" }));
    expect(screen.getByText("Câu chữ 把")).toBeTruthy();
    expect(screen.getByText("把 + tân ngữ + V + 补语")).toBeTruthy();
  });

  it("Escape gọi onClose khi mở (Review Focus #5 — đóng thì không)", async () => {
    const onClose = vi.fn();
    const { rerender } = render(<StationDrawer view={mkView("1", "done")} open onClose={onClose} />);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    rerender(<StationDrawer view={mkView("1", "done")} open={false} onClose={onClose} />);
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onClose).toHaveBeenCalledTimes(1); // không tăng — no-op khi đóng
  });

  it("click nút launch gọi toast qua provider (test dùng useToastSafe → cần ToastProvider)", async () => {
    // Smoke: không crash khi không có provider (useToastSafe no-op)
    render(<StationDrawer view={mkView("1", "done")} open onClose={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: "Học Flashcard" }));
  });
});
```

- [ ] **Step 2: Run test verify FAIL**

Run: `npx vitest run src/components/roadmap/__tests__/station-drawer.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Implement**

```tsx
"use client";

/* Right drawer chi tiết trạm (port .drawer + .overlay + JS drawer của
   opendesign_hsk/roadmap.html). KHÔNG tái dụng ui/dialog (Dialog là overlay
   giữa màn hình). Audio nối useTts thật; launch buttons toast "sắp ra mắt"
   (spec §8, non-goal phase 1). */
import { useEffect, useRef, useState } from "react";
import {
  HelpCircle,
  ICON_STROKE,
  MonitorPlay,
  PencilLine,
  Volume2,
  X,
} from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { Chip } from "@/components/ui/chip";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { useTts } from "@/lib/tts/use-tts";
import { useToastSafe } from "@/components/shell/toast-provider";
import type { StationView } from "@/lib/roadmap-progress";
import type { Station } from "@/content/roadmap-stations";

const LAUNCH = [
  { act: "Học Flashcard", Icon: MonitorPlay },
  { act: "Luyện viết Hanzi", Icon: PencilLine },
  { act: "Thi trắc nghiệm Quiz", Icon: HelpCircle },
] as const;

function statusLabel(v: StationView): string {
  if (v.state === "done") return `HOÀN THÀNH · ${v.station.no.toUpperCase()}`;
  if (v.state === "active") return `ĐANG HỌC · ${v.station.no.toUpperCase()}`;
  return `ĐANG KHÓA · ${v.station.kind === "milestone" ? "MILESTONE" : `BÀI ${v.station.id}`}`;
}

export function StationDrawer({
  view,
  open,
  onClose,
}: {
  view: StationView | null;
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"vocab" | "gram">("vocab");
  const { speak } = useTts();
  const toast = useToastSafe();
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  // Focus close khi mở + focus trap + Escape + trả focus khi đóng (spec §8)
  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && panelRef.current) {
        const items = panelRef.current.querySelectorAll<HTMLElement>(
          "button, [href], input, [tabindex]:not([tabindex='-1'])",
        );
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      restoreRef.current?.focus();
    };
  }, [open, onClose]);

  // Mở drawer luôn về tab Từ vựng (như mock: mode='vocab' trong openDrawer)
  useEffect(() => {
    if (open) setTab("vocab");
  }, [open]);

  const station = view?.station ?? null;
  const state = view?.state ?? "locked";

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-50 bg-[rgba(17,19,24,0.45)] transition-opacity duration-300",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Chi tiết trạm học"
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-[420px] max-w-full flex-col border-l border-border-default bg-surface-elevated shadow-md transition-transform duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)]",
          open ? "translate-x-0" : "translate-x-[102%]",
        )}
      >
        {station && view && (
          <>
            <div className="px-5 pt-4">
              <div className="flex items-start justify-between gap-2.5">
                <Chip
                  tone={state === "active" ? "doing" : "todo"}
                  className="min-h-0 px-2.5 py-1 text-[11px] font-extrabold tracking-[0.08em]"
                >
                  {statusLabel(view)}
                </Chip>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={onClose}
                  aria-label="Đóng chi tiết"
                  className="grid h-9 w-9 place-items-center rounded-control border border-border-default bg-surface-elevated hover:border-border-strong"
                >
                  <X size={15} strokeWidth={2.4} aria-hidden="true" />
                </button>
              </div>
              <h2 className="mt-1.5 text-[17px] leading-snug">
                {station.kind === "lesson" ? `Bài ${station.id}: ` : ""}
                {station.title} <span className="zh text-action-primary">{station.zh}</span>
              </h2>
              <p className="mt-1.5 text-[12.5px] text-text-secondary">
                {state === "active"
                  ? `${station.vocab.length} từ vựng · ${view.pct}% hoàn thành · ${station.gram.length} điểm ngữ pháp`
                  : station.meta}
              </p>
            </div>
            <SegmentedTabs
              className="mx-5 mt-3.5"
              label="Tổng quan trạm"
              tabs={[
                { key: "vocab" as const, label: "Từ vựng mới" },
                { key: "gram" as const, label: "Ngữ pháp trọng tâm" },
              ]}
              value={tab}
              onChange={setTab}
            />
            <div className="flex-1 overflow-y-auto px-5 py-3.5">
              {tab === "vocab" ? <VocabList view={view} onSpeak={speak} /> : <GramList station={station} />}
            </div>
            <div className="grid gap-2 border-t border-border-default px-5 pb-5 pt-3.5">
              {LAUNCH.map(({ act, Icon }) => (
                <button
                  key={act}
                  type="button"
                  onClick={() => toast(`${act} — sắp ra mắt trong bản demo`)}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-control border border-border-default bg-surface-muted text-[13.5px] font-bold hover:-translate-y-px hover:border-border-strong hover:bg-surface-elevated"
                >
                  <Icon size={15} strokeWidth={ICON_STROKE} aria-hidden="true" />
                  {act}
                </button>
              ))}
            </div>
          </>
        )}
      </aside>
    </>
  );
}

function VocabList({ view, onSpeak }: { view: StationView; onSpeak: (zh: string) => void }) {
  const locked = view.state === "locked";
  return (
    <div>
      {locked && (
        <p className="mb-2.5 text-[12.5px] text-text-secondary">
          Xem trước khi mở khóa · audio đầy đủ sau khi hoàn thành trạm trước.
        </p>
      )}
      {view.station.vocab.map(([zh, py, vn]) => (
        <div
          key={zh}
          className="mb-2 flex items-center gap-2.5 rounded-control border border-border-default bg-surface-muted px-3 py-2.5"
        >
          <button
            type="button"
            onClick={() => onSpeak(zh)}
            aria-label={`Nghe phát âm ${zh}`}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border-default bg-surface-elevated hover:border-action-primary hover:text-action-primary"
          >
            <Volume2 size={14} strokeWidth={ICON_STROKE} aria-hidden="true" />
          </button>
          <span className="min-w-0">
            <span className="zh block text-base font-bold">{zh}</span>
            <span className="block text-xs text-text-secondary">{py}</span>
          </span>
          <span className="ml-auto text-right text-xs text-text-secondary">{vn}</span>
        </div>
      ))}
      {view.state === "active" && (
        <p className="mt-1 text-xs text-text-secondary">
          Danh sách rút gọn {view.station.vocab.length} từ · mở bài học để xem đủ + audio chuẩn.
        </p>
      )}
    </div>
  );
}

function GramList({ station }: { station: Station }) {
  return (
    <div>
      {station.gram.map(([name, desc]) => (
        <div key={name} className="mb-2 rounded-control border border-border-default bg-surface-muted p-3">
          <b className="block text-[13px]">{name}</b>
          <span className="text-[12.5px] text-text-secondary">{desc}</span>
        </div>
      ))}
      <p className="mt-1 text-xs text-text-secondary">
        Chế độ học: Flashcard · Quiz · Viết Hanzi — lưu tiến độ về dashboard.
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Run test verify PASS**

Run: `npx vitest run src/components/roadmap/__tests__/station-drawer.test.tsx`
Expected: PASS 6/6.

- [ ] **Step 5: Commit**

```bash
git add src/components/roadmap/station-drawer.tsx src/components/roadmap/__tests__/station-drawer.test.tsx
git commit -m "feat(roadmap): StationDrawer tabs+audio TTS+launch (port .drawer)"
```

---

### Task 12: Compose `roadmap-client.tsx` + thay `page.tsx`

**Files:**
- Create: `src/app/(app)/roadmap/roadmap-client.tsx`
- Modify: `src/app/(app)/roadmap/page.tsx` (thay toàn bộ nội dung)
- Test: `src/app/(app)/roadmap/__tests__/roadmap-client.test.tsx`

**Interfaces:**
- Consumes: mọi component Task 5-11; `roadmapLevels`, `getRoadmapLevel` (Task 2); `useRoadmapProgress`, `bannerSummary` (Task 4); `useToastSafe`.
- Produces: route `/roadmap` hoàn chỉnh. `?level=` sai → fallback `hsk-2` (Review Focus #3).

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ToastProvider } from "@/components/shell/toast-provider";
import { roadmapLevels } from "@/content/roadmap-stations";
import RoadmapClient from "../roadmap-client";

const nav = vi.hoisted(() => ({
  replace: vi.fn(),
  search: new URLSearchParams("level=hsk-2"),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: nav.replace }),
  useSearchParams: () => nav.search,
}));

function renderClient(level: string) {
  nav.search = new URLSearchParams(`level=${level}`);
  return render(
    <ToastProvider>
      <RoadmapClient levels={roadmapLevels} />
    </ToastProvider>,
  );
}

describe("RoadmapClient", () => {
  it("HSK 2: topbar + banner Chặng 1 + path 7 trạm + drawer đóng", () => {
    renderClient("hsk-2");
    expect(screen.getByRole("heading", { name: "Chặng 1: Giao tiếp thường nhật" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Trạm 1: Chào hỏi & Làm quen — đang học" })).toBeTruthy();
    expect(screen.getByRole("dialog", { hidden: true }).className).toContain("translate-x-[102%]");
  });

  it("Review Focus #3 — ?level=garbage fallback hsk-2 không crash", () => {
    renderClient("hsk-99");
    expect(screen.getByRole("heading", { name: "Chặng 1: Giao tiếp thường nhật" })).toBeTruthy();
  });

  it("upcoming level (hsk-3): banner Sắp ra mắt, không render path", () => {
    renderClient("hsk-3");
    expect(screen.getByText(/sắp ra mắt/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Trạm 1/ })).toBeNull();
  });

  it("click node mở drawer; click node khóa hiện toast", async () => {
    renderClient("hsk-2");
    await userEvent.click(screen.getByRole("button", { name: "Trạm 2: Số đếm & Mua sắm — đang khóa" }));
    expect(screen.getByText(/Trạm đang khóa — xong Trạm 1 để mở/)).toBeTruthy();
    expect(screen.getByText(/Bài 2: Số đếm & Mua sắm/)).toBeTruthy();
  });

  it("chuyển level gọi router.replace với ?level mới", async () => {
    renderClient("hsk-2");
    await userEvent.click(screen.getByRole("button", { name: "HSK 3" }));
    expect(nav.replace).toHaveBeenCalledWith("/roadmap?level=hsk-3", { scroll: false });
  });
});
```

- [ ] **Step 2: Run test verify FAIL**

Run: `npx vitest run "src/app/(app)/roadmap/__tests__/roadmap-client.test.tsx"`
Expected: FAIL — module `../roadmap-client` không tồn tại (page.tsx cũ chưa tham chiếu).

- [ ] **Step 3: Implement `roadmap-client.tsx`**

```tsx
"use client";

/* Client island trang /roadmap (spec 2026-10-04 §6): state level theo ?level=,
   drawer theo stationId; mọi số derive từ useRoadmapProgress (SSR-safe). */
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { RoadmapTopbar } from "@/components/roadmap/roadmap-topbar";
import { MilestoneBanner } from "@/components/roadmap/milestone-banner";
import { SerpentinePath } from "@/components/roadmap/serpentine-path";
import { StationDrawer } from "@/components/roadmap/station-drawer";
import { getRoadmapLevel, type LevelId, type RoadmapLevel } from "@/content/roadmap-stations";
import { bannerSummary, useRoadmapProgress } from "@/lib/roadmap-progress";
import { useToastSafe } from "@/components/shell/toast-provider";

export default function RoadmapClient({ levels }: { levels: RoadmapLevel[] }) {
  const search = useSearchParams();
  const router = useRouter();
  const toast = useToastSafe();
  // ?level= sai/garbage → fallback hsk-2 (Review Focus #3)
  const level = getRoadmapLevel(search.get("level") ?? "") ?? getRoadmapLevel("hsk-2")!;
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const { views, mounted } = useRoadmapProgress(level);

  const summary = bannerSummary(level, views);
  const doneCount = views.filter((v) => v.station.kind === "lesson" && v.state === "done").length;
  const lessonTotal = views.filter((v) => v.station.kind === "lesson").length;
  const activeView = views.find((v) => v.state === "active" && v.station.kind === "lesson") ?? null;
  const drawerView = views.find((v) => v.station.id === drawerId) ?? null;

  const changeLevel = (id: LevelId) => {
    router.replace(`/roadmap?level=${id}`, { scroll: false });
    toast(`Đã chuyển sang ${getRoadmapLevel(id)?.label ?? id}`);
  };

  const openDrawer = (id: string) => {
    const v = views.find((x) => x.station.id === id);
    if (v && v.state === "locked" && activeView) {
      toast(`Trạm đang khóa — xong ${activeView.station.no} để mở`);
    }
    setDrawerId(id);
  };

  const onContinue = (id: string) => {
    const no = views.find((v) => v.station.id === id)?.station.no ?? "bài học";
    toast(`Vào ${no} — chúc học tốt!`);
  };

  return (
    <>
      <RoadmapTopbar levels={levels} value={level.id} onLevelChange={changeLevel} pct={mounted ? summary.pct : 0} />
      <main className="mx-auto flex max-w-5xl flex-col gap-4 px-6 pb-20 pt-4 max-[640px]:px-4">
        {level.status === "upcoming" ? (
          <MilestoneBanner
            kicker={level.kicker}
            title={level.title}
            sub={<>Lộ trình <b>sắp ra mắt</b> · Demo hiện tập trung HSK 1–3</>}
            pct={0}
            ariaLabel={`Tiến độ ${level.label}`}
            currentLabel={<>Trạng thái: <b>Chưa mở</b></>}
            endLabel="Theo dõi cập nhật"
          />
        ) : level.stations.length === 0 ? (
          <MilestoneBanner
            kicker={level.kicker}
            title={level.title}
            sub={<>Nền tảng <b>Pinyin &amp; nét cơ bản</b> — 8 buổi phát âm</>}
            pct={100}
            ariaLabel={`Tiến độ ${level.label}`}
            currentLabel="Đã hoàn thành · ôn tập giữ streak"
            endLabel={
              <Link href="/roadmap/pinyin" className="font-bold text-action-primary">
                Xem lộ trình Pinyin →
              </Link>
            }
          />
        ) : (
          <MilestoneBanner
            kicker={level.kicker}
            title={level.title}
            sub={<>Đã đạt: <b>{doneCount}/{lessonTotal} bài</b> hoàn thành ({summary.pct}%)</>}
            pct={summary.pct}
            ariaLabel={`Tiến độ ${level.title}`}
            currentLabel={
              summary.currentTitle ? (
                <>Trạm hiện tại: <b>{summary.currentTitle}</b></>
              ) : (
                "Chưa bắt đầu"
              )
            }
            endLabel={
              summary.remainingToMilestone != null ? (
                <>Còn <b>{summary.remainingToMilestone} bài</b> tới mốc kiểm tra</>
              ) : null
            }
          />
        )}
        {level.stations.length > 0 && (
          <SerpentinePath views={views} onOpen={openDrawer} onContinue={onContinue} />
        )}
        <StationDrawer view={drawerView} open={drawerId !== null} onClose={() => setDrawerId(null)} />
      </main>
    </>
  );
}
```

- [ ] **Step 4: Thay `page.tsx`**

```tsx
import { Suspense } from "react";
import RoadmapClient from "./roadmap-client";
import { roadmapLevels } from "@/content/roadmap-stations";

export const metadata = {
  title: "Lộ trình HSK",
  description:
    "Lộ trình serpentine theo cấp độ HSK — từng trạm bài học với từ vựng, ngữ pháp và mini test cuối chặng.",
};

/* Server component mỏng: useSearchParams của client island cần boundary Suspense
   (pattern steps-client của /roadmap/pinyin). */
export default function RoadmapPage() {
  return (
    <Suspense fallback={null}>
      <RoadmapClient levels={roadmapLevels} />
    </Suspense>
  );
}
```

- [ ] **Step 5: Run test verify PASS**

Run: `npx vitest run "src/app/(app)/roadmap/__tests__/roadmap-client.test.tsx"`
Expected: PASS 5/5.

- [ ] **Step 6: Soi visual thủ công**

Run: `npm run dev` (port 3100), mở `http://localhost:3100/roadmap`:
- Light + dark (toggle theme shell): so khớp mock `opendesign_hsk/roadmap.html` (mở bằng file:// so song song).
- Thu hẹp < 760px: path 1 cột, spine trái; < 640px: switcher xuống dòng full-width.
- Bấm node: drawer trượt phải, tab, audio, launch toast.
- Đổi level HSK 1/3/4–6: banner-only / upcoming.

- [ ] **Step 7: Commit**

```bash
git add "src/app/(app)/roadmap/roadmap-client.tsx" "src/app/(app)/roadmap/page.tsx" "src/app/(app)/roadmap/__tests__/roadmap-client.test.tsx"
git commit -m "feat(roadmap): compose trang /roadmap serpentine (thay timeline cũ)"
```

---

### Task 13: Cleanup UI cũ + cập nhật docs

**Files:**
- Delete: `src/components/roadmap/journey-card.tsx` + test của nó (`src/components/roadmap/__tests__/journey-card.test.tsx` nếu có)
- Modify: `src/content/roadmap.ts` (chỉ khi 2 export dưới hết sạch import)
- Modify: `app-next/AGENTS.md` (danh sách token)

**Interfaces:**
- Consumes: trạng thái Task 12 (trang cũ đã không còn import journey-card).
- Produces: repo sạch, không dead-code của UI roadmap cũ.

- [ ] **Step 1: Kiểm tra trước khi xóa**

Run:
```bash
grep -rn "journey-card" src/ e2e/ 2>/dev/null
grep -rn "roadmapStages\|roadmapCopy" src/ e2e/ 2>/dev/null
```
Expected: `journey-card` chỉ còn self-reference; **`timeline-client` tuyệt đối KHÔNG xóa** — `/roadmap/pinyin/page.tsx` đang import nó (spec §9 đã sửa).
`roadmapStages`/`roadmapCopy`: nếu chỉ còn `src/content/roadmap.ts` tự định nghĩa (không ai import) → xóa 2 export này, **giữ `roadmapSessions`** (timeline-client/session-client/session page dùng). Nếu còn import ở đâu đó → để nguyên, ghi nhận trong commit message.

- [ ] **Step 2: Xóa journey-card + test**

```bash
git rm src/components/roadmap/journey-card.tsx
git rm src/components/roadmap/__tests__/journey-card.test.tsx 2>/dev/null || true
```

- [ ] **Step 3: Cập nhật `AGENTS.md`**

Trong block design-system của `app-next/AGENTS.md`, thêm `--color-jade` vào danh sách token semantic (cạnh các `--color-learning-*`), một dòng ghi chú: "jade = fill progress/node done của roadmap serpentine (port roadmap.html)".

- [ ] **Step 4: Full verification**

Run:
```bash
npx vitest run
npx tsc --noEmit
```
Expected: toàn bộ test PASS, typecheck sạch. Nếu `roadmapStages`/`roadmapCopy` bị xóa mà có test của content/roadmap.ts tham chiếu → sửa test theo (chỉ giữ phần sessions).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(roadmap): xóa journey-card cũ, dọn content/roadmap.ts, docs token jade"
```

---

### Task 14: Verification tổng theo spec §11

**Files:** không tạo/sửa file (chỉ verify; nếu phát hiện lỗi → sửa trong task tương ứng rồi commit riêng).

- [ ] **Step 1: Toàn bộ test + typecheck**

Run:
```bash
npx vitest run
npx tsc --noEmit
```
Expected: PASS tất cả, typecheck 0 lỗi.

- [ ] **Step 2: Build production**

Run: `npm run build`
Expected: route `/roadmap` build thành công, không lỗi prerender (trang phải render được khi localStorage không tồn tại).

- [ ] **Step 3: Checklist nghiệm thu spec §11 (soi trên dev server port 3100)**

1. `/roadmap` khớp mock 100%: light/dark, ≥760px và <760px.
2. Switch level đổi banner + path; refresh giữ `?level=`.
3. Store rỗng → Trạm 1 active, banner 0%; set record `{"1":{"pct":100,"stars":3}}` qua console → refresh → Trạm 2 active, banner 17% (1/6 lesson).
4. Drawer: tab, audio TTS phát âm thật, Escape/overlay/X đóng, focus quay về node.
5. `/roadmap/pinyin` + session routes vẫn hoạt động bình thường.
6. Không còn import đến file đã xóa.

Mọi mục FAIL → quay lại task sở hữu file đó sửa + chạy lại Task 14.

- [ ] **Step 4: Commit cuối (nếu có sửa)**

```bash
git add -A && git commit -m "fix(roadmap): vá theo checklist nghiệm thu spec §11"
```
