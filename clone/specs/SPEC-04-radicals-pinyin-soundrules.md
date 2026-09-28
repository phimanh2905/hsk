# SPEC-04: Bộ thủ (`radicals.html`) + Pinyin (`pinyin.html`, `pinyin-practice.html`) + Quy tắc chuyển âm (`sound-rules.html`)

## 1. `radicals.html` — 214 Bộ Thủ
- `h1` "214 Bộ Thủ", sub "部首 — nền móng để nhớ mặt chữ Hán", mô tả "214 bộ thủ — phân loại theo số nét, bấm thẻ để nghe âm đọc".
- Nút "Tạo file luyện viết (214 bộ)" → `create-file.html?tpl=radicals`.
- **Flashcard deck (dùng pattern chung như Flashcard của SPEC-02, tự viết lại gọn)**: counter "1 / 214"; nút "Tự động" (auto phát âm + next 2s), "Xáo trộn" (shuffle), icon cài đặt auto-play, nút "Phát âm" 🔊.
- Thẻ: mặt trước = chữ bộ thủ to (vd 一) + "Click để lật"; mặt sau = tên Hán Việt (Nhất) + ý nghĩa; 4 nút điều hướng như flashcard kèm phím tắt ←/A ↓/X ↑/Z →/D.
- **Grid theo số nét**: nhóm "1 nét (6 bộ)", "2 nét (25 bộ)"…; thẻ button: chữ bộ thủ to + tên Hán Việt + "#số thứ tự" + mô tả ngắn (grid 4 cột). Bấm thẻ → deck nhảy tới thẻ đó.
- Dữ liệu `js/data/radicals.js`: **đủ 214 bộ** `{i, char, hanViet, meaning, strokes}` — 1 nét: 一 Nhất / 丨 Cổn / 丶 Chủ / 丿 Phiệt / 乙 Ất / 亅 Quyết (nghĩa như gốc: "Một, thứ nhất…", "Nét sổ, đường thẳng đứng trên xuống dưới", "Nét chấm, một điểm", "Nét phẩy, nét nghiêng từ phải qua trái, chỉ động tác", "Can thứ hai trong mười can (Giáp, Ất, Bính, Đinh…)", "Nét sổ có móc, cái móc"); 2 nét có: 二 Nhị, 亠 Đầu, 人 Nhân "亻 Người, c…"…; số nét còn lại điền tên Hán Việt chuẩn (Nhị, Tam, Vương, Mộc, Thủy, Hỏa, Thổ, Thảo, Khẩu, Tâm, Thủ, Nhựt, Nguyệt, Mục, Kim, Điểu, Ngư, Long, Phong, Mã, Đáo, Tập, Cao, Mễ, Bạch, Huyết, Ngọc, Điền, Mịch, Vượng, Lão…), meaning ngắn 5-15 từ.

## 2. `pinyin.html` — Bảng Pinyin
- `h1` "Bảng Pinyin", sub "拼音表 — Thanh mẫu (声母) × Vận mẫu (韵母)", mô tả "406 âm tiết chuẩn — bấm ô bất kỳ để xem chi tiết và nghe phát âm".
- Link "Học theo lộ trình" → `roadmap-pinyin.html`; link "Bài tập" → `pinyin-practice.html`.
- **Filter thanh mẫu**: hàng pill "Tất cả", "Ø", b, p, m, f, d, t, n, l, z, c, s, zh, ch, sh, r, j, q, x, g, k, h (active nền đỏ) — lọc 1 hàng của bảng.
- **Bảng ma trận**: hàng header = 37 vận mẫu (a o e -i er ai ei ao ou an en ang eng ong i ia ie iao iu ian in iang ing iong u ua uo uai ui uan un uang ueng ü üe üan ün); cột đầu = thanh mẫu (Ø, b, p…h). Ô = âm tiết ghép có dấu hiệu chuẩn (Ø hàng: yi ya ye… wu wa wo… yu yue yuan yun; hàng khác: ba bo… bu…, ji jia jie jiao… — âm không tồn tại để ô "·" muted). Tổng ô hợp lệ ~406.
- Bấm ô → **popup chi tiết** (dialog): âm to + nút phát 4 thanh điệu (ā á ǎ à — TTS từng âm) + vài từ ví dụ (lấy từ data nếu có). Đóng bằng X/Escape/backdrop.
- Dữ liệu `js/data/pinyin.js`: `initials`, `finals`, `valid[initial][final]=syllable`, `examples`.

## 3. `pinyin-practice.html` — Bài tập Pinyin
- `h1` "Bài tập Pinyin", mô tả ngắn "Luyện nghe và gõ pinyin — nhận biết thanh điệu".
- 2 loại câu hỏi luân phiên 10 câu: (a) phát âm 1 âm (TTS) → chọn 1 trong 4 âm viết; (b) hiện âm → chọn thanh điệu đúng (4 nút ¯ ´ ˇ `). Chấm điểm + counter + kết quả cuối "Đúng X/10" + nút "Làm lại".
- Dữ liệu sinh từ `pinyin.js` (random tại runtime).

## 4. `sound-rules.html` — Quy tắc chuyển âm
- `h1` "Quy tắc chuyển âm", mô tả: "Từ âm Hán Việt đoán ra pinyin: bảng thanh điệu, quy tắc âm đầu, âm cuối và vần, kèm ví dụ trong giáo trình HSK và bài tập áp dụng." + note "Tỉ lệ tính trên 9721 chữ Hán có đủ pinyin và âm Hán Việt — quy tắc là xu hướng, không đúng 100%".
- **"Bảng thanh điệu"** (`h2`, table 3 cột: Thanh Hán Việt / Thanh pinyin / Ví dụ) — 6 hàng: 
  ngang(3094): thanh 1 ā 61%, thanh 2 á 32% — 些 ta xiē, 人 nhân rén, 他 tha tā; sắc(2150): thanh 4 à 66%, thanh 1 ā 13% — 不 bất bù, 个 cá gè, 做 tố zuò; nặng(1796): thanh 4 à 72%, thanh 2 á 17% — 上 thượng shàng, 下 hạ xià, 事 sự shì; huyền(1058): thanh 2 á 86%, thanh 1 ā 8% — 和 hoà hé, 回 hồi huí, 茶 trà chá; hỏi/ngã: thẻ tổng hợp (mẫu 1000 chữ) — 以 dĩ yǐ, 理 lý lǐ, 采 thái cǎi.
  Mỗi % kèm thanh bar ngắn màu.
- **"Quy tắc âm đầu"** (`h2`): list quy tắc (vd "Hán Việt t- → thường t/q/x: 天 thiān tiān, 铁 thiết tiě", "Hán Việt th-/s- → sh: 山 san shān", "Hán Việt v- → w: 文 văn wén"…) 8-10 quy tắc, mỗi cái kèm 2-3 ví dụ (chữ + HV + pinyin).
- **"Quy tắc âm cuối & vần"** (`h2`): 6-8 quy tắc (vd "HV -ang → -ang: 长 trường cháng", "HV -ôi → -ui: 对 đối duì", "HV -oan → -uan: 官 quan guān"...).
- **"Bài tập áp dụng"** (`h2`): 5 câu hỏi trắc nghiệm đoán pinyin từ Hán Việt (vd "铁 thiết = ?" → tiě ✓ / tiè / tiē / tié); chấm khi chọn, hiện giải thích.

## Tiêu chí nghiệm thu
- 214 bộ đủ nhóm số nét; bảng pinyin filter + popup phát âm 4 thanh; practice chấm điểm; sound-rules có bảng % + quy tắc + bài tập.
