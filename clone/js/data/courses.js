/* Nhai HSK clone — PLAN-01: dữ liệu 7 khóa học (hardcode).
   window.NHAI_DATA.courses = { hsk1, hsk2, hsk3, hsk4, hsk5, hsk6, hsk79 } */
(function () {
  "use strict";
  window.NHAI_DATA = window.NHAI_DATA || {};

  /* ---- HSK 1: 15 bài từ vựng thật theo giáo trình 标准教程 HSK 1 · 3.0 ---- */
  var hsk1Titles = [
    { t: "Xin chào!", w: 13 },
    { t: "Tôi tên là NhaiHSK", w: 15 },
    { t: "Tôi là người Việt Nam", w: 22 },
    { t: "Tôi có hai đứa con", w: 21 },
    { t: "Hôm nay tôi nghỉ", w: 22 },
    { t: "Số điện thoại của bạn là bao nhiêu?", w: 23 },
    { t: "Tôi tan làm lúc 6 rưỡi tối", w: 27 },
    { t: "Bố tôi cũng làm việc ở bệnh viện", w: 27 },
    { t: "Sáng mai tôi học ở trường", w: 23 },
    { t: "Táo ở đây rẻ thật!", w: 23 },
    { t: "Tôi đang học đại học", w: 25 },
    { t: "Hôm qua tuyết rơi", w: 24 },
    { t: "Cho tôi một cốc trà", w: 20 },
    { t: "Tôi đã xem một bộ phim", w: 28 },
    { t: "Hẹn gặp ở sân bay!", w: 20 }
  ];

  function genLessons(n, minW, maxW) {
    var arr = [];
    for (var i = 1; i <= n; i++) {
      var words = minW + ((i * 3) % (maxW - minW + 1));
      arr.push({
        pageId: "lesson-" + i,
        order: i,
        title: "Bài " + i,
        words: words,
        skill: "vocab"
      });
    }
    return arr;
  }

  function genGrammar(n) {
    var arr = [];
    for (var i = 1; i <= n; i++) {
      arr.push({
        order: i,
        title: "Bài " + i + " — Ngữ pháp",
        meta: "\u2248" + (4 + (i % 4)) + " mẫu",
        skill: "grammar"
      });
    }
    return arr;
  }

  function genHanzi(n) {
    var arr = [];
    for (var i = 1; i <= n; i++) {
      arr.push({
        order: i,
        title: "Bài " + i + " — Chữ Hán",
        meta: "\u2248" + (8 + (i % 5)) + " chữ",
        skill: "hanzi"
      });
    }
    return arr;
  }

  function makeBook(cfg) {
    var list = cfg.titles
      ? cfg.titles.map(function (x, idx) {
          return { pageId: "lesson-" + (idx + 1), order: idx + 1, title: x.t, words: x.w, skill: "vocab" };
        })
      : genLessons(cfg.lessons, cfg.minW, cfg.maxW);
    var book = {
      slug: cfg.slug,
      name: cfg.name,
      zh: cfg.zh,
      meta: cfg.meta,
      wordCount: cfg.wordCount,
      patterns: cfg.patterns || 0,
      lessonCount: list.length,
      list: list,
      grammar: genGrammar(5),
      hanzi: genHanzi(4)
    };
    book.pages = book.list; // alias theo spec (NHAI_DATA.courses.hsk1.pages)
    return book;
  }

  window.NHAI_DATA.courses = {
    hsk1: makeBook({
      slug: "hsk1", name: "HSK 1", zh: "标准教程 HSK 1 · 3.0",
      meta: "333 từ vựng · 41 mẫu", wordCount: 333, patterns: 41,
      titles: hsk1Titles
    }),
    hsk2: makeBook({
      slug: "hsk2", name: "HSK 2", zh: "标准教程 HSK 2 · 3.0",
      meta: "213 từ vựng · 45 mẫu", wordCount: 213, patterns: 45,
      lessons: 45, minW: 12, maxW: 18
    }),
    hsk3: makeBook({
      slug: "hsk3", name: "HSK 3", zh: "标准教程 HSK 3 · 3.0",
      meta: "483 từ vựng · 63 mẫu", wordCount: 483, patterns: 63,
      lessons: 63, minW: 14, maxW: 20
    }),
    hsk4: makeBook({
      slug: "hsk4", name: "HSK 4", zh: "标准教程 HSK 4 · 3.0",
      meta: "972 từ vựng", wordCount: 972, patterns: 0,
      lessons: 30, minW: 18, maxW: 24
    }),
    hsk5: makeBook({
      slug: "hsk5", name: "HSK 5", zh: "标准教程 HSK 5 · 3.0",
      meta: "1059 từ vựng", wordCount: 1059, patterns: 0,
      lessons: 30, minW: 20, maxW: 26
    }),
    hsk6: makeBook({
      slug: "hsk6", name: "HSK 6", zh: "标准教程 HSK 6 · 3.0",
      meta: "1123 từ vựng", wordCount: 1123, patterns: 0,
      lessons: 30, minW: 22, maxW: 28
    }),
    hsk79: makeBook({
      slug: "hsk79", name: "HSK 7-9", zh: "标准教程 HSK 7-9",
      meta: "5606 từ vựng", wordCount: 5606, patterns: 0,
      lessons: 30, minW: 25, maxW: 30
    })
  };

  window.NHAI_DATA.courseOrder = ["hsk1", "hsk2", "hsk3", "hsk4", "hsk5", "hsk6", "hsk79"];
})();
