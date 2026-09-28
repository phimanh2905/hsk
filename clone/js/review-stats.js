/* Nhai HSK clone — PLAN-17 / SPEC-17: dashboard "Thống kê học tập" (review.html).
   Thay thế trang chơi quiz: 6 ô đếm, empty bộ thẻ, chi tiết ôn tập (5 ô + bar 7 ngày + donut). */
(function () {
  "use strict";

  var D = (window.NHAI_DATA && NHAI_DATA.review) || {};

  var COUNT_META = [
    { label: "Cần ôn", color: "#c03922" },
    { label: "Mới thêm", color: "var(--nhai-muted)" },
    { label: "Đang học", color: "var(--nhai-accent)" },
    { label: "Mới thuộc (< 21 ngày)", color: "#43a047" },
    { label: "Đã thuộc (dài hạn)", color: "#2e7d32" },
    { label: "Tổng đã học qua", color: "var(--nhai-main)" }
  ];

  var DAY_LABELS = ["T3", "T4", "T5", "T6", "T7", "CN", "T2"];

  var DIST_META = [
    { key: "forgot", label: "Quên rồi", color: "#c03922" },
    { key: "hard", label: "Khó", color: "#f39c12" },
    { key: "good", label: "Tốt", color: "#43a047" },
    { key: "easy", label: "Dễ", color: "var(--nhai-accent)" }
  ];

  var state = { domain: "vocab" };

  function $(sel) { return document.querySelector(sel); }
  function el(html) { return NHAI.el(html); }

  /* ---------- bộ thẻ: đếm key nhai.srs.w.* / nhai.srs.g.* ---------- */
  function deckSize() {
    var n = 0;
    var keys = [];
    try { keys = Object.keys(localStorage); } catch (e) { keys = []; }
    keys.forEach(function (k) {
      if (k.indexOf("nhai.srs.w.") === 0 || k.indexOf("nhai.srs.g.") === 0) n++;
    });
    return n;
  }

  /* ---------- khung + tabs ---------- */
  function buildFrame() {
    var root = $("#rv-root");
    root.innerHTML = "";

    root.appendChild(el(
      '<section class="mb-6">' +
        '<h1 class="text-3xl font-extrabold tracking-tight mb-2">Thống kê học tập</h1>' +
        '<p class="text-[var(--nhai-muted)]">Theo dõi tiến độ và kế hoạch ôn tập của bạn — ôn đủ chu kỳ 2 lần là thành thạo.</p>' +
      "</section>"
    ));

    var tabs = el('<div class="flex gap-2 mb-5" role="tablist" aria-label="Nhóm thẻ"></div>');
    [["vocab", "Từ vựng"], ["grammar", "Ngữ pháp"]].forEach(function (t) {
      var b = el(
        '<button type="button" role="tab" data-domain="' + t[0] + '" class="px-4 py-2 text-sm font-bold rounded-full border-2 transition-colors">' + t[1] + "</button>"
      );
      b.addEventListener("click", function () { setDomain(t[0]); });
      tabs.appendChild(b);
    });
    root.appendChild(tabs);

    root.appendChild(el('<section id="rv-counts" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6"></section>'));
    root.appendChild(el('<section id="rv-empty" class="mb-6"></section>'));
    root.appendChild(el('<section id="rv-detail" class="mb-6"></section>'));

    root.appendChild(el(
      '<p class="text-xs text-[var(--nhai-muted)] text-center py-4">Nhai tiếng Trung mỗi ngày — facebook.com/groups/nhaihsk</p>'
    ));

    paintTabs();
  }

  function paintTabs() {
    document.querySelectorAll("#rv-root [data-domain]").forEach(function (b) {
      var active = b.getAttribute("data-domain") === state.domain;
      b.classList.toggle("bg-[var(--nhai-main)]", active);
      b.classList.toggle("border-[var(--nhai-main)]", active);
      b.classList.toggle("text-white", active);
      b.classList.toggle("border-[var(--nhai-border)]", !active);
      b.classList.toggle("text-[var(--nhai-ink)]", !active);
    });
  }

  function setDomain(domain) {
    if (state.domain === domain) return;
    state.domain = domain;
    paintTabs();
    renderEmptyCard(); /* chỉ đổi text + link, không build lại layout */
  }

  /* ---------- 6 ô đếm ---------- */
  function renderCounts() {
    var host = $("#rv-counts");
    host.innerHTML = "";
    var counts = D.counts || [0, 0, 0, 0, 0, 0];
    COUNT_META.forEach(function (m, i) {
      host.appendChild(el(
        '<div class="card shadow-neo p-4 text-center">' +
          '<div class="text-[28px] leading-8 font-extrabold" style="color:' + m.color + '">' + (counts[i] !== undefined ? counts[i] : 0) + "</div>" +
          '<div class="text-xs font-semibold text-[var(--nhai-muted)] mt-1">' + m.label + "</div>" +
        "</div>"
      ));
    });
  }

  /* ---------- empty bộ thẻ / nút bắt đầu ---------- */
  function renderEmptyCard() {
    var host = $("#rv-empty");
    host.innerHTML = "";
    var n = deckSize();
    if (n > 0) {
      host.appendChild(el(
        '<div class="card shadow-neo p-6 text-center">' +
          '<h2 class="text-xl font-extrabold tracking-tight mb-3">Bộ thẻ của bạn</h2>' +
          '<a href="lesson.html?book=hsk1&page=lesson-1&mode=quiz" class="btn-main inline-block px-6 py-3 text-base">Bắt đầu ôn tập (' + n + " thẻ)</a>" +
        "</div>"
      ));
      return;
    }
    var copy = (D.copy && D.copy[state.domain]) || {};
    host.appendChild(el(
      '<div class="card shadow-neo p-8 text-center">' +
        '<h2 class="text-xl font-extrabold tracking-tight mb-2">Bộ thẻ đang trống</h2>' +
        '<p class="text-[var(--nhai-muted)] mb-4">' + (copy.emptyDesc || "") + "</p>" +
        '<a href="' + (copy.emptyHref || "reading.html") + '" class="font-bold text-[var(--nhai-main)] hover:underline">' + (copy.emptyLink || "") + "</a>" +
      "</div>"
    ));
  }

  /* ---------- chi tiết ôn tập ---------- */
  function renderDetail() {
    var host = $("#rv-detail");
    host.innerHTML = "";

    host.appendChild(el('<h2 class="text-xl font-extrabold tracking-tight mb-3">Chi tiết ôn tập</h2>'));

    var cells = [
      { label: "Streak", value: (D.streak || 0) + " ngày" },
      { label: "Hôm nay", value: (D.today || 0) + " lượt" },
      { label: "Tuần này", value: (D.week || 0) + " lượt" },
      { label: "TB / ngày", value: (D.avgPerDay || 0) + " lượt" },
      { label: "TB / thẻ", value: (D.avgPerCard || 0) + " giây" }
    ];
    var grid = el('<div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6"></div>');
    cells.forEach(function (c) {
      grid.appendChild(el(
        '<div class="card shadow-neo p-4 text-center">' +
          '<div class="text-2xl font-extrabold">' + c.value + "</div>" +
          '<div class="text-xs font-semibold text-[var(--nhai-muted)] mt-1">' + c.label + "</div>" +
        "</div>"
      ));
    });
    host.appendChild(grid);

    host.appendChild(renderWeek());
    host.appendChild(renderDonut());
  }

  function renderWeek() {
    var last7 = D.last7 || [0, 0, 0, 0, 0, 0, 0];
    var max = Math.max.apply(null, last7.concat([1]));
    var card = el('<div class="card shadow-neo p-5 mb-6"></div>');
    card.appendChild(el('<h3 class="font-extrabold tracking-tight mb-4">7 ngày gần nhất</h3>'));
    var wrap = el('<div class="flex items-end justify-between gap-2 h-40"></div>');
    last7.forEach(function (v, i) {
      var isToday = i === last7.length - 1; /* cột cuối = hôm nay (T2) */
      var h = Math.round((v / max) * 100);
      var col = el(
        '<div class="flex-1 flex flex-col items-center justify-end h-full gap-1">' +
          '<div data-bar class="w-full max-w-[36px] rounded-t-md" style="height:' + h + "%;background:" + (isToday ? "var(--nhai-main)" : "var(--nhai-soft)") + ';border:1px solid var(--nhai-border)"></div>' +
          '<div class="text-[11px] font-semibold text-[var(--nhai-muted)]">' + DAY_LABELS[i] + "</div>" +
        "</div>"
      );
      wrap.appendChild(col);
    });
    card.appendChild(wrap);
    return card;
  }

  function renderDonut() {
    var dist = D.dist || { forgot: 0, hard: 0, good: 0, easy: 0 };
    var total = dist.forgot + dist.hard + dist.good + dist.easy;
    var title = "Phân bổ đánh giá" + (total > 0 ? " (" + total + " lượt)" : "");

    var card = el('<div class="card shadow-neo p-5"></div>');
    card.appendChild(el('<h3 class="font-extrabold tracking-tight mb-4">' + title + "</h3>"));

    var body = el('<div class="flex flex-col sm:flex-row items-center gap-6"></div>');
    var svgWrap = el('<div class="shrink-0 w-40 h-40"></div>');
    svgWrap.innerHTML =
      '<svg viewBox="0 0 42 42" class="w-full h-full -rotate-90" role="img" aria-label="' + title + '">' +
        '<circle cx="21" cy="21" r="15.9155" fill="none" stroke="var(--nhai-soft)" stroke-width="6"></circle>' +
        donutSlices(dist, total) +
      "</svg>";
    body.appendChild(svgWrap);

    var pcts = distPercents(dist, total);
    var legend = el('<div class="space-y-2 text-sm"></div>');
    DIST_META.forEach(function (m, i) {
      var n = dist[m.key] || 0;
      var pct = pcts[i];
      legend.appendChild(el(
        '<div class="flex items-center gap-2">' +
          '<span class="inline-block w-3 h-3 rounded-full" style="background:' + m.color + '"></span>' +
          "<span>" + m.label + " — " + n + " (" + pct + "%)</span>" +
        "</div>"
      ));
    });
    body.appendChild(legend);
    card.appendChild(body);

    card.appendChild(el(
      '<p class="text-xs text-[var(--nhai-muted)] mt-4">Tổng: ' + (D.total || total) + " lượt · Tháng này: " + (D.monthTotal || 0) + " lượt</p>"
    ));
    return card;
  }

  /* % theo largest-remainder rounding → tổng luôn đúng 100. */
  function distPercents(dist, total) {
    if (total <= 0) return DIST_META.map(function () { return 0; });
    var raw = DIST_META.map(function (m) { return ((dist[m.key] || 0) / total) * 100; });
    var floors = raw.map(function (r) { return Math.floor(r); });
    var left = 100 - floors.reduce(function (a, b) { return a + b; }, 0);
    var order = raw
      .map(function (r, i) { return { i: i, frac: r - Math.floor(r) }; })
      .sort(function (a, b) { return b.frac - a.frac; });
    for (var k = 0; k < left; k++) floors[order[k % order.length].i]++;
    return floors;
  }

  /* Chu vi r=15.9155 ≈ 100 → dasharray theo % trực tiếp. Mỗi lát có 1 đơn vị hở để thấy nền. */
  function donutSlices(dist, total) {
    if (total <= 0) return "";
    var R = 15.9155;
    var C = 2 * Math.PI * R;
    var out = "";
    var acc = 0;
    DIST_META.forEach(function (m) {
      var n = dist[m.key] || 0;
      if (n <= 0) return;
      var frac = n / total;
      var len = Math.max(frac * C - 1.5, 0.5); /* -1.5 = khe hở giữa các lát */
      var off = -acc * C;
      out +=
        '<circle cx="21" cy="21" r="' + R + '" fill="none" stroke="' + m.color + '" stroke-width="6" stroke-linecap="round" ' +
        'stroke-dasharray="' + len + " " + (C - len) + '" stroke-dashoffset="' + off + '"></circle>';
      acc += frac;
    });
    return out;
  }

  /* ---------- init ---------- */
  function init() {
    if (!$("#rv-root")) return;
    buildFrame();
    renderCounts();
    renderEmptyCard();
    renderDetail();
  }

  if (document.readyState === "complete") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
