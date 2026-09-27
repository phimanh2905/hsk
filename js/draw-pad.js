/* Nhai HSK clone — PLAN-03 canvas vẽ chữ Hán (pointer events: chuột + touch).
   Dùng: NHAI.DrawPad.create(host, { size, navigate }) — component tự chứa canvas,
   grid 4×4 mờ, nút Xoá nét cuối / Xoá hết, gợi ý giả khi có nét. */
(function () {
  "use strict";
  window.NHAI = window.NHAI || {};

  var SUGGESTIONS = ["你", "好", "学"]; // gợi ý giả theo SPEC-03 (không nhận diện thật)

  function DrawPad(host, opts) {
    opts = opts || {};
    var size = opts.size || 280;
    var navigate = opts.navigate || function (ch) { location.href = "hanzi.html?char=" + encodeURIComponent(ch); };
    var dpr = Math.max(1, window.devicePixelRatio || 1);
    var strokes = []; // mỗi nét: mảng [x, y] theo toạ độ canvas size×size
    var current = null;
    var drawing = false;

    host.innerHTML =
      '<div class="flex flex-col items-center">' +
        '<canvas class="w-full max-w-[280px] rounded-lg border-2 border-[var(--nhai-border)] bg-[var(--nhai-card)]" ' +
          'style="touch-action:none;aspect-ratio:1/1;cursor:crosshair" aria-label="Vẽ chữ Hán vào đây"></canvas>' +
        '<div class="flex gap-2 mt-3">' +
          '<button type="button" data-undo class="btn-ghost px-3 py-1.5 text-sm" disabled>↩ Xoá nét cuối</button>' +
          '<button type="button" data-clear class="btn-ghost px-3 py-1.5 text-sm" disabled>✕ Xoá hết</button>' +
        "</div>" +
        '<div data-suggest class="hidden mt-3 text-sm font-semibold text-[var(--nhai-muted)]">Có thể là: ' +
          SUGGESTIONS.map(function (ch) {
            return '<button type="button" data-go="' + ch + '" class="pill ml-1 zh text-base">' + ch + "</button>";
          }).join("") +
        "</div>" +
      "</div>";

    var canvas = host.querySelector("canvas");
    var btnUndo = host.querySelector("[data-undo]");
    var btnClear = host.querySelector("[data-clear]");
    var suggestBox = host.querySelector("[data-suggest]");
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    var ctx = canvas.getContext("2d");

    function cssVar(name, fallback) {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    }

    function redraw() {
      var w = size;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, w);
      var border = cssVar("--nhai-border", "#e7e0d4");
      var ink = cssVar("--nhai-ink", "#1f1e1d");

      /* grid 4×4 nét mờ */
      ctx.strokeStyle = border;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.7;
      for (var i = 1; i < 4; i++) {
        var p = (w / 4) * i;
        ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, w); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(w, p); ctx.stroke();
      }
      ctx.globalAlpha = 1;

      /* placeholder khi trống */
      if (strokes.length === 0 && !current) {
        ctx.fillStyle = border;
        ctx.font = "600 16px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Vẽ chữ Hán vào đây", w / 2, w / 2);
      }

      /* các nét đã vẽ + nét đang vẽ */
      ctx.strokeStyle = ink;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      var all = strokes.concat(current ? [current] : []);
      all.forEach(function (s) {
        if (s.length < 2) { // chạm nhanh = chấm
          ctx.beginPath();
          ctx.arc(s[0][0], s[0][1], 2, 0, Math.PI * 2);
          ctx.fillStyle = ink;
          ctx.fill();
          return;
        }
        ctx.beginPath();
        ctx.moveTo(s[0][0], s[0][1]);
        for (var j = 1; j < s.length; j++) ctx.lineTo(s[j][0], s[j][1]);
        ctx.stroke();
      });

      btnUndo.disabled = btnClear.disabled = strokes.length === 0;
      suggestBox.classList.toggle("hidden", strokes.length === 0 && !current);
    }

    function pos(e) {
      var r = canvas.getBoundingClientRect();
      return [Math.round((e.clientX - r.left) * (size / r.width)), Math.round((e.clientY - r.top) * (size / r.height))];
    }

    canvas.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      drawing = true;
      current = [pos(e)];
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      redraw();
    });
    canvas.addEventListener("pointermove", function (e) {
      if (!drawing) return;
      e.preventDefault();
      current.push(pos(e));
      redraw();
    });
    function endStroke(e) {
      if (!drawing) return;
      drawing = false;
      if (e && e.pointerId !== undefined) { try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ } }
      if (current && current.length) strokes.push(current);
      current = null;
      redraw();
    }
    canvas.addEventListener("pointerup", endStroke);
    canvas.addEventListener("pointercancel", endStroke);
    canvas.addEventListener("pointerleave", function (e) { if (drawing) endStroke(e); });

    btnUndo.addEventListener("click", function () { strokes.pop(); redraw(); });
    btnClear.addEventListener("click", function () { strokes = []; redraw(); });
    suggestBox.addEventListener("click", function (e) {
      var b = e.target.closest("[data-go]");
      if (b) navigate(b.getAttribute("data-go"));
    });

    redraw();
    return { redraw: redraw, clear: function () { strokes = []; redraw(); } };
  }

  NHAI.DrawPad = { create: function (host, opts) { return new DrawPad(host, opts); } };
})();
