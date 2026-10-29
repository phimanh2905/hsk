# Pinyin Static Audio — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render 2025 mp3 (405 âm × 5 thanh) offline bằng Kokoro Python, phát từ CDN edge thay vì Kokoro runtime trong dialog của `/pinyin/bang-am` — click → nghe ~50–150ms.

**Architecture:** Generator TS sinh bảng ánh xạ (âm, thanh) → chữ Hán từ vocab + pinyinExamples (kèm spike thử KPipeline đọc trực tiếp pinyin); Python renderer đọc JSON committed → mp3 24kHz + QA gate; client `useStaticAudio` phát file, fallback `useTts` khi thiếu.

**Tech Stack:** TypeScript strict + tsx (generator), Python 3.12 + kokoro/misaki (venv `.venv-kokoro` ở main repo, gitignored), Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-29-pinyin-static-audio-design.md`

## Global Constraints

- Worktree: `/Volumes/samsung512/Code/hsk-pinyin-audio` (branch `pinyin-static-audio`); mọi lệnh chạy từ `app-next/` trong worktree; pnpm only.
- Python renderer chạy bằng venv của main repo: `/Volumes/samsung512/Code/hsk/app-next/scripts/content/.venv-kokoro/bin/python` (venv gitignored, không có trong worktree).
- Không sửa `src/content/pinyin.ts`, `src/content/vocab.ts` (seed/generator sources). Không sửa `render-dialogue-audio.py`.
- Voice `zf_001`, 24kHz mono mp3 — khớp audio lesson.
- Client: không thêm package; giữ fallback `useTts` cho mọi path lỗi.
- Tone 5 (nhẹ): chỉ render khi có chữ thật mang thanh 5; ô thiếu → renderer skip → client fallback (xem Task 3 spike).

---

### Task 1: `parseTone` — parse pinyin có dấu/số thành (base, tone)

**Files:**
- Modify: `src/lib/pinyin/tone-mark.ts` (thêm export, không đụng hàm cũ)
- Test: `src/lib/pinyin/__tests__/tone-mark.test.ts` (thêm describe)

**Interfaces:**
- Consumes: nothing (pure).
- Produces: `parseTone(syllable: string): { base: string; tone: Tone } | null` — chấp nhận cả dạng dấu ("bà" → base "ba", tone 4; "nǚ" → "nü", 3) lẫn số ("ba4" → "ba", 4; "le5" → "le", 5); không hợp lệ → null.

- [ ] **Step 1: Write the failing test**

```ts
describe("parseTone", () => {
  it("parse dạng dấu thanh", () => {
    expect(parseTone("bà")).toEqual({ base: "ba", tone: 4 });
    expect(parseTone("mā")).toEqual({ base: "ma", tone: 1 });
    expect(parseTone("nǚ")).toEqual({ base: "nü", tone: 3 });
    expect(parseTone("liú")).toEqual({ base: "liu", tone: 2 });
    expect(parseTone("ba")).toEqual({ base: "ba", tone: 5 });
  });
  it("parse dạng số (vocab dùng chen2/le5)", () => {
    expect(parseTone("ba4")).toEqual({ base: "ba", tone: 4 });
    expect(parseTone("le5")).toEqual({ base: "le", tone: 5 });
    expect(parseTone("zhui1")).toEqual({ base: "zhui", tone: 1 });
  });
  it("input rỗng/ký tự lạ → null", () => {
    expect(parseTone("")).toBeNull();
    expect(parseTone("12")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test — FAIL** (`pnpm vitest run src/lib/pinyin/__tests__/tone-mark.test.ts`)

- [ ] **Step 3: Implement** — tách digit đuôi (`/(\d)$/` → tone; không digit → tone 5), gỡ dấu combining bằng NFC → NFD strip marks `\u0300-\u030C`, map kết quả qua kiểm tra `^[a-zü]+$`. ~25 dòng.

- [ ] **Step 4: Run test — PASS. Commit** `feat(pinyin): parseTone — parse pinyin dấu/số thành base+tone`

### Task 2: Generator `gen-pinyin-hanzi-map.mts`

**Files:**
- Create: `scripts/content/gen-pinyin-hanzi-map.mts`
- Create (output, committed): `scripts/content/data/pinyin/render-input.json`
- Test: `scripts/content/__tests__/pinyin-hanzi-map.test.ts`

**Interfaces:**
- Consumes: `src/content/vocab.ts` (source text, regex `W("…", "chen2 mo4", …)` — pinyin dạng số, hanzi align token), `src/content/pinyin.ts` (`pinyinValid`, `pinyinExamples`), `parseTone` (Task 1).
- Produces: JSON `{ generatedAt, cells: [{ initial, final, base, hanzi: [string|null ×5] }] }` — 405 mục, thứ tự `pinyinInitials`; hàm thuần `selectHanzi(entries: {char, syl, tone}[])` export để test.

- [ ] **Step 1: Write the failing test** (fixture nhỏ, không import vocab thật)

```ts
import { describe, expect, it } from "vitest";
import { selectHanzi } from "../gen-pinyin-hanzi-map";

describe("selectHanzi", () => {
  it("chữ xuất hiện trước (phổ biến hơn) thắng", () => {
    const entries = [
      { char: "罵", syl: "ma", tone: 4 },
      { char: "媽", syl: "ma", tone: 1 },
      { char: "妈", syl: "ma", tone: 1 },
    ];
    expect(selectHanzi(entries, "ma", 1)).toBe("媽"); // first wins
  });
  it("ô chưa có chữ → null", () => {
    expect(selectHanzi([{ char: "媽", syl: "ma", tone: 1 }], "ma", 4)).toBeNull();
  });
});
```

- [ ] **Step 2: Run — FAIL**

- [ ] **Step 3: Implement generator**
  - Parse `src/content/vocab.ts` text: regex `W\("([^"]+)",\s*"([^"]+)"` → (hanzi, pinyin số). Tách pinyin theo whitespace, align từng ký tự CJK của hanzi (bỏ ký tự không CJK + token `.`); mỗi cặp → `parseTone` → entry. **Thứ tự file = thứ tự ưu tiên** (HSK1 trước).
  - Thêm `pinyinExamples`: cặp [hanzi, py có dấu] → `parseTone` (giữa vocab và examples: examples ưu tiên hơn vì đã chọn lọc cho bảng? — KHÔNG: giữ thứ tự vocab trước, examples sau, chỉ fill ô còn trống).
  - `selectHanzi`: map `syl|tone` → char đầu tiên gặp.
  - Ghi JSON 405 ô + in coverage report ra stdout (đếm null per tone; tone-5 được phép null nhiều).
  - Chạy: `pnpm dlx tsx scripts/content/gen-pinyin-hanzi-map.mts`

- [ ] **Step 4: Run test — PASS. Chạy generator, ghi nhận coverage.**

  Controller gate: nếu ô tone 1–4 null > 5 → dừng, báo cáo (dữ liệu thiếu bất thường); tone-5 null nhiều là dự kiến.

- [ ] **Step 5: Commit** `feat(pinyin): generator bảng ánh xạ chữ Hán cho render audio + render-input.json`

### Task 3: Renderer `render-pinyin-audio.py` + spike pinyin-direct

**Files:**
- Create: `scripts/content/render-pinyin-audio.py`
- Create (report output, gitignored): `scripts/content/data/pinyin/render-report.json`

**Interfaces:**
- Consumes: `render-input.json`; KPipeline (`lang_code="z"`, voice `zf_001`); soundfile + ffmpeg cho mp3.
- Produces: `public/audio/pinyin/{base}-{tone}.mp3` (tone 1–5); `render-report.json` `{rendered, skipped, failed: [{syllable, tone, reason}], qa: {durationOk, rmsOk}}`; exit ≠ 0 khi có failed.

- [ ] **Step 1: Spike (ghi kết quả vào report file của task)**
  Chạy venv python inline: `KPipeline(lang_code="z")` với (a) 1 chữ Hán "媽", (b) pinyin có dấu "mā", (c) pinyin không dấu "ma". Ghi lại: có sinh audio không, duration bao nhiêu. Kết luận quyết định fallback cho ô null: nếu (b) nghe đúng tiếng Trung → renderer dùng pinyin-direct cho ô thiếu chữ; nếu không → skip.

- [ ] **Step 2: Implement script**
  - CLI: `--dry-run` (đếm mục sẽ render, không import kokoro), `--only SYL`, `--force`.
  - Loop: chưa có file hoặc `--force` → synth → ghi wav tmp → convert mp3 (ffmpeg `-q:a 4` mono 24k) → QA: duration 0.2–1.5s (ffprobe), RMS > -50 dBFS (soundfile).
  - Cấu trúc bám `render-dialogue-audio.py` (imports nặng trong main, tmp wav, mp3 convert) — đọc file đó trước khi viết.

- [ ] **Step 3: `--dry-run` pass** (2025 mục, số skip khớp JSON). Commit `feat(pinyin): renderer audio tĩnh Kokoro + QA gate`

### Task 4: Chạy render thật + commit mp3 (controller chạy, không subagent)

- [ ] **Step 1:** Chạy background từ worktree: `/Volumes/samsung512/Code/hsk/app-next/scripts/content/.venv-kokoro/bin/python scripts/content/render-pinyin-audio.py` (lần đầu model tải từ HF ~300MB).
- [ ] **Step 2:** Verify `render-report.json`: failed = 0 (hoặc liệt kê rõ). Nghe thử là bước owner — ghi vào báo cáo cuối.
- [ ] **Step 3:** `git add public/audio/pinyin && git commit` `feat(pinyin): 2025 mp3 âm tiết render Kokoro zf_001`. Nếu failed > 0 → sửa render-input.json tay cho ô đó (chọn chữ khác) → `--only` render lại.

### Task 5: `useStaticAudio` + wire vào `SyllableDialog`

**Files:**
- Create: `src/lib/tts/use-static-audio.ts`
- Modify: `src/components/pinyin/table/syllable-dialog.tsx` (đổi handlers, giữ UI)
- Test: `src/lib/tts/__tests__/use-static-audio.test.ts`

**Interfaces:**
- Produces: `useStaticAudio()` → `{ play(url: string, opts?: { rate?: number }): void; stop(): void }` — singleton `Audio` element; `play` mới stop clip cũ; lỗi load/play → gọi `onError` callback (do caller wire sang `useTts.speak`).

- [ ] **Step 1: Failing test** (mock global Audio bằng class FakeAudio ghi lại src/rate/play/pause; assert: play đổi src + gọi play; play lần 2 dừng clip 1; load error → onError được gọi)

- [ ] **Step 2: Implement** (~40 dòng): module-level `let audio: HTMLAudioElement | null`; `preservesPitch = true` khi rate < 1 (set `playbackRate`); listener `error`/`ended` dọn state.

- [ ] **Step 3: Wire dialog** — nút thanh điệu: `playStatic(`/audio/pinyin/${cell.base}-${i+1}.mp3`)`, onError → `speak(form, { rate: 0.95 })` (fallback giữ nguyên hành vi cũ); "Nghe chậm": cùng file hiện tại rate 0.65, fallback tương tự. Unmount → `stop()`.

- [ ] **Step 4: PASS + commit** `feat(pinyin): dialog phát mp3 tĩnh từ CDN, fallback Kokoro`

### Task 6: Gate

- [ ] `pnpm typecheck` · `pnpm lint` (0 error) · `pnpm test` (full suite xanh)

### Task 7: Browser QA A1–A5 (controller, control-browser trên :3100 của worktree)

Chạy 5 case spec §4.3. Dev server khởi từ worktree này (script kill :3100 hiện có — báo trước nếu session khác đang dùng). Pass 100% mới xong.
