# Onboarding + Placement Test trên Home — Design

- Ngày: 2026-11-04
- Trạng thái: Duyệt (owner)
- Phạm vi: `app-next` — home landing flow 3 bước, bài test trình độ ladder, tích hợp Journey

## 1. Vấn đề

Người chưa biết gì về HSK vào app: trang chủ chỉ có greeting + "Bắt đầu ngay" → course shelf.
Không ai giải thích HSK là gì, không biết bắt đầu đâu, không có bài kiểm tra trình độ —
người đã biết chút tiếng Trung bị ép học lại từ Pinyin/HSK1.

## 2. Mục tiêu & không mục tiêu

**Mục tiêu:**
- Home = landing page: xem thoải mái, không chặn, không cần đăng nhập.
- Hero lần đầu chốt mục tiêu học (đích HSK + phút/ngày) inline trên home.
- Bài test trình độ ladder (3–15 câu, ~2–4 phút) gán trạm bắt đầu trong Journey.
- Journey hiển thị trạm gợi ý + stage thấp hơn "bỏ qua được" (không khóa cứng).

**Không mục tiêu (YAGNI):**
- Không ghi mục tiêu/placement lên D1 (guest-first; sync sau nếu cần).
- Không enforce phút/ngày (chỉ hiển thị gợi ý nhịp).
- Không sửa trang landing marketing dài — chỉ thêm 1 section "HSK là gì" cho guest.

## 3. Luồng onboarding (hero, inline, 3 bước)

Kích hoạt: `useHomeSummary()` cho thấy progress = 0 **và** chưa có mục tiêu trong
`bye.onboarding.v1`. HeroAction thay nội dung bằng state machine 3 bước trong component:

```
Bước 1 (goal): chọn đích HSK1–HSK5 (mặc định HSK5) + phút/ngày (10/15/30) → Tiếp tục
Bước 2 (offer): [Làm test trình độ ~3 phút] hoặc [Bỏ qua — bắt đầu từ đầu]
Bước 3 (test → result): ladder test → "Bạn nên bắt đầu từ trạm X" → [Vào Journey]
```

- Flow luôn thoát được ở mọi bước ("optional" — landing vẫn xem tự do): bước goal/offer có
  nút Bỏ qua riêng; trong lúc test có nút X quay lại bước offer (nơi có Bỏ qua); màn kết quả
  dẫn thẳng Journey. (Chỉnh 2026-11-04 sau review: bản trước ghi "nút Bỏ qua hiển thị mọi
  bước" — thực tế chỉ cần luôn thoát được, không nhất thiết mỗi bước có nút riêng.)
- Bước 2 chọn "Bỏ qua" → ghi goal, không ghi placement → `suggestedStage` = "pinyin".
- Bước 3 chọn test → chạy ladder → ghi goal + placement result → nút dẫn `/roadmap`.
- Đã có mục tiêu → hero như cũ ("Tiếp tục bài học" / progress hiện tại).
- Đặt goal không đổi hành vi khóa — chỉ đổi cờ gợi ý (mục 5).

## 4. Bài test trình độ (placement, ladder)

- **Tái sử dụng pattern chứ không tái dùng `exam-runner`**: runner của exam gắn flow thi demo,
  lưu D1, sections listen/write — placement chỉ cần reading.
- Generator riêng `generatePlacement(wordsByLevel, seed)` (pure, deterministic theo seed):
  - Mỗi block = 1 level = 3 câu trắc nghiệm: 2 câu "chọn nghĩa của từ" (hanzi → vi)
    + 1 câu điền vào chỗ trống từ ví dụ. Distractor lấy từ cùng level (khác nghĩa).
  - Không nghe (chưa có audio per-vocab), không tự luận (chấm chậm).
- **Ladder từ dưới lên**: block hsk1 → đạt ≥2/3 lên hsk2 → … dừng ở block đầu tiên <2/3.
  Tối đa 5 block. Kết quả = level của block pass cuối cùng.
- Nguồn từ: `loadVocab()` (`/api/v1/content/vocab`, đã có cache Promise).
- Kết quả: `suggestedStage`: `"pinyin" | "hsk1" | … | "hsk5"` + chi tiết blocks (pass/fail từng câu).

## 5. Tác động lên Journey

- Stage có index thấp hơn `suggestedStage` (trong pinyin → hsk5) hiển thị badge
  "Bỏ qua được (theo test)" nhưng **vẫn mở tự do** — không khóa, không ai bị cấm học lại.
- Gate pinyin của hsk-1: nếu `suggestedStage ≥ hsk1` → `exempt` — exempt là trạng thái
  **computed** qua `gateStatus()` (UI đọc trực tiếp), KHÔNG ghi vào `bye.roadmap.gates.v1`.
  (Chỉnh 2026-11-04 sau review — YAGNI: không có consumer nào đọc listRoadmapGates cho case này.)
- Cờ "🚩 Bắt đầu ở đây" rời khỏi Pinyin, gắn vào stage `suggestedStage`.
- Phân biệt 2 trường hợp:
  - **Có onboarding state nhưng bỏ qua test** → `suggestedStage = "pinyin"` (đã ghi rõ khi chốt
    goal ở bước 2) → cờ vẫn ở Pinyin, không có badge bỏ qua, không exempt gate.
  - **Không có onboarding state (người cũ / chưa đi qua hero)** → hành vi Journey như hiện tại.

## 6. State & storage

- Key mới trong ProgressStore: `ONBOARDING_KEY = "bye.onboarding.v1"`
  ```ts
  type StageId = "pinyin" | "hsk1" | "hsk2" | "hsk3" | "hsk4" | "hsk5";
  type OnboardingState = {
    goal: "hsk1" | "hsk2" | "hsk3" | "hsk4" | "hsk5";
    minutes: 10 | 15 | 30;
    placement?: {
      suggestedStage: StageId;
      blocks: Partial<Record<"hsk1" | "hsk2" | "hsk3" | "hsk4" | "hsk5", { correct: number; total: 3 }>>;
      seed: number;
      at: number; // epoch ms
    };
    at: number;
  };
  ```
- Pattern hiện hành: const key + `getOnboarding()/setOnboarding()` + emit `"bye:progress"`.
- `minutes` chỉ hiển thị gợi ý nhịp học trên Journey/HabitLoop (follow-up UI nhẹ, không enforce).

## 7. UI components

| Thành phần | File | Ghi chú |
|---|---|---|
| Onboarding hero (flow 3 bước) | `src/components/home/onboarding-hero.tsx` | mới; thay `HeroAction` khi điều kiện kích hoạt |
| Placement runner + result | `src/components/home/placement-test.tsx` | mới; tách khỏi exam-runner |
| Section "HSK là gì" | trong `src/app/(app)/page.tsx` | 1 section ngắn dưới hero, chỉ guest progress=0 |
| Journey badge + cờ | `roadmap/page.tsx`, `src/lib/roadmap-progress.ts` | sửa |

## 8. Testing

- **Unit (vitest, jsdom)**: `placement.test.ts` (deterministic generator, distractor không trùng đáp án,
  ladder scoring mọi nhánh: fail ngay block 1, pass hết 5 block, dừng giữa);
  `progress-store-onboarding.test.ts` (roundtrip, emit event, key v1);
  `roadmap-progress` test cho suggested-start/badge/gate exempt.
- **E2E (playwright)**: 1 spec onboarding trọn vẹn — guest vào `/` → goal → test ladder →
  result đúng trạm → vào `/roadmap` thấy cờ ở trạm gợi ý + badge bỏ qua.

## 9. Rủi ro & lưu ý

- Vocab nghĩa tiếng Việt phải là distractor khả nghi (cùng chủ đề ưu tiên) — generator chọn
  từ cùng lesson trước, khác lesson nếu thiếu.
- Không đụng sync API/HybridStore trong phiên này.
- `static-first` đã ship: onboarding là client-side thuần, không thêm worker route.
