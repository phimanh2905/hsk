# SPEC-09: Từ điển (`dictionary.html`) + các trang còn lại

## 1. `dictionary.html` — Tra từ điển
- `h1` "Tra từ điển", mô tả: "Tra nghĩa tiếng Việt của từ tiếng Trung bằng chữ Hán, pinyin hoặc nghĩa tiếng Việt: kèm âm Hán Việt, phồn thể, cấp độ HSK và phát âm."
- **Search bar**: input lớn placeholder "Chữ Hán, pinyin hoặc nghĩa tiếng Việt… (vd: 学习, xuexi, học)" + nút "Tra từ" (disabled khi input trống) + nút icon "Xoá từ khoá" (hiện khi có text) + nút "Vẽ chữ để tra" (mở modal canvas vẽ đơn giản — reuse pattern vẽ của hanzi, nút "Tra chữ này" giả lập → tra chữ 你).
- Chuẩn hoá query: bỏ dấu thanh nếu là pinyin (xuexi/xuéxí → 学习), tìm theo chữ, pinyin hoặc substring nghĩa tiếng Việt.
- **Kết quả** (không có query: hiện "Gợi ý tra nhanh": 学习 / 你好 / 时间 / 老师 / 学生):
  - Dòng "Trung → Việt" + "N kết quả cho “学习”".
  - **Entry card** (dữ liệu `js/data/dictionary.js` — ≥ 15 entry, với 学习 đủ 5 kết quả):
    - Dòng 1: chữ Hán to + pinyin từng âm (xué xí) + "(Phồn thể: (學習))" + nút 🔊 "Phát âm 学习".
    - Dòng 2: nghĩa chính + badge từ loại + badge "HSK 1" + nút "Thêm vào sổ tay" (⭐ đổi vàng + toast "Đã thêm vào Sổ tay từ vựng" + localStorage).
    - "Xem từng chữ:" link chữ → `hanzi.html?char=<chữ>`.
    - Danh sách nghĩa đánh số 1. 2. ; "Ví dụ": list câu ví dụ (zh có pinyin từng chữ màu muted + dịch + nút 🔊).
  - Dữ liệu 学习 (đúng như khảo sát): 学习 học tập — Động từ HSK 1; 学习刻苦 "học tập khắc khổ / cần cù"; 学习强国 "Tên riêng — Xuexi Qiangguo, ứng dụng của Trung Quốc thiết kế để dạy Tư tưởng Tập Cận Bình, phát hành năm 2019"; 学习时报; + 1 entry nữa. Các entry khác (你好, 时间, 老师, 学生, 汉语, 中文, 大学, 朋友, 谢谢, 再见, 电影, 电话, 医生, 苹果, 汉字): 1-3 nghĩa + 1-2 ví dụ mỗi từ.
  - Không tìm thấy: "Không tìm thấy “xyz”. Thử chữ Hán, pinyin không dấu hoặc nghĩa tiếng Việt."

## 2. Trang chủ shell đã phủ — các trang tĩnh còn lại
- `terms.html`: "Điều khoản sử dụng" — 5 mục (Chấp nhận điều khoản, Nội dung học liệu, Tài khoản, Sử dụng hợp lý, Thay đổi điều khoản).
- `privacy.html`: "Chính sách quyền riêng tư" — 5 mục (Dữ liệu thu thập, Mục đích sử dụng, Lưu trữ & bảo mật, Quyền của bạn, Liên hệ) + link "Xoá tài khoản" (→ trang đơn giản `delete-account.html` với form email + nút "Yêu cầu xoá" toast).
- `feedback.html` theo SPEC-01.

## Tiêu chí nghiệm thu
- Search 3 kiểu (chữ/pinyin/nghĩa) ra kết quả đúng; entry card đủ thành phần; vẽ chữ modal hoạt động; "Thêm vào sổ tay" cập nhật localStorage (review.html đọc được tổng).
