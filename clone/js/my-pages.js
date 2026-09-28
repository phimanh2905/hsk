/* Nhai HSK clone — PLAN-05: các trang login-gated (my-vocab, my-grammar, progress).
   Màn khoá chung 🔒; progress có 3 card tiến độ demo khi nhai.mockLogin=1. */
(function () {
  "use strict";

  var PAGES = {
    "my-vocab": {
      desc: "Sổ tay từ vựng của bạn sẽ xuất hiện ở đây sau khi đăng nhập."
    },
    "my-grammar": {
      desc: "Sổ tay ngữ pháp của bạn sẽ xuất hiện ở đây sau khi đăng nhập."
    },
    "progress": {
      desc: "Tiến độ học của bạn sẽ được đồng bộ sau khi đăng nhập."
    }
  };

  function pageKey() {
    var main = document.querySelector("main[data-page]");
    return main ? main.getAttribute("data-page") : null;
  }

  function renderLocked(desc) {
    var body = document.getElementById("page-body");
    if (!body) return;
    body.innerHTML = "";
    body.appendChild(NHAI.el(
      '<div class="card shadow-neo p-10 text-center">' +
        '<div class="text-6xl mb-4" aria-hidden="true">🔒</div>' +
        '<h2 class="text-2xl font-extrabold mb-2">Đăng nhập để xem</h2>' +
        '<p class="text-sm text-[var(--nhai-muted)] mb-6">' + desc + "</p>" +
        '<button type="button" data-login-btn class="btn-main px-6 py-2.5">Đăng nhập</button>' +
      "</div>"
    ));
    body.querySelector("[data-login-btn]").addEventListener("click", function () {
      if (NHAI.openLogin) NHAI.openLogin();
    });
  }

  function progressCard(title, sub, done, total) {
    var pct = total ? Math.round((done / total) * 100) : 0;
    return (
      '<div class="card shadow-neo p-5">' +
        '<div class="flex items-center justify-between mb-1">' +
          '<h3 class="font-extrabold">' + title + "</h3>" +
          '<span class="text-sm font-bold text-[var(--nhai-main)]">' + done + "/" + total + "</span>" +
        "</div>" +
        '<p class="text-xs text-[var(--nhai-muted)] mb-3">' + sub + "</p>" +
        '<div class="h-3 rounded-full bg-[var(--nhai-soft)] border-2 border-[var(--nhai-border)] overflow-hidden">' +
          '<div class="h-full bg-[var(--nhai-main)]" style="width:' + pct + '%"></div>' +
        "</div>" +
      "</div>"
    );
  }

  function renderProgressLoggedIn() {
    var body = document.getElementById("page-body");
    if (!body) return;
    body.innerHTML = "";
    body.appendChild(NHAI.el(
      '<div class="grid sm:grid-cols-3 gap-4 mb-6">' +
        progressCard("HSK 1", "bài học đã hoàn thành", 2, 15) +
        progressCard("Pinyin", "âm đã luyện trên bảng pinyin", 0, 406) +
        progressCard("Bộ thủ", "bộ thủ đã thuộc", 0, 214) +
      "</div>"
    ));
    var logout = NHAI.el('<button type="button" data-logout class="btn-ghost px-5 py-2.5 text-sm">Đăng xuất (demo)</button>');
    logout.addEventListener("click", function () {
      try { localStorage.removeItem("nhai.mockLogin"); } catch (e) { /* silent */ }
      NHAI.toast("Đã đăng xuất (demo)");
      render();
    });
    body.appendChild(logout);
  }

  function renderMyPageEmpty(kind) {
    var body = document.getElementById("page-body");
    if (!body) return;
    var noun = kind === "my-grammar" ? "ngữ pháp" : "từ vựng";
    body.innerHTML = "";
    body.appendChild(NHAI.el(
      '<div class="card shadow-neo p-10 text-center">' +
        '<div class="text-5xl mb-3">' + (kind === "my-grammar" ? "📘" : "📓") + "</div>" +
        '<h2 class="text-2xl font-extrabold mb-2">Sổ tay ' + noun + " đang trống</h2>" +
        '<p class="text-sm text-[var(--nhai-muted)] mb-5">Lưu ' + noun + " bằng nút ⭐ hoặc 🔖 trong bài học, chúng sẽ xuất hiện ở đây.</p>" +
        '<a href="course.html" class="btn-main px-5 py-2.5">Vào kệ sách</a>' +
      "</div>"
    ));
  }

  function render() {
    var key = pageKey();
    if (!key || !PAGES[key]) return;
    var loggedIn = false;
    try { loggedIn = !!NHAI.isLoggedIn(); } catch (e) { loggedIn = false; }
    if (!loggedIn) renderLocked(PAGES[key].desc);
    else if (key === "progress") renderProgressLoggedIn();
    else renderMyPageEmpty(key);
  }

  function init() {
    render();
    /* shell render xong → đăng nhập từ modal phải làm mới trang */
    document.addEventListener("nhai:shell-ready", render);
    /* bấm nút đăng nhập trong modal → re-render sau khi modal xử lý */
    document.addEventListener("click", function (e) {
      if (e.target.closest && e.target.closest("[data-do-login], [data-provider]")) {
        setTimeout(render, 80);
      }
    });
  }

  if (document.readyState === "complete") init();
  else document.addEventListener("DOMContentLoaded", init);
})();
