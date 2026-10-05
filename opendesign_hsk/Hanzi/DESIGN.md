# Hanzi

---
name: "Hanzi"
category: Brands
surface: web
colors:
  paper: "#fafbfa"
  elevated: "#ffffff"
  ink: "#1f2a27"
  slate: "#66756f"
  line: "#e8ecea"
  jade: "#2d7d5b"
  vermilion: "#c83c32"
---

# Hanzi

> Category: Brands

> Surface: web

*Know what to learn. Practice it. See progress.*

Hanzi is a modern Chinese-learning webapp for HSK progression. Visual metaphor: Ink + Vermilion + Jade — Ink carries knowledge and typography, Vermilion is the primary action color (vermilion 600 #d24b3f for focus rings), Jade signals secondary progress and success accents. Amber owns streaks; purple marks AI features. Small error text uses vermilion 700 #A9342B to stay distinct from the primary action. Amber owns streaks; purple marks AI features. v1.1 keeps the seven core brand colors fixed and expresses new UI meaning through semantic and state tokens (surface/text/border/action/feedback/learning/feature). Calm-first layout where Chinese content is the hero and chrome stays quiet. Product promise: Know what to learn. Practice it. See progress. One primary action per learning screen; progress before decoration; feedback is specific and actionable; gamification motivates without visual noise; every HSK level feels like a destination.

## Color Palette

| Role | Name | Hex | Usage |
| --- | --- | --- | --- |
| background | Paper | `#fafbfa` | page canvas (semantic background default) |
| surface | Elevated | `#ffffff` | cards, panels and elevated surfaces |
| foreground | Ink | `#1f2a27` | body text and headings (ink 900 / textPrimary) |
| muted | Slate | `#66756f` | secondary text and metadata (ink 500 / textSecondary) |
| border | Line | `#e8ecea` | rules, dividers and card borders (ink 100) |
| accent | Vermilion | `#C83C32` | primary actions and brand signal (vermilion / brandPrimary; dark #E05349) |
| accent-secondary | Jade | `#2D7D5B` | progress accents, success signals, secondary arcs |

## Typography
- **Display:** Inter — weights 650, 700 — fallbacks: system-ui, -apple-system, Segoe UI, Helvetica Neue, Arial, sans-serif
- **Body:** Inter — weights 400, 500, 700 — fallbacks: system-ui, -apple-system, Segoe UI, Helvetica Neue, Arial, sans-serif
- **Mono:** ui-monospace — weights 400, 500 — fallbacks: ui-monospace, SFMono-Regular, Menlo, monospace

## Voice & Tone

- **Adjectives:** focused, warm, intelligent, modern, encouraging, culturally respectful
- **Tone:** A calm, encouraging study coach. Direct and practical: the next action is obvious within 2 seconds, progress comes before decoration, and mistakes get explanations — not punishment.

### Messaging pillars
- HSK progression path: every level feels like a destination, readiness labeled as an internal estimate
- Chinese content is the hero: hanzi 32-64px primary, pinyin 14-18px secondary, translation 14-16px tertiary — never equal weight; Inter renders Latin UI, Noto Sans SC renders Chinese
- Feedback is specific and actionable: original, correction, reason, one improved example — never just right/wrong; learning states pair labels with icons and color, never green alone
- Calm practice loop: Learn, Practice, Review, See progress, Continue — gamification (XP, streaks, achievements) stays secondary; amber owns streaks, exam mode stays restrained
- Semantic tokens over primitives: surface/text/border/action/feedback/learning/feature layers keep the seven core colors fixed while states and themes evolve

### Vocabulary
- **Use:** Know what to learn. Practice it. See progress., Continue lesson / Start review / Try again, Again / Hard / Good / Easy (SRS actions, keys 1-4), Readiness (internal estimate, not an official HSK score), Tap any word (reading lookup), New / Learning / Familiar / Mastered / Due for review / Needs practice (state labels with icons)
- **Avoid:** excessive red/gold China cliches, a single Chinese score as the only progress metric, pinyin at hanzi weight, celebratory gamification during mock exams, walls of AI-generated text replacing structured curriculum, hover-only interactions hiding important information, vermilion 600 as small error text (use vermilion 700 #A9342B), hard-coding primitive hex in components instead of semantic tokens

## Imagery

- **Style:** Clean, calm learning UI — Chinese characters as the hero on a paper background with generous whitespace, soft 1px borders before shadows, and single-stroke Lucide icons.
- **Subjects:** hanzi hero characters at 32-64px, word cards with hanzi / pinyin / translation / example sentence, tone shape-plus-label diagrams, graded reading passages with tap-to-lookup, skill progress bars and HSK readiness
- **Treatment:** Noto Sans SC / PingFang SC renders Chinese learning content (never Inter for glyphs); Noto Serif SC only for long-form editorial reading. Borders before shadows (xs-md only for floating surfaces). 44px minimum touch targets; 52px+ answer choices; loading buttons preserve width.
- **Avoid:** excessive red/gold, dragons, lanterns, seals or ornamental patterns in core UI, rainbow HSK colors as the primary palette, encoding meaning by color alone, generic cartoon mascots unrelated to the lesson, pinyin set at the same visual weight as hanzi

## Layout

- **Radius:** 16px cards / 8px controls
- **Border weight:** 1px
- **Spacing:** 4px baseline grid

### Posture rules
- Cards: 16px radius, 20px padding, 1px #E8ECEA border; controls/inputs/buttons: 8px radius, 44px height (48px for hero CTAs)
- Content max-widths: lesson 760px, reading 820px, dashboard 1200px; page padding desktop 32 / tablet 24 / mobile 16
- One primary action per learning screen — lesson bottom bar pins primary right, secondary left; sticky primary on mobile
- Borders before shadows: default surfaces use borders; shadows (xs-md) only for dialogs and floating cards; borders have subtle/default/strong levels plus vermilion focus and vermilion-700 danger
- Desktop persistent sidebar (Learn/Review/Read/Practice/HSK); mobile bottom nav (Home/Learn/Review/Read/Profile)

### App shell (v2)
- **Sidebar:** 256px fixed at `lg` (≥1024px) — brand tile + grouped nav (Học tập cốt lõi / Kỹ năng & Luyện tập / Cá nhân & Công cụ) + footer (login/settings); below `lg` it becomes an off-canvas drawer (`-translate-x-full` → `translate-x-0`) with a 50% black scrim, opened by the topbar hamburger or the bottom-nav More button, closed by scrim click / Escape / nav link
- **Topbar:** 64px sticky — hamburger (`lg:hidden`), breadcrumb (page title + secondary date line hidden on mobile), search trigger with ⌘K hint, level popover, streak pill + theme toggle (right group `lg:` only)
- **Command palette:** ⌘K/Ctrl+K opens a full-viewport overlay (`fixed inset-0`, 50% black backdrop) with a centered 560px panel — never clipped inside the header; filter + Enter navigates, Escape closes
- **Bottom nav:** mobile only (`lg:hidden`), 5 items with the 5th ("More") opening the sidebar drawer
- Exam mode is restrained: minimal chrome, visible timer + counter, feedback hidden until end, no celebratory gamification
- States are first-class with visible focus (vermilion 3px ring, 2px offset): vocabulary states pair labels with icons and color; answers and inputs define default/hover/focus/selected/correct/error/disabled; small error text uses vermilion 700 #A9342B
- Components consume semantic tokens (text/surface/border/action/feedback/learning/feature), never hard-coded primitives; progress pairs every visual with a number and keeps streaks subordinate
