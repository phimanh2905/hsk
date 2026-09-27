/* Nhai HSK clone — PLAN-07 logic trang Luyện thi chứng chỉ (UI-only).
   10 card "Sắp ra mắt": bấm → toast. */
(function () {
  "use strict";

  var D = window.NHAI_DATA && window.NHAI_DATA.certificates;
  if (!D) return;

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function card(c) {
    return (
      '<button type="button" data-cert class="card text-left p-4 flex items-start gap-3 cursor-default select-none" ' +
        'title="Chứng chỉ này sắp ra mắt">' +
        '<span class="zh w-14 h-14 shrink-0 rounded-lg bg-[#fde8e4] text-[var(--nhai-main)] font-extrabold flex items-center justify-center text-lg">' +
          esc(c.logo) +
        "</span>" +
        '<span class="min-w-0">' +
          '<span class="flex items-center gap-2 flex-wrap">' +
            '<h3 class="font-extrabold text-lg">' + esc(c.name) + "</h3>" +
            '<span class="text-xs font-bold px-2 py-0.5 rounded-full bg-[var(--nhai-soft)] text-[var(--nhai-muted)]">Sắp ra mắt</span>' +
          "</span>" +
          '<span class="zh block text-sm text-[var(--nhai-muted)] mt-0.5">' + esc(c.zh) + "</span>" +
          '<span class="block text-sm text-[var(--nhai-muted)] mt-1">' + esc(c.desc) + "</span>" +
        "</span>" +
      "</button>"
    );
  }

  var hskGrid = document.querySelector("[data-hsk-grid]");
  var hskkGrid = document.querySelector("[data-hskk-grid]");
  hskGrid.innerHTML = D.hsk.map(card).join("");
  hskkGrid.innerHTML = D.hskk.map(card).join("");

  document.querySelectorAll("[data-cert]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      NHAI.toast("Chứng chỉ này sắp ra mắt — hãy quay lại sau nhé!");
    });
  });
})();
