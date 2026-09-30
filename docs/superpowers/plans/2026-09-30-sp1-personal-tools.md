# SP1 Personal Tools Implementation Plan (Next.js + Cloudflare Workers)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port phần SP1 "personal tools" của app Nhai HSK từ clone tĩnh (`clone/`) sang Next.js App Router: F1 review dashboard (donut largest-remainder + bar 7 ngày), F2 progress (XP/streak/heatmap 12 tháng), F3–F5 sổ tay vocab/grammar/notebook CRUD, F6 login gate 🔒 mock, G1 dictionary 3 kiểu tìm + modal vẽ-tìm, G2 hanzi phân tích + canvas vẽ + stroke animation, G3 reading karaoke TTS — 9 route, deploy Workers xanh.

**Architecture:** Mọi trang trong domain này là client-heavy (tabs, canvas, TTS, modal) → server page chỉ chứa metadata + gate, nội dung là client component. Data content là TS modules build-time (`src/content/*`); tiến độ đi qua `ProgressStore` (mở rộng decks/vocabBook/mockLogin), không đụng localStorage trực tiếp ngoài store. Canvas/donut/heatmap giữ imperative trong `useEffect`/`useRef` với cleanup đầy đủ; karaoke dùng token `gen++` huỷ timer/utterance cũ.

**Tech Stack:** Next.js App Router + TypeScript strict + Tailwind v4 (`@theme`), pnpm, Vitest + jsdom + @testing-library/react, Playwright, `@opennextjs/cloudflare` + wrangler.

**Spec:** `docs/superpowers/specs/fullstack/11-personal-tools.md` (spec chính), `docs/superpowers/specs/fullstack/00-platform-data.md` (canonical — SP1 chỉ dùng localStorage), `docs/superpowers/specs/2026-09-30-hsk-feature-inventory.md` (F1–F6, G1–G3 `[PORT]`), clone specs `clone/specs/SPEC-03-hanzi.md`, `SPEC-09-dictionary-static.md`, `SPEC-11-progress-stats.md`, `SPEC-12-my-vocab-decks.md`, `SPEC-17-review-stats.md`, `SPEC-18-notebooks.md`.

## Global Constraints

- Làm việc trong `app-next/` đã scaffold bởi plan anh em `2026-09-30-sp1-learning-core.md` (scaffold, theme Tailwind v4, `ProgressStore` + `useProgress`, `useTts`, shell + LoginModal, route lesson). KHÔNG scaffold lại, KHÔNG sửa shell/content của plan đó ngoài 1 điểm đồng bộ ghi rõ ở Task 1 (Step 6).
- Mọi localStorage key giữ nguyên `nhai.*`: `nhai.decks`, `nhai.notebooks`, `nhai.vocabBook`, `nhai.mockLogin`, `nhai.xp`, `nhai.today`, `nhai.heat`, `nhai.streak`, `nhai.srs.*`, `nhai.pageDone`. Shape `nhai.decks`/`nhai.notebooks` = **mảng** `[{id, name, rows, updatedAt}]` (đúng clone `notebook.js`, để migration 00 §3.5 đọc được).
- Copy tiếng Việt / tiếng Trung giữ NGUYÊN VĂN từ `clone/js/*.js` + `clone/js/data/*.js` — không dịch lại, không sửa dấu câu (kể cả `hanviet` thường trong rows mẫu).
- Dùng theme classes đã port: `.card .btn-main .btn-ghost .pill .pill-active .shadow-neo .grid-cell .modal-backdrop .zh` + `text-[var(--nhai-muted)]` v.v. Không thêm Tailwind CDN.
- Không fetch network cho content — import từ `@/content/*`. `?q=` dictionary cập nhật bằng `window.history.replaceState` (F5 giữ kết quả); `?char=` hanzi → route `/hanzi/[char]` (SSG `generateStaticParams`).
- Mọi component có state/event là client component (`"use client"` đầu file). Server page chỉ có `export const metadata` / `generateMetadata` + render client.
- Conversion patterns: `NHAI.el('<div …>')` → JSX; `NHAI.toast(...)` → `const toast = useToast(); toast(...)`; `NHAI.speak(x, "zh-CN")` → `const { speak } = useTts(); speak(x, { lang: "zh-CN" })`; `NHAI.isLoggedIn()` → `progressStore.isLoggedIn()`; `NHAI.DrawPad.create(host, opts)` → `<DrawPad …/>`; `NHAI.DrawModal.open(cb)` → `<DrawModal onResult={cb}/>`; `NHAI.q("q")` → `useSearchParams()` bọc `<Suspense>`.
- Canvas/pointer listeners/rAF/TTS: thêm trong `useEffect`, dọn trong return (`removeEventListener`, `cancelAnimationFrame`, `clearInterval`/`clearTimeout`, `speechSynthesis.cancel()`). Karaoke huỷ bằng token `gen++`.
- Command chạy từ `app-next/`: `pnpm vitest run <path>`, `pnpm test:e2e <path>`, `pnpm typecheck`, `pnpm lint`. Mỗi task commit riêng theo message ghi trong step cuối.
- **SP1 đúng:** nhận diện vẽ giả (你), rank `14594 − xp`, gate mock `nhai.mockLogin`, dictionary 20 entries, chỉ 你 7 nét thật. UPG-2/3/5 KHÔNG làm — chỉ ghi ở "Future phases".

## Phụ thuộc / phối hợp plan anh em

- **Consumes từ plan `2026-09-30-sp1-learning-core.md` (đã viết, không viết lại):**
  - `app-next/src/lib/store/progress-store.ts`: `export const progressStore: ProgressStore` với `getXp()`, `addXp(n)`, `toggleSrs(key)`, `addSrsBatch(keys)`, `getSrs(key)`, `listPageDone(book?)`; `export type SrsItem = { key: string; status: SrsStatus; dueAt: number; reviewCount: number; lastReviewedAt: number | null; updatedAt: number }`; `export function useProgress(): { xp: number }` (subscribe event `nhai:progress` — mọi ghi store phải dispatch event này).
  - `app-next/src/lib/store/decks.ts`: `export function getDeck(deckId: string): Deck | null`, `export function listDecks(): Deck[]`, `export type Deck = { id: string; name: string; rows: { hanzi: string; pinyin?: string; hanViet?: string; meaning?: string; exampleZh?: string }[] }` — plan anh em đã được đồng bộ sang shape mảng `nhai.decks` của clone; Task 1 của plan này chỉ XÁC NHẬN shape mảng bằng test + mở rộng đọc qua `progressStore.listDecks("vocab")`.
  - `app-next/src/lib/tts/use-tts.ts`: `useTts(): { speak: (text: string, opts?: { lang?: "zh-CN" | "vi-VN"; rate?: number; onEnd?: () => void }) => void; cancel: () => void; speaking: boolean }`.
  - `app-next/src/lib/pinyin-utils.ts`: `stripTones(s: string): string`.
  - `app-next/src/components/shell/login-modal.tsx`: `useLoginModal(): { isOpen: boolean; openLogin: () => void; close: () => void }` + `toast-provider.tsx`: `useToast(): (msg: string) => void`.
  - `app-next/src/content/vocab.ts`: `vocab: Record<string, Record<string, VocabLesson>>` (review dùng để suy diễn kind + hiện hanzi card); route `/lesson/custom/[deckId]` (F4/F5 deck học qua lesson custom).
  - Route group `app-next/src/app/(app)/layout.tsx` (container `max-w-5xl`).
- **Producing cho plan khác:** không (plan này là lá trong SP1; link vào `/leaderboard` là route của plan sp1-social-legal — link được, không assert 200 trong e2e).

## Future phases (KHÔNG làm trong plan này — không viết task)

- **UPG-2 (SP2):** F1 đọc `srs_states` thật qua `GET /users/snapshot`; F2 XP/streak/heatmap từ `xp_daily`, rank từ leaderboard thật (bỏ `14594 − xp`); F3–F5 CRUD `decks`/`deck_rows` qua endpoint 00 §8 (LWW theo `updated_at`, xoá = tombstone); F6 session better-auth trong layout `/(personal)` + migration localStorage §3.5; G1 "Thêm vào sổ tay" → deck mặc định "Từ điển đã lưu"; nhập dán loạt từ (SPEC-12) vào modal tạo deck.
- **UPG-3 (SP3):** G1 entries CC-CEDICT thật; G2 dataset nét makemeahanzi lazy từ R2 `hanzi-writer/{char}.json` (immutable `max-age=31536000`) — thay STROKE_DATA hardcode.
- **UPG-5 (SP5):** G1 nhận dạng vẽ thật `POST /ai/handwrite` (rate-limit class `ai`); G3 dịch câu + audio TTS server + lưu `reading_docs` (`t0/t1` timeline) — spec SP5.

---

## File Structure (map trước khi bắt đầu)

- `app-next/src/lib/store/progress-store.ts` — mở rộng decks/vocabBook/mockLogin/streak (Task 1); `app-next/src/lib/store/decks.ts` — đồng bộ shape (Task 1).
- `app-next/src/lib/stats/donut.ts`, `heatmap.ts`, `review.ts` — hàm thuần (Task 2).
- `app-next/src/components/personal/login-gate.tsx` — F6 (Task 3).
- `app-next/src/content/{review,dictionary,hanzi,notebooks,reading,hanzi-strokes}.ts` — content modules (Task 4, 11).
- `app-next/src/app/(app)/review/page.tsx` + `components/stats/{donut,seven-day-bars}.tsx` (Task 5).
- `app-next/src/app/(app)/progress/page.tsx` + `components/stats/heatmap.tsx` (Task 6).
- `app-next/src/components/notebook/notebook-list.tsx` + routes `my-vocab`, `my-grammar` (Task 7); `notebook-editor.tsx`? không cần — F5 SP1 chỉ đọc + demo toast; route `notebook/[kind]/[id]/page.tsx` (Task 8).
- `app-next/src/lib/search/dictionary.ts` (Task 9); `app-next/src/app/(app)/dictionary/page.tsx` + `components/hanzi/{draw-pad,draw-modal}.tsx` (Task 10).
- `app-next/src/components/hanzi/stroke-player.tsx` (Task 11); routes `hanzi/page.tsx`, `hanzi/[char]/page.tsx` (Task 12).
- `app-next/src/app/(app)/reading/page.tsx` + `components/reading/karaoke.tsx` (Task 13).
- `app-next/e2e/personal-tools.spec.ts` (Task 14).

---

### Task 1: ProgressStore mở rộng — decks CRUD, vocabBook, mockLogin, streak

**Files:**
- Modify: `app-next/src/lib/store/progress-store.ts` (thêm methods + types)
- Modify: `app-next/src/lib/store/decks.ts` (đổi sang shape mảng `nhai.decks` của clone)
- Test: `app-next/src/lib/store/__tests__/personal-store.test.ts`

**Interfaces:**
- Consumes: `ProgressStore` class + singleton `progressStore` của plan learning-core (Task 6 của plan đó), event `nhai:progress`.
- Produces (các task sau + route `/lesson/custom/[deckId]` dùng đúng các tên này):
  - `export type DeckRow = { hanzi: string; pinyin?: string; hanviet?: string; meaning?: string };` (giữ `hanviet` thường đúng clone rows mẫu)
  - `export type DeckItem = { id: string; name: string; rows: DeckRow[]; updatedAt: string };` (ISO string)
  - `export type NotebookKind = "vocab" | "grammar";`
  - `export type VocabBookEntry = { hanzi: string; pinyin: string; vi: string };`
  - Methods thêm vào `ProgressStore`: `isLoggedIn(): boolean` (`nhai.mockLogin === "1"`); `setMockLogin(on: boolean): void`; `getStreak(): number` (`nhai.streak`, parseInt fallback 0); `listDecks(kind: NotebookKind): DeckItem[]` (key `nhai.decks` / `nhai.notebooks`, JSON hỏng → `[]`); `getDeckItem(kind: NotebookKind, id: string): DeckItem | null`; `createDeck(kind: NotebookKind, name: string): DeckItem` (id `nb-<Date.now().toString(36)>-<rand5>`, unshift đầu mảng, `updatedAt = new Date().toISOString()`); `renameDeck(kind: NotebookKind, id: string, name: string): void` (cập nhật `updatedAt`); `deleteDeck(kind: NotebookKind, id: string): void`; `getVocabBook(): VocabBookEntry[]` (`nhai.vocabBook`); `addToVocabBook(entry: VocabBookEntry): boolean` (false nếu đã có `hanzi` trùng, true nếu push mới). Mọi ghi dispatch `window.dispatchEvent(new CustomEvent("nhai:progress"))`.
  - `decks.ts` sau sửa: `getDeck(deckId)`/`listDecks()` đọc qua `progressStore.listDecks("vocab")` và map `DeckRow.hanviet` → `Deck.hanViet`, `ord` = index trong mảng rows (route `/lesson/custom/[deckId]` của plan anh em tiếp tục dùng được `getDeck`).

- [ ] **Step 1: Write the failing tests**

Tạo `app-next/src/lib/store/__tests__/personal-store.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { ProgressStore } from "../progress-store";

beforeEach(() => localStorage.clear());

describe("mock login + streak", () => {
  it("isLoggedIn/setMockLogin theo key nhai.mockLogin", () => {
    const s = new ProgressStore();
    expect(s.isLoggedIn()).toBe(false);
    s.setMockLogin(true);
    expect(localStorage.getItem("nhai.mockLogin")).toBe("1");
    expect(s.isLoggedIn()).toBe(true);
    s.setMockLogin(false);
    expect(s.isLoggedIn()).toBe(false);
  });
  it("getStreak đọc nhai.streak, hỏng → 0", () => {
    const s = new ProgressStore();
    expect(s.getStreak()).toBe(0);
    localStorage.setItem("nhai.streak", "7");
    expect(s.getStreak()).toBe(7);
    localStorage.setItem("nhai.streak", "abc");
    expect(s.getStreak()).toBe(0);
  });
});

describe("decks CRUD — shape mảng [{id, name, rows, updatedAt}]", () => {
  it("createDeck unshift vào nhai.decks, listDecks trả đủ", () => {
    const s = new ProgressStore();
    const a = s.createDeck("vocab", "Từ vựng giáo trình 2");
    const b = s.createDeck("vocab", "Bộ thứ hai");
    expect(a.id).toMatch(/^nb-/);
    expect(a.rows).toEqual([]);
    expect(a.updatedAt).toBeTruthy();
    const all = s.listDecks("vocab");
    expect(all.map((d) => d.name)).toEqual(["Bộ thứ hai", "Từ vựng giáo trình 2"]); // mới nhất đầu
    expect(all[0].id).toBe(b.id);
  });
  it("grammar ghi nhai.notebooks — hai kind không trộn", () => {
    const s = new ProgressStore();
    s.createDeck("grammar", "Mẫu câu của tôi");
    expect(JSON.parse(localStorage.getItem("nhai.notebooks")!)).toHaveLength(1);
    expect(localStorage.getItem("nhai.decks")).toBeNull();
    expect(s.listDecks("vocab")).toEqual([]);
  });
  it("renameDeck + deleteDeck", () => {
    const s = new ProgressStore();
    const d = s.createDeck("vocab", "Cũ");
    s.renameDeck("vocab", d.id, "Mới");
    expect(s.getDeckItem("vocab", d.id)?.name).toBe("Mới");
    s.deleteDeck("vocab", d.id);
    expect(s.getDeckItem("vocab", d.id)).toBeNull();
    expect(s.listDecks("vocab")).toEqual([]);
  });
  it("JSON hỏng → [] (an toàn như clone notebook.js)", () => {
    localStorage.setItem("nhai.decks", "{broken");
    expect(new ProgressStore().listDecks("vocab")).toEqual([]);
  });
});

describe("vocabBook (nhai.vocabBook)", () => {
  it("addToVocabBook push mới, trùng hanzi trả false", () => {
    const s = new ProgressStore();
    expect(s.addToVocabBook({ hanzi: "学习", pinyin: "xué xí", vi: "học tập; học" })).toBe(true);
    expect(s.addToVocabBook({ hanzi: "学习", pinyin: "xué xí", vi: "học tập; học" })).toBe(false);
    expect(s.getVocabBook()).toEqual([{ hanzi: "学习", pinyin: "xué xí", vi: "học tập; học" }]);
  });
});
```

- [ ] **Step 2: Run test verify fail**

Run: `cd /Volumes/samsung512/Code/hsk/app-next && pnpm vitest run src/lib/store/__tests__/personal-store.test.ts`
Expected: FAIL — `isLoggedIn`, `createDeck`,… không tồn tại trên `ProgressStore` (TS error / runtime undefined).

- [ ] **Step 3: Implement methods trong progress-store.ts**

Thêm vào class `ProgressStore` (giữ nguyên các method cũ của plan learning-core). Helpers nội bộ dùng lại pattern try/catch có sẵn:

```ts
isLoggedIn(): boolean {
  try { return localStorage.getItem("nhai.mockLogin") === "1"; } catch { return false; }
}
setMockLogin(on: boolean): void {
  try { if (on) localStorage.setItem("nhai.mockLogin", "1"); else localStorage.removeItem("nhai.mockLogin"); } catch { /* silent */ }
  window.dispatchEvent(new CustomEvent("nhai:progress"));
}
getStreak(): number {
  try { const n = parseInt(localStorage.getItem("nhai.streak") ?? "", 10); return isNaN(n) ? 0 : n; } catch { return 0; }
}
private deckKey(kind: NotebookKind): string { return kind === "grammar" ? "nhai.notebooks" : "nhai.decks"; }
listDecks(kind: NotebookKind): DeckItem[] {
  try {
    const v = JSON.parse(localStorage.getItem(this.deckKey(kind)) || "[]");
    return Array.isArray(v) ? (v as DeckItem[]) : [];
  } catch { return []; }
}
getDeckItem(kind: NotebookKind, id: string): DeckItem | null {
  return this.listDecks(kind).find((d) => d.id === id) ?? null;
}
createDeck(kind: NotebookKind, name: string): DeckItem {
  const item: DeckItem = {
    id: "nb-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7),
    name, rows: [], updatedAt: new Date().toISOString(),
  };
  this.saveDecks(kind, [item, ...this.listDecks(kind)]);
  return item;
}
renameDeck(kind: NotebookKind, id: string, name: string): void {
  this.saveDecks(kind, this.listDecks(kind).map((d) => (d.id === id ? { ...d, name, updatedAt: new Date().toISOString() } : d)));
  window.dispatchEvent(new CustomEvent("nhai:progress"));
}
deleteDeck(kind: NotebookKind, id: string): void {
  this.saveDecks(kind, this.listDecks(kind).filter((d) => d.id !== id));
  window.dispatchEvent(new CustomEvent("nhai:progress"));
}
private saveDecks(kind: NotebookKind, items: DeckItem[]): void {
  try { localStorage.setItem(this.deckKey(kind), JSON.stringify(items)); } catch { /* silent */ }
}
getVocabBook(): VocabBookEntry[] {
  try { const v = JSON.parse(localStorage.getItem("nhai.vocabBook") || "[]"); return Array.isArray(v) ? (v as VocabBookEntry[]) : []; } catch { return []; }
}
addToVocabBook(entry: VocabBookEntry): boolean {
  if (this.getVocabBook().some((v) => v.hanzi === entry.hanzi)) return false;
  try { localStorage.setItem("nhai.vocabBook", JSON.stringify([...this.getVocabBook(), entry])); } catch { /* silent */ }
  window.dispatchEvent(new CustomEvent("nhai:progress"));
  return true;
}
```

Export types `DeckRow`, `DeckItem`, `NotebookKind`, `VocabBookEntry` ở đầu file.

- [ ] **Step 4: Đồng bộ `src/lib/store/decks.ts` sang shape mảng**

Sửa `app-next/src/lib/store/decks.ts` (file của plan learning-core — điểm đồng bộ duy nhất được phép) để `getDeck`/`listDecks` đọc shape mảng và map `hanviet` → `hanViet`:

```ts
import { progressStore, type DeckRow } from "./progress-store";
import type { Deck } from "./decks"; // giữ type Deck đã khai báo của plan learning-core

function toDeck(d: { id: string; name: string; rows: DeckRow[] }): Deck {
  return {
    id: d.id,
    name: d.name,
    rows: d.rows.map((r) => ({ hanzi: r.hanzi, pinyin: r.pinyin, hanViet: r.hanviet, meaning: r.meaning })),
  };
}
export function listDecks(): Deck[] {
  return progressStore.listDecks("vocab").map(toDeck);
}
export function getDeck(deckId: string): Deck | null {
  const d = progressStore.getDeckItem("vocab", deckId);
  return d ? toDeck(d) : null;
}
```

Sửa test `src/lib/store/__tests__/decks.test.ts` của plan anh em cho khớp shape mảng: seed `localStorage.setItem("nhai.decks", JSON.stringify([{ id: "nb-1", name: "Bộ thử", rows: [{ hanzi: "时间", pinyin: "shíjiān", hanviet: "thời gian", meaning: "thời gian" }], updatedAt: new Date().toISOString() }]))` rồi assert `getDeck("nb-1")?.rows[0]` = `{ hanzi: "时间", pinyin: "shíjiān", hanViet: "thời gian", meaning: "thời gian" }`.

- [ ] **Step 5: Run tests verify pass**

Run: `pnpm vitest run src/lib/store`
Expected: PASS toàn bộ (personal-store 6 tests + decks.test.ts cập nhật + các test cũ của plan learning-core vẫn pass).

- [ ] **Step 6: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src/lib/store
git commit -m "feat: ProgressStore decks CRUD (nhai.decks/nhai.notebooks) + vocabBook + mockLogin + streak; decks.ts sang shape mảng clone"
```

### Task 2: Lib stats — donut largest-remainder, heatmap 12 tháng, streak rule, review stats

**Files:**
- Create: `app-next/src/lib/stats/donut.ts`
- Create: `app-next/src/lib/stats/heatmap.ts`
- Create: `app-next/src/lib/stats/review.ts`
- Test: `app-next/src/lib/stats/__tests__/stats.test.ts`

**Interfaces:**
- Consumes: Task 1 (`SrsItem` type từ progress-store), `stripTones` không cần ở đây.
- Produces:
  - `donut.ts`: `export type Dist = { forgot: number; hard: number; good: number; easy: number };` `export const DIST_META: { key: keyof Dist; label: string; color: string }[]` (4 phần tử, đúng màu clone: forgot `#c03922`, hard `#f39c12`, good `#43a047`, easy `var(--nhai-accent)`); `export function distPercents(dist: Dist): number[]` (largest-remainder, tổng đúng 100); `export function donutSlices(dist: Dist): { color: string; len: number; offset: number }[]` (`C = 2π × 15.9155`, `len = max(frac × C − 1.5, 0.5)`, `offset = −acc × C`, bỏ lát 0).
  - `heatmap.ts`: `export function mulberry32(seed: number): () => number`; `export function vnDay(d: Date): string` (`'YYYY-MM-DD'` giờ VN +07 — cộng 7h rồi lấy UTC parts); `export function heatData(real: Record<string, number> | null, now: Date): Record<string, number>` (12 tháng lùi từ tháng hiện tại, seed 20251021: `r < 0.45 → 0`, `r < 0.7 → 1 + ⌊rnd × 2⌋`, `r < 0.9 → 3 + ⌊rnd × 3⌋`, else `6 + ⌊rnd × 5⌋`; real[key] != null thắng); `export function heatClass(v: number): string` (0 → `"bg-[var(--nhai-bg)] border border-[var(--nhai-border)]"`, 1–2 → `"bg-[#f5b7ae]"`, 3–5 → `"bg-[#d9534f]"`, ≥6 → `"bg-[#a83232]"`); `export function computeStreak(days: Record<string, number>, today: string): number`.
  - `review.ts`: `export const SRS_DAYS = 21;` `export type ReviewStats = { due: number; new: number; learning: number; recent: number; learned: number; total: number };` `export function itemKeyKind(key: string, hasVocabEntry: (book: string, page: string) => boolean): "vocab" | "grammar"`; `export function computeReviewStats(items: SrsItem[], kind: "vocab" | "grammar", now: number, hasVocabEntry: (book: string, page: string) => boolean): ReviewStats`.
- Luật `computeStreak` (F2, giữ sống qua hôm qua): `today` = day string hôm nay; nếu `days[today] > 0` bắt đầu đếm từ hôm nay; else nếu `days[hôm qua] > 0` bắt đầu từ hôm qua (streak giữ); else 0. Đi lùi từng ngày (`vnDay(new Date(ms − 86400000))`) đếm liên tiếp `> 0`, dừng khi gặp ngày 0.
- Luật `computeReviewStats` (F1, chu kỳ 21 ngày, `D = SRS_DAYS × 86400000`): lọc items theo `itemKeyKind(key) === kind`; *total* = số item của kind; *new* = `status === "new"`; *learning* = `status === "learning"`; *due* = learning **hoặc** (`dueAt <= now` với status bất kỳ có `dueAt`); *recent* = `status ∈ {learned, known}` và `lastReviewedAt != null && now − lastReviewedAt < D`; *learned* = `status ∈ {learned, known}` và (`lastReviewedAt == null || now − lastReviewedAt >= D`).
- `itemKeyKind`: key dạng `<book>.<page>.<index>` hoặc `deck.<deckId>.<ord>`; split `/^([^.]+)\.([^.]+)\.\d+$/` → `hasVocabEntry(m[1], m[2])` true → vocab, else grammar; key `deck.*` → grammar (deck grammar học qua khuôn lesson — chấp nhận SP1, ghi comment).

- [ ] **Step 1: Write the failing tests**

Tạo `app-next/src/lib/stats/__tests__/stats.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { distPercents, donutSlices, DIST_META, type Dist } from "../donut";
import { mulberry32, vnDay, heatData, heatClass, computeStreak } from "../heatmap";
import { computeReviewStats, itemKeyKind, SRS_DAYS } from "../review";
import type { SrsItem } from "@/lib/store/progress-store";

const DAY = 86_400_000;

describe("donut largest-remainder", () => {
  it("tổng % luôn đúng 100 với dist bất kỳ", () => {
    const cases: Dist[] = [
      { forgot: 8, hard: 5, good: 14, easy: 3 },
      { forgot: 1, hard: 1, good: 1, easy: 2 },
      { forgot: 7, hard: 5, good: 3, easy: 3 },
      { forgot: 0, hard: 0, good: 0, easy: 1 }, // 1 lát đơn → 100%
    ];
    for (const d of cases) expect(distPercents(d).reduce((a, b) => a + b, 0)).toBe(100);
  });
  it("dist chuẩn {8,5,14,3} → làm tròn theo phần lẻ, tổng 100", () => {
    expect(distPercents({ forgot: 8, hard: 5, good: 14, easy: 3 })).toEqual([27, 16, 47, 10]); // 26.67/16.67/46.67/10, +1 vào 2 phần lẻ lớn nhất
  });
  it("1 lát đơn → [0,0,0,100]", () => {
    expect(distPercents({ forgot: 0, hard: 0, good: 0, easy: 1 })).toEqual([0, 0, 0, 100]);
  });
  it("donutSlices: khe −1.5, offset cộng dồn âm, bỏ lát 0", () => {
    const slices = donutSlices({ forgot: 1, hard: 0, good: 1, easy: 0 });
    expect(slices).toHaveLength(2);
    const C = 2 * Math.PI * 15.9155;
    expect(slices[0].len).toBeCloseTo(C / 2 - 1.5, 5);
    expect(slices[0].offset).toBe(0);
    expect(slices[1].offset).toBeCloseTo(-(C / 2), 5);
    expect(DIST_META.map((m) => m.label)).toEqual(["Quên rồi", "Khó", "Tốt", "Dễ"]);
  });
});

describe("heatmap + streak (giờ VN +07)", () => {
  it("vnDay quy đổi đúng múi giờ +07", () => {
    // 2026-01-31T17:30Z = 00:30 +07 ngày 1/2
    expect(vnDay(new Date("2026-01-31T17:30:00Z"))).toBe("2026-02-01");
    expect(vnDay(new Date("2026-09-30T00:00:00Z"))).toBe("2026-09-30"); // 07:00 +07
  });
  it("heatData đủ 12 tháng với đúng số ngày/tháng thực (28–31)", () => {
    const now = new Date(2026, 8, 30); // tháng 9/2026 (index 8)
    const map = heatData(null, now);
    let cells = 0;
    for (let back = 11; back >= 0; back--) {
      const d = new Date(2026, 8 - back, 1);
      cells += new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    }
    expect(Object.keys(map)).toHaveLength(cells);
    expect(map["2026-09-30"]).toBeDefined();
  });
  it("real data thắng seeded", () => {
    const map = heatData({ "2026-09-30": 42 }, new Date(2026, 8, 30));
    expect(map["2026-09-30"]).toBe(42);
  });
  it("heatClass đúng 4 mức threshold clone", () => {
    expect(heatClass(0)).toContain("border");
    expect(heatClass(2)).toBe("bg-[#f5b7ae]");
    expect(heatClass(5)).toBe("bg-[#d9534f]");
    expect(heatClass(6)).toBe("bg-[#a83232]");
  });
  it("computeStreak: 2 ngày liên tiếp = 2", () => {
    const days = { "2026-09-29": 3, "2026-09-30": 1 };
    expect(computeStreak(days, "2026-09-30")).toBe(2);
  });
  it("hôm nay 0 nhưng hôm qua có → streak giữ (sống qua hôm qua)", () => {
    const days = { "2026-09-28": 3, "2026-09-29": 2 };
    expect(computeStreak(days, "2026-09-30")).toBe(2);
  });
  it("thiếu cả hôm nay lẫn hôm qua → 0", () => {
    const days = { "2026-09-27": 3, "2026-09-28": 2 };
    expect(computeStreak(days, "2026-09-30")).toBe(0);
  });
});

describe("computeReviewStats (chu kỳ 21 ngày)", () => {
  const now = 1_000_000_000_000;
  const hasVocab = (book: string, page: string) => book === "hsk1" && page === "lesson-1";
  function item(partial: Partial<SrsItem> & { key: string }): SrsItem {
    return { status: "new", dueAt: null, reviewCount: 0, lastReviewedAt: null, updatedAt: now, ...partial };
  }
  it("phân loại đúng 5 nhóm theo status/dueAt/lastReviewedAt", () => {
    const items = [
      item({ key: "hsk1.lesson-1.0", status: "learning" }),                                  // learning → learning + due
      item({ key: "hsk1.lesson-1.1", status: "new" }),                                       // new, chưa đến hạn → không due
      item({ key: "hsk1.lesson-1.2", status: "learned", lastReviewedAt: now - 20 * DAY }),   // recent (< 21 ngày)
      item({ key: "hsk1.lesson-1.3", status: "known", lastReviewedAt: now - 22 * DAY, dueAt: now }), // dài hạn (biên 21 ngày) + đến hạn → due
      item({ key: "hsk1.lesson-1.4", status: "learned", lastReviewedAt: null }),             // learned (lastReviewed null)
      item({ key: "hsk2.lesson-1.0", status: "new" }),                                       // grammar kind → bị lọc
    ];
    const s = computeReviewStats(items, "vocab", now, hasVocab);
    expect(s).toEqual({ due: 2, new: 1, learning: 1, recent: 1, learned: 2, total: 5 });
    const g = computeReviewStats(items, "grammar", now, hasVocab);
    expect(g.total).toBe(1);
  });
  it("item learning luôn tính là due; item new chưa đến hạn không due; new đến hạn thì due", () => {
    const items = [
      item({ key: "hsk1.lesson-1.0", status: "learning", dueAt: now + DAY }),
      item({ key: "hsk1.lesson-1.1", status: "new", dueAt: now + DAY }),
      item({ key: "hsk1.lesson-1.2", status: "new", dueAt: now - DAY }),
    ];
    expect(computeReviewStats(items, "vocab", now, hasVocab).due).toBe(2);
  });
  it("itemKeyKind: deck.* → grammar", () => {
    expect(itemKeyKind("deck.nb-1.3", hasVocab)).toBe("grammar");
    expect(itemKeyKind("hsk1.lesson-1.0", hasVocab)).toBe("vocab");
  });
  it("SRS_DAYS = 21", () => expect(SRS_DAYS).toBe(21));
});
```

(Chú ý assertion thứ hai: 8/30=26.67, 5/30=16.67, 14/30=46.67, 3/30=10 — floor = [26,16,46,10], left = 2, phần lẻ lớn nhất là forgot (.67) rồi good (.67) → đều +1: `[27,16,47,10]`. Nếu chạy test thấy lệch, sửa expected theo kết quả thuật toán chuẩn largest-remainder ở Step 3 — thuật toán là nguồn chân lý, không phải con số.)

- [ ] **Step 2: Run test verify fail**

Run: `pnpm vitest run src/lib/stats`
Expected: FAIL — module `../donut`, `../heatmap`, `../review` không tồn tại.

- [ ] **Step 3: Implement donut.ts + heatmap.ts**

`donut.ts` — port 1:1 `distPercents` + `donutSlices` từ `clone/js/review-stats.js:221-252`:

```ts
export type Dist = { forgot: number; hard: number; good: number; easy: number };
export const DIST_META: { key: keyof Dist; label: string; color: string }[] = [
  { key: "forgot", label: "Quên rồi", color: "#c03922" },
  { key: "hard", label: "Khó", color: "#f39c12" },
  { key: "good", label: "Tốt", color: "#43a047" },
  { key: "easy", label: "Dễ", color: "var(--nhai-accent)" },
];
export const R = 15.9155;
export const C = 2 * Math.PI * R;

export function distPercents(dist: Dist): number[] {
  const total = dist.forgot + dist.hard + dist.good + dist.easy;
  if (total <= 0) return DIST_META.map(() => 0);
  const raw = DIST_META.map((m) => ((dist[m.key] || 0) / total) * 100);
  const floors = raw.map((r) => Math.floor(r));
  const left = 100 - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < left; k++) floors[order[k % order.length].i]++;
  return floors;
}

export function donutSlices(dist: Dist): { color: string; len: number; offset: number }[] {
  const total = dist.forgot + dist.hard + dist.good + dist.easy;
  if (total <= 0) return [];
  const out: { color: string; len: number; offset: number }[] = [];
  let acc = 0;
  DIST_META.forEach((m) => {
    const n = dist[m.key] || 0;
    if (n <= 0) return;
    const frac = n / total;
    out.push({ color: m.color, len: Math.max(frac * C - 1.5, 0.5), offset: -acc * C });
    acc += frac;
  });
  return out;
}
```

`heatmap.ts` — port `mulberry32`/`heatData`/`heatClass` từ `clone/js/progress.js:62-92` + thêm `vnDay`/`computeStreak`:

```ts
export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function vnDay(d: Date): string {
  const vn = new Date(d.getTime() + 7 * 3600_000);
  return vn.toISOString().slice(0, 10);
}
export function heatData(real: Record<string, number> | null, now: Date): Record<string, number> {
  const rnd = mulberry32(20251021);
  const map: Record<string, number> = {};
  for (let back = 11; back >= 0; back--) {
    const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const y = d.getFullYear(), m = d.getMonth();
    const days = new Date(y, m + 1, 0).getDate();
    for (let day = 1; day <= days; day++) {
      const key = y + "-" + String(m + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
      const r = rnd();
      map[key] = real && real[key] != null ? real[key]
        : r < 0.45 ? 0 : r < 0.7 ? 1 + Math.floor(rnd() * 2) : r < 0.9 ? 3 + Math.floor(rnd() * 3) : 6 + Math.floor(rnd() * 5);
    }
  }
  return map;
}
export function heatClass(v: number): string {
  if (!v || v <= 0) return "bg-[var(--nhai-bg)] border border-[var(--nhai-border)]";
  if (v <= 2) return "bg-[#f5b7ae]";
  if (v <= 5) return "bg-[#d9534f]";
  return "bg-[#a83232]";
}
export function computeStreak(days: Record<string, number>, today: string): number {
  const DAY = 86_400_000;
  const ms = Date.parse(today + "T00:00:00+07:00");
  if (isNaN(ms)) return 0;
  let cur = days[today] > 0 ? ms : days[vnDay(new Date(ms - DAY))] > 0 ? ms - DAY : 0;
  if (!cur) return 0;
  let streak = 0;
  while (days[vnDay(new Date(cur))] > 0) { streak++; cur -= DAY; }
  return streak;
}
```

- [ ] **Step 4: Implement review.ts**

```ts
import type { SrsItem } from "@/lib/store/progress-store";

export const SRS_DAYS = 21;
const DAY = 86_400_000;
export type ReviewStats = { due: number; new: number; learning: number; recent: number; learned: number; total: number };

// SP1: kind suy đoán từ content vocab — key <book>.<page>.<i> có lesson vocab thật là vocab;
// deck.* học qua khuôn lesson chung → tính grammar (comment: UPG-2 đọc kind từ srs_states).
export function itemKeyKind(key: string, hasVocabEntry: (book: string, page: string) => boolean): "vocab" | "grammar" {
  const m = /^([^.]+)\.([^.]+)\.\d+$/.exec(key);
  if (!m) return "grammar";
  return hasVocabEntry(m[1], m[2]) ? "vocab" : "grammar";
}

export function computeReviewStats(
  items: SrsItem[], kind: "vocab" | "grammar", now: number,
  hasVocabEntry: (book: string, page: string) => boolean,
): ReviewStats {
  const D = SRS_DAYS * DAY;
  const s: ReviewStats = { due: 0, new: 0, learning: 0, recent: 0, learned: 0, total: 0 };
  items.forEach((c) => {
    if (itemKeyKind(c.key, hasVocabEntry) !== kind) return;
    s.total += 1;
    if (c.status === "new") s.new += 1;
    else if (c.status === "learning") { s.learning += 1; s.due += 1; }
    else { // learned | known
      if (c.lastReviewedAt != null && now - c.lastReviewedAt < D) s.recent += 1;
      else s.learned += 1;
    }
    // Cần ôn = learning HOẶC due_at đến hạn (spec 11 §F1) — learning đã đếm ở trên, tránh cộng trùng
    if (c.status !== "learning" && c.dueAt != null && c.dueAt <= now) s.due += 1;
  });
  return s;
}
```

- [ ] **Step 5: Run tests verify pass**

Run: `pnpm vitest run src/lib/stats`
Expected: PASS toàn bộ (13 tests). Nếu expected `distPercents` lệch ghi chú ở Step 1, sửa expected theo thuật toán rồi chạy lại tới pass — thuật toán port từ clone là chân lý.

- [ ] **Step 6: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src/lib/stats
git commit -m "feat: stats libs — donut largest-remainder, heatmap 12 tháng + streak rule VN+07, review stats chu kỳ 21 ngày"
```

### Task 3: F6 — LoginGate component (mock)

**Files:**
- Create: `app-next/src/components/personal/login-gate.tsx`
- Test: `app-next/src/components/personal/__tests__/login-gate.test.tsx`

**Interfaces:**
- Consumes: Task 1 (`progressStore.isLoggedIn`, `setMockLogin`), event `nhai:progress`; plan learning-core: `useLoginModal(): { isOpen, openLogin, close }` từ `@/components/shell/login-modal`.
- Produces: `export function LoginGate({ pageSub, children }: { pageSub: string; children: React.ReactNode }): JSX.Element` — chưa login (`nhai.mockLogin !== "1"`) render card trung tâm: `<div class="text-6xl mb-4">🔒</div>` + `<h2 class="text-2xl font-extrabold mb-2">Đăng nhập để xem</h2>` + `<p class="text-sm text-[var(--nhai-muted)] mb-6">{pageSub}</p>` + `<button class="btn-main px-6 py-2.5">Đăng nhập</button>` gọi `openLogin()`; đã login render `{children}`. Đăng nhập từ LoginModal dispatch `nhai:progress` → gate tự re-render (không reload). **Ghi chú UPG-2:** sẽ thay bằng server session check better-auth trong layout `/(personal)` — component này là mock tạm thời, copy sub-text giữ nguyên.

- [ ] **Step 1: Write the failing test**

Tạo `app-next/src/components/personal/__tests__/login-gate.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { LoginGate } from "../login-gate";

// stub useLoginModal của plan learning-core (file thật cần DOM shell đầy đủ)
vi.mock("@/components/shell/login-modal", () => ({
  useLoginModal: () => ({ isOpen: false, openLogin: vi.fn(), close: vi.fn() }),
}));

beforeEach(() => localStorage.clear());

describe("LoginGate (F6 mock)", () => {
  it("chưa login → 🔒 + đúng sub text + nút Đăng nhập", () => {
    render(<LoginGate pageSub="Sổ tay từ vựng của bạn sẽ xuất hiện ở đây sau khi đăng nhập."><div>nội dung</div></LoginGate>);
    expect(screen.getByText("🔒")).toBeInTheDocument();
    expect(screen.getByText("Đăng nhập để xem")).toBeInTheDocument();
    expect(screen.getByText("Sổ tay từ vựng của bạn sẽ xuất hiện ở đây sau khi đăng nhập.")).toBeInTheDocument();
    expect(screen.queryByText("nội dung")).not.toBeInTheDocument();
  });
  it("mockLogin=1 → render children", () => {
    localStorage.setItem("nhai.mockLogin", "1");
    render(<LoginGate pageSub="x"><div>nội dung</div></LoginGate>);
    expect(screen.getByText("nội dung")).toBeInTheDocument();
  });
  it("bấm Đăng nhập mở login modal; setMockLogin từ modal → gate hiện nội dung ngay (event nhai:progress)", () => {
    render(<LoginGate pageSub="x"><div>nội dung</div></LoginGate>);
    act(() => screen.getByText("Đăng nhập").click());
    act(() => {
      localStorage.setItem("nhai.mockLogin", "1");
      window.dispatchEvent(new CustomEvent("nhai:progress"));
    });
    expect(screen.getByText("nội dung")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test verify fail**

Run: `pnpm vitest run src/components/personal`
Expected: FAIL — module `../login-gate` không tồn tại.

- [ ] **Step 3: Implement LoginGate**

Tạo `app-next/src/components/personal/login-gate.tsx`:

```tsx
"use client";
import { useEffect, useState, type ReactNode } from "react";
import { progressStore } from "@/lib/store/progress-store";
import { useLoginModal } from "@/components/shell/login-modal";

// SP1 mock — UPG-2 sẽ thay bằng server session check better-auth (spec 11 §F6).
export function LoginGate({ pageSub, children }: { pageSub: string; children: ReactNode }) {
  const [loggedIn, setLoggedIn] = useState(false); // SSR nhất quán: render gate trước, sync sau mount
  const [mounted, setMounted] = useState(false);
  const { openLogin } = useLoginModal();
  useEffect(() => {
    const sync = () => setLoggedIn(progressStore.isLoggedIn());
    sync();
    setMounted(true);
    window.addEventListener("nhai:progress", sync);
    return () => window.removeEventListener("nhai:progress", sync);
  }, []);
  if (mounted && loggedIn) return <>{children}</>;
  return (
    <div className="card shadow-neo p-10 text-center">
      <div className="text-6xl mb-4" aria-hidden="true">🔒</div>
      <h2 className="text-2xl font-extrabold mb-2">Đăng nhập để xem</h2>
      <p className="text-sm text-[var(--nhai-muted)] mb-6">{pageSub}</p>
      <button type="button" onClick={openLogin} className="btn-main px-6 py-2.5">Đăng nhập</button>
    </div>
  );
}
```

- [ ] **Step 4: Run test verify pass**

Run: `pnpm vitest run src/components/personal`
Expected: PASS 3 tests.

- [ ] **Step 5: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src/components/personal
git commit -m "feat: LoginGate 🔒 mock (F6) — nhai.mockLogin + openLogin modal, re-render qua nhai:progress"
```

### Task 4: Content modules — review, dictionary, hanzi, notebooks, reading

**Files:**
- Create: `app-next/src/content/review.ts` (port `clone/js/data/review.js:1-27`)
- Create: `app-next/src/content/dictionary.ts` (port `clone/js/data/dictionary.js:1-249`, 20 entries)
- Create: `app-next/src/content/hanzi.ts` (port `clone/js/data/hanzi.js:1-167`)
- Create: `app-next/src/content/notebooks.ts` (port `clone/js/data/notebooks.js:1-59`)
- Create: `app-next/src/content/reading.ts` (port `clone/js/data/reading.js:1-122`)
- Test: `app-next/src/content/__tests__/personal-content.test.ts`

**Interfaces:**
- Consumes: Task 2 (vitest).
- Produces:
  - `review.ts`: `export const reviewData: { counts: number[]; today: number; week: number; avgPerDay: number; avgPerCard: number; streak: number; last7: number[]; dist: Dist; total: number; monthTotal: number; copy: Record<"vocab" | "grammar", { emptyDesc: string; emptyLink: string; emptyHref: string }> }` — copy port verbatim NHỪNG `emptyHref` đổi sang route Next: vocab `"/course"`, grammar `"/course/hsk1?skill=grammar"` (spec 11 F1: "Vào kệ sách →" → `/course`; "Vào mục ngữ pháp →"). Text giữ nguyên.
  - `dictionary.ts`: `export type DictExample = { zh: string; pinyinPerChar: string[]; vi: string };` `export type DictEntry = { hanzi: string; pinyinPerChar: string[]; traditional: string | null; meanings: string[]; pos: string; level: string | null; examples: DictExample[] };` `export const dictionary: DictEntry[]` — 20 entries copy y nguyên (nhóm 学习 đủ 5: 学习/学习刻苦/学习强国/学习时报/学习委员).
  - `hanzi.ts`: `export type HanziVocab = { word: string; py: string; hv: string; vi: string; link?: string };` `export type HanziInfo = { hanzi: string; hanViet: string; hanVietAlt?: string; pinyin: string; level: string; strokes: number; radical: string; radicalLink?: boolean; composition?: string[]; type: string; meaning: string; vocabInBook?: HanziVocab[]; practical?: { word: string; py: string; vi: string }[] };` `export const hanziChars: Record<string, HanziInfo>` (你 đầy đủ + ~38 chữ bài 1 HSK1 rút gọn + ~10 chữ thành phần — copy nguyên `clone/js/data/hanzi.js`; `link` của vocabInBook đổi `lesson.html?book=hsk1&page=lesson-1` → `/lesson/hsk1/lesson-1`); `export const hanziLevels: { id: string; label: string; count: string; href?: string }[]` (8 mục: hsk1…hsk79 + radicals href `"/radicals"`, count verbatim "247 chữ Hán mới trong cuốn này"…).
  - `notebooks.ts`: `export type NotebookConfig = { storage: string; h1: string; sub: string; cta: string; empty: string; emptySub: string; modalTitle: string; countUnit: string; samples: { id: string; name: string; count: number; unit: string; updatedAt: string; sample: true; rows: NotebookRow[] }[] };` `export type NotebookRow = { hanzi: string; pinyin: string; hanviet: string; meaning: string };` `export const notebooks: Record<"vocab" | "grammar", NotebookConfig>` + `export const notebookSubGate: Record<"vocab" | "grammar", string>` = `{ vocab: "Sổ tay từ vựng của bạn sẽ xuất hiện ở đây sau khi đăng nhập.", grammar: "Sổ tay ngữ pháp của bạn sẽ xuất hiện ở đây sau khi đăng nhập." }` (sub gate F6 — spec 11 §F6, không có trong data clone nên định nghĩa mới).
  - `reading.ts`: `export type ReadingSentence = { zh: string; py: string; vi: string };` `export type ReadingQuestion = { q: string; qVi: string; options: string[]; answer: number };` `export const readingData: { sampleText: string; demoDoc: { id: string; title: string; label: string; meta: string; sentences: ReadingSentence[]; vocab: { word: string; py: string; vi: string }[]; questions: ReadingQuestion[] } }` — copy verbatim (13 câu, 5 từ vựng, 3 câu hỏi, sampleText ~300 ký tự).

- [ ] **Step 1: Write the failing test**

Tạo `app-next/src/content/__tests__/personal-content.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { reviewData } from "../review";
import { dictionary } from "../dictionary";
import { hanziChars, hanziLevels } from "../hanzi";
import { notebooks } from "../notebooks";
import { readingData } from "../reading";

describe("reviewData (SPEC-17)", () => {
  it("counts seeded 6 ô + last7 + dist đúng clone", () => {
    expect(reviewData.counts).toEqual([12, 34, 8, 41, 96, 191]);
    expect(reviewData.last7).toEqual([3, 5, 0, 8, 12, 4, 0]);
    expect(reviewData.dist).toEqual({ forgot: 8, hard: 5, good: 14, easy: 3 });
    expect(reviewData.total).toBe(30);
  });
  it("copy đổi tab đúng chuỗi verbatim + href route Next", () => {
    expect(reviewData.copy.vocab).toEqual({
      emptyDesc: "Bấm nút ⭐ cạnh mỗi từ trong bài học để thêm từ vào bộ thẻ ôn.",
      emptyLink: "Vào kệ sách →", emptyHref: "/course",
    });
    expect(reviewData.copy.grammar.emptyLink).toBe("Vào mục ngữ pháp →");
    expect(reviewData.copy.grammar.emptyHref).toBe("/course/hsk1?skill=grammar");
  });
});

describe("dictionary (SPEC-09)", () => {
  it("đủ 20 entries, nhóm 学习 đủ 5 kết quả", () => {
    expect(dictionary).toHaveLength(20);
    const group = dictionary.filter((e) => e.hanzi.startsWith("学习"));
    expect(group.map((e) => e.hanzi)).toEqual(["学习", "学习刻苦", "学习强国", "学习时报", "学习委员"]);
  });
  it("entry 学习 đúng nghĩa + phồn thể + ví dụ", () => {
    const e = dictionary[0];
    expect(e).toMatchObject({ hanzi: "学习", traditional: "學習", pos: "Động từ", level: "HSK 1" });
    expect(e.meanings[0]).toBe("học tập; học");
    expect(e.pinyinPerChar).toEqual(["xué", "xí"]);
    expect(e.examples[0]).toMatchObject({ zh: "我在学习汉语。", vi: "Tôi đang học tiếng Trung." });
  });
});

describe("hanzi data (SPEC-03)", () => {
  it("你 đầy đủ: 7 nét, bộ thủ 亻, 12 từ thực chiến", () => {
    const ni = hanziChars["你"];
    expect(ni).toMatchObject({ hanViet: "NHĨ", hanVietAlt: "NỄ", pinyin: "nǐ", level: "HSK 1", strokes: 7, radical: "亻", type: "Hội ý" });
    expect(ni.composition).toEqual(["亻", "尔"]);
    expect(ni.practical).toHaveLength(12);
    expect(ni.vocabInBook?.[0]).toMatchObject({ word: "你好", link: "/lesson/hsk1/lesson-1" });
  });
  it("levels đủ 8 pill (7 sách + Bộ thủ → /radicals)", () => {
    expect(hanziLevels).toHaveLength(8);
    expect(hanziLevels[0]).toMatchObject({ id: "hsk1", label: "HSK 1", count: "247 chữ Hán mới trong cuốn này" });
    expect(hanziLevels[7]).toMatchObject({ label: "214 Bộ thủ", href: "/radicals" });
  });
  it("bộ thủ 亻 có bản rút gọn (link composition hoạt động)", () => {
    expect(hanziChars["亻"]).toBeDefined();
  });
});

describe("notebooks (SPEC-18)", () => {
  it("vocab + grammar đúng chuỗi khuôn chung", () => {
    expect(notebooks.vocab).toMatchObject({ h1: "Sổ tay từ vựng", cta: "Tạo bộ mới", empty: "Chưa có bộ từ vựng nào", modalTitle: "Tạo bộ từ vựng mới", countUnit: "từ" });
    expect(notebooks.grammar).toMatchObject({ h1: "Sổ tay ngữ pháp", cta: "Tạo sổ tay mới", empty: "Chưa có sổ tay ngữ pháp nào", modalTitle: "Tạo sổ tay ngữ pháp mới", countUnit: "mẫu" });
  });
  it("3 sample vocab (128/64/45) + 2 sample grammar (12/8) + 12 rows mẫu", () => {
    expect(notebooks.vocab.samples.map((s) => [s.name, s.count])).toEqual([
      ["Từ vực HSK 3.0", 128], ["Từ trong sách giáo khoa", 64], ["Ngày thường giao tiếp", 45],
    ]);
    expect(notebooks.grammar.samples.map((s) => [s.name, s.count])).toEqual([
      ["Mẫu câu gọi thoại", 12], ["Ngữ pháp hay sai", 8],
    ]);
    expect(notebooks.vocab.samples[0].rows).toHaveLength(12);
    expect(notebooks.vocab.samples[0].rows[0]).toEqual({ hanzi: "时间", pinyin: "shíjiān", hanviet: "thời gian", meaning: "thời gian" });
  });
});

describe("readingData (G3)", () => {
  it("demoDoc 13 câu + 5 từ vựng + 3 câu hỏi; sampleText > 250 ký tự", () => {
    expect(readingData.demoDoc.sentences).toHaveLength(13);
    expect(readingData.demoDoc.sentences[0]).toMatchObject({ zh: "我一个人住在一间小小的公寓里。" });
    expect(readingData.demoDoc.vocab).toHaveLength(5);
    expect(readingData.demoDoc.questions).toHaveLength(3);
    expect(readingData.sampleText.length).toBeGreaterThan(250);
  });
});
```

- [ ] **Step 2: Run test verify fail**

Run: `pnpm vitest run src/content/__tests__/personal-content.test.ts`
Expected: FAIL — các module không tồn tại.

- [ ] **Step 3: Port 5 data files**

Chuyển 5 IIFE `window.NHAI_DATA.*` thành TS exports (thay `NHAI_DATA.review = {...}` → `export const reviewData = {... as const}` với type đã khai ở Interfaces):
- `review.ts`: copy nguyên `clone/js/data/review.js` — chỉ đổi 2 href như Interfaces.
- `dictionary.ts`: copy nguyên mảng 20 entries (file `clone/js/data/dictionary.js:8-249` — KHÔNG bỏ entry nào).
- `hanzi.ts`: copy `ni` (你 đầy đủ) + hàm `g`/`comp` + mảng `others` + `levels` từ `clone/js/data/hanzi.js:8-167`; đổi `lesson.html?book=X&page=Y` → `/lesson/X/Y`; giữ nguyên mọi text nghĩa.
- `notebooks.ts`: copy `MOCK_ROWS` 12 dòng + 2 config; thêm export `notebookSubGate`.
- `reading.ts`: copy `sampleText` + `demoDoc` nguyên khối.

- [ ] **Step 4: Run test verify pass**

Run: `pnpm vitest run src/content/__tests__/personal-content.test.ts`
Expected: PASS 7 tests.

- [ ] **Step 5: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src/content
git commit -m "feat: content modules review/dictionary(20)/hanzi(你+HSK1)/notebooks/reading demoDoc"
```

### Task 5: F1 — `/review` dashboard + Donut + SevenDayBars

**Files:**
- Create: `app-next/src/components/stats/donut.tsx`
- Create: `app-next/src/components/stats/seven-day-bars.tsx`
- Create: `app-next/src/app/(app)/review/page.tsx` (server, metadata) + `app-next/src/app/(app)/review/review-dashboard.tsx` (client)
- Test: `app-next/src/components/stats/__tests__/donut.test.tsx`, `app-next/src/app/(app)/review/__tests__/review-dashboard.test.tsx`
- Port-from: `clone/js/review-stats.js` (toàn bộ), `clone/js/data/review.js`, `clone/specs/SPEC-17-review-stats.md`

**Interfaces:**
- Consumes: Task 2 (`distPercents`, `donutSlices`, `DIST_META`, `computeReviewStats`), Task 1 (`progressStore.listSrs`? không — dùng `addSrsBatch`/`toggleSrs` của plan learning-core; đọc items qua method mới, xem Step 3), Task 4 (`reviewData`), plan learning-core (`useProgress` reactive qua `nhai:progress`).
- Produces:
  - `export function Donut({ dist, footer }: { dist: Dist; footer?: string }): JSX.Element` — SVG `viewBox="0 0 42 42"` class `-rotate-90`, circle nền `stroke="var(--nhai-soft)" stroke-width="6"`, các lát `stroke-linecap="round" stroke-width="6"` với `stroke-dasharray`/`stroke-dashoffset` từ `donutSlices(dist)`; legend 4 dòng "Nhãn — N (X%)" với chấm màu; title "Phân bổ đánh giá (N lượt)" khi tổng > 0; footer prop.
  - `export function SevenDayBars({ last7 }: { last7: number[] }): JSX.Element` — nhãn `["T3","T4","T5","T6","T7","CN","T2"]`, chiều cao `Math.round((v / max) * 100)%` với `max = Math.max(...last7, 1)`, cột cuối (hôm nay) `var(--nhai-main)`, cột khác `var(--nhai-soft)` + `border:1px solid var(--nhai-border)`.
  - `export default function ReviewDashboard(): JSX.Element` — state `domain: "vocab" | "grammar"`; H1 "Thống kê học tập" + sub "Theo dõi tiến độ và kế hoạch ôn tập của bạn — ôn đủ chu kỳ 2 lần là thành thạo."; 2 tab pill active viền đỏ; 6 ô đếm (grid 2→3→6 cột, màu theo `COUNT_META` clone: `#c03922` / muted / `var(--nhai-accent)` / `#43a047` / `#2e7d32` / `var(--nhai-main)`); section "Bộ thẻ đang trống" (đổi text + link theo tab) hoặc nút "Bắt đầu ôn tập (N thẻ)" khi có thẻ; section "Chi tiết ôn tập" (5 ô Streak/Hôm nay/Tuần này/TB-ngày/TB-thẻ + bars + donut); footer "Nhai tiếng Trung mỗi ngày — facebook.com/groups/nhaihsk".
  - Route `page.tsx`: `export const metadata = { title: "Ôn tập ngắt quãng" };` render `<ReviewDashboard />`.
- Đọc SRS: thêm helper nội bộ trong `review-dashboard.tsx` — đọc items qua `progressStore` bằng cách iterate `Object.keys(localStorage)` filter prefix `nhai.srs.` KHÔNG được (vi phạm ranh giới store). Thay thế: dùng `progressStore.getAllSrs(): SrsItem[]` — thêm method này vào `progress-store.ts` trong task này (Modify nhỏ): trả `Object.values` của map `nhai.srs.items` (getter đã có của plan learning-core; nếu plan learning-core đặt tên khác ví dụ `listSrs()`, dùng tên đó và ghi comment). Trong plan này ký hiệu `progressStore.getAllSrs()`.

- [ ] **Step 1: Write the failing tests**

Tạo `app-next/src/components/stats/__tests__/donut.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Donut } from "../donut";
import { SevenDayBars } from "../seven-day-bars";

describe("Donut", () => {
  it("SVG 4 lát với dasharray/offset từ donutSlices, legend tổng % = 100", () => {
    const { container } = render(<Donut dist={{ forgot: 8, hard: 5, good: 14, easy: 3 }} footer="Tổng: 30 lượt · Tháng này: 30 lượt" />);
    const circles = container.querySelectorAll("circle");
    expect(circles.length).toBe(5); // 1 nền + 4 lát
    expect(container.textContent).toContain("Quên rồi — 8 (27%)");
    expect(container.textContent).toContain("Tổng: 30 lượt · Tháng này: 30 lượt");
  });
  it("dist rỗng → chỉ circle nền, không lát", () => {
    const { container } = render(<Donut dist={{ forgot: 0, hard: 0, good: 0, easy: 0 }} />);
    expect(container.querySelectorAll("circle").length).toBe(1);
  });
});

describe("SevenDayBars", () => {
  it("7 cột, nhãn T3…T2, cột cuối hôm nay màu chính", () => {
    const { container } = render(<SevenDayBars last7={[3, 5, 0, 8, 12, 4, 0]} />);
    const bars = container.querySelectorAll("[data-bar]");
    expect(bars).toHaveLength(7);
    expect(bars[6].getAttribute("style")).toContain("var(--nhai-main)");
    expect(bars[0].getAttribute("style")).toContain("var(--nhai-soft)");
    expect(container.textContent).toContain("T3");
    expect(container.textContent).toContain("T2");
  });
});
```

Tạo `app-next/src/app/(app)/review/__tests__/review-dashboard.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import ReviewDashboard from "../review-dashboard";
import { progressStore } from "@/lib/store/progress-store";

beforeEach(() => localStorage.clear());

describe("ReviewDashboard (F1)", () => {
  it("localStorage trống → 6 ô counts seeded [12,34,8,41,96,191] + empty card tab vocab", () => {
    const { container } = render(<ReviewDashboard />);
    expect(screen.getByText("Thống kê học tập")).toBeInTheDocument();
    expect(container.querySelector('[data-stat="Cần ôn"]')!.textContent).toBe("12");
    expect(container.querySelector('[data-stat="Tổng đã học qua"]')!.textContent).toBe("191");
    expect(screen.getByText("Bộ thẻ đang trống")).toBeInTheDocument();
    expect(screen.getByText("Bấm nút ⭐ cạnh mỗi từ trong bài học để thêm từ vào bộ thẻ ôn.")).toBeInTheDocument();
    expect(screen.getByText("Vào kệ sách →")).toHaveAttribute("href", "/course");
  });
  it("đổi tab grammar → chỉ đổi text empty + link, giữ 6 ô", () => {
    const { container } = render(<ReviewDashboard />);
    act(() => screen.getByText("Ngữ pháp").click());
    expect(screen.getByText("Bấm nút ⭐ trên mẫu ngữ pháp để thêm vào bộ thẻ ôn tập.")).toBeInTheDocument();
    expect(screen.getByText("Vào mục ngữ pháp →")).toHaveAttribute("href", "/course/hsk1?skill=grammar");
    expect(container.querySelector('[data-stat="Cần ôn"]')!.textContent).toBe("12"); // layout giữ nguyên
  });
  it("star 1 từ trong store → số Mới thêm/Tổng suy diễn từ SRS (không còn seeded)", () => {
    progressStore.toggleSrs("hsk1.lesson-1.0");
    const { container } = render(<ReviewDashboard />);
    expect(container.querySelector('[data-stat="Mới thêm"]')!.textContent).toBe("1");
    expect(container.querySelector('[data-stat="Tổng đã học qua"]')!.textContent).toBe("1");
    expect(screen.queryByText("191")).not.toBeInTheDocument();
    expect(screen.getByText(/Bắt đầu ôn tập \(1 thẻ\)/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests verify fail**

Run: `pnpm vitest run src/components/stats src/app`
Expected: FAIL — module `../donut`, `../review-dashboard` không tồn tại.

- [ ] **Step 3: Thêm `getAllSrs()` vào progress-store + implement Donut/SevenDayBars**

Modify `progress-store.ts` (nếu plan learning-core chưa có tên tương đương):

```ts
getAllSrs(): SrsItem[] {
  try {
    const v = JSON.parse(localStorage.getItem("nhai.srs.items") || "{}");
    return v && typeof v === "object" ? Object.values(v as Record<string, SrsItem>) : [];
  } catch { return []; }
}
```

`donut.tsx`:

```tsx
"use client";
import { DIST_META, donutSlices, distPercents, R, type Dist } from "@/lib/stats/donut";

export function Donut({ dist, footer }: { dist: Dist; footer?: string }) {
  const total = dist.forgot + dist.hard + dist.good + dist.easy;
  const title = "Phân bổ đánh giá" + (total > 0 ? ` (${total} lượt)` : "");
  const pcts = distPercents(dist);
  return (
    <div className="card shadow-neo p-5">
      <h3 className="font-extrabold tracking-tight mb-4">{title}</h3>
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div className="shrink-0 w-40 h-40">
          <svg viewBox="0 0 42 42" className="w-full h-full -rotate-90" role="img" aria-label={title}>
            <circle cx="21" cy="21" r={R} fill="none" stroke="var(--nhai-soft)" strokeWidth="6" />
            {donutSlices(dist).map((s, i) => (
              <circle key={i} cx="21" cy="21" r={R} fill="none" stroke={s.color} strokeWidth="6"
                strokeDasharray={`${s.len} ${C - s.len}`} strokeDashoffset={s.offset} />
            ))}
          </svg>
        </div>
        <div className="space-y-2 text-sm">
          {DIST_META.map((m, i) => (
            <div key={m.key} className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full" style={{ background: m.color }} />
              <span>{m.label} — {dist[m.key] || 0} ({pcts[i]}%)</span>
            </div>
          ))}
        </div>
      </div>
      {footer ? <p className="text-xs text-[var(--nhai-muted)] mt-4">{footer}</p> : null}
    </div>
  );
}
```

(`C` import từ `@/lib/stats/donut` — đã export ở Task 2.)

`seven-day-bars.tsx` — port `renderWeek` từ `clone/js/review-stats.js:161-180` sang JSX (mảng `DAY_LABELS` nội bộ, `data-bar` trên div cột, style inline height + background như clone).

- [ ] **Step 4: Implement ReviewDashboard + route**

`review-dashboard.tsx` — `"use client"`; port khung `buildFrame`/`renderCounts`/`renderEmptyCard`/`renderDetail` từ `clone/js/review-stats.js:43-159` sang JSX:

- State: `const [domain, setDomain] = useState<"vocab" | "grammar">("vocab")`; `const [tick, setTick] = useState(0)` — subscribe `nhai:progress` → `setTick(t + 1)` để suy diễn lại stats từ SRS.
- Stats: `const srs = progressStore.getAllSrs(); const hasVocabEntry = (b: string, p: string) => !!vocab[b]?.[p];` (import `{ vocab } from "@/content/vocab"`); `const stats = srs.length ? computeReviewStats(srs, domain, Date.now(), hasVocabEntry) : null`; counts hiển thị = `stats ? [stats.due, stats.new, stats.learning, stats.recent, stats.learned, stats.total] : reviewData.counts`. Mỗi ô render `<div className="card shadow-neo p-4 text-center">` với `<div data-stat={m.label} className="text-[28px] leading-8 font-extrabold" style={{ color: m.color }}>{số}</div>` + nhãn nhỏ (port `COUNT_META` `clone/js/review-stats.js:8-15`).
- Tab active: class `bg-[var(--nhai-main)] border-[var(--nhai-main)] text-white` / inactive `border-[var(--nhai-border)]` (port `paintTabs`).
- Empty card: `srs` còn thẻ (bất kể domain, như clone `deckSize`) → card "Bộ thẻ của bạn" + `Link href="/lesson/hsk1/lesson-1?mode=quiz"` nút `Bắt đầu ôn tập (N thẻ)` với N = `srs.length`; else empty card theo `reviewData.copy[domain]` với `Link href={copy.emptyHref}`.
- Chi tiết ôn tập: 5 ô giá trị từ `reviewData` (streak/today/week/avgPerDay/avgPerCard — seeded, SP1 giữ); `<SevenDayBars last7={reviewData.last7} />`; `<Donut dist={reviewData.dist} footer={`Tổng: ${reviewData.total} lượt · Tháng này: ${reviewData.monthTotal} lượt`} />`.
- Route `app/(app)/review/page.tsx`:

```tsx
import type { Metadata } from "next";
import ReviewDashboard from "./review-dashboard";
export const metadata: Metadata = { title: "Ôn tập ngắt quãng", description: "Thống kê học tập — theo dõi tiến độ và kế hoạch ôn tập ngắt quãng của bạn." };
export default function ReviewPage() { return <ReviewDashboard />; }
```

- [ ] **Step 5: Run tests verify pass + smoke**

Run: `pnpm vitest run src/components/stats src/app && pnpm typecheck`
Expected: PASS 5 tests, typecheck sạch.
Smoke: `pnpm dev` → `/review` thấy 6 ô màu đúng + donut 4 lát + bars 7 cột; star 1 từ ở `/lesson/hsk1/lesson-1` rồi quay lại `/review` → "Mới thêm" = 1.

- [ ] **Step 6: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src
git commit -m "feat: /review dashboard (F1) — 6 ô SRS suy diễn 21 ngày + seeded, donut largest-remainder, bars 7 ngày"
```

### Task 6: F2 — `/progress` XP card + heatmap 12 tháng

**Files:**
- Create: `app-next/src/components/stats/heatmap.tsx`
- Create: `app-next/src/app/(app)/progress/page.tsx` (server, metadata) + `app-next/src/app/(app)/progress/progress-client.tsx` (client)
- Test: `app-next/src/components/stats/__tests__/heatmap.test.tsx`, `app-next/src/app/(app)/progress/__tests__/progress-client.test.tsx`
- Port-from: `clone/js/progress.js:1-235`, `clone/js/data/` không có (data inline trong progress.js), `clone/specs/SPEC-11-progress-stats.md`

**Interfaces:**
- Consumes: Task 2 (`heatData`, `heatClass`, `vnDay`, `computeStreak`, `mulberry32`), Task 1 (`progressStore.getXp/getStreak/listPageDone/getAllSrs/isLoggedIn`), Task 3 (`LoginGate` + `notebookSubGate` không dùng ở đây — sub progress hardcode), Task 4 (không — sub gate progress là chuỗi riêng), plan learning-core (`useProgress` reactive, `useLoginModal` qua LoginGate).
- Produces:
  - `export function Heatmap({ real, now }: { real: Record<string, number> | null; now?: Date }): JSX.Element` — card "Lịch học" + "12 tháng gần đây", 12 cột tháng lùi từ tháng hiện tại, mỗi ô `span` 10×10px `rounded-[2px]` class từ `heatClass(v)`, `title="Tháng M ngày D: Xp N"`, nhãn cột "Tháng M"; grid `repeat(12,1fr)` `overflow-x-auto`.
  - `export default function ProgressClient(): JSX.Element` — bọc `<LoginGate pageSub="Tiến độ học của bạn sẽ được đồng bộ sau khi đăng nhập.">`: Card "Điểm của bạn" (icon ⚡ nền `#ffe9a8`, XP lớn màu `--nhai-main`, sub "Mỗi câu trả lời đúng +1 điểm", badge 🏆 "Dạng xếp hạng" `#{rank}` với `rank = xp > 0 ? 14594 - xp : 14594`, nút Link `/leaderboard` "Xem bảng xếp hạng →"); h2 "Thống kê học tập" + 4 stat card (🔥 Chuỗi ngày học `computeStreak(heat, hôm nay)` (max với `progressStore.getStreak()`), sub "Học hôm nay để bắt đầu chuỗi"; 📖 Từ đã thuộc = số SRS `status ∈ {learned, known}` từ `getAllSrs()`, sub "trên tổng 9789 từ"; ✅ Bài hoàn thành `N/153` = số key `listPageDone()` có ≥2 dòng (port `doneLessons`: value ≥ 2 — plan learning-core lưu value 1 per `<book>/<page>`; đọc map `nhai.pageDone` qua `progressStore.listPageDone()` và đếm entry — SP1 đếm mỗi page đã done, ghi comment UPG-2 sẽ đếm theo `page_dones ≥ 2 skill`; hiển thị "Xong khi học đủ 2 chế độ"), 🎯 Hôm nay `nhai.today` câu sub "Số câu trả lời đúng trong ngày"); `<Heatmap real={nhai.heat} />` — đọc `nhai.heat` qua helper `progressStore.getHeat(): Record<string, number> | null` (thêm method nếu chưa có: JSON parse key `nhai.heat`, hỏng → null).
  - Route `page.tsx`: `export const metadata = { title: "Tiến độ học" };` render `<ProgressClient />`.

- [ ] **Step 1: Write the failing tests**

Tạo `app-next/src/components/stats/__tests__/heatmap.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Heatmap } from "../heatmap";

describe("Heatmap (F2)", () => {
  it("12 cột tháng, ô có title đúng format, ô có XP màu mức đỏ", () => {
    const { container } = render(<Heatmap real={{ "2026-09-30": 6 }} now={new Date(2026, 8, 30)} />);
    expect(container.textContent).toContain("12 tháng gần đây");
    expect(container.textContent).toContain("Tháng 9");
    const cells = container.querySelectorAll("[data-heat-cell]");
    expect(cells.length).toBeGreaterThan(300); // 12 tháng × 28–31 ngày
    const hot = Array.from(cells).find((c) => c.getAttribute("title") === "Tháng 9 ngày 30: Xp 6");
    expect(hot).toBeDefined();
    expect(hot!.className).toContain("bg-[#a83232]");
  });
  it("không có real → seeded, ô vẫn có title Xp", () => {
    const { container } = render(<Heatmap real={null} now={new Date(2026, 8, 30)} />);
    expect(container.querySelector("[data-heat-cell]")).not.toBeNull();
    expect(container.querySelector("[data-heat-cell]")!.getAttribute("title")).toMatch(/^Tháng \d+ ngày \d+: Xp \d+$/);
  });
});
```

Tạo `app-next/src/app/(app)/progress/__tests__/progress-client.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ProgressClient from "../progress-client";

vi.mock("@/components/shell/login-modal", () => ({
  useLoginModal: () => ({ isOpen: false, openLogin: vi.fn(), close: vi.fn() }),
}));

beforeEach(() => localStorage.clear());

describe("ProgressClient (F2)", () => {
  it("chưa login → gate 🔒 với sub progress", () => {
    render(<ProgressClient />);
    expect(screen.getByText("Tiến độ học của bạn sẽ được đồng bộ sau khi đăng nhập.")).toBeInTheDocument();
  });
  it("mockLogin → card Điểm của bạn + rank #14594 (xp=0) + 4 stat card", () => {
    localStorage.setItem("nhai.mockLogin", "1");
    render(<ProgressClient />);
    expect(screen.getByText("Điểm của bạn")).toBeInTheDocument();
    expect(screen.getByText("#14594")).toBeInTheDocument();
    expect(screen.getByText("Mỗi câu trả lời đúng +1 điểm")).toBeInTheDocument();
    expect(screen.getByText("Chuỗi ngày học")).toBeInTheDocument();
    expect(screen.getByText("trên tổng 9789 từ")).toBeInTheDocument();
    expect(screen.getByText("Xong khi học đủ 2 chế độ")).toBeInTheDocument();
    expect(screen.getByText(/153/)).toBeInTheDocument();
  });
  it("xp > 0 → rank = 14594 − xp", () => {
    localStorage.setItem("nhai.mockLogin", "1");
    localStorage.setItem("nhai.xp", "94");
    render(<ProgressClient />);
    expect(screen.getByText("#14500")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests verify fail**

Run: `pnpm vitest run src/components/stats/__tests__/heatmap.test.tsx src/app/(app)/progress`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Implement Heatmap component**

`heatmap.tsx` — port `renderHeatmap` từ `clone/js/progress.js:125-153`:

```tsx
"use client";
import { heatClass, heatData } from "@/lib/stats/heatmap";

export function Heatmap({ real, now = new Date() }: { real: Record<string, number> | null; now?: Date }) {
  const map = heatData(real, now);
  const cols = [];
  for (let back = 11; back >= 0; back--) {
    const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const y = d.getFullYear(), m = d.getMonth();
    const days = new Date(y, m + 1, 0).getDate();
    const cells = [];
    for (let day = 1; day <= days; day++) {
      const key = y + "-" + String(m + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
      const v = map[key] || 0;
      cells.push(
        <span key={key} data-heat-cell
          className={"block w-[10px] h-[10px] rounded-[2px] " + heatClass(v)}
          title={`Tháng ${m + 1} ngày ${day}: Xp ${v}`} />
      );
    }
    cols.push(
      <div key={key(y, m)} className="flex flex-col items-center gap-[3px] min-w-0">
        <span className="text-[10px] font-bold text-[var(--nhai-muted)] mb-1 whitespace-nowrap">Tháng {m + 1}</span>
        <div className="flex flex-col gap-[3px]">{cells}</div>
      </div>
    );
  }
  return (
    <div className="card shadow-neo p-5">
      <h3 className="font-extrabold mb-1">Lịch học</h3>
      <p className="text-xs text-[var(--nhai-muted)] mb-4">12 tháng gần đây</p>
      <div data-heat className="grid gap-2" style={{ gridTemplateColumns: "repeat(12,1fr)", overflowX: "auto" }}>{cols}</div>
    </div>
  );
}
function key(y: number, m: number) { return `${y}-${m}`; }
```

(Tooltip hover của clone dùng div fixed theo mouse — SP1 dùng `title` attr native, đủ acceptance "tooltip đúng giá trị ô đó"; bản custom tooltip không bắt buộc.)

- [ ] **Step 4: Implement ProgressClient + route + getHeat**

Thêm `getHeat()` vào `progress-store.ts` nếu plan learning-core chưa có (JSON parse `nhai.heat` → `Record<string, number> | null`, try/catch → null). `progress-client.tsx` — `"use client"`, port `renderLoggedIn` từ `clone/js/progress.js:155-212` sang JSX theo Interfaces: `const { xp } = useProgress();` (XP reactive), `const rank = xp > 0 ? 14594 - xp : 14594;` (UPG-2 bỏ công thức này), streak `Math.max(progressStore.getStreak(), computeStreak(heat, vnDay(new Date())))` với `heat = progressStore.getHeat() ?? {}`, known words đếm từ `progressStore.getAllSrs().filter((s) => s.status === "learned" || s.status === "known").length`, done lessons: `progressStore.listPageDone().length` hiển thị `N/153`. Route `page.tsx` với `metadata = { title: "Tiến độ học" }`.

- [ ] **Step 5: Run tests verify pass + smoke**

Run: `pnpm vitest run src/components/stats src/app/(app)/progress && pnpm typecheck`
Expected: PASS 5 tests, typecheck sạch.
Smoke: `pnpm dev` → `/progress` 🔒; login mock qua shell → heatmap 12 cột render, hover ô thấy title "Tháng M ngày D: Xp N".

- [ ] **Step 6: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src
git commit -m "feat: /progress (F2) — XP card rank 14594−xp, 4 stat card, heatmap 12 tháng seeded+real, gate 🔒"
```

### Task 7: F3/F4 — NotebookList khuôn chung + `/my-vocab` + `/my-grammar`

**Files:**
- Create: `app-next/src/components/notebook/notebook-list.tsx` (khuôn chung — 1 template cho cả 2 route)
- Create: `app-next/src/app/(app)/my-vocab/page.tsx`, `app-next/src/app/(app)/my-grammar/page.tsx`
- Test: `app-next/src/components/notebook/__tests__/notebook-list.test.tsx`
- Port-from: `clone/js/notebook.js:1-213` (phần list), `clone/js/data/notebooks.js`, `clone/specs/SPEC-18-notebooks.md`

**Interfaces:**
- Consumes: Task 1 (`progressStore.listDecks/createDeck/renameDeck/deleteDeck`), Task 3 (`LoginGate`), Task 4 (`notebooks`, `notebookSubGate`), plan learning-core (`useToast`, `useLoginModal` qua LoginGate).
- Produces:
  - `export function NotebookList({ kind }: { kind: "vocab" | "grammar" }): JSX.Element` — H1 `🍅 {config.h1}` + sub + nút CTA phải (`btn-main rounded-full`); empty state khi `listDecks(kind).length === 0` (📕 + `config.empty` + `config.emptySub` + CTA thứ hai); grid card = user items **concat samples** (samples luôn sau, badge "Sổ mẫu", không menu ⋯, bấm vẫn mở chi tiết); card: tên link `/notebook/{kind}/{id}` + `{count} {unit}` + "Sửa {ngày tương đối}" + menu ⋯ (Mở / Sửa tên / Xoá với `confirm()`); modal tạo/sửa tên 1 textfield placeholder "Nhập tên sổ tay / bộ từ vựng…", nút "Tạo"/"Lưu" disabled khi rỗng, Enter = submit, ✕ + Huỷ + backdrop đóng; toast "Đã tạo {tên}" / `Đã đổi tên thành "{tên}"` / "Đã xoá {tên}".
  - `export function fmtRelativeDate(iso: string): string` (export để test) — port `fmtDate` từ `clone/js/notebook.js:34-47`: "Hôm nay" / "Hôm qua" / "N ngày trước" (< 30) / `toLocaleDateString("vi-VN")`.
  - Route pages: `/my-vocab` → `metadata { title: "Sổ tay từ vựng" }` render `<LoginGate pageSub={notebookSubGate.vocab}><NotebookList kind="vocab" /></LoginGate>`; `/my-grammar` → tương tự `kind="grammar"`.

- [ ] **Step 1: Write the failing test**

Tạo `app-next/src/components/notebook/__tests__/notebook-list.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NotebookList, fmtRelativeDate } from "../notebook-list";

vi.mock("@/components/shell/login-modal", () => ({
  useLoginModal: () => ({ isOpen: false, openLogin: vi.fn(), close: vi.fn() }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

beforeEach(() => localStorage.clear());

describe("fmtRelativeDate", () => {
  it("Hôm nay / Hôm qua / N ngày trước", () => {
    const now = new Date();
    expect(fmtRelativeDate(now.toISOString())).toBe("Hôm nay");
    expect(fmtRelativeDate(new Date(now.getTime() - 86400000).toISOString())).toBe("Hôm qua");
    expect(fmtRelativeDate(new Date(now.getTime() - 5 * 86400000).toISOString())).toBe("5 ngày trước");
  });
});

describe("NotebookList (F3/F4)", () => {
  it("kind=vocab: H1/sub/cta/empty đúng SPEC-18, samples luôn render sau items", () => {
    render(<NotebookList kind="vocab" />);
    expect(screen.getByRole("heading", { name: /Sổ tay từ vựng/ })).toBeInTheDocument();
    expect(screen.getByText("Tự tạo bộ từ vựng để học chủ động — nhập từ tài liệu của bạn…")).toBeInTheDocument();
    expect(screen.getAllByText("Tạo bộ mới").length).toBe(2); // CTA header + empty CTA
    expect(screen.getByText("Chưa có bộ từ vựng nào")).toBeInTheDocument();
    expect(screen.getByText("Từ vực HSK 3.0")).toBeInTheDocument(); // sample vẫn hiện khi store rỗng
    expect(screen.getByText("Sổ mẫu")).toBeInTheDocument();
  });
  it("modal tạo: nút Tạo disabled khi rỗng, Enter submit, prepend + toast + persist", async () => {
    const user = userEvent.setup();
    render(<NotebookList kind="vocab" />);
    await user.click(screen.getAllByText("Tạo bộ mới")[0]);
    const input = screen.getByPlaceholderText("Nhập tên sổ tay / bộ từ vựng…");
    expect(screen.getByText("Tạo")).toBeDisabled();
    await user.type(input, "Từ vựng giáo trình 2");
    expect(screen.getByText("Tạo")).toBeEnabled();
    await user.keyboard("{Enter}");
    expect(screen.getByText("Đã tạo Từ vựng giáo trình 2")).toBeInTheDocument();
    expect(screen.getAllByText("Từ vựng giáo trình 2").length).toBeGreaterThan(0);
    const stored = JSON.parse(localStorage.getItem("nhai.decks")!);
    expect(stored[0].name).toBe("Từ vựng giáo trình 2"); // prepend
  });
  it("kind=grammar đọc nhai.notebooks — hai route dùng 1 template", () => {
    render(<NotebookList kind="grammar" />);
    expect(screen.getByRole("heading", { name: /Sổ tay ngữ pháp/ })).toBeInTheDocument();
    expect(screen.getByText("Mẫu câu gọi thoại")).toBeInTheDocument(); // 2 sample grammar
    expect(screen.getByText("Ngữ pháp hay sai")).toBeInTheDocument();
  });
  it("xoá deck qua menu ⋯ với confirm", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("confirm", () => true);
    render(<NotebookList kind="vocab" />);
    await user.click(screen.getAllByText("Tạo bộ mới")[0]);
    await user.type(screen.getByPlaceholderText("Nhập tên sổ tay / bộ từ vựng…"), "Bộ xoá");
    await user.click(screen.getByText("Tạo"));
    await user.click(screen.getByRole("button", { name: "Tuỳ chọn" }));
    await user.click(screen.getByText("Xoá"));
    expect(screen.getByText("Đã xoá Bộ xoá")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("nhai.decks")!)).toHaveLength(0);
    vi.unstubAllGlobals();
  });
});
```

- [ ] **Step 2: Run test verify fail**

Run: `pnpm vitest run src/components/notebook`
Expected: FAIL — module `../notebook-list` không tồn tại.

- [ ] **Step 3: Implement NotebookList**

Port list của `clone/js/notebook.js` sang JSX (một component duy nhất — không copy code giữa 2 route):
- Modal rename/create: state `modal: null | { mode: "create" } | { mode: "rename"; item: DeckItem }`; markup `.modal-backdrop` + `.card shadow-neo max-w-md` (port `openModal` dòng 54-102): h3 = `mode === "rename" ? "Sửa tên" : config.modalTitle`, input controlled, submit disabled `!name.trim()`, `onKeyDown` Enter → submit, nút "Tạo"/"Lưu".
- Menu ⋯: state `menuFor: DeckItem | null` — absolute card dưới nút (port `openCardMenu`), 3 nút "Mở" (`router.push`), "Sửa tên", "Xoá" đỏ (`confirm('Xoá "' + name + '"?')` → `deleteDeck` + toast).
- Grid: `store.concat(config.samples)`; sample card: `item.count + " " + item.unit` + "Sổ mẫu"; user card: `item.rows.length + " " + config.countUnit` + "Sửa " + `fmtRelativeDate(item.updatedAt)`.
- `document.title` không cần ở list (metadata đảm nhiệm).

- [ ] **Step 4: Implement 2 routes**

`app/(app)/my-vocab/page.tsx`:

```tsx
import type { Metadata } from "next";
import { LoginGate } from "@/components/personal/login-gate";
import { NotebookList } from "@/components/notebook/notebook-list";
import { notebookSubGate } from "@/content/notebooks";
export const metadata: Metadata = { title: "Sổ tay từ vựng" };
export default function MyVocabPage() {
  return (
    <LoginGate pageSub={notebookSubGate.vocab}>
      <NotebookList kind="vocab" />
    </LoginGate>
  );
}
```

`app/(app)/my-grammar/page.tsx` — giống hệt với `kind="grammar"`, `title: "Sổ tay ngữ pháp"`, `notebookSubGate.grammar`. (Vẫn là 2 file route mỏng — logic chỉ nằm trong NotebookList, đúng acceptance "không copy code".)

- [ ] **Step 5: Run test verify pass + smoke**

Run: `pnpm vitest run src/components/notebook && pnpm typecheck`
Expected: PASS 6 tests, typecheck sạch.
Smoke: `pnpm dev` → login mock → `/my-vocab` tạo bộ → reload còn; `/my-grammar` đúng nhãn; logout mock → 🔒 đúng sub từng trang.

- [ ] **Step 6: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src
git commit -m "feat: NotebookList khuôn chung SPEC-18 + routes /my-vocab /my-grammar (F3/F4, gate F6)"
```

### Task 8: F5 — `/notebook/[kind]/[id]` bảng rows + demo toast

**Files:**
- Create: `app-next/src/app/(app)/notebook/[kind]/[id]/page.tsx` (server wrapper) + `app-next/src/app/(app)/notebook/[kind]/[id]/notebook-detail.tsx` (client)
- Test: `app-next/src/app/(app)/notebook/[kind]/[id]/__tests__/notebook-detail.test.tsx`
- Port-from: `clone/js/notebook.js:214-272` (renderDetail), `clone/specs/SPEC-18-notebooks.md` §D

**Interfaces:**
- Consumes: Task 1 (`progressStore.getDeckItem/listDecks`), Task 3 (`LoginGate`), Task 4 (`notebooks`, `notebookSubGate`, type `NotebookRow`), plan learning-core (`useToast`, `useLoginModal` qua LoginGate).
- Produces:
  - `export default function NotebookDetail({ kind, id }: { kind: "vocab" | "grammar"; id: string }): JSX.Element` — link "← {config.h1}" (`/my-vocab` / `/my-grammar`), H1 `🍅 {title}` + sub, nút "＋ Thêm từ" (toast "Thêm từ vào sổ tay — sắp có (demo)" — SP1 port đúng hiện trạng, UPG-2 sẽ CRUD thật); bảng 4 cột Chữ / Pinyin / Hán Việt / Nghĩa, mỗi dòng `border-t border-[var(--nhai-border)]`, wrapper `overflow-x-auto`; **fallback rows** (port `notebook.js:229-234` giữ fix round-1): `kind` từ params quyết định storage (`progressStore.listDecks(kind)`) — user item theo `id` → `item.rows` nếu có; else sample item theo id → `sample.rows`; else `notebooks[kind].samples[0].rows`; `title` = user name > sample name > "Sổ tay".
  - `page.tsx`: server — `export async function generateMetadata({ params }): Promise<Metadata>` với `const { kind, id } = await params;` — title sẽ do client set `document.title = title + " | Nhai HSK"` trong effect (clone hành vi này; metadata tĩnh `{ title: "Sổ tay" }` làm fallback); validate `kind ∈ {vocab, grammar}` else `notFound()`; render `<LoginGate pageSub={notebookSubGate[kind]}><NotebookDetail kind={kind} id={id} /></LoginGate>`.

- [ ] **Step 1: Write the failing test**

Tạo `app-next/src/app/(app)/notebook/[kind]/[id]/__tests__/notebook-detail.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import NotebookDetail from "../notebook-detail";

vi.mock("@/components/shell/login-modal", () => ({
  useLoginModal: () => ({ isOpen: false, openLogin: vi.fn(), close: vi.fn() }),
}));

beforeEach(() => localStorage.clear());

describe("NotebookDetail (F5)", () => {
  it("deck user không có rows → fallback 12 dòng mẫu của sample đầu; kind quyết định storage (fix round-1)", () => {
    localStorage.setItem("nhai.notebooks", JSON.stringify([
      { id: "nb-g1", name: "Sổ ngữ pháp của tôi", rows: [], updatedAt: new Date().toISOString() },
    ]));
    render(<NotebookDetail kind="grammar" id="nb-g1" />);
    expect(screen.getByRole("heading", { name: /Sổ ngữ pháp của tôi/ })).toBeInTheDocument();
    expect(screen.getByText("时间")).toBeInTheDocument(); // MOCK_ROWS[0]
    expect(screen.getByText("← Sổ tay ngữ pháp")).toHaveAttribute("href", "/my-grammar");
    expect(screen.getByText("Chữ")).toBeInTheDocument();
    expect(screen.getByText("Nghĩa")).toBeInTheDocument();
  });
  it("user rows có nội dung → hiện rows user (hanviet thường giữ nguyên)", () => {
    localStorage.setItem("nhai.decks", JSON.stringify([
      { id: "nb-1", name: "Bộ thử", rows: [{ hanzi: "朋友", pinyin: "péngyou", hanviet: "bằng hữu", meaning: "bạn bè" }], updatedAt: new Date().toISOString() },
    ]));
    render(<NotebookDetail kind="vocab" id="nb-1" />);
    expect(screen.getByText("朋友")).toBeInTheDocument();
    expect(screen.getByText("bằng hữu")).toBeInTheDocument();
    expect(screen.queryByText("时间")).not.toBeInTheDocument();
  });
  it("bấm ＋ Thêm từ → toast demo (SP1 không fake bảng editable)", () => {
    localStorage.setItem("nhai.decks", JSON.stringify([
      { id: "nb-1", name: "Bộ thử", rows: [], updatedAt: new Date().toISOString() },
    ]));
    render(<NotebookDetail kind="vocab" id="nb-1" />);
    act(() => screen.getByText("＋ Thêm từ").click());
    expect(screen.getByText("Thêm từ vào sổ tay — sắp có (demo)")).toBeInTheDocument();
  });
  it("sample id (không ở store) → title + rows từ sample", () => {
    render(<NotebookDetail kind="vocab" id="vocab-textbook" />);
    expect(screen.getByRole("heading", { name: /Từ trong sách giáo khoa/ })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test verify fail**

Run: `pnpm vitest run "src/app/(app)/notebook"`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Implement NotebookDetail + route**

`notebook-detail.tsx` — `"use client"`; port `renderDetail` từ `clone/js/notebook.js:214-272` sang JSX theo Interfaces. Fallback rows:

```ts
const user = progressStore.getDeckItem(kind, id);
const sample = notebooks[kind].samples.find((s) => s.id === id) ?? null;
const rows: NotebookRow[] =
  user && user.rows.length ? user.rows :
  sample ? sample.rows :
  notebooks[kind].samples[0].rows;
const title = user?.name ?? sample?.name ?? "Sổ tay";
useEffect(() => { document.title = title + " | Nhai HSK"; return () => { document.title = "Nhai HSK"; }; }, [title]);
```

Bảng: `<div className="card shadow-neo p-2 overflow-x-auto"><table className="w-full text-sm">` với thead 4 cột `text-left py-2 px-3`, tbody `rows.map` → `<tr className="border-t border-[var(--nhai-border)]">` (hanzi cell `font-bold zh text-lg`). Nút "＋ Thêm từ" (`btn-main rounded-full px-5 py-2.5 text-sm`) → `toast("Thêm từ vào sổ tay — sắp có (demo)")`.

`page.tsx`:

```tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LoginGate } from "@/components/personal/login-gate";
import { notebookSubGate } from "@/content/notebooks";
import NotebookDetail from "./notebook-detail";
export const metadata: Metadata = { title: "Sổ tay" };

export default async function NotebookPage({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  if (kind !== "vocab" && kind !== "grammar") notFound();
  return (
    <LoginGate pageSub={notebookSubGate[kind]}>
      <NotebookDetail kind={kind} id={id} />
    </LoginGate>
  );
}
```

- [ ] **Step 4: Run test verify pass**

Run: `pnpm vitest run "src/app/(app)/notebook" && pnpm typecheck`
Expected: PASS 4 tests, typecheck sạch.

- [ ] **Step 5: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git commit -m "feat: /notebook/[kind]/[id] (F5) — bảng 4 cột + fallback rows 3 tầng + demo toast, gate F6"
```

*(Commit từ repo root: `cd /Volumes/samsung512/Code/hsk && git add app-next/src && git commit …`.)*

### Task 9: G1 (1/2) — `dictionary.ts` search lib 3 kiểu

**Files:**
- Create: `app-next/src/lib/search/dictionary.ts`
- Test: `app-next/src/lib/search/__tests__/dictionary.test.ts`

**Interfaces:**
- Consumes: Task 4 (`DictEntry` type + `dictionary` data), plan learning-core (`stripTones` từ `@/lib/pinyin-utils`).
- Produces: `export function isCJK(s: string): boolean` (regex `[\u3400-\u9fff]`); `export function pyJoin(entry: Pick<DictEntry, "pinyinPerChar">): string` (`pinyinPerChar.join(" ")`); `export function searchEntries(entries: DictEntry[], raw: string): DictEntry[]` — port `search()` từ `clone/js/dictionary.js:42-56`: q trim, rỗng → `[]`; `isCJK(q)` → filter `e.hanzi.indexOf(q) !== -1`; else pinyin không dấu: `nq = stripTones(q).replace(/\s+/g, "")` so `py.indexOf(nq)` (không khoảng cách) hoặc `nqs = stripTones(q)` so `pySp.indexOf(nqs)` (giữ khoảng cách); else nghĩa Việt: `e.meanings.some((m) => m.toLowerCase().indexOf(q.toLowerCase()) !== -1)`. Khác clone: nếu pinyin không khớp entry nào thì rơi xuống kiểm tra nghĩa Việt trong cùng lần filter (giữ OR như clone — clone trả true nếu bất kỳ nhánh khớp).

- [ ] **Step 1: Write the failing test**

Tạo `app-next/src/lib/search/__tests__/dictionary.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { searchEntries, isCJK, pyJoin } from "../dictionary";
import { dictionary } from "@/content/dictionary";

describe("dictionary search 3 kiểu (G1)", () => {
  it("CJK 学习 → đủ 5 kết quả nhóm 学习", () => {
    const r = searchEntries(dictionary, "学习");
    expect(r.map((e) => e.hanzi)).toEqual(["学习", "学习刻苦", "学习强国", "学习时报", "学习委员"]);
  });
  it("pinyin không dấu xuexi và có dấu xuéxí → cùng kết quả (学习 trước)", () => {
    const a = searchEntries(dictionary, "xuexi");
    const b = searchEntries(dictionary, "xuéxí");
    expect(a.map((e) => e.hanzi)).toEqual(b.map((e) => e.hanzi));
    expect(a[0].hanzi).toBe("学习");
    expect(a.length).toBeGreaterThanOrEqual(5);
  });
  it("nghĩa Việt 'học' → có 学习 trong kết quả", () => {
    const r = searchEntries(dictionary, "học");
    expect(r.some((e) => e.hanzi === "学习")).toBe(true);
  });
  it("nghĩa Việt 'xin chào' → 你好", () => {
    expect(searchEntries(dictionary, "xin chào")[0]?.hanzi).toBe("你好");
  });
  it("không khớp → mảng rỗng", () => {
    expect(searchEntries(dictionary, "zzzzz")).toEqual([]);
    expect(searchEntries(dictionary, "")).toEqual([]);
  });
  it("isCJK + pyJoin", () => {
    expect(isCJK("学习")).toBe(true);
    expect(isCJK("xuexi")).toBe(false);
    expect(pyJoin({ pinyinPerChar: ["xué", "xí"] })).toBe("xué xí");
  });
});
```

- [ ] **Step 2: Run test verify fail**

Run: `pnpm vitest run src/lib/search`
Expected: FAIL — module `../dictionary` không tồn tại.

- [ ] **Step 3: Implement search lib**

```ts
import { stripTones } from "@/lib/pinyin-utils";
import type { DictEntry } from "@/content/dictionary";

export function isCJK(s: string): boolean {
  return /[\u3400-\u9fff]/.test(s);
}
export function pyJoin(entry: Pick<DictEntry, "pinyinPerChar">): string {
  return entry.pinyinPerChar.join(" ");
}
export function searchEntries(entries: DictEntry[], raw: string): DictEntry[] {
  const q = String(raw || "").trim();
  if (!q) return [];
  const nq = stripTones(q).replace(/\s+/g, "");
  const nqs = stripTones(q);
  const vi = q.toLowerCase();
  return entries.filter((e) => {
    if (isCJK(q)) return e.hanzi.indexOf(q) !== -1;
    const py = stripTones(pyJoin(e)).replace(/\s+/g, "");
    if (nq && py.indexOf(nq) !== -1) return true;
    const pySp = stripTones(pyJoin(e));
    if (nqs && pySp.indexOf(nqs) !== -1) return true;
    return e.meanings.some((m) => m.toLowerCase().indexOf(vi) !== -1);
  });
}
```

- [ ] **Step 4: Run test verify pass**

Run: `pnpm vitest run src/lib/search`
Expected: PASS 6 tests.

- [ ] **Step 5: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src/lib/search
git commit -m "feat: dictionary search lib — CJK substring / pinyin stripTones (có-không khoảng cách) / nghĩa Việt"
```

### Task 10: G1 (2/2) — DrawPad + DrawModal + `/dictionary` page

**Files:**
- Create: `app-next/src/components/hanzi/draw-pad.tsx`
- Create: `app-next/src/components/hanzi/draw-modal.tsx`
- Create: `app-next/src/app/(app)/dictionary/page.tsx` (server, metadata) + `app-next/src/app/(app)/dictionary/dictionary-client.tsx` (client)
- Test: `app-next/src/components/hanzi/__tests__/draw-pad.test.tsx`, `app-next/src/app/(app)/dictionary/__tests__/dictionary-client.test.tsx`
- Port-from: `clone/js/draw-pad.js:1-141`, `clone/js/draw-modal.js:1-149`, `clone/js/dictionary.js:1-218`, `clone/specs/SPEC-09-dictionary-static.md` §1

**Interfaces:**
- Consumes: Task 1 (`progressStore.addToVocabBook/getVocabBook`), Task 4 (`dictionary`, `DictEntry`), Task 9 (`searchEntries`, `pyJoin`, `isCJK`), plan learning-core (`useTts`, `stripTones`, `useToast`).
- Produces:
  - `export function DrawPad({ size = 280, suggestions = ["你", "好", "学"], onPick }: { size?: number; suggestions?: string[]; onPick?: (ch: string) => void }): JSX.Element` — imperative canvas (useRef + useEffect): grid 4×4 mờ `--nhai-border`, placeholder "Vẽ chữ Hán vào đây", nét lineWidth 4 round, nét < 2 điểm = chấm bán kính 2; pointer events `pointerdown/move/up/cancel/leave` với `setPointerCapture` trong try/catch; nút "↩ Xoá nét cuối" / "✕ Xoá hết" disabled khi không có nét; gợi ý pill hiện khi có nét → `onPick(ch)`. Cleanup: remove 5 listeners + bỏ ref. **Chữ "Tra chữ này" KHÔNG có ở DrawPad** (đó là DrawModal).
  - `export function DrawModal({ open, onClose, onResult }: { open: boolean; onClose: () => void; onResult: (ch: string) => void }): JSX.Element` — port `draw-modal.js`: `open === false` → null; `.modal-backdrop` + card `max-w-sm`, h2 "✍️ Vẽ chữ để tra", sub "Vẽ chữ Hán vào ô bên dưới rồi bấm “Tra chữ này” (bản demo nhận diện giả lập).", canvas 280 DPR-aware, nút undo/clear, gợi ý "Có thể là: 你", nút "Tra chữ này" `btn-main w-full` → `onResult("你")` + `onClose()` (nhận diện giả lập theo SPEC-09; UPG-5 sẽ gọi `POST /ai/handwrite`).
  - `export default function DictionaryClient(): JSX.Element` — search bar (input placeholder "Chữ Hán, pinyin hoặc nghĩa tiếng Việt… (vd: 学习, xuexi, học)" + nút "Tra từ" disabled khi rỗng + nút xoá "Xoá từ khoá" hiện khi có text + nút "Vẽ chữ để tra"); `?q=` init qua `useSearchParams()` (bọc Suspense trong page) và cập nhật bằng `window.history.replaceState(null, "", q ? "/dictionary?q=" + encodeURIComponent(q) : "/dictionary")` (F5 giữ kết quả); không query → card "Gợi ý tra nhanh" 5 pill 学习/你好/时间/老师/学生 bấm được + đoạn hướng dẫn verbatim; kết quả: "Trung → Việt" + "{N} kết quả cho “{q}”" + entry cards; không thấy → "Không tìm thấy “{q}”. Thử chữ Hán, pinyin không dấu hoặc nghĩa tiếng Việt."; entry card (port `entryCard`): chữ Hán to + `pyJoin` + "(Phồn thể: …)" khi `traditional` + 🔊 (`speak(hanzi, { lang: "zh-CN" })`); nghĩa chính + badge pos + badge HSK + nút "⭐ Thêm vào sổ tay" (⭐ màu `var(--nhai-gold)` khi đã có; `addToVocabBook` true → toast "Đã thêm vào Sổ tay từ vựng ⭐", false → toast "Từ này đã có trong Sổ tay từ vựng"); "Xem từng chữ:" link từng ký tự → `/hanzi/{ch}`; nghĩa `<ol>` đánh số; "Ví dụ": câu zh với pinyin từng chữ màu muted + dịch + 🔊.
  - Route `page.tsx`: `export const metadata = { title: "Tra từ điển" };` render `<Suspense><DictionaryClient /></Suspense>`.

- [ ] **Step 1: Write the failing tests**

Tạo `app-next/src/components/hanzi/__tests__/draw-pad.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DrawPad } from "../draw-pad";

const ctxStub = {
  setTransform() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {},
  stroke() {}, fill() {}, arc() {}, fillText() {},
} as unknown as CanvasRenderingContext2D;

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctxStub);
});

function pointer(el: Element, type: string, x = 10, y = 10) {
  el.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y }));
}

describe("DrawPad (canvas imperative)", () => {
  it("chưa vẽ → undo/clear disabled, gợi ý ẩn; vẽ 1 nét → gợi ý 你/好/学 hiện", () => {
    const onPick = vi.fn();
    const { container } = render(<DrawPad onPick={onPick} />);
    const canvas = container.querySelector("canvas")!;
    expect(screen.getByText("↩ Xoá nét cuối")).toBeDisabled();
    expect(screen.getByText("✕ Xoá hết")).toBeDisabled();
    pointer(canvas, "pointerdown", 20, 20);
    pointer(canvas, "pointermove", 60, 60);
    pointer(canvas, "pointerup", 60, 60);
    expect(screen.getByText("↩ Xoá nét cuối")).toBeEnabled();
    expect(screen.getByText(/Có thể là:/)).toBeInTheDocument();
  });
  it("bấm gợi ý 你 → onPick('你'); Xoá hết → disabled trở lại", () => {
    const onPick = vi.fn();
    const { container } = render(<DrawPad onPick={onPick} />);
    const canvas = container.querySelector("canvas")!;
    pointer(canvas, "pointerdown"); pointer(canvas, "pointerup");
    screen.getByText("你").click();
    expect(onPick).toHaveBeenCalledWith("你");
    screen.getByText("✕ Xoá hết").click();
    expect(screen.getByText("✕ Xoá hết")).toBeDisabled();
  });
});
```

Tạo `app-next/src/app/(app)/dictionary/__tests__/dictionary-client.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DictionaryClient from "../dictionary-client";
import { progressStore } from "@/lib/store/progress-store";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.stubGlobal("speechSynthesis", { speak: vi.fn(), cancel: vi.fn(), getVoices: vi.fn(() => []) });

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, "", "/dictionary");
});

describe("DictionaryClient (G1)", () => {
  it("không query → Gợi ý tra nhanh 5 pill", () => {
    render(<DictionaryClient />);
    expect(screen.getByText("Gợi ý tra nhanh")).toBeInTheDocument();
    for (const w of ["学习", "你好", "时间", "老师", "学生"]) expect(screen.getByText(w)).toBeInstanceOf(HTMLElement);
  });
  it("search xuexi → 5+ kết quả nhóm 学习, ?q= ghi URL (F5 giữ kết quả)", async () => {
    const user = userEvent.setup();
    render(<DictionaryClient />);
    await user.type(screen.getByPlaceholderText(/Chữ Hán, pinyin hoặc nghĩa tiếng Việt/), "xuexi");
    await user.click(screen.getByText("Tra từ"));
    expect(screen.getByText(/kết quả cho/)).toBeInTheDocument();
    expect(window.location.search).toBe("?q=xuexi");
    expect(screen.getByText("(Phồn thể:")).toBeInTheDocument();
  });
  it("URL ?q=你 → tự search lúc mount", () => {
    window.history.replaceState(null, "", "/dictionary?q=你");
    render(<DictionaryClient />);
    expect(screen.getByText(/kết quả cho/)).toBeInTheDocument();
  });
  it("⭐ Thêm vào sổ tay: lần 1 ghi nhai.vocabBook, lần 2 toast trùng", async () => {
    const user = userEvent.setup();
    render(<DictionaryClient />);
    await user.type(screen.getByPlaceholderText(/Chữ Hán, pinyin hoặc nghĩa tiếng Việt/), "学习");
    await user.click(screen.getByText("Tra từ"));
    const addBtn = screen.getAllByText(/Thêm vào sổ tay/)[0];
    await user.click(addBtn);
    expect(progressStore.getVocabBook()[0].hanzi).toBe("学习");
    expect(screen.getByText("Đã thêm vào Sổ tay từ vựng ⭐")).toBeInTheDocument();
    await user.click(screen.getAllByText(/Thêm vào sổ tay/)[0]);
    expect(screen.getByText("Từ này đã có trong Sổ tay từ vựng")).toBeInTheDocument();
  });
  it("nút xoá dọn cả URL về /dictionary + quay lại gợi ý", async () => {
    const user = userEvent.setup();
    render(<DictionaryClient />);
    await user.type(screen.getByPlaceholderText(/Chữ Hán, pinyin hoặc nghĩa tiếng Việt/), "学习");
    await user.click(screen.getByText("Tra từ"));
    await user.click(screen.getByTitle("Xoá từ khoá"));
    expect(window.location.pathname + window.location.search).toBe("/dictionary");
    expect(screen.getByText("Gợi ý tra nhanh")).toBeInTheDocument();
  });
  it("không thấy → thông báo verbatim", async () => {
    const user = userEvent.setup();
    render(<DictionaryClient />);
    await user.type(screen.getByPlaceholderText(/Chữ Hán, pinyin hoặc nghĩa tiếng Việt/), "zzzz");
    await user.click(screen.getByText("Tra từ"));
    expect(screen.getByText(/Không tìm thấy “zzzz”\. Thử chữ Hán, pinyin không dấu hoặc nghĩa tiếng Việt\./)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests verify fail**

Run: `pnpm vitest run src/components/hanzi "src/app/(app)/dictionary"`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Implement DrawPad**

Port `clone/js/draw-pad.js` 1:1 sang imperative canvas trong `useEffect` (chạy 1 lần; `[size]` dependency). Refs: `canvasRef`, `strokesRef: number[][][]`, `currentRef`, `drawingRef`. State React chỉ cho UI: `strokeCount` (điều khiển disabled/gợi ý). `pos(e)` scale theo `size / r.width`. Cleanup return: `canvas.removeEventListener × 5`. `redraw()` giữ nguyên logic clone (grid 4×4 alpha 0.7, placeholder, chấm nhanh, nét round). Gợi ý: `strokeCount > 0 && <div>Có thể là: {suggestions.map(… pill button onClick={() => onPick?.(ch))}</div>`. **Giữ hàm `redraw` trong closure useEffect** (không dùng state cho toạ độ — imperative giữ imperative).

- [ ] **Step 4: Implement DrawModal + DictionaryClient + route**

`draw-modal.tsx`: bọc `open ? <div className="modal-backdrop" onClick={backdropClose}>…` — canvas vẽ tái dùng cùng pattern Step 3 (copy imperative block — 2 điểm mount là chấp nhận được vì DrawPad có gợi ý/pick khác DrawModal; nếu muốn DRY hơn được phép extract hook `usePointerCanvas(size)` nội bộ file `draw-pad.tsx` và export — chọn 1 cách, không làm cả hai). Nút "Tra chữ này" → `onResult("你"); onClose();`.

`dictionary-client.tsx` — port `clone/js/dictionary.js` sang JSX: state `q`, `submitted` (string | null); `const results = submitted ? searchEntries(dictionary, submitted) : null;`; `doSearch` set URL qua `history.replaceState` + `setSubmitted(q)`; entry card port `entryCard` + `zhWithPy` (span 2 dòng pinyin-trên/chữ-dưới, `zh-char` class không cần — dictionary dùng inline-block text-center mx-0.5); "Xem từng chữ": `e.hanzi.split("").map((ch) => <Link href={"/hanzi/" + encodeURIComponent(ch)}>…)`; nút xoá `title="Xoá từ khoá"`. Route `page.tsx`:

```tsx
import { Suspense } from "react";
import type { Metadata } from "next";
import DictionaryClient from "./dictionary-client";
export const metadata: Metadata = { title: "Tra từ điển", description: "Tra nghĩa tiếng Việt của từ tiếng Trung bằng chữ Hán, pinyin hoặc nghĩa tiếng Việt." };
export default function DictionaryPage() {
  return <Suspense><DictionaryClient /></Suspense>;
}
```

- [ ] **Step 5: Run tests verify pass + smoke**

Run: `pnpm vitest run src/components/hanzi "src/app/(app)/dictionary" && pnpm typecheck`
Expected: PASS 8 tests, typecheck sạch.
Smoke: `pnpm dev` → `/dictionary?q=xuexi` F5 giữ kết quả; nút "Vẽ chữ để tra" mở modal, vẽ vài nét → bấm "Tra chữ này" → input filled 你 + kết quả nhóm 学习 hiện.

- [ ] **Step 6: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src
git commit -m "feat: /dictionary (G1) — search 3 kiểu + entry card + vocabBook + DrawPad/DrawModal vẽ-giả trả 你"
```

### Task 11: G2 (1/2) — content `hanzi-strokes` + StrokePlayer (rAF 420/90 easeInOutQuad)

**Files:**
- Create: `app-next/src/content/hanzi-strokes.ts` (port `clone/js/hanzi-writer.js:9-29`)
- Create: `app-next/src/components/hanzi/stroke-player.tsx`
- Test: `app-next/src/components/hanzi/__tests__/stroke-player.test.tsx`

**Interfaces:**
- Consumes: Task 2 (vitest).
- Produces:
  - `hanzi-strokes.ts`: `export type StrokePolyline = number[][];` (điểm toạ độ 0–100); `export const STROKE_DATA: Record<string, StrokePolyline[]>` — 你 đủ 7 nét (copy polyline verbatim `clone/js/hanzi-writer.js:10-19`); `export function genericStrokes(): StrokePolyline[]` (khung 口 4 nét verbatim dòng 22-29).
  - `export function useStrokePlayer(containerRef: React.RefObject<HTMLElement | null>, char: string, deps?: unknown[]): { play: () => void; showArrows: (on: boolean) => void; setZoom: (on: boolean) => void; hasCustomStrokes: boolean }` — effect mount build `<svg viewBox="0 0 100 100" class="absolute inset-0 w-full h-full pointer-events-none" aria-hidden>` + `<defs><marker id="nhai-hw-{uid}-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 1 L 9 5 L 0 9 z" fill="var(--nhai-main,#c23b22)"/></marker></defs>` + mỗi nét 1 `<polyline points stroke="var(--nhai-main,#c23b22)" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" pathLength="1" style="strokeDasharray:1;strokeDashoffset:1">`; `play()` = rAF loop **DUR 420ms/nét + GAP 90ms nghỉ, easeInOutQuad** (`k < 0.5 ? 2k² : 1 − (−2k+2)²/2`), nét xong set `"0"` chuyển nét kế (port chính xác `Writer.prototype.play` `clone/js/hanzi-writer.js:81-101`); `showArrows(on)` toggle `marker-end` + khi on và không đang chạy → hiện đủ nét (dashoffset 0); `setZoom(on)` tính bbox các nét + pad 6 → đổi viewBox, off → `"0 0 100 100"`. Cleanup: `cancelAnimationFrame` + remove svg khỏi container. `deps` cho phép re-mount khi đổi chữ.
  - Tham số animation **giữ đúng clone** — không đổi DUR/GAP/easing.

- [ ] **Step 1: Write the failing test**

Tạo `app-next/src/components/hanzi/__tests__/stroke-player.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { useRef } from "react";
import { useStrokePlayer } from "../stroke-player";
import { STROKE_DATA, genericStrokes } from "@/content/hanzi-strokes";

let rafQueue: { cb: (ts: number) => void; id: number }[] = [];
let rafId = 0;
beforeEach(() => {
  rafQueue = [];
  vi.stubGlobal("requestAnimationFrame", (cb: (ts: number) => void) => {
    rafQueue.push({ cb, id: ++rafId });
    return rafId;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
});

function flush(ts: number) {
  const q = rafQueue; rafQueue = [];
  q.forEach(({ cb }) => cb(ts));
}

function Harness({ char }: { char: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const player = useStrokePlayer(ref, char);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => player.play()}>play</button>
      <button onClick={() => player.showArrows(true)}>arrows</button>
      <button onClick={() => player.setZoom(true)}>zoom</button>
    </div>
  );
}

describe("StrokePlayer (G2)", () => {
  it("你 có 7 polyline; nét ẩn ban đầu (dashoffset 1)", () => {
    const { container } = render(<Harness char="你" />);
    expect(STROKE_DATA["你"]).toHaveLength(7);
    const pls = container.querySelectorAll("polyline");
    expect(pls).toHaveLength(7);
    expect((pls[0] as SVGElement).style.strokeDashoffset).toBe("1");
  });
  it("play: nét 1 xong ở 420ms (dashoffset 0), nét 2 chưa bắt đầu trước gap", () => {
    const { container } = render(<Harness char="你" />);
    (container.querySelector("button") as HTMLButtonElement).click();
    flush(0);                    // frame đầu: k = 0
    flush(100);
    const pls = container.querySelectorAll("polyline") as NodeListOf<SVGElement>;
    expect(pls[0].style.strokeDashoffset).not.toBe("1");
    flush(420);                  // nét 1 xong (k >= 1), bắt đầu nghỉ GAP
    expect(pls[0].style.strokeDashoffset).toBe("0");
    flush(470);                  // giữa GAP 90ms — nét 2 chưa vẽ
    expect(pls[1].style.strokeDashoffset).toBe("1");
    flush(520);                  // 420 + 90 = 510 → nét 2 bắt đầu
    expect(pls[1].style.strokeDashoffset).not.toBe("1");
  });
  it("chữ không có data → generic 4 nét; showArrows gắn marker; zoom đổi viewBox", () => {
    expect(genericStrokes()).toHaveLength(4);
    const { container } = render(<Harness char="好" />);
    expect(container.querySelectorAll("polyline")).toHaveLength(4);
    (container.querySelectorAll("button")[1] as HTMLButtonElement).click();
    expect(container.querySelector("polyline")!.getAttribute("marker-end")).toMatch(/url\(#nhai-hw-.*-arrow\)/);
    (container.querySelectorAll("button")[2] as HTMLButtonElement).click();
    expect(container.querySelector("svg")!.getAttribute("viewBox")).not.toBe("0 0 100 100");
  });
});
```

- [ ] **Step 2: Run test verify fail**

Run: `pnpm vitest run src/components/hanzi/__tests__/stroke-player.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Implement content + hook**

`hanzi-strokes.ts` — copy `STROKE_DATA` (chỉ 你, 7 nét) + `genericStrokes()` verbatim từ `clone/js/hanzi-writer.js`. `stroke-player.tsx` — `"use client"`; port class `Writer` (`_build`/`play`/`showArrows`/`setZoom` dòng 45-133) thành hook imperative trong useEffect (mount 1 lần + khi `char`/`deps` đổi): uid counter module-level `let uidSeq = 0;` → id ổn định theo mount; tạo SVG qua `document.createElementNS`; giữ `rafRef` + `arrowsOnRef`/`zoomOnRef` cho các nút gọi; hàm `play/showArrows/setZoom` đóng trên refs và trả về từ hook. Cleanup effect: `if (rafRef.current) cancelAnimationFrame(rafRef.current);` + `svg.remove()`.

- [ ] **Step 4: Run test verify pass**

Run: `pnpm vitest run src/components/hanzi/__tests__/stroke-player.test.tsx`
Expected: PASS 3 tests. (Nếu timing frame khác lệch nhỏ do driver rAF giả, điều chỉnh assertion flush timestamps theo đúng loop port — giữ DUR 420/GAP 90 nguyên.)

- [ ] **Step 5: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src/content/hanzi-strokes.ts app-next/src/components/hanzi/stroke-player.tsx
git commit -m "feat: StrokePlayer SVG rAF (420ms/nét + 90ms gap, easeInOutQuad) + STROKE_DATA 你 7 nét (G2)"
```

### Task 12: G2 (2/2) — `/hanzi` (search + vẽ + pills cấp độ) + `/hanzi/[char]` chi tiết

**Files:**
- Create: `app-next/src/app/(app)/hanzi/page.tsx` (server, metadata) + `app-next/src/app/(app)/hanzi/hanzi-home.tsx` (client)
- Create: `app-next/src/app/(app)/hanzi/[char]/page.tsx` (server, `generateStaticParams` + `generateMetadata`) + `app-next/src/app/(app)/hanzi/[char]/hanzi-detail.tsx` (client)
- Test: `app-next/src/app/(app)/hanzi/__tests__/hanzi-home.test.tsx`, `app-next/src/app/(app)/hanzi/[char]/__tests__/hanzi-detail.test.tsx`
- Port-from: `clone/js/hanzi.js:1-275`, `clone/specs/SPEC-03-hanzi.md`

**Interfaces:**
- Consumes: Task 4 (`hanziChars`, `hanziLevels`, `HanziInfo`), Task 10 (`DrawPad`), Task 11 (`useStrokePlayer`), plan learning-core (`useTts`, `stripTones`).
- Produces:
  - `export default function HanziHome(): JSX.Element` — H1 "Phân tích Hán tự" + mô tả verbatim "Gõ hoặc vẽ một chữ Hán để xem nghĩa, pinyin, âm Hán Việt, thứ tự nét, bộ thủ và cấu tạo chữ."; card "Tìm chữ Hán" input placeholder "Nhập chữ Hán hoặc từ…" autocomplete-off + dropdown gợi ý (max 8: lọc `isCJK(q) && k.indexOf(q) !== -1` hoặc `stripTones(pinyin)`/`stripTones(hanViet)` chứa `stripTones(q)`; Enter → chọn kết quả đầu; click ngoài đóng) → `router.push("/hanzi/" + encodeURIComponent(k))`; card "Hoặc vẽ chữ Hán" = `<DrawPad size={240} onPick={(ch) => router.push("/hanzi/" + encodeURIComponent(ch))} />`; "Khám phá chữ Hán theo cấp độ": pills từ `hanziLevels` (7 sách `pill-active` khi chọn + "214 Bộ thủ" là `Link href="/radicals"`); chọn sách → dòng `{lv.count}` + 3 nút "Flashcard" / "Luyện viết" / "Tạo file" (toast "{label} — tính năng demo, sắp ra mắt!") + lưới chữ `grid grid-cols-4 sm:grid-cols-8` các `grid-cell` link `/hanzi/{ch}` (lọc `hanziChars` theo `level === lv.label`; rỗng → "Dữ liệu chữ Hán của cấp độ này sẽ được cập nhật sớm." verbatim).
  - `export default function HanziDetail({ char }: { char: string }): JSX.Element` — layout 3 cột desktop (sidebar trái tìm+vẽ, trung tâm, sidebar phải) xếp dọc mobile; trung tâm: khung chữ `w-[260px] h-[260px]` viền 2px `flex items-center justify-center` chữ to + 4 nút "Xem lại thứ tự nét" (`player.play()`), "Hiển thị hạt mũi tên" (toggle `player.showArrows`, aria-pressed + đổi `btn-main`/`btn-ghost`), "Hiển thị chữ chứa chữ này" (toggle box: các chữ có `radical === ch || composition.includes(ch)` → grid-cell link, rỗng "Không có chữ nào."), "Thu phóng vừa khít" (`player.setZoom`); `h1` "{ch} - {hanViet}" + nút 🔊 `speak(ch)`; link "→ Quy tắc chuyển âm" `/sound-rules`; metadata rows (Âm Hán Việt + alt "(còn đọc: …)", Ý nghĩa, Pinyin, Cấp độ badge `pill-active`, Số nét, Bộ thủ link `/hanzi/{radical}` khi `hanziChars[radical]` hoặc `radicalLink`, Cấu tạo từ link từng phần tử có data, Loại chữ badge `pill`); sidebar phải: "Từ vựng trong sách" (`vocabInBook`: word + (py) + "- {hv}" + "- {vi}" + pill "HSK 1" + 🔊 + "→ Bài học" link; rỗng "Chưa có từ vựng trong sách cho chữ này."), "Từ vựng thực chiến" (`practical`: link `/dictionary?q={word}`; rỗng "Chưa có từ vựng thực chiến cho chữ này."); cuối: link "Chữ sau {next} →" (next = key kế tiếp trong `Object.keys(hanziChars)` wrap-around).
  - `page.tsx` (char): `export function generateStaticParams(): { char: string }[]` = `Object.keys(hanziChars).map((char) => ({ char }))`; `generateMetadata` → `{ title: char + " - " + (hanziChars[char]?.hanViet ?? "?") }`; render `<HanziDetail char={decodeURIComponent(char)} />` (`params: Promise<{ char: string }>` — decode `await params` vì Next giữ percent-encoding).

- [ ] **Step 1: Write the failing tests**

Tạo `app-next/src/app/(app)/hanzi/__tests__/hanzi-home.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HanziHome from "../hanzi-home";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

describe("HanziHome (G2 màn 1)", () => {
  it("pills cấp độ + 214 Bộ thủ link /radicals", () => {
    render(<HanziHome />);
    expect(screen.getByText("Phân tích Hán tự")).toBeInTheDocument();
    expect(screen.getByText("HSK 1")).toBeInTheDocument();
    expect(screen.getByText("214 Bộ thủ")).toHaveAttribute("href", "/radicals");
    expect(screen.getByText("247 chữ Hán mới trong cuốn này")).toBeInTheDocument();
  });
  it("autocomplete 你 → chọn → push /hanzi/你", async () => {
    const user = userEvent.setup();
    render(<HanziHome />);
    await user.type(screen.getByPlaceholderText("Nhập chữ Hán hoặc từ…"), "你");
    await user.click(screen.getAllByText("你")[1]); // phần tử dropdown (0 = input value rendering)
    expect(push).toHaveBeenCalledWith("/hanzi/" + encodeURIComponent("你"));
  });
  it("chọn HSK 7-9 (rỗng) → thông báo verbatim; vẽ chữ gợi ý → push", async () => {
    const user = userEvent.setup();
    render(<HanziHome />);
    await user.click(screen.getByText("HSK 7-9"));
    expect(screen.getByText("Dữ liệu chữ Hán của cấp độ này sẽ được cập nhật sớm.")).toBeInTheDocument();
  });
});
```

Tạo `app-next/src/app/(app)/hanzi/[char]/__tests__/hanzi-detail.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import HanziDetail from "../hanzi-detail";

vi.stubGlobal("speechSynthesis", { speak: vi.fn(), cancel: vi.fn(), getVoices: vi.fn(() => []) });
beforeEach(() => {
  // canvas ctx cho DrawPad mount trong sidebar
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    setTransform() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fill() {}, arc() {}, fillText() {},
  } as unknown as CanvasRenderingContext2D);
});

describe("HanziDetail (G2 màn 2)", () => {
  it("你: title, metadata đầy đủ, vocab 2 sidebar, chữ sau", () => {
    render(<HanziDetail char="你" />);
    expect(screen.getByRole("heading", { name: "你 - NHĨ" })).toBeInTheDocument();
    expect(screen.getByText(/còn đọc: NỄ/)).toBeInTheDocument();
    expect(screen.getByText("Số nét:")).toBeInTheDocument();
    expect(screen.getByText("Cấu tạo từ:")).toBeInTheDocument();
    expect(screen.getByText("Từ vựng trong sách")).toBeInTheDocument();
    expect(screen.getByText("Từ vựng thực chiến")).toBeInTheDocument();
    expect(screen.getByText("Chữ sau 好 →")).toHaveAttribute("href", "/hanzi/" + encodeURIComponent("好"));
    expect(screen.getByText("→ Quy tắc chuyển âm")).toHaveAttribute("href", "/sound-rules");
  });
  it("7 nút animation toggle + 🔊 speak", () => {
    render(<HanziDetail char="你" />);
    act(() => screen.getByText("Xem lại thứ tự nét").click()); // play — không lỗi với rAF thật
    act(() => screen.getByText("Hiển thị hạt mũi tên").click());
    expect(screen.getByText("Hiển thị hạt mũi tên").getAttribute("aria-pressed")).toBe("true");
    act(() => screen.getByTitle("Phát âm 你").click());
    expect(window.speechSynthesis.speak).toHaveBeenCalled();
  });
  it("chữ không có data → fallback meaning verbatim", () => {
    render(<HanziDetail char="躯" />);
    expect(screen.getByText(/Chưa có dữ liệu chi tiết cho chữ này/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "躯 - —" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests verify fail**

Run: `pnpm vitest run "src/app/(app)/hanzi"`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Implement HanziHome + route**

Port `renderHome` + `buildSearchCard` từ `clone/js/hanzi.js` sang JSX theo Interfaces. Autocomplete: state `q` + hits tính từ `hanziChars` (`useMemo`); dropdown `card divide-y divide-[var(--nhai-border)] max-h-64 overflow-y-auto` với button per hit (chữ to + `pinyin · hanViet` + meaning truncate + pill level); đóng khi click ngoài (`useEffect` listener `document` click + check `hostRef.current.contains`, remove trong cleanup). Pills: state `levelIdx`; `books = hanziLevels.filter((l) => !l.href)`. Route:

```tsx
import type { Metadata } from "next";
import HanziHome from "./hanzi-home";
export const metadata: Metadata = { title: "Phân tích Hán tự" };
export default function HanziPage() { return <HanziHome />; }
```

- [ ] **Step 4: Implement HanziDetail + [char] route**

Port `renderDetail` từ `clone/js/hanzi.js:127-253` sang JSX theo Interfaces. Chữ không có data: fallback object verbatim `{ hanViet: "—", pinyin: "?", level: "?", strokes: "?", radical: "—", type: "—", meaning: "Chưa có dữ liệu chi tiết cho chữ này (bản demo chỉ có dữ liệu HSK 1)." }` (lưu ý `strokes: "?"` — render `String`). `useStrokePlayer(hostRef, char)` — hostRef div `absolute inset-0` trong khung chữ (`relative`). `generateStaticParams`:

```tsx
import { hanziChars } from "@/content/hanzi";
export function generateStaticParams() { return Object.keys(hanziChars).map((char) => ({ char })); }
export async function generateMetadata({ params }: { params: Promise<{ char: string }> }): Promise<Metadata> {
  const { char: raw } = await params;
  const ch = decodeURIComponent(raw);
  const c = hanziChars[ch];
  return { title: ch + " - " + (c?.hanViet ?? "?") };
}
export default async function HanziCharPage({ params }: { params: Promise<{ char: string }> }) {
  const { char: raw } = await params;
  return <HanziDetail char={decodeURIComponent(raw)} />;
}
```

(Trang `/hanzi` không `?char` — màn 1; link "Xem từng chữ" từ dictionary trỏ `/hanzi/{ch}` encoded → route này.)

- [ ] **Step 5: Run tests verify pass + smoke**

Run: `pnpm vitest run "src/app/(app)/hanzi" && pnpm typecheck`
Expected: PASS 6 tests, typecheck sạch.
Smoke: `pnpm dev` → `/hanzi` tìm 好 → trang chi tiết; bấm "Xem lại thứ tự nét" → animation 4 nét generic chạy; `/hanzi/你` → 7 nét + mũi tên + zoom-fit hoạt động.

- [ ] **Step 6: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src
git commit -m "feat: /hanzi + /hanzi/[char] (G2) — autocomplete, draw card, pills cấp độ, chi tiết chữ + stroke animation"
```

### Task 13: G3 — `/reading` karaoke TTS + dán đoạn văn

**Files:**
- Create: `app-next/src/components/reading/karaoke.tsx`
- Create: `app-next/src/app/(app)/reading/page.tsx` (server, metadata) + `app-next/src/app/(app)/reading/reading-client.tsx` (client)
- Test: `app-next/src/components/reading/__tests__/karaoke.test.tsx`, `app-next/src/app/(app)/reading/__tests__/reading-client.test.tsx`
- Port-from: `clone/js/reading.js:1-415`, `clone/js/data/reading.js`, proposal §4.4 (spec 11 §G3)

**Interfaces:**
- Consumes: Task 4 (`readingData`, `ReadingSentence`), Task 1 (`progressStore.isLoggedIn`, `useProgress`-style reactive qua `nhai:progress` cho account-box), plan learning-core (`useTts` KHÔNG dùng cho karaoke — karaoke tự quản `SpeechSynthesisUtterance` để bắt `onboundary`/`onend`; chỉ account-box/login dùng shell).
- Produces:
  - `export function splitSentences(text: string): string[]` — regex giữ dấu câu cuối `/[^。！？!?…；;]+[。！？!?…；;]*/g`, trim, bỏ rỗng (verbatim `reading.js:40-43`).
  - `export function extractTitle(text: string): { title: string | null; body: string }` — split `/\n+/`, nếu `lines.length > 1 && lines[0].length <= 20` → title = lines[0], body = phần còn lại join "\n"; else title null, body = text.
  - `export type KaraokeSentence = { zh: string; py: string | null; vi: string };`
  - `export function buildSentences(body: string, sentenceMap: Record<string, { zh: string; py: string; vi: string }>): KaraokeSentence[]` — mỗi câu: khớp nguyên câu map → `{zh, py, vi}`; không khớp → `{zh, py: null, vi: "(bản dịch demo — tính năng AI cần backend)"}`.
  - `export function useKaraoke(sentences: KaraokeSentence[]): { activeIdx: number; playingAll: boolean; highlight: { row: number; char: number } | null; playFrom: (i: number, chain: boolean) => void; stop: () => void; setRate: (r: number) => void }` — port `playFrom` từ `clone/js/reading.js:276-344` giữ ĐỦ tham số: token `gen` (useRef) huỷ mọi timer/utterance khi đổi câu/dừng; highlight qua state `{row, char}`; ưu tiên `onboundary` (`e.charIndex`, có boundary → clearInterval timer fallback); fallback timer `260 / rate` ms/ký tự; sau ký tự cuối nếu có TTS → chờ `onend` với **grace timeout 2500ms** chống treo; không có `speechSynthesis` → timer tự điều phối `done`; `onend`/`onerror` → clear highlight → chain `playFrom(i+1, true)` hoặc dừng; rate giữ trong ref (đổi giữa chừng áp câu kế). Cleanup unmount: `stop()`.
  - `export default function ReadingClient(): JSX.Element` — layout 2 cột: sidebar (label "Bài đọc mẫu" + nút demo "一个人的生活" + "Cuộc sống một mình — 2:29 · 654 ký tự" + **account-box**: chưa login → "Đăng nhập để lưu bài đã tạo và mở lại mọi lúc." + nút "Đăng nhập" mở `useLoginModal().openLogin()`; đã login → "Chưa có bài nào được lưu — bài bạn bấm “Tạo bài đọc” sẽ xuất hiện ở đây (demo)." — SP1); main: H1 "Bài đọc" (title tag "Bài đọc"), textarea maxlength logic ≤ **3000** ký tự (slice khi vượt) + counter "{n}/3000", callout thu gọn (mẹo dán văn bản — port text callout của `clone/reading.html`), nút "Điền văn bản mẫu" (điền `readingData.sampleText` + toast "Đã điền văn bản mẫu — bấm “Tạo bài đọc” nhé!") + nút "Tạo bài đọc" (rỗng → toast "Hãy dán văn bản tiếng Trung vào ô trước nhé!"; 0 câu → toast "Không tìm thấy câu tiếng Trung nào trong văn bản."); doc card: title + meta "{N} câu · {M} ký tự" + nút "🔊 Phát cả bài"/"⏹ Dừng" + toggle pill "Dịch"/"Pinyin" + select tốc độ 0.7×/1×/1.3×; mỗi câu row: nút ▶/⏹ + câu zh tách **span từng ký tự** class `zh-char inline-block` (highlight vàng `background: var(--nhai-gold); border-radius: 3px` khi `highlight.row === i && highlight.char === k`) + dòng pinyin (`py` — `s.py` khi có, hidden mặc định) + dòng dịch (hidden mặc định); demo full (normalize body === normalize(zhFull(demoDoc))) → section "Câu hỏi & Từ vựng": MCQ A/B/C/D (đúng → viền đỏ `border-[var(--nhai-main)] text-[var(--nhai-main)]` + toast "Chính xác! 🎉"; sai → toast "Chưa đúng — thử lại nhé!") + list từ vựng + ⭐ demo toast `Đã thêm「{word}」vào sổ từ vựng (demo) ⭐`.
  - Route `page.tsx`: `export const metadata = { title: "Bài đọc" };` render `<ReadingClient />`.

- [ ] **Step 1: Write the failing tests**

Tạo `app-next/src/components/reading/__tests__/karaoke.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { splitSentences, extractTitle, buildSentences } from "../karaoke";
import { readingData } from "@/content/reading";

describe("karaoke tokenizer (G3)", () => {
  it("splitSentences giữ dấu câu cuối, bỏ rỗng", () => {
    expect(splitSentences("你好。我叫小明！再见？")).toEqual(["你好。", "我叫小明！", "再见？"]);
    expect(splitSentences("。！？")).toEqual([]);
    expect(splitSentences("第二句没有句号")).toEqual(["第二句没有句号"]);
  });
  it("extractTitle: dòng đầu ≤20 ký tự là title", () => {
    expect(extractTitle("一个人的生活\n我一个人住在公寓里。")).toEqual({ title: "一个人的生活", body: "我一个人住在公寓里。" });
    expect(extractTitle("Một dòng dài hơn hai mươi ký tự thì không phải tiêu đề của bài")).toEqual({ title: null, body: "Một dòng dài hơn hai mươi ký tự thì không phải tiêu đề của bài" });
  });
  it("buildSentences: khớp demoDoc → py+vi; không khớp → vi fallback verbatim, py null", () => {
    const map = Object.fromEntries(readingData.demoDoc.sentences.map((s) => [s.zh, s]));
    const out = buildSentences("我在学习汉语。Câu lạ không có trong demo。", map);
    expect(out[0]).toEqual({ zh: "我在学习汉语。", py: null, vi: "(bản dịch demo — tính năng AI cần backend)" });
    expect(out[1].vi).toBe("(bản dịch demo — tính năng AI cần backend)");
    const demo = buildSentences(readingData.demoDoc.sentences.map((s) => s.zh).join(""), map);
    expect(demo[0].vi).toBe("Tôi sống một mình trong một căn hộ nhỏ xíu.");
    expect(demo[0].py).toBe("Wǒ yíge rén zhù zài yì jiān xiǎoxiǎo de gōngyù lǐ.");
  });
});
```

Tạo `app-next/src/app/(app)/reading/__tests__/reading-client.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReadingClient from "../reading-client";

const speakMock = vi.fn();
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal("speechSynthesis", {
    speak: speakMock, cancel: vi.fn(), speaking: false,
    getVoices: vi.fn(() => [{ name: "Tingting", lang: "zh-CN" }]),
  });
  speakMock.mockClear();
});

describe("ReadingClient (G3)", () => {
  it("điền văn bản mẫu → Tạo bài đọc → 11 câu (title dòng đầu)", async () => {
    const user = userEvent.setup();
    render(<ReadingClient />);
    await user.click(screen.getByText("Điền văn bản mẫu"));
    expect(screen.getByText("Đã điền văn bản mẫu — bấm “Tạo bài đọc” nhé!")).toBeInTheDocument();
    await user.click(screen.getByText("Tạo bài đọc"));
    expect(screen.getByText(/11 câu/)).toBeInTheDocument();
  });
  it("mở bài demo từ sidebar → 13 câu + Câu hỏi & Từ vựng + MCQ đúng → toast", async () => {
    const user = userEvent.setup();
    render(<ReadingClient />);
    await user.click(screen.getByText("一个人的生活"));
    expect(screen.getByText(/13 câu/)).toBeInTheDocument();
    expect(screen.getByText("Câu hỏi & Từ vựng")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "A. 先喝一杯温水" }));
    expect(screen.getByText("Chính xác! 🎉")).toBeInTheDocument();
  });
  it("Phát câu 1: utterance lang zh-CN + rate; Phát cả bài đổi nút ⏹ Dừng; Dừng huỷ sạch", async () => {
    const user = userEvent.setup();
    render(<ReadingClient />);
    await user.click(screen.getByText("一个人的生活"));
    await user.click(screen.getAllByRole("button", { name: "Đọc câu 1" })[0]);
    expect(speakMock).toHaveBeenCalledTimes(1);
    const u = speakMock.mock.calls[0][0] as SpeechSynthesisUtterance;
    expect(u.lang).toBe("zh-CN");
    expect(u.rate).toBe(1);
    await user.click(screen.getByText("🔊 Phát cả bài"));
    expect(screen.getByText("⏹ Dừng")).toBeInTheDocument();
    await user.click(screen.getByText("⏹ Dừng"));
    expect(screen.getByText("🔊 Phát cả bài")).toBeInTheDocument();
    expect(window.speechSynthesis.cancel).toHaveBeenCalled();
  });
  it("account-box: chưa login → nút Đăng nhập; login mock → text demo", async () => {
    const user = userEvent.setup();
    render(<ReadingClient />);
    expect(screen.getByText("Đăng nhập để lưu bài đã tạo và mở lại mọi lúc.")).toBeInTheDocument();
    act(() => {
      localStorage.setItem("nhai.mockLogin", "1");
      window.dispatchEvent(new CustomEvent("nhai:progress"));
    });
    expect(screen.getByText(/Chưa có bài nào được lưu/)).toBeInTheDocument();
  });
  it("textarea cắt tại 3000 ký tự", async () => {
    const user = userEvent.setup();
    render(<ReadingClient />);
    const ta = screen.getByLabelText(/Nội dung bài đọc/) as HTMLTextAreaElement;
    await user.type(ta, "好".repeat(3010));
    expect(ta.value.length).toBe(3000);
    expect(screen.getByText("3000/3000")).toBeInTheDocument();
  });
});
```

(Chú ý test "Phát cả bài": sau bấm dừng, hook phải dispatch `nhai:progress`-independent re-render — nếu nút không đổi ngay do state trong hook, assert qua `playingAll` qua data-attribute `data-playing="false"` thay text; chọn 1 cơ chế và khớp test với implement, giữ nguyên tham số TTS.)

- [ ] **Step 2: Run tests verify fail**

Run: `pnpm vitest run src/components/reading "src/app/(app)/reading"`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Implement karaoke.tsx (tokenize + useKaraoke)**

`splitSentences`/`extractTitle`/`buildSentences` thuần (code trong Interfaces). `useKaraoke` — port `playFrom`/`stopAudio` từ `clone/js/reading.js:276-344` thành hook:

```tsx
"use client";
import { useCallback, useEffect, useRef, useState } from "react";

export type KaraokeSentence = { zh: string; py: string | null; vi: string };

export function useKaraoke(sentences: KaraokeSentence[]) {
  const [activeIdx, setActiveIdx] = useState(-1);
  const [playingAll, setPlayingAll] = useState(false);
  const [highlight, setHighlight] = useState<{ row: number; char: number } | null>(null);
  const genRef = useRef(0);
  const rateRef = useRef(1);
  const timersRef = useRef<ReturnType<typeof setTimeout | typeof setInterval>[]>([]);
  const sentRef = useRef(sentences);
  sentRef.current = sentences;

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => { clearTimeout(t); clearInterval(t); });
    timersRef.current = [];
  }, []);

  const stop = useCallback(() => {
    genRef.current++;
    clearTimers();
    try { window.speechSynthesis?.cancel(); } catch { /* không có TTS */ }
    setActiveIdx(-1);
    setPlayingAll(false);
    setHighlight(null);
  }, [clearTimers]);

  const playFrom = useCallback((i: number, chain: boolean) => {
    const list = sentRef.current;
    if (i >= list.length) { setActiveIdx(-1); setPlayingAll(false); setHighlight(null); return; }
    const myGen = ++genRef.current;
    setActiveIdx(i);
    setPlayingAll(chain || playingAllRef.current);
    const s = list[i];
    const len = Array.from(s.zh).length;
    let finished = false;
    let timer: ReturnType<typeof setInterval> | null = null;
    let grace: ReturnType<typeof setTimeout> | null = null;

    const done = () => {
      if (finished || myGen !== genRef.current) return;
      finished = true;
      clearTimers();
      setHighlight(null);
      if (chain) playFrom(i + 1, true);
      else { setActiveIdx(-1); setPlayingAll(false); }
    };

    // fallback / không có boundary: highlight tuần tự 260ms/ký tự ÷ rate
    let k = 0;
    timer = setInterval(() => {
      if (myGen !== genRef.current) { clearInterval(timer!); return; }
      k++;
      if (k >= len) {
        clearInterval(timer!); timer = null;
        if (!("speechSynthesis" in window)) { done(); return; }
        if (grace === null) { grace = setTimeout(done, 2500); timersRef.current.push(grace); }
        return;
      }
      setHighlight({ row: i, char: k });
    }, 260 / rateRef.current);
    timersRef.current.push(timer);

    if ("speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(s.zh);
        u.lang = "zh-CN";
        u.rate = rateRef.current;
        const voiced = window.speechSynthesis.getVoices().filter((v) => /^zh/i.test(v.lang));
        if (voiced[0]) u.voice = voiced[0];
        u.onboundary = (e) => {
          if (myGen !== genRef.current) return;
          if (timer) { clearInterval(timer); timer = null; }
          setHighlight({ row: i, char: Math.min(e.charIndex || 0, len - 1) });
        };
        u.onend = done;
        u.onerror = done;
        window.speechSynthesis.speak(u);
      } catch { /* timer fallback vẫn chạy */ }
    }
  }, [clearTimers]);
  const playingAllRef = useRef(false);
  playingAllRef.current = playingAll;

  const setRate = useCallback((r: number) => { rateRef.current = r; }, []);
  useEffect(() => () => { genRef.current++; clearTimers(); try { window.speechSynthesis?.cancel(); } catch { /* */ } }, [clearTimers]);
  return { activeIdx, playingAll, highlight, playFrom, stop, setRate };
}
```

(`playingAllRef` khai báo trước `playFrom` trong file thật để tránh use-before-define — sắp xếp lại thứ tự khi viết.)

- [ ] **Step 4: Implement ReadingClient + route**

Port `clone/js/reading.js` sang JSX theo Interfaces. Tokenizer dùng ở nút "Tạo bài đọc" (`extractTitle` → `buildSentences(body, sentenceMap)` với `sentenceMap` từ `demoDoc.sentences`, `isDemoFull = normalize(body) === normalize(zhFull(demoDoc))`, `normalize = (t) => t.replace(/\s+/g, "")`); nút demo → dùng nguyên `demoDoc.sentences` + `extras`; karaoke: `const k = useKaraoke(sentences);` — play row: `k.stop(); k.playFrom(i, false);` (set nút ⏹ qua `k.activeIdx === i`), play all: `k.playingAll ? k.stop() : k.playFrom(0, true)`. Callout: dùng text của `clone/reading.html` (mở file đó, copy đoạn `[data-callout-body]` verbatim). Route với metadata `{ title: "Bài đọc", description: "Dán đoạn văn tiếng Trung — đọc theo karaoke TTS, highlight theo từng ký tự." }`.

- [ ] **Step 5: Run tests verify pass + smoke**

Run: `pnpm vitest run src/components/reading "src/app/(app)/reading" && pnpm typecheck`
Expected: PASS 8 tests, typecheck sạch.
Smoke: `pnpm dev` → `/reading` điền mẫu → Tạo bài đọc → 11 câu; phát câu 1 thấy highlight vàng chạy ký tự (hoặc bám TTS nếu browser bắn boundary); Phát cả bài → Dừng không còn highlight; toggle Pinyin/Dịch độc lập.

- [ ] **Step 6: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next/src
git commit -m "feat: /reading (G3) — karaoke TTS onboundary+fallback 260ms/rate+grace 2500ms, demo doc, MCQ + vocab demo"
```

### Task 14: E2E smoke 9 route + luồng deck → lesson custom + deploy xanh

**Files:**
- Create: `app-next/e2e/personal-tools.spec.ts`
- Modify: `app-next/src/app/sitemap.ts` (thêm `/dictionary`, `/hanzi`, `/reading` — 3 route public của plan này; `/review`, `/progress`, `/my-vocab`, `/my-grammar`, `/notebook` KHÔNG vào sitemap — trang user/gated)

**Interfaces:**
- Consumes: mọi task trước; Task 4 của plan learning-core (`pnpm preview`).
- Produces: e2e smoke phủ 9 route `/review /progress /my-vocab /my-grammar /notebook/vocab/vocab-hsk30 /dictionary /hanzi /hanzi/你 /reading` + luồng tạo deck → học deck qua `/lesson/custom/[deckId]`; sitemap cập nhật; deploy Workers xanh.

- [ ] **Step 1: Write the failing e2e test**

Tạo `app-next/e2e/personal-tools.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

const MOCK_LOGIN = { "nhai.mockLogin": "1" };

async function mockLogin(page: import("@playwright/test").Page) {
  await page.addInitScript(() => localStorage.setItem("nhai.mockLogin", "1"));
}

test.describe("public routes (không cần login)", () => {
  for (const [path, text] of [
    ["/review", "Thống kê học tập"],
    ["/dictionary", "Tra từ điển"],
    ["/hanzi", "Phân tích Hán tự"],
    ["/reading", "Bài đọc"],
  ] as const) {
    test(`render ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByText(text).first()).toBeVisible();
    });
  }
  test("/hanzi/你 render chi tiết 7 nét", async ({ page }) => {
    await page.goto("/hanzi/" + encodeURIComponent("你"));
    await expect(page.getByRole("heading", { name: "你 - NHĨ" })).toBeVisible();
    expect(await page.locator("svg polyline").count()).toBe(7);
  });
  test("dictionary search 3 kiểu + ?q= giữ kết quả", async ({ page }) => {
    await page.goto("/dictionary?q=xuexi");
    await expect(page.getByText(/kết quả cho/)).toBeVisible();
    await page.goto("/dictionary");
    await page.getByPlaceholderText(/Chữ Hán, pinyin hoặc nghĩa tiếng Việt/).fill("học");
    await page.getByText("Tra từ").click();
    await expect(page.getByText(/kết quả cho/)).toBeVisible();
  });
});

test.describe("gated routes (mock login)", () => {
  test.use({ storageState: undefined }); // đảm bảo sạch cookie

  test("chưa login → 🔒 đúng sub từng trang", async ({ page }) => {
    await page.goto("/progress");
    await expect(page.getByText("Tiến độ học của bạn sẽ được đồng bộ sau khi đăng nhập.")).toBeVisible();
    await page.goto("/my-vocab");
    await expect(page.getByText("Sổ tay từ vựng của bạn sẽ xuất hiện ở đây sau khi đăng nhập.")).toBeVisible();
  });

  test("progress + my-vocab render khi mockLogin", async ({ page }) => {
    await mockLogin(page);
    await page.goto("/progress");
    await expect(page.getByText("Điểm của bạn")).toBeVisible();
    await expect(page.getByText("12 tháng gần đây")).toBeVisible();
    await page.goto("/my-vocab");
    await expect(page.getByText("Sổ mẫu")).toBeVisible();
    await page.goto("/notebook/vocab/vocab-hsk30");
    await expect(page.getByText("Từ vực HSK 3.0")).toBeVisible();
    await expect(page.getByText("时间").first()).toBeVisible();
  });

  test("luồng tạo deck → học deck qua lesson custom", async ({ page }) => {
    await mockLogin(page);
    await page.addInitScript(() => {
      localStorage.setItem("nhai.decks", JSON.stringify([
        { id: "nb-e2e", name: "Bộ e2e", rows: [
          { hanzi: "时间", pinyin: "shíjiān", hanviet: "thời gian", meaning: "thời gian" },
          { hanzi: "朋友", pinyin: "péngyou", hanviet: "bằng hữu", meaning: "bạn bè" },
        ], updatedAt: new Date().toISOString() },
      ]));
    });
    await page.goto("/my-vocab");
    await page.getByText("Tạo bộ mới").first().click();
    await page.getByPlaceholderText("Nhập tên sổ tay / bộ từ vựng…").fill("Bộ từ e2e thứ hai");
    await page.getByText("Tạo", { exact: true }).click();
    await expect(page.getByText("Đã tạo Bộ từ e2e thứ hai")).toBeVisible();
    await page.goto("/lesson/custom/nb-e2e");
    await expect(page.getByText("Bộ e2e")).toBeVisible();
    await expect(page.getByText("时间").first()).toBeVisible();
  });
});

test("sitemap chứa route public mới, không chứa route gated", async ({ request }) => {
  const xml = await (await request.get("/sitemap.xml")).text();
  for (const p of ["/dictionary", "/hanzi", "/reading"]) expect(xml).toContain(p);
  expect(xml).not.toContain("/review");
  expect(xml).not.toContain("/my-vocab");
});
```

- [ ] **Step 2: Run e2e verify fail**

Run: `pnpm test:e2e e2e/personal-tools.spec.ts`
Expected: FAIL ở test sitemap (3 route chưa có) — các test render khác PASS nếu các task trước đã xong.

- [ ] **Step 3: Cập nhật sitemap**

Sửa `app-next/src/app/sitemap.ts` — thêm `"/dictionary", "/hanzi", "/reading"` vào mảng route (giữ nguyên cấu trúc `BASE + p` của plan learning-core). Không thêm `/review`, `/progress`, `/my-vocab`, `/my-grammar`, `/notebook` (trang user — 00 §7 "Trang user không cache" + gated).

- [ ] **Step 4: Run toàn bộ test + typecheck + lint**

Run: `pnpm test:e2e e2e/personal-tools.spec.ts && pnpm test && pnpm typecheck && pnpm lint`
Expected: e2e PASS toàn bộ; vitest suite PASS (regression toàn repo — kể cả test của plan learning-core); typecheck + lint sạch.

- [ ] **Step 5: Build + deploy Workers xanh**

```bash
cd /Volumes/samsung512/Code/hsk/app-next
pnpm exec opennextjs-cloudflare build && pnpm preview
```
Expected: build thành công; preview phục vụ ở `http://localhost:8787` — kiểm tra `/review`, `/dictionary?q=xuexi`, `/hanzi/你`, `/reading` trả 200 và render đúng (curl hoặc mở trình duyệt). Sau đó `pnpm deploy` nếu có `CLOUDFLARE_API_TOKEN`; không có token thì dừng ở preview xanh (đủ điều kiện SP1 local).

- [ ] **Step 6: Commit**

```bash
cd /Volumes/samsung512/Code/hsk
git add app-next
git commit -m "feat: e2e smoke 9 route personal-tools + luồng deck→lesson custom; sitemap +/dictionary /hanzi /reading; deploy xanh"
```

---

## Phụ lục A — Self-review đã chạy (kết quả)

- **Spec coverage (spec 11):** F1 → Task 5 (+2, 4); F2 → Task 6 (+2); F3/F4 → Task 7; F5 → Task 8; F6 → Task 3 (dùng ở Task 6/7/8); G1 → Task 9 + 10; G2 → Task 11 + 12 (+10 DrawPad dùng chung); G3 → Task 13. Route map §1.1 đủ 9 route (`/review /progress /my-vocab /my-grammar /notebook/[kind]/[id] /dictionary /hanzi /hanzi/[char] /reading`). Acceptance criteria từng feature có test tương ứng: F1-AC2 (Task 5 test 3 + e2e), F1-AC4 (Task 2 donut 1 lát 100%), F1-AC5 (Task 5 bars test), F2-AC1 (Task 6 + Task 14 e2e gate), F2-AC3 (Task 2 computeStreak 3 test), F3-AC2/3 (Task 7), F4-AC1 (1 template + config — Task 7 test "kind=grammar đọc nhai.notebooks"), F5-AC1 (kind quyết định storage — Task 8 test 1) / F5-AC4 (demo toast), G1-AC1/2/3/4 (Task 9 + 10 tests), G1-AC5 (Task 10 DrawPad test + smoke), G2-AC1/2/3 (Task 11 + 12), G3-AC1/2/3/4/5 (Task 13 tests + hook fallback). UPG chỉ nằm ở section "Future phases" + comment code đánh dấu (rank `14594 − xp` UPG-2 bỏ, canvas nhận diện giả UPG-5, F5 demo toast UPG-2).
- **Placeholder scan:** không có "TBD"/"add error handling"/"similar to Task N"; mỗi step có code/lệnh + Expected; các chỗ "port từ file X dòng A-B" là lệnh copy nguồn xác định kèm rule chuyển đổi (đổi href, đổi NHAI.* → hook) — không bỏ trống.
- **Type consistency:** `DeckItem`/`DeckRow`/`NotebookKind`/`VocabBookEntry` định nghĩa Task 1, dùng Task 7/8/10/14; `Dist`/`DIST_META`/`donutSlices`/`distPercents`/`R`/`C` Task 2 dùng Task 5; `computeStreak`/`heatData`/`heatClass`/`vnDay` Task 2 dùng Task 6; `computeReviewStats`/`itemKeyKind`/`SRS_DAYS` Task 2 dùng Task 5; `getAllSrs()`/`getHeat()`/`getStreak()` Task 5/6 (khai báo tại task sử dụng, ghi điều kiện "nếu chưa có"); `DictEntry` Task 4 dùng Task 9/10; `NotebookRow`/`notebookSubGate` Task 4 dùng Task 7/8; `StrokePolyline`/`STROKE_DATA`/`genericStrokes` Task 11 dùng Task 12; `KaraokeSentence`/`useKaraoke` Task 13 nội bộ; `LoginGate pageSub` Task 3 dùng Task 6/7/8; consumes từ plan learning-core ghi đúng tên (`progressStore`, `useProgress() → { xp }`, `useTts() → { speak, cancel, speaking }`, `useToast() → (msg) => void`, `useLoginModal() → { isOpen, openLogin, close }`, `stripTones`, `vocab`, `getDeck`) — khớp phần Interfaces của plan đó.
- **Đồng bộ plan anh em:** điểm Modify duy nhất ngoài phạm vi là `src/lib/store/decks.ts` + test của nó (Task 1 Step 4 — đồng bộ shape mảng `nhai.decks` theo clone, plan anh em ghi shape map sai so với clone `notebook.js`); sitemap Modify ở Task 14 là file dùng chung nhưng chỉ thêm 3 route của plan này. Không đụng shell/lesson/theme/content của plan learning-core.
