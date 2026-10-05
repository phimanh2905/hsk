# Notebook Redesign — Design Spec

- **Ngày:** 2026-10-05
- **Phạm vi:** Port 100% UI `opendesign_hsk/notebook.html` → route mới `/notebook` (dashboard "Sổ tay & Ghi chép"), kèm bảng D1 `notebook_entries`, CRUD API `/api/v1/notebook/entries` và auto-capture câu sai từ 3 luồng luyện tập.
- **Phương án đã chốt:** A — dashboard mới + bảng entries + API + auto-capture; 3 sổ còn lại trên shelf là content tĩnh; guest fallback localStorage.

## 1. Mục tiêu & tiêu chí thành công

1. `/notebook` render đúng 100% section của mock (hero, shelf 4 sổ, stream filters, stream cards 3 kind, search, empty state), giữ `data-od-id` (`notebook-hero`, `notebook-shelf`, `book-mistakes`, `book-confusables`, `book-idioms`, `book-speaking`, `stream-filters`, `add-note`, `note-{id}`). **Không port** shell của mock (sidebar/topbar/bottomnav).
2. Dữ liệu thật: entries lưu server cho user đăng nhập (D1), guest dùng localStorage; đăng nhập → merge lên server đúng 1 lần.
3. Tự động gom câu sai: một lần trả lời sai ở quiz bài học, mini-test lộ trình hoặc ôn SRS (grade `forgot`) tạo 1 entry `kind="wrong"` với đủ wrong/right/cause.
4. Sidebar có mục "Sổ tay" (`/notebook`), command palette có entry, breadcrumb hiển thị "Sổ tay" (đã có sẵn trong `breadcrumb.ts`).
5. `pnpm test && pnpm typecheck && pnpm lint` pass; e2e mới cho `/notebook` pass; hydration check thêm `/notebook`.

### Non-goals

- Trang "chi tiết sổ" riêng cho từng book (mock chỉ toast/anchor); "Tạo sổ mới" theo nghĩa sổ rỗng — thay bằng dialog tạo ghi chú cá nhân (§2.5).
- Chấm điểm/thuộc-từng-cặp cho 3 sổ tĩnh (chữ dễ nhầm/thành ngữ/khẩu ngữ) — chỉ hiển thị số liệu biên tập.
- Đụng `/my-vocab`, `/my-grammar`, `/notebook/[kind]/[id]` hiện có; không sửa `progressStore` (trừ điểm hook capture ở §4).
- Realtime sync giữa tab (chỉ `bye:progress`-style event nội bộ).

## 2. UI — trang `/notebook` (route group `(wide)`, 1280px)

`src/app/(wide)/notebook/page.tsx` — server mỏng (metadata "Sổ tay & Ghi chép") + client island `NotebookDashboard`. Không `LoginGate` (guest xem được dữ liệu local của mình; khác với my-vocab — cố ý).

Thứ tự render:

1. **Search hàng đầu trang** (`data-od-id="notebook-search"`): pill search full-width (`aria-label="Tìm kiếm trong tất cả sổ tay"`, placeholder như mock, kbd `/`). Phím `/` focus vào ô này (bỏ qua khi đang ở input/textarea). Chỉ tìm trong entries (match chuỗi JSON payload + tag, lowercase contains) — không tìm trong 3 sổ tĩnh.
2. **Hero** (`data-od-id="notebook-hero"`, card 24px radius, grid `1fr auto`, stack ≤860px, căn giữa khi stack): eyebrow jade "TRUNG TÂM GHI CHÉP & HÓA GIẢI ĐIỂM MÙ"; `h1` động: có wrong-mới trong 7 ngày → "Có {N} câu làm sai tuần này cần xem lại trước kỳ thi HSK {mức cao nhất của entries}" (không suy ra được mức → bỏ đuôi), không có → "Chưa có câu sai nào tuần này — cứ tiến lên!"; p phụ lục "Mỗi lỗi sai đã được gắn nguyên nhân gốc — sửa 1 lần, nhớ cả cụm."; 3 `hpill`: "📕 4 Sổ chuyên đề" (cố định), "📝 {tổng entries} Mục ghi chép", "🛡️ Đã khắc phục: {P}%" (P = % entry `wrong` đã ghim ★; không có wrong → "—"); CTA vermilion `data-od-id="notebook-cta"` "🎯 Ôn tập {N} lỗi sai ngay" → `<Link href="/review">` (N = 0 vẫn hiện "Ôn tập lỗi sai ngay").
3. **Shelf 4 sổ** (`data-od-id="notebook-shelf"`, grid 4/2/1 cột, card 20px, hover translateY(-2px)) — icon emoji dùng từ mock (🛑 🔍 🐉 💼):
   - `book-mistakes` "SỔ CÂU LÀM SAI · 错题本 · Tự động gom": big "{tổng wrong} câu hỏi cần nhớ", badge warn "Cần xử lý: {wrong chưa ghim trong 7 ngày} câu" (0 → badge ok "Đã xử lý hết 🎉"); CTA "Mở sổ lỗi sai" → set filter `wrong` + scroll tới stream.
   - `book-confusables` "CHỮ HÁN DỄ NHẦM · 形近字 / 易混字": số liệu + badge từ content tĩnh; CTA "Luyện phân biệt" → toast "Sắp có — đang biên tập".
   - `book-idioms` "THÀNH NGỮ HSK · 成语 / 惯用语": như trên; CTA "Học thành ngữ" → toast.
   - `book-speaking` "KHẨU NGỮ THỰC TẾ · 口语 · Giao tiếp & VP": như trên; CTA "Luyện giao tiếp" → toast.
   - Nguồn: `src/content/notebook-books.ts` (§3.3).
4. **Stream filters** (`data-od-id="stream-filters"`, `role="group"`): 4 chip aria-pressed — "Tất cả mục" / "Câu sai chưa sửa" (`wrong`, **mặc định active như mock**) / "Chữ Hán dễ nhầm" (`chars`) / "Ghi chú cá nhân" (`personal`) — chip active = viền + chữ vermilion + ring wash; nút `btn-add` `data-od-id="add-note"` "+ Tạo sổ mới" kéo phải (§2.5). Filter là client state; search kết hợp AND.
5. **Stream** (`data-od-id="mistake-stream"`, cột dọc gap-4): mỗi entry 1 card `note-{id}`:
   - **mhead**: tag pill (tone: `red` = rose-wash, `lav` = feature-ai wash tím token có sẵn, `per` = jade-wash; label từ entry) + time (`fmtRelativeDate` — export có sẵn từ `notebook-list.tsx`, reuse) + actions kéo phải: nút ★ 36px (saved → nền amber-wash, `aria-pressed`, toggle → PATCH/local + toast "Đã ghim ★ ghi chú"/"Đã bỏ ghim ghi chú") và nút ⋮ 36px (toast "Tùy chọn: ghim · chuyển sổ · báo lỗi nội dung" — giữ demo như mock).
   - **kind `wrong`**: câu hỏi `.hanzi text-lg leading-relaxed`; khối contrast 2 dòng (`cline wrong` nền rose nhạt: "❌ Bạn đã chọn: {wrong.zh} ({wrong.py})" — `wrong` null → "❌ Bạn chưa nhớ:" ; `cline right` nền jade-wash: "✅ Đáp án đúng: {right.zh} ({right.py})"); khối cause nền muted "💡 **Điểm mấu chốt:** {cause}".
   - **kind `chars`**: khối `bigchars` nền paper viền dashed — các cặp `<b class="hanzi text-[28px]">{zh}</b><span>{py}</b>` ngăn bởi "vs"; khối cause tip.
   - **kind `personal`**: khối note nền paper.
   - **Footer CTA** `btn-secondary`: `wrong` → `<Link href="/review">Thử thách lại câu này</Link>`; `chars` → `<Link href="/hanzi">Xem bút thuận nét viết</Link>`; `personal` → không render.
   - **Empty** (`data-od-id="stream-empty"`): "Không có mục nào khớp bộ lọc. Thử từ khóa khác."
6. **Toast + aria-live**: dùng `useToast` shell có sẵn.

### 2.5 Dialog tạo ghi chú

Nút "+ Tạo sổ mới" mở `Dialog` (title "Ghi chú cá nhân", subtitle giải thích: sổ chuyên đề tự gom, ghi chú tự do lưu ở đây): textarea `aria-label="Nội dung ghi chú"` (bắt buộc, ≥2 ký tự), nút "Lưu ghi chú" primary (disabled khi rỗng) → tạo entry `kind="personal"`, tag "📝 Ghi chú cá nhân" tone `per`, `source="manual"` → toast "Đã lưu ghi chú" + chuyển filter sang `personal`. (Mock chỉ toast demo — thay bằng flow thật vì personal entries cần đường tạo.)

## 3. Data

### 3.1 DB — bảng `notebook_entries` (`src/lib/db/schema.ts`)

```ts
export const notebookEntries = sqliteTable(
  "notebook_entries",
  {
    id: text("id").primaryKey(),          // client sinh crypto.randomUUID() — idempotent sync
    userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["wrong", "chars", "personal"] }).notNull(),
    tag: text("tag").notNull(),           // nhãn hiển thị, ví dụ "🛑 Lỗi sai trong bài thi thử HSK 4"
    tagTone: text("tagTone", { enum: ["red", "lav", "per"] }).notNull().default("red"),
    payload: text("payload").notNull(),   // JSON đúng zod schema §3.2 theo kind
    saved: integer("saved", { mode: "boolean" }).notNull().default(false),
    hsk: text("hsk"),                     // "HSK1".."HSK6" | null
    source: text("source", { enum: ["auto", "manual"] }).notNull().default("manual"),
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (t) => [index("notebook_entries_user_created_idx").on(t.userId, t.createdAt)]
);
```

Migration: `drizzle-kit generate` → `wrangler d1 migrations apply` (như shadowing plan Task 2).

### 3.2 Payload zod (dùng chung client + server, `src/lib/notebook/payload.ts`)

```ts
wrong: { q: string; wrong: { zh: string; py?: string } | null; right: { zh: string; py?: string }; cause: string }
chars: { chars: { zh: string; py: string }[]; tip: string }   // 2..4 cặp
personal: { note: string }
```

### 3.3 Content tĩnh — `src/content/notebook-books.ts`

3 sổ biên tập sẵn theo mock: mỗi book `{ id: "confusables" | "idioms" | "speaking", icon, title, sub, big (số liệu hiển thị, vd "18 cặp chữ hay nhầm"), badge (text, tone), cta (label) }`. Số liệu là biên tập tĩnh (không đếm runtime) — đúng bản chất demo của mock.

### 3.4 Auto-capture — `src/lib/notebook/capture.ts`

```ts
export function captureWrong(input: {
  q: string; wrong: { zh: string; py?: string } | null; right: { zh: string; py?: string };
  cause: string; hsk?: string; tag?: string; tagTone?: "red" | "lav" | "per";
}): void
```

Hành vi: luôn ghi vào localStorage `bye.notebookEntries` (id UUID, `kind="wrong"`, `source="auto"`, `saved=false`, tag mặc định "🛑 Lỗi sai khi luyện tập" tone `red`) + `dispatchEvent("bye:progress")`; rồi fire-and-forget: nếu `authClient.getSession()` có user → `POST /api/v1/notebook/entries` (thất bại → bỏ qua, entry vẫn ở local, sync-on-login sẽ đẩy sau). **3 điểm gọi:**

1. **Quiz bài học** (`src/components/lesson/modes/quiz.tsx`): nhánh chọn sai (`showWrong`) → `q` = "Từ „{item.hanzi}‟ đọc thế nào?", `wrong` = { zh: picked (pinyin đã chọn) }, `right` = { zh: item.pinyin }, `cause` = "Pinyin đúng của {hanzi} ({meaning}) là {pinyin}.", `hsk` từ book id của lesson.
2. **Mini-test lộ trình** (`src/components/roadmap/session-client.tsx`, 2 chỗ state `"wrong"` ở L323-326 và L380-383): `q` = đề câu hỏi, `wrong` = option đã chọn, `right` = option đúng, `cause` = trường giải thích của câu hỏi nếu có, không có → "Xem lại câu này trong bài học của trạm.", `hsk` từ level hiện hành.
3. **Review SRS** (`src/app/(app)/review/review-dashboard.tsx` — ngay sau lệnh `progressStore.recordReview(key, grade)`, khi `grade === "forgot"`): `q` = "{zh} nghĩa là gì?", `wrong` = null, `right` = { zh: word.zh, py: word.pinyin }, `cause` = "Quên khi ôn SRS — từ sẽ quay lại sớm."; word resolve được (qua `resolveWord` sẵn có) thì capture, **không resolve được (key hỏng) thì bỏ qua, không crash**. Đặt hook ở đây chứ không trong `progress-store.ts` để tránh import vòng (`progress-store` ↔ `srs-session`).

Chống spam: dedupe theo khóa `q + right.zh` trong 24h (kiểm tra trong `capture.ts` trước khi ghi — cùng key tồn tại trong localStorage → bỏ qua).

### 3.5 Client store — `src/lib/notebook/entries.ts` + `use-notebook-entries.ts`

- localStorage key `bye.notebookEntries` = `NotebookEntry[]` — `{ id, kind, tag, tagTone, payload, saved, hsk, source, createdAt, updatedAt }` (ISO string timestamps ở local).
- Hook `useNotebookEntries()` (pattern 2 nhánh như shadowing `useShadowingProgress`): guest → đọc/ghi localStorage, re-sync qua event `bye:progress`; user → GET khi mount, merge local-up-server (POST từng entry local có `updatedAt` mới hơn hoặc chưa có trên server — idempotent vì id do client sinh), clear local entries đã sync, `recordPractice`-style mutation: `create(entry) / setSaved(id, saved) / remove(id)` = optimistic local + gọi API, lỗi network → giữ local + toast "Chưa đồng bộ được — sẽ thử lại sau".
- `notebookStats(entries)`: `{ total, wrongTotal, wrongWeek, wrongUnfixedWeek, fixedPct }` — `wrongWeek` = wrong tạo trong 7 ngày trở lại; `fixedPct` = round(saved wrong / wrongTotal × 100).

## 4. Shell wiring

- `sidebar-nav.tsx`: thêm 1 item vào nhóm "CÁ NHÂN & CÔNG CỤ", sau "Sổ tay từ vựng": `{ href: "/notebook", label: "Sổ tay", Icon: NotebookPen }` (lucide `NotebookPen`, import qua `ui/icon`).
- `command-index.ts`: thêm `{ label: "Sổ tay & Ghi chép", href: "/notebook", group: "Cá nhân" }`.
- `breadcrumb.ts`: đã có sẵn `notebook: "Sổ tay"` — không sửa.
- `hydration.spec.ts`: thêm `/notebook` vào ROUTES.

## 5. API — `/api/v1/notebook/entries`

- **`GET /`** → 401 nếu không có session; `{ items: NotebookEntryRow[] }` (payload đã parse JSON, order `createdAt DESC`).
- **`POST /`** body `{ id?, kind, tag, tagTone, payload, hsk?, source? }` — zod: payload match schema theo `kind` (discriminated union); `id` optional UUID (server sinh nếu thiếu) → 201 `{ item }`. Upsert theo id (idempotent cho sync-on-login).
- **`PATCH /[id]`** body `{ saved: boolean }` → `{ item }`; 404 nếu id không thuộc user.
- **`DELETE /[id]`** → 204; 404 tương tự.
- Auth: `getAuth().api.getSession({ headers })` — pattern giống shadowing plan Task 3 (là route CRUD đầu tiên, không có tiền lệ khác ngoài auth).

## 6. File layout

```
src/app/(wide)/notebook/page.tsx              (server mỏng)
src/app/(wide)/notebook/notebook-dashboard.tsx (client island)
src/app/(wide)/notebook/__tests__/…            (unit)
src/content/notebook-books.ts                  (3 sổ tĩnh)
src/lib/notebook/payload.ts, entries.ts, use-notebook-entries.ts, capture.ts
src/app/api/v1/notebook/entries/route.ts               (GET, POST)
src/app/api/v1/notebook/entries/[id]/route.ts          (PATCH, DELETE)
```

Sửa nhỏ: `src/components/lesson/modes/quiz.tsx`, `src/components/roadmap/session-client.tsx`, `src/app/(app)/review/review-dashboard.tsx`, `sidebar-nav.tsx`, `command-index.ts`, `src/lib/db/schema.ts`, `e2e/hydration.spec.ts`. **Không sửa `progress-store.ts`.**

Quy ước giữ nguyên: `cn()`, Button/Chip/Card/Dialog/IconButton, token semantic (cấm hex — tone `lav` dùng token `feature-ai` wash có sẵn), focus ring chuẩn, copy tiếng Việt giọng study coach.

## 7. Xử lý lỗi & edge cases

- **localStorage hỏng/JSON sai** → `[]` như progress-store.
- **Payload không parse được theo kind** (dữ liệu cũ/hỏng) → bỏ entry đó khỏi render, không crash.
- **Chưa đăng nhập luyện tập** → capture chỉ ghi local; đăng nhập → sync-on-login đẩy lên.
- **API lỗi** → optimistic local + toast, không block UI.
- **SSR/hydration**: mọi số liệu thời gian (relative time, đếm tuần) tính client-side sau `mounted` — SSR render state rỗng (pattern `NotebookList` L47-58).
- **Entries rất nhiều** → stream render cả list (đủ nhỏ ở quy mô demo); không phân trang (YAGNI).

## 8. Testing

- **Unit**: `payload.ts` (3 schema ok/fail); `entries.ts` (round-trip, corrupt→[], stats tính đúng ranh giới 7 ngày); `useNotebookEntries` (guest CRUD local; user mock fetch GET/POST/PATCH/DELETE + optimistic + lỗi; merge-on-login idempotent); `capture.ts` (ghi local + event + dedupe 24h + không crash khi word null); quiz/roadmap/recordReview hook (assert được gọi với payload đúng tại nhánh sai/forgot); `notebook-books.ts` shape.
- **Component**: dashboard — hero counts theo fixture (có/không wrong), filters + search kết hợp, 3 kind render đúng khối, saved toggle + toast, empty state, dialog tạo ghi chú, `/` focus search.
- **API**: mock `getAuth`/`createDb` — 401/400 (payload sai kind)/201 upsert idempotent/PATCH 404/DELETE 204 (pattern shadowing plan Task 3).
- **E2E** `e2e/notebook.spec.ts`: guest seed localStorage qua `addInitScript` → `/notebook` thấy card, filter, search, tạo ghi chú personal, badge counts đúng; sidebar có link "Sổ tay". Hydration: thêm `/notebook`.

## 9. Rủi ro & quyết định mở (đã chốt trong brainstorm)

- `recordReview` là nơi duy nhất ghi grade — hook capture đặt ở `review-dashboard` (người gọi) để không đụng logic SRS và không gây import vòng; hệ quả: nếu sau này có nơi khác gọi `recordReview(..., "forgot")` thì phải thêm capture ở đó (ghi chú trong code).
- **"Tạo sổ mới" trở thành "tạo ghi chú cá nhân"** — lệch chữ với mock nhưng cần đường tạo dữ liệu thật; visual giữ nguyên nút mock.
- Route CRUD đầu tiên ngoài auth trong project — đặt tiền lệ error-shape (`{ error: string }` + status code) sẽ dùng chung về sau.
