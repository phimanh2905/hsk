---
name: knowledge-ingest
description: Catch the hsk repo's docs layer up to HEAD after a stretch of work — reindex gitnexus + graphify, mine recent commits, and update the durable docs (AGENTS.md gotchas, docs/superpowers/specs, feature inventory) so the next session starts from current truth.
---

# Knowledge ingest — hsk repo

Phiên bản thích nghi cho repo `hsk`: **một git repo duy nhất**, không có `knowledge/` dir, không có nested repo. Tầng knowledge bền vững ở đây là:

- `AGENTS.md` (root) + `app-next/AGENTS.md` — gotchas, architecture, commands
- `docs/superpowers/specs/fullstack/` — spec kỹ thuật (`00-platform-data.md` = nguồn chân lý shared contract)
- `docs/superpowers/specs/2026-09-30-hsk-feature-inventory.md` — feature inventory + port status
- `docs/superpowers/plans/` + specs theo tính năng — SDD plans (đóng băng theo thời điểm, **không** cập nhật retroactively trừ khi plan đó là tài liệu sống)

Generated wikis (`graphify-out/`, `.gitnexus/`) — chỉ **reindex**, không sửa tay nội dung của chúng.

## Step 0 — Resolve root

```bash
ROOT=$(git rev-parse --show-toplevel) || { echo "STOP: not in a git repo"; }
```

Chỉ ingest repo này. Nếu đứng ngoài repo hsk (không thấy layout `app-next/` + `docs/superpowers/` + `.gitnexus/`), dừng và nói rõ — không tạo docs/state trong repo không liên quan.

## State

Không có `.ingest-state.json` riêng — mốc so sánh là **indexed commit trong `.gitnexus/`**:

```bash
cd "$ROOT" && node .gitnexus/run.cjs status
```

- `Indexed commit` == `Current commit` và các docs đã cập nhật đến commit đó → "docs đã fresh", dừng.
- Stale → ingest khoảng `<indexedSha>..HEAD`.

## Steps

### 1. Detect pending changes

```bash
cd "$ROOT" && git log --oneline --stat <indexedSha>..HEAD
```

Chú ý cả working tree chưa commit (git status) — work đang dở (như các fix chưa commit trên nhánh hiện tại) cũng là "pending" cần ghi nhận, nhưng chỉ ingest vào docs những gì đã ổn định (đã QA/verify), không ghi lời hứa.

### 2. Map changes → docs

| Changed code | Target |
|---|---|
| Gotcha mới phát hiện (port, env, DB, OAuth, build, deploy…) | `AGENTS.md` mục Gotchas (hoặc `app-next/AGENTS.md` nếu ở tầng app) |
| Migration/seed D1, schema thay đổi | `docs/superpowers/specs/fullstack/00-platform-data.md` + spec domain |
| Tính năng mới/xong (journey khép kín) | feature inventory (port status) + spec domain nếu contract đổi |
| API/contract giữa FE ↔ API routes | `00-platform-data.md` |
| Design system lệch quy tắc | `opendesign_hsk/Hanzi/DESIGN.md` không sửa từ đây — ghi vào gotcha/AGENTS nếu có ruling mới |
| Cross-cutting flow mới | spec mới trong `docs/superpowers/specs/fullstack/` theo đúng đánh số |

### 3. Investigate — git AND graph, both always

- **git** → intent: commit nào đổi gì, tại sao (commit message + diff).
- **graph** → structure: ai gọi ai, blast radius, symbol nằm đâu.

#### 3a — Reindex TRƯỚC khi query

```bash
cd "$ROOT" && graphify update .                  # AST-only, rẻ
cd "$ROOT" && node .gitnexus/run.cjs analyze     # chậm — khởi động sớm, đọc diff trong lúc chờ
```

Xong re-check `status`: `Indexed commit` phải == `Current commit`. Không bao giờ query index stale, không downgrade về diff-only vì reindex trông chậm.

#### 3b — Query

Tối thiểu mỗi lần ingest: 1 `graphify query` + 1 `gitnexus context`/`impact`:

```bash
cd "$ROOT" && graphify query "<changed symbol or feature>" --budget 1000
cd "$ROOT" && node .gitnexus/run.cjs context "<symbol>"
cd "$ROOT" && node .gitnexus/run.cjs impact "<symbol>" --direction upstream
```

`risk: UNKNOWN` chưa phải all-clear — confirm bằng text search. `partial/truncated: true` — chạy rộng lại.

### 4. Update docs

- **Nhỏ** (≤ 2 file, vài fact): sửa trực tiếp, surgical — match style sẵn có, không viết lại trang. Gotcha mới ghi theo đúng format numbering của AGENTS.md ("each one has already bitten once").
- **Lớn**: dispatch general-purpose subagent với prompt self-contained (liệt kê sẵn commits, đường dẫn docs đích, yêu cầu reindex + query graph, và yêu cầu **graph-usage ledger** trong report — per graph: stale hay không, đã reindex chưa, số query đã chạy).
- Không cập nhật plans/designs đã đóng băng retroactively; fact mới thuộc specs/AGENTS/inventory.
- **Không commit** — để working tree cho user review, trừ khi user yêu cầu commit rõ ràng.

### 5. Close out

- Confirm `node .gitnexus/run.cjs status` báo Indexed == Current.
- Báo cáo (tiếng Việt): commits đã ingest, files docs đã tạo/sửa + lý do từng file, phát hiện stale-but-unrelated (bỏ qua có chủ đích).
- Báo **graph-usage ledger** nếu có dispatch subagent.

## Never do

- Never ingest trên git alone — diff không cho biết signature đổi làm vỡ caller nào. Mọi lần ingest ≥ 1 graphify query + 1 gitnexus query.
- Never query index stale.
- Never sửa tay nội dung trong `graphify-out/` hay `.gitnexus/` — chỉ reindex qua CLI.
- Never ghi work chưa verify (chưa QA/chưa deploy) vào docs như thể đã xong — đánh dấu trạng thái thật (vd. "chưa verify iPhone thật").
- Never tạo `knowledge/` dir mới — tầng docs của repo này là AGENTS.md + docs/superpowers/, không nhân bản cấu trúc monorepo khác.
- Never rewrite wholesale trang docs khi surgical edit đủ.
