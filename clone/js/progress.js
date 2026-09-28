/* Nhai HSK clone — SPEC-11: trang Tiến độ học (XP, thống kê, heatmap 12 tháng).
   Màn khoá 🔒 khi chưa mock-login; dữ liệu đọc từ localStorage (nhai.*) hoặc demo seeded. */
(function () {
  "use strict";

  /* ---------- localStorage helpers (try/catch → fallback) ---------- */
  function lsGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function lsMap(key) {
    var raw = lsGet(key);
    if (!raw) return null;
    try {
      var v = JSON.parse(raw);
      return v && typeof v === "object" ? v : null;
    } catch (e) { return null; }
  }
  function num(key, def) {
    var v = parseInt(lsGet(key), 10);
    return isNaN(v) ? (def || 0) : v;
  }

  function xp() { return num("nhai.xp", 0); }
  function rank() { return 14594 - xp(); }
  function streak() { return num("nhai.streak", 0); }
  function todayCount() { return num("nhai.today", 0); }

  function knownWords() {
    /* Format chính (review.js sản xuất): key rời "nhai.srs.st.<key>" = "known"/"learned"/"learning" */
    var n = 0;
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && k.indexOf("nhai.srs.st.") === 0) {
          var v = localStorage.getItem(k);
          if (v === "known" || v === "learned") n++;
        }
      }
    } catch (e) { /* silent */ }
    /* Format phụ: một JSON object "nhai.srs.st" (map key → status) */
    var st = lsMap("nhai.srs.st");
    if (st) {
      Object.keys(st).forEach(function (k) { if (st[k] === "known" || st[k] === "learned") n++; });
    }
    /* Format lesson.js: key rời "nhai.srs.w.<key>" = "1" → mỗi key là một từ đã thuộc */
    try {
      for (var j = 0; j < localStorage.length; j++) {
        var wk = localStorage.key(j);
        if (wk && wk.indexOf("nhai.srs.w.") === 0) n++;
      }
    } catch (e) { /* silent */ }
    return n;
  }
  function doneLessons() {
    var pd = lsMap("nhai.pageDone") || {};
    var n = 0;
    Object.keys(pd).forEach(function (k) { if (parseInt(pd[k], 10) >= 2) n++; });
    return n;
  }

  /* ---------- heatmap data: nhai.heat (YYYY-MM-DD → xp) || demo seeded ---------- */
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function heatData() {
    var real = lsMap("nhai.heat");
    var rnd = mulberry32(20251021);
    var map = {};
    var now = new Date();
    for (var back = 11; back >= 0; back--) {
      var d = new Date(now.getFullYear(), now.getMonth() - back, 1);
      var y = d.getFullYear(), m = d.getMonth();
      var days = new Date(y, m + 1, 0).getDate();
      for (var day = 1; day <= days; day++) {
        var key = y + "-" + String(m + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
        var r = rnd();
        map[key] = real && real[key] != null ? real[key] : (r < 0.45 ? 0 : r < 0.7 ? 1 + Math.floor(rnd() * 2) : r < 0.9 ? 3 + Math.floor(rnd() * 3) : 6 + Math.floor(rnd() * 5));
      }
    }
    return map;
  }
  function heatClass(v) {
    if (!v || v <= 0) return "bg-[var(--nhai-bg)] border border-[var(--nhai-border)]";
    if (v <= 2) return "bg-[#f5b7ae]";
    if (v <= 5) return "bg-[#d9534f]";
    return "bg-[#a83232]";
  }

  /* ---------- render ---------- */
  function renderLocked() {
    var body = document.getElementById("page-body");
    if (!body) return;
    body.innerHTML = "";
    body.appendChild(NHAI.el(
      '<div class="card shadow-neo p-10 text-center">' +
        '<div class="text-6xl mb-4" aria-hidden="true">🔒</div>' +
        '<h2 class="text-2xl font-extrabold mb-2">Đăng nhập để xem</h2>' +
        '<p class="text-sm text-[var(--nhai-muted)] mb-6">Tiến độ học của bạn sẽ được đồng bộ sau khi đăng nhập.</p>' +
        '<button type="button" data-login-btn class="btn-main px-6 py-2.5">Đăng nhập</button>' +
      "</div>"
    ));
    body.querySelector("[data-login-btn]").addEventListener("click", function () {
      if (NHAI.openLogin) NHAI.openLogin();
    });
  }

  function statCard(icon, label, value, sub) {
    return (
      '<div class="card shadow-neo p-4">' +
        '<div class="flex items-center gap-2 mb-2">' +
          '<span class="w-8 h-8 rounded-md bg-[var(--nhai-soft)] border-2 border-[var(--nhai-border)] flex items-center justify-center text-base" aria-hidden="true">' + icon + "</span>" +
          '<span class="text-sm font-bold">' + label + "</span>" +
        "</div>" +
        '<div class="text-2xl font-extrabold mb-1">' + value + "</div>" +
        '<p class="text-xs text-[var(--nhai-muted)]">' + sub + "</p>" +
      "</div>"
    );
  }

  function renderHeatmap() {
    var map = heatData();
    var now = new Date();
    var cols = "";
    for (var back = 11; back >= 0; back--) {
      var d = new Date(now.getFullYear(), now.getMonth() - back, 1);
      var y = d.getFullYear(), m = d.getMonth();
      var days = new Date(y, m + 1, 0).getDate();
      var cells = "";
      for (var day = 1; day <= days; day++) {
        var key = y + "-" + String(m + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
        var v = map[key] || 0;
        cells += '<span class="block w-[10px] h-[10px] rounded-[2px] ' + heatClass(v) +
          '" title="Tháng ' + (m + 1) + ' ngày ' + day + ': Xp ' + v + '" data-tip="Xp: ' + v + '"></span>';
      }
      cols +=
        '<div class="flex flex-col items-center gap-[3px] min-w-0">' +
          '<span class="text-[10px] font-bold text-[var(--nhai-muted)] mb-1 whitespace-nowrap">Tháng ' + (m + 1) + "</span>" +
          '<div class="flex flex-col gap-[3px]">' + cells + "</div>" +
        "</div>";
    }
    return (
      '<div class="card shadow-neo p-5">' +
        '<h3 class="font-extrabold mb-1">Lịch học</h3>' +
        '<p class="text-xs text-[var(--nhai-muted)] mb-4">12 tháng gần đây</p>' +
        '<div data-heat class="grid gap-2" style="grid-template-columns:repeat(12,1fr);overflow-x:auto">' + cols + "</div>" +
      "</div>"
    );
  }

  function renderLoggedIn() {
    var body = document.getElementById("page-body");
    if (!body) return;
    body.innerHTML = "";
    /* NHAI.el chỉ trả firstElementChild → bọc tất cả trong MỘT root div */
    body.appendChild(NHAI.el(
      "<div>" +
      /* Card Điểm của bạn */
      '<div class="card shadow-neo p-6 mb-6">' +
        '<div class="flex items-start gap-4 flex-wrap">' +
          '<span class="w-12 h-12 rounded-lg bg-[#ffe9a8] border-2 border-[var(--nhai-border)] flex items-center justify-center text-2xl shrink-0" aria-hidden="true">⚡</span>' +
          '<div class="min-w-0">' +
            '<h2 class="text-lg font-extrabold">Điểm của bạn</h2>' +
            '<div class="text-5xl font-extrabold text-[var(--nhai-main)] leading-tight" data-xp>' + xp() + "</div>" +
            '<p class="text-xs text-[var(--nhai-muted)]">Mỗi câu trả lời đúng +1 điểm</p>' +
          "</div>" +
          '<div class="ml-auto flex flex-col items-end gap-2">' +
            '<div class="flex items-center gap-2">' +
              '<span class="text-sm font-semibold" aria-hidden="true">🏆</span>' +
              '<span class="text-sm font-semibold">Dạng xếp hạng</span>' +
              '<span class="pill bg-[#ffe9a8] font-extrabold" data-rank>#' + rank() + "</span>" +
            "</div>" +
            '<a href="leaderboard.html" class="btn-main px-4 py-2 text-sm">Xem bảng xếp hạng →</a>' +
          "</div>" +
        "</div>" +
      "</div>" +
      /* Thống kê học tập */
      '<h2 class="text-xl font-extrabold mb-3">Thống kê học tập</h2>' +
      '<div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">' +
        statCard("🔥", "Chuỗi ngày học", streak(), "Học hôm nay để bắt đầu chuỗi") +
        statCard("📖", "Từ đã thuộc", knownWords(), "trên tổng 9789 từ") +
        statCard("✅", "Bài hoàn thành", doneLessons() + "/153", "Xong khi học đủ 2 chế độ") +
        statCard("🎯", "Hôm nay", todayCount() + " câu", "Số câu trả lời đúng trong ngày") +
      "</div>" +
      /* Lịch học */
      renderHeatmap() +
      "</div>"
    ));

    /* tooltip "Xp: N" khi hover ô heatmap (song song với title attr) */
    var tip = null;
    var heat = body.querySelector("[data-heat]");
    if (heat) {
      heat.addEventListener("mouseover", function (e) {
        var cell = e.target.closest("[data-tip]");
        if (!cell) return;
        if (tip) tip.remove();
        tip = NHAI.el('<div class="card shadow-neo fixed z-[600] px-2 py-1 text-xs font-semibold pointer-events-none">' + cell.getAttribute("data-tip") + "</div>");
        document.body.appendChild(tip);
        var r = cell.getBoundingClientRect();
        tip.style.left = Math.max(8, r.left + r.width / 2 - tip.offsetWidth / 2) + "px";
        tip.style.top = (r.top - tip.offsetHeight - 6) + "px";
      });
      heat.addEventListener("mouseout", function (e) {
        if (e.target.closest && e.target.closest("[data-tip]") && tip) { tip.remove(); tip = null; }
      });
    }
  }

  function render() {
    var loggedIn = false;
    try { loggedIn = !!NHAI.isLoggedIn(); } catch (e) { loggedIn = false; }
    if (loggedIn) renderLoggedIn();
    else renderLocked();
  }

  function init() {
    render();
    /* shell render xong → đăng nhập từ modal phải làm mới trang */
    document.addEventListener("nhai:shell-ready", render);
    /* bấm nút đăng nhập trong modal → re-render sau khi modal xử lý */
    document.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest("[data-do-login], [data-provider]")) {
        setTimeout(render, 80);
      }
    });
  }

  if (document.readyState === "complete") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
