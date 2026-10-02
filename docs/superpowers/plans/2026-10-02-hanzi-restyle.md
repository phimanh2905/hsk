# Hanzi Restyle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle 100% UI của `app-next/` theo design system Hanzi (DESIGN.md), chỉ dùng Lucide icons, qua bộ primitives mới trong `src/components/ui/`.

**Architecture:** 3-lớp token (primitives → semantic → `@theme inline`) trong `globals.css`; bộ 8 primitives mới; mọi component cũ refactor qua primitives + Lucide; dark mode map từ `system/variables.dark.css`. Cụm 5 là completeness gate (grep về 0 + đối chiếu 100% file).

**Tech Stack:** Next.js 16 (App Router), Tailwind v4 CSS-first, `next/font/google` (Be Vietnam Pro + Noto Sans SC), `lucide-react`, vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-02-hanzi-restyle-design.md` (đọc cùng plan này).

## Global Constraints

- 7 màu gốc light: Paper `#fafbfa`, Elevated `#ffffff`, Ink `#1f2a27`, Slate `#66756f`, Line `#e8ecea`, Jade `#0f766e`, Vermilion `#d24b3f` (small error text `#A9342B`).
- Streak = amber `#faad14`; AI = purple `#722ed1`. Vermilion KHÔNG dùng cho streak.
- Dark: page `#1d1d1d`, card `#141414`, text `#dcdcdc`/`#adadad`, border `#303030`/`#3e3e3e`, primary `#237269` (+hover `#3c8378`, active `#205c55`), error `#dc6966`, warning `#dcaa37`, success `#64b537` — nguồn `system/variables.dark.css`, không tự chế.
- Font: Be Vietnam Pro (override của owner, KHÔNG đổi về Inter) + Noto Sans SC cho `.zh`/`[lang="zh"]`.
- Radius: card 14px, control 10px. Border 1px. Shadow chỉ `xs`/`md` cho dialog/floating. Focus ring: jade 3px, offset 2px.
- Touch target ≥44px; answer choice ≥52px; loading button giữ width. Spacing lưới 4px (cấm `p-[7px]` kiểu lẻ).
- Cấm trong components: hex, `rgb()`, class palette Tailwind thô (`text-red-500`…), emoji-icon, import `lucide-react` trực tiếp (phải qua `@/components/ui/icon`).
- Giữ nguyên: copy tiếng Việt, routes, business logic, key localStorage (`nhai.theme`…), hành vi print/A4, watermark `vietnam-map.svg`, `svg-render.ts`.
- Thẻ dữ liệu (hanzi/pinyin/translation): hanzi 32–64px, pinyin 14–18px, translation 14–16px.
- Verify sau mỗi task: `pnpm --dir app-next typecheck && pnpm --dir app-next lint && pnpm --dir app-next test`.

---

### Task 1: Foundation — token layer + fonts + lucide

**Files:**
- Modify: `app-next/src/app/globals.css` (rewrite toàn bộ)
- Modify: `app-next/src/app/layout.tsx` (thêm font)
- Modify: `app-next/package.json` (thêm `lucide-react`)

**Interfaces (Produces):**
- CSS vars semantic: `--surface-paper`, `--surface-elevated`, `--text-primary`, `--text-secondary`, `--border-subtle`, `--border-default`, `--border-strong`, `--action-primary`, `--action-primary-hover`, `--action-primary-active`, `--action-focus`, `--action-danger`, `--action-danger-active`, `--feedback-success`, `--feedback-warning`, `--feedback-error`, `--feedback-error-text`, `--learning-streak`, `--learning-new`, `--learning-progress`, `--learning-mastered`, `--learning-due`, `--feature-ai`
- Tailwind classes tương ứng: `bg-surface-paper`, `bg-surface-elevated`, `text-text-primary`, `text-text-secondary`, `border-border-default`, `ring-action-focus`, `text-feedback-error`, `text-learning-streak`, `text-feature-ai`, …
- Radius tokens: `--radius-card` (14px), `--radius-control` (10px). Shadow tokens: `--shadow-xs`, `--shadow-md`.
- Font vars: `--font-be-vietnam-pro`, `--font-noto-sans-sc` (từ next/font).
- Giữ lại tạm (legacy, xóa ở Task 9): `.btn-main`, `.btn-ghost`, `.pill`, `.pill-active`, `.grid-cell`, `.shadow-neo`, `.toast`, `.modal-backdrop`, `.zh`, `.card`, `.paper-grid`, `.shake`, `@media print`, `.zh-faded`, `.no-print`/`[data-shell]`.

- [ ] **Step 1: Cài lucide-react**

```bash
cd app-next && pnpm add lucide-react
```

- [ ] **Step 2: Rewrite `globals.css`** — đầu file:

```css
@import "tailwindcss";

/* Hanzi design system — 3 lớp token (spec 2026-10-02). Nguồn dark: system/variables.dark.css */
:root {
  /* lớp 1 — primitives */
  --hz-paper: #fafbfa;   --hz-elevated: #ffffff;
  --hz-ink: #1f2a27;     --hz-slate: #66756f;
  --hz-line: #e8ecea;    --hz-jade: #0f766e;
  --hz-vermilion: #d24b3f; --hz-vermilion-700: #a9342b;
  --hz-amber: #faad14;   --hz-purple: #722ed1;
  /* lớp 2 — semantic */
  --surface-paper: var(--hz-paper);
  --surface-elevated: var(--hz-elevated);
  --text-primary: var(--hz-ink);
  --text-secondary: var(--hz-slate);
  --border-subtle: #edeeed;
  --border-default: var(--hz-line);
  --border-strong: #d9dcda;
  --action-primary: var(--hz-jade);
  --action-primary-hover: #0d635b;
  --action-primary-active: #0a524b;
  --action-focus: var(--hz-jade);
  --action-danger: var(--hz-vermilion);
  --action-danger-active: var(--hz-vermilion-700);
  --feedback-success: #52c41a;
  --feedback-warning: var(--hz-amber);
  --feedback-error: var(--hz-vermilion);
  --feedback-error-text: var(--hz-vermilion-700);
  --learning-streak: var(--hz-amber);
  --learning-new: var(--hz-slate);
  --learning-progress: var(--hz-amber);
  --learning-mastered: var(--hz-jade);
  --learning-due: var(--hz-vermilion);
  --feature-ai: var(--hz-purple);
  --radius-card: 14px;
  --radius-control: 10px;
  --shadow-xs: 0 1px 2px rgba(31, 42, 39, .06);
  --shadow-md: 0 6px 24px rgba(31, 42, 39, .14);
}
html.dark {
  --hz-paper: #1d1d1d;   --hz-elevated: #141414;
  --hz-ink: #dcdcdc;     --hz-slate: #adadad;
  --hz-line: #3e3e3e;
  --surface-paper: var(--hz-paper);
  --surface-elevated: var(--hz-elevated);
  --text-primary: #dcdcdc;
  --text-secondary: #adadad;
  --border-subtle: #303030;
  --border-default: #3e3e3e;
  --border-strong: #4f4f4f;
  --action-primary: #237269;
  --action-primary-hover: #3c8378;
  --action-primary-active: #205c55;
  --action-focus: #237269;
  --action-danger: #dc6966;
  --action-danger-active: #ad5553;
  --feedback-success: #64b537;
  --feedback-warning: #dcaa37;
  --feedback-error: #dc6966;
  --feedback-error-text: #dc6966;
  --learning-new: #adadad;
  --learning-mastered: #237269;
  --learning-due: #dc6966;
  --feature-ai: #9254de;
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, .4);
  --shadow-md: 0 6px 24px rgba(0, 0, 0, .5);
}
@theme inline {
  --color-surface-paper: var(--surface-paper);
  --color-surface-elevated: var(--surface-elevated);
  --color-text-primary: var(--text-primary);
  --color-text-secondary: var(--text-secondary);
  --color-border-subtle: var(--border-subtle);
  --color-border-default: var(--border-default);
  --color-border-strong: var(--border-strong);
  --color-action-primary: var(--action-primary);
  --color-action-primary-hover: var(--action-primary-hover);
  --color-action-primary-active: var(--action-primary-active);
  --color-action-focus: var(--action-focus);
  --color-action-danger: var(--action-danger);
  --color-action-danger-active: var(--action-danger-active);
  --color-feedback-success: var(--feedback-success);
  --color-feedback-warning: var(--feedback-warning);
  --color-feedback-error: var(--feedback-error);
  --color-feedback-error-text: var(--feedback-error-text);
  --color-learning-streak: var(--learning-streak);
  --color-learning-new: var(--learning-new);
  --color-learning-progress: var(--learning-progress);
  --color-learning-mastered: var(--learning-mastered);
  --color-learning-due: var(--learning-due);
  --color-feature-ai: var(--feature-ai);
  --radius-card: var(--radius-card);
  --radius-control: var(--radius-control);
  --shadow-xs: var(--shadow-xs);
  --shadow-md: var(--shadow-md);
  --font-sans: var(--font-be-vietnam-pro), system-ui, -apple-system, "Segoe UI", sans-serif;
}
body {
  background: var(--surface-paper);
  color: var(--text-primary);
  font-family: var(--font-be-vietnam-pro), system-ui, -apple-system, "Segoe UI", sans-serif;
}
.zh, [lang="zh"] { font-family: var(--font-noto-sans-sc), "PingFang SC", "Hiragino Sans GB", sans-serif; }
```

Giữ nguyên các block legacy hiện có phía sau (`.card`, `.btn-main`, …) — Task 9 xóa.
Đổi giá trị legacy var references cũ (`--nhai-*`) giữ nguyên vì chưa xóa; token mới song song.

- [ ] **Step 3: Font trong `layout.tsx`**

```tsx
import { Be_Vietnam_Pro, Noto_Sans_SC } from "next/font/google";

const beVietnamPro = Be_Vietnam_Pro({
  subsets: ["latin", "vietnamese"], weight: ["400", "500", "600", "700"],
  variable: "--font-be-vietnam-pro", display: "swap",
});
const notoSansSC = Noto_Sans_SC({
  subsets: ["latin"], weight: ["400", "500", "700"],
  variable: "--font-noto-sans-sc", display: "swap",
});
// <html className={`${beVietnamPro.variable} ${notoSansSC.variable}`} lang="vi" suppressHydrationWarning>
```

- [ ] **Step 4: Verify** — `pnpm --dir app-next typecheck && pnpm --dir app-next test`
  Expected: PASS (app vẫn chạy trên legacy classes; token mới chưa có consumer).

- [ ] **Step 5: Commit** — `git add -A app-next && git commit -m "feat(ui): hanzi token layer + Be Vietnam Pro/Noto Sans SC + lucide-react"`

### Task 2: UI primitives `src/components/ui/`

**Files (Create + test tương ứng trong `__tests__/`):** `icon.tsx`, `button.tsx`, `icon-button.tsx`, `card.tsx`, `input.tsx`, `textarea.tsx`, `select.tsx`, `chip.tsx`, `dialog.tsx`, `progress.tsx`, `cn.ts` (helper `src/lib/cn.ts`).

**Interfaces (Produces):**
```ts
// src/lib/cn.ts — export function cn(...parts: Array<string | false | null | undefined>): string
// icon.tsx — export * from "lucide-react" (điểm import duy nhất, strokeWidth mặc định 1.5)
// button.tsx — <Button variant?: "primary"|"secondary"|"danger"|"ghost"; size?: "sm"|"md"; loading?: boolean; type?: "button"|"submit"; } & ButtonHTMLAttributes>
// icon-button.tsx — <IconButton label: string; variant?: "ghost"|"solid">  (label → aria-label bắt buộc)
// card.tsx — <Card shadow?: "none"|"xs"|"md"; className?, children>
// input.tsx / textarea.tsx / select.tsx — props chuẩn + className merge
// chip.tsx — <Chip selected?: boolean; tone?: "neutral"|"correct"|"error"|"streak"|"ai"; icon?: ReactNode; onClick?>
// dialog.tsx — <Dialog open: boolean; onClose: () => void; labelledBy: string> (backdrop click + Escape đóng)
// progress.tsx — <Progress value: number; max?: number; label: string>  (bar + số % hiển thị — luôn kèm số)
```

- [ ] **Step 1: `src/lib/cn.ts`**

```ts
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
```

- [ ] **Step 2: `icon.tsx`**

```tsx
// Điểm import icon duy nhất của app — cấm import lucide-react trực tiếp ở nơi khác
export * from "lucide-react";
export const ICON_STROKE = 1.5;
```
Quy ước: consumer `<Home size={20} strokeWidth={1.5} />`; strokeWidth 1.5 theo imagery guide.

- [ ] **Step 3: Viết test failing cho Button** (`src/components/ui/__tests__/button.test.tsx`):

```tsx
import { render, screen } from "@testing-library/react";
import { Button } from "../button";

it("primary: nền jade, height tối thiểu 44", () => {
  render(<Button variant="primary">Lưu</Button>);
  const b = screen.getByRole("button", { name: "Lưu" });
  expect(b.className).toContain("bg-action-primary");
  expect(b.className).toContain("min-h-11"); // 44px
});
it("loading: giữ width (min-w theo nhãn) và disable", () => {
  render(<Button loading>Đang lưu</Button>);
  expect(screen.getByRole("button")).toBeDisabled();
  expect(screen.getByRole("button").className).toContain("min-w-28");
});
```

- [ ] **Step 4: Chạy test → FAIL** (`pnpm --dir app-next test -- button`)
- [ ] **Step 5: `button.tsx`**

```tsx
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const styles = {
  primary: "bg-action-primary text-white hover:bg-action-primary-hover active:bg-action-primary-active border-transparent",
  secondary: "bg-surface-elevated text-text-primary border-border-default hover:border-action-primary hover:text-action-primary",
  danger: "bg-action-danger text-white hover:opacity-90 border-transparent",
  ghost: "bg-transparent text-text-secondary border-transparent hover:text-action-primary",
} as const;

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof styles; size?: "sm" | "md"; loading?: boolean;
}>(function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...rest }, ref) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-control border font-semibold min-h-11",
        size === "sm" ? "px-3 text-sm min-h-9" : "px-5",
        "focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2",
        "disabled:opacity-50 disabled:pointer-events-none",
        styles[variant], className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
```
(`rounded-control` hoạt động nhờ `--radius-control` trong `@theme`.)

- [ ] **Step 6: Test PASS** → tương tự viết test + code cho `IconButton` (min 44px, `aria-label` bắt buộc), `Card` (`rounded-card border border-border-default p-6`, shadow optional), `Input`/`Textarea`/`Select` (`min-h-11 rounded-control border-border-default focus ring-action-focus`), `Chip` (states matrix: selected→`bg-action-primary text-white`, correct→`text-feedback-success`, error→`text-feedback-error`, streak→`text-learning-streak`, ai→`text-feature-ai`; luôn `inline-flex items-center gap-1.5 min-h-11`), `Dialog` (backdrop `bg-black/40`, panel `bg-surface-elevated rounded-card shadow-md`, Escape + backdrop click đóng), `Progress` (track `bg-border-subtle rounded-full`, fill `bg-action-primary`, `%` hiện cạnh label).
- [ ] **Step 7: Verify** — `pnpm --dir app-next typecheck && pnpm --dir app-next test`
- [ ] **Step 8: Commit** — `git commit -am "feat(ui): hanzi primitives (button/icon-button/card/input/chip/dialog/progress)"`

### Task 3: Shell + khung app (12 file + bottom nav mới)

**Files:** Modify `src/components/shell/{sidebar-nav,topbar,login-modal,settings-modal,toast-provider}.tsx`, `src/components/social/{ai-widget,notification-bell}.tsx`, `src/components/personal/login-gate.tsx`, `src/app/{layout.tsx,not-found.tsx}`, `src/app/(app)/layout.tsx` — Create `src/components/shell/bottom-nav.tsx`.

**Icon map (dùng cho mọi task):** 🏠`Home` 📚`GraduationCap` 📖`BookOpen` 🎧`Headphones` 📝`FileText` ☰`Menu` ⚙️`Settings` 🔥`Flame` 🔊`Volume2` 🔇`VolumeX` ⭐`Star` ✅`CircleCheck` ❌`CircleX` 🤖`Bot` 🔔`Bell` 👤`User` ◀▶`ChevronLeft/Right` ×`X` ↻`RotateCcw` ✏️`Pencil` 🗑️`Trash2` 🀄`Bot`→`Grid2x2` (bộ thủ `Component`) 💡`Lightbulb` 🎯`Target` 🏆`Trophy` 💎`Gem` ⚡`Zap` ➕`Plus` 🔍`Search` ⏱️`Timer` 📌`Pin` 🌐`Globe`.

- [ ] **Step 1: `bottom-nav.tsx`** — mobile only (`lg:hidden fixed bottom-0 inset-x-0 z-[450] bg-surface-elevated border-t border-border-default`), 5 mục: `/`→Home "Trang chủ", `/lesson`→GraduationCap "Học", `/review`→RotateCcw "Ôn tập", `/reading`→BookOpen "Đọc", `/progress`→User "Hồ sơ"; mỗi mục `min-h-11`, active = `text-action-primary` (usePathname so khớp prefix).
- [ ] **Step 2: `sidebar-nav.tsx`** — bỏ nút floating (dòng ~146 `lg:hidden fixed left-3 bottom-4`), giữ drawer (mở từ topbar ☰); desktop rail `hidden lg:flex` đổi `bg-surface-elevated border-r border-border-default` (1px), emoji → Icon theo map, active `bg-action-primary/10 text-action-primary`; thêm `pb-20 lg:pb-3` cho body layout để bottom nav không che nội dung.
- [ ] **Step 3: `topbar.tsx`** — `⚙️`→`<IconButton label="Cài đặt"><Settings/></IconButton>`, `☰`→`<IconButton label="Menu"><Menu/></IconButton>` (onClick mở drawer); streak 🔥→`Flame` + `text-learning-streak`; thêm `lg:hidden` mobile padding-bottom cho bottom-nav không overlap.
- [ ] **Step 4: Modals** — `login-modal`, `settings-modal`: thay `.modal-backdrop` markup bằng `<Dialog>`; `toast-provider`: restyle `.toast` inline → `bg-ink-inverse`? — dùng `bg-surface-elevated text-text-primary border border-border-default shadow-md rounded-control`.
- [ ] **Step 5: `ai-widget` (🤖→`Bot` màu `text-feature-ai`), `notification-bell` (🔔→`Bell`), `login-gate`, `not-found`, `(app)/layout.tsx` (mount `<BottomNav/>`), root `layout.tsx` (đã có font từ Task 1).
- [ ] **Step 6: Sửa test emoji của area** — `ai-widget.test.tsx` đổi `getByText(/🤖/)` → `getByRole("button", { name: /AI/i })` kiểu accessible-name.
- [ ] **Step 7: Verify** — typecheck + lint + test; **commit** `feat(shell): restyle shell theo Hanzi + bottom nav mobile`

### Task 4: Home + Lesson (13 file)

**Files:** `src/app/(app)/page.tsx`, `src/components/home/continue-card.tsx`, `src/components/lesson/{lesson-client,lesson-provider,word-list}.tsx`, `src/components/lesson/modes/{battle,dance,flashcard,listen,quiz,reading,typing}.tsx` + tests `custom-deck-modes.test.tsx`, `word-list.test.tsx`.

- [ ] **Step 1: Posture** — `(app)/page.tsx` + `continue-card`: `max-w-[1200px] mx-auto px-4 md:px-6 lg:px-8`; một Button primary duy nhất ("Tiếp tục"); streak Flame amber.
- [ ] **Step 2: `lesson-client`** — container `max-w-[760px]`; thanh controls: `.btn-main/.btn-ghost` → `<Button variant>`; wordmark `vietnam-map.svg` giữ nguyên; SRS: answer choices = `Chip`/`Button` cao `min-h-13` (52px), states correct/error dùng `tone`; phím tắt 1–4 giữ nguyên logic.
- [ ] **Step 3: 7 modes** — từng file: hex hard-code (`flashcard.tsx` có 4) + palette classes (`reading` 5, `typing` 4, `quiz` 3, `listen` 3, `battle` 3, `dance` 2) → semantic classes; emoji → Icon theo map; `.shadow-neo` → bỏ hoặc `shadow-xs`; flip-card 3D giữ logic.
- [ ] **Step 4: Thẻ hanzi** — hanzi hero `text-[32px]`–`text-[64px]` `.zh`, pinyin `text-[14px]`–`text-[18px]` `text-text-secondary`, translation `text-[14px]`–`text-[16px]`.
- [ ] **Step 5: Sửa 2 test** (`custom-deck-modes`, `word-list`) → role/accessible-name.
- [ ] **Step 6: Verify + commit** `feat(lesson): restyle home + lesson modes theo Hanzi`

### Task 5: Review + Reading + Roadmap + Progress + Stats (15 file)

**Files:** `src/app/(app)/review/{page,review-dashboard}.tsx`, `src/app/(app)/reading/{page,reading-client}.tsx` + `karaoke.tsx`, `src/app/(app)/roadmap/page.tsx`, `src/app/(app)/roadmap/pinyin/{page.tsx,session/[n]/page.tsx}`, `src/components/roadmap/{journey-card,session-client,steps-client,timeline-client}.tsx`, `src/app/(app)/progress/{page,progress-client}.tsx`, `src/components/stats/{donut,heatmap,seven-day-bars}.tsx`.

- [ ] **Step 1: review-dashboard** — `.card`→`<Card>`, review queue mỗi item là Card; SRS actions Again/Hard/Good/Easy = Button size sm + phím 1–4; hex trong file (3) → token.
- [ ] **Step 2: reading (+karaoke)** — container `max-w-[820px]`; karaoke highlight câu đang đọc = `bg-action-primary/10` (không màu một mình — kèm underline); emoji 🔊→`Volume2`.
- [ ] **Step 3: roadmap ×4 components + 3 pages** — `session-client` có 7 palette classes → token; steps state New/Learning/Familiar/Mastered/Due = `Chip` tone + icon; due = `text-learning-due`.
- [ ] **Step 4: progress + stats** — donut giữ inline SVG, đổi fill/stroke sang `var(--action-primary)`/`var(--border-subtle)`; heatmap mức độ = alpha của jade (`--action-primary` với opacity 20/40/60/80/100%) + tooltip số; seven-day-bars fill jade + số trên cột.
- [ ] **Step 5: Sửa tests** `review-dashboard.test.tsx`, `reading-client.test.tsx` → role/accessible-name.
- [ ] **Step 6: Verify + commit** `feat(learn-core): restyle review/reading/roadmap/progress/stats`

### Task 6: Hanzi + Pinyin + Radicals + Sound-rules (14 file)

**Files:** `src/app/(app)/hanzi/**` (6 file), `src/components/hanzi/{draw-modal,draw-pad,stroke-player}.tsx`, `src/app/(app)/pinyin/{page,practice/page}.tsx`, `src/components/pinyin/{matrix-client,practice-client,tone-dialog}.tsx`, `src/app/(app)/radicals/page.tsx`, `src/components/radicals/{autoplay-modal,deck-client,stroke-rules}.tsx`, `src/app/(app)/sound-rules/page.tsx`, `src/components/sound-rules/{quiz-client,speak-text}.tsx`.

- [ ] **Step 1: hanzi-detail/hanzi-home/search-card** — hero hanzi 64px; `draw-modal` (2 hex) + `draw-pad` (2 hex — grid.guideline màu `var(--border-subtle)`, stroke `var(--text-primary)`); `stroke-player` (2 hex — animate stroke `var(--action-primary)`); tone marks: tone 1–4+vô thanh phân biệt bằng **shape+label** (mã hóa kép, không chỉ màu).
- [ ] **Step 2: pinyin ×3 + practice** — matrix cells `min-h-11`; tone-dialog → `<Dialog>`; speak 🔊→`Volume2` qua `IconButton`.
- [ ] **Step 3: radicals ×3** — deck cards `<Card>`; autoplay-modal → `<Dialog>`; `stroke-rules` (3 hex) → token; ☑️/✅ state → `CircleCheck`.
- [ ] **Step 4: sound-rules** — quiz answers ≥52px + state matrix; `speak-text` nút loa `IconButton`.
- [ ] **Step 5: Verify + commit** `feat(reference): restyle hanzi/pinyin/radicals/sound-rules`

### Task 7: Dictionary + Notebook + Personal pages + Course + Shadowing (23 file)

**Files:** `src/app/(app)/dictionary/{page,dictionary-client}.tsx`, `src/app/(app)/notebook/**` (2), `src/components/notebook/notebook-list.tsx`, `src/app/(app)/{my-vocab,my-grammar}/page.tsx`, `src/app/(app)/course/**` (2) + `src/components/course/{course-client,course-progress}.tsx`, `src/app/(app)/shadowing/{page,[videoId]/page}.tsx`, `src/components/shadowing/{cat-filter,dictation-panel,library-client,recorder-panel,video-card,video-player,xem-tat-ca}.tsx`.

- [ ] **Step 1: dictionary** — `dictionary-client` (emoji 🔍→Search) — sửa test `dictionary-client.test.tsx`; kết quả dạng `<Card>`, hanzi hero.
- [ ] **Step 2: notebook + my-vocab/my-grammar** — list → Card; state từ vựng (New/Learning/Familiar/Mastered/Due) = Chip tone theo `--learning-*`; filter `.pill` → `Chip`.
- [ ] **Step 3: course ×4** — `course-client` (emoji + test `course-client.test.tsx`), `course-progress` (style={{}} width % giữ, màu → `var(--action-primary)`).
- [ ] **Step 4: shadowing ×9** — `video-card` (6 hex — thumbnail overlay gradient giữ nhưng text trắng → `text-white` trên ảnh là hợp lệ), `dictation-panel` (2 palette + emoji, sửa test `dictation-panel.test.tsx`), `recorder-panel` (1 hex — nút record = `bg-action-danger`), library/cat-filter/xem-tat-ca/video-player: Card + Button + Icon.
- [ ] **Step 5: Verify + commit** `feat(tools): restyle dictionary/notebook/course/shadowing`

### Task 8: Create-file + Certificate-test + Trang tĩnh (14 file)

**Files:** `src/app/(app)/create-file/{page,[tpl]/page}.tsx`, `src/components/create-file/{a4-preview,catalog-grid,create-file-client,create-file-form,freehsk-gate,print-button}.tsx`, `src/app/(app)/certificate-test/{card,page}.tsx`, `src/app/{leaderboard,feedback,privacy,terms,delete-account}/page.tsx`.

- [ ] **Step 1: create-file** — form/controls → primitives; `catalog-grid` (3 hex) + `freehsk-gate` (1 hex) → token; **`a4-preview` + `svg-render.ts` KHÔNG đổi** (print artifact) — chỉ bọc preview trong khung `Card` + `shadow-xs`; `@media print` trong globals giữ nguyên.
- [ ] **Step 2: certificate-test** — card/page đổi da: exam-restrained = chrome tối giản, **không** gamification celebrate (giữ hành vi hiện tại, chỉ restyle); điều hướng → Button.
- [ ] **Step 3: trang tĩnh** — privacy/terms/leaderboard/feedback/delete-account: `max-w-[760px]`, Card + Button + typography scale; không còn emoji/class cũ.
- [ ] **Step 4: Verify + commit** `feat(misc): restyle create-file/certificate/static pages`

### Task 9: Cleanup gate — completeness + grep về 0 + full test

**Files:** Modify `app-next/src/app/globals.css` (xóa legacy), Modify `app-next/src/app/layout.tsx` (nếu còn class cũ).

- [ ] **Step 1: Completeness check** —
```bash
cd app-next && find src -name "*.tsx" | grep -v __tests__ | sort
```
Mỗi file phải thuộc: *đã migrate trong Task 3–8* / *N/A (api, sitemap, robots, favicon, svg-render.ts, types)* / *có chủ đích (donut.tsx, vietnam-map.svg)*. Liệt kê kết quả vào commit message.
- [ ] **Step 2: Grep về 0** — mỗi lệnh dưới đây phải ra 0 dòng (types `lib/`, `svg-render.ts`, `a4-preview` print string, và test snapshot trừ khi có chủ đích được loại):
```bash
cd app-next/src
grep -rn "#[0-9a-fA-F]\{6\}" --include="*.tsx" app components | grep -v __tests__
grep -rEn "(text|bg|border|ring)-(red|blue|green|yellow|amber|purple|orange|pink|emerald|teal|sky|indigo|violet|rose|lime|cyan|fuchsia|slate|gray|zinc|neutral|stone)-[0-9]" --include="*.tsx" app components | grep -v __tests__
grep -rEn "🔥|⭐|✅|❌|🔊|📚|📖|🎧|📝|🏠|⚙|☰|🔔|🤖|🎯|🏆|💡|✏|🗑|➕|🔍|⏱|📌|⚡|💎|🀄" --include="*.tsx" app components | grep -v __tests__
grep -rn "shadow-neo\|btn-main\|btn-ghost\|pill-active\|modal-backdrop\|grid-cell" --include="*.tsx" app components | grep -v __tests__
grep -rln "from \"lucide-react\"" --include="*.tsx" components | grep -v "components/ui/icon.tsx"
```
- [ ] **Step 3: Xóa legacy CSS** trong `globals.css` (`.card`, `.btn-main`, `.btn-ghost`, `.pill*`, `.grid-cell`, `.shadow-neo`, `.toast`, `.modal-backdrop`, `--nhai-*`, `--color-nhai-*` trong `@theme`) — giữ `.zh`, `.no-print`/`[data-shell]`/`@media print`, `.shake`, `.paper-grid` nếu còn dùng.
- [ ] **Step 4: Full verify** — `pnpm --dir app-next typecheck && pnpm --dir app-next lint && pnpm --dir app-next test && pnpm --dir app-next test:e2e`
- [ ] **Step 5: Đối chiếu thị giác** — chạy `pnpm --dir app-next dev`, so từng màn (home, lesson, review, reading, shadowing, dictionary, progress) với `opendesign_hsk/Hanzi/system/kit.html`; kiểm dark mode toggle.
- [ ] **Step 6: Commit** `feat(cleanup): xóa legacy theme, hoàn tất 100% Hanzi design system`
