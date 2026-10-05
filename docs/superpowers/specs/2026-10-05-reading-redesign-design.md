# Reading — port `opendesign_hsk/reading.html` vào `app-next`

- **Ngày:** 2026-10-05
- **Trạng thái:** Đã duyệt design (brainstorming) — chờ review spec
- **Nguồn design:** `opendesign_hsk/reading.html` (446 dòng, mock "Hanzi — Thư viện bài đọc", CSS thuần tự chứa, 2 view toggle `hidden`)
- **Phạm vi repo:** `app-next/` trên nhánh `pinyin-lab-redesign` — **thay hoàn toàn** trang `/reading` hiện tại
- **Route group:** `(wide)` (đã tồn tại, `max-w-[1280px]`) — đã verify vừa: grid 3 cột ≈317px/card, canvas reader 780px centered, topbar không wrap

## 1. Mục tiêu & quyết định đã chốt

Port **100%** mock Reading thành component, thay trang `/reading` cũ (textarea dán văn bản + karaoke ký tự). Quyết định người dùng đã chọn:

1. **Data & API: thuần client-side (phương án A)** — content module `src/content/reading.ts` chứa toàn bộ bài đọc; progress qua `progressStore` (localStorage + cross-tab, KHÔNG API route). Data-access tách module getter mỏng để sau này cắm be-v2 library API không phải sửa UI.
2. **Thay hoàn toàn** — xoá reading-client cũ (textarea 3000 ký tự, demoDoc, callout 6 bước, AccountBox). `demoDoc` cũ (13 câu, 654 ký tự) được hấp thụ thành 1 bài trong thư viện mới.
3. **2 route thật thay toggle `hidden`**: `/reading` (Library) + `/reading/[id]` (Reader) — deep-link + browser Back hoạt động đúng, đồng thời sửa sẵn bug `openReader(id)` bỏ qua `id` của mock.

Ngoài phạm vi (mock có nhưng **không port**):

- **Sidebar/bottomnav/topbar của mock** — shell của app lo; chỉ **thêm mục "Đọc hiểu"** vào GROUPS nhóm "KỸ NĂNG & LUYỆN TẬP" trong `sidebar-nav.tsx` (hiện thiếu), đổi nhãn breadcrumb → "Thư viện bài đọc".
- **Toast tự viết + `#srLive`** — dùng `ToastProvider` (`useToastSafe`, aria-live có sẵn).
- **Audio file thật** — không có asset; karaoke chạy bằng Web Speech TTS (giọng zh-CN).

Điểm khác biệt có chủ ý (sửa so với mock, không phải bug):

- **Hero lấy từ data**: mock hardcode hero = bài `tea` trong khi card `tea` đã 100% (lệch). App: bài đề xuất = bài đầu tiên `readState === "unread"` theo thứ tự LIB; nếu hết → bài đầu tiên. Pills (phút, số chữ, từ mới, audio) tính từ item.
- **`note` string tách thành data có cấu trúc** (`pct`, `readState`, `quizDone`) — format chuỗi ("Đang đọc dở (45%)", "Đã đọc 100% · Đạt quiz"…) ở view; `cta` ("Đọc ngay/Đọc tiếp/Đọc lại") suy ra từ state.
- **Quiz thêm field `explanation`** (mock không có) — hiện trong feedback đúng/sai.
- **Options quiz bỏ prefix "A. "** trong data (mock viết sẵn trong chuỗi rồi `.slice(3)` khi render); key A/B/C sinh ở view.
- **Persist thêm so với mock**: progress đọc, saved, quiz-done, scaffold mode, cỡ chữ (mock mất hết khi reload).

## 2. Mô hình dữ liệu — `src/content/reading.ts` (viết lại)

Type hoá, const prefix `READING_`. Port 1:1 phần mock có (`LIB` 6 item dòng 288–295, `SENTS`/`QUIZ` của bài `tea` dòng 327–337):

```ts
export type ReadingLevel = "HSK 1" | "HSK 2" | "HSK 3" | "HSK 4" | "HSK 5" | "HSK 6";
export type ReadingCat = "daily" | "culture" | "fable" | "exam";
export type ReadingLibItem = {
  id: string;              // "tea" | "chongyang" | "interview" | "frog" | "hsk4mock" | "morning"
  lv: ReadingLevel;
  cat: ReadingCat;
  min: number;             // phút đọc
  n: number;               // số chữ
  nw: number;              // số từ mới (pill hero "✨ N từ mới" + note "Chưa đọc · N từ mới")
  title: string;           // 茶道与宁静
  py: string;              // chádào yǔ níngjìng
  vi: string;              // Trà đạo và sự tĩnh lặng
  ex: string;              // excerpt
};
export type ReadingWord = { z: string; p: string; h: string; m: string };
  // z=chữ Hán, p=pinyin, h=Hán-Việt, m=nghĩa tiếng Việt — đúng shape SENTS của mock
export type ReadingQuizItem = { q: string; options: string[]; answer: number; explanation: string };
export type ReadingArticle = { id: string; sentences: ReadingWord[][]; quiz: ReadingQuizItem[] };

export const READING_LIB: ReadingLibItem[];                 // 6 item, field order copy mock
export const READING_ARTICLES: Record<string, ReadingArticle>; // id → nội dung đọc
export const READING_LEVELS: ReadingLevel[];                // HSK 1..6 (thứ tự chip filter)
export const READING_CATS: { key: ReadingCat; label: string }[]; // daily/culture/fable/exam + nhãn VI
```

**Content 6 bài** (điều kiện "data 100%": mọi id trong LIB đều có article thật, không bài nào mượn passage bài khác):

| id | Nguồn nội dung |
|---|---|
| `tea` | Port 1:1 `SENTS` (5 câu, 19 từ) + `QUIZ` (2 câu) của mock; soạn `explanation` cho 2 câu |
| `chongyang`, `interview`, `frog`, `hsk4mock`, `morning` | **Soạn mới** khi implement: 4–6 câu/bài, mỗi câu 4–10 từ có đủ `{z,p,h,m}`, 2–3 quiz/bài đúng level HSK tương ứng, có `explanation`. Sau đó cập nhật `ex`/`n`/`nw`/`min` của item LIB cho khớp nội dung thật |

Ngoài 6 item của mock, `READING_LIB` **append thêm 1 item `demo-1`** ("一个人的生活") hấp thụ `demoDoc` cũ: chuyển 13 câu sang shape word-level (tách thành từ `{z,p,h,m}`), 3 câu quiz cũ → thêm `explanation`; item đặt `lv`/`cat`/`min`/`n`/`nw` theo nội dung thật.

Getter mỏng (data-access tách để cắm API sau):

```ts
// src/lib/reading/repository.ts
export function listArticles(): ReadingLibItem[];                  // trả READING_LIB
export function getArticle(id: string): ReadingArticle | undefined; // tra READING_ARTICLES
export function recommendedId(savedIds: string[], progress: Record<string, { pct: number }>): string;
  // bài unread đầu tiên; fallback bài đầu — pure, test được
```

## 3. Logic thuần — `src/lib/reading/library.ts`

Port filter/search của mock (`paintLib`), **pure + rng-free** để test deterministic:

```ts
export type ReadingFilter = { level: ReadingLevel | "all"; cat: ReadingCat | "all" | "saved"; q: string };
export function filterLib(
  lib: ReadingLibItem[],
  f: ReadingFilter,
  savedIds: string[],
): ReadingLibItem[];
  // level khớp lv; cat="saved" → id ∈ savedIds, còn lại khớp cat;
  // q lowercase contains trên title+py+vi+ex (giữ mock)
export function noteFor(item, progress): string;
  // "Chưa đọc · N từ mới" | "Đang đọc dở (X%)" | "Đã đọc 100% · Đạt quiz" — format ở 1 chỗ
export function ctaFor(progress): string;  // "Đọc ngay" | "Đọc tiếp" | "Đọc lại"
```

Karaoke estimate (thay `elapsed=84/total=255` hardcode của mock):

```ts
// src/lib/reading/karaoke.ts
export function estimateDuration(sentences: ReadingWord[][], rate: number): number;
  // tổng số chữ / tốc độ đọc cơ bản (const READING_CPS = 3.2 chữ/giây) / rate — giây, làm tròn
export function sentenceAtRatio(sentences, ratio): number; // click trackbar → index câu
```

Hook `useReaderAudio` (cùng file hoặc `use-reader-audio.ts`): tự quản `SpeechSynthesisUtterance` per câu (như `components/reading/karaoke.tsx` cũ — `useTts` không có `onboundary`), tuần tự câu i → i+1 qua `onend`; expose `{ playing, index, play, pause, seek(i), setRate }`; `rate` cycle 0.75 → 1.0 → 1.25. Không hỗ trợ seek theo giây — trackbar chia N đoạn bằng số câu (mock chia theo giây là giả lập, không giữ).

## 4. Route & container — `(wide)`

- `src/app/(wide)/reading/page.tsx` (server mỏng): metadata `title: "Thư viện bài đọc"` + render `<ReadingLibraryRoot />`.
- `src/app/(wide)/reading/[id]/page.tsx` (server, Next 16 params là `Promise`): `generateStaticParams` từ `READING_LIB`; id không có article → `notFound()`; render `<ReadingReaderRoot article={...} />` — progress/quizDone **root tự đọc từ store sau mount** (localStorage không đọc được ở server render).
- **Xoá** `(app)/reading/` (page + reading-client + tests). Path `/reading` không đổi → home card, ⌘K, sitemap, notification không cần sửa URL, chỉ sửa label ("Thư viện đọc hiểu" → "Thư viện bài đọc" trong `command-index.ts`, `breadcrumb.ts`, `progress-matrix.tsx`).
- Sidebar: thêm `{ label: "Đọc hiểu", href: "/reading" }` vào GROUPS nhóm "KỸ NĂNG & LUYỆN TẬP" (sau Pinyin), icon theo pattern GROUPS hiện có.

## 5. Component decomposition

| File | Loại | Nội dung |
|---|---|---|
| `(wide)/reading/reading-library-root.tsx` | client root | State: `filter {level, cat, q}`, `savedIds` (store). Mount đọc saved từ store; render `ReadingHero` + `ReadingFilters` + grid `ReadingCard` + empty state; phím `/` focus search (`useKeyboard`, đúng khi không ở input) |
| `components/reading/reading-hero.tsx` | presentational | Props: `{ item, pct }`. Kicker "BÀI ĐỌC ĐỀ XUẤT HÔM NAY · {lv}", h1 `vi`, sub hanzi `title · py`, 4 hpill (⏱ min phút / 📖 n chữ / ✨ từ mới / 🔊 TTS), CTA vermilion → `Link /reading/{id}` |
| `components/reading/reading-filters.tsx` | presentational | Props: `{ filter, onChange, count }`. 2 hàng Chip (SegmentedTabs rounded-full): level `all + READING_LEVELS`, cat `all + READING_CATS + saved`; search pill + kbd `/`; count line `aria-live` |
| `components/reading/reading-card.tsx` | presentational | Props: `{ item, pct, saved, quizDone }`. Badge lvl (jade wash) + dur, star `aria-pressed` (amber khi saved) → `onToggleSave`, title zh + py + vi, excerpt, Progress jade `pct`, note, CTA secondary → `Link /reading/{id}`. `data-od-id="read-{id}"` giữ làm hook e2e |
| `(wide)/reading/reading-reader-root.tsx` | client root | State: `scaf ("hanzi"\|"pinyin"\|"hanviet")`, `fontSize` (16–26 step 2, CSS var `--reader-size` scope trên container reader, **không** set documentElement), `popWord` (từ đang mở), quiz state `{ answers, done }`. Mount đọc/ghi `localStorage` `bye.reading.scaf` / `bye.reading.font` (sau mount — hydration-safe). Settle XP + progress khi quiz xong / pause (guard ref, 1 lần) |
| `components/reading/scaffold-bar.tsx` | presentational | SegmentedTabs 3 mode + checkbox "Cuộn theo giọng đọc" (`follow`) — port mock |
| `components/reading/passage-view.tsx` | presentational | Props: `{ article, scaf, fontSize, playingIndex, onWordClick }`. Render `.sent` × N, từ `<span class="w">` + `.wsep`; scaffold `pinyin` → xếp dọc z trên py (grid/inline-block, đúng CSS mock), `hanviet` → hiện `.hv`; `.playing` = **toggle class trên node có sẵn** (sửa bug mock repaint DOM mỗi giây). Click từ → `onWordClick(word, rect)` |
| `components/reading/word-popup.tsx` | presentational | Props: `{ word, anchorRect, onClose, onSpeak, onSave, saved }`. Popup 256px: `hz` + meta (p · h) + mean + row [Nghe, Lưu từ]; đóng khi click ngoài + Escape (`useKeyboard`); nút Lưu từ state đã-lưu |
| `components/reading/reading-quiz.tsx` | presentational | Props: `{ quiz, answers, onAnswer(qi, oi) }`. Port mock: chọn → `.right`/`.wrong` + hiện đáp án đúng + feedback (đúng: "Chính xác!"; sai: "Chưa đúng." + đáp án + `explanation`); cho thử lại từng câu (giữ mock, không lock); header đếm động `quiz.length` |
| `components/reading/audio-bar.tsx` | presentational | Props: `{ playing, index, total, rate, onPlayPause, onSeek(i), onRate, onReplay5 }`. Fixed bottom (tránh sidebar ≥1024px), play tròn jade, timecode ước lượng từ `estimateDuration` (tabular-nums), trackbar slider N đoạn + knob, `↺ 5s` (lùi 1 câu nếu đang phát — thay "5 giây" giả lập của mock bằng đơn vị câu), tốc độ cycle |
| `components/ui/` | tái sử dụng | `Chip`/`SegmentedTabs`, `Progress` (tone jade), `Button`, `IconButton`, `useToastSafe`, `useKeyboard` — không tạo mới |

**A-/A+**: giữ mock — `fontSize` clamp [16,26] bước 2, toast "Cỡ chữ: Xpx", nút ở reader topbar khu vực của app (header row trong root, không đụng shell topbar).

## 6. Mapping tokens & primitives

| Mock | App |
|---|---|
| `--jade #2D7D5B` | primitive `--hz-jade #2d7d5b` — **trùng khớp**, dùng token semantic (`learning-*`, `jade-wash`, `jade-ink`, `jade-line` như quiz-view pinyin đã làm) |
| `.sent.playing` hardcode `#ECFDF5`/`#2D7D5B` | `jade-wash` / `learning-progress` |
| `.opt.wrong` hardcode `#fff7f6` + vermilion | `rose-wash` / `rose-line` / `rose-ink` |
| `#countLine` hardcode gray | `text-muted` / `surface-muted` |
| `--amber` star/saved | `amber-ink` / `amber-line` / `amber-wash` |
| `--vermilion` CTA | `action-primary` (vermilion) |
| `--font-ui: SFMono` | font UI chuẩn DS (mock dùng SFMono — **không port**); chữ Hán luôn class `zh`/`hanzi` (Noto Sans SC) |
| emoji icon (🔍 ⭐ ▶ …) | lucide (`Search`, `Star`, `Play`, `Pause`, `Volume2`, `Plus`, `RotateCcw`, `ArrowLeft`, `Timer`, `BookOpen`, `Sparkles`) |
| `.bnav` location.href | shell `BottomNav` có sẵn |
| toast/sr | `useToastSafe` |
| `data-od-id` | giữ nguyên làm hook e2e (`reading-hero`, `reading-filters`, `reading-grid`, `read-{id}`, `scaffold-bar`, `reading-canvas`, `reading-quiz`, `karaoke-bar`) |

**A11y giữ mock**: `aria-pressed` (chip/seg/star), count line + toast aria-live, focus-visible, slider trackbar có `role="slider"` + aria valuemin/max/now.

## 7. Persist — `progressStore`

Thêm vào `src/lib/store/progress-store.ts` (pattern `getPinyinLabBest` + `dispatchProgress()`):

```ts
getReadingProgress(id: string): { pct: number; quizDone: boolean } | null
  // đọc "bye.reading.<id>" — { pct, quizDone }
recordReadingProgress(id: string, pct: number): void
  // pct = max(cũ, mới); pct ≥ 100 → readState done; dispatchProgress()
recordReadingQuizDone(id: string): boolean
  // trả true nếu lần đầu (guard trong store) — root dùng return này để addXp một lần
getReadingSavedIds(): string[]
toggleReadingSaved(id: string): void    // dispatchProgress()
```

Flow trong reader root:

- **Progress đọc**: mỗi lần `index` câu tăng (max câu đã chạm) → pct = `round(index / total * 100)`; ghi khi pause/unmount/quiz-done (`recordReadingProgress`).
- **XP**: quiz xong tất cả câu đúng → `recordReadingQuizDone(id)` trả true → `addXp(3)` + toast "+3 XP · Hoàn thành quiz". Đọc lại không cộng lại.
- **Lưu từ**: popup "Lưu từ" → `addToVocabBook({ hanzi, pinyin, vi })` có sẵn (thay toast demo); đã có trong book → hiển thị "Đã lưu".

## 8. Thay thế & những gì giữ nguyên

- **Xoá:** `(app)/reading/` (page, `reading-client.tsx`, `__tests__/reading-client.test.tsx`), `src/components/reading/karaoke.tsx` + test (tokenizer câu/ký tự cũ — kiểm tra import còn lại trước khi xoá; nếu nơi khác dùng `splitSentences` thì giữ file, chỉ bỏ khỏi reading).
- **Viết lại:** `src/content/reading.ts` (demoDoc được hấp thụ; `sampleText` xoá — chỉ reading dùng).
- **Giữ:** `vocabBook`, `useTts` (popup nghe 1 từ), `SearchCard` không đụng (thuộc hanzi), e2e hydration ROUTES (URL `/reading` không đổi).
- **Sửa label:** `command-index.ts`, `breadcrumb.ts`, `progress-matrix.tsx` → "Thư viện bài đọc"; `notification-bell.tsx` giữ href.
- **Sửa e2e:** `personal-tools.spec.ts` — text "Bài đọc" cũ → heading mới "Thư viện bài đọc"; thêm flow library → reader → quiz.

## 9. Testing

- **Unit** `content/reading.ts`: LIB 6 item khớp shape (id duy nhất, lv/cat hợp lệ); mọi id trong LIB đều có article; mọi câu đủ `{z,p,h,m}` không rỗng; quiz `answer` trong range options, đủ `explanation`; `n` của item ≈ tổng chữ trong sentences (±20%).
- **Unit** `lib/reading/library.ts`: filter level/cat/saved/q; q khớp title+py+vi+ex không dấu hoa tử; noteFor/ctaFor 3 trạng thái; recommendedId unread đầu tiên + fallback.
- **Unit** `lib/reading/karaoke.ts`: estimateDuration theo rate; sentenceAtRatio biên 0/1.
- **Unit** `progress-store`: recordReadingProgress giữ max, quizDone trả true đúng 1 lần, toggleReadingSaved.
- **Unit** components (RTL): filters render + onChange; card star toggle + Progress pct + note; scaffold đổi class pinyin/hanviet; passage click từ → popup; popup Nghe/Lưu từ/Escape; quiz right/wrong + explanation; audio-bar seek.
- **Unit** roots: library filter state + `/` focus; reader scaffold/font persist qua localStorage (sau mount), quiz-done settle XP 1 lần.
- **E2E**: hydration `/reading`; personal-tools cập nhật + flow đọc.
- Chạy kèm suite hiện có (vitest) + `pnpm typecheck` + `pnpm lint`.

## 10. Điều kiện tiên quyết

Không có — `(wide)` đã tồn tại, mọi token/primitives (`Chip`, `SegmentedTabs`, `Progress`, `Button`, `IconButton`), `useToastSafe`, `useKeyboard`, `useTts`, `vocabBook`, `notFound()` đều có sẵn trên nhánh hiện tại. Không cần backend.
