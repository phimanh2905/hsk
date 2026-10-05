/* Pinyin Lab — dữ liệu port 1:1 opendesign_hsk/pinyin.html (spec 2026-10-05 §2).
   Tách khỏi content/pinyin.ts (matrix 406 âm tiết). Tiền tố PINYIN_LAB_ tránh đụng tên. */

export type PinyinLabGroup = { label: string; items: string[] };
export type PinyinLabToneRow = [py: string, zh: string, vi: string];
export type PinyinLabFinalsGroup = { label: string; items: [py: string, ex: string][] };
export type PinyinLabSandhi = { t: string; d: string; ex: [py: string, zh: string, vi: string][] };
export type PinyinLabToneCard = {
  name: string;
  sub: string;
  contour: "flat" | "up" | "dip" | "down";
  ex: { py: string; zh: string; vi: string };
};

export const PINYIN_LAB_GROUPS: PinyinLabGroup[] = [
  { label: "Âm môi · 唇音", items: ["b", "p", "m", "f"] },
  { label: "Âm đầu lưỡi · 舌尖音", items: ["d", "t", "n", "l"] },
  { label: "Âm cuống lưỡi · 舌根音", items: ["g", "k", "h"] },
  { label: "Âm mặt lưỡi · 舌面音", items: ["j", "q", "x"] },
  { label: "Âm uốn lưỡi · 翘舌音", items: ["zh", "ch", "sh", "r"] },
  { label: "Âm răng · 平舌音", items: ["z", "c", "s"] },
  { label: "Bán nguyên âm", items: ["w", "y"] },
];

export const PINYIN_LAB_DESC: Record<string, string> = {
  b: "Âm hai môi, không bật hơi — nghe trầm gọn, gần âm B tiếng Việt nhưng nhẹ hơn.",
  p: "Âm hai môi, bật hơi mạnh — đặt mu bàn tay trước miệng sẽ cảm nhận luồng hơi rõ.",
  m: "Âm hai môi, luồng hơi thoát qua mũi, dây thanh rung.",
  f: "Răng trên chạm môi dưới, hơi xát thoát ra — như âm F.",
  d: "Đầu lưỡi chạm lợi răng trên, bật mở gọn, không bật hơi.",
  t: "Như d nhưng bật hơi mạnh — phân biệt d/t chính bằng luồng hơi.",
  n: "Đầu lưỡi chạm lợi, hơi thoát qua mũi — như N.",
  l: "Đầu lưỡi chạm lợi, hơi thoát hai bên rìa lưỡi — như L.",
  g: "Cuống lưỡi nâng chặn vòm mềm, bật mở gọn, không bật hơi.",
  k: "Như g nhưng bật hơi mạnh — phân biệt g/k bằng luồng hơi.",
  h: "Hơi xát qua họng, không ma sát mạnh — nhẹ hơn H tiếng Việt.",
  j: "Mặt lưỡi nâng sát vòm cứng, bật mở gọn, không bật hơi.",
  q: "Vị trí như j nhưng bật hơi mạnh — cặp đối lập j/q.",
  x: "Mặt lưỡi gần vòm cứng, hơi xát ra — như tiếng “xì” nhẹ.",
  zh: "Đầu lưỡi cuộn lên vòm cứng, bật mở gọn, không bật hơi.",
  ch: "Như zh nhưng bật hơi mạnh — cặp đối lập zh/ch.",
  sh: "Đầu lưỡi cuộn, hơi xát mạnh — âm “s” nặng, uốn lưỡi.",
  r: "Đầu lưỡi cuộn, hơi thoát kèm rung nhẹ — gần âm R.",
  z: "Đầu lưỡi ngay sau răng, bật mở gọn, không bật hơi.",
  c: "Vị trí như z nhưng bật hơi mạnh — cặp đối lập z/c.",
  s: "Hơi xát qua kẽ răng — như âm X nhưng đầu lưỡi thấp hơn.",
  w: "Tròn môi, lướt như “u” dài — gần W tiếng Anh.",
  y: "Mặt lưỡi nâng cao, lướt như “i” dài — gần Y tiếng Anh.",
};

export const PINYIN_LAB_TIP: Record<string, string> = {
  b: "Hai môi khép chặt cản luồng hơi, mở nhẹ, dây thanh KHÔNG rung thêm — tương đương P tiếng Việt (không phải B).",
  p: "Giống b nhưng tung luồng hơi mạnh — thử với tờ giấy trước miệng.",
  m: "Khép môi, để hơi đi qua mũi, ngân như “mmm”.",
  f: "Cắn nhẹ môi dưới bằng răng trên rồi thổi hơi ra.",
  d: "Đầu lưỡi ép lợi răng trên rồi bật mở — gọn, không kèm hơi.",
  t: "Giống d + luồng hơi mạnh phả ra.",
  n: "Lưỡi như d nhưng hơi đi lên mũi — ngân như “nnn”.",
  l: "Lưỡi chạm lợi, hạ hai rìa lưỡi cho hơi thoát ngang.",
  g: "Cuống lưỡi ép vòm mềm rồi bật mở — gọn, trầm.",
  k: "Giống g + luồng hơi mạnh.",
  h: "Thở hắt từ họng, miệng mở vừa — nhẹ, không gằn.",
  j: "Mặt lưỡi áp sát vòm cứng rồi bật mở gọn — không hơi.",
  q: "Giống j + luồng hơi mạnh xì ra.",
  x: "Giữ lưỡi gần vòm cứng, xì hơi dài như “xì”.",
  zh: "Cuộn đầu lưỡi lên, bật mở gọn — “tr” nặng.",
  ch: "Giống zh + bật hơi mạnh.",
  sh: "Cuộn lưỡi, xì hơi dài — “s” nặng uốn lưỡi.",
  r: "Cuộn lưỡi, rung nhẹ kèm hơi — gần “r”.",
  z: "Lưỡi ngay sau răng, bật mở gọn — nhẹ như “ch” non.",
  c: "Giống z + bật hơi mạnh.",
  s: "Xì hơi qua kẽ răng, lưỡi thấp — như “xì”.",
  w: "Môi tròn thu nhỏ, lướt nhanh sang nguyên âm sau.",
  y: "Lưỡi nâng cao, lướt nhanh — như “i” ngắn dẫn.",
};

export const PINYIN_LAB_BASE: Record<string, string> = {
  b: "bō", p: "pō", m: "mō", f: "fō", d: "dē", t: "tē", n: "nē", l: "lē",
  g: "gē", k: "kē", h: "hē", j: "jī", q: "qī", x: "xī", zh: "zhī", ch: "chī",
  sh: "shī", r: "rì", z: "zī", c: "cī", s: "sī", w: "wō", y: "yī",
};

export const PINYIN_LAB_TONES: Record<string, PinyinLabToneRow[]> = {
  b: [["bā", "八", "Số 8"], ["bá", "拔", "Nhổ lên"], ["bǎ", "把", "Cầm, nắm"], ["bà", "爸", "Bố"]],
  p: [["pī", "批", "Phê duyệt"], ["pí", "皮", "Da"], ["pǐ", "痞", "Du côn"], ["pì", "屁", "Xì hơi"]],
  m: [["mā", "妈", "Mẹ"], ["má", "麻", "Vừng, tê"], ["mǎ", "马", "Ngựa"], ["mà", "骂", "Mắng"]],
  f: [["fēi", "飞", "Bay"], ["féi", "肥", "Béo"], ["fěi", "匪", "Cướp"], ["fèi", "肺", "Phổi"]],
  d: [["dā", "搭", "Dựng, đi nhờ"], ["dá", "答", "Trả lời"], ["dǎ", "打", "Đánh"], ["dà", "大", "Lớn"]],
  t: [["tī", "踢", "Đá"], ["tí", "题", "Đề bài"], ["tǐ", "体", "Cơ thể"], ["tì", "替", "Thay thế"]],
  n: [["nī", "尼", "Ni cô"], ["nǐ", "你", "Bạn"], ["nì", "溺", "Chết đuối"], ["nà", "那", "Kia"]],
  l: [["lū", "撸", "Tuốt"], ["lú", "卢", "Họ Lư"], ["lǔ", "鲁", "Họ Lỗ"], ["lù", "路", "Đường"]],
  g: [["gē", "哥", "Anh trai"], ["gé", "革", "Cách mạng"], ["gǒu", "狗", "Chó"], ["gòu", "够", "Đủ"]],
  k: [["kē", "科", "Khoa học"], ["ké", "壳", "Vỏ"], ["kǒu", "口", "Miệng"], ["kòu", "扣", "Trừ, cài"]],
  h: [["hē", "喝", "Uống"], ["hé", "和", "Và"], ["hǎo", "好", "Tốt"], ["hào", "号", "Số hiệu"]],
  j: [["jī", "鸡", "Gà"], ["jí", "急", "Gấp"], ["jǐ", "几", "Mấy"], ["jì", "记", "Ghi nhớ"]],
  q: [["qī", "七", "Số 7"], ["qí", "旗", "Cờ"], ["qǐ", "起", "Dậy, bắt đầu"], ["qì", "气", "Khí"]],
  x: [["xī", "西", "Phía tây"], ["xí", "席", "Chỗ ngồi"], ["xǐ", "洗", "Rửa"], ["xì", "戏", "Kịch"]],
  zh: [["zhī", "知", "Biết"], ["zhí", "直", "Thẳng"], ["zhǐ", "纸", "Giấy"], ["zhì", "治", "Trị liệu"]],
  ch: [["chī", "吃", "Ăn"], ["chí", "迟", "Muộn"], ["chǐ", "尺", "Thước"], ["chì", "翅", "Cánh"]],
  sh: [["shī", "师", "Thầy"], ["shí", "十", "Số 10"], ["shǐ", "使", "Khiến"], ["shì", "是", "Là"]],
  r: [["rì", "日", "Ngày"], ["rě", "惹", "Chọc giận"], ["rěn", "忍", "Nhẫn nhịn"], ["rèn", "认", "Nhận ra"]],
  z: [["zī", "资", "Vốn"], ["zé", "责", "Trách nhiệm"], ["zǐ", "紫", "Tím"], ["zì", "字", "Chữ"]],
  c: [["cāi", "猜", "Đoán"], ["cái", "才", "Mới"], ["cǎi", "彩", "Màu sắc"], ["cài", "菜", "Món ăn"]],
  s: [["sī", "丝", "Tơ lụa"], ["sā", "撒", "Rắc, tung"], ["sǐ", "死", "Chết"], ["sì", "四", "Số 4"]],
  w: [["wā", "挖", "Đào"], ["wá", "娃", "Em bé"], ["wǎ", "瓦", "Ngói"], ["wà", "袜", "Tất"]],
  y: [["yī", "一", "Số 1"], ["yí", "姨", "Dì"], ["yǐ", "已", "Đã"], ["yì", "义", "Nghĩa"]],
};

export const PINYIN_LAB_FINALS: PinyinLabFinalsGroup[] = [
  { label: "Đơn · Nguyên âm đơn", items: [["a", "啊 ā"], ["o", "哦 ò"], ["e", "饿 è"], ["i", "衣 yī"], ["u", "乌 wū"], ["ü", "鱼 yú"], ["ê", "欸 ê̄"]] },
  { label: "Kép · Nguyên âm đôi", items: [["ai", "爱 ài"], ["ei", "飞 fēi"], ["ao", "好 hǎo"], ["ou", "狗 gǒu"], ["ia", "家 jiā"], ["iao", "教 jiào"], ["ie", "姐 jiě"], ["iou", "酒 jiǔ"], ["ua", "花 huā"], ["uo", "火 huǒ"], ["uai", "怪 guài"], ["uei", "味 wèi"], ["üe", "月 yuè"]] },
  { label: "Mũi · Âm mũi", items: [["an", "安 ān"], ["en", "恩 ēn"], ["ang", "脏 zāng"], ["eng", "灯 dēng"], ["ian", "烟 yān"], ["in", "音 yīn"], ["iang", "羊 yáng"], ["ing", "英 yīng"], ["uan", "关 guān"], ["un", "问 wèn"], ["uang", "光 guāng"], ["ueng", "翁 wēng"], ["üan", "元 yuán"], ["ün", "云 yún"], ["iong", "穷 qióng"]] },
  { label: "Đặc biệt", items: [["er", "耳 ěr"]] },
];

export const PINYIN_LAB_ART_INI: [key: string, label: string][] = [
  ["all", "Tất cả"], ["labial", "Âm môi (b,p,m,f)"], ["apical", "Âm đầu lưỡi (d,t,n,l)"],
  ["velar", "Âm cuống lưỡi (g,k,h)"], ["palatal", "Âm mặt lưỡi (j,q,x)"],
  ["retroflex", "Âm uốn lưỡi (zh,ch,sh,r)"], ["dental", "Âm răng (z,c,s)"],
];

export const PINYIN_LAB_ART_FIN: [key: string, label: string][] = [
  ["all", "Tất cả"], ["simple", "Đơn"], ["compound", "Kép"], ["nasal", "Mũi"],
];

export const PINYIN_LAB_GROUP_OF: Record<string, string> = {
  b: "labial", p: "labial", m: "labial", f: "labial",
  d: "apical", t: "apical", n: "apical", l: "apical",
  g: "velar", k: "velar", h: "velar",
  j: "palatal", q: "palatal", x: "palatal",
  zh: "retroflex", ch: "retroflex", sh: "retroflex", r: "retroflex",
  z: "dental", c: "dental", s: "dental",
  w: "labial", y: "palatal",
};

export const PINYIN_LAB_SANDHI: PinyinLabSandhi[] = [
  { t: "一 yī — biến điệu theo thanh sau nó",
    d: "Đứng trước thanh 4 đọc yí (thanh 2); trước thanh 1/2/3 đọc yì (thanh 4); đếm số thứ tự giữ nguyên yī.",
    ex: [["yídìng", "一定", "nhất định"], ["yìqǐ", "一起", "cùng nhau"], ["dìyī", "第一", "thứ nhất"]] },
  { t: "不 bù — đứng trước thanh 4 đọc bú",
    d: "不 + thanh 4 → bú (thanh 2). Các trường hợp còn lại giữ bù.",
    ex: [["búduì", "不对", "không đúng"], ["bùhǎo", "不好", "không tốt"], ["bùxíng", "不行", "không được"]] },
  { t: "Hai thanh 3 liền nhau — từ đầu đọc như thanh 2",
    d: "你好 vốn nǐ+hǎo, khi nói từ đầu vút lên như ní. Quy tắc vàng của khẩu ngữ.",
    ex: [["níhǎo", "你好", "xin chào"], ["hěnhǎo", "很好", "rất tốt"], ["měilì", "美丽", "xinh đẹp"]] },
];

export const PINYIN_LAB_TONE_CARDS: PinyinLabToneCard[] = [
  { name: "Thanh 1 (55)", sub: "· Cao – Bằng", contour: "flat", ex: { py: "mā", zh: "妈", vi: "Mẹ" } },
  { name: "Thanh 2 (35)", sub: "· Lên cao", contour: "up", ex: { py: "má", zh: "麻", vi: "Vừng" } },
  { name: "Thanh 3 (214)", sub: "· Xuống rồi lên", contour: "dip", ex: { py: "mǎ", zh: "马", vi: "Ngựa" } },
  { name: "Thanh 4 (51)", sub: "· Rơi dứt khoát", contour: "down", ex: { py: "mà", zh: "骂", vi: "Mắng" } },
];
