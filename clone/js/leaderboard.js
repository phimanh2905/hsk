/* Nhai HSK clone — PLAN-01: bảng xếp hạng (leaderboard.html)
   2 tab: XP tổng (?tab=xp) / Đấu trí tháng (?tab=battle), đổi tab không reload. */
(function () {
  "use strict";

  var MEDALS = ["🥇", "🥈", "🥉"];

  function initials(name) {
    var words = String(name)
      .replace(/\([^)]*\)/g, "")     // bỏ phần trong ngoặc: (Wuynhh)
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    var a = (words[0] || "?").charAt(0);
    var b = words.length > 1 ? words[1].charAt(0) : "";
    return (a + b).toUpperCase();
  }

  function row(rank, name, rightText, rightSub) {
    var medal = rank <= 3 ? MEDALS[rank - 1] : "#" + rank;
    return NHAI.el(
      "<li>" +
        '<div class="card px-4 py-3 flex items-center gap-3">' +
          '<span class="w-10 shrink-0 text-center font-extrabold">' + medal + "</span>" +
          '<span class="w-10 h-10 shrink-0 rounded-full bg-[var(--nhai-main)] text-white flex items-center justify-center text-sm font-extrabold">' + initials(name) + "</span>" +
          '<span class="font-semibold min-w-0 truncate">' + name + "</span>" +
          '<span class="ml-auto shrink-0 text-right">' +
            '<span class="font-extrabold text-[var(--nhai-main)]">' + rightText + "</span>" +
            (rightSub ? '<span class="block text-xs text-[var(--nhai-muted)]">' + rightSub + "</span>" : "") +
          "</span>" +
        "</div>" +
      "</li>"
    );
  }

  function renderList(tab) {
    var list = document.getElementById("lb-list");
    if (!list) return;
    list.innerHTML = "";

    if (tab === "battle") {
      NHAI_DATA.leaderboard.battle.forEach(function (r, i) {
        list.appendChild(row(i + 1, r.name, r.score, r.time));
      });
    } else {
      NHAI_DATA.leaderboard.xp.forEach(function (r, i) {
        list.appendChild(row(i + 1, r.name, r.points.toLocaleString("vi-VN") + " XP", ""));
      });
    }
  }

  function setTab(tab) {
    var url = new URL(location.href);
    url.searchParams.set("tab", tab);
    history.replaceState(null, "", url);
    render();
  }

  function render() {
    var tab = NHAI.q("tab", "xp");
    if (tab !== "xp" && tab !== "battle") tab = "xp";
    document.querySelectorAll("[data-tab]").forEach(function (b) {
      var active = b.getAttribute("data-tab") === tab;
      b.classList.toggle("pill-active", active);
      b.classList.toggle("pill", !active);
      b.setAttribute("aria-selected", active ? "true" : "false");
    });
    renderList(tab);
  }

  function boot() {
    document.querySelectorAll("[data-tab]").forEach(function (b) {
      b.addEventListener("click", function () { setTab(b.getAttribute("data-tab")); });
    });
    render();
  }

  if (document.readyState === "complete") {
    boot();
  } else {
    document.addEventListener("DOMContentLoaded", boot);
  }
})();
