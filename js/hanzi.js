/* Nhai HSK clone — PLAN-03 trang Phân tích Hán tự (hanzi.html).
   Màn 1: search + vẽ + pills cấp độ + lưới chữ. Màn 2 (?char=): chi tiết chữ. */
(function () {
  "use strict";
  var H = (window.NHAI_DATA && window.NHAI_DATA.hanzi) || { chars: {}, levels: [] };

  /* ?char= phải được decode (你 → %E4%BD%A0 khi encode) */
  function getCharParam() {
    var m = location.search.match(/[?&]char=([^&]*)/);
    if (!m) return null;
    var raw = m[1].replace(/\+/g, "%20");
    try { return decodeURIComponent(raw); } catch (e) { return raw; }
  }
  function charHref(ch) { return "hanzi.html?char=" + encodeURIComponent(ch); }
  function goChar(ch) { location.href = charHref(ch); }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function isCJK(s) { return /[\u3400-\u9fff]/.test(s); }

  /* ---------- card tìm chữ (dùng ở cả 2 màn) ---------- */
  function buildSearchCard(host) {
    host.innerHTML =
      '<input data-q type="text" placeholder="Nhập chữ Hán hoặc từ…" ' +
        'class="w-full border-2 border-[var(--nhai-border)] rounded-lg px-3 py-2 bg-[var(--nhai-bg)] zh" autocomplete="off">' +
      '<div data-results class="mt-2 hidden card divide-y divide-[var(--nhai-border)] max-h-64 overflow-y-auto"></div>';
    var input = host.querySelector("[data-q]");
    var results = host.querySelector("[data-results]");

    function search(query) {
      var q = query.trim();
      if (!q) return [];
      var qs = NHAI.stripTones(q);
      var out = [];
      Object.keys(H.chars).forEach(function (k) {
        var c = H.chars[k];
        var hit = (q.length >= 1 && isCJK(q) && k.indexOf(q) !== -1) ||
          NHAI.stripTones(c.pinyin || "").indexOf(qs) !== -1 ||
          NHAI.stripTones(c.hanViet || "").indexOf(qs) !== -1;
        if (hit) out.push(k);
      });
      return out.slice(0, 8);
    }

    function render() {
      var hits = search(input.value);
      results.innerHTML = hits.map(function (k) {
        var c = H.chars[k];
        return '<button type="button" data-char="' + esc(k) + '" class="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[var(--nhai-soft)]">' +
          '<span class="zh text-2xl font-bold w-9 text-center">' + esc(k) + "</span>" +
          '<span class="min-w-0">' +
            '<span class="font-semibold text-sm">' + esc(c.pinyin || "") + " · " + esc(c.hanViet || "") + "</span>" +
            '<span class="block text-xs text-[var(--nhai-muted)] truncate">' + esc(c.meaning || "") + "</span>" +
          "</span>" +
          '<span class="ml-auto pill text-xs shrink-0">' + esc(c.level || "") + "</span>" +
        "</button>";
      }).join("");
      results.classList.toggle("hidden", hits.length === 0);
    }

    input.addEventListener("input", render);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        var first = results.querySelector("[data-char]");
        if (first) goChar(first.getAttribute("data-char"));
      }
    });
    results.addEventListener("click", function (e) {
      var b = e.target.closest("[data-char]");
      if (b) goChar(b.getAttribute("data-char"));
    });
    document.addEventListener("click", function (e) {
      if (!host.contains(e.target)) results.classList.add("hidden");
    });
  }

  function buildDrawCard(host) {
    NHAI.DrawPad.create(host, { size: 240, navigate: goChar });
  }

  /* ---------- Màn 1 ---------- */
  function renderHome() {
    var pills = document.getElementById("level-pills");
    var info = document.getElementById("level-info");
    var grid = document.getElementById("level-grid");
    var actions = document.getElementById("level-actions");
    var books = H.levels.filter(function (l) { return !l.href; });
    var radicalsLevel = H.levels.find(function (l) { return l.href; });

    var html = books.map(function (l, i) {
      return '<button type="button" data-level="' + i + '" class="pill' + (i === 0 ? " pill-active" : "") + '">' + esc(l.label) + "</button>";
    }).join("");
    if (radicalsLevel) {
      html += '<a href="' + esc(radicalsLevel.href) + '" class="pill">' + esc(radicalsLevel.label) + "</a>";
    }
    pills.innerHTML = html;

    function select(i) {
      pills.querySelectorAll("[data-level]").forEach(function (b, j) {
        b.classList.toggle("pill-active", j === i);
      });
      var lv = books[i];
      info.textContent = lv.count;
      var keys = Object.keys(H.chars).filter(function (k) { return H.chars[k].level === lv.label; });
      if (keys.length === 0) {
        grid.innerHTML = '<p class="col-span-full text-sm text-[var(--nhai-muted)] font-semibold py-6 text-center">Dữ liệu chữ Hán của cấp độ này sẽ được cập nhật sớm.</p>';
        return;
      }
      grid.innerHTML = keys.map(function (k) {
        return '<a href="' + esc(charHref(k)) + '" class="grid-cell shadow-neo text-3xl sm:text-4xl zh font-bold hover:border-[var(--nhai-main)]" title="' + esc(k) + '">' + esc(k) + "</a>";
      }).join("");
    }

    pills.addEventListener("click", function (e) {
      var b = e.target.closest("[data-level]");
      if (b) select(parseInt(b.getAttribute("data-level"), 10));
    });
    actions.addEventListener("click", function (e) {
      var b = e.target.closest("[data-level-action]");
      if (b) NHAI.toast(b.getAttribute("data-level-action") + " — tính năng demo, sắp ra mắt!");
    });

    select(0);
  }

  /* ---------- Màn 2: chi tiết chữ ---------- */
  var writer = null;

  function row(label, valueHtml) {
    return '<div class="flex gap-2"><span class="font-bold shrink-0 w-28">' + esc(label) + ':</span><span class="min-w-0">' + valueHtml + "</span></div>";
  }

  function renderDetail(ch) {
    var c = H.chars[ch];
    var known = !!c;
    if (!c) {
      c = {
        hanzi: ch, hanViet: "—", pinyin: "?", level: "?", strokes: "?",
        radical: "—", type: "—",
        meaning: "Chưa có dữ liệu chi tiết cho chữ này (bản demo chỉ có dữ liệu HSK 1)."
      };
    }

    document.getElementById("detail-glyph").textContent = ch;
    document.getElementById("detail-title").textContent = ch + " - " + c.hanViet;
    document.getElementById("btn-speak").onclick = function () { NHAI.speak(ch, "zh-CN"); };

    var altHtml = c.hanVietAlt ? ' <span class="text-[var(--nhai-muted)]">(còn đọc: ' + esc(c.hanVietAlt) + ")</span>" : "";
    var radical = c.radical || "—";
    var radicalHtml = (known && H.chars[radical]) || (known && c.radicalLink && radical !== "—")
      ? '<a href="' + esc(charHref(radical)) + '" class="zh text-[var(--nhai-accent)] hover:underline">' + esc(radical) + "</a>"
      : '<span class="zh">' + esc(radical) + "</span>";
    var compHtml = (c.composition || []).map(function (part) {
      if (H.chars[part]) return '<a href="' + esc(charHref(part)) + '" class="zh text-[var(--nhai-accent)] hover:underline">' + esc(part) + "</a>";
      return '<span class="zh">' + esc(part) + "</span>";
    }).join(" ") || "—";

    document.getElementById("detail-info").innerHTML =
      row("Âm Hán Việt", "<span class='font-bold'>" + esc(c.hanViet) + "</span>" + altHtml) +
      row("Ý nghĩa", esc(c.meaning)) +
      row("Pinyin", "<span class='zh font-semibold'>" + esc(c.pinyin || "—") + "</span>") +
      row("Cấp độ", c.level && c.level !== "?" ? '<span class="pill pill-active text-xs">' + esc(c.level) + "</span>" : esc(c.level)) +
      row("Số nét", esc(String(c.strokes))) +
      row("Bộ thủ", radicalHtml) +
      row("Cấu tạo từ", compHtml) +
      row("Loại chữ", c.type && c.type !== "—" ? '<span class="pill text-xs">' + esc(c.type) + "</span>" : esc(c.type));

    /* Sidebar phải: từ vựng trong sách */
    var book = document.getElementById("vocab-book");
    var vi = c.vocabInBook || [];
    book.innerHTML = vi.length ? vi.map(function (v) {
      return '<div class="flex items-start gap-2">' +
        '<div class="min-w-0 flex-1">' +
          '<a href="' + esc(v.link || "#") + '" class="zh text-lg font-bold hover:text-[var(--nhai-main)]">' + esc(v.word) + "</a>" +
          ' <span class="zh text-sm text-[var(--nhai-muted)]">(' + esc(v.py || "") + ")</span>" +
          '<div class="text-xs font-bold text-[var(--nhai-muted)] mt-0.5">- ' + esc(v.hv || "") + "</div>" +
          '<div class="text-sm">- ' + esc(v.vi || "") + "</div>" +
        "</div>" +
        '<div class="flex flex-col items-end gap-1 shrink-0">' +
          '<span class="pill text-xs">HSK 1</span>' +
          '<button type="button" data-speak="' + esc(v.word) + '" class="btn-ghost w-8 h-8 text-sm" title="Phát âm">🔊</button>' +
          (v.link ? '<a href="' + esc(v.link) + '" class="text-xs font-semibold text-[var(--nhai-accent)] hover:underline">→ Bài học</a>' : "") +
        "</div>" +
      "</div>";
    }).join("") : '<p class="text-sm text-[var(--nhai-muted)] font-semibold">Chưa có từ vựng trong sách cho chữ này.</p>';
    book.addEventListener("click", function (e) {
      var b = e.target.closest("[data-speak]");
      if (b) NHAI.speak(b.getAttribute("data-speak"), "zh-CN");
    });

    /* Sidebar phải: từ vựng thực chiến */
    var pr = document.getElementById("vocab-practical");
    var pi = c.practical || [];
    pr.innerHTML = pi.length ? pi.map(function (p) {
      return '<div class="flex items-baseline gap-2 text-sm">' +
        '<a href="dictionary.html?q=' + encodeURIComponent(p.word) + '" class="zh font-bold text-base hover:text-[var(--nhai-main)] shrink-0">' + esc(p.word) + "</a>" +
        '<span class="zh text-xs text-[var(--nhai-muted)] shrink-0">' + esc(p.py || "") + "</span>" +
        '<span class="text-[var(--nhai-border)]">—</span>' +
        '<span class="text-[var(--nhai-muted)]">' + esc(p.vi || "") + "</span>" +
      "</div>";
    }).join("") : '<p class="text-sm text-[var(--nhai-muted)] font-semibold">Chưa có từ vựng thực chiến cho chữ này.</p>';

    /* Chữ chứa chữ này (toggle) */
    var containsList = document.getElementById("contains-list");
    var related = Object.keys(H.chars).filter(function (k) {
      var o = H.chars[k];
      return o.radical === ch || (o.composition || []).indexOf(ch) !== -1;
    });
    containsList.innerHTML = related.length ? related.map(function (k) {
      return '<a href="' + esc(charHref(k)) + '" class="grid-cell w-14 h-14 text-2xl zh font-bold hover:border-[var(--nhai-main)]">' + esc(k) + "</a>";
    }).join("") : '<span class="text-sm text-[var(--nhai-muted)] font-semibold">Không có chữ nào.</span>';

    /* Chữ sau */
    var keys = Object.keys(H.chars);
    var idx = keys.indexOf(ch);
    var next = keys[(idx + 1) % keys.length] || "好";
    var nextLink = document.getElementById("next-char");
    nextLink.href = charHref(next);
    nextLink.textContent = "Chữ sau " + next + " →";

    /* Animation nét */
    var host = document.getElementById("writer-host");
    host.innerHTML = "";
    writer = NHAI.HanziWriter.mount(host, ch);

    function toggle(btn, on) {
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.classList.toggle("btn-main", on);
      btn.classList.toggle("btn-ghost", !on);
    }

    document.getElementById("btn-replay").onclick = function () { writer.play(); };
    var btnArrows = document.getElementById("btn-arrows");
    btnArrows.onclick = function () {
      var on = btnArrows.getAttribute("aria-pressed") !== "true";
      writer.showArrows(on);
      toggle(btnArrows, on);
    };
    var btnZoom = document.getElementById("btn-zoom");
    btnZoom.onclick = function () {
      var on = btnZoom.getAttribute("aria-pressed") !== "true";
      writer.setZoom(on);
      toggle(btnZoom, on);
    };
    var btnContains = document.getElementById("btn-contains");
    var box = document.getElementById("contains-box");
    btnContains.onclick = function () {
      var on = btnContains.getAttribute("aria-pressed") !== "true";
      box.classList.toggle("hidden", !on);
      toggle(btnContains, on);
    };
  }

  /* ---------- init ---------- */
  function init() {
    var ch = getCharParam();
    var home = document.getElementById("view-home");
    var detail = document.getElementById("view-detail");
    document.querySelectorAll("[data-search-card]").forEach(buildSearchCard);
    document.querySelectorAll("[data-draw-card]").forEach(buildDrawCard);
    if (ch) {
      home.classList.add("hidden");
      detail.classList.remove("hidden");
      document.title = ch + " | Phân tích Hán tự | Nhai HSK";
      renderDetail(ch);
    } else {
      renderHome();
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
