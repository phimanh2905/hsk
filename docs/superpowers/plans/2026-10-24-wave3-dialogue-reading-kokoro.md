# Dialogue + Reading Tự Sinh (Kokoro) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Task description files already exist in `docs/superpowers/tasks/` (nếu chưa có, sinh từ section "Tasks" bên dưới theo đúng thứ tự).

**Spec:** `/Volumes/samsung512/Code/hsk/docs/superpowers/specs/2026-10-24-hsk15-roadmap-design.md` — Wave 3 (đã duyệt bởi owner 2026-10-24).

## Goal

Track curriculum không phụ thuộc YouTube: **mỗi bài vocab HSK1–3 có "nghe hội thoại"** (script sinh bằng LLM, render mp3 offline bằng Python Kokoro, phát trong Shadowing Studio bằng `<audio>`) và **mỗi level có bài đọc tự sinh** (passage + vocab highlights + 3–5 câu hỏi trắc nghiệm) nạp vào trang Reading hiện tại, lưu tiến độ qua ProgressStore (Wave 0). Media tự sở hữu 100%, thêm bài mới không tốn runtime.

## Architecture

```
scripts/content/src/dialogues.ts          (thuần: validate + reshape, test được)
scripts/content/src/gen-dialogues.mts     (CLI gọi LLM → data/dialogues/dialogues-hskN.json)
scripts/content/data/dialogues/dialogues-hskN.json   (JSON intermediate, commit)
scripts/content/render-dialogue-audio.py  (Python kokoro offline → public/audio/<book>/<lesson>-<n>.mp3)
scripts/content/data/dialogues/timing-hskN.json      (duration từng file, python ghi)
scripts/content/src/merge-audio-timing.mts (gộp timing vào dialogues JSON + regen src/content/dialogues.ts)
scripts/content/src/gen-shadowing-dialogue-seed.mts  (→ drizzle/seeds/content-shadowing-dialogues.sql)
scripts/content/src/check-audio-size.mts  (ngân sách public/)
scripts/content/src/gen-reading.mts       (CLI LLM → data/reading/passages-hskN.json)
scripts/content/src/gen-reading-src.mts   (→ src/content/reading-passages.ts)

drizzle/0006_content_shadowing_audio.sql  (ALTER TABLE: type + audio_dir)
src/lib/db/schema.ts                      (thêm 2 cột)
src/lib/content/shadowing.ts              (rowsToShadowing trả type/audioDir)
src/components/shadowing/studio/use-player-engine.ts  (mode audio: <audio> thay YT postMessage)
src/app/(app)/shadowing/[videoId]/shadowing-studio.tsx (render <audio> khi type='audio')
src/content/reading-passages.ts           (static passages, sinh từ data)
src/app/(app)/reading/reading-client.tsx  (picker passage + lưu draft qua ProgressStore)
```

Luồng dữ liệu: **LLM → JSON data (review) → python render mp3 + timing → TS merge/generate → (a) static `src/content/dialogues.ts`, (b) seed SQL → D1 → content layer → studio**; reading: **LLM → JSON data → `src/content/reading-passages.ts`** (static, không D1 — theo pattern `src/content/reading.ts` hiện tại).

Timing design (quan trọng, giúp studio **không đổi engine phát theo câu**): `content_shadowing_subtitles.sentences` của video audio chứa `start`/`end` = **cumulative duration** từ timing JSON; mỗi câu audio src = `<audioDir>-<n>.mp3`. Engine chỉ cần play/pause/seek đúng giây là sync chính xác tuyệt đối (không align).

## Tech Stack

Next.js 16 + TS + Drizzle + Cloudflare D1 (pnpm **BẮT BUỘC**), `pnpm dlx tsx` chạy script TS, vitest, wrangler d1 (dev DB `hsk-dev`, prod worker `byehsk` DB `hsk`), Python 3 venv + `kokoro >= 0.8` (CPU, darwin arm64) + ffmpeg/ffprobe (đã có ở `/opt/homebrew/bin`), LLM OpenAI-compatible qua env.

## Global Constraints

1. **KHÔNG chạy `pnpm build`, KHÔNG chạy full `pnpm test` cho cả app** (máy này chậm); chỉ chạy test file cụ thể: `pnpm vitest run <path>` từ `app-next/`.
2. pnpm bắt buộc; không dùng npm/yarn.
3. Key LLM chỉ qua env `CONTENT_LLM_BASE_URL` / `CONTENT_LLM_KEY` / `CONTENT_LLM_MODEL` (đã có trong `app-next/.env.local` từ Wave 2 — kiểm tra tồn tại bằng `grep -c CONTENT_LLM .env.local`, KHÔNG in giá trị). Cấm hardcode key/URL có key vào bất kỳ file nào commit.
4. Chỉ sửa file được liệt kê trong từng task. Script chạy từ thư mục `app-next/`.
5. Migration số tiếp theo là **0006** (Wave 2 dùng 0005) — verify trước bằng `ls app-next/drizzle/0*.sql`.
6. `topic` của video audio dùng `"life"` (union `ShadowingTopic` hiện có, không mở rộng).
7. Audio convention: `public/audio/<book>/<lesson>-<n>.mp3` — mono 24kHz, 32 kbps, `<book>` = `hsk1|hsk2|hsk3`, `<lesson>` = `lesson-1`, `<n>` = số câu từ 1. `audioDir` trong DB = đường dẫn **không tiền tố `/` và không đuôi**, ví dụ `audio/hsk1/lesson-1`.
8. Dialogue id convention (PK trong mọi nơi): `"<book>/<lesson>"`, ví dụ `hsk1/lesson-1` — trùng với `content_shadowing_videos.id`.
9. Tiếng Việt cho mọi comment/message UI mới; comment giải thích "tại sao".

## Interfaces Consumes (đã có, KHÔNG tạo lại)

- Wave 0 — `ProgressStoreApi` (`app-next/src/lib/store/progress-store.ts`): `getReadingDrafts(): ReadingDraft[]`, `saveReadingDraft(text: string): void`, `ReadingDraft = { text: string; at: string }`; singleton `progressStore`.
- Wave 2 — `app-next/scripts/content/data/vocab/hskN.json` (mảng VocabWord) + `data/vocab/lessons-hskN.json` (title + words theo bài, key bài dạng `lesson-1`); `scripts/content/src/llm.ts` (`llmConfigFromEnv`, gọi chat completions qua `opts.fetchImpl ?? fetch`); `scripts/content/__tests__/` đã nằm trong vitest include; `scripts/content/.gitignore` đã bỏ `out/ .venv/ vendor/`.
- Hiện trạng: `src/lib/db/schema.ts` (`contentShadowingPlaylists/Videos/Subtitles` — đã đọc, cột như ở Task 5); `src/lib/content/shadowing.ts` (`rowsToShadowing`, `getShadowingVideoById`…); `src/content/shadowing.ts` (types `ShadowingVideo {id,title,playlistId,hsk,views,viewsSuffix,duration,durSec,plays,topic,spd}`, `ShadowingTopic = "life"|"food"|"travel"|"film"`, `SubtitleSentence {n,start,end,parts:{zh}[],pinyin,vi}`); `src/components/shadowing/studio/use-player-engine.ts` (iframe `#ytplayer` + postMessage, state `{playing, cur, rate, seek}`); `src/content/reading.ts` (types `ReadingSentence {zh,py,vi}`, `ReadingVocab {word,py,vi}`, `ReadingQuestion {q,qVi,options,answer}`, exports `readingData`); `src/app/(app)/reading/reading-client.tsx` (dùng `readingData.sampleText` + `readingData.demoDoc`); seeds tiền lệ `drizzle/seeds/content-shadowing.sql` sinh bởi `scripts/seed/gen-shadowing-seed.mts` (INSERT OR REPLACE).

## Interfaces Produces

- **Dialogue record** (`scripts/content/data/dialogues/dialogues-hskN.json` — mảng):
  ```ts
  type DialogueLine = { n: number; speaker: "A" | "B"; zh: string; pinyin: string; vi: string; audio?: string; durSec?: number };
  type DialogueRecord = { id: string; book: "hsk1" | "hsk2" | "hsk3"; lesson: string; title: string; titleVi: string; lines: DialogueLine[] }; // id = "<book>/<lesson>"
  ```
- **Static content** `src/content/dialogues.ts`: `export type { DialogueLine, DialogueRecord }` + `export const dialogueByLesson: Record<string, DialogueRecord>` (key `"<book>/<lesson>"`).
- **Schema columns** (migration 0006): `content_shadowing_videos.type TEXT NOT NULL DEFAULT 'youtube'`, `content_shadowing_videos.audio_dir TEXT` (NULL với youtube). `ShadowingVideo` thêm `type: "youtube" | "audio"`, `audioDir: string | null`.
- **Audio path convention:** `public/audio/<book>/<lesson>-<n>.mp3` (mono 24kHz mp3 32kbps); src đầy đủ trong UI = `/${video.audioDir}-${line.n}.mp3`.
- **Reading passage** (`scripts/content/data/reading/passages-hskN.json` — mảng; mirror của `src/content/reading-passages.ts`):
  ```ts
  type ReadingPassage = { id: string; book: string; lesson: string; title: string; titleVi: string; sentences: ReadingSentence[]; vocab: ReadingVocab[]; questions: ReadingQuestion[] };
  // id = "<book>-reading-<stt>" ví dụ "hsk1-reading-1"; ReadingSentence/Vocab/Question tái dùng type của src/content/reading.ts
  ```
  Export: `src/content/reading-passages.ts` → `export const readingPassages: ReadingPassage[]`.
- **Seed:** `drizzle/seeds/content-shadowing-dialogues.sql` — 1 playlist `id='htoi-thoai-theo-bai'` + videos (type='audio') + subtitles (start/end cumulative).

## Tasks

### Task 1 — Validate module thuần cho dialogue (`scripts/content/src/dialogues.ts`)

**Files:**
- Create: `app-next/scripts/content/src/dialogues.ts`
- Create: `app-next/scripts/content/__tests__/dialogues.test.ts`

**Interfaces:** pure, không import node:fs. Exports: `type DialogueLine`, `type DialogueRecord` (shape như Interfaces Produces, audio/durSec optional), `validateDialogue(raw: unknown, vocabSet: Set<string>): { ok: boolean; errors: string[]; oov: string[] }`, `dialogueId(book: string, lesson: string): string`.

Steps:
- [ ] Viết test trước: `pnpm vitest run scripts/content/__tests__/dialogues.test.ts` — case: (1) hợp lệ 8–15 dòng, 2 vai A/B xen kẽ, id đúng `"hsk1/lesson-1"` → ok, errors rỗng; (2) 7 dòng → lỗi "ít hơn 8 câu"; (3) 16 dòng → lỗi; (4) 3 vai hoặc vai không xen kẽ → lỗi; (5) thiếu pinyin/vi → lỗi; (6) hanzi ngoài `vocabSet` (tách ký tự, bỏ dấu câu `。，、！？…—·\s`) → `oov` chứa ký tự đó, ok vẫn true (OOV là warning); (7) speaker không A/B → lỗi. Verify FAIL (module chưa tồn tại).
- [ ] Implement `dialogues.ts`: `validateDialogue` zod-like bằng check tay (hoặc import `zod` — đã có trong deps từ Wave 2, kiểm tra `package.json` trước); tách hanzi bằng regex `/[\u4e00-\u9fff]/`; punctuation hợp lệ `/^[。，、！？…—\s]*$/`.
- [ ] Verify PASS, commit: `git add scripts/content/src/dialogues.ts scripts/content/__tests__/dialogues.test.ts && git commit -m "w3: dialogue validate module (pure)"`

### Task 2 — CLI sinh dialogue qua LLM (W3.1)

**Files:**
- Create: `app-next/scripts/content/src/gen-dialogues.mts`
- Modify: `app-next/scripts/content/README.md` (thêm mục "Dialogues + Reading (Wave 3)" — lệnh chạy + review checklist)

**Interfaces:** Consumes Task 1 + `./src/llm.ts` (Wave 2) + `data/vocab/lessons-hskN.json` (Wave 2). CLI: `pnpm dlx tsx scripts/content/src/gen-dialogues.mts --level 1 [--lesson lesson-1] [--retry]`; state/resume không cần (mỗi bài 1 lần gọi, retry per-bài tối đa 5 lần).

Steps:
- [ ] Viết `gen-dialogues.mts`: đọc `lessons-hskN.json` → với mỗi bài build prompt (ngữ cảnh vocab của bài: hanzi + pinyin + nghĩa; yêu cầu: hội thoại 8–15 câu, 2 vai A/B thay phiên, MỖI CÂU CHỈ dùng từ trong độ phủ bài + từ phủ chính HSK level trước đó, trả JSON `{title, titleVi, lines:[{n, speaker, zh, pinyin, vi}]}`) → gọi LLM (chat completions, `response_format: {type:"json_object"}` nếu endpoint hỗ trợ, không thì parse từ text) → `validateDialogue` với vocabSet dựng từ cumulative vocab của bài (fail → retry kèm message lỗi; hết 5 lần → exit 1) → ghi từng bài vào `scripts/content/data/dialogues/dialogues-hskN.json` (mảng, append/skip bài đã có khi chạy lại). env check bằng `llmConfigFromEnv`.
- [ ] Smoke-run 1 bài: `pnpm dlx tsx scripts/content/src/gen-dialogues.mts --level 1 --lesson lesson-1` — verify file JSON ra, mở review tay: câu tự nhiên, pinyin đúng tone, dịch Việt chuẩn, số câu 8–15. Fix prompt nếu pinyin sai hàng loạt (lỗi LLM hay gặp: ghép tone số — nhắc "pinyin có dấu thanh, không dùng tone number").
- [ ] Batch chạy đủ: `--level 1`, `--level 2`, `--level 3` (mỗi level một lần gọi lệnh; ghi log số bài OK/fail). Verify: `node -e` đếm mảng mỗi file = số bài `lessons-hskN.json`.
- [ ] Spot-check ngẫu nhiên 10 bài (3/3/4) theo checklist README; bài ẩu → xóa khỏi JSON rồi chạy lại `--level N --lesson <id>`. Commit: `git commit -m "w3: dialogue data hsk1-3 (LLM + review)"`

### Task 3 — Python Kokoro render mp3 + timing (W3.2)

**Files:**
- Create: `app-next/scripts/content/render-dialogue-audio.py`
- Modify: `app-next/scripts/content/README.md` (setup venv + lệnh render)
- Create (output, commit): `app-next/public/audio/hsk1/*.mp3`, `hsk2`, `hsk3` + `scripts/content/data/dialogues/timing-hskN.json`

**Interfaces:** Input `data/dialogues/dialogues-hskN.json` (chưa có audio). Output timing JSON: `{ "<book>/<lesson>": [{ "n": 1, "durSec": 3.42 }] }` — `durSec` làm tròn 2 chữ số. Voice map: speaker `A` → `zf_001`, `B` → `zm_009`.

Steps:
- [ ] Setup venv (darwin arm64, CPU):
  ```bash
  cd /Volumes/samsung512/Code/hsk/app-next/scripts/content
  python3 -m venv .venv && .venv/bin/pip install 'kokoro>=0.8' soundfile
  brew list espeak-ng >/dev/null 2>&1 || brew install espeak-ng   # misaki G2P fallback
  ```
  Smoke test: `.venv/bin/python -c "from kokoro import KPipeline; p=KPipeline(lang_code='zh'); print('ok')"` (lần đầu tải model về `~/.cache/hexgrad`).
- [ ] Viết `render-dialogue-audio.py`: đọc dialogues JSON → với mỗi line chưa có file đích: `pipeline(text, voice=...)` → ghép các chunk numpy (24kHz) → ghi wav tạm trong `scripts/content/out/` → `ffmpeg -y -i tmp.wav -ac 1 -ar 24000 -codec:a libmp3lame -b:a 32k public/audio/<book>/<lesson>-<n>.mp3` → đo duration bằng `ffprobe -v error -show_entries format=duration -of csv=p=0 <file>` → ghi `timing-hskN.json`. Idempotent: skip file đã tồn tại (flag `--force` để render lại). Ghi tham số voice vào README.
- [ ] Smoke-run 1 bài: `--lesson hsk1/lesson-1` → nghe thử 2 file mp3 (zf_001 tiếng nữ, zm_009 tiếng nam, phát âm tiếng Trung rõ); verify ffprobe trả `24000 Hz, mono`.
- [ ] Batch render: `--level 1`, `2`, `3` (chạy nền, ~130 bài × ~12 file). Verify ngẫu nhiên: mỗi dialogue đủ số file = số dòng; JSON timing khớp.
- [ ] Commit data + audio: `git add public/audio scripts/content/data/dialogues/timing-hsk1.json timing-hsk2.json timing-hsk3.json scripts/content/render-dialogue-audio.py scripts/content/README.md && git commit -m "w3: kokoro offline render dialogue mp3 hsk1-3"`

### Task 4 — Merge timing + static content `src/content/dialogues.ts`

**Files:**
- Create: `app-next/scripts/content/src/merge-audio-timing.mts`
- Modify (generated, commit): `app-next/scripts/content/data/dialogues/dialogues-hskN.json` (bổ sung `audio`, `durSec` từng line)
- Create: `app-next/src/content/dialogues.ts`
- Create: `app-next/src/content/__tests__/dialogues-content.test.ts`

**Interfaces:** Produces `dialogueByLesson: Record<string, DialogueRecord>` (xem Interfaces Produces). Line audio = `<book>/<lesson>-<n>` relative tới `public/` (không có `/` đầu — pages sẽ prefix).

Steps:
- [ ] Viết test trước: `dialogues-content.test.ts` — (1) `dialogueByLesson["hsk1/lesson-1"]` tồn tại, 8–15 dòng; (2) mọi line có `audio` khớp `^hskN/lesson-\d+-\d+$` và `durSec > 0`; (3) speaker xen kẽ A/B, n tăng dần từ 1; (4) id của record khớp key. Verify FAIL.
- [ ] Viết `merge-audio-timing.mts`: đọc timing JSON + dialogues JSON → gán `audio: "<book>/<lesson>-<n>"`, `durSec` từng line → ghi đè dialogues JSON → sinh `src/content/dialogues.ts` (template literal: `export const dialogueByLesson = {...} as const;` + re-export types từ module type thuần — khai báo type trong chính file này để không import scripts). Chạy: `pnpm dlx tsx scripts/content/src/merge-audio-timing.mts`.
- [ ] Verify PASS (`pnpm vitest run src/content/__tests__/dialogues-content.test.ts`). Commit: `git commit -m "w3: static dialogue content with audio timing"`

### Task 5 — Migration 0006: cột `type` + `audio_dir` (W3.3)

**Files:**
- Create: `app-next/drizzle/0006_content_shadowing_audio.sql`
- Modify: `app-next/src/lib/db/schema.ts`
- Modify: `app-next/src/content/shadowing.ts` (type `ShadowingVideo`)

**Interfaces:** Schema columns như Interfaces Produces. Migration dùng `ALTER TABLE ... ADD COLUMN` (D1 không hỗ trợ drizzle-kit generate với ALTER rồi — viết tay như 0005 của Wave 2). Type: `type: text("type").notNull().default("youtube")`, `audioDir: text("audio_dir")`.

Steps:
- [ ] Verify số migration trống: `ls /Volumes/samsung512/Code/hsk/app-next/drizzle/0*.sql` → file max phải là `0005_*` (Wave 2). Nếu đã có 0006 → dùng 0007 và ghi chú lệch ở cuối plan.
- [ ] Viết `0006_content_shadowing_audio.sql`:
  ```sql
  ALTER TABLE content_shadowing_videos ADD COLUMN type TEXT NOT NULL DEFAULT 'youtube';
  ALTER TABLE content_shadowing_videos ADD COLUMN audio_dir TEXT;
  ```
- [ ] Sửa `schema.ts` (`contentShadowingVideos` thêm 2 field) + `src/content/shadowing.ts` (`ShadowingVideo` thêm `type: "youtube" | "audio"; audioDir: string | null`). Verify compile type-only: `pnpm tsc --noEmit -p tsconfig.json 2>&1 | head -30` — chỉ chấp nhận lỗi phát sinh ở chỗ tiêu thụ `ShadowingVideo` (ghi lại, fix ở Task 6–7; lỗi khác → sửa ngay).
- [ ] Apply local: `pnpm wrangler d1 execute hsk --local --file=drizzle/0006_content_shadowing_audio.sql` rồi `pnpm wrangler d1 execute hsk --local --command "PRAGMA table_info(content_shadowing_videos)"` — thấy `type`, `audio_dir`. Commit: `git commit -m "w3: shadowing video type/audio_dir columns (migration 0006)"`

### Task 6 — Content layer + seed playlist "Hội thoại theo bài" (W3.3)

**Files:**
- Modify: `app-next/src/lib/content/shadowing.ts`
- Create: `app-next/scripts/content/src/gen-shadowing-dialogue-seed.mts`
- Create (generated, commit): `app-next/drizzle/seeds/content-shadowing-dialogues.sql`
- Create: `app-next/scripts/content/__tests__/dialogue-seed.test.ts`
- Modify: `app-next/e2e/content-d1.spec.ts`

**Interfaces:** `rowsToShadowing(videoRows, subRows)` — `VideoRow` thêm `type?: string; audioDir?: string | null`; reshape: `type: (v.type === "audio" ? "audio" : "youtube")`, `audioDir: v.audioDir ?? null`, topic cast giữ nguyên (row audio topic='life'). Row YouTube không set type → default "youtube" giữ tương thích DB cũ.

Steps:
- [ ] Viết test trước `dialogue-seed.test.ts`: chạy pure function mới `dialogueRows(dialogues: DialogueRecord[], ordBase: number)` (export từ gen script tách ra `scripts/content/src/dialogue-seed.ts` để test được — script chỉ gọi nó) → assert: 1 playlist `{id:"htoi-thoai-theo-bai", slug:"hoi-thoai-theo-bai", name:"Hội thoại theo bài", channel:"Bye HSK"}`; video row mỗi dialogue: `id = dialogue.id`, `playlistId = "htoi-thoai-theo-bai"`, `type: "audio"`, `audioDir: "audio/hsk1/lesson-1"`, `durSec` = tổng `durSec` lines (làm tròn lên), `hsk = book`, `duration` = `m:ss` từ durSec, `views: 0`, `viewsSuffix: ""`, `plays: 0`, `topic: "life"`, `spd: 1`; subtitle sentences: `start`/`end` cumulative từ `durSec` (end câu i = start câu i+1; câu cuối end = durSec), `parts: [{zh: line.zh}]`, `pinyin`, `vi` từ line. Verify FAIL.
- [ ] Implement `dialogue-seed.ts` + `gen-shadowing-dialogue-seed.mts` (đọc `data/dialogues/dialogues-hsk{1,2,3}.json` → ghi SQL INSERT OR REPLACE theo tiền lệ `gen-shadowing-seed.mts`; subtitles JSON stringify esc `'`). Sửa `src/lib/content/shadowing.ts` reshape như Interfaces. Verify PASS.
- [ ] Chạy seed + verify local:
  ```bash
  pnpm dlx tsx scripts/content/src/gen-shadowing-dialogue-seed.mts
  pnpm wrangler d1 execute hsk --local --file=drizzle/seeds/content-shadowing-dialogues.sql
  pnpm wrangler d1 execute hsk --local --command "SELECT type, COUNT(*) FROM content_shadowing_videos GROUP BY type"
  ```
  → thấy `{audio: 130-ish, youtube: N-cũ}` (số audio = tổng dialogue đã review).
- [ ] e2e: thêm case vào `e2e/content-d1.spec.ts` — playlist "Hội thoại theo bài" xuất hiện ở `/shadowing`; mở `/shadowing/hsk1/lesson-1` trả 200 và page chứa `<audio` (data-testid="audio-player"). KHÔNG chạy e2e (playwright để CI/owner); chỉ ghi test.
- [ ] Apply remote (dev): `pnpm wrangler d1 execute hsk-dev --remote --file=drizzle/seeds/content-shadowing-dialogues.sql -c wrangler.dev.jsonc` (prod `byehsk` DB `hsk` để owner chạy khi duyệt — ghi lệnh vào README, KHÔNG tự chạy prod). Commit: `git commit -m "w3: dialogue playlist seed + content layer audio type"`

### Task 7 — Studio player `<audio>` (W3.3)

**Files:**
- Modify: `app-next/src/components/shadowing/studio/use-player-engine.ts`
- Modify: `app-next/src/app/(app)/shadowing/[videoId]/shadowing-studio.tsx`
- Create: `app-next/src/components/shadowing/studio/__tests__/audio-engine.test.ts` (nếu engine tách được phần thuần; nếu chỉ DOM thì test qua studio test hiện có)

**Interfaces:** `usePlayerEngine({ subs, postSink, audioSrcs? })` — `audioSrcs?: string[]` (src theo index câu, `undefined` = mode YouTube giữ nguyên behavior cũ). Mode audio: engine điều khiển element `#audioplayer` (play/pause/pauseAt/startAt qua `currentTime = subs[cur].start`), `onended` của clip = next câu; `setRate` → `playbackRate`. State API (`playing`, `cur`, `seek`, `setRate`) KHÔNG đổi.

Steps:
- [ ] Sửa `use-player-engine.ts`: thêm optional `audioSrcs`; trong `post()` nếu `audioSrcs` tồn tại → thao tác `document.getElementById("audioplayer") as HTMLAudioElement` thay vì postMessage; expose `audioSrcs` cho studio render `src` đúng câu hiện tại. Giữ nguyên mọi path YouTube (test cũ `src/components/shadowing/studio/__tests__` phải vẫn xanh — chạy `pnpm vitest run src/components/shadowing`).
- [ ] Sửa `shadowing-studio.tsx`: props thêm qua `video` đã có `type`/`audioDir`; khi `video.type === "audio"` render thay iframe block:
  ```tsx
  <audio id="audioplayer" data-testid="audio-player" src={`/${video.audioDir}-${subs[eng.cur].n}.mp3`} preload="auto" className="hidden" />
  ```
  và nút Play/Chơi lại/đổi câu dùng engine như cũ (engine lo play/pause/seek); ẩn nút "Ẩn video" + YouTube-specific UI. Vai A/B hiển thị label trong transcript (`speaker` lấy từ `dialogueByLesson[video.id]` nếu có — import từ `@/content/dialogues`, fallback không label).
- [ ] Verify tay local: `pnpm dev` → `/shadowing` → playlist mới → mở 1 bài audio → play từng câu đúng file, chuyển câu tự động, thu/chấm vẫn chạy (recorder không phụ thuộc nguồn phát). Verify test cũ xanh: `pnpm vitest run src/app/\(app\)/shadowing src/components/shadowing`.
- [ ] Commit: `git commit -m "w3: shadowing studio audio player mode"`

### Task 8 — Script sinh reading passages (W3.4, phần sinh)

**Files:**
- Create: `app-next/scripts/content/src/reading.ts` (pure validate)
- Create: `app-next/scripts/content/__tests__/reading.test.ts`
- Create: `app-next/scripts/content/src/gen-reading.mts`
- Create (commit sau review): `app-next/scripts/content/data/reading/passages-hskN.json` (N = 1..5)

**Interfaces:** Input: `data/vocab/lessons-hskN.json` + `llm.ts`. Passage shape = Interfaces Produces. Validate: 12–20 câu; 3–5 `questions`, mỗi câu 3 options, `answer` 0–2; `vocab` 5–8 từ; title/titleVi không rỗng; OV check hanzi theo cumulative level (warning, không fail — reading cho phép từ đã học level trước).

Steps:
- [ ] Test trước (`reading.test.ts`): hợp lệ → ok; 11 câu → lỗi; 6 questions → lỗi; answer=3 → lỗi; vocab trống → lỗi. Verify FAIL → implement `reading.ts` → PASS. Commit: `git commit -m "w3: reading passage validate module"`
- [ ] `gen-reading.mts`: `--level N [--count M]` — prompt sinh M (default 3) passage/level, mỗi passage gắn `lesson` (bài vốn đã học xong level đó, xoay vòng theo stt), JSON list → validate từng passage (retry ≤5, fail → exit 1) → ghi `passages-hskN.json`. Chạy level 1–5.
- [ ] Review 10 passage ngẫu nhiên (câu chuyện mạch lạc, questions thật sự trả lời được từ passage, đáp án đúng index) — ẩu thì xóa + regenerate. Commit data: `git commit -m "w3: reading passage data hsk1-5 (LLM + review)"`

### Task 9 — Static reading content + trang Reading dùng passages (W3.4, phần app)

**Files:**
- Create: `app-next/scripts/content/src/gen-reading-src.mts`
- Create (generated, commit): `app-next/src/content/reading-passages.ts`
- Modify: `app-next/src/app/(app)/reading/reading-client.tsx`
- Modify: `app-next/src/app/(app)/reading/__tests__/reading-client.test.tsx`

**Interfaces:** `readingPassages: ReadingPassage[]` (re-export type từ `@/content/reading`). Client: thêm dropdown/chip "Bài đọc theo level" chọn `passage` → setText(join sentences zh) + set extras `{sentences, vocab, questions}` của passage (đường code extras hiện tại của demoDoc — tái dùng, không viết mới engine karaoke); khi đổi passage gọi `progressStore.saveReadingDraft(text)` (behavior autosave W0 đã có — nếu W0.4 đã wire autosave trên textarea thì KHÔNG gọi thêm, chỉ tận dụng; verify bằng đọc `reading-client.tsx` phần draft trước khi sửa).

Steps:
- [ ] Test trước: thêm case — render client có picker (data-testid="reading-passage-select") với option = title các passage; chọn passage → textarea chứa câu đầu của passage; extras panel hiện questions với `answer` đúng. Mock `@/content/reading-passages`. Verify FAIL.
- [ ] Viết + chạy `gen-reading-src.mts` → `src/content/reading-passages.ts` (`export const readingPassages = [...] as const;`). Sửa `reading-client.tsx` theo Interfaces trên. Verify PASS: `pnpm vitest run src/app/\(app\)/reading`.
- [ ] Verify tay: `pnpm dev` → `/reading` → chọn 1 passage HSK1 → karaoke TTS chạy (TTS runtime dùng `useTts` hiện có), draft lưu khi reload (interface Wave 0). Commit: `git commit -m "w3: reading passages static content + picker"`

### Task 10 — Ngân sách dung lượng public/ + acceptance e2e

**Files:**
- Create: `app-next/scripts/content/src/check-audio-size.mts`
- Modify: `app-next/e2e/content-d1.spec.ts` (đã mở ở Task 6 — gộp thêm case)
- Modify: `app-next/scripts/content/README.md`

Steps:
- [ ] `check-audio-size.mts`: đệm `public/audio/**` → in tổng MB per book; ngưỡng: WARN > 40MB, FAIL (exit 1) > 80MB. Chạy: `pnpm dlx tsx scripts/content/src/check-audio-size.mts` — kỳ vọng ~25–35MB (130 bài × ~50s × 32kbps). Vượt WARN → giảm bitrate về 24k và render lại `--force`.
- [ ] Thêm case e2e (chỉ ghi, không chạy): `/api/v1/content/...` không đổi; assert `GET /shadowing` trả playlist audio và `/shadowing/hsk2/lesson-1` chứa `data-testid="audio-player"`; assert `HEAD /audio/hsk1/lesson-1-1.mp3` trả 200.
- [ ] Ghi acceptance checklist vào README: ≥1 dialogue/bài HSK1–3 (verify bằng node đếm), e2e player audio, size trong ngân sách. Commit: `git commit -m "w3: audio size budget check + e2e acceptance"`

## Self-review (đã làm khi viết plan)

- **Coverage W3:** W3.1 → Task 1–2; W3.2 → Task 3–4; W3.3 → Task 5–7; W3.4 → Task 8–9; acceptance (dialogue/bài HSK1–3, e2e player, budget public/) → Task 10. Đủ, không sót.
- **Placeholder:** không có — mọi file có shape/interface thật, mọi lệnh chạy được; data LLM/Kokoro là output thật của script (không fake data trong plan).
- **Type consistency:** `DialogueRecord.id` = `content_shadowing_videos.id` = key `dialogueByLesson` = `"<book>/<lesson>"`; `audioDir` không `/` đầu; `ReadingPassage` tái dùng 3 type của `src/content/reading.ts`; `ShadowingVideo` mở rộng optional-toward-nullable (`audioDir: string | null`) — các tiêu thụ cũ phải sửa ở Task 5 bước tsc + Task 6 reshape (rowsToShadowing là điểm chạm duy nhất của đọc DB).
- **Lệch so với audit/đề xuất ban đầu (ghi rõ):**
  1. Timing không lưu bảng riêng — nhét `start/end` cumulative vào `content_shadowing_subtitles.sentences` (JSON đã có sẵn cột) để engine phát theo câu không cần đổi gì về sync; per-line src suy từ `audioDir` + `n`, không thêm cột.
  2. Topic video audio ép `"life"` (không mở rộng union `ShadowingTopic`) — tránh ripplen type sang filter UI.
  3. Reading passages để **static** (`src/content/reading-passages.ts`) theo pattern `src/content/reading.ts`, không đưa vào D1 — W3.4 của spec không yêu cầu D1 cho reading.
  4. Thêm module thuần `dialogue-seed.ts` tách khỏi gen script để unit test (đề xuất chỉ yêu cầu smoke-run).
  5. Số file dialogue JSON là 1 file/level (`dialogues-hskN.json`) thay vì 1 file/bài — khớp pattern `lessons-hskN.json` của Wave 2.
  6. Task 5 yêu cầu verify migration số trống trước khi viết 0006 (phòng Wave 2 trùng số).
