/* Nhai HSK clone — 214 Bộ Thủ (PLAN-04): flashcard deck + grid theo số nét + phím tắt + TTS.
   PLAN-20: modal "Tự động phát thẻ" (⚙) + section 7 quy tắc thứ tự nét + card lưu ý nét cuối. */
(function () {
  "use strict";

  /* Timer registry — mọi timer autoplay nằm đây để huỷ sạch khi dừng / rời trang. */
  var R = window.NHAI_RAD = window.NHAI_RAD || { timer: null, flipTimer: null, speakTimers: [] };

  function clearTimers() {
    if (R.flipTimer) { clearTimeout(R.flipTimer); R.flipTimer = null; }
    if (R.timer) { clearTimeout(R.timer); R.timer = null; }
    R.speakTimers.forEach(clearTimeout);
    R.speakTimers = [];
  }

  function init() {
    var data = (window.NHAI_DATA && NHAI_DATA.radicals) || [];
    if (!data.length) return;

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
      if (inner) {
        inner.classList.toggle("flipped", v);
        inner.classList.toggle("is-flipped", v);
      }
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

    /* ---- PLAN-20: modal "Tự động phát thẻ" + autoplay ---- */
    var autoBtn = $("[data-auto]");
    function paintAutoBtn() {
      if (autoOn) {
        autoBtn.textContent = "⏸ Dừng";
        autoBtn.classList.remove("btn-ghost");
        autoBtn.classList.add("pill-active");
        autoBtn.title = "Dừng tự động phát thẻ";
      } else {
        autoBtn.textContent = "⚙ Tự động";
        autoBtn.classList.add("btn-ghost");
        autoBtn.classList.remove("pill-active");
        autoBtn.title = "Cài đặt tự động phát thẻ";
      }
    }

    function stopAutoplay() {
      clearTimers();
      autoOn = false;
      paintAutoBtn();
    }

    function speakRepeats(pinyin, repeat) {
      for (var i = 0; i < repeat; i++) {
        (function (k) {
          var id = setTimeout(function () { NHAI.speak(pinyin, "zh-CN"); }, k * 400);
          R.speakTimers.push(id);
        })(i);
      }
    }

    function runCycle(cfg) {
      R.flipTimer = setTimeout(function () {
        setFlip(true);
        if (cfg.speak) speakRepeats(cur().char, cfg.repeat);
        R.timer = setTimeout(function () {
          R.timer = null;
          go(1, true);
          runCycle(cfg);
        }, cfg.nextMs);
      }, cfg.flipMs);
    }

    function startAutoplay(cfg) {
      stopAutoplay();
      autoOn = true;
      paintAutoBtn();
      runCycle(cfg);
      NHAI.toast("Đang tự động phát thẻ — bấm ⏸ để dừng");
    }

    function openAutoplayModal() {
      stopAutoplay(); /* không để timer cũ sống khi mở modal */

      var ov = NHAI.el(
        '<div data-ap-overlay class="fixed inset-0 z-[2147482000] flex items-center justify-center p-4" style="background:rgba(0,0,0,.45)">' +
          '<div class="card shadow-neo w-full max-w-sm p-5" role="dialog" aria-label="Tự động phát thẻ">' +
            '<h3 class="text-xl font-extrabold">Tự động phát thẻ</h3>' +
            '<p class="text-xs text-[var(--nhai-muted)] font-semibold mt-1 mb-4">Cấu hình nhịp lật thẻ và phát âm tự động.</p>' +

            '<label class="block mb-3">' +
              '<span class="block text-sm font-bold mb-1">Thời gian lật thẻ</span>' +
              '<select data-ap-flip class="w-full card px-3 py-2 text-sm bg-transparent">' +
                '<option value="2000">2 giây</option>' +
                '<option value="3000" selected>3 giây</option>' +
                '<option value="5000">5 giây</option>' +
                '<option value="10000">10 giây</option>' +
              "</select>" +
            "</label>" +

            '<label class="block mb-3">' +
              '<span class="block text-sm font-bold mb-1">Thời gian sang thẻ mới</span>' +
              '<select data-ap-next class="w-full card px-3 py-2 text-sm bg-transparent">' +
                '<option value="1000">1 giây</option>' +
                '<option value="2000" selected>2 giây</option>' +
                '<option value="3000">3 giây</option>' +
              "</select>" +
            "</label>" +

            '<label class="flex items-center justify-between mb-3 cursor-pointer">' +
              '<span class="text-sm font-bold">Nghe từ vựng</span>' +
              '<input type="checkbox" data-ap-speak class="w-5 h-5 accent-[var(--nhai-main)]">' +
            "</label>" +

            '<label class="block mb-4">' +
              '<span class="block text-sm font-bold mb-1">Số lần nghe lại</span>' +
              '<select data-ap-repeat class="w-full card px-3 py-2 text-sm bg-transparent" disabled>' +
                '<option value="1" selected>1 lần</option>' +
                '<option value="2">2 lần</option>' +
                '<option value="3">3 lần</option>' +
              "</select>" +
            "</label>" +

            '<div class="flex gap-2 justify-end">' +
              '<button type="button" data-ap-cancel class="btn-ghost px-4 py-2 text-sm">Huỷ</button>' +
              '<button type="button" data-ap-start class="btn-main px-4 py-2 text-sm">Bắt đầu</button>' +
            "</div>" +
          "</div>" +
        "</div>"
      );

      var speakBox = ov.querySelector("[data-ap-speak]");
      var repeatSel = ov.querySelector("[data-ap-repeat]");
      speakBox.addEventListener("change", function () {
        repeatSel.disabled = !speakBox.checked;
      });

      function close() { ov.remove(); }
      ov.querySelector("[data-ap-cancel]").addEventListener("click", close);
      ov.addEventListener("click", function (e) { if (e.target === ov) close(); });
      ov.querySelector("[data-ap-start]").addEventListener("click", function () {
        var cfg = {
          flipMs: parseInt(ov.querySelector("[data-ap-flip]").value, 10),
          nextMs: parseInt(ov.querySelector("[data-ap-next]").value, 10),
          speak: speakBox.checked,
          repeat: parseInt(repeatSel.value, 10)
        };
        close();
        startAutoplay(cfg);
      });

      document.body.appendChild(ov);
    }

    autoBtn.addEventListener("click", function () {
      autoOn ? stopAutoplay() : openAutoplayModal();
    });
    paintAutoBtn();

    window.addEventListener("beforeunload", stopAutoplay);

    $("[data-shuffle]").addEventListener("click", function () {
      stopAutoplay();
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
    $("[data-prev]").addEventListener("click", function () { stopAutoplay(); go(-1, false); });
    $("[data-next]").addEventListener("click", function () { stopAutoplay(); go(1, false); });
    $("[data-unknown]").addEventListener("click", function () { stopAutoplay(); mark("Chưa thuộc"); });
    $("[data-known]").addEventListener("click", function () { stopAutoplay(); mark("Đã thuộc"); });
    card.addEventListener("click", function () { setFlip(!flipped); });

    /* ---- phím tắt ←/A ↓/X ↑/Z →/D ---- */
    document.addEventListener("keydown", function (e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      var tag = (e.target && e.target.tagName) || "";
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag)) return;
      if (e.key === "Escape") { var ov = document.querySelector("[data-ap-overlay]"); if (ov) { ov.remove(); return; } }
      if (document.querySelector("[data-overlay]")) return;
      switch (e.key) {
        case "ArrowLeft": case "a": case "A": stopAutoplay(); go(-1, false); break;
        case "ArrowDown": case "x": case "X": stopAutoplay(); mark("Chưa thuộc"); break;
        case "ArrowUp": case "z": case "Z": stopAutoplay(); mark("Đã thuộc"); break;
        case "ArrowRight": case "d": case "D": stopAutoplay(); go(1, false); break;
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
          stopAutoplay();
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

    /* ---- PLAN-20: 7 quy tắc thứ tự nét + card lưu ý nét cuối ---- */
    renderStrokeRules();
    renderLastStrokes();
  }

  function renderStrokeRules() {
    var rules = (window.NHAI_DATA && NHAI_DATA.strokeRules) || [];
    var host = document.getElementById("stroke-rules");
    if (!host || !rules.length) return;

    var sec = NHAI.el(
      '<section class="mt-10">' +
        '<h2 class="font-extrabold text-xl mb-1">Quy tắc thứ tự nét</h2>' +
        '<p class="text-sm text-[var(--nhai-muted)] font-semibold mb-4">7 nguyên tắc cơ bản giúp bạn viết đúng thứ tự.</p>' +
        '<div class="grid grid-cols-1 sm:grid-cols-2 gap-3" data-rules-grid></div>' +
      "</section>"
    );
    var grid = sec.querySelector("[data-rules-grid]");

    rules.forEach(function (r) {
      var cell = NHAI.el(
        '<div class="card p-3 flex items-center gap-3">' +
          '<span class="flex-none w-8 h-8 rounded-full bg-[var(--nhai-main)] text-white text-sm font-extrabold flex items-center justify-center">' + r.n + "</span>" +
          '<div class="flex-1 min-w-0">' +
            '<h3 class="font-extrabold text-sm">' + r.name + "</h3>" +
            '<p class="text-xs text-[var(--nhai-muted)] mt-0.5">' + r.desc + "</p>" +
          "</div>" +
          '<span class="flex-none w-12 h-12 rounded-lg flex items-center justify-center" style="background:var(--nhai-soft);font-family:system-ui,-apple-system,\'Segoe UI\',sans-serif;font-size:40px;line-height:1;color:#1f2937">' + r.chars.join("") + "</span>" +
        "</div>"
      );
      grid.appendChild(cell);
    });

    host.appendChild(sec);
  }

  function renderLastStrokes() {
    var items = (window.NHAI_DATA && NHAI_DATA.lastStrokes) || [];
    var host = document.getElementById("stroke-rules");
    if (!host || !items.length) return;

    var cells = items.map(function (it) {
      return '<div class="flex flex-col items-center gap-1">' +
        '<span class="w-14 h-14 rounded-lg flex items-center justify-center" style="background:var(--nhai-soft);font-family:system-ui,-apple-system,\'Segoe UI\',sans-serif;font-size:36px;line-height:1;color:#1f2937">' + it.glyph + "</span>" +
        '<span class="text-xs font-bold">' + it.name + "</span>" +
      "</div>";
    }).join("");

    var card = NHAI.el(
      '<div class="mt-4 p-4 rounded-lg" style="background:var(--nhai-warn-bg);border-left:4px solid var(--nhai-gold)">' +
        '<h3 class="font-extrabold">⏳ Ba nét cuối luôn viết sau cùng</h3>' +
        '<p class="text-sm mt-1">Những bộ thủ thường gặp như 辶 (走之), 廴 và ㄑ luôn nằm cuối cùng, dù nghĩa của chúng có liên quan đến điều gì đó trước đó.</p>' +
        '<div class="flex gap-4 mt-3" data-last-strokes>' + cells + "</div>" +
      "</div>"
    );

    host.appendChild(card);
  }

  if (document.readyState === "complete") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
