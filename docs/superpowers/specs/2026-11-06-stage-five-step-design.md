# Spec: Chặng 5 bước narrative — Wave 3

Ngày: 2026-11-06
Nguồn: RE xiehanzi (chặng 5 bước signature); sở thích chủ phiên "học ý tưởng, làm theo thế mạnh".
Phụ thuộc: không bắt buộc Wave 1; TodayCard deep-link bước "Học" sẽ trỏ thẳng vào flow này.

## 1. Mục tiêu

Biến StationDrawer (3 tab: Ôn nhanh / Học / Bài kiểm tra) thành **flow nhiều bước có narrative**, học từ xiehanzi nhưng dựng trên content đã có — không copy story engine, không sinh nội dung mới.

## 2. Flow mới của trạm (drawer), 4 bước

| Bước | Nội dung | Nguồn content | Trạng thái |
|---|---|---|---|
| 0 | Ôn nhanh (warm-up trạm trước) | giữ nguyên | có sẵn |
| 1 | **Từ mới** — intro vocab của bài + mini-quiz **nghe-đoán thanh điệu** (không tính điểm, như xiehanzi "Không tính điểm, cứ đoán") | lesson vocab hiện có + audio Kokoro | mới |
| 2 | **Hội thoại** — nghe dialogue theo bài, từng câu nút Nghe + "Nói theo", xong 2–3 câu hỏi trắc nghiệm | **108 dialogues Kokoro hsk1–3** (seed 1:1 theo bài: hsk1 27, hsk2 40, hsk3 41 — trùng số bài!) | mới |
| 3 | **Nhập vai** — chọn câu đáp lại theo tình huống → ghi micro đọc theo → chấm heuristic (nhịp/độ dài, PronPanel scoring hiện có) | dialogue sentences | mới, phase 2 |
| 4 | **Bài kiểm tra** — StationQuiz (gate 80%) + bổ sung dạng **nghe-chọn-tranh** | station quiz hiện có | nâng cấp |

- Mapping dialogue ↔ bài: seed đã 1:1 theo bài hsk1–3 (27/40/41) → lookup trực tiếp. **hsk4/5 không có dialogue** → bước 2 ẩn, flow co về 3 bước (fallback trung thực, không stub).
- Block **Văn hoá**: 1–2 câu context văn hoá cuối drawer (nội dung tĩnh theo bài, soạn khi làm seed step — không bắt buộc cho mọi bài).

## 3. Wave con

- **3a — Hội thoại step**: player câu-từng-câu (audio Kokoro có sẵn), quiz MCQ theo dialogue. Effort chính của wave này.
- **3b — Nhập vai**: `useRecorder` + `PronPanel` + scoring heuristic `src/lib/shadowing/scoring.ts` (clamp 55–98). Copy trung thực: "chấm nhịp, chưa chấm phát âm". **ASR thật là follow-up riêng** (SpeechRecognition zh-CN trước, scoring thanh điệu sau).
- **3c — Nghe-chọn-tranh** trong StationQuiz: thêm question type; tranh dùng bộ asset minh hoạ (emoji render hoặc asset pack — quyết định khi plan; không chặn 3a).

## 4. Tiến độ trạm

- Mỗi bước đánh dấu `data-done` vào station state hiện có (mở rộng `roadmap-progress` hoặc lưu ở store trạm) — drawer mở lại thấy bước nào đã xong.
- Gate pass trạm vẫn là StationQuiz ≥80%, không đổi. Bước 1–3 là khuyến nghị thứ tự, không khoá (đồng bộ quyết định Wave 1).

## 5. Testing

- Unit: mapping bài↔dialogue (hsk1–3 có, hsk4/5 fallback ẩn), state done từng bước.
- Component: drawer 4 bước + trạng thái done; quiz hội thoại đúng/sai.
- e2e: mở trạm → Từ mới đoán thanh → Hội thoại nghe + quiz → StationQuiz pass → trạm xong.

## 6. Out of scope

Sinh story mới (dùng dialogue có sẵn), ASR chấm thanh điệu thật, luyện đề ngân đề CTI (spec riêng khi mở trần HSK 6–9), in-page session player gộp cả ôn tập.
