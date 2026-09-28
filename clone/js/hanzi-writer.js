/* Nhai HSK clone — PLAN-03 trình diễn thứ tự nét (SVG stroke-dashoffset).
   你 có 7 polyline đúng thứ tự; chữ khác dùng bộ nét generic 4 nét.
   API: NHAI.HanziWriter.mount(host, char) -> { play, showArrows, setZoom } */
(function () {
  "use strict";
  window.NHAI = window.NHAI || {};

  /* Toạ độ 0–100. Mỗi nét: mảng điểm theo thứ tự bút chạy. */
  var STROKE_DATA = {
    "你": [
      [[35, 14], [31, 24], [24, 40], [17, 57], [13, 71]],          /* 1 撇 (亻) */
      [[33, 36], [33, 58], [32, 84]],                              /* 2 竖 (亻) */
      [[56, 16], [50, 30], [44, 43]],                              /* 3 撇 (尔) */
      [[41, 31], [60, 28], [75, 36]],                              /* 4 横钩 */
      [[58, 26], [58, 50], [57, 74], [61, 82]],                    /* 5 竖钩 */
      [[52, 56], [45, 66], [35, 79]],                              /* 6 撇 */
      [[65, 57], [71, 68], [77, 82]]                               /* 7 点 */
    ]
  };

  /* generic 4 nét cho chữ chưa có data: khung 口 sơ khai */
  function genericStrokes() {
    return [
      [[18, 18], [82, 18]],
      [[82, 18], [82, 82]],
      [[82, 82], [18, 82]],
      [[18, 82], [18, 18], [30, 18]]
    ];
  }

  var uid = 0;

  function Writer(host, ch) {
    this.host = host;
    this.char = ch;
    this.strokes = STROKE_DATA[ch] || genericStrokes();
    this.isCustom = !!STROKE_DATA[ch];
    this.id = "nhai-hw-" + (++uid);
    this.raf = null;
    this.arrows = false;
    this.zoom = false;
    this._build();
  }

  Writer.prototype._build = function () {
    var NS = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("class", "absolute inset-0 w-full h-full pointer-events-none");
    svg.setAttribute("aria-hidden", "true");

    var defs = document.createElementNS(NS, "defs");
    defs.innerHTML =
      '<marker id="' + this.id + '-arrow" viewBox="0 0 10 10" refX="8" refY="5" ' +
        'markerWidth="5" markerHeight="5" orient="auto-start-reverse">' +
        '<path d="M 0 1 L 9 5 L 0 9 z" style="fill:var(--nhai-main,#c23b22)"></path>' +
      "</marker>";
    svg.appendChild(defs);

    var paths = [];
    this.strokes.forEach(function (pts) {
      var pl = document.createElementNS(NS, "polyline");
      pl.setAttribute("points", pts.map(function (p) { return p.join(","); }).join(" "));
      pl.setAttribute("fill", "none");
      pl.setAttribute("stroke", "var(--nhai-main, #c23b22)");
      pl.setAttribute("stroke-width", "4.5");
      pl.setAttribute("stroke-linecap", "round");
      pl.setAttribute("stroke-linejoin", "round");
      pl.setAttribute("pathLength", "1");
      pl.style.strokeDasharray = "1";
      pl.style.strokeDashoffset = "1"; // ẩn cho đến khi animate
      svg.appendChild(pl);
      paths.push(pl);
    });

    this.svg = svg;
    this.paths = paths;
    this.host.appendChild(svg);
  };

  Writer.prototype.play = function () {
    var self = this;
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
    var all = this.paths;
    all.forEach(function (p) { p.style.strokeDashoffset = "1"; });

    var idx = 0, t0 = null;
    var DUR = 420, GAP = 90;
    function frame(ts) {
      if (t0 === null) t0 = ts;
      var el = ts - t0;
      if (idx >= all.length) { self.raf = null; return; }
      var p = all[idx];
      var k = Math.min(1, el / DUR);
      var eased = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; // easeInOutQuad
      p.style.strokeDashoffset = String(1 - eased);
      if (k >= 1) { p.style.strokeDashoffset = "0"; idx++; t0 = ts + GAP; if (idx < all.length) p = null; else { self.raf = null; return; } }
      self.raf = requestAnimationFrame(frame);
    }
    this.raf = requestAnimationFrame(frame);
  };

  Writer.prototype.showArrows = function (on) {
    this.arrows = !!on;
    var self = this;
    this.paths.forEach(function (p) {
      if (self.arrows) p.setAttribute("marker-end", "url(#" + self.id + "-arrow)");
      else p.removeAttribute("marker-end");
    });
    if (this.arrows && !this.raf) {
      /* đang tĩnh: hiện đủ nét để thấy mũi tên */
      this.paths.forEach(function (p) { p.style.strokeDashoffset = "0"; });
    }
  };

  Writer.prototype.setZoom = function (on) {
    this.zoom = !!on;
    if (this.zoom) {
      var minX = 100, minY = 100, maxX = 0, maxY = 0;
      this.strokes.forEach(function (pts) {
        pts.forEach(function (p) {
          if (p[0] < minX) minX = p[0];
          if (p[0] > maxX) maxX = p[0];
          if (p[1] < minY) minY = p[1];
          if (p[1] > maxY) maxY = p[1];
        });
      });
      var pad = 6;
      this.svg.setAttribute("viewBox", (minX - pad) + " " + (minY - pad) + " " + (maxX - minX + pad * 2) + " " + (maxY - minY + pad * 2));
    } else {
      this.svg.setAttribute("viewBox", "0 0 100 100");
    }
  };

  NHAI.HanziWriter = {
    mount: function (host, ch) { return new Writer(host, ch); },
    hasCustomStrokes: function (ch) { return !!STROKE_DATA[ch]; }
  };
})();
