# Design: Redesign màn Lesson — port `opendesign_hsk/lesson.html` vào `app-next`

- **Ngày:** 2026-10-04
- **Branch:** `home-dashboard-redesign` (cùng chuỗi công việc port design mới; tách plan riêng)
- **Nguồn chân lý UI:** `opendesign_hsk/lesson.html` (mọi khối đánh dấu `data-od-id`)
- **Hệ design:** `opendesign_hsk/Hanzi/DESIGN.md` + token `--hz-*` trong `app-next/src/app/globals.css`
- **Phân loại:** architectural (restructure màn lesson hiện hữu)

## 1. Mục tiêu & phạm vi

Port 100% UI của `lesson.html` — màn học flashcard SRS — thành component React trong `app-next`, thay thế UI mode Flash hiện tại. Các quyết định đã chốt với user:

1. **Phạm vi mode:** design mới áp cho **mode Flash** (mặc định). 6 mode còn lại (quiz, typing, reading, listen, dance, battle) **giữ nguyên logic và UI content**, nhưng được bọc dưới topbar mới dùng chung.
2. **Dữ liệu Stroke Studio:** dùng thư viện **`hanzi-writer`** — hoạt họa nét thật cho ~9500 chữ; UI chrome của sheet port 1:1 từ mockup.
3. **SRS grading:** 3 nút grade **wire thật vào `progress-store`** (3 mức nhớ + thời điểm ôn), không phải UI tĩnh.

Không thuộc phạm vi: redesign 6 mode kia, hệ review (`/review`), roadmap, thay đổi route (`/lesson/[book]/[page]`, `/lesson/custom/[deckId]` giữ nguyên), đổi data từ vựng.

## 2. Kiến trúc component

Thư mục mới `src/components/lesson/flash/`. Convention như các component đã port trên branch này: named export, props là inline type literal với `className?: string` cuối, `cn()` gộp class, chỉ dùng token semantic, icon qua `@/components/ui/icon` với `strokeWidth={ICON_STROKE}` + `aria-hidden`, comment tiếng Việt đầu file cite selector mockup, test RTL riêng trong `__tests__/`, 1 component + 1 test per commit.

| File | Export | Mockup source | Ghi chú |
|---|---|---|---|
| `lesson-topbar.tsx` | `LessonTopbar` | `[data-od-id="lesson-topbar"]` | Grid `auto 1fr auto` max-w 880px. Trái: tile X thoát (mở exit modal). Giữa: nhãn tiến độ (`Bài N: <tên> · **x/y từ (p%)**`) + track 6px fill jade. Phải: 3 tile 40px — autoplay (`aria-pressed`), phím tắt, theme (dùng `useTheme` của `theme-provider`). Tile = pattern `IconTile` (button, `rounded-control`, hover `bg-surface-muted`) + dot đỏ 4px khi `aria-pressed="true"` |
| `flashcard.tsx` | `Flashcard` | `[data-od-id="flashcard"]` | Article max-w 560px bo 24px (`rounded-card`+), click-to-reveal (bỏ qua click trên nút audio/stroke). Nội dung: counter `THẺ n/N`, glyph 68px class `hanzi`, pinyin 21px, hàng audio: speaker tròn 52px màu accent + hiệu ứng ripple (tôn trọng `prefers-reduced-motion`), link "Xem nét viết". Panel reveal: `max-height` + opacity transition, divider, pos pill, meaning, example block (zh/py/vi + mini-audio 32px). Hint đổi nội dung theo `revealed` (Space ⇄ 1 2 3). `aria-live="polite"`, `aria-label` đổi theo trạng thái |
| `srs-deck.tsx` | `SrsDeck` | `[data-od-id="srs-deck"]` | Nút reveal 56px (`[data-od-id="reveal-button"]`, kbd Space) ⇄ grid 3 nút grade (1 cột trên mobile ≤480px). Grade tones: `again` rose, `hard` amber, `good` primary vermilion; mỗi nút có hotkey badge góc trên phải, dòng phụ nhỏ (ôn sau 1 phút / 5 phút / từ tiếp theo). Ẩn cả hai khi ở màn completion |
| `stroke-studio.tsx` | `StrokeStudio` | `[data-od-id="stroke-modal"]` | Sheet modal (chi tiết §5) |
| `exit-modal.tsx` | `ExitModal` | `[data-od-id="exit-modal"]` | Alertdialog "Rời khỏi Bài N?" — 2 nút: "Ở lại học" (đóng modal) / "Về lộ trình" (danger, `router.push("/roadmap")` — đúng như mockup `location.href='roadmap.html'`) |
| `shortcuts-modal.tsx` | `ShortcutsModal` | `[data-od-id="shortcuts-modal"]` | Danh sách 6 phím (Space/1/2/3/R/Esc), nút "Đã hiểu" |

### Primitive mở rộng (không tạo mới)

- `ui/progress.tsx` — thêm 2 prop: `stacked?: boolean` (label trên, track dưới — thay vì flex ngang) và `fill?: "primary" | "jade"` (mặc định primary). Mặc định cũ không đổi → không vỡ chỗ đang dùng.
- `ui/dialog.tsx` — thêm prop `role?: "dialog" | "alertdialog"` (mặc định `dialog`) cho ExitModal.

## 3. State & data flow

### 3.1 `lesson-provider.tsx` (mở rộng)

Thêm vào context: `revealed: boolean`, `setRevealed(v)`, `autoplay: boolean`, `toggleAutoplay()`, `grade(level: 1 | 2 | 3)`, `done: boolean` (đã hết bài).

- `grade(level)`: chỉ có tác dụng khi `revealed`; ghi review vào progress-store (§3.2), toast/sr thông báo ("Chưa thuộc — ôn lại sau 1 phút" / "Mơ hồ — ôn lại sau 5 phút" / "Đã thuộc — tuyệt vời!"), rồi `setIndex(i + 1)` + `setRevealed(false)`; từ cuối → `done = true`.
- `autoplay` persist localStorage (key mới `nhai.lesson.autoplay`) — **chỉ đọc/ghi sau mount** (rule hydration mismatch của dự án).
- Completion: khi `done`, Flashcard hiển thị màn 棒 (`glyph` = 棒, pinyin `bàng`, pos "Hoàn thành", meaning "Xong N/N từ Bài X — quay lại lộ trình để mở trạm tiếp theo", hint Esc về lộ trình) như mockup; SrsDeck ẩn.

### 3.2 `progress-store.ts` (mở rộng)

Store đã có `SrsItem { key, status: new|learning|learned|known, dueAt, reviewCount, lastReviewedAt, updatedAt }`. Thêm method:

```
recordReview(key: string, grade: 1 | 2 | 3): void
```

- `1` → status `learning`, `dueAt = now + 60_000`
- `2` → status `learning`, `dueAt = now + 300_000`
- `3` → status `learned`, `dueAt = null`
- Tăng `reviewCount`, cập nhật `lastReviewedAt`/`updatedAt`, bắn event `nhai:progress`.

Grade item key dùng đúng `itemKey` hiện có của lesson (`"${book}.${page}.${i}"`). `recordReview` **tạo mới** SRS entry nếu từ chưa có (không chỉ cập nhật entry sẵn có) — đúng mục đích của SRS: từ được chấm trong bài học vào hàng đợi ôn tập với `dueAt` tương ứng (grade 1 → 1 phút, 2 → 5 phút, 3 → không đến hạn). `/review` và các màn đếm số từ đã học đọc được `dueAt` này ngay, nên hệ review có dữ liệu mới mà không cần đổi code trong spec này.

### 3.3 TTS & autoplay

Phát âm qua `useTts` hiện có (`speak`, zh-CN). Autoplay bật → sau khi chuyển từ mới, delay 350ms rồi phát từ (như mockup). Toggle autoplay chỉ ảnh hưởng behaviour, không tạo component mới.

### 3.4 Hotkeys

Dùng `lib/use-keyboard.ts` hiện có trong FlashStage: `Space` (reveal, đã revealed thì phát lại audio), `1`/`2`/`3` (grade), `r`/`R` (phát lại). Riêng `Escape` xử lý theo thứ tự mockup: đóng stroke sheet → đóng modal đang mở → mở exit modal. Chú ý: `Dialog` đã tự handle Esc — flash hotkeys phải bỏ qua khi có modal/sheet mở (guard theo state).

## 4. Tích hợp vào `lesson-client.tsx`

- Header cũ (link "← Danh sách bài", badge Bài N, mascot, h1, watermark) **thay bằng `LessonTopbar`** cho mọi mode.
- Khi `mode === "flash"`: khu content chính render `Flashcard + SrsDeck` (thay `modes/flash.tsx` + tabs cũ — tabs Từ vựng/Ví dụ không có trong design mới; thông tin đã nằm trong card). Sidebar "Chọn chế độ học" **giữ nguyên** (mockup không mô tả mode picker — không tự ý xoá tính năng).
- 6 mode khác: giữ nguyên layout content cũ, chỉ đổi "khung" sang topbar mới. `WordList` giữ nguyên ở cuối.
- Prev/next cũ bỏ ở flash mode (thay bằng flow grade); giữ ở mode khác nếu đang dùng.

## 5. Stroke Studio (`stroke-studio.tsx`)

Sheet modal theo mockup: nền blur, bo 24px, max-w 860px; mobile ≤640px dính đáy màn hình (bottom sheet, bo chỉ trên). Cấu trúc:

- **Head:** char-tabs (pill group, mỗi tab: chữ `.hanzi` + "n nét", `aria-pressed`) · py-pill (pinyin của chữ + nút audio 32px) · nút đóng tile. Danh sách chữ = ký tự duy nhất theo thứ tự trong từ hiện tại.
- **Body 2 cột** (≤760px thành 1 cột):
  - Trái: **grid-box** 320px vuông — nền card + SVG lưng lưới (khung, trục dashes) render tĩnh theo mockup; **hanzi-writer** làm char-data loader (`HanziWriter.loadCharacterData` — tải per-char từ CDN, có cache); hoạt họa + trạng thái từng nét (todo/done/now) port 1:1 từ mockup bằng stroke-dashoffset để kiểm soát được từng nét (API runtime hanzi-writer không expose trạng thái này). Điều khiển: Nét trước / Phát lại / Nét sau / speed-seg 0.75x · 1.0x · 1.5x (`aria-pressed`) / "Tự luyện viết" (`aria-pressed`).
  - **Practice pad:** bật "Tự luyện viết" → overlay SVG nhận pointer events, vẽ polyline (màu accent, stroke 11), Undo/Clear + đếm "n nét đã viết / tổng" (pattern tham khảo `components/hanzi/draw-modal.tsx` nhưng SVG theo mockup); đủ nét → toast "Đủ N nét — đối chiếu với thứ tự mẫu bên phải".
  - Phải: **info col** — radical card (sym 56px nền jade-wash, tên bộ, nghĩa, số nét — lấy từ `content/hanzi.ts` theo chữ; không có → ẩn card), facts (tổng số nét từ `hanzi-writer` data + cấu trúc nếu có), **danh sách bút thuận** (scroll max-h 165px, mỗi row: số thứ tự tròn + tên; row hiện tại highlight accent trái; click → nhảy tới nét đó), tip box "Mẹo ghi nhớ" (nếu có trong content).
- **Nodata:** char không load được data (offline/lỗi CDN) → trong grid-box hiện thông báo như mockup ("Dữ liệu nét demo hiện có…") và info col hiện "Chữ X sẽ được bổ sung dữ liệu bút thuận"; các nút điều khiển nét disabled.
- **hanzi-writer:** dependency mới `hanzi-writer` (~10KB gz); char data load per-char từ CDN jsdelivr (loader mặc định), catch lỗi → nodata. Stroke names tiếng Việt (Phẩy · piě…) **không có trong dataset** — danh sách bút thuận hiển thị "Nét 1…N" kèm tóm tắt (số thứ tự); khi sau này bổ sung data tên nét per-char thì hiển thị tên (mockup đã hỗ trợ layout 2 cột text).
- Toast + sr-live: dùng `toast-provider` hiện có (mockup chỉ có 1 toast pattern chung).

## 6. Tokens & styling

- Chỉ dùng token semantic `--hz-*` hiện có. **Bổ sung** vào `globals.css` (nếu chưa có sau khi đối chiếu): `--hz-rose-wash` (light `#FEF2F2` / dark `rgba(127,29,29,.25)`), `--hz-rose-line` (`#FECACA` / `rgba(127,29,29,.5)`), `--hz-rose-ink` (`#B91C1C` / `#FCA5A5`) + mapping Tailwind `rose-wash`/`rose-ink` — dùng cho nút grade "Chưa thuộc". Dark mode song song tokens.dark.
- Fill track tiến độ: `--hz-jade`. Nút grade "Đã thuộc": `bg-action-primary` + shadow vermilion nhẹ. Không hardcode hex trong JSX (raw `var(--…)` chỉ trong SVG).

## 7. Accessibility

- Topbar tiles: `aria-label` + `title` (autoplay có `aria-pressed`); track là `role="progressbar"` với `aria-valuenow` (Progress primitive đã đúng).
- Flashcard: `aria-live="polite"`; `aria-label` đổi theo revealed; speaker/mini-audio/stroke-link có `aria-label` riêng; click-card không bắt được key focus — reveal luôn có nút reveal-btn 56px làm affordance bàn phím.
- Exit modal: `role="alertdialog"`; shortcuts modal + sheet: `role="dialog"` `aria-modal`; sheet có label "Nét chữ và bút thuận".
- Ripple/fadein/transition có `prefers-reduced-motion` fallback.
- Thông báo trạng thái (grade, autoplay, đủ nét) qua toast + `aria-live` region.

## 8. Testing

- Mỗi component mới: `__tests__/<name>.test.tsx` — RTL, `it()` tiếng Việt, assert role/label/text **và** token class (pattern `icon-tile.test.tsx`).
- `progress-store`: test mới cho `recordReview` (3 grade → status/dueAt/reviewCount đúng; key sai không crash).
- `lesson-provider`: test flow reveal → grade → index tăng → done ở từ cuối.
- Regression: toàn bộ test lesson hiện có phải pass (flash.tsx cũ bị thay — xoá test tương ứng cùng commit); `pnpm typecheck`, `pnpm lint`.
- E2E: spec lesson hiện có (nếu có) chạy lại pass; thêm 1 spec smoke flash mode mới (reveal → grade → từ tiếp) nếu thời gian cho phép — không bắt buộc để merge.

## 9. Thứ tự triển khai đề xuất (cho writing-plans)

1. Tokens rose + Progress/Dialog extension (primitives trước).
2. `ExitModal`, `ShortcutsModal` (ít phụ thuộc).
3. `progress-store.recordReview` + provider extension (revealed/autoplay/grade/done).
4. `SrsDeck`, `Flashcard`, `LessonTopbar`.
5. Tích hợp `lesson-client.tsx` + hotkeys; xoá `modes/flash.tsx` cũ.
6. `StrokeStudio` + hanzi-writer (độc lập, làm sau khi core chạy).

Mỗi bước: TDD, 1 commit theo format `feat(lesson): <nội dung> (port <selector mockup>)`.
