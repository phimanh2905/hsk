/* Nhai HSK clone — Quy tắc chuyển âm (PLAN-04): bảng thanh điệu + bar %, quy tắc âm đầu/vần, 5 câu bài tập. */
(function () {
  "use strict";

  function init() {
    var D = (window.NHAI_DATA && NHAI_DATA.soundrules) || {};
    if (!D.toneRows) return;

    document.querySelector("[data-note]").textContent = "📌 " + D.note;

    /* ---- Bảng thanh điệu ---- */
    var toneBody = document.getElementById("tone-body");
    D.toneRows.forEach(function (row) {
      var toneCell = row.tones.map(function (t) {
        var toneNum = (t.label.match(/\d/) || [])[0];
        var color = (D.toneColors && D.toneColors[toneNum]) || "#c23b22";
        var pct = t.pct;
        return (
          '<div class="flex items-center gap-2 mb-1.5">' +
            '<span class="text-xl font-extrabold zh w-10">' + t.mark + "</span>" +
            '<span class="text-xs font-bold text-[var(--nhai-muted)] w-14">' + t.label + "</span>" +
            '<span class="flex-1 h-3 rounded bg-[var(--nhai-soft)] border border-[var(--nhai-border)] overflow-hidden">' +
              '<span class="block h-full rounded" style="width:' + pct + "%;background:" + color + '"></span>' +
            "</span>" +
            '<span class="text-xs font-extrabold w-10 text-right">' + pct + "%</span>" +
          "</div>"
        );
      }).join("");

      var countLabel = row.sample
        ? '<span class="text-xs font-semibold text-[var(--nhai-muted)]">mẫu ' + row.count + " chữ</span>"
        : '<span class="text-xs font-semibold text-[var(--nhai-muted)]">(' + row.count + " chữ)</span>";

      var exCell = row.examples.map(function (ex) {
        return '<button type="button" data-speak="' + ex[2] + '" class="inline-flex items-baseline gap-1.5 mr-3 mb-1 hover:text-[var(--nhai-main)]" title="Nghe: ' + ex[2] + '">' +
          '<span class="zh text-lg font-bold">' + ex[0] + "</span>" +
          '<span class="text-xs font-semibold">' + ex[1] + "</span>" +
          '<span class="text-xs text-[var(--nhai-accent)] font-bold zh">' + ex[2] + "</span>" +
          "</button>";
      }).join("");

      toneBody.appendChild(NHAI.el(
        "<tr>" +
          '<td class="border-2 border-[var(--nhai-border)] px-3 py-2 font-extrabold align-top">' + row.name + "<br>" + countLabel + "</td>" +
          '<td class="border-2 border-[var(--nhai-border)] px-3 py-2 align-top min-w-[260px]">' + toneCell + "</td>" +
          '<td class="border-2 border-[var(--nhai-border)] px-3 py-2 align-top">' + exCell + "</td>" +
        "</tr>"
      ));
    });

    toneBody.addEventListener("click", function (e) {
      var b = e.target.closest("[data-speak]");
      if (b) NHAI.speak(b.getAttribute("data-speak"), "zh-CN");
    });

    /* ---- Quy tắc âm đầu & vần ---- */
    function renderRules(list, hostId) {
      var host = document.getElementById(hostId);
      list.forEach(function (r, ri) {
        var exHtml = r.examples.map(function (ex) {
          return '<button type="button" data-speak="' + ex[2] + '" class="inline-flex items-baseline gap-1.5 mr-3 hover:text-[var(--nhai-main)]" title="Nghe: ' + ex[2] + '">' +
            '<span class="zh text-base font-bold">' + ex[0] + "</span>" +
            '<span class="text-xs font-semibold">' + ex[1] + "</span>" +
            '<span class="text-xs text-[var(--nhai-accent)] font-bold zh">' + ex[2] + "</span>" +
            "</button>";
        }).join("");
        host.appendChild(NHAI.el(
          '<div class="border-l-4 border-[var(--nhai-main)] bg-[var(--nhai-soft)] rounded-r-lg px-3 py-2">' +
            '<p class="text-sm font-extrabold mb-1"><span class="text-[var(--nhai-main)]">' + (ri + 1) + '.</span> ' + r.rule + "</p>" +
            '<p class="flex flex-wrap gap-y-1">' + exHtml + "</p>" +
          "</div>"
        ));
      });
      host.addEventListener("click", function (e) {
        var b = e.target.closest("[data-speak]");
        if (b) NHAI.speak(b.getAttribute("data-speak"), "zh-CN");
      });
    }
    renderRules(D.initialRules, "initial-rules");
    renderRules(D.finalRules, "final-rules");

    /* ---- Bài tập áp dụng ---- */
    var quizArea = document.getElementById("quiz-area");
    var scoreEl = document.querySelector("[data-quiz-score]");
    var answered = 0, correct = 0;

    D.quiz.forEach(function (q, qi) {
      var card = NHAI.el(
        '<div class="border-2 border-[var(--nhai-border)] rounded-lg p-3">' +
          '<p class="font-extrabold mb-2 text-lg">Câu ' + (qi + 1) + ": " + q.q + "</p>" +
          '<div class="flex flex-wrap gap-2" data-opts></div>' +
          '<p data-explain class="hidden mt-2 text-sm rounded-lg px-3 py-2 bg-[var(--nhai-soft)]"></p>' +
        "</div>"
      );
      var opts = card.querySelector("[data-opts]");
      var explain = card.querySelector("[data-explain]");

      q.options.forEach(function (op, oi) {
        var b = NHAI.el('<button type="button" class="btn-ghost px-4 py-2 text-base font-bold zh">' + op + "</button>");
        b.addEventListener("click", function () {
          if (card.getAttribute("data-done")) return;
          card.setAttribute("data-done", "1");
          answered++;
          var ok = oi === q.answer;
          if (ok) correct++;
          q.options.forEach(function (_, i) {
            var ob = opts.children[i];
            ob.disabled = true;
            if (i === q.answer) { ob.classList.remove("btn-ghost"); ob.classList.add("pill-active"); }
          });
          if (!ok) { b.style.borderColor = "#dc2626"; b.style.color = "#dc2626"; }
          explain.classList.remove("hidden");
          explain.innerHTML = (ok ? '<span class="font-extrabold text-green-700">✓ Đúng! </span>'
                                  : '<span class="font-extrabold text-red-600">✗ Chưa đúng. </span>')
                                + '<span>' + q.explain + "</span>";
          scoreEl.textContent = "Kết quả: " + correct + "/" + D.quiz.length + " câu đúng";
          NHAI.speak(q.options[q.answer], "zh-CN");
        });
        opts.appendChild(b);
      });
      quizArea.appendChild(card);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
