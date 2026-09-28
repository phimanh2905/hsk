/* Nhai HSK clone — PLAN-06 dữ liệu Shadowing (hardcode, UI-only).
   categories: 5 nhóm theo SPEC-06; subtitles: EA3rwvr99Q0 đủ 9 câu spec + 3 video mẫu. */
(function () {
  "use strict";
  window.NHAI_DATA = window.NHAI_DATA || {};

  var cat1 = [
    { id: "EA3rwvr99Q0", title: "墓碑上的QR碼，別掃。", hsk: 3, plays: 366, duration: "2:46", durSec: 166 },
    { id: "sXo-yHFkAio", title: "就這智商，還佔便宜？", hsk: 3, plays: 74, duration: "1:06", durSec: 66 },
    { id: "NkYwdZhkHF0", title: "又要漲工資？！", hsk: 3, plays: 25, duration: "2:21", durSec: 141 },
    { id: "FuIOkW6eaRA", title: "Why does he always drive me crazy?!", hsk: 3, plays: 11, duration: "1:01", durSec: 61 }
  ];
  var cat2 = [
    { id: "J0P6fPl6cho", title: "爸爸的秘密基金", hsk: 3, plays: 44, duration: "1:18", durSec: 78 },
    { id: "FxpyzLt3wRQ", title: "媽媽的殺手鐧", hsk: 3, plays: 12, duration: "3:04", durSec: 184 },
    { id: "09kHjxsFUA4", title: "誰動了我的遊戲機？", hsk: 3, plays: 10, duration: "1:44", durSec: 104 },
    { id: "z1v9d303Xm0", title: "戀愛中的爸爸", hsk: 3, plays: 5, duration: "2:08", durSec: 128 }
  ];
  var cat3 = [
    { id: "6YGJswSorYw", title: "Podcast 01: Chào hỏi 打招呼", hsk: 1, plays: 3100, duration: "5:00", durSec: 300 },
    { id: "83THdBdTy7U", title: "Podcast 12: Mua sắm ở chợ 逛市場", hsk: 2, plays: 235, duration: "4:52", durSec: 292 },
    { id: "o6ilprwO6w0", title: "Podcast 07: Một ngày của tôi 我的一天", hsk: 1, plays: 114, duration: "7:05", durSec: 425 },
    { id: "QwlhcsAMhT0", title: "Podcast 03: Gia đình tôi 我的家庭", hsk: 1, plays: 215, duration: "4:42", durSec: 282 }
  ];
  var cat4 = [
    { id: "H3aRI3ypx_0", title: "Bài 1: Chào hỏi & giới thiệu 打招呼", hsk: 1, plays: 80, duration: "4:29", durSec: 269 },
    { id: "3p9uGOLgVds", title: "Bài 2: Con số & tuổi 數字", hsk: 1, plays: 7, duration: "4:29", durSec: 269 },
    { id: "2pCgqjBBgGU", title: "Bài 3: Gia đình 家人", hsk: 1, plays: 8, duration: "4:35", durSec: 275 },
    { id: "BLEN82k2vDE", title: "Bài 4: Đồ ăn & gọi món 點菜", hsk: 1, plays: 10, duration: "4:28", durSec: 268 }
  ];
  var cat5 = [
    { id: "DQBzSl3OM1I", title: "Ep.12: Cuối tuần của tôi 我的周末", hsk: 3, plays: 16, duration: "15:48", durSec: 948 },
    { id: "tQKsIFE-Y0g", title: "Ep.08: Đi chợ sáng 逛早市", hsk: 3, plays: 3, duration: "16:19", durSec: 979 },
    { id: "wZDej3Logc4", title: "Ep.21: Cà phê và cuộc sống 咖啡與生活", hsk: 3, plays: 1, duration: "14:27", durSec: 867 },
    { id: "XDpsIrpLEOQ", title: "Ep.05: Thời tiết hôm nay 今天的天氣", hsk: 2, plays: 8, duration: "14:19", durSec: 859 }
  ];

  window.NHAI_DATA.shadowing = {
    categories: [
      {
        slug: "daihuaxiyou",
        name: "DaihuaXiyou 呆話西遊",
        count: 84,
        desc: "DaihuaXiyou Official – Laugh out your six-pack abs! 《呆話西遊》，目標讓你笑出腹肌！",
        channel: "DaihuaXiyou Official",
        videos: cat1
      },
      {
        slug: "long-baba",
        name: "我的爸爸是條龍",
        count: 111,
        desc: "我的爸爸是條龍 — 家庭 What a funny family! + 愛情 What is true love?",
        channel: "我的爸爸是條龍",
        videos: cat2
      },
      {
        slug: "so-cap",
        name: "Tiếng Trung Sơ Cấp",
        count: 22,
        desc: "Phù hợp với HSK 1-3",
        channel: "Tiếng Trung Sơ Cấp",
        videos: cat3
      },
      {
        slug: "an-kha-hy",
        name: "Tiếng Trung Sơ Cấp · An Khả Hy",
        count: 100,
        desc: "【HSK1-3】Tiếng Trung sơ cấp / người mới bắt đầu — Beginner Chinese | An Khả Hy",
        channel: "An Khả Hy",
        videos: cat4
      },
      {
        slug: "simple-days",
        name: "Simple Days, Simple Chinese · 简单生活，简单汉语",
        count: 79,
        desc: "Chinese Daily Podcast — Simple Days, Simple Chinese",
        channel: "Simple Chinese Podcast",
        videos: cat5
      }
    ],

    /* Phụ đề: EA3rwvr99Q0 đủ 9 câu đúng nội dung SPEC-06 (start/end 0→165s tăng dần).
       Các video khác: câu mẫu để demo. */
    subtitles: {
      "EA3rwvr99Q0": [
        {
          n: 1, start: 0, end: 18,
          parts: [{ zh: "啊!" }, { zh: "我才离开几天!" }, { zh: "你们怎么就都没了呀!" }, { zh: "没你们我可怎么我啊!" }],
          pinyin: "Á! Wǒ cái líkāi jǐ tiān! Nǐmen zěnme jiù dōu méi le ya! Méi nǐmen wǒ kě zěnme wǒ a!",
          vi: "Á! Mình mới đi có mấy hôm thôi mà! Sao các cậu lại thế này? Không có các cậu mình biết làm sao bây giờ!"
        },
        {
          n: 2, start: 18, end: 28,
          parts: [{ zh: "电子遗言?" }, { zh: "这么高级啊?" }],
          pinyin: "Diànzǐ yíyán? Zhème gāojí a?",
          vi: "Di chúc điện tử? Cao cấp vậy cơ à?"
        },
        {
          n: 3, start: 28, end: 50,
          parts: [{ zh: "我是妾女幽魂。" }, { zh: "你是我的命采臣。" }, { zh: "快来吧!" }, { zh: "我的玉帝哥哥!" }],
          pinyin: "Wǒ shì qiè nǚ yōuhún. Nǐ shì wǒ de mìng cǎichén. Kuài lái ba! Wǒ de Yùdì gēge!",
          vi: "Ta là oán hồn của một nàng thiếp. Còn ngươi là người định mệnh của ta. Đến đây đi! Anh trai Ngọc Hoàng của ta!"
        },
        {
          n: 4, start: 50, end: 56,
          parts: [{ zh: "啊!" }, { zh: "我的妈呀!" }],
          pinyin: "Á! Wǒ de māya!",
          vi: "Á! Mẹ ơi!"
        },
        {
          n: 5, start: 56, end: 72,
          parts: [{ zh: "退!" }, { zh: "退!" }, { zh: "退!" }, { zh: "退!" }, { zh: "退!" }, { zh: "退!" }, { zh: "退!" }, { zh: "退!" }],
          pinyin: "Tuì! Tuì! Tuì! Tuì! Tuì! Tuì! Tuì! Tuì!",
          vi: "Lùi! Lùi! Lùi! Lùi! Lùi! Lùi! Lùi! Lùi!"
        },
        {
          n: 6, start: 72, end: 78,
          parts: [{ zh: "惊喜?" }],
          pinyin: "Jīngxǐ?",
          vi: "Bất ngờ à?"
        },
        {
          n: 7, start: 78, end: 90,
          parts: [{ zh: "师傅," }, { zh: "十万元。" }],
          pinyin: "Shīfu, shíwàn yuán.",
          vi: "Sư phụ, một trăm ngàn tệ."
        },
        {
          n: 8, start: 90, end: 104,
          parts: [{ zh: "哦?" }, { zh: "哎呀呀呀呀呀呀呀呀!" }],
          pinyin: "Ó? Āiyā yā yā yā yā yā yā ya!",
          vi: "Ôi? A a a a a a a a!"
        },
        {
          n: 9, start: 104, end: 165,
          parts: [{ zh: "跟你说了多少遍了?" }, { zh: "不要乱扫二文码!" }, { zh: "不要乱扫二文码!" }],
          pinyin: "Gēn nǐ shuōle duōshao biàn le? Bùyào luàn sǎo èrwén mǎ! Bùyào luàn sǎo èrwén mǎ!",
          vi: "Mình đã bảo cậu bao nhiêu lần rồi? Đừng có quét mã QR bừa bãi! Đừng quét mã QR bừa bãi!"
        }
      ],

      "sXo-yHFkAio": [
        {
          n: 1, start: 0, end: 10,
          parts: [{ zh: "老板，" }, { zh: "这苹果怎么卖?" }],
          pinyin: "Lǎobǎn, zhè píngguǒ zěnme mài?",
          vi: "Bác chủ, táo này bán thế nào ạ?"
        },
        {
          n: 2, start: 10, end: 18,
          parts: [{ zh: "五块一斤，" }, { zh: "很甜。" }],
          pinyin: "Wǔ kuài yī jīn, hěn tián.",
          vi: "Năm tệ một cân, ngọt lắm."
        },
        {
          n: 3, start: 18, end: 27,
          parts: [{ zh: "太贵了，" }, { zh: "三块行不行?" }],
          pinyin: "Tài guì le, sān kuài xíng bu xíng?",
          vi: "Đắt quá, ba tệ được không?"
        },
        {
          n: 4, start: 27, end: 38,
          parts: [{ zh: "这是进口苹果，" }, { zh: "一分都不能少。" }],
          pinyin: "Zhè shì jìnkǒu píngguǒ, yīfēn dōu bùnéng shǎo.",
          vi: "Đây là táo nhập khẩu, một phân cũng không giảm được."
        },
        {
          n: 5, start: 38, end: 50,
          parts: [{ zh: "那我买一个" }, { zh: "总可以吧?" }],
          pinyin: "Nà wǒ mǎi yīgè zǒng kěyǐ ba?",
          vi: "Vậy tôi mua một quả chắc được chứ?"
        },
        {
          n: 6, start: 50, end: 66,
          parts: [{ zh: "一个也五块，" }, { zh: "不讲价。" }],
          pinyin: "Yīgè yě wǔ kuài, bù jiǎngjià.",
          vi: "Một quả cũng năm tệ, không mặc cả."
        }
      ],

      "H3aRI3ypx_0": [
        {
          n: 1, start: 0, end: 14,
          parts: [{ zh: "大家好，" }, { zh: "欢迎来到我的频道。" }],
          pinyin: "Dàjiā hǎo, huānyíng lái dào wǒ de píndào.",
          vi: "Chào mọi người, chào mừng đến với kênh của mình."
        },
        {
          n: 2, start: 14, end: 30,
          parts: [{ zh: "今天我们一起学习" }, { zh: "怎么打招呼。" }],
          pinyin: "Jīntiān wǒmen yīqǐ xuéxí zěnme dǎ zhāohu.",
          vi: "Hôm nay chúng ta cùng học cách chào hỏi."
        },
        {
          n: 3, start: 30, end: 48,
          parts: [{ zh: "你好，" }, { zh: "你叫什么名字?" }],
          pinyin: "Nǐ hǎo, nǐ jiào shénme míngzi?",
          vi: "Xin chào, bạn tên là gì?"
        },
        {
          n: 4, start: 48, end: 64,
          parts: [{ zh: "我叫安娜，" }, { zh: "你呢?" }],
          pinyin: "Wǒ jiào Ānnà, nǐ ne?",
          vi: "Mình tên là Anna, còn bạn?"
        },
        {
          n: 5, start: 64, end: 82,
          parts: [{ zh: "很高兴认识你!" }],
          pinyin: "Hěn gāoxìng rènshi nǐ!",
          vi: "Rất vui được gặp bạn!"
        },
        {
          n: 6, start: 82, end: 100,
          parts: [{ zh: "我也很高兴认识你!" }],
          pinyin: "Wǒ yě hěn gāoxìng rènshi nǐ!",
          vi: "Mình cũng rất vui được gặp bạn!"
        }
      ],

      "DQBzSl3OM1I": [
        {
          n: 1, start: 0, end: 16,
          parts: [{ zh: "大家好，" }, { zh: "欢迎回到简单生活。" }],
          pinyin: "Dàjiā hǎo, huānyíng huídào jiǎndān shēnghuó.",
          vi: "Chào mọi người, chào mừng quay lại với 简单生活."
        },
        {
          n: 2, start: 16, end: 34,
          parts: [{ zh: "今天我想聊聊" }, { zh: "我的周末。" }],
          pinyin: "Jīntiān wǒ xiǎng liáoliáo wǒ de zhōumò.",
          vi: "Hôm nay mình muốn nói về cuối tuần của mình."
        },
        {
          n: 3, start: 34, end: 56,
          parts: [{ zh: "星期六早上，" }, { zh: "我去市场买了新鲜的蔬菜。" }],
          pinyin: "Xīngqīliù zǎoshang, wǒ qù shìchǎng mǎile xīnxiān de shūcài.",
          vi: "Sáng thứ bảy, mình ra chợ mua rau tươi."
        },
        {
          n: 4, start: 56, end: 78,
          parts: [{ zh: "下午，" }, { zh: "我和朋友在咖啡馆聊了两个小时。" }],
          pinyin: "Xiàwǔ, wǒ hé péngyou zài kāfēiguǎn liáole liǎng gè xiǎoshí.",
          vi: "Buổi chiều, mình và bạn bè trò chuyện ở quán cà phê hai tiếng đồng hồ."
        },
        {
          n: 5, start: 78, end: 102,
          parts: [{ zh: "晚上我看了一部" }, { zh: "很有意思的电影。" }],
          pinyin: "Wǎnshang wǒ kànle yī bù hěn yǒuyìsi de diànyǐng.",
          vi: "Tối mình xem một bộ phim rất thú vị."
        },
        {
          n: 6, start: 102, end: 126,
          parts: [{ zh: "你的周末" }, { zh: "是怎么过的呢?" }],
          pinyin: "Nǐ de zhōumò shì zěnme guò de ne?",
          vi: "Cuối tuần của bạn được trải qua như thế nào?"
        }
      ]
    }
  };
})();
