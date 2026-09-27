/* Nhai HSK clone — dữ liệu mẫu "Tạo file" (PLAN-08). window.NHAI_DATA.templates
   Mỗi template: name, desc, group (section ở hub), defInput (danh sách chữ/từ mặc định),
   fields (form cấu hình nào được hiện). */
(function () {
  "use strict";
  window.NHAI_DATA = window.NHAI_DATA || {};

  NHAI_DATA.templates = {
    "stroke-order": {
      name: "Luyện viết theo thứ tự nét",
      desc: "Mỗi chữ: ô mẫu đánh số nét → từng bước thêm nét (nét mới tô đỏ) → hàng chữ mờ để tô.",
      group: "hanzi",
      defInput: "永 远 学 习 汉 字",
      fields: { input: true, rows: false, py: false, mean: false }
    },
    "big-char": {
      name: "Ô chữ lớn",
      desc: "Chữ mẫu ô lớn bên trái, pinyin + thứ tự nét + nghĩa ở trên, hàng tô bên phải.",
      group: "hanzi",
      defInput: "永 远 学 习 汉 字",
      fields: { input: true, rows: false, py: true, mean: true }
    },
    "vocab": {
      name: "Luyện viết từ vựng",
      desc: "Từ + pinyin + nghĩa + câu ví dụ, pinyin trên từng ô, hàng tô theo lượt.",
      group: "vocab",
      defInput: "你好 王老师 大家 好",
      fields: { input: true, rows: true, py: true, mean: true }
    },
    "vocab-check": {
      name: "Kiểm tra từ vựng",
      desc: "Từ + nghĩa + câu ví dụ, không có chữ mẫu — tự kiểm tra viết lại từ.",
      group: "vocab",
      defInput: "你好 王老师 大家 好",
      fields: { input: true, rows: true, py: true, mean: true }
    },
    "copy": {
      name: "Chép chữ",
      desc: "Hàng chữ mẫu in đậm xen kẽ hàng ô trống để chép.",
      group: "vocab",
      defInput: "永 远 学 习 汉 字",
      fields: { input: true, rows: true, py: false, mean: false }
    },
    "cover": {
      name: "Trang bìa",
      desc: "Trang bìa sổ luyện viết: họ tên, lớp, năm học và chữ 练.",
      group: "vocab",
      defInput: "",
      fields: { input: false, rows: false, py: false, mean: false }
    },
    "pinyin-lines": {
      name: "Dòng pinyin",
      desc: "Mỗi dòng có pinyin mờ trên ô kẻ sẵn vạch pinyin, chữ để trống.",
      group: "pinyin",
      defInput: "nǐ hǎo mā ma xiè xie",
      fields: { input: true, rows: true, py: false, mean: false }
    },
    "pinyin-write": {
      name: "Viết pinyin",
      desc: "Ô vuông trống kèm dòng kẻ pinyin 4 dòng bên dưới để tập viết âm.",
      group: "pinyin",
      defInput: "",
      fields: { input: false, rows: true, py: false, mean: false }
    },
    "blank-grid": {
      name: "Ô trống",
      desc: "Lưới 12×14 ô vuông kẻ chéo nét đứt như giấy tập Trung Quốc.",
      group: "pinyin",
      defInput: "",
      fields: { input: false, rows: false, py: false, mean: false }
    },
    "radicals": {
      name: "214 Bộ thủ",
      desc: "214 bộ thủ Kangxi, mỗi ô: bộ thủ + tên Hán Việt (mở từ trang Bộ thủ).",
      group: "hanzi",
      defInput: "",
      fields: { input: false, rows: true, py: false, mean: false }
    }
  };
})();
