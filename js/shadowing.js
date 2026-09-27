/* Nhai HSK clone — PLAN-06: thư viện Shadowing (shadowing.html). */
(function () {
  "use strict";

  var GRADS = [
    "linear-gradient(135deg,#c23b22,#6b1d10)",
    "linear-gradient(135deg,#2563eb,#1e3a8a)",
    "linear-gradient(135deg,#0d9488,#134e4a)",
    "linear-gradient(135deg,#b45309,#78350f)",
    "linear-gradient(135deg,#7c3aed,#4c1d95)"
  ];

  function fmtPlays(n) {
    return n >= 1000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : String(n);
  }

  function card(video, channel, grad) {
    return (
      '<a href="shadowing-video.html?id=' + video.id + '" class="card shadow-neo block overflow-hidden hover:-translate-y-0.5 transition-transform">' +
        '<div class="relative h-36 flex items-center justify-center" style="background:' + grad + '">' +
          '<span class="zh text-4xl font-extrabold text-white/90 select-none">短片</span>' +
          '<span class="absolute right-2 bottom-2 bg-black/70 text-white text-xs font-bold px-1.5 py-0.5 rounded">' + video.duration + "</span>" +
        "</div>" +
        '<div class="p-3">' +
          '<div class="flex flex-wrap gap-1.5 mb-2">' +
            '<span class="pill text-[11px] font-bold">▶ ' + fmtPlays(video.plays) + "</span>" +
            '<span class="pill pill-active text-[11px] font-bold" style="background:var(--nhai-card);border-color:var(--nhai-main);color:var(--nhai-main)">HSK' + video.hsk + "</span>" +
            '<span class="pill text-[11px] font-bold">YouTube</span>' +
          "</div>" +
          '<h3 class="font-bold leading-snug line-clamp-2">' + video.title + "</h3>" +
          '<p class="text-xs text-[var(--nhai-muted)] mt-1">' + channel + "</p>" +
        "</div>" +
      "</a>"
    );
  }

  function section(cat, gi) {
    var cards = cat.videos.map(function (v, i) { return card(v, cat.channel, GRADS[(gi + i) % GRADS.length]); }).join("");
    return (
      '<section>' +
        '<div class="flex items-end justify-between gap-3 mb-1">' +
          "<div>" +
            '<h2 class="text-xl md:text-2xl font-extrabold">' + cat.name + ' <span class="text-[var(--nhai-muted)] font-bold text-base">(' + cat.count + " bài học)</span></h2>" +
            '<p class="text-sm text-[var(--nhai-muted)] mt-0.5">' + cat.desc + "</p>" +
          "</div>" +
          '<a href="shadowing.html?cat=' + cat.slug + '" class="shrink-0 text-xs font-extrabold tracking-wide text-[var(--nhai-main)] hover:underline">XEM TẤT CẢ →</a>' +
        "</div>" +
        '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-3">' + cards + "</div>" +
      "</section>"
    );
  }

  function render() {
    var data = window.NHAI_DATA && window.NHAI_DATA.shadowing;
    if (!data) return;
    var host = document.querySelector("[data-cats]");
    var crumb = document.querySelector("[data-crumb]");
    var empty = document.querySelector("[data-empty]");
    var cat = NHAI.q("cat");
    var list = data.categories;

    if (cat) {
      list = list.filter(function (c) { return c.slug === cat; });
      if (crumb) crumb.classList.remove("hidden");
    }
    if (!list.length) {
      if (empty) empty.classList.remove("hidden");
      return;
    }
    host.innerHTML = list.map(section).join("");
  }

  if (document.readyState === "complete") render();
  else document.addEventListener("DOMContentLoaded", render);
})();
