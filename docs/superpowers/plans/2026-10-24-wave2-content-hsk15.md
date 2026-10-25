# Content HSK 1–5 (AI batch) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Thực hiện từng task theo đúng thứ tự; không nhảy cóc, không đánh dấu checkbox mà chưa chạy được lệnh verify tương ứng.

**Spec:** /Volumes/samsung512/Code/hsk/docs/superpowers/specs/2026-10-24-hsk15-roadmap-design.md (mục W2.1–W2.5)

**Goal:** Thay content demo (155 từ / 20 bài, 6 điểm grammar) bằng word list HSK 3.0 thật cho hsk1..hsk5 (500 → 4316 từ cumulative, có pinyin): import dataset công khai MIT, batch script gọi LLM buffproxy sinh nghĩa tiếng Việt + ví dụ + âm Hán Việt đúng schema `VocabWord` hiện có (component không đổi), chia bài 15–25 từ theo chủ đề, seed D1 local + remote, đồng bộ static fallback, và grammar HSK1–5 (~60 điểm/level) lên D1 `content_grammars` + content layer + dehardcode trang my-grammar.

**Architecture:**
- Dataset nguồn: **`ivankra/hsk30`** (MIT, https://github.com/ivankra/hsk30) — CSV HSK 3.0 2021, cột Simplified/Pinyin/Level, đã clean + cross-check. Vendor vào `app-next/scripts/content/vendor/` (**gitignored**, chỉ cần lúc build); file tải lại bằng lệnh curl ghi trong README. Lý do không dùng `scripts/vendor/hsk.json` có sẵn: đó là list HSK **2.0** (150/150/300/600/1300/2500 theo level → 5000), không phải chuẩn 3.0 mà spec yêu cầu (500 → 4316).
- Script batch là **TS chạy bằng `pnpm dlx tsx`** (tiền lệ `gen-vocab-seed.mts`), tách module thuần trong `app-next/scripts/content/src/` — unit test bằng vitest (vitest.config thêm include `scripts/content/__tests__/`).
- LLM: endpoint OpenAI-compatible, cấu hình qua env **`CONTENT_LLM_BASE_URL` / `CONTENT_LLM_KEY` / `CONTENT_LLM_MODEL`** trong `app-next/.env.local` (file đã gitignored — verify ở Task 0). Key KHÔNG bao giờ xuất hiện trong code, plan output hay commit.
- Resume: state file JSON trong `app-next/scripts/content/out/` (gitignored) — chunk đã xong được skip khi chạy lại.
- Kết quả đã review được **commit vào repo** tại `app-next/scripts/content/data/` (JSON) → script sinh lại `src/content/vocab.ts` (cùng exports/types, dữ liệu mới) + seed SQL. Không đổi shape nào của `VocabWord`/`VocabLesson` nên toàn bộ component vocab giữ nguyên.
- Grammar: migration **0005** tạo bảng `content_grammars`; content layer `src/lib/content/grammar.ts` + API `/api/v1/content/grammar` + client loader, theo đúng tiền lệ vocab (`src/lib/content/vocab.ts` + `/api/v1/content/vocab`); `src/content/grammar-points.ts` chuyển thành static fallback cho guest/offline. Lưu ý: branch `my-grammar-d1` đang làm **user data** (notebook_entries kind grammar, ★ đã lưu) — phạm vi khác, task này KHÔNG đụng branch đó; chỉ giữ tương thích field `level`/`topic`.

**Tech Stack:** Next.js 16 + TS + Drizzle + Cloudflare D1 (pnpm bắt buộc), `pnpm dlx tsx` chạy script, vitest, wrangler d1, buffproxy OpenAI-compatible chat completions.

## Global Constraints (bắt buộc đọc trước khi làm bất kỳ task nào)

1. **pnpm bắt buộc** trong `app-next/`; không dùng npm/yarn. KHÔNG chạy `pnpm build` — chỉ `pnpm test`, `pnpm typecheck`, `pnpm lint` và các lệnh script/wrangler được liệt kê.
2. **Key LLM:** chỉ đọc từ env `CONTENT_LLM_BASE_URL`, `CONTENT_LLM_KEY`, `CONTENT_LLM_MODEL` (`.env.local`). Cấm ghi key/URL có key vào bất kỳ file nào được commit, cấm `console.log` key. Base URL mặc định dùng lúc chạy: `https://buffproxy.softtip88.workers.dev/v1/chat/completions`, model `smart-router/fallback` — nhưng **chỉ qua env**, không hardcode.
3. **Pháp lý:** word list HSK 3.0 là tiêu chuẩn công khai (nguồn văn bản Bộ Giáo dục TQ, vendor MIT). Nghĩa/ví dụ do LLM sinh + owner review — KHÔNG copy meaning/ví dụ từ database hay curated content của nhaihsk.
4. **Schema không đổi:** `VocabWord`/`VocabLesson` (`app-next/src/content/vocab.ts`) và `GrammarPoint` (`app-next/src/content/grammar-points.ts`) giữ nguyên shape; component import type qua đó không sửa. Dữ liệu D1 row `content_vocabs` phải parse được bằng `vocabWordSchema` (`src/content/schema.ts`).
5. **TDD bắt buộc:** mỗi task viết test trước, chạy thấy fail, implement, chạy pass, rồi mới commit (conventional commit, tiếng Việt không dấu trong subject như tiền lệ repo). Cấm placeholder: không TBD/TODO/"xử lý sau".
6. Chỉ sửa file được liệt kê trong từng task. `pnpm dlx tsx` chạy từ thư mục `app-next/`.
7. DB: local D1 tên `hsk` (config `app-next/wrangler.jsonc`), remote dev `hsk-dev` (`wrangler.dev.jsonc`). Prod `hsk --remote` chỉ lúc deploy — ngoài phạm vi plan.

---

## Task 1: Vendor word list HSK 3.0 + parser (W2.1)

**Files:**
- Create: `app-next/scripts/content/.gitignore` — nội dung: `out/\n.venv/\nvendor/\n`
- Create: `app-next/scripts/content/README.md` — ghi lệnh tải dataset (bước 1 bên dưới) + lệnh chạy các script của plan này
- Create: `app-next/scripts/content/src/hsk-list.ts`
- Create: `app-next/scripts/content/__tests__/hsk-list.test.ts`
- Modify: `app-next/vitest.config.ts` — thêm `scripts/content/__tests__` vào `test.include`

**Interfaces:**
- Consumes: `app-next/scripts/content/vendor/hsk30-expanded.csv` (tải từ repo `ivankra/hsk30`, MIT — nằm trong `scripts/content/vendor/` gitignored).
- Produces:
  - `type HskEntry = { hanzi: string; pinyin: string; level: number }`
  - `parseHsk30Csv(csv: string): HskEntry[]` — đọc header, map cột theo tên (`simplified`, `pinyin`, `level`, không phụ thuộc thứ tự cột); level `"7-9"` bỏ qua.
  - `wordsForLevels(entries: HskEntry[], maxLevel: number): HskEntry[]` — cumulative level ≤ maxLevel, dedupe theo `hanzi` giữ lần xuất hiện level thấp nhất, giữ nguyên thứ tự file.
- Hằng số chuẩn HSK 3.0 dùng ở mọi task sau: `export const EXPECTED_CUMULATIVE = { 1: 500, 2: 1272, 3: 2245, 4: 3245, 5: 4316 } as const;`

**Steps:**
- [ ] Sửa `app-next/vitest.config.ts`:
  ```ts
  include: ["src/**/*.test.{ts,tsx}", "scripts/content/__tests__/**/*.test.ts"],
  ```
- [ ] Tải dataset (không commit):
  ```bash
  mkdir -p /Volumes/samsung512/Code/hsk/app-next/scripts/content/vendor
  curl -L -o /Volumes/samsung512/Code/hsk/app-next/scripts/content/vendor/hsk30-expanded.csv \
    https://raw.githubusercontent.com/ivankra/hsk30/main/hsk30-expanded.csv
  head -2 /Volumes/samsung512/Code/hsk/app-next/scripts/content/vendor/hsk30-expanded.csv
  ```
  Ghi lệnh này + URL + "License: MIT (code), dữ liệu nguồn văn bản Bộ GD&ĐT TQ" vào `scripts/content/README.md`.
- [ ] Viết test fail trước: `hsk-list.test.ts` — (1) parse sample CSV inline 5 dòng (header + 2 từ level 1 + 1 từ level 2 + 1 dòng level `"7-9"`) ra đúng 3 entries, pinyin giữ nguyên dấu; (2) `wordsForLevels` dedupe trùng hanzi giữa level 1/2, cumulative ≤ level; (3) test tích hợp đọc file vendor thật (skip nếu file chưa tồn tại bằng `describe.skipIf(!existsSync(...))`) assert `wordsForLevels(parseHsk30Csv(csv), n).length === EXPECTED_CUMULATIVE[n]` cho n=1..5. Chạy `pnpm vitest run scripts/content` thấy fail (module chưa có).
- [ ] Implement `hsk-list.ts` (parser thuần, không I/O trừ test đọc file). Chú ý level trong CSV là chuỗi `"1".."6"`/`"7-9"` — parseInt an toàn, bỏ entry không parse được; trim hanzi, bỏ entry hanzi rỗng.
- [ ] Chạy `pnpm vitest run scripts/content` — pass. Nếu số cumulative lệch `EXPECTED_CUMULATIVE`: DỪNG, kiểm tra lại rule dedupe/cột level; không được sửa test cho khớp số sai rồi âm thầm commit — báo lại owner kết quả đếm thật trước khi quyết định.
- [ ] Commit: `feat(content): vendor HSK 3.0 word list + parser (W2.1)`

---

## Task 2: LLM client OpenAI-compatible + retry (W2.2)

**Files:**
- Create: `app-next/scripts/content/src/llm.ts`
- Create: `app-next/scripts/content/__tests__/llm.test.ts`

**Interfaces:**
- Consumes: env `CONTENT_LLM_BASE_URL` (đủ đường dẫn `/v1/chat/completions`), `CONTENT_LLM_KEY`, `CONTENT_LLM_MODEL`.
- Produces:
  - `type LlmConfig = { baseUrl: string; key: string; model: string }`
  - `llmConfigFromEnv(env: Record<string, string | undefined>): LlmConfig` — throw `Error("Thiếu env CONTENT_LLM_*")` nếu thiếu biến nào, message **không** chứa giá trị key.
  - `extractJson(content: string): unknown` — cắt code fence ```json …```, JSON.parse, throw nếu fail.
  - `chatJson<T>(cfg: LlmConfig, messages: { role: "system" | "user"; content: string }[], opts?: { retries?: number; baseDelayMs?: number; fetchImpl?: typeof fetch }): Promise<T>` — POST `{ baseUrl, headers Authorization: Bearer`, body `{ model, messages, temperature: 0.3, response_format: { type: "json_object" } } }`; HTTP != 200 hoặc JSON hỏng → retry exponential (retries mặc định 4, delay `baseDelayMs * 2^attempt`); hết retries → throw kèm status (không kèm key).

**Steps:**
- [ ] Viết test fail trước: mock `fetchImpl` bằng fetch stub trả sẵn Response — (1) `llmConfigFromEnv` throw khi thiếu key; (2) `chatJson` gọi đúng URL/body (assert `Authorization: Bearer test-key`, `model`), trả `parsed.data`; (3) fence ```json được cắt; (4) lần 1 trả HTTP 500, lần 2 OK → vẫn thành công và fetch gọi đúng 2 lần (inject `baseDelayMs: 1`); (5) luôn lỗi 500 sau 2 retries → throw. Chạy thấy fail.
- [ ] Implement `llm.ts` (fetch global của Node 20+; dùng `opts.fetchImpl ?? fetch`).
- [ ] Chạy `pnpm vitest run scripts/content` — pass. Kiểm tra `pnpm typecheck` không lỗi mới ở scripts (tsx không check, nhưng import type dùng chung phải sạch).
- [ ] Thêm 3 biến env vào `app-next/.env.local` (file gitignored — verify bằng `git -C /Volumes/samsung512/Code/hsk check-ignore app-next/.env.local`):
  ```bash
  printf '\nCONTENT_LLM_BASE_URL=https://buffproxy.softtip88.workers.dev/v1/chat/completions\nCONTENT_LLM_KEY=<key owner cấp — paste tay, không commit>\nCONTENT_LLM_MODEL=smart-router/fallback\n' >> /Volumes/samsung512/Code/hsk/app-next/.env.local
  ```
- [ ] Verify .env.local không bị track: `git -C /Volumes/samsung512/Code/hsk check-ignore app-next/.env.local` phải in đúng đường dẫn. Không smoke LLM ở task này — smoke gọi thật nằm ở Task 4 (sau khi có CLI tự đọc `.env.local` bằng `node:fs`, không thêm dependency dotenv).
- [ ] Commit: `feat(content): llm client cho batch script (W2.2)`

---

## Task 3: Prompt build + parse/validate response vocab (W2.2)

**Files:**
- Create: `app-next/scripts/content/src/vocab-word.ts`
- Create: `app-next/scripts/content/src/vocab-draft.ts`
- Create: `app-next/scripts/content/__tests__/vocab-draft.test.ts`

**Interfaces:**
- Consumes: `toPinyin` từ `../../src/lib/pinyin-utils` (module thuần, không import ngoài); `vocabWordSchema`, `exampleSchema` từ `../../src/content/schema`; logic `perChar`/`W` port từ `src/content/vocab.ts` (hàm private trong file đó, không export — port 1:1, không sửa file gốc ở task này).
- Produces:
  - `buildWord(hanzi, pinyinNumbered, hanViet, meaning, pos, exZh, exPyNumbered, exVi): VocabWord` — pinyin có số → `toPinyin` thành dấu; `example.pinyinPerChar` khớp 1-1 số ký tự `exZh` (dấu câu `，。？！、：；…—` giữ nguyên `py = c`), in hoa Hán Việt do LLM trả sẵn.
  - `buildVocabPrompt(level: number, chunk: { hanzi: string; pinyin: string }[]): { role: "system" | "user"; content: string }[]` — system: yêu cầu JSON `{"words":[...]}` với field `hanzi, hanViet (CHỮ IN HOA, âm Hán Việt chuẩn), meaning (tiếng Việt, ngắn gọn ≤ 12 từ), pos (một trong: Danh từ/Động từ/Tính từ/Phó từ/Đại từ/Số từ/Lượng từ/Trợ từ/Liên từ/Thán từ/Hậu tố/Cụm từ), exZh (1 câu ngắn dùng đúng từ, mức độ khó theo level), exPy (pinyin kèm số thanh điệu 1-5, mỗi âm tiết cách nhau dấu cách, dấu câu tách bằng dấu cách), exVi (dịch câu ví dụ)`. Mỗi chunk ≤ 20 từ. User: JSON list `[{hanzi, pinyin}]` của chunk. Prompt cấm chép nội dung từ bất kỳ nguồn có bản quyền — chỉ dùng kiến thức ngôn ngữ.
  - `parseVocabResponse(level: number, chunk: { hanzi: string; pinyin: string }[], content: string): VocabWord[]` — `extractJson` → zod mỗi item qua `vocabWordSchema` (qua `buildWord`) → assert: (a) đúng thứ tự và đủ số lượng so với chunk (LLM phải trả từng từ, thiếu/tứ tự sai → throw liệt kê hanzi thiếu); (b) `example.pinyinPerChar.length === Array.from(exZh).length`; (c) mỗi `pos` thuộc bộ enum trên. Bất kỳ fail → throw với index + hanzi lỗi.
- Types: `import type { VocabWord } from "../../src/content/vocab"` (type-only, không kéo data).

**Steps:**
- [ ] Viết test fail trước: (1) `buildWord("你好", "ni3 hao3", "NHĨ HẢO", "Xin chào", "Cụm từ", "李明，你好。", "li3 ming2 , ni3 hao3 .", "Chào Lý Minh")` === object trong `src/content/vocab.ts` lesson-1 word 0 (so sánh `toEqual`); (2) pinyin đã có dấu ("nǐ hǎo") giữ nguyên; (3) prompt chứa đúng 20 hanzi của chunk và yêu cầu JSON schema; (4) parse response hợp lệ ra đúng thứ tự; (5) response thiếu 1 từ → throw tên từ thiếu; (6) `pos` sai ("danh tu") → throw; (7) pinyinPerChar sai độ dài → throw. Chạy thấy fail.
- [ ] Implement 2 module. `perChar` port đúng regex `PUNCT = /[，。？！、：；…—]/` của file gốc; pinyinPerChar output dạng dấu (như seed hiện có: `py: "lǐ"`).
- [ ] `pnpm vitest run scripts/content` — pass.
- [ ] Commit: `feat(content): prompt + parse/validate vocab draft (W2.2)`

---

## Task 4: CLI `gen-vocab-batch.mts` — chunk + resume (W2.2)

**Files:**
- Create: `app-next/scripts/content/src/batch-state.ts`
- Create: `app-next/scripts/content/src/read-env.ts`
- Create: `app-next/scripts/content/gen-vocab-batch.mts`
- Create: `app-next/scripts/content/__tests__/batch-state.test.ts`

**Interfaces:**
- Consumes: Task 1 (`hsk-list`, `EXPECTED_CUMULATIVE`), Task 2 (`llm.ts`), Task 3 (`vocab-draft.ts`).
- Produces:
  - `readEnvFile(path: string): Record<string, string>` — parse `.env.local` dòng `KEY=VALUE` (bỏ comment `#`, trim quote), KHÔNG override biến đã có trong `process.env`.
  - `type ChunkState = { level: number; chunkIndex: number; status: "done"; words: VocabWord[] };` `loadState(outDir: string): Set<string>` (key `"<level>:<chunkIndex>"` đã done), `saveState(outDir: string, s: ChunkState): void` — ghi atomic qua file tạm + `renameSync`.
  - CLI: `pnpm dlx tsx scripts/content/gen-vocab-batch.mts --level 1..5 [--only N] [--out scripts/content/out/vocab-batch]`
    - Đọc `scripts/content/vendor/hsk30-expanded.csv` → wordsForLevels → chunk 20 từ/chunk.
    - Với mỗi chunk chưa done: gọi `chatJson` → `parseVocabResponse` → `saveState`. Retry vốn có trong `chatJson`; chunk fail sau retries → in lỗi và dừng (exit 1) giữ state các chunk trước.
    - Ghi kết quả gộp: `out/vocab-batch/draft-hsk<level>.json` dạng `[{ hanzi, pinyin, hanViet, meaning, pos, example }]` (shape VocabWord, không localStorage gì cả).
- File output (gitignored): `app-next/scripts/content/out/vocab-batch/{state/,draft-hsk1..5.json}`.

**Steps:**
- [ ] Viết test fail trước cho `batch-state` + `read-env` (module thuần, tmp dir): save→load vòng tròn; atomic (không rò file tạm); key set đúng; readEnvFile parse quote/comment, ưu tiên process.env. Chạy thấy fail.
- [ ] Implement `batch-state.ts`, `read-env.ts`, rồi CLI `gen-vocab-batch.mts` (I/O mỏng, logic đã test).
- [ ] Smoke chạy thật 1 chunk level 1 (state + draft ghi đúng, chạy lần 2 skip chunk đã done — verify bằng log "skip chunk 0"):
  ```bash
  cd /Volumes/samsung512/Code/hsk/app-next
  pnpm dlx tsx scripts/content/gen-vocab-batch.mts --level 1 --only 0
  pnpm dlx tsx scripts/content/gen-vocab-batch.mts --level 1 --only 0   # phải skip
  ```
- [ ] Commit: `feat(content): gen-vocab-batch CLI chunk+resume (W2.2)`

---

## Task 5: Chạy batch đủ 5 levels + owner spot-check (W2.2 review)

**Files:**
- Create (commit): `app-next/scripts/content/data/vocab/hsk1.json` … `hsk5.json` — **bản đã review**, format = draft-hskN.json (mảng VocabWord). Đây là nguồn thật cho Task 6–8.
- Test: không unit test mới (task chạy + review) — verify bằng lệnh validate bên dưới.

**Interfaces:**
- Consumes: Task 4 CLI, env Task 2.
- Produces: 5 file JSON data trong repo (~4316 từ tổng), mỗi từ đủ `hanzi/pinyin/hanViet/meaning/pos/example`.

**Steps:**
- [ ] Chạy batch toàn bộ (chạy nền, resume được nếu đứt):
  ```bash
  cd /Volumes/samsung512/Code/hsk/app-next
  for lv in 1 2 3 4 5; do pnpm dlx tsx scripts/content/gen-vocab-batch.mts --level $lv; done
  ```
- [ ] Validate toàn bộ bằng vitest không cần file mới — thêm test thuần vào `scripts/content/__tests__/vocab-data.test.ts`:
  - mỗi `data/vocab/hskN.json` đủ `EXPECTED_CUMULATIVE[N]` từ, không trùng hanzi, mọi word pass `vocabWordSchema`, `pinyinPerChar` khớp số ký tự, `hanViet` viết hoa toàn bộ (regex `/^[A-ZÀ-ỸỲỆỨỬỮỰĂÂÊÔƠƯĐ][A-ZÀ-ỸỲỆỨỬỮỰĂÂÊÔƠƯĐ\s,]*$/`).
  - TDD: viết test trước khi copy data (fail vì chưa có file) → copy draft vào `data/vocab/` → pass.
- [ ] **Owner spot-check 5%/level** (bắt buộc theo spec): sinh bảng review cho owner bằng lệnh mẫu hàng ngẫu nhiên 25 từ/level:
  ```bash
  pnpm dlx tsx -e 'import {readFileSync} from "node:fs"; const f="scripts/content/data/vocab/hsk1.json"; const a=JSON.parse(readFileSync(f,"utf8")); for(const w of a.sort(()=>Math.random()-.5).slice(0,25)) console.log(w.hanzi, "|", w.pinyin, "|", w.hanViet, "|", w.meaning, "|", w.example.zh, "|", w.example.vi)'
  ```
  Checklist review mỗi từ: (1) Hán Việt đúng âm (không đoán láy) và IN HOA; (2) nghĩa tiếng Việt chính xác, không máy móc; (3) ví dụ tự nhiên, đúng level, dịch khớp; (4) pinyinPerChar khớp câu zh. Từ sai → sửa trực tiếp file JSON (hoặc chạy lại chunk tương ứng sau khi xoá state) → chạy lại validate. KHÔNG commit trước khi owner xác nhận từng level (block Task 8 ở bước commit).
- [ ] Commit: `feat(content): vocab dataset HSK 3.0 hsk1-5 da review (W2.2)`

---

## Task 6: Chia bài 15–25 từ/bài theo chủ đề (W2.3)

**Files:**
- Create: `app-next/scripts/content/src/lessons.ts`
- Create: `app-next/scripts/content/gen-lessons.mts`
- Create: `app-next/scripts/content/__tests__/lessons.test.ts`
- Create (commit): `app-next/scripts/content/data/vocab/lessons-hsk1.json` … `lessons-hsk5.json`

**Interfaces:**
- Consumes: `data/vocab/hskN.json` (Task 5), `llm.ts`.
- Produces:
  - `type LessonSplit = { title: string; hanziList: string[] }[]`
  - `validateSplit(level: number, allHanzi: string[], split: LessonSplit): void` (thuần, throw có message rõ): mọi hanzi xuất hiện **đúng 1 lần**; bài đầu ≥ 15 từ, mọi bài ≤ 25 từ (cho phép bài cuối ≥ 8); title khác rỗng, không trùng; tổng số từ === `EXPECTED_CUMULATIVE[level]`.
  - `buildLessonPrompt(level, allHanzi): messages[]` — yêu cầu LLM gom nhóm theo chủ đề đời thường phù hợp level, trả `{"lessons":[{"title": "...(tiếng Việt)","hanziList":["你好",...]}]}` với điều kiện 15–25 từ/bài và dùng ĐỦ danh sách hanzi cho trước (thứ tự danh sách = thứ tự xuất hiện trong dataset).
  - CLI `gen-lessons.mts --level N [--retry]:` gọi LLM → `validateSplit` (fail → tự retry tối đa 5 lần kèm message lỗi vào prompt; vẫn fail → exit 1) → ghi `data/vocab/lessons-hskN.json`.

**Steps:**
- [ ] TDD `lessons.test.ts`: validateSplit throw khi thiếu từ / trùng từ / bài > 25 / title trùng; pass với split hợp lệ; buildLessonPrompt chứa số lượng từ đúng. Chạy thấy fail → implement → pass → commit `feat(content): chia bài vocab theo chu de (W2.3)`.
- [ ] Chạy thật 5 levels:
  ```bash
  cd /Volumes/samsung512/Code/hsk/app-next
  for lv in 1 2 3 4 5; do pnpm dlx tsx scripts/content/gen-lessons.mts --level $lv; done
  ```
- [ ] Review nhanh owner: in danh sách bài (`title + số từ`) mỗi level; bài quá ngắn (< 15, trừ bài cuối) yêu cầu chạy lại `--retry`. Số bài dự kiến: hsk1 ~25 bài, hsk2 ~38, hsk3 ~67, hsk4 ~108, hsk5 ~144 (từ 15–25 từ/bài).
- [ ] Commit data: `feat(content): lesson split hsk1-5 (W2.3)`

---

## Task 7: Sinh lại static `src/content/vocab.ts` + `courses.ts` (W2.4)

**Files:**
- Create: `app-next/scripts/content/gen-vocab-static.mts`
- Modify (generate lại): `app-next/src/content/vocab.ts` — **giữ nguyên**: imports, `PinyinPerChar`/`Example`/`VocabWord`/`VocabLesson` types, helper `py/perChar/W`, export const `vocab`. **Đổi dữ liệu**: hsk1..hsk5 = bài thật từ `data/vocab/`, hsk6 giữ nguyên 1 bài demo hiện có.
- Modify (generate lại phần data): `app-next/src/content/courses.ts` — thay `hsk1Titles` và config `hsk1..hsk5` bằng titles/words thật từ `lessons-hskN.json` + số từ từng bài (`makeBook`, `genLessons`, `genGrammar`, `genHanzi`, `books`, `courses` type và hsk6/hsk79 giữ nguyên — chỉ thay mảng `titles` của 5 book và `cardMeta` tính từ số từ thật, ví dụ `"500 từ vựng · 41 mẫu"` giữ nguyên phần mẫu ngữ pháp hiện có).
- Modify: `app-next/src/content/__tests__/content-validate.test.ts` — cập nhật expectation theo data mới: `hsk1` bài 1 là bài thực tế đầu tiên (assert động từ `data/vocab/lessons-hsk1.json[0]`: title khớp `vocab.hsk1["lesson-1"].title`, words === `EXPECTED_CUMULATIVE[1]`); giữ các assert zod/pinyinPerChar (tự động quét mọi book nên không cần sửa).
- Modify: `app-next/src/lib/content/__tests__/content-static.test.ts` — nếu assert cứng `["hsk1"..."hsk6"]` vẫn giữ (hsk6 còn demo, không hỏng).

**Interfaces:**
- Consumes: `data/vocab/hskN.json`, `data/vocab/lessons-hskN.json`, static cũ `src/content/vocab.ts` (để giữ helper + hsk6 demo).
- Produces: `vocab` (Record 6 book — hsk1..5 thật + hsk6 demo), `courses`/`books` với số bài thật. Component không đổi import nào.

**Steps:**
- [ ] Viết `gen-vocab-static.mts` trước như công cụ (không test riêng — logic buildWord đã test ở Task 3): đọc data → emit file TS: header comment ghi nguồn + ngày, phần types/helper copy nguyên văn từ file hiện tại (script đọc file hiện tại, cắt từ dòng `/* ================= HSK1` đến trước `export const vocab` của hsk6 demo giữ lại bằng marker), body emit `hskN["lesson-i"] = { title, words: [ /* JSON.stringify(w) từng word */ ] }`. Emit dạng object literal trực tiếp (không gọi W) vì dữ liệu đã có dấu pinyin đầy đủ.
- [ ] Chạy, rồi verify shape không hỏng:
  ```bash
  cd /Volumes/samsung512/Code/hsk/app-next
  pnpm dlx tsx scripts/content/gen-vocab-static.mts
  pnpm typecheck && pnpm vitest run src/content src/lib/content
  ```
- [ ] Emit lại phần data của `courses.ts` bằng tay theo output script (script in ra các mảng `titles`; dán vào file — phần logic dùng lại nguyên văn). Chỉnh `content-validate.test.ts` assertion bài 1 HSK1 như trên.
- [ ] `pnpm vitest run src/content src/lib/content` — pass (content-validate + content-static xanh với data mới).
- [ ] Commit: `feat(content): static vocab+courses HSK 3.0 (W2.4)`

---

## Task 8: Seed D1 local + remote (W2.4)

**Files:**
- Modify: `app-next/scripts/seed/gen-vocab-seed.mts` — không đổi logic (vẫn đọc `src/content/vocab.ts`, INSERT OR REPLACE theo PK `book+page_id`); chỉ cập nhật comment ghi nguồn data mới. Chạy lại để regenerate `drizzle/seeds/content-vocabs.sql`.
- Modify (generate): `app-next/drizzle/seeds/content-vocabs.sql` — 20 rows cũ → toàn bộ bài hsk1..hsk6.

**Interfaces:**
- Consumes: `src/content/vocab.ts` (Task 7).
- Produces: seed SQL nạp được cả local (`hsk --local`) và remote dev (`hsk-dev`); D1 row parse bằng `vocabWordSchema`.

**Steps:**
- [ ] Regenerate + nạp local:
  ```bash
  cd /Volumes/samsung512/Code/hsk/app-next
  pnpm dlx tsx scripts/seed/gen-vocab-seed.mts
  grep -c "INSERT OR REPLACE INTO content_vocabs" drizzle/seeds/content-vocabs.sql   # = tổng số bài hsk1..hsk6
  pnpm wrangler d1 execute hsk --local --file=drizzle/seeds/content-vocabs.sql
  pnpm wrangler d1 execute hsk --local --command "SELECT book, COUNT(*) c FROM content_vocabs GROUP BY book"
  ```
  Expect: hsk1/hsk2/hsk3/hsk4/hsk5 lần lượt ~25/38/67/108/144 bài, hsk6 = 1.
- [ ] Nạp remote dev (yêu cầu đã `wrangler login`; xác nhận trước khi chạy vì ghi D1 thật):
  ```bash
  pnpm wrangler d1 execute hsk-dev --remote --file=drizzle/seeds/content-vocabs.sql -c wrangler.dev.jsonc
  ```
- [ ] Verify app local: `pnpm dev` → GET `http://localhost:3100/api/v1/content/vocab` trả 5 book đủ bài; `/course` hiện số bài thật; mở bài cuối HSK5 (`/course/hsk5/lesson-<N>` mode vocab) chạy được.
- [ ] Commit: `feat(content): seed content_vocabs HSK 3.0 (W2.4)`

---

## Task 9: Grammar HSK1–5 draft qua LLM (W2.5)

**Files:**
- Create: `app-next/scripts/content/src/grammar-draft.ts`
- Create: `app-next/scripts/content/gen-grammar-batch.mts`
- Create: `app-next/scripts/content/__tests__/grammar-draft.test.ts`
- Create (commit): `app-next/scripts/content/data/grammar/grammar-hsk1.json` … `grammar-hsk5.json`

**Interfaces:**
- Consumes: `llm.ts`, `GrammarPoint` type từ `../../src/content/grammar-points` (type-only).
- Produces:
  - `type GrammarDraft = Omit<GrammarPoint, "level"> & { level: "HSK 1" | ... | "HSK 5" }` — shape trùng `GrammarPoint` hiện có: `id, title, hz, level, topic, def, formula: [label, "key"?][], pitfall: [lead, bold, rest], ex: [{hz, py, vi}]`.
  - `buildGrammarPrompt(level: number, count: number, existing: string[]): messages[]` — yêu cầu LLM sinh `count` điểm ngữ pháp phổ biến nhất của level (danh sách dạng 把字句, 比, 越…越…, bổ ngữ kết quả, hư từ…) theo đúng 6 field trên; `topic` phải là một của `"ba" | "bi" | "bongu" | "hutu"`; `formula` ≥ 2 phần tử, ít nhất 1 `"key"`; `pitfall` đúng 3 phần tử, `bold` không rỗng; `ex` 1–3 câu; **không trùng** `hz` với `existing`.
  - `parseGrammarResponse(level, content, existing): GrammarDraft[]` — zod schema thuần mới trong module này (`grammarDraftSchema`, kể cả template tuple của formula/pitfall), check id = slug pinyin không dấu của hz, trùng hz → throw.
  - CLI `gen-grammar-batch.mts --level N` — chunk 10 điểm/lần gọi, state resume y hệt Task 4 (`out/grammar-batch/`), output `data/grammar/grammar-hskN.json`. Target count: hsk1 = 60, hsk2 = 60, hsk3 = 60, hsk4 = 60, hsk5 = 60 (chuẩn spec ~60 điểm/level).

**Steps:**
- [ ] TDD `grammar-draft.test.ts`: parse response hợp lệ; throw khi topic sai / formula thiếu "key" / pitfall bold rỗng / trùng hz existing; id được slug đúng (vd 把字句 → `ba-zi-ju` qua pinyin bỏ dấu, underscore nối). Fail → implement → pass → commit `feat(content): grammar draft prompt+parse (W2.5)`.
- [ ] Chạy thật: `for lv in 1 2 3 4 5; do pnpm dlx tsx scripts/content/gen-grammar-batch.mts --level $lv; done` → mỗi file đủ 60 điểm.
- [ ] **Owner review checklist** (spec bắt buộc): in toàn bộ điểm của level 1–2 trước, với mỗi điểm kiểm (1) cấu trúc đúng ngữ pháp thật, (2) pitfall đúng lỗi người Việt hay mắc, bold đúng vị trí, (3) ví dụ đúng level + dịch chuẩn, (4) không trùng lặp giữa các level. Sửa tay file JSON hoặc regenerate chunk lỗi. Sau đó review nhanh level 3–5 (điểm khá hơn vì overlap).
- [ ] Commit: `feat(content): grammar dataset hsk1-5 da review (W2.5)`

---

## Task 10: Migration 0005 `content_grammars` + seed grammar (W2.5)

**Files:**
- Create: `app-next/drizzle/0005_content_grammars.sql`
- Modify: `app-next/drizzle/meta/_journal.json` — thêm entry 0005 (tag `0005_content_grammars`, pattern y hệt entry 0004)
- Create: `app-next/drizzle/meta/0005_snapshot.json` — copy `0004_snapshot.json` và thêm bảng `content_grammars` (đối chiếu cách 0003→0004 thêm bảng shadowing)
- Modify: `app-next/src/lib/db/schema.ts` — export `contentGrammars`
- Create: `app-next/scripts/seed/gen-grammar-seed.mts`
- Create (generate): `app-next/drizzle/seeds/content-grammars.sql`

**Interfaces:**
- Consumes: `data/grammar/grammar-hskN.json`.
- Produces:
  ```ts
  export const contentGrammars = sqliteTable(
    "content_grammars",
    {
      id: text("id").primaryKey(),
      level: text("level").notNull(),   // "HSK 1".."HSK 5"
      ord: integer("ord").notNull(),
      title: text("title").notNull(),
      hz: text("hz").notNull(),
      topic: text("topic").notNull(),
      def: text("def").notNull(),
      formula: text("formula", { mode: "json" }).$type<GrammarFormulaRow[]>().notNull(),
      pitfall: text("pitfall", { mode: "json" }).$type<[string, string, string]>().notNull(),
      ex: text("ex", { mode: "json" }).$type<{ hz: string; py: string; vi: string }[]>().notNull(),
    },
  );
  ```
  (Pattern khai báo structurally y hệt `contentVocabs` — không import content module.)
  - SQL migration: `CREATE TABLE content_grammars (id text NOT NULL PRIMARY KEY, level text NOT NULL, ord integer NOT NULL, title text NOT NULL, hz text NOT NULL, topic text NOT NULL, def text NOT NULL, formula text NOT NULL, pitfall text NOT NULL, ex text NOT NULL);` + `CREATE INDEX content_grammars_level_idx ON content_grammars (level);`
  - `gen-grammar-seed.mts`: `INSERT OR REPLACE INTO content_grammars (id, level, ord, title, hz, topic, def, formula, pitfall, ex) VALUES (...)` — ord tăng dần per level, escape `'` → `''` (tiền lệ gen-vocab-seed).

**Steps:**
- [ ] Viết migration + snapshot + schema.ts; verify drizzle meta hợp lệ: `pnpm drizzle-kit check` (nếu lệnh không có trong drizzle-kit 0.31, dùng `pnpm wrangler d1 execute hsk --local --file=drizzle/0005_content_grammars.sql` rồi `SELECT name FROM sqlite_master WHERE name='content_grammars'`).
- [ ] TDD `gen-grammar-seed.mts` không test riêng (pattern đã có ở gen-vocab-seed); chạy:
  ```bash
  cd /Volumes/samsung512/Code/hsk/app-next
  pnpm dlx tsx scripts/seed/gen-grammar-seed.mts
  pnpm wrangler d1 execute hsk --local --file=drizzle/0005_content_grammars.sql
  pnpm wrangler d1 execute hsk --local --file=drizzle/seeds/content-grammars.sql
  pnpm wrangler d1 execute hsk --local --command "SELECT level, COUNT(*) FROM content_grammars GROUP BY level"   # 5 level x 60
  ```
- [ ] Nạp remote dev: `pnpm wrangler d1 execute hsk-dev --remote --file=drizzle/0005_content_grammars.sql -c wrangler.dev.jsonc` rồi file seed tương tự.
- [ ] Commit: `feat(content): content_grammars migration+seed (W2.5)`

---

## Task 11: Content layer grammar + API + dehardcode my-grammar (W2.5)

**Files:**
- Create: `app-next/src/lib/content/grammar.ts`
- Create: `app-next/src/lib/content/grammar-client.ts`
- Create: `app-next/src/app/api/v1/content/grammar/route.ts`
- Create: `app-next/src/lib/content/__tests__/grammar-reshape.test.ts`
- Modify: `app-next/src/content/grammar-points.ts` — giữ nguyên types + `GRAMMAR_TOPICS` + `GRAMMAR_LEVELS` + `GRAMMAR_POINTS` (6 điểm cũ thành **static fallback**, thêm comment ghi rõ); thêm export `const GRAMMAR_FALLBACK = GRAMMAR_POINTS`.
- Modify: `app-next/src/components/my-grammar/my-grammar-root.tsx` — nguồn data: `loadGrammar()` (grammar-client, promise cache như `vocab-client.ts`); khi fetch lỗi → dùng `GRAMMAR_FALLBACK` (giữ nguyên UX offline); filter theo level/topic giữ nguyên interface props hiện có.
- Modify: `app-next/src/components/my-grammar/grammar-filters.tsx`, `grammar-card.tsx` — chỉ nếu cần đổi prop type (không đổi UI).

**Interfaces:**
- Consumes: `contentGrammars` (Task 10), `createDb` (`@/lib/db`), `GrammarPoint` (`@/content/grammar-points`).
- Produces (mirror 1:1 của `src/lib/content/vocab.ts`):
  - `rowsToGrammarPoints(rows: GrammarRow[]): GrammarPoint[]` (pure, sort theo `ord`, map JSON field) — unit test được.
  - `getGrammar(): Promise<GrammarPoint[]>` — throw `ContentNotFoundError("content_grammars")` khi rỗng (re-export từ `@/lib/content/vocab`).
  - API `GET /api/v1/content/grammar` — response `GrammarPoint[]`, Cache-Control như vocab route, 500 khi lỗi (copy route vocab).
  - `loadGrammar(): Promise<GrammarPoint[]>` (client, module cache).
- File test `grammar-reshape.test.ts` (vitest jsdom, pure fn): rows rỗng → []; sort ord; JSON string field parse đúng tuple; `pitfall` 3 phần giữ nguyên.

**Steps:**
- [ ] TDD: viết `grammar-reshape.test.ts` fail trước (import module chưa tồn tại) → chạy `pnpm vitest run src/lib/content` thấy fail.
- [ ] Implement `src/lib/content/grammar.ts` + route + `grammar-client.ts`.
- [ ] Sửa `my-grammar-root.tsx` sang `loadGrammar()` + fallback static; giữ hành vi ★ đã lưu (nếu component đọc user data qua `src/lib/my-grammar.ts`, không đụng — chỉ đổi nguồn `GRAMMAR_POINTS` → data từ loader).
- [ ] Verify: `pnpm vitest run src/lib/content src/content` + `pnpm typecheck` pass; `pnpm dev` → `/my-grammar` hiện 300 điểm từ D1, tắt D1 seed (chạy `DELETE FROM content_grammars` local) → trang vẫn chạy với 6 điểm fallback; API `/api/v1/content/grammar` trả JSON.
- [ ] Commit: `feat(content): grammar content layer + dehardcode my-grammar (W2.5)`

---

## Task 12: E2E bài cuối HSK5 + acceptance gates (W2.4/W2.5)

**Files:**
- Modify: `app-next/e2e/content-d1.spec.ts` — thêm test: `/api/v1/content/vocab` có đủ 5 book, mỗi book số bài = số bài thực tế sau Task 8 (in ra ở bước GROUP BY, ví dụ `{hsk1: 25, hsk2: 38, hsk3: 67, hsk4: 108, hsk5: 144}` — ghi số thật vừa đo, và phải bằng tổng số bài trong `data/vocab/lessons-hskN.json`); `/api/v1/content/grammar` trả 300 điểm.
- Modify: `app-next/e2e/learning-flow.spec.ts` — thêm flow: vào `/course/hsk5` → click bài cuối → mở mode vocab → từ đầu tiên của bài render (hanzi + pinyin + nghĩa + ví dụ) không lỗi.
- Test: `pnpm test` toàn bộ xanh (gates: `content-validate`, `content-static`, `grammar-reshape`, `scripts/content/*`).

**Interfaces:**
- Consumes: app local (`pnpm dev`, D1 local đã seed Task 8/10), Playwright config hiện có.
- Produces: acceptance spec W2 — số từ/bài khớp chuẩn, test content-validate xanh, e2e lesson chạy bài cuối HSK5.

**Steps:**
- [ ] Viết/sửa e2e fail trước (chưa chạy được assertion mới) → chạy `pnpm dev` nền → `pnpm test:e2e e2e/content-d1.spec.ts e2e/learning-flow.spec.ts` → pass.
- [ ] Grep gates toàn repo: `grep -rn "FALLBACK\|placeholder\|TBD" app-next/src/content app-next/src/lib/content` — không được còn fallback demo vocab/grammar mới (fallback static cũ 6 điểm grammar là chủ ý, ghi comment); confirm `grep -rn "CONTENT_LLM_KEY" app-next/src app-next/scripts` chỉ match đọc env, không có giá trị key.
- [ ] `pnpm test && pnpm typecheck && pnpm lint` — xanh toàn bộ.
- [ ] Commit: `test(content): e2e lesson cuoi hsk5 + gates (W2)`

---

## Phụ lục — Số liệu chuẩn HSK 3.0 (2021) dùng xuyên suốt

| Level | Từ mới | Cumulative | Số bài (15–25 từ) dự kiến |
|---|---|---|---|
| HSK 1 | 500 | 500 | ~25 |
| HSK 2 | 772 | 1272 | ~38 |
| HSK 3 | 973 | 2245 | ~67 |
| HSK 4 | 1000 | 3245 | ~108 |
| HSK 5 | 1071 | 4316 | ~144 |

Nguồn dataset: https://github.com/ivankra/hsk30 (MIT, `hsk30-expanded.csv`, 11.092 dòng gồm cả level 6 và 7-9 — chỉ dùng level 1–5). Phương án dự phòng nếu repo mất: `tonghuikang/HSK-3.0-words-list` (cùng nguồn 2021, kiểm tra license trước khi dùng) — KHÔNG dùng `scripts/vendor/hsk.json` trong repo vì đó là chuẩn HSK 2.0.

Ước lượng LLM: vocab 4316 từ / 20 từ chunk ≈ 216 request; grammar 300 điểm / 10 ≈ 30 request; retry + review 5% — thời gian chờ batch tính vào 1–2 tuần của spec.
