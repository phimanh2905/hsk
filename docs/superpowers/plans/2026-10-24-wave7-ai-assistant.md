# AI Assistant (/api/ai → buffproxy) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Read the plan file fully before starting; execute tasks in order, one at a time, checking off `- [ ]` boxes as you go.

**Spec:** `/Volumes/samsung512/Code/hsk/docs/superpowers/specs/2026-10-24-hsk15-roadmap-design.md` (Wave 7)

## Goal

Thay chatbot mock "Tiểu Ngữ" (`app-next/src/components/social/ai-widget.tsx` hiện trả lời cứng sau 400ms) bằng AI thật: route Next.js App Router `POST /api/ai` chạy trên Cloudflare Workers, forward sang upstream OpenAI-compatible (`buffproxy`), kèm auth, rate limit per user, timeout và error mapping thân thiện. Sau đó nối 3 use case phụ: giải thích ngữ pháp, chấm viết (dạng text), tạo reading từ văn bản.

## Architecture

- 1 route duy nhất `app-next/src/app/api/ai/route.ts` là **cổng duy nhất** vào AI. Client (widget, lesson, hanzi studio, reading) chỉ gọi route này — KHÔNG client biết upstream URL/key.
- Module config riêng `app-next/src/lib/ai.ts` đọc secret qua `getCloudflareContext().env` (pattern của `src/lib/auth.ts` / `src/lib/db/index.ts`) với fallback `process.env` cho dev (pattern của `src/lib/auth-secrets.ts`). Hoán đổi upstream = đổi 2 secret, không đụng code.
- Route KHÔNG streaming (trả full `{text}`) — upstream không stream ổn định qua proxy ngoài, full-text + loading state ở client đơn giản và đủ.
- Rate limit in-memory per user (Map userId → timestamps, chạy trong isolate Worker; chấp nhận per-isolate vì đây là chống lạm dụng, không phải quota chính xác).
- Lịch sử hội thoại giữ trong state component (session component), gửi cả mảng messages lên route mỗi lượt.

## Tech Stack

- Next.js 16 App Router (Route Handler), runtime Cloudflare Workers (`@opennextjs/cloudflare`)
- better-auth (`getAuth().api.getSession`) — pattern hiện có trong `src/app/api/v1/shadowing/progress/route.ts`
- zod (đã có trong repo), vitest (unit), Playwright (e2e, `pnpm test:e2e` — webServer tự chạy `pnpm dev` port 3100)
- pnpm BẮT BUỘC. KHÔNG chạy `pnpm build`.

## Global Constraints

- **KEY upstream KHÔNG BAO GIỜ xuất hiện trong plan, code client, hay file commit.** Chỉ qua wrangler secret `AI_UPSTREAM_URL`, `AI_UPSTREAM_KEY` (+ `.env.local` cho dev local, file này đã gitignore).
- KHÔNG chạy `pnpm build` / `pnpm start`. Unit test: `pnpm vitest run <file>`. E2E: `pnpm test:e2e e2e/ai-assistant.spec.ts`.
- Đừng chạy `wrangler secret put` — ghi chú lệnh trong plan, owner tự chạy.
- Nội dung chat đi qua proxy bên thứ ba (buffproxy) — không gửi PII: chỉ gửi văn bản học tiếng Trung, không gửi userId/email trong messages.
- Upstream chết → client hiện toast gọn, không crash, không treo.
- Mỗi task: viết test trước (TDD), chạy pass, rồi mới sang task sau.
- Không sửa schema D1 trong wave này.

---

## Task 1: Module config `src/lib/ai.ts` (secrets + client forward helper)

**Files:**
- Create: `app-next/src/lib/ai.ts`
- Create: `app-next/src/lib/__tests__/ai.test.ts`

**Interfaces:**

```ts
// src/lib/ai.ts — exports
export type AiConfig = { url: string; key: string };
export function resolveAiConfig(env: Record<string, string | undefined>, nodeEnv: string | undefined): AiConfig;
// ném Error "Thiếu AI_UPSTREAM_URL / AI_UPSTREAM_KEY..." khi thiếu (prod fail sớm — mirror resolveAuthSecrets)

export async function callUpstream(
  cfg: AiConfig,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  opts?: { maxTokens?: number; timeoutMs?: number; signal?: AbortSignal }
): Promise<{ text: string }>;
// POST `${cfg.url}` (url đã là .../v1/chat/completions đầy đủ) với
//   headers: { "content-type": "application/json", authorization: `Bearer ${cfg.key}` }
//   body: JSON.stringify({ model: "smart-router/fallback", messages, max_tokens: opts?.maxTokens ?? 1024 })
// Timeout mặc định 30_000ms qua AbortController (AbortSignal.any khi có opts.signal).
// Upstream !ok → throw UpstreamError{ status, body }; network/timeout → throw UpstreamError{ status: 502 }.
export class UpstreamError extends Error { status: number; detail?: string }
```

**Steps:**

- [ ] Viết `src/lib/__tests__/ai.test.ts` (vitest, mock `globalThis.fetch`): (1) `resolveAiConfig` đọc env trước, fallback `process.env` khi `nodeEnv !== "production"`, ném Error khi thiếu ở production; (2) `callUpstream` gọi fetch đúng URL/header/body (model `smart-router/fallback`, max_tokens), parse `data.choices[0].message.content` → `{ text }`; (3) upstream 500 → `UpstreamError` status 500; (4) fetch reject (timeout/mạng) → `UpstreamError` status 502; (5) timeout: dùng `vi.useFakeTimers()` + promise fetch giữ pending, assert reject ~30s. Chạy `pnpm vitest run src/lib/__tests__/ai.test.ts` — fail.
- [ ] Implement `src/lib/ai.ts` theo interface trên (copy structure fail-early của `src/lib/auth-secrets.ts`). Chạy lại vitest — pass.
- [ ] Commit: `feat(ai): upstream config + forward helper cho /api/ai`

---

## Task 2: Route `POST /api/ai` (auth, zod, rate limit, error mapping)

**Files:**
- Create: `app-next/src/app/api/ai/route.ts`
- Create: `app-next/src/app/api/ai/__tests__/route.test.ts`

**Interfaces:**

```ts
// POST /api/ai
// Request:  { messages: [{ role: "user" | "assistant", content: string }, ...], maxTokens?: number }
// Response 200: { text: string }
// Errors (JSON { error: string }):
//   401 unauthorized   — chưa đăng nhập
//   400 invalidBody    — zod fail
//   413 tooLong        — tổng content > 4000 ký tự hoặc > 20 messages
//   429 rateLimit      — > 10 request / 60s / user (in-memory Map, key = session.user.id)
//   503 noConfig       — thiếu secret (resolveAiConfig ném)
//   502 upstreamDown   — UpstreamError từ callUpstream
// Upstream system prompt (ghép đầu messages trong route, KHÔNG nhận từ client):
//   "Bạn là Tiểu Ngữ, trợ lý học tiếng Trung của app Bye HSK. Trả lời ngắn gọn bằng
//    tiếng Việt, giải thích pinyin/ý nghĩa khi hữu ích, khuyến khích người học."
```

Route theo đúng pattern `src/app/api/v1/shadowing/progress/route.ts`: `getAuth().api.getSession({ headers: req.headers })` → 401; `NextResponse.json`.

Rate limit: module-level `const buckets = new Map<string, number[]>()`; export helper `export function __resetRateLimitForTest()` (hoặc export `buckets`) để test reset. Lọc timestamps > 60s trước, push hiện tại, `length > 10` → 429.

**Steps:**

- [ ] Viết `src/app/api/ai/__tests__/route.test.ts` theo pattern `src/app/api/v1/notebook/__tests__/entries.test.ts`: `vi.mock("@/lib/auth", () => ({ getAuth: () => ({ api: { getSession } }) }))`, mock `@/lib/ai` (`callUpstream` vi.fn, `UpstreamError` thật từ module thật hoặc mock class), mock `resolveAiConfig` trả cfg cố định. Helper `req(body)` dựng `new Request("http://localhost:3100/api/ai", ...)` cast `as unknown as NextRequest`. Cases: (1) 401 khi `getSession` null; (2) 400 khi body sai (thiếu messages, role lạ, content không phải string); (3) 413 khi > 20 messages hoặc tổng > 4000 ký tự; (4) 429 sau request thứ 11 trong 60s (reset buckets trong `beforeEach`); (5) 200 `{ text }` khi upstream ok — assert `callUpstream` nhận messages có system prompt ở đầu và KHÔNG chứa user id; (6) 502 khi callUpstream throw UpstreamError(502); (7) 503 khi resolveAiConfig throw; (8) maxTokens client bị chặn cận trên (clamp ≤ 2048). Chạy `pnpm vitest run src/app/api/ai/__tests__/route.test.ts` — fail.
- [ ] Implement `route.ts` theo interfaces (zod schema: `messages: z.array(z.object({ role: z.enum(["user","assistant"]), content: z.string().min(1).max(4000) })).min(1).max(20)`, `maxTokens: z.number().int().min(16).max(2048).optional()`). Chạy lại — pass.
- [ ] `pnpm vitest run` toàn bộ để chắc không vỡ test khác. Commit: `feat(ai): POST /api/ai route với auth, rate limit, error mapping`

---

## Task 3: Widget "Tiểu Ngữ" gọi /api/ai thật

**Files:**
- Modify: `app-next/src/components/social/ai-widget.tsx`
- Create: `app-next/src/components/social/__tests__/ai-widget.test.tsx`

**Interfaces:**

```ts
// Trong widget: giữ mảng hội thoại gửi lên route dạng
// { role: "user" | "assistant", content: string }[] (map từ state messages hiện có,
// bỏ message chào). Gọi fetch("/api/ai", { method: "POST", body: JSON.stringify({ messages }) }).
// Loading: state `pending: boolean` — hiện bubble "…" thay reply.
// Lỗi: đọc res.status → toast: 429 "Bạn hỏi nhanh quá, chờ chút nhé!",
//   502/503 "Trợ lý AI đang bận, thử lại sau nhé!", 401 → hiện nút mời đăng nhập.
// Guest (chưa loggedIn): panel thay input bằng nút Link đăng nhập ("Đăng nhập để hỏi Tiểu Ngữ").
```

**Steps:**

- [ ] Viết `ai-widget.test.tsx` (vitest + testing-library, mock `fetch` và `useSession`): (1) user gửi tin → có fetch POST /api/ai với body chứa message; (2) response ok → render text reply vào panel; (3) res 429 → toast đúng; (4) `loggedIn: false` → không gọi fetch khi bấm gửi, thấy nút "Đăng nhập để hỏi Tiểu Ngữ". Chạy — fail.
- [ ] Sửa `ai-widget.tsx`: xóa `REPLY_TEXT` + `setTimeout` mock; thêm `send` async theo interfaces (giữ nguyên mount-gate bubble, UI panel, các nút "Nhắn tin"/"Ứng hộ" như cũ); thêm system-role guidance chỉ ở phía gửi (route đã chèn system prompt, widget chỉ gửi user/assistant). Giữ lịch sử hội thoại trong state component (session component, mất khi reload là chấp nhận). Chạy — pass.
- [ ] Commit: `feat(ai): widget Tiểu Ngữ gọi /api/ai thật, guest mời đăng nhập`

---

## Task 4: Nút "Giải thích ngữ pháp" (grammar card + lesson)

**Files:**
- Modify: `app-next/src/components/my-grammar/grammar-card.tsx`
- Create: `app-next/src/components/my-grammar/__tests__/grammar-explain.test.tsx`
- Modify (nếu lesson có điểm ngữ pháp riêng, kiểm tra `app-next/src/components/lesson/lesson-client.tsx` khi thực hiện — nút tái dùng cùng helper): create `app-next/src/lib/ai-client.ts`

**Interfaces:**

```ts
// src/lib/ai-client.ts — helper chung cho các use case phụ (widget vẫn tự gọi trực tiếp):
export async function askAi(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<string>;
// fetch("/api/ai") → res.ok ? data.text : throw Error(String(res.status))
// Consumer catch → tự toast thân thiện.

// grammar-card: nút "🤖 Giải thích" cạnh 🔊 example → gọi askAi với 1 message:
// `Giải thích điểm ngữ pháp "${point.title}" (${point.hz}, ${point.level}) cho người Việt:
//  công thức, cách dùng, 3 ví dụ có pinyin, và bẫy thường gặp.` + nội dung def hiện có làm ngữ cảnh.
// Kết quả render trong <details> mở rộng trong card (state `explain: string | null`), loading "…".
```

**Steps:**

- [ ] Viết test `grammar-explain.test.tsx` (mock `@/lib/ai-client`): bấm nút "Giải thích" → askAi được gọi với content chứa `point.title` và `point.hz`; resolve → text hiện trong card; reject → toast lỗi. Chạy — fail.
- [ ] Tạo `src/lib/ai-client.ts`, thêm nút + khối giải thích vào `grammar-card.tsx`. Nếu trong lúc đọc thấy lesson (`lesson-client.tsx`) render GrammarPoint cùng type `@/content/grammar-points`, tái dùng nút qua cùng helper (extract 1 component nhỏ `grammar-explain.tsx` trong `components/my-grammar/` nếu cần share — quyết định khi code, không tạo trước). Chạy — pass.
- [ ] `pnpm test:e2e e2e/ai-assistant.spec.ts` (viết ở Task 7) hoặc `pnpm vitest run` — pass. Commit: `feat(ai): giải thích điểm ngữ pháp bằng AI trong grammar card`

---

## Task 5: "Chấm viết" trong Hanzi Studio (dạng gõ text — upstream text-only)

**Files:**
- Modify: `app-next/src/components/hanzi/studio/studio-workbench.tsx`
- Create: `app-next/src/components/hanzi/studio/__tests__/writing-check.test.tsx`

**Interfaces:**

```ts
// Trong workbench khi đang luyện 1 chữ (data.kind === "char", glyph = meta.ch):
// thêm mục "✍️ Chấm viết" — textarea gõ 1 câu tiếng Trung có chứa glyph, nút "Chấm".
// Gọi askAi([{ role: "user", content: `Chấm câu sau có dùng đúng chữ "${glyph}" 
//   (${meaning ?? ""}) không: "${text}". Chỉ ra lỗi dụng từ/thứ tự, sửa lại, giải thích ngắn.` }])
// Kết quả render block kết quả; lỗi → toast "Chấm viết tạm thời không khả dụng".
// KHÔNG gửi ảnh canvas — upstream text-only.
```

**Steps:**

- [ ] Viết `writing-check.test.tsx` (mock `@/lib/ai-client`): nhập câu chứa glyph → bấm Chấm → askAi gọi với content chứa glyph và câu; kết quả render; lỗi → toast. Chạy — fail.
- [ ] Implement trong `studio-workbench.tsx` (chỉ khi `isChar`; tôn trọng style card hiện có). Chạy — pass.
- [ ] Commit: `feat(ai): chấm viết dạng text trong hanzi studio`

---

## Task 6: "Tạo reading từ văn bản" nối AI (reading-client)

**Files:**
- Modify: `app-next/src/app/(app)/reading/reading-client.tsx`
- Create: `app-next/src/app/(app)/reading/__tests__/reading-ai.test.tsx`

**Bối cảnh đã verify:** `createDoc()` hiện tách câu từ văn bản dán và dựng quiz phía client từ demo doc (`buildSentences`), chưa có bản dịch pinyin/vi cho văn bản lạ.

**Interfaces:**

```ts
// Sau createDoc() thành công (sentences.length > 0), thêm nút "✨ AI dịch & chú thích"
// → 1 lần askAi với messages gộp (giữ ≤ 20 messages của route):
//   mỗi câu 1 message user: `Dịch câu sau sang tiếng Việt và thêm pinyin, trả JSON
//    {"zh":"...","py":"...","vi":"..."}: <câu>`
// → parse JSON cẩn thận (thử JSON.parse, bọc try, fail câu nào bỏ qua câu đó — KHÔNG dùng response đánh dấu *).
// Gán pinyin/vi vào sentences tương ứng (match theo zh), toast "Đã chú thích bằng AI".
// Lỗi (429/502) → toast "AI đang bận, thử lại sau".
```

**Steps:**

- [ ] Viết `reading-ai.test.tsx` (mock `@/lib/ai-client`, mock `readingData` như test reading hiện có trong `src/components/reading/__tests__/` nếu có tham chiếu): tạo doc từ văn bản → bấm nút AI → askAi gọi; trả JSON hợp lệ → sentences có py/vi; trả rác → không crash, giữ nguyên doc. Chạy — fail.
- [ ] Implement trong `reading-client.tsx`. Chạy — pass. Commit: `feat(ai): chú thích pinyin + dịch AI cho bài đọc tự tạo`

---

## Task 7: E2E — widget gửi tin nhắn nhận phản hồi (mock upstream)

**Files:**
- Create: `app-next/e2e/ai-assistant.spec.ts`

**Bối cảnh đã verify:** Playwright config (`app-next/playwright.config.ts`) webServer `pnpm dev` port 3100, `reuseExistingServer: true`. Upstream thật không gọi được từ e2e → route phải đọc được URL từ env.

**Interfaces:**

```ts
// e2e/ai-assistant.spec.ts:
// Cách mock upstream: trước khi chạy, trong test dùng pw tự ký session là phức tạp
// (better-auth Google OAuth) → dùng 1 trong 2, chọn khi thực hiện:
//   (A) Playwright route mock: page.route("**/api/ai", ...) trả { text: "Chào bạn!" }
//       — e2e chỉ verify UI widget (guest thấy nút đăng nhập; nếu có user đăng nhập
//       trong e2e hiện có — xem e2e/learning-flow.spec.ts có fixture login — thì test gửi nhắn nhận reply).
//   (B) Nếu có user test đăng nhập được: set env AI_UPSTREAM_URL về mock server
//       (Playwright page.route chặn https://buffproxy...** trước khi webServer start qua
//       process.env trong playwright.config — chỉ làm nếu (A) không đủ).
// Assertions: mở trang bất kỳ có AiWidget (check app-next/src/components/shell — widget mount ở layout),
// bấm mascot "Hỏi AI" → panel mở; guest → thấy "Đăng nhập để hỏi Tiểu Ngữ";
// (nếu login được) gửi "xin chào" → thấy "Chào bạn!" trong panel.
```

**Steps:**

- [ ] Đọc `e2e/learning-flow.spec.ts` và `e2e/social-smoke.spec.ts` để xem có fixture đăng nhập không; viết spec theo (A) trước. Chạy `pnpm test:e2e e2e/ai-assistant.spec.ts` — fail rồi pass.
- [ ] Ghi `docs/superpowers/plans/` NOTE (chỉ trong PR description, không file mới): lệnh setup secrets cho owner:
  `wrangler secret put AI_UPSTREAM_URL` (giá trị `https://buffproxy.softtip88.workers.dev/v1/chat/completions`), `wrangler secret put AI_UPSTREAM_KEY` (key do owner cấp). Dev: thêm 2 biến vào `app-next/.env.local`.
- [ ] Commit: `test(ai): e2e widget Tiểu Ngữ với upstream mock`

---

## Ghi chú vận hành (đưa vào PR description)

- Nội dung chat đi qua buffproxy — proxy bên thứ ba KHÔNG kiểm soát: không gửi PII (userId/email), chỉ gửi văn bản học; ghi disclaimer nhẹ trong widget footer ("Nội dung AI chỉ mang tính tham khảo").
- Upstream chết → route trả 502, UI toast gọn "Trợ lý AI đang bận, thử lại sau nhé!" — không crash, không retry tự động.
- Hoán đổi upstream: chỉ đổi 2 secret `AI_UPSTREAM_URL`/`AI_UPSTREAM_KEY` (miễn là OpenAI-compatible `/v1/chat/completions`), model chỉnh 1 hằng `AI_MODEL` trong `src/lib/ai.ts`.

## Self-review checklist

- [x] Đường dẫn file chính xác, đã verify tồn tại trong repo (ai-widget.tsx, shadowing route pattern, notebook test pattern, auth-secrets fallback pattern, playwright config, GrammarPoint type, reading-client createDoc, studio-workbench isChar/glyph).
- [x] Không có key/URL secret nhạy cảm ngoài mô tả upstream owner cấp (URL đã được owner cho phép ghi).
- [x] Mỗi task: test-first, lệnh test cụ thể, commit message.
- [x] Route contract 1 cổng duy nhất, secrets không vào client bundle (chỉ route đọc qua getCloudflareContext/env fallback).
- [x] Upstream text-only → chấm viết dạng gõ text, không ảnh canvas.
- [x] Streaming không bắt buộc → full text + loading state (đơn giản hơn, đã ghi rõ).
