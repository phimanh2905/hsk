# Roadmap Journey v2 Follow-up — Warm-up generator, Gates sync, Distractor gần-âm

- Ngày: 2026-10-30
- Cơ sở: 3 backlog items đã triage trong final review của Roadmap Journey v2 (spec
  2026-10-29, PR #22 đã merge + live prod). User duyệt làm cả 3 (2026-10-30).
- Nguyên tắc: mỗi mục độc lập, đều nhỏ; giữ nguyên mọi contract đã ship (gate key
  `GATE_STORE_ID`, best-of, PASS_PCT=80, cap 8/12 câu, drawer 3 tab).

## Mục A — Warm-up "Ôn nhanh" cho trạm generator

**Vấn đề:** tab Ôn nhanh chỉ hoạt động khi trạm trước là curated (vocab nhúng);
toàn bộ HSK 1/3/4/5 + 7 trạm bổ sung hsk-2 là generator → placeholder "Buổi sau sẽ
có ôn nhanh".

**Thiết kế:** khi drawer mở trạm N mà trạm N-1 tồn tại trong cùng level:
- Prev **curated** (vocab nhúng có sẵn) → giữ hành vi hiện tại.
- Prev **generator** → fetch vocab **1 bài đầu** của prev qua `useStationVocab`
  ([prev.lessons[0]]) — API `vocab-lesson` + module cache đã có, request rẻ và
  lặp lại được; `sampleWarmupQuestions(pool)` (4 câu vocab-only) như cũ.
- Prev không có lessons (curated milestone "m") → giữ placeholder.
- Vẫn KHÔNG ghi station progress khi trả lời warm-up; warm-up KHÔNG phụ thuộc gate.
- Loading state "Đang tải ôn nhanh…" khi fetch.

**File:** `use-station-vocab.ts` (dùng lại), `station-drawer.tsx` (ReviewTab),
test `station-drawer.test.tsx` (mock fetch).

## Mục B — Gates vào hybrid-sync

**Vấn đề:** key `bye.roadmap.gates.v1` chỉ nằm localStorage — đổi thiết bị bị hỏi
lại gate HSK 1 dù đã pass.

**Thiết kế:** thêm sync domain `roadmapGates` theo đúng pattern 5 domain hiện có:
- **Migration D1** (mới, số thứ tự kế tiếp qua `pnpm drizzle-kit generate` từ
  schema): bảng `roadmap_gates { userId, gateId, pct, at }`, PK `(userId, gateId)`.
  Apply dev `hsk-dev` + remote `hsk` thủ công sau merge (gotcha prod).
- **Schema** `src/lib/db/schema.ts`: thêm table + type export.
- **Client** `hybrid-store.ts`: `SyncDomain` thêm `"roadmapGates"`; map method
  `setRoadmapGate` → domain `roadmapGates` (dirty + debounce 5s push); getter trả
  mảng `[gateId, pct, at][]`.
- **Server** `/api/v1/sync/route.ts`: zod `roadmapGates: [{gateId, pct, at}]`;
  merge best-of — server giữ record nếu `server.pct >= inc.pct`, ngược lại upsert;
  trả pull payload giống các domain khác.
- **Merge client lúc login/pull:** gates local + server → giữ max pct (best-of hai
  chiều), ghi lại localStorage + server nếu local cao hơn.
- Guest vẫn thuần local (dirty tích tụ như hiện tại).

**File:** `src/lib/db/schema.ts`, `drizzle/` (migration sinh), `hybrid-store.ts`,
`src/app/api/v1/sync/route.ts`, test `progress-store.test.ts` (không đổi — gates
API giữ nguyên), test hybrid-store/sync (nếu có — thêm case domain mới).

## Mục C — Distractor quiz lọc cặp gần-âm

**Vấn đề:** 3 đáp án nhiễu chọn random — câu nghe có khi quá dễ, có khi cặp âm
vô lý; đề luyện tai chất lượng cần minimal pairs (bā/pā, mā/mà).

**Thiết kế:** helper pure `pickDistractors(answer, candidates, rng, want)` trong
`station-quiz.ts`:
- Tier 1: "gần-âm" = cùng **thanh mẫu** (ký tự đầu của pinyin không dấu, ví dụ
  `bā`/`bǎ`/`bái`) HOẶC cùng độ dài ±1 khi thanh mẫu hiếm (`r`, `Ø`).
- Chọn đủ `want` từ Tier 1 (shuffle trong tier); thiếu mới lấy random từ phần còn
  lại (giữ unique + loại answer như hiện tại).
- Áp dụng cho: `listenQuestion` (options pinyin), readVariant (options hanzi —
  tier theo cùng thanh mẫu của pinyin đó), `EntryGate.buildGateQuestions`
  (import helper, bỏ logic random riêng), câu nghĩa↔từ (tier "cùng initial" cho
  pinyin distractor khi sinh câu TỪ → NGHĨA với options là từ hanzi — KHÔNG: câu
  nghĩa↔từ options là hanzi/nghĩa, giữ random như cũ; chỉ câu **nghe** áp dụng).
- Dataset thật phải đạt: với mỗi đáp án sinh 100 lần, ≥60% distractors thuộc
  Tier 1 khi pool đủ dày (≥8 candidates cùng initial).

**File:** `station-quiz.ts` (helper + listenQuestion + readVariant),
`entry-gate.tsx` (dùng helper), test `station-quiz.test.ts`, `entry-gate.test.tsx`.

## Non-goals

Sửa warm-up curated (đã chạy đúng); sync domain mới ngoài roadmapGates; đề thi
thật certificate-test; thay đổi gate flow/điểm.

## Testing & QA

- Unit: mỗi mục 1 nhóm test riêng (map spec §A/B/C).
- Browser QA: mở rộng `scripts/qa/roadmap-flow-qa.mjs` +3 case: (A) drawer trạm
  generator có warm-up 4 câu; (B) pass gate → mock 2 thiết bị không test được
  headless — thay bằng unit test merge hai chiều; (C) câu nghe distractor cùng
  thanh mẫu xuất hiện ≥1 trong quiz trạm (nhiều lần chạy).
- Prod verify sau deploy: gate pass trên 1 thiết bị rồi login thiết bị khác (thủ
  công — owner).

## Rủi ro

- Migration B: bảng mới, không đụng bảng cũ — rollback = bỏ migration; remote
  apply thủ công như thường lệ.
- C: pool hsk1 có nhiều từ cùng thanh mẫu → câu hỏi khó hơn — có test ngưỡng
  "Tier 1 ≥60%" và cap: nếu pool Tier 1 < want thì bù random (không sinh câu
  thiếu options).
