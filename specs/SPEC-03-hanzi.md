# SPEC-03: Phân tích Hán tự (`hanzi.html`) + Chi tiết chữ (`hanzi.html?char=…`)

## Dữ liệu: `js/data/hanzi.js`
`NHAI_DATA.hanzi`:
- `chars`: map chữ → chi tiết. Bắt buộc có **你** đầy đủ: `{ hanzi:"你", hanViet:"NHĨ", hanVietAlt:"NỄ", pinyin:"nǐ", level:"HSK 1", strokes:7, radical:"亻", radicalLink:true, composition:["亻","尔"], type:"Hội ý", meaning:"bạn (ngôi thứ hai thông dụng, khác với kính trọng 您 [nín]); bạn. Lưu ý: Ở Đài Loan, 妳 được dùng để chỉ nữ giới, nhưng ở Trung Quốc đại lục không phổ biến.", vocabInBook:[{word:"你好", py:"nǐ hǎo", hv:"NHĨ HẢO", vi:"Xin chào", link:"lesson.html?book=hsk1&page=lesson-1"}, {word:"你们", py:"nǐmen", hv:"NHĨ MÔN", vi:"Các bạn", link:…}, {word:"你", py:"nǐ", hv:"NỄ", vi:"Bạn", link:"lesson.html?book=hsk1&page=lesson-2"}], practical:[{word:"你妈", py:"nǐ mā", vi:"(thán từ) mẹ mày"}, {word:"你我", py:"nǐ wǒ", vi:"bạn và tôi; mọi người"}, {word:"你等", py:"nǐ děng", vi:"tất cả các bạn (cổ)"}, {word:"迷你", py:"mí nǐ", vi:"mini (như trong váy ngắn hoặc xe Mini Cooper) (từ mượn)"}, {word:"随你", py:"suí nǐ", vi:"tuỳ bạn"}, {word:"你个头", py:"nǐ ge tóu", vi:"(khẩu ngữ) cái quái gì!; ừ, đúng rồi! (mỉa mai)"}, {word:"你真行", py:"nǐ zhēn xíng", vi:"bạn giỏi thật (thường mỉa mai, đôi khi tán thưởng)"}, {word:"去你的", py:"qù nǐ de", vi:"Đi chỗ khác chơi!"}, {word:"算你狠", py:"suàn nǐ hěn", vi:"cậu giỏi lắm!; cậu thắng rồi!"}, {word:"迷你裙", py:"mí nǐ qún", vi:"váy ngắn mini"}, {word:"你情我愿", py:"nǐ qíng wǒ yuàn", vi:"cả hai đều sẵn lòng; tự nguyện cả đôi bên"}, {word:"你死我活", py:"nǐ sǐ wǒ huó", vi:"nghĩa đen: bạn chết, tôi sống (thành ngữ); kẻ thù không đội trời"}] }`.
- Thêm ~24 chữ bài 1 HSK1 (你好王老师大大学生们您谢不客气同再见请问叫什么名字我是对起没关系事很高兴认识也) với data rút gọn: pinyin, hanViet, level, strokes, radical, type, meaning 1 câu. Chữ thành phần (亻, 尔, 亠, 口, 木…) có bản rút gọn tương tự.
- `levels`: danh sách sách HSK1→7-9 + số chữ mới mỗi sách (HSK1: "247 chữ Hán mới trong cuốn này").

## Màn 1: Phân tích Hán tự (không có `?char`)
- `h1` "Phân tích Hán tự", mô tả: "Gõ hoặc vẽ một chữ Hán để xem nghĩa, pinyin, âm Hán Việt, thứ tự nét, bộ thủ và cấu tạo chữ."
- **Card "Tìm chữ Hán"**: combobox/input "Nhập chữ Hán hoặc từ…" — gõ hiện gợi ý autocomplete (lọc theo chữ hoặc pinyin không dấu); chọn → `?char=`.
- **Card "Hoặc vẽ chữ Hán"**: canvas 280×280 có grid 4×4 nét mờ + chữ "Vẽ chữ Hán vào đây"; 2 nút "Xoá nét cuối" / "Xoá hết" (disabled khi canvas trống). Vẽ bằng pointer events (mousedown/move/up + touch); KHÔNG cần nhận diện thật — sau khi vẽ ≥1 nét hiện gợi ý giả "Có thể là: 你 / 好 / 学" bấm được → `?char=`.
- **"Khám phá chữ Hán theo cấp độ"**: pills HSK 1 / HSK 2 / … / HSK 7-9 / 214 Bộ thủ (active đỏ; HSK 1 active mặc định); khi chọn pill hiện dòng "247 chữ Hán mới trong cuốn này" + 3 nút "Flashcard" / "Luyện viết" / "Tạo file" + lưới chữ (grid 8 cột, ô vuông lớn chữ Hán link sang `?char=`). HSK 1 = 40 chữ đầu của list trên; 214 Bộ thủ → `radicals.html`.

## Màn 2: Chi tiết chữ (`?char=你`)
- **Sidebar trái (desktop)**: lặp lại card tìm kiếm + canvas vẽ (giống màn 1, thu nhỏ).
- **Trung tâm**:
  - Khung chữ lớn: ô vuông ~260px viền 2px, chữ Hán to ở giữa (font Noto Sans SC), 4 nút icon dưới: "Xem lại thứ tự nét" (bấm chạy animation các nét vẽ tuần tự trên canvas overlay — hardcode mảng nét SVG của 你: 7 nét, mỗi nét polyline vẽ bằng JS stroke-dashoffset; chữ khác dùng animation đơn giản 3-5 nét), "Hiển thị hạt mũi tên" (toggle pressed), "Hiển thị chữ chứa chữ này" (toggle hiện list chữ có bộ thủ này), "Thu phóng vừa khít".
  - `h1` "你 - NHĨ" + nút "Phát âm" 🔊 (TTS).
  - Link "→ Quy tắc chuyển âm" (`sound-rules.html`).
  - "Âm Hán Việt: NHĨ (còn đọc: NỄ)" — phần alt màu muted; "Ý nghĩa: …"; "Pinyin: nǐ"; "Cấp độ: HSK 1" (badge); "Số nét: 7"; "Bộ thủ: 亻" (link `?char=亻`); "Cấu tạo từ: 亻 尔" (link từng chữ); "Loại chữ: Hội ý" (badge viền).
- **Sidebar phải**: `h2` "Từ vựng trong sách" — list (word + (pinyin) + - ÂM HÁN VIỆT + - nghĩa + badge HSK 1 + nút 🔊 + link về lesson). `h2` "Từ vựng thực chiến" — list từ practical (word + pinyin + — nghĩa; link `dictionary.html?q=<word>`).
- **Cuối**: link "Chữ sau 好 →" (`?char=好`).

## Tiêu chí nghiệm thu
- Tìm/vẽ → sang được trang chi tiết; animation nét chạy được; mọi link composition/radical/vocab hoạt động; canvas xoá nét dùng được.
