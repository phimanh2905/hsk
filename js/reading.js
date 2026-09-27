/* Nhai HSK clone — PLAN-07 logic trang Bài khoá (UI-only, hardcode data).
   Karaoke: TTS từng câu + highlight span ký tự (onboundary nếu có, fallback timer). */
(function () {
  "use strict";

  var D = window.NHAI_DATA && window.NHAI_DATA.reading;
  if (!D) return;

  var MAX = 3000;
  var HL = "background: var(--nhai-gold); border-radius: 3px;"; // highlight vàng

  var input = document.querySelector("[data-input]");
  var counter = document.querySelector("[data-counter]");
  var result = document.querySelector("[data-result]");
  var accountBox = document.querySelector("[data-account]");

  /* ---------- state phát audio ---------- */
  var current = null;          // {title, meta, sentences:[{zh,py,vi}], extras}
  var gen = 0;                 // token huỷ mọi timer/tts cũ
  var activeIdx = -1;          // câu đang phát
  var playAll = false;
  var timers = [];             // interval/timeout đang chạy

  /* ---------- tiện ích ---------- */
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function clearTimers() {
    timers.forEach(function (id) { clearInterval(id); clearTimeout(id); });
    timers = [];
  }
  function stopAudio() {
    gen++;
    clearTimers();
    try { if ("speechSynthesis" in window) speechSynthesis.cancel(); } catch (e) {}
    activeIdx = -1;
    playAll = false;
  }
  /* Tách câu: giữ dấu câu cuối (。！？!?…；) */
  function splitSentences(text) {
    var m = String(text).match(/[^。！？!?…；;]+[。！？!?…；;]*/g) || [];
    return m.map(function (s) { return s.trim(); }).filter(Boolean);
  }
  function charSpans(zh) {
    return esc(zh).split("").map(function (c) {
      return '<span class="zh-char inline-block">' + (c === " " ? "&nbsp;" : c) + "</span>";
    }).join("");
  }
  function zhFull(doc) {
    return doc.sentences.map(function (s) { return s.zh; }).join("");
  }
  function normalize(t) { return String(t).replace(/\s+/g, ""); }

  /* Sổ câu dịch từ demoDoc (tra theo nguyên câu) */
  var sentenceMap = {};
  D.demoDoc.sentences.forEach(function (s) { sentenceMap[s.zh] = s; });

  /* ---------- sidebar ---------- */
  function renderDemoList() {
    var host = document.querySelector("[data-demo-list]");
    host.innerHTML =
      '<button type="button" data-open-demo class="btn-ghost w-full text-left px-3 py-2.5 rounded-lg">' +
        '<span class="zh font-bold text-base">一个人的生活</span>' +
        '<span class="block text-xs text-[var(--nhai-muted)] mt-0.5">Cuộc sống một mình — 2:29 · 654 ký tự</span>' +
      "</button>";
    host.querySelector("[data-open-demo]").addEventListener("click", openDemo);
  }
  function renderAccount() {
    var loggedIn = NHAI.isLoggedIn();
    if (loggedIn) {
      accountBox.innerHTML =
        '<p class="text-sm text-[var(--nhai-muted)]">Chưa có bài nào được lưu — bài bạn bấm “Tạo bài đọc” sẽ xuất hiện ở đây (demo).</p>';
    } else {
      accountBox.innerHTML =
        '<p class="text-sm text-[var(--nhai-muted)] mb-3">Đăng nhập để lưu bài đã tạo và mở lại mọi lúc.</p>' +
        '<button type="button" data-login class="btn-ghost w-full px-4 py-2 rounded-lg text-sm font-bold">Đăng nhập</button>';
      accountBox.querySelector("[data-login]").addEventListener("click", function () {
        NHAI.openLogin();
        setTimeout(maybeRefreshAccount, 400); // modal demo đăng nhập xong → cập nhật ô bên
      });
    }
  }
  var lastLoggedIn = null;
  function maybeRefreshAccount() {
    var now = NHAI.isLoggedIn();
    if (now !== lastLoggedIn) { lastLoggedIn = now; renderAccount(); }
  }
  document.addEventListener("click", maybeRefreshAccount);

  /* ---------- callout ---------- */
  var calloutBtn = document.querySelector("[data-callout-toggle]");
  var calloutBody = document.querySelector("[data-callout-body]");
  var calloutArrow = document.querySelector("[data-callout-arrow]");
  calloutBtn.addEventListener("click", function () {
    var open = !calloutBody.classList.contains("hidden");
    calloutBody.classList.toggle("hidden", open);
    calloutBtn.setAttribute("aria-expanded", String(!open));
    calloutArrow.textContent = open ? "▾" : "▴";
  });

  /* ---------- textarea + counter ---------- */
  function syncCounter() {
    if (input.value.length > MAX) input.value = input.value.slice(0, MAX);
    counter.textContent = input.value.length + "/" + MAX;
  }
  input.addEventListener("input", syncCounter);
  syncCounter();

  document.querySelector("[data-sample-btn]").addEventListener("click", function () {
    input.value = D.sampleText;
    syncCounter();
    NHAI.toast("Đã điền văn bản mẫu — bấm “Tạo bài đọc” nhé!");
  });

  document.querySelector("[data-create-btn]").addEventListener("click", function () {
    var raw = input.value.trim();
    if (!raw) {
      NHAI.toast("Hãy dán văn bản tiếng Trung vào ô trước nhé!");
      return;
    }
    stopAudio();
    var text = raw.slice(0, MAX);
    var lines = text.split(/\n+/).map(function (l) { return l.trim(); }).filter(Boolean);
    var title = null;
    var bodyText = text;
    if (lines.length > 1 && lines[0].length <= 20) {
      title = lines[0];
      bodyText = lines.slice(1).join("\n");
    }
    var sentences = splitSentences(bodyText).map(function (zh) {
      var hit = sentenceMap[zh];
      return {
        zh: zh,
        py: hit ? hit.py : null,
        vi: hit ? hit.vi : "(bản dịch demo — tính năng AI cần backend)"
      };
    });
    if (!sentences.length) {
      NHAI.toast("Không tìm thấy câu tiếng Trung nào trong văn bản.");
      return;
    }
    var isDemoFull = normalize(bodyText) === normalize(zhFull(D.demoDoc));
    current = {
      title: title || sentences[0].zh,
      meta: sentences.length + " câu · " + bodyText.length + " ký tự",
      sentences: sentences,
      extras: isDemoFull ? D.demoDoc : null
    };
    renderDoc();
  });

  /* ---------- mở bài demo từ sidebar ---------- */
  function openDemo() {
    stopAudio();
    current = {
      title: D.demoDoc.title,
      meta: D.demoDoc.meta + " — " + D.demoDoc.sentences.length + " câu",
      sentences: D.demoDoc.sentences.map(function (s) { return { zh: s.zh, py: s.py, vi: s.vi }; }),
      extras: D.demoDoc
    };
    renderDoc();
    if (result.scrollIntoView) result.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------- render bài đọc ---------- */
  function renderDoc() {
    var html =
      '<div class="card shadow-neo p-4">' +
        '<div class="flex items-start justify-between gap-3 flex-wrap mb-3">' +
          '<div>' +
            '<h2 class="zh text-2xl font-extrabold" data-doc-title>' + esc(current.title) + "</h2>" +
            '<p class="text-sm text-[var(--nhai-muted)] mt-0.5" data-doc-meta>' + esc(current.meta) + "</p>" +
          "</div>" +
          '<div class="flex items-center gap-2 flex-wrap">' +
            '<button type="button" data-play-all class="btn-main px-4 py-2 rounded-lg text-sm font-extrabold">🔊 Phát cả bài</button>' +
            '<button type="button" data-toggle="vi" class="pill px-3 py-1.5 rounded-full text-sm font-bold">Dịch</button>' +
            '<button type="button" data-toggle="py" class="pill px-3 py-1.5 rounded-full text-sm font-bold">Pinyin</button>' +
            '<select data-rate class="pill px-2 py-1.5 rounded-full text-sm font-bold" aria-label="Tốc độ đọc">' +
              '<option value="0.7">0.7×</option>' +
              '<option value="1" selected>1×</option>' +
              '<option value="1.3">1.3×</option>' +
            "</select>" +
          "</div>" +
        "</div>" +
        '<div data-sentences class="space-y-2">' +
          current.sentences.map(function (s, i) {
            return (
              '<div class="border-2 border-[var(--nhai-border)] rounded-lg p-3" data-row="' + i + '">' +
                '<div class="flex items-start gap-2">' +
                  '<button type="button" data-play="' + i + '" class="btn-ghost w-9 h-9 shrink-0 rounded-full" aria-label="Đọc câu ' + (i + 1) + '">▶</button>' +
                  '<div class="min-w-0">' +
                    '<p class="zh text-xl leading-loose" data-zh>' + charSpans(s.zh) + "</p>" +
                    '<p class="zh text-sm text-[var(--nhai-accent)] mt-1 hidden" data-py>' + esc(s.py || "") + "</p>" +
                    '<p class="text-sm text-[var(--nhai-muted)] mt-1 hidden" data-vi>' + esc(s.vi || "") + "</p>" +
                  "</div>" +
                "</div>" +
              "</div>"
            );
          }).join("") +
        "</div>" +
        '<div data-extras></div>' +
      "</div>";

    result.innerHTML = html;
    bindDoc();
    if (current.extras) renderExtras();
  }

  function bindDoc() {
    var root = result;

    root.querySelectorAll("[data-play]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var i = Number(btn.getAttribute("data-play"));
        stopAudio();
        setRowBtn(i, "⏹");
        playFrom(i, false);
      });
    });

    root.querySelector("[data-play-all]").addEventListener("click", function () {
      if (playAll) { stopAudio(); updatePlayAllBtn(); return; }
      stopAudio();
      playAll = true;
      updatePlayAllBtn();
      playFrom(0, true);
    });

    root.querySelectorAll("[data-toggle]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var kind = btn.getAttribute("data-toggle");
        var show = btn.classList.toggle("pill-active");
        root.querySelectorAll(kind === "vi" ? "[data-vi]" : "[data-py]").forEach(function (p) {
          p.classList.toggle("hidden", !show);
        });
      });
    });

    root.querySelector("[data-rate]").addEventListener("change", function (e) {
      rate = parseFloat(e.target.value) || 1;
    });
  }

  var rate = 1;

  function setRowBtn(i, label) {
    var row = result.querySelector('[data-row="' + i + '"]');
    if (row) row.querySelector("[data-play]").textContent = label;
  }
  function updatePlayAllBtn() {
    var b = result.querySelector("[data-play-all]");
    if (b) {
      b.textContent = playAll ? "⏹ Dừng" : "🔊 Phát cả bài";
      if (playAll) b.classList.add("btn-main");
    }
    result.querySelectorAll("[data-play]").forEach(function (b2, i) {
      b2.textContent = i === activeIdx ? "⏹" : "▶";
    });
  }
  function highlight(i, charIdx) {
    var row = result.querySelector('[data-row="' + i + '"]');
    if (!row) return;
    row.querySelectorAll(".zh-char").forEach(function (sp, k) {
      sp.style.cssText = k === charIdx ? HL : "";
    });
  }
  function clearHighlight(i) {
    var row = result.querySelector('[data-row="' + i + '"]');
    if (!row) return;
    row.querySelectorAll(".zh-char").forEach(function (sp) { sp.style.cssText = ""; });
  }

  /* Phát 1 câu (kết nối chuỗi nếu chain=true).
     Có TTS: onboundary highlight theo charIndex, onend nối câu tiếp.
     Không TTS (hoặc lỗi): fallback timer chia đều thời lượng ~260ms/ký tự/rate. */
  function playFrom(i, chain) {
    if (!current || i >= current.sentences.length) {
      activeIdx = -1;
      playAll = false;
      updatePlayAllBtn();
      return;
    }
    var myGen = ++gen;
    activeIdx = i;
    updatePlayAllBtn();

    var s = current.sentences[i];
    var len = s.zh.length;
    var finished = false;
    var timer = null;
    var grace = null;

    function done() {
      if (finished || myGen !== gen) return;
      finished = true;
      clearTimers();
      clearHighlight(i);
      if (chain) {
        playFrom(i + 1, true);
      } else {
        activeIdx = -1;
        updatePlayAllBtn();
      }
    }

    /* fallback / không có boundary: chạy highlight tuần tự */
    var k = 0;
    timer = setInterval(function () {
      if (myGen !== gen) { clearInterval(timer); return; }
      k++;
      if (k >= len) {
        clearInterval(timer);
        timer = null;
        if (!("speechSynthesis" in window)) { done(); return; } // không TTS → timer điều phối
        /* có TTS nhưng boundary không bắn: chờ onend, thêm grace chống treo */
        if (grace === null) {
          grace = setTimeout(done, 2500);
          timers.push(grace);
        }
        return;
      }
      highlight(i, k);
    }, 260 / rate);
    timers.push(timer);

    if ("speechSynthesis" in window) {
      try {
        speechSynthesis.cancel();
        var u = new SpeechSynthesisUtterance(s.zh);
        u.lang = "zh-CN";
        u.rate = rate;
        var voiced = speechSynthesis.getVoices().filter(function (v) { return /^zh/i.test(v.lang); });
        if (voiced[0]) u.voice = voiced[0];
        u.onboundary = function (e) {
          if (myGen !== gen) return;
          if (timer) { clearInterval(timer); timer = null; }
          highlight(i, Math.min(e.charIndex || 0, len - 1));
        };
        u.onend = done;
        u.onerror = done;
        speechSynthesis.speak(u);
      } catch (e) { /* timer fallback vẫn chạy */ }
    }
  }

  /* ---------- Câu hỏi & Từ vựng (chỉ cho văn bản mẫu) ---------- */
  function renderExtras() {
    var host = result.querySelector("[data-extras]");
    var d = current.extras;

    var html =
      '<h3 class="text-xl font-extrabold mt-6 mb-3">Câu hỏi &amp; Từ vựng</h3>' +
      '<div class="space-y-3">' +
        d.questions.map(function (q, qi) {
          return (
            '<div class="border-2 border-[var(--nhai-border)] rounded-lg p-3" data-q="' + qi + '">' +
              '<p class="zh font-bold">' + esc(q.q) + "</p>" +
              '<p class="text-xs text-[var(--nhai-muted)] mb-2">' + esc(q.qVi) + "</p>" +
              '<div class="grid sm:grid-cols-2 gap-2">' +
                q.options.map(function (opt, oi) {
                  return '<button type="button" data-opt="' + oi + '" class="btn-ghost zh text-left px-3 py-2 rounded-lg text-sm">' +
                    String.fromCharCode(65 + oi) + ". " + esc(opt) + "</button>";
                }).join("") +
              "</div>" +
            "</div>"
          );
        }).join("") +
      "</div>" +
      '<h3 class="text-lg font-extrabold mt-6 mb-2">Từ vựng trong bài</h3>' +
      '<ul class="grid sm:grid-cols-2 gap-2 mb-2">' +
        d.vocab.map(function (v) {
          return (
            '<li class="border-2 border-[var(--nhai-border)] rounded-lg px-3 py-2 flex items-center gap-3">' +
              '<span class="zh font-bold text-lg">' + esc(v.word) + "</span>" +
              '<span class="zh text-xs text-[var(--nhai-accent)]">' + esc(v.py) + "</span>" +
              '<span class="text-sm text-[var(--nhai-muted)] flex-1">' + esc(v.vi) + "</span>" +
              '<button type="button" data-star="' + esc(v.word) + '" class="btn-ghost w-8 h-8 rounded-full shrink-0" aria-label="Thêm ' + esc(v.word) + ' vào sổ từ vựng">⭐</button>' +
            "</li>"
          );
        }).join("") +
      "</ul>";

    host.innerHTML = html;

    host.querySelectorAll("[data-q]").forEach(function (card) {
      var qi = Number(card.getAttribute("data-q"));
      card.querySelectorAll("[data-opt]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var oi = Number(btn.getAttribute("data-opt"));
          var correct = oi === d.questions[qi].answer;
          card.querySelectorAll("[data-opt]").forEach(function (b) {
            b.classList.remove("border-[var(--nhai-main)]", "text-[var(--nhai-main)]");
          });
          if (correct) {
            btn.classList.add("border-[var(--nhai-main)]", "text-[var(--nhai-main)]");
            NHAI.toast("Chính xác! 🎉");
          } else {
            NHAI.toast("Chưa đúng — thử lại nhé!");
          }
        });
      });
    });

    host.querySelectorAll("[data-star]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        NHAI.toast("Đã thêm「" + btn.getAttribute("data-star") + "」vào sổ từ vựng (demo) ⭐");
      });
    });
  }

  /* ---------- init ---------- */
  renderDemoList();
  renderAccount();
  lastLoggedIn = NHAI.isLoggedIn();
})();
