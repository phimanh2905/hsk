# SPEC-06: Shadowing — thư viện video (`shadowing.html`) + trình học video (`shadowing-video.html`)

## 1. `shadowing.html` — Thư viện
- `h1` "Shadowing & Chép chính tả", mô tả "Chọn video để luyện nghe, bắt chước phát âm hoặc viết chính tả — toàn bộ là video tiếng Trung thực tế."
- **Nhóm theo kênh** (`js/data/shadowing.js` → `NHAI_DATA.shadowing.categories`), mỗi nhóm: `h2` "Tên (N bài học)", mô tả 1 dòng, link "XEM TẤT CẢ" → `shadowing.html?cat=<slug>` (filter chỉ nhóm đó), grid 4 video card.
  1. **DaihuaXiyou 呆話西遊 (84 bài học)** — "DaihuaXiyou Official – Laugh out your six-pack abs! 《呆話西遊》，目標讓你笑出腹肌！" — 4 video: 墓碑上的QR碼，別掃。(366 · HSK3 · 2:46 · id EA3rwvr99Q0), 就這智商，還佔便宜？(74 · HSK3 · 1:06 · sXo-yHFkAio), 又要漲工資？！(25 · HSK3 · 2:21 · NkYwdZhkHF0), Why does he always drive me crazy?! (11 · HSK3 · 1:01 · FuIOkW6eaRA).
  2. **我的爸爸是條龍 (111 bài học)** — "我的爸爸是條龍 — 家庭 What a funny family! + 愛情 What is true love?" — 4 video (id J0P6fPl6cho 44 · HSK3 · 1:18; FxpyzLt3wRQ 12 · HSK3 · 3:04; 09kHjxsFUA4 10 · HSK3 · 1:44; z1v9d303Xm0 5 · HSK3 · 2:08).
  3. **Tiếng Trung Sơ Cấp (22 bài học)** — "Phù hợp với HSK 1-3" — 4 video podcast (6YGJswSorYw 3.1k · HSK1 · 5:00; 83THdBdTy7U 235 · HSK2 · 4:52; o6ilprwO6w0 114 · HSK1 · 7:05; QwlhcsAMhT0 215 · HSK1 · 4:42).
  4. **Tiếng Trung Sơ Cấp · An Khả Hy (100 bài học)** — "【HSK1-3】Tiếng Trung sơ cấp / người mới bắt đầu — Beginner Chinese | An Khả Hy" — 4 video (H3aRI3ypx_0 80 · HSK1 · 4:29; 3p9uGOLgVds 7 · HSK1 · 4:29; 2pCgqjBBgGU 8 · HSK1 · 4:35; BLEN82k2vDE 10 · HSK1 · 4:28).
  5. **Simple Days, Simple Chinese · 简单生活，简单汉语 (79 bài học)** — "Chinese Daily Podcast — Simple Days, Simple Chinese" — 4 video (DQBzSl3OM1I 16 · HSK3 · 15:48; tQKsIFE-Y0g 3 · HSK3 · 16:19; wZDej3Logc4 1 · HSK3 · 14:27; XDpsIrpLEOQ 8 · HSK2 · 14:19).
- **Video card**: thumbnail (placeholder gradient + chữ 短片, KHÔNG tải ảnh YouTube — offline), badge lượt học (số), badge HSK cấp (viền đỏ), badge "YouTube", thời lượng góc phải, `h3` tiêu đề, tên kênh. Link → `shadowing-video.html?id=<id>`.
- `?cat=<slug>`: chỉ hiện nhóm đó + breadcrumb "← Tất cả nhóm".

## 2. `shadowing-video.html?id=…` — Trình học
- **Thanh công cụ trên**: 2 nút mode "Bắt chước phát âm" / "Nghe - Viết chính tả" (active đỏ — đổi chế độ), "Ẩn video" (collapse iframe), "Phím tắt" (mở dialog liệt kê: Space play/pause, ← → câu trước/sau, R lặp lại), breadcrumb "← Quay lại" → `shadowing.html`.
- **Player区**: `h1` tiêu đề video + badge HSK3. Video: **iframe YouTube nhúng thật** `https://www.youtube-nocookie.com/embed/<id>?enablejsapi=1` (nếu offline, khung vẫn hiện, có overlay "Video YouTube — cần kết nối mạng"). Dưới video: thanh điều khiển **theo câu**: "⏮ Câu trước", "🔁 Lặp lại", "▶/⏸" (nút to), "⏭ Câu sau", toggle "Tự ngắt câu" (switch), "Bản dịch", "Pinyin", tốc độ "1x" (menu 0.5/0.8/1/1.5/2), "Cài đặt" (dialog: font size transcript, tự cuộn).
- Điều khiển câu = JS điều khiển iframe qua `postMessage` YouTube API (play/pause/seekTo theo `subtitle[i].start/end`). **Nếu YouTube bị chặn**: fallback mode "Dùng TTS đọc câu" (TTS từng câu zh) — auto chọn khi iframe không load trong 4s.
- **BẢN CHÉP** (`h2`): hàng nút toggle "Pinyin" / "Trans" / "Ẩn"; list câu đánh số `#1 #2…` — mỗi câu là button: text zh chia theo câu con (span bấm được), pinyin (toggle), bản dịch việt (toggle), nút "Báo lỗi" (toast "Đã gửi báo lỗi — cảm ơn bạn!"). Câu đang phát: nền vàng nhạt + tự cuộn vào view.
- **Dữ liệu** (`js/data/shadowing.js` → `subtitles`): **đủ phụ đề cho EA3rwvr99Q0** ≥ 9 câu, mỗi câu `{n, start, end, parts:[{zh}], pinyin, vi}` — dùng đúng nội dung đã khảo sát: 
  #1 啊! 我才离开几天! 你们怎么就都没了呀! 没你们我可怎么我啊! — Á! Mình mới đi có mấy hôm thôi mà! Sao các cậu lại thế này? Không có các cậu mình biết làm sao bây giờ! — Á! Wǒ cái líkāi jǐ tiān! Nǐmen zěnme jiù dōu méi le ya! Méi nǐmen wǒ kě zěnme wǒ a!
  #2 电子遗言? 这么高级啊? — Di chúc điện tử? Cao cấp vậy cơ à?
  #3 我是妾女幽魂。你是我的命采臣。快来吧! 我的玉帝哥哥! — Ta là oán hồn của một nàng thiếp. Còn ngươi là người định mệnh của ta. Đến đây đi! Anh trai Ngọc Hoàng của ta!
  #4 啊! 我的妈呀! — Á! Mẹ ơi!
  #5 退! 退! 退! 退! 退! 退! 退! 退! — Lùi! Lùi! Lùi! Lùi! Lùi! Lùi! Lùi! Lùi!
  #6 惊喜? — Bất ngờ à?
  #7 师傅, 十万元。 — Sư phụ, một trăm ngàn tệ.
  #8 哦? 哎呀呀呀呀呀呀呀呀! — Ôi? A a a a a a a a!
  #9 跟你说了多少遍了? 不要乱扫二文码! 不要乱扫二文码! — Mình đã bảo cậu bao nhiêu lần rồi? Đừng có quét mã QR bừa bãi! Đừng quét mã QR bừa bãi!
  (start/end giả lập tăng dần 0→165s). Các video khác: 5-8 câu mẫu tự viết.

## Mode "Nghe - Viết chính tả" (dictation)
- Khu giữa video & transcript: hiện ô input lớn "Gõ những gì bạn nghe được (chữ Hán hoặc pinyin)" + nút "Nghe câu này" 🔊; "Kiểm tra" so với câu hiện tại (bỏ qua dấu cách/dấu thanh); đúng → ✅ xanh; sai → highlight chữ sai màu đỏ + hiện đáp án. Nút "Bỏ qua câu này".

## Mode "Bắt chước phát âm" (mặc định)
- Chỉ phát + transcript (như trên), thêm nút "🔁 Ghi âm của bạn" — dùng `getUserMedia`+MediaRecorder (nếu trình duyệt cho phép; từ chối im lặng) với nút record đỏ/stop + playback list tạm.

## Tiêu chí nghiệm thu
- Thư viện đủ 5 nhóm 4 card; mode đổi được; transcript câu active highlight + bấm câu nhảy câu; dictation chấm được; phím tắt dialog mở được.
