/* Nhai HSK clone — chế độ Đọc hiểu (PLAN-02): điền từ vào câu ví dụ, đáp án chữ Hán. */
(function () {
  "use strict";
  window.NHAI.lessonModes = window.NHAI.lessonModes || {};

  NHAI.lessonModes.reading = {
    label: "Đọc hiểu",
    defaultBadge: "Chưa học",
    render: function (root, ctx) {
      var words = ctx.words;
      var order = NHAI.shuffle(words.map(function (_, i) { return i; }));
      var pos = 0;
      var score = 0;
      var locked = false;
      var showMeaning = false;
      var dead = false; // chế độ đã bị teardown -> bỏ qua callback trễ
      ctx.addCleanup(function () { dead = true; });

      root.innerHTML =
        '<div class="flex flex-wrap items-center gap-2 mb-4">' +
          '<button type="button" data-meaning-toggle class="pill text-xs py-1">Nghĩa</button>' +
          '<span class="text-xs text-[var(--nhai-muted)]">Bật để xem gợi ý nghĩa của từ</span>' +
          '<span class="ml-auto text-sm font-extrabold text-green-700" data-score>Đúng: 0</span>' +
        "</div>" +
        '<div class="card p-6 bg-[var(--nhai-bg)]" data-card>' +
          '<p class="text-xs font-bold text-[var(--nhai-muted)] uppercase mb-2">Điền từ vào chỗ trống</p>' +
          '<p data-sentence class="zh text-2xl sm:text-3xl font-extrabold leading-relaxed"></p>' +
          '<p data-sentence-py class="text-xs text-[var(--nhai-muted)] mt-1"></p>' +
          '<p data-vi class="text-sm text-[var(--nhai-muted)] mt-2 italic"></p>' +
          '<p data-meaning class="text-sm font-bold text-[var(--nhai-main)] mt-1 hidden"></p>' +
        "</div>" +
        '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4" data-answers></div>' +
        '<div class="flex flex-wrap items-center gap-2 mt-4">' +
          '<button type="button" data-giveup class="btn-ghost px-3 py-2 text-sm">Câu này bó tay</button>' +
          '<button type="button" data-listen class="btn-ghost px-3 py-2 text-sm">🔊 Nghe câu ví dụ gợi ý</button>' +
        "</div>";

      var q = function (sel) { return root.querySelector(sel); };

      function blanked(w) {
        var zh = w.example.zh;
        var idx = zh.indexOf(w.hanzi);
        return zh.slice(0, idx) + "__" + zh.slice(idx + w.hanzi.length);
      }

      function paintQuestion() {
        if (!root.querySelector("[data-sentence]")) return;
        locked = false;
        var w = words[order[pos]];
        q("[data-sentence]").textContent = blanked(w);
        q("[data-sentence-py]").textContent = NHAI.pinyinLine(w.example.pinyinPerChar);
        q("[data-vi]").textContent = "→ " + w.example.vi;
        q("[data-meaning]").classList.toggle("hidden", !showMeaning);
        q("[data-meaning]").textContent = "Từ cần điền: " + w.meaning;
        var opts = NHAI.shuffle(words.map(function (x) { return x.hanzi; }).filter(function (h, i, a) { return h !== w.hanzi && a.indexOf(h) === i; })).slice(0, 3);
        opts.push(w.hanzi);
        opts = NHAI.shuffle(opts);
        var box = q("[data-answers]");
        box.innerHTML = "";
        opts.forEach(function (h) {
          var b = NHAI.el('<button type="button" class="btn-ghost py-3 text-2xl zh font-extrabold">' + h + "</button>");
          b.addEventListener("click", function () { answer(b, h, w); });
          box.appendChild(b);
        });
        ctx.setCounter((pos + 1) + " / " + ctx.total);
      }

      function reveal(w, isCorrect, chosenBtn) {
        root.querySelectorAll("[data-answers] button").forEach(function (b) {
          b.disabled = true;
          if (b.textContent === w.hanzi) {
            b.classList.remove("btn-ghost");
            b.classList.add("border-2", "border-green-600", "bg-green-50", "text-green-700");
          }
        });
        q("[data-sentence]").textContent = w.example.zh;
        if (isCorrect) {
          score++;
          q("[data-score]").textContent = "Đúng: " + score;
        } else if (chosenBtn) {
          chosenBtn.classList.remove("btn-ghost");
          chosenBtn.classList.add("border-2", "border-red-600", "bg-red-50", "text-red-600", "shake");
        }
      }

      function next() {
        if (dead) return;
        pos++;
        if (pos >= order.length) {
          ctx.setBadge("reading", "Đã học");
          var card = q("[data-card]");
          card.innerHTML =
            '<p class="text-2xl font-extrabold text-center">🎉 Hoàn thành!</p>' +
            '<p class="mt-2 text-lg text-center">Bạn điền đúng <span class="font-extrabold text-[var(--nhai-main)]">' + score + " / " + ctx.total + "</span> câu.</p>";
          var again = NHAI.el('<div class="text-center mt-4"><button type="button" class="btn-main px-4 py-2.5">🔄 Luyện lại</button></div>');
          card.appendChild(again);
          again.querySelector("button").addEventListener("click", function () {
            NHAI.lessonModes.reading.render(root, ctx);
          });
          return;
        }
        paintQuestion();
      }

      function answer(btn, picked, w) {
        if (locked) return;
        locked = true;
        reveal(w, picked === w.hanzi, btn);
        setTimeout(next, 900);
      }

      q("[data-giveup]").addEventListener("click", function () {
        if (locked) return;
        locked = true;
        reveal(words[order[pos]], false, null);
        setTimeout(next, 900);
      });
      q("[data-listen]").addEventListener("click", function () { ctx.speak(words[order[pos]].example.zh); });
      q("[data-meaning-toggle]").addEventListener("click", function () {
        showMeaning = !showMeaning;
        this.classList.toggle("pill-active", showMeaning);
        q("[data-meaning]").classList.toggle("hidden", !showMeaning);
      });

      paintQuestion();
    }
  };
})();
