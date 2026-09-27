/* Nhai HSK clone — PLAN-01: trang khóa học (course.html)
   2 mode: kệ sách (không ?book) và khóa học (?book=hsk1&skill=vocab|grammar|hanzi). */
(function () {
  "use strict";

  var SKILLS = [
    { key: "vocab", label: "Từ vựng · 词汇" },
    { key: "grammar", label: "Ngữ pháp · 语法" },
    { key: "hanzi", label: "Chữ Hán · 汉字" }
  ];

  function root() { return document.getElementById("course-root"); }

  function currentSkill() {
    var s = NHAI.q("skill", "vocab");
    return SKILLS.some(function (k) { return k.key === s; }) ? s : "vocab";
  }

  /* ---------- mode 1: kệ sách ---------- */
  function renderShelf() {
    var host = root();
    host.innerHTML = "";

    var wrap = NHAI.el('<div class="mb-8"><h1 class="text-3xl font-extrabold tracking-tight">Bài khoá — Kệ sách</h1></div>');
    var grid = NHAI.el('<div class="grid sm:grid-cols-2 gap-4"></div>');
    NHAI_DATA.courseOrder.forEach(function (slug) {
      var b = NHAI_DATA.courses[slug];
      grid.appendChild(NHAI.el(
        '<a href="course.html?book=' + b.slug + '" class="card shadow-neo p-5 block hover:-translate-y-1 transition-transform">' +
          '<div class="flex items-start justify-between gap-2 mb-1">' +
            '<h2 class="text-lg font-extrabold">' + b.name + "</h2>" +
            '<span class="text-xl" aria-hidden="true">📕</span>' +
          "</div>" +
          '<p class="text-xs text-[var(--nhai-muted)] mb-2">' + b.zh + "</p>" +
          '<p class="text-sm font-semibold text-[var(--nhai-main)] mb-1">' + b.meta + "</p>" +
          '<p class="text-xs text-[var(--nhai-muted)]">' + b.lessonCount + " bài</p>" +
        "</a>"
      ));
    });
    wrap.appendChild(grid);
    host.appendChild(wrap);
  }

  /* ---------- mode 2: một khóa học ---------- */
  function lessonRowVocab(slug, item) {
    var meta = (slug === "hsk1" ? "" : "≈") + item.words + " từ vựng";
    return NHAI.el(
      '<a href="lesson.html?book=' + slug + "&page=" + item.pageId + '" ' +
        'class="card shadow-neo px-4 py-3 flex items-center gap-3 hover:-translate-y-0.5 transition-transform">' +
        '<span class="grid-cell rounded-md w-9 h-9 shrink-0 font-extrabold text-sm">' + item.order + "</span>" +
        '<span class="font-semibold min-w-0 truncate">' + item.title + "</span>" +
        '<span class="ml-auto shrink-0 text-xs text-[var(--nhai-muted)]">' + meta + "</span>" +
      "</a>"
    );
  }

  function lessonRowLocked(item) {
    var btn = NHAI.el(
      '<button type="button" data-locked ' +
        'class="card shadow-neo px-4 py-3 w-full flex items-center gap-3 text-left hover:-translate-y-0.5 transition-transform">' +
        '<span class="grid-cell rounded-md w-9 h-9 shrink-0 font-extrabold text-sm">' + item.order + "</span>" +
        '<span class="font-semibold min-w-0 truncate">' + item.title + "</span>" +
        '<span class="ml-auto shrink-0 text-xs text-[var(--nhai-muted)]">' + item.meta + ' <span aria-label="Cần đăng nhập">🔒</span></span>' +
      "</button>"
    );
    btn.addEventListener("click", function () { NHAI.openLogin(); });
    return btn;
  }

  function renderBook(slug) {
    var book = NHAI_DATA.courses[slug];
    var skill = currentSkill();
    var host = root();
    host.innerHTML = "";

    /* breadcrumb + badge + tên + số bài */
    var head = NHAI.el(
      '<div class="flex flex-wrap items-center gap-2 mb-4">' +
        '<a href="index.html" class="text-sm font-semibold text-[var(--nhai-muted)] hover:text-[var(--nhai-main)]">Trang chủ</a>' +
        '<span class="text-sm text-[var(--nhai-muted)]">/</span>' +
        '<span class="pill pill-active text-xs">Nhai</span>' +
        '<span class="font-bold">' + book.name + "</span>" +
        '<span class="text-sm text-[var(--nhai-muted)]">· ' + book.lessonCount + " bài</span>" +
      "</div>"
    );
    host.appendChild(head);

    host.appendChild(NHAI.el(
      '<div class="mb-1"><h1 class="text-3xl font-extrabold tracking-tight">' + book.name + (slug === "hsk79" ? "" : " 3.0") + "</h1>" +
      '<p class="zh text-[var(--nhai-muted)]">' + book.zh + "</p></div>"
    ));

    /* tab kỹ năng */
    var tabs = NHAI.el('<div class="flex flex-wrap gap-2 my-4" role="tablist" aria-label="Kỹ năng"></div>');
    SKILLS.forEach(function (s) {
      var b = NHAI.el(
        '<button type="button" role="tab" data-skill="' + s.key + '" ' +
          'class="pill ' + (s.key === skill ? "pill-active" : "") + '">' + s.label + "</button>"
      );
      b.addEventListener("click", function () { setSkill(s.key); });
      tabs.appendChild(b);
    });
    host.appendChild(tabs);

    /* tiến độ học */
    host.appendChild(NHAI.el(
      '<div class="card p-4 mb-4">' +
        '<div class="flex items-center justify-between mb-2">' +
          '<span class="font-bold text-sm">Tiến độ học</span>' +
          '<span class="text-sm font-semibold text-[var(--nhai-muted)]">0/' + book.lessonCount + " bài</span>" +
        "</div>" +
        '<div class="h-3 rounded-full border-2 border-[var(--nhai-border)] bg-[var(--nhai-bg)] overflow-hidden">' +
          '<div class="h-full bg-[var(--nhai-main)]" style="width:0%"></div>' +
        "</div>" +
      "</div>"
    ));

    /* danh sách bài theo skill */
    var list = NHAI.el('<div class="space-y-3 mb-6" data-lesson-list></div>');
    if (skill === "vocab") {
      book.list.forEach(function (item) { list.appendChild(lessonRowVocab(slug, item)); });
    } else if (skill === "grammar") {
      book.grammar.forEach(function (item) { list.appendChild(lessonRowLocked(item)); });
    } else {
      book.hanzi.forEach(function (item) { list.appendChild(lessonRowLocked(item)); });
    }
    host.appendChild(list);

    /* nút Tổng ôn */
    host.appendChild(NHAI.el(
      '<a href="review.html" class="btn-main inline-block px-6 py-3">Tổng ôn</a>'
    ));
  }

  function setSkill(key) {
    var url = new URL(location.href);
    url.searchParams.set("skill", key);
    history.replaceState(null, "", url);
    render(); // re-render không reload
  }

  function render() {
    var slug = NHAI.q("book", null);
    if (!slug || !NHAI_DATA.courses[slug]) {
      if (slug) {
        // book không tồn tại → fallback hsk1 (không trang trắng)
        var url = new URL(location.href);
        url.searchParams.set("book", "hsk1");
        history.replaceState(null, "", url);
      }
      slug = "hsk1";
    }
    renderBook(slug);
  }

  function boot() {
    if (!window.NHAI_DATA || !NHAI_DATA.courses) return;
    if (NHAI.q("book", null)) render();
    else renderShelf();
  }

  if (document.readyState === "complete") {
    boot();
  } else {
    document.addEventListener("DOMContentLoaded", boot);
  }
})();
