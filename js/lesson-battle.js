/* Nhai HSK clone — chế độ Đấu trí / PvP (PLAN-02): 13 câu trộn 5 dạng + timer + Top 10 + best localStorage. */
(function () {
  "use strict";
  window.NHAI.lessonModes = window.NHAI.lessonModes || {};

  var TOP10 = [
    { rank: "🥇", name: "Thùy Trâm", score: "13/13", time: "0:25.9" },
    { rank: "🥈", name: "Vân Anh Ngô", score: "13/13", time: "0:26.1" },
    { rank: "🥉", name: "vân anh ngô", score: "13/13", time: "0:27.3" },
    { rank: "#4", name: "Nha", score: "13/13", time: "0:27.6" },
    { rank: "#5", name: "Linh Trần", score: "13/13", time: "0:28.1" },
    { rank: "#6", name: "Diễm Kiều", score: "13/13", time: "0:29.3" },
    { rank: "#7", name: "Ngọc Phạm", score: "13/13", time: "0:30.4" },
    { rank: "#8", name: "Hoa Nguyen", score: "13/13", time: "0:31.6" },
    { rank: "#9", name: "Thang Nguyen", score: "13/13", time: "0:34.3" },
    { rank: "#10", name: "Ngọc Lê", score: "13/13", time: "0:34.4" }
  ];

  function bestKey(ctx) { return "nhai.battle.best." + ctx.book + "." + ctx.page; }
  function getBest(ctx) {
    try { return JSON.parse(localStorage.getItem(bestKey(ctx)) || "null"); } catch (e) { return null; }
  }
  function fmtTime(sec) {
    var m = Math.floor(sec / 60);
    var s = (sec - m * 60).toFixed(1);
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  NHAI.lessonModes.battle = {
    label: "Đấu trí",
    defaultBadge: "Xếp hạng",
    render: function (root, ctx) { renderIntro(root, ctx); }
  };

  /* ---------- màn intro ---------- */
  function renderIntro(root, ctx) {
    var best = getBest(ctx);
    root.innerHTML =
      '<div class="max-w-xl mx-auto">' +
        '<h2 class="text-2xl font-extrabold">⚔️ Đấu trí</h2>' +
        '<p class="text-sm text-[var(--nhai-muted)] mt-2">Trả lời 13 câu — trộn ngẫu nhiên 5 dạng: chữ Hán → nghĩa, nghĩa → chữ Hán, chữ Hán → pinyin, điền từ vào câu và gõ pinyin. Ai đúng nhiều và nhanh nhất sẽ đứng đầu bảng xếp hạng của bài này. Thi lại bao nhiêu lần cũng được — bảng chỉ tính lượt tốt nhất của bạn.</p>' +
        '<div class="flex flex-wrap items-center gap-2 mt-3">' +
          '<span class="text-sm font-semibold text-[var(--nhai-muted)]">' + (NHAI.isLoggedIn() ? "Bạn đã đăng nhập — kết quả sẽ được lưu lên bảng xếp hạng." : "Đăng nhập để lưu kết quả lên bảng xếp hạng.") + "</span>" +
          (NHAI.isLoggedIn() ? "" : '<button type="button" data-login class="btn-main px-3 py-1.5 text-sm">Đăng nhập</button>') +
        "</div>" +
        (best ? '<p class="text-sm font-bold mt-3">🏆 Kỷ lục của bạn: <span class="text-[var(--nhai-main)]">' + best.correct + "/" + ctx.total + "</span> — " + fmtTime(best.time) + "</p>" : "") +
        '<button type="button" data-start class="btn-main px-6 py-3 mt-4 text-base">Bắt đầu thi</button>' +
        '<div class="card p-4 mt-6">' +
          '<h3 class="font-extrabold mb-2">🏆 Top 10 bài này</h3>' +
          '<ol class="text-sm">' +
            TOP10.map(function (r) {
              return '<li class="flex items-center gap-2 py-1 border-b border-[var(--nhai-border)] last:border-0">' +
                '<span class="w-8 font-bold">' + r.rank + "</span>" +
                '<span class="flex-1 font-semibold">' + r.name + "</span>" +
                '<span class="text-[var(--nhai-muted)]">' + r.score + "</span>" +
                '<span class="text-[var(--nhai-muted)] w-16 text-right">' + r.time + "</span></li>";
            }).join("") +
          "</ol>" +
          '<a href="leaderboard.html?tab=battle" class="inline-block text-sm font-bold text-[var(--nhai-accent)] mt-3">Xem BXH Đấu trí tháng này →</a>' +
        "</div>" +
      "</div>";

    root.querySelector("[data-start]").addEventListener("click", function () { startBattle(root, ctx); });
    var loginBtn = root.querySelector("[data-login]");
    if (loginBtn) loginBtn.addEventListener("click", function () { NHAI.openLogin(); });
  }

  /* ---------- sinh 13 câu trộn 5 dạng ---------- */
  function buildQuestions(ctx) {
    var words = ctx.words;
    var types = ["zh2vi", "vi2zh", "zh2py", "fill", "typepy"];
    var questions = [];
    var i = 0;
    while (questions.length < 13) {
      var w = words[i % words.length];
      // đổi dạng câu theo từng vòng để không lặp cặp (từ, dạng)
      var lap = Math.floor(i / words.length);
      var type = types[(i + lap) % types.length];
      questions.push({ w: w, type: type });
      i++;
      if (i > 200) break;
    }
    return NHAI.shuffle(questions);
  }

  function distractors(words, field, correct, n) {
    return NHAI.shuffle(words.map(function (w) { return w[field]; })
      .filter(function (v, i, a) { return v !== correct && a.indexOf(v) === i; })).slice(0, n);
  }

  function blanked(w) {
    var zh = w.example.zh;
    var idx = zh.indexOf(w.hanzi);
    return zh.slice(0, idx) + "__" + zh.slice(idx + w.hanzi.length);
  }

  /* ---------- màn thi ---------- */
  function startBattle(root, ctx) {
    var questions = buildQuestions(ctx);
    var pos = 0;
    var correct = 0;
    var startTime = Date.now();
    var timerId = null;
    var locked = false;
    var dead = false; // chế độ đã bị teardown -> bỏ qua callback trễ
    ctx.addCleanup(function () { dead = true; });

    root.innerHTML =
      '<div class="max-w-xl mx-auto">' +
        '<div class="flex items-center justify-between mb-3">' +
          '<span class="text-sm font-extrabold text-[var(--nhai-muted)]" data-qnum>Câu 1 / 13</span>' +
          '<span class="text-lg font-extrabold" data-timer>⏱ 0:00.0</span>' +
        "</div>" +
        '<div class="card p-6 text-center bg-[var(--nhai-bg)]" data-card></div>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4" data-answers></div>' +
        '<div data-extra class="mt-3"></div>' +
      "</div>";

    var q = function (sel) { return root.querySelector(sel); };
    timerId = setInterval(function () {
      q("[data-timer]").textContent = "⏱ " + fmtTime((Date.now() - startTime) / 1000);
    }, 100);

    function finishBattle() {
      clearInterval(timerId);
      var timeSec = (Date.now() - startTime) / 1000;
      var best = getBest(ctx);
      var isRecord = !best || correct > best.correct || (correct === best.correct && timeSec < best.time);
      if (isRecord) {
        localStorage.setItem(bestKey(ctx), JSON.stringify({ correct: correct, time: timeSec }));
        NHAI.toast("Kỷ lục mới của bài này! 🏆");
      }
      root.innerHTML =
        '<div class="max-w-md mx-auto text-center card shadow-neo p-8">' +
          '<p class="text-5xl">' + (correct >= 10 ? "🏆" : correct >= 7 ? "🎉" : "💪") + "</p>" +
          '<h2 class="text-2xl font-extrabold mt-2">Kết quả Đấu trí</h2>' +
          '<p class="text-lg mt-3">Đúng <span class="font-extrabold text-[var(--nhai-main)] text-2xl">' + correct + " / 13</span> câu</p>" +
          '<p class="text-lg mt-1">Thời gian: <span class="font-extrabold">' + fmtTime(timeSec) + "</span></p>" +
          '<p class="text-sm font-bold text-[var(--nhai-muted)] mt-3">Kỷ lục của bạn: ' + correct + "/13 — " + fmtTime(timeSec) + (isRecord ? " (mới!)" : "") + "</p>" +
          '<div class="flex justify-center gap-2 mt-5">' +
            '<button type="button" data-again class="btn-main px-5 py-2.5">Thi lại</button>' +
            '<button type="button" data-back class="btn-ghost px-4 py-2.5">Về màn chính</button>' +
          "</div>" +
        "</div>";
      root.querySelector("[data-again]").addEventListener("click", function () { startBattle(root, ctx); });
      root.querySelector("[data-back]").addEventListener("click", function () { renderIntro(root, ctx); });
    }

    function norm(s) { return NHAI.stripTones(s).replace(/\s+/g, ""); }

    function paintQuestion() {
      if (!root.querySelector("[data-card]")) return;
      locked = false;
      var item = questions[pos];
      var w = item.w;
      var card = q("[data-card]");
      var box = q("[data-answers]");
      var extra = q("[data-extra]");
      card.innerHTML = "";
      box.innerHTML = "";
      extra.innerHTML = "";
      q("[data-qnum]").textContent = "Câu " + (pos + 1) + " / 13";

      function optionButtons(values, correctVal, render) {
        NHAI.shuffle(values).forEach(function (v) {
          var b = NHAI.el('<button type="button" class="btn-ghost py-3 px-2 font-bold" data-val="' + v.replace(/"/g, "&quot;") + '">' + render(v) + "</button>");
          b.addEventListener("click", function () {
            if (locked) return;
            locked = true;
            var ok = v === correctVal;
            root.querySelectorAll("[data-answers] button").forEach(function (x) {
              x.disabled = true;
              if (x.getAttribute("data-val") === correctVal) {
                x.classList.remove("btn-ghost");
                x.classList.add("border-2", "border-green-600", "bg-green-50", "text-green-700");
              }
            });
            if (ok) correct++;
            else {
              b.classList.remove("btn-ghost");
              b.classList.add("border-2", "border-red-600", "bg-red-50", "text-red-600", "shake");
            }
            setTimeout(function () {
              if (dead) return;
              pos++;
              if (pos >= questions.length) finishBattle();
              else paintQuestion();
            }, 500);
          });
          box.appendChild(b);
        });
      }

      if (item.type === "zh2vi") {
        card.innerHTML = '<p class="text-xs font-bold text-[var(--nhai-muted)] uppercase mb-2">Chữ Hán → nghĩa</p><p class="zh text-5xl font-extrabold">' + w.hanzi + "</p>";
        optionButtons([w.meaning].concat(distractors(ctx.words, "meaning", w.meaning, 3)), w.meaning, function (v) { return v; });
      } else if (item.type === "vi2zh") {
        card.innerHTML = '<p class="text-xs font-bold text-[var(--nhai-muted)] uppercase mb-2">Nghĩa → chữ Hán</p><p class="text-2xl font-extrabold mt-2">' + w.meaning + "</p>";
        optionButtons([w.hanzi].concat(distractors(ctx.words, "hanzi", w.hanzi, 3)), w.hanzi, function (v) { return '<span class="zh text-2xl">' + v + "</span>"; });
      } else if (item.type === "zh2py") {
        card.innerHTML = '<p class="text-xs font-bold text-[var(--nhai-muted)] uppercase mb-2">Chữ Hán → pinyin</p><p class="zh text-5xl font-extrabold">' + w.hanzi + "</p>";
        optionButtons([w.pinyin].concat(distractors(ctx.words, "pinyin", w.pinyin, 3)), w.pinyin, function (v) { return v; });
      } else if (item.type === "fill") {
        card.innerHTML = '<p class="text-xs font-bold text-[var(--nhai-muted)] uppercase mb-2">Điền từ vào câu</p>' +
          '<p class="zh text-2xl font-extrabold leading-relaxed">' + blanked(w) + "</p>" +
          '<p class="text-sm text-[var(--nhai-muted)] mt-2 italic">→ ' + w.example.vi + "</p>";
        optionButtons([w.hanzi].concat(distractors(ctx.words, "hanzi", w.hanzi, 3)), w.hanzi, function (v) { return '<span class="zh text-2xl">' + v + "</span>"; });
      } else {
        card.innerHTML = '<p class="text-xs font-bold text-[var(--nhai-muted)] uppercase mb-2">Gõ pinyin</p>' +
          '<p class="zh text-5xl font-extrabold">' + w.hanzi + "</p>" +
          '<p class="text-base font-semibold mt-2">' + w.meaning + "</p>";
        var wrap = NHAI.el(
          '<div class="flex gap-2">' +
            '<input type="text" data-binput class="flex-1 border-2 border-[var(--nhai-border)] rounded-lg px-3 py-2.5 bg-[var(--nhai-bg)] font-mono" placeholder="ni3 → nǐ">' +
            '<button type="button" data-bcheck class="btn-main px-4 py-2.5">Kiểm tra</button>' +
          "</div>"
        );
        extra.appendChild(wrap);
        var input = wrap.querySelector("[data-binput]");
        var submit = function () {
          if (locked) return;
          locked = true;
          var ok = norm(NHAI.toPinyin(input.value)) === norm(w.pinyin);
          if (ok) correct++;
          else {
            input.classList.add("border-red-600", "shake");
            var note = NHAI.el('<p class="text-sm font-bold mt-2">Đáp án: ' + w.pinyin + "</p>");
            extra.appendChild(note);
          }
          setTimeout(function () {
            if (dead) return;
            pos++;
            if (pos >= questions.length) finishBattle();
            else paintQuestion();
          }, ok ? 400 : 900);
        };
        wrap.querySelector("[data-bcheck]").addEventListener("click", submit);
        input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); submit(); } });
        setTimeout(function () { input.focus(); }, 0);
      }
      ctx.setCounter((pos + 1) + " / 13");
    }

    ctx.addCleanup(function () { clearInterval(timerId); });
    paintQuestion();
  }
})();
