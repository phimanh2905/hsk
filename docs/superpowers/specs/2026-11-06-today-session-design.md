# Spec: Buổi học hôm nay (Today Session) — Wave 1

Ngày: 2026-11-06
Nguồn: brainstorm gap-analysis xiehanzi (docs/xiehanzi-feature-map.md) + chủ phiên.
Trạng thái: design duyệt chốt 2026-11-06.

## 1. Mục tiêu

Một điểm vào duy nhất mỗi ngày trả lời câu hỏi "hôm nay tôi học gì": **ôn thẻ đến hạn trước → 1 phần mới (1 bài học) → xong là đủ**. Hard gate 1 phần mới/ngày (anti-burnout, đúng triết lý xiehanzi). Kết nối 4 mode rời (lesson/review/shadowing/reading) thành xương sống flow guest → thành thạo.

Phạm vi Wave 1: card trên Home + lib derive thuần client. Không in-page player (để Wave 3 nâng cấp), không server plan.

## 2. Quyết định đã chốt (brainstorm)

| Câu hỏi | Quyết định |
|---|---|
| Gate phần mới | **Hard gate**: xong 1 phần là hôm nay "đủ", hiện Done state, vẫn cho ôn tuỳ ý |
| Đơn vị "1 phần mới" | **1 bài học** (lesson page hiện có, ~10–15') |
| Điểm vào | **Card trên Home** — HomeHero render TodayCard (tận dụng cơ chế swap có sẵn) |
| Thứ tự ôn/mới | **Gợi ý thứ tự, không khoá** — user vẫn bấm thẳng Học được |

## 3. Data model & state

- Key mới trong `progress-store`: `nhai.today` (legacy prefix `bye.today`):
  ```ts
  { date: string; // 'YYYY-MM-DD' theo giờ local thiết bị
    partId: string }  // id bài học đã xong hôm nay
  ```
  Đây là duy nhất thứ cần persist. Due-count, bài kế tiếp, stage — **derive lúc render**, không lưu.
- Xong bài vẫn dùng `markPageDone` hiện có; đồng thời set `nhai.today` (chỉ khi chưa set cho ngày đó — first-write-wins, học thêm không ghi đè).

## 4. Logic derive — `src/lib/today-session.ts` (mới, pure)

```ts
computeTodaySession({ progress, roadmap, review, now })
  → { todayKey, dueCount, nextPart | null, partDoneToday, stage }
```

- `todayKey`: `YYYY-MM-DD` local (cùng quy ước studyDay hiện tại).
- `partDoneToday`: `nhai.today.date === todayKey`.
- `nextPart` theo stage:
  1. Đang trước gate HSK-1 (chưa exempt & trạm 1 chưa pass entry gate) → buổi pinyin kế tiếp theo `sessionStatus` (`src/lib/roadmap-status.ts`, 8 buổi).
  2. Trạm active (theo `src/lib/roadmap-progress.ts`) → bài chưa-done đầu tiên của trạm; trạm đủ 5 bài mà milestone chưa pass ≥80% → part = milestone (hint mở StationQuiz).
  3. Trạm pass hết → trạm kế trong `roadmap-stations.ts`.
  4. Hết hsk5, hsk6/hsk7-9 chưa mở → `nextPart = null` → card state "hết lộ trình khả dụng".
- `dueCount`: số thẻ SM-2 đến hạn (bucket due từ `src/lib/srs-session.ts`).

## 5. UI — `src/components/home/today-card.tsx` (mới), token Hanzi

HomeHero: sau onboarding, swap HeroAction → TodayCard (mở rộng điều kiện swap hiện có ở `home-hero.tsx:22`).

- **Idle** (chưa xong hôm nay):
  - Tiêu đề "Buổi học hôm nay".
  - Bước 1 `Ôn n thẻ đến hạn` → `/review?return=today` (ẩn khi n=0).
  - Bước 2 `Bài kế tiếp: {tên bài} · ~12 phút` → `/lesson/{book}/{page}`.
  - Nút phụ "Bỏ qua phần này": đổi nextPart sang bài kế tiếp (không đánh dấu xong gì, không ghi `nhai.today`).
- **Done** (`partDoneToday`): "Đã xong 1 phần — hẹn ngày mai" + hàng tuỳ chọn (Ôn thêm / Shadowing / Đọc) — không cộng thêm XP/buổi, không thổi phồng streak.
- **Hết lộ trình** (`nextPart = null`): banner + CTA các mode khác.
- Home re-render qua subscription progress-store đã có (quay về từ /lesson thấy Done).

## 6. Sync

- Domain mới `todaySession` (payload vài chục bytes): last-write-wins theo `date`, không tombstone. Nếu 2 device ghi `partId` khác nhau cùng ngày → giữ bản completed (cả hai đều completed, chọn bất kỳ). Đăng ký ở `sync-merge.ts` + server sync như các domain hiện có.

## 7. Streak

- "Một ngày có học" = xong phần mới (giữ logic studyDay hiện có). Ôn tuỳ ý không tạo buổi mới nhưng vẫn ghi reviewLogs như cũ.

## 8. Testing

- Unit `today-session.ts`: timezone boundary (23:59/00:01), stage pinyin, milestone giữa trạm, skip → bài kế, gate Done, hết lộ trình.
- Component TodayCard: 4 state (Idle/Done/hết lộ trình/n=0).
- e2e: guest → onboarding → card Idle → học bài xong → về Home thấy Done.

## 9. Files

Mới: `src/lib/today-session.ts`, `src/components/home/today-card.tsx`, tests.
Sửa: `home-hero.tsx`, `progress-store.ts`, `sync-merge.ts` + đăng ký domain server sync.

## 10. Out of scope (YAGNI)

Server-side plan (Approach B), in-page session player (Approach C — Wave 3 sẽ nâng cấp tự nhiên), ước tính phút thật (dùng const ~12'), streak freeze (spec riêng), sổ lỗi loop (Wave 2), buổi học nhúng re-quiz sổ lỗi (follow-up sau Wave 2).
