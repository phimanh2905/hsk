# AGENTS.md

## Repo layout

| Directory | Role |
|---|---|
| `app-next/` | The real app — Next.js 16 App Router + TypeScript strict + Tailwind v4, deployed to Cloudflare Workers via `@opennextjs/cloudflare`. All work happens here. |
| `clone/` | Static HTML/JS reference of the original site (no build step). Use only to compare UI/behavior when porting; never deploy. |
| `opendesign_hsk/Hanzi/` | Design system source of truth (`DESIGN.md`, tokens, `variables.css`). |

There is no root `package.json` — everything runs from `app-next/` with pnpm.

## Commands (run from `app-next/`)

```bash
pnpm dev             # dev server on port 3100 (port is fixed: matches BETTER_AUTH_URL and Google OAuth redirect URI)
pnpm typecheck       # tsc --noEmit
pnpm lint            # eslint
pnpm test            # vitest run
pnpm vitest run src/lib/store/__tests__/progress-store.test.ts   # single test file
pnpm vitest run -t "name of test"                                # single test by name
pnpm test:e2e        # playwright test (auto-starts `pnpm dev` on :3100, reuses an existing one)
pnpm preview         # build + run worker locally via workerd (:8787)
pnpm run deploy      # build + deploy to Cloudflare Workers (CI also does this on push to main)
```

Deploy goes through GitHub Actions on `main` (needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` repo secrets); local deploy needs `wrangler login` once.

### Database (D1 + Drizzle)

- Schema: `app-next/src/lib/db/schema.ts`; `drizzle-kit generate` produces SQL in `app-next/drizzle/` — but apply migrations with wrangler (`d1 migrations apply`), never `drizzle-kit migrate`.
- Seed content (vocab, shadowing) lives in D1 tables `content_*`. After pulling new migrations, seed locally:
  ```bash
  pnpm dlx tsx scripts/seed/gen-vocab-seed.mts
  pnpm dlx tsx scripts/seed/gen-shadowing-seed.mts
  pnpm wrangler d1 migrations apply hsk --local
  pnpm wrangler d1 execute hsk --local --file drizzle/seeds/content-vocabs.sql
  pnpm wrangler d1 execute hsk --local --file drizzle/seeds/content-shadowing.sql
  ```
- Seed SQL files in `drizzle/seeds/` are generator output — never edit by hand. Seeds are idempotent (`INSERT OR REPLACE`).

## Gotchas (each one has already bitten once)

1. Port 3100 is intentional (matches `.env.local` `BETTER_AUTH_URL` + Google Cloud Console redirect). Changing it means changing all three.
2. `NEXT_PUBLIC_SITE_URL` lives in `app-next/.env.production` (committed, not a secret). Don't pass an empty env var in CI — an empty string overrides `.env` and `new URL("")` explodes at build. Changing the URL requires `rm -rf .next` or `sitemap.xml` keeps the old one (the `deploy`/`preview` scripts already do this — don't remove it).
3. `opennextjs-cloudflare deploy` does not build; always use the `deploy` script (build && deploy).
4. `next dev` runs in plain Node with no Cloudflare bindings — `next.config.ts` calls `initOpenNextCloudflareForDev({ configPath: "./wrangler.dev.jsonc" })` so `getCloudflareContext().env.DB` exists locally. Dev reads the remote dev DB (`hsk-dev` via `wrangler.dev.jsonc`).
5. Next.js 16 has breaking changes vs. training data — read the relevant guide in `app-next/node_modules/next/dist/docs/` before writing Next.js code (see `app-next/AGENTS.md`).

## Architecture

- **Routes**: App Router under `src/app/` with route groups `(app)` (main shell + sidebar), `(wide)`, `(static-legal)`. Learning modes live in `src/app/(app)/`: `lesson`, `review`, `reading`, `shadowing`, `pinyin`, `roadmap`, `notebook`, `stats`, etc. API routes under `src/app/api/`.
- **Progress storage**: `src/lib/store/progress-store.ts` is the single interface over `localStorage` (keys prefixed `nhai.*` / legacy `bye.*` for clone compatibility). SP2 (auth + D1 sync) is not built yet — everything is per-device local.
- **Content data**: static TS datasets in `src/content/` (vocab, shadowing dialogues, radicals, pinyin, reading passages, …). Vocab + shadowing were dehardcoded into D1 (`content_*` tables) — seed scripts in `scripts/seed/` generate SQL from the TS sources. Other content is still TS-side.
- **Auth**: better-auth with Google OAuth; needs the D1 binding (see gotcha 4).
- **Audio/video**: `react-player` for shadowing video (YouTube); Kokoro TTS is vendored locally (`pnpm vendor:kokoro`, runs before dev/build). `Referrer-Policy: strict-origin-when-cross-origin` in `next.config.ts` is required for YouTube embeds (error 153 otherwise).
- **Design system**: Hanzi — all UI must follow `../opendesign_hsk/Hanzi/DESIGN.md` (7 fixed colors, semantic tokens, no hard-coded primitives, Inter + Noto Sans SC, 4px grid, 44px touch targets). Full usage guide: `app-next/.zcode/skills/hanzi-design-system/SKILL.md` and `app-next/AGENTS.md`.
- **Tests**: Vitest + Testing Library (`src/**/*.test.{ts,tsx}`, jsdom) and Playwright (`e2e/`). Path alias `@` → `src/`.

## Docs

- `docs/superpowers/specs/fullstack/` — full technical spec (`00-platform-data.md` = shared contract: auth, D1 schema, storage, sync, cache, API; 10–13 per domain).
- `docs/superpowers/specs/2026-09-30-hsk-feature-inventory.md` — feature inventory + port status.
- Root `README.md` — deploy/CI details and roadmap (SP1 done: UI port; SP2 pending: real auth + cross-device sync).

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **hsk** (7757 symbols, 17061 relationships, 610 execution flows).

> Index stale? Run `node .gitnexus/run.cjs analyze --index-only` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? Bootstrap with `npx`, `bunx`, or `pnpm dlx` — e.g. `bunx gitnexus@latest analyze` (npm 11 npx crash; #1939).

## Always Do

- **MUST run impact before editing.** Use `impact({target: "symbolName", direction: "upstream"})` or `node .gitnexus/run.cjs impact "symbolName" --direction upstream --repo .`; report callers, processes, and risk. Never substitute grep for graph analysis.
- **MUST analyze graph changes before committing.** Use `detect_changes({scope: "all"})` (MCP) or `node .gitnexus/run.cjs detect-changes --scope all --repo .` (CLI fallback). `partial: true` or `truncated: true` is not a clean check — a zero means unseen, not unaffected; re-run it. For regression review: `detect_changes({scope: "compare", base_ref: "main"})` or `node .gitnexus/run.cjs detect-changes --scope compare --base-ref "main" --repo .`.
- MUST warn on HIGH/CRITICAL `risk` pre-edit; never use `riskSharedAxes` to waive a HIGH/CRITICAL `risk` warning. Compare File/symbol: MCP File omits axes; Graph-RAG expands File.
- **MUST treat `risk: UNKNOWN` as unresolved, not as low.** An empty caller set is not evidence the symbol is unused — it can also mean the callers are not resolvable by the index (plain-object property access, dynamic dispatch, cross-language calls). `impact` pairs `UNKNOWN` with a `riskNote` saying so. Confirm with a text search before treating the symbol as safe to change or delete; do not proceed on the strength of a zero.
- **MUST use `query({search_query: "concept"})` for concepts/flows, `context({name: "symbolName"})` for a named symbol, or `impact` for blast radius, on read-only callers, dependencies, imports, or execution flow.** Graph first; text search only for empty/`UNKNOWN`/literals.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).

## Never Do

- NEVER edit a function, class, or method before MCP/CLI impact analysis.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis, and never read `UNKNOWN` as an all-clear — it means the walk could not answer, which is the one verdict that requires confirming by other means.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit before MCP/CLI graph change analysis.

## Resources

| Resource | Use for |
| --- | --- |
| `gitnexus://repo/hsk/context` | Codebase overview, check index freshness |
| `gitnexus://repo/hsk/clusters` | All functional areas |
| `gitnexus://repo/hsk/processes` | All execution flows |
| `gitnexus://repo/hsk/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
| --- | --- |
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
