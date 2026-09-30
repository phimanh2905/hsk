/* Port 1:1 từ clone/js/data/reading.js — PLAN-07 dữ liệu Bài đọc (hardcode, UI-only).
   sampleText: ~300 ký tự, ≥ 8 câu (đời thường, tự biên soạn).
   demoDoc: "一个人的生活" — 13 câu + pinyin + dịch + 5 từ vựng + 3 câu hỏi. */

export type ReadingSentence = { zh: string; py: string; vi: string };
export type ReadingVocab = { word: string; py: string; vi: string };
export type ReadingQuestion = { q: string; qVi: string; options: string[]; answer: number };

/* Văn bản mẫu điền vào textarea (≈300 ký tự, 11 câu) */
const sampleText =
  "周末早上，我七点就醒了。窗外的阳光很好，我决定去菜市场买菜。" +
  "市场里人很多，卖菜的阿姨都很热情。我买了两个西红柿、一把青菜，还有一块豆腐。" +
  "回家的路上，我遇到了邻居王老师，我们站在楼下聊了一会儿。她说最近天气变化很大，" +
  "让我多穿一点衣服，别感冒了。中午我用刚买的菜做了三道家常菜，味道都不错。" +
  "下午我在阳台看书、听音乐，风轻轻地吹进来，感觉非常舒服。晚饭以后，" +
  "我和朋友去公园走了一圈，公园里有很多老人在跳舞，孩子们在跑步。晚上我给妈妈打了电话，" +
  "告诉她我这周末过得很充实。她说只要我照顾好自己，她就放心了。挂了电话，我泡了一杯茶，" +
  "计划下周的学习目标。十点多我才上床睡觉，希望下周也能这么开心。";

/* Bài demo — câu được tách sẵn, mỗi câu kèm pinyin + bản dịch */
const demoDoc = {
  id: "demo-1",
  title: "一个人的生活",
  label: "Cuộc sống một mình",
  meta: "2:29 · 654 ký tự",
  sentences: [
    {
      zh: "我一个人住在一间小小的公寓里。",
      py: "Wǒ yíge rén zhù zài yì jiān xiǎoxiǎo de gōngyù lǐ.",
      vi: "Tôi sống một mình trong một căn hộ nhỏ xíu."
    },
    {
      zh: "每天早上七点，闹钟一响我就起床了。",
      py: "Měitiān zǎoshang qī diǎn, nàozhōng yì xiǎng wǒ jiù qǐchuáng le.",
      vi: "Mỗi sáng lúc bảy giờ, chuông báo thức vừa reo là tôi đã dậy."
    },
    {
      zh: "我先喝一杯温水，然后做十分钟的拉伸。",
      py: "Wǒ xiān hē yì bēi wēn shuǐ, ránhòu zuò shí fēnzhōng de lāshēn.",
      vi: "Tôi uống trước một cốc nước ấm, sau đó giãn cơ mười phút."
    },
    {
      zh: "早餐通常是鸡蛋、面包和一杯咖啡。",
      py: "Zǎocān tōngcháng shì jīdàn, miànbāo hé yì bēi kāfēi.",
      vi: "Bữa sáng thường là trứng, bánh mì và một ly cà phê."
    },
    {
      zh: "八点半我出门坐地铁去上班。",
      py: "Bā diǎnbàn wǒ chūmén zuò dìtiě qù shàngbān.",
      vi: "Tám giờ rưỡi tôi ra khỏi nhà, đi tàu điện đến chỗ làm."
    },
    {
      zh: "车上人多的时候，我喜欢听播客或者背几个单词。",
      py: "Chē shang rén duō de shíhou, wǒ xǐhuan tīng bōkè huòzhě bèi jǐge dāncí.",
      vi: "Lúc trên xe đông người, tôi thích nghe podcast hoặc học thuộc vài từ mới."
    },
    {
      zh: "中午我和同事一起吃饭，聊聊天。",
      py: "Zhōngwǔ wǒ hé tóngshì yìqǐ chīfàn, liáoliaotiān.",
      vi: "Buổi trưa tôi ăn cơm cùng đồng nghiệp, tám chuyện vài câu."
    },
    {
      zh: "下午的工作虽然忙，但是我学到了很多东西。",
      py: "Xiàwǔ de gōngzuò suīrán máng, dànshì wǒ xuédàole hěn duō dōngxi.",
      vi: "Công việc buổi chiều tuy bận, nhưng tôi học được rất nhiều điều."
    },
    {
      zh: "晚上回家以后，我自己做饭。",
      py: "Wǎnshang huí jiā yǐhòu, wǒ zìjǐ zuòfàn.",
      vi: "Tối về nhà, tôi tự nấu ăn."
    },
    {
      zh: "我最拿手的菜是西红柿炒鸡蛋。",
      py: "Wǒ zuì náshǒu de cài shì xīhóngshì chǎo jīdàn.",
      vi: "Món tôi giỏi nhất là cà chua xào trứng."
    },
    {
      zh: "吃完饭，我有时看电视剧，有时去楼下散步。",
      py: "Chīwán fàn, wǒ yǒushí kàn diànshìjù, yǒushí qù lóuxià sànbù.",
      vi: "Ăn cơm xong, khi thì tôi xem phim truyền hình, khi thì ra dưới nhà đi bộ."
    },
    {
      zh: "睡觉以前，我会写几句话，记录这一天。",
      py: "Shuìjiào yǐqián, wǒ huì xiě jǐ jù huà, jìlù zhè yì tiān.",
      vi: "Trước khi ngủ, tôi viết vài câu để ghi lại một ngày đã qua."
    },
    {
      zh: "一个人的生活很简单，但是我觉得很幸福。",
      py: "Yíge rén de shēnghuó hěn jiǎndān, dànshì wǒ juéde hěn xìngfú.",
      vi: "Cuộc sống của một người rất giản đơn, nhưng tôi cảm thấy rất hạnh phúc."
    }
  ],
  vocab: [
    { word: "公寓", py: "gōngyù", vi: "căn hộ, chung cư" },
    { word: "闹钟", py: "nàozhōng", vi: "đồng hồ báo thức" },
    { word: "拉伸", py: "lāshēn", vi: "giãn cơ, kéo giãn" },
    { word: "拿手", py: "náshǒu", vi: "thành thạo, giỏi (về việc gì)" },
    { word: "记录", py: "jìlù", vi: "ghi chép, ghi lại" }
  ],
  questions: [
    {
      q: "作者早上起床以后先做什么？",
      qVi: "Tác giả làm gì đầu tiên sau khi ngủ dậy buổi sáng?",
      options: ["先喝一杯温水", "马上去上班", "做早饭", "看电视剧"],
      answer: 0
    },
    {
      q: "作者最拿手的菜是什么？",
      qVi: "Món tác giả giỏi nhất là gì?",
      options: ["饺子", "西红柿炒鸡蛋", "米饭和青菜", "面条"],
      answer: 1
    },
    {
      q: "作者觉得一个人的生活怎么样？",
      qVi: "Tác giả cảm thấy cuộc sống một mình như thế nào?",
      options: ["很无聊", "很累", "很简单，也很幸福", "很吵闹"],
      answer: 2
    }
  ]
};

export const readingData: {
  sampleText: string;
  demoDoc: {
    id: string;
    title: string;
    label: string;
    meta: string;
    sentences: ReadingSentence[];
    vocab: ReadingVocab[];
    questions: ReadingQuestion[];
  };
} = { sampleText: sampleText, demoDoc: demoDoc };
