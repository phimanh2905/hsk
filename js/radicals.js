/* Nhai HSK clone — 214 Bộ Thủ (PLAN-04): flashcard deck + grid theo số nét + phím tắt + TTS. */
(function () {
  "use strict";

  function init() {
    var data = (window.NHAI_DATA && NHAI_DATA.radicals) || [];
    if (!data.length) return;

    var autoTimer = null;
    var autoOn = false;
    var autoPlay = localStorage.getItem("nhai.radAutoplay") !== "0";
    var order = data.map(function (_, i) { return i; });
    var pos = 0;
    var flipped = false;

    var $ = function (sel) { return document.querySelector(sel); };
    var card = $("[data-card]");
    var inner = $("[data-inner]");

    function cur() { return data[order[pos]]; }

    function paint() {
      var r = cur();
      $("[data-front-chip]").textContent = "Bộ thủ #" + r.i + " · " + r.strokes + " nét";
      $("[data-front-main]").textContent = r.char;
      $("[data-back-hv]").textContent = r.hanViet;
      $("[data-back-char]").textContent = r.char + " · " + r.strokes + " nét";
      $("[data-back-mean]").textContent = r.meaning;
      $("[data-counter]").textContent = (pos + 1) + " / " + data.length;
      setFlip(false);
    }

    function setFlip(v) {
      flipped = v;
      if (inner) inner.classList.toggle("flipped", v);
    }

    function speakCur() {
      var r = cur();
      NHAI.speak(r.char, "zh-CN");
    }

    function go(delta, wrap) {
      pos += delta;
      if (pos >= data.length) pos = wrap ? 0 : data.length - 1;
      if (pos < 0) pos = wrap ? data.length - 1 : 0;
      paint();
      if (autoPlay) speakCur();
    }

    function mark(label) {
      NHAI.toast(label + " bộ thủ #" + cur().i + " " + cur().char);
      go(1, true);
    }

    /* ---- auto mode: phát âm + next 2s ---- */
    function stopAuto() {
      if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
      autoOn = false;
      var b = $("[data-auto]");
      if (b) { b.classList.remove("pill-active"); b.classList.add("btn-ghost"); }
    }
    function startAuto() {
      stopAuto();
      autoOn = true;
      var b = $("[data-auto]");
      if (b) { b.classList.remove("btn-ghost"); b.classList.add("pill-active"); }
      speakCur();
      autoTimer = setInterval(function () { go(1, true); speakCur(); }, 2000);
    }

    $("[data-auto]").addEventListener("click", function () {
      autoOn ? stopAuto() : startAuto();
    });

    $("[data-shuffle]").addEventListener("click", function () {
      stopAuto();
      order = NHAI.shuffle ? NHAI.shuffle(order) : order.slice().sort(function () { return Math.random() - 0.5; });
      pos = 0;
      paint();
      NHAI.toast("Đã xáo trộn 214 bộ thủ 🔀");
    });

    var apBtn = $("[data-autoplay]");
    function paintAutoplay() {
      apBtn.textContent = autoPlay ? "🔊 Tự phát: bật" : "🔇 Tự phát: tắt";
      apBtn.classList.toggle("pill-active", autoPlay);
      apBtn.classList.toggle("btn-ghost", !autoPlay);
    }
    apBtn.addEventListener("click", function () {
      autoPlay = !autoPlay;
      localStorage.setItem("nhai.radAutoplay", autoPlay ? "1" : "0");
      paintAutoplay();
      if (autoPlay) speakCur();
    });
    paintAutoplay();

    $("[data-speak]").addEventListener("click", speakCur);
    $("[data-prev]").addEventListener("click", function () { go(-1, false); });
    $("[data-next]").addEventListener("click", function () { go(1, false); });
    $("[data-unknown]").addEventListener("click", function () { mark("Chưa thuộc"); });
    $("[data-known]").addEventListener("click", function () { mark("Đã thuộc"); });
    card.addEventListener("click", function () { setFlip(!flipped); });

    /* ---- phím tắt ←/A ↓/X ↑/Z →/D ---- */
    document.addEventListener("keydown", function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      var tag = (e.target && e.target.tagName) || "";
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag)) return;
      if (document.querySelector("[data-overlay]")) return;
      switch (e.key) {
        case "ArrowLeft": case "a": case "A": go(-1, false); break;
        case "ArrowDown": case "x": case "X": mark("Chưa thuộc"); break;
        case "ArrowUp": case "z": case "Z": mark("Đã thuộc"); break;
        case "ArrowRight": case "d": case "D": go(1, false); break;
        case " ": e.preventDefault(); setFlip(!flipped); break;
      }
    });

    /* ---- grid theo số nét ---- */
    var groups = {};
    data.forEach(function (r) { (groups[r.strokes] = groups[r.strokes] || []).push(r); });
    var host = $("#radical-groups");
    Object.keys(groups).map(Number).sort(function (a, b) { return a - b; }).forEach(function (st) {
      var list = groups[st];
      var sec = NHAI.el(
        '<div>' +
          '<h3 class="font-extrabold mb-2">' + st + " nét (" + list.length + " bộ)</h3>" +
          '<div class="grid grid-cols-4 gap-2" data-grid></div>' +
        "</div>"
      );
      var grid = sec.querySelector("[data-grid]");
      list.forEach(function (r) {
        var btn = NHAI.el(
          '<button type="button" class="card p-2 text-center hover:-translate-y-0.5 transition-transform" title="' + r.meaning.replace(/"/g, "&quot;") + '">' +
            '<span class="zh block text-3xl font-extrabold leading-tight">' + r.char + "</span>" +
            '<span class="block text-xs font-bold mt-1">' + r.hanViet + "</span>" +
            '<span class="block text-[10px] text-[var(--nhai-muted)] font-semibold">Bộ #' + r.i + "</span>" +
            '<span class="hidden sm:block text-[10px] text-[var(--nhai-muted)] mt-0.5 line-clamp-2">' + r.meaning + "</span>" +
          "</button>"
        );
        btn.addEventListener("click", function () {
          stopAuto();
          var idx = order.indexOf(r.i);
          if (idx === -1) { order = data.map(function (_, i) { return i; }); idx = r.i; }
          pos = idx;
          paint();
          if (window.innerWidth < 768) {
            document.querySelector("[data-card]").scrollIntoView({ behavior: "smooth", block: "center" });
          }
          speakCur();
          NHAI.toast("Bộ #" + r.i + " " + r.char + " — " + r.hanViet);
        });
        grid.appendChild(btn);
      });
      host.appendChild(sec);
    });

    paint();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
