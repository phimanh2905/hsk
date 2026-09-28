# HANDOFF — Chạy computer-use test UI clone Nhai HSK (dành cho phiên ZCode mới)

> Điều kiện: helper **"ZCode Computer Use"** (bundle `dev.zcode.cua-helper`, app tại `~/.zcode/computer-use/ZCode Computer Use.app`) đã có **Accessibility** + **Screen Recording** = ON trong System Settings → Privacy & Security (thêm bằng nút "+", KHÔNG phải app "ZCode" chính). Kiểm tra nhanh trong phiên mới: `agent.computerUse.requestAccess(["accessibility","screen"])` phải trả về `accessibility: "granted"`.

## Chuẩn bị
1. Server: `cd /Users/manhphi/Documents/hsk/clone && python3 -m http.server 8080` (kiểm tra: `curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/index.html` → 200).
2. Bind Chrome: `const chrome = await agent.computerUse.getApp({ bundle_id: "com.google.Chrome" });` — nếu Chrome không đọc được AX tree, dùng Safari (`com.apple.Safari`).
3. Điều hướng: `cmd+t` → type URL → `Return` → chờ 1.5s → `getAXStateAndScreenshot()`.

## Checklist test (URL → những gì phải thấy — nguồn: specs/SPEC-01..09)

| # | URL | Bắt buộc thấy (đối chiếu spec) |
|---|---|---|
| 1 | `index.html` | "Chào bạn 👋", section "HSK 3.0" 7 card (Nhai HSK 1 "333 từ vựng · 41 mẫu" … HSK 7-9 "5606 từ vựng"), banner Hoàng Sa/Trường Sa, floating 🤖 + Nhắn tin + Ủng hộ |
| 2 | `course.html` | Kệ sách 7 card có số bài |
| 3 | `course.html?book=hsk1` | breadcrumb + badge "Nhai", h1 "HSK 1 3.0", 3 tab pill (Từ vựng active đỏ), "0/15 bài", 15 bài đúng tên (1 Xin chào! … 15 Hẹn gặp ở sân bay!), nút Tổng ôn |
| 4 | `course.html?book=hsk1&skill=grammar` | 5 bài ngữ pháp có 🔒, bấm mở modal Đăng nhập (Google/Apple/Email) |
| 5 | `lesson.html?book=hsk1&page=lesson-1` | Flashcard thẻ 你好 + "Đại từ"?? (từ 1 = Cụm từ), "Click để lật", sidebar 7 chế độ badge không "null", counter 1/13, nút ZH→VI/Tự động/Xáo trộn |
| 6 | (click card) | Lật: pinyin nǐ hǎo + NHĨ HẢO + Xin chào |
| 7 | (click "Trắc nghiệm") | Đề + 4 đáp án pinyin + "Không biết" + "Bí quá thì nghe" |
| 8 | (click "Gõ từ") | Ô "_ _ _ _", input "Gõ pinyin, số là thanh điệu (ni3 → nǐ)", Gợi ý (0/5), Kiểm tra |
| 9 | (click "Đấu trí") | Mô tả 5 dạng câu, Top 10 (🥇 Thùy Trâm 13/13 0:25.9), nút "Bắt đầu thi" |
| 10 | `hanzi.html?char=你` | Khung chữ 你, "你 - NHĨ", Âm Hán Việt NHĨ (còn đọc: NỄ), 7 nét, Bộ thủ 亻, cấu tạo 亻 尔, Hội ý, sidebar Từ vựng trong sách + Thực chiến (你妈…), "Chữ sau 好"; bấm "Thứ tự nét" → animation |
| 11 | `radicals.html` | "214 Bộ Thủ", deck 1/214 thẻ 一 (Nhất), grid nhóm "1 nét (6 bộ)" |
| 12 | `pinyin.html` | Bảng thanh mẫu × vận mẫu, pill filter, bấm ô "ba" → popup 4 thanh bā bá bǎ bà |
| 13 | `pinyin-practice.html` | 10 câu, counter, "Đúng X/10" khi xong |
| 14 | `sound-rules.html` | Bảng thanh điệu (ngang 61%/32%…), quy tắc âm đầu/vần, 5 câu bài tập |
| 15 | `roadmap.html` | "Hành trình của bạn 🚩", 6 chặng 拼音→7-9级, card Tổng ôn |
| 16 | `roadmap-pinyin.html?step=4` | 4 thanh mā má mǎ mà, stepper đỏ bước 4 |
| 17 | `review.html` | "Thống kê học tập", 6 ô 0, "Bộ thẻ đang trống" + "Vào kệ sách" |
| 18 | `shadowing.html` | 5 nhóm (DaihuaXiyou 84, 我的爸爸是條龍 111, Sơ Cấp 22, An Khả Hy 100, Simple Days 79), 4 card/nhóm |
| 19 | `shadowing-video.html?id=EA3rwvr99Q0` | 2 mode, YouTube iframe (hoặc banner fallback TTS), player Câu trước/Lặp lại/Play/Câu sau, "Câu 1/9", BẢN CHÉP #1 active vàng 啊! 我才离开几天!…, toggle Pinyin/Trans |
| 20 | `reading.html` → "Dùng văn bản mẫu" → "Tạo bài đọc" | 291/3000, karaoke 13 câu, "Phát cả bài", Dịch, Pinyin |
| 21 | `certificate-test.html` | 10 card (H1…7-9, K1-K3) badge "Sắp ra mắt", bấm → toast |
| 22 | `create-file.html?tpl=vocab` | Preview A4 "Họ tên/Ngày", 你好 (nǐ hǎo) NHĨ HẢO - Xin chào, ô tô chữ mờ, "2 trang", nút "Đăng nhập để in"; hub có gate mã `FREEHSK` |
| 23 | `dictionary.html?q=学习` | "5 kết quả cho 学习", entry 学习 xué xī (Phồn thể: 學習) HSK 1 + Thêm vào sổ tay + Xem từng chữ |
| 24 | `leaderboard.html?tab=battle` | Tab "Đấu trí tháng" active, 10 hàng |
| 25 | `my-vocab.html` | 🔒 "Đăng nhập để xem" + nút Đăng nhập |

## Fix loop
- Lỗi render rỗng → kiểm tra console (giữ tab mở, `chrome` AX hoặc dùng browser-use IAB evaluate). Lỗi kiểu "script defer chạy trước DOMContentLoaded" đã sửa toàn repo (boot chờ DOMContentLoaded) — không tái diễn.
- Mọi fix: `node --check` file JS → reload với `?_v=<Date.now()>` (IAB/Chrome cache mạnh) → chụp lại → `git add -A && git commit`.
- KHÔNG sửa `js/shell.js`/`assets/theme.css` trừ khi lỗi nằm ở đó; ownership chi tiết trong `README.md`.
