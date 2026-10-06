# Hanzi Studio — Redesign radical-first (spec)

- **Ngày:** 2026-10-07
- **Nguồn:** `opendesign_hsk/hanzi.html` commit `1107427` (đã duyệt trong brainstorming)
- **Phạm vi:** `/hanzi` (Hanzi Studio) trong `app-next` + pipeline data build-time + link chéo `/radicals`
- **Quyết định đã chốt với owner:**
  1. Phạm vi data: **Full** — UI mới + data thật + `hanzi-writer` + `hanzi-writer-data`
  2. Token màu: design system **đã sẵn** palette mới (`--hz-ink #1f2a27`, `--hz-slate #66756f` port từ index.html 2026-10-04) → **không đổi token**, không thêm token `--cream` (dùng `surface-muted`)
  3. Feature mock bỏ: **bỏ theo mock** — accuracy meter, badge/spill tiến độ, state filter, 3 meta chip (bộ thủ/cấu trúc/hán việt)

## 1. Mục tiêu

Chuyển Hanzi Studio từ "luyện 12 chữ demo theo cấp độ HSK" sang **"tra cứu bộ thủ trước, luyện chữ sau"** theo mock mới:

- Catalog = kho **214 bộ thủ Kangxi** (data thật từ `radicals.ts`), lọc theo số nét + phân loại + search, có pagination
- Mode-switch trong catalog: **"Theo cấp độ HSK" ↔ "214 Bộ thủ"**
- Workbench: luyện viết (watch + draw) bằng **hanzi-writer** với data nét thật; hộp **bóc tách** khi chọn chữ; **tray "các chữ HSK chứa bộ này"** click để nạp chữ
- Bỏ accuracy meter, badge tiến độ, state filter, meta chip

## 2. Đánh giá lib (đã verify thực tế 2026-10-06)

| Lib | Kết luận |
|---|---|
| `hanzi-writer` ^3.7.3 | **Dùng được**, đã có trong `package.json` nhưng chưa dùng thật (`stroke-player.tsx` là engine tự viết chạy data demo 0–100). Dùng `HanziWriter` cho watch (animate nét) + draw (quiz API có sẵn, chuẩn hơn engine tự viết). |
| `hanzi-writer-data` 2.0.1 | **Dùng được.** 9.585 ký tự, file theo tên ký tự literal. **Đã check CDN: đủ glyph bộ thủ biến thể** 氵 扌 犭 亻 宀 辶 艹 钅… (200 OK). Mỗi file chỉ có `strokes` (SVG path, hộp 1024) + `medians` (tọa độ giữa nét). **Không có** `decomposition`/`radical`/pinyin/nghĩa. |

Hệ quả: nét viết giải quyết được cho cả 214 bộ thủ + corpus chữ; còn **index bộ thủ→chữ, bóc tách, pinyin phải build riêng** từ dữ liệu gốc Make Me a Hanzi (MIT, công khai).

## 3. Data pipeline (build-time)

Script `app-next/scripts/build-hanzi-studio-data.mts` (chạy tay, commit kết quả):

**Đầu vào (vendor 1 lần vào repo, `app-next/scripts/vendor/mmc/`):**
- MMC `graphics.txt` — `strokes`, `medians`, `decomposition`, `radical` cho ~9.5k ký tự
- MMC `dictionary.txt` — pinyin + định nghĩa tiếng Anh (không bắt buộc, chỉ để đối chiếu)
- Danh sách từ HSK 1–3 công khai → tách về tập ~600 ký tự duy nhất, lưu `app-next/scripts/vendor/hsk-chars-1-3.txt`
- Bảng phân loại 214 bộ thủ: `core` (50 bộ cốt lõi) + `cat` (`human`/`nature`/`animal`/`other`) — hand-curated, mock đã có 22 bộ, hoàn nốt 192 bộ còn lại

**Đầu ra (commit vào repo):**
- `src/content/hanzi-studio/radical-index.ts` — mỗi bộ: `{ radical, hanViet, meaning, strokes (từ radicals.ts), core, cat, chars: [{ ch, py, level }] }` (chars lấy từ MMC `radical` field group theo Kangxi, giới hạn corpus HSK 1–3, pinyin từ MMC dictionary)
- `src/content/hanzi-studio/char-meta.ts` — map `ch → { py, decomp: string[], level }` cho corpus HSK 1–3
- `public/hanzi-data/*.json` — **subset** strokes+medians: 214 glyph bộ thủ + ~600 chữ corpus (ước tính 3–5MB, chấp nhận được trên Workers; không gọi CDN ngoài lúc runtime)

Zod schema cho output, validate lúc build. Nghĩa tiếng Việt/mẹo nhớ: bộ thủ dùng `radicals.ts` (đủ 214); chữ HSK chỉ có nghĩa nếu nằm trong content app (`hanzi.ts`), còn lại hiện pinyin + bóc tách.

## 4. UI

### 4.1 Catalog panel (`studio-catalog.tsx` viết lại)

- **Mode-switch** (2 nút, segment): "📚 Theo cấp độ HSK" ↔ "🧩 214 Bộ thủ" (icon lucide, không emoji)
- **Chế độ bộ thủ (mặc định):** filter hàng 1 = số nét (Tất cả / 1–2 / 3 / 4 / 5+), hàng 2 = phân loại (50 bộ cốt lõi / Con người / Thiên nhiên / Động vật) + search (bộ thủ, hán việt, nghĩa — bỏ dấu như hiện tại); grid 4 cột card (glyph + tên bộ + "N chữ"), pager 8 card/trang; rơi về 3 cột <480px
- **Chế độ HSK:** segment HSK 1/2/3, grid card chữ (glyph + pinyin + level)
- Card đang chọn: `border-action-primary` + `bg-rose-wash` (giữ convention token hiện tại)

### 4.2 Workbench (`studio-workbench.tsx` viết lại)

- Header: glyph lớn + tên ("Bộ Thủy (Nước) · 3 nét" hoặc pinyin · nghĩa) + nút audio (TTS `useTts` hiện có)
- **Hộp bóc tách** (`decomp`): chỉ hiện ở chế độ chữ HSK — "Bộ 氵 + 先"
- Mode-tabs: "Xem bút thuận" / "Tự luyện viết" + speed-seg 0.75x/1.0x (bỏ 1.5x)
- **Tray** "Các chữ HSK chứa bộ này (bấm để luyện viết)": chip glyph + pinyin, chip đang active highlight; ở chế độ chữ → chip của bộ thủ chứa nó
- Mẹo nhớ (tip): bộ thủ từ `radicals.ts` (nghĩa), chữ từ `hanzi.ts` nếu có; thiếu thì ẩn khối
- **Engine `hanzi-writer`:** mount vào grid-box (Fanning squares background tự vẽ SVG giữ nguyên); watch = animate từng nét + prev/replay/next + speed; draw = quiz mode của lib (undo qua API, hint = `showHintAfterMisses`/outline mờ); bỏ meter chấm điểm
- Chữ/bộ không có data nét (hiếm): ẩn nút luyện, card disable kèm tooltip "Chưa có data nét"

### 4.3 State & route

- State root nằm ở `hanzi-studio.tsx` (page client) như hiện tại: `{ catalogMode, strokeFilter, catFilter, q, level, cur: {kind:'rad'|'char', g}, mode, pane, page }`
- Đọc query param `?rad=<bộ thủ>` khi mount (deep-link từ `/radicals`)
- `/radicals` thêm link chéo "Luyện viết bộ này → /hanzi?rad=X" trên card bộ thủ
- `page.tsx` giữ server SSG; `/hanzi/[char]` không đổi

## 5. Deviation khỏi mock (design system là nguồn chân lý)

| Mock | App |
|---|---|
| Xóa dark theme | **Giữ dark mode** (token flip `html.dark`) |
| Emoji (🔥☀️🔍👁️✍️📚🧩🔊) | lucide-only qua `ui/icon.tsx` |
| Hardcode màu (`#f5d78a`, `#1f2a27`…) | token semantic hiện có (`amber-wash`, `border-default`…) |
| Focus ring jade | Giữ `--action-focus` vermilion (app-wide) |
| Topbar riêng | Shell đã có streak/theme — không port topbar |
| Meter "Độ chuẩn xác" | Bỏ (chốt với owner) |

## 6. Xóa / giữ code

- **Xóa:** meter + scoring từ `studio-grid.tsx`/`studio-workbench.tsx`, `seg-control` phần state pills, data demo `hanzi-strokes.ts` + `hanzi-studio.ts` (12 chữ) khi không còn tham chiếu, `lib/stroke-quiz.ts` (chấm điểm tự viết) nếu không còn dùng
- **Giữ:** `stroke-player.tsx` (còn dùng ở `/hanzi/[char]` và draw-modal) — không đụng
- Tests liên quan viết lại: `hanzi-studio.test.tsx`, `studio-catalog`, `studio-workbench`, `studio-grid`, `use-studio-strokes` (thay bằng adapter test), content tests

## 7. Testing

- **Unit (vitest):** build-script output schema (radical-index khớp 214 bộ, char-meta khớp corpus); filter logic (số nét/phân loại/search bỏ dấu/pagination); catalog + workbench render theo mode; adapter hanzi-writer mock (watch/draw/hint/undo); tray nạp chữ
- **E2E (Playwright):** vào `/hanzi` → chọn bộ 氵 → tray hiện chữ → click 没 → decomp hiện → watch animate; draw mode bật hint; `?rad=口` deep-link; dark mode flip không vỡ layout
- **Gates:** grep không còn "Độ chuẩn xác", "state-pills", emoji trong `(wide)/hanzi` + `components/hanzi/studio`; pnpm unit + e2e xanh

## 8. Rủi ro

- MMC thiếu glyph cho 1 số bộ thủ hiếm → fallback: card vẫn hiện (glyph font), workbench ẩn luyện viết (§4.2)
- Subset `public/hanzi-data/` nhiều file nhỏ (~800 JSON) → gộp theo chunk index (một file `manifest.json` + chunk) để tránh quá nhiều request; quyết cuối ở plan
- Bảng phân loại 214 bộ là data hand-curated → có thể sai vài bộ; chấp nhận, sửa sau không đụng UI
