# Hanzi Studio — port `opendesign_hsk/hanzi.html` vào `app-next`

- **Ngày:** 2026-10-05
- **Trạng thái:** Đã duyệt design (brainstorming) — chờ review spec
- **Nguồn design:** `opendesign_hsk/hanzi.html` (503 dòng, mock "Hanzi — 汉字工坊 Hanzi Studio", CSS thuần tự chứa, light + dark theme)
- **Phạm vi repo:** `app-next/` trên nhánh `main`

## 1. Mục tiêu & quyết định đã chốt

Port **100%** mock Hanzi Studio thành component, **thay thế hoàn toàn** trang `/hanzi` hiện tại. Quyết định người dùng đã chọn:

1. **Phạm vi: thay thế hoàn toàn** — Hanzi Studio trở thành trang `/hanzi` chính; `hanzi-home.tsx` + test của nó bị xoá. `/hanzi/[char]` giữ nguyên; `search-card.tsx` **giữ lại** vì `hanzi-detail.tsx` đang import nó.
2. **Dữ liệu: content module mới** — port nguyên `CHARS` array (12 chữ mẫu) thành `src/content/hanzi-studio.ts`, tách biệt để sau này swap ra data thật.
3. **Trạng thái chữ: demo data như mock** — badge done/mid/new hardcode trong content module; state pills lọc trên dữ liệu này, không nối SRS.

Ngoài phạm vi (mock có nhưng **không port**):

- **Topbar của mock** (back "Trang chủ", crumb, streak pill, theme toggle, localStorage theme) — app đã có shell riêng (Topbar/SidebarNav/BottomNav) và `ThemeProvider`. Content bắt đầu từ `.head` (h1 "汉字工坊 · Hanzi Studio").
- **Toast tự viết + `srLive` riêng trong mock** — dùng `ToastProvider` hiện có (`useToastSafe`).

Điểm khác biệt có chủ ý so với mock (ghi rõ để khỏi bị coi là bug):

- **State pill counts tính động** từ dữ liệu đã lọc theo level ("Tất cả (12)" thay vì "(300)" hardcode).
- **Pager phân trang thật** (PAGE_SIZE = 12): nút ◀/▶ disable ở biên thay vì toast "hết trang" như mock; label giữ copy mock `Trang X / Y · N chữ mẫu`.
- **TTS** qua `useTts()` hiện có; giữ hành vi mock đọc 2 lần (`speak(ch + ch)`).

## 2. Mô hình dữ liệu — `src/content/hanzi-studio.ts`

Port nguyên 12 chữ từ mock (爱 好 人 大 国 汉 书 口 日 木 水 心), type hoá:

```ts
export type StrokeDir = "E" | "SE" | "S" | "SW" | "W" | "N" | "NE" | "T";
export type StudioChar = {
  ch: string;            // "爱"
  py: string;            // "ài"
  hv: string;            // "ÁI"
  mean: string;          // "Yêu, thích, quý trọng"
  n: number;             // số nét = paths.length
  hsk: "HSK 1" | "HSK 2" | "HSK 3" | "HSK 4-6";
  st: "done" | "mid" | "new";
  rad: string;           // "爫 (Trảo)" — render tách phần hanzi đầu
  struct: string;        // "Trên – Giữa – Dưới"
  tip: string;           // mẹo nhớ (strip HTML nếu có)
  order: [string, string][];   // tên nét + tên pinyin của nét, đúng mock
  d: StrokeDir[];        // hướng mong muốn mỗi nét (input chấm điểm)
  p: string[];           // SVG path 300×300 mỗi nét
};
export const STUDIO_CHARS: StudioChar[];       // 12 chữ, thứ tự mock
export const STUDIO_LEVELS = ["all", "HSK 1", "HSK 2", "HSK 3", "HSK 4-6"] as const;
```

Không đụng `content/hanzi.ts` / `content/hanzi-strokes.ts` (dữ liệu này phục vụ `/hanzi/[char]` và `/review`).

## 3. Logic thuần — `src/lib/hanzi/stroke-quiz.ts`

Port đúng mock (`bucket` + `matchStroke`), pure functions để unit test trọn:

```ts
export type Bucket = "E" | "SE" | "S" | "SW" | "W" | "N" | "NE" | "DOT";
export function bucket(dx: number, dy: number): Bucket
  // len < 14 → "DOT"; else atan2 chia 8 ô 45°, ranh giới đúng mock
  // (±22.5° E, 22.5–67.5 SE, 67.5–112.5 S, 112.5–157.5 & <-157.5 SW,
  //  -157.5..-112.5 W, -67.5..-22.5 NE, còn lại N)
export function matchStroke(pts: {x:number;y:number}[], exp: StrokeDir): boolean
  // exp "T" → pts.length > 4; DOT → chấp nhận khi exp là "SE"|"S";
  // còn lại so bucket(đầu–cuối) === exp
export function scoreInk(ink: {ok:boolean}[], expected: StrokeDir[]): {acc: number|null; done: number}
  // acc = round(ok/n*100) hoặc null khi n=0; done = số nét đã vẽ
```

## 4. Layout & container — route group `(wide)`

Mock dùng content width 1280px, còn `(app)/layout.tsx` đang khoá `max-w-5xl` (1024px). Vì shell nằm ở root layout (`(app)/layout.tsx` chỉ là div container), tạo route group mới **không đổi URL**:

- `src/app/(wide)/layout.tsx` — `<div className="mx-auto max-w-[1280px] px-4 py-6 pb-28 lg:pb-6">{children}</div>`
- Chuyển cả thư mục `src/app/(app)/hanzi/` → `src/app/(wide)/hanzi/` (kèm `[char]/`).
- Các trang khác không đổi.

## 5. Component decomposition

Thứ tự section trong trang: `.head` (h1 + subtitle) → filterbar → state pills → pane-tabs (mobile) → split (catalog | workbench).

| File | Loại | API & nội dung |
|---|---|---|
| `(wide)/hanzi/page.tsx` | server | metadata title "Hanzi Studio"; render `<HanziStudio />` |
| `(wide)/hanzi/hanzi-studio.tsx` | client root | Sở hữu state: `level`, `stateFilter` ("all"/"done"/"todo"), `q`, `cur` (ch đang chọn, mặc định "爱"), `mode` ("watch"/"draw"), `pane` ("catalog"/"work", chỉ có tác dụng <1024px). Lọc dữ liệu `useMemo` (level → state → q trên `ch+py+hv` lowercase); đếm pills theo level-filtered list; phân trang state `page` (reset về 1 khi filter/q đổi). Render head + filterbar + pills + pane-tabs + split; truyền props xuống. Mobile: chọn chữ → `setPane("work")` |
| `components/hanzi/studio/studio-catalog.tsx` | client | Props: `{ chars (đã lọc + phân trang), page, pages, total, level, cur, onSelect, onPage }`. Panel "Kho Hán tự": panel-head (h2 + `catCount` = `N chữ mẫu · LEVEL`), grid zcard 3 cột (≥1400px 4 cột), `cat-scroll` max-h 680px, pager ◀/▶ + label. Zcard: badge (done = jade tròn + icon check; mid = amber tròn; new = vòng nét đứt), glyph 36px `.zh`, `py · n nét`, spill pill ("Đã thuộc"/"Đang luyện"/"Mới"). Active: border 2 accent + accent-soft. Empty state "Không có chữ nào khớp bộ lọc." |
| `components/hanzi/studio/studio-workbench.tsx` | client | Props: `{ char, mode, onMode }`. Chứa `studio-grid` làm con. wb-head: glyph 44px `.zh` + py-pill (pinyin + IconButton Volume2 → `speak(ch+ch)`) + mean. Mode-tabs (Xem mẫu bút thuận / Tự luyện viết (chấm điểm)). Toolbars: watchBar (Nét trước / Phát lại accent / Nét sau + speed-seg 0.75x/1.0x/1.5x) ↔ drawBar (Xóa bảng / Hoàn tác / Gợi ý nét mờ toggle). Meter (chỉ draw): "Độ chuẩn xác: X% · Nét n/total" + bar jade — số liệu từ callback `onStats` của grid. Chips: BỘ THỦ (hanzi tô jade) / CẤU TRÚC / ÂM HÁN-VIỆT. Tip amber-wash "Mẹo nhớ: …" |
| `components/hanzi/studio/studio-grid.tsx` | client | Props: `{ char, mode, apiRef?, onStats }`. Ô thiên tự: SVG nền (khung + trục dashes) + SVG nét (watch) + SVG ink (draw, `touch-action:none`). Chứa `useStudioStrokes` + pointer-vẽ + hint. `onStats({ done, ok, total })` gọi mỗi khi ink đổi (vẽ/undo/clear/đổi chữ) để workbench render meter; toolbar play/step/hint/goi qua `apiRef` (imperative handle của hook) — workbench không giữ state animation |
| `components/hanzi/studio/use-studio-strokes.ts` | hook | Watch-mode animation, port đúng mock: mỗi nét `<path>` class `todo` (fg, opacity .13) / `done` (fg) / `now` (accent) / `hint` (accent, .3, dash 6 8). Animate nét i: set dasharray/offset = tổng chiều dài, transition `stroke-dashoffset max(280, 720/speed)ms ease`, xong → `done`. `playAll()` chuỗi hết các nét; `stepTo(i)` tĩnh (Nét trước/sau); `setSpeed()`. Chế độ draw: toàn bộ nét ở trạng thái `done` làm mẫu tham chiếu dưới lớp ink |
| `components/hanzi/studio/seg-control.tsx` | client | Segmented không-pill (rounded-12/16 như mock) cho mode-tabs, speed-seg, pane-tabs — KHÔNG dùng `SegmentedTabs` (rounded-full) cho 3 chỗ này để giữ đúng hình mock. API mirror `SegmentedTabs` (`tabs/value/onChange/label` + `radius`). Filterbar cấp độ vẫn dùng `SegmentedTabs` (mock `.seg` đúng rounded-full) |
| `src/lib/hanzi/stroke-quiz.ts` | pure | Xem §3 |

State pills (Tất cả/Đã thuộc nét/Cần luyện lại): button riêng theo mock (pill rounded-full, active = border accent + text accent + bg accent-soft) — **không** dùng `Chip` (tone `selected` là nền accent chữ trắng, khác hình mock).

Chấm điểm draw (trong `studio-grid.tsx`, dùng `stroke-quiz`): pointerdown tạo `<polyline>`; pointermove cộng điểm (bỏ qua if `< 3px`); pointerup: `ok = pts.length ≥ 4 && matchStroke(pts, d[min(idx, d.length-1)])`, tô class `good` (fg) / `bad` (accent); khi bật hint → render nét mẫu kế tiếp; update meter; vẽ đủ `n` nét → toast khen/nhắc theo acc ≥ 80 (copy đúng mock).

## 6. Mapping tokens & primitives

| Mock | App |
|---|---|
| `--bg/--surface/--elev/--card/--fg/--body/--faint/--border` | `surface-paper` / `surface-muted` / `surface-elevated` / `text-primary` / `text-secondary` / `faint → text-secondary/60` / `border-subtle` (dark đã map sẵn trong `globals.css`) |
| `--accent #C83C32`, hover `#B33229` | `action-primary` / `action-primary-hover` (dark `#e05349` trùng mock) |
| badge/spill jade, meter bar | `learning-mastered` |
| badge/spill/mid amber, tip wash | `learning-progress` / `amber-wash` + `amber-ink` |
| `.hanzi` font | class `.zh` hiện có |
| toast tự viết | `useToastSafe()` |
| `speechSynthesis` thủ công | `useTts()` |
| shadow/radius | `shadow-xs`, `rounded-card` (16) / control 8 / zcard 14 ≈ `rounded-2xl` |
| `data-od-id` | giữ nguyên làm hook cho e2e |

A11y giữ mock: `aria-pressed` trên mọi seg/pill/tab, `aria-label` group + icon buttons, `:focus-visible` outline accent (có sẵn), meter + toast qua `role="status"` của ToastProvider.

## 7. Thay thế & những gì giữ nguyên

- **Xoá:** `hanzi-home.tsx`, `(app)/hanzi/__tests__/hanzi-home.test.tsx` (cùng thư mục cũ khi chuyển sang `(wide)`).
- **Giữ:** `search-card.tsx` (dùng bởi `hanzi-detail.tsx`), `/hanzi/[char]` nguyên vẹn, `DrawPad`/`draw-modal`/`stroke-player` + tests của chúng (dùng nơi khác).
- Link vào `/hanzi` từ shell/sidebar không đổi URL nên không phải sửa.

## 8. Testing

- **Unit** `stroke-quiz`: mỗi bucket ranh giới 45°, DOT, T, matchStroke đúng/sai, scoreInk edge (0 nét → null).
- **Unit** `use-studio-strokes`/`studio-grid`: render đúng số nét; stepTo −1/→n; speed đổi duration; draw mode hiện đầy đủ nét mẫu.
- **Unit** `hanzi-studio`: filter level/state/q kết hợp; chọn chữ reset ink + meter + (mobile) đổi pane; pagination reset khi đổi filter.
- **Unit** `studio-catalog`: badge/spill theo state; active card; empty state; pager disable biên.
- Chạy cùng bộ suite hiện có (jest + testing-library, fake timers cho animation); không thêm e2e mới ngoài `data-od-id` đã cắm.

## 9. Điều kiện tiên quyết

Không có — mọi token (`surface-muted`, `amber-wash`, `learning-*`), primitives (`SegmentedTabs`, `IconButton`, `Button`) và shell (ToastProvider, ThemeProvider dark tokens) đã sẵn có trên `main`.
