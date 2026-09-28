# SPEC-20: /radicals — modal tự động phát thẻ + 7 quy tắc thứ tự nét

## Bối cảnh
Vòng 2 (scroll tới đáy trang): ngoài deck flashcard, `/radicals` còn có modal **"Tự động phát thẻ"** và section **7 quy tắc thứ tự nét** + ô lưu ý nét cuối. Chi tiết: `GAP-ANALYSIS-ROUND2.md` GAP-11.

## A. Modal "Tự động phát thẻ"
Trigger: nút ⚙ (đã có trong deck radicals hiện tại) — bấm mở modal thay vì bật/tắt đơn giản.
Nội dung:
- `h3` "Tự động phát thẻ" + sub nhỏ.
- Row 1: select **"Thời gian lật thẻ"** — options `2 giây / 3 giây / 5 giây / 10 giây`, mặc định **3**.
- Row 2: select **"Thời gian sang thẻ mới"** — options `1 giây / 2 giây / 3 giây`, mặc định **2**.
- Row 3: toggle **"Nghe từ vựng"** (mặc định OFF).
- Row 4: select **"Số lần nghe lại"** — `1 lần / 2 lần / 3 lần`, mặc định **1** (disabled khi toggle tắt).
- Nút phụ "Huỷ" + nút chính "Bất đầu".

Hành vi autoplay (chỉ chạy ở trang clone, không đụng dữ liệu thật):
- Bấm "Bất đầu" → đóng modal, vào chế độ tự động: cứ mỗi `flipMs` lật thẻ (thêm class `is-flipped`), sau `nextMs` chuyển thẻ kế tiếp.
- Nếu bật "Nghe từ vựng": khi thẻ lật, `NHAI.speak(pinyin, 'zh-CN')`; lặp `repeat` lần, cách nhau 400ms.
- Badge "Tự động" đổi thành nút dừng ⏸; bấm ⏸ dừng và huỷ timer.
- Timer lưu vào `radicals.timer` để `NHAI.openSettings()` không dính timer cũ sau khi đổi trang.

## B. Section "Quy tắc thứ tự nét" (đặt dưới deck, trên footer)
- `h2` "Quy tự thứ tự nét" (gốc: "Quy tắc thứ tự nét") + sub "7 nguyên tắc cơ bản giúp bạn viết đúng thứ tự."
- **7 card** dạng lưới 2 cột (1 cột mobile), mỗi card: số thứ tự tròn đỏ + `h3` tên quy tắc + mô tả 1 dòng + **ô minh hoạ 48px chứa 1–2 chữ Hán** ví dụ:

| # | Tên | Ví dụ | Mô tả |
|---|---|---|---|
| 1 | Trước – sau | 爸 | Nét trước viết trước, không cắt ngang nét sau. |
| 2 | Trên – dưới | 月 | Viết nét trên xong mới xuống nét dưới. |
| 3 | Trái – phải | 们 | Nét bên trái trước, sang bên phải. |
| 4 | Ngoài – trong | 国 | Khung ngoài kín trước, phần trong sau. |
| 5 | Chạm – cắt | 区 | Chạm vào nét trước, không cắt qua nó. |
| 6 | Đóng trước – mở sau | 夫 | Nét khép kín viết trước nét mở. |
| 7 | Viết nét cuối | 女 | Nét chéo kéo dài luôn là nét cuối. |

- Ô minh hoạ: SVG tĩnh, chữ Hán vẽ bằng font hệ thống (`font-size:40px; fill:#1f2937`), nền ô `--nhai-soft`, bo góc. Không dùng ảnh.

## C. Ô lưu ý nét cuối (sau 7 quy tắc)
Card nền vàng nhạt (`--nhai-warn-bg`), viền trái 4px vàng:
- `h3` "⏳ Ba nét cuối luôn viết sau cùng".
- Dòng giải thích: "Những bộ thủ thường gặp như 辶 (走之), 廴 và ㄑ luôn nằm cuối cùng, dù nghĩa của chúng có liên quan đến điều gì đó trước đó."
- Hàng 3 ô nhỏ: 辶 廴 ㄑ — mỗi ô chữ lớn + tên "đi" (biến thể 3 nét của 走之).

## Tiêu chí nghiệm thu
- Bấm ⚙ mở đúng modal 4 control với mặc định 3s / 2s / tắt / 1 lần; nút Tạo disabled khi toggle tắt? (không — chỉ select "Số lần nghe lại" disabled khi toggle off).
- "Bất đầu" chạy đúng nhịp lật/chuyển thẻ; ⏸ dừng; điều hướng trang không còn timer.
- Trang có đủ 7 card quy tắc + 1 card lưu ý nét cuối, hiển thị đúng ở cuối trang dưới deck.
- Card ví dụ dùng đúng chữ: 爸 月 们 国 区 夫 女.
