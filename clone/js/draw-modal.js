/* Nhai HSK clone — PLAN-09: modal vẽ chữ để tra (dictionary.html).
   Dùng: NHAI.DrawModal.open(onResult) — canvas vẽ bằng pointer events (chuột + touch),
   grid 4×4 mờ, nút Xoá nét cuối / Xoá hết (disabled khi chưa vẽ nét nào).
   "Tra chữ này" giả lập nhận diện → onResult("你") theo SPEC-09. */
(function () {
  "use strict";
  window.NHAI = window.NHAI || {};

  function open(onResult) {
    document.querySelectorAll("[data-overlay]").forEach(function (o) { o.remove(); });

    var dpr = Math.max(1, window.devicePixelRatio || 1);
    var size = 280;
    var strokes = [];
    var current = null;
    var drawing = false;

    var bd = NHAI.el(
      '<div class="modal-backdrop" data-overlay>' +
        '<div class="card shadow-neo w-full max-w-sm p-5" role="dialog" aria-label="Vẽ chữ để tra">' +
          '<div class="flex items-center justify-between mb-1">' +
            '<h2 class="text-2xl font-extrabold">✍️ Vẽ chữ để tra</h2>' +
            '<button type="button" data-close class="btn-ghost w-9 h-9">✕</button>' +
          "</div>" +
          '<p class="text-sm text-[var(--nhai-muted)] mb-3">Vẽ chữ Hán vào ô bên dưới rồi bấm “Tra chữ này” (bản demo nhận diện giả lập).</p>' +
          '<canvas class="w-full max-w-[280px] mx-auto block rounded-lg border-2 border-[var(--nhai-border)] bg-[var(--nhai-bg)]" ' +
            'style="touch-action:none;aspect-ratio:1/1;cursor:crosshair" aria-label="Vẽ chữ Hán vào đây"></canvas>' +
          '<div class="flex gap-2 mt-3">' +
            '<button type="button" data-undo class="btn-ghost flex-1 py-1.5 text-sm" disabled>↩ Xoá nét cuối</button>' +
            '<button type="button" data-clear class="btn-ghost flex-1 py-1.5 text-sm" disabled>✕ Xoá hết</button>' +
          "</div>" +
          '<div data-suggest class="hidden mt-3 text-sm font-semibold text-[var(--nhai-muted)]">Có thể là: ' +
            '<button type="button" data-guess="你" class="pill ml-1 zh text-base">你</button>' +
          "</div>" +
          '<button type="button" data-submit class="btn-main w-full py-2.5 mt-4">Tra chữ này</button>' +
        "</div>" +
      "</div>"
    );
    document.body.appendChild(bd);

    var canvas = bd.querySelector("canvas");
    var btnUndo = bd.querySelector("[data-undo]");
    var btnClear = bd.querySelector("[data-clear]");
    var suggest = bd.querySelector("[data-suggest]");
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

      if (strokes.length === 0 && !current) {
        ctx.fillStyle = border;
        ctx.font = "600 16px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Vẽ chữ Hán vào đây", w / 2, w / 2);
      }

      ctx.strokeStyle = ink;
      ctx.fillStyle = ink;
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      strokes.concat(current ? [current] : []).forEach(function (s) {
        if (s.length < 2) {
          ctx.beginPath();
          ctx.arc(s[0][0], s[0][1], 2, 0, Math.PI * 2);
          ctx.fill();
          return;
        }
        ctx.beginPath();
        ctx.moveTo(s[0][0], s[0][1]);
        for (var j = 1; j < s.length; j++) ctx.lineTo(s[j][0], s[j][1]);
        ctx.stroke();
      });

      var empty = strokes.length === 0;
      btnUndo.disabled = btnClear.disabled = empty;
      suggest.classList.toggle("hidden", empty);
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

    function close() { bd.remove(); }
    bd.addEventListener("click", function (e) {
      if (e.target === bd || e.target.closest("[data-close]")) { close(); return; }
      if (e.target.closest("[data-submit]")) {
        close();
        var ch = "你"; // nhận diện giả lập theo SPEC-09
        if (onResult) onResult(ch);
      }
    });
  }

  NHAI.DrawModal = { open: open };
})();
