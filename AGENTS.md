# AGENTS.md

## Repo layout

| Directory | Role |
|---|---|
| `app-next/` | The real app — Next.js 16 App Router + TypeScript strict + Tailwind v4, deployed to Cloudflare Workers via `@opennextjs/cloudflare`. All work happens here. |
| `clone/` | Static HTML/JS reference of the original site (no build step). Use only to compare UI/behavior when porting; never deploy. |
| `docs/` | `superpowers/specs/` = technical contract; `superpowers/plans/` = executed implementation plans (trust these over prose when docs disagree). |
| `opendesign_hsk/Hanzi/` | Design system source of truth (`DESIGN.md`, tokens, `variables.css`). |

There is no root `package.json` — everything runs from `app-next/` with pnpm.

## Commands (run from `app-next/`)

```bash
pnpm dev           # dev server on port 3100 (port is fixed: matches BETTER_AUTH_URL and Google OAuth redirect URI; script also kills anything already on :3100)
pnpm typecheck     # tsc --noEmit
pnpm lint          # eslint
pnpm test          # vitest run — jsdom only, no services needed (~1 min, 1400+ tests)
pnpm vitest run src/lib/store/__tests__/progress-store.test.ts   # single test file
pnpm vitest run -t "name of test"                                # single test by name
pnpm test:e2e      # playwright test (auto-starts `pnpm dev` on :3100, reuses an existing one)
pnpm preview       # build + run worker locally via workerd (:8787)
pnpm run deploy    # build + deploy to Cloudflare Workers (CI also does this on push to main)
```

CI (`.github/workflows/ci.yml`, on push/PR): `typecheck → lint → test`, then worker build on PRs / `pnpm run deploy` on `main` (needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` repo secrets; local deploy needs `wrangler login` once). Never call `opennextjs-cloudflare deploy` directly — it deploys without building.

### Setup (fresh clone)

- `pnpm install`, then `cp .env.example .env.local` (gitignored) — auth routes throw without the 4 auth keys. `.env.local` never enters the Cloudflare binding at dev (`getPlatformProxy` is called with `envFiles: []`), so auth falls back to `process.env`; production secrets come from `wrangler secret put`.

### Database (D1 + Drizzle)

- Schema: `src/lib/db/schema.ts`; `pnpm drizzle-kit generate` produces SQL in `drizzle/` — but apply migrations with wrangler (`d1 migrations apply`), never `drizzle-kit migrate`.
- **Two separate local databases** (each with its own `.wrangler/state` SQLite): `pnpm dev` binds **`hsk-dev`** (from `wrangler.dev.jsonc`), `pnpm preview`/production binds **`hsk`** (from `wrangler.jsonc`). Seeding the wrong one is the "content is empty in dev" trap.
- `hsk-dev` is not in the default config — every `hsk-dev` command needs `-c wrangler.dev.jsonc`:
  ```bash
  pnpm wrangler d1 migrations apply hsk-dev --local -c wrangler.dev.jsonc
  pnpm wrangler d1 execute hsk-dev --local -c wrangler.dev.jsonc --file drizzle/seeds/content-vocabs.sql
  ```
  Production DB `hsk --remote` is applied manually at deploy only.
- Content (vocab, grammar, shadowing) lives in D1 tables `content_*`. After pulling new migrations, regenerate seed SQL from its sources, then apply:
  ```bash
  pnpm dlx tsx scripts/seed/gen-vocab-seed.mts
  pnpm dlx tsx scripts/seed/gen-shadowing-seed.mts
  pnpm dlx tsx scripts/seed/gen-grammar-seed.mts   # needs scripts/content/data/grammar/grammar-hsk{1..5}.json — first run pnpm dlx tsx scripts/content/gen-grammar-batch.mts --level N (manual, needs CONTENT_LLM_* env)
  ```
- Seed SQL files in `drizzle/seeds/` are generator output — never edit by hand. Seeds are idempotent (`INSERT OR REPLACE`). Extra shadowing seeds (`content-shadowing-dialogues/w1/wsd.sql`) come from pipelines in `scripts/content/` — see `scripts/content/README.md`.
- Seed-SQL rule (bit twice): escape `'` and encode `;` inside JSON columns as `\u003b` — wrangler splits statements on `;` (working example: `jsonCol()` in `scripts/seed/gen-grammar-seed.mts`).

## Gotchas (each one has already bitten once)

1. Port 3100 is intentional (matches `.env.local` `BETTER_AUTH_URL` + Google Cloud Console redirect). Changing it means changing all three.
2. `NEXT_PUBLIC_SITE_URL` lives in `app-next/.env.production` (committed, not a secret). Don't pass an empty env var in CI — an empty string overrides `.env` and `new URL("")` explodes at build. Changing the URL requires `rm -rf .next` or `sitemap.xml` keeps the old one (the `deploy`/`preview` scripts already do this — don't remove it).
3. `opennextjs-cloudflare deploy` does not build; always use the `deploy` script (build && deploy).
4. `next dev` runs in plain Node with no Cloudflare bindings — `next.config.ts` calls `initOpenNextCloudflareForDev({ configPath: "./wrangler.dev.jsonc" })` so `getCloudflareContext().env.DB` exists locally. Dev binds the **local** `hsk-dev` state in `.wrangler/state` (the `remote: true` flag was removed — it used to read the remote dev DB).
5. Next.js 16 has breaking changes vs. training data — read the relevant guide in `app-next/node_modules/next/dist/docs/` before writing Next.js code (see `app-next/AGENTS.md`).

## Architecture

- **Routes**: App Router under `src/app/`. Route group `(app)` = main shell + learning modes: `lesson`, `review`, `reading`, `shadowing`, `roadmap` (incl. `roadmap/pinyin`), `notebook`, `progress`, `dictionary`, `course`, `radicals`, `create-file`, `certificate-test`, `sound-rules`. Route group `(wide)` = `pinyin`, `my-grammar`, `my-vocab`, `hanzi`, `notebook`; root routes = `privacy`, `terms`, `leaderboard`, `feedback`, `delete-account`. API routes under `src/app/api/`: `v1/auth`, `v1/content` (vocab/vocab-meta/grammar/shadowing), `v1/sync`, `v1/battle`, `v1/exam`, `v1/notebook`, `v1/shadowing`, `ai`.
- **Progress storage**: `src/lib/store/progress-store.ts` is the interface over `localStorage` (keys prefixed `nhai.*` / legacy `bye.*`). On top of it, `hybrid-store.ts` (mounted by `HybridSyncProvider` in the root layout) shadows the mutate methods → marks domains dirty → debounced 5s `POST /api/v1/sync` when logged in; guests stay local-only. Merge rules in `sync-merge.ts`, shared by client and server.
- **Content data**: vocab + grammar + shadowing are dehardcoded into D1 (`content_*`). Client code loads them via `src/lib/content/*-client.ts` (`/api/v1/content/*`) and `src/lib/content/shadowing.ts` (server-only, needs the D1 binding) — do not import the datasets from `src/content/vocab.ts` (that file is now the seed source). Everything else (reading, radicals, hanzi, pinyin, dialogues, courses, templates, …) is still runtime-imported from `src/content/`.
- **Auth**: better-auth with Google OAuth, basePath `/api/v1/auth` (must match the redirect URI path registered in Google Cloud Console). Server-gated pages redirect to `/?login=1`. For browser automation there is `POST /api/v1/auth/dev-login` with header `x-dev-secret: $DEV_LOGIN_SECRET` — creates a QA session cookie (404 unless `DEV_LOGIN_SECRET` is set and not production).
- **Audio/video**: `react-player` for shadowing video (YouTube); Kokoro TTS is vendored locally (`pnpm vendor:kokoro`, auto-runs before dev/build; `public/kokoro/vendor/` is gitignored — the minified bundle trips GitHub secret scanning, never commit it). `Referrer-Policy: strict-origin-when-cross-origin` in `next.config.ts` is required for YouTube embeds (error 153 otherwise).
- **Design system**: Hanzi — all UI must follow `../opendesign_hsk/Hanzi/DESIGN.md` (7 fixed colors, semantic tokens, no hard-coded primitives, Inter + Noto Sans SC, 4px grid, 44px touch targets). Full usage guide: `app-next/.zcode/skills/hanzi-design-system/SKILL.md` and `app-next/AGENTS.md`.
- **Tests**: Vitest + Testing Library (`src/**/*.test.{ts,tsx}` and `scripts/**`, jsdom) and Playwright (`e2e/`). Path alias `@` → `src/`. A few e2e specs that need a real login session are intentionally skipped.

## Docs

- `docs/superpowers/specs/fullstack/` — full technical spec (`00-platform-data.md` = shared contract: auth, D1 schema, storage, sync, cache, API; 10–13 per domain).
- `docs/superpowers/specs/2026-09-30-hsk-feature-inventory.md` — feature inventory + port status.
- `app-next/scripts/content/README.md` — content pipelines (grammar/dialogue/reading generation, audio render, shadowing seed steps).
- Root `README.md` — deploy/CI details and roadmap; its "SP2 pending" line is behind reality — Google login, D1 content, and cross-device sync (`/api/v1/sync` + HybridStore) are already in.

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
