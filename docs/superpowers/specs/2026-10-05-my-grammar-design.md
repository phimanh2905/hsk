# My Grammar (Sổ tay ngữ pháp) — port `opendesign_hsk/my-grammar.html` vào `app-next`

- **Ngày:** 2026-10-05
- **Trạng thái:** Đã duyệt design (brainstorming) — chờ review spec
- **Nguồn design:** `opendesign_hsk/my-grammar.html` (347 dòng, mock "Sổ tay ngữ pháp", 3 tier hero/filters/grid, light theme + shell riêng — bỏ)
- **Phạm vi repo:** `app-next/` branch `pinyin-lab-redesign` — thay nội dung `/my-grammar`, mở rộng `progressStore`
- **Plan liên quan:** mirror `2026-10-05-my-vocab-design.md` (pattern data thật + store + `(wide)`); `(wide)` đã tồn tại (pinyin-lab xong)

## 1. Mục tiêu & quyết định đã chốt

Port **100%** mock Sổ tay ngữ pháp thành trang `/my-grammar` mới. Quyết định người dùng đã chọn:

1. **Dữ liệu: content module + save store** — 6 điểm ngữ pháp mock (công thức/bẫy/ví dụ) port thành `src/content/grammar-points.ts` (content giáo dục tĩnh); trạng thái ★ "Đã lưu" là user data persist qua `progressStore`. Không API route mới.
2. **Hero metrics suy từ data có thật** — mock "42 cấu trúc / 8 cần củng cố / 72% độ vững" không suy được (không có grammar SRS) → đổi copy có chủ ý (xem §4 deviations).

Giữ nguyên: `LoginGate` (pageSub grammar), route `/my-grammar` + breadcrumb/sidebar/command-index (URL không đổi), `NotebookList` + `/notebook/[kind]/[id]` (back-link "← Sổ tay ngữ pháp" còn dùng), `content/notebooks.ts` + unit tests của nó.

Ngoài phạm vi (mock có nhưng **không port**): sidebar/bottomnav/topbar (shell có sẵn), theme, toast tự viết (`useToastSafe`), "+ Thêm cấu trúc mới" và ⋮ menu chỉ **toast demo đúng mock** (CRUD cấu trúc = hướng mở rộng sau).

## 2. Mô hình dữ liệu

### 2.1 `src/content/grammar-points.ts` (mới)

```ts
export type GrammarTopic = "ba" | "bi" | "bongu" | "hutu";
export type GrammarPoint = {
  id: string;                  // "ba" | "bi" | "lian" | "bongu" | "bei" | "yue"
  title: string;               // "CÂU CHỮ 把"
  hz: string;                  // "把字句"
  level: "HSK 1" | "HSK 2" | "HSK 3" | "HSK 4" | "HSK 5" | "HSK 6";
  topic: GrammarTopic;
  def: string;                 // mô tả ngắn
  formula: [label: string, isKey?: "key"][];  // blocks nối "+", key = jade + font hanzi
  pitfall: [lead: string, bold: string, rest: string];  // mock pit có <b> giữa câu — tách 3 phần,
                                                        // ghép lead+bold+rest = đúng câu mock; render
                                                        // "Bẫy người Việt: {lead}<b>{bold}</b>{rest}"
  ex: { hz: string; py: string; vi: string }[];
};
export const GRAMMAR_POINTS: GrammarPoint[];   // 6 điểm port 1:1 mock
export const GRAMMAR_TOPICS: [key: GrammarTopic | "all", label: string][];
// ["all","Tất cả"], ["ba","Câu chữ 把 / 被"], ["bi","Câu so sánh 比"],
// ["bongu","Bổ ngữ kết quả / khả năng"], ["hutu","Hư từ & Liên từ"], ["saved","⭐ Đã lưu"]
export const GRAMMAR_LEVELS = ["all", "HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5", "HSK 6"] as const;
```

6 điểm: ba (把字句, HSK 3), bi (比字句, HSK 2), lian (连…也/都, HSK 4), bongu (到/见/完, HSK 3), bei (被字句, HSK 3), yue (越…越…, HSK 4) — nội dung def/formula/pitfall/ex copy đúng mock (pitfall tách `<b>…</b>` thành `[bold, rest]`).

### 2.2 `progressStore` mở rộng (pattern `wordMeta`, key riêng `bye.grammarMeta`)

```ts
export type GrammarMeta = { saved?: 1 };
getGrammarMeta(): Record<string, GrammarMeta>      // readJSON("bye.grammarMeta", {})
toggleGrammarSaved(id: string): boolean            // toggle saved; entry rỗng → xoá; dispatchProgress; trả trạng thái mới
```

Signature cập nhật trong `ProgressStoreApi`. Không đụng key `bye.wordMeta` (my-vocab).

### 2.3 `src/lib/my-grammar.ts` (pure)

```ts
export type GrammarFilters = { level: string; topic: GrammarTopic | "all" | "saved"; q: string };
export function filterPoints(points: GrammarPoint[], f: GrammarFilters, savedIds: string[]): GrammarPoint[]
  // level: "all" hoặc === point.level; topic "saved" → id ∈ savedIds; q: substring lowercase trên
  // title + hz + def + toàn bộ ex (hz+py+vi) — đúng mock paint()
export function grammarHero(points: GrammarPoint[], savedIds: string[]): {
  total: number; savedCount: number; topLevel: string | null; topCount: number;
  // topLevel = level CAO NHẤT có điểm (so số sau "HSK "), topCount = số điểm ở level đó;
  // points rỗng → topLevel null
}
```

## 3. Route & container

- `src/app/(wide)/my-grammar/page.tsx`: giữ `LoginGate pageSub={notebookSubGate.grammar}`, render `<MyGrammarRoot />`. Metadata title "Sổ tay ngữ pháp".
- Chuyển `(app)/my-grammar` → `(wide)/my-grammar` (URL không đổi; `(wide)/layout.tsx` đã tồn tại — verify thôi).

## 4. Component decomposition (`src/components/my-grammar/`)

Thứ tự: hero → filters (ribbon level + add) → (ribbon topic + result line + search) → grid / empty.

| File | Loại | API & nội dung |
|---|---|---|
| `my-grammar-root.tsx` | client root | State: `level` ("HSK 4" mặc định đúng mock), `topic` ("all"), `q`, `savedIds` (từ store, sync `bye:progress`), mounted gate. `filtered = filterPoints(GRAMMAR_POINTS, {level, topic, q}, savedIds)`. Keyboard `/` focus search. Render hero + filters + grid/empty; handlers toast qua `useToastSafe` |
| `grammar-hero.tsx` | client | Props `{ total, savedCount, topLevel, topCount, onReview }`. Eyebrow "SỔ TAY CẤU TRÚC NGỮ PHÁP HSK", h1 **deviation có chủ ý**: "Sổ tay có {total} cấu trúc · {savedCount} cấu trúc đã lưu" (mock "42/8 cần củng cố" không suy được — đã chốt), p giữ mock "Ôn theo phản xạ: nhận diện cấu trúc trong 3 giây, đặt câu đúng trong 10 giây.", pills: "📘 {topLevel}: {topCount} mẫu" (topLevel null → pill ẩn) / "⭐ {savedCount} yêu thích" / "📦 {total} cấu trúc". CTA vermilion "🎯 Luyện phản xạ cấu trúc hôm nay" → `/review` |
| `grammar-filters.tsx` | client | Props `{ level, onLevel, topic, onTopic, q, onQ, onAdd, searchRef, savedCount }`. Row 1: label "Cấp độ" + chips Tất cả/HSK 1–6 (chip active = vermilion border + text + ring, inline như VocabSeg) + nút "+ Thêm cấu trúc mới" (cream pill) → `onAdd` (toast demo). Row 2: label "Chủ điểm" + chips từ `GRAMMAR_TOPICS`. Row 3: result line "N cấu trúc · {level} · {topic label}" (aria-live polite) + search pill (icon + kbd "/") |
| `grammar-card.tsx` | client | Props `{ point, saved, onToggleSave(id), onSpeak(hz) }`. Head: `.lvl` pill (jade), "📌 {title} ({hz})", ★ mini (aria-pressed, saved = amber bg), ⋮ mini. def. Formula blocks: `.fblock` (key → jade-bg + font hanzi) nối `.fplus` "+". Pitfall: "⚠️ **Bẫy người Việt:** <b>{bold}</b> {rest}" (amber-wash, border-left amber). Examples: "VÍ DỤ NGỮ CẢNH" + mỗi ex grid (hz 19px `.zh` / py / vi + 🔊 round → `onSpeak`). Footer "Luyện tập cấu trúc này" → `/review` (Link) |

## 5. Deviations có chủ ý so với mock (ghi rõ để khỏi bị coi là bug)

1. **Hero h1 + pill 3**: "Sổ tay có N cấu trúc · M cấu trúc đã lưu" + "📦 N cấu trúc" thay "42/8/72%" (không có grammar SRS — đã chốt với user).
2. **Mặc định level "HSK 4"** giữ đúng mock → hiển thị 2/6 card lúc mở (lián + yue); "Tất cả" hiện đủ.
3. "+ Thêm cấu trúc mới" / ⋮ menu / (mock) — toast demo giữ nguyên copy mock: "Tạo cấu trúc mới: nhập tên + công thức + 1 ví dụ để lưu" / "Tùy chọn: ghim · ẩn ví dụ · báo lỗi công thức".
4. Search chuyển từ topbar mock vào filters page-local (topbar app là ⌘K — precedent my-vocab).

## 6. Mapping tokens & primitives

| Mock | App |
|---|---|
| chip active vermilion + ring `rgba(200,60,50,.12)` | `border-action-primary text-action-primary` + `ring-3 ring-action-primary/15` (inline chip như VocabSeg — `SegmentedTabs` active nền elevated không khớp) |
| `.fblock.key` jade-bg/hanzi | `bg-jade-wash border-learning-mastered text-[color:var(--hz-jade-ink,#144d38)]` + `zh` |
| `.pitfall` amber bg + border-left | `bg-amber-wash border-amber-line` + `border-l-[3px] border-l-learning-progress` |
| `.hpill` p1/p2/p3 | `bg-surface-muted` / `bg-amber-wash border-amber-line text-amber-ink` / `bg-jade-wash border-jade-line text-jade-ink` |
| `.lvl` pill | `bg-jade-wash border-jade-line` |
| `.btn-vermilion` | `Button` (primary) min-h-[52px] rounded-[14px] |
| toast/sr | `useToastSafe` |
| `speechSynthesis` thủ công | `useTts().speak(hz, { rate: 0.95 })` |
| `data-od-id` | giữ nguyên làm hook e2e/test |

## 7. Giữ / xoá / cập nhật

- **Giữ nguyên:** `NotebookList`, `/notebook/[kind]/[id]`, `content/notebooks.ts` + tests, `LoginGate`, breadcrumb/sidebar/command-index entry, unit test `notebook-list.test.tsx` (grammar heading), `notebook-detail.test.tsx` (back-link).
- **Thay:** nội dung `/my-grammar` (NotebookList chỉ còn dùng bởi trang này — sau port không còn ai dùng kind="grammar" trong NotebookList nhưng **không xoá** component/config).
- **e2e:** không có test `/my-grammar` hiện tại → không cần cập nhật.

## 8. Testing

- Unit `grammar-points`: 6 điểm đúng id/level/topic; formula có ≥ 1 block key; pitfall đúng shape [bold, rest]; GRAMMAR_TOPICS đủ 6 mục.
- Unit `my-grammar` (lib): filterPoints theo level/topic/q (q trên title+hz+def+ex hz/py/vi, lowercase substring); saved filter qua savedIds; grammarHero (total/savedCount/topLevel-topCount, rỗng → null).
- Unit store: getGrammarMeta mặc định {}; toggleGrammarSaved on/off + xoá entry rỗng (Review Focus); dispatchProgress phát.
- Unit `grammar-hero`: h1/pills copy mới + pill ẩn khi topLevel null; CTA onReview.
- Unit `grammar-filters`: chips + active; onAdd; search; result line copy "N cấu trúc · HSK 4 · mọi chủ điểm".
- Unit `grammar-card`: formula blocks (key jade); pitfall [bold, rest]; speak từng ex; ★ aria-pressed + onToggleSave; footer link /review; ⋮ (toast ở root).
- Unit `my-grammar-root`: mặc định level HSK 4 → 2 card; "Tất cả" → 6; topic ba → 2 (ba+bei); topic saved → 0 → empty state copy mock; search; ★ toggle lưu store + toast copy; `/` focus.
- Chạy kèm suite hiện có (vitest).

## 9. Điều kiện tiên quyết

Không có — tokens (`jade-wash`, `amber-wash`, `learning-progress`…), `Button`, `useTts`, `useKeyboard`, store pattern wordMeta đều có sẵn; `(wide)` đã tồn tại.
