# XieHanzi.com — Bản đồ tính năng (RE ngày 2026-11-05)

> Reverse-engineer bằng browser thật (Chrome qua CDP), click thử từng nút trên toàn bộ cây menu.
> Mọi thông tin dưới đây là **quan sát trực tiếp trên UI**, không suy đoán.

## 1. Cây menu → tính năng

### Nav chính (header, mọi trang)

| Mục | Loại | Trỏ tới |
|---|---|---|
| **Học** | link | `/hoc/` — dashboard lộ trình |
| **Từ điển** | link | `/tra-chu/` |
| **Luyện tập** ▾ | dropdown | 10 công cụ luyện (nhóm Viết / Nghe-Nói-Gõ / Từ vựng-Ngữ pháp / Tra cứu / Trò chơi) |
| **Lộ trình** ▾ | dropdown | 5 bộ giáo trình + cây cấp/quyển + preview bài trong cấp đang chọn |
| **Thi thử** ▾ | dropdown | Kiểm tra HSK / Đề kiểm tra / Kiểm tra ngữ pháp |
| **Ôn tập** | link | `/hoc/on-tap/` |
| 🔍 Tìm kiếm | modal | search toàn cục |
| 🌙 Dark mode | toggle | — |
| 🐹 **Capy** (avatar, badge số tin) | chat drawer | trợ lý AI kèm app |

### A. Khu HỌC — `/hoc/` (lõi sản phẩm, theo HSK 3.0 ban hành 11/2025)

Dashboard `/hoc/`:
- **Lộ trình 9 cấp × chặng** (bài → chặng → bước), khóa tuần tự, "0/40 chặng" mỗi cấp
- **Buổi học hôm nay**: đúng 1 phần mới/ngày ("Mỗi buổi một phần mới vừa sức, để từ mới kịp ôn những ngày sau")
- **Streak + mục tiêu tuần** (2–7 buổi, chọn trên `/hoc/thoi-quen/`)
- Nút **"Mình đã biết pinyin"** → skip toàn bộ phần Âm và thanh, vào thẳng chương 1 (placement ngắn)
- **Ôn hôm nay / Sổ lỗi** ngay trên dashboard
- **Kiểm tra cuối cấp**: 40 câu (Nghe 20 + Đọc 20), đạt 80% → xong cấp; **thử sớm được** không cần học xong
- Link **Tiến độ**, nguồn dữ liệu ghi rõ "Theo Đề cương thi HSK (HSK 3.0, ban hành 11/2025)"

Trang chặng `/hoc/chang/hsk30.L1.P1` — **5 bước mỗi chặng**:
1. **Từ mới** (~6') — từng từ: quiz nghe **đoán thanh điệu** (không tính điểm) → thẻ chi tiết (nghĩa, Hán Việt, mẹo nhớ, câu ví dụ bā bá bǎ bà)
2. **Hội thoại** (~4') — dialogue có cốt truyện (Tiểu Văn gọi video cho bố mẹ…), từng câu có nút Nghe + **"Nói theo"**, xong 2 câu hỏi trắc nghiệm
3. **Nhập vai 1** (~5') — role-play: chọn câu đáp lại theo tình huống → **thu micro nói**, hệ thống chấm
4. **Nhập vai 2** (tuỳ chọn, ~5')
5. **Luyện đề** (~4') — mini-thi format HSK: nghe audio → chọn tranh A/B/C

Kết thúc hoạt động: **màn tổng kết** (số đúng/%, thời gian, +XP, streak), mascot Capy ăn mừng. Block **Văn hoá** riêng ở mỗi chặng (gì gọi bố mẹ bạn bè là 叔叔/阿姨…).

Các trang /hoc khác:
| Trang | Làm gì |
|---|---|
| `/hoc/hom-nay/` | Buổi hôm nay: ôn thẻ đến hạn trước → học 1 phần mới. Có "Bỏ qua phần này" |
| `/hoc/on-tap/` | SRS: thẻ đến hạn, **7 dạng cấu hình**: Ẩn pinyin khi ôn (switch), chế độ câu hỏi: Trộn theo độ thuộc / Chỉ chọn đáp án / Ưu tiên nghe-viết / Ưu tiên gõ pinyin. Lịch 7 ngày tới |
| `/hoc/so-loi/` | **Sổ lỗi**: lỗi chỉ thoát khi "đúng 2 lần, ở 2 dạng khác nhau, vào 2 ngày khác nhau". Lọc theo loại lỗi (Nghĩa…), chi tiết từng lỗi (trả lời gì, đáp án, vì sao, Đã đúng 0/2), nút "Luyện lại" và "Bỏ khỏi sổ" |
| `/hoc/tien-do/` | **Bản đồ 7 kỹ năng** (Nghĩa, Phát âm, Nghe, Viết, Nói, Ngữ pháp, Thanh điệu) — mỗi skill một progressbar; **Kế hoạch ôn thi** (nhập ngày thi); **Dự đoán điểm** (cần 40 câu trả lời + 1 thi thử); **Báo cáo tuần** |
| `/hoc/thoi-quen/` | Streak + **đóng băng chuỗi** (học 7 ngày liền = 1 lượt đóng băng, giữ tối đa 2; đứt chuỗi 7+ ngày có cơ chế lấy lại trong 3 ngày); tuần này đã học; mục tiêu tuần 2–7 buổi; **5 huy hiệu** (Thuộc 50 từ, Viết 25 chữ, Shadowing 30 câu, Chuỗi 7 ngày, Xong HSK 1) |
| `/hoc/kiem-tra-cap/L1/` | Thi cuối cấp (đã nói trên) |
| `/hoc/tu-da-hoc/` | Danh sách từ đã học |
| `/hoc/bat-dau/` | "Tìm lộ trình phù hợp" — 3 câu hỏi ~1 phút |

### B. Khu LUYỆN TẬP (công cụ, dùng ngay không cần login)

| Công cụ | URL | Làm gì |
|---|---|---|
| **Từ điển Hán-Việt** | `/tra-chu/` | Tra bằng chữ Hán / pinyin / nghĩa Việt / **viết tay**. Browse theo tab: HSK 3.0 / HSK 2.0 / **Bộ thủ** / Hán Việt. "Chữ hôm nay" + thành ngữ hôm nay. Lịch sử tra lưu local |
| **Trang chữ Hán** | `/han-tu/爱/` | Sâu nhất app: phát âm, **cấu tạo chữ = bộ phận × thành phần** (click xuống từng thành phần), loại từ + quy tắc ngữ pháp, **mẹo nhớ**, ví dụ câu từng-chữ-thanh-điệu + nghe, từ ghép, Hán Việt, **tự nguyên 4 kiểu chữ** (Bạch thư / Đại triện / Tiểu triện / Lệ thư), chữ dễ nhầm + cùng bộ/cùng âm, **bản đồ liên kết** tương tác, **mẹo nhớ cộng đồng vote**, **tên Việt dùng chữ này** (crowdsourced), "Thêm vào ôn tập", luyện viết chữ + tải GIF bút thuận, mục lục neo |
| **Tạo vở tập viết** | `/tao-vo-tap-viet/` | Nhập chữ → 24 mẫu giấy (田字格, 米字格, nét mờ…) → preview → **xuất PDF / in**. Sửa nghĩa + phiên âm từng chữ. Lưu bài tập + chia sẻ. Giấy phép giáo viên in cho lớp |
| **Bút thuận chữ Hán** | `/tai-gif-but-thuan/` | GIF thứ tự nét từng chữ, tải về / nhúng trang |
| **Luyện gõ pinyin** | `/luyen-go/` | Gõ pinyin không dấu → chữ Hán, 3 chế độ (chữ đơn / từ ghép / câu), chọn cấp HSK 1–9, 20–100 chữ/lượt, phím `?` hé lộ, `Esc` thoát |
| **Chép chính tả video** | `/luyen-chep-chinh-ta/` | Nghe video YouTube (comprehensible input: Speak Your Chinese, Blabla Chinese, Lazy Chinese, Tingting…), gõ lại từng câu chữ Hán; sai tô màu, đúng mở pinyin + nghĩa |
| **Luyện nghe** | `/luyen-nghe/` | 3 chế độ theo bài học lộ trình: nghe gõ từ / nghe điền từ / nghe chép cả câu (chậm 0.75x, 0.5x) |
| **Luyện nói** | `/luyen-noi/` | **Chấm phát âm từng chữ qua micro**: Đọc từ vựng / Đọc câu / Hội thoại theo chủ đề. Điểm theo thanh điệu, âm đầu, vần + nhận xét tiếng Việt. Chọn trước có lưu bản ghi không |
| **Thêm pinyin** | `/them-pinyin/` | Dán văn bản → pinyin trên đầu mỗi chữ |
| **Dịch Việt-Trung** | `/dich-tieng-trung/` | Tự nhận chiều, 1000 ký tự, giản/phồn thể, kèm pinyin |
| **Flashcard PDF** | `/flashcard-pdf/` | Thẻ 2 mặt cắt rời, in A4 |
| **Ngữ pháp** | `/ngu-phap/` | 46–101 điểm ngữ pháp mỗi cấp HSK 1–6 (HSK1: 46 điểm), mỗi điểm có cấu trúc + giải thích + ví dụ + **Luyện tập riêng** + đánh dấu đã xem; điều hướng thẻ trước/sau/ngẫu nhiên |
| **Trò chơi** | `/tro-choi/` | 2 game + 1 ẩn: **Tìm chữ trong chữ 字中找字** (ghép nét tìm chữ ẩn, 3 mức), **Ghép thành ngữ 汉字消消乐** (mạt chược + điền 成语), **Trường Thầy Đồ** `/thay-do/`. Thử thách mỗi ngày (cùng bộ đề cho mọi người) + **bảng xếp hạng tuần** theo mức khó |
| **Sổ tay** | `/so-tay/` | Bộ sưu tập cá nhân: 4 tab (Chữ Hán & từ ♥ / Bài tập viết / Bản dịch pinyin / Ghi chú đề thi). Từ lưu ♥ tự vào ôn tập, tối đa 20 từ mới/ngày |

### C. Khu THI THỬ

| Trang | Làm gì |
|---|---|
| `/kiem-tra-hsk/` | **6 đề mẫu chính thức HSK 3.0 (CTI / chinesetest.cn)** — đáp án theo đáp án gốc, mỗi cấp 1 đề + **60 đề luyện XieHanzi** (10 đề × 6 cấp, đúng cấu trúc: HSK1 40 câu/40'… HSK6 82 câu/125'), làm theo giờ thật, chấm ngay |
| `/kiem-tra-hsk/hskN/noi/` | **Luyện nói phần thi HSK 3.0** từ cấp 3–6, có nhận xét tiếng Việt |
| `/de-kiem-tra/` | **Tự sinh đề**: chọn nhiều cấp trộn, chọn phần thi (Nghe 825 / Đọc 825 / Viết 220 câu), 10/20/40/tuỳ chỉnh câu, chế độ Luyện tập (không giờ), **tạo link chia sẻ đề** |
| `/kiem-tra-ngu-phap/` | Trắc nghiệm + dịch theo cấp HSK, chấm ngay |

### D. Capy — trợ lý AI (signature thứ 2)

- Nút avatar "Capy, N tin chưa đọc" + chat drawer: "Hỏi mình về bài học, mình ở đây"
- **Nói chuyện bằng giọng** (voice mode), nút "Nghe" từng tin nhắn (mọi reply đều có TTS)
- **Chủ động nhắn tin**: gợi ý buổi hôm nay (~7 phút, bài cụ thể), phát hiện "Câu 八 vừa rồi hơi khó nhỉ" và đề nghị giải thích lỗi
- Quick-actions: "Hôm nay mình nên học gì?" / "Giải thích lại lỗi mình vừa sai" / "Cho mình một mẹo nhớ từ mới" / "Capy nhớ gì"
- Kết quả trả lời có **action button gắn app** ("Mở Học bài hôm nay" → ✓ Đã xác nhận)
- Capy xuất hiện **trong từng bài học** (mascot ở mọi màn), tính nhân vật xuyên suốt

### E. Phần còn lại

- Footer: Fb/Messenger/YouTube, điều khoản, **trang xoá tài khoản**, status.xiehanzi.com
- `/tai-app` (PWA/app), "Gửi góp ý" floating, dark mode
- Nền tảng: **miễn phí, không cần đăng nhập để dùng công cụ**; đăng nhập chỉ để lưu điểm game/bảng xếp hạng; "Nền tảng học tiếng Trung cho người Việt" — Made in 🇻🇳

## 2. Kiến trúc học tập nổi bật (tổng hợp)

1. **Lộ trình = dữ liệu sơ đồ hoá theo Đề cương HSK 3.0 mới (11/2025)** — 9 cấp, 11.460 từ, mỗi chặng 5 bước có thời lượng ước tính, khóa tuần tự + placement skip.
2. **5 bước/chặng là loop khép kín**: Từ mới → Hội thoại (có cốt truyện) → Nhập vai (micro, chấm) → Luyện đề (format HSK chọn tranh) → Văn hoá. Học ngữ âm trước từ vựng (Bài 1 = 4 thanh, không phải 你好).
3. **Sổ lỗi có "nghĩa vụ 2-2-2"**: đúng 2 lần × 2 dạng × 2 ngày mới thoát — chặt hơn SRS thường.
4. **7 chiều đo tiến độ** (bản đồ kỹ năng) + dự đoán điểm thi + kế hoạch ôn theo ngày thi nhập vào.
5. **Gamification tiết chế nhưng đủ**: streak + đóng băng (7 ngày = 1 lượt, max 2) + lấy lại chuỗi + 5 huy hiệu chỉ trao "tiến bộ thật".
6. **Công cụ in-giấy là moat SEO**: vở tập viết PDF 24 mẫu, flashcard A4, GIF bút thuận — tính năng mà app đối thủ không có, cộng giấy phép giáo viên in cho lớp.
7. **Đề thi dùng đề mẫu CTI chính thức** + nói rõ nguồn (chinesetest.cn), minh bạch "vì sao chỉ 6 đề".

## 3. Tính năng signature — khác biệt nhất so với app học tiếng Trung khác

**№1 — Chặng học 5 bước theo kịch bản narrative + Nhập vai nói có chấm điểm:**
mỗi chặng không phải flashcard lặp mà là **một mini-story có nhân vật** (Capy + Tiểu Văn + bạn đồng hành), học từ → nghe hội thoại có cốt truyện và cả **lỗi phát âm có chủ đích** (bạn đồng hành đọc nhầm 爸爸→八八 để dạy thanh nhẹ) → **role-play với micro** chấm từng chữ (thanh điệu/âm đầu/vần) → mini-thi đúng format đề HSK (nghe-chọn-tranh). Mức độ "script hoá bài học" này (story + wrong-answer-on-purpose + role-play graded) là điều Duolingo/HelloChinese/HSK Online không có trọn vẹn.

**№2 — Capy, trợ lý AI chủ động** ở mọi nơi: nhắn tin trước cho người học (hôm nay nên học gì, "câu vừa rồi khó nhỉ, giải thích không?"), voice mode, mọi tin nhắn nghe được, và **bấm là hành động** (mở bài, mở phần giải thích). AI gắn state học thật chứ không phải chatbot trôi nổi.

**№3 — Sổ lỗi 2-2-2 + bản đồ 7 kỹ năng + dự đoán điểm thi**: hệ thống đo lường sâu kiểu "học để thi" nhưng trình bày dễ hiểu cho người Việt (tất cả UI 100% tiếng Việt, mẹo nhớ dùng Hán Việt quen thuộc —vd "bát = tám").

**(Bonus SEO-growth signature)**: bộ công cụ **in giấy** (vở tập viết 24 mẫu, flashcard A4, GIF bút thuận) + **trang chữ Hán cực sâu** (tự nguyên 4 kiểu chữ, bản đồ liên kết, mẹo nhớ cộng đồng, tên Việt dùng chữ này) — magnet kéo traffic từ Google rồi chuyển vào lộ trình học.

## 4. Bài học cho hsk app của mình

- Model **chặng = 5 bước có thời lượng** + activity riêng biệt đã rất hiệu quả về flow; app hsk đang có lesson/review/shadowing riêng lẻ, có thể học cách "kịch bản hoá" thành buổi học một-phần-mỗi-ngày.
- **"Mỗi ngày 1 phần mới vừa sức"** — giới hạn này là quyết định thiết kế lộ trình tốt (anti-burnout), nên cân nhắc cho roadmap journey.
- **Sổ lỗi 2-2-2** là cơ chế cụ thể hoá "mastered" tốt hơn chỉ khoảng cách SRS.
- **Capy chủ động nhắn + action button** — mascot Mặc (墨) của mình có thể được nâng cấp theo hướng này (đã có spec 3 giai đoạn).
- Điểm yếu họ vẫn còn: luyện nói chỉ có ở luyện đề/nhập vai/công cụ, không có shadowing-đo-từng-từ như app mình; dictation video của họ đơn giản hơn shadowing có karaoke timing của mình.
