/* Nhai HSK clone — pinyin utilities (PLAN-02).
   NHAI.toPinyin("ni3")  -> "nǐ"   (số -> dấu thanh, đặt đúng nguyên âm chính)
   NHAI.toPinyin("lv4")  -> "lǜ"   (v -> ü)
   NHAI.toPinyin("ni3 hao3") -> "nǐ hǎo" (nhiều âm tiết)
   NHAI.shuffle(arr) -> bản sao xáo trộn Fisher-Yates */
(function () {
  "use strict";
  window.NHAI = window.NHAI || {};
  var NHAI = window.NHAI;

  var MARKS = {
    "a": ["ā", "á", "ǎ", "à", "a"],
    "o": ["ō", "ó", "ǒ", "ò", "o"],
    "e": ["ē", "é", "ě", "è", "e"],
    "i": ["ī", "í", "ǐ", "ì", "i"],
    "u": ["ū", "ú", "ǔ", "ù", "u"],
    "ü": ["ǖ", "ǘ", "ǚ", "ǜ", "ü"]
  };
  /* Thứ tự ưu tiên đặt dấu: a > o > e > i > u > ü
     Ngoại lệ: "iu" -> dấu trên u (liù), "ui" -> dấu trên i (huì) */
  var PRIORITY = ["a", "o", "e", "i", "u", "ü"];

  function markVowel(syl, tone) {
    var target = null;
    if (syl.indexOf("iu") !== -1) target = "u";
    else if (syl.indexOf("ui") !== -1) target = "i";
    else {
      for (var i = 0; i < PRIORITY.length; i++) {
        if (syl.indexOf(PRIORITY[i]) !== -1) { target = PRIORITY[i]; break; }
      }
    }
    if (!target) return syl;
    var marked = MARKS[target][Math.min(Math.max(tone, 1), 5) - 1];
    if (!marked) return syl;
    var idx = syl.indexOf(target);
    return syl.slice(0, idx) + marked + syl.slice(idx + 1);
  }

  function convertToken(tok) {
    var m = /^([a-züv:]+)(\d)?$/.exec(tok);
    if (!m) return tok; // dấu câu hoặc đã có sẵn dấu -> giữ nguyên
    var syl = m[1].replace(/u[:：]/g, "ü").replace(/v/g, "ü");
    var tone = m[2] ? parseInt(m[2], 10) : 5;
    if (tone < 1 || tone > 5) tone = 5;
    return markVowel(syl, tone);
  }

  NHAI.toPinyin = function (input) {
    if (input === null || input === undefined) return "";
    var s = String(input).toLowerCase()
      .replace(/([a-züv:]+)(\d)/g, "$1$2 ") // "ping2guo3" -> "ping2 guo3 "
      .trim();
    if (!s) return "";
    return s.split(/\s+/).map(convertToken).filter(function (t) { return t !== ""; }).join(" ");
  };

  /* shell.js đã có NHAI.stripTones — chỉ bổ sung nếu thiếu (không ghi đè) */
  if (!NHAI.stripTones) {
    NHAI.stripTones = function (s) {
      return String(s).toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/ü/g, "v").replace(/[:' ’·]/g, "");
    };
  }

  NHAI.shuffle = function (arr) {
    var a = Array.prototype.slice.call(arr);
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };

  /* Tách pinyin (có sẵn dấu) thành mảng âm tiết: "Wáng lǎoshī" -> ["wáng","lǎo","shī"] */
  var VOW = "aeiouüvāáǎàōóǒòēéěèīíǐìūúǔùǖǘǚǜ";
  function isV(ch) { return !!ch && VOW.indexOf(ch) !== -1; }
  NHAI.splitPinyin = function (pinyin) {
    var out = [];
    String(pinyin || "").split(/\s+/).forEach(function (tok) {
      if (!tok) return;
      var low = tok.toLowerCase();
      var i = 0, start = 0;
      while (i < low.length) {
        start = i;
        if (/^(zh|ch|sh)/.test(low.slice(i))) i += 2;
        else if (/[bpmfdtnlgkhjqxrzcsyw]/.test(low[i])) i += 1;
        while (i < low.length && isV(low[i])) i++;
        if (low.slice(i, i + 2) === "ng" && (i + 2 >= low.length || !isV(low[i + 2]))) i += 2;
        else if (low[i] === "n" && (i + 1 >= low.length || !isV(low[i + 1]))) i += 1;
        out.push(tok.slice(start, i) || tok.slice(start, start + 1));
        if (i === start) i = start + 1; // tránh lặp vô hạn
      }
    });
    return out;
  };

  /* Ghép mảng pinyinPerChar thành 1 dòng hiển thị: "lǐ míng，nǐ hǎo。" */
  NHAI.pinyinLine = function (perChar) {
    var out = "";
    var prevPunct = true;
    (perChar || []).forEach(function (t) {
      if (!t.py) return;
      var isPunct = /[，。？！、：；…—]/.test(t.py);
      if (isPunct) { out += t.py; prevPunct = true; return; }
      out += (out && !prevPunct ? " " : "") + t.py;
      prevPunct = false;
    });
    return out;
  };
})();
