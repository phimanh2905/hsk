---
name: hanzi-design-system
description: Use when creating or modifying any UI in this project — pages, components, styling, theming, landing pages, dashboards, or lesson/practice/review screens — so output follows the Hanzi brand (HSK Chinese-learning app) instead of inventing colors, fonts, or layout.
---

# Hanzi Design System

**Single source of truth:** [`opendesign_hsk/Hanzi/DESIGN.md`](../../../opendesign_hsk/Hanzi/DESIGN.md) — read it before writing any UI code. The rendered kit and design tokens live in [`opendesign_hsk/Hanzi/system/`](../../../opendesign_hsk/Hanzi/system/) (`tokens.*.json`, `variables.css`, `theme.json`, `kit.html`).

## Core rules

- **Palette (7 core colors, fixed):** Paper `#fafbfa` background, Elevated `#ffffff` surfaces, Ink `#1f2a27` text, Slate `#66756f` muted, Line `#e8ecea` borders, Vermilion `#C83C32` primary actions (vermilion 600 `#d24b3f` focus rings), Jade `#2D7D5B` secondary progress/success. Small error text uses vermilion 700 `#A9342B`.
- **Semantic tokens over primitives:** components consume surface/text/border/action/feedback/learning/feature tokens — never hard-code the hex above in components.
- **Typography:** Inter for Latin UI; Noto Sans SC / PingFang SC for hanzi (never Inter for glyphs). Hanzi 32–64px hero, pinyin 14–18px, translation 14–16px — never equal weight.
- **Layout:** 16px card radius / 8px controls, 1px borders (borders before shadows), 4px spacing grid, content max-widths 760/820/1200px, 44px min touch targets, one primary action per learning screen.
- **Voice:** calm encouraging study coach; feedback gives original + correction + reason + example, never just right/wrong.

## Common mistakes

- Vermilion/gold China cliches (dragons, lanterns, seals) in core UI
- Hard-coding primitive hex instead of semantic tokens
- Pinyin at the same visual weight as hanzi
- Encoding meaning by color alone (pair labels with icons)
- Celebratory gamification during mock exams — exam mode stays restrained

When a design decision is unclear, resolve it against DESIGN.md's relevant section rather than inventing a value.
