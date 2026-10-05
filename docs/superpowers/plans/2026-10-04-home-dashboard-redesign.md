# Home Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port 100% mock `opendesign_hsk/index.html` (Home Dashboard · HSK 2) thành component trong `app-next/`: token mới (Vermilion primary, radius 8/16), shell mới (topbar + bottom-nav, bỏ sidebar), và 4 section Home (glance / hero / habit-loop / progress-matrix).

**Architecture:** Giữ cơ chế 3 lớp token (`--hz-*` → semantic → `@theme inline`) của `globals.css`, chỉ đổi giá trị; tách primitive mới vào `components/ui/` rồi compose các section Home trong `components/home/`; data thật đọc qua `progressStore` (localStorage `nhai.*`) bằng hook `useHomeSummary()` mới; Server Component mặc định, client islands cho phần đọc localStorage.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind CSS v4 (CSS-first, không config file), Vitest + RTL (jsdom), Playwright.

**Spec:** `docs/superpowers/specs/2026-10-04-home-dashboard-redesign-design.md` (đi kèm plan này — executor phải đọc cả hai).

## Global Constraints

- Chỉ dùng semantic token (`bg-surface-*`, `text-text-*`, `border-border-*`, `bg-action-*`, `ring-action-focus`, `rounded-card`, `rounded-control`, `shadow-xs`, `shadow-md`) — **cấm hard-code hex primitive trong component**.
- Icon chỉ import qua `@/components/ui/icon`, luôn `strokeWidth={ICON_STROKE}` (hoặc `1.5`) + `aria-hidden="true"` — cấm import `lucide-react` trực tiếp.
- Min touch target 44px (`min-h-11`) cho mọi control tương tác.
- File/component: file kebab-case, component PascalCase; test colocated `__tests__/*.test.tsx`; comment tiếng Việt ngắn giải thích "port từ đâu / vì sao".
- `forwardRef` + `cn()` (`@/lib/cn`) cho primitive có ref; component đọc localStorage phải SSR-safe (chỉ đọc sau mount, giá trị mặc định 0).
- Dark mode qua `html.dark` + localStorage `nhai.theme` (KHÔNG dùng `data-theme`/`hanzi:theme` của mock — đó là cơ chế demo).
- Next.js 16 có breaking change so với training data: trước khi viết code Next-specific, tra cứu `node_modules/next/dist/docs/` nếu không chắc (theo `app-next/AGENTS.md`).
- Chạy app: `pnpm dev` ở `app-next/` (port 3100). Test: `pnpm vitest run <file>`. Toàn bộ: `pnpm vitest run`. E2E: `pnpm exec playwright test`.
- Branch làm việc: `home-dashboard-redesign` (đã tạo, spec đã commit `a9d3e00`).

## Review Focus

Năm đầu vào/failure mode spec ngầm hiểu nhưng không task test nào phủ — mỗi dòng đã được pin bởi test trong task sở hữu:

1. **localStorage trống (lần đầu vào app)** — mọi số trên Home (streak, XP, due, %) phải là 0 hoặc section ẩn gọn, không crash, không NaN/`0/0`. → pin: Task 10 bước test "localStorage rỗng → defaults".
2. **localStorage JSON hỏng** — `readHomeSummary()` phải bọc try/catch trả defaults, giống `progressStore`. → pin: Task 10 bước test "JSON hỏng → defaults".
3. **Hydration mismatch** — HTML server không được chứa số từ localStorage; component đọc store chỉ render sau mount. → pin: Task 10 test "mounted=false trước effect" + các component return `null` khi `!mounted` (assert trong test Task 13/14/15).
4. **Search Enter với chuỗi rỗng / ký tự đặc biệt** — rỗng thì không navigate; ký tự đặc biệt phải `encodeURIComponent`. → pin: Task 8 bước test.
5. **Đổi token làm danger/focus trùng primary** — nút danger và focus ring phải vẫn phân biệt được với primary Vermilion sau khi đổi token (danger giữ `#a9342b`, focus ring `#d24b3f`). → pin: Task 1 bước verify giá trị + Task 17 soi visual light/dark.

---

### Task 1: Token layer mới trong `globals.css` + docs (DESIGN.md, skill, AGENTS.md)

**Files:**
- Modify: `app-next/src/app/globals.css` (khối `:root` dòng 4–41, `html.dark` dòng 42–71, `@theme inline` dòng 72–101)
- Modify: `opendesign_hsk/Hanzi/DESIGN.md` (dòng 13–14, 25, 36–37, 69, 74, 77, 80)
- Modify: `.zcode/skills/hanzi-design-system/SKILL.md`
- Modify: `app-next/AGENTS.md` (đoạn "7 fixed core colors")

**Interfaces:**
- Consumes: không.
- Produces: token semantic mới mà mọi task sau dùng — `--action-primary` (Vermilion `#C83C32`), `--surface-muted`, `--color-amber-wash`, `--color-amber-ink`, `--color-ring-track`, `rounded-control` = 8px, `rounded-card` = 16px. Dark values trong `html.dark`.

- [ ] **Step 1: Sửa lớp primitive + semantic trong `:root`**

Thay các dòng sau trong khối `:root` của `globals.css` (giữ nguyên `--ink-static`, `--hz-purple`):

```css
  /* lớp 1 — primitives (spec 2026-10-04: port opendesign_hsk/index.html — Vermilion primary) */
  --hz-paper: #faf9f5;   --hz-elevated: #ffffff;
  --hz-surface: #f1f3f2;
  --hz-ink: #1f2a27;     --hz-slate: #66756f;
  /* primitive không flip theo dark mode (state color cố định, vd nút dừng ghi âm) */
  --ink-static: #1f2a27;
  --hz-line: #e8ecea;    --hz-jade: #2d7d5b;
  --hz-vermilion: #c83c32;  --hz-vermilion-600: #d24b3f;  --hz-vermilion-700: #a9342b;
  --hz-amber: #e68a00;   --hz-amber-wash: #fdf3e2;  --hz-amber-ink: #5c3600;
  --hz-purple: #722ed1;
  --hz-ring-track: #e8ecea;
  /* lớp 2 — semantic */
  --surface-paper: var(--hz-paper);
  --surface-elevated: var(--hz-elevated);
  --surface-muted: var(--hz-surface);
  --text-primary: var(--hz-ink);
  --text-secondary: var(--hz-slate);
  --border-subtle: #edeeed;
  --border-default: var(--hz-line);
  --border-strong: #d9dcda;
  --action-primary: var(--hz-vermilion);
  --action-primary-hover: #b33229;
  --action-primary-active: #9e2b23;
  --action-focus: var(--hz-vermilion-600);
  --action-danger: var(--hz-vermilion-700);
  --action-danger-active: #8c2a22;
  --feedback-success: #52c41a;
  --feedback-warning: var(--hz-amber);
  --feedback-error: var(--hz-vermilion-700);
  --feedback-error-text: var(--hz-vermilion-700);
  --learning-streak: var(--hz-amber);
  --learning-new: var(--hz-slate);
  --learning-progress: var(--hz-amber);
  --learning-mastered: var(--hz-jade);
  --learning-due: var(--hz-vermilion-700);
  --feature-ai: var(--hz-purple);
  --radius-card: 16px;
  --radius-control: 8px;
  --shadow-xs: 0 1px 2px rgba(31, 42, 39, .05);
  --shadow-md: 0 2px 4px rgba(31, 42, 39, .06), 0 10px 24px rgba(31, 42, 39, .08);
```

- [ ] **Step 2: Sửa `html.dark`**

```css
html.dark {
  --hz-paper: #111318;   --hz-elevated: #1c2029;
  --hz-surface: #1a1d24;
  --hz-ink: #eceeed;     --hz-slate: #9aa3a0;
  --hz-line: #2a2f37;
  --hz-jade: #4caf8a;
  --hz-vermilion: #e05349;  --hz-vermilion-600: #e05349;  --hz-vermilion-700: #e08a84;
  --hz-amber: #dcaa37;   --hz-amber-wash: #312512;  --hz-amber-ink: #f5d98b;
  --hz-ring-track: #3e3e3e;
  --surface-paper: var(--hz-paper);
  --surface-elevated: var(--hz-elevated);
  --surface-muted: var(--hz-surface);
  --text-primary: #eceeed;
  --text-secondary: #9aa3a0;
  --border-subtle: #23272e;
  --border-default: #2a2f37;
  --border-strong: #3a4049;
  --action-primary: #e05349;
  --action-primary-hover: #c7453c;
  --action-primary-active: #b03a32;
  --action-focus: #e05349;
  --action-danger: #e08a84;
  --action-danger-active: #c9716b;
  --feedback-success: #64b537;
  --feedback-warning: #dcaa37;
  --feedback-error: #e08a84;
  --feedback-error-text: #e08a84;
  --learning-new: #9aa3a0;
  --learning-mastered: #4caf8a;
  --learning-due: #e08a84;
  --feature-ai: #9254de;
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, .4);
  --shadow-md: 0 2px 6px rgba(0, 0, 0, .5), 0 16px 36px rgba(0, 0, 0, .45);
  /* đệm ring-offset theo dark (mặc định Tailwind là #fff → lỗ trắng quanh focus ring) */
  --tw-ring-offset-color: #111318;
}
```

- [ ] **Step 3: Bổ sung `@theme inline`**

Thêm vào khối `@theme inline` (giữ nguyên các dòng cũ, chỉ thêm):

```css
  --color-surface-muted: var(--surface-muted);
  --color-amber-wash: var(--hz-amber-wash);
  --color-amber-ink: var(--hz-amber-ink);
  --color-ring-track: var(--hz-ring-track);
```

- [ ] **Step 4: Cập nhật docs**

- `opendesign_hsk/Hanzi/DESIGN.md`:
  - Dòng 13–14 (khối JSON màu): `jade: "#2d7d5b"`, `vermilion: "#c83c32"`.
  - Dòng 25: thay câu vai trò màu bằng: `Visual metaphor: Ink + Vermilion + Jade — Ink carries knowledge and typography, Vermilion is the primary action color (vermilion 600 #d24b3f for focus rings), Jade signals secondary progress and success accents. Amber owns streaks; purple marks AI features. Small error text uses vermilion 700 #A9342B to stay distinct from the primary action.` (giữ lại các câu còn lại của đoạn).
  - Dòng 36–37 (bảng vai trò): dòng `accent` → `| accent | Vermilion | #C83C32 | primary actions and brand signal (vermilion / brandPrimary; dark #E05349) |`; dòng `accent-secondary` → `| accent-secondary | Jade | #2D7D5B | progress accents, success signals, secondary arcs |`.
  - Dòng 69: `**Radius:** 16px cards / 8px controls`.
  - Dòng 74: `Cards: 16px radius, 20px padding, 1px #E8ECEA border; controls/inputs/buttons: 8px radius, 44px height (48px for hero CTAs)`.
  - Dòng 77: thay "jade focus and vermilion danger" thành "vermilion focus and vermilion-700 danger".
  - Dòng 80: "jade 3px ring" → "vermilion 3px ring".
- `.zcode/skills/hanzi-design-system/SKILL.md`: đồng bộ mọi chỗ nó nhắc Jade-là-primary / radius 14/10 theo đúng nội dung DESIGN.md vừa sửa (grep `jade`, `0f766e`, `14px`, `10px`).
- `app-next/AGENTS.md`: trong đoạn màu (grep `0f766e` / `Jade`), sửa thành: Jade `#2D7D5B` (màu phụ/progress), Vermilion `#C83C32` (primary action), radius `16px card / 8px control`; giữ nguyên nguyên tắc còn lại.

- [ ] **Step 5: Quét hard-code màu/radius cũ trong src (yêu cầu spec §2)**

Run:
```bash
grep -rn "#0f766e\|#d24b3f\|#a9342b\|#fafbfa\|#1d1d1d\|#faad14\|rounded-\[14px\]\|rounded-\[10px\]" app-next/src --include="*.tsx" --include="*.ts" --include="*.css"
```
Expected: liệt kê các chỗ hard-code primitive cũ. Sửa từng chỗ sang token semantic tương ứng (`bg-action-primary`, `text-feedback-error-text`, `rounded-card`, `rounded-control`…). `.grid-cell`/print block trong `globals.css` dùng `--ink-static` cố ý cho in ấn — giữ nguyên. Nếu còn match sau khi sửa, phải là comment/giải thích in ấn — ghi rõ trong commit message.

- [ ] **Step 6: Verify không vỡ build + test cũ**

Run: `cd app-next && pnpm vitest run 2>&1 | tail -5`
Expected: PASS (test RTL không assert màu cụ thể; nếu có test assert text màu bị ảnh hưởng → sửa test theo giá trị mới và ghi rõ trong commit message).

- [ ] **Step 7: Commit**

```bash
git add app-next/src/app/globals.css opendesign_hsk/Hanzi/DESIGN.md .zcode/skills/hanzi-design-system/SKILL.md app-next/AGENTS.md
git commit -m "feat(tokens): vermilion primary + radius 8/16 + surface/amber-wash/ring-track moi theo opendesign index.html"
```

---

### Task 2: `Button` — variant `ghost` mới + size `lg`

**Files:**
- Modify: `app-next/src/components/ui/button.tsx`
- Test: `app-next/src/components/ui/__tests__/button.test.tsx` (đã tồn tại — bổ sung)

**Interfaces:**
- Produces: `Button` nhận `size?: "sm" | "md" | "lg"`; `lg` = min-height 48px (CTA hero). Variant `ghost` đổi thành nền `surface-muted` có border (khớp `.btn-ghost` của mock), không còn là text-only.

- [ ] **Step 1: Thêm failing test vào `__tests__/button.test.tsx`**

```tsx
describe("Button — size lg + ghost mới (spec 2026-10-04)", () => {
  it("size lg có min-height 48px", () => {
    render(<Button size="lg">Tiếp tục</Button>);
    expect(screen.getByRole("button", { name: "Tiếp tục" }).className).toContain("min-h-12");
  });
  it("ghost là nền surface-muted có border, không phải text-only", () => {
    render(<Button variant="ghost">Xem danh sách từ</Button>);
    const cls = screen.getByRole("button", { name: "Xem danh sách từ" }).className;
    expect(cls).toContain("bg-surface-muted");
    expect(cls).toContain("border-border-default");
  });
});
```

- [ ] **Step 2: Run test verify FAIL**

Run: `cd app-next && pnpm vitest run src/components/ui/__tests__/button.test.tsx`
Expected: FAIL — `min-h-12` không tồn tại trong className; ghost chưa có `bg-surface-muted`.

- [ ] **Step 3: Sửa `button.tsx`**

```tsx
const styles = {
  primary: "bg-action-primary text-white hover:bg-action-primary-hover active:bg-action-primary-active border-transparent",
  secondary: "bg-surface-elevated text-text-primary border-border-default hover:border-action-primary hover:text-action-primary",
  danger: "bg-action-danger text-white hover:opacity-90 border-transparent",
  ghost: "bg-surface-muted text-text-primary border-border-default hover:bg-surface-elevated hover:border-border-strong",
} as const;

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof styles; size?: "sm" | "md" | "lg"; loading?: boolean;
}>(function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...rest }, ref) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-control border font-semibold min-h-11",
        size === "sm" ? "px-3 text-sm" : size === "lg" ? "min-h-12 px-6 text-[15px]" : "px-5",
        loading && "min-w-28",
        "focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2",
        "disabled:opacity-50 disabled:pointer-events-none",
        styles[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
});
```

- [ ] **Step 4: Run test verify PASS**

Run: `cd app-next && pnpm vitest run src/components/ui/__tests__/button.test.tsx`
Expected: PASS toàn bộ file (kể cả test cũ).

- [ ] **Step 5: Commit**

```bash
git add app-next/src/components/ui/button.tsx app-next/src/components/ui/__tests__/button.test.tsx
git commit -m "feat(ui): Button them size lg (48px) va ghost nen surface-muted theo mock home moi"
```

---

### Task 3: `Chip` — tones `doing` / `todo` / `idle`

**Files:**
- Modify: `app-next/src/components/ui/chip.tsx`
- Test: `app-next/src/components/ui/__tests__/chip.test.tsx` (bổ sung)

**Interfaces:**
- Produces: `Chip` nhận thêm `tone="doing" | "todo" | "idle"` — dùng cho status chip của habit cards (Task 14). Chip vẫn giữ `min-h-11` mặc định; usage nhỏ hơn pass `className="min-h-7 px-2.5 text-[11px] tracking-wider"` (tailwind-merge cho override).

- [ ] **Step 1: Thêm failing test**

```tsx
describe("Chip — status tones (spec 2026-10-04)", () => {
  it("tone doing: nền surface-muted, chữ text-primary", () => {
    render(<Chip tone="doing">ĐANG THỰC HIỆN</Chip>);
    const cls = screen.getByText("ĐANG THỰC HIỆN").className;
    expect(cls).toContain("bg-surface-muted");
    expect(cls).toContain("text-text-primary");
  });
  it("tone todo: nền amber-wash, chữ amber-ink", () => {
    render(<Chip tone="todo">CẦN LÀM</Chip>);
    const cls = screen.getByText("CẦN LÀM").className;
    expect(cls).toContain("bg-amber-wash");
    expect(cls).toContain("text-amber-ink");
  });
  it("tone idle: trong suốt, chữ secondary", () => {
    render(<Chip tone="idle">CHƯA BẮT ĐẦU</Chip>);
    const cls = screen.getByText("CHƯA BẮT ĐẦU").className;
    expect(cls).toContain("bg-transparent");
    expect(cls).toContain("text-text-secondary");
  });
});
```

- [ ] **Step 2: Run verify FAIL**

Run: `cd app-next && pnpm vitest run src/components/ui/__tests__/chip.test.tsx`
Expected: FAIL — TypeScript từ chối `tone="doing"` (không nằm trong union).

- [ ] **Step 3: Sửa `chip.tsx`**

Đổi type và map tones:

```tsx
type Tone = "neutral" | "selected" | "correct" | "error" | "streak" | "ai" | "doing" | "todo" | "idle";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-elevated text-text-primary border-border-default",
  selected: "bg-action-primary text-white border-transparent",
  correct: "bg-surface-elevated text-feedback-success border-feedback-success",
  error: "bg-surface-elevated text-feedback-error border-feedback-error",
  streak: "bg-surface-elevated text-learning-streak border-learning-streak",
  ai: "bg-surface-elevated text-feature-ai border-feature-ai",
  /* status habit cards (spec 2026-10-04) */
  doing: "bg-surface-muted text-text-primary border-border-default",
  todo: "bg-amber-wash text-amber-ink border-[color-mix(in_srgb,var(--hz-amber)_35%,var(--hz-line))]",
  idle: "bg-transparent text-text-secondary border-transparent",
};
```

Phần còn lại của file giữ nguyên.

- [ ] **Step 4: Run verify PASS**

Run: `cd app-next && pnpm vitest run src/components/ui/__tests__/chip.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app-next/src/components/ui/chip.tsx app-next/src/components/ui/__tests__/chip.test.tsx
git commit -m "feat(ui): Chip them tone doing/todo/idle cho status habit cards"
```

---

### Task 4: `Progress` — label ẩn được + fill gradient

**Files:**
- Modify: `app-next/src/components/ui/progress.tsx`
- Test: `app-next/src/components/ui/__tests__/progress.test.tsx` (bổ sung)

**Interfaces:**
- Produces: `Progress` với API mới — `label?: string` (hiện thị, optional), `ariaLabel: string` (bắt buộc khi không có label), `gradient?: boolean` (fill jade→vermilion cho hero). Task 13 dùng `ariaLabel` + `gradient`.

- [ ] **Step 1: Thêm failing test**

```tsx
describe("Progress — bare + gradient (spec 2026-10-04)", () => {
  it("không hiện label khi chỉ truyền ariaLabel, vẫn có role progressbar", () => {
    render(<Progress value={55} ariaLabel="Tiến độ bài học" />);
    expect(screen.getByRole("progressbar", { name: "Tiến độ bài học" })).toBeInTheDocument();
    expect(screen.queryByText("55%")).not.toBeInTheDocument();
  });
  it("gradient=true cho fill class gradient jade→vermilion", () => {
    render(<Progress value={55} ariaLabel="p" gradient />);
    expect(screen.getByRole("progressbar").firstChild!.className).toContain("bg-gradient-to-r");
  });
});
```

- [ ] **Step 2: Run verify FAIL**

Run: `cd app-next && pnpm vitest run src/components/ui/__tests__/progress.test.tsx`
Expected: FAIL — TypeScript: `ariaLabel` chưa tồn tại; `label` đang bắt buộc.

- [ ] **Step 3: Sửa `progress.tsx`**

```tsx
import { cn } from "@/lib/cn";

export function Progress({ value, max = 100, label, ariaLabel, gradient, className }: {
  value: number;
  max?: number;
  label?: string;
  ariaLabel?: string;
  gradient?: boolean;
  className?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0;
  const name = ariaLabel ?? label ?? "";
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {label && <span className="text-sm text-text-primary">{label}</span>}
      <div
        role="progressbar"
        aria-label={name}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-border-subtle"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-700",
            gradient ? "bg-gradient-to-r from-learning-mastered to-action-primary" : "bg-action-primary",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {label && <span className="text-sm font-medium tabular-nums text-text-primary">{pct}%</span>}
    </div>
  );
}
```

Lưu ý: test cũ assert label hiển thị — vẫn pass vì behaviour giữ nguyên khi truyền `label`.

- [ ] **Step 4: Run verify PASS**

Run: `cd app-next && pnpm vitest run src/components/ui/__tests__/progress.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app-next/src/components/ui/progress.tsx app-next/src/components/ui/__tests__/progress.test.tsx
git commit -m "feat(ui): Progress label optional + gradient jade-vermilion cho hero"
```

---

### Task 5: Primitive `DonutRing`

**Files:**
- Create: `app-next/src/components/ui/donut-ring.tsx`
- Test: `app-next/src/components/ui/__tests__/donut-ring.test.tsx`

**Interfaces:**
- Produces: `DonutRing({ value, total, size = 96, strokeWidth = 9, color = "var(--action-primary)", label, children, className })` — SVG ring server-safe (không `"use client"`), arc tính từ `stroke-dashoffset`, có `transition` CSS; `children` = nội dung giữa ring (`<text>`). Task 15 dùng size 96; Task 13 dùng size 44/strokeWidth 5/color jade.

- [ ] **Step 1: Viết failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DonutRing } from "../donut-ring";

describe("DonutRing", () => {
  it("tính đúng stroke-dashoffset theo tỉ lệ value/total", () => {
    const { container } = render(
      <DonutRing value={61} total={100} size={96} strokeWidth={9} label="Tiến độ" />
    );
    const arcs = container.querySelectorAll("circle");
    const arc = arcs[1] as SVGCircleElement; // circle thứ 2 là arc màu
    const r = (96 - 9) / 2;
    const c = 2 * Math.PI * r;
    expect(Number(arc.getAttribute("stroke-dasharray"))).toBeCloseTo(c, 1);
    expect(Number(arc.getAttribute("stroke-dashoffset"))).toBeCloseTo(c * 0.39, 1);
  });
  it("aria-label mô tả giá trị", () => {
    render(<DonutRing value={185} total={300} label="Đã nhớ 185 trên 300 từ, đạt 61 phần trăm" />);
    expect(screen.getByRole("img", { name: "Đã nhớ 185 trên 300 từ, đạt 61 phần trăm" })).toBeInTheDocument();
  });
  it("clamp: value > total không vượt vòng đầy; total=0 → offset = chu vi (rỗng)", () => {
    const { container } = render(<DonutRing value={500} total={300} size={96} strokeWidth={9} label="x" />);
    const arc = container.querySelectorAll("circle")[1] as SVGCircleElement;
    expect(Number(arc.getAttribute("stroke-dashoffset"))).toBe(0);
    const { container: c2 } = render(<DonutRing value={5} total={0} size={96} strokeWidth={9} label="y" />);
    const arc2 = c2.querySelectorAll("circle")[1] as SVGCircleElement;
    const r = (96 - 9) / 2;
    expect(Number(arc2.getAttribute("stroke-dashoffset"))).toBeCloseTo(2 * Math.PI * r, 1);
  });
  it("render children (text giữa ring)", () => {
    render(
      <DonutRing value={1} total={2} label="z">
        <text x="48" y="46">50%</text>
      </DonutRing>
    );
    expect(screen.getByText("50%")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run verify FAIL**

Run: `cd app-next && pnpm vitest run src/components/ui/__tests__/donut-ring.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Viết `donut-ring.tsx`**

```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/* Vòng tròn tiến độ SVG (port .big-ring/#masteryArc + #goalArc của opendesign index.html).
   Server-safe: không state, animate bằng transition CSS trên stroke-dashoffset. */
export function DonutRing({
  value,
  total,
  size = 96,
  strokeWidth = 9,
  color = "var(--action-primary)",
  label,
  children,
  className,
}: {
  value: number;
  total: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label: string;
  children?: ReactNode;
  className?: string;
}) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, Math.max(0, value / total)) : 0;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={label}
      className={cn("shrink-0", className)}
    >
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--hz-ring-track)" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="transition-[stroke-dashoffset] duration-700"
      />
      {children}
    </svg>
  );
}
```

- [ ] **Step 4: Run verify PASS**

Run: `cd app-next && pnpm vitest run src/components/ui/__tests__/donut-ring.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app-next/src/components/ui/donut-ring.tsx app-next/src/components/ui/__tests__/donut-ring.test.tsx
git commit -m "feat(ui): DonutRing SVG ring donut animate dashoffset (port masteryArc/goalArc)"
```

---

### Task 6: Primitive `SegmentedTabs`

**Files:**
- Create: `app-next/src/components/ui/segmented-tabs.tsx`
- Test: `app-next/src/components/ui/__tests__/segmented-tabs.test.tsx`

**Interfaces:**
- Produces: `SegmentedTabs<K extends string>({ tabs, value, onChange, label, className })` với `tabs: ReadonlyArray<{ key: K; label: ReactNode }>`. Nút active có `aria-pressed="true"`. Task 13 dùng `K = "lesson" | "srs"`.

- [ ] **Step 1: Viết failing test**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SegmentedTabs } from "../segmented-tabs";

describe("SegmentedTabs", () => {
  it("tab active có aria-pressed=true, tab kia false", () => {
    render(
      <SegmentedTabs
        label="Chuyển trạng thái hero"
        tabs={[
          { key: "lesson", label: "Bài học" },
          { key: "srs", label: "Ôn tập SRS · 18" },
        ]}
        value="lesson"
        onChange={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: "Bài học" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Ôn tập SRS · 18" })).toHaveAttribute("aria-pressed", "false");
  });
  it("click tab gọi onChange với key đúng", async () => {
    const onChange = vi.fn();
    render(
      <SegmentedTabs
        label="g"
        tabs={[
          { key: "lesson", label: "Bài học" },
          { key: "srs", label: "SRS" },
        ]}
        value="lesson"
        onChange={onChange}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "SRS" }));
    expect(onChange).toHaveBeenCalledWith("srs");
  });
  it("group có aria-label", () => {
    render(
      <SegmentedTabs label="Chuyển trạng thái hero" tabs={[{ key: "a", label: "A" }]} value="a" onChange={() => {}} />
    );
    expect(screen.getByRole("group", { name: "Chuyển trạng thái hero" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run verify FAIL**

Run: `cd app-next && pnpm vitest run src/components/ui/__tests__/segmented-tabs.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Viết `segmented-tabs.tsx`**

```tsx
"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/* Toggle pill 2+ lựa chọn (port .hero-toggle của opendesign index.html — Lesson/SRS).
   aria-pressed thay vì role=tablist vì đây là trạng thái bấm độc lập, không panel liên quan. */
export function SegmentedTabs<K extends string>({
  tabs,
  value,
  onChange,
  label,
  className,
}: {
  tabs: ReadonlyArray<{ key: K; label: ReactNode }>;
  value: K;
  onChange: (k: K) => void;
  label: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn("flex gap-0.5 rounded-full border border-border-default bg-surface-muted p-[3px]", className)}
    >
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          aria-pressed={t.key === value}
          onClick={() => onChange(t.key)}
          className={cn(
            "min-h-11 rounded-full px-3.5 text-[12.5px] font-bold transition-colors",
            t.key === value
              ? "border border-border-default bg-surface-elevated text-text-primary shadow-xs"
              : "text-text-secondary hover:text-text-primary",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run verify PASS**

Run: `cd app-next && pnpm vitest run src/components/ui/__tests__/segmented-tabs.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app-next/src/components/ui/segmented-tabs.tsx app-next/src/components/ui/__tests__/segmented-tabs.test.tsx
git commit -m "feat(ui): SegmentedTabs pill aria-pressed (port hero-toggle Lesson/SRS)"
```

---

### Task 7: Primitive `IconTile`

**Files:**
- Create: `app-next/src/components/ui/icon-tile.tsx`
- Test: `app-next/src/components/ui/__tests__/icon-tile.test.tsx`

**Interfaces:**
- Produces: `IconTile({ tone = "neutral", size = 40, className, children })` — ô vuông bo `rounded-control` chứa icon; `tone` quyết định màu icon: `neutral` (ink) | `vermilion` (action-primary) | `amber` (learning-streak) | `jade` (learning-mastered). Dùng ở Task 14 (habit) và Task 15 (tools).

- [ ] **Step 1: Viết failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { IconTile } from "../icon-tile";

describe("IconTile", () => {
  it("ô 40px rounded-control nền surface-muted", () => {
    const { container } = render(<IconTile>x</IconTile>);
    expect(container.firstElementChild!.className).toContain("h-10");
    expect(container.firstElementChild!.className).toContain("rounded-control");
    expect(container.firstElementChild!.className).toContain("bg-surface-muted");
  });
  it("tone amber đổ màu learning-streak", () => {
    const { container } = render(<IconTile tone="amber">x</IconTile>);
    expect(container.firstElementChild!.className).toContain("text-learning-streak");
  });
});
```

- [ ] **Step 2: Run verify FAIL**

Run: `cd app-next && pnpm vitest run src/components/ui/__tests__/icon-tile.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Viết `icon-tile.tsx`**

```tsx
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "vermilion" | "amber" | "jade";

const toneClass: Record<Tone, string> = {
  neutral: "text-text-primary",
  vermilion: "text-action-primary",
  amber: "text-learning-streak",
  jade: "text-learning-mastered",
};

/* Ô vuông chứa icon (port .icon-tile của opendesign index.html — habit cards + quick tools). */
export function IconTile({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "grid h-10 w-10 shrink-0 place-items-center rounded-control border border-border-default bg-surface-muted",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 4: Run verify PASS**

Run: `cd app-next && pnpm vitest run src/components/ui/__tests__/icon-tile.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app-next/src/components/ui/icon-tile.tsx app-next/src/components/ui/__tests__/icon-tile.test.tsx
git commit -m "feat(ui): IconTile o vuong 40px 4 tone (port icon-tile cua mock)"
```

---

### Task 8: Primitive `SearchField`

**Files:**
- Create: `app-next/src/components/ui/search-field.tsx`
- Test: `app-next/src/components/ui/__tests__/search-field.test.tsx`

**Interfaces:**
- Produces: `SearchField({ className })` — client component; Enter với query ≠ rỗng → `router.push("/dictionary?q=" + encodeURIComponent(query))`; phím tắt ⌘K/Ctrl+K focus input; `<kbd>` hint ẩn dưới `md`. Task 11 nhúng vào Topbar.

- [ ] **Step 1: Viết failing test**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchField } from "../search-field";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("SearchField", () => {
  it("Enter với query → push /dictionary?q= đã encode", async () => {
    render(<SearchField />);
    const input = screen.getByLabelText("Tìm kiếm");
    await userEvent.type(input, "爱好 học{Enter}");
    expect(push).toHaveBeenCalledWith("/dictionary?q=" + encodeURIComponent("爱好 học"));
  });
  it("Enter với query rỗng/chỉ space → không navigate", async () => {
    push.mockClear();
    render(<SearchField />);
    await userEvent.type(screen.getByLabelText("Tìm kiếm"), "   {Enter}");
    expect(push).not.toHaveBeenCalled();
  });
  it("⌘K focus input", async () => {
    render(<SearchField />);
    const input = screen.getByLabelText("Tìm kiếm");
    await userEvent.keyboard("{Meta>}k");
    expect(input).toHaveFocus();
  });
});
```

Lưu ý: nếu vitest setup của project chưa có `vi.mock` pattern cho `next/navigation`, mock trên là tự chứa trong file test này.

- [ ] **Step 2: Run verify FAIL**

Run: `cd app-next && pnpm vitest run src/components/ui/__tests__/search-field.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Viết `search-field.tsx`**

```tsx
"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { Search, ICON_STROKE } from "@/components/ui/icon";

/* Ô tìm kiếm topbar (port .search của opendesign index.html).
   Enter → /dictionary?q= (dictionary-client.tsx đã đọc useSearchParams "q").
   ⌘K/Ctrl+K focus — behaviour của mock, giữ nguyên. */
export function SearchField({ className }: { className?: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <label
      className={cn(
        "flex h-10 min-w-0 flex-1 items-center gap-2 rounded-control border border-border-default bg-surface-muted px-3",
        className,
      )}
    >
      <Search size={16} strokeWidth={ICON_STROKE} aria-hidden="true" className="shrink-0 text-text-secondary" />
      <input
        ref={inputRef}
        type="search"
        placeholder="Tìm từ vựng, bài học, ngữ pháp…"
        aria-label="Tìm kiếm"
        className="w-full border-0 bg-transparent text-[13.5px] text-text-primary outline-none placeholder:text-text-secondary"
        onKeyDown={(e) => {
          const q = e.currentTarget.value.trim();
          if (e.key === "Enter" && q) router.push("/dictionary?q=" + encodeURIComponent(q));
        }}
      />
      <kbd className="hidden shrink-0 rounded border border-border-default bg-surface-elevated px-1.5 py-0.5 font-mono text-[11px] text-text-secondary md:block">
        ⌘K
      </kbd>
    </label>
  );
}
```

- [ ] **Step 4: Run verify PASS**

Run: `cd app-next && pnpm vitest run src/components/ui/__tests__/search-field.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app-next/src/components/ui/search-field.tsx app-next/src/components/ui/__tests__/search-field.test.tsx
git commit -m "feat(ui): SearchField Enter->dictionary?q= + phim tat CMD-K (port .search)"
```

---

### Task 9: Primitive `StreakPill`

**Files:**
- Create: `app-next/src/components/ui/streak-pill.tsx`
- Test: `app-next/src/components/ui/__tests__/streak-pill.test.tsx`

**Interfaces:**
- Produces: `StreakPill({ days, variant = "mini", className })` — `mini` = pill tròn amber-wash cho topbar (chỉ số + icon lửa); `full` = card streak cho glance header (số ngày + caption). Nhận `days: number` từ caller (Task 11/13 đọc store), component thuần hiển thị.

- [ ] **Step 1: Viết failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StreakPill } from "../streak-pill";

describe("StreakPill", () => {
  it("mini: hiện số ngày trong pill", () => {
    render(<StreakPill days={12} />);
    expect(screen.getByText("12")).toBeInTheDocument();
  });
  it("full: hiện '12 ngày liên tục' + caption", () => {
    render(<StreakPill days={12} variant="full" />);
    expect(screen.getByText("12 ngày liên tục")).toBeInTheDocument();
    expect(screen.getByText("Streak · giữ lửa mỗi ngày")).toBeInTheDocument();
  });
  it("nền amber-wash ở cả 2 variant", () => {
    const { container, rerender } = render(<StreakPill days={1} />);
    expect(container.firstElementChild!.className).toContain("bg-amber-wash");
    rerender(<StreakPill days={1} variant="full" />);
    expect(container.firstElementChild!.className).toContain("bg-surface-elevated");
    expect(container.textContent).toContain("ngày liên tục");
  });
});
```

- [ ] **Step 2: Run verify FAIL**

Run: `cd app-next && pnpm vitest run src/components/ui/__tests__/streak-pill.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Viết `streak-pill.tsx`**

```tsx
import { cn } from "@/lib/cn";
import { Flame, ICON_STROKE } from "@/components/ui/icon";

/* Streak pill 2 dạng (port .streak-mini topbar + .streak-pill glance của opendesign index.html).
   Amber owns streaks — không dùng màu khác (DESIGN.md). */
export function StreakPill({
  days,
  variant = "mini",
  className,
}: {
  days: number;
  variant?: "mini" | "full";
  className?: string;
}) {
  if (variant === "mini") {
    return (
      <span
        title="Chuỗi ngày học liên tục"
        className={cn(
          "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-border-default bg-amber-wash px-3 text-[13px] font-bold text-amber-ink",
          className,
        )}
      >
        <Flame size={16} strokeWidth={ICON_STROKE} aria-hidden="true" className="text-learning-streak" />
        {days}
      </span>
    );
  }
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-control border border-border-default bg-surface-elevated p-2 pr-3.5 shadow-xs",
        className,
      )}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[6px] bg-amber-wash">
        <Flame size={18} strokeWidth={ICON_STROKE} aria-hidden="true" className="text-learning-streak" />
      </span>
      <div className="leading-tight">
        <b className="block text-sm">{days} ngày liên tục</b>
        <small className="block text-[11.5px] text-text-secondary">Streak · giữ lửa mỗi ngày</small>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run verify PASS**

Run: `cd app-next && pnpm vitest run src/components/ui/__tests__/streak-pill.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app-next/src/components/ui/streak-pill.tsx app-next/src/components/ui/__tests__/streak-pill.test.tsx
git commit -m "feat(ui): StreakPill mini/full nen amber-wash (port streak-mini + streak-pill)"
```

---

### Task 10: `lib/home-summary.ts` — nguồn data thật cho Home

**Files:**
- Create: `app-next/src/lib/home-summary.ts`
- Test: `app-next/src/lib/__tests__/home-summary.test.ts`

**Interfaces:**
- Consumes: `progressStore` từ `@/lib/store/progress-store` (API: `listPageDone()`, `getAllSrs()`, `getStreak()`, `getToday()`), `courses` từ `@/content/courses` (`Record<string, { pages: { pageId: string; skill: string; title: string }[] }>`, slugs dạng `hsk1`, `hsk2`…), `vocab` từ `@/content/vocab`.
- Produces (Task 11, 13, 14, 15 dùng):
  - `readHomeSummary(): HomeSummary` — thuần, đọc localStorage (chỉ gọi client-side).
  - `useHomeSummary(): HomeSummary & { mounted: boolean }` — hook; `mounted=false` trước effect (SSR-safe), tự sync qua event `nhai:progress`.
  - `type HomeSummary = { lesson: { book, pageId, title, pct } | null; srsDue: number; srsTotal: number; recallPct: number; streak: number; todayXp: number; lessonsDone: number; lessonsTotal: number; vocabMastered: number; vocabTotal: number }`.

- [ ] **Step 1: Viết failing test**

```ts
import { describe, it, expect, beforeEach, vi } from "vitest";

/* progress-store dùng window event; home-summary thuần đọc localStorage → test "readHomeSummary" chạy jsdom bình thường. */
import { readHomeSummary } from "../home-summary";

beforeEach(() => localStorage.clear());

describe("readHomeSummary", () => {
  it("localStorage rỗng → defaults 0, lesson null, không NaN", () => {
    const s = readHomeSummary();
    expect(s).toMatchObject({
      lesson: null, srsDue: 0, srsTotal: 0, recallPct: 0,
      streak: 0, todayXp: 0, lessonsDone: 0, vocabMastered: 0,
    });
    expect(s.lessonsTotal).toBeGreaterThan(0); // từ content/courses
    expect(s.vocabTotal).toBeGreaterThan(0);   // từ content/vocab
    expect(Number.isNaN(s.recallPct)).toBe(false);
  });
  it("JSON hỏng → defaults (try/catch như progressStore)", () => {
    localStorage.setItem("nhai.pageDone", "{không phải json");
    localStorage.setItem("nhai.srs.items", "???");
    expect(() => readHomeSummary()).not.toThrow();
    const s = readHomeSummary();
    expect(s.lessonsDone).toBe(0);
    expect(s.srsTotal).toBe(0);
  });
  it("pageDone + SRS → lesson kế tiếp, due count, recall %", () => {
    localStorage.setItem("nhai.pageDone", JSON.stringify({ "hsk1/lesson-1": 1 }));
    localStorage.setItem(
      "nhai.srs.items",
      JSON.stringify({
        "hsk1.lesson-1.0": { key: "k1", status: "learned", dueAt: Date.now() - 1000, reviewCount: 3, lastReviewedAt: 1, updatedAt: 1 },
        "hsk1.lesson-1.1": { key: "k2", status: "new", dueAt: Date.now() - 1000, reviewCount: 0, lastReviewedAt: null, updatedAt: 1 },
        "hsk1.lesson-1.2": { key: "k3", status: "known", dueAt: null, reviewCount: 5, lastReviewedAt: 1, updatedAt: 1 },
      })
    );
    const s = readHomeSummary();
    expect(s.lesson?.book).toBe("hsk1");
    expect(s.lesson?.pageId).toBe("lesson-2"); // lesson-1 đã done
    expect(s.srsDue).toBe(2);                  // dueAt đã qua, kể cả status new
    expect(s.srsTotal).toBe(3);
    expect(s.recallPct).toBe(100);             // reviewed = 2 (k1 learned, k3 known), good = 2 → 100%
    expect(s.lessonsDone).toBe(1);
    expect(s.vocabMastered).toBe(2);           // learned + known
  });
});
```

Định nghĩa `recallPct` dùng trong toàn plan: `round(good / reviewed * 100)` với `reviewed` = items có `reviewCount > 0`, `good` = reviewed có status `learned|known`.

- [ ] **Step 2: Run verify FAIL**

Run: `cd app-next && pnpm vitest run src/lib/__tests__/home-summary.test.ts`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Viết `home-summary.ts`**

```ts
"use client";

/* Nguồn data Home Dashboard mới (spec 2026-10-04): gom mọi số trên trang chủ
   vào 1 lần đọc progressStore thay vì mỗi component tự đọc rải rác.
   Thuần + try/catch defaults như progressStore (Review Focus #1, #2). */

import { useEffect, useState } from "react";
import { courses } from "@/content/courses";
import { vocab } from "@/content/vocab";
import { progressStore, type SrsItem } from "@/lib/store/progress-store";

export type HomeLesson = { book: string; pageId: string; title: string; pct: number };

export type HomeSummary = {
  lesson: HomeLesson | null;
  srsDue: number;
  srsTotal: number;
  recallPct: number;
  streak: number;
  todayXp: number;
  lessonsDone: number;
  lessonsTotal: number;
  vocabMastered: number;
  vocabTotal: number;
};

export const DAILY_GOAL_XP = 20; // mục tiêu mỗi ngày (mock: 20 phút → quy đổi XP)

/* Bài vocab CHƯA done kế tiếp cùng book (port logic ContinueCard B1). */
function findNextLesson(): HomeLesson | null {
  try {
    const done = progressStore.listPageDone();
    if (done.length === 0) return null;
    const byBook = new Map<string, Set<string>>();
    for (const k of done) {
      const idx = k.indexOf("/");
      if (idx <= 0) continue;
      const book = k.slice(0, idx);
      if (!courses[book]) continue;
      if (!byBook.has(book)) byBook.set(book, new Set());
      byBook.get(book)!.add(k.slice(idx + 1));
    }
    for (const [book, donePages] of byBook) {
      const vocabPages = courses[book].pages.filter((p) => p.skill === "vocab");
      const nextLesson = vocabPages.find((p) => !donePages.has(p.pageId));
      if (!nextLesson) continue;
      const title = vocab[book]?.[nextLesson.pageId]?.title ?? nextLesson.title;
      const pct = vocabPages.length > 0 ? Math.round(((vocabPages.length - vocabPages.filter((p) => !donePages.has(p.pageId)).length) / vocabPages.length) * 100) : 0;
      return { book, pageId: nextLesson.pageId, title, pct };
    }
    return null;
  } catch {
    return null;
  }
}

function countVocabTotal(): number {
  try {
    let n = 0;
    for (const pages of Object.values(vocab)) {
      for (const page of Object.values(pages as Record<string, { rows?: unknown[] }>)) {
        n += Array.isArray(page?.rows) ? page.rows.length : 0;
      }
    }
    return n;
  } catch {
    return 0;
  }
}

function isDue(it: SrsItem): boolean {
  return it.status !== "known" && it.dueAt != null && it.dueAt <= Date.now();
}

export function readHomeSummary(): HomeSummary {
  let srs: SrsItem[] = [];
  try {
    srs = progressStore.getAllSrs();
  } catch {
    srs = [];
  }
  const reviewed = srs.filter((it) => it.reviewCount > 0);
  const good = reviewed.filter((it) => it.status === "learned" || it.status === "known");
  return {
    lesson: findNextLesson(),
    srsDue: srs.filter(isDue).length,
    srsTotal: srs.length,
    recallPct: reviewed.length > 0 ? Math.round((good.length / reviewed.length) * 100) : 0,
    streak: progressStore.getStreak(),
    todayXp: progressStore.getToday(),
    lessonsDone: progressStore.listPageDone().length,
    lessonsTotal: Object.values(courses).reduce((n, c) => n + c.pages.length, 0),
    vocabMastered: srs.filter((it) => it.status === "learned" || it.status === "known").length,
    vocabTotal: countVocabTotal(),
  };
}

const EMPTY: HomeSummary = {
  lesson: null, srsDue: 0, srsTotal: 0, recallPct: 0, streak: 0, todayXp: 0,
  lessonsDone: 0, lessonsTotal: 0, vocabMastered: 0, vocabTotal: 0,
};

/* mounted=false trước effect → component return null khi SSR (Review Focus #3). */
export function useHomeSummary(): HomeSummary & { mounted: boolean } {
  const [s, setS] = useState<HomeSummary>(EMPTY);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const sync = () => setS(readHomeSummary());
    sync();
    setMounted(true);
    window.addEventListener("nhai:progress", sync);
    return () => window.removeEventListener("nhai:progress", sync);
  }, []);
  return { ...s, mounted };
}
```

**Lưu ý shape:** `courses[book].pages` và `vocab[book][pageId]` đã được xác nhận qua `continue-card.tsx` cũ (`Record` keyed bởi slug book). `skill === "vocab"` cũng từ file đó. Nếu `courses` thực tế là array, tra `src/content/courses.ts` và điều chỉnh `findNextLesson`/`lessonsTotal` theo shape thật.

- [ ] **Step 4: Run verify PASS**

Run: `cd app-next && pnpm vitest run src/lib/__tests__/home-summary.test.ts`
Expected: PASS. Nếu `lessonsTotal`/`vocabTotal` assertion `> 0` fail do shape content khác — đọc file content tương ứng, sửa `countVocabTotal`/reduce cho đúng shape thật (không sửa test cho khớp code sai).

- [ ] **Step 5: Commit**

```bash
git add app-next/src/lib/home-summary.ts app-next/src/lib/__tests__/home-summary.test.ts
git commit -m "feat(home): home-summary gom du lieu dashboard (lesson ke, srs due, streak, mastery)"
```

---

### Task 11: Topbar mới

**Files:**
- Modify: `app-next/src/components/shell/topbar.tsx` (viết lại toàn bộ)
- Test: `app-next/src/components/shell/__tests__/topbar.test.tsx` (create)

**Interfaces:**
- Consumes: `SearchField` (Task 8), `StreakPill` (Task 9), `useHomeSummary` (Task 10 — lấy `streak`), `useTheme` (`./theme-provider`: `{ theme, setTheme }`), `useSession` (`@/lib/use-session`: `{ loggedIn, name, image, logout }`), `useLoginModal` (`./login-modal`: `openLogin()`), event `nhai:open-settings`.
- Produces: Topbar sticky mới — không còn `Menu`/`nhai:open-nav` (sidebar bị bỏ ở Task 12), không còn `NotificationBell` (mock không có; file `notification-bell.tsx` giữ nguyên, chỉ unmount).
- Lệch có chủ đích so với mock: giữ brand **glyph 奈 + tên "Nhai"** (brand thật của app) thay vì 汉/"Hanzi" của mock — tile 36px nền tối và caption "HSK LEARNING" theo mock.

- [ ] **Step 1: Viết failing test**

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Topbar from "../topbar";

vi.mock("@/lib/use-session", () => ({
  useSession: () => ({ loggedIn: false, name: "", image: null, isPending: false, logout: vi.fn() }),
}));
const openLogin = vi.fn();
vi.mock("../login-modal", () => ({ useLoginModal: () => ({ openLogin }) }));

beforeEach(() => {
  localStorage.clear();
  openLogin.mockClear();
  document.documentElement.classList.remove("dark");
});

function renderTopbar() {
  return render(<Topbar />);
}

describe("Topbar mới (spec 2026-10-04)", () => {
  it("brand tile + tên Nhai", () => {
    renderTopbar();
    expect(screen.getByText("奈", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("Nhai")).toBeInTheDocument();
  });
  it("streak pill mini hiện số từ nhai.streak", async () => {
    localStorage.setItem("nhai.streak", "7");
    renderTopbar();
    expect(await screen.findByText("7")).toBeInTheDocument();
  });
  it("nút theme toggle class dark trên html", async () => {
    renderTopbar();
    await userEvent.click(screen.getByRole("button", { name: "Chuyển chế độ sáng tối" }));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });
  it("HSK switcher chọn mục tiêu lưu nhai.goal", async () => {
    renderTopbar();
    const select = screen.getByLabelText("Cấp độ HSK") as HTMLSelectElement;
    await userEvent.selectOptions(select, "HSK 3");
    expect(localStorage.getItem("nhai.goal")).toBe("HSK 3");
  });
  it("avatar khi logged out có aria-label Đăng nhập, click gọi openLogin", async () => {
    renderTopbar();
    await userEvent.click(screen.getByRole("button", { name: "Đăng nhập" }));
    expect(openLogin).toHaveBeenCalledTimes(1);
  });
});
```

Lưu ý: test `streak` dùng `await …findByText` → các `it` callback phải `async`. `useTheme` cần `ThemeProvider` — nếu test throw "phải dùng bên trong ThemeProvider", bọc trong `renderTopbar()` bằng `<ThemeProvider>` import từ `../theme-provider`.

- [ ] **Step 2: Run verify FAIL**

Run: `cd app-next && pnpm vitest run src/components/shell/__tests__/topbar.test.tsx`
Expected: FAIL — topbar cũ không có các element trên.

- [ ] **Step 3: Viết lại `topbar.tsx`**

```tsx
"use client";

/* Topbar mới — port .topbar của opendesign index.html (spec 2026-10-04).
   Brand + SearchField (⌘K) + HSK goal switcher + StreakPill mini + theme toggle + avatar.
   Sidebar/menu drawer bị bỏ theo spec — bottom-nav + link trong trang lo điều hướng.
   Không còn NotificationBell (mock không có; file component giữ lại để tái dùng sau). */

import { useEffect, useState } from "react";
import Link from "next/link";
import { Moon, Sun, ICON_STROKE } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { SearchField } from "@/components/ui/search-field";
import { StreakPill } from "@/components/ui/streak-pill";
import { useHomeSummary } from "@/lib/home-summary";
import { useSession } from "@/lib/use-session";
import { useTheme } from "./theme-provider";
import { useLoginModal } from "./login-modal";

const HSK_LEVELS = ["HSK 1", "HSK 2", "HSK 3", "HSK 4"];

export default function Topbar() {
  const { streak, mounted } = useHomeSummary();
  const { theme, setTheme } = useTheme();
  const { openLogin } = useLoginModal();
  const { loggedIn, name } = useSession();
  const [goal, setGoal] = useState("HSK 2");

  useEffect(() => {
    try {
      setGoal(localStorage.getItem("nhai.goal") ?? "HSK 2");
    } catch {
      /* silent */
    }
  }, []);

  const initials = (name.trim() || "T").slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-border-default bg-[color-mix(in_srgb,var(--surface-paper)_88%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-2.5 md:px-6 md:py-3">
        <Link href="/" aria-label="Nhai home" className="flex shrink-0 items-center gap-2.5">
          <span className="zh grid h-9 w-9 place-items-center rounded-control bg-text-primary text-lg font-extrabold leading-none text-surface-paper dark:border dark:border-border-default dark:bg-surface-elevated dark:text-text-primary">
            奈
          </span>
          <span className="hidden min-[640px]:block text-[15px] font-bold leading-tight tracking-tight">
            Nhai
            <small className="block text-[11px] font-normal tracking-[0.08em] text-text-secondary">HSK LEARNING</small>
          </span>
        </Link>
        <SearchField className="hidden min-[900px]:flex" />
        <label className="hidden h-10 shrink-0 cursor-pointer items-center gap-2 rounded-control border border-border-default bg-surface-elevated pl-3 pr-2 text-[13px] font-bold min-[760px]:flex">
          <span className="h-2 w-2 rounded-full bg-learning-mastered" aria-hidden="true" />
          <span className="hidden min-[900px]:inline">Mục tiêu:</span>
          <select
            aria-label="Cấp độ HSK"
            value={goal}
            onChange={(e) => {
              setGoal(e.target.value);
              try {
                localStorage.setItem("nhai.goal", e.target.value);
              } catch {
                /* silent */
              }
            }}
            className="cursor-pointer border-0 bg-transparent font-bold text-text-primary outline-none"
          >
            {HSK_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        {mounted && <StreakPill days={streak} className="hidden min-[760px]:inline-flex" />}
        <IconButton label="Chuyển chế độ sáng tối" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? (
            <Sun size={18} strokeWidth={ICON_STROKE} aria-hidden="true" />
          ) : (
            <Moon size={18} strokeWidth={ICON_STROKE} aria-hidden="true" />
          )}
        </IconButton>
        <button
          type="button"
          aria-label={loggedIn ? "Tài khoản" : "Đăng nhập"}
          title={loggedIn ? name || "Tài khoản" : "Đăng nhập"}
          onClick={() => (loggedIn ? window.dispatchEvent(new CustomEvent("nhai:open-settings")) : openLogin())}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-border-default bg-learning-mastered text-sm font-bold text-white"
        >
          {initials}
        </button>
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Run verify PASS**

Run: `cd app-next && pnpm vitest run src/components/shell/__tests__/topbar.test.tsx`
Expected: PASS. Lưu ý `useTheme` cần `ThemeProvider` — nếu test throw "phải dùng bên trong ThemeProvider", bọc render bằng `<ThemeProvider>` import từ `../theme-provider`.

- [ ] **Step 5: Commit**

```bash
git add app-next/src/components/shell/topbar.tsx app-next/src/components/shell/__tests__/topbar.test.tsx
git commit -m "feat(shell): topbar moi search+goal+streak+avatar theo mock, bo menu drawer va bell"
```

---

### Task 12: BottomNav đồng bộ + bỏ SidebarNav

**Files:**
- Modify: `app-next/src/components/shell/bottom-nav.tsx`
- Modify: `app-next/src/app/layout.tsx` (bỏ `SidebarNav` + wrapper `flex`)
- Delete: `app-next/src/components/shell/sidebar-nav.tsx`
- Test: `app-next/src/components/shell/__tests__/bottom-nav.test.tsx` (create)

**Interfaces:**
- Produces: BottomNav 5 item Home `/`, Roadmap `/roadmap`, Hanzi `/hanzi`, Practice `/review`, Profile `/progress`; hiển thị < md (768px, mock là 760 — lệch 8px chấp nhận được). Root layout: `<Topbar /><main className="min-h-[60vh]">{children}</main><BottomNav />…` (bỏ div `flex` + `SidebarNav`).

- [ ] **Step 1: Viết failing test**

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import BottomNav from "../bottom-nav";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

describe("BottomNav mới (spec 2026-10-04)", () => {
  it("đúng 5 mục: Home, Roadmap, Hanzi, Practice, Profile", () => {
    render(<BottomNav />);
    for (const label of ["Home", "Roadmap", "Hanzi", "Practice", "Profile"]) {
      expect(screen.getByRole("link", { name: new RegExp(label) })).toBeInTheDocument();
    }
  });
  it("active item theo pathname có aria-current=page", () => {
    render(<BottomNav />);
    expect(screen.getByRole("link", { name: /Home/ })).toHaveAttribute("aria-current", "page");
  });
});
```

Thêm `import { vi } from "vitest"` vào đầu nếu linter bắt buộc gộp import.

- [ ] **Step 2: Run verify FAIL**

Run: `cd app-next && pnpm vitest run src/components/shell/__tests__/bottom-nav.test.tsx`
Expected: FAIL — item cũ là "Trang chủ/Học/Ôn tập/Đọc/Hồ sơ".

- [ ] **Step 3: Sửa `bottom-nav.tsx`**

```tsx
"use client";

/* BottomNav — port .bottomnav của opendesign index.html (spec 2026-10-04).
   5 mục Home/Roadmap/Hanzi/Practice/Profile, hiện < md (mock: <760px).
   Active: icon màu action-primary + aria-current=page theo usePathname. */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, PenTool, RotateCcw, User, type LucideIcon } from "@/components/ui/icon";

const ITEMS: ReadonlyArray<{ href: string; label: string; Icon: LucideIcon; exact?: boolean }> = [
  { href: "/", label: "Home", Icon: Home, exact: true },
  { href: "/roadmap", label: "Roadmap", Icon: Map },
  { href: "/hanzi", label: "Hanzi", Icon: PenTool },
  { href: "/review", label: "Practice", Icon: RotateCcw },
  { href: "/progress", label: "Profile", Icon: User },
] as const;

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Điều hướng chính"
      className="md:hidden fixed bottom-0 inset-x-0 z-[450] border-t border-border-default bg-[color-mix(in_srgb,var(--surface-elevated)_94%,transparent)] backdrop-blur-xl"
    >
      <div className="mx-auto grid max-w-[560px] grid-cols-5 px-2 pt-1.5 pb-[calc(8px+env(safe-area-inset-bottom))]">
        {ITEMS.map(({ href, label, Icon, exact }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={
                "flex min-h-[52px] flex-col items-center justify-center gap-0.5 rounded-control text-[10.5px] font-bold " +
                (active ? "text-text-primary [&>svg]:text-action-primary" : "text-text-secondary")
              }
            >
              <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 4: Sửa `app/layout.tsx` + xoá sidebar**

Trong `app/layout.tsx`:

- Xoá `import SidebarNav from "@/components/shell/sidebar-nav";`
- Thay khối render:

```tsx
<Topbar />
<main className="min-h-[60vh]">{children}</main>
<BottomNav />
```

(bỏ `<div className="flex">` bao ngoài).

Xoá file: `git rm app-next/src/components/shell/sidebar-nav.tsx`. Chạy `grep -rn "sidebar-nav\|nhai:open-nav" app-next/src` —Expected: không còn match nào (topbar mới không dispatch `nhai:open-nav`).

- [ ] **Step 5: Run test PASS + toàn bộ suite**

Run: `cd app-next && pnpm vitest run src/components/shell/__tests__/bottom-nav.test.tsx && pnpm vitest run 2>&1 | tail -5`
Expected: PASS. Nếu test khác import `SidebarNav` → cập nhật test đó bỏ tham chiếu.

- [ ] **Step 6: Commit**

```bash
git add app-next/src/components/shell/bottom-nav.tsx app-next/src/components/shell/__tests__/bottom-nav.test.tsx app-next/src/app/layout.tsx
git rm app-next/src/components/shell/sidebar-nav.tsx
git commit -m "feat(shell): bottomnav 5 muc theo mock + bo SidebarNav (desktop chi con topbar)"
```

---

### Task 13: `HeroAction` — card hành động chính 2 tab

**Files:**
- Create: `app-next/src/components/home/hero-action.tsx`
- Test: `app-next/src/components/home/__tests__/hero-action.test.tsx`

**Interfaces:**
- Consumes: `useHomeSummary` (Task 10), `SegmentedTabs` (Task 6), `Button` size lg (Task 2), `Progress` bare+gradient (Task 4), `Chip` không cần ở đây.
- Produces: default export client component, không props. Tab `lesson`: badge `ĐANG HỌC · BÀI {n}`, title bài + hanzi từ `vocab[book][pageId].title`, sub tiến độ, Progress gradient, CTA primary → `/lesson/{book}/{pageId}`, secondary → `/my-vocab`. Tab `srs`: badge `ÔN TẬP SRS · {srsDue} TỪ ĐẾN HẠN`, title `{srsDue} từ cần củng cố trí nhớ 复习`, CTA → `/review`. Watermark glyph: `学` (lesson) / `复` (srs). Không có lesson → fallback card mời vào `/course`.

- [ ] **Step 1: Viết failing test**

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HeroAction from "../hero-action";

beforeEach(() => localStorage.clear());

describe("HeroAction (spec 2026-10-04)", () => {
  it("không render gì trước mount (SSR-safe)", () => {
    const { container } = render(<HeroAction />);
    expect(container).toBeEmptyDOMElement();
  });
  it("localStorage rỗng → fallback mời bắt đầu /course", async () => {
    render(<HeroAction />);
    const link = await screen.findByRole("link", { name: /Bắt đầu/ });
    expect(link.getAttribute("href")).toBe("/course");
  });
  it("có pageDone → tab lesson hiện bài kế tiếp, CTA /lesson/...", async () => {
    localStorage.setItem("nhai.pageDone", JSON.stringify({ "hsk1/lesson-1": 1 }));
    render(<HeroAction />);
    const cta = await screen.findByRole("link", { name: /Tiếp tục/ });
    expect(cta.getAttribute("href")).toBe("/lesson/hsk1/lesson-2");
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-label", "Tiến độ bài học");
  });
  it("chuyển tab SRS đổi CTA sang /review và aria-pressed đúng", async () => {
    localStorage.setItem("nhai.pageDone", JSON.stringify({ "hsk1/lesson-1": 1 }));
    render(<HeroAction />);
    await screen.findByRole("link", { name: /Tiếp tục/ });
    await userEvent.click(screen.getByRole("button", { name: /Ôn tập SRS/ }));
    expect(screen.getByRole("link", { name: /Flashcard/ })).toHaveAttribute("href", "/review");
    expect(screen.getByRole("button", { name: /Ôn tập SRS/ })).toHaveAttribute("aria-pressed", "true");
  });
});
```

- [ ] **Step 2: Run verify FAIL**

Run: `cd app-next && pnpm vitest run src/components/home/__tests__/hero-action.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Viết `hero-action.tsx`**

```tsx
"use client";

/* Hero — card hành động chính (port .hero của opendesign index.html, spec 2026-10-04).
   2 tab Lesson/SRS: lesson = bài vocab kế tiếp (logic ContinueCard cũ, giờ qua useHomeSummary);
   srs = số từ đến hạn. Watermark glyph + progress gradient jade→vermilion. */

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Play, ICON_STROKE } from "@/components/ui/icon";
import { Progress } from "@/components/ui/progress";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { useHomeSummary } from "@/lib/home-summary";

type HeroTab = "lesson" | "srs";

export default function HeroAction() {
  const s = useHomeSummary();
  const [tab, setTab] = useState<HeroTab>("lesson");

  if (!s.mounted) return null;

  const isSrs = tab === "srs";
  const lesson = s.lesson;
  const srsPct = s.srsTotal > 0 ? Math.round(((s.srsTotal - s.srsDue) / s.srsTotal) * 100) : 0;

  return (
    <section
      aria-label="Hành động tiếp theo"
      className="relative overflow-hidden rounded-card border border-border-default bg-surface-elevated p-5 shadow-xs md:p-[22px]"
    >
      {/* watermark hanzi + wash gradient cuối card (port .hero-watermark + .hero::after) */}
      <span
        aria-hidden="true"
        className="zh pointer-events-none absolute -top-6 right-2 select-none text-[140px] font-extrabold leading-none text-text-primary opacity-[0.055] md:text-[210px]"
      >
        {isSrs ? "复" : "学"}
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[color-mix(in_srgb,var(--surface-muted)_55%,transparent)]"
      />

      <div className="relative z-[1] flex flex-wrap items-center gap-2.5">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-surface-muted px-3 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-text-secondary">
          <span
            aria-hidden="true"
            className={
              "h-[7px] w-[7px] rounded-full " +
              (isSrs
                ? "bg-learning-streak shadow-[0_0_0_4px_color-mix(in_srgb,var(--hz-amber)_18%,transparent)]"
                : "bg-learning-mastered shadow-[0_0_0_4px_color-mix(in_srgb,var(--hz-jade)_18%,transparent)]")
            }
          />
          {isSrs ? `ÔN TẬP SRS · ${s.srsDue} TỪ ĐẾN HẠN` : lesson ? `ĐANG HỌC · BÀI ${parseInt(lesson.pageId.replace("lesson-", ""), 10) || 1}` : "BẮT ĐẦU HÀNH TRÌNH"}
        </span>
      </div>

      {isSrs || lesson ? (
        <>
          <h2 className="relative z-[1] mt-3 max-w-[22ch] text-xl font-bold leading-snug tracking-tight md:text-2xl">
            {isSrs ? (
              <>
                {s.srsDue} từ cần củng cố trí nhớ <span className="zh">复习</span>
              </>
            ) : (
              <>
                {lesson!.title} <span className="zh">学</span>
              </>
            )}
          </h2>
          <p className="relative z-[1] mt-2 text-[13.5px] text-text-secondary">
            {isSrs ? (
              <>
                Tỉ lệ nhớ <b className="text-text-primary">{s.recallPct}%</b> ·{" "}
                <b className="text-text-primary">{s.srsDue} từ</b> đến hạn hôm nay
              </>
            ) : (
              <>
                Tiến độ: <b className="text-text-primary">{lesson!.pct}%</b> hoàn thành
              </>
            )}
          </p>
          <div className="relative z-[1] my-4.5">
            <Progress
              value={isSrs ? srsPct : lesson!.pct}
              ariaLabel="Tiến độ bài học"
              gradient
              className="h-2"
            />
          </div>
          <div className="relative z-[1] flex flex-wrap items-center gap-3">
            <Link href={isSrs ? "/review" : `/lesson/${lesson!.book}/${lesson!.pageId}`} className={btnPrimary}>
              <Play size={16} strokeWidth={ICON_STROKE} aria-hidden="true" className="fill-current" />
              {isSrs ? "Ôn tập Flashcard ngay" : "Tiếp tục bài học"}
            </Link>
            <Link href="/my-vocab" className={btnGhost}>
              <BookOpen size={16} strokeWidth={ICON_STROKE} aria-hidden="true" />
              {isSrs ? "Xem sổ tay từ vựng" : "Xem danh sách từ"}
            </Link>
            <SegmentedTabs
              className="ml-auto w-full sm:ml-auto sm:w-auto"
              label="Chuyển trạng thái hero"
              tabs={[
                { key: "lesson", label: "Bài học" },
                { key: "srs", label: `Ôn tập SRS · ${s.srsDue}` },
              ]}
              value={tab}
              onChange={setTab}
            />
          </div>
        </>
      ) : (
        /* fallback: chưa có data — mời bắt đầu (Review Focus #1) */
        <div className="relative z-[1] mt-3">
          <h2 className="text-xl font-bold tracking-tight md:text-2xl">
            Bắt đầu hành trình HSK của bạn <span className="zh">学</span>
          </h2>
          <p className="mt-2 text-[13.5px] text-text-secondary">Chọn khóa học đầu tiên — mỗi ngày một chút là đủ.</p>
          <Link href="/course" className={`${btnPrimary} mt-4`}>
            Bắt đầu ngay
          </Link>
          <SegmentedTabs
            className="mt-4"
            label="Chuyển trạng thái hero"
            tabs={[
              { key: "lesson", label: "Bài học" },
              { key: "srs", label: `Ôn tập SRS · ${s.srsDue}` },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>
      )}
    </section>
  );
}
```

Với 2 hằng class ở đầu file (CTA là **Link** vì mock dùng điều hướng — test ở Step 1 assert bằng `getByRole("link", …)`):

```tsx
const btnPrimary = "inline-flex min-h-12 items-center justify-center gap-2 rounded-control border border-transparent bg-action-primary px-6 text-[15px] font-semibold text-white hover:bg-action-primary-hover active:bg-action-primary-active focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2";
const btnGhost = "inline-flex min-h-12 items-center justify-center gap-2 rounded-control border border-border-default bg-surface-muted px-6 text-[15px] font-semibold text-text-primary hover:bg-surface-elevated hover:border-border-strong focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2";
```

Import tương ứng cần giữ: `Play`, `BookOpen`, `ICON_STROKE` từ `@/components/ui/icon`; bỏ import `Button` (không dùng nữa trong file này).

- [ ] **Step 4: Run verify PASS**

Run: `cd app-next && pnpm vitest run src/components/home/__tests__/hero-action.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app-next/src/components/home/hero-action.tsx app-next/src/components/home/__tests__/hero-action.test.tsx
git commit -m "feat(home): hero-action 2 tab lesson/srs watermark + CTA that (port .hero)"
```

---

### Task 14: `HabitLoop` — 3 thói quen

**Files:**
- Create: `app-next/src/components/home/habit-loop.tsx`
- Test: `app-next/src/components/home/__tests__/habit-loop.test.tsx`

**Interfaces:**
- Consumes: `useHomeSummary` (Task 10), `Chip` tones mới (Task 3), `IconTile` (Task 7), `Progress` bare (Task 4).
- Produces: default export client component. Card 1 "Bài học mới · 新课" (tone `doing`, icon `BookOpen` vermilion, step-mini Progress + link "Xem tóm tắt bài →" → `/lesson/{book}/{pageId}`; khi không có bài → tone `idle`, link → `/course`). Card 2 "Ôn tập ngắt quãng · 复习" (tone `todo` khi `srsDue>0` / `idle` khi 0, icon `Copy`-kiểu brain → dùng `Layers`, amber) + nút "Ôn tập ngay" → `/review`. Card 3 "Phản xạ âm thanh · 跟读" (tone `idle`, icon `Headphones`, jade) + nút "Bắt đầu · 2 phút" → `/shadowing`.

- [ ] **Step 1: Viết failing test**

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import HabitLoop from "../habit-loop";

beforeEach(() => localStorage.clear());

describe("HabitLoop (spec 2026-10-04)", () => {
  it("hiện 3 bước với số 1/2/3", async () => {
    render(<HabitLoop />);
    for (const n of ["1", "2", "3"]) {
      expect(await screen.findByText(n, { selector: "span" })).toBeInTheDocument();
    }
  });
  it("SRS due=0 → card 2 tone idle 'CHƯA CÓ TỪ ĐẾN HẠN'", async () => {
    render(<HabitLoop />);
    expect(await screen.findByText(/CHƯA CÓ TỪ ĐẾN HẠN|CHƯA BẮT ĐẦU/)).toBeInTheDocument();
  });
  it("SRS due>0 → tone todo + số từ", async () => {
    localStorage.setItem(
      "nhai.srs.items",
      JSON.stringify({ k: { key: "k", status: "new", dueAt: Date.now() - 100, reviewCount: 0, lastReviewedAt: null, updatedAt: 1 } })
    );
    render(<HabitLoop />);
    expect(await screen.findByText(/CẦN LÀM · 1/)).toBeInTheDocument();
  });
  it("nút card 2 trỏ /review, card 3 trỏ /shadowing", async () => {
    render(<HabitLoop />);
    expect((await screen.findByRole("link", { name: /Ôn tập ngay/ })).getAttribute("href")).toBe("/review");
    expect(screen.getByRole("link", { name: /Bắt đầu · 2 phút/ }).getAttribute("href")).toBe("/shadowing");
  });
});
```

- [ ] **Step 2: Run verify FAIL**

Run: `cd app-next && pnpm vitest run src/components/home/__tests__/habit-loop.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Viết `habit-loop.tsx`**

```tsx
"use client";

/* Habit loop 3 bước (port section habit-loop của opendesign index.html, spec 2026-10-04).
   Status tone: doing (đang làm) / todo (cần làm) / idle (chưa bắt đầu) — Chip tones Task 3.
   Dữ liệu đồng bộ hero qua useHomeSummary (event nhai:progress). */

import Link from "next/link";
import { BookOpen, Headphones, Layers, ICON_STROKE } from "@/components/ui/icon";
import { Chip } from "@/components/ui/chip";
import { IconTile } from "@/components/ui/icon-tile";
import { Progress } from "@/components/ui/progress";
import { useHomeSummary } from "@/lib/home-summary";

const linkMini = "inline-flex min-h-11 items-center gap-1.5 text-[13px] font-bold text-text-primary underline underline-offset-[3px] hover:text-action-primary";

export default function HabitLoop() {
  const s = useHomeSummary();
  const lesson = s.mounted ? s.lesson : null;
  const srsTone = !s.mounted ? "idle" : s.srsDue > 0 ? "todo" : "idle";

  return (
    <section aria-label="Vòng lặp thói quen mỗi ngày">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="text-[15px] font-bold tracking-tight">Vòng lặp 3 thói quen hôm nay</h3>
        <p className="text-[12.5px] text-text-secondary">Ước tính: ~15 phút hoàn thành</p>
      </div>
      <div className="mt-3 flex snap-x gap-3 overflow-x-auto pb-2 max-md:-mx-4 max-md:px-4 md:grid md:grid-cols-3 md:gap-4">
        {/* Bước 1 — bài học mới */}
        <article className="flex min-w-[250px] snap-start shrink-0 flex-col gap-2.5 rounded-card border border-border-default bg-surface-elevated p-[18px] shadow-xs transition-transform hover:-translate-y-1 hover:shadow-md md:min-w-0">
          <div className="flex items-start justify-between">
            <span className="flex items-center gap-2">
              <span className="grid h-[22px] w-[22px] place-items-center rounded-full border border-border-default bg-surface-elevated text-[11px] font-extrabold text-text-secondary">1</span>
              <IconTile tone="vermilion"><BookOpen size={18} strokeWidth={ICON_STROKE} aria-hidden="true" /></IconTile>
            </span>
            <Chip tone={lesson ? "doing" : "idle"} className="min-h-7 px-2.5 text-[11px] font-bold tracking-[0.08em]">
              {lesson ? "ĐANG THỰC HIỆN" : "CHƯA BẮT ĐẦU"}
            </Chip>
          </div>
          <h4 className="text-[14.5px] leading-snug">Bài học mới <span className="zh">· 新课</span></h4>
          <p className="text-[13px] leading-relaxed text-text-secondary">
            {lesson ? <>Đang học: <b className="text-text-primary">{lesson.title}</b> · đồng bộ với Hero.</> : "Chưa có bài đang học — bắt đầu từ khóa học đầu tiên."}
          </p>
          {lesson && (
            <div className="mt-auto flex items-center gap-2.5 rounded-control border border-border-default bg-surface-muted px-3 py-2.5">
              <Progress value={lesson.pct} ariaLabel="Tiến độ bài" className="flex-1 h-1.5" />
              <span className="text-xs font-extrabold">{lesson.pct}%</span>
            </div>
          )}
          <Link href={lesson ? `/lesson/${lesson.book}/${lesson.pageId}` : "/course"} className={`${linkMini} mt-auto`}>
            {lesson ? "Xem tóm tắt bài →" : "Chọn khóa học →"}
          </Link>
        </article>

        {/* Bước 2 — SRS */}
        <article className="flex min-w-[250px] snap-start shrink-0 flex-col gap-2.5 rounded-card border border-border-default bg-surface-elevated p-[18px] shadow-xs transition-transform hover:-translate-y-1 hover:shadow-md md:min-w-0">
          <div className="flex items-start justify-between">
            <span className="flex items-center gap-2">
              <span className="grid h-[22px] w-[22px] place-items-center rounded-full border border-border-default bg-surface-elevated text-[11px] font-extrabold text-text-secondary">2</span>
              <IconTile tone="amber"><Layers size={18} strokeWidth={ICON_STROKE} aria-hidden="true" /></IconTile>
            </span>
            <Chip tone={srsTone} className="min-h-7 px-2.5 text-[11px] font-bold tracking-[0.08em]">
              {s.srsDue > 0 ? `CẦN LÀM · ${s.srsDue}` : srsTone === "todo" ? "CẦN LÀM" : "CHƯA CÓ TỪ ĐẾN HẠN"}
            </Chip>
          </div>
          <h4 className="text-[14.5px] leading-snug">Ôn tập ngắt quãng <span className="zh">· 复习</span></h4>
          <p className="text-[13px] leading-relaxed text-text-secondary">
            {s.srsDue > 0 ? (
              <>{s.srsDue} từ đến hạn hôm nay · Tỉ lệ nhớ <b className="text-text-primary">{s.recallPct}%</b>.</>
            ) : (
              "Không có từ đến hạn — hãy lưu thêm từ mới vào SRS."
            )}
          </p>
          <Link
            href="/review"
            className="mt-auto inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-control border border-border-default bg-surface-muted text-[13.5px] font-bold text-text-primary hover:bg-surface-elevated hover:border-border-strong focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2"
          >
            Ôn tập ngay
          </Link>
        </article>

        {/* Bước 3 — shadowing */}
        <article className="flex min-w-[250px] snap-start shrink-0 flex-col gap-2.5 rounded-card border border-border-default bg-surface-elevated p-[18px] shadow-xs transition-transform hover:-translate-y-1 hover:shadow-md md:min-w-0">
          <div className="flex items-start justify-between">
            <span className="flex items-center gap-2">
              <span className="grid h-[22px] w-[22px] place-items-center rounded-full border border-border-default bg-surface-elevated text-[11px] font-extrabold text-text-secondary">3</span>
              <IconTile tone="jade"><Headphones size={18} strokeWidth={ICON_STROKE} aria-hidden="true" /></IconTile>
            </span>
            <Chip tone="idle" className="min-h-7 px-2.5 text-[11px] font-bold tracking-[0.08em]">CHƯA BẮT ĐẦU</Chip>
          </div>
          <h4 className="text-[14.5px] leading-snug">Phản xạ âm thanh <span className="zh">· 跟读</span></h4>
          <p className="text-[13px] leading-relaxed text-text-secondary">Shadowing theo video: nghe — nhại — so sánh.</p>
          <Link
            href="/shadowing"
            className="mt-auto inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-control border border-border-default bg-surface-muted text-[13.5px] font-bold text-text-primary hover:bg-surface-elevated hover:border-border-strong focus-visible:outline-none focus-visible:ring-3 ring-action-focus ring-offset-2"
          >
            Bắt đầu · 2 phút
          </Link>
        </article>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Run verify PASS**

Run: `cd app-next && pnpm vitest run src/components/home/__tests__/habit-loop.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app-next/src/components/home/habit-loop.tsx app-next/src/components/home/__tests__/habit-loop.test.tsx
git commit -m "feat(home): habit-loop 3 buoc status doing/todo/idle (port section habit)"
```

---

### Task 15: `ProgressMatrix` — lộ trình + quick tools

**Files:**
- Create: `app-next/src/components/home/progress-matrix.tsx`
- Test: `app-next/src/components/home/__tests__/progress-matrix.test.tsx`

**Interfaces:**
- Consumes: `useHomeSummary` (Task 10), `DonutRing` (Task 5).
- Produces: default export client component; grid 2 cột (`md:grid-cols-[1.05fr_0.95fr]`, < md 1 cột). Card A "Lộ trình HSK" — `DonutRing` 96px màu `var(--action-primary)`, giữa ring `pct%` + `vocabMastered/vocabTotal`; 3 hàng `.mrow`: Từ vựng, Bài học, SRS; link "Xem toàn bộ lộ trình →" → `/roadmap`. Card B "Công cụ bổ trợ nhanh" — 4 link: Hanzi Studio 写字 → `/hanzi`, Bảng âm Pinyin → `/pinyin`, Sổ tay từ vựng → `/my-vocab`, Thư viện đọc hiểu → `/reading`.

- [ ] **Step 1: Viết failing test**

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ProgressMatrix from "../progress-matrix";

beforeEach(() => localStorage.clear());

describe("ProgressMatrix (spec 2026-10-04)", () => {
  it("ring + các hàng thống kê không NaN khi localStorage rỗng", async () => {
    render(<ProgressMatrix />);
    expect(await screen.findByRole("img", { name: /từ/ })).toBeInTheDocument();
    expect(screen.getByText(/0 \//)).toBeInTheDocument(); // "0 / N từ đã nhớ"
    expect(screen.getByRole("link", { name: /Xem toàn bộ lộ trình/ })).toHaveAttribute("href", "/roadmap");
  });
  it("4 quick tools trỏ đúng route", async () => {
    render(<ProgressMatrix />);
    for (const [name, href] of [
      [/Hanzi Studio/, "/hanzi"],
      [/Bảng âm Pinyin/, "/pinyin"],
      [/Sổ tay từ vựng/, "/my-vocab"],
      [/Thư viện đọc hiểu/, "/reading"],
    ] as const) {
      expect((await screen.findByRole("link", { name })).getAttribute("href")).toBe(href);
    }
  });
  it("có SRS learned → số từ đã nhớ > 0", async () => {
    localStorage.setItem(
      "nhai.srs.items",
      JSON.stringify({
        a: { key: "a", status: "learned", dueAt: null, reviewCount: 2, lastReviewedAt: 1, updatedAt: 1 },
        b: { key: "b", status: "known", dueAt: null, reviewCount: 3, lastReviewedAt: 1, updatedAt: 1 },
      })
    );
    render(<ProgressMatrix />);
    expect(await screen.findByText(/2 \//)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run verify FAIL**

Run: `cd app-next && pnpm vitest run src/components/home/__tests__/progress-matrix.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Viết `progress-matrix.tsx`**

```tsx
"use client";

/* Progress matrix (port section .matrix của opendesign index.html, spec 2026-10-04):
   card Lộ trình (donut + stat rows) + card Công cụ bổ trợ nhanh. */

import Link from "next/link";
import { BookOpenText, BookmarkCheck, PenTool, Target, Volume2, ICON_STROKE } from "@/components/ui/icon";
import { DonutRing } from "@/components/ui/donut-ring";
import { IconTile } from "@/components/ui/icon-tile";
import { useHomeSummary } from "@/lib/home-summary";

const TOOLS = [
  { href: "/hanzi", name: "Hanzi Studio", zh: "写字", desc: "Luyện viết nét & bộ thủ", Icon: PenTool },
  { href: "/pinyin", name: "Bảng âm Pinyin", zh: null, desc: "Quy tắc ngữ âm & biến điệu", Icon: Volume2 },
  { href: "/my-vocab", name: "Sổ tay từ vựng", zh: null, desc: "Từ đã lưu & ghi chú", Icon: BookmarkCheck },
  { href: "/reading", name: "Thư viện đọc hiểu", zh: null, desc: "Truyện ngắn theo cấp độ", Icon: BookOpenText },
] as const;

export default function ProgressMatrix() {
  const s = useHomeSummary();
  const pct = s.vocabTotal > 0 ? Math.round((s.vocabMastered / s.vocabTotal) * 100) : 0;

  return (
    <section aria-label="Tiến độ tổng thể và công cụ" className="grid gap-4 md:grid-cols-[1.05fr_0.95fr]">
      {/* Card A — lộ trình */}
      <div className="rounded-card border border-border-default bg-surface-elevated p-5 shadow-xs">
        <h3 className="flex items-center gap-2 text-[14.5px] font-bold">
          <Target size={16} strokeWidth={ICON_STROKE} aria-hidden="true" className="text-text-secondary" />
          Lộ trình HSK
        </h3>
        <p className="mb-4 mt-1.5 text-[13px] text-text-secondary">Nắm vững nền tảng trước khi lên cấp tiếp theo</p>
        <div className="flex items-center gap-4">
          <DonutRing value={s.mounted ? s.vocabMastered : 0} total={s.vocabTotal} size={96} strokeWidth={9} label={`Đã nhớ ${s.vocabMastered} trên ${s.vocabTotal} từ, đạt ${pct} phần trăm`}>
            <text x="48" y="46" textAnchor="middle" fontSize="19" fontWeight="800" fill="var(--text-primary)">
              {pct}%
            </text>
            <text x="48" y="62" textAnchor="middle" fontSize="10.5" fill="var(--text-secondary)">
              {s.vocabMastered}/{s.vocabTotal}
            </text>
          </DonutRing>
          <div className="leading-tight">
            <b className="block text-[22px] tracking-tight">{s.vocabMastered} / {s.vocabTotal} từ đã nhớ</b>
            <span className="text-[12.5px] text-text-secondary">Từ vựng đã lưu vào SRS · học xong sẽ tự cập nhật</span>
          </div>
        </div>
        <div className="mt-2 border-t border-border-default">
          {[
            ["Từ vựng đã nhớ", `${s.vocabMastered} / ${s.vocabTotal} · ${pct}%`],
            ["Bài học", `${s.lessonsDone} / ${s.lessonsTotal} xong`],
            ["Ôn tập SRS", `${s.recallPct}% ghi nhớ`],
          ].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between border-b border-border-default py-2.5 text-[13px] last:border-b-0">
              <span className="text-text-secondary">{k}</span>
              <b className="tabular-nums">{v}</b>
            </div>
          ))}
        </div>
        <Link
          href="/roadmap"
          className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-[13.5px] font-bold text-action-primary hover:underline"
        >
          Xem toàn bộ lộ trình <span aria-hidden="true">→</span>
        </Link>
      </div>

      {/* Card B — công cụ */}
      <div className="rounded-card border border-border-default bg-surface-elevated p-5 shadow-xs">
        <h3 className="text-[14.5px] font-bold">Công cụ bổ trợ nhanh</h3>
        <p className="mb-4 mt-1.5 text-[13px] text-text-secondary">Mở trong 1 chạm · tự lưu tiến độ</p>
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2">
          {TOOLS.map(({ href, name, zh, desc, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex min-h-[76px] items-start gap-3 rounded-control border border-border-default bg-surface-muted p-3.5 text-left transition-transform hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface-elevated hover:shadow-md"
            >
              <IconTile className="bg-surface-elevated">
                <Icon size={17} strokeWidth={ICON_STROKE} aria-hidden="true" />
              </IconTile>
              <span className="min-w-0">
                <b className="block text-[13.5px] leading-snug">
                  {name} {zh && <span className="zh">{zh}</span>}
                </b>
                <small className="mt-0.5 block text-xs leading-snug text-text-secondary">{desc}</small>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
```

Lưu ý: `DonutRing` ở đây render `children` `<text>` với toạ độ cứng cho size 96 — khớp viewBox mặc định; nếu đổi size phải đổi toạ độ (ghi chú trong code nếu cần).

- [ ] **Step 4: Run verify PASS**

Run: `cd app-next && pnpm vitest run src/components/home/__tests__/progress-matrix.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app-next/src/components/home/progress-matrix.tsx app-next/src/components/home/__tests__/progress-matrix.test.tsx
git commit -m "feat(home): progress-matrix donut loi trinh + 4 quick tools (port .matrix)"
```

---

### Task 16: `page.tsx` compose + xoá `ContinueCard` + layout padding

**Files:**
- Modify: `app-next/src/app/(app)/page.tsx` (viết lại)
- Modify: `app-next/src/app/(app)/layout.tsx` (padding đáy cho bottom-nav < md)
- Delete: `app-next/src/components/home/continue-card.tsx` + `__tests__/continue-card.test.tsx`

**Interfaces:**
- Consumes: 4 section component từ Task 13–15.
- Produces: Trang chủ mới = glance + hero + habit + matrix. Glance header nằm trong `glance-greeting.tsx` (client island — chào + ngày + StreakPill full + goal ring; lệch tên file so với spec `glance-header.tsx` vì nửa server của glance chỉ là footer link, gọn hơn để island tự chứa số liệu). Footer link Facebook group của trang chủ cũ được giữ lại.

- [ ] **Step 1: Viết `page.tsx` mới**

```tsx
import Link from "next/link";
import GlanceGreeting from "@/components/home/glance-greeting";
import HeroAction from "@/components/home/hero-action";
import HabitLoop from "@/components/home/habit-loop";
import ProgressMatrix from "@/components/home/progress-matrix";

export const metadata = {
  title: "Trang chủ",
  description: "Hành trình HSK mỗi ngày — một chút là đủ.",
};

/* Glance header tĩnh (server-safe): CTA nhóm Facebook giữ lại từ trang chủ cũ,
   phần số liệu (chào theo giờ, streak, goal) là client island GlanceGreeting. */
export default function HomePage() {
  return (
    <div className="flex flex-col gap-4">
      <GlanceGreeting />
      <HeroAction />
      <HabitLoop />
      <ProgressMatrix />
      <footer className="py-4 text-center text-xs text-text-secondary">
        Học cùng cộng đồng:{" "}
        <Link
          className="font-semibold text-action-primary underline"
          href="https://www.facebook.com/groups/nhaihsk"
          target="_blank"
          rel="noreferrer"
        >
          Nhai tiếng Trung mỗi ngày
        </Link>
      </footer>
    </div>
  );
}
```

- [ ] **Step 2: Viết `glance-greeting.tsx` (client island)**

Create: `app-next/src/components/home/glance-greeting.tsx`

```tsx
"use client";

/* Glance header (port .glance của opendesign index.html, spec 2026-10-04):
   chào theo giờ (hanzi) + ngày, streak full pill + goal ring 44px (DAILY_GOAL_XP).
   Client island vì đọc localStorage qua useHomeSummary. */

import { DonutRing } from "@/components/ui/donut-ring";
import { StreakPill } from "@/components/ui/streak-pill";
import { useHomeSummary, DAILY_GOAL_XP } from "@/lib/home-summary";

function greeting(): string {
  const h = new Date().getHours();
  return h < 11 ? "早上好" : h < 18 ? "下午好" : "晚上好";
}

export default function GlanceGreeting() {
  const s = useHomeSummary();
  const goalPct = Math.min(100, Math.round((s.todayXp / DAILY_GOAL_XP) * 100));
  const today = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <section aria-label="Tổng quan hôm nay" className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[26px] font-bold leading-tight tracking-tight">
          <span className="zh text-[1.06em]">{greeting()}</span>, chào bạn!
        </h1>
        <p className="mt-2 text-[13.5px] capitalize text-text-secondary">{today}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {s.mounted && <StreakPill days={s.streak} variant="full" />}
        <div
          title={`Mục tiêu mỗi ngày ${DAILY_GOAL_XP} XP`}
          className="flex items-center gap-2.5 rounded-control border border-border-default bg-surface-elevated p-2 pr-3.5 shadow-xs"
        >
          <DonutRing
            value={s.mounted ? s.todayXp : 0}
            total={DAILY_GOAL_XP}
            size={44}
            strokeWidth={5}
            color="var(--hz-jade)"
            label={`Hôm nay ${s.todayXp} trên ${DAILY_GOAL_XP} XP`}
          >
            <text x="22" y="26" textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--text-primary)">
              {s.todayXp}′
            </text>
          </DonutRing>
          <div className="leading-tight">
            <b className="block text-sm">{s.todayXp}/{DAILY_GOAL_XP} XP</b>
            <small className="block text-[11.5px] text-text-secondary">Hôm nay · mục tiêu {DAILY_GOAL_XP} XP</small>
          </div>
        </div>
      </div>
    </section>
  );
}
```

Chú ý text giữa ring size 44 dùng toạ độ viewBox 44 (x=22, y=26) — khớp vì `viewBox` theo `size`.

- [ ] **Step 3: Sửa `(app)/layout.tsx`**

```tsx
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-5xl px-4 py-6 pb-28 md:px-6 md:pb-6">{children}</div>;
}
```

(`max-w-5xl` = 1024px trùng đúng `.page` của mock; `pb-28` chừa bottom-nav < md.)

- [ ] **Step 4: Xoá ContinueCard + test cũ**

```bash
git rm app-next/src/components/home/continue-card.tsx app-next/src/components/home/__tests__/continue-card.test.tsx
grep -rn "continue-card\|ContinueCard" app-next/src
```
Expected: grep không còn match (page.tsx cũ là nơi duy nhất dùng).

- [ ] **Step 5: Run toàn bộ unit test**

Run: `cd app-next && pnpm vitest run 2>&1 | tail -8`
Expected: PASS toàn bộ (tests home cũ đã xoá, tests mới từ Task 5–15 pass).

- [ ] **Step 6: Commit**

```bash
git add "app-next/src/app/(app)/page.tsx" "app-next/src/app/(app)/layout.tsx" app-next/src/components/home/glance-greeting.tsx
git rm app-next/src/components/home/continue-card.tsx app-next/src/components/home/__tests__/continue-card.test.tsx
git commit -m "feat(home): trang chu moi = glance+hero+habit+matrix, xoá ContinueCard va section cu"
```

---

### Task 17: E2E + kiểm chứng visual + dọn	variant cũ

**Files:**
- Modify: `app-next/e2e/scaffold.spec.ts`, `app-next/e2e/hydration.spec.ts` (chỉ nơi selector/text cũ vỡ)
- Verify: toàn bộ suite + dev server

**Interfaces:**
- Consumes: mọi task trước.

- [ ] **Step 1: Chạy e2e, ghi lỗi selector**

Run: `cd app-next && pnpm exec playwright test 2>&1 | tail -30`
Expected: có thể FAIL ở những spec click "Đăng nhập"/"Menu" trên topbar cũ hoặc assert text trang chủ cũ. Nếu spec click "Đăng nhập" → đổi selector sang `getByRole("button", { name: "Đăng nhập" })` (avatar logged-out giữ aria-label "Đăng nhập" nên selector này vẫn đúng). Nếu spec assert text "Học tiếp"/"Trang chủ cũ" → đổi theo DOM mới (`/Tiếp tục|Bắt đầu/`, sections mới). Sửa tối thiểu, không đổi ý nghĩa test.

- [ ] **Step 2: Chạy lại e2e**

Run: `cd app-next && pnpm exec playwright test`
Expected: PASS toàn bộ.

- [ ] **Step 3: Soi visual light/dark + breakpoint**

Run: `cd app-next && pnpm dev` (chờ port 3100). Mở `http://127.0.0.1:3100` bằng browser tool:
- Kiểm tra từng breakpoint 420 / 760 / 1024 px: topbar ẩn search <900, ẩn goal/streak <760, bottom-nav hiện <768, page padding đúng.
- Toggle dark mode: nền `#111318`, primary `#E05349`, amber-wash tối — không còn chỗ nào "jade cũ" (`#0f766e`) lọt lại.
- Kiểm tra 1 màn học (vd `/review`, `/lesson/hsk1/lesson-1`) chưa vỡ layout sau khi đổi token/radius (danger button vẫn đỏ đậm `#a9342b`, khác primary `#c83c32` — Review Focus #5).
- So sánh trực tiếp với `opendesign_hsk/index.html` mở bằng file:// — layout/màu/tỷ lệ phải khớp.

- [ ] **Step 4: Sửa lỗi tìm được ở Step 3** (nếu có) rồi chạy lại `pnpm vitest run && pnpm exec playwright test`. Expected: PASS toàn bộ.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "fix(home): cap nhat e2e + visual fix sau khi soi light/dark theo spec 2026-10-04"
```

(Chỉ `git add -A` trong `app-next/e2e/` và các file fix — kiểm tra `git status` trước, không add file lạ.)

---

## Phụ lục: mapping giá trị mock → token (tham khảo nhanh executor)

| Mock CSS | Giá trị light | Dark | Token app |
|---|---|---|---|
| `--bg` | `#FAF9F5` | `#111318` | `--hz-paper` |
| `--surface` | `#f1f3f2` | `#1a1d24` | `--hz-surface` → `--surface-muted` |
| `--elev` | `#ffffff` | `#1c2029` | `--hz-elevated` |
| `--fg` | `#1f2a27` | `#eceeed` | `--hz-ink` |
| `--muted` | `#66756f` | `#9aa3a0` | `--hz-slate` |
| `--border` | `#e8ecea` | `#2a2f37` | `--hz-line` |
| `--accent` | `#C83C32` | `#E05349` | `--action-primary` |
| `--accent-hover` | `#B33229` | `#c7453c` | `--action-primary-hover` |
| `--accent-600` | `#d24b3f` | `#E05349` | `--action-focus`, `--hz-vermilion-600` |
| `--jade` | `#2D7D5B` | `#4caf8a` | `--hz-jade`, `--learning-mastered` |
| `--amber` | `#e68a00` | `#dcaa37` | `--hz-amber`, `--learning-streak` |
| `--amber-wash` | `#fdf3e2` | `#312512` | `--hz-amber-wash` |
| `--amber-ink` | `#5c3600` (todo: `#7a4a00`) | `#f5d98b` | `--hz-amber-ink` |
| `--ring-track` | `#e8ecea` | `#3e3e3e` | `--hz-ring-track` |
| `--r` / `--r-card` | 8px / 16px | — | `--radius-control` / `--radius-card` |
| `.btn-ghost` | nền surface | — | Button `ghost` (Task 2) |
| `.hero-toggle` | pill surface | — | `SegmentedTabs` (Task 6) |
| `#masteryArc` / `#goalArc` | SVG donut | — | `DonutRing` (Task 5) |
| `.status.doing/todo/idle` | chip nhỏ | — | `Chip` tones (Task 3) |
