/* Nhai HSK clone — PLAN-21: trang buổi học lộ trình pinyin (roadmap-session.html?s=N).
   4 tab: Học / Flashcard / Trắc nghiệm / Bài kiểm tra + mở khoá tuần tự. */
(function () {
  "use strict";

  var SESSIONS = (window.NHAI_DATA && NHAI_DATA.roadmap && NHAI_DATA.roadmap.pinyin && NHAI_DATA.roadmap.pinyin.sessions) || [];
  var STORE_KEY = "nhai.roadmap.pinyin";
  var TABS = ["learn", "flashcard", "quiz", "test"];

  var session = null;
  var state = null;
  var activeTab = "learn";
  var fcIndex = 0;        /* flashcard index */
  var fcKnown = 0;
  var quizAnswers = [];   /* câu đã trả lời {pick, correct} */
  var testGraded = false;
  var testScore = 0;

  /* ---------- state ---------- */
  function loadState() {
    try {
      var s = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
      if (s && Array.isArray(s.done)) {
        return { done: s.done, quizDone: Array.isArray(s.quizDone) ? s.quizDone : [], learn: Array.isArray(s.learn) ? s.learn : [] };
      }
    } catch (e) { /* reset */ }
    return { done: [], quizDone: [], learn: [] };
  }
  function saveState() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  function isUnlocked(n, done) {
    return n === 1 || done.indexOf(n - 1) !== -1;
  }

  /* ---------- helpers ---------- */
  function speakBtn(text) {
    var b = NHAI.el('<button type="button" class="btn-ghost w-9 h-9 text-sm shrink-0" title="Nghe phát âm">🔊</button>');
    b.addEventListener("click", function () { NHAI.speak(text, "zh-CN", 0.8); });
    return b;
  }

  function normPinyin(s) {
    return NHAI.stripTones(String(s)).replace(/\s+/g, "");
  }

  /* ---------- tabs ---------- */
  function renderTabs() {
    var host = document.getElementById("session-tabs");
    if (!host) return;
    host.innerHTML = "";
    var n = session.n;
    var learnDone = state.learn.indexOf(n) !== -1;
    var testUnlocked = isUnlocked(n, state.done);
    var labels = [
      { key: "learn", text: "Học" + (learnDone ? " ✓" : ""), locked: false },
      { key: "flashcard", text: "Flashcard", locked: false },
      { key: "quiz", text: "Trắc nghiệm", locked: false },
      { key: "test", text: "Bài kiểm tra" + (testUnlocked ? "" : " 🔒"), locked: !testUnlocked }
    ];
    labels.forEach(function (t) {
      var cls = t.key === activeTab ? "pill pill-active" : "pill";
      if (t.locked) cls += " opacity-60 cursor-not-allowed";
      var b = NHAI.el('<button type="button" data-tab="' + t.key + '" class="' + cls + ' px-4 py-2 text-sm font-bold">' + t.text + "</button>");
      b.addEventListener("click", function () {
        if (t.locked) {
          NHAI.toast("Bài kiểm tra chỉ mở khi bạn đã hoàn thành buổi trước 🔒");
          return;
        }
        activeTab = t.key;
        if (activeTab === "flashcard") { fcIndex = 0; fcKnown = 0; }
        if (activeTab === "quiz") quizAnswers = [];
        if (activeTab === "test") { testGraded = false; testScore = 0; }
        renderTabs();
        renderProgress();
        renderTabContent();
      });
      host.appendChild(b);
    });
  }

  function renderProgress() {
    var bar = document.getElementById("session-progress");
    if (!bar) return;
    var idx = TABS.indexOf(activeTab);
    bar.style.width = ((idx + 1) / TABS.length) * 100 + "%";
  }

  /* ---------- tab Học ---------- */
  function renderLearn() {
    var host = document.createDocumentFragment();

    if (session.n === 1) {
      var grid = NHAI.el('<div class="grid grid-cols-2 gap-3 mb-4"></div>');
      session.learn.forEach(function (t) {
        var cell = NHAI.el(
          '<div class="card shadow-neo p-4 flex flex-col items-center text-center gap-1">' +
            '<span class="text-4xl font-extrabold">' + t.tone + "</span>" +
            '<span class="text-xs font-bold text-[var(--nhai-main)] uppercase tracking-wide">' + t.name + "</span>" +
            '<span class="text-sm text-[var(--nhai-muted)]">' + t.detail + "</span>" +
            '<div class="flex items-center gap-2 mt-1">' +
              '<span class="zh text-2xl font-bold">' + t.ex.hanzi + "</span>" +
              '<span class="text-sm font-semibold">' + t.ex.pinyin + "</span>" +
              '<span class="text-xs text-[var(--nhai-muted)]">' + t.ex.meaning + "</span>" +
            "</div>" +
          "</div>"
        );
        cell.appendChild(speakBtn(t.ex.pinyin.replace(/\s/g, "")));
        grid.appendChild(cell);
      });
      host.appendChild(grid);
    } else {
      var cards = NHAI.el('<div class="space-y-3 mb-4"></div>');
      session.learn.forEach(function (t) {
        cards.appendChild(NHAI.el(
          '<div class="card shadow-neo p-4"><h4 class="font-extrabold mb-1">' + t.title + "</h4>" +
          '<p class="text-sm text-[var(--nhai-muted)]">' + t.detail + "</p></div>"
        ));
      });
      host.appendChild(cards);
    }

    /* Bảng tự nhận biết (2 cột) */
    var tbl = NHAI.el(
      '<div class="card shadow-neo p-4 mb-4"><h4 class="font-extrabold mb-2">Tự nhận biết</h4>' +
        '<table class="w-full text-sm"><thead><tr class="text-left text-xs text-[var(--nhai-muted)] uppercase">' +
        '<th class="py-1 pr-2">Chữ</th><th class="py-1">Pinyin · nghĩa</th></tr></thead><tbody></tbody></table></div>'
    );
    var tbody = tbl.querySelector("tbody");
    session.cards.forEach(function (c) {
      tbody.appendChild(NHAI.el(
        '<tr class="border-t border-[var(--nhai-border)]">' +
          '<td class="py-2 pr-2"><span class="zh text-xl font-bold">' + c.hanzi + "</span></td>" +
          '<td class="py-2"><span class="font-semibold">' + c.pinyin + "</span> <span class=\"text-xs text-[var(--nhai-muted)]\">(" + c.hv + ")</span> — " + c.meaning + "</td>" +
        "</tr>"
      ));
    });
    host.appendChild(tbl);

    var btnWrap = NHAI.el('<div class="flex justify-end"></div>');
    var btn = NHAI.el('<button type="button" class="btn-main px-5 py-2.5 text-sm font-bold">Đã đọc xong, sang Flashcard →</button>');
    btn.addEventListener("click", function () {
      if (state.learn.indexOf(session.n) === -1) { state.learn.push(session.n); saveState(); }
      activeTab = "flashcard";
      fcIndex = 0; fcKnown = 0;
      renderTabs(); renderProgress(); renderTabContent();
    });
    btnWrap.appendChild(btn);
    host.appendChild(btnWrap);

    return host;
  }

  /* ---------- tab Flashcard ---------- */
  function renderFlashcard() {
    var host = document.createDocumentFragment();
    var cards = session.cards;
    var total = cards.length;

    if (fcIndex >= total) {
      host.appendChild(NHAI.el(
        '<div class="card shadow-neo p-8 text-center">' +
          '<p class="text-lg font-extrabold mb-2">Đã ôn ' + fcKnown + "/" + total + " thẻ ✓</p>" +
          '<p class="text-sm text-[var(--nhai-muted)] mb-4">Lật từng thẻ để tự kiểm tra — bấm "Đã thuộc" khi nhớ, "Chưa thuộc" để ôn lại sau.</p>' +
        "</div>"
      ));
      var again = NHAI.el('<div class="flex justify-center"><button type="button" class="btn-ghost px-5 py-2 text-sm font-bold">Ôn lại từ đầu</button></div>');
      again.querySelector("button").addEventListener("click", function () { fcIndex = 0; fcKnown = 0; renderTabContent(); });
      host.appendChild(again);
      return host;
    }

    var c = cards[fcIndex];
    var counter = NHAI.el('<p class="text-center text-xs font-bold text-[var(--nhai-muted)] mb-2">' + (fcIndex + 1) + "/" + total + " thẻ</p>");
    host.appendChild(counter);

    var flip = NHAI.el(
      '<button type="button" class="card shadow-neo w-full p-8 text-center min-h-[10rem] flex flex-col items-center justify-center gap-2 hover:shadow-lg transition-shadow" title="Bấm để lật thẻ">' +
        '<span class="zh text-5xl font-extrabold">' + c.hanzi + "</span>" +
        '<span class="text-xs text-[var(--nhai-muted)]">Bấm để xem pinyin &amp; nghĩa</span>' +
      "</button>"
    );
    var flipped = false;
    flip.addEventListener("click", function () {
      flipped = !flipped;
      if (flipped) {
        flip.innerHTML = '<span class="text-2xl font-extrabold text-[var(--nhai-main)]">' + c.pinyin + "</span>" +
          '<span class="text-xs text-[var(--nhai-muted)]">(' + c.hv + ')</span>' +
          '<span class="text-lg font-bold">' + c.meaning + "</span>";
      } else {
        flip.innerHTML = '<span class="zh text-5xl font-extrabold">' + c.hanzi + "</span>" +
          '<span class="text-xs text-[var(--nhai-muted)]">Bấm để xem pinyin &amp; nghĩa</span>';
      }
    });
    host.appendChild(flip);

    var btns = NHAI.el('<div class="flex justify-center gap-3 mt-4"></div>');
    var no = NHAI.el('<button type="button" class="btn-ghost px-5 py-2 text-sm font-bold">Chưa thuộc</button>');
    var yes = NHAI.el('<button type="button" class="btn-main px-5 py-2 text-sm font-bold">Đã thuộc</button>');
    no.addEventListener("click", function () { fcIndex++; renderTabContent(); });
    yes.addEventListener("click", function () { fcKnown++; fcIndex++; renderTabContent(); });
    btns.appendChild(no);
    btns.appendChild(yes);
    host.appendChild(btns);
    return host;
  }

  /* ---------- tab Trắc nghiệm ---------- */
  function renderQuiz() {
    var host = document.createDocumentFragment();
    var qs = session.quiz;
    var answered = quizAnswers.filter(Boolean).length;
    var correct = quizAnswers.filter(function (a) { return a && a.correct; }).length;

    qs.forEach(function (q, qi) {
      var box = NHAI.el('<div class="card shadow-neo p-4 mb-4"></div>');
      box.appendChild(NHAI.el('<p class="font-bold mb-3">' + (qi + 1) + ". " + q.q + "</p>"));
      var opts = NHAI.el('<div class="grid sm:grid-cols-2 gap-2"></div>');
      q.options.forEach(function (opt, oi) {
        var a = quizAnswers[qi];
        var cls = "border-2 rounded-lg px-3 py-2 text-sm text-left";
        if (a) {
          if (oi === q.answer) cls += " border-green-600 bg-green-50 font-bold";
          else if (oi === a.pick) cls += " border-[var(--nhai-main)] bg-red-50";
          else cls += " border-[var(--nhai-border)] opacity-60";
        } else {
          cls += " border-[var(--nhai-border)] hover:border-[var(--nhai-main)] cursor-pointer";
        }
        var b = NHAI.el('<button type="button" class="' + cls + '" ' + (a ? "disabled" : "") + ">" + opt + "</button>");
        if (!a) {
          b.addEventListener("click", function () {
            quizAnswers[qi] = { pick: oi, correct: oi === q.answer };
            renderTabContent();
          });
        }
        opts.appendChild(b);
      });
      box.appendChild(opts);
      var a = quizAnswers[qi];
      if (a) box.appendChild(NHAI.el('<p class="text-xs mt-2 ' + (a.correct ? "text-green-700" : "text-[var(--nhai-main)]") + ' font-semibold">' + (a.correct ? "Đúng! " : "Chưa đúng. ") + q.explain + "</p>"));
      host.appendChild(box);
    });

    if (answered === qs.length) {
      host.appendChild(NHAI.el(
        '<div class="card shadow-neo p-4 flex items-center justify-between gap-3">' +
          '<p class="font-extrabold">Đúng ' + correct + "/" + qs.length + "</p>" +
          '<button type="button" data-again class="btn-ghost px-4 py-2 text-sm font-bold">Làm lại</button>' +
        "</div>"
      ));
      host.querySelector("[data-again]").addEventListener("click", function () { quizAnswers = []; renderTabContent(); });
    }
    return host;
  }

  /* ---------- tab Bài kiểm tra ---------- */
  function renderTest() {
    var host = document.createDocumentFragment();
    var mc = session.test[0];
    var essay = session.test[1];

    var mcBox = NHAI.el('<div class="card shadow-neo p-4 mb-4"></div>');
    mcBox.appendChild(NHAI.el('<p class="font-bold mb-3">1. ' + mc.q + "</p>"));
    var opts = NHAI.el('<div class="grid sm:grid-cols-2 gap-2"></div>');
    var mcPick = renderTest._pick !== undefined && renderTest._pick !== null ? renderTest._pick : null;
    mc.options.forEach(function (opt, oi) {
      var cls = "border-2 rounded-lg px-3 py-2 text-sm text-left";
      if (testGraded) {
        if (oi === mc.answer) cls += " border-green-600 bg-green-50 font-bold";
        else if (oi === mcPick) cls += " border-[var(--nhai-main)] bg-red-50";
        else cls += " border-[var(--nhai-border)] opacity-60";
      } else {
        cls += mcPick === oi ? " border-[var(--nhai-main)] bg-[var(--nhai-soft)]" : " border-[var(--nhai-border)] hover:border-[var(--nhai-main)] cursor-pointer";
      }
      var b = NHAI.el('<button type="button" class="' + cls + '">' + opt + "</button>");
      b.addEventListener("click", function () {
        if (testGraded) return;
        renderTest._pick = oi;
        renderTabContent();
      });
      opts.appendChild(b);
    });
    mcBox.appendChild(opts);
    if (testGraded) {
      mcBox.appendChild(NHAI.el('<p class="text-xs mt-2 font-semibold ' + (mcPick === mc.answer ? "text-green-700" : "text-[var(--nhai-main)]") + '">' + (mcPick === mc.answer ? "Đúng! " : "Chưa đúng. ") + mc.explain + "</p>"));
    }
    host.appendChild(mcBox);

    var essayBox = NHAI.el(
      '<div class="card shadow-neo p-4 mb-4">' +
        '<p class="font-bold mb-2">2. ' + essay.prompt + "</p>" +
        '<input type="text" data-essay class="w-full border-2 border-[var(--nhai-border)] rounded-lg px-3 py-2 text-sm bg-white text-[var(--nhai-ink)]" placeholder="Nhập pinyin (kèm dấu thanh)…" ' + (testGraded ? "disabled" : "") + ">" +
        '<p data-essay-fb class="text-xs mt-2 font-semibold hidden"></p>' +
      "</div>"
    );
    var essayInput = essayBox.querySelector("[data-essay]");
    essayInput.value = _essayVal;
    essayInput.addEventListener("input", function () { _essayVal = essayInput.value; });
    if (testGraded) {
      var essayOk = normPinyin(_essayVal) === normPinyin(essay.answer);
      var fb = essayBox.querySelector("[data-essay-fb]");
      fb.classList.remove("hidden");
      fb.className = "text-xs mt-2 font-semibold " + (essayOk ? "text-green-700" : "text-[var(--nhai-main)]");
      fb.textContent = (essayOk ? "Đúng! " : "Chưa đúng — đáp án: " + essay.answer + ". ");
    }
    host.appendChild(essayBox);

    if (!testGraded) {
      var submitWrap = NHAI.el('<div class="flex justify-end mb-4"></div>');
      var submit = NHAI.el('<button type="button" class="btn-main px-5 py-2.5 text-sm font-bold">Nộp bài</button>');
      submit.addEventListener("click", function () {
        if (renderTest._pick === null || renderTest._pick === undefined) {
          NHAI.toast("Hãy chọn đáp án câu trắc nghiệm trước khi nộp bài");
          return;
        }
        setEssayInputVal(essayInput.value);
        var score = (renderTest._pick === mc.answer ? 1 : 0) + (normPinyin(essayInput.value) === normPinyin(essay.answer) ? 1 : 0);
        testScore = score;
        testGraded = true;
        renderTabContent();
      });
      submitWrap.appendChild(submit);
      host.appendChild(submitWrap);
    } else {
      host.appendChild(NHAI.el('<p class="text-lg font-extrabold mb-2">Điểm: ' + testScore + "/2</p>"));
      if (testScore >= 1) {
        var doneWrap = NHAI.el('<div class="flex justify-end"></div>');
        var doneBtn = NHAI.el('<button type="button" class="btn-main px-5 py-2.5 text-sm font-bold">Hoàn thành buổi ' + session.n + " →</button>");
        doneBtn.addEventListener("click", function () {
          if (state.done.indexOf(session.n) === -1) state.done.push(session.n);
          saveState();
          NHAI.toast("Chúc mừng! Bạn đã hoàn thành Buổi " + session.n + " 🎉");
          setTimeout(function () { location.href = "roadmap-pinyin.html"; }, 700);
        });
        doneWrap.appendChild(doneBtn);
        host.appendChild(doneWrap);
      } else {
        var retryWrap = NHAI.el('<div class="flex justify-end"></div>');
        var retry = NHAI.el('<button type="button" class="btn-ghost px-4 py-2 text-sm font-bold">Làm lại</button>');
        retry.addEventListener("click", function () {
          testGraded = false; testScore = 0; renderTest._pick = null; setEssayInputVal("");
          renderTabContent();
        });
        retryWrap.appendChild(retry);
        host.appendChild(retryWrap);
      }
    }
    return host;
  }

  var _essayVal = "";
  function essayInputVal() { return _essayVal; }
  function setEssayInputVal(v) { _essayVal = String(v || ""); }

  /* ---------- dispatch ---------- */
  function renderTabContent() {
    var host = document.getElementById("tab-content");
    if (!host) return;
    host.innerHTML = "";
    var frag;
    if (activeTab === "learn") frag = renderLearn();
    else if (activeTab === "flashcard") frag = renderFlashcard();
    else if (activeTab === "quiz") frag = renderQuiz();
    else frag = renderTest();
    host.appendChild(frag);
  }

  function init() {
    if (!SESSIONS.length) return;
    var n = parseInt(NHAI.q("s", "1"), 10);
    if (isNaN(n) || n < 1 || n > SESSIONS.length) n = 1;
    session = SESSIONS[n - 1];
    state = loadState();

    if (!isUnlocked(session.n, state.done)) {
      NHAI.toast("Buổi " + session.n + " chưa mở khoá 🔒 — hãy hoàn thành Bài kiểm tra của Buổi " + (session.n - 1) + " trước!");
      setTimeout(function () { location.href = "roadmap-pinyin.html"; }, 1400);
      document.getElementById("session-title").textContent = "Buổi " + session.n + " — " + session.title;
      return;
    }

    document.getElementById("session-title").textContent = "Buổi " + session.n + " — " + session.title;
    document.getElementById("session-meta").textContent = "⏱ " + session.minutes + " phút · " + session.desc;
    document.title = "Buổi " + session.n + " — " + session.title + " | Nhai HSK";

    renderTabs();
    renderProgress();
    renderTabContent();
  }

  if (document.readyState === "complete") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
