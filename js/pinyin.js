/* Nhai HSK clone — Bảng Pinyin (PLAN-04): ma trận thanh mẫu × vận mẫu, filter pill, popup chi tiết 4 thanh. */
(function () {
  "use strict";

  function init() {
    var P = (window.NHAI_DATA && NHAI_DATA.pinyin) || {};
    if (!P.finals || !P.valid) return;

    var initials = P.initials;          // ["Ø","b",...,"h"]
    var finals = P.finals;              // 37 vận mẫu
    var valid = P.valid;                // valid[initial][final] = syllable (không dấu)
    var filter = "all";

    var pillsHost = document.getElementById("initial-pills");
    var body = document.getElementById("pinyin-body");

    /* ---- filter pills ---- */
    var allPill = NHAI.el('<button type="button" class="pill pill-active text-sm">Tất cả</button>');
    allPill.addEventListener("click", function () { setFilter("all"); });
    pillsHost.appendChild(allPill);
    initials.forEach(function (ini) {
      var b = NHAI.el('<button type="button" class="pill text-sm">' + ini + "</button>");
      b.addEventListener("click", function () { setFilter(ini); });
      pillsHost.appendChild(b);
    });

    function setFilter(v) {
      filter = v;
      pillsHost.querySelectorAll("button").forEach(function (b) {
        var on = (v === "all" && b.textContent === "Tất cả") || b.textContent === v;
        b.classList.toggle("pill-active", on);
        b.classList.toggle("btn-ghost", !on);
      });
      buildTable();
    }

    /* ---- bảng ma trận ---- */
    var headRow = document.querySelector("thead tr");
    finals.forEach(function (f) {
      headRow.appendChild(NHAI.el('<th class="border-2 border-[var(--nhai-border)] bg-[var(--nhai-soft)] px-2 py-1.5 text-xs font-bold whitespace-nowrap">' + f + "</th>"));
    });

    function buildTable() {
      body.innerHTML = "";
      var rows = filter === "all" ? initials : [filter];
      rows.forEach(function (ini) {
        var tr = document.createElement("tr");
        var th = NHAI.el('<th class="sticky left-0 z-10 bg-[var(--nhai-card)] border-2 border-[var(--nhai-border)] px-2 py-1.5 text-sm font-extrabold">' + ini + "</th>");
        tr.appendChild(th);
        finals.forEach(function (f) {
          var syl = valid[ini] ? valid[ini][f] : null;
          var td;
          if (syl) {
            td = NHAI.el(
              '<td class="border border-[var(--nhai-border)]"><button type="button" data-ini="' + ini + '" data-fin="' + f + '" data-syl="' + syl + '"' +
              ' class="grid-cell w-full h-full min-w-[44px] py-1 hover:bg-[var(--nhai-soft)] transition-colors">' +
              '<span class="text-sm sm:text-base font-bold">' + syl + "</span></button></td>"
            );
          } else {
            td = NHAI.el('<td class="border border-[var(--nhai-border)]"><div class="grid-cell w-full h-full min-w-[44px] py-1 zh-faded select-none" aria-hidden="true"><span class="text-sm text-[var(--nhai-muted)]">·</span></div></td>');
          }
          tr.appendChild(td);
        });
        body.appendChild(tr);
      });
    }

    body.addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-syl]");
      if (btn) openDetail(btn.getAttribute("data-ini"), btn.getAttribute("data-fin"), btn.getAttribute("data-syl"));
    });

    /* ---- popup chi tiết ---- */
    function openDetail(ini, fin, syl) {
      var ex = P.examples[syl] || [];
      var toneBtns = [1, 2, 3, 4].map(function (t) {
        var marked = NHAI.toPinyin ? NHAI.toPinyin(syl + t) : syl;
        return '<button type="button" data-tone="' + t + '" class="btn-ghost px-3 py-2 text-lg font-bold zh">' + marked + "</button>";
      }).join("");

      var bd = NHAI.el(
        '<div class="modal-backdrop" data-overlay data-kind="pinyin">' +
          '<div class="card shadow-neo w-full max-w-sm p-5" role="dialog" aria-label="Chi tiết âm tiết">' +
            '<div class="flex items-center justify-between mb-2">' +
              '<span class="pill text-xs py-0.5 font-bold">' + (ini === "Ø" ? "không thanh mẫu" : ini + " + " + fin) + "</span>" +
              '<button type="button" data-close class="btn-ghost w-9 h-9">✕</button>' +
            "</div>" +
            '<h2 class="text-5xl font-extrabold text-center my-3 zh">' + syl + "</h2>" +
            '<p class="text-xs font-bold text-center text-[var(--nhai-muted)] mb-3">Bấm để nghe 4 thanh điệu</p>' +
            '<div class="grid grid-cols-4 gap-2 mb-4">' + toneBtns + "</div>" +
            (ex.length
              ? '<div class="border-t-2 border-[var(--nhai-border)] pt-3">' +
                  '<p class="text-xs font-bold uppercase tracking-wide text-[var(--nhai-muted)] mb-2">Từ ví dụ</p>' +
                  ex.map(function (w) {
                    return '<button type="button" data-word="' + w[1] + '" class="w-full flex items-baseline gap-2 py-1 text-left hover:text-[var(--nhai-main)]">' +
                      '<span class="zh text-xl font-bold">' + w[0] + "</span>" +
                      '<span class="text-sm font-semibold">' + w[1] + "</span>" +
                      '<span class="text-xs text-[var(--nhai-muted)] ml-auto">' + w[2] + "</span></button>";
                  }).join("") +
                "</div>"
              : '<p class="text-xs text-[var(--nhai-muted)] border-t-2 border-[var(--nhai-border)] pt-3">Chưa có từ ví dụ cho âm này.</p>') +
          "</div>" +
        "</div>"
      );

      bd.addEventListener("click", function (e) {
        if (e.target === bd || e.target.closest("[data-close]")) { bd.remove(); return; }
        var tone = e.target.closest("[data-tone]");
        if (tone) {
          NHAI.speak(NHAI.toPinyin ? NHAI.toPinyin(syl + tone.getAttribute("data-tone")) : syl, "zh-CN");
          return;
        }
        var word = e.target.closest("[data-word]");
        if (word) NHAI.speak(word.getAttribute("data-word"), "zh-CN");
      });
      document.body.appendChild(bd);
    }

    buildTable();
  }

  if (document.readyState === "complete") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
