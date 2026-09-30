/* Port 1:1 từ clone/js/data/dictionary.js — PLAN-09 dữ liệu Từ điển Trung → Việt (hardcode, UI-only).
   20 entries. Nhóm 学习 đủ 5 kết quả theo SPEC-09. */

export type DictExample = { zh: string; pinyinPerChar: string[]; vi: string };
export type DictEntry = {
  hanzi: string;
  pinyinPerChar: string[];
  traditional: string | null;
  meanings: string[];
  pos: string;
  level: string | null;
  examples: DictExample[];
};

export const dictionary: DictEntry[] = [
  /* ---------- Nhóm 学习 (5 kết quả) ---------- */
  {
    hanzi: "学习",
    pinyinPerChar: ["xué", "xí"],
    traditional: "學習",
    meanings: ["học tập; học", "nghiên cứu, tìm hiểu (kinh nghiệm, kiến thức, kỹ năng)"],
    pos: "Động từ",
    level: "HSK 1",
    examples: [
      { zh: "我在学习汉语。", pinyinPerChar: ["wǒ", "zài", "xué", "xí", "hàn", "yǔ", ""], vi: "Tôi đang học tiếng Trung." },
      { zh: "学习使人进步。", pinyinPerChar: ["xué", "xí", "shǐ", "rén", "jìn", "bù", ""], vi: "Học tập khiến con người tiến bộ." }
    ]
  },
  {
    hanzi: "学习刻苦",
    pinyinPerChar: ["xué", "xí", "kè", "kǔ"],
    traditional: "學習刻苦",
    meanings: ["học tập khắc khổ / cần cù", "chăm chỉ, chịu khó trong học tập"],
    pos: "Cụm từ",
    level: null,
    examples: [
      { zh: "他学习刻苦，成绩很好。", pinyinPerChar: ["tā", "xué", "xí", "kè", "kǔ", "", "chéng", "jì", "hěn", "hǎo", ""], vi: "Cậu ấy học hành cần cù nên thành tích rất tốt." }
    ]
  },
  {
    hanzi: "学习强国",
    pinyinPerChar: ["xué", "xí", "qiáng", "guó"],
    traditional: "學習強國",
    meanings: ["Tên riêng — Xuexi Qiangguo, ứng dụng của Trung Quốc thiết kế để dạy Tư tưởng Tập Cận Bình, phát hành năm 2019"],
    pos: "Tên riêng",
    level: null,
    examples: [
      { zh: "我每天在学习强国上打卡。", pinyinPerChar: ["wǒ", "měi", "tiān", "zài", "xué", "xí", "qiáng", "guó", "shàng", "dǎ", "kǎ", ""], vi: "Tôi mỗi ngày đều lên Xuexi Qiangguo điểm danh học tập." }
    ]
  },
  {
    hanzi: "学习时报",
    pinyinPerChar: ["xué", "xí", "shí", "bào"],
    traditional: null,
    meanings: ["Tên riêng — Learning Times, báo lý luận của Trung Quốc chuyên về học tập và thời sự"],
    pos: "Tên riêng",
    level: null,
    examples: [
      { zh: "这篇文章发表在学习时报上。", pinyinPerChar: ["zhè", "piān", "wén", "zhāng", "fā", "biǎo", "zài", "xué", "xí", "shí", "bào", "shàng", ""], vi: "Bài viết này được đăng trên Learning Times." }
    ]
  },
  {
    hanzi: "学习委员",
    pinyinPerChar: ["xué", "xí", "wěi", "yuán"],
    traditional: "學習委員",
    meanings: ["ban cán sự lớp phụ trách học tập (trong lớp học ở Trung Quốc)"],
    pos: "Danh từ",
    level: null,
    examples: [
      { zh: "她是我们班的学习委员。", pinyinPerChar: ["tā", "shì", "wǒ", "men", "bān", "de", "xué", "xí", "wěi", "yuán", ""], vi: "Cô ấy là ban cán sự lớp phụ trách học tập của lớp chúng tôi." }
    ]
  },

  /* ---------- Từ vựng HSK 1 thông dụng ---------- */
  {
    hanzi: "你好",
    pinyinPerChar: ["nǐ", "hǎo"],
    traditional: "你好",
    meanings: ["xin chào (lời chào hỏi thông dụng nhất)"],
    pos: "Thán từ",
    level: "HSK 1",
    examples: [
      { zh: "你好，很高兴认识你。", pinyinPerChar: ["nǐ", "hǎo", "", "hěn", "gāo", "xìng", "rèn", "shi", "nǐ", ""], vi: "Xin chào, rất vui được gặp bạn." },
      { zh: "老师，你好！", pinyinPerChar: ["lǎo", "shī", "", "nǐ", "hǎo", ""], vi: "Chào thầy/cô ạ!" }
    ]
  },
  {
    hanzi: "时间",
    pinyinPerChar: ["shí", "jiān"],
    traditional: "時間",
    meanings: ["thời gian", "thì giờ, khoảng thời gian"],
    pos: "Danh từ",
    level: "HSK 1",
    examples: [
      { zh: "我没有时间。", pinyinPerChar: ["wǒ", "méi", "yǒu", "shí", "jiān", ""], vi: "Tôi không có thời gian." },
      { zh: "时间过得真快。", pinyinPerChar: ["shí", "jiān", "guò", "de", "zhēn", "kuài", ""], vi: "Thời gian trôi nhanh thật." }
    ]
  },
  {
    hanzi: "老师",
    pinyinPerChar: ["lǎo", "shī"],
    traditional: "老師",
    meanings: ["giáo viên, thầy cô", "người thầy (cách gọi thể hiện sự tôn trọng)"],
    pos: "Danh từ",
    level: "HSK 1",
    examples: [
      { zh: "王老师是我们的汉语老师。", pinyinPerChar: ["wáng", "lǎo", "shī", "shì", "wǒ", "men", "de", "hàn", "yǔ", "lǎo", "shī", ""], vi: "Thầy Vương là giáo viên tiếng Trung của chúng tôi." },
      { zh: "谢谢老师！", pinyinPerChar: ["xiè", "xie", "lǎo", "shī", ""], vi: "Cảm ơn thầy/cô!" }
    ]
  },
  {
    hanzi: "学生",
    pinyinPerChar: ["xué", "shēng"],
    traditional: "學生",
    meanings: ["học sinh; sinh viên", "người học"],
    pos: "Danh từ",
    level: "HSK 1",
    examples: [
      { zh: "他是大学生。", pinyinPerChar: ["tā", "shì", "dà", "xué", "shēng", ""], vi: "Anh ấy là sinh viên." },
      { zh: "学生们在学校里学习。", pinyinPerChar: ["xué", "shēng", "men", "zài", "xué", "xiào", "lǐ", "xué", "xí", ""], vi: "Các học sinh đang học tập trong trường." }
    ]
  },
  {
    hanzi: "汉语",
    pinyinPerChar: ["hàn", "yǔ"],
    traditional: "漢語",
    meanings: ["tiếng Hán, tiếng Trung (ngôn ngữ)"],
    pos: "Danh từ",
    level: "HSK 1",
    examples: [
      { zh: "我学汉语两年了。", pinyinPerChar: ["wǒ", "xué", "hàn", "yǔ", "liǎng", "nián", "le", ""], vi: "Tôi học tiếng Trung đã hai năm rồi." },
      { zh: "汉语很难吗？", pinyinPerChar: ["hàn", "yǔ", "hěn", "nán", "ma", ""], vi: "Tiếng Trung có khó không?" }
    ]
  },
  {
    hanzi: "中文",
    pinyinPerChar: ["zhōng", "wén"],
    traditional: "中文",
    meanings: ["tiếng Trung, văn tiếng Trung", "chữ Hán và văn tự của Trung Quốc"],
    pos: "Danh từ",
    level: "HSK 1",
    examples: [
      { zh: "我会说一点中文。", pinyinPerChar: ["wǒ", "huì", "shuō", "yī", "diǎn", "zhōng", "wén", ""], vi: "Tôi nói được một chút tiếng Trung." },
      { zh: "这本书有中文版。", pinyinPerChar: ["zhè", "běn", "shū", "yǒu", "zhōng", "wén", "bǎn", ""], vi: "Quyển sách này có bản tiếng Trung." }
    ]
  },
  {
    hanzi: "大学",
    pinyinPerChar: ["dà", "xué"],
    traditional: "大學",
    meanings: ["trường đại học", "bậc đại học"],
    pos: "Danh từ",
    level: "HSK 1",
    examples: [
      { zh: "我在北京大学学习。", pinyinPerChar: ["wǒ", "zài", "běi", "jīng", "dà", "xué", "xué", "xí", ""], vi: "Tôi học tại Đại học Bắc Kinh." },
      { zh: "他考上了好大学。", pinyinPerChar: ["tā", "kǎo", "shàng", "le", "hǎo", "dà", "xué", ""], vi: "Cậu ấy đỗ vào một trường đại học tốt." }
    ]
  },
  {
    hanzi: "朋友",
    pinyinPerChar: ["péng", "yǒu"],
    traditional: "朋友",
    meanings: ["bạn bè, người bạn"],
    pos: "Danh từ",
    level: "HSK 1",
    examples: [
      { zh: "他是我最好的朋友。", pinyinPerChar: ["tā", "shì", "wǒ", "zuì", "hǎo", "de", "péng", "yǒu", ""], vi: "Anh ấy là bạn thân nhất của tôi." },
      { zh: "我们是好朋友。", pinyinPerChar: ["wǒ", "men", "shì", "hǎo", "péng", "yǒu", ""], vi: "Chúng tôi là bạn tốt." }
    ]
  },
  {
    hanzi: "谢谢",
    pinyinPerChar: ["xiè", "xie"],
    traditional: "謝謝",
    meanings: ["cảm ơn"],
    pos: "Động từ",
    level: "HSK 1",
    examples: [
      { zh: "谢谢你的帮助。", pinyinPerChar: ["xiè", "xie", "nǐ", "de", "bāng", "zhù", ""], vi: "Cảm ơn sự giúp đỡ của bạn." },
      { zh: "不用谢。", pinyinPerChar: ["bù", "yòng", "xiè", ""], vi: "Không có gì đâu." }
    ]
  },
  {
    hanzi: "再见",
    pinyinPerChar: ["zài", "jiàn"],
    traditional: "再見",
    meanings: ["tạm biệt, chào tạm biệt"],
    pos: "Động từ",
    level: "HSK 1",
    examples: [
      { zh: "再见，明天见！", pinyinPerChar: ["zài", "jiàn", "", "míng", "tiān", "jiàn", ""], vi: "Tạm biệt, hẹn gặp lại ngày mai!" },
      { zh: "老师再见！", pinyinPerChar: ["lǎo", "shī", "", "zài", "jiàn", ""], vi: "Chào thầy/cô, hẹn gặp lại!" }
    ]
  },
  {
    hanzi: "电影",
    pinyinPerChar: ["diàn", "yǐng"],
    traditional: "電影",
    meanings: ["phim, phim ảnh", "điện ảnh (nghệ thuật)"],
    pos: "Danh từ",
    level: "HSK 1",
    examples: [
      { zh: "我们一起去看电影吧。", pinyinPerChar: ["wǒ", "men", "yī", "qǐ", "qù", "kàn", "diàn", "yǐng", "ba", ""], vi: "Chúng ta cùng đi xem phim nhé." },
      { zh: "这部电影很好看。", pinyinPerChar: ["zhè", "bù", "diàn", "yǐng", "hěn", "hǎo", "kàn", ""], vi: "Bộ phim này hay lắm." }
    ]
  },
  {
    hanzi: "电话",
    pinyinPerChar: ["diàn", "huà"],
    traditional: "電話",
    meanings: ["điện thoại", "cuộc gọi điện thoại"],
    pos: "Danh từ",
    level: "HSK 1",
    examples: [
      { zh: "你的电话号码是多少？", pinyinPerChar: ["nǐ", "de", "diàn", "huà", "hào", "mǎ", "shì", "duō", "shǎo", ""], vi: "Số điện thoại của bạn là bao nhiêu?" },
      { zh: "我给你打电话。", pinyinPerChar: ["wǒ", "gěi", "nǐ", "dǎ", "diàn", "huà", ""], vi: "Tôi gọi điện thoại cho bạn." }
    ]
  },
  {
    hanzi: "医生",
    pinyinPerChar: ["yī", "shēng"],
    traditional: "醫生",
    meanings: ["bác sĩ"],
    pos: "Danh từ",
    level: "HSK 1",
    examples: [
      { zh: "我妈妈是医生。", pinyinPerChar: ["wǒ", "mā", "ma", "shì", "yī", "shēng", ""], vi: "Mẹ tôi là bác sĩ." },
      { zh: "你应该去看医生。", pinyinPerChar: ["nǐ", "yīng", "gāi", "qù", "kàn", "yī", "shēng", ""], vi: "Bạn nên đi khám bác sĩ." }
    ]
  },
  {
    hanzi: "苹果",
    pinyinPerChar: ["píng", "guǒ"],
    traditional: "蘋果",
    meanings: ["quả táo", "Apple (thương hiệu — khẩu ngữ)"],
    pos: "Danh từ",
    level: "HSK 1",
    examples: [
      { zh: "我喜欢吃苹果。", pinyinPerChar: ["wǒ", "xǐ", "huan", "chī", "píng", "guǒ", ""], vi: "Tôi thích ăn táo." },
      { zh: "这个苹果很甜。", pinyinPerChar: ["zhè", "ge", "píng", "guǒ", "hěn", "tián", ""], vi: "Quả táo này ngọt lắm." }
    ]
  },
  {
    hanzi: "汉字",
    pinyinPerChar: ["hàn", "zì"],
    traditional: "漢字",
    meanings: ["chữ Hán, chữ Trung Quốc"],
    pos: "Danh từ",
    level: "HSK 1",
    examples: [
      { zh: "汉字很难写。", pinyinPerChar: ["hàn", "zì", "hěn", "nán", "xiě", ""], vi: "Chữ Hán khó viết lắm." },
      { zh: "我每天学五个汉字。", pinyinPerChar: ["wǒ", "měi", "tiān", "xué", "wǔ", "ge", "hàn", "zì", ""], vi: "Tôi học năm chữ Hán mỗi ngày." }
    ]
  }
];
