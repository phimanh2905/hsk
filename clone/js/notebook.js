/* Nhai HSK clone — PLAN-18 / SPEC-18: template "Sổ tay" dùng chung (my-vocab + my-grammar).
   List page: <body data-kind="vocab|grammar"> + <main id="nb-root">.
   Detail page: notebook.html?kind=vocab|grammar&id=<id> + <main id="nb-root" data-detail>.
   Store: vocab → localStorage "nhai.decks", grammar → "nhai.notebooks"
          (mảng [{id, name, rows:[{hanzi,pinyin,hanviet?,meaning}], updatedAt}]). */
(function () {
  "use strict";

  function cfg() {
    var kind = document.body.getAttribute("data-kind") || "vocab";
    return {
      kind: kind,
      storage: kind === "grammar" ? "nhai.notebooks" : "nhai.decks",
      data: (window.NHAI_DATA && NHAI_DATA.notebooks && NHAI_DATA.notebooks[kind]) || null
    };
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function loadStore(storage) {
    try {
      var v = JSON.parse(localStorage.getItem(storage) || "[]");
      return Array.isArray(v) ? v : [];
    } catch (e) { return []; }
  }

  function saveStore(storage, items) {
    try { localStorage.setItem(storage, JSON.stringify(items)); } catch (e) { /* silent */ }
  }

  function fmtDate(iso) {
    if (!iso) return "";
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      var now = new Date();
      var days = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()) -
                             new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
      if (days <= 0) return "Hôm nay";
      if (days === 1) return "Hôm qua";
      if (days < 30) return days + " ngày trước";
      return d.toLocaleDateString("vi-VN");
    } catch (e) { return iso; }
  }

  function uid() {
    return "nb-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  }

  /* ---------- modal tạo / sửa tên ---------- */
  function openModal(opts) {
    var editing = !!opts.item;
    var overlay = NHAI.el(
      '<div class="fixed inset-0 z-[600] flex items-center justify-center p-4" data-nb-modal role="dialog" aria-modal="true">' +
        '<div class="absolute inset-0 bg-black/40" data-nb-backdrop></div>' +
        '<div class="card shadow-neo relative w-full max-w-md p-5">' +
          '<button type="button" data-nb-close aria-label="Đóng" class="absolute right-3 top-3 h-8 w-8 rounded-full text-xl leading-none text-[var(--nhai-muted)] hover:bg-[var(--nhai-soft)]">✕</button>' +
          '<h3 class="text-xl font-extrabold mb-3 pr-8">' + esc(editing ? "Sửa tên" : opts.title) + "</h3>" +
          '<input type="text" data-nb-name autofocus placeholder="Nhập tên sổ tay / bộ từ vựng…" ' +
            'class="w-full rounded-lg border-2 border-[var(--nhai-border)] bg-white p-2.5 mb-4" value="' + esc(editing ? opts.item.name : "") + '">' +
          '<div class="flex justify-end gap-2">' +
            '<button type="button" data-nb-cancel class="btn-ghost px-4 py-2 text-sm">Huỷ</button>' +
            '<button type="button" data-nb-submit class="btn-main px-5 py-2 text-sm">' + (editing ? "Lưu" : "Tạo") + "</button>" +
          "</div>" +
        "</div>" +
      "</div>"
    );
    document.body.appendChild(overlay);
    var input = overlay.querySelector("[data-nb-name]");
    var submit = overlay.querySelector("[data-nb-submit]");

    function close() { overlay.remove(); }
    function doSubmit() {
      var name = input.value.trim();
      if (!name) return;
      if (editing) {
        opts.item.name = name;
        opts.item.updatedAt = new Date().toISOString();
        saveStore(opts.storage, opts.store);
        NHAI.toast('Đã đổi tên thành "' + name + '"');
      } else {
        opts.store.unshift({ id: uid(), name: name, rows: [], updatedAt: new Date().toISOString() });
        saveStore(opts.storage, opts.store);
        NHAI.toast("Đã tạo " + name);
      }
      close();
      renderList();
    }

    function syncDisabled() { submit.disabled = !input.value.trim(); }
    syncDisabled();
    input.addEventListener("input", syncDisabled);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") doSubmit(); });
    overlay.querySelector("[data-nb-close]").addEventListener("click", close);
    overlay.querySelector("[data-nb-cancel]").addEventListener("click", close);
    overlay.querySelector("[data-nb-backdrop]").addEventListener("click", close);
    submit.addEventListener("click", doSubmit);
    setTimeout(function () { input.focus(); }, 0);
  }

  /* ---------- card menu (⋯) ---------- */
  function openCardMenu(cardEl, item, storage, store) {
    document.querySelectorAll("[data-nb-menu]").forEach(function (m) { m.remove(); });
    var r = cardEl.getBoundingClientRect();
    var menu = NHAI.el(
      '<div data-nb-menu class="card shadow-neo fixed z-[550] w-40 p-1 text-sm" style="left:' +
        Math.max(8, r.right - 160) + "px;top:" + (r.bottom + 4) + 'px">' +
        '<button type="button" data-m-open class="block w-full rounded px-3 py-1.5 text-left hover:bg-[var(--nhai-soft)]">Mở</button>' +
        '<button type="button" data-m-rename class="block w-full rounded px-3 py-1.5 text-left hover:bg-[var(--nhai-soft)]">Sửa tên</button>' +
        '<button type="button" data-m-delete class="block w-full rounded px-3 py-1.5 text-left text-red-600 hover:bg-[var(--nhai-soft)]">Xoá</button>' +
      "</div>"
    );
    document.body.appendChild(menu);
    setTimeout(function () {
      document.addEventListener("click", function handler(e) {
        if (!menu.contains(e.target)) { menu.remove(); document.removeEventListener("click", handler); }
      });
    }, 0);
    menu.querySelector("[data-m-open]").addEventListener("click", function () {
      window.location.href = "notebook.html?kind=" + cfg().kind + "&id=" + encodeURIComponent(item.id);
    });
    menu.querySelector("[data-m-rename]").addEventListener("click", function () {
      menu.remove();
      openModal({ title: "", item: item, storage: storage, store: store });
    });
    menu.querySelector("[data-m-delete]").addEventListener("click", function () {
      menu.remove();
      if (confirm('Xoá "' + item.name + '"?')) {
        var i = store.indexOf(item);
        if (i >= 0) store.splice(i, 1);
        saveStore(storage, store);
        NHAI.toast("Đã xoá " + item.name);
        renderList();
      }
    });
  }

  /* ---------- list ---------- */
  function cardHtml(item, isSample) {
    var count = item.count != null ? item.count : (item.rows ? item.rows.length : 0);
    var unit = item.unit || cfg().data.countUnit;
    var nameLink = '<a href="notebook.html?kind=' + cfg().kind + "&id=" + encodeURIComponent(item.id) +
      '" class="font-extrabold hover:text-[var(--nhai-main)]">' + esc(item.name) + "</a>";
    return (
      '<div class="card shadow-neo p-4" data-nb-card="' + esc(item.id) + '">' +
        '<div class="flex items-start justify-between gap-2 mb-1">' +
          "<h3>" + nameLink + "</h3>" +
          (isSample
            ? '<span class="text-xs text-[var(--nhai-muted)] shrink-0 mt-1">Sổ mẫu</span>'
            : '<button type="button" data-nb-menu-btn aria-label="Tuỳ chọn" class="shrink-0 h-7 w-7 rounded-full text-lg leading-none text-[var(--nhai-muted)] hover:bg-[var(--nhai-soft)]">⋯</button>') +
        "</div>" +
        '<p class="text-sm text-[var(--nhai-muted)]">' + count + " " + unit + "</p>" +
        '<p class="text-xs text-[var(--nhai-muted)] mt-2">Sửa ' + esc(fmtDate(item.updatedAt)) + "</p>" +
      "</div>"
    );
  }

  function renderList() {
    var c = cfg();
    var root = document.getElementById("nb-root");
    if (!root || !c.data) return;
    var store = loadStore(c.storage);
    root.innerHTML = "";

    /* header: mascot 🍅 + H1 + sub + CTA phải */
    root.appendChild(NHAI.el(
      '<section class="mb-6 flex items-start justify-between gap-4">' +
        '<div>' +
          '<h1 class="text-3xl font-extrabold tracking-tight mb-2">🍅 ' + esc(c.data.h1) + "</h1>" +
          '<p class="text-[var(--nhai-muted)]">' + esc(c.data.sub) + "</p>" +
        "</div>" +
        '<button type="button" data-nb-create class="btn-main rounded-full px-5 py-2.5 text-sm shrink-0">' + esc(c.data.cta) + "</button>" +
      "</section>"
    ));

    if (store.length === 0) {
      /* empty state — vẫn hiện sample cards dưới empty để thấy bố cục? SPEC: empty state khi chưa có mục nào.
         Samples luôn render sau item user tạo → khi store rỗng vẫn hiện samples. */
      root.appendChild(NHAI.el(
        '<div class="card shadow-neo p-10 text-center mb-6">' +
          '<div class="text-6xl mb-4" aria-hidden="true">📕</div>' +
          '<h2 class="text-2xl font-extrabold mb-2">' + esc(c.data.empty) + "</h2>" +
          '<p class="text-sm text-[var(--nhai-muted)] mb-5">' + esc(c.data.emptySub) + "</p>" +
          '<button type="button" data-nb-create class="btn-main px-5 py-2.5">' + esc(c.data.cta) + "</button>" +
        "</div>"
      ));
    }

    /* samples luôn sau item user tạo */
    var all = store.concat(c.data.samples || []);
    var grid = NHAI.el('<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-nb-grid></div>');
    all.forEach(function (item) {
      var isSample = !!item.sample;
      var card = NHAI.el(cardHtml(item, isSample));
      var btn = card.querySelector("[data-nb-menu-btn]");
      if (btn) btn.addEventListener("click", function (e) {
        e.stopPropagation();
        openCardMenu(card, item, c.storage, store);
      });
      grid.appendChild(card);
    });
    root.appendChild(grid);

    root.querySelectorAll("[data-nb-create]").forEach(function (b) {
      b.addEventListener("click", function () {
        openModal({ title: c.data.modalTitle, item: null, storage: c.storage, store: store });
      });
    });
  }

  /* ---------- detail (notebook.html?kind=&id=) ---------- */
  function renderDetail() {
    var c = cfg();
    var root = document.getElementById("nb-root");
    if (!root || !c.data) return;
    var qs = new URLSearchParams(window.location.search);
    var kind = qs.get("kind") || c.kind;
    var id = qs.get("id") || "";
    c.kind = kind;
    /* kind trên query string quyết định cả data lẫn storage — fix round 1: trước đây storage
       giữ giá trị theo body data-kind (mặc định vocab) nên ?kind=grammar đọc nhầm nhai.decks */
    c.storage = kind === "grammar" ? "nhai.notebooks" : "nhai.decks";
    c.data = (window.NHAI_DATA && NHAI_DATA.notebooks[kind]) || c.data;

    var store = loadStore(c.storage);
    var item = store.filter(function (x) { return x.id === id; })[0] || null;
    var sampleItem = (c.data.samples || []).filter(function (x) { return x.id === id; })[0] || null;
    /* user rows nếu có, else rows của sample, else 12 dòng mẫu (lấy từ sample đầu) */
    var rows = (item && item.rows && item.rows.length) ? item.rows :
               (sampleItem && sampleItem.rows) ? sampleItem.rows :
               ((c.data.samples || [])[0] || {}).rows || [];
    var title = item ? item.name : (sampleItem ? sampleItem.name : "Sổ tay");
    document.title = title + " | Nhai HSK";

    root.innerHTML = "";
    root.appendChild(NHAI.el(
      '<section class="mb-6 flex items-start justify-between gap-4">' +
        '<div>' +
          '<a href="' + (kind === "grammar" ? "my-grammar.html" : "my-vocab.html") + '" class="text-sm text-[var(--nhai-muted)] hover:text-[var(--nhai-main)]">← ' + esc(c.data.h1) + "</a>" +
          '<h1 class="text-3xl font-extrabold tracking-tight mt-1 mb-2">🍅 ' + esc(title) + "</h1>" +
          '<p class="text-[var(--nhai-muted)]">' + esc(c.data.sub) + "</p>" +
        "</div>" +
        '<button type="button" data-nb-add class="btn-main rounded-full px-5 py-2.5 text-sm shrink-0">＋ Thêm từ</button>' +
      "</section>"
    ));

    var thead =
      "<thead><tr>" +
        '<th class="text-left py-2 px-3">Chữ</th>' +
        '<th class="text-left py-2 px-3">Pinyin</th>' +
        '<th class="text-left py-2 px-3">Hán Việt</th>' +
        '<th class="text-left py-2 px-3">Nghĩa</th>' +
      "</tr></thead>";
    var tbody = rows.map(function (r) {
      return "<tr class=\"border-t border-[var(--nhai-border)]\">" +
        '<td class="py-2 px-3 font-bold zh text-lg">' + esc(r.hanzi) + "</td>" +
        '<td class="py-2 px-3">' + esc(r.pinyin) + "</td>" +
        '<td class="py-2 px-3">' + esc(r.hanviet || "") + "</td>" +
        '<td class="py-2 px-3">' + esc(r.meaning) + "</td>" +
      "</tr>";
    }).join("");
    root.appendChild(NHAI.el(
      '<div class="card shadow-neo p-2 overflow-x-auto"><table class="w-full text-sm">' + thead + "<tbody>" + tbody + "</tbody></table></div>"
    ));

    root.querySelector("[data-nb-add]").addEventListener("click", function () {
      NHAI.toast("Thêm từ vào sổ tay — sắp có (demo)");
    });
  }

  function init() {
    var root = document.getElementById("nb-root");
    if (!root) return;
    if (root.hasAttribute("data-detail")) renderDetail();
    else renderList();
  }

  if (document.readyState === "complete") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
