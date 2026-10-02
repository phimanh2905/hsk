# Hanzi Restyle — 100% design-system compliance cho app-next

- Ngày: 2026-10-02
- Status: Approved (brainstorming 2026-10-02)
- Nguồn chân lý: `opendesign_hsk/Hanzi/DESIGN.md` + kit trong `opendesign_hsk/Hanzi/system/`
- Approach chốt: **B — Rebuild primitives** (bộ UI primitives mới, mọi component refactor qua đó)

## 1. Bối cảnh

Audit ngày 2026-10-02 cho thấy app-next (Tailwind v4 CSS-first, ~110 file TSX) đang dùng theme
neo-brutalist "Nhai" sai design system ở mọi trụ:

- Primary đỏ `#c23b22`, phụ gold `#f5b301` / xanh `#2563eb`, nền kem `#fdf9f3` — DESIGN.md yêu cầu
  7 màu gốc, jade `#0f766e` làm primary, vermilion `#d24b3f` chỉ cho lỗi/milestone/exam.
- Border 2px + shadow cứng offset (`shadow-neo` × 46 file) — yêu cầu 1px border,
  borders-before-shadows, shadow chỉ cho dialog/floating.
- Radius 8px — yêu cầu 14px card / 10px controls.
- Font system-ui, không load webfont — yêu cầu Be Vietnam Pro (Latin) + Noto Sans SC (hanzi).
- Icon: **0 icon library** — 61 emoji-icon trong ~25 file + 1 inline SVG (`stats/donut.tsx`);
  **9 file test assert trên emoji**.
- ~37 hex hard-code trong TSX + ~48 class màu Tailwind thô (`text-red-500`…).
- Dark mode đã có (`html.dark` + localStorage `nhai.theme`) — **giữ nguyên**, map sang dark tokens
  của Hanzi (`system/tokens.dark.json`, `variables.dark.css`).

Non-goals: không đổi hành vi/route/business logic, không đổi copy tiếng Việt, không đụng print/A4
flow của create-file (chỉ đổi da), không đổi key localStorage hiện có. **Exam-mode posture của
DESIGN.md (timer + counter + ẩn feedback tới hết giờ) là feature mới — nằm ngoài scope restyle,
ghi trong follow-up sau cụm 5.**

## 2. Kiến trúc token (3 lớp, trong `src/app/globals.css`)

### Lớp 1 — Primitives (7 màu gốc, light + dark)

| Token | Light | Nguồn |
|---|---|---|
| paper | `#fafbfa` | DESIGN.md |
| elevated | `#ffffff` | DESIGN.md |
| ink | `#1f2a27` | DESIGN.md |
| slate | `#66756f` | DESIGN.md |
| line | `#e8ecea` | DESIGN.md |
| jade | `#0f766e` | DESIGN.md |
| vermilion | `#d24b3f` (small error text: `#A9342B`) | DESIGN.md |
| amber (streak) | từ `variables.css` của kit | system kit |
| purple (AI) | từ `variables.css` của kit | system kit |

Dark: map từ `system/tokens.dark.json` / `variables.dark.css` (colorPrimary `#237269`,
colorError `#dc6966`, colorWarning `#dcaa37`, colorSuccess `#64b537`, …) dưới `html.dark`.

### Lớp 2 — Semantic tokens (đúng 7 nhóm DESIGN.md)

- `surface`: paper / elevated
- `text`: primary / secondary
- `border`: subtle / default / strong
- `action`: primary + hover/active/focus, danger
- `feedback`: success / warning / error (+ bg variants)
- `learning`: new / learning / familiar / mastered / due + streak (amber)
- `feature`: ai (purple)

### Lớp 3 — `@theme inline` mapping

Class Tailwind semantic: `bg-surface-paper`, `bg-surface-elevated`, `text-text-primary`,
`text-text-secondary`, `border-border-default`, `ring-action-focus`, `text-feedback-error`, …

**Quy tắc cứng:** component không được chứa hex, `rgb()`, hay class palette Tailwind thô
(`text-red-500`…). Kiểm bằng grep trong cleanup (cụm 5).

### Typography

- `next/font/google`: **Be Vietnam Pro** (Latin UI, weights 400/500/600/700, biến `--font-be-vietnam-pro`)
  + **Noto Sans SC** (hanzi, biến `--font-noto-sans-sc`), fallback PingFang SC.
  Lưu ý: DESIGN.md ghi Inter — Be Vietnam Pro là **override của owner (2026-10-02)**; người thực
  thi không được đổi ngược về Inter. DESIGN.md sẽ được owner cập nhật sau.
- `.zh` / `[lang="zh"]` dùng Noto Sans SC — không bao giờ render hanzi bằng Be Vietnam Pro.
- Thang chữ learning: hanzi hero 32–64px, pinyin 14–18px, translation 14–16px.

### Hình dạng

- Radius: card 14px, controls/input/button 10px (token `--radius-card` / `--radius-control`).
- Border 1px; shadow chỉ `xs`/`md` cho dialog + floating card; focus ring jade 3px, offset 2px.
- Touch target ≥44px, answer choice ≥52px; loading button giữ nguyên width.
- Spacing: lưới 4px (Tailwind default `p-*`/`gap-*` thỏa sẵn — cấm giá trị lẻ kiểu `p-[7px]`).
- **State matrix đầy đủ** cho Button/Input/Chip/answer choice: default / hover / focus (jade ring) /
  selected / correct (feedback-success) / error (feedback-error) / disabled — mỗi state có màu
  nền + border + text xác định, không mã hóa nghĩa bằng màu một mình.
- **Nav posture (DESIGN.md):** desktop giữ persistent sidebar; mobile thêm **bottom nav 5 mục**
  (Trang chủ / Học / Ôn tập / Đọc / Hồ sơ). Các destination còn lại (Shadowing, Bài khoá,
  Luyện thi, bộ thủ, pinyin…) vẫn truy cập được qua drawer mở từ ☰ ở topbar — không bỏ tính năng.

## 3. Bộ primitives — `src/components/ui/`

| File | Spec |
|---|---|
| `button.tsx` | variant primary (jade solid) / secondary / danger (vermilion) / ghost; height ≥44px; radius 10px; loading state giữ width |
| `icon-button.tsx` | icon-only, ≥44px, cho topbar/nav |
| `card.tsx` | radius 14px, padding 24px, border 1px Line; optional shadow xs/md |
| `input.tsx`, `textarea.tsx`, `select.tsx` | radius 10px, height 44px, focus ring jade |
| `chip.tsx` | filter + state label; luôn icon + màu + label (không mã hóa nghĩa bằng màu một mình) |
| `dialog.tsx` | backdrop + shadow md; thay `.modal-backdrop` |
| `progress.tsx` | bar luôn kèm số |
| `icon.tsx` | re-export duy nhất của `lucide-react`; strokeWidth 1.5; không file nào import lucide trực tiếp |

Mỗi primitive có test riêng trong `src/components/ui/__tests__/`.

## 4. Map emoji → Lucide

`🏠→Home, 📚→GraduationCap, 📖→BookOpen, 🎧→Headphones, 📝→FileText, ☰→Menu, ⚙️→Settings,
🔥→Flame (amber token), 🔊→Volume2, ⭐→Star, ✅→CheckCircle2, ❌→XCircle, 🤖→Bot (purple token),
🔔→Bell`. Map đầy đủ sẽ chốt trong implementation plan khi rà từng file. Emoji trang trí trong
chuỗi copy → bỏ, không thay bằng icon. Inline SVG: `stats/donut.tsx` giữ nguyên (là chart,
không phải icon) nhưng đổi sang semantic tokens; mọi inline SVG khác tìm thấy trong quá trình
migrate phải được phân loại *chart* (giữ, đổi token) hoặc *icon* (thay bằng Lucide) — không được
bỏ qua.

## 5. Thứ tự migrate — 5 cụm, mỗi cụm 1 commit trên nhánh `hanzi-design-system`

Sau mỗi cụm: `pnpm typecheck && pnpm lint && pnpm test`.

1. **Foundation** — rewrite `globals.css` (3 lớp token + dark), `next/font` (Be Vietnam Pro +
   Noto Sans SC), cài `lucide-react`, dựng đủ `src/components/ui/` + test. Cũ/mới song song,
   chưa xóa gì.
2. **Shell + khung app** — `sidebar-nav`, `topbar`, `login-modal`, `settings-modal`,
   `toast-provider`, `notification-bell`, `ai-widget`, `personal/login-gate`, root `layout.tsx`,
   `(app)/layout.tsx`, `not-found`. Nhiều emoji nhất → `IconButton` + Lucide, sửa test liên quan
   cùng commit. Thêm `bottom-nav.tsx` (mobile, 5 mục theo DESIGN.md: Trang chủ/Học/Ôn tập/Đọc/
   Hồ sơ, ≥44px/mục, active = jade); drawer đầy đủ giữ nguyên, nút mở chuyển từ nút floating
   (`sidebar-nav.tsx:146`) vào ☰ của topbar.
3. **Learning core** — `home/continue-card`, `(app)/page.tsx` (trang chủ),
   `lesson-client` + `lesson-provider` + `word-list` + 7 modes (battle/dance/flashcard/listen/
   quiz/reading/typing), `review` (+`review-dashboard`), `reading` (kèm `karaoke.tsx`),
   `roadmap` (4 components + 3 pages), `progress` (+`progress-client`), `stats` ×3.
   Áp posture: max-width lesson 760 / reading 820 / dashboard 1200; một primary action mỗi màn
   học; SRS dùng `Chip` Again/Hard/Good/Easy (phím 1–4); streak màu amber riêng, không vermilion.
   Watermark `vietnam-map.svg` trong lesson: giữ nguyên (brand imagery, opacity 0.08, không phải
   icon) — quyết định sản phẩm riêng, không thuộc scope restyle.
4. **Tools & reference** — hanzi (draw-modal/draw-pad/stroke-player/hanzi-detail/hanzi-home/
   search-card + các `page.tsx` của area này), pinyin (matrix/practice/tone-dialog + pages),
   radicals ×3, sound-rules (quiz-client/speak-text + page), dictionary, notebook (list + detail),
   my-vocab/my-grammar, course ×2, shadowing ×7, create-file ×6 (giữ print), certificate-test ×2,
   static-legal, leaderboard, feedback, delete-account. Mọi `page.tsx` của các area nêu trên
   thuộc cụm của area đó. Ngoại lệ có chủ đích trong area create-file:
   `src/lib/create-file/svg-render.ts` (renderer chuỗi HTML cho giấy A4 in — print artifact,
   không phải in-app UI, giữ nguyên theo non-goals) và `favicon.ico`.
5. **Cleanup + completeness gate** — (a) grep về 0 trên **toàn bộ** `src/`: hex hard-code,
   class palette thô (`text-red-500`…), emoji-icon (dải Unicode emoji trong `className`/JSX icon
   position), `shadow-neo`/`btn-main`/`btn-ghost`/`pill`/`.card`/`grid-cell`/`modal-backdrop` cũ
   → xóa khỏi `globals.css` khi về 0 tham chiếu. (b) **Đối chiếu danh sách file**: sinh danh sách đầy
   đủ mọi file `.tsx` (app + components) bằng `find`, mỗi file phải nằm trong một trong ba trạng
   thái: *đã migrate* / *không có UI* (api, sitemap, robots, types, test helper) / *có chủ đích*
   (inline SVG chart như `donut.tsx`) — file nào không xếp được vào 3 trạng thái là cụm chưa xong.
   (c) Full `vitest + e2e Playwright`; đối chiếu thị giác với `system/kit.html`.

## 6. Chiến lược test

- 9 file test assert emoji (`hanzi-detail`, `reading-client`, `dictionary-client`,
  `review-dashboard`, `course-client`, `dictation-panel`, `ai-widget`, `custom-deck-modes`,
  `word-list`) → đổi query sang role/accessible-name, sửa cùng commit với area tương ứng.
- e2e Playwright chỉ chạy lại ở cụm 5 (tránh đốt thời gian mỗi cụm).
- Chỉ báo hoàn thành: grep 0 violation + toàn bộ test xanh + mỗi màn đối chiếu được với kit.

## 7. Rủi ro

- Be Vietnam Pro + Noto Sans SC qua `next/font/google` cần network lúc build (OpenNext/Cloudflare
  build đã có network; font được self-host vào bundle).
- Dark tokens của kit dùng biến Ant-Design-style (`colorPrimary`…) — cần map tay sang semantic
  layer, lấy giá trị từ `variables.dark.css` chứ không đoán.
- Cụm 3 là lớn nhất (≈20 file) — tách 2 commit con nếu cần.
