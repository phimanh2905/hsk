/* Redesign /reading (spec 2026-10-05) — dữ liệu Thư viện bài đọc, port từ
   opendesign_hsk/reading.html (LIB + SENTS + QUIZ) + soạn mới 5 bài.
   demo-1 hấp thụ demoDoc cũ "一个人的生活" (13 câu + 5 từ vựng + 3 câu hỏi),
   chuyển sang shape word-level {z,p,h,m}. Hardcode, UI-only, thuần client. */

export type ReadingLevel = "HSK 1" | "HSK 2" | "HSK 3" | "HSK 4" | "HSK 5" | "HSK 6";
export type ReadingCat = "daily" | "culture" | "fable" | "exam";
export type ReadingLibItem = {
  id: string; // "tea" | "chongyang" | "interview" | "frog" | "hsk4mock" | "morning" | "demo-1"
  lv: ReadingLevel;
  cat: ReadingCat;
  min: number; // phút đọc
  n: number; // số chữ
  nw: number; // số từ mới
  title: string; // 茶道与宁静
  py: string; // chádào yǔ níngjìng
  vi: string; // Trà đạo và sự tĩnh lặng
  ex: string; // excerpt
};
export type ReadingWord = { z: string; p: string; h: string; m: string };
// z=chữ Hán, p=pinyin (có dấu thanh), h=Hán-Việt, m=nghĩa tiếng Việt
export type ReadingQuizItem = { q: string; options: string[]; answer: number; explanation: string };
export type ReadingArticle = { id: string; sentences: ReadingWord[][]; quiz: ReadingQuizItem[] };

export const READING_LEVELS: ReadingLevel[] = ["HSK 1", "HSK 2", "HSK 3", "HSK 4", "HSK 5", "HSK 6"];

export const READING_CATS: { key: ReadingCat; label: string }[] = [
  { key: "daily", label: "Đời sống" },
  { key: "culture", label: "Văn hoá" },
  { key: "fable", label: "Ngụ ngôn" },
  { key: "exam", label: "Luyện đề" },
];

/* LIB — port 1:1 từ mock reading.html (bỏ prog/note/cta/saved — UI state), append demo-1.
   n/nw/min/ex cập nhật theo nội dung thật của từng article. */
export const READING_LIB: ReadingLibItem[] = [
  {
    id: "tea", lv: "HSK 4", cat: "culture", min: 5, n: 48, nw: 8,
    title: "茶道与宁静", py: "chádào yǔ níngjìng", vi: "Trà đạo và sự tĩnh lặng",
    ex: "Trà đạo không chỉ là thói quen uống trà, mà còn là nghệ thuật tìm sự tĩnh lặng trong tâm hồn...",
  },
  {
    id: "chongyang", lv: "HSK 3", cat: "culture", min: 3, n: 69, nw: 6,
    title: "重阳节登高", py: "chóngyáng jié dēnggāo", vi: "Tết Trùng Cửu ở Trung Quốc",
    ex: "Cứ đến mùng 9 tháng 9, người Trung Quốc lại cùng nhau leo núi, ngắm hoa...",
  },
  {
    id: "interview", lv: "HSK 4", cat: "daily", min: 4, n: 93, nw: 9,
    title: "找工作的面试", py: "zhǎo gōngzuò de miànshì", vi: "Phỏng vấn tìm việc làm",
    ex: "Lần đầu đi phỏng vấn, bạn cần chuẩn bị giới thiệu bản thân trong 1 phút...",
  },
  {
    id: "frog", lv: "HSK 2", cat: "fable", min: 2, n: 66, nw: 4,
    title: "井底之蛙", py: "jǐng dǐ zhī wā", vi: "Ếch ngồi đáy giếng",
    ex: "Có một chú ếch sống lâu trong giếng, tưởng bầu trời chỉ to bằng miệng giếng...",
  },
  {
    id: "hsk4mock", lv: "HSK 4", cat: "exam", min: 4, n: 62, nw: 5,
    title: "HSK 4 模拟阅读", py: "mónǐ yuèdú", vi: "Đề thi thử HSK 4 — đọc hiểu",
    ex: "Phần đọc gồm 3 đoạn văn dài với 10 câu hỏi trắc nghiệm đúng format đề thật...",
  },
  {
    id: "morning", lv: "HSK 1", cat: "daily", min: 2, n: 45, nw: 3,
    title: "我的一天", py: "wǒ de yì tiān", vi: "Một ngày của tôi",
    ex: "早上我六点起床，七点吃早饭，然后去学校...",
  },
  {
    id: "demo-1", lv: "HSK 1", cat: "daily", min: 4, n: 195, nw: 5,
    title: "一个人的生活", py: "yíge rén de shēnghuó", vi: "Cuộc sống một mình",
    ex: "我一个人住在一间小小的公寓里。",
  },
];

/* READING_ARTICLES — mọi id trong LIB đều có bài thật ("data 100%"). */
export const READING_ARTICLES: Record<string, ReadingArticle> = {
  /* tea — port 1:1 SENTS + QUIZ từ mock (options đã bỏ prefix "A. ", lưu sạch). */
  tea: {
    id: "tea",
    sentences: [
      [
        { z: "茶道", p: "chádào", h: "TRÀ ĐẠO", m: "trà đạo, nghệ thuật uống trà" },
        { z: "不仅是", p: "bùjǐn shì", h: "BẤT CẬN THỊ", m: "không chỉ là" },
        { z: "一种", p: "yì zhǒng", h: "NHẤT CHỦNG", m: "một loại" },
        { z: "饮茶的习惯", p: "yǐnchá de xíguàn", h: "ẨM TRÀ CHI TẬP QUÁN", m: "thói quen uống trà" },
      ],
      [
        { z: "更是", p: "gèng shì", h: "CANH THỊ", m: "mà còn là" },
        { z: "一门", p: "yì mén", h: "NHẤT MÔN", m: "một môn" },
        { z: "追求", p: "zhuīqiú", h: "TRUY CẦU", m: "theo đuổi" },
        { z: "内心宁静", p: "nèixīn níngjìng", h: "NỘI TÂM NINH TĨNH", m: "sự tĩnh lặng trong tâm hồn" },
        { z: "的艺术", p: "de yìshù", h: "ĐÍCH NGHỆ THUẬT", m: "nghệ thuật" },
      ],
      [
        { z: "在中国古代", p: "zài Zhōngguó gǔdài", h: "TẠI TRUNG QUỐC CỔ ĐẠI", m: "ở Trung Quốc thời xưa" },
        { z: "文人", p: "wénrén", h: "VĂN NHÂN", m: "văn nhân, kẻ sĩ" },
      ],
      [
        { z: "常常", p: "chángcháng", h: "THƯỜNG THƯỜNG", m: "thường xuyên" },
        { z: "在竹林之中", p: "zài zhúlín zhī zhōng", h: "TẠI TRÚC LÂM CHI TRUNG", m: "trong rừng trúc" },
        { z: "与好友", p: "yǔ hǎoyǒu", h: "DỮ HẢO HỮU", m: "cùng bạn tốt" },
        { z: "一同", p: "yìtóng", h: "NHẤT ĐỒNG", m: "cùng nhau" },
      ],
      [
        { z: "品茶", p: "pǐnchá", h: "PHẨM TRÀ", m: "thưởng thức trà" },
        { z: "谈心", p: "tánxīn", h: "ĐÀM TÂM", m: "trò chuyện tâm tình" },
      ],
    ],
    quiz: [
      {
        q: "根据文章，茶道的主要意义是什么？",
        options: ["解决口渴问题", "追求内心的平静", "展示茶叶的价格"],
        answer: 1,
        explanation:
          "Bài viết nói 茶道不仅是饮茶的习惯，更是追求内心宁静的艺术 — ý nghĩa chính không phải giải khát hay giá tiền, mà là sự tĩnh lặng trong tâm hồn.",
      },
      {
        q: "文人常常在哪里品茶谈心？",
        options: ["在竹林之中", "在热闹的市场", "在高大的宫殿"],
        answer: 0,
        explanation:
          "Câu 文人在竹林之中与好友一同品茶谈心 cho biết các văn nhân thường phẩm trà, đàm đạo trong rừng trúc cùng bạn hữu.",
      },
    ],
  },

  /* chongyang — HSK 3, văn hoá, soạn mới. */
  chongyang: {
    id: "chongyang",
    sentences: [
      [
        { z: "每年", p: "měinián", h: "MỄI NIÊN", m: "mỗi năm" },
        { z: "农历", p: "nónglì", h: "NÔNG LỊCH", m: "âm lịch" },
        { z: "九月", p: "jiǔyuè", h: "CỬU NGUYỆT", m: "tháng chín" },
        { z: "九日", p: "jiǔrì", h: "CỬU NHẬT", m: "ngày mùng chín" },
      ],
      [
        { z: "中国人", p: "Zhōngguórén", h: "TRUNG QUỐC NHÂN", m: "người Trung Quốc" },
        { z: "都会", p: "dōu huì", h: "ĐÔ HỘI", m: "đều sẽ" },
        { z: "登高", p: "dēnggāo", h: "ĐĂNG CAO", m: "leo núi, lên cao" },
        { z: "敬老", p: "jìnglǎo", h: "KÍNH LÃO", m: "kính trọng người già" },
      ],
      [
        { z: "重阳节", p: "Chóngyángjié", h: "TRÙNG DƯƠNG TIẾT", m: "Tết Trùng Cửu" },
        { z: "又", p: "yòu", h: "HỌU", m: "lại, cũng" },
        { z: "叫做", p: "jiàozuò", h: "GIÁO TÁC", m: "được gọi là" },
        { z: "老人节", p: "lǎorénjié", h: "LÃO NHÂN TIẾT", m: "Tết của người già" },
      ],
      [
        { z: "这一天", p: "zhè yì tiān", h: "GIẢ NHẤT THIÊN", m: "ngày hôm đó" },
        { z: "人们", p: "rénmen", h: "NHÂN MÔN", m: "mọi người" },
        { z: "常常", p: "chángcháng", h: "THƯỜNG THƯỜNG", m: "thường thường" },
        { z: "和家人", p: "hé jiārén", h: "HÒA GIA NHÂN", m: "cùng người nhà" },
        { z: "爬山", p: "páshān", h: "BÀ SAN", m: "leo núi" },
        { z: "看风景", p: "kàn fēngjǐng", h: "KHAN PHONG CẢNH", m: "ngắm cảnh" },
      ],
      [
        { z: "有的人", p: "yǒude rén", h: "HỮU ĐẾ NHÂN", m: "có người" },
        { z: "还", p: "hái", h: "Hoàn", m: "còn" },
        { z: "喝", p: "hē", h: "YẾT", m: "uống" },
        { z: "菊花酒", p: "júhuājiǔ", h: "CÚC HOA TỬU", m: "rượu hoa cúc" },
        { z: "吃重阳糕", p: "chī chóngyánggāo", h: "XÍ TRÙNG DƯƠNG CAO", m: "ăn bánh Trùng Cửu" },
      ],
      [
        { z: "这个节日", p: "zhège jiérì", h: "GIẢ CA TIẾT NHẬT", m: "ngày lễ này" },
        { z: "表示", p: "biǎoshì", h: "BIỂU THỊ", m: "thể hiện" },
        { z: "我们要", p: "wǒmen yào", h: "NGÃ MÔN YẾU", m: "chúng ta cần" },
        { z: "关心", p: "guānxīn", h: "QUAN TÂM", m: "quan tâm" },
        { z: "家里的老人", p: "jiā lǐ de lǎorén", h: "GIA LÝ ĐÍCH LÃO NHÂN", m: "người già trong nhà" },
      ],
    ],
    quiz: [
      {
        q: "重阳节是农历的哪一天？",
        options: ["八月十五日", "九月九日", "一月一日"],
        answer: 1,
        explanation:
          "Câu đầu bài đọc: 重阳节 là 农历九月九日 — mùng chín tháng chín âm lịch, không phải Tết Trung thu (8/15) hay Tết Dương lịch.",
      },
      {
        q: "重阳节又叫什么节？",
        options: ["老人节", "儿童节", "情人节"],
        answer: 0,
        explanation: "Bài đọc viết 重阳节又叫做老人节 — Tết Trùng Cửu còn được gọi là Tết của người già.",
      },
      {
        q: "人们常常和家人做什么？",
        options: ["看风景、爬山", "唱歌、跳舞", "包饺子、看电视"],
        answer: 0,
        explanation: "Theo bài: 这一天人们常常和家人一起爬山、看风景 — ngày này mọi người hay leo núi và ngắm cảnh cùng gia đình.",
      },
    ],
  },

  /* interview — HSK 4, đời sống, soạn mới. */
  interview: {
    id: "interview",
    sentences: [
      [
        { z: "大学毕业", p: "dàxué bìyè", h: "ĐẠI HỌC TẤT NGHIỆP", m: "tốt nghiệp đại học" },
        { z: "以后", p: "yǐhòu", h: "DĨ HẬU", m: "sau đó" },
        { z: "我", p: "wǒ", h: "NGÃ", m: "tôi" },
        { z: "去一家公司", p: "qù yì jiā gōngsī", h: "KHỨ NHẤT GIA CÔNG TI", m: "đến một công ty" },
        { z: "面试", p: "miànshì", h: "DIỆN THỬ", m: "phỏng vấn" },
      ],
      [
        { z: "面试前一天", p: "miànshì qián yì tiān", h: "DIỆN THỬ TIỀN NHẤT THIÊN", m: "một ngày trước buổi phỏng vấn" },
        { z: "我准备了", p: "wǒ zhǔnbèile", h: "NGÃ CHUẨN BỊ LIỄU", m: "tôi đã chuẩn bị" },
        { z: "自我介绍", p: "zìwǒ jièshào", h: "TỰ NGÃ GIỚI THIỆU", m: "phần giới thiệu bản thân" },
        { z: "和", p: "hé", h: "HÒA", m: "và" },
        { z: "常见的问题", p: "chángjiàn de wèntí", h: "THƯỜNG KIẾN ĐÍCH VẤN ĐỀ", m: "những câu hỏi thường gặp" },
      ],
      [
        { z: "面试的时候", p: "miànshì de shíhou", h: "DIỆN THỬ ĐÍCH THỜI HẬU", m: "khi đang phỏng vấn" },
        { z: "经理", p: "jīnglǐ", h: "KINH LÝ", m: "giám đốc, quản lý" },
        { z: "先让我", p: "xiān ràng wǒ", h: "TIÊN NHƯỜNG NGÃ", m: "trước tiên bảo tôi" },
        { z: "介绍", p: "jièshào", h: "GIỚI THIỆU", m: "giới thiệu" },
        { z: "自己的经验", p: "zìjǐ de jīngyàn", h: "TỰ KỶ ĐÍCH KINH NGHIỆM", m: "kinh nghiệm của mình" },
      ],
      [
        { z: "我", p: "wǒ", h: "NGÃ", m: "tôi" },
        { z: "回答得", p: "huídá de", h: "HỒI ĐÁP ĐẮC", m: "trả lời (một cách)" },
        { z: "很自然", p: "hěn zìrán", h: "HẪN TỰ NHIÊN", m: "rất tự nhiên" },
        { z: "还举了", p: "hái jǔle", h: "HOÀN CỬ LIỄU", m: "còn đưa ra" },
        { z: "几个例子", p: "jǐ ge lìzi", h: "CƠ CA LỆ TỬ", m: "vài ví dụ" },
      ],
      [
        { z: "一个星期以后", p: "yí ge xīngqī yǐhòu", h: "NHẤT CA TINH KI DĨ HẬU", m: "một tuần sau đó" },
        { z: "公司", p: "gōngsī", h: "CÔNG TI", m: "công ty" },
        { z: "通知我", p: "tōngzhī wǒ", h: "THÔNG TRI NGÃ", m: "báo cho tôi" },
        { z: "被录取了", p: "bèi lùqǔle", h: "BỊ LỤC THỦ LIỄU", m: "đã được nhận" },
      ],
      [
        { z: "这次经历", p: "zhè cì jīnglì", h: "GIẢ THỨ KINH LỊCH", m: "trải nghiệm lần này" },
        { z: "让我明白", p: "ràng wǒ míngbái", h: "NHƯỜNG NGÃ MINH BẠCH", m: "khiến tôi hiểu" },
        { z: "准备", p: "zhǔnbèi", h: "CHUẨN BỊ", m: "chuẩn bị" },
        { z: "多么重要", p: "duōme zhòngyào", h: "ĐA MỸ TRỌNG YẾU", m: "quan trọng đến mức nào" },
      ],
    ],
    quiz: [
      {
        q: "面试前一天，作者准备了什么？",
        options: ["一件新衣服", "自我介绍和常见的问题", "公司的资料"],
        answer: 1,
        explanation: "Bài đọc viết: 我准备了自我介绍和常见的问题 — tác giả chuẩn bị phần giới thiệu bản thân và các câu hỏi thường gặp.",
      },
      {
        q: "经理先让作者做什么？",
        options: ["填一张表", "介绍公司", "介绍自己的经验"],
        answer: 2,
        explanation: "Câu 面试的时候，经理先让我介绍自己的经验 — giám đốc trước tiên yêu cầu tác giả giới thiệu kinh nghiệm của mình.",
      },
      {
        q: "这次经历让作者明白了什么？",
        options: ["准备多么重要", "工资多么重要", "运气多么重要"],
        answer: 0,
        explanation: "Câu kết: 这次经历让我明白准备多么重要 — bài học rút ra là sự chuẩn bị rất quan trọng.",
      },
    ],
  },

  /* frog — HSK 2, ngụ ngôn 井底之蛙, soạn mới. */
  frog: {
    id: "frog",
    sentences: [
      [
        { z: "有一只", p: "yǒu yì zhī", h: "HỮU NHẤT CHI", m: "có một con" },
        { z: "青蛙", p: "qīngwā", h: "THANH OA", m: "con ếch" },
        { z: "住在", p: "zhù zài", h: "TRỤ TẠI", m: "sống ở" },
        { z: "井底", p: "jǐngdǐ", h: "TĨNH ĐỂ", m: "đáy giếng" },
      ],
      [
        { z: "它", p: "tā", h: "THA", m: "nó" },
        { z: "以为", p: "yǐwéi", h: "DĨ VI", m: "lầm tưởng" },
        { z: "天空", p: "tiānkōng", h: "THIÊN KHÔNG", m: "bầu trời" },
        { z: "只有", p: "zhǐyǒu", h: "CHỈ HỮU", m: "chỉ có" },
        { z: "井口", p: "jǐngkǒu", h: "TĨNH KHẨU", m: "miệng giếng" },
        { z: "那么大", p: "nàme dà", h: "NẠ MY ĐẠI", m: "to như vậy" },
      ],
      [
        { z: "一天", p: "yì tiān", h: "NHẤT THIÊN", m: "một hôm" },
        { z: "一只小鸟", p: "yì zhī xiǎoniǎo", h: "NHẤT CHI TIỂU ĐIỂU", m: "một con chim nhỏ" },
        { z: "告诉它", p: "gàosu tā", h: "CÁO TỤ THA", m: "nói với nó" },
        { z: "天空很大", p: "tiānkōng hěn dà", h: "THIÊN KHÔNG HẪN ĐẠI", m: "bầu trời rất rộng" },
      ],
      [
        { z: "青蛙", p: "qīngwā", h: "THANH OA", m: "con ếch" },
        { z: "不相信", p: "bù xiāngxìn", h: "BẤT TƯƠNG TÍN", m: "không tin" },
        { z: "就", p: "jiù", h: "TỰU", m: "thì, liền" },
        { z: "笑了", p: "xiàole", h: "TIẾU LIỄU", m: "cười" },
      ],
      [
        { z: "小鸟", p: "xiǎoniǎo", h: "TIỂU ĐIỂU", m: "chim nhỏ" },
        { z: "说", p: "shuō", h: "THUYẾT", m: "nói" },
        { z: "你出来看看吧", p: "nǐ chūlái kànkan ba", h: "NỮ XUẤT LAI KHAN KHAN BA", m: "bạn ra ngoài mà xem" },
      ],
      [
        { z: "青蛙", p: "qīngwā", h: "THANH OA", m: "con ếch" },
        { z: "跳出了", p: "tiàochūle", h: "KIẾU XUẤT LIỄU", m: "nhảy ra khỏi" },
        { z: "井", p: "jǐng", h: "TĨNH", m: "cái giếng" },
        { z: "才知道", p: "cái zhīdào", h: "TÀI TRI ĐẠO", m: "mới biết" },
        { z: "天空真的很大", p: "tiānkōng zhēn de hěn dà", h: "THIÊN KHÔNG CHÂN ĐÍCH HẪN ĐẠI", m: "bầu trời thật sự rất rộng" },
      ],
    ],
    quiz: [
      {
        q: "青蛙住在哪儿？",
        options: ["树上", "井底", "河里"],
        answer: 1,
        explanation: "Câu đầu bài đọc: 青蛙住在井底 — chú ếch sống ở đáy giếng.",
      },
      {
        q: "青蛙以为天空有多大？",
        options: ["非常大", "和井口一样大", "比海还大"],
        answer: 1,
        explanation: "Bài đọc viết: 青蛙以为天空只有井口那么大 — nó lầm tưởng bầu trời chỉ to bằng miệng giếng.",
      },
      {
        q: "这个故事告诉我们什么？",
        options: ["小鸟会骗人", "青蛙是对的", "要多看看外面的世界"],
        answer: 2,
        explanation:
          "Ếch ra khỏi giếng mới biết trời thật rộng — câu chuyện khuyên chúng ta 不要做井底之蛙，要多看看外面的世界 (đừng tự giới hạn trong điều mình thấy).",
      },
    ],
  },

  /* hsk4mock — HSK 4, luyện đề, soạn mới (đoạn văn đọc hiểu kiểu đề thi). */
  hsk4mock: {
    id: "hsk4mock",
    sentences: [
      [
        { z: "小李", p: "Xiǎo Lǐ", h: "TIỂU LÝ", m: "tiểu Lý (tên người)" },
        { z: "每天", p: "měitiān", h: "MỄI THIÊN", m: "mỗi ngày" },
        { z: "六点", p: "liù diǎn", h: "LỤC ĐIỂM", m: "sáu giờ" },
        { z: "起床", p: "qǐchuáng", h: "KHỞI SÀNG", m: "thức dậy" },
        { z: "然后", p: "ránhòu", h: "NHIÊN HẬU", m: "sau đó" },
        { z: "去公园", p: "qù gōngyuán", h: "KHỨ CÔNG VIÊN", m: "đi công viên" },
        { z: "跑步", p: "pǎobù", h: "PHAO BỘ", m: "chạy bộ" },
      ],
      [
        { z: "他", p: "tā", h: "THA", m: "anh ấy" },
        { z: "觉得", p: "juéde", h: "GIÁC ĐẮC", m: "cảm thấy" },
        { z: "早晨", p: "zǎochén", h: "TẢO THÌN", m: "buổi sáng sớm" },
        { z: "空气", p: "kōngqì", h: "KHÔNG KHÍ", m: "không khí" },
        { z: "特别", p: "tèbié", h: "ĐẶC BIỆT", m: "đặc biệt" },
        { z: "新鲜", p: "xīnxiān", h: "TÂN TIÊN", m: "trong lành, tươi" },
      ],
      [
        { z: "跑步以后", p: "pǎobù yǐhòu", h: "PHAO BỘ DĨ HẬU", m: "sau khi chạy bộ" },
        { z: "他会买", p: "tā huì mǎi", h: "THA HỘI MẠI", m: "anh ấy sẽ mua" },
        { z: "两杯", p: "liǎng bēi", h: "LƯỢNG BÔI", m: "hai cốc" },
        { z: "豆浆", p: "dòujiāng", h: "ĐẦU TƯƠNG", m: "sữa đậu nành" },
      ],
      [
        { z: "一杯", p: "yì bēi", h: "NHẤT BÔI", m: "một cốc" },
        { z: "给妻子", p: "gěi qīzi", h: "CẤP THÊ TỬ", m: "cho vợ" },
        { z: "一杯", p: "yì bēi", h: "NHẤT BÔI", m: "một cốc" },
        { z: "给自己", p: "gěi zìjǐ", h: "CẤP TỰ KỶ", m: "cho mình" },
      ],
      [
        { z: "周末", p: "zhōumò", h: "CHU MOÁT", m: "cuối tuần" },
        { z: "他不跑步", p: "tā bù pǎobù", h: "THA BẤT PHAO BỘ", m: "anh ấy không chạy bộ" },
        { z: "而是", p: "érshì", h: "NHI THỊ", m: "mà (thay vào đó)" },
        { z: "带孩子", p: "dài háizi", h: "ĐẠI HÀI TỬ", m: "dắt con" },
        { z: "去图书馆", p: "qù túshūguǎn", h: "KHỨ ĐỒ THƯ QUẢN", m: "đi thư viện" },
      ],
    ],
    quiz: [
      {
        q: "小李每天几点起床？",
        options: ["五点半", "六点", "七点"],
        answer: 1,
        explanation: "Câu đầu: 小李每天六点起床，然后去公园跑步 — tiểu Lý dậy lúc 6 giờ sáng.",
      },
      {
        q: "跑步以后，小李常常买什么？",
        options: ["豆浆", "牛奶", "咖啡"],
        answer: 0,
        explanation: "Bài đọc viết: 他会买两杯豆浆 — anh ấy mua hai cốc sữa đậu nành, một cho vợ, một cho mình.",
      },
      {
        q: "周末小李带孩子去哪儿？",
        options: ["公园", "图书馆", "商店"],
        answer: 1,
        explanation: "Câu cuối: 周末他不跑步，而是带孩子去图书馆 — cuối tuần anh ấy đưa con đi thư viện.",
      },
    ],
  },

  /* morning — HSK 1, đời sống, soạn mới (từ vựng HSK 1 cơ bản). */
  morning: {
    id: "morning",
    sentences: [
      [
        { z: "早上", p: "zǎoshang", h: "TẢO THƯỢNG", m: "buổi sáng" },
        { z: "我", p: "wǒ", h: "NGÃ", m: "tôi" },
        { z: "六点", p: "liù diǎn", h: "LỤC ĐIỂM", m: "sáu giờ" },
        { z: "起床", p: "qǐchuáng", h: "KHỞI SÀNG", m: "thức dậy" },
      ],
      [
        { z: "七点", p: "qī diǎn", h: "THẤT ĐIỂM", m: "bảy giờ" },
        { z: "我", p: "wǒ", h: "NGÃ", m: "tôi" },
        { z: "吃早饭", p: "chī zǎofàn", h: "XÍ TẢO PHẠN", m: "ăn bữa sáng" },
      ],
      [
        { z: "然后", p: "ránhòu", h: "NHIÊN HẬU", m: "sau đó" },
        { z: "我", p: "wǒ", h: "NGÃ", m: "tôi" },
        { z: "去学校", p: "qù xuéxiào", h: "KHỨ HỌC HIỆU", m: "đi trường" },
      ],
      [
        { z: "上午", p: "shàngwǔ", h: "THƯỢNG NGỌ", m: "buổi sáng (trưa trước)" },
        { z: "我们", p: "wǒmen", h: "NGÃ MÔN", m: "chúng tôi" },
        { z: "学汉语", p: "xué Hànyǔ", h: "HỌC HÁN NGỮ", m: "học tiếng Trung" },
      ],
      [
        { z: "中午", p: "zhōngwǔ", h: "TRUNG NGỌ", m: "buổi trưa" },
        { z: "我", p: "wǒ", h: "NGÃ", m: "tôi" },
        { z: "和同学", p: "hé tóngxué", h: "HÒA ĐỒNG HỌC", m: "cùng bạn học" },
        { z: "一起吃饭", p: "yìqǐ chīfàn", h: "NHẤT KHỞI XÍ PHẠN", m: "cùng nhau ăn cơm" },
      ],
      [
        { z: "晚上", p: "wǎnshang", h: "VÃN THƯỢNG", m: "buổi tối" },
        { z: "我", p: "wǒ", h: "NGÃ", m: "tôi" },
        { z: "写汉字", p: "xiě Hànzì", h: "TẢ HÁN TỰ", m: "viết chữ Hán" },
        { z: "听音乐", p: "tīng yīnyuè", h: "THÍNH ÂM NGUYỆT", m: "nghe nhạc" },
      ],
    ],
    quiz: [
      {
        q: "我几点起床？",
        options: ["五点", "六点", "七点"],
        answer: 1,
        explanation: "Câu đầu: 早上我六点起床 — tôi dậy lúc sáu giờ sáng.",
      },
      {
        q: "中午我和谁一起吃饭？",
        options: ["老师", "妈妈", "同学"],
        answer: 2,
        explanation: "Bài đọc viết: 中午我和同学一起吃饭 — trưa tôi ăn cơm cùng bạn học.",
      },
      {
        q: "晚上我做什么？",
        options: ["看电视", "写汉字、听音乐", "去学校"],
        answer: 1,
        explanation: "Câu cuối: 晚上我写汉字、听音乐 — tối tôi viết chữ Hán và nghe nhạc.",
      },
    ],
  },

  /* demo-1 — "一个人的生活" (hấp thụ demoDoc cũ), 13 câu word-level. */
  "demo-1": {
    id: "demo-1",
    sentences: [
      [
        { z: "我", p: "wǒ", h: "NGÃ", m: "tôi" },
        { z: "一个人", p: "yíge rén", h: "NHẤT NHÂN", m: "một mình" },
        { z: "住在", p: "zhù zài", h: "TRỤ TẠI", m: "sống ở" },
        { z: "一间", p: "yì jiān", h: "NHẤT GIAN", m: "một căn" },
        { z: "小小", p: "xiǎoxiǎo", h: "TIỂU TIỂU", m: "nhỏ xíu" },
        { z: "的", p: "de", h: "ĐÍCH", m: "(trợ từ sở hữu/mô tả)" },
        { z: "公寓", p: "gōngyù", h: "CÔNG DỤ", m: "căn hộ, chung cư" },
        { z: "里", p: "lǐ", h: "LÝ", m: "trong" },
      ],
      [
        { z: "每天", p: "měitiān", h: "MỄI THIÊN", m: "mỗi ngày" },
        { z: "早上", p: "zǎoshang", h: "TẢO THƯỢNG", m: "buổi sáng" },
        { z: "七点", p: "qī diǎn", h: "THẤT ĐIỂM", m: "bảy giờ" },
        { z: "闹钟", p: "nàozhōng", h: "NÁO CHUNG", m: "đồng hồ báo thức" },
        { z: "一", p: "yì", h: "NHẤT", m: "một (vừa... thì)" },
        { z: "响", p: "xiǎng", h: "HƯỞNG", m: "reo, kêu" },
        { z: "我", p: "wǒ", h: "NGÃ", m: "tôi" },
        { z: "就", p: "jiù", h: "TỰU", m: "thì, liền" },
        { z: "起床", p: "qǐchuáng", h: "KHỞI SÀNG", m: "thức dậy" },
        { z: "了", p: "le", h: "LIỄU", m: "(trợ từ hoàn thành)" },
      ],
      [
        { z: "我", p: "wǒ", h: "NGÃ", m: "tôi" },
        { z: "先", p: "xiān", h: "TIÊN", m: "trước tiên" },
        { z: "喝", p: "hē", h: "YẾT", m: "uống" },
        { z: "一杯", p: "yì bēi", h: "NHẤT BÔI", m: "một cốc" },
        { z: "温水", p: "wēn shuǐ", h: "ÔN THỦY", m: "nước ấm" },
        { z: "然后", p: "ránhòu", h: "NHIÊN HẬU", m: "sau đó" },
        { z: "做", p: "zuò", h: "TÁC", m: "làm" },
        { z: "十分钟", p: "shí fēnzhōng", h: "THẬP PHÂN CHUNG", m: "mười phút" },
        { z: "的", p: "de", h: "ĐÍCH", m: "(trợ từ sở hữu/mô tả)" },
        { z: "拉伸", p: "lāshēn", h: "LA THÂN", m: "giãn cơ, kéo giãn" },
      ],
      [
        { z: "早餐", p: "zǎocān", h: "TẢO THAM", m: "bữa sáng" },
        { z: "通常", p: "tōngcháng", h: "THÔNG THƯỜNG", m: "thường thường" },
        { z: "是", p: "shì", h: "THỊ", m: "là" },
        { z: "鸡蛋", p: "jīdàn", h: "KÊ ĐẠM", m: "trứng gà" },
        { z: "面包", p: "miànbāo", h: "MIỆN BAO", m: "bánh mì" },
        { z: "和", p: "hé", h: "HÒA", m: "và" },
        { z: "一杯", p: "yì bēi", h: "NHẤT BÔI", m: "một ly" },
        { z: "咖啡", p: "kāfēi", h: "CA PHI", m: "cà phê" },
      ],
      [
        { z: "八点半", p: "bā diǎnbàn", h: "BÁT ĐIỂM BÁN", m: "tám giờ rưỡi" },
        { z: "我", p: "wǒ", h: "NGÃ", m: "tôi" },
        { z: "出门", p: "chūmén", h: "XUẤT MÔN", m: "ra khỏi nhà" },
        { z: "坐", p: "zuò", h: "TỌA", m: "ngồi, đi (xe)" },
        { z: "地铁", p: "dìtiě", h: "ĐỊA THIẾT", m: "tàu điện ngầm" },
        { z: "去", p: "qù", h: "KHỨ", m: "đi đến" },
        { z: "上班", p: "shàngbān", h: "THƯỢNG BAN", m: "đi làm" },
      ],
      [
        { z: "车上", p: "chē shang", h: "XA THƯỢNG", m: "trên xe" },
        { z: "人多", p: "rén duō", h: "NHÂN ĐA", m: "đông người" },
        { z: "的时候", p: "de shíhou", h: "ĐÍCH THỜI HẬU", m: "lúc, khi" },
        { z: "我", p: "wǒ", h: "NGÃ", m: "tôi" },
        { z: "喜欢", p: "xǐhuan", h: "HỈ HOAN", m: "thích" },
        { z: "听", p: "tīng", h: "THÍNH", m: "nghe" },
        { z: "播客", p: "bōkè", h: "BÁT KHÁCH", m: "podcast" },
        { z: "或者", p: "huòzhě", h: "HOẶC GIẢ", m: "hoặc" },
        { z: "背", p: "bèi", h: "BỐI", m: "học thuộc" },
        { z: "几个单词", p: "jǐge dāncí", h: "CƠ CA ĐAN TỪ", m: "vài từ mới" },
      ],
      [
        { z: "中午", p: "zhōngwǔ", h: "TRUNG NGỌ", m: "buổi trưa" },
        { z: "我", p: "wǒ", h: "NGÃ", m: "tôi" },
        { z: "和", p: "hé", h: "HÒA", m: "với, cùng" },
        { z: "同事", p: "tóngshì", h: "ĐỒNG SỰ", m: "đồng nghiệp" },
        { z: "一起", p: "yìqǐ", h: "NHẤT KHỞI", m: "cùng nhau" },
        { z: "吃饭", p: "chīfàn", h: "XÍ PHẠN", m: "ăn cơm" },
        { z: "聊聊天", p: "liáoliaotiān", h: "LIÊU LIÊU THIÊN", m: "tám chuyện vài câu" },
      ],
      [
        { z: "下午", p: "xiàwǔ", h: "HẠ NGỌ", m: "buổi chiều" },
        { z: "的", p: "de", h: "ĐÍCH", m: "(trợ từ sở hữu/mô tả)" },
        { z: "工作", p: "gōngzuò", h: "CÔNG TÁC", m: "công việc" },
        { z: "虽然", p: "suīrán", h: "TUY NHIÊN", m: "tuy" },
        { z: "忙", p: "máng", h: "MANG", m: "bận" },
        { z: "但是", p: "dànshì", h: "ĐẪN THỊ", m: "nhưng" },
        { z: "我", p: "wǒ", h: "NGÃ", m: "tôi" },
        { z: "学到了", p: "xuédàole", h: "HỌC ĐÁO LIỄU", m: "đã học được" },
        { z: "很多", p: "hěn duō", h: "HẪN ĐA", m: "rất nhiều" },
        { z: "东西", p: "dōngxi", h: "ĐÔNG TÂY", m: "đồ, điều (gì đó)" },
      ],
      [
        { z: "晚上", p: "wǎnshang", h: "VÃN THƯỢNG", m: "buổi tối" },
        { z: "回家", p: "huí jiā", h: "HỒI GIA", m: "về nhà" },
        { z: "以后", p: "yǐhòu", h: "DĨ HẬU", m: "sau khi" },
        { z: "我", p: "wǒ", h: "NGÃ", m: "tôi" },
        { z: "自己", p: "zìjǐ", h: "TỰ KỶ", m: "tự mình" },
        { z: "做饭", p: "zuòfàn", h: "TÁC PHẠN", m: "nấu ăn" },
      ],
      [
        { z: "我", p: "wǒ", h: "NGÃ", m: "tôi" },
        { z: "最", p: "zuì", h: "TOÁT", m: "nhất" },
        { z: "拿手", p: "náshǒu", h: "NÃ THỦ", m: "thành thạo, giỏi (về việc gì)" },
        { z: "的", p: "de", h: "ĐÍCH", m: "(trợ từ sở hữu/mô tả)" },
        { z: "菜", p: "cài", h: "THÁI", m: "món ăn" },
        { z: "是", p: "shì", h: "THỊ", m: "là" },
        { z: "西红柿", p: "xīhóngshì", h: "TÂY HỒNG THỊ", m: "cà chua" },
        { z: "炒", p: "chǎo", h: "SẢO", m: "xào" },
        { z: "鸡蛋", p: "jīdàn", h: "KÊ ĐẠM", m: "trứng gà" },
      ],
      [
        { z: "吃完饭", p: "chīwán fàn", h: "XÍ HOÀN PHẠN", m: "ăn cơm xong" },
        { z: "我", p: "wǒ", h: "NGÃ", m: "tôi" },
        { z: "有时", p: "yǒushí", h: "HỮU THỜI", m: "khi thì" },
        { z: "看", p: "kàn", h: "KHAN", m: "xem" },
        { z: "电视剧", p: "diànshìjù", h: "ĐIỆN THỊ KỊCH", m: "phim truyền hình" },
        { z: "有时", p: "yǒushí", h: "HỮU THỜI", m: "khi thì" },
        { z: "去", p: "qù", h: "KHỨ", m: "đi đến" },
        { z: "楼下", p: "lóuxià", h: "LÂU HẠ", m: "dưới nhà" },
        { z: "散步", p: "sànbù", h: "TẢN BỘ", m: "đi bộ" },
      ],
      [
        { z: "睡觉", p: "shuìjiào", h: "THỤY GIÁC", m: "ngủ" },
        { z: "以前", p: "yǐqián", h: "DĨ TIỀN", m: "trước khi" },
        { z: "我", p: "wǒ", h: "NGÃ", m: "tôi" },
        { z: "会", p: "huì", h: "HỘI", m: "sẽ, biết cách" },
        { z: "写", p: "xiě", h: "TẢ", m: "viết" },
        { z: "几句话", p: "jǐ jù huà", h: "CƠ CÚ THOẠI", m: "vài câu" },
        { z: "记录", p: "jìlù", h: "KỶ LỤC", m: "ghi chép, ghi lại" },
        { z: "这", p: "zhè", h: "GIẢ", m: "này" },
        { z: "一天", p: "yì tiān", h: "NHẤT THIÊN", m: "một ngày" },
      ],
      [
        { z: "一个人", p: "yíge rén", h: "NHẤT NHÂN", m: "một người" },
        { z: "的", p: "de", h: "ĐÍCH", m: "(trợ từ sở hữu/mô tả)" },
        { z: "生活", p: "shēnghuó", h: "SINH HOẠT", m: "cuộc sống" },
        { z: "很", p: "hěn", h: "HẪN", m: "rất" },
        { z: "简单", p: "jiǎndān", h: "GIẢN ĐAN", m: "giản đơn" },
        { z: "但是", p: "dànshì", h: "ĐẪN THỊ", m: "nhưng" },
        { z: "我", p: "wǒ", h: "NGÃ", m: "tôi" },
        { z: "觉得", p: "juéde", h: "GIÁC ĐẮC", m: "cảm thấy" },
        { z: "很", p: "hěn", h: "HẪN", m: "rất" },
        { z: "幸福", p: "xìngfú", h: "HẠNH PHÚC", m: "hạnh phúc" },
      ],
    ],
    quiz: [
      {
        q: "作者早上起床以后先做什么？",
        options: ["先喝一杯温水", "马上去上班", "做早饭", "看电视剧"],
        answer: 0,
        explanation: "Câu 3: 我先喝一杯温水，然后做十分钟的拉伸 — sau khi dậy, tác giả uống nước ấm trước.",
      },
      {
        q: "作者最拿手的菜是什么？",
        options: ["饺子", "西红柿炒鸡蛋", "米饭和青菜", "面条"],
        answer: 1,
        explanation: "Câu 10: 我最拿手的菜是西红柿炒鸡蛋 — món tác giả giỏi nhất là cà chua xào trứng.",
      },
      {
        q: "作者觉得一个人的生活怎么样？",
        options: ["很无聊", "很累", "很简单，也很幸福", "很吵闹"],
        answer: 2,
        explanation: "Câu kết: 一个人的生活很简单，但是我觉得很幸福 — cuộc sống một người giản đơn nhưng hạnh phúc.",
      },
    ],
  },
};
