# Pinyin Lab — port `opendesign_hsk/pinyin.html` vào `app-next`

- **Ngày:** 2026-10-05
- **Trạng thái:** Đã duyệt design (brainstorming) — chờ review spec
- **Nguồn design:** `opendesign_hsk/pinyin.html` (545 dòng, mock "Hanzi — 拼音实验室 Pinyin Lab", CSS thuần tự chứa, light + dark)
- **Phạm vi repo:** `app-next/` trên nhánh `main` — thay trang `/pinyin`, biến `/pinyin/practice` thành redirect
- **Plan liên quan:** `2026-10-05-hanzi-studio.md` (chưa thực thi) — chia sẻ route group `(wide)` và `SegControl`; Task đầu của plan này tạo `(wide)` **nếu chưa tồn tại** nên hai plan không xung đột thứ tự chạy

## 1. Mục tiêu & quyết định đã chốt

Port **100%** mock Pinyin Lab thành component, thay trang `/pinyin` hiện tại. Quyết định người dùng đã chọn:

1. **Route: 1 trang + redirect** — `/pinyin` duy nhất với mode-seg 2 view ("Ma trận âm & 4 thanh điệu" / "Luyện phản xạ tai nghe"). `/pinyin/practice` → `redirect("/pinyin?mode=quiz")` để link từ roadmap + e2e hydration/learning-flow không hỏng. Drill vào quiz qua `?drill=<âm>`.
2. **Dữ liệu: content module mới** `src/content/pinyin-lab.ts` — port nguyên bảng mock (DESC/TIP/BASE/TONES/FINALS/sandhi), tách khỏi `content/pinyin.ts` (matrix cũ 406 âm tiết vẫn phục vụ nơi khác nếu cần).
3. **Persist: progressStore + XP** — hoàn thành phiên 10 câu → `addXp(score)` + method mới ghi best; KHÔNG tạo API route (store đã localStorage + cross-tab sync).
4. **Container: dùng chung `(wide)` 1280px** (mock 1200px, gần nhất là `(wide)` của hanzi).

Ngoài phạm vi (mock có nhưng **không port**):

- **Topbar của mock** (back "Trang chủ", crumb, theme toggle, localStorage theme) — shell + `ThemeProvider` của app lo.
- **Toast tự viết + `srLive`** — dùng `ToastProvider` (`useToastSafe`).

Điểm khác biệt có chủ ý (không phải bug):

- **Số liệu đếm động**: "Thanh mẫu (23)" / "Vận mẫu (36)" tính từ data module, không hardcode.
- **Persist thêm so với mock**: XP + best accuracy lưu qua store (mock chỉ state phiên).

## 2. Mô hình dữ liệu — `src/content/pinyin-lab.ts`

Port nguyên dữ liệu từ script của mock (dòng 258–348), type hoá. Tất cả const đều bắt đầu `PINYIN_LAB_` để tránh đụng `content/pinyin.ts`:

```ts
export type PinyinLabGroup = { label: string; items: string[] };
export const PINYIN_LAB_GROUPS: PinyinLabGroup[];      // 7 nhóm khẩu hình, đủ 23 thanh mẫu (gồm w, y)
export const PINYIN_LAB_DESC: Record<string, string>;  // mô tả âm — 23 mục, copy đúng mock
export const PINYIN_LAB_TIP: Record<string, string>;   // "Khẩu hình: …" — 23 mục
export const PINYIN_LAB_BASE: Record<string, string>;  // âm mẫu đọc khi chọn ô: b → "bō"
export type PinyinLabToneRow = [py: string, zh: string, vi: string];
export const PINYIN_LAB_TONES: Record<string, PinyinLabToneRow[]>; // 23 thanh mẫu × 4 hàng
export type PinyinLabFinalsGroup = { label: string; items: [py: string, ex: string][] };
export const PINYIN_LAB_FINALS: PinyinLabFinalsGroup[]; // 4 nhóm (Đơn/Kép/Mũi/Đặc biệt), đủ 36
export const PINYIN_LAB_ART_INI: [key: string, label: string][];  // 7 pill phân loại thanh mẫu
export const PINYIN_LAB_ART_FIN: [key: string, label: string][];  // 4 pill phân loại vận mẫu
export const PINYIN_LAB_GROUP_OF: Record<string, string>;         // âm → nhóm art (w=labial, y=palatal)
export type PinyinLabSandhi = { t: string; d: string; ex: [py: string, zh: string, vi: string][] };
export const PINYIN_LAB_SANDHI: PinyinLabSandhi[];      // 3 quy tắc 一 / 不 / hai thanh 3
export type PinyinLabToneCard = {
  name: string;                       // "Thanh 1 (55)"
  sub: string;                        // "· Cao – Bằng"
  contour: "flat" | "up" | "dip" | "down"; // hình SVG: ngang / lên / xuống-lên / xuống
  ex: { py: string; zh: string; vi: string };
};
export const PINYIN_LAB_TONE_CARDS: PinyinLabToneCard[]; // 4 card tone lab (mā má mǎ mà)
```

Không đụng `content/pinyin.ts`, `content/roadmapPinyin.ts` (đang dùng bởi `/roadmap/pinyin` và matrix cũ nếu còn tham chiếu).

## 3. Logic thuần — `src/lib/pinyin/quiz-engine.ts`

Port đúng engine quiz của mock (POOL/pickTarget/distractors), **rng inject** để test deterministic:

```ts
export type PinyinLabPoolItem = { py: string; zh: string; vi: string; tone: number; ini: string };

export function buildPool(tones?: Record<string, PinyinLabToneRow[]>): PinyinLabPoolItem[]
  // 23 × 4 = 92 items, tone 1..4 theo thứ tự hàng

export function pickTarget(pool: PinyinLabPoolItem[], drillIni: string | null, rng: () => number): PinyinLabPoolItem
  // drillIni khác null → lọc p.ini === drillIni (pool con), random bằng rng

export function distractors(pool: PinyinLabPoolItem[], target: PinyinLabPoolItem, rng: () => number): PinyinLabPoolItem[]
  // port mock: 2 đầu tiên cùng ini khác py, tiếp theo khác ini cùng tone, còn thiếu lấy random;
  // splice-random như mock (xáo mảng nguồn), trả đúng 3 items
```

View tự shuffle 4 options (Fisher–Yates với cùng rng) và gán key A–D. `mulberry32` có sẵn ở `@/lib/stats/heatmap`.

## 4. Route & container — `(wide)`

- **Task tạo `(wide)` idempotent**: nếu `src/app/(wide)/layout.tsx` chưa tồn tại → tạo đúng nội dung plan hanzi-studio (`<div className="mx-auto max-w-[1280px] px-4 py-6 pb-28 lg:pb-6">{children}</div>`). Nếu đã có (hanzi plan chạy trước) → bỏ qua.
- `src/app/(wide)/pinyin/page.tsx` (server, async): metadata `title: "Pinyin Lab"`; đọc `searchParams` (Next 16: `Promise`) → `<PinyinLabRoot initialMode={mode === "quiz" ? "quiz" : "matrix"} initialDrill={drill ?? null} />`.
- `src/app/(wide)/pinyin/practice/page.tsx`: chỉ `redirect("/pinyin?mode=quiz")` (server redirect, không client component).

## 5. Component decomposition

Thứ tự render trong root: `.head` → mode-seg (sticky không cần) → view ma trận (tone-lab → toolbar → split/sandhi) hoặc view quiz (quiz-head → deck).

| File | Loại | API & nội dung |
|---|---|---|
| `(wide)/pinyin/pinyin-lab-root.tsx` | client root | State: `mode` ("matrix"/"quiz", init từ prop), `cat` ("ini"/"fin"/"tone"), `art`, `sel` (âm đang chọn, mặc định "b"), `drillIni`, và state quiz `{ qi, score, streak, answered, current, opts, done }`. `startQuiz(drill)`, `choose(i)`, `next()`, `replay()`, `slow()` — port đúng mock. Đổi cat → reset art="all". Mount quiz view: build câu đầu trong `useEffect` sau mount (hydration-safe, server render skeleton deck cùng kích thước) |
| `components/pinyin/lab/tone-lab.tsx` | client | 4 card `PINYIN_LAB_TONE_CARDS`: h3 + sub, SVG contour theo `contour` (flat: line ngang; up: line lên; dip: polyline xuống-lên; down: line xuống — stroke `learning-progress`, port đúng toạ độ mock), `.ex` với `b` py + `small` "zh · vi" + nút speaker (`data-say` → speak 0.95x, animation `pop` qua state `playing`) |
| `components/pinyin/lab/sound-matrix.tsx` | client | Props: `{ cat, art, sel, onSel(ch), onSpeak(s) }`. cat="ini": các `igroup` theo `PINYIN_LAB_GROUPS`, lọc theo art (`art !== "all"` → loại w/y, chỉ giữ `GROUP_OF[x] === art`), icard `<b>x</b><small>[BASE]</small>`, active border accent + accent-soft; bấm → `onSel` + speak(BASE). cat="fin": `PINYIN_LAB_FINALS` lọc nhóm theo art, icard `<b class zh>py</b><small>ex</small>`, bấm → speak(ex py không dấu đầu). cat="tone" → không render (pane ẩn) |
| `components/pinyin/lab/sound-inspector.tsx` | client | Props: `{ sel, onDrill, onSpeak(s) }`. Sticky `top-20` (topbar shell 64px + margin), max-height viewport, overflow-y. Title "Âm đang chọn: {sel}{w/y ? " (bán nguyên âm)" : " (thanh mẫu)"}", big 44px, desc, tip "Khẩu hình: …", h2 "Bảng ghép 4 thanh điệu", `tgrid` 4 hàng `PINYIN_LAB_TONES[sel]`: b py + zh (class zh) + small vi + speaker từng hàng, nút ghost "Luyện riêng với âm này" → `onDrill(sel)` |
| `components/pinyin/lab/sandhi-rules.tsx` | client | Props: `{ onSpeak(s) }`. 3 `rule` cards từ `PINYIN_LAB_SANDHI`: h3 + p + exs (exbtn: py · zh + small vi, bấm → speak) |
| `components/pinyin/lab/quiz-view.tsx` | client | Presentational — props: `{ qi, total, score, streak, answered, done, opts (4 PoolItem đã shuffle), picked (index | null), onChoose(i), onNext(), onReplay(), onSlow(), onReset() }`; root gọi engine + `speak`. quiz-head: "Câu n/10", "Độ chính xác: x%/—", `StreakPill` (ui có sẵn, variant mini, unit "chuỗi đúng") + reset × (IconButton) → `onReset` + toast "Phiên mới: 10 câu ngẫu nhiên". Deck max-w-640: emit button tròn 80px accent (`onReplay`, animation `pop` khi playing), slowpill "Nghe chậm 0.8x" (`onSlow`), qinstr "Nghe kỹ và chọn âm tiết đúng vừa phát ra (Space = nghe lại)", `q2x2` 4 `.opt` (key A–D trong vòng tròn, chỉ hiện pinyin; `picked` → class good/bad + disable), feedback box (đúng: jade "Chính xác! …" kèm zh — vi + DESC; sai: "Chưa đúng." + đáp án), nút primary "Câu tiếp theo (Enter)" / "Chơi phiên mới (Enter)" / disabled "Chọn một đáp án để kiểm tra". Hoàn thành: feedback tổng kết "Hoàn thành phiên! Đúng x/10 (y%). …" đúng tier copy mock; **gọi `onSessionComplete(score)` một lần/phiên** |
| `components/ui/segmented-control.tsx` | client (mới ở ui/) | **Thăng hạng** SegControl từ plan hanzi-studio (API: `tabs/value/onChange/label/radius "xl"|"2xl"`). Pinyin dùng: mode-seg (radius 2xl, max-w 560 center), filter segs dùng `SegmentedTabs` (rounded-full ✓). Hanzi plan khi chạy sẽ import từ đây thay vì tạo trong `components/hanzi/studio/` |

## 6. Mapping tokens & primitives

| Mock | App |
|---|---|
| mode-seg (rounded-16) / seg (rounded-full) | `SegmentedControl` radius 2xl / `SegmentedTabs` |
| tone contour stroke `--amber` | `learning-progress` (amber) |
| `.opt.good` jade bg/bd/tx | `jade-wash`/`learning-mastered`/jade-ink tokens (đã có) |
| `.opt.bad` rose bg + accent bd + shake | `rose-wash`/`rose-line`/`rose-ink` + `animate-[shake_0.35s]` (keyframes thêm vào globals nếu chưa có; tôn trọng `prefers-reduced-motion`) |
| `.spk`/`.emit` accent + `pop` | `action-primary`, keyframes `pop` thêm globals (giống ripple pattern) |
| streak-pill | `StreakPill` ui có sẵn |
| icard/active | `surface-muted`/`border-action-primary` + `bg-rose-wash` (accent-soft) |
| toast/sr | `useToastSafe` (aria-live có sẵn) |
| speechSynthesis thủ công | `useTts().speak(x, { rate })` — emit 0.95, slow 0.65 |
| `data-od-id` | giữ nguyên làm hook e2e |

**Keyboard** (view quiz, giữ mock): `useKeyboard` từ `@/lib/use-keyboard` (đã bỏ qua INPUT/TEXTAREA): `" "` → replay (preventDefault, chỉ khi chưa answered), `"1".."4"` + `"a".."d"` → `choose(i)`, `"Enter"` → next/new session khi answered. Gate: chỉ bind khi `mode === "quiz"`.

**A11y giữ mock**: `aria-pressed` mọi seg, `aria-label` nút speaker ("Nghe mā"…), emit "Nghe âm thanh", reset "Chơi lại phiên mới", focus-visible accent có sẵn.

## 7. Persist — `progressStore`

Thêm vào `src/lib/store/progress-store.ts` (pattern `markRoadmapSession` + `dispatchProgress()`):

```ts
getPinyinLabBest(): number        // readNum("bye.pinyin.lab.best") — best correct/10
recordPinyinLabResult(correct: number): void
  // best = max(best, correct); writeNum + dispatchProgress()
```

Flow trong root khi phiên kết thúc (`done` chuyển true, đúng 1 lần/phiên): `progressStore.addXp(score)` + `progressStore.recordPinyinLabResult(score)`. XP hiện tại của app đã hiển thị ở topbar/home — không cần wiring thêm. Không tạo API route.

## 8. Thay thế & những gì giữ nguyên

- **Xoá:** `src/components/pinyin/matrix-client.tsx`, `tone-dialog.tsx`, `practice-client.tsx`, `src/components/pinyin/__tests__/practice-logic.test.ts` (logic quiz mới nằm ở `lib/pinyin/quiz-engine.ts` + test riêng), trang cũ `(app)/pinyin/` (chuyển sang `(wide)`).
- **Giữ:** `content/pinyin.ts` (dùng bởi… kiểm tra import còn lại trước khi xoá — nếu chỉ 3 file trên dùng thì vẫn giữ vì là data gốc 406 âm tiết có test foundation), `/roadmap/pinyin` + `session/[n]` (link CTA `/pinyin/practice` → redirect vẫn hoạt động), e2e hydration + learning-flow (URL không đổi).
- `pinyin-utils.ts` (`toPinyin/stripTones/shuffle`) vẫn dùng nơi khác — giữ.

## 9. Testing

- **Unit** `quiz-engine`: pool 92 items đúng shape; pickTarget với/không drillIni (rng fixed → kết quả deterministic); distractors: 2 cùng ini + 1 khác ini cùng tone, không trùng target, drill pool rỗng (âm w/y? — mọi âm đều có 4 hàng nên không xảy ra, test chống case pool con < 1) .
- **Unit** `sound-matrix`: lọc cat/art (w/y biến mất khi art != all; nhóm không còn item → ẩn heading); icard active theo sel.
- **Unit** `sound-inspector`: title bán nguyên âm vs thanh mẫu; 4 hàng tone đúng data; nút drill gọi `onDrill(sel)`.
- **Unit** `quiz-view`: trả lời đúng → good + streak++, sai → bad + streak reset + hiện đáp án; head tính đúng "Độ chính xác"; Enter/space/1-4 qua `useKeyboard` (dispatch KeyboardEvent); hoàn thành → onSessionComplete(score) đúng 1 lần; tier copy mock (score 10 / 6 / 2).
- **Unit** `pinyin-lab-root`: mode từ initialMode; drill từ initialDrill → quiz có pool lọc; đổi mode reset quiz; redirect flow qua test page? (redirect route kiểm bằng build/e2e hiện có).
- **Unit** `progress-store`: recordPinyinLabResult ghi best đúng, getPinyinLabBest mặc định 0 (pattern test store hiện có nếu có).
- **Unit** `tone-lab`/`sandhi-rules`: render đúng data + speaker gọi speak.
- Chạy kèm suite hiện có (vitest) + e2e hydration/learning-flow (redirect giữ URL cũ).

## 10. Điều kiện tiên quyết

Không có — mọi token, primitives (`SegmentedTabs`, `StreakPill`, `Button`, `IconButton`), `useKeyboard`, `useTts`, `mulberry32`, store đều có sẵn trên `main`. `(wide)` được Task đầu tạo nếu thiếu.
