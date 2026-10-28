# Mascot "Mặc (墨)" — Design Doc

- **Ngày:** 2026-10-28
- **Trạng thái:** design duyệt (owner), chờ review spec → implementation plan
- **Phạm vi:** concept nhân vật mascot cho app-next (Hanzi design system) + pipeline sản xuất qua Masko API. Phần gắn vào UI theo giai đoạn (xem §6).

## 1. Bối cảnh & mục tiêu

App là nền tảng luyện HSK cho người Việt, design system **Hanzi** (7 màu cố định, token 3 lớp, Inter + Noto Sans SC). Hiện app chưa có nhân vật đại diện: onboarding, empty states, celebrate/loading đều là UI trống. Mascot tạo mặt cảm xúc cho các khoảnh khắc đó và là tài sản brand dài hạn.

**Mục tiêu:** một nhân vật duy nhất, đơn giản (nhận diện được ở 128px), sinh sản xuất bằng [Masko API](https://masko.ai/docs) (REST + SDK TypeScript, asset host CDN), gắn vào app theo giai đoạn từ rẻ đến đắt.

**Không phải mục tiêu:** mascot tương tác state-machine ngay từ đầu (Canvas của Masko để sau); multi-character cast; mascot trong logo/legal.

## 2. Nhân vật

**Tên: Mặc (墨).** 墨 nghĩa đen là *mực*; đọc Hán-Việt là "mặc". Cú mở màn khi onboarding: "Mình là Mặc — đúng chữ 墨 mà bạn sẽ học". Phương án dự phòng nếu cần thân thuộc hơn: "Mực".

**Tính cách.** Bạn đồng hành cùng học, không phải thầy giáo: tò mò, hơi vụng (hay làm đổ mực khi hồi hộp), không bao giờ phê phán — khi người học sai, Mặc động viên ("không sao, viết lại nào"), khi đúng thì phun mực ăn mừng.

**Sinh lý tiến trình.** Túi mực của Mặc là chỉ báo trạng thái: bụng trong suốt thấy mực — *cạn* khi người học bỏ lâu, *đầy* khi streak tốt. Đọc trạng thái qua mascot không cần chữ. (Chi tiết ngưỡng cạn/đầy là quyết định UI của giai đoạn gắn vào app, không nằm trong spec này.)

## 3. Thiết kế hình ảnh

- **Silhouette:** đầu tròn chiếm ~60% thân, 2 mắt to tròn, **6 xúc tu ngắn** (giảm từ 8 để vẽ sạch ở size nhỏ).
- **Màu:** thân đen-xanh theo token ink của hệ Hanzi; một accent duy nhất. Không màu ngoài token của DESIGN.md. Masko sinh asset từ prompt màu — sau khi chốt preview, so màu với token trước khi duyệt collection.
- **Chi tiết đặc trưng:** túi mực = bụng trong suốt; có thể vẽ như ốc mực nhỏ đeo ngang bụng.
- **Level-up (giai đoạn sau):** mỗi HSK wave thêm một phụ kiện nhỏ (mũ, khăn, bút lông mới). Phụ kiện là item/variant riêng trong collection, không phải nhân vật mới.

## 4. Bộ pose cốt lõi (6 items)

| # | Item | Dùng ở |
|---|------|--------|
| 1 | Idle — lắc lư, thổi bong bóng mực | mọi chỗ xuất hiện tĩnh/loop |
| 2 | Chào — vẫy xúc tu | onboarding, welcome |
| 3 | Viết — cầm bút lông viết chữ | lesson, Hanzi Studio, empty state workbook |
| 4 | Ăn mừng — phun mực hình pháo hoa | hoàn thành lesson/review |
| 5 | Động viên — vẫy xúc tu "không sao" | trả lời sai |
| 6 | Buồn ngủ — gục xuống, bong bóng Zzz | streak sắp mất, user quay lại sau lâu |

Mỗi item = 1 animation ~2s loop (webm alpha cho nền trong suốt) + 1 frame PNG tĩnh cho chỗ không chạy video.

## 5. Pipeline Masko

Mô hình Masko: Project → **Collection** (1 nhân vật: prompt + tối đa 6 ảnh reference + style card tự trích xuất, inject vào mọi prompt con) → **Item** (1 pose) → **Asset** (png/mp4/webm alpha, URL CDN).

1. Tạo project; sinh 4 preview từ-text cho design Mặc (1 credit), chốt 1 làm reference.
2. Tạo collection "Mac the ink squid" (tên ASCII cho API; hiển thị là Mặc 墨) + style card.
3. Tạo 6 items theo §4 — sinh từng item, xem trước trước khi commit animation (animation tính 5 credit/giây; ~2s ≈ 11 credit/item).
4. Tải asset về `app-next/public/mascot/` (PNG + webm alpha), tự host chứ không hotlink CDN Masko — nhất quán với quyết định audio `public/` vs R2 (static assets = edge CDN miễn phí).
5. Canvas tương tác (state machine với transition có điều kiện) chỉ cân nhắc sau khi 6 pose tĩnh đã sống trong app.

**Chi phí tham chiếu:** ảnh 1 credit, animation 5 credit/s, logo 5; free signup có 15 + 11 credit onboarding. 4 preview + 6 items ~2s ≈ 1 + 6×11 ≈ 67 credit → cần mua credit trước khi sản xuất đầy đủ (lượng mua là quyết định owner).

## 6. Gắn vào app — theo giai đoạn

1. **GĐ1 (rẻ nhất, hiệu quả nhất):** onboarding + empty states (notebook trống, review hết bài) + celebrate sau lesson/review + loading (loop quay phun mực).
2. **GĐ2:** trạng thái tiến trình (túi mực cạn/đầy theo streak), mascốt trong stats/roadmap, level-up phụ kiện theo wave.
3. **GĐ3:** Masko Canvas state machine — mascot phản ứng theo hành vi trong phiên (idle → chào khi mở app, động viên khi sai, ăn mừng khi xong).

Mỗi giai đoạn có spec/plan riêng khi đến lượt; spec này chỉ chốt concept + pipeline.

## 7. Kiểm chứng

- Preview Masko đạt: silhouette rõ ở 128×128 (co thumbnail), nền trong suốt sạch, màu khớp token ink.
- Asset webm alpha chạy trong Safari/Chrome không nền trắng; PNG fallback hiển thị đúng chỗ không video.
- Không màu ngoài 7 màu hệ Hanzi (grep/check trong review).

## 8. Mở

- Quyết định owner: mua bao nhiêu credit Masko.
- Bản quyền: asset do owner sinh từ tài khoản Masko của owner — kiểm tra license thương mại của gói khi mua (nằm ngoài spec).
- Tên hiển thị UI: "Mặc" (chính) / "Mực" (dự phòng) — chốt khi làm GĐ1.
