/* Nhai HSK clone — chế độ Nghe ghép câu (PLAN-02): TTS câu ví dụ, ghép thứ tự chữ Hán, tốc độ 0.5x-2x. */
(function () {
  "use strict";
  window.NHAI.lessonModes = window.NHAI.lessonModes || {};

  var RATES = [0.5, 0.8, 1, 1.5, 2];
  var PUNCT = /[，。？！、：；…—\s]/;

  NHAI.lessonModes.listen = {
    label: "Nghe ghép câu",
    defaultBadge: "Chưa học",
    render: function (root, ctx) {
      var words = ctx.words;
      var order = NHAI.shuffle(words.map(function (_, i) { return i; }));
      var pos = 0;
      var rate = 1;
      var pool = [];    // các ký tự chưa dùng [{ch, idx}]
      var answer = [];  // các ký tự đã chọn
      var solved = false;
      var dead = false; // chế độ đã bị teardown -> bỏ qua callback trễ
      ctx.addCleanup(function () { dead = true; });

      root.innerHTML =
        '<div class="flex flex-wrap items-center gap-2 mb-4">' +
          '<button type="button" data-play class="btn-main px-4 py-2 text-sm">▶ Nghe câu</button>' +
          '<button type="button" data-replay class="btn-ghost px-3 py-2 text-sm">↻ Nghe lại</button>' +
          '<span class="text-xs font-bold text-[var(--nhai-muted)] ml-2">Tốc độ:</span>' +
          RATES.map(function (r) {
            return '<button type="button" data-rate="' + r + '" class="pill text-xs py-1 ' + (r === 1 ? "pill-active" : "") + '">' + r + "x</button>";
          }).join("") +
        "</div>" +
        '<div class="card p-4 bg-[var(--nhai-bg)] min-h-[92px] mb-3" data-answer-row>' +
          '<p class="text-xs font-bold text-[var(--nhai-muted)] uppercase mb-2">Câu của bạn</p>' +
          '<div class="flex flex-wrap gap-1.5 min-h-[44px]" data-answer></div>' +
        "</div>" +
        '<div class="card p-4" data-pool-row>' +
          '<p class="text-xs font-bold text-[var(--nhai-muted)] uppercase mb-2">Thẻ chữ Hán — bấm để ghép</p>' +
          '<div class="flex flex-wrap gap-1.5" data-pool></div>' +
        "</div>" +
        '<div class="flex flex-wrap items-center gap-2 mt-4">' +
          '<button type="button" data-submit class="btn-main px-4 py-2">Ghép câu</button>' +
          '<button type="button" data-reset class="btn-ghost px-3 py-2 text-sm">Gõ lại</button>' +
          '<span data-feedback class="text-sm font-bold"></span>' +
        "</div>";

      var q = function (sel) { return root.querySelector(sel); };

      function charsOf(w) {
        return Array.from(w.example.zh)
          .map(function (ch, idx) { return { ch: ch, idx: idx }; })
          .filter(function (t) { return !PUNCT.test(t.ch); });
      }

      function paint() {
        if (!root.querySelector("[data-pool]")) return;
        solved = false;
        var w = words[order[pos]];
        var all = charsOf(w);
        pool = NHAI.shuffle(all);
        answer = [];
        q("[data-feedback]").textContent = "";
        q("[data-answer-row]").classList.remove("border-green-600", "border-red-600", "shake");
        renderRows();
        ctx.setCounter((pos + 1) + " / " + ctx.total);
      }

      function renderRows() {
        var ansBox = q("[data-answer]");
        var poolBox = q("[data-pool]");
        ansBox.innerHTML = "";
        poolBox.innerHTML = "";
        if (!answer.length) ansBox.appendChild(NHAI.el('<span class="text-xs text-[var(--nhai-muted)] italic">Bấm thẻ chữ bên dưới để ghép câu…</span>'));
        answer.forEach(function (t, i) {
          var b = NHAI.el('<button type="button" class="btn-ghost w-11 h-11 zh text-xl font-extrabold">' + t.ch + "</button>");
          b.addEventListener("click", function () {
            if (solved) return;
            pool.push(t);
            answer.splice(i, 1);
            renderRows();
          });
          ansBox.appendChild(b);
        });
        pool.forEach(function (t, i) {
          var b = NHAI.el('<button type="button" class="btn-ghost w-11 h-11 zh text-xl font-extrabold">' + t.ch + "</button>");
          b.addEventListener("click", function () {
            if (solved) return;
            pool.splice(i, 1);
            answer.push(t);
            renderRows();
          });
          poolBox.appendChild(b);
        });
      }

      function speakCurrent() { ctx.speak(words[order[pos]].example.zh, "zh-CN", rate); }

      function finish() {
        ctx.setBadge("listen", "Đã học");
        q("[data-pool-row]").innerHTML =
          '<p class="text-2xl font-extrabold text-center py-6">🎉 Bạn đã ghép xong ' + ctx.total + " câu!</p>";
        q("[data-answer-row]").innerHTML =
          '<div class="text-center"><button type="button" data-again class="btn-main px-4 py-2.5">🔄 Luyện lại</button></div>';
        q("[data-again]").addEventListener("click", function () {
          NHAI.lessonModes.listen.render(root, ctx);
        });
      }

      function submit() {
        if (solved) return;
        var w = words[order[pos]];
        var target = charsOf(w).map(function (t) { return t.ch; }).join("");
        var guess = answer.map(function (t) { return t.ch; }).join("");
        var row = q("[data-answer-row]");
        var fb = q("[data-feedback]");
        if (guess === target) {
          solved = true;
          row.classList.add("border-green-600");
          fb.textContent = "✅ Chính xác!";
          fb.classList.add("text-green-700");
          setTimeout(function () {
            if (dead) return;
            pos++;
            if (pos >= order.length) finish();
            else paint();
          }, 1000);
        } else {
          row.classList.add("border-red-600", "shake");
          fb.textContent = "❌ Chưa đúng thứ tự — nghe lại nhé!";
          fb.classList.add("text-red-600");
          setTimeout(function () {
            row.classList.remove("border-red-600", "shake");
          }, 500);
        }
      }

      q("[data-play]").addEventListener("click", speakCurrent);
      q("[data-replay]").addEventListener("click", speakCurrent);
      q("[data-submit]").addEventListener("click", submit);
      q("[data-reset]").addEventListener("click", paint);
      root.querySelectorAll("[data-rate]").forEach(function (b) {
        b.addEventListener("click", function () {
          root.querySelectorAll("[data-rate]").forEach(function (x) { x.classList.toggle("pill-active", x === b); });
          rate = parseFloat(b.getAttribute("data-rate"));
          speakCurrent();
        });
      });

      paint();
      speakCurrent(); // tự nghe câu đầu tiên khi vào chế độ
    }
  };
})();
