/* Nhai HSK clone — Tạo file luyện viết (PLAN-16 / SPEC-16).
   Catalog 9 mẫu (mặc định) + form 7 nhóm tuỳ chọn ?tpl=<id>, preview A4 render động,
   gate mã FREEHSK + window.print(). SVG stroke renderer (renderStrokeSVG) giữ từ PLAN-13. */
(function () {
  "use strict";

  var TPLS = (window.NHAI_DATA && NHAI_DATA.templates) || [];
  /* lookup map: mảng [{id,...}] → tra theo id */
  var TPL_BY_ID = {};
  TPLS.forEach(function (t) { TPL_BY_ID[t.id] = t; });
  var GROUPS = [
    { id: "hanzi", label: "Mẫu chữ Hán" },
    { id: "vocab", label: "Mẫu từ vựng" },
    { id: "paper", label: "Đoạn văn & giấy ô" }
  ];
  var page = null;

  /* ---------- dữ liệu phụ / fallback ---------- */
  var NUMS = ["①", "②", "③", "④", "⑤"];

  var CHAR_INFO_FALLBACK = {
    "永": { pinyin: "yǒng", hanViet: "VĨNH", meaning: "vĩnh viễn, mãi mãi" },
    "远": { pinyin: "yuǎn", hanViet: "VIỄN", meaning: "xa" },
    "学": { pinyin: "xué", hanViet: "HỌC", meaning: "học" },
    "习": { pinyin: "xí", hanViet: "TẬP", meaning: "tập luyện" },
    "汉": { pinyin: "hàn", hanViet: "HÁN", meaning: "tiếng Hán, người Hán" },
    "字": { pinyin: "zì", hanViet: "TỰ", meaning: "chữ" }
  };

  function charInfo(ch) {
    var h = window.NHAI_DATA && NHAI_DATA.hanzi;
    if (h && h.chars && h.chars[ch]) return h.chars[ch];
    return CHAR_INFO_FALLBACK[ch] || { pinyin: "", hanViet: "", meaning: "" };
  }

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function fadedChar(ch, size, opacity) {
    var op = opacity != null ? opacity : CF.opacity / 100;
    return '<span class="zh zh-faded" style="font-size:' + (size || 1.6) + 'em;opacity:' + op + '">' + esc(ch) + "</span>";
  }
  function rowOf(cols, inner) {
    var h = '<div class="grid" style="grid-template-columns:repeat(' + cols + ',minmax(0,1fr))">';
    for (var i = 0; i < cols; i++) h += shapeCell(inner);
    return h + "</div>";
  }

  /* ---------- state CF v2 (PLAN-16): mọi tuỳ chọn form + danh sách từ ----------
     sessionStorage "nhai.cf.state" — merge với default, mọi key đều có default. */
  var CF_KEY = "nhai.cf.state";

  var DEFAULT_CHARS = [
    { hanzi: "学习", pinyin: "xué xí", hv: "HỌC TẬP", meaning: "học tập" },
    { hanzi: "朋友", pinyin: "péng yǒu", hv: "BẰNG HỮU", meaning: "bạn bè" },
    { hanzi: "老师", pinyin: "lǎo shī", hv: "LÃO SƯ", meaning: "giáo viên" },
    { hanzi: "工作", pinyin: "gōng zuò", hv: "CÔNG TÁC", meaning: "công việc" }
  ];

  function cfDefaults() {
    return {
      tpl: null,
      chars: DEFAULT_CHARS.map(function (c) { return { hanzi: c.hanzi, pinyin: c.pinyin, hv: c.hv, meaning: c.meaning }; }),
      title: "",
      nameDate: true,
      cellType: "dien-tu",
      cellColor: "gray",
      perRow: 12,
      fillRows: 1,
      blankRows: 0,
      faintCount: 3,
      script: "khai",
      strokeSource: "CNstrokeorder",
      traceStyle: ["faint"],
      opacity: 30,
      fontSize: 78,
      showPinyin: true,
      showMeaning: true
    };
  }

  var CF = cfDefaults();

  function persist() {
    try { sessionStorage.setItem(CF_KEY, JSON.stringify(CF)); } catch (e) { /* silent */ }
  }
  function cfLoadAll() {
    /* đọc state đã lưu, merge mọi key với default (mảng traceStyle / chars thay nguyên) */
    try {
      var s = sessionStorage.getItem(CF_KEY);
      if (!s) return false;
      var o = JSON.parse(s);
      if (!o || typeof o !== "object") return false;
      var d = cfDefaults();
      Object.keys(d).forEach(function (k) {
        if (o[k] !== undefined) CF[k] = o[k];
      });
      if (!Array.isArray(CF.chars)) CF.chars = d.chars;
      if (!Array.isArray(CF.traceStyle) || !CF.traceStyle.length) CF.traceStyle = d.traceStyle;
      return true;
    } catch (e) { /* silent */ }
    return false;
  }
  function cfReset(tplId) {
    CF = cfDefaults();
    CF.tpl = tplId || null;
    persist();
  }
  function cfFind(hz) {
    for (var i = 0; i < CF.chars.length; i++) if (CF.chars[i].hanzi === hz) return CF.chars[i];
    return null;
  }

  /* ---------- gate mã ---------- */
  function hasCode() { try { return localStorage.getItem("nhai.fileCode") === "1"; } catch (e) { return false; } }
  function canPrint() { return NHAI.isLoggedIn() || hasCode(); }

  /* ================= CATALOG (PLAN-16) ================= */
  function bannerHtml() {
    return '<div class="no-print card shadow-neo p-4 mt-5 flex flex-col md:flex-row md:items-center gap-3" style="background:#fdf6d8">' +
      '<div class="flex-1"><p class="font-bold">Cần mã tải file để in. Tham gia nhóm Facebook Nhai HSK, mã n…</p></div>' +
      '<a href="#" data-join class="font-bold whitespace-nowrap hover:underline" style="color:#c23b22">Tham gia nhóm để lấy mã</a>' +
      "</div>";
  }

  function renderCatalog() {
    var h = "";
    h += '<div class="flex flex-wrap items-center gap-3">' +
      '<h1 class="text-3xl font-extrabold">Tạo file</h1>' +
      '<span class="pill zh pill-active text-sm">生成练习本</span></div>';
    h += '<p class="text-[var(--nhai-muted)] mt-1">— Tạo bản in luyện viết chữ Hán theo thứ tự nét</p>';
    h += bannerHtml();

    GROUPS.forEach(function (g) {
      h += '<h2 class="text-xl font-extrabold mt-8 mb-3">' + esc(g.label) + "</h2>";
      h += '<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">';
      TPLS.forEach(function (t) {
        if (t.group !== g.id) return;
        h += '<a href="create-file.html?tpl=' + encodeURIComponent(t.id) + '" class="card shadow-neo p-4 block hover:-translate-y-0.5 transition-transform">' +
          '<div class="rounded-md border-2 border-[#cfc4ae] bg-white mb-3 overflow-hidden" style="aspect-ratio:3/4">' +
          '<div class="w-full h-full [&>svg]:w-full [&>svg]:h-full">' + (t.thumb || "") + "</div></div>" +
          '<h3 class="font-bold">' + esc(t.name) + "</h3>" +
          '<p class="text-sm text-[var(--nhai-muted)] mt-0.5">' + esc(t.desc) + "</p></a>";
      });
      h += "</div>";
    });

    page.innerHTML = h;

    var join = page.querySelector("[data-join]");
    if (join) join.addEventListener("click", function (e) {
      e.preventDefault();
      NHAI.toast("Mã tải file nằm ở phần mô tả của nhóm Facebook Nhai HSK.");
    });
  }

  /* ================= FORM VIEW (PLAN-16) ================= */

  /* ---------- SVG nét thật (giữ từ PLAN-13 / SPEC-13) ---------- */
  function strokeData(ch) {
    var s = window.NHAI_DATA && NHAI_DATA.hanzi && NHAI_DATA.hanzi.strokes;
    return (s && s[ch]) || null;
  }
  /* fallback generic 4 nét (khung ô vuông) cho chữ chưa có data — không throw */
  function genericStrokes() {
    return [
      [[20, 25], [80, 25]],
      [[22, 27], [22, 80]],
      [[78, 27], [78, 80]],
      [[20, 80], [80, 80]]
    ];
  }
  /* mode: "full" (đen) | k (số) — nét 0..k-1 đen, nét k đỏ | "faint" (mờ) */
  function renderStrokeSVG(ch, mode) {
    var data = strokeData(ch) || genericStrokes();
    var k = typeof mode === "number" ? mode : -1;
    var inner = "";
    for (var i = 0; i < data.length; i++) {
      if (k >= 0 && i > k) continue;
      var color = (k >= 0 && i === k) ? "#c23b22" : "#17150f";
      var op = mode === "faint" ? 0.14 : 1;
      var pts = data[i].map(function (p) { return p[0] + "," + p[1]; }).join(" ");
      inner += '<polyline points="' + pts + '" fill="none" stroke="' + color + '" stroke-opacity="' + op +
        '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>';
    }
    return '<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%">' + inner + "</svg>";
  }
  /* dòng meta: Hán Việt IN HOA + pinyin + nghĩa (từ CF.chars) */
  function metaLine(c) {
    var h = '<div class="text-sm mb-1">';
    h += '<span class="font-bold">' + esc((c.hv || "").toUpperCase() || "—") + "</span>";
    if (CF.showPinyin && c.pinyin) h += ' <span class="zh">' + esc(c.pinyin) + "</span>";
    if (CF.showMeaning && c.meaning) h += ' <span style="color:#888">— ' + esc(c.meaning) + "</span>";
    return h + "</div>";
  }

  /* ---------- ô theo loại + màu (PLAN-16) ---------- */
  /* map màu ô → giá trị CSS var --cell-c */
  function cellColorVar(color) {
    var map = { green: "#16a34a", red: "#dc2626", blue: "#2563eb", gray: "#9ca3af" };
    return map[color] || map.gray;
  }
  /* shape: decoration bên trong 1 ô theo CF.cellType */
  function cellShape() {
    var c = "var(--cell-c)";
    switch (CF.cellType) {
      case "dien-tu": /* điền tự: bo tròn nhẹ */
        return '<i style="position:absolute;inset:5%;border:1px solid ' + c + ';border-radius:16%;pointer-events:none"></i>';
      case "mi": /* mễ tự: chéo + chữ thập nét đứt */
        return '<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none">' +
          '<line x1="0" y1="0" x2="100" y2="100" stroke="' + c + '" stroke-width="1" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>' +
          '<line x1="100" y1="0" x2="0" y2="100" stroke="' + c + '" stroke-width="1" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>' +
          '<line x1="50" y1="0" x2="50" y2="100" stroke="' + c + '" stroke-width="1" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/>' +
          '<line x1="0" y1="50" x2="100" y2="50" stroke="' + c + '" stroke-width="1" stroke-dasharray="4 4" vector-effect="non-scaling-stroke"/></svg>';
      case "vuong": /* ô vuông: dùng khung sẵn của .grid-cell */
        return "";
      case "hoi-cung": /* hồi cung: ô trong lồng ô */
        return '<i style="position:absolute;inset:16%;border:1px solid ' + c + ';pointer-events:none"></i>';
      case "cuu-cung": /* cửu cung: chữ thập giữa ô */
        return '<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none">' +
          '<line x1="50" y1="0" x2="50" y2="100" stroke="' + c + '" stroke-width="1" vector-effect="non-scaling-stroke"/>' +
          '<line x1="0" y1="50" x2="100" y2="50" stroke="' + c + '" stroke-width="1" vector-effect="non-scaling-stroke"/></svg>';
      default: return "";
    }
  }
  function shapeCell(inner, extraStyle) {
    return '<div class="grid-cell relative" style="--cell-c:' + cellColorVar(CF.cellColor) + ";" + (extraStyle || "") + '">' +
      cellShape() + (inner || "") + "</div>";
  }

  /* ---------- sheet A4 ---------- */
  function sheetHtml(content) {
    var head = "";
    if (CF.title) head += '<div class="text-center font-extrabold text-lg mb-2">' + esc(CF.title) + "</div>";
    if (CF.nameDate) head += '<div class="flex justify-between text-sm mb-4 pb-2 border-b-2 border-[#dccfb8]">' +
      "<span>Họ tên: ______________</span><span>Ngày: ____________</span></div>";
    return '<div class="print-page sheet card shadow-neo mx-auto w-full max-w-[794px] p-10 mb-8">' + head +
      '<div class="sheet-body">' + content + "</div>" +
      '<div class="text-center text-xs mt-6 pt-2 border-t border-[#dccfb8]" style="color:#999">nhaihsk.com · facebook.com/groups/nhaihsk</div>' +
      "</div>";
  }

  /* ---------- preview blocks ---------- */
  function strokeBlock(c) {
    var data = strokeData(c.hanzi) || genericStrokes();
    var n = data.length;
    var steps = Math.min(n, 5);
    var h = '<div class="mb-5 break-inside-avoid">';
    h += metaLine(c);
    h += '<div class="grid mb-1" style="grid-template-columns:repeat(6,minmax(0,1fr))">';
    h += shapeCell(renderStrokeSVG(c.hanzi, "full"));
    for (var s = 0; s < steps; s++) {
      var k = Math.round(s * (n - 1) / Math.max(steps - 1, 1));
      h += shapeCell('<span class="absolute top-0.5 left-1 text-[10px] font-bold" style="color:#c23b22">' + NUMS[s] + "</span>" + renderStrokeSVG(c.hanzi, k));
    }
    h += "</div>";
    for (var r = 0; r < 2; r++) h += rowOf(8, fadedChar(c.hanzi, 1.5));
    return h + "</div>";
  }

  function bigBlock(c) {
    var h = '<div class="flex gap-3 mb-6 items-stretch break-inside-avoid">';
    h += '<div class="shrink-0">' + shapeCell(renderStrokeSVG(c.hanzi, "full"), "width:7rem;height:7rem") + "</div>";
    h += '<div class="flex-1 min-w-0">';
    h += metaLine(c);
    h += rowOf(6, fadedChar(c.hanzi, 1.6));
    return h + "</div></div>";
  }

  function traceCharSpan(ch) {
    /* chữ tô theo Kiểu chữ tô + Độ đậm + Cỡ chữ */
    var size = "font-size:" + (CF.fontSize / 62) + "em;";
    var op = CF.opacity / 100;
    if (CF.traceStyle.indexOf("thin-dashed") >= 0)
      return '<span class="zh" style="' + size + "opacity:" + op + ';-webkit-text-stroke:0.5px #17150f;-webkit-text-fill-color:transparent">' + esc(ch) + "</span>";
    if (CF.traceStyle.indexOf("dashed-hollow") >= 0)
      return '<span class="zh" style="' + size + "color:transparent;-webkit-text-stroke:1px dashed #17150f;opacity:" + op + '">' + esc(ch) + "</span>";
    if (CF.traceStyle.indexOf("hollow") >= 0)
      return '<span class="zh" style="' + size + "color:transparent;-webkit-text-stroke:1px #17150f;opacity:" + Math.max(op, 0.5) + '">' + esc(ch) + "</span>";
    if (CF.traceStyle.indexOf("faint") >= 0)
      return '<span class="zh zh-faded" style="' + size + "opacity:" + op + '">' + esc(ch) + "</span>";
    return '<span class="zh" style="' + size + '">' + esc(ch) + "</span>";
  }

  /* hàng ô: fillRows hàng có chữ mờ + blankRows hàng trống, pinyin trên hàng đầu */
  function traceRows(word, cols) {
    var chars = Array.from(word.hanzi);
    var perCharPy = word.pinyin ? String(word.pinyin).trim().split(/\s+/) : [];
    var exact = perCharPy.length === chars.length;
    var h = "";
    for (var r = 0; r < CF.fillRows; r++) {
      if (CF.showPinyin && word.pinyin && r === 0) {
        h += '<div class="grid text-center text-xs zh-faded" style="grid-template-columns:repeat(' + cols + ',minmax(0,1fr))">';
        for (var i = 0; i < cols; i++) h += "<div>" + (exact ? esc(perCharPy[i]) : (i === 0 ? esc(word.pinyin) : "")) + "</div>";
        h += "</div>";
      }
      h += '<div class="grid" style="grid-template-columns:repeat(' + cols + ',minmax(0,1fr))">';
      for (var c2 = 0; c2 < cols; c2++) {
        var show = r * cols + c2 < CF.faintCount;
        h += shapeCell(show ? traceCharSpan(chars[c2 % chars.length] || "") : "");
      }
      h += "</div>";
    }
    for (var b = 0; b < CF.blankRows; b++) {
      h += '<div class="grid" style="grid-template-columns:repeat(' + cols + ',minmax(0,1fr))">';
      for (var j = 0; j < cols; j++) h += shapeCell("");
      h += "</div>";
    }
    return h;
  }

  function wordBlock(w) {
    var h = '<div class="mb-6 break-inside-avoid">';
    h += '<div class="flex items-baseline gap-2 flex-wrap mb-1">';
    h += '<span class="zh font-bold" style="font-size:1.4em">' + esc(w.hanzi) + "</span>";
    if (CF.showPinyin && w.pinyin) h += '<span class="text-sm zh">(' + esc(w.pinyin) + ")</span>";
    if (CF.showMeaning && w.meaning) h += '<span class="text-sm font-semibold">' + esc((w.hv || "").toUpperCase()) + " — " + esc(w.meaning) + "</span>";
    h += "</div>";
    h += traceRows(w, Math.max(Array.from(w.hanzi).length, 2));
    return h + "</div>";
  }

  function gridRows(count) {
    var h = "";
    for (var r = 0; r < count; r++) {
      h += '<div class="grid" style="grid-template-columns:repeat(' + CF.perRow + ',minmax(0,1fr))">';
      for (var i = 0; i < CF.perRow; i++) h += shapeCell("");
      h += "</div>";
    }
    return h;
  }

  function flatChars() {
    var out = [];
    CF.chars.forEach(function (w) {
      var cs = Array.from(w.hanzi);
      var pys = w.pinyin ? w.pinyin.trim().split(/\s+/) : [];
      cs.forEach(function (ch, i) {
        out.push({ ch: ch, py: pys.length === cs.length ? (pys[i] || "") : (i === 0 ? w.pinyin : "") });
      });
    });
    return out;
  }

  function buildPages(id) {
    var totalRows = Math.max(CF.fillRows + CF.blankRows, 1);
    switch (id) {
      case "stroke-order":
        return paginate(CF.chars, 2, function (c) { return strokeBlock(c); });
      case "big-char":
        return paginate(CF.chars, 3, function (c) { return bigBlock(c); });
      case "vocab":
      case "vocab-check":
        return paginate(CF.chars, 2, function (c) { return wordBlock(c); });
      case "pinyin-write": {
        var h = "";
        CF.chars.forEach(function (w) {
          if (CF.showPinyin && w.pinyin) h += '<div class="text-sm zh-faded mb-1">' + esc(w.pinyin) + "</div>";
          h += traceRows(w, Math.max(Array.from(w.hanzi).length, 2));
        });
        if (!CF.chars.length) h += gridRows(totalRows);
        return [h];
      }
      case "paragraph": {
        var flat = flatChars();
        var body = "";
        for (var i = 0; i < flat.length || i === 0; i += CF.perRow) {
          var row = flat.slice(i, i + CF.perRow);
          if (!row.length && i > 0) break;
          if (CF.showPinyin) {
            body += '<div class="grid text-center text-xs zh-faded" style="grid-template-columns:repeat(' + CF.perRow + ',minmax(0,1fr))">';
            for (var j = 0; j < CF.perRow; j++) body += "<div>" + (row[j] ? esc(row[j].py) : "") + "</div>";
            body += "</div>";
          }
          body += '<div class="grid" style="grid-template-columns:repeat(' + CF.perRow + ',minmax(0,1fr))">';
          for (var k = 0; k < CF.perRow; k++) {
            var show = k < CF.faintCount && row[k];
            body += shapeCell(show ? traceCharSpan(row[k].ch) : "");
          }
          body += "</div>";
          if (i >= flat.length) break;
        }
        body += gridRows(CF.blankRows);
        return [body];
      }
      case "lined-paper": {
        var lh = "";
        CF.chars.forEach(function (w) {
          lh += '<div class="mb-4 break-inside-avoid">';
          if (CF.showPinyin && w.pinyin) lh += '<div class="text-sm zh-faded mb-1">' + esc(w.pinyin) + "</div>";
          lh += '<div class="border-t border-b border-[#dccfb8] py-1 flex gap-2 items-center">';
          Array.from(w.hanzi).forEach(function (ch, idx) {
            lh += '<span style="font-size:' + (CF.fontSize / 50) + 'em">' +
              (idx < CF.faintCount ? traceCharSpan(ch) : '<span class="zh">' + esc(ch) + "</span>") + "</span>";
          });
          lh += "</div></div>";
        });
        for (var e = 0; e < CF.blankRows; e++) lh += '<div class="border-t border-[#dccfb8] h-10"></div>';
        return [lh];
      }
      case "grid-paper": {
        /* giấy ô trống: luôn đủ ít nhất 1 trang đầy (14 hàng) */
        var pages = [], rowsPerPage = 14;
        var rows = Math.max(totalRows, rowsPerPage);
        for (var p = 0; p * rowsPerPage < rows; p++) {
          pages.push(gridRows(Math.min(rowsPerPage, rows - p * rowsPerPage)));
        }
        return pages.length ? pages : [gridRows(rowsPerPage)];
      }
      case "cover": {
        function field(label) {
          return '<div class="border-2 border-[#dccfb8] rounded-md px-3 py-2 text-sm" style="color:#999">' + label + ": ________________</div>";
        }
        return ['<div class="min-h-[820px] flex flex-col items-center justify-center text-center gap-6">' +
          '<div class="grid-cell relative" style="width:112px;height:112px;--cell-c:' + cellColorVar(CF.cellColor) + '">' + cellShape() +
          '<span class="zh" style="font-size:4em;opacity:' + Math.max(CF.opacity / 100, 0.5) + '">练</span></div>' +
          '<h2 class="text-3xl font-extrabold">' + esc(CF.title || "Sổ luyện viết chữ Hán") + "</h2>" +
          (CF.nameDate ? '<div class="w-72 space-y-3 text-left">' + field("Họ tên") + field("Lớp") + field("Năm học") + "</div>" : "") +
          "</div>"];
      }
      default: return [""];
    }
  }

  function paginate(items, per, fn) {
    var pages = [], cur = [];
    items.forEach(function (it, i) {
      if (i && i % per === 0) { pages.push(cur.join("")); cur = []; }
      cur.push(fn(it));
    });
    if (cur.length) pages.push(cur.join(""));
    return pages.length ? pages : [""];
  }

  /* tách 1 dòng "hanzi pinyin nghĩa": các token pinyin đứng đầu (chỉ chứa chữ cái
     latin + dấu thanh pinyin), dừng ở token đầu tiên chứa ký tự Việt đặc trưng */
  function parseLine(line) {
    var tokens = String(line).trim().split(/\s+/);
    if (!tokens.length) return null;
    var pyRe = /^[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+$/;
    var hz = tokens[0];
    var py = [], mean = [];
    for (var i = 1; i < tokens.length; i++) {
      if (!mean.length && pyRe.test(tokens[i])) py.push(tokens[i]);
      else mean.push(tokens[i]);
    }
    return { hanzi: hz, pinyin: py.join(" "), meaning: mean.join(" ") };
  }

  /* ---------- field helpers (mọi control có data-key) ---------- */
  function groupCard(title, inner) {
    return '<div class="no-print card shadow-neo p-4 space-y-2">' +
      '<h3 class="font-bold">' + title + "</h3>" + inner + "</div>";
  }
  function textInput(label, key) {
    return '<label class="block text-sm font-bold">' + label +
      '<input type="text" data-key="' + key + '" value="' + esc(CF[key]) +
      '" class="mt-1 w-full border-2 border-[var(--nhai-border)] rounded-lg px-3 py-2 bg-[var(--nhai-bg)] text-sm font-normal"></label>';
  }
  function checkRow(label, key, checked, extra) {
    return '<label class="flex items-center gap-2 text-sm font-semibold cursor-pointer">' +
      '<input type="checkbox" data-key="' + key + '"' + (checked ? " checked" : "") + (extra || "") + "> " + label + "</label>";
  }
  function radioRow(label, key, options) {
    var h = label ? '<div class="text-sm font-bold">' + label + "</div>" : "";
    options.forEach(function (o) {
      h += '<label class="flex items-center gap-2 text-sm font-semibold cursor-pointer">' +
        '<input type="radio" name="r-' + key + '" data-key="' + key + '" value="' + esc(o.v) + '"' +
        (CF[key] === o.v ? " checked" : "") + "> " + o.label + "</label>";
    });
    return h;
  }
  function checkGroup(label, arrKey, options) {
    var h = '<div class="text-sm font-bold">' + label + "</div>";
    options.forEach(function (o) {
      h += checkRow(o.label, arrKey, CF[arrKey].indexOf(o.v) >= 0, ' data-style="' + esc(o.v) + '"');
    });
    return h;
  }
  function scriptChecks() {
    /* checkbox 1 chọn: Khải thư ✓ / Hành thư */
    return '<div class="text-sm font-bold">Kiểu khung chữ</div>' +
      checkRow("Khải thư", "script", CF.script === "khai", ' data-value="khai"') +
      checkRow("Hành thư", "script", CF.script === "hanh", ' data-value="hanh"');
  }
  function stepper(label, key, min, max) {
    return '<div class="flex items-center justify-between gap-2 text-sm font-bold">' +
      "<span>" + label + "</span>" +
      '<span class="flex items-center gap-1">' +
      '<button type="button" data-step="' + key + '" data-dir="-1" data-min="' + min + '" data-max="' + max + '" class="w-7 h-7 rounded-md border-2 border-[var(--nhai-border)] font-bold leading-none hover:bg-[var(--nhai-bg)]">−</button>' +
      '<span data-val="' + key + '" class="w-8 text-center font-semibold">' + CF[key] + "</span>" +
      '<button type="button" data-step="' + key + '" data-dir="1" data-min="' + min + '" data-max="' + max + '" class="w-7 h-7 rounded-md border-2 border-[var(--nhai-border)] font-bold leading-none hover:bg-[var(--nhai-bg)]">+</button>' +
      "</span></div>";
  }
  function slider(label, key, min, max, suffix) {
    return '<label class="block text-sm font-bold">' + label +
      ' <span data-val="' + key + '" class="font-semibold text-[var(--nhai-main)]">' + CF[key] + (suffix || "") + "</span>" +
      '<input type="range" data-key="' + key + '" min="' + min + '" max="' + max + '" value="' + CF[key] +
      '" class="mt-1 w-full accent-[var(--nhai-main)]"></label>';
  }

  /* ---------- nhóm 1: Từ vựng cần luyện ---------- */
  var CHARS_TPLS = { "stroke-order": 1, "big-char": 1, "vocab": 1, "vocab-check": 1, "pinyin-write": 1, "paragraph": 1, "lined-paper": 1 };

  function charRowHtml(c, i) {
    return '<div class="group flex items-center gap-3 py-1.5 border-b border-[var(--nhai-border)]">' +
      '<span class="zh text-2xl font-bold w-12 text-center shrink-0">' + esc(c.hanzi) + "</span>" +
      '<span class="w-28 shrink-0"><span class="block text-sm zh">' + esc(c.pinyin) + "</span>" +
      '<span class="block text-xs font-bold tracking-wide">' + esc((c.hv || "").toUpperCase()) + "</span></span>" +
      '<input type="text" data-mean-i="' + i + '" value="' + esc(c.meaning) + '" placeholder="Nghĩa…"' +
      ' class="flex-1 min-w-0 border-2 border-[var(--nhai-border)] rounded px-2 py-1 bg-white text-sm">' +
      '<button type="button" data-del-char="' + i + '" aria-label="Xoá ' + esc(c.hanzi) +
      '" class="shrink-0 opacity-0 group-hover:opacity-100 font-bold leading-none px-1 hover:opacity-70" style="color:#c23b22">✕</button>' +
      "</div>";
  }
  function charRowsInner() {
    var h = '<div class="flex flex-wrap gap-1.5">' +
      '<button type="button" data-cf-help class="btn-ghost px-3 py-1.5 text-sm">Hướng dẫn nhập từ vựng</button>' +
      '<button type="button" data-cf-import class="btn-ghost px-3 py-1.5 text-sm">Nhập vào danh sách</button>' +
      '<button type="button" data-cf-ai class="btn-ghost px-3 py-1.5 text-sm">Format bằng AI</button></div>';
    h += '<div data-charrows>' + CF.chars.map(charRowHtml).join("") + "</div>";
    h += '<div class="flex items-center justify-between text-sm">' +
      '<span class="font-semibold"><span data-count>' + CF.chars.length + "</span> từ sẽ có trong bản in</span>" +
      '<button type="button" data-clear-chars class="font-semibold hover:underline" style="color:#c23b22">Xóa tất cả</button></div>';
    return h;
  }

  function modalShell(title, body) {
    return '<div data-modal class="hidden fixed inset-0 z-50 p-4 items-center justify-center no-print" style="background:rgba(0,0,0,.45)">' +
      '<div class="card shadow-neo p-4 w-full max-w-lg max-h-[80vh] overflow-y-auto" style="background:var(--nhai-bg)">' +
      '<div class="flex items-center justify-between mb-3"><h3 class="font-bold">' + title +
      '<button type="button" data-modal-close class="text-xl leading-none px-2 font-bold hover:opacity-70" aria-label="Đóng">✕</button></div>' +
      '<div data-modal-body>' + body + "</div></div></div>";
  }
  function helpModalBody() {
    return '<div class="text-sm space-y-2">' +
      "<p>Mỗi dòng 1 từ, theo dạng: <code class='font-bold'>hanzi pinyin nghĩa</code></p>" +
      "<p>Ví dụ:</p><pre class='bg-[var(--nhai-bg)] border-2 border-[var(--nhai-border)] rounded p-2 zh'>学习 xué xí học tập\n朋友 péng yǒu bạn bè</pre>" +
      "<p>Sau khi thêm, bạn vẫn sửa được pinyin / nghĩa ngay trong danh sách.</p></div>" +
      '<button type="button" data-modal-close class="btn-main px-4 py-2 text-sm mt-3">Đã hiểu</button>';
  }
  function importModalBody() {
    return '<label class="block text-sm font-bold">Danh sách từ (mỗi dòng: hanzi pinyin nghĩa)' +
      '<textarea data-import rows="6" class="mt-1 w-full border-2 border-[var(--nhai-border)] rounded-lg px-3 py-2 bg-white text-sm zh" placeholder="学习 xué xí học tập"></textarea></label>' +
      '<div class="flex justify-end gap-2 mt-3">' +
      '<button type="button" data-modal-close class="btn-ghost px-4 py-2 text-sm">Huỷ</button>' +
      '<button type="button" data-import-ok class="btn-main px-4 py-2 text-sm">Thêm vào danh sách</button></div>';
  }

  /* ---------- form 7 nhóm ---------- */
  function formHtml(id) {
    var h = "";
    if (CHARS_TPLS[id]) h += groupCard("Từ vựng cần luyện", charRowsInner());
    h += groupCard("Trang", textInput("Tiêu đề", "title") + checkRow("Tiêu đề + Họ tên/Ngày", "nameDate", CF.nameDate));
    h += groupCard("Loại ô", radioRow("", "cellType", [
      { v: "dien-tu", label: "Điền tự" }, { v: "mi", label: "Mễ tự" }, { v: "vuong", label: "Ô vuông" },
      { v: "hoi-cung", label: "Hồi cung" }, { v: "cuu-cung", label: "Cửu cung" }
    ]));
    h += groupCard("Màu ô", radioRow("", "cellColor", [
      { v: "green", label: "🟩 green" }, { v: "red", label: "🟥 red" },
      { v: "blue", label: "🟦 blue" }, { v: "gray", label: "⬜ gray" }
    ]));
    h += groupCard("Bố cục",
      stepper("Số ô mỗi hàng", "perRow", 6, 16) +
      stepper("Số hàng tô", "fillRows", 0, 12) +
      stepper("Số hàng trống", "blankRows", 0, 12) +
      slider("Số từ mờ", "faintCount", 0, 12, "/12"));
    h += groupCard("Chữ",
      scriptChecks() +
      radioRow("Nguồn nét", "strokeSource", [
        { v: "CNstrokeorder", label: '<span class="zh">笔顺</span> CNstrokeorder <span class="zh">永远</span>' },
        { v: "qingfeng", label: '<span class="zh">清风体</span> <span class="zh">永远</span>' }
      ]) +
      checkGroup("Kiểu chữ tô", "traceStyle", [
        { v: "faint", label: "Tô mờ" }, { v: "hollow", label: "Chữ rỗng" },
        { v: "dashed-hollow", label: "Rỗng nét đứt" }, { v: "thin-dashed", label: "Nét đứt mảnh" }
      ]) +
      slider("Độ đậm", "opacity", 0, 100, "%") +
      slider("Cỡ chữ", "fontSize", 50, 120, "%"));
    h += groupCard("Hiển thị", checkRow("Pinyin", "showPinyin", CF.showPinyin) + checkRow("Nghĩa", "showMeaning", CF.showMeaning));
    h += '<div class="no-print flex items-center justify-between gap-2">' +
      '<button type="button" data-reset class="btn-ghost px-3 py-1.5 text-sm">Khôi phục mặc định</button>' +
      '<p class="text-xs text-[var(--nhai-muted)] text-right">Bấm In rồi chọn “Lưu dưới dạng PDF” trong hộp thoại của trình duyệt.</p></div>';
    return h;
  }

  /* ---------- render preview theo tpl hiện tại ---------- */
  function renderPreviewFor(id) {
    var preview = page.querySelector("[data-preview]");
    var badge = page.querySelector("[data-pages]");
    if (!preview || !badge) return;
    var pages = buildPages(id);
    preview.innerHTML = pages.map(sheetHtml).join("");
    badge.textContent = pages.length + " trang";
  }

  /* ---------- render form view ---------- */
  function renderForm(id) {
    var t = TPL_BY_ID[id];
    cfLoadAll();
    CF.tpl = id;
    persist();

    var h = "";
    /* header tầng 1 */
    h += '<div class="no-print mb-2"><a href="create-file.html" class="text-sm font-semibold text-[var(--nhai-muted)] hover:text-[var(--nhai-main)]">‹ Thư viện mẫu</a></div>';
    h += '<div class="flex flex-wrap items-center gap-3 mb-4">' +
      '<h1 class="text-3xl font-extrabold">' + esc(t.name) + "</h1>" +
      '<span data-pages class="pill pill-active text-sm no-print">1 trang</span>' +
      '<button type="button" data-print class="no-print btn-main px-4 py-2 text-sm ml-auto">🔒 Đăng nhập để in</button>' +
      '<p class="no-print w-full text-sm text-[var(--nhai-muted)]">' + esc(t.desc) + "</p></div>";

    /* tầng 2: preview trái + form phải */
    h += '<div class="grid gap-6 items-start lg:grid-cols-[1fr_360px]">';
    h += '<section aria-label="Xem trước bản in" data-preview class="min-w-0"></section>';
    h += '<div class="space-y-4" data-formcol>';
    h += formHtml(id);
    h += switcherHtml(id);
    h += modalShell("Hướng dẫn nhập từ vựng", helpModalBody());
    h += "</div></div>";

    page.innerHTML = h;
    wireForm(id);
    renderPreviewFor(id);
    syncPrintBtn();
  }

  function switcherHtml(curId) {
    var cur = TPL_BY_ID[curId] || {};
    var h = '<div class="no-print card shadow-neo p-4 space-y-2">';
    h += '<h3 class="font-bold">Mẫu in cùng loại</h3>';
    h += '<p class="text-xs text-[var(--nhai-muted)]">Đổi mẫu không mất nội dung</p>';
    TPLS.forEach(function (t) {
      if (t.group !== cur.group) return;
      var active = t.id === curId ? " pill-active" : "";
      h += '<a href="create-file.html?tpl=' + encodeURIComponent(t.id) + '" data-switch="' + esc(t.id) +
        '" class="pill block text-center text-sm font-semibold hover:opacity-80' + active + '">' + esc(t.name) + "</a>";
    });
    h += "</div>";
    return h;
  }

  /* ---------- wiring form ---------- */
  function wireForm(id) {
    var preview = page.querySelector("[data-preview]");
    var badge = page.querySelector("[data-pages]");
    var modal = page.querySelector("[data-modal]");
    var modalTitle = modal.querySelector("h3");

    function renderPreview() { renderPreviewFor(id); }
    function refreshCharRows() {
      var rows = page.querySelector("[data-charrows]");
      if (rows) rows.innerHTML = CF.chars.map(charRowHtml).join("");
      var count = page.querySelector("[data-count]");
      if (count) count.textContent = CF.chars.length;
    }
    function stepVal(key, dir, btn) {
      /* min/max khai báo trên chính nút stepper (input ẩn không tồn tại) */
      var min = btn ? parseInt(btn.getAttribute("data-min"), 10) : 0;
      var max = btn ? parseInt(btn.getAttribute("data-max"), 10) : 99;
      var v = (parseInt(CF[key], 10) || 0) + dir;
      CF[key] = Math.min(max, Math.max(min, v));
      var val = page.querySelector('[data-val="' + key + '"]');
      if (val) val.textContent = CF[key];
      persist();
      renderPreview();
    }

    /* mọi control có data-key → input/change → CF[k]=… → persist() → renderPreview() */
    page.addEventListener("input", function (e) {
      var t = e.target;
      if (!t.hasAttribute) return;
      if (t.hasAttribute("data-mean-i")) {
        var row = CF.chars[parseInt(t.getAttribute("data-mean-i"), 10)];
        if (row) { row.meaning = t.value; persist(); renderPreview(); }
        return;
      }
      if (t.hasAttribute("data-key")) onControl(t);
    });
    page.addEventListener("change", function (e) {
      var t = e.target;
      if (t && t.hasAttribute && t.hasAttribute("data-key")) onControl(t);
    });
    function onControl(t) {
      var k = t.getAttribute("data-key");
      if (t.type === "checkbox") {
        if (t.hasAttribute("data-style")) {
          /* checkbox group traceStyle */
          var sv = t.getAttribute("data-style");
          var arr = CF[k].slice();
          var ix = arr.indexOf(sv);
          if (t.checked && ix < 0) arr.push(sv);
          if (!t.checked && ix >= 0) arr.splice(ix, 1);
          if (!arr.length) arr.push("faint");
          CF[k] = arr;
          syncChecks(); /* uncheck ô cuối → về Tô mờ, giữ UI khớp preview */
        } else if (t.hasAttribute("data-value")) {
          /* checkbox 1 chọn (script) — bỏ chọn 1 trong 2 thì về lại cái còn lại */
          if (t.checked) CF[k] = t.getAttribute("data-value");
          else CF[k] = t.getAttribute("data-value") === "khai" ? "hanh" : "khai";
          syncChecks();
        } else {
          CF[k] = t.checked;
        }
      } else if (t.type === "radio") {
        CF[k] = t.value;
      } else if (t.type === "range" || t.type === "number") {
        CF[k] = parseInt(t.value, 10) || 0;
        var val = page.querySelector('[data-val="' + k + '"]');
        if (val) val.textContent = CF[k];
      } else {
        CF[k] = t.value;
      }
      persist();
      renderPreview();
    }

    /* đồng bộ lại checked state của các checkbox nhóm (traceStyle / script) sau khi CF đổi */
    function syncChecks() {
      page.querySelectorAll("input[data-style]").forEach(function (cb) {
        var v = cb.getAttribute("data-style");
        cb.checked = Array.isArray(CF.traceStyle) && CF.traceStyle.indexOf(v) >= 0;
      });
      page.querySelectorAll("input[data-value]").forEach(function (cb) {
        cb.checked = CF.script === cb.getAttribute("data-value");
      });
    }

    page.addEventListener("click", function (e) {
      var t = e.target.closest ? e.target.closest("button, a") : null;
      if (!t || !page.contains(t)) return;
      if (t.hasAttribute("data-step")) {
        e.preventDefault();
        stepVal(t.getAttribute("data-step"), parseInt(t.getAttribute("data-dir"), 10), t);
      } else if (t.hasAttribute("data-del-char")) {
        CF.chars.splice(parseInt(t.getAttribute("data-del-char"), 10), 1);
        persist(); refreshCharRows(); renderPreview();
      } else if (t.hasAttribute("data-clear-chars")) {
        CF.chars = [];
        persist(); refreshCharRows(); renderPreview();
        NHAI.toast("Đã xoá tất cả từ.");
      } else if (t.hasAttribute("data-cf-help")) {
        modalTitle.innerHTML = "Hướng dẫn nhập từ vựng";
        modal.querySelector("[data-modal-body]").innerHTML = helpModalBody();
        modal.classList.remove("hidden"); modal.classList.add("flex");
      } else if (t.hasAttribute("data-cf-import")) {
        modalTitle.innerHTML = "Nhập vào danh sách";
        modal.querySelector("[data-modal-body]").innerHTML = importModalBody();
        modal.classList.remove("hidden"); modal.classList.add("flex");
      } else if (t.hasAttribute("data-import-ok")) {
        var ta = modal.querySelector("[data-import]");
        var lines = String(ta ? ta.value : "").split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
        var added = 0;
        lines.forEach(function (line) {
          var p = parseLine(line);
          if (!p || !p.hanzi || cfFind(p.hanzi)) return;
          var hv = Array.from(p.hanzi).map(function (ch) {
            return (charInfo(ch).hanViet || "").split(/\s+/)[0] || "";
          }).join(" ").trim().toUpperCase();
          CF.chars.push({ hanzi: p.hanzi, pinyin: p.pinyin, hv: hv, meaning: p.meaning });
          added++;
        });
        persist(); refreshCharRows(); renderPreview();
        modal.classList.add("hidden"); modal.classList.remove("flex");
        NHAI.toast(added ? "Đã thêm " + added + " từ." : "Không có từ mới nào được thêm.");
      } else if (t.hasAttribute("data-cf-ai")) {
        /* mock "AI": chuẩn hoá pinyin + Hán Việt IN HOA từ dữ liệu có sẵn */
        CF.chars.forEach(function (c) {
          c.pinyin = c.pinyin.replace(/\s+/g, " ").trim();
          var hv = Array.from(c.hanzi).map(function (ch) {
            return (charInfo(ch).hanViet || "").split(/\s+/)[0] || "";
          }).join(" ").trim();
          if (hv) c.hv = hv.toUpperCase();
          if (!c.meaning) c.meaning = charInfo(Array.from(c.hanzi)[0] || "").meaning || "";
        });
        persist(); refreshCharRows(); renderPreview();
        NHAI.toast("Đã format " + CF.chars.length + " từ");
      } else if (t.hasAttribute("data-modal-close")) {
        modal.classList.add("hidden"); modal.classList.remove("flex");
      } else if (t.hasAttribute("data-reset")) {
        cfReset(id);
        renderForm(id);
        NHAI.toast("Đã khôi phục mặc định.");
      } else if (t.hasAttribute("data-switch")) {
        e.preventDefault();
        var nid = t.getAttribute("data-switch");
        if (TPL_BY_ID[nid] && nid !== id) {
          CF.tpl = nid; persist();
          history.replaceState(null, "", "create-file.html?tpl=" + encodeURIComponent(nid));
          renderForm(nid); /* giữ nguyên CF state */
        }
      }
    });

    /* click nền modal → đóng */
    modal.addEventListener("click", function (e) {
      if (e.target === modal) { modal.classList.add("hidden"); modal.classList.remove("flex"); }
    });
  }

  /* ---------- nút in / đăng nhập (gate FREEHSK/mockLogin) ---------- */
  function syncPrintBtn() {
    var btn = document.querySelector("[data-print]");
    if (!btn) return;
    if (canPrint()) {
      btn.textContent = "🖨 In / Lưu PDF";
      btn.onclick = function () { window.print(); };
    } else {
      btn.textContent = "🔒 Đăng nhập để in";
      btn.onclick = function () { NHAI.openLogin(); };
    }
  }

  /* sau khi login qua modal, cập nhật lại nút in */
  document.addEventListener("click", function () { setTimeout(syncPrintBtn, 300); });

  /* ---------- boot ---------- */
  window.addEventListener("beforeunload", function () {
    /* chỉ ghi khi đang ở form view — qua catalog không được xoá state đã lưu */
    if (CF.tpl) persist();
  });
  function boot() {
    page = document.querySelector("#cf-root") || document.querySelector("[data-page]");
    if (!page) return;
    var tpl = NHAI.q("tpl");
    if (tpl && TPL_BY_ID[tpl]) renderForm(tpl);
    else {
      /* catalog: reset CF trong bộ nhớ (KHÔNG ghi) — giữ nguyên state đã lưu trong sessionStorage */
      CF = cfDefaults();
      renderCatalog();
    }
  }
  if (document.readyState === "complete") boot();
  else document.addEventListener("DOMContentLoaded", boot);
})();
