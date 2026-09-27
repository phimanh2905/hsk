/* Nhai HSK clone — chế độ Gõ từ (PLAN-02): gõ pinyin số thanh điệu (ni3 → nǐ), gợi ý 0/5. */
(function () {
  "use strict";
  window.NHAI.lessonModes = window.NHAI.lessonModes || {};

  var MODES = [
    { id: "reading", label: "Cách đọc" },  // gợi ý: chữ Hán
    { id: "hanviet", label: "Âm Hán" },    // gợi ý: ÂM HÁN VIỆT
    { id: "hanzi", label: "Chữ Hán" }      // gợi ý: pinyin không dấu
  ];

  NHAI.lessonModes.typing = {
    label: "Gõ từ",
    defaultBadge: "0 / 0",
    render: function (root, ctx) {
      var words = ctx.words;
      var hintMode = "reading";
      var order = NHAI.shuffle(words.map(function (_, i) { return i; }));
      var pos = 0;
      var score = 0;
      var hints = 0;
      var revealed = [];   // số âm tiết đã mở bởi gợi ý
      var done = false;
      var dead = false; // chế độ đã bị teardown -> bỏ qua callback trễ
      ctx.addCleanup(function () { dead = true; });

      root.innerHTML =
        '<div class="flex flex-wrap items-center gap-2 mb-4">' +
          '<span class="text-xs font-bold text-[var(--nhai-muted)]">Đề bài:</span>' +
          MODES.map(function (m, i) {
            return '<button type="button" data-tmode="' + m.id + '" class="pill text-xs py-1 ' + (i === 0 ? "pill-active" : "") + '">' + m.label + "</button>";
          }).join("") +
          '<span class="ml-auto text-sm font-extrabold text-green-700" data-score>Đúng: 0</span>' +
        "</div>" +
        '<div class="card p-6 text-center bg-[var(--nhai-bg)]" data-card>' +
          '<span data-chip class="pill text-xs py-0.5"></span>' +
          '<div data-hint-main class="mt-3"></div>' +
          '<p class="text-lg font-semibold mt-2" data-meaning></p>' +
          '<div class="flex flex-wrap justify-center gap-1.5 mt-4" data-cells></div>' +
        "</div>" +
        '<div class="flex flex-wrap items-center gap-2 mt-4">' +
          '<input type="text" data-input class="flex-1 min-w-[220px] border-2 border-[var(--nhai-border)] rounded-lg px-3 py-2.5 bg-[var(--nhai-bg)] font-mono" placeholder="Gõ pinyin, số là thanh điệu (ni3 → nǐ)">' +
          '<button type="button" data-check class="btn-main px-4 py-2.5">Kiểm tra</button>' +
          '<button type="button" data-hintbtn class="btn-ghost px-3 py-2.5 text-sm">Gợi ý (0/5)</button>' +
        "</div>" +
        '<p class="text-xs text-[var(--nhai-muted)] mt-2">Mẹo: gõ “ni3 hao3” → nǐ hǎo, “lv4” → lǜ. Nhấn Enter để kiểm tra.</p>';

      var q = function (sel) { return root.querySelector(sel); };
      var input = q("[data-input]");

      function syllables(w) { return NHAI.splitPinyin(w.pinyin); } // số ô = số âm tiết

      function paintQuestion() {
        if (!root.querySelector("[data-cells]")) return;
        done = false;
        hints = 0;
        revealed = [];
        var w = words[order[pos]];
        q("[data-chip]").textContent = w.pos;
        var main = q("[data-hint-main]");
        if (hintMode === "reading") {
          main.innerHTML = '<p class="zh text-5xl font-extrabold">' + w.hanzi + "</p>";
        } else if (hintMode === "hanviet") {
          main.innerHTML = '<p class="text-3xl font-extrabold text-[var(--nhai-main)]">' + w.hanViet + "</p>";
        } else {
          main.innerHTML = '<p class="text-2xl font-extrabold font-mono">' + NHAI.stripTones(w.pinyin) + "</p>";
        }
        q("[data-meaning]").textContent = w.meaning;
        var cells = q("[data-cells]");
        cells.innerHTML = "";
        syllables(w).forEach(function () {
          cells.appendChild(NHAI.el('<span class="w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center border-2 border-[var(--nhai-border)] rounded-lg text-lg font-bold bg-[var(--nhai-card)]">_</span>'));
        });
        input.value = "";
        input.classList.remove("border-green-600", "border-red-600");
        q("[data-card]").classList.remove("border-green-600");
        q("[data-hintbtn]").textContent = "Gợi ý (0/5)";
        ctx.setCounter((pos + 1) + " / " + ctx.total);
        input.focus();
      }

      function mirrorCells() {
        var w = words[order[pos]];
        var syls = syllables(w);
        var typed = input.value.trim().split(/\s+/).filter(Boolean);
        var cells = q("[data-cells]").children;
        for (var i = 0; i < cells.length; i++) {
          var val = "_";
          if (revealed[i] !== undefined) val = revealed[i];
          else if (typed[i]) val = typed[i];
          cells[i].textContent = val;
        }
        void syls;
      }

      function finish() {
        ctx.setBadge("typing", score + " / " + ctx.total);
        root.querySelector("[data-card]").outerHTML =
          '<div class="card p-6 text-center bg-[var(--nhai-bg)]">' +
            '<p class="text-2xl font-extrabold">🎉 Hoàn thành!</p>' +
            '<p class="mt-2 text-lg">Bạn gõ đúng <span class="font-extrabold text-[var(--nhai-main)]">' + score + " / " + ctx.total + "</span> từ.</p>" +
            '<button type="button" data-again class="btn-main px-4 py-2.5 mt-4">🔄 Luyện lại từ đầu</button>' +
          "</div>";
        root.querySelector("[data-again]").addEventListener("click", function () {
          order = NHAI.shuffle(order);
          pos = 0; score = 0;
          q("[data-score]").textContent = "Đúng: 0";
          // render lại toàn bộ khu chơi
          NHAI.lessonModes.typing.render(root, ctx);
        });
      }

      function check() {
        if (done) return;
        var w = words[order[pos]];
        // so sánh đã chuẩn hóa: bỏ dấu + bỏ khoảng trắng ("Wáng lǎoshī" ≡ "wang2 lao3shi1")
        var norm = function (s) { return NHAI.stripTones(s).replace(/\s+/g, ""); };
        var ok = norm(NHAI.toPinyin(input.value)) === norm(w.pinyin);
        var card = q("[data-card]");
        if (ok) {
          done = true;
          score++;
          q("[data-score]").textContent = "Đúng: " + score;
          card.classList.add("border-green-600");
          input.classList.add("border-green-600");
          input.value = w.pinyin;
          mirrorCells();
          setTimeout(function () {
            if (dead) return;
            pos++;
            if (pos >= order.length) finish();
            else paintQuestion();
          }, 700);
        } else {
          card.classList.add("shake");
          input.classList.add("border-red-600");
          setTimeout(function () {
            card.classList.remove("shake");
            input.classList.remove("border-red-600");
          }, 400);
        }
      }

      input.addEventListener("input", mirrorCells);
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); check(); }
      });
      q("[data-check]").addEventListener("click", check);
      q("[data-hintbtn]").addEventListener("click", function () {
        if (done || hints >= 5) return;
        var w = words[order[pos]];
        var syls = syllables(w);
        var nextIdx = -1;
        for (var i = 0; i < syls.length; i++) {
          if (revealed[i] === undefined) { nextIdx = i; break; }
        }
        if (nextIdx === -1) return;
        revealed[nextIdx] = syls[nextIdx];
        hints++;
        this.textContent = "Gợi ý (" + hints + "/5)";
        mirrorCells();
      });

      root.querySelectorAll("[data-tmode]").forEach(function (b) {
        b.addEventListener("click", function () {
          root.querySelectorAll("[data-tmode]").forEach(function (x) { x.classList.toggle("pill-active", x === b); });
          hintMode = b.getAttribute("data-tmode");
          paintQuestion();
        });
      });

      ctx.setBadge("typing", "0 / " + ctx.total);
      paintQuestion();
    }
  };
})();
