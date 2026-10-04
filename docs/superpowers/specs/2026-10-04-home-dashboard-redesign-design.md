# Home Dashboard Redesign — port `opendesign_hsk/index.html` vào `app-next`

- **Ngày:** 2026-10-04
- **Trạng thái:** Đã duyệt design (brainstorming) — chờ review spec
- **Nguồn design:** `opendesign_hsk/index.html` (581 dòng, mock "Hanzi — Home Dashboard · HSK 2", CSS thuần tự chứa, không framework)
- **Phạm vi repo:** `app-next/` + `opendesign_hsk/Hanzi/DESIGN.md` + skill `hanzi-design-system`

## 1. Mục tiêu & quyết định đã chốt

Port **100%** mock Home Dashboard mới thành component Next.js, thay cả shell chrome. Các quyết định người dùng đã chọn:

1. **Token theo design mới** — Vermilion làm primary action, radius 8/16, nền `#FAF9F5`; `DESIGN.md` được cập nhật thành nguồn sự thật mới (bỏ quy định "jade là primary, vermilion chỉ cho danger").
2. **Thay cả shell** — topbar mới (search + HSK switcher + streak pill + avatar) và bottom-nav 5 item theo mock.
3. **Bỏ SidebarNav** — desktop chỉ còn topbar theo mock, chấp nhận mất menu dọc.
4. **Cách convert: tách primitive trước** — token → primitives → shell → compose Home.

Ngoài phạm vi: dữ liệu demo của mock (badge "ĐANG HỌC DỞ · BÀI 4", 185/300 từ…) là placeholder; component wire vào data thật có sẵn của app, mock chỉ định hình визу.

## 2. Token layer (`app-next/src/app/globals.css`)

Giữ nguyên cơ chế 3 lớp (`--hz-*` → semantic → `@theme inline`) và dark mode qua `html.dark` + localStorage `nhai.theme` (bỏ qua `data-theme`/`hanzi:theme` của mock — đó là cơ chế demo). Ánh xạ giá trị mock vào primitive:

| Token | Light (mock `:root`) | Dark (mock) | Ghi chú |
|---|---|---|---|
| `--hz-paper` (bg) | `#FAF9F5` | `#111318` | đổi từ `#fafbfa` / `#1d1d1d` |
| `--hz-surface` (mới) | `#f1f3f2` | `#1a1d24` | nền field/track phụ — mock `.search`, `.btn-ghost`, `.tool` |
| `--hz-elevated` | `#ffffff` | `#1c2029` | |
| `--hz-ink` (fg) | `#1f2a27` | `#eceeed` | |
| `--hz-slate` (muted) | `#66756f` | `#9aa3a0` | |
| `--hz-line` (border) | `#e8ecea` | `#2a2f37` | |
| `--hz-vermilion` (accent) | `#C83C32` | `#E05349` | **đổi vai trò: primary action** (cũ `#d24b3f` danger-only) |
| `--hz-vermilion-hover` (mới) | `#B33229` | `#c7453c` | |
| `--hz-jade` | `#2D7D5B` | `#4caf8a` | đổi từ `#0f766e` — giờ là màu phụ (pulse dot, goal ring, gradient bar) |
| `--hz-amber` | `#e68a00` | `#dcaa37` | streak |
| `--hz-amber-wash` (mới) | `#fdf3e2` | `#312512` | |
| `--hz-amber-ink` (mới) | `#5c3600` (status todo dùng `#7a4a00`) | `#f5d98b` | chữ trên wash |
| `--hz-purple` | giữ `#722ed1` | giữ | AI feature, không đổi |
| ring track (mới) | `#e8ecea` | `#3e3e3e` | track của donut/progress |
| radius control | **8px** | | cũ 10px |
| radius card | **16px** | | cũ 14px |
| shadow | `0 1px 2px rgba(31,42,39,.05)`; hover `0 2px 4px …, 0 10px 24px …` | bản dark theo mock | |

Cập nhật kèm theo:

- Semantic layer (`--action-*`, `--surface-*`, `--text-*`, `--border-*`) trỏ sang bộ primitive mới; `--action-primary` → vermilion. **Lưu ý tách:** màu lỗi nhỏ vẫn `#A9342B` ở `--feedback-error`, không dùng accent `#C83C32`.
- Focus ring (`ring-action-focus` + `:focus-visible`) → `--hz-vermilion` giá trị `accent-600` (`#d24b3f` light / `#E05349` dark).
- Progress bar hero dùng gradient `linear-gradient(90deg, jade → accent-600)` như mock.
- Font: **không theo mock** (`SFMono` stack là demo). Giữ Be Vietnam Pro + Noto Sans SC hiện có.
- Toàn app đang tiêu thụ semantic token nên đổi token tự động đổi màu mọi màn — đúng chủ đích; quét một lượt chỗ hard-code màu/radius cũ và sửa.

## 3. Primitives (`app-next/src/components/ui/`)

Giữ convention hiện có: `forwardRef` + `cn()`, icon chỉ qua `@/components/ui/icon` (`ICON_STROKE`), min touch target 44px.

| File | API dự kiến |
|---|---|
| `segmented-tabs.tsx` (mới) | Container pill nền surface, nút con `aria-pressed`; dùng cho Lesson/SRS trong hero |
| `icon-tile.tsx` (mới) | Ô 40px, radius control, nền surface + border, chứa icon; prop `tone` cho màu icon |
| `donut-ring.tsx` (mới) | SVG ring: props `size`, `strokeWidth`, `value`, `total`, `label`, `children` (text giữa); tính `stroke-dashoffset` từ chu vi, animate; màu arc qua prop |
| `search-field.tsx` (mới) | Input search nền surface + icon + hint `<kbd>` (ẩn mobile); Enter → điều hướng `/dictionary?q=` |
| `streak-pill.tsx` (mới) | 2 dạng: pill tròn amber-wash (topbar) và card streak có text (glance) — 1 component, variant `mini \| full` |
| `chip.tsx` (mở rộng) | Thêm tones `doing` (nền surface), `todo` (amber-wash + chữ amber-ink), `idle` (trong suốt, chữ slate) cho status của habit cards |
| `button.tsx` (chỉnh) | Variant `primary` → vermilion mới; thêm `lg` size (min-height 48px) cho CTA hero; `ghost` khớp `.btn-ghost` mock |
| `progress.tsx` (chỉnh) | Thêm prop gradient (jade→vermilion) cho bar hero |

## 4. Shell mới (`app-next/src/components/shell/`)

- **`topbar.tsx` viết lại**: sticky, backdrop-blur, border-bottom. Thứ tự: brand (tile 36px nền ink + glyph 汉, tên "Hanzi / HSK LEARNING" ẩn <640px) → `SearchField` (ẩn <900px, phím tắt ⌘K) → HSK switcher (dot jade + `<select>` HSK 1–4, ẩn <760px; state level đọc từ progress store) → `StreakPill mini` (ẩn <760px, đọc `nhai.streak`) → `IconButton` theme (qua `ThemeToggle`/`ThemeProvider` hiện có) → avatar 40px (chữ cái đầu từ `use-session()`; click mở LoginModal/SettingsModal như cũ).
- **`bottom-nav.tsx` đồng bộ**: 5 item Home `/`, Roadmap `/roadmap`, Hanzi `/hanzi`, Practice `/review`, Profile `/progress`; `aria-current="page"`; chỉ hiển thị <760px (giữ hành vi mock, desktop mất nav dọc theo quyết định #3).
- **`sidebar-nav.tsx` xoá** cùng mọi tham chiếu (root `layout.tsx`, tests).
- Toast/SR live region: dùng lại `ToastProvider` hiện có; toast của mock (pill nền ink giữa màn hình) chỉ là demo — không port styling riêng.
- Event `nhai:open-nav` của sidebar cũ: kiểm tra và dọn các nơi dispatch/lắng nghe.

## 5. Home (`app-next/src/components/home/` + `app/(app)/page.tsx`)

Layout: `.page` max-w-1024, padding 16/24/48, gap 16; <640px padding 16/16/110 (chừa bottom nav).

| Component | Loại | Nội dung |
|---|---|---|
| `glance-header.tsx` | server | H1 "早上好, {tên}!" (chào theo giờ) + dòng "Ngày N/90 · thứ, ngày" (tính từ tiến độ roadmap); metrics: `StreakPill full` + goal-ring 44px (mini DonutRing, phút học hôm nay / mục tiêu, đọc `nhai.today`) |
| `hero-action.tsx` | client | Card chính: watermark glyph 210px opacity .055; state badge (pulse jade/amber); tiêu đề bài + hanzi; sub tiến độ; `Progress` gradient; CTA primary (48px) + ghost; `SegmentedTabs` Lesson/SRS. Hai state (lesson/srs) đọc từ `useProgress()` + `roadmap-status.ts` + store SRS; SRS mode đổi pulse sang amber. CTA primary → `/lesson/...` hoặc `/review` |
| `habit-loop.tsx` | server + client con | Section head + 3 card: (1) Bài học mới 新课 — status `doing`, `IconTile` vermilion, step-mini progress + link "Xem tóm tắt bài →"; (2) Ôn tập SRS 复习 — `todo`, số từ đến hạn, tỉ lệ nhớ, `habit-btn` → `/review`; (3) Phản xạ âm thanh 跟读 — `idle`, → `/shadowing`. Card 1 đồng bộ dữ liệu với hero |
| `progress-matrix.tsx` | server | Grid 1.05fr/.95fr (<860px 1 cột). Card "Lộ trình HSK 2": `DonutRing` 96px (từ đã nhớ/total, màu accent) + mastery-nums + 3 `.mrow` + `link-arrow` → `/roadmap`. Card "Công cụ bổ trợ nhanh": 4 nút (Hanzi Studio → `/hanzi`, Pinyin → `/pinyin`, Sổ tay → `/my-vocab`, Đọc hiểu → `/reading`) |
| Thay `continue-card.tsx` | — | Hero mới thay thế ContinueCard; xoá component + tests cũ |

`page.tsx` giữ làm server component compose; chỉ `hero-action` và tương tác nhỏ là client islands. Hiện `continue-card` đang là component duy nhất trong `components/home/` — cấu trúc mới đặt thẳng vào thư mục này.

## 6. Accessibility & a11y contract

Giữ mọi contract của mock: `role="progressbar"` + `aria-valuenow/min/max`; `aria-pressed` cho tabs; `aria-current="page"` cho nav; `aria-live="polite"` cho toast/sr-only; donut có `role="img"` + `aria-label` ("Đã nhớ 185 trên 300 từ, đạt 61 phần trăm"); min touch 44px; focus-visible ring vermilion; không mã hoá ý nghĩa chỉ bằng màu (status chip luôn có chữ).

## 7. Testing

- **Vitest** (colocated `__tests__/`): `SegmentedTabs` (toggle + aria-pressed), `DonutRing` (dashoffset math + aria-label), `Chip` tones mới, `StreakPill` variants, `SearchField` (Enter → router.push). Cập nhật tests home + shell hiện có cho DOM mới.
- **Playwright** (`e2e/`): cập nhật spec home/topbar theo DOM mới (selector đổi, thêm assert bottom-nav mobile + hero tabs).
- **Kiểm chứng thủ công:** dev server port 3100, soi light/dark + 3 breakpoint (420/760/1024) bằng browser trước khi báo hoàn tất.

## 8. Rủi ro & xử lý

| Rủi ro | Xử lý |
|---|---|
| Đổi token làm lệch màu toàn app ngoài Home | Đúng chủ đích (mục tiêu #1); quét một lượt chỗ hard-code cũ, chụp màn các màn chính sau khi đổi |
| Mất SidebarNav ảnh hưởng điều hướng desktop | Đã được user chấp nhận; bottom-nav + topbar + link trong trang là đường thay thế |
| Skill `hanzi-design-system` đang mô tả jade-primary | Cập nhật skill cùng đợt với `DESIGN.md` để tài liệu khớp thực tế |
| Mock dùng `color-mix()`/`@media(max-width)` thuần | Tailwind v4 hỗ trợ cả hai; `color-mix` viết bằng CSS var trong globals helper nếu cần |

## 9. Tài liệu phải cập nhật cùng lúc

1. `opendesign_hsk/Hanzi/DESIGN.md` — primary Vermilion, jade phụ, radius 8/16, nền mới, bảng dark.
2. `.zcode/skills/hanzi-design-system/SKILL.md` — đồng bộ với DESIGN.md.
3. `app-next/AGENTS.md` — đoạn "7 fixed core colors" nếu có nhắc vai trò màu.
