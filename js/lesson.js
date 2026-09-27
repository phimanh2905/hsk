/* Nhai HSK clone — lesson.html (PLAN-02): state machine chế độ học + sidebar + tabs + danh sách từ. */
(function () {
  "use strict";

  var MODE_ORDER = ["flashcard", "quiz", "typing", "reading", "listen", "dance", "battle"];
  var MODE_META = {
    flashcard: { label: "📇 Flashcard", defaultBadge: null }, // badge = tiến độ đã thuộc
    quiz: { label: "✅ Trắc nghiệm", defaultBadge: "0 / 0" },
    typing: { label: "⌨️ Gõ từ", defaultBadge: "0 / 0" },
    reading: { label: "📖 Đọc hiểu", defaultBadge: "Chưa học" },
    listen: { label: "🎧 Nghe ghép câu", defaultBadge: "Chưa học" },
    dance: { label: "💃 Hanzi Dance", defaultBadge: "Chưa học" },
    battle: { label: "⚔️ Đấu trí", defaultBadge: "Xếp hạng" }
  };

  var S = {
    book: "hsk1",
    page: "lesson-1",
    lesson: null,
    words: [],
    mode: null,
    cleanups: [],
    known: {},      // index từ -> "known" | "unknown"
    badges: {}
  };

  function $(sel, root) { return (root || document).querySelector(sel); }

  function lessonNumber() {
    var m = /^lesson-(\d+)$/.exec(S.page);
    return m ? m[1] : "1";
  }

  function loadData() {
    var data = (window.NHAI_DATA && NHAI_DATA.vocab) || {};
    S.book = NHAI.q("book", "hsk1");
    S.page = NHAI.q("page", "lesson-1");
    var bookData = data[S.book] || data.hsk1 || {};
    var lesson = bookData[S.page];
    if (!lesson) {
      // fallback: bài 1 HSK1
      S.book = "hsk1";
      S.page = "lesson-1";
      if (bookData !== data.hsk1) bookData = data.hsk1 || {};
      lesson = bookData[S.page] || Object.values(bookData)[0];
    }
    S.lesson = lesson || { title: "Bài học", words: [] };
    S.words = S.lesson.words || [];
  }

  function renderHeader() {
    var num = lessonNumber();
    var bookLabel = String(S.book).toUpperCase();
    $("#back-link").setAttribute("href", "course.html?book=" + encodeURIComponent(S.book) + "&skill=vocab");
    $("#lesson-badge").textContent = "Bài " + num;
    $("#count-badge").textContent = S.words.length + " từ vựng";
    $("#lesson-title").textContent = S.lesson.title || "Bài " + num;
    $("#lesson-sub").textContent = "Bài " + num + " — Từ vựng " + bookLabel;
    document.title = (S.lesson.title || "Bài " + num) + " · HSK 1 3.0 | Nhai HSK";
  }

  /* ---------- sidebar ---------- */
  function renderSidebar() {
    var host = $("#sidebar-modes");
    host.innerHTML = "";
    MODE_ORDER.forEach(function (id) {
      var meta = MODE_META[id];
      var mode = (window.NHAI.lessonModes || {})[id];
      if (!mode) return;
      var badge = S.badges[id];
      if (badge === undefined || badge === null) {
        badge = typeof mode.defaultBadge === "function" ? mode.defaultBadge(S) : mode.defaultBadge;
        if (badge === undefined || badge === null) badge = meta.defaultBadge;
        if (badge === undefined || badge === null) badge = "Chưa học";
      }
      var btn = NHAI.el(
        '<button type="button" data-mode="' + id + '" class="w-full flex items-center justify-between gap-2 px-3 py-2 mb-2 text-sm text-left rounded-lg border-2 ' +
        (S.mode === id ? "btn-main" : "btn-ghost") + '">' +
          "<span>" + meta.label + "</span>" +
          '<span data-badge class="text-xs font-bold whitespace-nowrap ' + (S.mode === id ? "" : "text-[var(--nhai-muted)]") + '">' + badge + "</span>" +
        "</button>"
      );
      btn.addEventListener("click", function () { switchMode(id); });
      host.appendChild(btn);
    });
    $("#btn-print").addEventListener("click", function () { window.print(); });
    $("#btn-add-all").addEventListener("click", function () {
      var n = parseInt(localStorage.getItem("nhai.srs.new") || "0", 10) + S.words.length;
      localStorage.setItem("nhai.srs.new", String(n));
      NHAI.toast("Đã thêm " + S.words.length + " từ vào ôn tập ⭐");
    });
  }

  function refreshSidebar() {
    var host = $("#sidebar-modes");
    MODE_ORDER.forEach(function (id) {
      var btn = host.querySelector('[data-mode="' + id + '"]');
      if (!btn) return;
      var active = id === S.mode;
      btn.classList.toggle("btn-main", active);
      btn.classList.toggle("btn-ghost", !active);
      var b = btn.querySelector("[data-badge]");
      b.classList.toggle("text-[var(--nhai-muted)]", !active);
      b.textContent = S.badges[id] !== undefined ? S.badges[id] : b.textContent;
    });
  }

  /* ---------- mode switching (state machine) ---------- */
  function switchMode(id) {
    var mode = (window.NHAI.lessonModes || {})[id];
    if (!mode) return;
    S.cleanups.splice(0).forEach(function (fn) { try { fn(); } catch (e) { /* ignore */ } });
    S.mode = id;
    $("#mode-name").textContent = mode.label || MODE_META[id].label.replace(/^\S+\s/, "");
    $("#mode-counter").textContent = "1 / " + S.words.length;
    var content = $("#mode-content");
    content.innerHTML = "";
    var ctx = {
      book: S.book,
      page: S.page,
      lesson: S.lesson,
      words: S.words,
      total: S.words.length,
      known: S.known,
      setCounter: function (txt) { $("#mode-counter").textContent = txt; },
      setBadge: function (modeId, txt) {
        S.badges[modeId] = txt;
        var b = $("#sidebar-modes").querySelector('[data-mode="' + modeId + '"] [data-badge]');
        if (b) b.textContent = txt;
      },
      refreshKnownBadge: function () {
        var n = 0;
        Object.keys(S.known).forEach(function (k) { if (S.known[k] === "known") n++; });
        S.badges.flashcard = n + " / " + S.words.length;
        var b = $("#sidebar-modes").querySelector('[data-mode="flashcard"] [data-badge]');
        if (b) b.textContent = S.badges.flashcard;
      },
      addCleanup: function (fn) { S.cleanups.push(fn); },
      speak: NHAI.speak
    };
    mode.render(content, ctx);
    refreshSidebar();
    $("#mode-area").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /* ---------- tabs ---------- */
  function bindTabs() {
    var tabs = document.querySelectorAll("[data-tab]");
    tabs.forEach(function (t) {
      t.addEventListener("click", function () {
        tabs.forEach(function (x) { x.classList.toggle("pill-active", x === t); });
        $("#tab-vocab").classList.toggle("hidden", t.getAttribute("data-tab") !== "vocab");
        $("#tab-examples").classList.toggle("hidden", t.getAttribute("data-tab") !== "examples");
      });
    });
  }

  /* ---------- tab Ví dụ ---------- */
  function renderExamples() {
    var host = $("#examples-list");
    host.innerHTML = "";
    S.words.forEach(function (w) {
      var card = NHAI.el(
        '<div class="card p-3 flex items-start justify-between gap-3">' +
          "<div>" +
            '<div class="zh text-lg font-bold">' + w.example.zh + "</div>" +
            '<div class="text-xs text-[var(--nhai-muted)] mt-0.5">' + NHAI.pinyinLine(w.example.pinyinPerChar) + "</div>" +
            '<div class="text-sm mt-1">→ ' + w.example.vi + "</div>" +
          "</div>" +
          '<button type="button" class="btn-ghost w-10 h-10 shrink-0" title="Phát âm câu ví dụ">🔊</button>' +
        "</div>"
      );
      card.querySelector("button").addEventListener("click", function () { NHAI.speak(w.example.zh); });
      host.appendChild(card);
    });
  }

  /* ---------- danh sách từ cuối trang ---------- */
  function srsId(i) { return "nhai.srs.w." + S.book + "." + S.page + "." + i; }

  function renderWordList() {
    var host = $("#word-list");
    host.innerHTML = "";
    S.words.forEach(function (w, i) {
      var added = localStorage.getItem(srsId(i)) === "1";
      var li = NHAI.el(
        '<li class="card p-3 sm:p-4">' +
          '<div class="flex items-start gap-3">' +
            '<span class="font-extrabold text-lg w-6 shrink-0 text-[var(--nhai-muted)]">' + (i + 1) + ".</span>" +
            '<div class="flex-1 min-w-0">' +
              '<div class="flex flex-wrap items-center gap-x-3 gap-y-1">' +
                '<span class="zh text-2xl font-extrabold">' + w.hanzi + "</span>" +
                '<span class="pill text-xs py-0.5">' + w.pos + "</span>" +
                '<span class="text-sm font-bold">' + w.pinyin + "</span>" +
                '<span class="text-sm font-extrabold text-[var(--nhai-main)]">' + w.hanViet + "</span>" +
              "</div>" +
              '<div class="text-sm mt-1 font-semibold">' + w.meaning + "</div>" +
              '<div class="text-sm mt-1.5"><span class="zh font-semibold">' + w.example.zh + "</span>" +
                ' <span class="text-xs text-[var(--nhai-muted)]">' + NHAI.pinyinLine(w.example.pinyinPerChar) + "</span></div>" +
              '<div class="text-xs text-[var(--nhai-muted)] mt-0.5">→ ' + w.example.vi + "</div>" +
            "</div>" +
            '<div class="flex flex-col sm:flex-row gap-1 shrink-0 no-print">' +
              '<button type="button" data-act="report" class="btn-ghost w-9 h-9 text-sm" title="Báo lỗi">⚠️</button>' +
              '<button type="button" data-act="srs" class="btn-ghost w-9 h-9 text-sm" title="Thêm vào bộ thẻ ôn tập">⭐</button>' +
              '<button type="button" data-act="speak" class="btn-ghost w-9 h-9 text-sm" title="Phát âm từ">🔊</button>' +
            "</div>" +
          "</div>" +
        "</li>"
      );
      li.querySelector('[data-act="report"]').addEventListener("click", function () {
        NHAI.toast("Đã gửi báo lỗi cho từ “" + w.hanzi + "”. Cảm ơn bạn!");
      });
      var starBtn = li.querySelector('[data-act="srs"]');
      if (added) starBtn.classList.add("text-[var(--nhai-gold)]");
      starBtn.addEventListener("click", function () {
        if (localStorage.getItem(srsId(i)) === "1") {
          localStorage.removeItem(srsId(i));
          starBtn.classList.remove("text-[var(--nhai-gold)]");
          NHAI.toast("Đã bỏ khỏi ôn tập");
          return;
        }
        localStorage.setItem(srsId(i), "1");
        var n = parseInt(localStorage.getItem("nhai.srs.new") || "0", 10) + 1;
        localStorage.setItem("nhai.srs.new", String(n));
        starBtn.classList.add("text-[var(--nhai-gold)]");
        NHAI.toast("Đã thêm vào ôn tập ⭐");
      });
      li.querySelector('[data-act="speak"]').addEventListener("click", function () { NHAI.speak(w.hanzi); });
      host.appendChild(li);
    });
  }

  /* ---------- boot ---------- */
  function init() {
    loadData();
    renderHeader();
    renderSidebar();
    bindTabs();
    renderExamples();
    renderWordList();
    switchMode("flashcard");
  }

  if (document.readyState === "complete") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
