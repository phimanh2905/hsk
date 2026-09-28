/* Nhai HSK clone — PLAN-05: các trang login-gated (my-vocab, my-grammar, progress).
   Màn khoá chung 🔒; progress có 3 card tiến độ demo khi nhai.mockLogin=1. */
(function () {
  "use strict";

  var PAGES = {
    "my-vocab": {
      desc: "Sổ tay từ vựng của bạn sẽ xuất hiện ở đây sau khi đăng nhập."
    },
    "my-grammar": {
      desc: "Sổ tay ngữ pháp của bạn sẽ xuất hiện ở đây sau khi đăng nhập."
    },
    "progress": {
      desc: "Tiến độ học của bạn sẽ được đồng bộ sau khi đăng nhập."
    }
  };

  function pageKey() {
    var main = document.querySelector("main[data-page]");
    return main ? main.getAttribute("data-page") : null;
  }

  function renderLocked(desc) {
    var body = document.getElementById("page-body");
    if (!body) return;
    body.innerHTML = "";
    body.appendChild(NHAI.el(
      '<div class="card shadow-neo p-10 text-center">' +
        '<div class="text-6xl mb-4" aria-hidden="true">🔒</div>' +
        '<h2 class="text-2xl font-extrabold mb-2">Đăng nhập để xem</h2>' +
        '<p class="text-sm text-[var(--nhai-muted)] mb-6">' + desc + "</p>" +
        '<button type="button" data-login-btn class="btn-main px-6 py-2.5">Đăng nhập</button>' +
      "</div>"
    ));
    body.querySelector("[data-login-btn]").addEventListener("click", function () {
      if (NHAI.openLogin) NHAI.openLogin();
    });
  }

  function progressCard(title, sub, done, total) {
    var pct = total ? Math.round((done / total) * 100) : 0;
    return (
      '<div class="card shadow-neo p-5">' +
        '<div class="flex items-center justify-between mb-1">' +
          '<h3 class="font-extrabold">' + title + "</h3>" +
          '<span class="text-sm font-bold text-[var(--nhai-main)]">' + done + "/" + total + "</span>" +
        "</div>" +
        '<p class="text-xs text-[var(--nhai-muted)] mb-3">' + sub + "</p>" +
        '<div class="h-3 rounded-full bg-[var(--nhai-soft)] border-2 border-[var(--nhai-border)] overflow-hidden">' +
          '<div class="h-full bg-[var(--nhai-main)]" style="width:' + pct + '%"></div>' +
        "</div>" +
      "</div>"
    );
  }

  function renderProgressLoggedIn() {
    var body = document.getElementById("page-body");
    if (!body) return;
    body.innerHTML = "";
    body.appendChild(NHAI.el(
      '<div class="grid sm:grid-cols-3 gap-4 mb-6">' +
        progressCard("HSK 1", "bài học đã hoàn thành", 2, 15) +
        progressCard("Pinyin", "âm đã luyện trên bảng pinyin", 0, 406) +
        progressCard("Bộ thủ", "bộ thủ đã thuộc", 0, 214) +
      "</div>"
    ));
    var logout = NHAI.el('<button type="button" data-logout class="btn-ghost px-5 py-2.5 text-sm">Đăng xuất (demo)</button>');
    logout.addEventListener("click", function () {
      try { localStorage.removeItem("nhai.mockLogin"); } catch (e) { /* silent */ }
      NHAI.toast("Đã đăng xuất (demo)");
      render();
    });
    body.appendChild(logout);
  }

  function renderMyPageEmpty(kind) {
    var body = document.getElementById("page-body");
    if (!body) return;
    var noun = kind === "my-grammar" ? "ngữ pháp" : "từ vựng";
    body.innerHTML = "";
    body.appendChild(NHAI.el(
      '<div class="card shadow-neo p-10 text-center">' +
        '<div class="text-5xl mb-3">' + (kind === "my-grammar" ? "📘" : "📓") + "</div>" +
        '<h2 class="text-2xl font-extrabold mb-2">Sổ tay ' + noun + " đang trống</h2>" +
        '<p class="text-sm text-[var(--nhai-muted)] mb-5">Lưu ' + noun + " bằng nút ⭐ hoặc 🔖 trong bài học, chúng sẽ xuất hiện ở đây.</p>" +
        '<a href="course.html" class="btn-main px-5 py-2.5">Vào kệ sách</a>' +
      "</div>"
    ));
  }

  function render() {
    var key = pageKey();
    /* PLAN-12: trang bộ deck tùy chỉnh (đã đăng nhập) */
    if (key === "my-vocab" && window.NHAI && NHAI.isLoggedIn && NHAI.isLoggedIn() && window.NHAI.renderDeckPage) {
      window.NHAI.renderDeckPage(key);
      return;
    }
    if (!key || !PAGES[key]) return;
    var loggedIn = false;
    try { loggedIn = !!NHAI.isLoggedIn(); } catch (e) { loggedIn = false; }
    if (!loggedIn) renderLocked(PAGES[key].desc);
    else if (key === "progress") renderProgressLoggedIn();
    else renderMyPageEmpty(key);
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

/* PLAN-12 (SPEC-12): tạo & quản lý bộ deck tùy chỉnh — my-vocab (sau này my-grammar đối xứng).
   Lưu localStorage "nhai.decks": [{id, name, rows:[{hanzi,pinyin,meaning}]}]. */
(function () {
  "use strict";

  var CFG = {
    "my-vocab": {
      storage: "nhai.decks",
      icon: "📒",
      emptyTitle: "Chưa có bộ từ vựng nào",
      emptySub: "Tạo bộ đầu tiên để nhập từ vựng từ tài liệu của bạn.",
      listTitle: "Bộ từ của tôi",
      modalHint: "Dán danh sách từ — mỗi dòng một từ, định dạng: chữ Hán [tab/space] pinyin [tab/space] nghĩa",
      modalPlaceholder: "时间 shíjiān thời gian",
      rowHint: "chữ Hán [cách] pinyin [cách] nghĩa",
      defaultName: "Bộ từ vựng của tôi",
      twoCols: true /* "hanzi pinyin meaning" */,
      backPage: "my-vocab.html"
    }
  };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* Parser một dòng. twoCols: "hanzi pinyin meaning" — tách 2 cột đầu bằng whitespace,
     phần còn lại = meaning. Ngược lại (grammar): "mẫu câu — nghĩa". Dòng không hợp lệ → null. */
  function parseRow(line, twoCols) {
    var s = String(line || "").trim();
    if (!s) return null;
    if (twoCols) {
      var parts = s.split(/\s+/);
      if (parts.length < 2) return null;
      return { hanzi: parts[0], pinyin: parts[1], meaning: parts.slice(2).join(" ") };
    }
    var i = s.indexOf("—");
    if (i < 0) return null;
    var hanzi = s.slice(0, i).trim();
    var meaning = s.slice(i + 1).trim();
    if (!hanzi || !meaning) return null;
    return { hanzi: hanzi, pinyin: "", meaning: meaning };
  }

  function parseRows(text, twoCols) {
    var rows = [];
    String(text || "").split(/\r?\n/).forEach(function (ln) {
      var r = parseRow(ln, twoCols);
      if (r) rows.push(r);
    });
    return rows;
  }

  function loadDecks(storage) {
    try {
      var v = JSON.parse(localStorage.getItem(storage) || "[]");
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }

  function saveDecks(storage, decks) {
    try { localStorage.setItem(storage, JSON.stringify(decks)); } catch (e) { /* silent */ }
  }

  /* ---------- modal ---------- */
  function openDeckModal(cfg, deck) {
    var editing = !!deck;
    var nameVal = editing ? deck.name || "" : "";
    var rowsVal = editing
      ? (deck.rows || []).map(function (r) {
          return cfg.twoCols
            ? [r.hanzi, r.pinyin, r.meaning].filter(function (x) { return x; }).join(" ")
            : (r.hanzi || "") + " — " + (r.meaning || "");
        }).join("\n")
      : "";
    var modal = NHAI.el(
      '<div class="fixed inset-0 z-[600] flex items-center justify-center p-4" data-deck-modal role="dialog" aria-modal="true">' +
        '<div class="absolute inset-0 bg-black/40" data-modal-backdrop></div>' +
        '<div class="card shadow-neo relative w-full max-w-lg p-5">' +
          '<h3 class="text-xl font-extrabold mb-3">' + (editing ? "Sửa bộ" : "Tạo bộ mới") + "</h3>" +
          '<label class="block text-sm font-bold mb-1">Tên bộ</label>' +
          '<input type="text" data-deck-name class="w-full rounded-lg border-2 border-[var(--nhai-border)] bg-white p-2 mb-3" placeholder="VD: Từ vựng giáo trình 2" value="' + esc(nameVal) + '">' +
          '<label class="block text-sm font-bold mb-1">Danh sách</label>' +
          '<textarea data-deck-rows rows="8" class="w-full rounded-lg border-2 border-[var(--nhai-border)] bg-white p-2 mb-2 zh" placeholder="' + esc(cfg.modalPlaceholder) + '"></textarea>' +
          '<p class="text-xs text-[var(--nhai-muted)] mb-2">' + esc(cfg.modalHint) + "</p>" +
          '<div class="text-xs font-bold text-[var(--nhai-main)] mb-3 min-h-[1rem]" data-deck-preview></div>' +
          '<div class="flex justify-end gap-2">' +
            '<button type="button" data-deck-cancel class="btn-ghost px-4 py-2">Huỷ</button>' +
            '<button type="button" data-deck-save class="btn-main px-4 py-2">Nhập từ</button>' +
          "</div>" +
        "</div>" +
      "</div>"
    );
    var nameInput = modal.querySelector("[data-deck-name]");
    var rowsInput = modal.querySelector("[data-deck-rows]");
    var preview = modal.querySelector("[data-deck-preview]");
    rowsInput.value = rowsVal;

    function refreshPreview() {
      var n = parseRows(rowsInput.value, cfg.twoCols).length;
      preview.textContent = n > 0 ? "Đã nhập " + n + " từ hợp lệ" : "";
    }
    rowsInput.addEventListener("input", refreshPreview);
    refreshPreview();

    function close() { modal.remove(); }

    modal.querySelector("[data-modal-backdrop]").addEventListener("click", close);
    modal.querySelector("[data-deck-cancel]").addEventListener("click", close);
    modal.querySelector("[data-deck-save]").addEventListener("click", function () {
      var name = nameInput.value.trim();
      if (!name) { NHAI.toast("Bạn chưa nhập tên bộ"); nameInput.focus(); return; }
      var rows = parseRows(rowsInput.value, cfg.twoCols);
      if (!rows.length) { NHAI.toast("Không có dòng hợp lệ nào — mỗi dòng: " + cfg.rowHint); rowsInput.focus(); return; }
      var decks = loadDecks(cfg.storage);
      if (editing) {
        decks = decks.map(function (d) {
          return String(d.id) === String(deck.id) ? { id: d.id, name: name, rows: rows } : d;
        });
      } else {
        decks.push({ id: String(Date.now()) + "-" + decks.length, name: name, rows: rows });
      }
      saveDecks(cfg.storage, decks);
      NHAI.toast("Đã lưu bộ “" + name + "” (" + rows.length + " từ)");
      close();
      window.NHAI.renderDeckPage(pageKey());
    });

    document.body.appendChild(modal);
    if (!editing) nameInput.focus(); else rowsInput.focus();
  }

  /* ---------- trang ---------- */
  function pageKey() {
    var main = document.querySelector("main[data-page]");
    return main ? main.getAttribute("data-page") : null;
  }

  function renderDeckPage(key) {
    var cfg = CFG[key];
    var body = document.getElementById("page-body");
    if (!cfg || !body) return;
    var decks = loadDecks(cfg.storage);
    body.innerHTML = "";

    /* header row + nút chính góc phải */
    body.appendChild(NHAI.el(
      '<div class="flex items-center justify-between gap-3 mb-5">' +
        '<h2 class="text-xl font-extrabold">' + esc(cfg.listTitle) + "</h2>" +
        '<button type="button" data-new-deck class="btn-main px-5 py-2.5">+ Tạo bộ mới</button>' +
      "</div>"
    ));

    if (!decks.length) {
      /* empty state */
      body.appendChild(NHAI.el(
        '<div class="card shadow-neo p-10 text-center">' +
          '<div class="text-6xl mb-4 text-amber-400" aria-hidden="true">' + cfg.icon + "</div>" +
          '<h2 class="text-2xl font-extrabold mb-2">' + esc(cfg.emptyTitle) + "</h2>" +
          '<p class="text-sm text-[var(--nhai-muted)] mb-6">' + esc(cfg.emptySub) + "</p>" +
          '<button type="button" data-new-deck class="btn-main px-6 py-2.5">+ Tạo bộ mới</button>' +
        "</div>"
      ));
    } else {
      var grid = NHAI.el('<div class="grid sm:grid-cols-2 gap-4" data-deck-grid></div>');
      decks.forEach(function (deck) {
        var n = (deck.rows || []).length;
        var card = NHAI.el(
          '<div class="card shadow-neo p-5 flex flex-col gap-3">' +
            "<div>" +
              '<h3 class="font-extrabold text-lg mb-0.5">' + esc(deck.name || "Bộ chưa đặt tên") + "</h3>" +
              '<p class="text-xs text-[var(--nhai-muted)]">' + n + " từ</p>" +
            "</div>" +
            '<div class="flex flex-wrap gap-2 mt-auto">' +
              '<a href="lesson.html?custom=' + encodeURIComponent(String(deck.id)) + '" class="btn-main px-4 py-2 text-sm">Học</a>' +
              '<button type="button" data-edit class="btn-ghost px-4 py-2 text-sm">Sửa</button>' +
              '<button type="button" data-del class="btn-ghost px-4 py-2 text-sm">Xoá</button>' +
            "</div>" +
          "</div>"
        );
        card.querySelector("[data-edit]").addEventListener("click", function () {
          openDeckModal(cfg, deck);
        });
        card.querySelector("[data-del]").addEventListener("click", function () {
          if (window.confirm('Xoá bộ "' + (deck.name || "") + '"?')) {
            var rest = loadDecks(cfg.storage).filter(function (d) {
              return String(d.id) !== String(deck.id);
            });
            saveDecks(cfg.storage, rest);
            NHAI.toast("Đã xoá bộ");
            renderDeckPage(key);
          }
        });
        grid.appendChild(card);
      });
      body.appendChild(grid);
    }

    body.querySelectorAll("[data-new-deck]").forEach(function (btn) {
      btn.addEventListener("click", function () { openDeckModal(cfg, null); });
    });
  }

  window.NHAI.renderDeckPage = renderDeckPage;
})();
