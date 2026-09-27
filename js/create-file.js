/* Nhai HSK clone — Tạo file luyện viết (PLAN-08).
   Hub 9 mẫu + template view ?tpl=<tên> với preview A4 render động + gate mã FREEHSK + window.print(). */
(function () {
  "use strict";

  var TPLS = (window.NHAI_DATA && NHAI_DATA.templates) || {};
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

  var FALLBACK_RADICALS = [
    { char: "一", hanViet: "Nhất" }, { char: "丨", hanViet: "Cổn" },
    { char: "丶", hanViet: "Chủ" }, { char: "丿", hanViet: "Phiệt" },
    { char: "乙", hanViet: "Ất" }, { char: "亅", hanViet: "Quyết" },
    { char: "二", hanViet: "Nhị" }, { char: "人", hanViet: "Nhân" },
    { char: "亠", hanViet: "Đầu" }, { char: "二", hanViet: "Nhị" }
  ];

  var FALLBACK_WORDS = [
    { hanzi: "你好", pinyin: "nǐ hǎo", hanViet: "NHĨ HẢO", meaning: "Xin chào", example: { zh: "李明，你好。", vi: "Chào Lý Minh" } },
    { hanzi: "王老师", pinyin: "Wáng lǎoshī", hanViet: "VƯƠNG LÃO SƯ", meaning: "Cô Vương", example: { zh: "王老师，您好。", vi: "Xin chào cô Vương" } },
    { hanzi: "大家", pinyin: "dàjiā", hanViet: "ĐẠI GIA", meaning: "Mọi người", example: { zh: "大家好，我是新学生。", vi: "Chào mọi người, tôi là học sinh mới" } },
    { hanzi: "好", pinyin: "hǎo", hanViet: "HẢO", meaning: "Tốt, khỏe", example: { zh: "老师，您好。", vi: "Xin chào thầy" } }
  ];

  function vocabSource() {
    var v = window.NHAI_DATA && NHAI_DATA.vocab;
    var lesson = v && v.hsk1 && v.hsk1["lesson-1"];
    return (lesson && lesson.words && lesson.words.length) ? lesson.words : FALLBACK_WORDS;
  }

  function charInfo(ch) {
    var h = window.NHAI_DATA && NHAI_DATA.hanzi;
    if (h && h.chars && h.chars[ch]) return h.chars[ch];
    return CHAR_INFO_FALLBACK[ch] || { pinyin: "", hanViet: "", meaning: "" };
  }

  function radicalsList() {
    var r = window.NHAI_DATA && NHAI_DATA.radicals;
    return (r && r.length) ? r : FALLBACK_RADICALS;
  }

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function cell(inner, cls) {
    return '<div class="grid-cell ' + (cls || "") + '">' + (inner || "") + "</div>";
  }
  function fadedChar(ch, size) {
    return '<span class="zh zh-faded" style="font-size:' + (size || 1.6) + 'em">' + esc(ch) + "</span>";
  }
  function rowOf(cols, inner, cls) {
    var h = '<div class="grid ' + (cls || "") + '" style="grid-template-columns:repeat(' + cols + ',minmax(0,1fr))">';
    for (var i = 0; i < cols; i++) h += cell(inner);
    return h + "</div>";
  }
  /* 4 dòng kẻ pinyin (giấy 4 dòng) bên trong 1 ô / dải */
  function pyGuideInner() {
    var line = '<i style="display:block;border-top:1px solid #dccfb8"></i>';
    return '<div style="position:absolute;left:10%;right:10%;top:18%;bottom:18%;display:flex;flex-direction:column;justify-content:space-between">' +
      line + line + line + line + "</div>";
  }
  function diagSvg() {
    return '<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%">' +
      '<line x1="0" y1="0" x2="100" y2="100" stroke="#cfc4ae" stroke-width="1" stroke-dasharray="5 4" vector-effect="non-scaling-stroke"/></svg>';
  }
  function parseItems(input) {
    return String(input || "").trim().split(/[\s,、，]+/).filter(Boolean);
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

  /* ---------- gate mã ---------- */
  function hasCode() { try { return localStorage.getItem("nhai.fileCode") === "1"; } catch (e) { return false; } }
  function canPrint() { return NHAI.isLoggedIn() || hasCode(); }

  /* ================= HUB ================= */
  var SECTIONS = [
    { h2: "Mẫu chữ Hán", ids: ["stroke-order", "big-char"], cols: "md:grid-cols-2" },
    { h2: "Mẫu từ vựng", ids: ["vocab", "vocab-check", "copy", "cover"], cols: "md:grid-cols-2" },
    { h2: "Mẫu pinyin & ô trống", ids: ["pinyin-lines", "pinyin-write", "blank-grid"], cols: "md:grid-cols-3" }
  ];

  function miniFrame(inner) {
    return '<div class="rounded-md border-2 border-[#cfc4ae] bg-white text-[#17150f] p-2 aspect-[3/4] mb-3 overflow-hidden">' + inner + "</div>";
  }
  function miniCell(inner) { return '<div class="grid-cell">' + (inner || "") + "</div>"; }

  function mini(id) {
    var f = function (ch, sz) { return fadedChar(ch, sz || 1.1); };
    var pyG = pyGuideInner(), dg = diagSvg();
    switch (id) {
      case "stroke-order": return miniFrame(
        '<div class="grid grid-cols-4 mb-1">' +
          miniCell('<span class="zh" style="font-size:1.3em">永</span>') +
          miniCell('<span class="absolute top-0 left-0.5 text-[8px] font-bold" style="color:#c23b22">①</span>' + f("永")) +
          miniCell(f("永")) + miniCell(f("永")) + "</div>" +
        '<div class="grid grid-cols-4">' + miniCell(f("永")) + miniCell(f("永")) + miniCell(f("永")) + miniCell(f("永")) + "</div>");
      case "big-char": return miniFrame(
        '<div class="flex gap-1 h-full py-1"><div class="grid-cell w-1/3"><span class="zh" style="font-size:1.8em">永</span></div>' +
        '<div class="flex-1 grid grid-cols-2">' + miniCell(f("永")) + miniCell(f("永")) + miniCell(f("永")) + miniCell(f("永")) + "</div></div>");
      case "vocab": return miniFrame(
        '<div class="text-[8px] mb-0.5" style="color:#999">nǐ hǎo nǐ hǎo</div>' +
        '<div class="grid grid-cols-4">' + miniCell(f("你")) + miniCell(f("好")) + miniCell(f("你")) + miniCell(f("好")) + "</div>" +
        '<div class="grid grid-cols-4 mt-1">' + miniCell(f("你")) + miniCell(f("好")) + miniCell(f("你")) + miniCell(f("好")) + "</div>");
      case "vocab-check": return miniFrame(
        '<div class="text-[8px] mb-1" style="color:#999">你好 — Xin chào</div>' +
        '<div class="grid grid-cols-4">' + miniCell() + miniCell() + miniCell() + miniCell() + "</div>");
      case "copy": return miniFrame(
        '<div class="grid grid-cols-4">' +
          miniCell('<span class="zh font-bold" style="font-size:1.1em">你</span>') +
          miniCell('<span class="zh font-bold" style="font-size:1.1em">好</span>') +
          miniCell('<span class="zh font-bold" style="font-size:1.1em">你</span>') +
          miniCell('<span class="zh font-bold" style="font-size:1.1em">好</span>') + "</div>" +
        '<div class="grid grid-cols-4 mt-1">' + miniCell() + miniCell() + miniCell() + miniCell() + "</div>");
      case "cover": return miniFrame(
        '<div class="h-full flex flex-col items-center justify-center gap-1.5">' +
          '<span class="zh" style="font-size:2em">练</span>' +
          '<div class="text-[9px] font-bold">Sổ luyện viết</div>' +
          '<div class="w-3/4 border-t border-[#ccc]"></div><div class="w-3/4 border-t border-[#ccc]"></div></div>');
      case "pinyin-lines": return miniFrame(
        '<div class="text-[8px] mb-0.5" style="color:#999">nǐ hǎo</div>' +
        '<div class="grid grid-cols-4">' + miniCell(pyG) + miniCell(pyG) + miniCell(pyG) + miniCell(pyG) + "</div>");
      case "pinyin-write": return miniFrame(
        '<div class="grid grid-cols-4">' + miniCell() + miniCell() + miniCell() + miniCell() + "</div>" +
        '<div class="mx-1 mt-1 h-4 flex flex-col justify-between">' +
          '<i style="display:block;border-top:1px solid #dccfb8"></i><i style="display:block;border-top:1px solid #dccfb8"></i><i style="display:block;border-top:1px solid #dccfb8"></i></div>');
      case "blank-grid": return miniFrame(
        '<div class="grid grid-cols-4">' + miniCell(dg) + miniCell(dg) + miniCell(dg) + miniCell(dg) +
        miniCell(dg) + miniCell(dg) + miniCell(dg) + miniCell(dg) + "</div>");
      default: return miniFrame('<div class="grid grid-cols-4">' + miniCell() + miniCell() + miniCell() + miniCell() + "</div>");
    }
  }

  function renderHub() {
    var unlocked = hasCode();
    var h = "";
    h += '<h1 class="text-3xl font-extrabold">Tạo file</h1>';
    h += '<p class="zh text-[var(--nhai-muted)] mt-1">生成练习本 — Tạo bản in luyện viết chữ Hán theo thứ tự nét</p>';

    h += '<div class="card shadow-neo p-4 mt-5 flex flex-col md:flex-row md:items-center gap-3">' +
      '<div class="flex-1"><p class="font-bold">🔐 Cần mã tải file để in</p>' +
      '<p class="text-sm text-[var(--nhai-muted)]">Tham gia nhóm Facebook Nhai HSK, mã nằm ở phần mô tả nhóm.</p></div>';
    if (unlocked) {
      h += '<span class="font-bold text-green-600 whitespace-nowrap">✅ Đã mở khóa in</span>';
    } else {
      h += '<div class="flex gap-2">' +
        '<input data-code placeholder="Nhập mã" class="border-2 border-[var(--nhai-border)] rounded-lg px-3 py-2 bg-[var(--nhai-bg)] w-40">' +
        '<button type="button" data-unlock class="btn-main px-4 py-2 text-sm whitespace-nowrap">Mở khóa in</button></div>';
    }
    h += '<a href="https://www.facebook.com/groups/nhaihsk" target="_blank" rel="noopener" class="btn-ghost px-4 py-2 text-sm text-center whitespace-nowrap">Tham gia nhóm để lấy mã</a>';
    h += "</div>";

    SECTIONS.forEach(function (s) {
      h += '<h2 class="text-xl font-extrabold mt-8 mb-3">' + s.h2 + "</h2>";
      h += '<div class="grid gap-4 ' + s.cols + '">';
      s.ids.forEach(function (id) {
        var t = TPLS[id];
        if (!t) return;
        h += '<a href="create-file.html?tpl=' + encodeURIComponent(id) + '" class="card shadow-neo p-4 block hover:-translate-y-0.5 transition-transform">' +
          mini(id) +
          '<h3 class="font-bold">' + esc(t.name) + "</h3>" +
          '<p class="text-sm text-[var(--nhai-muted)] mt-0.5">' + esc(t.desc) + "</p></a>";
      });
      h += "</div>";
    });

    page.innerHTML = h;

    var unlockBtn = page.querySelector("[data-unlock]");
    if (unlockBtn) {
      unlockBtn.addEventListener("click", function () {
        var inp = page.querySelector("[data-code]");
        var code = inp ? inp.value.trim().toUpperCase() : "";
        if (code === "FREEHSK") {
          try { localStorage.setItem("nhai.fileCode", "1"); } catch (e) { /* silent */ }
          NHAI.toast("Đã mở khóa in! Bạn có thể in từ các trang mẫu. 🎉");
          renderHub();
        } else {
          NHAI.toast("Mã không đúng. Mã nằm ở mô tả nhóm Facebook");
        }
      });
      var codeInp = page.querySelector("[data-code]");
      codeInp.addEventListener("keydown", function (e) { if (e.key === "Enter") unlockBtn.click(); });
    }
  }

  /* ================= TEMPLATE VIEW ================= */
  function sheetHtml(content) {
    return '<div class="print-page sheet card shadow-neo mx-auto w-full max-w-[794px] p-10 mb-8">' +
      '<div class="flex justify-between text-sm mb-4 pb-2 border-b-2 border-[#dccfb8]">' +
        "<span>Họ tên: ______________</span><span>Ngày: ____________</span></div>" +
      '<div class="sheet-body">' + content + "</div>" +
      '<div class="text-center text-xs mt-6 pt-2 border-t border-[#dccfb8]" style="color:#999">nhaihsk.com · facebook.com/groups/nhaihsk</div>' +
      "</div>";
  }

  function strokeBlock(ch) {
    var h = '<div class="mb-5 break-inside-avoid">';
    h += '<div class="grid mb-1" style="grid-template-columns:repeat(6,minmax(0,1fr))">';
    h += cell('<span class="zh" style="font-size:2.4em">' + esc(ch) + "</span>");
    for (var i = 0; i < 5; i++) {
      h += cell('<span class="absolute top-0.5 left-1 text-[10px] font-bold" style="color:#c23b22">' + NUMS[i] + "</span>" + fadedChar(ch, 1.7));
    }
    h += "</div>";
    for (var r = 0; r < 2; r++) h += rowOf(8, fadedChar(ch, 1.5));
    return h + "</div>";
  }

  function bigBlock(ch, cfg) {
    var info = charInfo(ch);
    var h = '<div class="flex gap-3 mb-6 items-stretch break-inside-avoid">';
    h += '<div class="grid-cell w-32 shrink-0"><span class="zh" style="font-size:4.2em">' + esc(ch) + "</span></div>";
    h += '<div class="flex-1 min-w-0">';
    var top = '<div class="text-sm mb-2">';
    if (cfg.showPy) top += '<span class="font-bold">' + esc(info.pinyin || "—") + "</span>";
    if (info.hanViet) top += ' <span style="color:#888">· ' + esc(info.hanViet) + "</span>";
    if (cfg.showMeaning && info.meaning) top += ' <span>— ' + esc(info.meaning) + "</span>";
    h += top + "</div>";
    h += rowOf(6, fadedChar(ch, 1.6));
    return h + "</div></div>";
  }

  function resolveWords(items) {
    var src = vocabSource(), map = {};
    src.forEach(function (w) { map[w.hanzi] = w; });
    if (!items.length) return src;
    return items.map(function (t) {
      return map[t] || { hanzi: t, pinyin: "", hanViet: "", meaning: "", example: null };
    });
  }

  function wordBlock(w, cfg, check) {
    var chars = Array.from(w.hanzi);
    var cols = Math.max(chars.length, 2);
    var h = '<div class="mb-6 break-inside-avoid">';
    h += '<div class="flex items-baseline gap-2 flex-wrap mb-1">';
    h += '<span class="zh font-bold" style="font-size:1.4em">' + esc(w.hanzi) + "</span>";
    if (cfg.showPy && w.pinyin) h += '<span class="text-sm">(' + esc(w.pinyin) + ")</span>";
    h += '<span class="text-sm font-semibold">' + esc(w.hanViet || "") +
      (cfg.showMeaning && w.meaning ? " — " + esc(w.meaning) : "") + "</span>";
    h += "</div>";
    if (w.example) {
      h += '<div class="text-sm zh mb-0.5">' + esc(w.example.zh) + "</div>";
      h += '<div class="text-xs mb-2" style="color:#888">' + esc(w.example.vi || "") + "</div>";
    }
    if (cfg.showPy && w.pinyin) {
      var pys = String(w.pinyin).trim().split(/\s+/);
      var perChar = pys.length === chars.length;
      h += '<div class="grid" style="grid-template-columns:repeat(' + cols + ',minmax(0,1fr))">';
      for (var i = 0; i < cols; i++) {
        h += '<div class="text-center text-xs zh-faded">' +
          (perChar ? esc(pys[i] || "") : (i === 0 ? esc(w.pinyin) : "")) + "</div>";
      }
      h += "</div>";
    }
    for (var r = 0; r < cfg.rows; r++) {
      h += '<div class="grid" style="grid-template-columns:repeat(' + cols + ',minmax(0,1fr))">';
      for (var c = 0; c < cols; c++) {
        h += cell(check ? "" : fadedChar(chars[c] || "", 1.5));
      }
      h += "</div>";
    }
    return h + "</div>";
  }

  function pageVocab(items, cfg, check) {
    var words = resolveWords(items);
    return paginate(words, check ? 3 : 2, function (w) { return wordBlock(w, cfg, check); });
  }

  function copyBlock(ch, rows) {
    var h = '<div class="mb-4 break-inside-avoid">';
    h += rowOf(8, '<span class="zh font-bold" style="font-size:1.5em">' + esc(ch) + "</span>");
    for (var r = 1; r < rows; r++) h += rowOf(8, "");
    return h + "</div>";
  }

  function pagePinyinLines(items, cfg) {
    var syl = items.length ? items : ["nǐ", "hǎo", "mā", "ma", "xiè", "xie"];
    var lines = [];
    for (var i = 0; i < syl.length; i += 2) lines.push(syl.slice(i, i + 2).join(" "));
    lines = lines.slice(0, Math.max(cfg.rows, 3));
    var h = "";
    lines.forEach(function (line) {
      h += '<div class="mb-4 break-inside-avoid">';
      h += '<div class="text-sm zh-faded mb-1">' + esc(line) + "</div>";
      h += rowOf(8, pyGuideInner());
      h += "</div>";
    });
    return [h];
  }

  function pagePinyinWrite(cfg) {
    var h = "";
    for (var r = 0; r < cfg.rows; r++) {
      h += rowOf(8, "");
      h += '<div class="mx-[6%] my-3 h-10 flex flex-col justify-between">' +
        '<i style="display:block;border-top:1px solid #dccfb8"></i>' +
        '<i style="display:block;border-top:1px solid #dccfb8"></i>' +
        '<i style="display:block;border-top:1px solid #dccfb8"></i>' +
        '<i style="display:block;border-top:1px solid #dccfb8"></i></div>';
    }
    return [h];
  }

  function pageBlankGrid() {
    var h = '<div class="grid" style="grid-template-columns:repeat(12,minmax(0,1fr))">';
    for (var i = 0; i < 12 * 14; i++) h += cell(diagSvg());
    return [h + "</div>"];
  }

  function pageCover() {
    function field(label) {
      return '<div class="border-2 border-[#dccfb8] rounded-md px-3 py-2 text-sm" style="color:#999">' + label + ": ________________</div>";
    }
    return ['<div class="min-h-[820px] flex flex-col items-center justify-center text-center gap-6">' +
      '<div class="grid-cell" style="width:112px;height:112px"><span class="zh" style="font-size:4em">练</span></div>' +
      '<h2 class="text-3xl font-extrabold">Sổ luyện viết chữ Hán</h2>' +
      '<div class="w-72 space-y-3 text-left">' + field("Họ tên") + field("Lớp") + field("Năm học") + "</div></div>"];
  }

  function pageRadicals(cfg) {
    var list = radicalsList();
    var perRow = 12, rowsPer = Math.max(cfg.rows, 3) * 4, per = perRow * rowsPer;
    var pages = [];
    for (var i = 0; i < list.length; i += per) {
      var h = '<div class="grid" style="grid-template-columns:repeat(12,minmax(0,1fr))">';
      for (var j = i; j < Math.min(i + per, list.length); j++) {
        var r = list[j];
        h += '<div class="grid-cell flex-col"><span class="zh" style="font-size:1.6em">' + esc(r.char) + "</span>" +
          '<span style="font-size:9px;color:#888">' + esc(r.hanViet || "") + "</span></div>";
      }
      pages.push(h + "</div>");
    }
    return pages;
  }

  function buildPages(id, items, cfg) {
    switch (id) {
      case "stroke-order": return paginate(items, 2, function (ch) { return strokeBlock(ch); });
      case "big-char": return paginate(items, 3, function (ch) { return bigBlock(ch, cfg); });
      case "vocab": return pageVocab(items, cfg, false);
      case "vocab-check": return pageVocab(items, cfg, true);
      case "copy":
        return [items.length ? items.map(function (ch) { return copyBlock(ch, cfg.rows); }).join("") : ""];
      case "pinyin-lines": return pagePinyinLines(items, cfg);
      case "pinyin-write": return pagePinyinWrite(cfg);
      case "blank-grid": return pageBlankGrid();
      case "cover": return pageCover();
      case "radicals": return pageRadicals(cfg);
      default: return [""];
    }
  }

  function renderTemplate(id) {
    var t = TPLS[id];
    var state = {
      input: t.defInput || "",
      rows: 3,
      showPy: true,
      showMeaning: true
    };
    var f = t.fields || {};

    var h = "";
    h += '<div class="no-print mb-2"><a href="create-file.html" class="text-sm font-semibold text-[var(--nhai-muted)] hover:text-[var(--nhai-main)]">← Thư viện mẫu</a></div>';
    h += '<div class="flex flex-wrap items-center gap-3 mb-4">' +
      '<h1 class="text-3xl font-extrabold">' + esc(t.name) + "</h1>" +
      '<span data-pages class="pill pill-active text-sm">1 trang</span>' +
      '<button type="button" data-print class="btn-main px-4 py-2 text-sm ml-auto">🔒 Đăng nhập để in</button></div>';
    h += '<div class="grid lg:grid-cols-[300px_minmax(0,1fr)] gap-6 items-start">';

    /* form cấu hình */
    h += '<form data-cfg class="no-print card shadow-neo p-4 space-y-4 lg:sticky lg:top-4" onsubmit="return false">';
    var any = false;
    if (f.input) {
      any = true;
      h += '<label class="block text-sm font-bold">Danh sách chữ/từ' +
        '<textarea data-input rows="2" class="mt-1 w-full border-2 border-[var(--nhai-border)] rounded-lg px-3 py-2 bg-[var(--nhai-bg)] text-sm">' + esc(state.input) + "</textarea></label>";
    }
    if (f.rows) {
      any = true;
      h += '<label class="block text-sm font-bold">Số hàng ô (3-6)' +
        '<input data-rows type="number" min="3" max="6" value="' + state.rows + '" class="mt-1 w-full border-2 border-[var(--nhai-border)] rounded-lg px-3 py-2 bg-[var(--nhai-bg)] text-sm"></label>';
    }
    if (f.py) {
      any = true;
      h += '<label class="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" data-py checked> Hiện pinyin</label>';
    }
    if (f.mean) {
      any = true;
      h += '<label class="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" data-mean checked> Hiện nghĩa</label>';
    }
    if (!any) h += '<p class="text-sm text-[var(--nhai-muted)]">Mẫu này không cần cấu hình.</p>';
    h += '<p class="text-xs text-[var(--nhai-muted)]">Đổi cấu hình → bản xem trước cập nhật ngay.</p>';
    h += "</form>";

    /* preview A4 */
    h += '<section aria-label="Xem trước bản in" data-preview class="min-w-0"></section>';
    h += "</div>";

    page.innerHTML = h;

    var form = page.querySelector("[data-cfg]");
    var preview = page.querySelector("[data-preview]");
    var badge = page.querySelector("[data-pages]");

    function update() {
      var inp = form.querySelector("[data-input]");
      var rowsInp = form.querySelector("[data-rows]");
      var pyCb = form.querySelector("[data-py]");
      var meanCb = form.querySelector("[data-mean]");
      if (inp) state.input = inp.value;
      if (rowsInp) {
        var v = parseInt(rowsInp.value, 10);
        if (isNaN(v)) v = 3;
        state.rows = Math.min(6, Math.max(3, v));
      }
      if (pyCb) state.showPy = pyCb.checked;
      if (meanCb) state.showMeaning = meanCb.checked;
      var items = parseItems(state.input);
      var pages = buildPages(id, items, state);
      preview.innerHTML = pages.map(sheetHtml).join("");
      badge.textContent = pages.length + " trang";
    }

    form.addEventListener("input", update);
    form.addEventListener("change", update);
    update();
    syncPrintBtn();
  }

  /* ---------- nút in / đăng nhập ---------- */
  function syncPrintBtn() {
    var btn = document.querySelector("[data-print]");
    if (!btn) return;
    if (canPrint()) {
      btn.textContent = "🖨️ In / Lưu PDF";
      btn.onclick = function () { window.print(); };
    } else {
      btn.textContent = "🔒 Đăng nhập để in";
      btn.onclick = function () { NHAI.openLogin(); };
    }
  }

  /* sau khi login qua modal, cập nhật lại nút in */
  document.addEventListener("click", function () { setTimeout(syncPrintBtn, 300); });

  /* ---------- boot ---------- */
  function boot() {
    page = document.querySelector("[data-page]");
    if (!page) return;
    var tpl = NHAI.q("tpl");
    if (tpl && TPLS[tpl]) renderTemplate(tpl);
    else renderHub();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
