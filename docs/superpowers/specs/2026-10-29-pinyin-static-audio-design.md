# Spec: Audio tĩnh cho Bảng Pinyin — render offline Kokoro + phát từ CDN

- Ngày: 2026-10-29
- Trạng thái: Approved hướng (owner duyệt A+B sau brainstorm latency); spec chờ review
- Phân loại: pipeline render mới (Python) + thay nguồn phát trong 1 component

## 1. Bối cảnh

Bảng Pinyin (`/pinyin/bang-am`) phát voice qua `useTts` → Kokoro WebGPU runtime. Độ trễ click → nghe
bao gồm: consent (lần đầu), nạp model ~326MB mỗi phiên (2–5s), compile shader lần đầu (1–3s), rồi mới
inference. Với nhu cầu phát 1 âm tiết cố định (405 ô × 5 thanh = 2025 clip biết trước), chi phí runtime
này không cần thiết.

Quyết định đã chốt (brainstorm 2026-10-29):
- **A**: Pre-render 2025 mp3 offline bằng Kokoro Python (v1.1-zh, voice `zf_001`), lưu
  `public/audio/pinyin/` → serve qua Workers Static Assets (CDN edge, free, không tốn invocation).
  Click → fetch mp3 (~10–30ms) → phát.
- **B** (kèm): giữ Kokoro runtime cho text động (lab quiz, lesson) — không đổi gì ở đó.
- Vercel/R2: không dùng — static assets của Cloudflare đã phủ nhu cầu (tổng upload sau thêm ~53MB /
  ~3.2k files, dư địa lớn so với free limit 256MB / 20k files).

## 2. Non-goals

- Không đổi TTS runtime (`useTts`/orchestrator/Kokoro engine) cho các trang khác.
- Không render audio cho lab quiz (text động, giữ useTts).
- Không dựng voice picker (giữ `zf_001` mặc định, giống audio lesson).
- Không đụng `render-dialogue-audio.py` hay seed SQL.

## 3. Thiết kế

### 3.1 Cấu trúc file (scripts/content/)

| File | Loại | Vai trò |
|---|---|---|
| `gen-pinyin-hanzi-map.mts` | TS, chạy 1 lần | Sinh `data/pinyin/render-input.json` từ CC-CEDICT + `pinyinValid` |
| `data/pinyin/render-input.json` | JSON, committed | 405 ô × 5 thanh: `{cells: [{initial, final, base, hanzi: [5 chữ]}]}`; sửa tay được |
| `render-pinyin-audio.py` | Python, chạy thủ công | Đọc JSON → render mp3 24kHz mono → `public/audio/pinyin/{base}-{tone}.mp3` + QA gate |
| `render-dialogue-audio.py` | Python, hiện có | Không đổi |

Venv: tái dùng `.venv-kokoro` (kokoro + torch + misaki ZHG2P đã có). Không thêm package mới.

### 3.2 Ánh xạ (âm tiết, thanh) → chữ Hán

- Nguồn chính: **CC-CEDICT** (bản `cedict_ts.u8` tải về local, không commit raw dict).
- Chọn chữ đại diện: từ có tần số/use phổ biến nhất cho từng (pinyin, tone) — ưu tiên chữ đã xuất hiện
  trong `pinyinExamples`, sau đó theo thứ tự dictionary (simplified).
- Thanh 5 (nhẹ): dùng cùng chữ với âm gốc, pipeline đọc với tone trung tính theo G2P; nếu nghe cụt,
  thay bằng chữ thường gặp của thanh nhẹ.
- Format pinyin so khớp CC-CEDICT: `ü` → `u:` (cedict convention); `-i` không tồn tại trong
  `pinyinValid` nên không phải xử lý zhi/chi/shi riêng.
- Ô nào không tìm được chữ: điền `null` → render skip + ghi vào báo cáo → owner xem/sửa tay JSON.
- Output JSON **committed** để review + sửa tay mà không cần chạy lại generator.

### 3.3 Render + QA gate (`render-pinyin-audio.py`)

- CLI: `--dry-run` (liệt kê sẽ render gì, không cần kokoro), `--only <syllable>` (render lại 1 ô),
  mặc định render thiếu/chưa có (skip file đã tồn tại trừ khi `--force`).
- Voice `zf_001`, 24kHz mono, mp3 — giống audio lesson.
- **QA gate bắt buộc** sau mỗi file: duration 0.2–1.5s; RMS > ngưỡng im lặng (vd. -50 dBFS). Fail →
  ghi `report.json` (ô + lý do), script exit code ≠ 0 khi có fail → CI-able nếu sau này muốn.
- Owner nghe thử mẫu ≥20 file ngẫu nhiên trước khi ship (bước thủ công, ghi trong report).

### 3.4 Client — thay nguồn phát trong `syllable-dialog.tsx`

- Nút thanh điệu: phát `/audio/pinyin/${base}-${tone}.mp3` qua một hook nhỏ `useStaticAudio`
  (singleton `Audio` element, stop clip cũ trước khi phát — tương đương hành vi runId của Kokoro).
- "Nghe chậm": cùng file, `playbackRate = 0.65` + `preservesPitch = true` (không méo giọng).
- **Fallback**: fetch file lỗi (404/network) → gọi `speak()` của `useTts` với pinyin có dấu như hiện tại.
  Log console.warn một lần, không toast.
- Không đổi dialog UI, deep-link, ví dụ — chỉ đổi nguồn phát.

### 3.5 Giữ nguyên

- `useTts`, orchestrator, consent dialog, Kokoro engine — dùng cho mọi text động (quiz lab, inspector,
  lesson). Preload engine khi mount trang pinyin (B) làm **riêng 1 task nhỏ** nếu còn thời gian; không
  chặn phương án A.

## 4. Kiểm thử

### 4.1 Unit (Vitest)

- `gen-pinyin-hanzi-map` test: parse cedict sample fixture → chọn đúng chữ ưu tiên; ü/u: mapping;
  405×5 đủ ô, null chỉ khi cedict thiếu.
- `useStaticAudio` test: mock Audio — phát file đúng URL theo tone, stop clip cũ khi bấm nút mới,
  fallback sang useTts khi `play()` reject.

### 4.2 Pipeline QA (thủ công, gate trước khi ship)

- `render-pinyin-audio.py --dry-run` → 2025 mục, 0 ô null (hoặc liệt kê rõ).
- Render thật → `report.json` 2025/2025 pass duration + RMS.
- Nghe thử ≥20 file ngẫu nhiên (owner).

### 4.3 Browser QA (control-browser, :3100)

| # | Case | Kỳ vọng |
|---|---|---|
| A1 | Mở `?sy=ba`, click "bā" | Network request `/audio/pinyin/ba-1.mp3` → 200; âm phát; không gọi Kokoro |
| A2 | Click "Nghe chậm" | Cùng file, playbackRate 0.65 |
| A3 | Bấm 2 nút liên tiếp | Clip 1 dừng ngay khi clip 2 bắt đầu |
| A4 | Chặn file mp3 (route abort) | Fallback useTts phát, không crash |
| A5 | Các tính năng cũ | Deep-link, ví dụ, đóng dialog — như QA T1–T12 trước |

## 5. Rủi ro

- **Chữ đại diện chưa chuẩn cho ô hiếm** → nghe thử bắt, sửa tay JSON, render lại `--only`.
- **Am tiết đơn nghe cụt** (edge case model) → nếu nhiều ô hỏng QA, phương án dự phòng: render kèm
  ngữ cảnh ngắn rồi cắt — chỉ làm khi gate fail nghiêm trọng, không build trước.
- **+22MB vào repo** → chấp nhận (audio lesson 19MB đã đi trước); nếu sau này repo phình, chuyển
  render sang CI artifact — ngoài scope.
- **preservesPitch trên Safari cũ** → property có từ iOS 14.5+; fallback tự nhiên là chấp nhận pitch
  thay đổi nhẹ (không crash).
