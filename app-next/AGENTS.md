<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Design system: Hanzi

All UI work in this app must follow the Hanzi design system — `../opendesign_hsk/Hanzi/DESIGN.md` is the single source of truth (identity, palette, typography, voice, layout). Rendered kit and design tokens live in `../opendesign_hsk/Hanzi/system/` (`tokens.*.json`, `variables.css`, `theme.json`).

Quick anchors:

- 7 core colors fixed: Paper `#fafbfa`, Elevated `#ffffff`, Ink `#1f2a27`, Slate `#66756f`, Line `#e8ecea`, Vermilion `#C83C32` (primary action; focus ring = vermilion 600 `#d24b3f`; small error text = vermilion 700 `#A9342B`; dark #E05349), Jade `#2D7D5B` (secondary progress/success)
- Components consume semantic tokens (surface/text/border/action/feedback/learning/feature) — never hard-coded primitives; `--color-jade` = fill progress/node done của roadmap serpentine (port roadmap.html)
- Inter for Latin UI, Noto Sans SC / PingFang SC for hanzi glyphs
- 16px card radius / 8px controls, 1px borders before shadows, 4px spacing grid, 44px min touch targets, one primary action per learning screen

See also the project skill `.zcode/skills/hanzi-design-system/SKILL.md` for the full usage guide.
