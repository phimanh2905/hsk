/* Nhai HSK clone — PLAN-19: /shadowing = thư viện video theo playlist (shadowing.html)
   + breadcrumb/badge/video liên quan cho shadowing-video.html (dùng NHAI_DATA.shadowing). */
(function () {
  "use strict";

  var DATA = window.NHAI_DATA && window.NHAI_DATA.shadowing;
  if (!DATA) return;

  var GRADS = [
    "linear-gradient(135deg,#c23b22,#6b1d10)",
    "linear-gradient(135deg,#2563eb,#1e3a8a)",
    "linear-gradient(135deg,#0d9488,#134e4a)",
    "linear-gradient(135deg,#b45309,#78350f)",
    "linear-gradient(135deg,#7c3aed,#4c1d95)"
  ];

  function playlistName(pid) {
    for (var i = 0; i < DATA.playlists.length; i++) {
      if (DATA.playlists[i].id === pid) return DATA.playlists[i].name;
    }
    return "";
  }

  /* Chữ Hán lớn mờ làm poster tĩnh: ký tự CJK đầu tiên của tiêu đề (bỏ qua 【「). */
  function posterChar(title) {
    var m = title.replace(/[【「]/g, "").match(/[\u4e00-\u9fff]/);
    return m ? m[0] : "片";
  }

  function card(v, gradIndex) {
    var views = v.views + (v.viewsSuffix || "");
    return (
      '<a href="shadowing-video.html?id=' + v.id + '" class="card shadow-neo block overflow-hidden hover:-translate-y-0.5 transition-transform">' +
        '<div class="relative w-full aspect-video flex items-center justify-center" style="background:' + GRADS[gradIndex % GRADS.length] + '">' +
          '<span class="zh text-6xl font-extrabold text-white/20 select-none">' + posterChar(v.title) + "</span>" +
          '<div class="absolute top-2 right-2 flex flex-col items-end gap-1">' +
            '<span class="bg-black/60 text-white text-[11px] font-bold px-1.5 py-0.5 rounded">▶ ' + views + "</span>" +
            '<span class="text-[11px] font-bold px-1.5 py-0.5 rounded text-white" style="background:#dc2626">' + v.hsk + "</span>" +
            '<span class="bg-black/60 text-white/90 text-[11px] font-bold px-1.5 py-0.5 rounded">YouTube</span>' +
          "</div>" +
          '<span class="absolute right-2 bottom-2 bg-black/70 text-white text-xs font-bold px-1.5 py-0.5 rounded">' + v.duration + "</span>" +
        "</div>" +
        '<div class="p-3">' +
          '<h3 class="font-bold leading-snug line-clamp-2">' + v.title + "</h3>" +
          '<p class="text-xs text-[var(--nhai-muted)] mt-1">' + playlistName(v.playlistId) + "</p>" +
          '<span class="pill text-[11px] font-bold mt-2 inline-block">Shadowing</span>' +
        "</div>" +
      "</a>"
    );
  }

  function section(pl) {
    var vids = DATA.videos.filter(function (v) { return v.playlistId === pl.id; });
    var cards = vids.map(function (v, i) { return card(v, pl.id === "daihua" ? i : i + 2); }).join("");
    return (
      '<section class="mb-10">' +
        '<h2 class="text-xl md:text-2xl font-extrabold">' + pl.name + ' <span class="text-[var(--nhai-muted)] font-bold text-base">(' + pl.total + " bài học)</span></h2>" +
        '<p class="text-sm text-[var(--nhai-muted)] mt-0.5">' + pl.desc + "</p>" +
        '<a href="#" data-view-all class="inline-block mt-1 text-xs font-extrabold tracking-wide text-[var(--nhai-main)] hover:underline">XEM TẤT CẢ →</a>' +
        '<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">' + cards + "</div>" +
      "</section>"
    );
  }

  /* ---------- trang index (shadowing.html) ---------- */
  function renderIndex() {
    var host = document.querySelector("[data-cats]");
    if (!host) return;
    host.innerHTML = DATA.playlists.map(section).join("");
    host.addEventListener("click", function (e) {
      var a = e.target.closest("[data-view-all]");
      if (a) {
        e.preventDefault();
        NHAI.toast("Sẽ có sớm");
      }
    });
  }

  /* ---------- trang video (shadowing-video.html): badges + video liên quan ---------- */
  function firstVideo() {
    return DATA.videos[0];
  }

  function currentVideo() {
    var id = NHAI.q("id");
    var v = id ? DATA.videoById(id) : null;
    return v || firstVideo(); // ?id= không tồn tại → fallback video đầu tiên
  }

  function videoBadges(v) {
    return (
      '<span data-hsk class="pill pill-active text-xs font-bold">' + v.hsk + "</span>" +
      '<span data-duration class="pill text-xs font-bold">' + v.duration + "</span>" +
      '<span data-views class="pill text-xs font-bold">▶ ' + (v.views + (v.viewsSuffix || "")) + " lượt xem</span>"
    );
  }

  function renderRelated(v) {
    var host = document.querySelector("[data-related]");
    if (!host) return;
    var rel = DATA.videos.filter(function (x) { return x.playlistId === v.playlistId && x.id !== v.id; }).slice(0, 4);
    host.innerHTML = rel.map(function (x, i) { return card(x, i + 1); }).join("");
    if (host.dataset.bound) return;
    host.dataset.bound = "1";
    host.addEventListener("click", function (e) {
      var a = e.target.closest("a");
      if (!a) return;
      e.preventDefault();
      var id = a.getAttribute("href").split("id=")[1];
      history.replaceState(null, "", "shadowing-video.html?id=" + id);
      applyVideo(DATA.videoById(id) || firstVideo());
    });
  }

  /* Fix round 1 (review): video pseudo-id (daihua-x4…, routing-only) không phải YouTube ID hợp lệ.
     Khi nhúng iframe, map về 1 video thật làm placeholder (id thật đầu tiên của dữ liệu PLAN-06). */
  var PLACEHOLDER_EMBED = "EA3rwvr99Q0"; // 墓碑上的QR碼，別掃。 — video thật đầu tiên trong clone

  function embedIdOf(v) {
    return /^[A-Za-z0-9_-]{11}$/.test(v.id) ? v.id : PLACEHOLDER_EMBED;
  }

  function applyVideo(v) {
    document.title = v.title + " | Shadowing | Nhai HSK";
    var h1 = document.querySelector("[data-title]");
    if (h1) h1.textContent = v.title;
    var badges = document.querySelector("[data-badges]");
    if (badges) badges.innerHTML = videoBadges(v);
    var frame = document.getElementById("ytplayer");
    var embedId = embedIdOf(v);
    if (frame && frame.src.indexOf("/embed/" + embedId + "?") === -1) {
      frame.src = "https://www.youtube-nocookie.com/embed/" + embedId + "?enablejsapi=1&rel=0&playsinline=1";
    }
    renderRelated(v);
  }

  function renderVideoPage() {
    var v = currentVideo();
    var id = NHAI.q("id");
    if (!id || !DATA.videoById(id)) history.replaceState(null, "", "shadowing-video.html?id=" + firstVideo().id);
    applyVideo(v);
  }

  function init() {
    if (document.querySelector("[data-cats]")) renderIndex();
    else if (document.querySelector("[data-related]")) renderVideoPage();
  }

  if (document.readyState === "complete") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
