# Spec: Sổ lỗi 2-2-2 — Wave 2

Ngày: 2026-11-06
Nguồn: gap-analysis xiehanzi; notebook capture đã có (`src/lib/notebook/capture.ts`).
Phụ thuộc: không bắt buộc Wave 1, nhưng "Luyện lại" nên được Buổi học hôm nay trỏ tới sau khi cả hai ship.

## 1. Mục tiêu

Nâng Notebook "Câu làm sai" từ **ghi nhận đứng yên** thành vòng lặp **repeat-until-mastered** đúng luật xiehanzi:

> Lỗi chỉ ra khỏi sổ khi bạn làm đúng **2 lần**, ở **2 dạng khác nhau**, vào **2 ngày khác nhau**.

## 2. Hiện trạng

- `captureWrong` đã auto-capture lỗi từ lesson quiz, station quiz, review session (dedupe 24h, tag 🛑 "Lỗi sai khi luyện tập"), lưu notebook_entries (D1 khi login) + local.
- Notebook dashboard có filter "Câu sai chưa sửa" — nhưng chỉ là danh sách + ghim ★. Không có trạng thái mastered, không re-quiz. Re-learn hiện chỉ xảy ra qua SM-2 relearning khi bấm Again.

## 3. Data model

Mở rộng payload của notebook entry loại lỗi (JSON column hiện có, không migration):

```ts
mistake?: {
  capturedAt: string;          // lần cuối sai
  log: Array<{
    date: string;              // 'YYYY-MM-DD' local
    dimension: 'meaning' | 'listening' | 'typing' | 'pinyin'; // dạng câu đã trả lời ĐÚNG
  }>;
  removedManually?: boolean;   // "Bỏ khỏi sổ" tay
}
```

- Sync: notebook domain đã sync — payload to thêm, không domain mới, không tombstone (mastered vẫn giữ entry làm lịch sử).

## 4. Luật mastered (pure lib `src/lib/mistake-book.ts`)

`isMastered(log)`: tồn tại tổ hợp ≥2 câu trả lời đúng thỏa:
- ≥2 `dimension` khác nhau, và
- ≥2 `date` khác nhau.

(Không yêu cầu mỗi dimension một ngày — chỉ cần tổng thể 2-2-2.) Đáp án sai không đếm, chỉ log capture gốc. `removedManually` bỏ khỏi danh sách active nhưng giữ trong lịch sử.

## 5. Phiên "Luyện lại" (`/notebook/luyen-lai`)

- Nguồn đề: các entry lỗi **chưa mastered**.
- Chọn dimension cho từng item: ưu tiên dimension **chưa có trong log đúng** (mỗi câu đúng mới giúp tiến 2-2-2); rơi vào dimension nào không có nội dung (vd không có audio) → chọn dimension khả dụng khác, user vẫn được tính.
- UI tái dùng component quiz/flashcard/typing của review session (cùng renderer, khác nguồn đề). Kết quả từng câu ghi vào `mistake.log` (chỉ câu đúng).
- Sau phiên: tóm tắt "n lỗi còn 1 câu nữa thoát sổ" — copy trung thực như xiehanzi ("Đã đúng 1/2").

## 6. UI Sổ lỗi (`/notebook` filter hiện có, nâng cấp)

- Item hiển thị: câu, tag loại lỗi (Nghĩa/Nghe/…), trạng thái `Đã đúng n/2`, dimension đã qua, ngày.
- Actions: `Luyện lại (n)` bật phiên; `Bỏ khỏi sổ` (removedManually); nghe audio nếu có.
- Bộ đếm "n lỗi đang theo dõi" lên card Home (Wave 1 có thể nhét bước "Ôn lỗi" sau khi cả hai ship — follow-up).

## 7. Testing

- Unit `isMastered`: đúng 2-2-2 qua ranh giới ngày/tháng, trùng ngày không đếm, trùng dimension không đếm, sai không log.
- Unit chọn dimension cho phiên luyện.
- Component: item sổ lỗi 3 trạng thái (đang theo dõi / 1/2 / mastered).
- e2e: sai 1 câu trong lesson → xuất hiện sổ lỗi → luyện lại 2 dạng 2 ngày (mock date) → thoát sổ.

## 8. Out of scope

ASR/chấm nói (đội Wave 3b), thống kê loại lỗi dài hạn, "dự đoán lỗi" AI. Ngày test mock bằng inject clock, không fake `Date.now` rải rác.
