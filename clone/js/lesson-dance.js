/* Nhai HSK clone — chế độ Hanzi Dance (PLAN-02): gõ đúng pinyin → emoji nhảy, nhạc WebAudio đơn giản. */
(function () {
  "use strict";
  window.NHAI.lessonModes = window.NHAI.lessonModes || {};

  var MUSIC = [
    { id: "langla", label: "Làng Lá", notes: [523.25, 587.33, 659.25, 587.33, 523.25, 440, 493.88, 523.25] },
    { id: "lamlang", label: "Lãm Làng", notes: [440, 493.88, 523.25, 587.33, 523.25, 493.88, 440, 392] },
    { id: "mine", label: "Nhạc của tôi", notes: [392, 440, 523.25, 440, 392, 349.23, 329.63, 392] }
  ];

  NHAI.lessonModes.dance = {
    label: "Hanzi Dance",
    defaultBadge: "Chưa học",
    render: function (root, ctx) {
      var words = ctx.words;
      var music = MUSIC[0];
      var audioCtx = null;
      var loopTimer = null;
      var noteIdx = 0;
      var order = NHAI.shuffle(words.map(function (_, i) { return i; }));
      var pos = 0;
      var playing = false;
      var dead = false; // chế độ đã bị teardown -> bỏ qua callback trễ
      ctx.addCleanup(function () { dead = true; });

      root.innerHTML =
        '<div class="max-w-md mx-auto text-center">' +
          '<div data-intro>' +
            '<h2 class="text-3xl font-extrabold">🕺 Hanzi Dance</h2>' +
            '<div class="flex flex-wrap justify-center gap-2 mt-4">' +
              MUSIC.map(function (m, i) {
                return '<button type="button" data-music="' + m.id + '" class="pill text-sm ' + (i === 0 ? "pill-active" : "") + '">🎵 ' + m.label + "</button>";
              }).join("") +
            "</div>" +
            '<p class="text-sm text-[var(--nhai-muted)] mt-4">Gõ đúng cách đọc của từ → nhân vật của bạn nhảy; sai thì đứng im. Lượt này có ' + ctx.total + " từ trong bài.</p>" +
            '<p class="text-5xl mt-4"><span class="bob">🕺</span> <span class="bob">💃</span></p>' +
            '<button type="button" data-start class="btn-main px-8 py-3 mt-5 text-lg">Bắt đầu</button>' +
          "</div>" +
          '<div data-play hidden>' +
            '<p data-hanzi class="zh text-6xl font-extrabold"></p>' +
            '<p data-meaning class="text-sm text-[var(--nhai-muted)] mt-1"></p>' +
            '<div class="text-6xl mt-4" data-dancers><span data-d1>🕺</span> <span data-d2>💃</span></div>' +
            '<div class="flex gap-2 mt-5">' +
              '<input type="text" data-input class="flex-1 border-2 border-[var(--nhai-border)] rounded-lg px-3 py-2.5 bg-[var(--nhai-bg)] font-mono" placeholder="Gõ pinyin (ni3 → nǐ)">' +
              '<button type="button" data-skip class="btn-ghost px-3 py-2.5 text-sm">Bỏ qua</button>' +
            "</div>" +
            '<p data-fb class="text-sm font-bold mt-2 h-5"></p>' +
          "</div>" +
          '<div data-done hidden></div>' +
        "</div>";

      var q = function (sel) { return root.querySelector(sel); };

      function ensureAudio() {
        if (!audioCtx) {
          try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audioCtx = null; }
        }
      }

      function beep(freq, when, dur) {
        if (!audioCtx) return;
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = "triangle";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.08, when);
        gain.gain.exponentialRampToValueAtTime(0.001, when + dur);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(when);
        osc.stop(when + dur);
      }

      function startMusic() {
        ensureAudio();
        if (!audioCtx) return;
        stopMusic();
        noteIdx = 0;
        loopTimer = setInterval(function () {
          var t = audioCtx.currentTime;
          beep(music.notes[noteIdx % music.notes.length], t, 0.18);
          noteIdx++;
        }, 220);
      }

      function stopMusic() {
        if (loopTimer) { clearInterval(loopTimer); loopTimer = null; }
      }

      function paintWord() {
        if (!root.querySelector("[data-hanzi]")) return;
        var w = words[order[pos]];
        q("[data-hanzi]").textContent = w.hanzi;
        q("[data-meaning]").textContent = w.meaning + " — " + w.pos;
        q("[data-input]").value = "";
        q("[data-fb]").textContent = "";
        ctx.setCounter((pos + 1) + " / " + ctx.total);
        q("[data-input]").focus();
      }

      function finish() {
        playing = false;
        stopMusic();
        q("[data-play]").hidden = true;
        var done = q("[data-done]");
        done.hidden = false;
        done.innerHTML =
          '<p class="text-5xl mb-3">🕺💃🎉</p>' +
          '<p class="text-xl font-extrabold">Xuất sắc!</p>' +
          '<p class="text-sm text-[var(--nhai-muted)] mt-1">Bạn đã nhảy qua hết ' + ctx.total + " từ của bài.</p>" +
          '<button type="button" data-again class="btn-main px-6 py-2.5 mt-4">Nhảy tiếp</button>';
        done.querySelector("[data-again]").addEventListener("click", function () {
          NHAI.lessonModes.dance.render(root, ctx);
        });
        ctx.setBadge("dance", "Đã học");
      }

      function start() {
        playing = true;
        q("[data-intro]").hidden = true;
        q("[data-done]").hidden = true;
        q("[data-play]").hidden = false;
        startMusic();
        paintWord();
      }

      root.querySelectorAll("[data-music]").forEach(function (b) {
        b.addEventListener("click", function () {
          root.querySelectorAll("[data-music]").forEach(function (x) { x.classList.toggle("pill-active", x === b); });
          music = MUSIC.filter(function (m) { return m.id === b.getAttribute("data-music"); })[0] || MUSIC[0];
          if (playing) startMusic();
          else { ensureAudio(); if (audioCtx) beep(music.notes[0], audioCtx.currentTime, 0.15); }
        });
      });
      q("[data-start]").addEventListener("click", start);
      q("[data-skip]").addEventListener("click", function () {
        pos++;
        if (pos >= order.length) finish();
        else paintWord();
      });
      q("[data-input]").addEventListener("keydown", function (e) {
        if (e.key !== "Enter" || !playing) return;
        e.preventDefault();
        var w = words[order[pos]];
        var norm = function (s) { return NHAI.stripTones(s).replace(/\s+/g, ""); };
        if (norm(NHAI.toPinyin(this.value)) === norm(w.pinyin)) {
          q("[data-fb]").textContent = "✅ Đúng! Nhảy lên nào!";
          q("[data-fb]").classList.add("text-green-700");
          [q("[data-d1]"), q("[data-d2]")].forEach(function (d) {
            d.classList.remove("jump");
            void d.offsetWidth; // reset animation
            d.classList.add("jump");
          });
          ensureAudio();
          if (audioCtx) beep(659.25, audioCtx.currentTime, 0.12);
          setTimeout(function () {
            if (dead) return;
            pos++;
            if (pos >= order.length) finish();
            else paintWord();
          }, 650);
        } else {
          q("[data-fb]").textContent = "Đứng im — gõ lại đi!";
          q("[data-fb]").classList.add("text-red-600");
          var inp = q("[data-input]");
          inp.classList.add("shake");
          setTimeout(function () { inp.classList.remove("shake"); }, 400);
        }
      });

      ctx.addCleanup(stopMusic);
    }
  };
})();
