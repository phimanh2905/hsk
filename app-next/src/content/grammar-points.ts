// app-next/src/content/grammar-points.ts
/* Sổ tay ngữ pháp — 6 điểm port 1:1 opendesign_hsk/my-grammar.html DATA array
   (spec 2026-10-05 §2.1). pitfall tách <b>…</b> của mock thành [bold, rest].
   Content giáo dục tĩnh; trạng thái ★ "Đã lưu" là user data (bye.grammarMeta). */

export type GrammarTopic = "ba" | "bi" | "bongu" | "hutu";

export type GrammarPoint = {
  id: string;
  title: string;
  hz: string;
  level: "HSK 1" | "HSK 2" | "HSK 3" | "HSK 4" | "HSK 5" | "HSK 6";
  topic: GrammarTopic;
  def: string;
  formula: [label: string, isKey?: "key"][];
  pitfall: [lead: string, bold: string, rest: string]; // ghép 3 phần = đúng câu mock; render "Bẫy người Việt: {lead}<b>{bold}</b>{rest}"
  ex: { hz: string; py: string; vi: string }[];
};

export const GRAMMAR_TOPICS: [key: GrammarTopic | "all" | "saved", label: string][] = [
  ["all", "Tất cả"],
  ["ba", "Câu chữ 把 / 被"],
  ["bi", "Câu so sánh 比"],
  ["bongu", "Bổ ngữ kết quả / khả năng"],
  ["hutu", "Hư từ & Liên từ"],
  ["saved", "⭐ Đã lưu"],
];

export const GRAMMAR_LEVELS = ["all", "HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5", "HSK 6"] as const;

export const GRAMMAR_POINTS: GrammarPoint[] = [
  { id: "ba", title: "CÂU CHỮ 把", hz: "把字句", level: "HSK 3", topic: "ba",
    def: "Xử lý tân ngữ và kết quả hành động — nhấn mạnh cách xử lý sự vật.",
    formula: [["S"], ["把", "key"], ["Tân ngữ"], ["Động từ"], ["Thành phần khác"]],
    pitfall: ["Động từ ", "không được đứng đơn độc", " sau tân ngữ — phải có bổ ngữ, 了, hoặc thành phần khác."],
    ex: [
      { hz: "请把书打开。", py: "Qǐng bǎ shū dǎkāi.", vi: "Xin hãy mở sách ra." },
      { hz: "把门关上吧。", py: "Bǎ mén guānshang ba.", vi: "Hãy đóng cửa lại đi." },
    ] },
  { id: "bi", title: "CÂU SO SÁNH 比", hz: "比字句", level: "HSK 2", topic: "bi",
    def: "So sánh mức độ / tính chất giữa hai đối tượng.",
    formula: [["A"], ["比", "key"], ["B"], ["Tính từ"], ["Số lượng cụ thể"]],
    pitfall: ["", "Không thêm 很 / 非常", " trước tính từ trong câu 比 — mức độ nằm ở phần số lượng."],
    ex: [{ hz: "他比我高五厘米。", py: "Tā bǐ wǒ gāo wǔ límǐ.", vi: "Anh ấy cao hơn tôi 5 cm." }] },
  { id: "lian", title: "LIÊN TỪ 连…也 / 都…", hz: "连字句", level: "HSK 4", topic: "hutu",
    def: "Nhấn mạnh trường hợp cực đoan — “đến cả… cũng…”/“ngay cả…”.",
    formula: [["连", "key"], ["Trường hợp cực đoan"], ["也 / 都", "key"], ["Vị ngữ"]],
    pitfall: ["连 phải đi với 也 hoặc 都 — ", "thiếu là sai cấu trúc", ", người Việt hay bỏ quên."],
    ex: [{ hz: "他连一杯水也不喝。", py: "Tā lián yì bēi shuǐ yě bù hē.", vi: "Anh ấy đến một ngụm nước cũng không uống." }] },
  { id: "bongu", title: "BỔ NGỮ KẾT QUẢ", hz: "到 / 见 / 完", level: "HSK 3", topic: "bongu",
    def: "Biểu thị hành động đạt được kết quả cụ thể.",
    formula: [["Động từ"], ["到 / 见 / 完", "key"], ["Tân ngữ"]],
    pitfall: ["Bổ ngữ kết quả ", "đứng sát động từ", " — không chèn tân ngữ vào giữa như tiếng Việt."],
    ex: [
      { hz: "我听见了。", py: "Wǒ tīngjiàn le.", vi: "Tôi nghe thấy rồi." },
      { hz: "作业做完了。", py: "Zuòyè zuò wán le.", vi: "Bài tập làm xong rồi." },
    ] },
  { id: "bei", title: "CÂU CHỮ 被", hz: "被字句", level: "HSK 3", topic: "ba",
    def: "Câu bị động — chủ ngữ chịu tác động của hành động.",
    formula: [["S (chịu tác động)"], ["被", "key"], ["Tác nhân"], ["Động từ"], ["Thành phần khác"]],
    pitfall: ["Sau 被 thường ", "không dùng động từ đơn độc", " — cần bổ ngữ hoặc trợ từ đi kèm."],
    ex: [{ hz: "我的手机被他拿走了。", py: "Wǒ de shǒujī bèi tā ná zǒu le.", vi: "Điện thoại của tôi bị anh ấy cầm đi mất rồi." }] },
  { id: "yue", title: "CÀNG… CÀNG…", hz: "越…越…", level: "HSK 4", topic: "hutu",
    def: "Diễn tả hai sự việc cùng tăng tiến theo nhau.",
    formula: [["越", "key"], ["Điều kiện"], ["越", "key"], ["Kết quả"]],
    pitfall: ["Hai vế 越 ", "phải song hành cùng chủ ngữ logic", " — không đổi chủ ngữ giữa chừng."],
    ex: [{ hz: "越学越有意思。", py: "Yuè xué yuè yǒu yìsi.", vi: "Càng học càng thấy thú vị." }] },
];
