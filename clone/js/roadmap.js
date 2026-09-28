/* Nhai HSK clone — PLAN-05: lộ trình (roadmap.html) */
(function () {
  "use strict";

  var STAGES = [
    {
      marker: "拼音",
      name: "Bảng chữ cái Pinyin",
      level: "Nền tảng",
      desc: "Hệ thống phiên âm tiếng Trung: thanh mẫu, vận mẫu và 4 thanh điệu — nền móng trước khi vào HSK 1.",
      tags: ["Phát âm", "Nghe hiểu"],
      href: "roadmap-pinyin.html"
    },
    {
      marker: "1级",
      name: "HSK 1",
      level: "Sơ cấp",
      desc: "500 từ vựng đầu tiên, mẫu câu cơ bản, chào hỏi và giao tiếp đời thường.",
      tags: ["Từ vựng", "Ngữ pháp"],
      href: "course.html?book=hsk1"
    },
    {
      marker: "2级",
      name: "HSK 2",
      level: "Sơ cấp",
      desc: "Mở rộng vốn từ, ngữ pháp sơ cấp và hội thoại tình huống hằng ngày.",
      tags: ["Từ vựng", "Ngữ pháp", "Nghe hiểu"],
      href: "course.html?book=hsk2"
    },
    {
      marker: "3级",
      name: "HSK 3",
      level: "Sơ cấp",
      desc: "Hoàn thiện sơ cấp: đọc đoạn văn ngắn, kể chuyện và diễn đạt ý kiến đơn giản.",
      tags: ["Từ vựng", "Ngữ pháp", "Luyện đề"],
      href: "course.html?book=hsk3"
    },
    {
      marker: "4–6级",
      name: "HSK 4–6",
      level: "Trung cấp",
      desc: "Trung cấp: đọc hiểu bài dài, ngữ pháp nâng cao và luyện đề theo cấp độ.",
      tags: ["Từ vựng", "Ngữ pháp", "Luyện đề"],
      href: "course.html?book=hsk4"
    },
    {
      marker: "7–9级",
      name: "HSK 7–9",
      level: "Cao cấp",
      desc: "Cao cấp: văn bản học thuật, chuyên ngành và chiến lược thi thật.",
      tags: ["Từ vựng", "Nghe hiểu", "Luyện đề"],
      href: "course.html?book=hsk7"
    }
  ];

  function renderTimeline() {
    var host = document.getElementById("timeline");
    if (!host) return;
    STAGES.forEach(function (s) {
      var item = NHAI.el(
        '<a href="' + s.href + '" class="relative flex gap-4 group mb-5 last:mb-0">' +
          '<div class="flex flex-col items-center shrink-0">' +
            '<span class="zh w-14 h-14 rounded-full bg-[var(--nhai-main)] text-white font-extrabold flex items-center justify-center shadow-neo text-sm group-hover:-translate-y-0.5 transition-transform">' + s.marker + "</span>" +
            '<span class="flex-1 w-0.5 bg-[var(--nhai-border)] mt-1"></span>' +
          "</div>" +
          '<div class="card shadow-neo p-5 flex-1 group-hover:-translate-y-0.5 transition-transform">' +
            '<div class="flex flex-wrap items-center gap-2 mb-1">' +
              '<h3 class="text-lg font-extrabold">' + s.name + "</h3>" +
              '<span class="pill text-xs py-0.5">' + s.level + "</span>" +
              '<span class="text-xs font-semibold text-[var(--nhai-muted)] ml-auto">Chưa bắt đầu</span>' +
            "</div>" +
            '<p class="text-sm text-[var(--nhai-muted)] mb-3">' + s.desc + "</p>" +
            '<div class="flex flex-wrap items-center gap-2">' +
              s.tags.map(function (t) { return '<span class="pill text-xs py-0.5">' + t + "</span>"; }).join("") +
              '<span class="text-sm font-bold text-[var(--nhai-main)] ml-auto">Vào học →</span>' +
            "</div>" +
          "</div>" +
        "</a>"
      );
      host.appendChild(item);
    });
  }

  function renderReviewCard() {
    var host = document.getElementById("review-card");
    if (!host) return;
    host.appendChild(NHAI.el(
      '<a href="review.html" class="card shadow-neo p-5 flex-1 block hover:-translate-y-0.5 transition-transform">' +
        '<div class="flex flex-wrap items-center gap-2 mb-1">' +
          '<h3 class="text-lg font-extrabold">🗂️ Tổng ôn</h3>' +
          '<span class="text-xs font-semibold text-[var(--nhai-muted)] ml-auto">SRS · 21 ngày</span>' +
        "</div>" +
        '<p class="text-sm text-[var(--nhai-muted)] mb-3">Ôn tập ngắt quãng (SRS) từ vựng &amp; ngữ pháp đã học — thêm thẻ bằng nút ⭐ trong bài, đến hạn là vào ôn.</p>' +
        '<div class="flex flex-wrap items-center gap-2">' +
          '<span class="pill text-xs py-0.5">Từ vựng</span>' +
          '<span class="pill text-xs py-0.5">Ngữ pháp</span>' +
          '<span class="text-sm font-bold text-[var(--nhai-main)] ml-auto">Vào ôn →</span>' +
        "</div>" +
      "</a>"
    ));
  }

  function init() {
    renderTimeline();
    renderReviewCard();
  }

  if (document.readyState === "complete") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
