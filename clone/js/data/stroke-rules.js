/* Nhai HSK clone — PLAN-20: 7 quy tắc thứ tự nét + 3 nét luôn viết sau cùng. */
(function () {
  window.NHAI_DATA = window.NHAI_DATA || {};

  NHAI_DATA.strokeRules = [
    { n: 1, name: "Trước – sau", chars: ["爸"], desc: "Nét trước viết trước, không cắt ngang nét sau." },
    { n: 2, name: "Trên – dưới", chars: ["月"], desc: "Viết nét trên xong mới xuống nét dưới." },
    { n: 3, name: "Trái – phải", chars: ["们"], desc: "Nét bên trái trước, sang bên phải." },
    { n: 4, name: "Ngoài – trong", chars: ["国"], desc: "Khung ngoài kín trước, phần trong sau." },
    { n: 5, name: "Chạm – cắt", chars: ["区"], desc: "Chạm vào nét trước, không cắt qua nó." },
    { n: 6, name: "Đóng trước – mở sau", chars: ["夫"], desc: "Nét khép kín viết trước nét mở." },
    { n: 7, name: "Viết nét cuối", chars: ["女"], desc: "Nét chéo kéo dài luôn là nét cuối." }
  ];

  NHAI_DATA.lastStrokes = [
    { glyph: "辶", name: "đi" },
    { glyph: "廴", name: "quy" },
    { glyph: "ㄑ", name: "nét chéo phải" }
  ];
})();
