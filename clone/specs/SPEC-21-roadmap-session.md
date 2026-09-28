# SPEC-21: /roadmap/pinyin — timeline 8 buổi + trang buổi 4 tab + khoá tuần tự

## Bối cảnh
Vòng 2: `/roadmap/pinyin` là timeline 8 buổi, bấm buổi 1 sang trang riêng `/roadmap/pinyin/session-1` có 4 tab, buổi sau bị khoá cho tới khi hoàn thành bài kiểm tra buổi trước. Chi tiết: `GAP-ANALYSIS-ROUND2.md` GAP-12.

## A. Timeline (bổ sung cho `roadmap-pinyin.html` hiện có)
- H1 "Lộ trình pinyin", sub "8 buổi, mỗi buổi 15–20 phút — hoàn thành bài kiểm tra để mở buổi tiếp theo."
- **8 node** xếp dọc, xen kẽ trái/phải (`:nth-child(even)` dịch `translateX(±3rem)` trên desktop; mobile: 1 cột thẳng).
- Mỗi node: vòng tròn 56px (số buổi hoặc 🔒) + đường nối dọc `border-left` nối các node; card bên cạnh chứa: `h3` tên buổi, thời lượng, mô tả 1–2 dòng, trạng thái.
- Trạng thái:
  - `done` — vòng xanh ✓.
  - `current` — vòng đỏ viền đậm, card nền trắng viền đỏ, badge "Bạn đang ở đây".
  - `locked` — vòng xám 🔒, card làm mờ, hover hiện **tooltip**: "Buổi chưa mở khoá 🔒 — Hoàn thành Bài kiểm tra của Buổi N-1 để mở Buổi N". Toolcard bám cạnh node, không cần JS phức tạp (CSS `:hover` + `group`).
- Cuối timeline: marker "🚩 8 buổi · Hoàn thành chặng" căn giữa, viền đậm, kèm dòng nhỏ "Bạn mới học N/8 buổi".
- Click node `current`/trước đó → `roadmap-session.html?s=1`.

**Data** `NHAI_DATA.roadmap.pinyin.sessions[8]`:
1. "4 thanh cơ bản" — ā á ǎ à · 15 phút
2. "Thanh biến đổi" — quy tắc đặt thanh · 18 phút
3. "Nguyên âm & phụ âm" — bảng 21 nguyên âm · 20 phút
4. "Tổng hợp âm tiết" — ghép âm tiết · 20 phút
5. "Dấu thanh" — dấu thanh và thanh bậc cao · 15 phút
6. "Luyện đọc" — đọc câu ngắn · 20 phút
7. "Ngữ pháp cơ bản" — trợ từ, mạo từ · 20 phút
8. "Bài tổng kết" — ôn toàn bộ · 25 phút

## B. Trang buổi — `roadmap-session.html?s=<n>`
- Header: link "‹ Lộ trình pinyin" · `h2` "Buổi N — <tên buổi>" · progress bar mỏng (1/4 nếu chỉ học).
- **4 tab** (giữ định dạng pill, active viền đỏ): `Học` (có ✓ nếu đã xong) · `Flashcard` · `Trắc nghiệm` · `Bài kiểm tra` (có 🔒 nếu buổi trước chưa làm kiểm tra).
  - **Học** (mặc định): card lý thuyết — ví dụ buổi 1: 4 ô thanh (ā / á / ǎ / à) mỗi ô: ký hiệu thanh, tên "thanh ngang/sắc/hỏi/huyền", ví dụ chữ (妈 mā / 麻 má / 马 mǎ / 骂 mà), nút 🔊. Dưới là bảng "Tự nhận biết" 2 cột, dòng cuối nút "Đã đọc xong, sang Flashcard →".
  - **Flashcard**: dùng lại engine flashcard hiện có với 6 thẻ dữ liệu của buổi; đếm `x/N`, nút Đã thuộc/Chưa thuộc.
  - **Trắc nghiệm**: 2 câu hỏi (chọn đáp án 4 nút), hiện "Đúng x/2" + "Làm lại" sau khi trả lời hết.
  - **Bài kiểm tra**: 2 câu — 1 trắc nghiệm + 1 tự luận (input pinyin, so khớp sau bấm "Nộp bài"). Kết quả hiện điểm 2 câu, nút "Hoàn thành buổi N →" bật khi ≥1/2; bấm → đánh dấu buổi `done` trong `localStorage` `nhai.roadmap.pinyin`, quay timeline và mở khoá buổi N+1.

## C. Kích thước dữ liệu
`NHAI_DATA.roadmap.pinyin.sessions[i] = {n, title, minutes, desc, learn:[…], cards:[{hanzi,pinyin,hv,meaning}], quiz:[{q,options,answer,explain}], test:[…]}`.
Hardcode đầy đủ 8 buổi với nội dung thật (mỗi buổi 4–6 thẻ, 2 câu quiz, 2 câu test).

## Tiêu chí nghiệm thu
- Timeline 8 node xen kẽ, node 2–8 khoá (trừ buổi 1), hover node khoá hiện tooltip đúng số buổi; có marker cuối "🚩 8 buổi · Hoàn thành chặng".
- Bấm buổi 1 sang `roadmap-session.html?s=1`, thấy 4 tab đúng thứ tự; đổi tab đổi nội dung.
- Trắc nghiệm chấm điểm + "Đúng x/2" + "Làm lại".
- Bài kiểm tra chấm 1 trắc nghiệm + 1 tự luận, nút "Hoàn thành buổi N" chỉ bật khi đạt; bấm xong quay timeline, buổi 2 chuyển từ 🔒 sang trạng thái mở.
- Trạng thái persist qua reload (`localStorage`).
