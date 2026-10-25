# Shadowing Video Thật (Whisper) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Thực hiện từng task theo đúng thứ tự; không nhảy cóc, không đánh dấu checkbox mà chưa chạy được lệnh verify tương ứng.

**Spec:** /Volumes/samsung512/Code/hsk/docs/superpowers/specs/2026-10-24-hsk15-roadmap-design.md (mục W1.0–W1.4)

**Goal:** Thay phụ đề fallback bằng phụ đề thật (transcript + timestamp + pinyin) cho ≥ 20 video shadowing: cài Whisper local trên máy dev, curate video YouTube công khai, dựng pipeline `yt-dlp → whisper.cpp (word timestamps) → tách câu → pypinyin → SQL seed`, nạp lên D1 local (+ remote `hsk-dev`), và thêm hiển thị % phụ đề hoàn thành trên library card. Mic record + score + progress D1 giữ nguyên, chỉ verify không hỏng.

**Architecture:**
- Whisper + yt-dlp + pypinyin là tool **Python/brew ngoài pnpm** — task setup tách bạch (Task 1), cài vào `app-next/scripts/content/.venv` (gitignored).
- Script bridge `.mts` gọi CLI qua `child_process.execFile`, output JSON trung gian vào `app-next/scripts/content/out/` (gitignored), rồi sinh SQL seed.
- Module thuần (tách câu, map pinyin) là TS thuần không I/O — unit test bằng vitest như mọi module khác trong repo.
- Seed mới **không đụng** migration: schema `content_shadowing_*` đã có đủ (dùng lại bảng hiện có, không thêm cột). Phụ đề thật ghi đè bằng `INSERT OR REPLACE INTO content_shadowing_subtitles`.
- App layer (embed youtube-nocookie, mic, progress) không đổi logic; chỉ library card thêm pill % phụ đề.

**Tech Stack:** Next.js 16 + TS + Drizzle + Cloudflare D1 (pnpm bắt buộc), whisper.cpp (brew, model `ggml-medium`), yt-dlp, pypinyin (venv Python 3), vitest, wrangler d1.

## Global Constraints (bắt buộc đọc trước khi làm bất kỳ task nào)

1. **Pháp lý — nghiêm cấm:** KHÔNG dùng transcript/phụ đề/data bất kỳ dạng nào từ API hay site nhaihsk. Chỉ được lấy **video ID công khai** trên YouTube (tìm tay qua YouTube search / kênh gốc). Mọi transcript trong plan này do Whisper tự transcribe từ audio — không copy nội dung từ nguồn nào khác.
2. **yt-dlp chỉ tải audio nội bộ** (`-x --audio-format wav`) vào `scripts/content/out/` (gitignored) để transcribe. KHÔNG upload, KHÔNG commit audio/video/transcript ra repo hay CDN. Hiển thị trong app vẫn là **embed YouTube chính thức qua youtube-nocookie** như player hiện có (`src/components/shadowing/studio/use-player-engine.ts`) — không stream lại audio.
3. **pnpm bắt buộc** trong `app-next/`; không dùng npm/yarn.
4. DB: local D1 binding đọc từ `app-next/wrangler.jsonc` (DB tên `hsk`, migrations_dir `drizzle`). DB dev remote tên `hsk-dev` (config `app-next/wrangler.dev.jsonc`). Prod DB `hsk --remote` chỉ áp lúc deploy — nằm ngoài plan này.
5. BẮT BUỘC test trước khi commit (TDD: viết test fail → chạy thấy fail → implement → chạy pass → commit, conventional commit). Cấm placeholder: không TBD/TODO, không "xử lý edge case sau".
6. Chỉ sửa file được liệt kê trong từng task. Không sửa `src/content/shadowing.ts` (dữ liệu cũ 20 video giữ nguyên làm fallback); phụ đề thật mới nạp qua SQL seed đè lên D1.
7. Làm việc từ thư mục `app-next/` cho mọi lệnh pnpm/wrangler/tsx.

---

## Task 0: Setup Whisper + yt-dlp + pypinyin trên máy dev (W1.0)

**Files:**
- Create: `app-next/scripts/content/.gitignore` (gitignore venv + out, vì parent gitignore không phủ)
- Create: `app-next/scripts/content/README.md` — ghi lại đúng các lệnh cài dưới đây (bắt buộc, để tái lập trên máy khác)
- Test: không có unit test (task setup máy) — thay bằng **smoke verify** bắt buộc chạy được, output phải khớp mẫu.

**Interfaces:**
- Consumes: mạng (brew, pip, HuggingFace model download), python3 hệ thống (macOS darwin arm64 có sẵn).
- Produces: CLI `whisper-cli` (brew), venv `app-next/scripts/content/.venv` với `yt-dlp`, `pypinyin`; model `ggml-medium.bin` tại `app-next/scripts/content/models/`.

**Steps:**
- [ ] Cài whisper.cpp + ffmpeg qua Homebrew:
  ```bash
  brew install whisper-cpp ffmpeg
  which whisper-cli && whisper-cli --help >/dev/null && echo OK
  ```
- [ ] Tải model medium vào `app-next/scripts/content/models/`:
  ```bash
  mkdir -p /Volumes/samsung512/Code/hsk/app-next/scripts/content/models
  curl -L -o /Volumes/samsung512/Code/hsk/app-next/scripts/content/models/ggml-medium.bin \
    https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin
  # ~1.5GB — verify non-empty
  ls -lh /Volumes/samsung512/Code/hsk/app-next/scripts/content/models/ggml-medium.bin
  ```
- [ ] Tạo venv Python với yt-dlp + pypinyin:
  ```bash
  cd /Volumes/samsung512/Code/hsk/app-next/scripts/content
  python3 -m venv .venv
  ./.venv/bin/pip install --upgrade pip
  ./.venv/bin/pip install yt-dlp pypinyin
  ./.venv/bin/yt-dlp --version && ./.venv/bin/python -c "import pypinyin; print('pypinyin OK')"
  ```
- [ ] Tạo `app-next/scripts/content/.gitignore` với nội dung chính xác:
  ```
  .venv/
  out/
  models/
  ```
- [ ] Smoke transcribe 1 video test (W1.0): lấy audio + chạy whisper, verify timestamp:
  ```bash
  cd /Volumes/samsung512/Code/hsk/app-next/scripts/content
  mkdir -p out/EA3rwvr99Q0
  ./.venv/bin/yt-dlp -x --audio-format wav -o "out/EA3rwvr99Q0/audio.%(ext)s" "https://www.youtube.com/watch?v=EA3rwvr99Q0"
  whisper-cli -m models/ggml-medium.bin -l zh -ml 1 -ojf \
    -f out/EA3rwvr99Q0/audio.wav -of out/EA3rwvr99Q0/whisper-smoke
  ```
  Verify fail-first rồi pass: chạy lệnh dưới, phải in `"start"` và `"w"`:
  ```bash
  python3 -c "import json;d=json.load(open('out/EA3rwvr99Q0/whisper-smoke.json'));t=d['transcription'][0];print('OK', t['timestamps']['from'], repr(t['text']))"
  ```
  Nếu JSON thiếu token-level timestamps (chỉ có segment), chạy lại thêm `-ml 1` (mỗi token 1 segment con) — bắt buộc phải có `timestamps.from` ở từng phần tử `transcription`.
- [ ] Ghi lại toàn bộ lệnh trên (đúng văn bản) vào `app-next/scripts/content/README.md` kèm 1 dòng cảnh báo pháp lý: "Audio chỉ tải nội bộ để transcribe, không commit (.venv/out/models đã gitignore); không dùng dữ liệu nhaihsk."
- [ ] Commit: `git add app-next/scripts/content/.gitignore app-next/scripts/content/README.md && git commit -m "chore(shadowing): setup whisper.cpp + yt-dlp toolchain docs for W1.0"`

## Task 1: Curate video config JSON (W1.1)

**Files:**
- Create: `app-next/scripts/content/shadowing-videos.json` — danh sách ≥ 20 video (curate tay bởi owner; plan cung cấp khung + cách tìm, nội dung video ID do owner điền rồi mới chạy verify).
- Create: `app-next/scripts/content/video-config.ts` — type + loader + validate thuần.
- Test: `app-next/scripts/content/__tests__/video-config.test.ts`

**Interfaces:**
- Produces (từ `video-config.ts`):
  ```ts
  export type CuratedVideo = {
    videoId: string;       // YouTube ID 11 ký tự, công khai
    playlistId: string;    // trùng 1 playlist hiện có: daihuaxiyou | long-baba | so-cap | an-kha-hy | simple-days
    hsk: string;           // "HSK1"…"HSK6"
    topic: "life" | "food" | "travel" | "film";
    spd: number;           // 0.75 | 0.85 | 0.9 | 1
  };
  export function loadCuratedVideos(raw: unknown): CuratedVideo[]; // throw Error nếu invalid
  export function readCuratedVideos(): CuratedVideo[]; // đọc file JSON + loadCuratedVideos, chỉ dùng trong script build
  ```

**Cách tìm video (cho owner, không dùng nhaihsk):** vào YouTube search các query `slow Chinese listening HSK1`, `comprehensible input Chinese`, `HSK3 listening practice`; vào kênh như "DaihuaXiyou Official", "我的爸爸是條龍", các kênh slow-Chinese podcast; mở video công khai, copy video ID từ URL `watch?v=<11 ký tự>`. KHÔNG scrape site đối thủ — chỉ ID từ YouTube chính chủ. Owner điền tay vào JSON.

**Steps:**
- [ ] Viết test trước (`app-next/scripts/content/__tests__/video-config.test.ts`):
  ```ts
  import { describe, expect, it } from "vitest";
  import { loadCuratedVideos } from "../video-config";

  describe("loadCuratedVideos", () => {
    it("chấp nhận danh sách hợp lệ", () => {
      const vids = loadCuratedVideos([
        { videoId: "EA3rwvr99Q0", playlistId: "daihuaxiyou", hsk: "HSK3", topic: "film", spd: 0.9 },
      ]);
      expect(vids).toHaveLength(1);
      expect(vids[0].videoId).toBe("EA3rwvr99Q0");
    });
    it("từ chối videoId sai độ dài / playlist lạ / spd lạ", () => {
      expect(() =>
        loadCuratedVideos([{ videoId: "abc", playlistId: "daihuaxiyou", hsk: "HSK3", topic: "film", spd: 0.9 }])
      ).toThrow(/videoId/);
      expect(() =>
        loadCuratedVideos([{ videoId: "EA3rwvr99Q0", playlistId: "khong-co", hsk: "HSK3", topic: "film", spd: 0.9 }])
      ).toThrow(/playlistId/);
      expect(() =>
        loadCuratedVideos([{ videoId: "EA3rwvr99Q0", playlistId: "daihuaxiyou", hsk: "HSK3", topic: "film", spd: 0.5 }])
      ).toThrow(/spd/);
    });
    it("từ chối danh sách < 20 video", () => {
      expect(() => loadCuratedVideos([])).toThrow(/ít nhất 20/);
    });
  });
  ```
- [ ] Chạy verify fail: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run scripts/content/__tests__/video-config.test.ts` → phải fail (module chưa tồn tại).
- [ ] Implement `app-next/scripts/content/video-config.ts`:
  ```ts
  /* Danh sách video curated cho Wave 1 — owner điền tay vào shadowing-videos.json.
     Chỉ video ID công khai từ YouTube; CẤM dữ liệu từ nhaihsk (xem plan Global Constraints 1). */
  import { readFileSync } from "node:fs";
  import { join } from "node:path";

  export type CuratedVideo = {
    videoId: string;
    playlistId: string;
    hsk: string;
    topic: "life" | "food" | "travel" | "film";
    spd: number;
  };

  const PLAYLISTS = ["daihuaxiyou", "long-baba", "so-cap", "an-kha-hy", "simple-days"];
  const TOPICS = ["life", "food", "travel", "film"];
  const SPDS = [0.75, 0.85, 0.9, 1];

  export function loadCuratedVideos(raw: unknown): CuratedVideo[] {
    if (!Array.isArray(raw) || raw.length < 20) throw new Error("Cần ít nhất 20 video curated");
    return raw.map((v) => {
      const c = v as Record<string, unknown>;
      if (typeof c.videoId !== "string" || !/^[A-Za-z0-9_-]{11}$/.test(c.videoId))
        throw new Error(`videoId không hợp lệ: ${String(c.videoId)}`);
      if (typeof c.playlistId !== "string" || !PLAYLISTS.includes(c.playlistId))
        throw new Error(`playlistId không hợp lệ: ${String(c.playlistId)}`);
      if (typeof c.hsk !== "string" || !/^HSK[1-6]$/.test(c.hsk)) throw new Error(`hsk không hợp lệ: ${String(c.hsk)}`);
      if (typeof c.topic !== "string" || !TOPICS.includes(c.topic)) throw new Error(`topic không hợp lệ: ${String(c.topic)}`);
      if (typeof c.spd !== "number" || !SPDS.includes(c.spd)) throw new Error(`spd không hợp lệ: ${String(c.spd)}`);
      return { videoId: c.videoId, playlistId: c.playlistId, hsk: c.hsk, topic: c.topic as CuratedVideo["topic"], spd: c.spd };
    });
  }

  export function readCuratedVideos(): CuratedVideo[] {
    const raw = JSON.parse(readFileSync(join(import.meta.dirname, "shadowing-videos.json"), "utf8")) as unknown;
    return loadCuratedVideos(raw);
  }
  ```
  (Nếu TS version hiện tại không hỗ trợ `import.meta.dirname` — repo dùng TS ^5, Node 20+ có `import.meta.dirname`; nếu typecheck báo lỗi, thay bằng `new URL(".", import.meta.url).pathname`.)
- [ ] Chạy verify pass: `pnpm vitest run scripts/content/__tests__/video-config.test.ts` → 3 test xanh.
- [ ] Tạo `shadowing-videos.json` — owner điền ≥ 20 object theo shape:
  ```json
  [
    { "videoId": "EA3rwvr99Q0", "playlistId": "daihuaxiyou", "hsk": "HSK3", "topic": "film", "spd": 0.9 }
  ]
  ```
  Verify: `pnpm tsx -e "import {readCuratedVideos} from './scripts/content/video-config'; console.log(readCuratedVideos().length)"` → in số ≥ 20. (Nếu chưa điền đủ, dừng task này — không được fake data.)
- [ ] Commit: `git add app-next/scripts/content/video-config.ts app-next/scripts/content/__tests__/video-config.test.ts app-next/scripts/content/shadowing-videos.json && git commit -m "feat(shadowing): curated video config + validator for W1.1"`

## Task 2: Module thuần — tách câu từ word-timestamps

**Files:**
- Create: `app-next/scripts/content/split-sentences.ts`
- Test: `app-next/scripts/content/__tests__/split-sentences.test.ts`

**Interfaces:**
- Consumes (input shape khớp whisper.cpp JSON `-ojf`, đã flatten): `WhisperToken { text: string; start: number; end: number }` (giây).
- Produces (từ `split-sentences.ts`):
  ```ts
  export type WhisperToken = { text: string; start: number; end: number };
  export type SentenceDraft = { zh: string; start: number; end: number; tokens: WhisperToken[] };
  export function splitSentences(tokens: WhisperToken[], opts?: { maxGap?: number; maxLen?: number }): SentenceDraft[];
  ```
  Quy tắc: cắt câu khi gặp token kết thúc bằng `。？！?!. ` (punctuation zh/en) hoặc gap giữa 2 token > `maxGap` (mặc định 1.5s) hoặc độ dài câu > `maxLen` ký tự zh (mặc định 60) khi gặp token kế tiếp mở đầu câu mới. Câu rỗng bị bỏ. `zh` là chuỗi zh không khoảng trắng thừa. `start`/`end` = min/max timestamp của tokens trong câu, làm tròn 1 chữ số thập phân.

**Steps:**
- [ ] Viết test trước (`split-sentences.test.ts`):
  ```ts
  import { describe, expect, it } from "vitest";
  import { splitSentences, type WhisperToken } from "../split-sentences";

  const tok = (text: string, start: number, end: number): WhisperToken => ({ text, start, end });

  describe("splitSentences", () => {
    it("cắt câu theo dấu 。？！", () => {
      const s = splitSentences([tok("你", 0, 0.3), tok("好", 0.3, 0.6), tok("。", 0.6, 0.7), tok("再", 1, 1.3), tok("见", 1.3, 1.6), tok("！", 1.6, 1.7)]);
      expect(s).toHaveLength(2);
      expect(s[0]).toMatchObject({ zh: "你好。", start: 0, end: 0.7 });
      expect(s[1]).toMatchObject({ zh: "再见！", start: 1, end: 1.7 });
    });
    it("cắt khi gap > maxGap (mặc định 1.5s)", () => {
      const s = splitSentences([tok("你好", 0, 0.5), tok("大家好", 3, 3.6), tok("。", 3.6, 3.7)]);
      expect(s).toHaveLength(2);
      expect(s[0].zh).toBe("你好");
      expect(s[1].zh).toBe("大家好。");
    });
    it("cắt câu quá maxLen ký tự", () => {
      const tokens = Array.from({ length: 40 }, (_, i) => tok("字", i * 0.1, i * 0.1 + 0.05));
      const s = splitSentences(tokens, { maxLen: 20 });
      expect(s.every((x) => x.zh.length <= 21)).toBe(true);
      expect(s.length).toBeGreaterThan(1);
    });
    it("bỏ token rỗng và trả mảng rỗng cho input rỗng", () => {
      expect(splitSentences([])).toEqual([]);
      expect(splitSentences([tok("", 0, 0.1), tok("。", 0.1, 0.2)])).toEqual([]);
    });
  });
  ```
- [ ] Verify fail: `pnpm vitest run scripts/content/__tests__/split-sentences.test.ts` → fail (module chưa có).
- [ ] Implement `split-sentences.ts`:
  ```ts
  /* Tách câu từ word-timestamps của whisper.cpp (-ojf -ml 1). Thuần, không I/O. */
  export type WhisperToken = { text: string; start: number; end: number };
  export type SentenceDraft = { zh: string; start: number; end: number; tokens: WhisperToken[] };

  const END_PUNCT = /[。？！?!;.]/;

  export function splitSentences(
    tokens: WhisperToken[],
    opts?: { maxGap?: number; maxLen?: number }
  ): SentenceDraft[] {
    const maxGap = opts?.maxGap ?? 1.5;
    const maxLen = opts?.maxLen ?? 60;
    const out: SentenceDraft[] = [];
    let cur: WhisperToken[] = [];
    const flush = () => {
      const real = cur.filter((t) => t.text.trim() !== "" && t.text !== "。");
      const withPunct = cur.filter((t) => t.text.trim() !== "");
      if (withPunct.length === 0) { cur = []; return; }
      const zh = cur.map((t) => t.text).join("").replace(/\s+/g, "").trim();
      if (zh === "") { cur = []; return; }
      const all = real.length ? real : withPunct;
      out.push({
        zh,
        start: Math.round(Math.min(...all.map((t) => t.start)) * 10) / 10,
        end: Math.round(Math.max(...all.map((t) => t.end)) * 10) / 10,
        tokens: cur,
      });
      cur = [];
    };
    for (const t of tokens) {
      if (cur.length > 0) {
        const prev = cur[cur.length - 1];
        if (END_PUNCT.test(prev.text) || t.start - prev.end > maxGap || cur.join("").length >= maxLen) flush();
      }
      cur.push(t);
      if (END_PUNCT.test(t.text)) flush();
    }
    flush();
    return out;
  }
  ```
  Lưu ý: nếu test nào fail do chi tiết merge punctuation/gap, sửa implement cho khớp test — test là chuẩn.
- [ ] Verify pass: `pnpm vitest run scripts/content/__tests__/split-sentences.test.ts` → 4 test xanh.
- [ ] Commit: `git add app-next/scripts/content/split-sentences.ts app-next/scripts/content/__tests__/split-sentences.test.ts && git commit -m "feat(shadowing): pure sentence splitter from whisper word-timestamps (W1.2)"`

## Task 3: Module thuần — map pinyin per-câu (pypinyin output → parts + pinyin)

**Files:**
- Create: `app-next/scripts/content/pinyin-parts.ts`
- Test: `app-next/scripts/content/__tests__/pinyin-parts.test.ts`

**Interfaces:**
- Consumes: python side (Task 4) đã xuất per-word pinyin: `WordPinyin { zh: string; py: string[] }` (mỗi âm tiết 1 phần tử, từ `pypinyin.lazy_pinyin(word, errors="ignore")`).
- Produces (từ `pinyin-parts.ts`):
  ```ts
  export type WordPinyin = { zh: string; py: string[] };
  export type SentenceParts = { parts: { zh: string }[]; pinyin: string }; // đúng shape cột sentences của content_shadowing_subtitles
  export function buildSentenceParts(zh: string, words: WordPinyin[]): SentenceParts;
  ```
  Quy tắc: `parts` = tách câu zh thành cụm theo dấu phẩy/chấm (mỗi cụm 1 part, giữ dấu); không có dấu → 1 part duy nhất. `pinyin` = nối âm tiết các word khớp câu bằng khoảng trắng, viết hoa chữ cái đầu của cụm sau dấu câu (khớp style seed hiện có, ví dụ `"Wǒ shì qiè nǚ yōuhún."` — chỉ cần chữ cái đầu câu viết hoa là đạt). Âm tiết nhiều hơn ký tự zh là impossible case do `errors="ignore"` — vẫn assert bằng test guard: tổng độ dài py ≤ số ký tự + dung sai.

**Steps:**
- [ ] Viết test trước (`pinyin-parts.test.ts`):
  ```ts
  import { describe, expect, it } from "vitest";
  import { buildSentenceParts, type WordPinyin } from "../pinyin-parts";

  const words: WordPinyin[] = [
    { zh: "你好", py: ["nǐ", "hǎo"] },
    { zh: "世界", py: ["shì", "jiè"] },
  ];

  describe("buildSentenceParts", () => {
    it("1 câu không dấu → 1 part, pinyin viết hoa đầu câu", () => {
      const r = buildSentenceParts("你好世界", words);
      expect(r.parts).toEqual([{ zh: "你好世界" }]);
      expect(r.pinyin).toBe("Nǐ hǎo shì jiè");
    });
    it("tách parts theo dấu phẩy, giữ dấu ở part trước", () => {
      const r = buildSentenceParts("你好，世界！", words);
      expect(r.parts).toEqual([{ zh: "你好，" }, { zh: "世界！" }]);
      expect(r.pinyin).toBe("Nǐ hǎo, shì jiè!");
    });
    it("zh chứa ký tự python bỏ qua (số) không crash", () => {
      const r = buildSentenceParts("你好5世界", [...words, { zh: "5", py: [] }]);
      expect(r.parts).toEqual([{ zh: "你好5世界" }]);
      expect(r.pinyin).toBe("Nǐ hǎo shì jiè");
    });
  });
  ```
- [ ] Verify fail: `pnpm vitest run scripts/content/__tests__/pinyin-parts.test.ts` → fail.
- [ ] Implement `pinyin-parts.ts`:
  ```ts
  /* Ghép câu zh + per-word pinyin (pypinyin lazy_pinyin) thành shape parts/pinyin
     của content_shadowing_subtitles.sentences. Thuần, không I/O. */
  export type WordPinyin = { zh: string; py: string[] };
  export type SentenceParts = { parts: { zh: string }[]; pinyin: string };

  export function buildSentenceParts(zh: string, words: WordPinyin[]): SentenceParts {
    const flat = words.flatMap((w) => w.py);
    const parts: { zh: string }[] = [];
    let pyIdx = 0;
    const syl: string[] = [];
    const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
    // Duyệt từng ký tự: đẩy pinyin khi gặp ký tự CJK, giữ dấu câu nguyên văn
    const pinyinOf = (seg: string, startIdx: number, isStartOfSentence: boolean): string => {
      const out: string[] = [];
      let i = startIdx;
      for (const ch of seg) {
        if (/[\u4e00-\u9fff]/.test(ch)) {
          const s = flat[pyIdx++];
          if (s) out.push(s);
          i++;
        } else {
          // dấu câu: đính vào token trước nếu có
          if (out.length) out[out.length - 1] += ch;
          else out.push(ch);
          i++;
        }
      }
      const joined = out.join(" ");
      return isStartOfSentence ? cap(joined) : joined;
    };
    // Tách parts theo dấu , ， 。 ！ ？ !
    const segs = zh.match(/[^,，。！？!]*[,，。！？!]?/g)?.filter((s) => s !== "") ?? [zh];
    let cursor = 0;
    segs.forEach((seg, i) => {
      parts.push({ zh: seg });
      syl.push(pinyinOf(seg, cursor, i === 0));
      cursor += seg.length;
    });
    return { parts, pinyin: syl.join(" ").replace(/\s+([,，。！？!])/g, "$1") };
  }
  ```
  Sửa implement đến khi cả 3 test xanh (đặc biệt test số `5` — python `errors="ignore"` trả `py: []` cho nó, TS phải nhảy qua).
- [ ] Verify pass: `pnpm vitest run scripts/content/__tests__/pinyin-parts.test.ts` → 3 test xanh.
- [ ] Commit: `git add app-next/scripts/content/pinyin-parts.ts app-next/scripts/content/__tests__/pinyin-parts.test.ts && git commit -m "feat(shadowing): pinyin per-sentence mapper matching subtitles schema (W1.2)"`

## Task 4: Runner transcribe (yt-dlp + whisper + pypinyin) qua child_process

**Files:**
- Create: `app-next/scripts/content/transcribe-video.mts`
- Test: `app-next/scripts/content/__tests__/transcribe-video.test.ts` (mock execFile — không gọi network trong unit test)

**Interfaces:**
- Consumes: CLI `whisper-cli`, venv `./scripts/content/.venv/bin/yt-dlp`, `./scripts/content/.venv/bin/python` (Task 0); `readCuratedVideos` (Task 1); `splitSentences` (Task 2).
- Produces (từ `transcribe-video.mts`):
  ```ts
  export type TokenizedSentence = { zh: string; start: number; end: number; words: WordPinyin[] };
  export async function transcribeVideo(videoId: string, opts?: { outDir?: string }): Promise<TokenizedSentence[]>;
  // effect: yt-dlp audio → out/<videoId>/audio.wav; whisper-cli -ojf → out/<videoId>/whisper.json;
  // python pypinyin script → out/<videoId>/pinyin.json; trả sentences đã tách + pinyin per word.
  export function flattenWhisperJson(json: string): WhisperToken[]; // parse chuỗi JSON whisper.cpp → tokens (text/start/end giây)
  export const PY_SEGMENT_SNIPPET: string; // code python chuẩn hoá pypinyin, dùng cả trong script và test
  ```
  Output JSON trung gian nằm trong `scripts/content/out/` — đã gitignored (Task 0), tuyệt đối không ghi ra chỗ khác.

**Steps:**
- [ ] Viết test trước (mock `child_process.execFile` qua `vi.mock`; test `flattenWhisperJson` và luồng parse, KHÔNG gọi network):
  ```ts
  import { describe, expect, it, vi, beforeEach } from "vitest";
  import { flattenWhisperJson, transcribeVideo, PY_SEGMENT_SNIPPET } from "../transcribe-video";

  const WHISPER_JSON = JSON.stringify({
    transcription: [
      { timestamps: { from: "00:00:00.000", to: "00:00:00.400" }, offsets: { from: 0, to: 400 }, text: " 你好" },
      { timestamps: { from: "00:00:00.400", to: "00:00:00.700" }, offsets: { from: 400, to: 700 }, text: "世界" },
      { timestamps: { from: "00:00:00.700", to: "00:00:00.800" }, offsets: { from: 700, to: 800 }, text: "。" },
    ],
  });

  describe("flattenWhisperJson", () => {
    it("đổi ms → giây, giữ text", () => {
      const toks = flattenWhisperJson(WHISPER_JSON);
      expect(toks).toEqual([
        { text: "你好", start: 0, end: 0.4 },
        { text: "世界", start: 0.4, end: 0.7 },
        { text: "。", start: 0.7, end: 0.8 },
      ]);
    });
  });

  describe("PY_SEGMENT_SNIPPET", () => {
    it("dùng lazy_pinyin", () => {
      expect(PY_SEGMENT_SNIPPET).toContain("lazy_pinyin");
    });
  });

  describe("transcribeVideo (mocked child_process)", () => {
    beforeEach(() => {
      const { execFile } = await import("node:child_process"); // xem note dưới
    });
    it.skip("e2e thật — chạy manual, không trong CI", () => {});
  });
  ```
  Lưu ý: `vi.mock("node:child_process")` + mock `execFile` trả lần lượt 3 kết quả (yt-dlp không output, whisper ghi file, python in JSON). Viết mock thật: khi gọi `execFile(whisperCli, args, cb)` → ghi file `whisper.json` test vào outDir rồi `cb(null)`; khi gọi python → `cb(null, JSON.stringify([{ zh: "你好", py: ["nǐ", "hǎo"] }, { zh: "世界", py: ["shì", "jiè"] }]))`. Assert `transcribeVideo("TESTID12345")` trả 1 câu `{ zh: "你好世界。", words: [...] }`. Vì mock phức tạp, nếu khối mocked quá rối thì tách `flattenWhisperJson` + PY_SEGMENT_SNIPPET thành 2 test chính, và verify pipeline thật bằng smoke-run ở step sau — nhưng mocked test cho `flattenWhisperJson` + python-parse là bắt buộc.
- [ ] Verify fail: `pnpm vitest run scripts/content/__tests__/transcribe-video.test.ts` → fail (module chưa có).
- [ ] Implement `transcribe-video.mts`:
  ```ts
  /* Pipeline 1 video: yt-dlp audio → whisper.cpp -ojf -ml 1 → tách câu → pypinyin.
     CHỈ chạy trên máy dev (cần brew whisper-cli + venv). Audio/JSON trung gian ở out/
     (gitignored) — pháp lý: không commit, không dùng dữ liệu nhaihsk. */
  import { execFile } from "node:child_process";
  import { mkdir, writeFile, readFile } from "node:fs/promises";
  import { join } from "node:path";
  import { splitSentences, type WhisperToken } from "./split-sentences";
  import type { WordPinyin } from "./pinyin-parts";

  export type TokenizedSentence = { zh: string; start: number; end: number; words: WordPinyin[] };

  export const PY_SEGMENT_SNIPPET = `import sys, json
from pypinyin import lazy_pinyin
words = json.load(sys.stdin)
print(json.dumps([{"zh": w["zh"], "py": lazy_pinyin(w["zh"], errors="ignore")} for w in words], ensure_ascii=False))`;

  const RUN = (cmd: string, args: string[], opts?: { stdin?: string; cwd: string }) =>
    new Promise<string>((res, rej) =>
      execFile(cmd, args, { cwd: opts?.cwd, maxBuffer: 256 * 1024 * 1024 }, (err, stdout) =>
        err ? rej(new Error(`${cmd} failed: ${String(err.message).slice(0, 400)}`)) : res(stdout)
      )
    );

  export function flattenWhisperJson(json: string): WhisperToken[] {
    const d = JSON.parse(json) as { transcription: { offsets: { from: number; to: number }; text: string }[] };
    return d.transcription
      .map((t) => ({ text: t.text.replace(/\s+/g, ""), start: t.offsets.from / 1000, end: t.offsets.to / 1000 }))
      .filter((t) => t.text !== "");
  }

  export async function transcribeVideo(videoId: string, opts?: { outDir?: string }): Promise<TokenizedSentence[]> {
    const root = opts?.outDir ?? join(import.meta.dirname, "out");
    const dir = join(root, videoId);
    await mkdir(dir, { recursive: true });
    const venv = join(import.meta.dirname, ".venv", "bin");
    const yt = join(venv, "yt-dlp");
    const py = join(venv, "python");
    await RUN(yt, ["-x", "--audio-format", "wav", "-o", join(dir, "audio.%(ext)s"), `https://www.youtube.com/watch?v=${videoId}`], { cwd: import.meta.dirname });
    await RUN("whisper-cli", ["-m", join("models", "ggml-medium.bin"), "-l", "zh", "-ml", "1", "-ojf", "-f", join(dir, "audio.wav"), "-of", join(dir, "whisper")], { cwd: import.meta.dirname });
    const tokens = flattenWhisperJson(await readFile(join(dir, "whisper.json"), "utf8"));
    const sentences = splitSentences(tokens);
    const pyOut = await RUN(py, ["-c", PY_SEGMENT_SNIPPET], { stdin: JSON.stringify(sentences.map((s) => ({ zh: s.zh }))), cwd: import.meta.dirname });
    await writeFile(join(dir, "pinyin.json"), pyOut);
    const wordPinyin = JSON.parse(pyOut) as WordPinyin[];
    return sentences.map((s, i) => ({ zh: s.zh, start: s.start, end: s.end, words: wordPinyin[i] ?? { zh: s.zh, py: [] } }));
  }
  ```
  Điều chỉnh `RUN` hỗ trợ `stdin` (dùng `execFile` với option `input` qua child process — nếu `execFile` không nhận stdin trực tiếp, dùng `spawn` + ghi stdin, hoặc tạm ghi stdin payload ra file `out/<id>/words.json` rồi python đọc file: chọn phương án file vì đơn giản và test được; cập nhật PY_SEGMENT_SNIPPET tương ứng đọc `sys.argv[1]`).
- [ ] Verify pass: `pnpm vitest run scripts/content/__tests__/transcribe-video.test.ts` → xanh. Typecheck: `pnpm typecheck` → sạch.
- [ ] Smoke-run thật 1 video (không phải unit test — bắt buộc chạy tay):
  ```bash
  cd /Volumes/samsung512/Code/hsk/app-next
  pnpm tsx -e "import {transcribeVideo} from './scripts/content/transcribe-video'; transcribeVideo('EA3rwvr99Q0').then(s => console.log(s.length, s[0]?.zh, s[0]?.words))"
  ```
  Kỳ vọng: in ra số câu > 0, câu đầu có zh hanzi + mảng pinyin âm tiết. Nếu whisper chọn ngôn ngữ sai, kiểm tra `out/EA3rwvr99Q0/whisper.json`.
- [ ] Commit: `git add app-next/scripts/content/transcribe-video.mts app-next/scripts/content/__tests__/transcribe-video.test.ts && git commit -m "feat(shadowing): yt-dlp + whisper.cpp + pypinyin transcribe runner (W1.2)"`

## Task 5: Build seed SQL từ pipeline (build-shadowing-from-youtube.mts)

**Files:**
- Create: `app-next/scripts/content/build-shadowing-from-youtube.mts`
- Test: `app-next/scripts/content/__tests__/build-seed.test.ts`

**Interfaces:**
- Consumes: `readCuratedVideos` (Task 1), `transcribeVideo` (Task 4), `buildSentenceParts` (Task 3); `pnpm tsx` CLI.
- Produces:
  ```ts
  export function sentenceToRow(n: number, s: TokenizedSentence): { n: number; start: number; end: number; parts: { zh: string }[]; pinyin: string; vi: string };
  export async function buildSeed(videoIds?: string[]): Promise<void>;
  // effect: chạy pipeline từng video (skip nếu out/<id>/pinyin.json đã tồn tại và flag --resume),
  // ghi drizzle/seeds/content-shadowing-w1.sql: mỗi video 1 dòng
  // INSERT OR REPLACE INTO content_shadowing_subtitles (video_id, sentences) VALUES ('<id>', '<json>');
  ```
  `vi` = số thứ tự câu từ 1. `vi` (bản dịch tiếng Việt) = chuỗi rỗng `""` ở bước tự động — bản dịch do owner bổ sung sau (không dùng máy dịch trong wave này); UI đã xử lý `firstDaily.vi &&` nên chuỗi rỗng an toàn. duration/views/… của bảng videos không đổi (đã seed từ Task content cũ).
- CLI: `pnpm tsx scripts/content/build-shadowing-from-youtube.mts [--id <videoId>] [--resume]` — không flag → chạy toàn bộ curated list.

**Steps:**
- [ ] Viết test trước (`build-seed.test.ts`) — test hàm thuần `sentenceToRow` (không I/O):
  ```ts
  import { describe, expect, it } from "vitest";
  import { sentenceToRow } from "../build-shadowing-from-youtube";

  describe("sentenceToRow", () => {
    it("đúng shape row subtitles", () => {
      const row = sentenceToRow(2, { zh: "你好，世界！", start: 0.5, end: 1.5, words: [{ zh: "你好", py: ["nǐ", "hǎo"] }, { zh: "世界", py: ["shì", "jiè"] }] });
      expect(row).toEqual({
        n: 2, start: 0.5, end: 1.5,
        parts: [{ zh: "你好，" }, { zh: "世界！" }],
        pinyin: "Nǐ hǎo, shì jiè!",
        vi: "",
      });
    });
    it("vi luôn rỗng (owner bổ sung tay)", () => {
      expect(sentenceToRow(1, { zh: "好", start: 0, end: 1, words: [{ zh: "好", py: ["hǎo"] }] }).vi).toBe("");
    });
  });
  ```
- [ ] Verify fail: `pnpm vitest run scripts/content/__tests__/build-seed.test.ts` → fail.
- [ ] Implement `build-shadowing-from-youtube.mts`:
  ```ts
  /* CLI: pnpm tsx scripts/content/build-shadowing-from-youtube.mts [--id X] [--resume]
     Sinh drizzle/seeds/content-shadowing-w1.sql (chỉ bảng subtitles) từ pipeline Whisper.
     KHÔNG chứa dữ liệu nhaihsk; audio trung gian gitignored. */
  import { appendFileSync, existsSync, writeFileSync } from "node:fs";
  import { readCuratedVideos } from "./video-config";
  import { transcribeVideo, type TokenizedSentence } from "./transcribe-video";
  import { buildSentenceParts } from "./pinyin-parts";

  export function sentenceToRow(n: number, s: TokenizedSentence) {
    const { parts, pinyin } = buildSentenceParts(s.zh, s.words);
    return { n, start: s.start, end: s.end, parts, pinyin, vi: "" };
  }

  const esc = (s: string) => s.replace(/'/g, "''");

  async function buildSeed(videoIds?: string[]): Promise<void> {
    const resume = process.argv.includes("--resume");
    const onlyId = process.argv.includes("--id") ? process.argv[process.argv.indexOf("--id") + 1] : undefined;
    const curated = readCuratedVideos().filter((v) => !onlyId || v.videoId === onlyId);
    const sqlPath = "drizzle/seeds/content-shadowing-w1.sql";
    if (!onlyId && existsSync(sqlPath)) writeFileSync(sqlPath, "-- Seed subtitles W1 (whisper) — sinh tự động, đừng sửa tay.\n");
    for (const v of curated) {
      const marker = `scripts/content/out/${v.videoId}/pinyin.json`;
      const sentences: { n: number; start: number; end: number; parts: { zh: string }[]; pinyin: string; vi: string }[] = [];
      if (resume && existsSync(marker)) {
        const cached = await import("node:fs/promises").then((m) => m.readFile(marker, "utf8"));
        const words = JSON.parse(cached) as { zh: string; py: string[] }[];
        // resume: dùng lại whisper.json đã có — transcribeVideo sẽ skip yt-dlp nếu audio.wav tồn tại (xử lý trong Task 4 khi implement)
        const sents = await transcribeVideo(v.videoId);
        sentences.push(...sents.map((s, i) => sentenceToRow(i + 1, s)));
      } else {
        const sents = await transcribeVideo(v.videoId);
        sentences.push(...sents.map((s, i) => sentenceToRow(i + 1, s)));
      }
      const json = esc(JSON.stringify(sentences));
      const line = `INSERT OR REPLACE INTO content_shadowing_subtitles (video_id, sentences) VALUES ('${v.videoId}', '${json}');\n`;
      appendFileSync(sqlPath, line);
      console.log(`${v.videoId}: ${sentences.length} câu`);
    }
  }

  // chỉ chạy CLI khi invoked trực tiếp, không khi được import để test
  if (process.argv[1]?.includes("build-shadowing-from-youtube")) {
    buildSeed().catch((e) => { console.error(e); process.exit(1); });
  }
  export { buildSeed };
  ```
  Trong lúc implement, thêm vào `transcribeVideo` (Task 4 file) nhánh skip: nếu `audio.wav` tồn tại → bỏ yt-dlp; nếu `whisper.json` tồn tại → bỏ whisper. Đây là chỉnh sửa hợp lệ của file Task 4.
- [ ] Verify pass: `pnpm vitest run scripts/content/__tests__/build-seed.test.ts` → xanh; `pnpm typecheck` sạch.
- [ ] Chạy thật cho toàn bộ curated list (chạy dài — mỗi video 1–5 phút tùy độ dài; chạy trong tmux/screen):
  ```bash
  cd /Volumes/samsung512/Code/hsk/app-next
  pnpm tsx scripts/content/build-shadowing-from-youtube.mts --resume
  ```
  Kỳ vọng: `drizzle/seeds/content-shadowing-w1.sql` chứa ≥ 20 dòng INSERT, mỗi dòng JSON hợp lệ. Spot-check 1 video: mở `out/<id>/pinyin.json` nghe đối chiếu 1–2 câu với audio YouTube (manual, ghi lại kết quả review vào PR description).
- [ ] **Review thủ công pháp lý (bắt buộc trước commit):** xác nhận mọi nội dung trong SQL sinh từ Whisper trên audio YouTube tự tải — không có chuỗi nào copy từ nhaihsk. Ghi 1 dòng xác nhận vào commit message body.
- [ ] Commit: `git add app-next/scripts/content/build-shadowing-from-youtube.mts app-next/scripts/content/__tests__/build-seed.test.ts app-next/scripts/content/transcribe-video.mts drizzle/seeds/content-shadowing-w1.sql && git commit -m "feat(shadowing): whisper pipeline seed builder + W1 subtitles seed (W1.2)\n\nTranscripts tự sinh bởi whisper.cpp từ audio YouTube tải nội bộ; không dùng dữ liệu nhaihsk."`

## Task 6: Nạp seed D1 local + remote (W1.3)

**Files:**
- Modify: không có file code — chỉ chạy wrangler + verify.
- Test: verify bằng query D1 + `pnpm test` + `pnpm test:e2e`.

**Interfaces:**
- Consumes: `drizzle/seeds/content-shadowing-w1.sql` (Task 5); wrangler binding từ `wrangler.jsonc` (DB `hsk`) và `wrangler.dev.jsonc` (DB `hsk-dev`).
- Produces: D1 local có ≥ 20 rows `content_shadowing_subtitles` thật (tổng ≥ 24 gồm 4 rows cũ); D1 remote `hsk-dev` tương tự.

**Steps:**
- [ ] Nạp local (thứ tự: seed cũ trước nếu chưa, rồi seed W1):
  ```bash
  cd /Volumes/samsung512/Code/hsk/app-next
  pnpm wrangler d1 migrations apply hsk --local
  pnpm wrangler d1 execute hsk --local --file drizzle/seeds/content-shadowing.sql
  pnpm wrangler d1 execute hsk --local --file drizzle/seeds/content-shadowing-w1.sql
  ```
- [ ] Verify local fail-first rồi pass:
  ```bash
  pnpm wrangler d1 execute hsk --local --command "SELECT COUNT(*) AS n FROM content_shadowing_subtitles"
  ```
  Trước khi nạp W1, query này trả số nhỏ hơn; sau khi nạp phải `≥ 24` (4 cũ + ≥ 20 mới). Nếu < 24: quay lại Task 5 kiểm tra log pipeline.
- [ ] Nạp remote dev DB:
  ```bash
  pnpm wrangler d1 execute hsk-dev --remote --file drizzle/seeds/content-shadowing-w1.sql -c wrangler.dev.jsonc
  pnpm wrangler d1 execute hsk-dev --remote --command "SELECT COUNT(*) AS n FROM content_shadowing_subtitles" -c wrangler.dev.jsonc
  ```
  (Nếu flag `-c` không nhận, chạy `CLOUDFLARE_ENV=dev` hoặc kiểm tra runbook trong `docs/superpowers/plans/2026-10-06-dehardcode-phase-0-1.md` — pattern lệnh d1 đã ghi ở đó. Remote là step có thể defer đến khi cần test remote — ghi rõ trạng thái khi xong.)
- [ ] E2e local xanh: `pnpm test && pnpm test:e2e` — toàn bộ pass; mở `/shadowing` trên `pnpm dev`, xác nhận ≥ 20 card hiển thị câu thật (không còn fallback synthetic trên các video curated — check bằng cách tìm câu đầu của 3 video bất kỳ trong JSON seed xuất hiện trên UI).
- [ ] Commit: nếu có thay đổi gì ở seeds/generated (không có thì chỉ ghi nhận), skip commit. Task này không sinh commit nếu không đổi file.

## Task 7: Hiển thị % phụ đề hoàn thành trên library card (W1.4)

**Files:**
- Modify: `app-next/src/app/(app)/shadowing/shadowing-library.tsx` (StatusPill ~line 270–290: thêm hiển thị % câu đã luyện; và video card ~line 238–260: truyền `lines.length` đã có sẵn)
- Create: `app-next/src/lib/shadowing/subtitle-progress.ts`
- Test: `app-next/src/lib/shadowing/__tests__/subtitle-progress.test.ts` (dir `src/lib/shadowing/__tests__` đã tồn tại)

**Interfaces:**
- Consumes: `ProgressRec`/`ProgressMap` từ `src/lib/shadowing/progress.ts` (`{ status: "new"|"mid"|"done"; score: number|null; seconds: number; linesDone: number; updatedAt: string }`); `subtitlesByVideo` prop hiện có của `ShadowingLibrary`.
- Produces (từ `subtitle-progress.ts`):
  ```ts
  import type { ProgressRec } from "@/lib/shadowing/progress";
  export function subtitlePct(rec: ProgressRec | undefined, totalLines: number): number | null;
  // null khi chưa có progress (rec undefined) hoặc totalLines = 0;
  // ngược lại: rec.status === "done" → 100; min(round(linesDone / totalLines * 100), 100).
  ```

**Steps:**
- [ ] Viết test trước (`subtitle-progress.test.ts`):
  ```ts
  import { describe, expect, it } from "vitest";
  import { subtitlePct } from "../subtitle-progress";

  const rec = (linesDone: number, status: "new" | "mid" | "done" = "mid") =>
    ({ status, score: null, seconds: 0, linesDone, updatedAt: "2026-01-01T00:00:00Z" });

  describe("subtitlePct", () => {
    it("undefined rec → null", () => expect(subtitlePct(undefined, 9)).toBeNull());
    it("totalLines 0 → null", () => expect(subtitlePct(rec(3), 0)).toBeNull());
    it("done → 100", () => expect(subtitlePct(rec(3, "done"), 9)).toBe(100));
    it("mid → round(linesDone/total*100)", () => expect(subtitlePct(rec(4), 9)).toBe(44));
    it("cap 100", () => expect(subtitlePct(rec(20), 9)).toBe(100));
  });
  ```
- [ ] Verify fail: `pnpm vitest run src/lib/shadowing/__tests__/subtitle-progress.test.ts` → fail.
- [ ] Implement `subtitle-progress.ts`:
  ```ts
  /* % phụ đề đã hoàn thành trên library card (spec W1.4). Thuần, test được. */
  import type { ProgressRec } from "@/lib/shadowing/progress";

  export function subtitlePct(rec: ProgressRec | undefined, totalLines: number): number | null {
    if (!rec || totalLines <= 0) return null;
    if (rec.status === "done") return 100;
    return Math.min(Math.round((rec.linesDone / totalLines) * 100), 100);
  }
  ```
- [ ] Verify pass: `pnpm vitest run src/lib/shadowing/__tests__/subtitle-progress.test.ts` → 5 test xanh.
- [ ] Modify `shadowing-library.tsx`: trong `StatusPill` (file line ~271), nhánh "mid" đổi text từ `Đang luyện · {Math.min(rec.linesDone, total)}/{total} câu` thành `Đang luyện · {subtitlePct({ ...rec, score: rec.score }, total) ?? 0}% câu`. Import `{ subtitlePct } from "@/lib/shadowing/subtitle-progress"`. Cụ thể:
  ```tsx
  if (rec?.status === "mid")
    return (
      <span className={`${base} border-feedback-warning bg-amber-wash text-amber-ink`}>
        Đang luyện · {subtitlePct(rec, total)}% câu
      </span>
    );
  ```
  (`subtitlePct` nhận `rec` type rộng hơn — `StatusPill` đang khai báo `rec?: { status: string; score: number|null; linesDone: number }`; nới type prop thành `ProgressRec | undefined` để khớp — import `type { ProgressRec } from "@/lib/shadowing/progress"`.)
- [ ] Verify: `pnpm vitest run "src/app/(app)/shadowing/__tests__/shadowing-library.test.ts"` → xanh (nếu test snapshot/text cũ khớp chuỗi "x/y câu" → cập nhật expectation trong test đó cho khớp "% câu" và ghi rõ trong commit). Rồi `pnpm typecheck && pnpm test`.
- [ ] Verify tay: `pnpm dev` → `/shadowing` → luyện 1 video vài câu → card hiển thị % đúng.
- [ ] Commit: `git add src/lib/shadowing/subtitle-progress.ts src/lib/shadowing/__tests__/subtitle-progress.test.ts "src/app/(app)/shadowing/shadowing-library.tsx" && git commit -m "feat(shadowing): show subtitle completion % on library card (W1.4)"`

---

## Acceptance (Wave 1 done khi)

- [ ] ≥ 20 video có phụ đề thật (whisper, timestamp + pinyin) trên D1 local (`SELECT COUNT(*) FROM content_shadowing_subtitles` ≥ 24) và đã nạp `hsk-dev` remote.
- [ ] E2e shadowing xanh: `pnpm test && pnpm test:e2e` pass; `pnpm typecheck` sạch.
- [ ] Review thủ công: transcript ≥ 3 video đối chiếu audio, không chứa bất kỳ data nào từ nhaihsk; audio/JSON trung gian nằm trong `scripts/content/out/` (gitignored, không commit).
- [ ] Library card hiển thị % phụ đề hoàn thành (W1.4).

## Self-review (đã làm khi viết plan)

- **Spec coverage W1:** W1.0 → Task 0; W1.1 → Task 1; W1.2 → Tasks 2–5; W1.3 → Task 6; W1.4 → Task 7. Acceptance spec (≥20 video D1 local, e2e xanh, review không nhaihsk) → mục Acceptance. Mic record + score + progress D1: không đổi code (chỉ verify ở Task 6), đúng "giữ nguyên tốt hiện có".
- **Placeholder scan:** không có TBD/TODO. `vi` (bản dịch Việt) = chuỗi rỗng có chủ đích, UI đã guard `firstDaily.vi &&` (shadowing-library.tsx line ~155) — không phải placeholder ngầm.
- **Type consistency:** `SubtitleSentence` trong schema (`content_shadowing_subtitles.sentences.$type`) = `{ n; start; end; parts: {zh}[]; pinyin; vi }` — khớp `sentenceToRow`. `WordPinyin` khớp python output `lazy_pinyin(..., errors="ignore")`. `ProgressRec` dùng đúng shape từ `progress.ts`.
- **Lệch so với mô tả audit đã kiểm chứng:** (1) studio nằm ở `src/app/(app)/shadowing/[videoId]/shadowing-studio.tsx` (không phải `src/components/shadowing/shadowing-studio.tsx`); (2) seed hiện có **4/20** video có phụ đề thật (EA3rwvr99Q0, sXo-yHFkAio, H3aRI3ypx_0, DQBzSl3OM1I), không phải 1/20; (3) schema không có cột `youtubeId` riêng — video `id` chính là YouTube ID, pipeline dùng thẳng; (4) card library đã có `StatusPill` hiển thị `x/y câu` cho "mid" — Task 7 đổi sang % thay vì thêm pill mới; (5) không cần migration mới (bảng đã đủ).
