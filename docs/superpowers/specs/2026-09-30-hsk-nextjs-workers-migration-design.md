# Design: Triển khai đầy đủ nhaihsk clone trên Next.js + Cloudflare Workers

- **Ngày:** 2026-09-30
- **Trạng thái:** Đã duyệt design qua brainstorming; chờ review spec
- **Phạm vi tài liệu này:** Stack tổng thể + phân rã 5 sub-project. Chỉ SP1 được spec chi tiết; SP2–SP5 sẽ brainstorm riêng khi đến lượt.

## 1. Bối cảnh & mục tiêu

`clone/` là bản dựng tĩnh của nhaihsk.com: 28 trang HTML + 37 module JS (~8.200 dòng), Tailwind v4 chạy qua browser CDN, 100% client-side (không có fetch nào), mọi dữ liệu trên `localStorage` với tiền tố `nhai.`, login là mock (`nhai.mockLogin`).

Mục tiêu: xây sản phẩm hoàn chỉnh tương đương site gốc — auth thật, đồng bộ tiến độ đa thiết bị, nội dung đầy đủ, thanh toán, AI chat, TTS server-side.

## 2. Ràng buộc (đã chốt với owner)

| Ràng buộc | Giá trị |
|---|---|
| Team | 1 người, quen JavaScript/TypeScript |
| Mức "đầy đủ" | Full như site gốc (auth + DB + payment + TTS + AI) |
| Deploy | Cloudflare Workers |
| Ngôn ngữ | TypeScript toàn bộ (loại FastAPI/Python) |

## 3. Quyết định stack

**Next.js App Router + TypeScript + Tailwind v4 (compiled) + @opennextjs/cloudflare + D1 + Drizzle ORM + better-auth.**

### Các phương án đã cân nhắc

- **B. React Router v7 + Hono trong 1 Worker** — Workers-native nhất, không adapter, runtime nhẹ. Loại vì hệ sinh thái nhỏ hơn hẳn (ví dụ, UI kit, AI pair-coding hỗ trợ yếu hơn) — rủi ro lớn với dev solo.
- **C. React SPA (Vite) + Hono API (2 deployable)** — port nhanh nhất nhưng mất SSR/SEO cho nhóm trang tra cứu công khai và sẽ phải refactor lại. Loại với mục tiêu full product.
- **FastAPI** — loại ngay từ đầu: 2 ngôn ngữ khi solo, không phải đích deploy tự nhiên của Workers.

### Lý do chọn Next.js + OpenNext

- Hệ sinh thái lớn nhất giảm rủi ro kẹt cho dev solo.
- SSG/ISR sẵn cho trang tra cứu cần SEO (pinyin, radicals, sound-rules, dictionary).
- Route Handlers + Server Actions đủ để phủ trọn surface `/api/v1/*` mà `nhaihsk-clone-proposal.md` đã reverse-engineer.
- Site gốc nhaihsk.com cũng dùng Next (theo proposal).
- Chi phí chấp nhận: lớp adapter OpenNext đi sau phiên bản Next mới; image optimization cần cấu hình riêng cho Workers.

## 4. Kiến trúc

```
Browser
  ├─ Client Components (99% app: lesson modes, canvas, timers, TTS)
  └─ RSC/SSG: trang tra cứu công khai (pinyin, radicals, sound-rules,
     dictionary, landing) → render lúc build, có metadata + sitemap
        │
Next.js Server trên Workers (qua @opennextjs/cloudflare)
  ├─ Route Handlers  /api/v1/*  (shape khớp proposal)
  └─ Server Actions cho mutation trong app
        │
Cloudflare bindings
  ├─ D1  (users, sessions, SRS states, decks, leaderboard, entitlements)
  ├─ R2  (cache audio TTS, datasets lớn: hanzi stroke data, subtitles)
  └─ KV  (rate-limit, cache phụ)
```

Một app duy nhất, không monorepo. `clone/` giữ nguyên làm tài liệu tham chiếu khi port.

## 5. Phân rã sub-project

Mỗi sub-project có chuỗi brainstorm → spec → plan → implement riêng.

| # | Tên | Phạm vi | Tiêu chí xong |
|---|---|---|---|
| SP1 | Foundation & port | Scaffold Next + Tailwind v4; layout shell thay `shell.js`; port 28 trang + 7 lesson modes; NHAI_DATA → TS modules; `ProgressStore` bản LocalStorage; deploy Workers xanh từ tuần đầu | App chạy đủ tính năng như clone, không còn Tailwind CDN, CI xanh, production deploy hoạt động |
| SP2 | Auth & sync | better-auth (Google/Facebook/email), schema D1, `HybridStore` local-first sync, delete-account thật, bỏ mock login | Login thật, tiến độ đa thiết bị, xoá tài khoản hoạt động |
| SP3 | Content & social | Vocab HSK đầy đủ, hanzi-writer dataset thay nét giả, leaderboard thật, notifications, feedback, SEO metadata + sitemap | Nội dung thật, trang public index được |
| SP4 | Monetization | MoMo + Stripe webhook, entitlements (gate FREEHSK, TTS premium), donate | Thanh toán + quyền hạn hoạt động |
| SP5 | AI & TTS | AI chat LLM thật (streaming qua Worker), TTS zh-CN server-side + cache R2, karaoke alignment | Widget AI + TTS nhất quán hoạt động |

Thứ tự: SP1 → SP2 → SP3 → (SP4 ↔ SP5 đổi chỗ được).

## 6. Data layer

### Content tĩnh (học liệu)

16 file `NHAI_DATA` (IIFE gán `window.NHAI_DATA.*`) chuyển thành TS modules có type export, **giữ nguyên tên và shape** làm hợp đồng để port trang gần như 1-1. Build-time import. Dataset nặng (hanzi strokes, subtitle tracks) load lazy từ R2/CDN khi đến SP3.

### `ProgressStore` — interface duy nhất cho mọi ghi đọc tiến độ

```ts
interface ProgressStore {
  // SRS — gộp 3 format key cũ (nhai.srs.w.* / nhai.srs.st.<k> / nhai.srs.st JSON)
  getSrsItem(key: string): SrsStatus | null
  setSrsItem(key: string, status: SrsStatus): Promise<void>
  starWord(book: string, page: string, index: number): Promise<void>
  markPageDone(book: string, page: string): Promise<void>
  addXp(n: number): Promise<void>
  recordDailyXp(date: string, xp: number): Promise<void>
  // CRUD decks/notebooks, battle best, roadmap unlock, prefs — cùng pattern
}
```

- **SP1 — `LocalStorageStore`:** giữ nguyên key `nhai.*` cũ (người dùng clone không mất tiến độ); mọi truy cập đi qua interface. Lỗi storage (Safari private) ném lỗi typed `StorageUnavailable`, đã có sẵn try/catch ở code cũ để tham chiếu.
- **SP2 — `HybridStore`:** local-first (ghi local + đẩy server), queue đồng bộ khi online, merge lúc login theo last-write-wins kèm `updated_at`.

### Schema D1 (preview SP2)

`users`, `srs_states(user_id, item_key, status, due_at, updated_at)`, `xp_daily(user_id, date, xp)`, `page_dones`, `decks` + `deck_rows`, `battle_best`, `entitlements`. Item key chuẩn hoá một lần lúc migrate từ localStorage lên server.

## 7. Auth (SP2, preview)

better-auth + D1 adapter, chạy trên Workers: Google + Facebook + email/password (khớp site gốc). Session cookie; check login ở layout server component, không dùng middleware. `nhai.mockLogin` bị xoá. Delete-account: xác nhận email → cascade xoá dữ liệu.

## 8. Mapping port

| Code cũ | Thành mới |
|---|---|
| `shell.js` (nav, sidebar, modals, AI widget, inject `<style>`) | `app/(app)/layout.tsx` + providers (Theme, Toast, Progress) |
| `lesson.js` + 7 modes (`window.NHAI.lessonModes`) | `LessonProvider` (state machine, context) + registry mode; mỗi mode 1 client component với effect cleanup |
| `draw-pad`, `draw-modal`, `hanzi-writer`, donut `review-stats`, SVG `create-file` | Client components cô lập qua `useRef`/`useEffect`, code imperative giữ imperative |
| YouTube postMessage (`shadowing-video`) | Giữ imperative, gói trong 1 component duy nhất |
| `speechSynthesis` (3 nơi: shell, reading, shadowing) | 1 hook `useTts()` dùng chung |
| `my-pages.js` (dead code 339 dòng) | Bỏ, không port |
| Query params `?book=&page=` | Route params: `/course/[book]`, `/lesson/[book]/[page]` |

## 9. Rủi ro & biện pháp

1. **Print path** (`@media print` + `window.print()` của create-file A4): phải verify sau khi chuyển CDN → compiled Tailwind; nếu vỡ, dùng CSS layer riêng cho print.
2. **Safari kill TTS ~15s:** `useTts()` chunking câu dài + retry; chấp nhận chất lượng khác nhau giữa máy, TTS server chỉ đến SP5.
3. **OpenNext đi sau Next:** khóa phiên bản Next theo mức OpenNext hỗ trợ; không nâng cấp Next vội.
4. **SRS 3 format key:** gộp trong `ProgressStore` ngay SP1 để SP2 migrate sạch.

## 10. Testing & deploy

- **Unit:** Vitest + React Testing Library — ưu tiên logic SRS/XP và state machine lesson.
- **E2E:** Playwright smoke 3 luồng: home→lesson→star từ; review dashboard; login (từ SP2).
- **Local:** `next dev` cho UI + `wrangler dev` (Miniflare) cho bindings D1/R2.
- **CI/CD:** GitHub Actions — typecheck, lint, vitest, build OpenNext; PR → Workers preview URL; merge main → production.
- **Lỗi server:** zod validation ở route handlers, response lỗi thống nhất `{error: {code, message}}` khớp shape `/api/v1`. Lỗi client: error boundary theo từng lesson mode (một mode crash không sập app); toast tái dùng hệ có sẵn.

## 11. Điều kiện thành công của toàn bộ lộ trình

1. Không còn Tailwind CDN runtime trên bất kỳ trang nào.
2. Người dùng đăng nhập được, tiến độ sync đa thiết bị, mất localStorage không mất dữ liệu.
3. Trang tra cứu công khai có metadata đầy đủ và được index.
4. Thanh toán → entitlement → mở tính năng chạy end-to-end.
5. Một ngôn ngữ (TS), một app, một lệnh deploy.
