/* Nhai HSK clone — chế độ Flashcard (PLAN-02): lật 3D, ZH→VI/VI→ZH, tự động, xáo trộn, phím tắt. */
(function () {
  "use strict";
  window.NHAI.lessonModes = window.NHAI.lessonModes || {};

  NHAI.lessonModes.flashcard = {
    label: "Flashcard",
    render: function (root, ctx) {
      var words = ctx.words;
      var order = NHAI.shuffle(words.map(function (_, i) { return i; }));
      var pos = 0;
      var flipped = false;
      var dir = "zh";           // "zh" = ZH→VI, "vi" = VI→ZH
      var autoTimer = null;
      var autoPlay = false;     // tự động phát âm khi lật thẻ
      var lastStatus = "";
      var dead = false; // chế độ đã bị teardown -> bỏ qua callback trễ
      ctx.addCleanup(function () { dead = true; });

      root.innerHTML =
        '<div class="flex flex-wrap items-center gap-2 mb-4">' +
          '<button type="button" data-dir class="btn-ghost px-3 py-2 text-sm font-extrabold">ZH → VI</button>' +
          '<button type="button" data-auto class="btn-ghost px-3 py-2 text-sm">⏩ Tự động</button>' +
          '<button type="button" data-shuffle class="btn-ghost px-3 py-2 text-sm">🔀 Xáo trộn</button>' +
          '<button type="button" data-autoplay class="btn-ghost px-3 py-2 text-sm" title="Cài đặt tự động phát">🔊 Tự phát</button>' +
          '<span class="ml-auto flex items-center gap-2">' +
            '<span data-status class="pill text-xs py-0.5"></span>' +
            '<button type="button" data-speak class="btn-ghost w-10 h-10" title="Phát âm chữ Hán">🔊</button>' +
          "</span>" +
        "</div>" +
        '<div class="flip-scene w-full max-w-md mx-auto h-64 sm:h-72 cursor-pointer select-none" data-card>' +
          '<div class="flip-inner" data-inner>' +
            '<div class="flip-face card shadow-neo flex flex-col items-center justify-center p-4">' +
              '<span data-front-chip class="pill text-xs py-0.5 mb-3"></span>' +
              '<h2 data-front-main class="zh text-5xl sm:text-6xl font-extrabold"></h2>' +
              '<span data-front-sub class="text-sm font-semibold text-[var(--nhai-muted)] mt-2"></span>' +
              '<span class="text-xs text-[var(--nhai-muted)] mt-4">Click để lật</span>' +
            "</div>" +
            '<div class="flip-face flip-back card shadow-neo flex flex-col items-center justify-center p-4">' +
              '<h2 data-back-main class="zh text-4xl sm:text-5xl font-extrabold"></h2>' +
              '<p data-back-py class="text-xl font-bold mt-2"></p>' +
              '<p data-back-hv class="text-lg font-extrabold text-[var(--nhai-main)]"></p>' +
              '<p data-back-mean class="text-base mt-1 text-center"></p>' +
            "</div>" +
          "</div>" +
        "</div>" +
        '<div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-6 max-w-2xl mx-auto">' +
          '<button type="button" data-prev class="btn-ghost py-2 text-xs sm:text-sm">Thẻ trước<br><span class="text-[10px] font-normal">(←/A)</span></button>' +
          '<button type="button" data-unknown class="py-2 text-xs sm:text-sm font-bold rounded-lg border-2 border-red-600 text-red-600 bg-red-50">Chưa thuộc<br><span class="text-[10px] font-normal">(↓/X)</span></button>' +
          '<button type="button" data-known class="py-2 text-xs sm:text-sm font-bold rounded-lg border-2 border-green-600 text-green-700 bg-green-50">Đã thuộc<br><span class="text-[10px] font-normal">(↑/Z)</span></button>' +
          '<button type="button" data-next class="btn-ghost py-2 text-xs sm:text-sm">Thẻ sau<br><span class="text-[10px] font-normal">(→/D)</span></button>' +
        "</div>";

      var q = function (sel) { return root.querySelector(sel); };

      function cur() { return words[order[pos]]; }
      function curIndex() { return order[pos]; }

      function paint() {
        if (!root.querySelector("[data-front-main]")) return;
        var w = cur();
        flipped = false;
        q("[data-inner]").classList.remove("flipped");
        if (dir === "zh") {
          q("[data-front-chip]").textContent = w.pos;
          q("[data-front-main]").textContent = w.hanzi;
          q("[data-front-sub]").textContent = "";
          q("[data-back-main]").textContent = w.hanzi;
          q("[data-back-py]").textContent = w.pinyin;
          q("[data-back-hv]").textContent = w.hanViet;
          q("[data-back-mean]").textContent = w.meaning;
        } else {
          q("[data-front-chip]").textContent = w.pos;
          q("[data-front-main]").textContent = w.meaning;
          q("[data-front-main]").classList.remove("zh");
          q("[data-front-sub]").textContent = w.pinyin;
          q("[data-back-main]").textContent = w.hanzi;
          q("[data-back-py]").textContent = w.hanViet;
          q("[data-back-hv]").textContent = w.pinyin;
          q("[data-back-mean]").textContent = w.meaning;
        }
        q("[data-front-main]").classList.toggle("zh", dir === "zh");
        var st = ctx.known[curIndex()];
        var chip = q("[data-status]");
        chip.textContent = st === "known" ? "Đã thuộc ✓" : st === "unknown" ? "Chưa thuộc" : "";
        chip.style.display = st ? "" : "none";
        lastStatus = st || "";
        ctx.setCounter((pos + 1) + " / " + ctx.total);
        if (autoPlay) ctx.speak(w.hanzi);
      }

      function flip() {
        flipped = !flipped;
        q("[data-inner]").classList.toggle("flipped", flipped);
        if (flipped && autoPlay) ctx.speak(cur().hanzi);
      }

      function go(delta) {
        pos = (pos + delta + order.length) % order.length;
        paint();
      }

      function mark(status) {
        ctx.known[curIndex()] = status;
        ctx.refreshKnownBadge();
        q("[data-status]").textContent = status === "known" ? "Đã thuộc ✓" : "Chưa thuộc";
        q("[data-status]").style.display = "";
        lastStatus = status;
        setTimeout(function () { if (!dead) go(1); }, 250);
      }

      function stopAuto() {
        if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
        q("[data-auto]").classList.remove("pill-active");
        q("[data-auto]").classList.add("btn-ghost");
      }

      q("[data-card]").addEventListener("click", flip);
      q("[data-dir]").addEventListener("click", function () {
        dir = dir === "zh" ? "vi" : "zh";
        this.textContent = dir === "zh" ? "ZH → VI" : "VI → ZH";
        paint();
      });
      q("[data-shuffle]").addEventListener("click", function () {
        order = NHAI.shuffle(order);
        pos = 0;
        paint();
        NHAI.toast("Đã xáo trộn bộ thẻ 🔀");
      });
      q("[data-auto]").addEventListener("click", function () {
        if (autoTimer) { stopAuto(); return; }
        autoTimer = setInterval(function () { go(1); }, 2500);
        this.classList.remove("btn-ghost");
        this.classList.add("pill-active");
      });
      q("[data-autoplay]").addEventListener("click", function () {
        autoPlay = !autoPlay;
        this.classList.toggle("pill-active", autoPlay);
        this.classList.toggle("btn-ghost", !autoPlay);
        if (autoPlay) ctx.speak(cur().hanzi);
      });
      q("[data-speak]").addEventListener("click", function () { ctx.speak(cur().hanzi); });
      q("[data-prev]").addEventListener("click", function () { go(-1); });
      q("[data-next]").addEventListener("click", function () { go(1); });
      q("[data-known]").addEventListener("click", function () { mark("known"); });
      q("[data-unknown]").addEventListener("click", function () { mark("unknown"); });

      function onKey(e) {
        var t = e.target;
        if (t && (t.closest("input, textarea, select, [contenteditable]") || t.tagName === "INPUT")) return;
        var k = e.key;
        if (k === "ArrowLeft" || k === "a" || k === "A") { e.preventDefault(); go(-1); }
        else if (k === "ArrowRight" || k === "d" || k === "D") { e.preventDefault(); go(1); }
        else if (k === "ArrowDown" || k === "x" || k === "X") { e.preventDefault(); mark("unknown"); }
        else if (k === "ArrowUp" || k === "z" || k === "Z") { e.preventDefault(); mark("known"); }
      }
      document.addEventListener("keydown", onKey);

      paint();
      ctx.addCleanup(function () {
        document.removeEventListener("keydown", onKey);
        stopAuto();
      });
    }
  };
})();
