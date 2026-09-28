/* Nhai HSK clone — dữ liệu Quy tắc chuyển âm (PLAN-04). window.NHAI_DATA.soundrules
   toneRows: bảng thanh điệu theo âm Hán Việt (thống kê trên 9721 chữ có đủ pinyin + HV);
   initialRules / finalRules: quy tắc âm đầu, âm cuối & vần; quiz: 5 câu áp dụng. */
(function () {
  "use strict";
  window.NHAI_DATA = window.NHAI_DATA || {};

  NHAI_DATA.soundrules = {
    note: "Tỉ lệ tính trên 9721 chữ Hán có đủ pinyin và âm Hán Việt — quy tắc là xu hướng, không đúng 100%",
    toneTotal: 9721,
    toneColors: { "1": "#2563eb", "2": "#16a34a", "3": "#f5b301", "4": "#dc2626" },
    toneRows: [
      {
        name: "Ngang", count: 3094,
        tones: [
          { label: "thanh 1", mark: "ā", pct: 61 },
          { label: "thanh 2", mark: "á", pct: 32 }
        ],
        examples: [["些", "ta", "xiē"], ["人", "nhân", "rén"], ["他", "tha", "tā"]]
      },
      {
        name: "Sắc", count: 2150,
        tones: [
          { label: "thanh 4", mark: "à", pct: 66 },
          { label: "thanh 1", mark: "ā", pct: 13 }
        ],
        examples: [["不", "bất", "bù"], ["个", "cá", "gè"], ["做", "tố", "zuò"]]
      },
      {
        name: "Nặng", count: 1796,
        tones: [
          { label: "thanh 4", mark: "à", pct: 72 },
          { label: "thanh 2", mark: "á", pct: 17 }
        ],
        examples: [["上", "thượng", "shàng"], ["下", "hạ", "xià"], ["事", "sự", "shì"]]
      },
      {
        name: "Huyền", count: 1058,
        tones: [
          { label: "thanh 2", mark: "á", pct: 86 },
          { label: "thanh 1", mark: "ā", pct: 8 }
        ],
        examples: [["和", "hoà", "hé"], ["回", "hồi", "huí"], ["茶", "trà", "chá"]]
      },
      {
        name: "Hỏi", count: 1000,
        sample: true,
        tones: [
          { label: "thanh 3", mark: "ǎ", pct: 98 }
        ],
        examples: [["以", "dĩ", "yǐ"], ["采", "thải", "cǎi"], ["柳", "liễu", "liǔ"]]
      },
      {
        name: "Ngã", count: 1000,
        sample: true,
        tones: [
          { label: "thanh 3", mark: "ǎ", pct: 97 }
        ],
        examples: [["理", "lý", "lǐ"], ["你", "nĩ", "nǐ"], ["野", "dã", "yě"]]
      }
    ],

    initialRules: [
      { rule: "Hán Việt t- → thường t- / q- / x-",
        examples: [["天", "thiên", "tiān"], ["铁", "thiết", "tiě"], ["挑", "thiêu", "tiāo"]] },
      { rule: "Hán Việt th- / s- → sh-",
        examples: [["山", "san", "shān"], ["少", "thiếu", "shǎo"], ["书", "thư", "shū"]] },
      { rule: "Hán Việt v- → w-",
        examples: [["文", "văn", "wén"], ["万", "vạn", "wàn"], ["味", "vị", "wèi"]] },
      { rule: "Hán Việt đ- → d-",
        examples: [["大", "đại", "dà"], ["东", "đông", "dōng"], ["对", "đối", "duì"]] },
      { rule: "Hán Việt nh- → r-",
        examples: [["日", "nhựt", "rì"], ["人", "nhân", "rén"], ["然", "nhiên", "rán"]] },
      { rule: "Hán Việt s- → s- / x-",
        examples: [["四", "tứ", "sì"], ["三", "tam", "sān"], ["小", "tiểu", "xiǎo"]] },
      { rule: "Hán Việt h- → h- / x-",
        examples: [["火", "hỏa", "huǒ"], ["海", "hải", "hǎi"], ["喜", "hỉ", "xǐ"]] },
      { rule: "Hán Việt gia-, ki-, kỳ- → j-",
        examples: [["家", "gia", "jiā"], ["今", "kim", "jīn"], ["见", "kiến", "jiàn"]] },
      { rule: "Hán Việt kh- → q- / k-",
        examples: [["去", "khứ", "qù"], ["口", "khẩu", "kǒu"], ["开", "khai", "kāi"]] },
      { rule: "Hán Việt b- / m- giữ nguyên",
        examples: [["不", "bất", "bù"], ["美", "mỹ", "měi"], ["明", "minh", "míng"]] }
    ],

    finalRules: [
      { rule: "HV -ang → -ang",
        examples: [["长", "trường", "cháng"], ["上", "thượng", "shàng"], ["方", "phương", "fāng"]] },
      { rule: "HV -ôi → -ui / -ei",
        examples: [["对", "đối", "duì"], ["回", "hồi", "huí"], ["内", "nội", "nèi"]] },
      { rule: "HV -oan → -uan",
        examples: [["官", "quan", "guān"], ["完", "hoàn", "wán"], ["换", "hoán", "huàn"]] },
      { rule: "HV -inh → -ing",
        examples: [["明", "minh", "míng"], ["京", "kinh", "jīng"], ["情", "tình", "qíng"]] },
      { rule: "HV -ông → -ong",
        examples: [["东", "đông", "dōng"], ["中", "trung", "zhōng"], ["空", "không", "kōng"]] },
      { rule: "HV -uyên → -uan / -üan",
        examples: [["全", "toàn", "quán"], ["园", "viên", "yuán"], ["劝", "khuyến", "quàn"]] },
      { rule: "HV -ai / -ải → -ai",
        examples: [["来", "lai", "lái"], ["开", "khai", "kāi"], ["海", "hải", "hǎi"]] },
      { rule: "HV -âm / -àm → -in / -en",
        examples: [["金", "kim", "jīn"], ["心", "tâm", "xīn"], ["音", "âm", "yīn"]] }
    ],

    quiz: [
      { q: "铁 thiết = ?",
        options: ["tiě", "tiè", "tiē", "tié"], answer: 0,
        explain: "Hán Việt t- (thiết) → pinyin t-; thanh hỏi (dĩ, lý…) giữ thanh 3 → tiě." },
      { q: "文 văn = ?",
        options: ["vén", "wén", "wěn", "wēn"], answer: 1,
        explain: "Hán Việt v- → w-; thanh huyền thường thành thanh 2 → wén." },
      { q: "对 đối = ?",
        options: ["duì", "duē", "duǐ", "tuì"], answer: 0,
        explain: "HV -ôi → -ui (đối → duì); thanh sắc thường thành thanh 4 → duì." },
      { q: "山 san = ?",
        options: ["sān", "shǎn", "shān", "shàn"], answer: 2,
        explain: "HV s- → sh- (san → shān); thanh ngang thường thành thanh 1 → shān." },
      { q: "长 trường = ?",
        options: ["chàng", "cháng", "chāng", "chǎng"], answer: 1,
        explain: "HV -ang giữ nguyên -ang (trường → cháng); thanh huyền thường thành thanh 2 → cháng." }
    ]
  };
})();
