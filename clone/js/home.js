/* Nhai HSK clone — PLAN-01: trang chủ (index.html) */
(function () {
  "use strict";

  function renderCourses() {
    var grid = document.getElementById("course-grid");
    if (!grid || !window.NHAI_DATA || !NHAI_DATA.courses) return;

    NHAI_DATA.courseOrder.forEach(function (slug) {
      var b = NHAI_DATA.courses[slug];
      var card = NHAI.el(
        '<a href="course.html?book=' + b.slug + '" ' +
          'class="card shadow-neo p-5 block hover:-translate-y-1 transition-transform">' +
          '<div class="flex items-start justify-between gap-2 mb-1">' +
            '<h3 class="text-lg font-extrabold">' + b.name + "</h3>" +
            '<span class="text-xl" aria-hidden="true">📕</span>' +
          "</div>" +
          '<p class="text-xs text-[var(--nhai-muted)] mb-2">' + b.zh + "</p>" +
          '<p class="text-sm font-semibold text-[var(--nhai-main)]">' + b.meta + "</p>" +
        "</a>"
      );
      grid.appendChild(card);
    });
  }

  if (document.readyState === "complete") {
    renderCourses();
  } else {
    document.addEventListener("DOMContentLoaded", renderCourses);
  }
})();
