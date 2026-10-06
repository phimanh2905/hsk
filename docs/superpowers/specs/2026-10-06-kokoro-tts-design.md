# TTS Mandarin on-device (Kokoro) — Design Spec

- Ngày: 2026-10-06
- Trạng thái: Đã duyệt thiết kế trong chat, chờ review spec
- Phạm vi: `app-next/` — subsystem TTS cho tiếng Trung, thay ruột `useTts` bằng engine abstraction 3 tầng

## 1. Bối cảnh & mục tiêu

Hiện tại app-next phát âm tiếng Trung **duy nhất** bằng Web Speech API
(`speechSynthesis`) qua hook `src/lib/tts/use-tts.ts`, được ~25 component dùng
(flashcard, review, shadowing, dictionary, my-vocab, hanzi detail, pinyin lab…).
Chất lượng phụ thuộc voice hệ điều hành (iOS/macOS có Ting-Ting, Windows/Android
hay thiếu voice zh tốt).

Mục tiêu: giọng đọc Mandarin **on-device, offline, nhất quán mọi nền tảng** bằng
Kokoro-82M-v1.1-zh chạy qua WebGPU (nhanh) hoặc WASM/CPU (fallback), vẫn giữ
speechSynthesis làm tầng cuối cùng để không surface nào mất tiếng.

## 2. Sự kiện kỹ thuật đã verify

| Sự kiện | Nguồn |
|---|---|
| kokoro-js chính thức (1.2.1) chỉ phonemize tiếng Anh (espeak `en-us`/`en`), bảng voices hardcode chỉ `af_/am_/bf_/bm_` | source `unpkg.com/kokoro-js@1.2.1/dist/kokoro.js` |
| Model `onnx-community/Kokoro-82M-v1.1-zh-ONNX` có `onnx/model_fp16.onnx` = 163,630,554 bytes (~156MiB), `onnx/model_quantized.onnx` (q8) = 127,356,597 bytes, ~100 voice zh (`zf_001–099`, `zm_009–100`, 512KB/voice) | HF API `?blobs=true`, 2026-10-06 |
| Fork `@uzen/kokoro-js` port misaki v1.1 zh sang JS: tone sandhi 一/不/sandhi-3, neutral tone, đa âm tự, erhua, text normalization; golden corpus 143/164 khớp Python misaki; đăng ký voices zh; webgpu-first + wasm fallback; nhận `voicePath` tự host | github.com/uzen-zone/kokoro-js README |
| Model zh cần phoneme theo chuẩn misaki[zh] (không dùng được espeak) | hexgrad/kokoro README (lang_code `z` cần `misaki[zh]`) |
| OpenNext → Workers static assets giới hạn ~25MB/file ⇒ model không bundle được; phải fetch runtime | wrangler.jsonc, Workers Assets limits |
| transformers.js cache model qua browser Cache API (`useBrowserCache` mặc định) — lần 2 không tải lại | transformers.js docs |
| Project không có WebGPU/ONNX/IndexedDB/service worker nào sẵn | explore 2026-10-06 |

## 3. Quyết định đã duyệt

1. **G2P tiếng Trung**: dùng fork `@uzen/kokoro-js`, bọc sau adapter mỏng để swap
   được. Pin version chính xác trong `package.json`.
2. **Model hosting**: fetch trực tiếp từ HuggingFace hub; browser tự cache qua
   Cache API. Không R2 ở phase này.
3. **Fallback chain**: WebGPU fp16 → WASM q8 (`model_quantized.onnx`) →
   speechSynthesis.
4. **Download UX**: không tải ngầm 156MB. Lần đầu bấm loa, hỏi user trước
   (chi tiết §6).
5. **Karaoke**: giữ speechSynthesis ở phase 1 (cần `onboundary` để highlight);
   khi Kokoro active thì dùng interval-fallback như code hiện có nếu forced.

## 4. Kiến trúc

```
TTS request (25+ component qua useTts — API giữ nguyên)
     │
Capability check: navigator.gpu?.requestAdapter()
     │
┌────┴──────────────┐
│ WebGPU available   │ → Kokoro fp16 (model_fp16.onnx ~156MiB), device "webgpu"
│ (không có / fail)  │ → Kokoro q8 (model_quantized.onnx ~127MiB), device "wasm"
└────────────────────┘
     │ engine chưa nạp / lỗi runtime / user từ chối tải
     ▼
speechSynthesis (Web Speech API — code hiện tại tách thành engine cuối)
```

### Thành phần mới (đề xuất đặt trong `src/lib/tts/`)

| File | Vai trò |
|---|---|
| `engine.ts` | Interface `TtsEngine { speak(text, opts): Promise<void>; cancel(): void }`, trạng thái nạp engine, capability check, chọn tầng theo setting + khả năng thiết bị |
| `kokoro-engine.ts` | Bọc `@uzen/kokoro-js`: `KokoroTTS.from_pretrained` (dtype/device theo tầng), chunk câu (tái dùng logic chia `。/，` hiện có), `generate()` trả `Float32Array` 24kHz, chuyển cho playback |
| `webspeech-engine.ts` | Tách logic `useTts` hiện tại (chunk, pickVoice, voiceschanged) thành engine độc lập |
| `use-tts.ts` | Rewrite mỏng, giữ nguyên API công khai cho component (`speak`, `speaking`, `cancel`) |
| `playback.ts` | Phát `Float32Array` qua `AudioContext` + `AudioBufferSourceNode` (không AudioWorklet ở phase 1 — Kokoro trả samples hoàn chỉnh, không phải stream; AudioWorklet chỉ có lợi cho gapless stream, để phase 2 nếu nghe thấy gap) |
| `voices.ts` | Danh sách voice zh được tuyển chọn (vài `zf_*` nữ, `zm_*` nam), mapping với setting female/male `bye.voice` hiện có |

### Điều chỉnh hiện có

- `src/components/shell/settings-modal.tsx`: thêm nhóm cài đặt TTS (§7).
- 25+ component dùng `useTts`: **không sửa** (API giữ nguyên).
- `src/components/reading/karaoke.tsx`: không sửa ở phase 1.

## 5. Luồng dữ liệu & loading

1. Component gọi `speak(text)`.
2. `engine.ts` xem setting `bye.tts.engine` (`auto` | `kokoro` | `system`):
   - `system` → webspeech ngay.
   - `kokoro` → nạp engine nếu chưa nạp (nếu nạp fail → webspeech + toast).
   - `auto` (mặc định): khi `bye.tts.engine` chưa có lựa chọn nào trong
     localStorage → hiện dialog hỏi tải model (§6); câu trả lời (Có/Không) được
     lưu và các lần sau đi theo đó, không hỏi lại.
3. Kokoro path: nạp model (progress callback) → phonemize (misaki zh trong fork)
   → `generate(voice theo female/male, speed)` → `playback.ts` phát 24kHz.
4. Cancel: dừng `AudioBufferSourceNode` / `speechSynthesis.cancel()`.

Model & voice fetch thẳng từ `huggingface.co` (CORS mở, Cache API cache sẵn).
Voice .bin 512KB chỉ tải voice đang chọn.

## 6. UX tải model (không tải ngầm)

Lần đầu user bấm loa khi chưa có lựa chọn:

- Dialog: "Muốn dùng giọng đọc Bye HSK chất lượng cao? Tải model 156MB (WebGPU)
  hoặc 127MB (máy không hỗ trợ WebGPU) — chỉ tải 1 lần, dùng offline sau đó."
  - **Có** → tải với progress (MB/%; có nút hủy), sau đó phát bằng Kokoro.
  - **Không** → phát bằng speechSynthesis ngay, lưu lựa chọn; có thể đổi sau
    trong Settings.
- Progress hiển thị cả trong Settings khi đang tải.
- Thất bại tải (mạng lỗi/giữa chừng): toast lỗi, rơi về speechSynthesis, cho
  thử lại từ Settings.

## 7. Settings (settings-modal)

Mở rộng nhóm "Giọng đọc tiếng Trung" hiện có:

- **Engine**: Auto (mặc định) / Bye HSK (Kokoro) / Hệ thống.
- **Trạng thái**: chưa tải / đang tải (progress) / đã sẵn sàng + device đang dùng
  (WebGPU/WASM); nút tải lại / xóa cache.
- **Giọng**: female/male giữ nguyên; phase sau mở rộng chọn voice cụ thể
  (`zf_*`/`zm_*`) khi đã nghe thử tuyển được voice tốt.

## 8. Xử lý lỗi runtime

| Tình huống | Hành vi |
|---|---|
| Không có WebGPU (Firefox/iOS Safari) | Tầng WASM q8. Riêng iOS Safari: **chặn** đề nghị tải Kokoro (CPU yếu, inference sẽ unusable) → webspeech luôn |
| WebGPU có nhưng thiếu `shader-f16` / init fp16 fail | Rơi xuống q8-wasm |
| Inference fail giữa chừng (OOM, device lost) | Hủy engine, toast "Chuyển về giọng hệ thống", webspeech trong session còn lại |
| Tab background khi phát | Không xử lý riêng phase 1 (AudioContext vẫn phát; chấp nhận) |
| Text rỗng / chỉ dấu câu | Không phát, không lỗi |

## 9. Hiệu năng & kích thước

- Bundle: `@uzen/kokoro-js` + `@huggingface/transformers` load **lazy** qua
  dynamic `import()` khi engine lần đầu cần nạp — không tăng bundle chính.
- Download lần đầu: 156MiB (WebGPU) hoặc 127MiB (WASM); cache browser giữ lại.
- Inference: mục tiêu < 2s cho câu vocab trên WebGPU; WASM chậm hơn nhiều
  (chấp nhận, là fallback).

## 10. Kiểm thử

- Unit (vitest theo pattern hiện có): chunking câu; capability check + chọn tầng
  (mock `navigator.gpu`); mapping female/male → `zf_`/`zm_`; fallback khi engine
  nạp fail. Mock network, không tải model thật trong test.
- Manual (browser thật): Chrome (WebGPU) phát "你好" nghe đúng; lần 2 không tải
  lại (Cache API); Firefox (WASM) chạy được; dialog hỏi-tải đúng 1 lần; Settings
  đổi engine có hiệu lực; 25+ surface cũ vẫn phát được qua tầng mới.
- Không đụng 83 test file đang fail sẵn có của repo.

## 11. Rủi ro & giảm thiểu

| Rủi ro | Giảm thiểu |
|---|---|
| Fork `@uzen/kokoro-js` non trẻ (3 sao, ít người dùng) | Adapter mỏng (`kokoro-engine.ts`) để swap; pin version; nếu fork chết thì viết pinyin→phoneme riêng trên kokoro-js gốc (phương án B đã phân tích) |
| Phonemizer JS khớp 143/164 corpus misaki | Chấp nhận phase 1; nghe thử các câu trong content thật (vocab, reading, shadowing) trước khi mở rộng voice picker |
| 156MB trên data di động | Luôn hỏi trước khi tải; default là speechSynthesis cho đến khi user đồng ý |
| HF chậm/chặn tại VN | Phase sau: R2 mirror (adapter đọc base URL từ config, chỉ đổi 1 biến) |

## 12. Ngoài phạm vi (phase sau)

- AudioWorklet gapless streaming cho các câu dài.
- Karaoke highlight theo ký tự với audio Kokoro (cần word timing).
- Chọn voice cụ thể trong ~100 voice zh.
- R2 mirror cho model/voice.
- TTS cho tiếng Việt/Anh trong nội dung hỗn hợp.
