# Shadowing Redesign — Design Spec

- **Ngày:** 2026-10-05
- **Phạm vi:** Port 100% UI `opendesign_hsk/shadowing.html` → `src/app/(app)/shadowing/page.tsx` và `opendesign_hsk/shadowing-video.html` → `src/app/(app)/shadowing/[videoId]/page.tsx`; thêm lớp lưu tiến độ (D1 + API) trong chính app-next.
- **Phương án đã chốt:** A sửa — giữ data content + YouTube engine hiện có, mở rộng content (`topic`, `spd`), tiến độ lưu D1 qua route handlers `/api/v1/shadowing/progress`, guest fallback localStorage.

## 1. Mục tiêu & tiêu chí thành công

1. Cả 2 trang render đúng 100% section của mock, giữ nguyên `data-od-id` làm anchor (test + review dùng selector này).
2. Chức năng thật không regress: YouTube postMessage engine, TTS fallback 4s, chép chính tả (`normDict`/`diffNormalized`), thu âm MediaRecorder.
3. Tiến độ luyện (status/score/seconds) lưu server cho user đã đăng nhập; guest dùng localStorage. Metrics header và status pill hiển thị từ dữ liệu này.
4. `pnpm test`, `pnpm typecheck`, `pnpm lint` pass; e2e G5 (media-documents-smoke) cập nhật theo UI mới và pass; hydration check vẫn pass cho cả 2 route.

### Non-goals

- Upload bản ghi âm lên server (blob chỉ sống trong phiên).
- Đồng bộ phiên nghe/ghi âm realtime, chấm điểm bằng AI.
- Sửa shell v2 (sidebar/topbar/command palette) — chỉ thêm 1 utility breakout dùng page-local.
- Đụng `progress-store` (SRS/XP) — shadowing có lớp progress riêng.

## 2. UI — Trang thư viện `/shadowing`

Thay 5 section playlist tĩnh bằng cấu trúc mock. `page.tsx` giữ server mỏng (SSG, `metadata`), toàn bộ tương tác nằm trong client island `ShadowingLibrary` (pattern roadmap-client), nhận serialize `{ videos, subtitlesByVideo, playlists }`.

Thứ tự render (khớp mock):

1. **Header** (`data-od-id="shadow-header"`): `h1` = `影子跟读 · Shadowing Studio` (`.hanzi` màu accent) + subtitle; cụm 3 metric pills (`data-od-id="shadow-metrics"`): jade "N bài đã luyện", amber "M phút nói", red "P% chuẩn ngữ điệu" — tính từ `useShadowingProgress` (§5). Chưa có dữ liệu → 0 / 0 phút / —%.
2. **Hero daily pick** (`data-od-id="daily-pick"`): grid 2fr/3fr (stack ≤820px). Chọn video deterministic theo ngày: `candidates = videos có subtitle`, index = `floor(daysSinceEpoch) % candidates.length` — client tính (SSG không biết ngày). Thumb = gradient tokenized + watermark 2 chữ đầu title + nút play (click → TTS đọc câu đầu + toast "Phát thử · 0.8x"); copy: scenario pill (`topicVi` uppercase), title hanzi, `py · hsk · dur`, vi, khối "Mẫu câu chính" (câu đầu của subtitle), CTA vermilion "Bắt đầu luyện nói ngay (X phút)" → mở practice overlay (§2.4).
3. **Filter toolbar** (`data-od-id="filter-toolbar"`): 3 hàng seg-control (dùng `SegmentedTabs`/pill style aria-pressed như mock) + search input pill kéo phải:
   - CẤP ĐỘ: Tất cả / HSK 1 / HSK 2 / HSK 3 / HSK 4-6 (nhóm từ `video.hsk`).
   - CHỦ ĐỀ: Tất cả / Đời sống thường nhật / Mua sắm & Ăn uống / Đi lại & Du lịch / Trích đoạn phim (từ `video.topic` mới, §4).
   - TỐC ĐỘ: Tất cả / Chậm · dễ nghe (`spd ≤ 0.85`) / Tự nhiên · bản xứ (`spd > 0.85`) + search lọc `zh+py+vi` lowercase contains.
   - Filter là client state; grid re-render client-side.
4. **Video grid** (`data-od-id="video-grid"`): 3 cột (2 cột 641–1023px, 1 cột ≤640px). Card = `<button>` (`data-od-id="video-{id}"`): thumb gradient + watermark + play + badge duration; body: `hsk` chip viền vermilion + "Tốc độ x.x.x"; title hanzi; vi; foot: "N câu hội thoại · {topicVi}" (N = số câu subtitle, fallback 1 nếu synthetic) + status pill (done jade "Đã hoàn thành · score%", mid amber "Đang luyện · a/N câu", new neutral "Chưa học"). Grid rỗng → empty state "Không có video nào khớp bộ lọc."
5. **Drawer xem trước** (`data-od-id="script-drawer"`): component mới `ShadowingDrawer` — portal-less fixed right 400px + scrim (pattern Dialog hiện có: Esc đóng, stopPropagation theo convention app-shell). Nội dung: title hanzi + `py · hsk · dur` + `vi — topicVi`; danh sách dòng (`zh` + `py`, nút mini-audio TTS đọc câu); CTA full-width "Mở bài luyện đầy đủ" → `<Link>` sang `/shadowing/{videoId}`. Dòng lấy từ `shadowingSubtitles[video.id]`; nếu không có → render đúng 1 dòng synthetic từ title (pattern `FALLBACK_SUBS`).
6. **Practice overlay** (`data-od-id="practice-session"`): fullscreen fixed z-60 nền Paper: top row (nút thoát + "Câu i / N · {video.title}" + track progress jade); body giữa: câu hanzi 34px, pinyin, vi; 2 nút "Nghe mẫu" (TTS) / "Đã đọc xong · câu sau" (primary); hint "Nghe → nhại theo → chuyển câu · Esc thoát". Hết câu cuối → ghi progress `done` + score heuristic 88 (như mock) + toast "Hoàn thành …" + đóng overlay. Overlay hoạt động với mọi video (dùng dòng drawer, synthetic nếu thiếu).

### Token mapping

Mock định nghĩa riêng CSS vars — port về semantic tokens có sẵn trong `globals.css`: `bg→surface-paper`, `card/elev→surface-elevated`, `border→border-subtle`, `fg→text-primary`, `body→text-secondary`, `faint→text-faint`(hoặc `--hz-*` tương đương nếu thiếu), `accent→action-primary`, `jade-*→feedback-success/jade-wash`, `amber-*→amber-wash/amber-ink`, radius `rounded-card/rounded-control`, shadow `shadow-xs/shadow-md`. Cấm hard-code hex. Font hanzi dùng class `.hanzi`/`.zh` hiện có.

## 3. UI — Trang studio `/shadowing/[videoId]`

`page.tsx` giữ server SSG (`generateStaticParams`, `generateMetadata`, `notFound()`, `FALLBACK_SUBS`); render `ShadowingStudio` mới thay cho `VideoPlayer` cũ + hàng "Video liên quan" **bỏ** (mock không có; tránh làm nhiễu layout studio).

**Ràng buộc layout:** `(app)/layout.tsx` bọc `max-w-5xl`. Thêm utility `.hz-breakout` vào `globals.css` (`margin-left: calc(50% - 50vw); width: 100vw;`) — studio page bọc ngoài bằng `.hz-breakout` + `max-w-[1280px] mx-auto px-4 lg:px-6`; trang thư viện giữ container thường. Bottom-nav overlap giữ `pb-28` tương đương.

Thứ tự render trong `ShadowingStudio` (client):

1. **Sticky page header** (`data-od-id="studio-topbar"`, dưới topbar shell): nút "← Thư viện Shadowing" (ghost, hover lên fg), title `{title} • {hsk} · {topicVi}`, phải: "Tiến độ nói: a/N câu (P%)" + track 144px fill jade — từ progress hook.
2. **Cột trái** (58%):
   - **Video stage** (`data-od-id="video-stage"`): giữ iframe YouTube thật của engine hiện tại, bọc trong stage 16/9 `max-h-[250px]` gradient fallback + watermark 2 chữ đầu title + overlay phụ đề dưới đáy (`zh` trắng + `py` mờ; toggle theo subMode) + bigplay khi chưa phát. State `videoHidden` cũ → stage về pure-gradient thumbnail.
   - **Player toolbar** (`data-od-id="player-toolbar"`, card): play/pause button, scrub `<input type=range>` (sync `getCurrentTime` polling sẵn có) + thời lượng, "Lặp câu" toggle (`loop-on` khi bật), speed seg **0.75 / 0.85 / 1.0** (map vào engine rate — bỏ select 5 mức), nút **CC** cycle subMode: Hán tự+Pinyin → chỉ Pinyin → chỉ Hán tự (toast trạng thái).
   - **Waveform card** (`data-od-id="waveform-card"`): canvas 2 hàng bars 72 cột pseudo-random deterministic (hàm `bars(seed)` tách pure để unit test) — "Bản xứ" màu ink (redraw khi đổi câu), "Giọng của bạn" trống hiện text "Chưa có bản ghi — nhấn giữ mic…", sau khi thu xong vẽ màu vermilion + nút "Phát lại" (Audio blob-URL). Inspector (`data-od-id="tone-inspector"`): chips từ vựng (mỗi câu `parts`/word list; sau khi chấm → ok jade `✓` / warn amber `~`), score badge jade/amber/neutral.
   - **Record dock** (`data-od-id="record-dock"`): mic 56px vermilion, `pointerdown` bắt đầu / `pointerup|leave|cancel` dừng (kế thừa logic `recorder-panel`: getUserMedia + MediaRecorder + analyser level bar; lỗi mic → chế độ mô phỏng + toast). Giữ phím **Space** hold-to-record (thay cho play/pause cũ — mapping phím mới bên dưới). stepnav "◀ Câu trước / Câu tiếp theo ▶". Ở tab Chép chính tả dock mờ (`opacity-45 saturate-50`) và chặn thu âm.
   - Chấm điểm khi nhả mic: heuristic độ dài bản ghi vs kỳ vọng `zh.length * 0.55 / rate` (công thức mock), score 55–98 → cập nhật chips + badge + score-pill câu + **ghi progress** (`mid`, score, +seconds thực thu).
3. **Cột phải** (42%) — script pane:
   - Tabs `data-od-id="script-tabs"`: "Kịch bản đồng bộ" / "Chép chính tả" (aria-pressed).
   - **Transcript stream** (`data-od-id="transcript-stream"`): kế thừa danh sách câu hiện tại (`data-sent=i`, click → seek + TTS, autoscroll, spk button nghe câu) — restyle: card 16px, câu active viền vermilion 2px + `accent-soft` + font 20px; **thêm CSS `.sent-active` vào `globals.css`** (bug cũ: class được gắn nhưng chưa từng có style). Score-pill mỗi câu: "Chưa luyện" / "score%".
   - **Dictation panel** (`data-od-id="dictation-box"`): giữ logic `normDict`/`diffNormalized`; UI mock: dict-head "CÂU i / N" + mốc thời gian, 2 mini-btn "Nghe câu mẫu"/"Nghe chậm 0.65x", khối "GỢI Ý Ô TRỐNG" chips ký tự mask `?` (mở dần theo lần bấm "Gợi ý 1 chữ", hết → toast), textarea hanzi 18px, hint pinyin 40% đầu, "Kiểm tra đáp án" vermilion full-width (Enter không shift), nav "◀ Câu trước / Bỏ qua ▶", kết quả ok jade / no vermilion. Đúng → ghi progress câu này (score ≥85, status mid).
4. **Phím tắt (mapping mới, cập nhật e2e)**: `Space` giữ = thu âm (keyup nhả), `K` = phát/dừng, `R` = nghe mẫu, `L` = lặp câu, `←/→` = câu trước/sau. Bỏ qua khi focus trong input/textarea/select. `Esc` blur/close drawer.

## 4. Data — content module

- Mở rộng `ShadowingVideo` thêm 2 trường bắt buộc: `topic: "life" | "food" | "travel" | "film"` và `spd: number` (0.75–1.0). Gán thủ công cho 20 video hiện có (playlist `đại Hoa Tây Du` → `film`, còn lại theo nội dung title; `spd` giảm dần theo HSK thấp).
- `topicVi` derive qua map tĩnh trong cùng file (không lưu DB).
- Giữ nguyên `shadowingSubtitles`, `shadowingVideoById`, `relatedVideos` (bỏ dùng ở page nhưng giữ helper), `FALLBACK_SUBS`.
- Bỏ playlist-sections ở UI nhưng **giữ `shadowingPlaylists` + `playlistId`** trong data (không xóa — trang khác/khác có thể dùng; chỉ page này thôi thay đổi).

## 5. Tiến độ — DB + API + client

### 5.1 Database (`src/lib/db/schema.ts`)

```ts
export const shadowingProgress = sqliteTable(
  "shadowing_progress",
  {
    id: text("id").primaryKey(),               // crypto.randomUUID()
    userId: text("userId").notNull().references(() => user.id, { onDelete: "cascade" }),
    videoId: text("videoId").notNull(),        // phải tồn tại trong shadowingVideos
    status: text("status", { enum: ["new", "mid", "done"] }).notNull().default("mid"),
    score: integer("score"),                   // 0–100, nullable
    seconds: integer("seconds").notNull().default(0), // tổng giây thu âm
    createdAt: integer("createdAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
    updatedAt: integer("updatedAt", { mode: "timestamp" }).notNull().default(sql`(unixepoch())`),
  },
  (t) => [uniqueIndex("shadowing_progress_user_video_uq").on(t.userId, t.videoId)]
);
```

Migration: `pnpm drizzle-kit generate` → `wrangler d1 migrations apply hsk-dev --remote` (dev) — quy trình ghi trong `drizzle.config.ts`. `initOpenNextCloudflareForDev` **đã bật** trong `next.config.ts` nên local dev có binding D1.

### 5.2 API (route handlers, pattern `/api/v1`)

- **`GET /api/v1/shadowing/progress`**: `getAuth().api.getSession({ headers: req.headers })` → 401 nếu không có session. Trả `{ items: [{ videoId, status, score, seconds, updatedAt }] }` của user.
- **`PUT /api/v1/shadowing/progress/[videoId]`**: body `{ status?, score?, secondsDelta? }` (zod; `secondsDelta ≥ 0`, status ∈ enum). 401 chưa đăng nhập; 400 videoId không có trong `shadowingVideos` hoặc body sai; upsert `onConflictDoUpdate` trên `(userId, videoId)` — `seconds` cộng dồn, `score`/`status` lấy max/last-wins (score lấy max, status: `done` không bị hạ về `mid`). Trả record sau upsert.
- Cả 2 route dùng `createDb()` trong request context (không import db lúc build).

### 5.3 Client layer

- **`src/lib/shadowing/progress.ts`** (mới, thay thế vai trò prefs cho progress): key localStorage `bye.shadow.progress` = `Record<videoId, {status, score, seconds, updatedAt}>`.
- **Hook `useShadowingProgress()`** (`src/lib/shadowing/use-shadowing-progress.ts`): dựa trên `useSession()`:
  - Đã đăng nhập: GET 1 lần lúc mount → state; `recordPractice(videoId, { score?, secondsDelta?, status? })` = optimistic update local + PUT, lỗi network → giữ local + toast "Chưa đồng bộ được tiến độ" (retry lần sau).
  - Guest: đọc/ghi localStorage thuần.
  - Trả `{ progressMap, metrics: { practiced, seconds, avgScore }, recordPractice }`. `metrics` tính: practiced = số video status mid+done; seconds = tổng; avgScore = mean score của video done (không có → null, UI hiện "—%").
- Sau khi user đăng nhập lần đầu, ưu tiên merge: nếu localStorage có dữ liệu guest mà server trống → push từng record lên server rồi clear key guest (one-shot, guard bằng cờ trong key `bye.shadow.progress.migrated`).

## 6. Component & file layout

```
src/app/(app)/shadowing/
  page.tsx                      (server mỏng → ShadowingLibrary)
  shadowing-library.tsx         (client island: header+hero+toolbar+grid+drawer+overlay)
  shadowing-drawer.tsx          (drawer xem trước)
  practice-overlay.tsx          (fullscreen practice TTS)
  [videoId]/page.tsx            (server mỏng → ShadowingStudio)
  [videoId]/shadowing-studio.tsx (client: topbar + 2 cột)
src/components/shadowing/
  video-player.tsx              → refactor thành engine thuần (hook logic) hoặc xóa sau khi di chuyển; logic yt/tts/transport giữ nguyên
  video-card.tsx                (giữ — dùng lại cho grid? KHÔNG: grid mới là <button> mở drawer; video-card chỉ còn dùng ở nơi khác nếu có)
  dictation-panel.tsx           → tính hợp nhất vào studio (logic giữ, UI restyle)
  recorder-panel.tsx            → logic MediaRecorder tách thành src/lib/shadowing/use-recorder.ts (hook) cho studio
  library-client.tsx            (xóa — dead code)
  cat-filter.tsx, xem-tat-ca.tsx (xóa — UI mới không dùng)
src/lib/shadowing/
  progress.ts, use-shadowing-progress.ts, use-recorder.ts, waveform.ts (pure bars)
  prefs.ts, dictation.ts        (giữ)
src/app/api/v1/shadowing/progress/route.ts              (GET)
src/app/api/v1/shadowing/progress/[videoId]/route.ts    (PUT)
```

Quy ước giữ nguyên từ các lần port: `cn()`, Button/Chip/Card/IconButton của `src/components/ui`, focus ring `ring-action-focus`, min touch 44px, một primary action per screen.

## 7. Xử lý lỗi & edge cases

- **YouTube không ready sau 4s** → TTS banner hiện có, giữ hành vi.
- **Mic bị từ chối** → sim mode + toast (như mock), vẫn chấm heuristic.
- **Chưa đăng nhập bấm luyện** → vẫn luyện đầy đủ, progress ghi localStorage; sau đăng nhập merge (§5.3).
- **Video không có subtitle** → drawer/practice dùng 1 câu synthetic; studio transcript dùng `FALLBACK_SUBS` (đã có).
- **API lỗi 5xx/network** → optimistic local + toast; không block UI luyện.
- **Grid rỗng sau filter** → empty state.

## 8. Testing

- **Unit (vitest + RTL)**:
  - `waveform.ts` — deterministic bars (cùng seed → cùng mảng).
  - `progress.ts` — localStorage read/write/merge/migrate.
  - `use-shadowing-progress` — guest path + mock fetch cho user path (optimistic + lỗi).
  - Route handlers — mock `getAuth`/`createDb` (drizzle memory hoặc stub) cho 200/400/401/upsert logic; nếu mock db quá cồng kềnh thì test phần validate zod + auth guard bằng stub, upsert logic chấp nhận test qua e2e.
  - `shadowing-library` — filter (level/topic/speed/search), drawer mở/đóng Esc, hero pick deterministic theo ngày giả lập.
  - `shadowing-studio` — giữ các assertion cũ của `video-player.test.tsx` (iframe src, `Câu N/9`, TTS 4s, seekTo) chuyển sang cấu trúc mới + phím mới (Space record, K play).
- **E2E (Playwright)**: cập nhật describe G5 — stub YouTube giữ nguyên; đổi theo UI mới: 5 `h2` → hero + toolbar selectors `data-od-id`; card click → drawer → "Mở bài luyện đầy đủ" → `/shadowing/EA3rwvr99Q0`; `[data-sent].sent-active` có style (assert class + computed border); phím K play, Space giữ thu âm (fake mic qua `--use-fake-device-for-media-capture` hoặc skip nếu CI không hỗ trợ — ghi rõ trong spec test), dictation nhập + check. `hydration.spec.ts` giữ 2 route.
- **Verification**: `pnpm test && pnpm typecheck && pnpm lint && pnpm test:e2e`.

## 9. Rủi ro & quyết định mở

- **Space đổi nghĩa** (play→record) là thay đổi hành vi với user cũ — đã chốt theo mock; ghi chú trong dialog "Phím tắt" của studio.
- **Refactor video-player.tsx** là phần rủi ro kỹ thuật lớn nhất: giữ engine (postMessage/polling/TTS chain) nguyên vẹn, chỉ tách view; nếu tách hook gây regression thì chấp nhận giữ file cũ và restyle JSX tại chỗ.
- Score heuristic (độ dài bản ghi) là "honest mock" như mock gốc — ghi nhãn rõ "khớp nhịp nói" chứ không phải chấm thanh điệu thật.
