/* Nhai HSK clone — PLAN-06: trình học video Shadowing (shadowing-video.html).
   Điều khiển iframe YouTube qua postMessage (polling 500ms); fallback TTS (speechSynthesis)
   khi iframe không sẵn sàng sau 4s hoặc ?tts=1. */
(function () {
  "use strict";

  var DATA = window.NHAI_DATA && window.NHAI_DATA.shadowing;
  if (!DATA) return;

  /* ---------- dữ liệu video ---------- */
  var videoId = NHAI.q("id") || "EA3rwvr99Q0";
  var video = null;
  DATA.categories.forEach(function (c) {
    c.videos.forEach(function (v) { if (v.id === videoId) video = v; });
  });
  if (!video) video = DATA.categories[0].videos[0];
  var subs = DATA.subtitles[video.id] || [];
  if (!subs.length) {
    subs = [{ n: 1, start: 0, end: video.durSec || 60, parts: [{ zh: "(Video này chưa có bản chép — đang cập nhật.)" }], pinyin: "", vi: "" }];
  }

  /* ---------- trạng thái ---------- */
  var state = {
    mode: "shadow",        // "shadow" | "dictation"
    cur: 0,
    playing: false,
    rate: 1,
    tts: false,            // fallback TTS
    ytReady: false,
    lastTime: 0,
    showPy: false,
    showVi: false,
    transcriptHidden: false,
    autoScroll: localStorage.getItem("nhai.shadow.autoscroll") !== "0",
    recording: false
  };

  var $ = function (sel) { return document.querySelector(sel); };
  var iframe = $("#ytplayer");
  var YT_ORIGIN = "https://www.youtube-nocookie.com";

  /* ---------- init trang ---------- */
  document.title = video.title + " | Shadowing | Nhai HSK";
  $("[data-title]").textContent = video.title;
  $("[data-channel]").textContent = DATA.categories.filter(function (c) {
    return c.videos.some(function (v) { return v.id === video.id; });
  })[0].name;
  $("[data-hsk]").textContent = "HSK" + video.hsk;
  iframe.src = YT_ORIGIN + "/embed/" + video.id + "?enablejsapi=1&rel=0&playsinline=1";

  /* ---------- điều khiển YouTube (postMessage) ---------- */
  function ytSend(obj) {
    if (!iframe || state.tts || !iframe.contentWindow) return;
    try { iframe.contentWindow.postMessage(JSON.stringify(obj), YT_ORIGIN); } catch (e) { /* silent */ }
  }
  function ytCmd(func, args) { ytSend({ event: "command", func: func, args: args || [] }); }

  iframe.addEventListener("load", function () {
    // bắt tay API widget: YouTube sẽ đẩy infoDelivery (currentTime, playerState)
    ytSend({ event: "listening", id: "nhai-yt", channel: "widget" });
  });

  window.addEventListener("message", function (e) {
    if (!/^https:\/\/(www\.)?(youtube-nocookie|youtube)\.com$/.test(e.origin)) return;
    var data;
    try { data = typeof e.data === "string" ? JSON.parse(e.data) : e.data; } catch (err) { return; }
    if (!data || typeof data !== "object") return;
    if (data.event === "onReady") { markYtReady(); return; }
    var pd = data.infoDelivery && data.infoDelivery.playerData;
    if (pd && typeof pd.currentTime === "number") {
      state.lastTime = pd.currentTime;
      if (!state.ytReady) markYtReady();
      if (typeof pd.playerState === "number") state.playing = pd.playerState === 1;
    }
  });

  function markYtReady() {
    if (state.ytReady) return;
    state.ytReady = true;
    ytCmd("setPlaybackRate", [state.rate]);
    hideOverlay();
  }
  function hideOverlay() { $("[data-video-overlay]").classList.add("hidden"); }
  function showOverlay() { $("[data-video-overlay]").classList.remove("hidden"); }

  // polling 500ms: lấy currentTime, quản lý vòng đời câu (start/end)
  setInterval(function () {
    if (state.tts || !state.ytReady) return;
    ytCmd("getCurrentTime");
    tick(state.lastTime);
  }, 500);

  function tick(t) {
    var idx = -1;
    for (var i = 0; i < subs.length; i++) {
      if (t >= subs[i].start && t < subs[i].end) { idx = i; break; }
    }
    if (idx === -1) {
      if (t >= subs[subs.length - 1].end) { idx = subs.length - 1; }
      else { idx = 0; }
    }
    if (idx !== state.cur) { state.cur = idx; renderActive(); return; }
    // tự ngắt câu: dừng ở cuối câu đang phát
    if (state.playing && $("[data-auto-split]").checked && t >= subs[state.cur].end - 0.15) {
      pause();
    }
  }

  /* ---------- fallback TTS ---------- */
  function enableTTS() {
    if (state.tts) return;
    state.tts = true;
    $("[data-tts-banner]").classList.remove("hidden");
    showOverlay();
    if (state.playing) speakCurrent();
  }
  if (NHAI.q("tts") === "1") enableTTS();
  setTimeout(function () { if (!state.ytReady) enableTTS(); }, 4000);

  function speakSentence(i, onend) {
    if (!("speechSynthesis" in window)) { if (onend) onend(); return; }
    speechSynthesis.cancel();
    var s = subs[i];
    var text = s.parts.map(function (p) { return p.zh; }).join(" ");
    var u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-CN";
    u.rate = state.rate;
    var voices = speechSynthesis.getVoices().filter(function (v) { return /^zh/i.test(v.lang); });
    var voicePref = localStorage.getItem("nhai.voice") || "female";
    var pick = voices.find(function (v) {
      return (voicePref === "male" ? /male|daniel|tington/i : /female|mei|tingting|hui/i).test(v.name);
    }) || voices[0];
    if (pick) u.voice = pick;
    if (onend) {
      u.onend = function () { if (state.playing && state.tts) onend(); };
    }
    speechSynthesis.speak(u);
  }
  function speakCurrent() {
    speakSentence(state.cur, function () {
      // hết câu → sang câu tiếp theo (chế độ TTS phát liên tục)
      if (state.cur + 1 < subs.length) {
        state.cur += 1;
        renderActive();
        speakCurrent();
      } else {
        pause();
      }
    });
  }

  /* ---------- play / pause / câu ---------- */
  function play() {
    state.playing = true;
    $("[data-play]").textContent = "⏸";
    if (state.tts) speakCurrent();
    else { ytCmd("playVideo"); ytCmd("setPlaybackRate", [state.rate]); }
  }
  function pause() {
    state.playing = false;
    $("[data-play]").textContent = "▶";
    if (state.tts) { try { speechSynthesis.cancel(); } catch (e) {} }
    else ytCmd("pauseVideo");
  }
  function togglePlay() { state.playing ? pause() : play(); }

  function gotoSentence(i, autoplay) {
    if (i < 0) i = 0;
    if (i > subs.length - 1) i = subs.length - 1;
    state.cur = i;
    if (state.tts) {
      if (state.playing || autoplay) { state.playing = true; $("[data-play]").textContent = "⏸"; speakCurrent(); }
      else { renderActive(); }
    } else {
      ytCmd("seekTo", [subs[i].start, true]);
      if (autoplay && !state.playing) play(); else renderActive();
    }
    renderActive();
  }
  function next() { gotoSentence(Math.min(state.cur + 1, subs.length - 1), state.playing); }
  function prev() { gotoSentence(Math.max(state.cur - 1, 0), state.playing); }
  function repeat() { gotoSentence(state.cur, true); }

  /* ---------- render transcript ---------- */
  function sentenceHtml(s, i) {
    var parts = s.parts.map(function (p, pi) {
      return '<span data-part="' + pi + '" class="cursor-pointer hover:text-[var(--nhai-main)]">' + p.zh + "</span>";
    }).join(" ");
    var py = s.pinyin ? '<p data-py class="' + (state.showPy ? "" : "hidden") + ' text-sm italic text-[var(--nhai-accent)] mt-1">' + s.pinyin + "</p>" : "";
    var vi = s.vi ? '<p data-vi class="' + (state.showVi ? "" : "hidden") + ' text-sm text-[var(--nhai-muted)] mt-1">' + s.vi + "</p>" : "";
    return (
      '<div data-sent="' + i + '" class="card p-3 cursor-pointer border-2 border-transparent hover:border-[var(--nhai-border)]">' +
        '<div class="flex items-start gap-2">' +
          '<span class="text-xs font-bold text-[var(--nhai-muted)] mt-1 shrink-0">#' + s.n + "</span>" +
          '<div class="flex-1 min-w-0">' +
            '<div class="zh font-semibold" data-zh>' + parts + "</div>" +
            py + vi +
            '<button type="button" data-report class="mt-1 text-[11px] text-[var(--nhai-muted)] underline hover:text-[var(--nhai-main)]">⚠ Báo lỗi</button>' +
          "</div>" +
        "</div>" +
      "</div>"
    );
  }

  function renderTranscript() {
    var host = $("[data-sentences]");
    host.innerHTML = subs.map(sentenceHtml).join("");
    host.classList.toggle("hidden", state.transcriptHidden);
    $("[data-transcript-hidden]").classList.toggle("hidden", !state.transcriptHidden);
    applyFont();
    renderActive();
  }

  function renderActive() {
    var nodes = document.querySelectorAll("[data-sent]");
    nodes.forEach(function (n) {
      var active = Number(n.getAttribute("data-sent")) === state.cur;
      n.classList.toggle("sent-active", active);
      if (active && state.autoScroll && !state.transcriptHidden) {
        n.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
    $("[data-pos]").textContent = "Câu " + (state.cur + 1) + "/" + subs.length;
    $("[data-dict-n]").textContent = state.cur + 1;
    if (state.mode === "dictation") clearDictResult();
  }

  function applyFont() {
    var host = $("[data-sentences]");
    host.classList.remove("text-sm", "text-base", "text-lg");
    var f = localStorage.getItem("nhai.shadow.font") || "lg";
    host.classList.add(f === "sm" ? "text-sm" : f === "base" ? "text-base" : "text-lg");
  }

  /* ---------- transcript interactions ---------- */
  $("[data-sentences]").addEventListener("click", function (e) {
    var report = e.target.closest("[data-report]");
    if (report) { e.stopPropagation(); NHAI.toast("Đã gửi báo lỗi — cảm ơn bạn!"); return; }
    var sentEl = e.target.closest("[data-sent]");
    if (!sentEl) return;
    gotoSentence(Number(sentEl.getAttribute("data-sent")), true);
  });

  $("[data-tg='py']").addEventListener("click", function () {
    state.showPy = !state.showPy;
    document.querySelectorAll("[data-py]").forEach(function (p) { p.classList.toggle("hidden", !state.showPy); });
    $("[data-show-py]").checked = state.showPy;
  });
  $("[data-tg='vi']").addEventListener("click", function () {
    state.showVi = !state.showVi;
    document.querySelectorAll("[data-vi]").forEach(function (p) { p.classList.toggle("hidden", !state.showVi); });
    $("[data-show-vi]").checked = state.showVi;
  });
  $("[data-tg='hide']").addEventListener("click", function () {
    state.transcriptHidden = !state.transcriptHidden;
    $("[data-sentences]").classList.toggle("hidden", state.transcriptHidden);
    $("[data-transcript-hidden]").classList.toggle("hidden", !state.transcriptHidden);
  });

  /* ---------- điều khiển thanh công cụ ---------- */
  document.querySelectorAll("[data-mode]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      state.mode = btn.getAttribute("data-mode");
      document.querySelectorAll("[data-mode]").forEach(function (b) {
        var active = b === btn;
        b.classList.toggle("btn-main", active);
        b.classList.toggle("btn-ghost", !active);
      });
      $("[data-dictation]").classList.toggle("hidden", state.mode !== "dictation");
      $("[data-record]").classList.toggle("hidden", state.mode !== "shadow");
      if (state.mode === "dictation") clearDictResult();
    });
  });

  $("[data-hide-video]").addEventListener("click", function () {
    var wrap = $("[data-video-wrap]");
    var hidden = wrap.classList.toggle("hidden");
    $("[data-hide-video]").textContent = hidden ? "👁 Hiện video" : "👁 Ẩn video";
  });

  $("[data-play]").addEventListener("click", togglePlay);
  $("[data-prev]").addEventListener("click", prev);
  $("[data-next]").addEventListener("click", next);
  $("[data-repeat]").addEventListener("click", repeat);

  $("[data-auto-split]").addEventListener("change", function () { /* đọc trực tiếp khi tick */ });
  $("[data-show-vi]").addEventListener("change", function (e) {
    state.showVi = e.target.checked;
    document.querySelectorAll("[data-vi]").forEach(function (p) { p.classList.toggle("hidden", !state.showVi); });
  });
  $("[data-show-py]").addEventListener("change", function (e) {
    state.showPy = e.target.checked;
    document.querySelectorAll("[data-py]").forEach(function (p) { p.classList.toggle("hidden", !state.showPy); });
  });
  $("[data-rate]").addEventListener("change", function (e) {
    state.rate = parseFloat(e.target.value) || 1;
    if (!state.tts) ytCmd("setPlaybackRate", [state.rate]);
  });

  /* ---------- phím tắt ---------- */
  document.addEventListener("keydown", function (e) {
    var t = e.target;
    if (t && (t.matches && t.matches("input, textarea, select") || t.isContentEditable)) return;
    if (document.querySelector("[data-overlay]")) return;
    if (e.code === "Space") { e.preventDefault(); togglePlay(); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); next(); }
    else if (e.key === "r" || e.key === "R") { repeat(); }
  });

  /* ---------- dialog Phím tắt ---------- */
  $("[data-shortcut]").addEventListener("click", function () {
    var bd = NHAI.el(
      '<div class="modal-backdrop" data-overlay>' +
        '<div class="card shadow-neo w-full max-w-sm p-6" role="dialog" aria-label="Phím tắt">' +
          '<div class="flex items-center justify-between mb-3"><h2 class="text-xl font-extrabold">⌨️ Phím tắt</h2>' +
          '<button type="button" data-close class="btn-ghost w-9 h-9">✕</button></div>' +
          '<div class="space-y-2 text-sm">' +
            '<div class="flex items-center justify-between"><span>Phát / tạm dừng</span><span class="pill text-xs font-bold">Space</span></div>' +
            '<div class="flex items-center justify-between"><span>Câu trước</span><span class="pill text-xs font-bold">←</span></div>' +
            '<div class="flex items-center justify-between"><span>Câu sau</span><span class="pill text-xs font-bold">→</span></div>' +
            '<div class="flex items-center justify-between"><span>Lặp lại câu</span><span class="pill text-xs font-bold">R</span></div>' +
          "</div>" +
        "</div>" +
      "</div>"
    );
    document.body.appendChild(bd);
    bd.addEventListener("click", function (e) {
      if (e.target === bd || e.target.closest("[data-close]")) bd.remove();
    });
  });

  /* ---------- dialog Cài đặt ---------- */
  $("[data-settings]").addEventListener("click", function () {
    var font = localStorage.getItem("nhai.shadow.font") || "lg";
    var auto = state.autoScroll;
    var on = function (v) { return v ? "btn-main" : "btn-ghost"; };
    var bd = NHAI.el(
      '<div class="modal-backdrop" data-overlay>' +
        '<div class="card shadow-neo w-full max-w-sm p-6" role="dialog" aria-label="Cài đặt bản chép">' +
          '<div class="flex items-center justify-between mb-3"><h2 class="text-xl font-extrabold">⚙️ Cài đặt</h2>' +
          '<button type="button" data-close class="btn-ghost w-9 h-9">✕</button></div>' +
          '<p class="text-sm font-bold mb-2">Cỡ chữ bản chép</p>' +
          '<div class="grid grid-cols-3 gap-2 mb-4">' +
            '<button type="button" data-font="sm" class="' + on(font === "sm") + ' py-2 text-sm">Nhỏ</button>' +
            '<button type="button" data-font="base" class="' + on(font === "base") + ' py-2 text-sm">Vừa</button>' +
            '<button type="button" data-font="lg" class="' + on(font === "lg") + ' py-2 text-sm">Lớn</button>' +
          "</div>" +
          '<label class="flex items-center justify-between card p-3 cursor-pointer">' +
            '<span class="text-sm font-semibold">Tự cuộn đến câu đang phát</span>' +
            '<input type="checkbox" data-autoscroll ' + (auto ? "checked" : "") + ">" +
          "</label>" +
        "</div>" +
      "</div>"
    );
    document.body.appendChild(bd);
    bd.addEventListener("click", function (e) {
      if (e.target === bd || e.target.closest("[data-close]")) { bd.remove(); return; }
      var fb = e.target.closest("[data-font]");
      if (fb) {
        localStorage.setItem("nhai.shadow.font", fb.getAttribute("data-font"));
        applyFont();
        bd.querySelectorAll("[data-font]").forEach(function (b) {
          var active = b === fb;
          b.classList.toggle("btn-main", active);
          b.classList.toggle("btn-ghost", !active);
        });
      }
      var as = e.target.closest("[data-autoscroll]");
      if (as) {
        state.autoScroll = as.checked;
        localStorage.setItem("nhai.shadow.autoscroll", as.checked ? "1" : "0");
      }
    });
  });

  /* ---------- mode chính tả ---------- */
  var dictInput = $("[data-dict-input]");
  var dictResult = $("[data-dict-result]");

  function clearDictResult() { dictResult.innerHTML = ""; dictInput.value = ""; }

  $("[data-dict-listen]").addEventListener("click", function () {
    if (state.tts) { speakSentence(state.cur); return; }
    ytCmd("seekTo", [subs[state.cur].start, true]);
    ytCmd("playVideo");
    if ($("[data-auto-split]").checked) { state.playing = true; $("[data-play]").textContent = "⏸"; }
  });

  function normDict(s) {
    return NHAI.stripTones(s).replace(/[\s,.!?，。！？、：;；:'"“”’‘·()（）\-—…]/g, "");
  }

  $("[data-dict-check]").addEventListener("click", function () {
    var target = subs[state.cur];
    var full = target.parts.map(function (p) { return p.zh; }).join(" ");
    var want = normDict(full);
    var got = normDict(dictInput.value);
    if (!got) { dictResult.innerHTML = '<p class="text-[var(--nhai-muted)]">Hãy gõ những gì bạn nghe được trước đã.</p>'; return; }

    var html = "";
    var correct = want === got;
    if (!correct) {
      var marks = [];
      for (var i = 0; i < Math.max(want.length, got.length); i++) marks.push(got[i] === want[i]);
      // render lại input gốc (chưa strip) với ký tự sai tô đỏ — so theo vị trí sau chuẩn hoá
      var src = dictInput.value.trim() || "";
      var srcNorm = normDict(src);
      var oi = 0; // vị trí trong srcNorm khi duyệt src
      for (var j = 0; j < src.length; j++) {
        var ch = src[j];
        var nch = normDict(ch);
        if (nch === "") { html += escapeHtml(ch); continue; }
        var ok = marks[oi] !== false;
        html += ok ? escapeHtml(ch) : '<span class="text-red-600 font-bold underline">' + escapeHtml(ch) + "</span>";
        oi += nch.length;
      }
    }
    dictResult.innerHTML = correct
      ? '<p class="font-bold text-green-700 dark:text-green-400">✅ Chính xác! 🎉</p>' +
        '<p class="zh mt-1">' + escapeHtml(full) + "</p>"
      : '<p class="font-bold text-[var(--nhai-main)]">❌ Chưa đúng — chữ sai được tô đỏ:</p>' +
        '<p class="mt-1 text-lg">' + (html || escapeHtml(dictInput.value)) + "</p>" +
        '<p class="mt-2 text-sm text-[var(--nhai-muted)]">Đáp án: <span class="zh font-semibold text-[var(--nhai-ink)]">' + escapeHtml(full) + "</span>" +
        (target.pinyin ? ' <span class="italic">(' + target.pinyin + ")</span>" : "") + "</p>";
  });

  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  $("[data-dict-skip]").addEventListener("click", function () {
    clearDictResult();
    next();
  });
  dictInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") $("[data-dict-check]").click();
  });

  /* ---------- ghi âm (mode shadowing) — fail im lặng ---------- */
  var recBtn = $("[data-rec-btn]");
  var rec = null, chunks = [];

  recBtn.addEventListener("click", function () {
    if (!state.recording) {
      if (!navigator.mediaDevices || !window.MediaRecorder) return; // fail im lặng
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
        chunks = [];
        rec = new MediaRecorder(stream);
        rec.ondataavailable = function (e) { if (e.data && e.data.size) chunks.push(e.data); };
        rec.onstop = function () {
          stream.getTracks().forEach(function (t) { t.stop(); });
          var url = URL.createObjectURL(new Blob(chunks, { type: rec.mimeType || "audio/webm" }));
          var wrap = NHAI.el(
            '<div class="flex items-center gap-2 text-sm"><span class="pill text-xs font-bold">Bản ghi</span>' +
            '<audio controls src="' + url + '" class="h-9 flex-1 max-w-xs"></audio></div>'
          );
          $("[data-rec-list]").appendChild(wrap);
        };
        rec.start();
        state.recording = true;
        recBtn.textContent = "■ Dừng ghi âm";
        recBtn.style.background = "#1f1e1d";
        $("[data-rec-hint]").textContent = "Đang ghi âm… bấm để dừng.";
      }).catch(function () { /* từ chối quyền — im lặng */ });
    } else {
      try { rec.stop(); } catch (e) { /* silent */ }
      state.recording = false;
      recBtn.textContent = "● Bắt đầu ghi âm";
      recBtn.style.background = "#dc2626";
      $("[data-rec-hint]").textContent = "Ghi âm để so sánh phát âm của bạn với video.";
    }
  });

  /* ---------- boot ---------- */
  renderTranscript();
  $("[data-show-py]").checked = state.showPy;
  $("[data-show-vi]").checked = state.showVi;
  $("[data-record]").classList.toggle("hidden", state.mode !== "shadow");
})();
