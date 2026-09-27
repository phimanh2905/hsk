/* Nhai HSK clone — Bài tập Pinyin (PLAN-04): 10 câu luân phiên
   (a) nghe TTS → chọn âm viết đúng;  (b) xem âm → chọn thanh điệu. */
(function () {
  "use strict";

  function init() {
    var P = (window.NHAI_DATA && NHAI_DATA.pinyin) || {};
    if (!P.valid) return;

    /* pool: mọi âm tiết hợp lệ */
    var pool = [];
    Object.keys(P.valid).forEach(function (ini) {
      Object.keys(P.valid[ini]).forEach(function (fin) {
        var s = P.valid[ini][fin];
        if (s) pool.push(s);
      });
    });
    if (!pool.length) return;

    var TOTAL = 10;
    var used = {};          // chống lặp câu trong 1 lượt: key = syl+tone
    var questions = [];
    var qi = 0, score = 0, locked = false;

    var quizArea = document.getElementById("quiz-area");
    var counter = document.querySelector("[data-counter]");
    var scoreEl = document.querySelector("[data-score]");

    function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

    function marked(syl, tone) {
      return NHAI.toPinyin ? NHAI.toPinyin(syl + tone) : syl;
    }

    function makeQuestion(type) {
      var syl, tone, key;
      var guard = 0;
      do {
        syl = pick(pool);
        tone = 1 + Math.floor(Math.random() * 4);
        key = syl + tone;
        guard++;
      } while (used[key] && guard < 500);
      used[key] = true;
      return { type: type, syl: syl, tone: tone };
    }

    function buildRound() {
      used = {};
      questions = [];
      for (var i = 0; i < TOTAL; i++) {
        questions.push(makeQuestion(i % 2 === 0 ? "listen" : "tone"));
      }
      qi = 0; score = 0; locked = false;
      scoreEl.textContent = "Đúng 0";
      render();
    }

    function render() {
      var q = questions[qi];
      counter.textContent = "Câu " + (qi + 1) + "/" + TOTAL;

      if (q.type === "listen") {
        quizArea.innerHTML =
          '<p class="text-sm font-bold text-[var(--nhai-muted)] mb-2">Nghe và chọn âm viết đúng:</p>' +
          '<div class="flex justify-center mb-4">' +
            '<button type="button" data-replay class="btn-main w-16 h-16 text-2xl" title="Nghe lại">🔊</button>' +
          "</div>" +
          '<div class="grid grid-cols-2 gap-2" data-options></div>';
        var opts = [1, 2, 3, 4].map(function (t) { return t; });
        // xáo trộn thứ tự 4 thanh
        opts.sort(function () { return Math.random() - 0.5; });
        var host = quizArea.querySelector("[data-options]");
        opts.forEach(function (t) {
          var b = NHAI.el('<button type="button" data-opt="' + t + '" class="btn-ghost py-3 text-xl font-bold zh">' + marked(q.syl, t) + "</button>");
          b.addEventListener("click", function () { answer(b, t === q.tone); });
          host.appendChild(b);
        });
        setTimeout(function () { NHAI.speak(marked(q.syl, q.tone), "zh-CN"); }, 250);
        quizArea.querySelector("[data-replay]").addEventListener("click", function () {
          NHAI.speak(marked(q.syl, q.tone), "zh-CN");
        });
      } else {
        quizArea.innerHTML =
          '<p class="text-sm font-bold text-[var(--nhai-muted)] mb-2">Âm sau mang thanh điệu nào?</p>' +
          '<h2 class="text-6xl font-extrabold text-center my-5 zh">' + marked(q.syl, q.tone) + "</h2>" +
          '<div class="grid grid-cols-4 gap-2" data-options></div>';
        var host2 = quizArea.querySelector("[data-options]");
        var marks = ["ˉ", "ˊ", "ˇ", "ˋ"];
        [1, 2, 3, 4].forEach(function (t) {
          var b = NHAI.el('<button type="button" data-opt="' + t + '" class="btn-ghost py-3 text-2xl font-bold" title="Thanh ' + t + '">' + marks[t - 1] + "</button>");
          b.addEventListener("click", function () { answer(b, t === q.tone); });
          host2.appendChild(b);
        });
      }
      locked = false;
    }

    function answer(btn, ok) {
      if (locked) return;
      locked = true;
      var opts = quizArea.querySelectorAll("[data-opt]");
      opts.forEach(function (b) {
        if (Number(b.getAttribute("data-opt")) === questions[qi].tone) {
          b.classList.remove("btn-ghost");
          b.classList.add("pill-active");
        } else if (b === btn) {
          b.style.borderColor = "#dc2626";
          b.style.color = "#dc2626";
        }
        b.disabled = true;
      });
      if (ok) { score++; scoreEl.textContent = "Đúng " + score; }
      else NHAI.toast("Sai rồi — đáp án đang được tô xanh");
      setTimeout(function () {
        qi++;
        if (qi >= TOTAL) finish();
        else render();
      }, 950);
    }

    function finish() {
      counter.textContent = "Hoàn thành";
      quizArea.innerHTML =
        '<div class="text-center py-4">' +
          '<h2 class="text-4xl font-extrabold mb-2">Đúng ' + score + "/" + TOTAL + "</h2>" +
          '<p class="text-sm font-semibold text-[var(--nhai-muted)] mb-5">' +
            (score === TOTAL ? "Tuyệt đối! Bạn đã nắm chắc bảng pinyin 🎉" :
             score >= 7 ? "Khá tốt! Thử lại để đạt điểm tối đa nhé." :
             "Đừng lo — vào Bảng Pinyin xem chi tiết rồi quay lại luyện tiếp.") +
          "</p>" +
          '<button type="button" data-retry class="btn-main px-6 py-2.5">🔄 Làm lại</button>' +
          '<a href="pinyin.html" class="block mt-4 text-sm font-semibold text-[var(--nhai-accent)] hover:underline">→ Xem lại Bảng Pinyin</a>' +
        "</div>";
      quizArea.querySelector("[data-retry]").addEventListener("click", buildRound);
    }

    buildRound();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
