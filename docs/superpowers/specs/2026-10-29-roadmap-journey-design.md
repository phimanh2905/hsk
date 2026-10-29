# Roadmap Journey v2 — Trạm nhóm-bài + micro-session + cổng đầu vào

- Ngày: 2026-10-29
- Cơ sở: RE đối thủ nhaihsk.com/roadmap (bằng chứng: `/tmp/nhai-roadmap-re/`, 7 trang HTML
  roadmap/pinyin/pinyin-1/hsk1/hsk1-1/hsk2/hsk3) + thiết kế Hướng B đã merge (spec
  2026-10-28-roadmap-flow-design.md, branch đã merge qua PR #21).
- Quyết định owner (2026-10-29): hướng A lan tỏa dữ liệu; HSK 6/7-9 upcoming trung thực;
  trạm = nhóm 5 bài; skeleton micro-session đặt trong drawer (v2).

## 1. User stories

- **US1 — Người chưa biết gì**: khi vào `/roadmap` với 0 progress, tôi thấy mốc
  "🚩 Bắt đầu ở đây" neo ở chặng Pinyin và nút "Bắt đầu học" — tôi biết bước đầu tiên
  là học Pinyin, không cần trả lời câu hỏi onboarding.
- **US2 — Người đã biết chút**: tôi nhảy thẳng chặng bất kỳ từ level switcher
  (như hiện tại), không bị khóa tuyến tính.
- **US3 — Cổng vào HSK 1**: khi mở drawer trạm HSK 1 lần đầu mà chưa hoàn thành
  chặng Pinyin, tôi thấy card "Kiểm tra đầu vào Pinyin" — quiz **nghe** chọn âm đúng,
  12 câu, đạt ≥80% mới vào được quiz trạm. Nếu đã hoàn thành 8/8 buổi Pinyin, tôi
  **được miễn** (card hiển thị trạng thái "Đã miễn").
- **US4 — Micro-session trong drawer**: mở drawer trạm, tôi thấy 3 bước có ước lượng
  phút: **Ôn nhanh** (4 câu retrieval từ trạm trước, không tính điểm) → **Học** (danh
  sách bài trong nhóm, mỗi bài link `/lesson/{book}/{page}`, bài đã xong có tick) →
  **Bài kiểm tra trạm** (≥80%).
- **US5 — Câu hỏi "đề thật"**: quiz trạm trộn 3 loại: nghĩa↔từ vựng, ngữ pháp, và
  **câu nghe** (TTS đọc pinyin/từ, chọn đúng đáp án). Nếu TTS chưa tải được, câu nghe
  được thay bằng câu đọc (fallback, không mất câu hỏi).
- **US6 — Milestone đề mix**: quiz trạm Milestone lấy mẫu ~12 câu toàn chặng (vocab
  + gram + nghe), mô phỏng "đề mix" của đối thủ.
- **US7 — % toàn lộ trình thật**: pill % trên topbar = trung bình có trọng số theo
  số đơn vị tiến độ của từng chặng (pinyin 8 buổi; mỗi level = số trạm lesson của
  level đó), không hard-code.
- **US8 — Đích đến trung thực**: HSK 6 và HSK 7–9 hiển thị banner "Sắp ra mắt · nội
  dung đang sản xuất" kèm khối "Đích đến: HSK 7–9" mô tả north-star.

## 2. Kiến trúc & file

| File | Thay đổi |
|---|---|
| `src/content/roadmap-stations.ts` | Bổ sung generator `buildLevelStations(levelId, lessons)`: gộp 5 bài/trạm + Milestone cuối; `roadmapLevels` cho hsk-1/3/4/5 dùng generator, hsk-2 migrate sang generator (giữ override meta nếu trạm curated cũ trùng nhóm đầu); giữ zod `stationSchema` (thêm `steps`?). |
| `src/content/roadmap-generated.ts` (mới, build-time) | Script `scripts/seed/gen-roadmap-stations.mts` đọc `src/content/vocab.ts` → xuất per-lesson `{book, page, title, wordCount}` (KHÔNG nhúng vocab). Client import module nhẹ này để render trạm. |
| `src/lib/station-quiz.ts` | `buildStationQuestions(station, vocab, opts?)` nhận vocab động; thêm question kind `listen` (audioText = pinyin của từ, options 4 pinyin); `sampleWarmup(prevStation, vocab)` 4 câu; `sampleMilestoneQuestions(level, vocabByLesson, rng?)` ~12 câu. Giữ `submitStationResult` best-of. |
| `src/app/api/v1/content/vocab-lesson/route.ts` (mới) | `GET ?book=&page=` → 1 lesson qua `getVocabLesson` (D1), cache CDN 1h. Quiz drawer fetch theo bài chưa xong trong nhóm. |
| `src/components/roadmap/station-drawer.tsx` | Micro-session 3 bước (tab): Ôn nhanh → Học → Bài kiểm tra; ước lượng phút (học ≈ 10 phút/bài, quiz ≈ 5 phút); quiz load vocab qua API; câu nghe dùng `useTts` (`src/lib/tts/use-tts.ts`), fallback câu đọc khi engine chưa sẵn sàng. |
| `src/components/roadmap/entry-gate.tsx` (mới) | Card cổng "Kiểm tra đầu vào Pinyin": 12 câu nghe chọn âm (nguồn âm tiết từ `src/content/pinyin.ts`), ≥80% pass, ghi `progressStore.setRoadmapGate("hsk1", pct)`. |
| `src/lib/store/progress-store.ts` | Thêm key `nhai.roadmap.gates.v1` (legacy `bye.roadmap.gates.v1`) `{[gateId]: {pct, at}}` + `getRoadmapGate/setRoadmapGate`. Không đổi key cũ. |
| `src/lib/roadmap-progress.ts` | `overallRoadmapPct` tổng quát: trọng số = đơn vị tiến độ mỗi chặng (pinyin = số buổi; level = số trạm lesson), đọc station record + pageDone; `deriveStationStates` giữ nguyên; thêm `isGateOpen(level, store, pinyinDone)` (miễn khi pinyin 8/8 hoặc gate pass). |
| `roadmap-client.tsx` | Mốc "🚩 Bắt đầu ở đây" trên banner chặng Pinyin khi toàn lộ trình = 0 progress; banner chặng HSK1 hiển thị trạng thái cổng đầu vào (Chưa kiểm tra / Đã miễn / Đã qua); khối "Đích đến: HSK 7–9" cho hsk7-9 upcoming. |
| `scripts/qa/roadmap-flow-qa.mjs` | Mở rộng thành QA journey v2 (~20 case) — gate, miễn, warm-up, fallback nghe, % trọng số. |

## 3. Luật nghiệp vụ

1. **Cổng đầu vào HSK 1** (US3): khóa **quiz trạm** (không khóa nút "Học" — học bài
   luôn mở tự do, đúng tinh thần "không cần học lại từ đầu"). Miễn khi
   `pinyinDone.length === 8`. Lưu best-of vào `gates.v1.hsk1`. HSK 2+ không có cổng
   (mở tự do).
2. **Ôn nhanh** không tính điểm trạm, feedback ngay từng câu, bỏ qua được.
3. **Quiz trạm**: 8 câu trạm thường (mix ~5 vocab + 2 gram + 1 nghe; nếu vocab nhóm
   < 8 thì lấy bớt), 12 câu milestone; pass ≥ `PASS_PCT=80`; best-of; sao 100/90/80.
4. **Fallback nghe** (US5): nếu `useTts` chưa ready khi render câu nghe → hiển thị
   câu đọc tương đương (không chờ, không treo).
5. **Pct trạm** = max(quiz pct, % bài học nhóm đã xong qua markPageDone) — giữ quy
   tắc v1 (Hướng B) để học bài thật vẫn được tính.
6. **overallRoadmapPct**: `Σ done-weighted / Σ total` trên các chặng available
   (pinyin + hsk1..5); upcoming không tính.

## 4. Non-goals (iteration này)

Content HSK 6/7-9; "Từ vựng mở rộng" ngoài giáo trình; tách 1 bài thành nhiều buổi
như đối thủ; chương trình tuần (phương án C); XP/streak vào roadmap; đề thi thật
certificate-test ngoài HSK1 (milestone chỉ mô phỏng đề mix từ generator có sẵn).

## 5. Automation tests (map user story)

**Unit (vitest, jsdom):**
- `roadmap-stations.test.ts`: generator gộp 5 bài/trạm + Milestone; edge 27 bài →
  6 trạm (5+5+5+5+5+2); hsk-2 migrate không mất lesson nào; meta override.
- `station-quiz.test.ts`: build questions với vocab động (mix loại, đủ số câu khi
  vocab ít); câu nghe `listen` có audioText + 4 options; warm-up 4 câu từ trạm
  trước; milestone 12 câu toàn chặng; submit best-of (US5, US6).
- `roadmap-progress.test.ts`: gate logic (chưa pass / pass / miễn khi pinyin 8/8);
  `overallRoadmapPct` trọng số (US3, US7).
- `progress-store.test.ts`: gates.v1 set/get/best-of.

**Component (vitest + RTL):**
- `station-drawer.test.tsx`: 3 bước tab + phút ước lượng; câu nghe render nút 🔊
  và fallback câu đọc khi TTS unavailable; khóa quiz khi gate chưa mở (US4, US5).
- `entry-gate.test.tsx`: pass ≥80% → gọi setRoadmapGate; <80% → hiển thị làm lại;
  miễn khi pinyin done (US3).
- `roadmap-client.test.tsx`: mốc "Bắt đầu ở đây" khi 0 progress; banner HSK1 trạng
  thái cổng; Đích đến block (US1, US8).

**Browser QA (control-browser / Playwright script, dev :3101):** ~20 case mở rộng
từ 15 case cũ + gate flow (thất bại → pass), miễn gate, warm-up step, fallback nghe,
% topbar thay đổi sau khi học bài thật, mốc "Bắt đầu ở đây". Yêu cầu **100% PASS**.

## 6. Rủi ro & giảm thiểu

- Kokoro WebGPU tải nặng (~326MB lần đầu): câu nghe dùng TTS chỉ khi engine sẵn
  có; luôn có fallback câu đọc — không block QA.
- Bundle: `roadmap-generated.ts` chỉ chứa title + wordCount (~20KB), vocab thật
  qua API theo bài.
- D1: route mới `vocab-lesson` chỉ đọc; không migration.
