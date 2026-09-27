# SPEC-00: Kiến trúc & Shell dùng chung

## Mục tiêu
Clone **UI-only** của nhaihsk.com: HTML tĩnh + **Tailwind CSS v4** (CDN browser build) + **JavaScript thuần** (ES modules, không framework, không build step). Toàn bộ dữ liệu **hardcode** trong file JS. Chỉ cần giống UI & hành vi hiển thị; không có backend thật.

## Stack & ràng buộc toàn dự án
- Tailwind v4 qua CDN: `<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>` đặt trong `<head>` của MỌI trang.
- Theme custom bằng `<style type="text/tailwindcss">` với `@theme` (xem Design tokens).
- JS: `<script type="module">` hoặc `<script src="js/xxx.js" defer>` — vanilla only. KHÔNG React/Vue/jQuery/Alpine.
- Không có build: chạy thử bằng `python3 -m http.server 8080` trong thư mục `clone/`.
- Ngôn ngữ giao diện: tiếng Việt; nội dung Trung/Việt xen kẽ như app gốc.

## Cấu trúc file
```
clone/
  index.html                  # trang chủ (/)
  course.html                 # /course + /course/{book} (?book=hsk1&skill=vocab|grammar|hanzi)
  lesson.html                 # /vocab/{book}/{page}  (?book=hsk1&page=lesson-1)
  hanzi.html                  # /hanzi và /hanzi/{char} (?char=你)
  radicals.html               # /radicals
  pinyin.html                 # /pinyin
  pinyin-practice.html        # /pinyin/practice
  sound-rules.html            # /sound-rules
  roadmap.html                # /roadmap
  roadmap-pinyin.html         # /roadmap/pinyin (+ ?step=1..n)
  review.html                 # /review
  my-vocab.html  my-grammar.html  progress.html    # login-gated
  shadowing.html              # /shadowing
  shadowing-video.html        # /shadowing/{id} (?id=EA3rwvr99Q0)
  reading.html                # /reading
  certificate-test.html       # /certificate-test
  create-file.html            # /create-file + ?tpl=stroke-order|big-char|vocab|...
  leaderboard.html            # /leaderboard (?tab=xp|battle)
  dictionary.html             # /dictionary (?q=)
  feedback.html               # /feedback
  terms.html  privacy.html    # trang tĩnh
  js/shell.js                 # PHẦN DÙNG CHUNG — đã viết sẵn, KHÔNG sửa
  js/data/*.js                # dữ liệu hardcode (window.NHAI_DATA.*)
```

## Shell dùng chung (js/shell.js — đã có sẵn)
Mọi trang chỉ cần:
```html
<!DOCTYPE html><html lang="vi"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>… | Nhai HSK</title>
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <link rel="stylesheet" href="assets/theme.css">
  <script src="js/shell.js" defer></script>
  <script src="js/data/<page-data>.js" defer></script>
  <script src="js/<page>.js" defer></script>
</head><body>
  <div data-shell></div>          <!-- shell.js inject navbar + sidebar + floating -->
  <main class="mx-auto max-w-6xl px-4 py-6">…nội dung riêng của trang…</main>
</body></html>
```
Shell inject (tự viết sẵn, clone UI của app gốc):
1. **Navbar**: logo "Nhai" + dropdown 4 nhóm (Nền tảng / Cá nhân hoá / Tra từ điển / Cộng đồng) + link trực tiếp Shadowing, Bài khoá, Luyện thi chứng chỉ, Tạo file, Bảng xếp hạng, Góp ý.
2. **Header user**: badge XP "0 điểm — mỗi câu trả lời đúng +1" + nút "Đăng nhập" (mở Login modal).
3. **Login modal**: "Đăng nhập bằng Google", "Đăng nhập bằng Apple", "HOẶC", Email + Mật khẩu, nút Đăng nhập, link Điều khoản/Chính sách, nút Close. (Không gọi API — bấm chỉ đóng modal.)
4. **Settings panel** (nút "Cài đặt" ở navbar): theme Sáng/Tối, giọng đọc Nữ/Nam, toggle "Bong bóng chat AI", toggle "Tra từ khi bôi đen". Lưu localStorage.
5. **Floating buttons** góc phải dưới: mascot "Hỏi AI" (mở panel chat AI demo có 1 câu trả lời cứng), "Nhắn tin", "Ủng hộ Nhai HSK".
6. **Banner**: dòng "HOÀNG SA, TRƯỜNG SA LÀ CỦA VIỆT NAM / 西沙（黄沙）群岛、南沙（长沙）群岛属于越南" phía trên main.
7. **Notifications region** `aria-live` (rỗng, phím tắt alt+T ghi chú).

## Design tokens (giữ trong assets/theme.css + @theme)
- Nền trang: `#fdf9f3` (kem); card trắng; border `2px solid #e7e0d4`; bo góc `rounded-lg` (8px); shadow kiểu "neo" `box-shadow: 3px 3px 0 0 #1f1e1d`.
- Màu chính: đỏ đô `#c23b22` (nút chính, active), accent xanh `#2563eb` (link), vàng điểm nhấn `#f5b301` (badge XP/sao), chữ `#1f1e1d`, muted `#6b665c`.
- Font: system-ui cho body; tiêu đề dùng `font-bold tracking-tight`. Chữ Hán: `"Noto Sans SC", "PingFang SC", sans-serif`.
- Dark mode: class `dark` trên `<html>` do settings điều khiển (token đảo: nền `#1c1a17`, card `#262320`, border `#3a352e`).

## Quy ước dữ liệu hardcode
- Mỗi domain dữ liệu 1 file `js/data/<tên>.js`, gán vào `window.NHAI_DATA.<TÊN> = …` (dùng `<script defer>` thường, KHÔNG dùng module để tránh CORS khi mở file://).
- Dữ liệu phải **thực chất** (copy từ app gốc hoặc mẫu chuẩn HSK), không phải lorem.
- TTS: hàm dùng chung `NHAI.speak(text, lang='zh-CN')` trong shell.js dùng `speechSynthesis` (nếu có), fallback im lặng. Nút phát âm ở mọi trang gọi hàm này.

## Điều hướng giữa các trang tĩnh
Route gốc → trang tĩnh + query params:
- `/` → `index.html`; `/course/hsk1?skill=grammar` → `course.html?book=hsk1&skill=grammar`
- `/vocab/hsk1/lesson-1` → `lesson.html?book=hsk1&page=lesson-1`
- `/hanzi/你` → `hanzi.html?char=你`; `/shadowing/EA3rwvr99Q0` → `shadowing-video.html?id=EA3rwvr99Q0`
Shell.js tự ghi đè link trong navbar theo sơ đồ này.

## Tiêu chí nghiệm thu tổng
- Mở được mọi trang qua http.server, không lỗi console (trừ thiếu audio).
- Navbar/dropdown/modal/floating hoạt động trên mọi trang, giống vị trí app gốc.
- Responsive: ≥768px giống app gốc; dưới 768px navbar thu thành nút Menu (sidebar trượt).
