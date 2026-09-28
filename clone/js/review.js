/* Nhai HSK clone — PLAN-05: tổng ôn / thống kê SRS (review.html).
   Bộ thẻ nằm ở localStorage: lesson.js bấm ⭐ tạo key "nhai.srs.w.<book>.<page>.<i>" = "1"
   và tăng counter "nhai.srs.new". Mọi lần đọc JSON hỏng đều try/catch về mặc định 0. */
(function () {
  "use strict";

  var KEY_PREFIX = "nhai.srs.";
  var WORD_RE = /^nhai\.srs\.w\.([a-z0-9]+)\.(.+)\.(\d+)$/;
  var DAY = 24 * 60 * 60 * 1000;
  var SRS_DAYS = 21;

  var state = { tab: "vocab" };

  /* ---------- đọc storage (an toàn) ---------- */
  function readJSON(key) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return null;
      var v = JSON.parse(raw);
      return v && typeof v === "object" ? v : null;
    } catch (e) { return null; }
  }

  function counter(name) {
    var n = parseInt(localStorage.getItem(KEY_PREFIX + name), 10);
    if (!isNaN(n)) return n;
    var obj = readJSON("nhai.srs");
    if (obj && typeof obj[name] === "number") return obj[name];
    return 0;
  }

  function getLS(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function setLS(key, val) {
    try { localStorage.setItem(key, val); } catch (e) { /* silent */ }
  }
  function removeLS(key) {
    try { localStorage.removeItem(key); } catch (e) { /* silent */ }
  }

  /* ---------- bộ thẻ ---------- */
  function collectCards(kind) {
    var cards = [];
    var suffix = kind === "grammar" ? ".g." : ".w.";
    var keys = [];
    try { keys = Object.keys(localStorage); } catch (e) { keys = []; }
    keys.forEach(function (k) {
      if (k.indexOf("nhai.srs" + suffix) !== 0) return;
      var m = k.match(WORD_RE);
      if (!m) return;
      var book = m[1], page = m[2], idx = parseInt(m[3], 10);
      var card = {
        key: k,
        book: book,
        page: page,
        idx: idx,
        hanzi: "?", pinyin: "", meaning: "", source: ""
      };
      var voc = window.NHAI_DATA && NHAI_DATA.vocab && NHAI_DATA.vocab[book] && NHAI_DATA.vocab[book][page];
      if (voc && voc.words && voc.words[idx] && kind === "vocab") {
        var w = voc.words[idx];
        card.hanzi = w.hanzi;
        card.pinyin = w.pinyin;
        card.meaning = w.meaning;
        card.source = bookLabel(book) + " · " + pageTitle(page);
      } else {
        card.hanzi = (book + " " + page + " #" + (idx + 1));
        card.source = kind === "grammar" ? "Ngữ pháp" : bookLabel(book) + " · " + pageTitle(page);
      }
      var st = getLS("nhai.srs.st." + k);
      card.state = st === "learned" || st === "learning" ? st : "due";
      var t = parseInt(getLS("nhai.srs.t." + k), 10);
      card.learnedAt = isNaN(t) ? 0 : t;
      cards.push(card);
    });
    return cards;
  }

  function bookLabel(book) {
    var m = /^hsk(\d+)$/.exec(book);
    return m ? "HSK " + m[1] : book;
  }
  function pageTitle(page) {
    var m = /^lesson-(\d+)$/.exec(page);
    return m ? "Bài " + m[1] : page;
  }

  function computeStats(kind) {
    var cards = collectCards(kind);
    var now = Date.now();
    var due = 0, learning = 0, recent = 0, learned = 0;
    cards.forEach(function (c) {
      if (c.state === "learning") { learning += 1; due += 1; }
      else if (c.state === "learned") {
        if (c.learnedAt && now - c.learnedAt < SRS_DAYS * DAY) recent += 1;
        else learned += 1;
      } else due += 1;
    });
    var total = counter("total") || counter("new") + cards.length;
    return {
      due: counter("due") || due,
      new: counter("new"),
      learning: counter("learning") || learning,
      recent: counter("recent") || recent,
      learned: counter("learned") || learned,
      total: total
    };
  }

  /* ---------- render ---------- */
  function renderStats(kind) {
    var s = computeStats(kind);
    document.querySelectorAll("[data-stat]").forEach(function (el) {
      var name = el.getAttribute("data-stat");
      el.textContent = String(s[name] !== undefined ? s[name] : 0);
    });
  }

  function renderEmpty(kind) {
    var host = document.getElementById("empty-state");
    if (!host) return;
    var cards = collectCards(kind);
    if (cards.length) { host.innerHTML = ""; return; }
    var text = kind === "grammar"
      ? "Bấm nút ⭐ cạnh mỗi ngữ pháp trong bài học để thêm vào bộ thẻ ôn tập."
      : "Bấm nút ⭐ cạnh mỗi từ trong bài học để thêm vào bộ thẻ ôn tập.";
    host.innerHTML = "";
    host.appendChild(NHAI.el(
      '<div class="card shadow-neo p-10 text-center">' +
        '<div class="text-5xl mb-3">🗃️</div>' +
        '<h2 class="text-2xl font-extrabold mb-2">Bộ thẻ đang trống</h2>' +
        '<p class="text-sm text-[var(--nhai-muted)] mb-5">' + text + "</p>" +
        '<a href="course.html" class="btn-main px-5 py-2.5">Vào kệ sách</a>' +
      "</div>"
    ));
  }

  function renderCards(kind) {
    var host = document.getElementById("card-list");
    if (!host) return;
    host.innerHTML = "";
    collectCards(kind).forEach(function (c) {
      var learned = c.state === "learned";
      var li = NHAI.el(
        '<div class="card shadow-neo p-4 flex items-center gap-3">' +
          '<div class="flex-1 min-w-0">' +
            '<div class="flex flex-wrap items-center gap-x-3 gap-y-1">' +
              '<span class="zh text-2xl font-extrabold">' + c.hanzi + "</span>" +
              (c.pinyin ? '<span class="text-sm font-bold">' + c.pinyin + "</span>" : "") +
              '<span class="text-xs font-semibold text-[var(--nhai-muted)]">' + c.source + "</span>" +
            "</div>" +
            '<div class="text-sm font-semibold mt-1">' + c.meaning + "</div>" +
          "</div>" +
          '<div class="flex gap-2 shrink-0">' +
            '<button type="button" data-know="yes" class="' + (learned ? "btn-main" : "btn-ghost") + ' px-3 py-2 text-sm">Đã thuộc</button>' +
            '<button type="button" data-know="no" class="' + (!learned ? "btn-main" : "btn-ghost") + ' px-3 py-2 text-sm">Chưa thuộc</button>' +
          "</div>" +
        "</div>"
      );
      li.querySelector('[data-know="yes"]').addEventListener("click", function () {
        c.state = "learned";
        setLS("nhai.srs.st." + c.key, "learned");
        if (!getLS("nhai.srs.t." + c.key)) setLS("nhai.srs.t." + c.key, String(Date.now()));
        NHAI.toast("Tốt lắm! “" + c.hanzi + "” vào nhóm đã thuộc ✅");
        renderAll();
      });
      li.querySelector('[data-know="no"]').addEventListener("click", function () {
        c.state = "learning";
        setLS("nhai.srs.st." + c.key, "learning");
        removeLS("nhai.srs.t." + c.key);
        var n = parseInt(localStorage.getItem(KEY_PREFIX + "due"), 10);
        if (!isNaN(n)) setLS(KEY_PREFIX + "due", String(n + 1));
        NHAI.toast("“" + c.hanzi + "” sẽ quay lại ở phiên ôn sau 🔁");
        renderAll();
      });
      host.appendChild(li);
    });
  }

  function renderAll() {
    renderStats(state.tab);
    renderCards(state.tab);
    renderEmpty(state.tab);
  }

  function switchTab(tab) {
    if (tab !== "vocab" && tab !== "grammar") tab = "vocab";
    state.tab = tab;
    document.querySelectorAll("[data-tab]").forEach(function (b) {
      var active = b.getAttribute("data-tab") === tab;
      b.classList.toggle("btn-main", active);
      b.classList.toggle("btn-ghost", !active);
    });
    renderAll();
  }

  function init() {
    document.querySelectorAll("[data-tab]").forEach(function (b) {
      b.addEventListener("click", function () { switchTab(b.getAttribute("data-tab")); });
    });
    switchTab(NHAI.q("tab", "vocab"));
  }

  if (document.readyState === "complete") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
