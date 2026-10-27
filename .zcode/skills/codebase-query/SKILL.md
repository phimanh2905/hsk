---
name: codebase-query
description: Route codebase questions in the hsk repo (single git repo — app-next/ Next.js + Cloudflare Workers, clone/ reference, opendesign_hsk/Hanzi design system) — docs layer first (AGENTS.md, docs/superpowers/specs/), then graphify + gitnexus at the repo root, then source files for implementation detail. Fall back to grep/read/glob only when both graphs return empty.
---

# Query knowledge + codebase trong repo hsk

Đây là **một git repo duy nhất** (khác monorepo dictation-mate): không có nested repo, không có `knowledge/` dir. Mọi graph call chạy từ repo root — chỉ cần resolve root một lần, không cần bind theo repo.

## Step -1 — Resolve repo root (run first, always)

```bash
ROOT=$(git rev-parse --show-toplevel) || { echo "STOP: not in a git repo"; }
```

- Root là `/Volumes/samsung512/Code/hsk`; code thật nằm trong `app-next/` (Next.js 16 App Router + TS strict, pnpm). `clone/` là HTML/JS tĩnh chỉ để so sánh UI — **không query graph cho clone/**, không port từ nó ngoài mục đích đối chiếu.
- Graphify-out và .gitnexus đều ở repo root, phủ toàn repo (bao gồm app-next). Chạy từ bất kỳ đâu trong repo đều được, nhưng cứ `cd "$ROOT"` cho chắc.

## Step 0 — Docs layer first

Không có `knowledge/index.md` — tầng narrative ở đây là:

- **`AGENTS.md`** (root + `app-next/AGENTS.md`) — repo layout, commands, gotchas, architecture, design-system rules. Đọc luôn trước khi explores rộng.
- **`docs/superpowers/specs/fullstack/`** — spec kỹ thuật đầy đủ (`00-platform-data.md` = nguồn chân lý auth/D1/sync/API; 10–13 per domain).
- **`docs/superpowers/specs/2026-09-30-hsk-feature-inventory.md`** — feature inventory + port status.
- **`docs/superpowers/plans/` + `docs/superpowers/specs/`** khác — SDD plans/designs theo tính năng.

Route theo chủ đề:

- **Journey end-to-end** (auth, sync, progress, content pipeline) → đọc `docs/superpowers/specs/fullstack/00-platform-data.md` + spec domain tương ứng trước.
- **Câu hỏi về một tính năng** ("shadowing hoạt động thế nào?") → check feature inventory + spec domain + plans trước.
- **Không khớp** → sang Step 1.

Nếu docs đã trả lời xong thì có thể dừng — nhưng khi user cần symbol chính xác, callers, blast radius, hay chi tiết dòng code thì tiếp tục với graphs. Luôn cite trang docs đã dùng.

## Step 1 — graphify query

```bash
cd "$ROOT" && graphify query "<question>" --budget 1000
graphify path "<A>" "<B>"      # hai symbol/file nối nhau thế nào
graphify explain "<symbol>"    # một node + láng giềng
```

- Parse output (nodes, edges, community labels) — không paste raw output vào câu trả lời.
- ≥1 node → fold vào câu trả lời (community boundaries, quan hệ cross-file).
- Empty → Step 2.

## Step 2 — gitnexus

`cd "$ROOT"`, chạy `node .gitnexus/run.cjs`. Nếu `status` báo stale (`Indexed commit` != `Current commit`) → **reindex cả hai graphs** trước khi trả lời impact/blast-radius, rồi check lại status:

```bash
cd "$ROOT" && graphify update .                  # AST-only, không tốn LLM
cd "$ROOT" && node .gitnexus/run.cjs analyze
```

Index stale trả lời về code cũ — tệ hơn cả không có; không được trình bày nó như fact hiện tại, và không lặng lẽ fallback sang grep vì reindex trông chậm.

```bash
# "X hoạt động thế nào?" — execution flows liên quan:
node .gitnexus/run.cjs query "<question>"

# "Ai gọi Y?" / nhìn 360° một symbol:
node .gitnexus/run.cjs context "<Y>"

# "Đổi Z thì vỡ gì?" — blast radius:
node .gitnexus/run.cjs impact "<Z>" --direction upstream
```

- Fold call graph (CALLS/IMPORTS/EXTENDS) + process traces vào câu trả lời.
- `risk: UNKNOWN` KHÔNG phải all-clear — walk không resolve được callers; confirm bằng text search trước khi kết luận an toàn.
- `partial: true` / `truncated: true` chưa phải clean — chạy rộng lại.

Lưu ý riêng cho repo hsk: **MUST chạy impact trước khi edit** (rule GitNexus trong AGENTS.md) — Step 2 không chỉ là gợi ý mà là yêu cầu bắt buộc trước mọi sửa code.

## Step 3 — Detail layer

- Source files: docs và graph hits đã cite đường dẫn — đọc trực tiếp (`app-next/src/...`), cite `file:line` trong câu trả lời.
- Design system: câu hỏi UI/design → `opendesign_hsk/Hanzi/DESIGN.md` + `.zcode/skills/hanzi-design-system/SKILL.md` trước khi đọc component.
- Trace đầy đủ: gitnexus `process` resource cho flow tìm được ở Step 2.
- `clone/` — chỉ đọc khi cần đối chiếu hành vi bản gốc đang port.

## Step 4 — Fallback + present

- grep/read/glob CHỈ khi cả graphify và gitnexus đều empty.
- Trình bày gộp: **docs** (narrative) → **graphify** (structure/communities) → **gitnexus** (call graph, flows, risk) → **files** (implementation cites). Ví dụ:

> **Shadowing sync progress hoạt động thế nào?**
> - Docs: `docs/superpowers/specs/fullstack/` (domain shadowing + 00-platform-data)
> - Graphify: ShadowingStudio → useShadowingPlayer (community=Shadowing)
> - GitNexus: shadowing-studio.tsx calls progress-store (CALLS)
> - Files: `app-next/src/app/(app)/shadowing/...`

## Always do

- State index freshness cạnh câu trả lời ("gitnexus current tại `<sha>`" hay "stale, đã reindex").
- Docs/AGENTS.md trước khi explore rộng.
- Trước khi đề xuất sửa code: chạy impact (bắt buộc theo AGENTS.md).

## Never do

- Never grep/read/glob first khi graphs tồn tại — graph trước, grep chỉ fallback.
- Never query graph cho code trong `clone/` như thể nó là app thật — nó là reference tĩnh.
- Never present raw graph output as the answer — parse qua community structure + call graph.
- Never đọc `risk: UNKNOWN` như low risk — confirm bằng text search trước.
- Never trình bày index stale như fact hiện tại — reindex hoặc nói rõ stale.
