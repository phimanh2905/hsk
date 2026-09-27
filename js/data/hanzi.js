/* Nhai HSK clone — PLAN-03 dữ liệu Phân tích Hán tự (hardcode, UI-only).
   你 có data ĐẦY ĐỦ theo SPEC-03; các chữ bài 1 HSK1 + chữ thành phần bản rút gọn. */
(function () {
  "use strict";
  window.NHAI_DATA = window.NHAI_DATA || {};

  /* ---- 你: data đầy đủ theo SPEC-03 ---- */
  var ni = {
    hanzi: "你",
    hanViet: "NHĨ",
    hanVietAlt: "NỄ",
    pinyin: "nǐ",
    level: "HSK 1",
    strokes: 7,
    radical: "亻",
    radicalLink: true,
    composition: ["亻", "尔"],
    type: "Hội ý",
    meaning: "bạn (ngôi thứ hai thông dụng, khác với kính trọng 您 [nín]); bạn. Lưu ý: Ở Đài Loan, 妳 được dùng để chỉ nữ giới, nhưng ở Trung Quốc đại lục không phổ biến.",
    vocabInBook: [
      { word: "你好", py: "nǐ hǎo", hv: "NHĨ HẢO", vi: "Xin chào", link: "lesson.html?book=hsk1&page=lesson-1" },
      { word: "你们", py: "nǐmen", hv: "NHĨ MÔN", vi: "Các bạn", link: "lesson.html?book=hsk1&page=lesson-1" },
      { word: "你", py: "nǐ", hv: "NỄ", vi: "Bạn", link: "lesson.html?book=hsk1&page=lesson-2" }
    ],
    practical: [
      { word: "你妈", py: "nǐ mā", vi: "(thán từ) mẹ mày" },
      { word: "你我", py: "nǐ wǒ", vi: "bạn và tôi; mọi người" },
      { word: "你等", py: "nǐ děng", vi: "tất cả các bạn (cổ)" },
      { word: "迷你", py: "mí nǐ", vi: "mini (như trong váy ngắn hoặc xe Mini Cooper) (từ mượn)" },
      { word: "随你", py: "suí nǐ", vi: "tuỳ bạn" },
      { word: "你个头", py: "nǐ ge tóu", vi: "(khẩu ngữ) cái quái gì!; ừ, đúng rồi! (mỉa mai)" },
      { word: "你真行", py: "nǐ zhēn xíng", vi: "bạn giỏi thật (thường mỉa mai, đôi khi tán thưởng)" },
      { word: "去你的", py: "qù nǐ de", vi: "Đi chỗ khác chơi!" },
      { word: "算你狠", py: "suàn nǐ hěn", vi: "cậu giỏi lắm!; cậu thắng rồi!" },
      { word: "迷你裙", py: "mí nǐ qún", vi: "váy ngắn mini" },
      { word: "你情我愿", py: "nǐ qíng wǒ yuàn", vi: "cả hai đều sẵn lòng; tự nguyện cả đôi bên" },
      { word: "你死我活", py: "nǐ sǐ wǒ huó", vi: "nghĩa đen: bạn chết, tôi sống (thành ngữ); kẻ thù không đội trời" }
    ]
  };

  /* ---- ~38 chữ bài 1 HSK1 (bản rút gọn) + ~10 chữ thành phần ---- */
  function g(hanzi, hanViet, pinyin, strokes, radical, type, meaning, composition) {
    var o = { hanzi: hanzi, hanViet: hanViet, pinyin: pinyin, level: "HSK 1", strokes: strokes, radical: radical, type: type, meaning: meaning };
    if (composition) o.composition = composition;
    return o;
  }
  function comp(hanzi, hanViet, pinyin, strokes, meaning) {
    return { hanzi: hanzi, hanViet: hanViet, pinyin: pinyin, level: "Thành phần", strokes: strokes, radical: hanzi, type: "Bộ thủ", meaning: meaning };
  }

  var others = [
    g("好", "HẢO", "hǎo", 6, "女", "Hội ý", "tốt, hay; lời chào hỏi (trong 你好).", ["女", "子"]),
    g("王", "VƯƠNG", "wáng", 4, "王", "Độc thể", "vua, vương; họ Vương."),
    g("老", "LÃO", "lǎo", 6, "老", "Hội ý", "già, lão; tiền tố thân mật (trong 老师)."),
    g("师", "SƯ", "shī", 6, "巾", "Hình thanh", "thầy; sư phạm (trong 老师 — thầy giáo)."),
    g("大", "ĐẠI", "dà", 3, "大", "Tượng hình", "to, lớn."),
    g("学", "HỌC", "xué", 8, "子", "Hội ý", "học; học tập (trong 学生 — học sinh, 大学 — đại học).", ["冖", "子"]),
    g("生", "SINH", "shēng", 5, "生", "Tượng hình", "sinh ra; sống (trong 学生 — học sinh)."),
    g("们", "MÔN", "men", 5, "亻", "Hình thanh", "hậu tố số nhiều cho danh từ chỉ người (trong 你们).", ["亻", "门"]),
    g("您", "NÍN", "nín", 11, "心", "Hình thanh", "ngài; bạn (cách gọi kính trọng, thêm 心 心 hạ xuống).", ["你", "心"]),
    g("谢", "TẠ", "xiè", 12, "讠", "Hình thanh", "cảm ơn (trong 谢谢)."),
    g("不", "BẤT", "bù", 4, "一", "Độc thể", "không (từ phủ định)."),
    g("客", "KHÁCH", "kè", 9, "宀", "Hình thanh", "khách (trong 客气 — khách sáo, lễ phép)."),
    g("气", "KHÍ", "qì", 4, "气", "Tượng hình", "khí; hơi thở; giận (trong 客气)."),
    g("同", "ĐỒNG", "tóng", 6, "口", "Hội ý", "giống nhau, cùng (trong 同学 — bạn cùng lớp)."),
    g("再", "TÁI", "zài", 6, "冂", "Độc thể", "lại, thêm một lần nữa (trong 再见 — tạm biệt)."),
    g("见", "KIẾN", "jiàn", 4, "见", "Tượng hình", "gặp, thấy (trong 再见)."),
    g("请", "THỈNH", "qǐng", 10, "讠", "Hình thanh", "mời; xin (cách nói lịch sự)."),
    g("问", "VẤN", "wèn", 6, "门", "Hội ý", "hỏi (trong 请问 — cho hỏi).", ["门", "口"]),
    g("叫", "KIẾU", "jiào", 5, "口", "Hình thanh", "gọi; tên là (trong 我叫… — tôi tên là…)."),
    g("什", "THẬP", "shén", 4, "亻", "Hình thanh", "dùng trong từ hỏi 什么 (cái gì).", ["亻", "十"]),
    g("么", "MA", "me", 3, "丿", "Độc thể", "hậu tố trong từ hỏi 什么, 怎么."),
    g("名", "DANH", "míng", 6, "口", "Hội ý", "tên (trong 名字).", ["夕", "口"]),
    g("字", "TỰ", "zì", 6, "宀", "Hội ý", "chữ (trong 名字; tiếng Trung gọi chữ Hán là 字).", ["宀", "子"]),
    g("我", "NGÃ", "wǒ", 7, "戈", "Tượng hình", "tôi, mình (ngôi thứ nhất)."),
    g("是", "THỊ", "shì", 9, "日", "Hội ý", "là (động từ nối trong câu), đúng."),
    g("对", "ĐỐI", "duì", 5, "寸", "Hội ý", "đúng; hướng về (trong 对不起 — xin lỗi)."),
    g("起", "KHỞI", "qǐ", 10, "走", "Hình thanh", "nổi lên, đứng dậy (trong 对不起, 起来)."),
    g("没", "MOẠT", "méi", 7, "氵", "Hình thanh", "chưa, không có (trong 没关系 — không sao)."),
    g("关", "QUAN", "guān", 6, "大", "Hội ý", "đóng; liên quan (trong 没关系)."),
    g("系", "HỆ", "xì", 7, "糸", "Hội ý", "hệ; quan hệ (trong 关系)."),
    g("事", "SỰ", "shì", 8, "亅", "Tượng hình", "việc, công việc (trong 没事 — không có việc gì)."),
    g("很", "HẪN", "hěn", 9, "彳", "Hình thanh", "rất (trạng từ mức độ)."),
    g("高", "CAO", "gāo", 10, "高", "Tượng hình", "cao (trong 高兴)."),
    g("兴", "HƯNG", "xìng", 6, "八", "Tượng hình", "hứng, hứng thú (trong 高兴 — vui vẻ)."),
    g("认", "NHẬN", "rèn", 4, "讠", "Hình thanh", "nhận, nhận ra (trong 认识)."),
    g("识", "THỨC", "shí", 7, "讠", "Hình thanh", "biết, nhận thức (trong 认识 — quen biết)."),
    g("也", "DÃ", "yě", 3, "乚", "Độc thể", "cũng (trạng từ)."),

    /* chữ thành phần */
    comp("亻", "NHÂN", "rén", 2, "bộ Nhân (người) — bộ thủ đứng bên trái của chữ."),
    comp("尔", "NHỊ", "ěr", 5, "bạn (cổ); vậy, thế — phần biểu âm của 你."),
    comp("亠", "ĐẦU", "tóu", 2, "bộ Đầu (đầu) — bộ thủ hai nét trên cùng."),
    comp("口", "KHẨU", "kǒu", 3, "bộ Khẩu (miệng); miệng."),
    comp("木", "MỘC", "mù", 4, "bộ Mộc (cây); cây, gỗ."),
    comp("人", "NHÂN", "rén", 2, "bộ Nhân (người); con người."),
    comp("心", "TÂM", "xīn", 4, "bộ Tâm (tim); tim, lòng."),
    comp("日", "NHẬT", "rì", 4, "bộ Nhật (mặt trời); ngày, mặt trời."),
    comp("讠", "NGÔN", "yán", 2, "bộ Ngôn (lời nói) — dạng viết tắt của 言."),
    comp("女", "NỮ", "nǚ", 3, "bộ Nữ (nữ giới); phụ nữ, con gái.")
  ];

  var chars = { "你": ni };
  others.forEach(function (c) { chars[c.hanzi] = c; });

  window.NHAI_DATA.hanzi = {
    chars: chars,
    levels: [
      { id: "hsk1", label: "HSK 1", count: "247 chữ Hán mới trong cuốn này" },
      { id: "hsk2", label: "HSK 2", count: "161 chữ Hán mới trong cuốn này" },
      { id: "hsk3", label: "HSK 3", count: "198 chữ Hán mới trong cuốn này" },
      { id: "hsk4", label: "HSK 4", count: "199 chữ Hán mới trong cuốn này" },
      { id: "hsk5", label: "HSK 5", count: "312 chữ Hán mới trong cuốn này" },
      { id: "hsk6", label: "HSK 6", count: "369 chữ Hán mới trong cuốn này" },
      { id: "hsk79", label: "HSK 7-9", count: "433 chữ Hán mới trong cuốn này" },
      { id: "radicals", label: "214 Bộ thủ", href: "radicals.html" }
    ]
  };
})();
