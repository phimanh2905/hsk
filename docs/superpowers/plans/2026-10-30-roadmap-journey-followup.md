# Roadmap Journey v2 Follow-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hoàn tất 3 backlog của Journey v2: warm-up cho trạm generator (fetch prev vocab), gates vào hybrid-sync (migration + domain mới), distractor câu nghe lọc cặp gần-âm.

**Architecture:** C thuần logic trong `station-quiz.ts` + `entry-gate.tsx`; A tái dùng `useStationVocab` + module cache cho prev station; B thêm sync domain theo đúng pattern 5 domain hiện có (schema → migration → hybrid-store → sync route).

**Tech Stack:** Next.js 16, TS strict, Drizzle + D1, Vitest + RTL (jsdom), pnpm.

**Spec:** `docs/superpowers/specs/2026-10-30-roadmap-journey-followup-design.md` (đọc kèm).

## Global Constraints

- Chạy từ `app-next/`, chỉ pnpm; token Hanzi (không hard-code màu); mount-gate SSR-safe.
- KHÔNG đổi contract đã ship: `GATE_STORE_ID="hsk1"`, best-of, `PASS_PCT=80`, cap 8 câu trạm / 12 milestone, 3 tab drawer, key `bye.roadmap.gates.v1`.
- Migration sinh bằng `pnpm drizzle-kit generate` (tên sẽ là `0014_*`); **không** chạy `drizzle-kit migrate`. Apply thủ công sau merge: dev `hsk-dev -c wrangler.dev.jsonc` + remote `hsk --remote` với `env -u CLOUDFLARE_API_TOKEN -u CLOUDFLARE_ACCOUNT_ID`.
- Mỗi task: test đỏ → xanh → `pnpm typecheck && pnpm lint` (errors chặn) → commit.

---

### Task 1: Distractor gần-âm (`pickDistractors`)

**Files:**
- Modify: `app-next/src/lib/station-quiz.ts`
- Modify: `app-next/src/components/roadmap/entry-gate.tsx`
- Test: `app-next/src/lib/__tests__/station-quiz.test.ts`, `app-next/src/components/roadmap/__tests__/entry-gate.test.tsx` (mở rộng)

**Interfaces:**
- Produces: `export function pickDistractors(answer: string, candidates: string[], rng: Rng, want: number): string[]` — trả đúng `want` item unique ≠ answer (dedupe trước); Tier 1 gần-âm = cùng ký tự đầu (thanh mẫu) của chuỗi, thiếu bù random; không sort output theo similarity (shuffle đều). Export thêm `export function pinyinInitial(p: string): string` (ký tự ASCII đầu, `ü` giữ nguyên) để test + tái dùng.

- [ ] **Step 1: Test thất bại** — thêm vào `station-quiz.test.ts`:

```ts
describe("pickDistractors gần-âm", () => {
  const det = () => { let s = 42; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
  it("ưu tiên cùng thanh mẫu: answer 'bā', pool đủ → distractors cùng đầu 'b'", () => {
    const pool = ["bā", "bǎ", "bái", "bàn", "mā", "mà", "mǎi", "shì", "nǐ", "hǎo", "xué", "shēng"];
    const d = pickDistractors("bā", pool, det(), 3);
    expect(d).toHaveLength(3);
    expect(d.every((x) => x !== "bā")).toBe(true);
    expect(new Set(d).size).toBe(3);
    expect(d.filter((x) => pinyinInitial(x) === "b").length).toBeGreaterThanOrEqual(2); // pool có 3 item 'b'
  });
  it("pool không đủ cùng initial → bù random, luôn đủ want và unique", () => {
    const d = pickDistractors("bā", ["bǎ", "shì", "nǐ"], det(), 3);
    expect(d).toHaveLength(3);
    expect(new Set(d).size).toBe(3);
    expect(d).toContain("bǎ");
  });
  it("listenQuestion: ≥60% distractors cùng initial khi pool dày", () => {
    const vocab: StationPool["vocab"] = [
      ["八", "bā", "tám"], ["把", "bǎ", "nắm"], ["白", "bái", "trắng"], ["办", "bàn", "làm"],
      ["妈", "mā", "mẹ"], ["骂", "mà", "mắng"], ["买", "mǎi", "mua"],
      ["是", "shì", "là"], ["你", "nǐ", "bạn"], ["好", "hǎo", "tốt"], ["学", "xué", "học"], ["生", "shēng", "sinh"],
    ];
    let same = 0, total = 0;
    for (let i = 0; i < 100; i++) {
      const qs = buildStationQuestions(
        { id: "t", no: "T", kind: "lesson", title: "T", zh: "", meta: "", vocab, gram: [] },
        { vocab, gram: [] },
        det(),
        { listenEvery: 1 },
      );
      for (const q of qs.filter((q) => q.listen)) {
        total++;
        const answer = q.listen!.audioText; // hanzi
        const ansPinyin = vocab.find((v) => v[0] === answer)![1];
        same += q.options.filter((o) => pinyinInitial(o) === pinyinInitial(ansPinyin) && o !== ansPinyin).length;
      }
    }
    expect(total).toBe(100);
    expect(same / (total * 3)).toBeGreaterThanOrEqual(0.6);
  });
});
```

(Executor đọc `station-quiz.ts` hiện tại trước: nếu `listenQuestion` là private, test trỏ qua `buildStationQuestions` như trên; điều chỉnh selector `q.listen.audioText` theo cấu trúc thật.)

- [ ] **Step 2: FAIL** — `pnpm vitest run src/lib/__tests__/station-quiz.test.ts`
- [ ] **Step 3: Implement** — `pickDistractors` + `pinyinInitial` trong `station-quiz.ts`; thay logic chọn distractor trong `listenQuestion` (options pinyin) VÀ readVariant (options hanzi — tier tính trên `pinyinInitial` của pinyin ứng với hanzi); trong `entry-gate.tsx` thay logic `seenHanzi/seenPinyin` riêng bằng `pickDistractors` (giữ ràng buộc unique hanzi/pinyin — bọc: gọi pickDistractors trên pinyin rồi map sang hanzi, lọc unique; nếu map trùng thì thay bằng candidate khác). Thêm test entry-gate: 20 vòng × 12 câu — ≥50% câu nghe có ≥1 distractor cùng initial.
- [ ] **Step 4: Xanh** + typecheck + **Step 5: Commit** `feat(roadmap): distractor câu nghe ưu tiên cặp gần-âm (minimal pairs)`

---

### Task 2: Warm-up cho trạm generator

**Files:**
- Modify: `app-next/src/components/roadmap/station-drawer.tsx`
- Test: `app-next/src/components/roadmap/__tests__/station-drawer.test.tsx` (mở rộng)

**Interfaces:**
- Consumes: `useStationVocab(lessons)` (module cache có sẵn, export `resetStationVocabCacheForTests`), `sampleWarmupQuestions(pool, rng)` — cả hai đã tồn tại.
- Drawer cần biết trạm trước: prop mới optional `prevStation?: Station | null` (controller `roadmap-client.tsx` truyền `views[idx-1]?.station ?? null` khi render StationDrawer — **sửa cả roadmap-client.tsx**, 1 dòng).

- [ ] **Step 1: Test thất bại** — thêm (mock fetch trả vocab 1 bài ~15 từ):

```tsx
it("prev generator: tab Ôn nhanh fetch vocab prev → 4 câu, không ghi progress", async () => {
  // render drawer trạm g2 với prevStation = trạm g1 (lessons [{book:'hsk1',page:'lesson-1'}])
  // mock fetch /api/v1/content/vocab-lesson trả lesson 15 từ
  // click drawer-tab-review → đợi 4 câu warm-up (gate-counter không có; đợi quiz-prompt/warmup node)
  // trả lời hết → assert localStorage bye.roadmap.stations.v1 KHÔNG có hsk-1.g1 (trước/sau byte-equal)
});
it("prev không có lessons (milestone curated m) → giữ placeholder", () => { /* render, assert text 'Buổi sau sẽ có ôn nhanh' hoặc 'Bắt đầu chặng' */ });
```

- [ ] **Step 2: FAIL** — `pnpm vitest run src/components/roadmap/__tests__/station-drawer.test.tsx`
- [ ] **Step 3: Implement** — `ReviewTab`: nếu `prevStation?.vocab.length` → giữ logic nhúng; else nếu `prevStation?.lessons?.length` → `const { pool, loading } = useStationVocab([prevStation.lessons[0]])`; loading → text "Đang tải ôn nhanh…"; pool đủ → `sampleWarmupQuestions(pool)`; else placeholder. `roadmap-client.tsx`: truyền `prevStation` (tính từ `views` theo `view.station.id` — tìm index trong `level.stations`). KHÔNG đổi logic khác.
- [ ] **Step 4: Xanh** + typecheck + **Step 5: Commit** `feat(roadmap): Ôn nhanh cho trạm generator — fetch 1 bài đầu trạm trước`

---

### Task 3: Gates vào hybrid-sync (migration + client + server)

**Files:**
- Modify: `app-next/src/lib/db/schema.ts`
- Create: `app-next/drizzle/0014_*.sql` (từ `pnpm drizzle-kit generate`)
- Modify: `app-next/src/lib/store/hybrid-store.ts`
- Modify: `app-next/src/app/api/v1/sync/route.ts`
- Test: `app-next/src/lib/store/__tests__/hybrid-store.test.ts` (mở rộng; nếu chưa có file — tạo theo pattern test store khác), `app-next/src/app/api/v1/sync/__tests__/*.test.ts` (mở rộng)

**Interfaces:**
- Produces: sync domain `"roadmapGates"`; push record shape `{ gateId: string; pct: number; at: number }`; pull trả cùng shape; server table `roadmap_gates (userId, gateId, pct, at)` PK `(userId, gateId)`.
- Invariants: method `setRoadmapGate` → dirty `roadmapGates`; guest local-only; best-of hai chiều (max pct; pct bằng nhau giữ `at` cũ nếu server, mới nếu client — chọn: giữ record có pct cao, tie giữ server).

- [ ] **Step 1: Test schema/sync thất bại** — server test: POST `/api/v1/sync` với `roadmapGates: [{gateId:"hsk1", pct:83, at:1}]` (mock auth + db theo pattern test hiện có) → table có row; push lại `pct:90` → row = 90; push `pct:40` → row vẫn 90. Hybrid test: gọi `setRoadmapGate` → sau debounce `fetch` mock nhận body có `roadmapGates`.
- [ ] **Step 2: FAIL**
- [ ] **Step 3: Implement** theo thứ tự: (a) schema.ts thêm `roadmapGates` table (đọc 5 domain hiện có, copy pattern id/uniqueIndex); (b) `pnpm drizzle-kit generate` → kiểm tra SQL trong `drizzle/0014_*.sql` là CREATE TABLE thuần; (c) hybrid-store: `SyncDomain` + `dirtyVersion` + method map `["setRoadmapGate", ["roadmapGates"]]` + builder push (getter đọc `progressStore.getRoadmapGate` cho mọi gateId đã biết — đọc cách 5 domain hiện tại thu thập records: nếu push theo mảng từ getter thì gates cần danh sách gateId — thêm `progressStore.listRoadmapGates(): Record<string, {pct, at}>` (mới, đọc cả key) + pull-apply viết từng gate qua `setRoadmapGate` (best-of sẵn)); (d) sync route: zod + merge logic + insert ≤8 rows/statement pattern; (e) pull/merge login hai chiều: client giữ max, nếu local cao hơn push lại lần sau (dirty tự tích).
- [ ] **Step 4: Xanh** — `pnpm vitest run src/lib/store src/app/api/v1/sync` + full store suite + typecheck. **KHÔNG apply migration remote** (ghi README note trong report: lệnh apply sau merge).
- [ ] **Step 5: Commit** `feat(sync): domain roadmapGates — cổng HSK1 sync đa thiết bị (migration 0014)`

---

### Task 4: QA script + verify cuối

**Files:**
- Modify: `app-next/scripts/qa/roadmap-flow-qa.mjs`

- [ ] **Step 1: Thêm 3 case** (giữ pattern + helpers hiện có):
  1. Drawer trạm generator (Trạm 2 HSK1 sau khi seed g1 done) → tab Ôn nhanh có 4 câu (không placeholder), trả lời xong stations.v1 byte-equal.
  2. Câu nghe trong quiz trạm: chạy quiz với `listenEvery` thật — assert ≥1 câu có nút "Nghe lại" và (sau fallback) distractor có cùng initial xuất hiện ít nhất 1 lần trong 20 lần chạy lại quiz (seed gate exempt để vào thẳng quiz).
  3. Regression: 28 case cũ vẫn PASS (không sửa expected nào).
- [ ] **Step 2: Chạy** — seed D1 hsk-dev, dev :3101, `node scripts/qa/roadmap-flow-qa.mjs` → 100% PASS ×2.
- [ ] **Step 3: Full verify** — `pnpm test` toàn suite + typecheck + lint; unit T3 thêm test merge hai chiều (server 90 + local 83 → 90; local 95 + server 90 → 95 push lại).
- [ ] **Step 4: Commit** `test(roadmap): QA follow-up — warm-up generator + distractor + regression`

---

## Self-review

- Spec coverage: A→T2, B→T3, C→T1; QA map §Testing→T4.
- Type consistency: `pickDistractors`/`pinyinInitial` dùng xuyên T1; `prevStation` optional — caller cũ (QA, test) không vỡ; domain name `roadmapGates` nhất quán T3.
- Placeholder: không có; các block "(đọc file trước)" trỏ nguồn có thật.
- B là task phức nhất (touch 5 file + migration) — reviewer nên model mạnh hơn.
