# Roadmap Flow — Hoàn thiện Hướng B (spec)

Ngày: 2026-10-28 · Branch: `roadmap-flow` · Nguồn: RE /roadmap nhaihsk.com 2026-10-28 + gap analysis (session 2026-10-28).

## 1. Bối cảnh & mục tiêu

Roadmap `/roadmap` hiện là **dead-end**: CTA "Vào bài học" chỉ toast, drawer launch buttons toast, `setStationProgress` không có writer (trạm mãi 0%/locked), Trạm 6 không bao giờ mở, không "Tiếp tục học", không % toàn lộ trình, không tích hợp SRS review. Đối thủ có đủ các thứ trên.

Mục tiêu Hướng B: **đi thông đường + progress thật + resume + review card**, giữ nguyên design serpentine và không đụng D1 schema/API. Placement test, mở rộng HSK 1/3, XP/streak là non-goal.

## 2. Quyết định thiết kế (đã chốt với owner)

- **Progress trạm derive từ bài kiểm tra riêng của trạm** (≥80% pass), không derive từ `markPageDone` của lesson pages. Lý do: khớp pattern /roadmap/pinyin (session test), con số trung thực, station có data vocab/gram riêng để ra đề.
- Dữ liệu trạm vẫn static (`src/content/roadmap-stations.ts`); sync D1 miễn phí qua hybrid-store (station progress đã được patch sẵn trong `hybrid-store.ts`).

## 3. Data model thay đổi

### 3.1 `src/content/roadmap-stations.ts`

`stationSchema` thêm field optional:

```ts
lesson: z.object({ book: z.string(), page: z.string() }).optional()
```

Mapping curated (pageId dạng `lesson-N` của D1 `content_vocabs`, khớp `hsk2Titles`):

| Station | lesson |
|---|---|
| Trạm 1 Chào hỏi & Làm quen | `{book:"hsk2", page:"lesson-1"}` (Chào hỏi & xưng hô) |
| Trạm 2 Số đếm & Mua sắm | `{book:"hsk2", page:"lesson-11"}` (Công việc & mua sắm) |
| Trạm 3 Thời gian & Lịch trình | `{book:"hsk2", page:"lesson-6"}` (Thời gian) |
| Trạm 4 Sở thích & Thời gian rảnh | `{book:"hsk2", page:"lesson-25"}` (Giải trí & thể thao) |
| Trạm 5 Đi lại & Chỉ đường | `{book:"hsk2", page:"lesson-15"}` (Giao thông & đi lại) |
| Milestone | *(không có — chỉ quiz)* |
| Trạm 6 Thời tiết & Bốn mùa | `{book:"hsk2", page:"lesson-21"}` (Thời tiết & màu sắc) |

Sửa 3 meta text sai sự thật:
- Trạm 5: `"Khóa · mở sau khi xong Bài 4"` → `"问路 · Hỏi đường & phương tiện"` (mô tả trung tính, trạng thái khóa do derive vẽ).
- Milestone: `"Khóa · mở sau Trạm 5 · …"` → `"Đánh giá năng lực HSK 2 · Mini test tổng hợp"`.
- Trạm 6: `"Khóa · mở sau Milestone"` → `"天气 · Từ vựng thời tiết & so sánh 比"`.

## 4. Logic derive mới (`src/lib/roadmap-progress.ts`)

Thay `deriveStationStates` bằng **tuần tự thuần theo thứ tự content** (mang tính chất "trạm sau mở khi trạm trước xong", đúng spec §5 cũ nhưng sửa bug Trạm 6):

- `PASS_PCT = 80` (export const, dùng chung quiz + derive).
- Duyệt station theo index: `done = rec != null && rec.pct >= PASS_PCT`.
- Station **đầu tiên chưa done** = `active` (mang rec.pct/stars nếu có); mọi station **sau nó** = `locked` (pct 0). Station trước station active = done.
- Milestone không còn case đặc biệt: chỉ là 1 station trong chuỗi (đáp ứng "milestone chỉ mở khi mọi lesson trước xong" tự động).
- `bannerSummary` giữ nguyên contract; `remainingToMilestone` giữ logic cũ (đếm lesson chưa done trước milestone).

Tests phải cập nhật: done ngưỡng 80 (không phải 100), Trạm 6 active sau khi 1–5 + Milestone done, xóa test "milestone active khi chưa đủ" nếu mâu thuẫn (vẫn giữ ý nghĩa qua chuỗi tuần tự).

## 5. Station Quiz — writer progress thật (M2)

### 5.1 `src/lib/station-quiz.ts` (mới, pure)

- `buildStationQuestions(station, opts?)` → `Question[]`:
  - Mỗi vocab `[zh, py, vn]` → 1 câu; mỗi gram `[name, desc]` → 1 câu. Tổng = `vocab.length + gram.length` (Trạm 1: 7 câu; Milestone: dùng sampler).
  - Dạng câu xoay vòng: (a) nghĩa Việt → chọn từ Hán (4 options từ vocab khác), (b) từ Hán → chọn nghĩa, (c) mẫu ngữ pháp → chọn ý nghĩa / ý nghĩa → chọn mẫu.
  - Options nhiễu lấy từ chính station (fallback: các vocab cùng level nếu station < 4 items).
  - Shuffle bằng injectable RNG (default `Math.random`) để unit test deterministic.
- `sampleMilestoneQuestions(level, rng)` → 10 câu: sample đều từ vocab của các lesson trong level + gram, mỗi câu 4 options.
- `submitStationResult(levelId, stationId, correct, total, store = progressStore)`:
  - `pct = Math.round(correct/total*100)`; best-of (chỉ ghi khi cao hơn record cũ).
  - `pct >= 80` → ghi `{pct, stars: pct===100 ? 3 : pct>=90 ? 2 : 1}`; dưới 80 → ghi `{pct, stars: 0}` (thanh progress fill, chưa done).
  - Gọi `store.setStationProgress` (dispatch `bye:progress` → roadmap re-render + hybrid sync).
  - Trả `{pct, passed, stars}` cho UI.

### 5.2 UI — `StationDrawer`

- Launch button **"Thi trắc nghiệm Quiz"** → chuyển drawer sang view quiz: thay SegmentedTabs/body bằng `StationQuiz` component (mới, `src/components/roadmap/station-quiz.tsx`): MCQ từng câu, chọn → "Câu tiếp" → màn kết quả `{c}/{t} · {pct}%` + pass/fail + nút "Làm lại" / "Đóng". Pass → toast "🎉 Hoàn thành {station.no}". Milestone dùng `sampleMilestoneQuestions`.
- **"Học Flashcard"** → nếu `station.lesson` tồn tại: `Link` tới `/lesson/{book}/{page}`; không có → disabled + tooltip "Mini test tổng hợp".
- **"Luyện viết Hanzi"** → `Link` tới `/hanzi` (Hanzi Studio).
- Drawer body quiz chỉ bật khi `view.state !== "locked"` (locked giữ nguyên preview tabs).

### 5.3 Điều hướng (M1)

- `roadmap-client.tsx` `onContinue(id)` → `router.push(lessonUrl)`; fallback `/course/hsk2` nếu station không có lesson.
- Toast cũ "Vào Trạm N — chúc học tốt!" bỏ (navigate là feedback đủ).

## 6. Hero resume + % toàn lộ trình + Review card (M3)

### 6.1 RoadmapTopbar

- Pill tiến độ đầu topbar hiện **% toàn lộ trình** (thay % level): trung bình các level `available` — hsk-1 = pinyinPct (8 buổi), hsk-2 = summary.pct; level `upcoming` loại trừ. Label giữ dạng số %, `title` attr "Tiến độ toàn lộ trình".

### 6.2 Banner "Tiếp tục học"

- `MilestoneBanner` nhánh hsk-2: `endLabel` (bên phải banner) trở thành khối 2 dòng — dòng chính `Link "Tiếp tục học →"` (className `font-bold text-action-primary`) trỏ tới lesson của `activeView` (`/lesson/{book}/{page}`; fallback `/course/hsk2`), dòng phụ nhỏ "Còn N bài tới mốc" (text `remainingToMilestone` cũ, giữ nguyên khi milestone active). hsk-1 giữ link "Xem lộ trình Pinyin →" hiện có (chính là resume của hsk-1); level upcoming giữ "Theo dõi cập nhật".

### 6.3 Review card (`src/components/roadmap/review-card.tsx`, mới)

- Card dưới serpentine (mọi level, cả upcoming): kicker "TỔNG ÔN", tiêu đề "Ôn tập ngắt quãng (SRS)", mô tả "Thêm thẻ bằng nút ⭐ trong bài học, đến hạn là vào ôn.", badge `{n} thẻ đến hạn` + CTA "Vào ôn tập →" → `/review`.
- `n` = `progressStore.getAllSrs().filter(it => it.status !== "new" && it.dueAt != null && it.dueAt <= Date.now()).length`, mount-gated, re-sync qua `bye:progress`.
- Design theo Hanzi DESIGN.md (token, không hard-code màu).

## 7. Kiến trúc & file touch

| File | Thay đổi |
|---|---|
| `src/content/roadmap-stations.ts` | schema + `lesson` mapping + 3 meta text |
| `src/lib/roadmap-progress.ts` | `PASS_PCT`, derive tuần tự mới |
| `src/lib/station-quiz.ts` | **mới** — build questions, sampler, submit result |
| `src/components/roadmap/station-quiz.tsx` | **mới** — UI quiz trong drawer |
| `src/components/roadmap/review-card.tsx` | **mới** — card Tổng ôn |
| `src/components/roadmap/station-drawer.tsx` | launch buttons → link/quiz; quiz view |
| `src/components/roadmap/roadmap-topbar.tsx` | pill % toàn lộ trình |
| `src/app/(app)/roadmap/roadmap-client.tsx` | onContinue navigate, mount review card, truyền pinyinPct/overall |
| Tests | cập nhật + mới (mục 8) |

Không đổi: `progress-store.ts` (API đủ dùng), `hybrid-store.ts`, D1, serpentine-path/station-card (chỉ nhận views mới), /roadmap/pinyin.

## 8. Automation testcases (vitest, jsdom)

1. `roadmap-progress.test.ts` — derive: chuỗi tuần tự; Trạm 6 active sau Milestone+1–5 done; milestone done ở pct≥80 (không cần 100); active = first not-done; mọi station sau active locked; bannerSummary giữ contract.
2. `station-quiz.test.ts` — build questions: đủ vocab+gram, 4 options, đáp án đúng nằm trong options; sampler milestone 10 câu; submit: best-of không ghi đè thấp hơn; stars tier 80/90/100; dưới 80 stars 0; gọi setStationProgress đúng tham số.
3. `station-drawer.test.tsx` — "Học Flashcard" render Link đúng href khi có lesson; "Thi trắc nghiệm Quiz" mở quiz view khi active, disabled/toast khi locked; sau pass hiện toast.
4. `review-card.test.tsx` — badge đếm due đúng (mock getAllSrs), link `/review`, ẩn badge khi n=0.
5. `roadmap-topbar.test.tsx` — pill hiển thị overall % (mock store) + title attr.
6. `roadmap-client.test.tsx` — onContinue push đúng `/lesson/hsk2/lesson-1`; fallback `/course/hsk2`; "Tiếp tục học" link đúng target.

## 9. Browser QA checklist (control-browser, :3100)

1. `/roadmap` load, HSK 2 mặc định, 6 trạm + banner.
2. Trạm 1 active "ĐANG HỌC"; bấm "Vào bài học" → điều hướng `/lesson/hsk2/lesson-1`.
3. Back về /roadmap → trạng thái giữ.
4. Bấm Trạm 2 (locked) → drawer mở, chip ĐANG KHÓA, quiz button không mở bài thi.
5. Drawer Trạm 1: tabs vocab/gram hoạt động; audio TTS chạy.
6. "Học Flashcard" → `/lesson/hsk2/lesson-1`; "Luyện viết Hanzi" → `/hanzi`.
7. "Thi trắc nghiệm Quiz" → quiz 7 câu; làm sai <80% → kết quả fail, thanh % tăng sau lần làm tốt hơn.
8. Làm đạt ≥80% → toast 🎉, card Trạm 1 chuyển done + sao; Trạm 2 thành active.
9. Hoàn thành lần lượt 1–5 + Milestone (quiz 10 câu) → Trạm 6 thành active (bug cũ đã hết).
10. Banner cập nhật "X/Y bài hoàn thành"; topbar pill = % toàn lộ trình thay đổi sau khi xong trạm.
11. "Tiếp tục học →" trong banner trỏ đúng lesson của trạm active.
12. Review card: badge "{n} thẻ đến hạn" đúng theo SRS localStorage; click → `/review`.
13. Level switcher HSK 1/3/4–6 hoạt động; HSK 1 banner pinyin + link Pinyin.
14. Mobile 390px: layout serpentine 1 cột, drawer full-width, không tràn ngang.
15. Reload trang → progress trạm persists (localStorage) + sync dirty flag khi login (kiểm tra manual nếu có session).

## 10. Rủi ro & lưu ý

- `station.vocab` chỉ 3–5 từ ở Trạm 5/6 → câu hỏi ít; sampler milestone cần fallback khi level vocab mỏng.
- Đổi ngưỡng done 100→80 là breaking với test cũ — phải cập nhật toàn bộ test derive liên quan trong cùng commit.
- `router.replace` cho level switch giữ nguyên (non-goal lịch sử back).
- QA cần `hsk-dev` DB đã seed hsk2 (đã seed — /course/hsk2 sống).
