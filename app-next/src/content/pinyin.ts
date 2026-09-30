import { pinyinValidSchema, pinyinExamplesSchema } from "./schema";

/* Port 1:1 từ clone/js/data/pinyin.js — dữ liệu Bảng Pinyin (PLAN-04).
   initials: 22 thanh mẫu (Ø + 21 phụ âm); finals: 37 vận mẫu;
   valid[thanh mẫu][vận mẫu] = âm tiết không dấu (405 ô hợp lệ);
   examples[âm tiết] = 2 từ ví dụ [chữ, pinyin, nghĩa]. */
export const pinyinInitials: string[] = [
 "Ø",
 "b",
 "p",
 "m",
 "f",
 "d",
 "t",
 "n",
 "l",
 "z",
 "c",
 "s",
 "zh",
 "ch",
 "sh",
 "r",
 "j",
 "q",
 "x",
 "g",
 "k",
 "h"
];

export const pinyinFinals: string[] = [
 "a",
 "o",
 "e",
 "-i",
 "er",
 "ai",
 "ei",
 "ao",
 "ou",
 "an",
 "en",
 "ang",
 "eng",
 "ong",
 "i",
 "ia",
 "ie",
 "iao",
 "iu",
 "ian",
 "in",
 "iang",
 "ing",
 "iong",
 "u",
 "ua",
 "uo",
 "uai",
 "ui",
 "uan",
 "un",
 "uang",
 "ueng",
 "ü",
 "üe",
 "üan",
 "ün"
];

export const pinyinValid: Record<string, Record<string, string>> = {
 "Ø": {
  "a": "a",
  "o": "o",
  "e": "e",
  "er": "er",
  "ai": "ai",
  "ei": "ei",
  "ao": "ao",
  "ou": "ou",
  "an": "an",
  "en": "en",
  "ang": "ang",
  "eng": "eng",
  "i": "yi",
  "ia": "ya",
  "ie": "ye",
  "iao": "yao",
  "iu": "you",
  "ian": "yan",
  "in": "yin",
  "iang": "yang",
  "ing": "ying",
  "iong": "yong",
  "u": "wu",
  "ua": "wa",
  "uo": "wo",
  "uai": "wai",
  "ui": "wei",
  "uan": "wan",
  "un": "wen",
  "uang": "wang",
  "ueng": "weng",
  "ü": "yu",
  "üe": "yue",
  "üan": "yuan",
  "ün": "yun"
 },
 "b": {
  "a": "ba",
  "ai": "bai",
  "ei": "bei",
  "ao": "bao",
  "an": "ban",
  "en": "ben",
  "ang": "bang",
  "eng": "beng",
  "i": "bi",
  "ie": "bie",
  "iao": "biao",
  "ian": "bian",
  "in": "bin",
  "ing": "bing",
  "u": "bu",
  "uo": "bo"
 },
 "p": {
  "a": "pa",
  "ai": "pai",
  "ei": "pei",
  "ao": "pao",
  "ou": "pou",
  "an": "pan",
  "en": "pen",
  "ang": "pang",
  "eng": "peng",
  "i": "pi",
  "ie": "pie",
  "iao": "piao",
  "ian": "pian",
  "in": "pin",
  "ing": "ping",
  "u": "pu",
  "uo": "po"
 },
 "m": {
  "a": "ma",
  "e": "me",
  "ai": "mai",
  "ei": "mei",
  "ao": "mao",
  "ou": "mou",
  "an": "man",
  "en": "men",
  "ang": "mang",
  "eng": "meng",
  "i": "mi",
  "ie": "mie",
  "iao": "miao",
  "iu": "miu",
  "ian": "mian",
  "in": "min",
  "ing": "ming",
  "u": "mu",
  "uo": "mo"
 },
 "f": {
  "a": "fa",
  "ei": "fei",
  "ou": "fou",
  "an": "fan",
  "en": "fen",
  "ang": "fang",
  "eng": "feng",
  "u": "fu",
  "uo": "fo"
 },
 "d": {
  "a": "da",
  "e": "de",
  "ai": "dai",
  "ei": "dei",
  "ao": "dao",
  "ou": "dou",
  "an": "dan",
  "en": "den",
  "ang": "dang",
  "eng": "deng",
  "ong": "dong",
  "i": "di",
  "ia": "dia",
  "ie": "die",
  "iao": "diao",
  "iu": "diu",
  "ian": "dian",
  "in": "din",
  "ing": "ding",
  "u": "du",
  "uo": "duo",
  "ui": "dui",
  "uan": "duan",
  "un": "dun"
 },
 "t": {
  "a": "ta",
  "e": "te",
  "ai": "tai",
  "ei": "tei",
  "ao": "tao",
  "ou": "tou",
  "an": "tan",
  "ang": "tang",
  "eng": "teng",
  "ong": "tong",
  "i": "ti",
  "ie": "tie",
  "iao": "tiao",
  "ian": "tian",
  "ing": "ting",
  "u": "tu",
  "uo": "tuo",
  "ui": "tui",
  "uan": "tuan",
  "un": "tun"
 },
 "n": {
  "a": "na",
  "e": "ne",
  "ai": "nai",
  "ei": "nei",
  "ao": "nao",
  "ou": "nou",
  "an": "nan",
  "en": "nen",
  "ang": "nang",
  "eng": "neng",
  "ong": "nong",
  "i": "ni",
  "ie": "nie",
  "iao": "niao",
  "iu": "niu",
  "ian": "nian",
  "in": "nin",
  "iang": "niang",
  "ing": "ning",
  "u": "nu",
  "uo": "nuo",
  "uan": "nuan",
  "un": "nun",
  "ü": "nü",
  "üe": "nüe"
 },
 "l": {
  "a": "la",
  "o": "lo",
  "e": "le",
  "ai": "lai",
  "ei": "lei",
  "ao": "lao",
  "ou": "lou",
  "an": "lan",
  "ang": "lang",
  "eng": "leng",
  "ong": "long",
  "i": "li",
  "ia": "lia",
  "ie": "lie",
  "iao": "liao",
  "iu": "liu",
  "ian": "lian",
  "in": "lin",
  "iang": "liang",
  "ing": "ling",
  "u": "lu",
  "uo": "luo",
  "uan": "luan",
  "un": "lun",
  "ü": "lü",
  "üe": "lüe"
 },
 "z": {
  "a": "za",
  "e": "ze",
  "ai": "zai",
  "ei": "zei",
  "ao": "zao",
  "ou": "zou",
  "an": "zan",
  "en": "zen",
  "ang": "zang",
  "eng": "zeng",
  "ong": "zong",
  "u": "zu",
  "uo": "zuo",
  "ui": "zui",
  "uan": "zuan",
  "un": "zun"
 },
 "c": {
  "a": "ca",
  "e": "ce",
  "ai": "cai",
  "ao": "cao",
  "ou": "cou",
  "an": "can",
  "en": "cen",
  "ang": "cang",
  "eng": "ceng",
  "ong": "cong",
  "u": "cu",
  "uo": "cuo",
  "ui": "cui",
  "uan": "cuan",
  "un": "cun"
 },
 "s": {
  "a": "sa",
  "e": "se",
  "ai": "sai",
  "ao": "sao",
  "ou": "sou",
  "an": "san",
  "en": "sen",
  "ang": "sang",
  "eng": "seng",
  "ong": "song",
  "u": "su",
  "uo": "suo",
  "ui": "sui",
  "uan": "suan",
  "un": "sun"
 },
 "zh": {
  "a": "zha",
  "e": "zhe",
  "ai": "zhai",
  "ei": "zhei",
  "ao": "zhao",
  "ou": "zhou",
  "an": "zhan",
  "en": "zhen",
  "ang": "zhang",
  "eng": "zheng",
  "ong": "zhong",
  "u": "zhu",
  "ua": "zhua",
  "uo": "zhuo",
  "uai": "zhuai",
  "ui": "zhui",
  "uan": "zhuan",
  "un": "zhun",
  "uang": "zhuang"
 },
 "ch": {
  "a": "cha",
  "e": "che",
  "ai": "chai",
  "ao": "chao",
  "ou": "chou",
  "an": "chan",
  "en": "chen",
  "ang": "chang",
  "eng": "cheng",
  "ong": "chong",
  "u": "chu",
  "ua": "chua",
  "uo": "chuo",
  "uai": "chuai",
  "ui": "chui",
  "uan": "chuan",
  "un": "chun",
  "uang": "chuang"
 },
 "sh": {
  "a": "sha",
  "e": "she",
  "ai": "shai",
  "ei": "shei",
  "ao": "shao",
  "ou": "shou",
  "an": "shan",
  "en": "shen",
  "ang": "shang",
  "eng": "sheng",
  "u": "shu",
  "ua": "shua",
  "uo": "shuo",
  "uai": "shuai",
  "ui": "shui",
  "uan": "shuan",
  "un": "shun",
  "uang": "shuang"
 },
 "r": {
  "e": "re",
  "ao": "rao",
  "ou": "rou",
  "an": "ran",
  "en": "ren",
  "ang": "rang",
  "eng": "reng",
  "ong": "rong",
  "u": "ru",
  "ua": "rua",
  "uo": "ruo",
  "ui": "rui",
  "uan": "ruan",
  "un": "run"
 },
 "j": {
  "i": "ji",
  "ia": "jia",
  "ie": "jie",
  "iao": "jiao",
  "iu": "jiu",
  "ian": "jian",
  "in": "jin",
  "iang": "jiang",
  "ing": "jing",
  "iong": "jiong",
  "ü": "ju",
  "üe": "jue",
  "üan": "juan",
  "ün": "jun"
 },
 "q": {
  "i": "qi",
  "ia": "qia",
  "ie": "qie",
  "iao": "qiao",
  "iu": "qiu",
  "ian": "qian",
  "in": "qin",
  "iang": "qiang",
  "ing": "qing",
  "iong": "qiong",
  "ü": "qu",
  "üe": "que",
  "üan": "quan",
  "ün": "qun"
 },
 "x": {
  "i": "xi",
  "ia": "xia",
  "ie": "xie",
  "iao": "xiao",
  "iu": "xiu",
  "ian": "xian",
  "in": "xin",
  "iang": "xiang",
  "ing": "xing",
  "iong": "xiong",
  "ü": "xu",
  "üe": "xue",
  "üan": "xuan",
  "ün": "xun"
 },
 "g": {
  "a": "ga",
  "e": "ge",
  "ai": "gai",
  "ei": "gei",
  "ao": "gao",
  "ou": "gou",
  "an": "gan",
  "en": "gen",
  "ang": "gang",
  "eng": "geng",
  "ong": "gong",
  "u": "gu",
  "ua": "gua",
  "uo": "guo",
  "uai": "guai",
  "ui": "gui",
  "uan": "guan",
  "un": "gun",
  "uang": "guang"
 },
 "k": {
  "a": "ka",
  "e": "ke",
  "ai": "kai",
  "ei": "kei",
  "ao": "kao",
  "ou": "kou",
  "an": "kan",
  "en": "ken",
  "ang": "kang",
  "eng": "keng",
  "ong": "kong",
  "u": "ku",
  "ua": "kua",
  "uo": "kuo",
  "uai": "kuai",
  "ui": "kui",
  "uan": "kuan",
  "un": "kun",
  "uang": "kuang"
 },
 "h": {
  "a": "ha",
  "e": "he",
  "ai": "hai",
  "ei": "hei",
  "ao": "hao",
  "ou": "hou",
  "an": "han",
  "en": "hen",
  "ang": "hang",
  "eng": "heng",
  "ong": "hong",
  "u": "hu",
  "ua": "hua",
  "uo": "huo",
  "uai": "huai",
  "ui": "hui",
  "uan": "huan",
  "un": "hun",
  "uang": "huang"
 }
};

export const pinyinExamples: Record<string, [string, string, string][]> = {
 "ba": [
  [
   "八",
   "bā",
   "tám"
  ],
  [
   "爸",
   "bà",
   "bố"
  ]
 ],
 "ma": [
  [
   "媽",
   "mā",
   "mẹ"
  ],
  [
   "嗎",
   "ma",
   "không (hỏi)"
  ]
 ],
 "ni": [
  [
   "你",
   "nǐ",
   "bạn"
  ],
  [
   "泥",
   "ní",
   "bùn"
  ]
 ],
 "wo": [
  [
   "我",
   "wǒ",
   "tôi"
  ],
  [
   "臥",
   "wò",
   "nằm"
  ]
 ],
 "ta": [
  [
   "他",
   "tā",
   "anh ấy"
  ],
  [
   "她",
   "tā",
   "cô ấy"
  ]
 ],
 "ren": [
  [
   "人",
   "rén",
   "người"
  ],
  [
   "認",
   "rèn",
   "nhận"
  ]
 ],
 "shi": [
  [
   "是",
   "shì",
   "là"
  ],
  [
   "十",
   "shí",
   "mười"
  ]
 ],
 "shang": [
  [
   "上",
   "shàng",
   "trên"
  ],
  [
   "尚",
   "shàng",
   "coi trọng"
  ]
 ],
 "xia": [
  [
   "下",
   "xià",
   "dưới"
  ],
  [
   "夏",
   "xià",
   "mùa hạ"
  ]
 ],
 "he": [
  [
   "和",
   "hé",
   "hòa, và"
  ],
  [
   "喝",
   "hē",
   "uống"
  ]
 ],
 "hui": [
  [
   "回",
   "huí",
   "về"
  ],
  [
   "會",
   "huì",
   "biết"
  ]
 ],
 "cha": [
  [
   "茶",
   "chá",
   "trà"
  ],
  [
   "查",
   "chá",
   "tra cứu"
  ]
 ],
 "tian": [
  [
   "天",
   "tiān",
   "trời"
  ],
  [
   "田",
   "tián",
   "ruộng"
  ]
 ],
 "tie": [
  [
   "鐵",
   "tiě",
   "sắt"
  ],
  [
   "貼",
   "tiē",
   "dán"
  ]
 ],
 "shan": [
  [
   "山",
   "shān",
   "núi"
  ],
  [
   "衫",
   "shān",
   "áo"
  ]
 ],
 "wen": [
  [
   "文",
   "wén",
   "văn chương"
  ],
  [
   "問",
   "wèn",
   "hỏi"
  ]
 ],
 "da": [
  [
   "大",
   "dà",
   "to"
  ],
  [
   "打",
   "dǎ",
   "đánh"
  ]
 ],
 "dong": [
  [
   "東",
   "dōng",
   "đông"
  ],
  [
   "懂",
   "dǒng",
   "hiểu"
  ]
 ],
 "dui": [
  [
   "對",
   "duì",
   "đúng"
  ],
  [
   "隊",
   "duì",
   "đội"
  ]
 ],
 "guan": [
  [
   "官",
   "guān",
   "quan"
  ],
  [
   "管",
   "guǎn",
   "quản lý"
  ]
 ],
 "chang": [
  [
   "長",
   "cháng",
   "dài"
  ],
  [
   "唱",
   "chàng",
   "hát"
  ]
 ],
 "zhong": [
  [
   "中",
   "zhōng",
   "trung"
  ],
  [
   "種",
   "zhòng",
   "trồng"
  ]
 ],
 "xue": [
  [
   "學",
   "xué",
   "học"
  ],
  [
   "雪",
   "xuě",
   "tuyết"
  ]
 ],
 "xiao": [
  [
   "小",
   "xiǎo",
   "nhỏ"
  ],
  [
   "笑",
   "xiào",
   "cười"
  ]
 ],
 "xin": [
  [
   "心",
   "xīn",
   "tim"
  ],
  [
   "新",
   "xīn",
   "mới"
  ]
 ],
 "jin": [
  [
   "金",
   "jīn",
   "vàng"
  ],
  [
   "今",
   "jīn",
   "nay"
  ]
 ],
 "hua": [
  [
   "花",
   "huā",
   "hoa"
  ],
  [
   "話",
   "huà",
   "lời nói"
  ]
 ],
 "hai": [
  [
   "海",
   "hǎi",
   "biển"
  ],
  [
   "還",
   "hái",
   "còn"
  ]
 ],
 "jia": [
  [
   "家",
   "jiā",
   "nhà"
  ],
  [
   "加",
   "jiā",
   "thêm"
  ]
 ],
 "jiao": [
  [
   "叫",
   "jiào",
   "gọi"
  ],
  [
   "教",
   "jiāo",
   "dạy"
  ]
 ],
 "shui": [
  [
   "水",
   "shuǐ",
   "nước"
  ],
  [
   "睡",
   "shuì",
   "ngủ"
  ]
 ],
 "yue": [
  [
   "月",
   "yuè",
   "trăng"
  ],
  [
   "越",
   "yuè",
   "vượt"
  ]
 ],
 "ri": [
  [
   "日",
   "rì",
   "ngày"
  ],
  [
   "入",
   "rù",
   "vào"
  ]
 ],
 "hao": [
  [
   "好",
   "hǎo",
   "tốt"
  ],
  [
   "號",
   "hào",
   "số"
  ]
 ],
 "xie": [
  [
   "些",
   "xiē",
   "một ít"
  ],
  [
   "寫",
   "xiě",
   "viết"
  ]
 ],
 "yi": [
  [
   "一",
   "yī",
   "một"
  ],
  [
   "衣",
   "yī",
   "áo"
  ]
 ],
 "er": [
  [
   "二",
   "èr",
   "hai"
  ],
  [
   "兒",
   "ér",
   "con"
  ]
 ],
 "san": [
  [
   "三",
   "sān",
   "ba"
  ],
  [
   "傘",
   "sǎn",
   "cái ô"
  ]
 ],
 "si": [
  [
   "四",
   "sì",
   "bốn"
  ],
  [
   "思",
   "sī",
   "nghĩ"
  ]
 ],
 "wu": [
  [
   "五",
   "wǔ",
   "năm"
  ],
  [
   "霧",
   "wù",
   "sương mù"
  ]
 ],
 "liu": [
  [
   "六",
   "liù",
   "sáu"
  ],
  [
   "流",
   "liú",
   "chảy"
  ]
 ],
 "qi": [
  [
   "七",
   "qī",
   "bảy"
  ],
  [
   "騎",
   "qí",
   "cưỡi"
  ]
 ],
 "ban": [
  [
   "班",
   "bān",
   "lớp"
  ],
  [
   "半",
   "bàn",
   "nửa"
  ]
 ],
 "peng": [
  [
   "朋",
   "péng",
   "bạn"
  ],
  [
   "碰",
   "pèng",
   "va chạm"
  ]
 ],
 "lao": [
  [
   "老",
   "lǎo",
   "già"
  ],
  [
   "勞",
   "láo",
   "vất vả"
  ]
 ],
 "jing": [
  [
   "京",
   "jīng",
   "kinh đô"
  ],
  [
   "靜",
   "jìng",
   "tĩnh lặng"
  ]
 ],
 "ming": [
  [
   "明",
   "míng",
   "sáng"
  ],
  [
   "名",
   "míng",
   "tên"
  ]
 ],
 "qing": [
  [
   "清",
   "qīng",
   "trong"
  ],
  [
   "請",
   "qǐng",
   "mời"
  ]
 ],
 "xing": [
  [
   "行",
   "xíng",
   "được"
  ],
  [
   "星",
   "xīng",
   "ngôi sao"
  ]
 ],
 "gan": [
  [
   "乾",
   "gān",
   "khô"
  ],
  [
   "敢",
   "gǎn",
   "dám"
  ]
 ],
 "kan": [
  [
   "看",
   "kàn",
   "xem"
  ],
  [
   "砍",
   "kǎn",
   "chặt"
  ]
 ],
 "chi": [
  [
   "吃",
   "chī",
   "ăn"
  ],
  [
   "尺",
   "chǐ",
   "thước"
  ]
 ],
 "zuo": [
  [
   "做",
   "zuò",
   "làm"
  ],
  [
   "坐",
   "zuò",
   "ngồi"
  ]
 ],
 "zai": [
  [
   "在",
   "zài",
   "ở"
  ],
  [
   "再",
   "zài",
   "lại"
  ]
 ],
 "mei": [
  [
   "美",
   "měi",
   "đẹp"
  ],
  [
   "妹",
   "mèi",
   "em gái"
  ]
 ],
 "men": [
  [
   "們",
   "men",
   "hậu tố số nhiều"
  ],
  [
   "門",
   "mén",
   "cửa"
  ]
 ],
 "wan": [
  [
   "完",
   "wán",
   "xong"
  ],
  [
   "晚",
   "wǎn",
   "tối"
  ]
 ],
 "yuan": [
  [
   "遠",
   "yuǎn",
   "xa"
  ],
  [
   "園",
   "yuán",
   "vườn"
  ]
 ],
 "yu": [
  [
   "雨",
   "yǔ",
   "mưa"
  ],
  [
   "魚",
   "yú",
   "cá"
  ]
 ],
 "kou": [
  [
   "口",
   "kǒu",
   "miệng"
  ],
  [
   "扣",
   "kòu",
   "khuy áo"
  ]
 ],
 "mu": [
  [
   "木",
   "mù",
   "gỗ"
  ],
  [
   "目",
   "mù",
   "mắt"
  ]
 ],
 "ti": [
  [
   "提",
   "tí",
   "nêu lên"
  ],
  [
   "體",
   "tǐ",
   "thể"
  ]
 ],
 "nü": [
  [
   "女",
   "nǚ",
   "con gái"
  ],
  [
   "衄",
   "nǜ",
   "chảy máu mũi"
  ]
 ],
 "lü": [
  [
   "旅",
   "lǚ",
   "đi lại"
  ],
  [
   "律",
   "lǜ",
   "luật"
  ]
 ],
 "zhe": [
  [
   "這",
   "zhè",
   "này"
  ],
  [
   "著",
   "zhe",
   "đang (trợ từ)"
  ]
 ],
 "guo": [
  [
   "國",
   "guó",
   "nước"
  ],
  [
   "果",
   "guǒ",
   "quả"
  ]
 ],
 "xian": [
  [
   "先",
   "xiān",
   "trước"
  ],
  [
   "現",
   "xiàn",
   "hiện"
  ]
 ],
 "jian": [
  [
   "見",
   "jiàn",
   "gặp"
  ],
  [
   "件",
   "jiàn",
   "việc, món"
  ]
 ],
 "qian": [
  [
   "千",
   "qiān",
   "nghìn"
  ],
  [
   "錢",
   "qián",
   "tiền"
  ]
 ],
 "bian": [
  [
   "邊",
   "biān",
   "bên"
  ],
  [
   "便",
   "biàn",
   "tiện"
  ]
 ],
 "mian": [
  [
   "面",
   "miàn",
   "mặt"
  ],
  [
   "免",
   "miǎn",
   "miễn"
  ]
 ],
 "dian": [
  [
   "點",
   "diǎn",
   "điểm"
  ],
  [
   "電",
   "diàn",
   "điện"
  ]
 ],
 "nian": [
  [
   "年",
   "nián",
   "năm"
  ],
  [
   "念",
   "niàn",
   "nghĩ, đọc"
  ]
 ]
};

// zod validate (pattern Task 7) — ném lỗi nếu dữ liệu port sai
pinyinValidSchema.parse(pinyinValid);
pinyinExamplesSchema.parse(pinyinExamples);
