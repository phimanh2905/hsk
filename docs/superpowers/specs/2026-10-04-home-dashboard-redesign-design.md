# Home Dashboard Redesign — port `opendesign_hsk/index.html` vào `app-next`

- **Ngày:** 2026-10-04
- **Trạng thái:** Đã duyệt design (brainstorming) — chờ review spec
- **Nguồn design:** `opendesign_hsk/index.html` (581 dòng, mock "Hanzi — Home Dashboard · HSK 2", CSS thuần tự chứa, không framework)
- **Phạm vi repo:** `app-next/` + `opendesign_hsk/Hanzi/DESIGN.md` + skill `hanzi-design-system`

## 1. Mục tiêu & quyết định đã chốt

Port **100%** mock Home Dashboard mới thành component Next.js, thay cả shell chrome. Các quyết định người dùng đã chọn:

1. **Token theo design mới** — Vermilion làm primary action, radius 8/16, nền `#FAF9F5`; `DESIGN.md` được cập nhật thành nguồn sự thật mới (bỏ quy định "jade là primary, vermilion chỉ cho danger").
2. **Thay cả shell** — ~~topbar mới (search + HSK switcher + streak pill + avatar) và bottom-nav 5 item theo mock~~ **bổ sung 2026-10-04 phiên 2: shell theo `app-shell.html` — xem section 4b**.
3. ~~**Bỏ SidebarNav** — desktop chỉ còn topbar theo mock~~ **bổ sung 2026-10-04 phiên 2: SidebarNav trở lại theo mock app-shell.html (256px fixed + drawer mobile) — xem section 4b**.
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

## 4. Shell (bổ sung 2026-10-04 phiên 2 — theo `opendesign_hsk/app-shell.html`)

> **Ghi đè section 4 cũ** (topbar theo index.html + bỏ sidebar). Quyết định user: app-shell.html thay thế thiết kế shell trong plan; search/port 100% command palette + level popover. Home content vẫn theo index.html (section 5).

### 4.0 Quyết định 3 mâu thuẫn mock ↔ app

| Mâu thuẫn | Quyết định | Lý do |
|---|---|---|
| Token mới của mock (`--body/--faint/--accent-soft/--side`, `--fg` stone `#1C1917`) | **Map về hệ token hiện có**, không thêm scheme: `--body`/`--faint` → `--text-secondary`; `--accent-soft` → `bg-action-primary/10`; `--side` → `bg-surface-elevated/95 + backdrop-blur`; **giữ `--hz-ink` `#1f2a27`** và amber dark `#dcaa37` | Tránh scheme token thứ 3; không đổi màu brand neutrals vì 1 mock |
| Content width 1080px (mock) | **Giữ `max-w-5xl` (1024px)** | Trùng home mock cũ + plan hiện tại |
| Breakpoint gập sidebar 1024px (mock) vs 760px (index.html) | **Theo mock: `lg` (1024px)** | Desktop-sidebar và mobile-bottom-nav không đụng nhau |

### 4.1 Root `layout.tsx`

`<SidebarNav />` fixed 256px (lg) / off-canvas drawer (<lg) + `<div className="flex min-h-screen flex-col lg:ml-64">` chứa `<Topbar />` + `<main>`; `BottomNav`/`SettingsModal`/`LoginModal`/`AiWidget` giữ nguyên vị trí mount. Drawer mở qua event `nhai:open-nav` (hamburger + bottom-nav "More"), đóng bằng scrim click/Escape/navigate.

### 4.2 `SidebarNav` viết lại (`components/shell/sidebar-nav.tsx`)

- Desktop: fixed w-64, `bg-surface-elevated/95 backdrop-blur-xl border-r`; mobile: `translateX(-102%)` + `.open` transition 280ms + scrim `bg-black/50`.
- Brand: tile 40px + glyph **奈** + "Nhai / HSK LEARNING" (brand của app; mock dùng 汉 — lệch có chủ đích).
- 3 nhóm đúng mock: **Học tập cốt lõi** (Trang chủ `/`, Lộ trình HSK `/roadmap`, Ôn tập SRS `/review` + badge số `srsDue`), **Kỹ năng & Luyện tập** (Hanzi Studio `/hanzi`, Luyện nói & Đọc `/shadowing`, Bảng âm Pinyin `/pinyin`), **Cá nhân & Công cụ** (Sổ tay từ vựng `/my-vocab`, Thống kê tiến độ `/progress`, Tạo tập viết in `/create-file`). Nút demo của mock → Link route thật.
- Active: `bg-action-primary/10 text-action-primary font-semibold` + rail trái 3px vermilion; `aria-current="page"` (pattern a11y của app, mock dùng class `.active` thuần — không theo).
- Footer: user-card **session-driven** — logged in: avatar jade + tên + "HSK 2"; logged out: nút "Đăng nhập" → `openLogin()`. Gear settings → event `nhai:open-settings`.

### 4.3 `Topbar` v2 (`components/shell/topbar.tsx`)

Sticky h-16, `bg-surface-elevated/80 backdrop-blur-xl`. Thứ tự: **hamburger** (`lg:hidden`, → `nhai:open-nav`) → **breadcrumb** 2 dòng (map `usePathname()` → tiêu đề; dòng 2 ngày vi-VN, ẩn <lg) → **`SearchTrigger`** (nút 288px `max-w-[38vw]`, mobile flex-1; mở CommandPalette) → **`LevelPopover`** (pill dot jade + "Mục tiêu: HSK 2 ▾", popover `role=menu` + `menuitemradio aria-checked`, lưu `nhai.goal`) → **`StreakPill` mini** ("12 ngày", unit ẩn <lg) → **theme button**. **Bỏ brand + avatar** (chuyển vào sidebar).

### 4.4 Primitives/tính năng mới

- **`command-palette.tsx`** (`components/shell/`): modal ⌘K — overlay + panel `w-[min(560px,92vw)]`, input autofocus, danh sách = route index tĩnh (~10 mục) + tiêu đề bài học từ `content/vocab` (defensive), substring match max 8, empty state "Không tìm thấy kết quả.", Enter/click → `router.push`, Escape đóng. ⌘K listener ở Topbar.
- **`level-popover.tsx`** (`components/ui/`): popover absolute dưới nút, đóng click-outside/Escape/chọn.
- `SearchField` (Task 8 của plan) **thành optional** — Topbar không dùng nữa; chỉ làm nếu nơi khác cần input inline.
- `StreakPill` mini thêm prop `unit` ("ngày").

### 4.5 `BottomNav`

Item theo mock: Home `/`, Roadmap `/roadmap`, Review `/review` (+ badge SRS), Hanzi `/hanzi`, **More** (3 chấm → `nhai:open-nav`). `lg:hidden`. Giữ `aria-current="page"`.

## 5. Home (`app-next/src/components/home/` + `app/(app)/page.tsx`)

Layout: `.page` max-w-1024, padding 16/24/48, gap 16; <640px padding 16/16/110 (chừa bottom nav).

| Component | Loại | Nội dung |
|---|---|---|
| `glance-greeting.tsx` | client island | H1 "早上好, chào bạn!" (chào theo giờ VN) + ngày vi-VN; metrics: `StreakPill full` + goal-ring 44px (`DonutRing` size 44, màu jade, XP hôm nay / `DAILY_GOAL_XP`) — dữ liệu qua `useHomeSummary()` |
| `hero-action.tsx` | client | Card chính: watermark glyph 210px opacity .055; state badge (pulse jade/amber); tiêu đề bài + hanzi; sub tiến độ; `Progress` gradient; CTA primary (48px) + ghost dạng Link; `SegmentedTabs` Lesson/SRS. Hai state đọc từ `useHomeSummary()` (lesson kế tiếp, `srsDue`, `recallPct`); SRS mode đổi pulse sang amber. CTA primary → `/lesson/...` hoặc `/review`; không có lesson → fallback mời `/course` |
| `habit-loop.tsx` | server + client con | Section head + 3 card: (1) Bài học mới 新课 — status `doing`, `IconTile` vermilion, step-mini progress + link "Xem tóm tắt bài →"; (2) Ôn tập SRS 复习 — `todo`, số từ đến hạn, tỉ lệ nhớ, `habit-btn` → `/review`; (3) Phản xạ âm thanh 跟读 — `idle`, → `/shadowing`. Card 1 đồng bộ dữ liệu với hero |
| `progress-matrix.tsx` | server | Grid 1.05fr/.95fr (<860px 1 cột). Card "Lộ trình HSK 2": `DonutRing` 96px (từ đã nhớ/total, màu accent) + mastery-nums + 3 `.mrow` + `link-arrow` → `/roadmap`. Card "Công cụ bổ trợ nhanh": 4 nút (Hanzi Studio → `/hanzi`, Pinyin → `/pinyin`, Sổ tay → `/my-vocab`, Đọc hiểu → `/reading`) |
| Thay `continue-card.tsx` | — | Hero mới thay thế ContinueCard; xoá component + tests cũ |

`page.tsx` giữ làm server component compose; chỉ `glance-greeting`/`hero-action`/`habit-loop`/`progress-matrix` là client islands (tất cả đọc `useHomeSummary()`). Footer giữ link nhóm Facebook của trang chủ cũ. Layout `(app)/layout.tsx`: `max-w-5xl px-4 py-6 pb-28 md:pb-6`.

## 6. Accessibility & a11y contract

Giữ mọi contract của mock: `role="progressbar"` + `aria-valuenow/min/max`; `aria-pressed` cho tabs; `aria-current="page"` cho nav (mock dùng class `.active` thuần — app dùng `aria-current` là đúng); `aria-live="polite"` cho toast/sr-only; donut có `role="img"` + `aria-label`; min touch 44px; focus-visible ring vermilion; không mã hoá ý nghĩa chỉ bằng màu (status chip luôn có chữ). Thêm cho shell v2: command palette `role="dialog" aria-modal="true"` + Escape đóng; level popover `role="menu"` / `role="menuitemradio" aria-checked`; drawer có `aria-label="Điều hướng chính"` + Escape/scrim đóng; breadcrumb `<nav aria-label="Breadcrumb">`.

## 7. Testing

- **Vitest** (colocated `__tests__/`): `SegmentedTabs`, `DonutRing` (dashoffset math + aria-label), `Chip` tones mới, `StreakPill` variants + unit, `CommandPalette` (mở ⌘K, filter, Enter navigate, Escape), `LevelPopover` (chọn lưu `nhai.goal`, `aria-checked`), `SidebarNav` (3 nhóm, active theo pathname, user-card logged in/out), `Topbar` (breadcrumb, hamburger dispatch event), `BottomNav` (5 item + More). `SearchField` chỉ test nếu primitive còn được dùng.
- **Playwright** (`e2e/`): cập nhật spec theo DOM mới — home sections, hero tabs, drawer mở/đóng ở viewport < lg, breadcrumb đổi theo route.
- **Kiểm chứng thủ công:** dev server port 3100, soi light/dark ở 3 viewport (420 / 1024 / 1280) trước khi báo hoàn tất.

## 8. Rủi ro & xử lý

| Rủi ro | Xử lý |
|---|---|
| Đổi token làm lệch màu toàn app ngoài Home | Đúng chủ đích (mục tiêu #1); quét một lượt chỗ hard-code cũ, soi các màn chính sau khi đổi |
| Breadcrumb cần nhãn tiêu đề cho ~25 route | Bảng cứng route → nhãn trong `shell/breadcrumb.ts`, fallback = segment cuối viết hoa; route mới chưa có nhãn vẫn render (fallback) |
| Command palette quá nhiều nguồn dữ liệu | Index chỉ gồm route tĩnh + `content/vocab`; không query DB, không debounce phức tạp |
| Mobile có cả drawer lẫn bottom-nav | Đúng mock: nút "More" là lối vào duy nhất cho full item list; scrim + Escape đóng |
| Mock dùng `color-mix()`/`@media(max-width)` thuần | Tailwind v4 hỗ trợ cả hai; `color-mix` viết bằng CSS var trong class Tailwind arbitrary value |

## 9. Tài liệu phải cập nhật cùng lúc

1. `opendesign_hsk/Hanzi/DESIGN.md` — primary Vermilion, jade phụ, radius 8/16, nền mới, bảng dark; thêm mô tả shell (sidebar 256px + topbar 64px + breadcrumb).
2. `.zcode/skills/hanzi-design-system/SKILL.md` — đồng bộ với DESIGN.md.
3. `app-next/AGENTS.md` — đoạn "7 fixed core colors" + mô tả shell nếu có.
