/* Nhai HSK clone — PLAN-09: trang Tra từ điển (dictionary.html).
   Search 3 kiểu: chữ Hán / pinyin không dấu (NHAI.stripTones) / nghĩa Việt substring.
   ?q= cập nhật bằng replaceState (F5 giữ kết quả); entry card + Sổ tay từ vựng (localStorage.nhai.vocabBook). */
(function () {
  "use strict";

  var DATA = (window.NHAI_DATA && window.NHAI_DATA.dictionary) || [];
  var QUICK = ["学习", "你好", "时间", "老师", "学生"];

  var input = document.getElementById("dict-q");
  var btnSearch = document.getElementById("dict-search");
  var btnClear = document.getElementById("dict-clear");
  var btnDraw = document.getElementById("dict-draw");
  var results = document.getElementById("dict-results");

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function isCJK(s) { return /[\u3400-\u9fff]/.test(s); }
  function pyJoin(entry) { return entry.pinyinPerChar.join(" "); }

  /* câu zh + pinyin từng chữ màu muted */
  function zhWithPy(zh, pinyinPerChar) {
    var out = "";
    for (var i = 0; i < zh.length; i++) {
      var py = pinyinPerChar && pinyinPerChar[i] ? esc(pinyinPerChar[i]) : "";
      var ch = esc(zh[i]);
      if (py) {
        out += '<span class="inline-block text-center mx-0.5 align-top">' +
          '<span class="block text-[10px] leading-tight text-[var(--nhai-muted)]">' + py + "</span>" +
          '<span class="zh">' + ch + "</span></span>";
      } else {
        out += '<span class="zh inline-block mx-0.5 align-top">' + ch + "</span>";
      }
    }
    return out;
  }

  /* ---------- search ---------- */
  function search(raw) {
    var q = String(raw || "").trim();
    if (!q) return [];
    var nq = NHAI.stripTones(q).replace(/\s+/g, "");
    var nqs = NHAI.stripTones(q);
    var vi = q.toLowerCase();
    return DATA.filter(function (e) {
      if (isCJK(q)) return e.hanzi.indexOf(q) !== -1;
      var py = NHAI.stripTones(pyJoin(e)).replace(/\s+/g, "");
      if (nq && py.indexOf(nq) !== -1) return true;
      var pySp = NHAI.stripTones(pyJoin(e));
      if (nqs && pySp.indexOf(nqs) !== -1) return true;
      return e.meanings.some(function (m) { return m.toLowerCase().indexOf(vi) !== -1; });
    });
  }

  /* ---------- sổ tay từ vựng ---------- */
  function vocabBook() {
    try { return JSON.parse(localStorage.getItem("nhai.vocabBook") || "[]"); }
    catch (e) { return []; }
  }
  function inBook(hanzi) {
    return vocabBook().some(function (v) { return v.hanzi === hanzi; });
  }
  function addToBook(entry) {
    if (inBook(entry.hanzi)) { NHAI.toast("Từ này đã có trong Sổ tay từ vựng"); return; }
    var book = vocabBook();
    book.push({ hanzi: entry.hanzi, pinyin: pyJoin(entry), vi: entry.meanings[0] || "" });
    try { localStorage.setItem("nhai.vocabBook", JSON.stringify(book)); } catch (e) { /* silent */ }
    NHAI.toast("Đã thêm vào Sổ tay từ vựng ⭐");
    results.querySelectorAll('[data-add="' + esc(entry.hanzi) + '"]').forEach(function (b) {
      b.querySelector("[data-star]").style.color = "var(--nhai-gold)";
    });
  }

  /* ---------- render ---------- */
  function renderSuggestions() {
    results.innerHTML =
      '<div class="card shadow-neo p-5">' +
        '<h2 class="text-lg font-extrabold mb-3">Gợi ý tra nhanh</h2>' +
        '<div class="flex flex-wrap gap-2">' +
          QUICK.map(function (w) {
            return '<button type="button" data-quick="' + esc(w) + '" class="pill zh text-lg">' + esc(w) + "</button>";
          }).join("") +
        "</div>" +
        '<p class="text-sm text-[var(--nhai-muted)] mt-4">Nhập chữ Hán (学习), pinyin không dấu (xuexi) hoặc nghĩa tiếng Việt (học) rồi bấm “Tra từ”.</p>' +
      "</div>";
  }

  function entryCard(e) {
    var saved = inBook(e.hanzi);
    var tradLine = e.traditional ? '<span class="text-sm text-[var(--nhai-muted)]">(Phồn thể: <span class="zh">' + esc(e.traditional) + "</span>)</span>" : "";
    var chars = e.hanzi.split("").map(function (ch) {
      return '<a href="hanzi.html?char=' + encodeURIComponent(ch) + '" class="zh inline-flex w-9 h-9 items-center justify-center border-2 border-[var(--nhai-border)] rounded-md text-lg font-bold hover:border-[var(--nhai-main)] hover:text-[var(--nhai-main)]">' + esc(ch) + "</a>";
    }).join(" ");
    var meanings = e.meanings.map(function (m, i) {
      return "<li>" + esc(m) + "</li>";
    }).join("");
    var examples = e.examples.map(function (ex) {
      return '<div class="bg-[var(--nhai-soft)] rounded-lg p-3">' +
          '<div class="flex items-start gap-2">' +
            '<div class="text-lg leading-snug flex-1">' + zhWithPy(ex.zh, ex.pinyinPerChar) + "</div>" +
            '<button type="button" data-speak="' + esc(ex.zh) + '" class="btn-ghost w-8 h-8 shrink-0" title="Phát âm ' + esc(ex.zh) + '">🔊</button>' +
          "</div>" +
          '<div class="text-sm text-[var(--nhai-muted)] mt-1">' + esc(ex.vi) + "</div>" +
        "</div>";
    }).join("");
    return '<div class="card shadow-neo p-5 mb-4">' +
        '<div class="flex items-start gap-4 flex-wrap">' +
          '<div class="zh text-5xl font-bold leading-none">' + esc(e.hanzi) + "</div>" +
          '<div class="min-w-0">' +
            '<div class="text-lg font-semibold">' + esc(pyJoin(e)) + "</div>" +
            "<div>" + tradLine + "</div>" +
          "</div>" +
          '<button type="button" data-speak="' + esc(e.hanzi) + '" class="btn-ghost w-9 h-9 ml-auto sm:ml-0" title="Phát âm ' + esc(e.hanzi) + '">🔊</button>' +
        "</div>" +
        '<div class="mt-3 flex items-center gap-2 flex-wrap">' +
          '<span class="text-base font-bold">' + esc(e.meanings[0] || "") + "</span>" +
          (e.pos ? '<span class="text-xs font-semibold border-2 border-[var(--nhai-border)] rounded-full px-2.5 py-0.5 text-[var(--nhai-muted)]">' + esc(e.pos) + "</span>" : "") +
          (e.level ? '<span class="text-xs font-bold border-2 border-[var(--nhai-main)] text-[var(--nhai-main)] rounded-full px-2.5 py-0.5">' + esc(e.level) + "</span>" : "") +
          '<button type="button" data-add="' + esc(e.hanzi) + '" class="btn-ghost px-3 py-1.5 text-sm ml-auto">' +
            '<span data-star style="' + (saved ? "color:var(--nhai-gold)" : "") + '">⭐</span> Thêm vào sổ tay</button>' +
        "</div>" +
        '<div class="mt-3 text-sm text-[var(--nhai-muted)]">Xem từng chữ: <span class="inline-flex gap-1 align-middle">' + chars + "</span></div>" +
        '<div class="mt-3">' +
          '<div class="text-sm font-bold mb-1">Nghĩa</div>' +
          '<ol class="list-decimal list-inside space-y-1 text-[15px]">' + meanings + "</ol>" +
        "</div>" +
        '<div class="mt-3">' +
          '<div class="text-sm font-bold mb-2">Ví dụ</div>' +
          '<div class="space-y-2">' + examples + "</div>" +
        "</div>" +
      "</div>";
  }

  function renderResults(raw, list) {
    results.innerHTML =
      '<div class="mb-4">' +
        '<div class="text-sm font-semibold text-[var(--nhai-muted)]">Trung → Việt</div>' +
        '<h2 class="text-xl font-extrabold">' + list.length + ' kết quả cho “<span class="zh">' + esc(raw) + "</span>”</h2>" +
      "</div>" +
      list.map(entryCard).join("");
  }

  function renderEmpty(raw) {
    results.innerHTML =
      '<div class="card p-8 text-center">' +
        '<div class="text-4xl mb-2">🔍</div>' +
        '<p class="text-[var(--nhai-muted)]">Không tìm thấy “<span class="zh">' + esc(raw) + '</span>”. Thử chữ Hán, pinyin không dấu hoặc nghĩa tiếng Việt.</p>' +
      "</div>";
  }

  /* ---------- state / flow ---------- */
  function updateButtons() {
    var has = input.value.trim().length > 0;
    btnSearch.disabled = !has;
    btnClear.classList.toggle("hidden", !has);
  }

  function setUrl(q) {
    try {
      history.replaceState(null, "", q ? "dictionary.html?q=" + encodeURIComponent(q) : "dictionary.html");
    } catch (e) { /* file:// có thể chặn — bỏ qua */ }
  }

  function doSearch(raw) {
    var q = String(raw === undefined ? input.value : raw).trim();
    setUrl(q);
    if (!q) { renderSuggestions(); return; }
    var list = search(q);
    if (list.length === 0) renderEmpty(q);
    else renderResults(q, list);
  }

  /* ---------- events ---------- */
  input.addEventListener("input", updateButtons);
  input.addEventListener("keydown", function (e) { if (e.key === "Enter") doSearch(); });
  btnSearch.addEventListener("click", function () { doSearch(); });
  btnClear.addEventListener("click", function () {
    input.value = "";
    updateButtons();
    setUrl("");
    renderSuggestions();
    input.focus();
  });
  btnDraw.addEventListener("click", function () {
    NHAI.DrawModal.open(function (ch) {
      input.value = ch;
      updateButtons();
      doSearch(ch);
    });
  });
  results.addEventListener("click", function (e) {
    var quick = e.target.closest("[data-quick]");
    if (quick) {
      input.value = quick.getAttribute("data-quick");
      updateButtons();
      doSearch(input.value);
      return;
    }
    var sp = e.target.closest("[data-speak]");
    if (sp) { NHAI.speak(sp.getAttribute("data-speak")); return; }
    var add = e.target.closest("[data-add]");
    if (add) {
      var entry = DATA.filter(function (x) { return x.hanzi === add.getAttribute("data-add"); })[0];
      if (entry) addToBook(entry);
    }
  });

  /* ---------- boot (?q= giữ kết quả khi F5) ---------- */
  var initial = NHAI.q("q", "");
  if (initial) input.value = initial;
  updateButtons();
  if (initial) doSearch(initial);
  else renderSuggestions();
})();
