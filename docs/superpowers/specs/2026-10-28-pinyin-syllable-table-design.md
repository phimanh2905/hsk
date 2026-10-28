# Spec: Bảng Pinyin 405 âm tiết (`/pinyin/bang-am`) — Phase 1 bắt kịp đối thủ

- Ngày: 2026-10-28
- Trạng thái: Approved (owner chốt phương án B sau so sánh với nhaihsk.com/pinyin)
- Phân loại: tính năng mới — route mới, component mới, 1 util pure mới

## 1. Bối cảnh

Nghiên cứu 2026-10-28 (so sánh `/pinyin` app-next vs nhaihsk.com/pinyin) cho thấy gap lớn nhất: đối thủ có
**bảng 406 âm tiết đầy đủ** (thanh mẫu × vần mẫu, click ô → dialog chi tiết + nghe từng thanh) làm trung tâm
trang và là landing SEO. App-next có sẵn dữ liệu `pinyinValid` (405 ô) + `pinyinExamples` (146 ví dụ) trong
`src/content/pinyin.ts` nhưng **chưa render ở bất kỳ UI nào**.

## 2. Mục tiêu Phase 1

1. Trang mới **`/pinyin/bang-am`** (route group `(wide)`, SSG) render bảng 405 âm tiết đầy đủ, server-render
   nội dung (SEO + chia sẻ URL).
2. Click ô → dialog chi tiết: 5 nút nghe (4 thanh + thanh nhẹ 5) qua `useTts`, ví dụ từ `pinyinExamples`,
   deep-link `?sy=<syllable>`.
3. Phân vai rõ hai trang pinyin (tránh nhầm lẫn user) + cross-link 2 chiều.
4. Quiz Lab thêm hiệu ứng celebrate (CSS confetti, không dependency mới).
5. Util pure tạo dấu thanh (`applyTone`) + unit test đầy đủ.

## 3. Non-goals (Phase sau)

- Mastery per-cell / quiz thích nghi theo ô yếu (Phase 2 — sẽ lưu trạng thái ô vào progress-store).
- XP server-side, study activity, leaderboard (Phase 3 — gắn SP2/HybridStore).
- i18n đa ngôn ngữ cho bảng.
- Đổi `/pinyin` thành trang trung tâm kiểu đối thủ (phương án C — giữ làm hướng mở).

## 4. Thiết kế

### 4.1 Phân vai & naming (điều khoản bắt buộc)

| Trang | Vai trò | Tên hiển thị |
|---|---|---|
| `/pinyin` (Lab, giữ nguyên) | Học — khẩu hình, thanh điệu, phản xạ tai, biến âm | "Pinyin Lab · 拼音实验室" |
| `/pinyin/bang-am` (mới) | Tra — 405 âm tiết, bấm ô nào nghe ô đó | "Bảng Pinyin · 拼音表 · 405 âm tiết" |

- Sidebar giữ 1 mục "Bảng âm Pinyin" trỏ `/pinyin`; **không** thêm mục sidebar thứ hai.
- Cross-link 2 chiều:
  - Lab mode matrix: link phụ "Xem đủ 405 âm tiết →" → `/pinyin/bang-am`.
  - Trang bảng: 2 CTA đầu trang — "Luyện phản xạ tai" → `/pinyin?mode=quiz`, "Học lộ trình" → `/roadmap/pinyin`.

### 4.2 Route & SEO

- `src/app/(wide)/pinyin/bang-am/page.tsx` — server component, **SSG mặc định** (không dynamic API),
  `export const metadata` title `"Bảng Pinyin · 405 âm tiết"` + description chứa "bảng pinyin", "405 âm tiết".
- Thêm route vào sitemap (nếu `app/sitemap.ts` có danh sách tĩnh).
- Không gate login — bảng là nội dung công khai tra cứu.

### 4.3 Dữ liệu & util

- Nguồn: `pinyinValid` (`Record<initial, Record<final, baseSyllable>>`, 22 initial gồm key `"Ø"` = không
  thanh mẫu) và `pinyinExamples` (`Record<baseSyllable, [hanzi, pinyinDấu, việt][]>`).
- Thứ tự hiển thị: hàng = initial theo thứ tự `pinyinInitials`; cột = hợp (union) các final xuất hiện trong
  `pinyinValid`, theo thứ tự `pinyinFinals`.
- **Util mới `src/lib/pinyin/tone-mark.ts`**: `applyTone(syllable: string, tone: 1|2|3|4|5): string`.
  - Tone 5 → trả nguyên âm gốc (không dấu).
  - Đặt dấu trên nguyên âm chính: `iu` → dấu trên `u` (liú), `ui` → trên `i` (duì); ngoài ra ưu tiên
    `a` → `o` → `e` → nguyên âm còn lại; xử lý `ü`/`üe`/`üan`/`ün`, `ê`, `er`, nguyên âm đơn.
  - Pure, không IO; ~40 dòng; unit test phủ: từng cặp nguyên âm đơn, iu/ui, ü, ê, er, tone 5, âm không có
    trong bảng → trả nguyên văn (không throw).
  - Đồng thời export `toneMarked(base: string): [string, string, string, string, string]` trả đủ 5 dạng.

### 4.4 UI

- **`SyllableTable`** (`./syllable-table.tsx`, "use client"):
  - Bảng responsive: desktop ma trận initial (hàng) × final (cột); mobile chuyển sang nhóm theo hàng initial
    (flex wrap chip) — bám tokens Hanzi (`border-border-subtle`, `bg-surface-elevated`, 4px grid, Inter +
    Noto Sans SC), target chạm ≥44px.
  - Ô rỗng: nền mờ, không click. Ô hợp lệ: chữ âm gốc + hover/active nổi.
  - Ô đang mở dialog highlight (accent).
- **Dialog chi tiết** (tái dùng `src/components/ui/dialog.tsx`):
  - Header: âm tiết có dấu của thanh đang chọn (mặc định tone 1), chips initial/final.
  - 5 nút thanh điệu (mā · má · mǎ · mà · ma) — click nghe ngay `rate 0.95`; nút "nghe chậm" `rate 0.65`.
  - Ví dụ: tối đa 4 mục từ `pinyinExamples[base]` (chữ Hán + pinyin có dấu + nghĩa Việt).
  - Deep-link: mở dialog → `history.replaceState` thêm `?sy=<base>`; đóng → xoá param. Load trang có `?sy`
    → mở sẵn dialog tương ứng (không tự phát audio).
  - Esc/click nền đóng (Dialog đã hỗ trợ).
- **Celebrate quiz**: tại tổng kết `quiz-view.tsx` khi `score >= 8` → burst CSS confetti (vài chục span
  absolute, animation rơi, `aria-hidden`), và badge "🔥 Chuỗi 5+ ngay" khi đạt streak ≥5 giữa phiên. Không
  thêm dependency.

### 4.5 Điều không làm

- Không sửa `pinyin.ts` (seed source — mọi chỉnh sửa data phải qua generator, ngoài scope).
- Không đổi URL Lab, không đổi sidebar, không chạm HybridStore/SRS.
- Không thêm package mới.

## 5. Kiểm thử

### 5.1 Unit (Vitest, jsdom)

- `tone-mark.test.ts`: bảng edge case liệt kê ở §4.3; và kiểm tra toàn bộ 405 ô × tone 1–4 sinh chuỗi khớp
  regex `^[a-züê]+[̄́̌̀]?$` có dấu đúng vị trí (assert không rỗng, khác âm gốc khi tone ≤4 với âm có nguyên âm).
- `syllable-table.test.tsx`: render đủ 405 ô hợp lệ + cột theo `pinyinFinals`; click ô "ba" mở dialog với 5
  nút thanh + ví dụ (mock `useTts`); đóng dialog giữ param sạch; mount với `?sy=ba` mở sẵn dialog.

### 5.2 Browser test cases (control-browser, chạy trên :3100) — chuẩn 100% pass

| # | Test case | Kỳ vọng |
|---|---|---|
| T1 | GET `/pinyin/bang-am` | HTTP 200, h1 chứa "Bảng Pinyin", bảng hiển thị 405 ô hợp lệ |
| T2 | Server-render | Source HTML trả về chứa nội dung bảng (không phải skeleton client-only) |
| T3 | Click ô "ba" | Dialog mở: tiêu đề "ba", 5 nút thanh (bā má mǎ mà ma), chip b + a |
| T4 | Dialog ví dụ | Hiện ≥1 ví dụ từ `pinyinExamples["ba"]` (八 … tám) |
| T5 | Click nút thanh | Không lỗi console; nút có trạng thái active |
| T6 | Đóng dialog (Esc) | Dialog đóng, URL mất `?sy` |
| T7 | Deep-link `?sy=ba` | Dialog mở sẵn đúng ô, URL giữ nguyên khi reload |
| T8 | CTA "Luyện phản xạ tai" | Điều hướng `/pinyin?mode=quiz`, Lab khởi phiên quiz |
| T9 | CTA "Học lộ trình" | Điều hướng `/roadmap/pinyin` |
| T10 | Lab → bảng | Link "Xem đủ 405 âm tiết →" trên `/pinyin` tới `/pinyin/bang-am` |
| T11 | Mobile viewport 390px | Không tràn ngang, nhóm hàng initial wrap |
| T12 | Title/description | `<title>` và meta description đúng spec |

## 6. Rủi ro

- `pinyinValid` là dữ liệu tĩnh lớn (import runtime ~30KB) — nằm trong client bundle của trang; chấp nhận vì
  SSG render luôn cần; nếu lớn hơn mong đợi có thể server-render HTML bảng tĩnh và chỉ client bundle thông
  tin dialog (vẫn giữ mọi tính năng).
- Tone-mark sai vị trí dấu ở case hiếm (ê/ü) — chặn bằng test full-matrix 405×4.
- Confetti không được chặn click/xen kẽ a11y — `pointer-events-none`, `aria-hidden`.
