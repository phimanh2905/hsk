# My Vocab (Sổ tay từ vựng) — port `opendesign_hsk/my-vocab.html` vào `app-next`

- **Ngày:** 2026-10-05
- **Trạng thái:** Đã duyệt design (brainstorming) — chờ review spec
- **Nguồn design:** `opendesign_hsk/my-vocab.html` (528 dòng, mock "Sổ tay từ vựng", CSS thuần tự chứa, light + dark, có app-shell riêng — bỏ)
- **Phạm vi repo:** `app-next/` trên `main` — thay nội dung `/my-vocab`, mở rộng `progressStore`
- **Plan liên quan:** dùng chung route group `(wide)` + pattern với `2026-10-05-hanzi-studio.md`, `2026-10-05-pinyin-lab.md` (đều chưa thực thi; Task tạo `(wide)` idempotent)

## 1. Mục tiêu & quyết định đã chốt

Port **100%** mock Sổ tay từ vựng thành trang `/my-vocab` mới. Quyết định người dùng đã chọn / mặc định được duyệt:

1. **Dữ liệu: thật, tổng hợp 3 nguồn** hợp nhất theo Hán tự (không dùng 18 từ seed mock):
   - `progressStore.getAllSrs()` — status/last/level suy từ SRS (pattern `/review`),
   - `progressStore.listDecks("vocab")` — rows các user deck (`DeckRow`),
   - `progressStore.getVocabBook()` — từ đã lưu từ dictionary.
2. **2 deck cố định tính động + user decks thật**: "Từ cần ôn ngay" = từ có SRS `status !== "known"` (đúng semantics mock `st !== 'master'`); "Từ đã sao" = từ có star. Deck "Tiếng Trung văn phòng" của mock là fake → bỏ. Pill "HSK mục tiêu" = level cao nhất (`HSK N` max) có từ trong list; không có → ẩn pill.
3. **Container: `(wide)` 1280px** (mock 1100px); `(wide)/layout.tsx` tạo nếu chưa tồn tại (nội dung giống 2 plan trước).
4. **API: mở rộng `progressStore`, không tạo API route** (nhất quán toàn app) — thêm per-word meta (star/note).

Giữ nguyên: `LoginGate` (e2e `personal-tools.spec.ts` đang assert gate copy), route `/my-vocab` + entry breadcrumb/sidebar/command-index/home (không đổi URL).

Ngoài phạm vi (mock có nhưng **không port**): sidebar/bottomnav/topbar của mock (shell có sẵn, search ⌘K giữ nguyên — search của mock chuyển thành page-local trong controls), theme toggle, toast tự viết (`useToastSafe`).

## 2. Mô hình dữ liệu & store API

### 2.1 `src/lib/my-vocab.ts` (mới, pure — không import progressStore)

```ts
export type VocabStatus = "master" | "study" | "new";
export type VocabRow = {
  zh: string; py: string; hv: string; vi: string;
  hsk: string;                 // "HSK N" từ srsLevelFromKey khi có SRS, ngược lại "—"
  status: VocabStatus;         // SRS known/learned → "master", learning → "study", new → "new"
  last: string;                // formatLastLabel(lastReviewedAt, now)
  star: boolean;
  note: string;
  hasSrs: boolean;             // có SRS item (military cho "Cần ôn ngay" filter)
  deckIds: string[];           // các user deck chứa Hán tự này
};
export type WordMeta = { star?: 1; note?: string };
export type VocabIndex = {
  rows: VocabRow[];            // dedupe theo zh; thứ tự: SRS trước (mới review trước), rồi deck rows, rồi vocabBook
  dueCount: number;            // mock hero: số từ hasSrs && status !== "master"
  mastery: number;             // weighted: master 1 / study .5 / new 0, round % toàn list; list rỗng → 0
  hskTarget: string | null;    // level cao nhất trong list ("HSK 4"), không có → null
};
export function buildVocabIndex(input: {
  srs: SrsItem[];
  decks: DeckItem[];           // kind "vocab"
  vocabBook: VocabBookEntry[];
  meta: Record<string, WordMeta>;
  now: number;
}): VocabIndex
```

Hợp nhất: đi từng nguồn tạo entry theo `zh` (first-wins cho py/hv/vi/hsk — thứ tự nguồn trên), gộp `deckIds`. `resolveWord` của `srs-session` dùng được cho SRS key (import; nó đọc progressStore — chấp nhận trong lib này vì jsdom OK, giống `srs-session.ts` comment).

### 2.2 `progressStore` mở rộng (pattern `markRoadmapSession` + `dispatchProgress`)

```ts
getWordMeta(): Record<string, WordMeta>            // readJSON("bye.wordMeta", {})
toggleWordStar(hanzi: string): boolean             // set/xoá star, writeJSON + dispatchProgress, trả trạng thái mới
setWordNote(hanzi: string, note: string): void     // ghi note (chuỗi rỗng → xoá field), dispatchProgress
```

Cập nhật signature trong `ProgressStoreApi` (nếu class implement interface). Không đổi key nào cũ.

## 3. Route & container

- `src/app/(wide)/my-vocab/page.tsx`: giữ `LoginGate pageSub={notebookSubGate.vocab}`, render `<MyVocabRoot />` (client). Metadata title "Sổ tay từ vựng".
- Chuyển thư mục `(app)/my-vocab` → `(wide)/my-vocab` (URL không đổi); `(wide)/layout.tsx` tạo nếu thiếu.

## 4. Component decomposition (`src/components/my-vocab/`)

Thứ tự: hero → controls → deck-grid (view "decks") hoặc vocab-table (view "list").

| File | Loại | API & nội dung |
|---|---|---|
| `my-vocab-root.tsx` | client root | State: `view` ("decks"/"list"), `hsk` ("all"/"HSK 1..6"/"star"), `q`, `drawerZh` (string \| null), `deckModal` (bool). Data: `buildVocabIndex` từ store (re-compute khi `bye:progress` event — pattern NotebookList). Render các section; keyboard `/` focus search, `Escape` đóng drawer/modal (useKeyboard). Drawer Space phát âm. HSK filter chọn khi đang view decks → tự chuyển view "list" (port mock: filter chỉ áp dụng cho list) |
| `vocab-hero.tsx` | client | Kicker "THE MEMORY COMMAND", h1 "Hôm nay có **N từ** cần làm mới" (N tô accent), pills: "Tổng: N từ" / "Đã nhớ vững: P%" / "HSK mục tiêu: HSK N" (ẩn nếu null). CTA `Button` "Luyện tập ngay" → `/review` |
| `vocab-controls.tsx` | client | Row 1: seg inline view ("Bộ thẻ cá nhân (Decks)" / "Danh sách toàn bộ từ") + nút dashed "+ Tạo Deck mới" (mở modal). Row 2: label "CẤP ĐỘ" + seg inline (Tất cả, HSK 1–6, Đã lưu). Row 3: page-local search input pill (icon Search + kbd "/") — lọc trên zh+py+hv+vi. Seg inline: export helper `VocabSeg({ label, options: {key,label}[], value, onChange })` dùng chung 2 chỗ |
| `deck-grid.tsx` | client | Props: `{ decks: DeckCard[]; onStudy(id); onMenu(id) }` với `DeckCard = { id, name, meta, mastery, icon: "inbox"\|"star"\|"brief"\|"folder", fixed }`. Grid 3 cột (≤860px 1 cột). Card: icon tile, h3, meta ("N từ đến hạn"/"N từ đã sao"/"N từ trong deck"), mastery bar jade + "Độ bền: N%", nút "Học Flashcard", ⋯ menu (toast demo như mock: "Thao tác deck: đổi tên · xóa"). onStudy: deck user → `/lesson/custom/<id>`; deck "due"/"star" → `/review` |
| `vocab-table.tsx` | client | Props: `{ rows, onOpen(zh), onSpeak(zh) }`. Bảng 6 cột (Hán tự 22px `.zh` / Pinyin / Âm H-V + Nghĩa / HSK / Trạng thái `MemSegs` / Thao tác: audio + ⋮) + mobile cards `<720px` từ **cùng 1 hàm map** (pattern `vocab-inspector` của review). Empty state "Không có từ nào khớp bộ lọc." Row/click → `onOpen` |
| `mem-segs.tsx` | client (pure) | `{ status }` → 5 đoạn 16×6 (on-jade ≥4 / on-amber 2–3 / on-rose 1: master=5, study=3, new=1) + `<b>N/5</b>` — port `.mem` |
| `word-drawer.tsx` | client | Props: `{ row: VocabRow, onClose, onStar(zh), onSaveNote(zh, note), onSpeak(zh) }`. Panel phải 420px + scrim: status pill (Master/Đang ôn/Mới học + dot), glyph 56px, py, hv, mean, hàng meta (hsk · last + nút speak + nút ☆/★), "THỨ TỰ NÉT VIẾT" (`ol` — lookup `STROKE_PATH_DATA[firstChar]`/`STROKE_DATA[firstChar]` → tên nét `order`; fallback ["Tra bút thuận trong Hanzi Studio"]), ô thiên tự (ký tự đầu, grid CSS ::before/::after như mock) + "Mở Bàn luyện viết" → `/hanzi`, textarea "GHI CHÚ CÁ NHÂN" + "Lưu ghi chú" → `onSaveNote`, "Luyện từ này" (primary) → toast demo như mock ("Luyện từ “X” — mở lesson trong bản đầy đủ") |
| `deck-modal.tsx` | client | `Dialog` tạo deck: input tên (maxlength 40, Enter submit), Hủy/Tạo deck; rỗng → toast "Hãy đặt tên cho deck"; tạo xong toast "Đã tạo deck “X”" + `createDeck("vocab", name)` |

## 5. Mapping tokens & primitives

| Mock | App |
|---|---|
| hero card backdrop-blur | `bg-surface-elevated/80 backdrop-blur-sm` (mock card rgba .8) |
| `.seg` tròn (active = accent-soft + text accent + border accent 35%) | **seg inline trong `vocab-controls`** (button rounded-full, `aria-pressed`, pattern state-pills của hanzi-studio — `SegmentedTabs` mặc định active nền elevated, không khớp hình mock) |
| mastery bar jade / mem segs | `learning-mastered` / jade-amber-rose tokens |
| `.srs` pill | jade-wash/amber-wash/rose-wash + line/ink |
| star `--amber` | `learning-streak` |
| drawer/scrim | fixed right drawer 420px + scrim 50% (pattern shadowing thiếu Drawer — viết mới trong `my-vocab/`), `z-50/51`, transition transform |
| toast/sr | `useToastSafe` |
| TTS `speechSynthesis` .85 | `useTts().speak(zh, { rate: 0.85 })` |
| `data-od-id` | giữ nguyên làm hook e2e/test |
| keyboard `/` + Escape | `useKeyboard` (nó bỏ INPUT/TEXTAREA — Escape vẫn cần khi focus input → thêm listener riêng cho Escape trong root) |

## 6. Giữ / xoá / cập nhật

- **Giữ:** `NotebookList` + `/notebook/vocab/[id]` (deck mới vẫn mở được), `content/notebooks.ts`, mọi store key cũ, breadcrumb/sidebar/command-index/home entry (URL không đổi), `LoginGate`.
- **Thay:** nội dung `/my-vocab` (NotebookList chỉ còn dùng cho `/my-grammar` — không xoá component).
- **Cập nhật e2e `e2e/personal-tools.spec.ts`:** các test `/my-vocab` sau login (copy "Sổ mẫu"/"Tạo bộ mới"/placeholder tạo deck → copy mock mới; giữ flow tạo deck → `/lesson/custom/nb-e2e`), giữ nguyên 2 test khác (gate + sitemap exclude).

## 7. Testing

- Unit `buildVocabIndex`: hợp nhất 3 nguồn + dedupe theo zh (first-wins), status map SRS, dueCount (hasSrs && status !== master), mastery weighted (0/50/100), hskTarget max level, deckIds gộp, list rỗng → mastery 0 + hskTarget null.
- Unit store: getWordMeta mặc định {}; toggleWordStar on/off + persist key; setWordNote ghi/xoá rỗng; dispatchProgress phát.
- Unit `deck-grid`: meta copy theo deck kind; mastery bar %; onStudy route đúng (user deck vs fixed).
- Unit `vocab-table`: bảng + mcards cùng số row; mem segs theo status; empty state; audio stopPropagation.
- Unit `word-drawer`: strokes lookup chữ có data (爱) vs fallback; star toggle gọi onStar; lưu ghi chú; tianzi ký tự đầu.
- Unit `my-vocab-root`: view switch; HSK filter chuyển sang list + lọc; star filter; search; hero số liệu; tạo deck prepend vào grid; Escape/`/`.
- e2e cập nhật như §6.

## 8. Điều kiện tiên quyết

Không có — mọi primitive (`SegmentedTabs`, `Dialog`, `Input`, `Textarea`, `Button`, `Chip`), `useTts`, `useKeyboard`, `resolveWord/formatLastLabel/srsLevelFromKey`, `STROKE_DATA/STROKE_PATH_DATA` có sẵn; `(wide)` tạo idempotent ở Task đầu.
