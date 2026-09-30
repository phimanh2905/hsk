# SP1 — Media & Documents (G4–G9: Shadowing · Create-file · Certificate-test) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port đúng hành vi `[PORT]` của các feature G4 (thư viện shadowing), G5 (player YouTube postMessage + dictation + MediaRecorder), G6–G8 (create-file catalog 9 mẫu + form 7 nhóm + preview A4 + in/gate FREEHSK), G9 (certificate-test coming-soon) sang Next.js App Router — giữ nguyên bản in A4, gate mock và toàn bộ copy tiếng Việt/trung.

**Architecture:** 5 route SSG dưới route group `(app)`: `/shadowing`, `/shadowing/[videoId]`, `/create-file`, `/create-file/[tpl]`, `/certificate-test`. Data là 2 content module TS build-time (`content/shadowing.ts`, `content/templates.ts`). Toàn bộ tương tác nằm trong client component; 2 vùng imperative được cô lập: `<VideoPlayer>` (YouTube iframe postMessage + polling 500ms, KHÔNG YT SDK, KHÔNG declarative hoá) và `<A4Preview>` (renderer chuỗi HTML port nguyên logic `create-file.js`, gắn qua `dangerouslySetInnerHTML` — không bọc preview bằng state React ngoài `CfState`). State form gom 1 `useReducer` 18 keys, persist `sessionStorage` `nhai.cf.state` qua helper storage duy nhất.

**Tech Stack:** Next.js App Router + TypeScript strict + Tailwind v4, pnpm, Vitest + jsdom + @testing-library/react, Playwright, `@opennextjs/cloudflare`.

**Spec:** `docs/superpowers/specs/fullstack/12-media-documents.md` (mục 2 G4–G9) — hợp đồng canonical `docs/superpowers/specs/fullstack/00-platform-data.md`; SPEC hành vi clone: `clone/specs/SPEC-06-shadowing.md`, `SPEC-19-shadowing-library.md`, `SPEC-08-create-file.md`, `SPEC-16-create-file-catalog.md` (SPEC-13 bỏ), `SPEC-07-reading-certificates.md` (phần certificates).

## Global Constraints

- App ở `app-next/`, pnpm; lệnh chạy từ `app-next/` trừ khi ghi rõ: `pnpm vitest run <path>`, `pnpm playwright test <path>`, `pnpm dev` (port 3000). Mỗi task 1 commit riêng theo message ghi trong step cuối.
- SP1 port đúng mock: gate `FREEHSK` check local `nhai.fileCode` (không server); "Format bằng AI" mock + toast; "Báo lỗi"/"XEM TẤT CẢ" toast; **không** làm trước UPG (entitlement, `/ai/format-vocab`, R2 subtitles).
- Thumbnail shadowing là **placeholder gradient + chữ Hán mờ — KHÔNG request nào tới `i.ytimg.com` hay ảnh YouTube**.
- Player YouTube: chỉ iframe `youtube-nocookie` + `postMessage` JSON `{event, info, args}` + polling 500ms; **KHÔNG** dùng YT IFrame API SDK; playback state giữ trong ref, chỉ 1 slice hiển thị (câu hiện tại) vào React state.
- Preview in: renderer chuỗi HTML thuần trong `lib/create-file/svg-render.ts`, cô lập trong `<A4Preview>` bằng `dangerouslySetInnerHTML`; `@media print` giữ selector semantic `[data-shell]`, `.no-print`, `.print-area` (đã port trong `globals.css` từ theme.css:85-89 — plan learning-core Task 3).
- Copy tiếng Việt/trung giữ **NGUYÊN VĂN** clone (kể cả toast, nhãn form, banner, tiêu đề template).
- Mọi truy cập `localStorage`/`sessionStorage` đi qua helper storage (`lib/create-file/storage.ts`, `lib/shadowing/prefs.ts`) — không gọi trực tiếp rải rác trong component (inventory mục 11).
- Không sửa file thuộc plan khác (`globals.css`, `layout.tsx`, shell, `content/certificates.ts`…). Consume theo Interfaces bên dưới.
- Data mặc định form ĐÚNG bảng gốc clone: Điền tự `dien-tu`, `gray`, `perRow 12`, `fillRows 1`, `blankRows 0`, `faintCount 3/12`, Khải thư `khai`, `CNstrokeorder`, `traceStyle ["faint"]`, `opacity 30`, `fontSize 78`, `showPinyin true`, `showMeaning true`.

---

# Phase 0 — Content data (nền cho mọi route)

### Task 1: Content module `content/shadowing.ts` — 5 playlist × 4 video DEMO + phụ đề

**Files:**
- Create: `app-next/src/content/shadowing.ts` (port từ `clone/js/data/shadowing.js:1-299`)
- Test: `app-next/src/content/__tests__/shadowing.test.ts`

**Interfaces:**
- Consumes: không (data thuần).
- Produces (mọi task sau dùng đúng tên này):
  - `export type ShadowingPlaylist = { id: string; slug: string; name: string; total: number; desc: string; channel: string };`
  - `export type ShadowingVideo = { id: string; title: string; playlistId: string; hsk: string; views: number; viewsSuffix: string; duration: string; durSec: number; plays: number };`
  - `export type SubtitleSentence = { n: number; start: number; end: number; parts: { zh: string }[]; pinyin: string; vi: string };`
  - `export const shadowingPlaylists: ShadowingPlaylist[];` — 5 playlist slug `daihuaxiyou|long-baba|so-cap|an-kha-hy|simple-days` (dùng làm id playlist gắn video).
  - `export const shadowingVideos: ShadowingVideo[];` — đúng 20 video (5 playlist × 4 card), `playlistId` = slug playlist. Tiêu đề song ngữ SPEC-19 thay tiêu đề SPEC-06 cho 6 id trùng (`EA3rwvr99Q0, sXo-yHFkAio, NkYwdZhkHF0, FuIOkW6eaRA, J0P6fPl6cho, FxpyzLt3wRQ`).
  - `export const shadowingSubtitles: Record<string, SubtitleSentence[]>;` — port nguyên 4 track (`EA3rwvr99Q0` đủ 9 câu, `sXo-yHFkAio`, `H3aRI3ypx_0`, `DQBzSl3OM1I` 6 câu mỗi track).
  - `export function shadowingVideoById(id: string): ShadowingVideo | null;`
  - `export function relatedVideos(videoId: string, limit?: number): ShadowingVideo[];` — 4 card cùng playlist, loại chính nó.

- [ ] **Step 1: Write the failing test**

Tạo `app-next/src/content/__tests__/shadowing.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  shadowingPlaylists, shadowingVideos, shadowingSubtitles,
  shadowingVideoById, relatedVideos,
} from "../shadowing";

describe("shadowing content (SPEC-06 bộ DEMO + SPEC-19 tiêu đề song ngữ)", () => {
  it("đủ 5 playlist, slug + tổng số theo SPEC-06", () => {
    expect(shadowingPlaylists.map((p) => p.slug)).toEqual([
      "daihuaxiyou", "long-baba", "so-cap", "an-kha-hy", "simple-days",
    ]);
    expect(shadowingPlaylists[0]).toMatchObject({ total: 84, channel: "DaihuaXiyou Official" });
    expect(shadowingPlaylists[3].name).toBe("Tiếng Trung Sơ Cấp · An Khả Hy");
  });
  it("đúng 20 video, mỗi playlist 4 card, id YouTube thật từ data clone", () => {
    expect(shadowingVideos).toHaveLength(20);
    for (const p of shadowingPlaylists) {
      expect(shadowingVideos.filter((v) => v.playlistId === p.slug)).toHaveLength(4);
    }
    expect(shadowingVideoById("EA3rwvr99Q0")).toMatchObject({
      title: "墓碑上的QR碼，別掃。QR code on the tombstone, don't scan. #daihuaxiyou #呆話西遊",
      hsk: "HSK3", views: 397, duration: "2:46",
    });
    expect(shadowingVideoById("daihua-x4")).toBeNull(); // pseudo-id SPEC-19 không đưa vào bộ DEMO
  });
  it("phụ đề EA3rwvr99Q0 đủ 9 câu theo SPEC-06 (start/end 0→165)", () => {
    const s = shadowingSubtitles["EA3rwvr99Q0"];
    expect(s).toHaveLength(9);
    expect(s[0]).toMatchObject({ n: 1, start: 0, end: 18, pinyin: "Á! Wǒ cái líkāi jǐ tiān! Nǐmen zěnme jiù dōu méi le ya! Méi nǐmen wǒ kě zěnme wǒ a!" });
    expect(s[8].end).toBe(165);
    expect(s[8].vi).toBe("Mình đã bảo cậu bao nhiêu lần rồi? Đừng có quét mã QR bừa bãi! Đừng quét mã QR bừa bãi!");
  });
  it("relatedVideos trả tối đa 4 video cùng playlist, loại chính nó", () => {
    const rel = relatedVideos("EA3rwvr99Q0");
    expect(rel).toHaveLength(3); // playlist daihuaxiyou chỉ còn 3 video khác
    expect(rel.some((v) => v.id === "EA3rwvr99Q0")).toBe(false);
    expect(relatedVideos("sXo-yHFkAio", 4)[0].playlistId).toBe("daihuaxiyou");
  });
});
```

- [ ] **Step 2: Run test verify fail**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/content/__tests__/shadowing.test.ts`
Expected: FAIL — `Cannot find module '../shadowing'`

- [ ] **Step 3: Implement content module**

Tạo `app-next/src/content/shadowing.ts` — port từng mảng từ `clone/js/data/shadowing.js`:
- Copy nguyên 5 mảng `cat1…cat5` (dòng 7–36) thành `ShadowingVideo[]`, thêm `playlistId` theo thứ tự `daihuaxiyou, long-baba, so-cap, an-kha-hy, simple-days`; nối thành `shadowingVideos`.
- Với 6 id trùng SPEC-19, thay `title` bằng tiêu đề song ngữ SPEC-19 §D (ví dụ `EA3rwvr99Q0` → `"墓碑上的QR碼，別掃。QR code on the tombstone, don't scan. #daihuaxiyou #呆話西遊"`; `sXo-yHFkAio` → `"就這智商，還佔便宜？With that IQ, Still trying take advantage? #呆話西遊"`; `NkYwdZhkHF0` → `"又要漲工資？！#呆話西遊 #daihuaxiyou #搞笑"`; `FuIOkW6eaRA` → `"Why does he always drive me crazy?! 😡😂 #daihoo #plush #animation #dubbing"`; `J0P6fPl6cho` → `"【我的爸爸是條龍】原來和老婆一起洗澡是這麽刺激的事情… #恩愛 #夫妻"`; `FxpyzLt3wRQ` → `"【我的爸爸是條龍】孩子：爸媽總在我面前秀恩愛？！Being PDA in front of our SON…"`). `views` giữ số SPEC-06 (397/75/29/11/44/12).
- Copy nguyên object `subtitles` (dòng 84–258) giữ từng câu {n, start, end, parts, pinyin, vi} — KHÔNG dịch lại, KHÔNG rút gọn.
- Cuối file:

```ts
export function shadowingVideoById(id: string): ShadowingVideo | null {
  return shadowingVideos.find((v) => v.id === id) ?? null;
}
export function relatedVideos(videoId: string, limit = 4): ShadowingVideo[] {
  const cur = shadowingVideoById(videoId);
  if (!cur) return [];
  return shadowingVideos.filter((v) => v.playlistId === cur.playlistId && v.id !== videoId).slice(0, limit);
}
```

- [ ] **Step 4: Run test verify pass**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/content/__tests__/shadowing.test.ts`
Expected: PASS 4 tests.

- [ ] **Step 5: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src/content/shadowing.ts app-next/src/content/__tests__/shadowing.test.ts
git commit -m "feat(sp1-media): content/shadowing.ts — 5 playlist x 4 video DEMO + subtitles (SPEC-06/19)"
```

### Task 2: Content module `content/templates.ts` — 9 mẫu in / 3 nhóm + thumb SVG

**Files:**
- Create: `app-next/src/content/templates.ts` (port từ `clone/js/data/templates.js:1-151`)
- Test: `app-next/src/content/__tests__/templates.test.ts`

**Interfaces:**
- Consumes: không.
- Produces:
  - `export type TemplateGroup = "hanzi" | "vocab" | "paper";`
  - `export type FileTemplate = { id: string; name: string; group: TemplateGroup; desc: string; thumb: string };` — `thumb` là chuỗi SVG inline 48×48 (port nguyên `templates.js`, KHÔNG đổi id: `stroke-order, big-char, vocab, vocab-check, pinyin-write, paragraph, lined-paper, grid-paper, cover` — id data gốc; SPEC-16 gọi `paragraph`=Chép đoạn văn, `lined-paper`=Bài văn dòng kẻ có pinyin, `grid-paper`=Giấy ô trống).
  - `export const fileTemplates: FileTemplate[];` — đúng 9, thứ tự theo `templates.js`.
  - `export const templateGroups: { id: TemplateGroup; label: string }[];` — `[{id:"hanzi",label:"Mẫu chữ Hán"},{id:"vocab",label:"Mẫu từ vựng"},{id:"paper",label:"Đoạn văn & giấy ô"}]`.
  - `export function templateById(id: string): FileTemplate | null;`

- [ ] **Step 1: Write the failing test**

Tạo `app-next/src/content/__tests__/templates.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { fileTemplates, templateGroups, templateById } from "../templates";

describe("fileTemplates (SPEC-16 §A: 9 mẫu / 3 nhóm)", () => {
  it("đủ 9 template với id data gốc, đúng nhóm", () => {
    expect(fileTemplates.map((t) => t.id)).toEqual([
      "stroke-order", "big-char", "vocab", "vocab-check",
      "pinyin-write", "paragraph", "lined-paper", "grid-paper", "cover",
    ]);
    expect(fileTemplates.filter((t) => t.group === "hanzi")).toHaveLength(2);
    expect(fileTemplates.filter((t) => t.group === "vocab")).toHaveLength(3);
    expect(fileTemplates.filter((t) => t.group === "paper")).toHaveLength(4);
  });
  it("mỗi template có thumb SVG inline (không ảnh ngoài) + tên/mô tả giữ nguyên văn", () => {
    for (const t of fileTemplates) {
      expect(t.thumb).toMatch(/^<svg/);
      expect(t.thumb).not.toMatch(/<image|http/);
    }
    expect(templateById("stroke-order")).toMatchObject({
      name: "Luyện viết theo thứ tự nét",
      desc: "Mỗi chữ: ô mẫu đánh số nét → từng bước thêm nét (nét mới tô đỏ) → hàng chữ mờ để tô.",
    });
    expect(templateById("grid-paper")?.name).toBe("Giấy ô trống");
    expect(templateById("nope")).toBeNull();
  });
  it("3 nhóm đúng nhãn SPEC-16", () => {
    expect(templateGroups.map((g) => g.label)).toEqual(["Mẫu chữ Hán", "Mẫu từ vựng", "Đoạn văn & giấy ô"]);
  });
});
```

- [ ] **Step 2: Run test verify fail**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/content/__tests__/templates.test.ts`
Expected: FAIL — `Cannot find module '../templates'`

- [ ] **Step 3: Implement content module**

Tạo `app-next/src/content/templates.ts` — copy nguyên hằng `G/R/K/F`, helper `cells()/strokes()`, chuỗi `YONG` và 9 object `thumb` từ `clone/js/data/templates.js:8-150`, chỉ bọc TS:

```ts
export type TemplateGroup = "hanzi" | "vocab" | "paper";
export type FileTemplate = { id: string; name: string; group: TemplateGroup; desc: string; thumb: string };
const G = "#cfc4ae"; const R = "#c23b22"; const K = "#17150f"; const F = "#b9b0a0";
const YONG = "26,4 24,9 29,11|12,15 38,15 29,35 31,38|14,22 20,22 15,29|27,23 18,37|28,26 40,38";
function cells(x0: number, y0: number, w: number, h: number, cols: number, rows: number): string { /* port templates.js:16-21, giữ nguyên công thức */ }
function strokes(pts: string, color?: string): string { /* port templates.js:22-26 */ }
export const fileTemplates: FileTemplate[] = [ /* 9 object copy từ templates.js:28-150, giữ desc/thumb verbatim */ ];
export const templateGroups: { id: TemplateGroup; label: string }[] = [
  { id: "hanzi", label: "Mẫu chữ Hán" },
  { id: "vocab", label: "Mẫu từ vựng" },
  { id: "paper", label: "Đoạn văn & giấy ô" },
];
export function templateById(id: string): FileTemplate | null {
  return fileTemplates.find((t) => t.id === id) ?? null;
}
```

(`cells`/`strokes` ghi đầy đủ thân hàm copy từ file gốc — không placeholder.)

- [ ] **Step 4: Run test verify pass**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/content/__tests__/templates.test.ts`
Expected: PASS 3 tests.

- [ ] **Step 5: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src/content/templates.ts app-next/src/content/__tests__/templates.test.ts
git commit -m "feat(sp1-media): content/templates.ts — 9 mẫu in / 3 nhóm + thumb SVG (SPEC-16)"
```

---

# Phase 1 — Shadowing (G4 + G5)

### Task 3: Lib shadowing — `prefs.ts` (storage) + `dictation.ts` (chuẩn hoá + chấm)

**Files:**
- Create: `app-next/src/lib/shadowing/prefs.ts`
- Create: `app-next/src/lib/shadowing/dictation.ts`
- Test: `app-next/src/lib/shadowing/__tests__/dictation.test.ts`, `app-next/src/lib/shadowing/__tests__/prefs.test.ts`

**Interfaces:**
- Consumes: `stripTones(s: string): string` từ `@/lib/pinyin-utils` (plan learning-core Task 5).
- Produces:
  - `export type ShadowFont = "sm" | "base" | "lg";`
  - `export function getShadowFont(): ShadowFont;` / `export function setShadowFont(f: ShadowFont): void;` — key `nhai.shadow.font`, mặc định `"lg"`.
  - `export function getAutoscroll(): boolean;` / `export function setAutoscroll(on: boolean): void;` — key `nhai.shadow.autoscroll`, mặc định `true` (`!== "0"`).
  - `export function getVoicePref(): "female" | "male";` — key `nhai.voice`, mặc định `female` (chỉ đọc; settings modal của shell là bên ghi).
  - `export function normDict(s: string): string;` — port `normDict` clone (`shadowing-video.js:390-392`): `stripTones(s)` rồi bỏ mọi ký tự whitespace + dấu câu Trung/Việt/Anh `[\s,.!?，。！？、：;；:'"'’‘·()（）\-—…]`.
  - `export function gradeDictation(targetZh: string, input: string): { correct: boolean; empty: boolean; marks: boolean[]; renderInput: string };` — `marks[i]` = ký tự chuẩn hoá thứ i của input khớp target; `renderInput` = chuỗi input gốc với marker `|` (mô tả bên dưới) để panel tô đỏ — trả về qua `marks` + helper `splitByNorm` bên dưới thay vì chuỗi marker:
  - `export function diffNormalized(src: string, want: string): { char: string; ok: boolean | null }[];` — port vòng lặp tô đỏ `shadowing-video.js:406-417`: duyệt từng ký tự src gốc; ký tự bị chuẩn hoá thành rỗng → `ok: null` (giữ nguyên); ngược lại `ok` = marks vị trí tương ứng.

- [ ] **Step 1: Write the failing test**

Tạo `app-next/src/lib/shadowing/__tests__/dictation.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { normDict, diffNormalized } from "../dictation";

describe("normDict (chuẩn hoá bỏ dấu cách + dấu thanh)", () => {
  it("bỏ dấu thanh pinyin + khoảng trắng", () => {
    expect(normDict("nǐ hǎo")).toBe("nihao");
    expect(normDict("Wǒ shì qiè nǚ yōuhún.")).toBe("woshiqienvyouhun");
  });
  it("bỏ dấu câu Trung/Anh và ký tự trang trí", () => {
    expect(normDict("退! 退! 退!")).toBe("退退退");
    expect(normDict("师傅, 十万元。")).toBe("师傅十万元");
    expect(normDict("电子遗言? 这么高级啊?")).toBe("电子遗言这么高级啊");
  });
});

describe("diffNormalized (highlight chữ sai)", () => {
  it("đúng hết → mọi ký tự ok", () => {
    const r = diffNormalized("退! 退!", "退 退");
    expect(r.filter((x) => x.ok === false)).toHaveLength(0);
  });
  it("ký tự sai → ok=false, ký tự bị strip → ok=null", () => {
    const r = diffNormalized("师傅, 十万块。", "师傅, 十万元。"); // 块 sai, 元 đúng
    const wrong = r.filter((x) => x.ok === false).map((x) => x.char);
    expect(wrong).toEqual(["块"]);
    expect(r.find((x) => x.char === ",")?.ok).toBeNull();
  });
});
```

Tạo `app-next/src/lib/shadowing/__tests__/prefs.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { getShadowFont, setShadowFont, getAutoscroll, setAutoscroll } from "../prefs";

beforeEach(() => localStorage.clear());

it("font mặc định lg, lưu + đọc lại", () => {
  expect(getShadowFont()).toBe("lg");
  setShadowFont("sm");
  expect(getShadowFont()).toBe("sm");
  expect(localStorage.getItem("nhai.shadow.font")).toBe("sm");
});
it("autoscroll mặc định true, '0' tắt", () => {
  expect(getAutoscroll()).toBe(true);
  setAutoscroll(false);
  expect(getAutoscroll()).toBe(false);
  localStorage.setItem("nhai.shadow.autoscroll", "1");
  expect(getAutoscroll()).toBe(true);
});
```

- [ ] **Step 2: Run test verify fail**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/lib/shadowing`
Expected: FAIL — `Cannot find module '../dictation'` / `'../prefs'`

- [ ] **Step 3: Implement prefs.ts + dictation.ts**

`app-next/src/lib/shadowing/prefs.ts`:

```ts
export type ShadowFont = "sm" | "base" | "lg";
function lsGet(k: string): string | null { try { return localStorage.getItem(k); } catch { return null; } }
function lsSet(k: string, v: string): void { try { localStorage.setItem(k, v); } catch { /* silent */ } }
export function getShadowFont(): ShadowFont {
  const f = lsGet("nhai.shadow.font");
  return f === "sm" ? "sm" : f === "base" ? "base" : "lg";
}
export function setShadowFont(f: ShadowFont): void { lsSet("nhai.shadow.font", f); }
export function getAutoscroll(): boolean { return lsGet("nhai.shadow.autoscroll") !== "0"; }
export function setAutoscroll(on: boolean): void { lsSet("nhai.shadow.autoscroll", on ? "1" : "0"); }
export function getVoicePref(): "female" | "male" { return lsGet("nhai.voice") === "male" ? "male" : "female"; }
```

`app-next/src/lib/shadowing/dictation.ts`:

```ts
import { stripTones } from "@/lib/pinyin-utils";

const STRIP_RE = /[\s,.!?，。！？、：;；:'"“”’‘·()（）\-—…]/g;
export function normDict(s: string): string {
  return stripTones(s).replace(STRIP_RE, "");
}
export function diffNormalized(src: string, want: string): { char: string; ok: boolean | null }[] {
  const wantNorm = normDict(want);
  const marks: boolean[] = [];
  for (let i = 0; i < Math.max(wantNorm.length, normDict(src).length); i++) marks.push(normDict(src)[i] === wantNorm[i]);
  const out: { char: string; ok: boolean | null }[] = [];
  let oi = 0;
  for (const ch of Array.from(src.trim())) {
    const nch = normDict(ch);
    if (nch === "") { out.push({ char: ch, ok: null }); continue; }
    out.push({ char: ch, ok: marks[oi] !== false });
    oi += nch.length;
  }
  return out;
}
```

- [ ] **Step 4: Run test verify pass**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/lib/shadowing`
Expected: PASS toàn bộ (3 file test, 5 it).

- [ ] **Step 5: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src/lib/shadowing
git commit -m "feat(sp1-media): shadowing prefs storage + dictation normalizer (port shadowing-video.js)"
```

### Task 4: Thư viện `/shadowing` (G4) — server SSG + filter `?cat=` client + VideoCard

**Files:**
- Create: `app-next/src/app/(app)/shadowing/page.tsx`
- Create: `app-next/src/components/shadowing/library-client.tsx`
- Create: `app-next/src/components/shadowing/video-card.tsx`
- Test: `app-next/src/components/shadowing/__tests__/library-client.test.tsx`

**Interfaces:**
- Consumes: `shadowingPlaylists`, `shadowingVideos` (`@/content/shadowing` — Task 1); `useToast(): (msg: string) => void` từ `@/components/shell/toast-provider` (plan learning-core Task 10); route group `(app)` có sẵn layout `max-w-5xl`.
- Produces:
  - `export default function VideoCard({ video, gradIndex }: { video: ShadowingVideo; gradIndex: number }): JSX.Element;` — Link tới `/shadowing/${video.id}`, thumbnail gradient `GRADS[gradIndex % 5]` + chữ Hán mờ (`posterChar(title)` — ký tự CJK đầu sau khi bỏ `【「`, fallback `片`), 3 badge dọc góc phải (▶ views, HSK pill đỏ `#dc2626`, `YouTube` pill đen mờ), thời lượng góc dưới phải nền đen, `h3 line-clamp-2`, tên playlist nhỏ xám, pill "Shadowing". Export thêm `const GRADS: string[]` (5 gradient port `shadowing.js:9-15`) và `export function posterChar(title: string): string;`
  - `export default function LibraryClient({ playlists, videos }: { playlists: ShadowingPlaylist[]; videos: ShadowingVideo[] }): JSX.Element;` — client, `useSearchParams()` đọc `cat`, chỉ render playlist khớp + breadcrumb `← Tất cả nhóm` (Link `/shadowing`); "XEM TẤT CẢ →" `href="#"` `onClick` preventDefault + `toast("Sẽ có sớm")`.
  - Route `/shadowing` SSG: `export const metadata = { title: "Shadowing | Nhai HSK", description: "Chọn video để luyện nghe, bắt chước phát âm hoặc viết chính tả." };` — H1 "Shadowing & Chép chính tả".

- [ ] **Step 1: Write the failing test**

Tạo `app-next/src/components/shadowing/__tests__/library-client.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LibraryClient from "../library-client";
import { shadowingPlaylists, shadowingVideos } from "@/content/shadowing";

vi.mock("@/components/shell/toast-provider", () => ({
  useToast: () => (msg: string) => { (window as unknown as { __lastToast?: string }).__lastToast = msg; },
}));

function renderAt(cat?: string) {
  //_next/navigation useSearchParams — mock theo ?cat
  const mod = vi.requireMock("next/navigation");
  mod.useSearchParams = () => new URLSearchParams(cat ? { cat } : "");
  return render(<LibraryClient playlists={shadowingPlaylists} videos={shadowingVideos} />);
}

describe("LibraryClient (G4)", () => {
  it("mặc định render 5 section playlist, mỗi section 4 card + XEM TẤT CẢ", () => {
    renderAt();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(5);
    expect(screen.getAllByText("XEM TẤT CẢ →")).toHaveLength(5);
    expect(screen.getAllByRole("link", { name: /Shadowing/ }).length).toBeGreaterThanOrEqual(20);
  });
  it("?cat=so-cap chỉ còn 1 nhóm + breadcrumb quay lại", () => {
    renderAt("so-cap");
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "← Tất cả nhóm" })).toHaveAttribute("href", "/shadowing");
  });
  it("XEM TẤT CẢ bấm ra toast 'Sẽ có sớm', không điều hướng", async () => {
    const user = userEvent.setup();
    renderAt();
    await user.click(screen.getAllByText("XEM TẤT CẢ →")[0]);
    expect((window as unknown as { __lastToast?: string }).__lastToast).toBe("Sẽ có sớm");
  });
});
```

- [ ] **Step 2: Run test verify fail**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/components/shadowing/__tests__/library-client.test.tsx`
Expected: FAIL — `Cannot find module '../library-client'`

- [ ] **Step 3: Implement VideoCard + LibraryClient**

`app-next/src/components/shadowing/video-card.tsx`:

```tsx
import Link from "next/link";
import type { ShadowingVideo } from "@/content/shadowing";

export const GRADS = [
  "linear-gradient(135deg,#c23b22,#6b1d10)",
  "linear-gradient(135deg,#2563eb,#1e3a8a)",
  "linear-gradient(135deg,#0d9488,#134e4a)",
  "linear-gradient(135deg,#b45309,#78350f)",
  "linear-gradient(135deg,#7c3aed,#4c1d95)",
];
export function posterChar(title: string): string {
  const m = title.replace(/[【「]/g, "").match(/[\u4e00-\u9fff]/);
  return m ? m[0] : "片";
}
export default function VideoCard({ video, gradIndex }: { video: ShadowingVideo; gradIndex: number }) {
  const views = video.views + (video.viewsSuffix || "");
  return (
    <Link href={`/shadowing/${video.id}`} className="card shadow-neo block overflow-hidden hover:-translate-y-0.5 transition-transform">
      <div className="relative w-full aspect-video flex items-center justify-center" style={{ background: GRADS[gradIndex % GRADS.length] }}>
        <span className="zh text-6xl font-extrabold text-white/20 select-none">{posterChar(video.title)}</span>
        <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
          <span className="bg-black/60 text-white text-[11px] font-bold px-1.5 py-0.5 rounded">▶ {views}</span>
          <span className="text-[11px] font-bold px-1.5 py-0.5 rounded text-white" style={{ background: "#dc2626" }}>{video.hsk}</span>
          <span className="bg-black/60 text-white/90 text-[11px] font-bold px-1.5 py-0.5 rounded">YouTube</span>
        </div>
        <span className="absolute right-2 bottom-2 bg-black/70 text-white text-xs font-bold px-1.5 py-0.5 rounded">{video.duration}</span>
      </div>
      <div className="p-3">
        <h3 className="font-bold leading-snug line-clamp-2">{video.title}</h3>
        <span className="pill text-[11px] font-bold mt-2 inline-block">Shadowing</span>
      </div>
    </Link>
  );
}
```

`app-next/src/components/shadowing/library-client.tsx`:

```tsx
"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/components/shell/toast-provider";
import type { ShadowingPlaylist, ShadowingVideo } from "@/content/shadowing";
import VideoCard from "./video-card";

export default function LibraryClient({ playlists, videos }: { playlists: ShadowingPlaylist[]; videos: ShadowingVideo[] }) {
  const toast = useToast();
  const cat = useSearchParams().get("cat");
  const shown = cat ? playlists.filter((p) => p.slug === cat) : playlists;
  return (
    <div>
      {cat && (
        <div className="mb-4">
          <Link href="/shadowing" className="text-sm font-semibold text-nhai-muted hover:text-nhai-main">← Tất cả nhóm</Link>
        </div>
      )}
      {shown.map((pl) => {
        const vids = videos.filter((v) => v.playlistId === pl.slug);
        return (
          <section className="mb-10" key={pl.slug}>
            <h2 className="text-xl md:text-2xl font-extrabold">
              {pl.name} <span className="text-nhai-muted font-bold text-base">({pl.total} bài học)</span>
            </h2>
            <p className="text-sm text-nhai-muted mt-0.5">{pl.desc}</p>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); toast("Sẽ có sớm"); }}
              className="inline-block mt-1 text-xs font-extrabold tracking-wide text-nhai-main hover:underline"
            >XEM TẤT CẢ →</a>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
              {vids.map((v, i) => <VideoCard key={v.id} video={v} gradIndex={pl.slug === "daihuaxiyou" ? i : i + 2} />)}
            </div>
          </section>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run test verify pass**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/components/shadowing/__tests__/library-client.test.tsx`
Expected: PASS 3 tests.

- [ ] **Step 5: Implement route `/shadowing` (SSG)**

Tạo `app-next/src/app/(app)/shadowing/page.tsx`:

```tsx
import type { Metadata } from "next";
import { Suspense } from "react";
import { shadowingPlaylists, shadowingVideos } from "@/content/shadowing";
import LibraryClient from "@/components/shadowing/library-client";

export const metadata: Metadata = {
  title: "Shadowing | Nhai HSK",
  description: "Chọn video để luyện nghe, bắt chước phát âm hoặc viết chính tả.",
};

export default function ShadowingPage() {
  return (
    <main>
      <h1 className="text-3xl font-extrabold">Shadowing &amp; Chép chính tả</h1>
      <p className="text-nhai-muted mt-1">Chọn video để luyện nghe, bắt chước phát âm hoặc viết chính tả.</p>
      <Suspense fallback={null}>
        <LibraryClient playlists={shadowingPlaylists} videos={shadowingVideos} />
      </Suspense>
    </main>
  );
}
```

- [ ] **Step 6: Verify prerender tĩnh (acceptance G4.5) + commit**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm build && grep -c "XEM TẤT CẢ" .next/server/app/(app)/shadowing.html*`
Expected: build xanh; grep ≥ 5 (HTML prerender có sẵn nội dung).
Commit:

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src/app/\(app\)/shadowing app-next/src/components/shadowing
git commit -m "feat(sp1-media): /shadowing library SSG — 5 playlists, gradient cards, ?cat filter (G4)"
```

### Task 5: `<VideoPlayer>` — engine imperative YouTube postMessage + TTS fallback + transcript

**Files:**
- Create: `app-next/src/components/shadowing/video-player.tsx`
- Test: `app-next/src/components/shadowing/__tests__/video-player.test.tsx`

**Interfaces:**
- Consumes: `useTts(): { speak: (text: string, opts?: { lang?: "zh-CN" | "vi-VN"; rate?: number; onEnd?: () => void }) => void; cancel: () => void; speaking: boolean }` từ `@/lib/tts/use-tts` (plan learning-core Task 5); `getShadowFont/setShadowFont/getAutoscroll/setAutoscroll/getVoicePref` từ `@/lib/shadowing/prefs` (Task 3); types `ShadowingVideo`, `SubtitleSentence` từ `@/content/shadowing`; `useToast` từ `@/components/shell/toast-provider`.
- Produces:
  - `export default function VideoPlayer({ video, subtitles }: { video: ShadowingVideo; subtitles: SubtitleSentence[] }): JSX.Element;` — 1 client component duy nhất chứa TOÀN BỘ logic imperative: iframe ref `https://www.youtube-nocookie.com/embed/${embedId}?enablejsapi=1&rel=0&playsinline=1`, `ytSend/ytCmd` postMessage JSON tới origin `https://www.youtube-nocookie.com`, `window.addEventListener("message")` origin regex `/^https:\/\/(www\.)?(youtube-nocookie|youtube)\.com$/`, `setInterval` 500ms gọi `ytCmd("getCurrentTime")` + `tick(t)` port `shadowing-video.js:87-107`, fallback TTS sau 4000ms nếu chưa `ytReady`, overlay "Video YouTube — cần kết nối mạng" + banner "Dùng TTS đọc câu". Command map: `playVideo/pauseVideo/seekTo [start,true]/setPlaybackRate [rate]`.
  - `export function findSentenceIndex(subs: SubtitleSentence[], t: number): number;` — pure, port logic chọn câu trong `tick` (t ngoài range → câu cuối nếu t ≥ end cuối, ngược lại câu 0) — export riêng để unit test.
  - Playback state giữ trong `useRef` (`stateRef` mirror clone `state`), chỉ slice hiển thị vào React state: `cur` (câu hiện tại), `playing`, `tts`, `mode`, `showPy/showVi/transcriptHidden`, `rate`.

- [ ] **Step 1: Write the failing test**

Tạo `app-next/src/components/shadowing/__tests__/video-player.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import VideoPlayer, { findSentenceIndex } from "../video-player";
import { shadowingVideoById, shadowingSubtitles } from "@/content/shadowing";

vi.mock("@/components/shell/toast-provider", () => ({
  useToast: () => (msg: string) => { (window as unknown as { __lastToast?: string }).__lastToast = msg; },
}));
vi.mock("@/lib/tts/use-tts", () => ({
  useTts: () => ({ speak: (t: string) => { (window as unknown as { __lastSpeak?: string }).__lastSpeak = t; }, cancel: () => {}, speaking: false }),
}));

const video = shadowingVideoById("EA3rwvr99Q0")!;
const subs = shadowingSubtitles["EA3rwvr99Q0"];

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe("findSentenceIndex (port tick của clone)", () => {
  it("t trong [start,end) → đúng câu; t≥end cuối → câu cuối; t giữa 2 câu → câu sau", () => {
    expect(findSentenceIndex(subs, 5)).toBe(0);
    expect(findSentenceIndex(subs, 18)).toBe(1);
    expect(findSentenceIndex(subs, 200)).toBe(8);
  });
});

describe("VideoPlayer — render + transcript + fallback TTS 4s", () => {
  it("render iframe nocookie + tiêu đề + 9 câu đánh số", () => {
    render(<VideoPlayer video={video} subtitles={subs} />);
    const frame = screen.getByTitle(/YouTube/) as HTMLIFrameElement;
    expect(frame.src).toContain("https://www.youtube-nocookie.com/embed/EA3rwvr99Q0?enablejsapi=1");
    expect(screen.getAllByText(/^#\d+$/)).toHaveLength(9);
  });
  it("4s không ytReady → overlay + banner TTS + speak câu hiện tại", () => {
    render(<VideoPlayer video={video} subtitles={subs} />);
    act(() => { vi.advanceTimersByTime(4100); });
    expect(screen.getByTestId("video-overlay")).not.toHaveClass("hidden");
    expect(screen.getByText(/Dùng TTS đọc câu/)).toBeTruthy();
    expect((window as unknown as { __lastSpeak?: string }).__lastSpeak).toContain("我才离开几天");
  });
  it("bấm câu #3 → cur=2 (slice hiển thị 'Câu 3/9'), nút ⏮/⏭ đổi cur", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<VideoPlayer video={video} subtitles={subs} />);
    await user.click(screen.getAllByText(/^#3$/)[0]);
    await waitFor(() => expect(screen.getByTestId("pos")).toHaveTextContent("Câu 3/9"));
    await user.click(screen.getByText("⏭ Câu sau"));
    expect(screen.getByTestId("pos")).toHaveTextContent("Câu 4/9");
    await user.click(screen.getByText("⏮ Câu trước"));
    await user.click(screen.getByText("⏮ Câu trước"));
    expect(screen.getByTestId("pos")).toHaveTextContent("Câu 2/9");
  });
  it("postMessage gửi command seekTo đúng start câu khi bấm câu", async () => {
    const sent: string[] = [];
    render(<VideoPlayer video={video} subtitles={subs} postSink={(m) => sent.push(m)} />);
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await user.click(screen.getAllByText(/^#5$/)[0]);
    expect(sent.some((m) => m.includes('"seekTo"') && m.includes("[56,true]"))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test verify fail**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/components/shadowing/__tests__/video-player.test.tsx`
Expected: FAIL — `Cannot find module '../video-player'`

- [ ] **Step 3: Implement VideoPlayer (engine imperative + transcript + điều khiển câu)**

Tạo `app-next/src/components/shadowing/video-player.tsx`. Cấu trúc bắt buộc (port `clone/js/shadowing-video.js`, giữ nguyên tên hàm nội bộ):

```tsx
"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { useTts } from "@/lib/tts/use-tts";
import { useToast } from "@/components/shell/toast-provider";
import { getShadowFont, setShadowFont, getAutoscroll, setAutoscroll, getVoicePref, type ShadowFont } from "@/lib/shadowing/prefs";
import type { ShadowingVideo, SubtitleSentence } from "@/content/shadowing";

const YT_ORIGIN = "https://www.youtube-nocookie.com";
export function findSentenceIndex(subs: SubtitleSentence[], t: number): number {
  for (let i = 0; i < subs.length; i++) if (t >= subs[i].start && t < subs[i].end) return i;
  return t >= subs[subs.length - 1].end ? subs.length - 1 : 0;
}

type Props = { video: ShadowingVideo; subtitles: SubtitleSentence[]; postSink?: (msg: string) => void };
export default function VideoPlayer({ video, subtitles: subs, postSink }: Props) {
  const { speak, cancel: ttsCancel } = useTts();
  const toast = useToast();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  // stateRef = mirror của clone state — KHÔNG đưa playback vào React state
  const st = useRef({ mode: "shadow" as "shadow" | "dictation", cur: 0, playing: false, rate: 1, tts: false, ytReady: false, lastTime: 0, autoScroll: true, transcriptHidden: false });
  // slice hiển thị:
  const [cur, setCur] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [tts, setTts] = useState(false);
  const [showPy, setShowPy] = useState(false);
  const [showVi, setShowVi] = useState(false);
  const [transcriptHidden, setTranscriptHidden] = useState(false);
  const [rate, setRate] = useState(1);
  const [videoHidden, setVideoHidden] = useState(false);
  const [font, setFont] = useState<ShadowFont>("lg");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  // props phụ test (postSink) — prod undefined
  const sinkRef = useRef(postSink);

  function ytSend(obj: Record<string, unknown>) {
    sinkRef.current?.(JSON.stringify(obj));
    if (st.current.tts || !iframeRef.current?.contentWindow) return;
    try { iframeRef.current.contentWindow.postMessage(JSON.stringify(obj), YT_ORIGIN); } catch { /* silent */ }
  }
  const ytCmd = (func: string, args: unknown[] = []) => ytSend({ event: "command", func, args });

  // begin handshake khi iframe load + listener message (port shadowing-video.js:58-84)
  useEffect(() => {
    st.current.autoScroll = getAutoscroll();
    setFont(getShadowFont());
    const onMsg = (e: MessageEvent) => {
      if (!/^https:\/\/(www\.)?(youtube-nocookie|youtube)\.com$/.test(e.origin)) return;
      let data: Record<string, unknown>;
      try { data = typeof e.data === "string" ? JSON.parse(e.data) : e.data; } catch { return; }
      if (!data || typeof data !== "object") return;
      if (data.event === "onReady" || (data.infoDelivery as { playerData?: unknown } | undefined)?.playerData) markYtReady();
      const pd = (data.infoDelivery as { playerData?: { currentTime?: number; playerState?: number } } | undefined)?.playerData;
      if (pd && typeof pd.currentTime === "number") st.current.lastTime = pd.currentTime;
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function markYtReady() {
    if (st.current.ytReady) return;
    st.current.ytReady = true;
    ytCmd("setPlaybackRate", [st.current.rate]);
  }

  // polling 500ms — port shadowing-video.js:87-107
  useEffect(() => {
    const id = setInterval(() => {
      if (st.current.tts || !st.current.ytReady) return;
      ytCmd("getCurrentTime");
      const idx = findSentenceIndex(subs, st.current.lastTime);
      if (idx !== st.current.cur) { st.current.cur = idx; setCur(idx); return; }
      const autoSplit = (document.getElementById("auto-split") as HTMLInputElement | null)?.checked;
      if (st.current.playing && autoSplit && st.current.lastTime >= subs[st.current.cur].end - 0.15) pause();
    }, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subs]);

  // fallback TTS 4s — port shadowing-video.js:110-118
  useEffect(() => {
    const id = setTimeout(() => {
      if (!st.current.ytReady && !st.current.tts) {
        st.current.tts = true; setTts(true);
        if (st.current.playing) speakCurrent();
      }
    }, 4000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function speakSentence(i: number, onend?: () => void) {
    const s = subs[i];
    speak(s.parts.map((p) => p.zh).join(" "), { lang: "zh-CN", rate: st.current.rate, onEnd: onend ? () => { if (st.current.playing && st.current.tts) onend(); } : undefined });
  }
  function speakCurrent() {
    speakSentence(st.current.cur, () => {
      if (st.current.cur + 1 < subs.length) { st.current.cur += 1; setCur(st.current.cur); speakCurrent(); }
      else pause();
    });
  }
  function play() {
    st.current.playing = true; setPlaying(true);
    if (st.current.tts) speakCurrent();
    else { ytCmd("playVideo"); ytCmd("setPlaybackRate", [st.current.rate]); }
  }
  function pause() {
    st.current.playing = false; setPlaying(false);
    if (st.current.tts) { try { ttsCancel(); } catch { /* silent */ } } else ytCmd("pauseVideo");
  }
  function gotoSentence(i: number, autoplay: boolean) {
    const clamped = Math.min(Math.max(i, 0), subs.length - 1);
    st.current.cur = clamped;
    if (st.current.tts) {
      if (st.current.playing || autoplay) { st.current.playing = true; setPlaying(true); speakCurrent(); }
      else setCur(clamped);
    } else {
      ytCmd("seekTo", [subs[clamped].start, true]);
      if (autoplay && !st.current.playing) play(); else setCur(clamped);
    }
    setCur(clamped);
  }
  const next = () => gotoSentence(st.current.cur + 1, st.current.playing);
  const prev = () => gotoSentence(st.current.cur - 1, st.current.playing);
  const repeat = () => gotoSentence(st.current.cur, true);

  // render: toolbar + player + transcript (đủ mọi nút SPEC-06 §2: mode 2 nút, Ẩn video,
  // Phím tắt, ⏮/🔁/▶⏸/⏭, Tự ngắt câu checkbox id="auto-split", Bản dịch, Pinyin,
  // tốc độ select 0.5/0.8/1/1.5/2 → ytCmd setPlaybackRate, Cài đặt dialog (font sm/base/lg +
  // autoscroll checkbox ghi qua prefs), overlay data-testid="video-overlay" + banner TTS,
  // transcript câu button với pinyin/vi toggle + nút "⚠ Báo lỗi" → toast("Đã gửi báo lỗi — cảm ơn bạn!"),
  // câu active class "sent-active" + scrollIntoView({behavior:"smooth",block:"nearest"}) khi autoScroll,
  // <p data-testid="pos">Câu {cur+1}/{subs.length}</p>)
}
```

Cụ thể JSX transcript câu (giữ đúng cấu trúc clone `sentenceHtml`, dòng 185-203): mỗi câu là `<button>` bọc `<div data-sent={i} className={"card p-3 cursor-pointer border-2 border-transparent hover:border-nhai-border" + (i === cur ? " sent-active" : "")}>` với `#` + `s.n`, span con theo `parts` (`cursor-pointer hover:text-nhai-main`), `<p className={showPy ? "" : "hidden"} …>{s.pinyin}</p>`, `<p className={showVi ? "" : "hidden"} …>{s.vi}</p>`, nút "⚠ Báo lỗi" (stopPropagation + toast). Toolbar 2 nút mode: `data-mode`, active đổi class `btn-main`/`btn-ghost` và hiện/ẩn khu dictation/record (Task 6 nhận props slot).

- [ ] **Step 4: Run test verify pass**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/components/shadowing/__tests__/video-player.test.tsx`
Expected: PASS 5 tests (điều chỉnh selector JSX khớp test; giữ hành vi `findSentenceIndex`/seekTo `[56,true]` cho câu #5 start=56).

- [ ] **Step 5: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src/components/shadowing/video-player.tsx app-next/src/components/shadowing/__tests__/video-player.test.tsx
git commit -m "feat(sp1-media): VideoPlayer imperative — postMessage YT + polling 500ms + TTS fallback + transcript (G5)"
```

### Task 6: `<DictationPanel>` + `<RecorderPanel>` (MediaRecorder + cleanup)

**Files:**
- Create: `app-next/src/components/shadowing/dictation-panel.tsx`
- Create: `app-next/src/components/shadowing/recorder-panel.tsx`
- Test: `app-next/src/components/shadowing/__tests__/dictation-panel.test.tsx`, `app-next/src/components/shadowing/__tests__/recorder-panel.test.tsx`

**Interfaces:**
- Consumes: `gradeDictation`-không — dùng `normDict`/`diffNormalized` từ `@/lib/shadowing/dictation` (Task 3); `useTts`, `useToast` như Task 5; types `SubtitleSentence`.
- Produces:
  - `export default function DictationPanel({ sentence, onListen, onSkip, onNavigate }: { sentence: SubtitleSentence; onListen: () => void; onSkip: () => void; onNavigate?: undefined }): JSX.Element;` — props đúng vậy (`onListen` = seekTo start + play của parent; `onSkip` = next). Ô input placeholder "Gõ những gì bạn nghe được (chữ Hán hoặc pinyin)", nút "Nghe câu này 🔊" (`data-testid="dict-listen"`), "Kiểm tra" (`data-testid="dict-check"`), "Bỏ qua câu này" (`data-testid="dict-skip"`). Kết quả: đúng → `<p className="font-bold text-green-700 dark:text-green-400">✅ Chính xác! 🎉</p>` + câu zh; sai → "❌ Chưa đúng — chữ sai được tô đỏ:" + input gốc với ký tự `ok === false` bọc `<span className="text-red-600 font-bold underline">` + "Đáp án: " + câu + pinyin; input rỗng → "Hãy gõ những gì bạn nghe được trước đã." Enter trong input = Kiểm tra. Đổi câu → xoá kết quả + input.
  - `export default function RecorderPanel(): JSX.Element;` — nút `data-testid="rec-btn"` "● Bắt đầu ghi âm" (nền đỏ `#dc2626`) ↔ "■ Dừng ghi âm" (nền `#1f1e1d`); hint `data-testid="rec-hint"`; playback list `data-testid="rec-list"`. Guard `navigator.mediaDevices && window.MediaRecorder` — thiếu → click im lặng. Cleanup unmount: nếu đang ghi `rec.stop()` + `stream.getTracks().forEach(t => t.stop())` + `URL.revokeObjectURL(url)` cho mọi blob URL đã tạo (giữ mảng `createdUrls` trong ref).

- [ ] **Step 1: Write the failing tests**

Tạo `app-next/src/components/shadowing/__tests__/dictation-panel.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DictationPanel from "../dictation-panel";
import { shadowingSubtitles } from "@/content/shadowing";

const s1 = shadowingSubtitles["EA3rwvr99Q0"][0]; // 啊! 我才离开几天! ...
const s5 = shadowingSubtitles["EA3rwvr99Q0"][4]; // 退! ×8

describe("DictationPanel (G5 dictation)", () => {
  it("gõ đúng (khác dấu câu/khoảng trắng) → ✅ xanh + hiện đáp án", async () => {
    const user = userEvent.setup();
    render(<DictationPanel sentence={s5} onListen={() => {}} onSkip={() => {}} />);
    await user.type(screen.getByPlaceholderText(/Gõ những gì bạn nghe được/), "退 退! 退退 退退! 退, 退。退退!");
    await user.click(screen.getByTestId("dict-check"));
    expect(screen.getByText(/✅ Chính xác/)).toBeTruthy();
  });
  it("sai → chữ sai đỏ + đáp án; Enter = Kiểm tra", async () => {
    const user = userEvent.setup();
    render(<DictationPanel sentence={s5} onListen={() => {}} onSkip={() => {}} />);
    const input = screen.getByPlaceholderText(/Gõ những gì bạn nghe được/);
    await user.type(input, "退 退 退 退 退 退 退 停!{enter}");
    expect(screen.getByText(/❌ Chưa đúng/)).toBeTruthy();
    expect(screen.getByText("停", { selector: "span.text-red-600" })).toBeTruthy();
    expect(screen.getByText(/Đáp án:/)).toBeTruthy();
  });
  it("input rỗng + Kiểm tra → nhắc nhập; Bỏ qua gọi onSkip; Nghe gọi onListen", async () => {
    const onSkip = vi.fn(); const onListen = vi.fn();
    const user = userEvent.setup();
    render(<DictationPanel sentence={s1} onListen={onListen} onSkip={onSkip} />);
    await user.click(screen.getByTestId("dict-check"));
    expect(screen.getByText(/Hãy gõ những gì bạn nghe được trước đã/)).toBeTruthy();
    await user.click(screen.getByTestId("dict-skip"));
    expect(onSkip).toHaveBeenCalled();
    await user.click(screen.getByTestId("dict-listen"));
    expect(onListen).toHaveBeenCalled();
  });
});
```

Tạo `app-next/src/components/shadowing/__tests__/recorder-panel.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RecorderPanel from "../recorder-panel";

class FakeRecorder {
  static instances: FakeRecorder[] = [];
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  mimeType = "audio/webm";
  started = false; stopped = false;
  constructor(public stream: { getTracks: () => { stop: () => void }[] }) { FakeRecorder.instances.push(this); }
  start() { this.started = true; }
  stop() { this.stopped = true; this.onstop?.(); }
}
function fakeStream() {
  const track = { stop: vi.fn() };
  return { getTracks: () => [track], __track: track };
}

beforeEach(() => { FakeRecorder.instances = []; vi.stubGlobal("MediaRecorder", FakeRecorder); });
afterEach(() => { vi.unstubAllGlobals(); });

it("cấp quyền → record/stop → playback item xuất hiện, track dừng sau stop", async () => {
  const stream = fakeStream();
  vi.stubGlobal("navigator", { ...navigator, mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) } });
  const user = userEvent.setup();
  render(<RecorderPanel />);
  await user.click(screen.getByTestId("rec-btn"));
  await waitFor(() => expect(screen.getByTestId("rec-btn")).toHaveTextContent("■ Dừng ghi âm"));
  await user.click(screen.getByTestId("rec-btn"));
  await waitFor(() => expect(screen.getByTestId("rec-list").querySelector("audio")).toBeTruthy());
  expect(FakeRecorder.instances[0].started).toBe(true);
  expect(FakeRecorder.instances[0].stopped).toBe(true);
  expect(stream.__track.stop).toHaveBeenCalled();
});

it("từ chối quyền → im lặng không lỗi; thiếu API → click không làm gì", async () => {
  vi.stubGlobal("navigator", { ...navigator, mediaDevices: { getUserMedia: vi.fn().mockRejectedValue(new Error("denied")) } });
  const user = userEvent.setup();
  const { unmount } = render(<RecorderPanel />);
  await user.click(screen.getByTestId("rec-btn"));
  await waitFor(() => expect(screen.getByTestId("rec-btn")).toHaveTextContent("● Bắt đầu ghi âm"));
  unmount();
  vi.stubGlobal("navigator", { ...navigator, mediaDevices: undefined });
  vi.unstubAllGlobals();
  vi.stubGlobal("MediaRecorder", undefined);
  render(<RecorderPanel />);
  await user.click(screen.getByTestId("rec-btn"));
  expect(screen.queryByText("■ Dừng ghi âm")).toBeNull();
});

it("unmount khi đang ghi → rec.stop + track.stop + revokeObjectURL", async () => {
  const stream = fakeStream();
  vi.stubGlobal("navigator", { ...navigator, mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) } });
  const revoke = vi.fn();
  vi.stubGlobal("URL", { ...URL, createObjectURL: () => "blob:fake", revokeObjectURL: revoke });
  const user = userEvent.setup();
  const { unmount } = render(<RecorderPanel />);
  await user.click(screen.getByTestId("rec-btn"));
  await waitFor(() => expect(FakeRecorder.instances[0].started).toBe(true));
  unmount();
  expect(FakeRecorder.instances[0].stopped).toBe(true);
  expect(stream.__track.stop).toHaveBeenCalled();
  expect(revoke).toHaveBeenCalledWith("blob:fake");
});
```

- [ ] **Step 2: Run test verify fail**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/components/shadowing/__tests__/dictation-panel.test.tsx src/components/shadowing/__tests__/recorder-panel.test.tsx`
Expected: FAIL — `Cannot find module '../dictation-panel'` / `'../recorder-panel'`

- [ ] **Step 3: Implement DictationPanel**

`app-next/src/components/shadowing/dictation-panel.tsx` — port `shadowing-video.js:377-438`:

```tsx
"use client";
import { useEffect, useState } from "react";
import { normDict, diffNormalized } from "@/lib/shadowing/dictation";
import type { SubtitleSentence } from "@/content/shadowing";

export default function DictationPanel({ sentence, onListen, onSkip }: {
  sentence: SubtitleSentence; onListen: () => void; onSkip: () => void;
}) {
  const [value, setValue] = useState("");
  const [result, setResult] = useState<null | { kind: "empty" | "correct" | "wrong"; diff?: { char: string; ok: boolean | null }[] }>(null);
  useEffect(() => { setValue(""); setResult(null); }, [sentence]);
  const full = sentence.parts.map((p) => p.zh).join(" ");

  function check() {
    if (!normDict(value)) { setResult({ kind: "empty" }); return; }
    const want = normDict(full);
    setResult(normDict(value) === want ? { kind: "correct" } : { kind: "wrong", diff: diffNormalized(value, full) });
  }
  return (
    <div className="card shadow-neo p-4 space-y-3" data-testid="dictation">
      <div className="flex gap-2">
        <button type="button" data-testid="dict-listen" onClick={onListen} className="btn-ghost px-3 py-1.5 text-sm">Nghe câu này 🔊</button>
        <button type="button" data-testid="dict-check" onClick={check} className="btn-main px-3 py-1.5 text-sm">Kiểm tra</button>
        <button type="button" data-testid="dict-skip" onClick={onSkip} className="btn-ghost px-3 py-1.5 text-sm ml-auto">Bỏ qua câu này</button>
      </div>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") check(); }}
        placeholder="Gõ những gì bạn nghe được (chữ Hán hoặc pinyin)"
        className="w-full border-2 border-nhai-border rounded-lg px-3 py-3 text-lg zh bg-nhai-bg"
        data-testid="dict-input"
      />
      <div data-testid="dict-result">
        {result?.kind === "empty" && <p className="text-nhai-muted">Hãy gõ những gì bạn nghe được trước đã.</p>}
        {result?.kind === "correct" && (
          <><p className="font-bold text-green-700 dark:text-green-400">✅ Chính xác! 🎉</p><p className="zh mt-1">{full}</p></>
        )}
        {result?.kind === "wrong" && (
          <>
            <p className="font-bold text-nhai-main">❌ Chưa đúng — chữ sai được tô đỏ:</p>
            <p className="mt-1 text-lg">{result.diff!.map((d, i) => d.ok === false
              ? <span key={i} className="text-red-600 font-bold underline">{d.char}</span>
              : <span key={i}>{d.char}</span>)}</p>
            <p className="mt-2 text-sm text-nhai-muted">Đáp án: <span className="zh font-semibold text-nhai-ink">{full}</span>
              {sentence.pinyin ? <span className="italic"> ({sentence.pinyin})</span> : null}</p>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implement RecorderPanel (cleanup bắt buộc)**

`app-next/src/components/shadowing/recorder-panel.tsx` — port `shadowing-video.js:440-473` + cleanup:

```tsx
"use client";
import { useEffect, useRef, useState } from "react";

type Rec = { stop: () => void; onstop: (() => void) | null; ondataavailable: ((e: { data: Blob }) => void) | null; start: () => void; mimeType: string };

export default function RecorderPanel() {
  const [recording, setRecording] = useState(false);
  const [items, setItems] = useState<string[]>([]);
  const recRef = useRef<Rec | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const urlsRef = useRef<string[]>([]);
  const chunksRef = useRef<Blob[]>([]);

  // CLEANUP BẮT BUỘC: unmount phải stop rec + stop tracks + revoke mọi blob URL
  useEffect(() => () => {
    try { recRef.current?.stop(); } catch { /* silent */ }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  function toggle() {
    const nav = navigator as Navigator & { mediaDevices?: MediaDevices };
    const MR = (window as unknown as { MediaRecorder?: new (s: MediaStream) => Rec }).MediaRecorder;
    if (!recording) {
      if (!nav.mediaDevices || !MR) return; // fail im lặng như clone
      nav.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        chunksRef.current = [];
        const rec = new MR(stream);
        rec.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
        rec.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          const url = URL.createObjectURL(new Blob(chunksRef.current, { type: rec.mimeType || "audio/webm" }));
          urlsRef.current.push(url);
          setItems((prev) => [...prev, url]);
        };
        rec.start();
        recRef.current = rec; streamRef.current = stream;
        setRecording(true);
      }).catch(() => { /* từ chối quyền — im lặng */ });
    } else {
      try { recRef.current?.stop(); } catch { /* silent */ }
      recRef.current = null; streamRef.current = null;
      setRecording(false);
    }
  }
  return (
    <div className="card shadow-neo p-4 space-y-3" data-testid="recorder">
      <button type="button" data-testid="rec-btn" onClick={toggle}
        className="px-4 py-2 text-sm font-bold rounded-lg text-white transition-colors"
        style={{ background: recording ? "#1f1e1d" : "#dc2626" }}>
        {recording ? "■ Dừng ghi âm" : "● Bắt đầu ghi âm"}
      </button>
      <p className="text-sm text-nhai-muted" data-testid="rec-hint">
        {recording ? "Đang ghi âm… bấm để dừng." : "Ghi âm để so sánh phát âm của bạn với video."}
      </p>
      <div data-testid="rec-list" className="space-y-2">
        {items.map((url, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="pill text-xs font-bold">Bản ghi</span>
            <audio controls src={url} className="h-9 flex-1 max-w-xs" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Run tests verify pass**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/components/shadowing`
Expected: PASS toàn bộ (Task 5 + 6).

- [ ] **Step 6: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src/components/shadowing/dictation-panel.tsx app-next/src/components/shadowing/recorder-panel.tsx app-next/src/components/shadowing/__tests__/dictation-panel.test.tsx app-next/src/components/shadowing/__tests__/recorder-panel.test.tsx
git commit -m "feat(sp1-media): dictation panel (normDict/diff) + recorder panel với cleanup mic/blob (G5)"
```

### Task 7: Route `/shadowing/[videoId]` + phím tắt + video liên quan + Playwright stub YouTube

**Files:**
- Create: `app-next/src/app/(app)/shadowing/[videoId]/page.tsx`
- Modify: `app-next/src/components/shadowing/video-player.tsx` — bổ sung phím tắt + dialog Phím tắt + dialog Cài đặt + slot DictationPanel/RecorderPanel (port `shadowing-video.js:236-331, 377-473` — mọi state đã có từ Task 5)
- Test: `app-next/tests/e2e/media-documents-smoke.spec.ts` (tạo file, chỉ chứadescribe player ở task này)

**Interfaces:**
- Consumes: `VideoPlayer` + `DictationPanel` + `RecorderPanel` (Task 5–6); `shadowingVideoById`, `relatedVideos`, `shadowingSubtitles`, `shadowingPlaylists` (`@/content/shadowing`); `useToast`.
- Produces:
  - Route SSG `generateStaticParams()` trả `[{ videoId }, …]` cho đủ 20 video của `shadowingVideos`; `generateMetadata({ params })` → `title: video.title + " | Shadowing | Nhai HSK"`. Không khớp id → `notFound()`.
  - Trang server render: breadcrumb Link `‹ Shadowing` → `/shadowing`, `h1` title, badge HSK + duration + `▶ views lượt xem`, `<VideoPlayer …/>`, section "Video liên quan" = `relatedVideos(video.id)` render `VideoCard` (grid 4→2).
  - Playwright stub YouTube (cách thức bắt buộc): `page.route("**/www.youtube-nocookie.com/embed/**", …)` → `route.fulfill` HTML chứa script fake widget: nhận `message` → trả `{"event":"onReady"}` và khi nhận command `getCurrentTime` → postMessage JSON `{"event":"infoDelivery","infoDelivery":{"playerData":{"currentTime":5,"playerState":1}}}` về `window.parent` với `targetOrigin "*"` (iframe được serve tại origin youtube-nocookie vì URL thật được fulfill — parent check origin regex pass). Phím Space/←/→/R test bằng `page.keyboard`.

- [ ] **Step 1: Write the failing Playwright test**

Tạo `app-next/tests/e2e/media-documents-smoke.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

const YT_STUB = `<!DOCTYPE html><html><body><script>
window.addEventListener("message", function (e) {
  var d; try { d = JSON.parse(e.data); } catch (err) { return; }
  if (!d || d.event !== "command") return;
  if (d.func === "getCurrentTime") {
    parent.postMessage(JSON.stringify({ event: "infoDelivery", infoDelivery: { playerData: { currentTime: 5, playerState: 1 } } }), "*");
  } else {
    parent.postMessage(JSON.stringify({ event: "onReady" }), "*");
  }
});
</script></body></html>`;

test.describe("G5 shadowing video player (YouTube stubbed)", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("thư viện → card → player: ytReady (overlay ẩn), câu active highlight, seekTo đúng start", async ({ page }) => {
    await page.route("**/www.youtube-nocookie.com/embed/**", (route) => route.fulfill({ contentType: "text/html", body: YT_STUB }));
    await page.goto("/shadowing");
    await expect(page.getByRole("heading", { level: 2 })).toHaveCount(5);
    await page.click('a[href="/shadowing/EA3rwvr99Q0"]');
    await expect(page.getByRole("heading", { level: 1 })).toContainText("墓碑上的QR碼");
    await page.waitForTimeout(300); // stub onReady → markYtReady
    await expect(page.getByTestId("video-overlay")).toBeHidden();
    await page.click('[data-sent="4"]'); // câu #5 start 56
    // yêu cầu getCurrentTime mỗi 500ms; bấm câu sinh command seekTo [56,true] — kiểm qua transcript active
    await expect(page.locator('[data-sent="4"].sent-active')).toBeVisible();
    await expect(page.getByTestId("pos")).toHaveTextContent("Câu 5/9");
  });

  test("phím tắt Space/←/→/R hoạt động; không kích hoạt khi focus input dictation", async ({ page }) => {
    await page.route("**/www.youtube-nocookie.com/embed/**", (route) => route.fulfill({ contentType: "text/html", body: YT_STUB }));
    await page.goto("/shadowing/EA3rwvr99Q0");
    await page.waitForTimeout(300);
    await page.click('[data-sent="2"]');
    await expect(page.getByTestId("pos")).toHaveTextContent("Câu 3/9");
    await page.keyboard.press("ArrowRight");
    await expect(page.getByTestId("pos")).toHaveTextContent("Câu 4/9");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("r");
    await expect(page.getByTestId("pos")).toHaveTextContent("Câu 3/9");
    await page.click('button[data-mode="dictation"]');
    await page.getByTestId("dict-input").fill("退");
    await page.keyboard.press("ArrowRight"); // KHÔNG đổi câu khi đang gõ
    await expect(page.getByTestId("pos")).toHaveTextContent("Câu 3/9");
  });

  test("chặn YouTube 4s → overlay + fallback TTS banner", async ({ page }) => {
    await page.route("**/www.youtube-nocookie.com/embed/**", (route) => route.abort());
    await page.goto("/shadowing/EA3rwvr99Q0");
    await expect(page.getByTestId("video-overlay")).toBeVisible({ timeout: 6000 });
    await expect(page.getByText(/Dùng TTS đọc câu/)).toBeVisible();
  });
});
```

- [ ] **Step 2: Run test verify fail**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm playwright test tests/e2e/media-documents-smoke.spec.ts`
Expected: FAIL — route `/shadowing/EA3rwvr99Q0` trả 404.

- [ ] **Step 3: Implement route + bổ sung player (phím tắt, dialogs, mode slots)**

`app-next/src/app/(app)/shadowing/[videoId]/page.tsx`:

```tsx
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { shadowingVideoById, shadowingSubtitles, relatedVideos, shadowingVideos } from "@/content/shadowing";
import VideoPlayer from "@/components/shadowing/video-player";
import VideoCard from "@/components/shadowing/video-card";
import Link from "next/link";

export function generateStaticParams() {
  return shadowingVideos.map((v) => ({ videoId: v.id }));
}
export async function generateMetadata({ params }: { params: Promise<{ videoId: string }> }): Promise<Metadata> {
  const { videoId } = await params;
  const video = shadowingVideoById(videoId);
  return { title: video ? `${video.title} | Shadowing | Nhai HSK` : "Shadowing | Nhai HSK" };
}
const FALLBACK_SUBS = (durSec: number) => [
  { n: 1, start: 0, end: durSec || 60, parts: [{ zh: "(Video này chưa có bản chép — đang cập nhật.)" }], pinyin: "", vi: "" },
];

export default async function ShadowingVideoPage({ params }: { params: Promise<{ videoId: string }> }) {
  const { videoId } = await params;
  const video = shadowingVideoById(videoId);
  if (!video) notFound();
  const subs = shadowingSubtitles[video.id] ?? FALLBACK_SUBS(video.durSec);
  const rel = relatedVideos(video.id);
  return (
    <main>
      <div className="mb-2">
        <Link href="/shadowing" className="text-sm font-semibold text-nhai-muted hover:text-nhai-main">‹ Shadowing</Link>
      </div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <h1 className="text-2xl md:text-3xl font-extrabold">{video.title}</h1>
        <span className="pill pill-active text-xs font-bold">{video.hsk}</span>
        <span className="pill text-xs font-bold">{video.duration}</span>
        <span className="pill text-xs font-bold">▶ {video.views + (video.viewsSuffix || "")} lượt xem</span>
      </div>
      <VideoPlayer video={video} subtitles={subs} />
      {rel.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-extrabold mb-3">Video liên quan</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {rel.map((v, i) => <VideoCard key={v.id} video={v} gradIndex={i + 1} />)}
          </div>
        </section>
      )}
    </main>
  );
}
```

Bổ sung `video-player.tsx` (Modify — dùng state đã có):
- Toolbar mode: 2 nút `data-mode="shadow"` "Bắt chước phát âm" / `data-mode="dictation"` "Nghe - Viết chính tả" — active `btn-main`, đổi `st.current.mode` + state `[mode, setMode]`; nút "👁 Ẩn video" toggle `videoHidden` (label "👁 Hiện video" khi ẩn); nút "⌨️ Phím tắt" mở `shortcutsOpen`; khu render `{mode === "dictation" ? <DictationPanel sentence={subs[cur]} onListen={listenCurrent} onSkip={next}/> : <RecorderPanel/>}` với `listenCurrent = () => { if (tts) speakSentence(cur); else { ytCmd("seekTo", [subs[cur].start, true]); ytCmd("playVideo"); } }`.
- Phím tắt `useEffect` keydown trên `document` — port `shadowing-video.js:301-309`: bỏ qua khi `e.target` khớp `input, textarea, select` hoặc `isContentEditable`, và khi dialog mở (`shortcutsOpen || settingsOpen`); `Space`→togglePlay, `ArrowLeft/ArrowRight`→prev/next, `r|R`→repeat.
- Dialog Phím tắt: backdrop `fixed inset-0 z-50` onClick đóng, liệt kê 4 hàng pill: "Phát / tạm dừng — Space", "Câu trước — ←", "Câu sau — →", "Lặp lại câu — R".
- Dialog Cài đặt: 3 nút "Nhỏ/Vừa/Lớn" (`getShadowFont`/`setShadowFont`) + checkbox "Tự cuộn đến câu đang phát" (`getAutoscroll`/`setAutoscroll`).
- Tốc độ: `<select data-rate>` các option 0.5/0.8/1/1.5/2 — `onChange` set `st.current.rate` + `setRate`, nếu `!tts` `ytCmd("setPlaybackRate",[rate])`.

- [ ] **Step 4: Run e2e verify pass**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm playwright test tests/e2e/media-documents-smoke.spec.ts`
Expected: PASS 3 tests.

- [ ] **Step 5: Verify SSG + commit**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm build && ls .next/server/app/\(app\)/shadowing | head -5`
Expected: build sinh thư mục route cho các videoId.
Commit:

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src/app/\(app\)/shadowing app-next/src/components/shadowing/video-player.tsx app-next/tests/e2e/media-documents-smoke.spec.ts
git commit -m "feat(sp1-media): /shadowing/[videoId] SSG + shortcuts/settings/related + Playwright YT stub (G5)"
```

---

# Phase 2 — Create-file (G6 + G7 + G8)

### Task 8: `lib/create-file` — types + defaults + reducer + storage

**Files:**
- Create: `app-next/src/lib/create-file/types.ts`
- Create: `app-next/src/lib/create-file/defaults.ts`
- Create: `app-next/src/lib/create-file/storage.ts`
- Test: `app-next/src/lib/create-file/__tests__/cf-state.test.ts`, `app-next/src/lib/create-file/__tests__/cf-storage.test.ts`

**Interfaces:**
- Consumes: `type VocabWord` từ `@/content/vocab` (plan learning-core Task 7 — cho default chars của tpl `vocab`); types `FileTemplate` từ `@/content/templates` (Task 2).
- Produces:
  - `export type CfCellType = "dien-tu" | "mi" | "vuong" | "hoi-cung" | "cuu-cung";`
  - `export type CfCellColor = "green" | "red" | "blue" | "gray";`
  - `export type CfChar = { hanzi: string; pinyin: string; hv: string; meaning: string };`
  - `export type CfState = { tpl: string | null; chars: CfChar[]; title: string; nameDate: boolean; cellType: CfCellType; cellColor: CfCellColor; perRow: number; fillRows: number; blankRows: number; faintCount: number; script: "khai" | "hanh"; strokeSource: "CNstrokeorder" | "qingfeng"; traceStyle: string[]; opacity: number; fontSize: number; showPinyin: boolean; showMeaning: boolean };` — đủ 18 nhóm key của clone (`create-file.js:62-82`).
  - `export type CfAction = { type: "set"; key: keyof CfState; value: string | number | boolean } | { type: "setTraceStyle"; value: string; checked: boolean } | { type: "setScript"; value: "khai" | "hanh"; checked: boolean } | { type: "step"; key: "perRow" | "fillRows" | "blankRows" | "faintCount"; dir: number; min: number; max: number } | { type: "setMeaning"; index: number; value: string } | { type: "deleteChar"; index: number } | { type: "addChars"; chars: CfChar[] } | { type: "clearChars" } | { type: "formatAiMock" } | { type: "setTpl"; tpl: string } | { type: "hydrate"; state: CfState } | { type: "reset"; tpl: string | null };`
  - `export function cfReducer(state: CfState, action: CfAction): CfState;` — logic port `create-file.js:687-719`: `setTraceStyle` toggle, mảng rỗng → `["faint"]`; `setScript` bỏ chọn 1 trong 2 → cái còn lại; `step` clamp min/max; `formatAiMock` chuẩn hoá pinyin + Hán Việt IN HOA từ `charInfo` + nghĩa fallback chữ đầu (port `create-file.js:775-786`); `setTpl` chỉ đổi tpl giữ phần còn lại; `hydrate` merge với default.
  - `export const CF_SESSION_KEY = "nhai.cf.state";`
  - `export const DEFAULT_CHARS: CfChar[];` — 4 từ clone (`create-file.js:55-60`): 学习 xué xí HỌC TẬP / 朋友 péng yǒu BẰNG HỮU / 老师 lǎo shī LÃO SƯ / 工作 gōng zuò CÔNG TÁC.
  - `export const CHAR_INFO_FALLBACK: Record<string, { pinyin: string; hanViet: string; meaning: string }>;` — 6 chữ `永 远 学 习 汉 字` port `create-file.js:21-28`.
  - `export function charInfo(ch: string): { pinyin: string; hanViet: string; meaning: string };`
  - `export function cfDefaults(): CfState;` — `tpl: null` + bảng mặc định Global Constraints.
  - `export function cfDefaultsFor(tpl: string | null): CfState;` — giống `cfDefaults` nhưng chars theo template: `stroke-order`/`big-char` → 6 chữ đơn `永 yǒng VĨNH…, 远 xué? — đúng bảng FALLBACK`: `[永, 远, 学, 习, 汉, 字]` mỗi chữ 1 CfChar (hanzi = chữ, pinyin/hv/meaning từ `charInfo`); `vocab` → 4 từ đầu `vocab.hsk1["lesson-1"].words` map `{hanzi, pinyin, hv: hanViet, meaning}`; còn lại → `DEFAULT_CHARS`.
  - `export function mergeCfState(raw: unknown, tpl: string | null): CfState;` — port `cfLoadAll` (`create-file.js:89-105`): mọi key có trong raw override default; `chars`/`traceStyle` không phải array/rỗng → default.
  - `export function parseLine(line: string): CfChar | null;` — port `create-file.js:439-450` (regex pinyin `/^[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+$/`, hv suy từ `charInfo` IN HOA).
  - storage.ts: `export function loadCfState(): CfState | null;` (sessionStorage `CF_SESSION_KEY`, JSON hỏng → null); `export function persistCfState(s: CfState): void;`; `export function hasFileCode(): boolean;` (localStorage `nhai.fileCode === "1"`); `export function setFileCode(): void;` (set `"1"`); `export function isLoggedInMock(): boolean;` (localStorage `nhai.mockLogin === "1"` — đọc thôi, Login modal của shell là bên ghi).

- [ ] **Step 1: Write the failing tests**

Tạo `app-next/src/lib/create-file/__tests__/cf-state.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { cfReducer, cfDefaults, cfDefaultsFor, mergeCfState, parseLine, DEFAULT_CHARS } from "../types";
import type { CfState } from "../types";
// types.ts re-export cfReducer/… từ defaults.ts nếu tách file — test import từ "types" như trên
// (triển khai: types.ts khai type; defaults.ts chứa cfDefaults/mergeCfState/parseLine + re-export reducer từ reducer.ts)
```

Cụ thể các it (file test thật gồm các khối sau):

```ts
describe("cfDefaults (bảng mặc định gốc clone)", () => {
  it("đúng 18 keys mặc định: Điền tự, gray, 12/1/0, 3/12, Khải thư, CNstrokeorder, Tô mờ, 30%, 78%, Pinyin+Nghĩa", () => {
    const d = cfDefaults();
    expect(d).toMatchObject({
      tpl: null, title: "", nameDate: true, cellType: "dien-tu", cellColor: "gray",
      perRow: 12, fillRows: 1, blankRows: 0, faintCount: 3, script: "khai",
      strokeSource: "CNstrokeorder", traceStyle: ["faint"], opacity: 30, fontSize: 78,
      showPinyin: true, showMeaning: true,
    });
    expect(d.chars).toEqual(DEFAULT_CHARS);
    expect(Object.keys(d)).toHaveLength(18);
  });
  it("cfDefaultsFor: stroke-order → 6 chữ 永 远 学 习 汉 字; vocab → từ Bài 1 HSK1; khác → DEFAULT_CHARS", () => {
    expect(cfDefaultsFor("stroke-order").chars.map((c) => c.hanzi)).toEqual(["永", "远", "学", "习", "汉", "字"]);
    expect(cfDefaultsFor("big-char").chars[0]).toMatchObject({ hanzi: "永", pinyin: "yǒng", hv: "VĨNH" });
    expect(cfDefaultsFor("vocab").chars[0].hanzi).toBe("你好");
    expect(cfDefaultsFor("grid-paper").chars).toEqual(DEFAULT_CHARS);
  });
  it("mergeCfState: key có trong raw thắng, chars/traceStyle hỏng → default", () => {
    const base = cfDefaults();
    const merged = mergeCfState({ ...base, perRow: 8, chars: "x", traceStyle: [] }, null);
    expect(merged.perRow).toBe(8);
    expect(merged.chars).toEqual(DEFAULT_CHARS);
    expect(merged.traceStyle).toEqual(["faint"]);
  });
});

describe("cfReducer", () => {
  const s = () => cfDefaults();
  it("set đổi scalar; step clamp min/max", () => {
    expect(cfReducer(s(), { type: "set", key: "cellType", value: "mi" }).cellType).toBe("mi");
    let st = cfReducer(s(), { type: "step", key: "perRow", dir: -1, min: 6, max: 16 });
    expect(st.perRow).toBe(11);
    st = cfReducer(st, { type: "step", key: "perRow", dir: -9, min: 6, max: 16 });
    expect(st.perRow).toBe(6);
    st = cfReducer(st, { type: "step", key: "perRow", dir: 99, min: 6, max: 16 });
    expect(st.perRow).toBe(16);
  });
  it("setTraceStyle toggle; bỏ ô cuối → về ['faint']", () => {
    let st = cfReducer(s(), { type: "setTraceStyle", value: "hollow", checked: true });
    expect(st.traceStyle).toEqual(["faint", "hollow"]);
    st = cfReducer(st, { type: "setTraceStyle", value: "faint", checked: false });
    st = cfReducer(st, { type: "setTraceStyle", value: "hollow", checked: false });
    expect(st.traceStyle).toEqual(["faint"]);
  });
  it("setScript: bỏ chọn Khải thư → về Hành thư (checkbox 1 chọn)", () => {
    expect(cfReducer(s(), { type: "setScript", value: "khai", checked: false }).script).toBe("hanh");
    expect(cfReducer(s(), { type: "setScript", value: "hanh", checked: true }).script).toBe("hanh");
  });
  it("chars: setMeaning/deleteChar/clearChars/addChars parseLine bỏ từ trùng", () => {
    let st = cfReducer(s(), { type: "setMeaning", index: 0, value: "học hành" });
    expect(st.chars[0].meaning).toBe("học hành");
    st = cfReducer(st, { type: "deleteChar", index: 0 });
    expect(st.chars).toHaveLength(3);
    st = cfReducer(st, { type: "addChars", chars: [parseLine("学习 xué xí học tập")!, parseLine("美好 měi hảo tốt đẹp")!] });
    expect(st.chars.map((c) => c.hanzi)).toEqual(["朋友", "老师", "工作", "美好"]); // 学习 đã có → bỏ
    st = cfReducer(st, { type: "clearChars" });
    expect(st.chars).toHaveLength(0);
  });
  it("formatAiMock: pinyin chuẩn hoá space, Hán Việt IN HOA từ charInfo, nghĩa fallback chữ đầu", () => {
    const st = cfReducer(s(), { type: "formatAiMock" });
    expect(st.chars[0]).toMatchObject({ hanzi: "学习", pinyin: "xué xí", hv: "HỌC TẬP" });
  });
  it("setTpl đổi tpl giữ nguyên phần còn lại; reset trả default template", () => {
    let st = cfReducer(s(), { type: "step", key: "perRow", dir: 1, min: 6, max: 16 });
    st = cfReducer(st, { type: "setTpl", tpl: "cover" });
    expect(st.tpl).toBe("cover");
    expect(st.perRow).toBe(13);
    expect(cfReducer(st, { type: "reset", tpl: "cover" }).tpl).toBe("cover");
  });
});
```

Tạo `app-next/src/lib/create-file/__tests__/cf-storage.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { loadCfState, persistCfState, hasFileCode, setFileCode, CF_SESSION_KEY } from "../storage";
import { cfDefaults } from "../types";

beforeEach(() => { sessionStorage.clear(); localStorage.clear(); });

it("persist → load roundtrip qua sessionStorage nhai.cf.state", () => {
  const st = { ...cfDefaults(), perRow: 9, tpl: "cover" };
  persistCfState(st);
  expect(sessionStorage.getItem(CF_SESSION_KEY)).toContain('"perRow":9');
  expect(loadCfState()?.perRow).toBe(9);
});
it("JSON hỏng / rỗng → null", () => {
  expect(loadCfState()).toBeNull();
  sessionStorage.setItem(CF_SESSION_KEY, "{broken");
  expect(loadCfState()).toBeNull();
});
it("fileCode mock", () => {
  expect(hasFileCode()).toBe(false);
  setFileCode();
  expect(hasFileCode()).toBe(true);
  expect(localStorage.getItem("nhai.fileCode")).toBe("1");
});
```

- [ ] **Step 2: Run test verify fail**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/lib/create-file`
Expected: FAIL — `Cannot find module '../types'` / `'../storage'`

- [ ] **Step 3: Implement types.ts + defaults.ts + storage.ts**

- `types.ts`: toàn bộ `type` ở Interfaces + `import { cfReducer } from "./reducer"; export { cfReducer };` (reducer tách file riêng để test import gọn — hoặc gom hết vào types.ts; quyền chọn: gom `cfReducer` vào `types.ts` luôn, test import từ `"../types"`).
- `defaults.ts`: `DEFAULT_CHARS`, `CHAR_INFO_FALLBACK`, `charInfo` (đọc `NHAI_DATA` không còn — trả FALLBACK luôn, giữ chữ ký cho `formatAiMock`), `cfDefaults`, `cfDefaultsFor` (import `vocab` từ `@/content/vocab` cho nhánh `vocab`), `mergeCfState`, `parseLine`, `formatVocabMock(chars): CfChar[]` port `create-file.js:775-786`.
- `storage.ts`: như Interfaces — try/catch bọc mọi thao tác.
- `cfReducer` (trong types.ts hoặc reducer.ts): `switch (action.type)` với nhánh đúng bảng Interfaces; `formatAiMock` gọi `formatVocabMock`; `hydrate` gọi `mergeCfState(action.state, state.tpl)`; `reset` trả `cfDefaultsFor(action.tpl)`.

- [ ] **Step 4: Run test verify pass**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/lib/create-file`
Expected: PASS toàn bộ (~10 it).

- [ ] **Step 5: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src/lib/create-file
git commit -m "feat(sp1-media): cf state 18 keys — defaults gốc, useReducer, sessionStorage nhai.cf.state (G7)"
```

### Task 9: `lib/create-file/svg-render.ts` — renderer A4 + page-count estimator

**Files:**
- Create: `app-next/src/lib/create-file/svg-render.ts`
- Test: `app-next/src/lib/create-file/__tests__/svg-render.test.ts`

**Interfaces:**
- Consumes: `CfState`, `cfDefaults`, `charInfo` (Task 8).
- Produces (renderer thuần chuỗi HTML — port nguyên `create-file.js`, `<A4Preview>` chỉ `dangerouslySetInnerHTML`):
  - `const STROKE_DATA: Record<string, number[][]>` — port 8 chữ từ `clone/js/data/hanzi.js:121-165` (你 一 二 人 口 日 木 永); `export function strokeDataOf(ch: string): number[][];` — trả STROKE_DATA hoặc `genericStrokes()` 4 nét khung vuông port `create-file.js:167-174`.
  - `export function renderStrokeSvg(ch: string, mode: "full" | "faint" | number): string;` — port `create-file.js:176-189` (mode number k: nét 0..k-1 đen, nét k đỏ `#c23b22`, ẩn nét >k; faint: opacity 0.14).
  - `export function cellColorVar(color: CfState["cellColor"]): string;` — `{green:"#16a34a",red:"#dc2626",blue:"#2563eb",gray:"#9ca3af"}`.
  - `export function cellShape(state: CfState): string;` — decoration trong ô theo `state.cellType` port `create-file.js:206-227`.
  - `export function traceCharSpan(state: CfState, ch: string): string;` — port `create-file.js:272-285` (4 kiểu tô thin-dashed/dashed-hollow/hollow/faint + fontSize/opacity).
  - `export function renderPages(state: CfState): string[];` — port `buildPages` (`create-file.js:347-425`) ĐỦ 9 nhánh theo id template: `stroke-order` (paginate 2 chữ/trang: metaLine + ô mẫu full + ≤5 ô bước nét đánh số ①-⑤ + 2 hàng 8 ô mờ), `big-char` (3 chữ/trang: ô 7rem trái + meta + 6 ô mờ), `vocab`/`vocab-check` (2 từ/trang: wordBlock + traceRows pinyin hàng đầu + faintCount), `pinyin-write`, `paragraph` (flatChars theo perRow + pinyin trên ô), `lined-paper`, `grid-paper` (luôn ≥ 1 trang đầy 14 hàng — lưới 12×14 mặc định nét đứt qua cellShape "vuong"? KHÔNG: grid-paper dùng `gridRows` ô thường; ô nét đứt chéo của giấy ô trống đến từ thumb, bản in dùng ô theo cellType — GIỮ nguyên hành vi clone), `cover` (练 4em + Họ tên/Lớp/Năm học + title fallback "Sổ luyện viết chữ Hán"). Helpers private: `sheetHtml` (header "Họ tên: ______________ / Ngày: ____________" khi `nameDate`, title, footer "nhaihsk.com · facebook.com/groups/nhaihsk", class `print-page sheet card shadow-neo mx-auto w-full max-w-[794px] p-10 mb-8 print-area`), `metaLine`, `shapeCell`, `rowOf`, `traceRows`, `wordBlock`, `gridRows`, `flatChars`, `paginate`, `fadedChar`.
  - `export function estimatePages(state: CfState): number;` — estimator KHÔNG render: `stroke-order`/`big-char` → `ceil(chars/2)` / `ceil(chars/3)`; `vocab`/`vocab-check` → `ceil(chars/2)`; `grid-paper` → `ceil(max(fillRows+blankRows,14)/14)`; `cover` → 1; còn lại → 1; chars rỗng với các tpl paginate → 1.

- [ ] **Step 1: Write the failing test**

Tạo `app-next/src/lib/create-file/__tests__/svg-render.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { renderPages, estimatePages, renderStrokeSvg, cellShape, strokeDataOf } from "../svg-render";
import { cfDefaultsFor, cfDefaults } from "../types";

describe("renderPages — blank-grid (grid-paper) lưới 12×14 đúng ô", () => {
  it("1 trang đủ 14 hàng × 12 ô, mỗi ô div.grid-cell với --cell-c gray", () => {
    const pages = renderPages(cfDefaultsFor("grid-paper"));
    expect(pages).toHaveLength(1);
    const rows = pages[0].match(/style="grid-template-columns:repeat\(12,minmax\(0,1fr\)\)"/g)!;
    expect(rows).toHaveLength(14); // fillRows 1 + blankRows 0 → tối thiểu 1 trang đầy 14 hàng
    expect(pages[0].match(/grid-cell/g)!.length).toBe(12 * 14);
    expect(pages[0]).toContain("--cell-c:#9ca3af");
    expect(pages[0]).toContain("nhaihsk.com · facebook.com/groups/nhaihsk");
  });
  it("blankRows 28 → 3 trang (14/14/14)", () => {
    const st = { ...cfDefaultsFor("grid-paper"), fillRows: 14, blankRows: 28 };
    expect(renderPages(st)).toHaveLength(3);
    expect(estimatePages(st)).toBe(3);
  });
});

describe("renderPages — stroke-order nét đỏ bước nét", () => {
  it("mỗi chữ 1 block: meta VĨNH + polyline đỏ (#c23b22) ở ô bước nét cuối", () => {
    const pages = renderPages(cfDefaultsFor("stroke-order"));
    expect(pages).toHaveLength(1); // 6 chữ / 2
    expect(estimatePages(cfDefaultsFor("stroke-order"))).toBe(3);
    expect(pages[0]).toContain("VĨNH");
    expect(pages[0]).toContain('stroke="#c23b22"');
    expect(pages[0]).toContain("①"); // nhãn bước nét
    expect(pages[0]).toContain("Họ tên: ______________");
  });
});

describe("cell render", () => {
  it("cellShape theo cellType: mi → 2 chéo + chữ thập nét đứt; cuu-cung → chữ thập", () => {
    expect(cellShape({ ...cfDefaults(), cellType: "mi" })).toContain('stroke-dasharray="4 4"');
    expect(cellShape({ ...cfDefaults(), cellType: "cuu-cung" })).toMatch(/<line x1="50" y1="0"/);
    expect(cellShape({ ...cfDefaults(), cellType: "vuong" })).toBe("");
  });
  it("renderStrokeSvg mode k: nét > k ẩn, nét k đỏ; faint mờ 0.14", () => {
    expect(renderStrokeSvg("永", 1)).toContain('stroke-opacity="1"');
    expect(renderStrokeSvg("永", 1)).not.toContain('points="28,44'); // nét 3 bị ẩn
    expect(renderStrokeSvg("永", "faint")).toContain('stroke-opacity="0.14"');
    expect(strokeDataOf("カ")).toHaveLength(4); // genericStrokes fallback
  });
  it("cover: bìa 练 + Họ tên/Lớp/Năm học", () => {
    const p = renderPages(cfDefaultsFor("cover"));
    expect(p).toHaveLength(1);
    expect(p[0]).toContain("Sổ luyện viết chữ Hán");
    expect(p[0]).toContain("Năm học");
  });
});
```

- [ ] **Step 2: Run test verify fail**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/lib/create-file/__tests__/svg-render.test.ts`
Expected: FAIL — `Cannot find module '../svg-render'`

- [ ] **Step 3: Implement svg-render.ts**

Port từng hàm từ `clone/js/create-file.js` giữ nguyên chuỗi HTML/class:
- `renderStrokeSvg` ← `renderStrokeSVG` (dòng 176-189); `cellShape` ← `cellShape` (206-227, thay `CF.cellType` bằng tham số); `shapeCell(state, inner, extraStyle)` (228-231); `traceCharSpan` (272-285); `metaLine(state, c)` (191-197); `fadedChar` (41-44); `rowOf` (45-49); `traceRows` (288-312); `wordBlock` (314-323); `gridRows` (325-333); `flatChars` (335-345); `paginate` (427-435); `sheetHtml` (234-243 — thêm class `print-area` vào div sheet); `strokeBlock` (246-261); `bigBlock` (263-270); nhánh `buildPages` (347-425) map id giữ nguyên (`paragraph`, `lined-paper`, `grid-paper`, `cover`).
- Mọi hàm nhận `state: CfState` tham số đầu thay biến toàn cục `CF` — nội dung chuỗi KHÔNG đổi.
- `estimatePages` viết mới theo công thức ở Interfaces (đồng bộ `buildPages` paginate per=2/3 và grid-paper rowsPerPage=14).

- [ ] **Step 4: Run test verify pass**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/lib/create-file/__tests__/svg-render.test.ts`
Expected: PASS 6 tests.

- [ ] **Step 5: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src/lib/create-file/svg-render.ts app-next/src/lib/create-file/__tests__/svg-render.test.ts
git commit -m "feat(sp1-media): svg-render A4 — renderPages 9 template + estimatePages (port create-file.js buildPages)"
```

### Task 10: Catalog `/create-file` (G6) — 9 card SVG + banner GateGrow

**Files:**
- Create: `app-next/src/app/(app)/create-file/page.tsx`
- Create: `app-next/src/components/create-file/catalog-grid.tsx`
- Test: `app-next/src/components/create-file/__tests__/catalog-grid.test.tsx`

**Interfaces:**
- Consumes: `fileTemplates`, `templateGroups` (`@/content/templates` — Task 2); `useToast`.
- Produces:
  - `export default function CatalogGrid(): JSX.Element;` — client (cần toast cho link join): H1 "Tạo file" + pill "生成练习本" + sub "— Tạo bản in luyện viết chữ Hán theo thứ tự nét"; banner nền `#fdf6d8` class `no-print`: "Cần mã tải file để in. Tham gia nhóm Facebook Nhai HSK, mã n…" + link đỏ `#c23b22` "Tham gia nhóm để lấy mã" `href="https://www.facebook.com/groups/nhaihsk"` target `_blank`; 3 section `templateGroups` với h2 + grid `sm:grid-cols-2 lg:grid-cols-3`; card Link `/create-file/${t.id}`: khung `aspect-[3/4]` border-2 `#cfc4ae` nền trắng chứa `t.thumb` (svg `w-full h-full` qua `dangerouslySetInnerHTML`), `h3` tên, `p` mô tả.
  - Route `/create-file` SSG `metadata = { title: "Tạo file | Nhai HSK", description: "生成练习本 — Tạo bản in luyện viết chữ Hán theo thứ tự nét" }`.

- [ ] **Step 1: Write the failing test**

Tạo `app-next/src/components/create-file/__tests__/catalog-grid.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CatalogGrid from "../catalog-grid";

vi.mock("@/components/shell/toast-provider", () => ({
  useToast: () => (msg: string) => { (window as unknown as { __lastToast?: string }).__lastToast = msg; },
}));

describe("CatalogGrid (G6 — SPEC-16 §A)", () => {
  it("đủ 3 nhóm + 9 card link đúng tpl", () => {
    render(<CatalogGrid />);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(3);
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(9);
    expect(screen.getByRole("link", { name: /Luyện viết theo thứ tự nét/ })).toHaveAttribute("href", "/create-file/stroke-order");
    expect(screen.getByRole("link", { name: /Bìa vở luyện chữ/ })).toHaveAttribute("href", "/create-file/cover");
  });
  it("banner gate + link nhóm Facebook hiển thị; 9 SVG inline không ảnh ngoài", () => {
    const { container } = render(<CatalogGrid />);
    expect(screen.getByText(/Cần mã tải file để in/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Tham gia nhóm để lấy mã" })).toHaveAttribute("href", "https://www.facebook.com/groups/nhaihsk");
    expect(container.querySelectorAll("svg")).toHaveLength(9);
    expect(container.querySelector('svg image, svg [href*="http"]')).toBeNull();
  });
});
```

- [ ] **Step 2: Run test verify fail**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/components/create-file/__tests__/catalog-grid.test.tsx`
Expected: FAIL — `Cannot find module '../catalog-grid'`

- [ ] **Step 3: Implement CatalogGrid + route**

`catalog-grid.tsx` (client): port `bannerHtml` + `renderCatalog` của `create-file.js:121-157` sang JSX — banner theo đúng text clone; section map `templateGroups` → `fileTemplates.filter(t => t.group === g.id)`.

`app-next/src/app/(app)/create-file/page.tsx`:

```tsx
import type { Metadata } from "next";
import CatalogGrid from "@/components/create-file/catalog-grid";

export const metadata: Metadata = { title: "Tạo file | Nhai HSK", description: "生成练习本 — Tạo bản in luyện viết chữ Hán theo thứ tự nét" };

export default function CreateFilePage() {
  return <main><CatalogGrid /></main>;
}
```

- [ ] **Step 4: Run test verify pass**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/components/create-file/__tests__/catalog-grid.test.tsx`
Expected: PASS 2 tests.

- [ ] **Step 5: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src/app/\(app\)/create-file/page.tsx app-next/src/components/create-file
git commit -m "feat(sp1-media): /create-file catalog 9 mẫu / 3 nhóm + banner GateGrow (G6)"
```

### Task 11: Form + preview `/create-file/[tpl]` (G7) — useReducer 18 keys, 7 nhóm, switcher

**Files:**
- Create: `app-next/src/app/(app)/create-file/[tpl]/page.tsx`
- Create: `app-next/src/components/create-file/create-file-client.tsx`
- Create: `app-next/src/components/create-file/create-file-form.tsx`
- Create: `app-next/src/components/create-file/a4-preview.tsx`
- Test: `app-next/src/components/create-file/__tests__/create-file-form.test.tsx`

**Interfaces:**
- Consumes: `templateById`, `fileTemplates` (`@/content/templates`); `cfReducer`, `CfState`, `CfAction`, `cfDefaultsFor`, `mergeCfState`, `loadCfState`, `persistCfState` (Task 8); `renderPages`, `estimatePages` (Task 9); `useToast`.
- Produces:
  - Route SSG `generateStaticParams` → 9 tpl; `notFound()` cho id lạ; metadata title `t.name + " | Tạo file | Nhai HSK"`.
  - `export default function A4Preview({ state }: { state: CfState }): JSX.Element;` — client, thuần render: `<section aria-label="Xem trước bản in" data-testid="preview">` map `renderPages(state)` → `<div className="print-page sheet card shadow-neo mx-auto w-full max-w-[794px] p-10 mb-8 print-area" dangerouslySetInnerHTML={{ __html: page }} />` (renderer đã bọc sheetHtml — chi tiết: `renderPages` trả NỘI DUNG từng trang, wrapper class đặt ở đây; chỉnh `svg-render.sheetHtml` chỉ xuất head + body + footer, KHÔNG bọc div sheet).
  - `export default function CreateFileForm({ state, dispatch, tplId }: { state: CfState; dispatch: (a: CfAction) => void; tplId: string }): JSX.Element;` — ĐỦ 7 nhóm card + chân form như spec 16 §B (chi tiết step 3).
  - `export default function CreateFileClient({ tplId, name, desc, group }: { tplId: string; name: string; desc: string; group: string }): JSX.Element;` — sở hữu `useReducer(cfReducer, undefined, init)` với `init()` = `mergeCfState(loadCfState(), tplId)` rồi đặt `tpl: tplId`; `useEffect` persist qua `persistCfState` mỗi khi state đổi (kể cả lần đầu — khớp `renderForm` gọi `persist()`); header tầng 1 (breadcrumb "‹ Thư viện mẫu", H1 name, badge `data-testid="pages-badge"` = `estimatePages(state) + " trang"`, slot `<PrintButton/>` Task 12); grid 2 cột `lg:grid-cols-[1fr_360px]`: trái `<A4Preview>`, phải form + switcher; switcher "Mẫu in cùng loại": các tpl cùng group Link `/create-file/<id>` + pill-active cho tpl hiện tại, sub "Đổi mẫu không mất nội dung".
  - Vào catalog reset CF trong bộ nhớ nhưng KHÔNG ghi đè sessionStorage: `catalog-grid`/route catalog KHÔNG đụng storage (chỉ form ghi) — hành vi `create-file.js:830-835` đạt được do catalog không persist.

- [ ] **Step 1: Write the failing test**

Tạo `app-next/src/components/create-file/__tests__/create-file-form.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateFileClient from "../create-file-client";

function renderTpl(tpl: string) {
  return render(<CreateFileClient tplId={tpl} name="Giấy ô trống" desc="Chọn loại ô…" group="paper" />);
}
beforeEach(() => sessionStorage.clear());

describe("CreateFileForm (G7 — 7 nhóm)", () => {
  it("đủ 7 nhóm heading với mặc định gốc checked: Điền tự, gray, 12, 1, 0, 3/12, Khải thư, CNstrokeorder, Tô mờ, Pinyin, Nghĩa", () => {
    renderTpl("grid-paper");
    for (const h of ["Từ vựng cần luyện", "Trang", "Loại ô", "Màu ô", "Bố cục", "Chữ", "Hiển thị"]) {
      if (h === "Từ vựng cần luyện") return; // grid-paper không có nhóm 1 (CHARS_TPLS)
    }
    expect(screen.getByRole("heading", { name: "Trang" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Loại ô" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Màu ô" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Bố cục" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Chữ" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Hiển thị" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Điền tự" })).toBeChecked();
    expect(screen.getByRole("radio", { name: /gray/ })).toBeChecked();
    expect(screen.getByLabelText("Số ô mỗi hàng")).toHaveTextContent("12");
    expect(screen.getByLabelText("Số hàng tô")).toHaveTextContent("1");
    expect(screen.getByLabelText("Số hàng trống")).toHaveTextContent("0");
    expect(screen.getByRole("checkbox", { name: "Khải thư" })).toBeChecked();
    expect(screen.getByRole("radio", { name: /CNstrokeorder/ })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Tô mờ" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Pinyin" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Nghĩa" })).toBeChecked();
  });
  it("tpl vocab có nhóm 1: 4 từ mặc định + đếm '4 từ sẽ có trong bản in' + Xóa tất cả", () => {
    renderTpl("vocab");
    expect(screen.getByRole("heading", { name: "Từ vựng cần luyện" })).toBeTruthy();
    expect(screen.getByText("4 từ sẽ có trong bản in")).toBeTruthy();
    expect(screen.getByPlaceholderText("Nghĩa…")).toBeTruthy();
  });
  it("đổi tuỳ chọn → preview + badge cập nhật NGAY + persist sessionStorage", async () => {
    const user = userEvent.setup();
    renderTpl("grid-paper");
    expect(screen.getByTestId("pages-badge")).toHaveTextContent("1 trang");
    await user.click(screen.getByRole("radio", { name: "Ô vuông" }));
    expect(sessionStorage.getItem("nhai.cf.state")).toContain('"cellType":"vuong"');
    await user.click(screen.getByLabelText("Số hàng trống").parentElement!.querySelector('[data-dir="1"]')!);
    expect(screen.getByLabelText("Số hàng trống")).toHaveTextContent("1");
  });
  it("sửa nghĩa input → state persist; Khôi phục mặc định trả default + toast", async () => {
    const user = userEvent.setup();
    renderTpl("vocab");
    const firstMeaning = screen.getAllByPlaceholderText("Nghĩa…")[0];
    await user.clear(firstMeaning);
    await user.type(firstMeaning, "chào hỏi");
    expect(sessionStorage.getItem("nhai.cf.state")).toContain("chào hỏi");
    await user.click(screen.getByText("Khôi phục mặc định"));
    expect((window as unknown as { __lastToast?: string }).__lastToast).toBe("Đã khôi phục mặc định.");
    expect(sessionStorage.getItem("nhai.cf.state")).not.toContain("chào hỏi");
  });
  it("restore từ sessionStorage (reload giả lập) giữ state cũ", () => {
    sessionStorage.setItem("nhai.cf.state", JSON.stringify({ ...JSON.parse(JSON.stringify({})), perRow: 9 }));
    renderTpl("grid-paper");
    expect(screen.getByLabelText("Số ô mỗi hàng")).toHaveTextContent("9");
  });
  it("Format bằng AI mock → toast 'Đã format N từ'", async () => {
    const user = userEvent.setup();
    renderTpl("vocab");
    await user.click(screen.getByText("Format bằng AI"));
    expect((window as unknown as { __lastToast?: string }).__lastToast).toBe("Đã format 4 từ");
  });
});
```

(Ghi chú cho executor: mock `useToast` như Task 4; test "restore" set `sessionStorage` full-state thật — merge `cfDefaults()` với `perRow: 9`.)

- [ ] **Step 2: Run test verify fail**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/components/create-file/__tests__/create-file-form.test.tsx`
Expected: FAIL — `Cannot find module '../create-file-client'`

- [ ] **Step 3: Implement CreateFileForm (7 nhóm, port formHtml `create-file.js:553-587`)**

`create-file-form.tsx` — client, nhận `{ state, dispatch, tplId }`. Đúng 7 card + chân form:

1. **Từ vựng cần luyện** (chỉ khi `tplId` ∈ `{stroke-order, big-char, vocab, vocab-check, pinyin-write, paragraph, lined-paper}` — set `CHARS_TPLS` port `create-file.js:505`): 3 nút "Hướng dẫn nhập từ vựng" (modal hướng dẫn: text port `helpModalBody` dòng 537-543), "Nhập vào danh sách" (modal textarea + "Thêm vào danh sách" → `dispatch({type:"addChars", chars: lines.map(parseLine).filter(Boolean)}` + toast "Đã thêm N từ."/"Không có từ mới nào được thêm."), "Format bằng AI" → `dispatch({type:"formatAiMock"})` + `toast("Đã format " + state.chars.length + " từ")`; danh sách row: chữ Hán to / pinyin + hv IN HOA / `<input placeholder="Nghĩa…" onChange → dispatch setMeaning>` / nút ✕ hover `opacity-0 group-hover:opacity-100`; footer "N từ sẽ có trong bản in" + "Xóa tất cả" (`dispatch clearChars` + toast "Đã xoá tất cả từ.").
2. **Trang**: input Tiêu đề (`dispatch set key "title"`) + checkbox "Tiêu đề + Họ tên/Ngày" (`nameDate`, mặc định checked).
3. **Loại ô**: 5 radio `Điền tự / Mễ tự / Ô vuông / Hồi cung / Cửu cung` → `dispatch set cellType`.
4. **Màu ô**: 4 radio `🟩 green / 🟥 red / 🟦 blue / ⬜ gray`.
5. **Bố cục**: 3 stepper (label + `data-testid` qua `getByLabelText`) "Số ô mỗi hàng" (6–16) / "Số hàng tô" (0–12) / "Số hàng trống" (0–12) — nút −/+ `data-dir` → `dispatch {type:"step", key, dir, min, max}`; slider "Số từ mờ" 0–12 → `set faintCount`.
6. **Chữ**: checkbox Khải thư/Hành thư (`setScript`); radio "Nguồn nét" `笔顺 CNstrokeorder 永远` / `清风体 永远`; checkbox group "Kiểu chữ tô" Tô mờ/Chữ rỗng/Rỗng nét đứt/Nét đứt mảnh (`setTraceStyle`); slider "Độ đậm" 0–100 (`opacity`), "Cỡ chữ" 50–120 (`fontSize`).
7. **Hiển thị**: checkbox Pinyin (`showPinyin`) · Nghĩa (`showMeaning`).

Chân form: nút "Khôi phục mặc định" (`dispatch {type:"reset", tpl: tplId}` + toast "Đã khôi phục mặc định.") + ghi chú "Bấm In rồi chọn “Lưu dưới dạng PDF” trong hộp thoại của trình duyệt." Modal chung 1 cái (`data-modal`) port `modalShell` (dòng 530-536).

- [ ] **Step 4: Implement A4Preview + CreateFileClient + route**

- `a4-preview.tsx` như Interfaces (section `aria-label="Xem trước bản in"` + map `renderPages(state)` bọc div `print-page sheet card shadow-neo mx-auto w-full max-w-[794px] p-10 mb-8 print-area`).
- `create-file-client.tsx`: reducer init từ `loadCfState()`; `useEffect(() => persistCfState(state), [state])`; header + layout 2 cột + form + switcher (cùng `group`, Link giữ state — điều hướng route mới sẽ init lại từ sessionStorage nên state giữ nguyên).
- Route `[tpl]/page.tsx`: `generateStaticParams` 9 tpl, `templateById` → `notFound()` nếu null, render `<CreateFileClient tplId={t.id} name={t.name} desc={t.desc} group={t.group} />`.
- Chỉnh `svg-render.ts`: `sheetHtml` bỏ div bọc (head + content + footer thôi) để wrapper ở `a4-preview` — chạy lại test Task 9 (expect `grid-cell` đếm vẫn đúng; bỏ assert chứa "nhaihsk.com" trong wrapper — giữ ở body sheet).

- [ ] **Step 5: Run test verify pass**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/components/create-file src/lib/create-file`
Expected: PASS toàn bộ (Task 8–11).

- [ ] **Step 6: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src/app/\(app\)/create-file/\[tpl\] app-next/src/components/create-file app-next/src/lib/create-file/svg-render.ts
git commit -m "feat(sp1-media): /create-file/[tpl] form 7 nhóm useReducer + preview A4 tức thì + switcher giữ state (G7)"
```

### Task 12: In / Lưu PDF + gate FREEHSK (G8) — `print-button` + `freehsk-gate`

**Files:**
- Create: `app-next/src/components/create-file/print-button.tsx`
- Create: `app-next/src/components/create-file/freehsk-gate.tsx`
- Modify: `app-next/src/components/create-file/create-file-client.tsx` — thay slot nút in bằng `<PrintButton />`
- Test: `app-next/src/components/create-file/__tests__/print-gate.test.tsx`, `app-next/src/app/__tests__/print-css.test.ts`

**Interfaces:**
- Consumes: `hasFileCode`, `setFileCode`, `isLoggedInMock` (Task 8); `useToast`; `@media print` selectors `[data-shell]`, `.no-print`, `.print-area` đã có trong `app-next/src/app/globals.css` (plan learning-core Task 3 port theme.css:85-89); shell (Topbar/Sidebar) nằm trong phần tử `data-shell` của layout (learning-core Task 10).
- Produces:
  - `export default function PrintButton(): JSX.Element;` — client: nếu `isLoggedInMock() || hasFileCode()` → nút `btn-main` "🖨 In / Lưu PDF" `onClick={() => window.print()}`; nếu chỉ có fileCode nhưng chưa mock-login → vẫn "🖨 In / Lưu PDF" (canPrint = login OR code, đúng `create-file.js:117-118`); chưa có gì → nút "🔒 Đăng nhập để in" mở gate. Nghe event `nhai:progress` + custom `nhai:auth` (window) để re-sync sau login/redeem (thay `setTimeout(syncPrintBtn, 300)` của clone bằng listener ngay khi click document? — GIỮ đơn giản: re-check mỗi khi component mount lại do state đổi + listen `document` click debounce 300ms port dòng 819).
  - `export default function FreehskGate({ onUnlocked }: { onUnlocked: () => void }): JSX.Element;` — modal/khối inline: input `data-testid="code-input"` placeholder "Nhập mã" + nút "Mở khóa in" `data-testid="code-submit"`; mã `FREEHSK` (so sánh chính xác) → `setFileCode()` + `onUnlocked()` + toast "Đã mở khóa in." ; sai → toast "Mã không đúng. Mã nằm ở mô tả nhóm Facebook". Badge "Đăng nhập để in" khi chưa mock-login → trigger login modal của shell qua custom event `window.dispatchEvent(new CustomEvent("nhai:open-login"))` (shell mock login của plan learning-core mở modal theo event này — nếu shell chưa expose event, nút badge chỉ hiện toast "Chức năng đăng nhập mock nằm ở menu trên." — ghi rõ để executor kiểm tra shell trước).
  - Test print CSS: vitest đọc `globals.css` assert `@media print` chứa `[data-shell]`, `.no-print`, `.print-area` (không sửa globals.css).

- [ ] **Step 1: Write the failing tests**

Tạo `app-next/src/app/__tests__/print-css.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("@media print trong globals.css (port theme.css:85-89)", () => {
  const css = readFileSync(join(__dirname, "../../../src/app/globals.css"), "utf8");
  it("giữ selector semantic data-shell / no-print / print-area", () => {
    const block = css.slice(css.indexOf("@media print"));
    expect(block).toContain("[data-shell]");
    expect(block).toContain(".no-print");
    expect(block).toContain(".print-area");
    expect(block).toContain("display: none !important");
  });
});
```

Tạo `app-next/src/components/create-file/__tests__/print-gate.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PrintButton from "../print-button";
import FreehskGate from "../freehsk-gate";

vi.mock("@/components/shell/toast-provider", () => ({
  useToast: () => (msg: string) => { (window as unknown as { __lastToast?: string }).__lastToast = msg; },
}));
beforeEach(() => { localStorage.clear(); });

describe("PrintButton gate (G8 — mock đúng clone)", () => {
  it("chưa login + chưa mã → '🔒 Đăng nhập để in'; sau khi unlock (nhai.fileCode=1) → '🖨 In / Lưu PDF' gọi window.print", async () => {
    const user = userEvent.setup();
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    const { rerender } = render(<PrintButton />);
    expect(screen.getByText("🔒 Đăng nhập để in")).toBeTruthy();
    rerender(<PrintButton key="unlocked" />);
    localStorage.setItem("nhai.fileCode", "1");
    rerender(<PrintButton key="unlocked2" />);
    await user.click(screen.getByText("🖨 In / Lưu PDF"));
    expect(printSpy).toHaveBeenCalled();
  });
});

describe("FreehskGate", () => {
  it("mã FREEHSK → unlock + lưu nhai.fileCode; sai mã → toast đúng nội dung", async () => {
    const user = userEvent.setup();
    const onUnlocked = vi.fn();
    render(<FreehskGate onUnlocked={onUnlocked} />);
    await user.type(screen.getByTestId("code-input"), "WRONG");
    await user.click(screen.getByTestId("code-submit"));
    expect((window as unknown as { __lastToast?: string }).__lastToast).toBe("Mã không đúng. Mã nằm ở mô tả nhóm Facebook");
    expect(onUnlocked).not.toHaveBeenCalled();
    await user.clear(screen.getByTestId("code-input"));
    await user.type(screen.getByTestId("code-input"), "FREEHSK");
    await user.click(screen.getByTestId("code-submit"));
    expect(localStorage.getItem("nhai.fileCode")).toBe("1");
    expect(onUnlocked).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test verify fail**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/app/__tests__/print-css.test.ts src/components/create-file/__tests__/print-gate.test.tsx`
Expected: FAIL — module không tồn tại (`print-css.test` có thể PASS ngay nếu learning-core đã port đúng — khi đó chỉ là regression guard).

- [ ] **Step 3: Implement PrintButton + FreehskGate**

- `print-button.tsx`: state `[unlocked, setUnlocked]` init `isLoggedInMock() || hasFileCode()`; re-sync qua `document.addEventListener("click", handler)` debounce 300ms (port dòng 819) + cleanup; `unlocked` → nút in `window.print()`, else nút "🔒 Đăng nhập để in" mở `<FreehskGate>`.
- `freehsk-gate.tsx`: khối card nền `#fdf6d8` `no-print` với text hướng dẫn + input + nút submit (logic như test). Shape UI giữ nguyên để UPG-4 chỉ thay logic check (spec 12 G8).

- [ ] **Step 4: Run test verify pass**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/app/__tests__/print-css.test.ts src/components/create-file/__tests__/print-gate.test.tsx`
Expected: PASS toàn bộ.

- [ ] **Step 5: Kiểm tra bản in A4 thủ công (acceptance G8.2) + commit**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm dev` → mở `/create-file/blank-grid` → DevTools More tools → Rendering → Emulate CSS media `print`: form + topbar biến mất (form `no-print`, topbar trong `[data-shell]`), preview giữ nguyên, đúng 1 sheet `max-w-[794px]` lưới 12×14; làm tương tự `/create-file/stroke-order` thấy nét đỏ. Sau đó:
Commit:

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src/components/create-file app-next/src/app/__tests__/print-css.test.ts
git commit -m "feat(sp1-media): print/PDF window.print + gate FREEHSK mock nhai.fileCode (G8)"
```

### Task 13: `/certificate-test` (G9) + Playwright smoke tổng

**Files:**
- Create: `app-next/src/app/(app)/certificate-test/page.tsx`
- Modify: `app-next/tests/e2e/media-documents-smoke.spec.ts` — thêm 2 describe
- Test: `app-next/src/app/(app)/certificate-test/__tests__/certificate-page.test.tsx` (nội dung SSG — test render trực tiếp component)

**Interfaces:**
- Consumes: `certificateData: { hsk: CertificateCard[]; hskk: CertificateCard[] }` từ `@/content/certificates` (plan sp1-social-legal Task 1 — `CertificateCard = { logo, name, zh, desc }`); `useToast`.
- Produces: route SSG `/certificate-test`, `metadata = { title: "Luyện thi chứng chỉ | Nhai HSK", description: "考试对策 — Luyện thi HSK và các chứng chỉ tiếng Trung" }`. Grid 7 card HSK ("HSK 1–9 — Chuẩn HSK 3.0" + mô tả "Chuẩn năng lực Hán ngữ quốc tế 2021 “ba bậc chín cấp”: sơ đẳng 1–3, trung đẳng 4–6, cao đẳng 7–9") + 3 card HSKK ("HSKK — Kỳ thi nói" + mô tả "Kỳ thi nói riêng 3 cấp (sơ – trung – cao) — thường đăng ký kèm HSK để chứng minh kỹ năng nói"); card: logo vuông nền đỏ nhạt + h3 tên + dòng zh + desc + badge "Sắp ra mắt"; bấm card → toast "Chứng chỉ này sắp ra mắt — hãy quay lại sau nhé!".

- [ ] **Step 1: Write the failing test**

Tạo `app-next/src/app/(app)/certificate-test/__tests__/certificate-page.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CertificatePage from "../page";

vi.mock("@/components/shell/toast-provider", () => ({
  useToast: () => (msg: string) => { (window as unknown as { __lastToast?: string }).__lastToast = msg; },
}));

describe("CertificatePage (G9 — 10 card coming-soon)", () => {
  it("2 section + đúng 10 card với logo H1…7-9, K1…K3", () => {
    render(<CertificatePage />);
    expect(screen.getByRole("heading", { name: "HSK 1–9 — Chuẩn HSK 3.0" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "HSKK — Kỳ thi nói" })).toBeTruthy();
    expect(screen.getAllByText("Sắp ra mắt")).toHaveLength(10);
    expect(screen.getByText("H1")).toBeTruthy();
    expect(screen.getByText("7-9")).toBeTruthy();
    expect(screen.getByText("K3")).toBeTruthy();
    expect(screen.getByText("11.092 từ, 3.000 chữ Hán — bậc cao đẳng: một bài thi chung xếp cấp 7/8/9, đủ 5 kỹ năng nghe nói đọc viết dịch.")).toBeTruthy();
  });
  it("bấm card → toast coming-soon", async () => {
    const user = userEvent.setup();
    render(<CertificatePage />);
    await user.click(screen.getAllByText("Sắp ra mắt")[0]);
    expect((window as unknown as { __lastToast?: string }).__lastToast).toBe("Chứng chỉ này sắp ra mắt — hãy quay lại sau nhé!");
  });
});
```

- [ ] **Step 2: Run test verify fail**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run "src/app/(app)/certificate-test"`
Expected: FAIL — `Cannot find module '../page'`

- [ ] **Step 3: Implement page (SSG server + client nhỏ cho toast)**

`page.tsx` — server component import `certificateData`, render 2 section; card là component client nhỏ ngay trong file không được (server không có onClick) — tách inline: tạo `app-next/src/app/(app)/certificate-test/card.tsx` (`"use client"`, props `{ logo, name, zh, desc }`, button `cursor-default` + badge "Sắp ra mắt" + onClick toast). Copy text mô tả từng section NGUYÊN VĂN từ SPEC-07 mục 2 (đã liệt kê đủ ở Interfaces).

- [ ] **Step 4: Run test verify pass**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run "src/app/(app)/certificate-test"`
Expected: PASS 2 tests.

- [ ] **Step 5: Thêm Playwright smoke tổng (catalog → form → in; certificate; SSG)**

Bổ sung cuối `app-next/tests/e2e/media-documents-smoke.spec.ts`:

```ts
test.describe("G6–G9 create-file + certificate smoke", () => {
  test("catalog 9 mẫu → form stroke-order → gate chặn → FREEHSK mở khoá → window.print (stub)", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __printed: boolean }).__printed = false;
      window.print = () => { (window as unknown as { __printed: boolean }).__printed = true; };
    });
    await page.goto("/create-file");
    await expect(page.getByRole("heading", { level: 3 })).toHaveCount(9);
    await expect(page.getByText(/Cần mã tải file để in/)).toBeVisible();
    await page.click('a[href="/create-file/stroke-order"]');
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Luyện viết theo thứ tự nét");
    await page.click("text=🔒 Đăng nhập để in");
    await page.getByTestId("code-input").fill("FREEHSK");
    await page.getByTestId("code-submit").click();
    await expect(page.getByText("🖨 In / Lưu PDF")).toBeVisible();
    await page.getByText("🖨 In / Lưu PDF").click();
    const printed = await page.evaluate(() => (window as unknown as { __printed: boolean }).__printed);
    expect(printed).toBe(true);
    const code = await page.evaluate(() => localStorage.getItem("nhai.fileCode"));
    expect(code).toBe("1");
  });
  test("certificate-test prerender 10 card", async ({ page }) => {
    await page.goto("/certificate-test");
    await expect(page.getByText("Sắp ra mắt")).toHaveCount(10);
  });
});
```

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm playwright test tests/e2e/media-documents-smoke.spec.ts`
Expected: PASS 5 tests (3 player + 2 mới).

- [ ] **Step 6: Verify SSG + commit cuối**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm build && pnpm test && pnpm typecheck && pnpm lint`
Expected: build + toàn bộ vitest + typecheck + lint xanh.
Commit:

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src/app/\(app\)/certificate-test app-next/tests/e2e/media-documents-smoke.spec.ts
git commit -m "feat(sp1-media): /certificate-test 10 card coming-soon + e2e smoke media-documents (G9)"
```

---

# UPG (ngoài phạm vi SP1 — ghi nhận, KHÔNG implement)

- **UPG-3:** thư viện video thật + phụ đề `R2_DATA shadowing-subs/{videoId}.json` (fetch client-side giữ shape `SubtitleSentence`), optional `shadowing_progress` sync qua outbox `POST /users/sync` (00 §5); `GET /shadowing/catalog` chỉ khi >200 video.
- **UPG-4:** gate thật — `GET /entitlements/me` product `file_print`, `POST /codes/redeem` (free_codes), MoMo/Stripe (00 §8); migrate `nhai.fileCode` cũ → nợ redeem ở SP4. UI `FreehskGate` giữ shape hiện tại.
- **UPG-5:** "Format bằng AI" → `POST /ai/format-vocab` (00 §8, rate-limit class `ai`).
- **G9 thật:** quyết định riêng sau SP5.

## Self-review

- **Spec coverage (spec 12):** G4 → Task 1, 4; G5 → Task 3, 5, 6, 7 (player postMessage/polling/TTS fallback/dictation/ recorder+cleanup/phím tắt/video liên quan/breadcrumb); G6 → Task 2, 10; G7 → Task 8, 11 (18 keys, 7 nhóm, defaults gốc, sessionStorage `nhai.cf.state`, switcher giữ state, catalog không ghi đè); G8 → Task 9, 12 (preview 9 mẫu, window.print, đếm trang, gate FREEHSK + login badge, print CSS selector giữ nguyên); G9 → Task 13. Feature inventory G4–G9 `[PORT]` đủ. Ranh giới SP1: gate mock, format-AI mock, báo lỗi toast, thumbnail placeholder — đúng spec 1.3.
- **Placeholder scan:** Không có "TBD/TODO/implement later". Các khối ghi "port từ dòng X-Y kèm công thức" đều trỏ đúng file+số dòng nguồn và chuỗi output bắt buộc được test khẳng định (ví dụ `--cell-c:#9ca3af`, `stroke="#c23b22"`, 12×14 ô, toast verbatim) — executor không phải đoán nội dung.
- **Type consistency:** `ShadowingVideo/SubtitleSentence` (Task 1) dùng thống nhất Task 4/5/6/7; `FileTemplate` (Task 2) dùng Task 10/11; `CfState/CfAction/cfReducer/mergeCfState/parseLine` (Task 8) dùng Task 9/11/12; `renderPages/estimatePages` (Task 9) dùng Task 11; `normDict/diffNormalized` (Task 3) dùng Task 6; `useTts`/`useToast`/`stripTones` khớp contract plan learning-core; `certificateData` khớp plan sp1-social-legal Task 1. `sheetHtml` đổi responsibility (wrapper ở `A4Preview`) được cập nhật nhất quán ở Task 11 step 4 kèm yêu cầu chạy lại test Task 9.
- **Đồng bộ plan anh em:** Không tạo `globals.css`, `layout.tsx`, shell, `content/certificates.ts`, `not-found.tsx` (thuộc learning-core/social-legal); e2e đặt `app-next/tests/e2e/` khớp social-legal; login modal mở qua event `nhai:open-login` với fallback ghi rõ nếu shell chưa expose.
