/* Nhai HSK clone — PLAN-01: góp ý (feedback.html) */
(function () {
  "use strict";

  function boot() {
    var form = document.getElementById("feedback-form");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var text = document.getElementById("feedback-text").value.trim();
      if (!text) return;
      try {
        var stored = [];
        try { stored = JSON.parse(localStorage.getItem("nhai.feedback") || "[]"); } catch (err) { stored = []; }
        stored.push({ text: text, at: new Date().toISOString() });
        localStorage.setItem("nhai.feedback", JSON.stringify(stored));
      } catch (err) { /* localStorage có thể bị chặn — vẫn hiện toast */ }
      document.getElementById("feedback-text").value = "";
      NHAI.toast("Cảm ơn bạn! Góp ý đã được ghi nhận.");
    });
  }

  if (document.readyState === "complete") {
    boot();
  } else {
    document.addEventListener("DOMContentLoaded", boot);
  }
})();
