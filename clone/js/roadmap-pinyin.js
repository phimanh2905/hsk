/* Nhai HSK clone — PLAN-05: lộ trình Pinyin 6 bước (roadmap-pinyin.html?step=1..6) */
(function () {
  "use strict";

  var TOTAL = 6;

  function stepFromQuery() {
    var raw = NHAI.q("step", "1");
    var n = parseInt(raw, 10);
    if (isNaN(n) || n < 1 || n > TOTAL) n = 1;
    return n;
  }

  function data() {
    return (window.NHAI_DATA && NHAI_DATA.roadmapPinyin && NHAI_DATA.roadmapPinyin.steps) || [];
  }

  /* ---------- stepper ---------- */
  function renderStepper(current) {
    var host = document.getElementById("stepper");
    if (!host) return;
    host.innerHTML = "";
    data().forEach(function (s, i) {
      var n = i + 1;
      host.appendChild(NHAI.el(
        '<a href="roadmap-pinyin.html?step=' + n + '" class="px-3 py-2 text-xs sm:text-sm font-bold rounded-lg border-2 ' +
          (n === current ? "btn-main" : "btn-ghost") + '">' + n + " · " + s.label + "</a>"
      ));
    });
  }

  /* ---------- nút 🔊 ---------- */
  function speakBtn(text) {
    var b = NHAI.el('<button type="button" class="btn-ghost w-9 h-9 text-sm shrink-0" title="Nghe phát âm">🔊</button>');
    b.addEventListener("click", function () { NHAI.speak(text, "zh-CN", 0.8); });
    return b;
  }

  /* ---------- từng bước ---------- */
  function renderInitials(s) {
    var frag = document.createDocumentFragment();
    var grid = NHAI.el('<div class="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-4"></div>');
    s.initials.forEach(function (x) {
      var card = NHAI.el(
        '<div class="card p-3 flex flex-col items-center gap-1">' +
          '<span class="text-2xl font-extrabold tracking-wide">' + x + "</span>" +
          '<span class="text-[10px] text-[var(--nhai-muted)]">thanh mẫu</span>' +
        "</div>"
      );
      card.appendChild(speakBtn(x));
      grid.appendChild(card);
    });
    frag.appendChild(grid);
    frag.appendChild(NHAI.el('<p class="text-sm text-[var(--nhai-muted)] card p-4">' + s.theory + "</p>"));
    return frag;
  }

  function renderFinals(s) {
    var grid = NHAI.el('<div class="grid sm:grid-cols-2 gap-3"></div>');
    s.vowels.forEach(function (v) {
      var card = NHAI.el(
        '<div class="card p-4 flex items-center gap-3">' +
          '<span class="w-12 h-12 rounded-full bg-[var(--nhai-main)] text-white font-extrabold text-xl flex items-center justify-center shrink-0">' + v.s + "</span>" +
          '<div class="min-w-0">' +
            '<div class="font-bold mb-0.5"><span class="zh">' + v.zh + "</span> · " + v.s + "</div>" +
            '<p class="text-sm text-[var(--nhai-muted)]">' + v.vi + "</p>" +
          "</div>" +
        "</div>"
      );
      card.insertBefore(speakBtn(v.s), card.lastElementChild.nextSibling);
      grid.appendChild(card);
    });
    return grid;
  }

  function renderCompound(s) {
    var frag = document.createDocumentFragment();
    s.groups.forEach(function (g) {
      frag.appendChild(NHAI.el('<h3 class="font-extrabold mb-2">' + g.name + "</h3>"));
      var grid = NHAI.el('<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4"></div>');
      g.items.forEach(function (it) {
        var card = NHAI.el(
          '<div class="card p-3 flex items-center gap-2">' +
            '<span class="text-xl font-extrabold">' + it.s + "</span>" +
            '<div class="min-w-0 text-sm"><span class="zh font-bold">' + it.zh + "</span> " +
              '<span class="text-[var(--nhai-muted)]">' + it.vi + "</span></div>" +
          "</div>"
        );
        card.appendChild(speakBtn(it.s));
        grid.appendChild(card);
      });
      frag.appendChild(grid);
    });
    return frag;
  }

  function renderTones(s) {
    var grid = NHAI.el('<div class="grid sm:grid-cols-2 gap-3"></div>');
    s.tones.forEach(function (t) {
      var card = NHAI.el(
        '<div class="card p-4">' +
          '<div class="flex items-center gap-3 mb-2">' +
            '<span class="text-4xl font-extrabold text-[var(--nhai-main)] w-12 text-center">' + t.mark + "</span>" +
            '<span class="text-2xl text-[var(--nhai-muted)]" aria-hidden="true">' + t.arrow + "</span>" +
            '<span class="font-extrabold">' + t.name + "</span>" +
          "</div>" +
          '<p class="text-sm text-[var(--nhai-muted)] mb-2">' + t.desc + "</p>" +
          '<div class="flex items-center gap-2">' +
            '<span class="text-xl font-extrabold">' + t.py + "</span>" +
            '<span class="zh text-xl font-bold">' + t.zh + "</span>" +
            '<span class="text-sm text-[var(--nhai-muted)]">' + t.vi + "</span>" +
          "</div>" +
        "</div>"
      );
      card.insertBefore(speakBtn(t.py), card.lastElementChild.nextSibling);
      grid.appendChild(card);
    });
    return grid;
  }

  function renderRules(s) {
    var list = NHAI.el('<div class="space-y-3"></div>');
    s.rules.forEach(function (r) {
      list.appendChild(NHAI.el(
        '<div class="card p-4">' +
          '<div class="font-extrabold mb-1">📌 ' + r.rule + "</div>" +
          '<p class="text-sm text-[var(--nhai-muted)] mb-1">' + r.desc + "</p>" +
          '<p class="text-sm font-semibold zh">' + r.ex + "</p>" +
        "</div>"
      ));
    });
    return list;
  }

  function renderRecap(s) {
    var frag = document.createDocumentFragment();
    frag.appendChild(NHAI.el(
      '<div class="card shadow-neo p-6 text-center mb-4">' +
        '<div class="text-4xl mb-2">🎉</div>' +
        '<p class="text-sm text-[var(--nhai-muted)] mb-5">' + s.note + "</p>" +
        '<div class="flex flex-wrap justify-center gap-3">' +
          '<a href="pinyin-practice.html" class="btn-main px-5 py-2.5">Làm bài tập pinyin</a>' +
          '<a href="pinyin.html" class="btn-ghost px-5 py-2.5">Xem lại bảng</a>' +
        "</div>" +
      "</div>"
    ));
    return frag;
  }

  function renderStep(current) {
    var s = data()[current - 1];
    var host = document.getElementById("step-content");
    if (!host || !s) return;
    host.innerHTML = "";

    var head = NHAI.el('<section class="mb-4"><h2 class="text-2xl font-extrabold mb-1">' + s.title + "</h2>" +
      '<p class="text-sm text-[var(--nhai-muted)]">' + s.intro + "</p></section>");
    host.appendChild(head);

    var body = NHAI.el('<section></section>');
    if (s.key === "initials") body.appendChild(renderInitials(s));
    else if (s.key === "finals") body.appendChild(renderFinals(s));
    else if (s.key === "compound") body.appendChild(renderCompound(s));
    else if (s.key === "tones") body.appendChild(renderTones(s));
    else if (s.key === "rules") body.appendChild(renderRules(s));
    else body.appendChild(renderRecap(s));
    host.appendChild(body);

    /* prev / next */
    var nav = document.getElementById("step-nav");
    nav.innerHTML = "";
    if (current > 1) {
      nav.appendChild(NHAI.el('<a href="roadmap-pinyin.html?step=' + (current - 1) + '" class="btn-ghost px-4 py-2 text-sm">← Bước trước</a>'));
    } else {
      nav.appendChild(NHAI.el('<a href="roadmap.html" class="btn-ghost px-4 py-2 text-sm">← Về lộ trình</a>'));
    }
    if (current < TOTAL) {
      nav.appendChild(NHAI.el('<a href="roadmap-pinyin.html?step=' + (current + 1) + '" class="btn-main px-4 py-2 text-sm">Bước sau →</a>'));
    } else {
      nav.appendChild(NHAI.el('<a href="course.html?book=hsk1" class="btn-main px-4 py-2 text-sm">Vào HSK 1 →</a>'));
    }
  }

  /* ================= PLAN-21: timeline 8 buổi ================= */

  var SESSIONS = (window.NHAI_DATA && NHAI_DATA.roadmap && NHAI_DATA.roadmap.pinyin && NHAI_DATA.roadmap.pinyin.sessions) || [];
  var STORE_KEY = "nhai.roadmap.pinyin";

  function loadState() {
    try {
      var s = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      if (s && Array.isArray(s.done)) return { done: s.done, quizDone: Array.isArray(s.quizDone) ? s.quizDone : [] };
    } catch (e) { /* reset */ }
    return { done: [], quizDone: [] };
  }

  function timelineStatus(n, done) {
    if (done.indexOf(n) !== -1) return "done";
    var hasData = false;
    SESSIONS.forEach(function (s) { if (s.n === n) hasData = true; });
    if (!hasData) return "locked";
    /* unlocked nếu là buổi đầu tiên chưa xong */
    var firstUndone = null;
    SESSIONS.forEach(function (s) { if (firstUndone === null && done.indexOf(s.n) === -1) firstUndone = s.n; });
    return n === firstUndone ? "current" : "locked";
  }

  function renderTimeline() {
    var nodesHost = document.getElementById("timeline-nodes");
    var endHost = document.getElementById("timeline-end");
    if (!nodesHost || !SESSIONS.length) return;

    var state = loadState();
    var done = state.done;
    var learned = done.length;
    nodesHost.innerHTML = "";

    SESSIONS.forEach(function (s) {
      var st = timelineStatus(s.n, done);
      var row = document.createElement("div");
      row.className = "tl-row tl-" + st + " relative flex items-start gap-4 mb-6 md:mb-8 md:min-h-[6.5rem]" + (st === "locked" ? " group" : "");

      var circleCls, circleText;
      if (st === "done") {
        circleCls = "border-2 border-green-600 text-green-700 bg-white";
        circleText = "✓";
      } else if (st === "current") {
        circleCls = "border-4 border-[var(--nhai-main)] text-[var(--nhai-main)] bg-white font-extrabold";
        circleText = s.n;
      } else {
        circleCls = "border-2 border-[var(--nhai-border)] text-[var(--nhai-muted)] bg-[var(--nhai-soft)]";
        circleText = "🔒";
      }

      var cardBorder = st === "current" ? "border-[var(--nhai-main)]" : "";
      var cardDim = st === "locked" ? "opacity-60" : "";
      var badge = st === "current" ? '<span class="inline-block text-[10px] font-bold uppercase tracking-wide bg-[var(--nhai-main)] text-white rounded-full px-2 py-0.5 mb-1">Bạn đang ở đây</span>' : "";
      var statusLabel = st === "done" ? '<span class="text-xs font-bold text-green-700">✓ Hoàn thành</span>'
        : st === "current" ? '<span class="text-xs font-bold text-[var(--nhai-main)]">Chưa hoàn thành bài kiểm tra</span>'
        : '<span class="text-xs text-[var(--nhai-muted)]">🔒 Buổi chưa mở khoá</span>';
      var prev = s.n - 1;
      var tooltip = '<div class="tl-tooltip absolute z-20 left-16 md:left-auto md:right-full md:mr-3 top-0 w-64 card shadow-neo p-3 text-xs leading-snug">' +
        "Buổi chưa mở khoá 🔒 — Hoàn thành Bài kiểm tra của Buổi " + prev + " để mở Buổi " + s.n + "</div>";

      var interactive = st === "done" || st === "current";
      var wrap = NHAI.el(
        '<div class="tl-card-wrap relative flex-1 md:flex-none md:w-[calc(50%-3.5rem)] z-10">' +
          '<' + (interactive ? 'a href="roadmap-session.html?s=' + s.n + '"' : 'div') +
            ' class="block card shadow-neo p-4 border-2 ' + cardBorder + " " + cardDim +
            (interactive ? " cursor-pointer hover:shadow-lg transition-shadow" : " cursor-not-allowed") + '">' +
            badge +
            '<div class="flex items-baseline justify-between gap-2"><h3 class="font-extrabold text-base sm:text-lg">' + s.n + ". " + s.title + "</h3>" +
            '<span class="text-xs text-[var(--nhai-muted)] shrink-0">⏱ ' + s.minutes + " phút</span></div>" +
            '<p class="text-sm text-[var(--nhai-muted)] mt-1 mb-2">' + s.desc + "</p>" +
            statusLabel +
          "</" + (interactive ? "a" : "div") + ">" +
          (st === "locked" ? tooltip : "") +
        "</div>"
      );

      /* mobile: circle inline; desktop: circle absolute on the line */
      var circle = NHAI.el('<div class="w-14 h-14 shrink-0 rounded-full flex items-center justify-center text-lg md:absolute md:left-1/2 md:-translate-x-1/2 md:top-4 ' + circleCls + '">' + circleText + "</div>");
      row.appendChild(circle);
      row.appendChild(wrap);
      nodesHost.appendChild(row);
    });

    if (endHost) {
      endHost.innerHTML = "";
      endHost.appendChild(NHAI.el(
        '<div class="flex flex-col items-center gap-1 mt-2">' +
          '<div class="border-2 border-[var(--nhai-main)] rounded-xl px-6 py-3 font-extrabold bg-white shadow-neo">🚩 8 buổi · Hoàn thành chặng</div>' +
          '<p class="text-sm text-[var(--nhai-muted)]">Bạn mới học ' + learned + "/8 buổi</p>" +
        "</div>"
      ));
    }
  }

  function init() {
    var current = stepFromQuery();
    renderStepper(current);
    renderStep(current);
    renderTimeline();
  }

  if (document.readyState === "complete") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
