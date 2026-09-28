/* Nhai HSK clone — PLAN-18 / SPEC-18: dữ liệu "Sổ tay" dùng chung cho my-vocab + my-grammar.
   window.NHAI_DATA.notebooks = { vocab: {...}, grammar: {...} }
   Copy chuỗi đúng theo SPEC-18 section A. samples chỉ để HIỂN THỊ (luôn render sau item user tạo). */
(function () {
  "use strict";
  window.NHAI_DATA = window.NHAI_DATA || {};

  /* 12 dòng mẫu dùng cho trang chi tiết khi sổ tay chưa có rows thật */
  var MOCK_ROWS = [
    { hanzi: "时间", pinyin: "shíjiān", hanviet: "thời gian", meaning: "thời gian" },
    { hanzi: "朋友", pinyin: "péngyou", hanviet: "bằng hữu", meaning: "bạn bè" },
    { hanzi: "学习", pinyin: "xuéxí", hanviet: "học tập", meaning: "học" },
    { hanzi: "工作", pinyin: "gōngzuò", hanviet: "công tác", meaning: "công việc, làm việc" },
    { hanzi: "高兴", pinyin: "gāoxìng", hanviet: "cao hứng", meaning: "vui vẻ" },
    { hanzi: "因为", pinyin: "yīnwèi", hanviet: "nhân vi", meaning: "bởi vì" },
    { hanzi: "所以", pinyin: "suǒyǐ", hanviet: "sở dĩ", meaning: "nên, vì vậy" },
    { hanzi: "但是", pinyin: "dànshì", hanviet: "đãn thị", meaning: "nhưng" },
    { hanzi: "天气", pinyin: "tiānqì", hanviet: "thiên khí", meaning: "thời tiết" },
    { hanzi: "喜欢", pinyin: "xǐhuan", hanviet: "hỉ hoan", meaning: "thích" },
    { hanzi: "学校", pinyin: "xuéxiào", hanviet: "học hiệu", meaning: "trường học" },
    { hanzi: "吃饭", pinyin: "chīfàn", hanviet: "xích phạn", meaning: "ăn cơm" }
  ];

  function sample(id, name, count, unit, updated) {
    return { id: id, name: name, count: count, unit: unit, updatedAt: updated, sample: true, rows: MOCK_ROWS };
  }

  NHAI_DATA.notebooks = {
    vocab: {
      storage: "nhai.decks",
      h1: "Sổ tay từ vựng",
      sub: "Tự tạo bộ từ vựng để học chủ động — nhập từ tài liệu của bạn…",
      cta: "Tạo bộ mới",
      empty: "Chưa có bộ từ vựng nào",
      emptySub: "Tạo bộ đầu tiên để nhập từ vựng từ tài liệu của bạn.",
      modalTitle: "Tạo bộ từ vựng mới",
      countUnit: "từ",
      samples: [
        sample("vocab-hsk30", "Từ vực HSK 3.0", 128, "từ", "2026-09-20"),
        sample("vocab-textbook", "Từ trong sách giáo khoa", 64, "từ", "2026-09-18"),
        sample("vocab-daily", "Ngày thường giao tiếp", 45, "từ", "2026-09-15")
      ]
    },
    grammar: {
      storage: "nhai.notebooks",
      h1: "Sổ tay ngữ pháp",
      sub: "Tự ghi chú các mẫu ngữ pháp quan trọng — sắp xếp theo chủ đề…",
      cta: "Tạo sổ tay mới",
      empty: "Chưa có sổ tay ngữ pháp nào",
      emptySub: "Tạo sổ tay đầu tiên để ghi chú các mẫu ngữ pháp của bạn.",
      modalTitle: "Tạo sổ tay ngữ pháp mới",
      countUnit: "mẫu",
      samples: [
        sample("grammar-phone", "Mẫu câu gọi thoại", 12, "mẫu", "2026-09-21"),
        sample("grammar-mistakes", "Ngữ pháp hay sai", 8, "mẫu", "2026-09-17")
      ]
    }
  };
})();
