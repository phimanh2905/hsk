/* Nhai HSK clone — chế độ Trắc nghiệm (PLAN-02): 4 đáp án pinyin, toggle đề, chấm điểm. */
(function () {
  "use strict";
  window.NHAI.lessonModes = window.NHAI.lessonModes || {};

  var QMODES = [
    { id: "reading", label: "Cách đọc" },
    { id: "vocab", label: "Từ vựng" },
    { id: "meaning", label: "Ý nghĩa" }
  ];

  NHAI.lessonModes.quiz = {
    label: "Trắc nghiệm",
    defaultBadge: "0 / 0",
    render: function (root, ctx) {
      var words = ctx.words;
      var qMode = "reading";
      var order = NHAI.shuffle(words.map(function (_, i) { return i; }));
      var pos = 0;
      var score = 0;
      var locked = false;
      var dead = false; // chế độ đã bị teardown -> bỏ qua callback trễ
      ctx.addCleanup(function () { dead = true; });

      root.innerHTML =
        '<div class="flex flex-wrap items-center gap-2 mb-4">' +
          '<span class="text-xs font-bold text-[var(--nhai-muted)]">Cài đặt hiển thị đề bài:</span>' +
          QMODES.map(function (m, i) {
            return '<button type="button" data-qmode="' + m.id + '" class="pill text-xs py-1 ' + (i === 0 ? "pill-active" : "") + '">' + m.label + "</button>";
          }).join("") +
          '<span class="ml-auto text-sm font-extrabold text-green-700" data-score>Đúng: 0</span>' +
        "</div>" +
        '<div class="card p-6 text-center bg-[var(--nhai-bg)]" data-question>' +
          '<span data-chip class="pill text-xs py-0.5"></span>' +
          '<div data-main class="mt-3"></div>' +
        "</div>" +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4" data-answers></div>' +
        '<div class="flex flex-wrap items-center gap-2 mt-4">' +
          '<button type="button" data-skip class="btn-ghost px-3 py-2 text-sm">Không biết</button>' +
          '<button type="button" data-hint class="btn-ghost px-3 py-2 text-sm">🔊 Nghe phát âm gợi ý</button>' +
          '<span class="text-xs text-[var(--nhai-muted)]">Bí quá thì nghe</span>' +
        "</div>";

      var q = function (sel) { return root.querySelector(sel); };

      function distractors(correct, field, n) {
        var pool = NHAI.shuffle(words)
          .map(function (w) { return w[field]; })
          .filter(function (v, i, arr) { return v !== correct && arr.indexOf(v) === i; });
        return pool.slice(0, n);
      }

      function paintQuestion() {
        if (!root.querySelector("[data-main]")) return;
        locked = false;
        var w = words[order[pos]];
        var main = q("[data-main]");
        main.innerHTML = "";
        if (qMode === "reading") {
          q("[data-chip]").textContent = "Chọn cách đọc đúng";
          main.innerHTML = '<p class="zh text-5xl font-extrabold">' + w.hanzi + "</p>";
        } else if (qMode === "vocab") {
          q("[data-chip]").textContent = "Chọn cách đọc đúng";
          main.innerHTML = '<p class="zh text-5xl font-extrabold">' + w.hanzi + "</p>" +
            '<p class="text-lg font-extrabold text-[var(--nhai-main)] mt-1">' + w.hanViet + "</p>";
        } else {
          q("[data-chip]").textContent = "Chọn cách đọc đúng";
          main.innerHTML = '<p class="text-2xl font-extrabold mt-2">' + w.meaning + "</p>";
        }
        var opts = NHAI.shuffle([w.pinyin].concat(distractors(w.pinyin, "pinyin", 3)));
        var box = q("[data-answers]");
        box.innerHTML = "";
        opts.forEach(function (p) {
          var b = NHAI.el('<button type="button" class="btn-ghost py-3 px-2 text-lg font-bold" data-py="' + p.replace(/"/g, "&quot;") + '">' + p + "</button>");
          b.addEventListener("click", function () { answer(b, p, w); });
          box.appendChild(b);
        });
        ctx.setCounter((pos + 1) + " / " + ctx.total);
      }

      function finish() {
        ctx.setBadge("quiz", score + " / " + ctx.total);
        var box = q("[data-answers]");
        var again = NHAI.el('<button type="button" class="btn-main py-3 px-4 sm:col-span-2 text-base">🔄 Học lại từ đầu</button>');
        again.addEventListener("click", function () {
          order = NHAI.shuffle(order);
          pos = 0; score = 0;
          q("[data-score]").textContent = "Đúng: 0";
          paintQuestion();
        });
        box.innerHTML = "";
        box.appendChild(again);
        q("[data-question]").innerHTML =
          '<p class="text-2xl font-extrabold">🎉 Hoàn thành!</p>' +
          '<p class="mt-2 text-lg">Bạn trả lời đúng <span class="font-extrabold text-[var(--nhai-main)]">' + score + " / " + ctx.total + "</span> câu.</p>";
      }

      function answer(btn, picked, w) {
        if (locked) return;
        locked = true;
        var correct = picked === w.pinyin;
        var all = root.querySelectorAll("[data-answers] [data-py]");
        all.forEach(function (b) {
          b.disabled = true;
          if (b.getAttribute("data-py") === w.pinyin) {
            b.classList.remove("btn-ghost");
            b.classList.add("border-2", "border-green-600", "bg-green-50", "text-green-700");
          }
        });
        if (correct) {
          score++;
          q("[data-score]").textContent = "Đúng: " + score;
        } else {
          btn.classList.remove("btn-ghost");
          btn.classList.add("border-2", "border-red-600", "bg-red-50", "text-red-600", "shake");
        }
        setTimeout(function () {
          if (dead) return;
          pos++;
          if (pos >= order.length) finish();
          else paintQuestion();
        }, 800);
      }

      root.querySelectorAll("[data-qmode]").forEach(function (b) {
        b.addEventListener("click", function () {
          root.querySelectorAll("[data-qmode]").forEach(function (x) { x.classList.toggle("pill-active", x === b); });
          qMode = b.getAttribute("data-qmode");
          paintQuestion();
        });
      });
      q("[data-skip]").addEventListener("click", function () {
        if (locked) return;
        locked = true;
        root.querySelectorAll("[data-answers] [data-py]").forEach(function (b) {
          b.disabled = true;
          if (b.getAttribute("data-py") === words[order[pos]].pinyin) {
            b.classList.remove("btn-ghost");
            b.classList.add("border-2", "border-green-600", "bg-green-50", "text-green-700");
          }
        });
        setTimeout(function () {
          if (dead) return;
          pos++;
          if (pos >= order.length) finish();
          else paintQuestion();
        }, 800);
      });
      q("[data-hint]").addEventListener("click", function () { ctx.speak(words[order[pos]].hanzi); });

      ctx.setBadge("quiz", "0 / " + ctx.total);
      paintQuestion();
    }
  };
})();
