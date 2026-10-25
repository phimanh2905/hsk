/* AUTO-GENERATED bởi scripts/content/gen-reading-src.mts (W3 T9) — KHÔNG sửa tay.
   Nguồn: scripts/content/data/reading/passages-hskN.json (gen-reading, validate W3 T8).
   15 passage (hsk1..hsk5).
   Chạy lại generator sẽ thay thế toàn bộ file này. */

export type ReadingSentence = { zh: string; py: string; vi: string };
export type ReadingVocab = { word: string; py: string; vi: string };
export type ReadingQuestion = { q: string; qVi: string; options: string[]; answer: number };

export type ReadingPassage = {
  id: string;
  book: string;
  lesson: string;
  title: string;
  titleVi: string;
  sentences: ReadingSentence[];
  vocab: ReadingVocab[];
  questions: ReadingQuestion[];
};

export const readingPassages: ReadingPassage[] = [
  {
    "id": "hsk1-reading-1",
    "book": "hsk1",
    "lesson": "lesson-1",
    "title": "我的家",
    "titleVi": "Gia đình của tôi",
    "sentences": [
      {
        "zh": "我叫王明，今年二十岁。",
        "vi": "Tôi tên là Vương Minh, năm nay hai mươi tuổi.",
        "py": "Wǒ jiào Wáng Míng, jīnnián èrshí suì."
      },
      {
        "zh": "我家在北京。",
        "vi": "Nhà tôi ở Bắc Kinh.",
        "py": "Wǒ jiā zài Běijīng."
      },
      {
        "zh": "我家有五个人：爸爸、妈妈、哥哥、妹妹和我。",
        "vi": "Nhà tôi có năm người: bố, mẹ, anh trai, em gái và tôi.",
        "py": "Wǒ jiā yǒu wǔ ge rén: bàba, māma, gēge, mèimei hé wǒ."
      },
      {
        "zh": "爸爸是老师，他在中学工作。",
        "vi": "Bố tôi là giáo viên, ông ấy làm việc ở trường trung học.",
        "py": "Bàba shì lǎoshī, tā zài zhōngxué gōngzuò."
      },
      {
        "zh": "妈妈是医生，她在医院上班。",
        "vi": "Mẹ tôi là bác sĩ, bà ấy đi làm ở bệnh viện.",
        "py": "Māma shì yīshēng, tā zài yīyuàn shàngbān."
      },
      {
        "zh": "哥哥是大学生，他很爱读书。",
        "vi": "Anh trai tôi là sinh viên đại học, anh ấy rất thích đọc sách.",
        "py": "Gēge shì dàxuéshēng, tā hěn ài dúshū."
      },
      {
        "zh": "妹妹今年六岁，她很好玩儿。",
        "vi": "Em gái năm nay sáu tuổi, bé rất dễ thương.",
        "py": "Mèimei jīnnián liù suì, tā hěn hǎowánr."
      },
      {
        "zh": "妹妹喜欢看电视和玩儿。",
        "vi": "Em gái thích xem tivi và chơi.",
        "py": "Mèimei xǐhuan kàn diànshì hé wánr."
      },
      {
        "zh": "我今年上大学，我学汉语。",
        "vi": "Năm nay tôi vào đại học, tôi học tiếng Hán.",
        "py": "Wǒ jīnnián shàng dàxué, wǒ xué Hànyǔ."
      },
      {
        "zh": "我们学校很大，学生很多。",
        "vi": "Trường của chúng tôi rất lớn, sinh viên rất nhiều.",
        "py": "Wǒmen xuéxiào hěn dà, xuésheng hěn duō."
      },
      {
        "zh": "早上我七点起床。",
        "vi": "Sáng tôi bảy giờ dậy.",
        "py": "Zǎoshang wǒ qī diǎn qǐchuáng."
      },
      {
        "zh": "我和同学一起吃早饭。",
        "vi": "Tôi và bạn cùng lớp ăn sáng cùng nhau.",
        "py": "Wǒ hé tóngxué yìqǐ chī zǎofàn."
      },
      {
        "zh": "上午我们上汉语课，老师很好。",
        "vi": "Buổi sáng chúng tôi học tiếng Hán, cô giáo rất tốt.",
        "py": "Shàngwǔ wǒmen shàng Hànyǔ kè, lǎoshī hěn hǎo."
      },
      {
        "zh": "中午我在学校吃饭。",
        "vi": "Buổi trưa tôi ăn cơm ở trường.",
        "py": "Zhōngwǔ wǒ zài xuéxiào chīfàn."
      },
      {
        "zh": "下午我常去图书馆看书。",
        "vi": "Buổi chiều tôi thường đi thư viện đọc sách.",
        "py": "Xiàwǔ wǒ cháng qù túshūguǎn kànshū."
      },
      {
        "zh": "晚上我在家看电视，也和妹妹玩儿。",
        "vi": "Buổi tối tôi ở nhà xem tivi, cũng chơi với em gái.",
        "py": "Wǎnshang wǒ zài jiā kàn diànshì, yě hé mèimei wánr."
      },
      {
        "zh": "星期天，我和家人一起去看电影。",
        "vi": "Chủ nhật, tôi đi xem phim cùng gia đình.",
        "py": "Xīngqītiān, wǒ hé jiārén yìqǐ qù kàn diànyǐng."
      },
      {
        "zh": "我们都很高兴。",
        "vi": "Chúng tôi đều rất vui.",
        "py": "Wǒmen dōu hěn gāoxìng."
      }
    ],
    "vocab": [
      {
        "word": "老师",
        "py": "lǎoshī",
        "vi": "giáo viên"
      },
      {
        "word": "医院",
        "py": "yīyuàn",
        "vi": "bệnh viện"
      },
      {
        "word": "大学",
        "py": "dàxué",
        "vi": "trường đại học"
      },
      {
        "word": "图书馆",
        "py": "túshūguǎn",
        "vi": "thư viện"
      },
      {
        "word": "起床",
        "py": "qǐchuáng",
        "vi": "thức dậy"
      },
      {
        "word": "汉语",
        "py": "Hànyǔ",
        "vi": "tiếng Hán"
      },
      {
        "word": "家人",
        "py": "jiārén",
        "vi": "người thân trong gia đình"
      }
    ],
    "questions": [
      {
        "q": "王明的爸爸在哪里工作？",
        "options": [
          "在医院",
          "在中学",
          "在大学"
        ],
        "answer": 1,
        "qVi": "Bố của Vương Minh làm việc ở đâu?"
      },
      {
        "q": "王明的妹妹今年多大了？",
        "options": [
          "五岁",
          "六岁",
          "七岁"
        ],
        "answer": 1,
        "qVi": "Em gái Vương Minh năm nay bao nhiêu tuổi?"
      },
      {
        "q": "王明在大学学什么？",
        "options": [
          "英语",
          "汉语",
          "电脑"
        ],
        "answer": 1,
        "qVi": "Vương Minh học gì ở đại học?"
      },
      {
        "q": "下午王明常去哪里看书？",
        "options": [
          "图书馆",
          "家里",
          "电影院"
        ],
        "answer": 0,
        "qVi": "Buổi chiều Vương Minh thường đi đâu đọc sách?"
      },
      {
        "q": "王明家有几口人？",
        "options": [
          "四个人",
          "六个人",
          "五个人"
        ],
        "answer": 2,
        "qVi": "Nhà Vương Minh có mấy người?"
      }
    ]
  },
  {
    "id": "hsk1-reading-2",
    "book": "hsk1",
    "lesson": "lesson-2",
    "title": "小明的一天",
    "titleVi": "Một ngày của Tiểu Minh",
    "sentences": [
      {
        "zh": "小明是一个中学生，今年十五岁。",
        "vi": "Tiểu Minh là học sinh trung học, năm nay mười lăm tuổi.",
        "py": "Xiǎomíng shì yí ge zhōngxuéshēng, jīnnián shíwǔ suì."
      },
      {
        "zh": "早上六点半，他起床了。",
        "vi": "Sáu giờ rưỡi sáng, cậu ấy dậy.",
        "py": "Zǎoshang liù diǎn bàn, tā qǐchuáng le."
      },
      {
        "zh": "他先喝牛奶，再吃鸡蛋和面包。",
        "vi": "Cậu ấy trước uống sữa, sau ăn trứng và bánh mì.",
        "py": "Tā xiān hē niúnǎi, zài chī jīdàn hé miànbāo."
      },
      {
        "zh": "七点半，他坐汽车去学校。",
        "vi": "Bảy giờ rưỡi, cậu ấy đi học bằng ô tô.",
        "py": "Qī diǎn bàn, tā zuò qìchē qù xuéxiào."
      },
      {
        "zh": "他家在学校旁边，不很远。",
        "vi": "Nhà cậu ấy ở cạnh trường, không xa lắm.",
        "py": "Tā jiā zài xuéxiào pángbiān, bù hěn yuǎn."
      },
      {
        "zh": "八点上课，他很认真。",
        "vi": "Tám giờ vào học, cậu ấy rất nghiêm túc.",
        "py": "Bā diǎn shàngkè, tā hěn rènzhēn."
      },
      {
        "zh": "上午他上汉语课和电脑课。",
        "vi": "Buổi sáng cậu ấy học tiếng Hán và học tin học.",
        "py": "Shàngwǔ tā shàng Hànyǔ kè hé diànnǎo kè."
      },
      {
        "zh": "他汉语很好，会说很多话。",
        "vi": "Tiếng Hán của cậu ấy rất giỏi, nói được rất nhiều câu.",
        "py": "Tā Hànyǔ hěn hǎo, huì shuō hěn duō huà."
      },
      {
        "zh": "中午十二点，他和同学在学校吃饭。",
        "vi": "Mười hai giờ trưa, cậu ấy và bạn cùng lớp ăn cơm ở trường.",
        "py": "Zhōngwǔ shí'èr diǎn, tā hé tóngxué zài xuéxiào chīfàn."
      },
      {
        "zh": "下午两点半，他和朋友在学校打球。",
        "vi": "Hai giờ rưỡi chiều, cậu ấy và bạn bè chơi bóng ở trường.",
        "py": "Xiàwǔ liǎng diǎn bàn, tā hé péngyou zài xuéxiào dǎ qiú."
      },
      {
        "zh": "下午四点半，他回家写汉字。",
        "vi": "Bốn giờ rưỡi chiều, cậu ấy về nhà viết chữ Hán.",
        "py": "Xiàwǔ sì diǎn bàn, tā huí jiā xiě Hànzì."
      },
      {
        "zh": "晚上六点，他和爸爸、妈妈一起吃晚饭。",
        "vi": "Sáu giờ tối, cậu ấy ăn cơm tối cùng bố mẹ.",
        "py": "Wǎnshang liù diǎn, tā hé bàba, māma yìqǐ chī wǎnfàn."
      },
      {
        "zh": "晚饭后，他看电视，也看书。",
        "vi": "Sau bữa tối, cậu ấy xem tivi, cũng đọc sách.",
        "py": "Wǎnfàn hòu, tā kàn diànshì, yě kànshū."
      },
      {
        "zh": "九点半，他准备睡觉。",
        "vi": "Chín giờ rưỡi, cậu ấy chuẩn bị đi ngủ.",
        "py": "Jiǔ diǎn bàn, tā zhǔnbèi shuìjiào."
      },
      {
        "zh": "十点，他睡觉了。",
        "vi": "Mười giờ, cậu ấy đi ngủ rồi.",
        "py": "Shí diǎn, tā shuìjiào le."
      },
      {
        "zh": "他觉得这一天很好，也很高兴。",
        "vi": "Cậu ấy thấy ngày này rất đẹp, cũng rất vui.",
        "py": "Tā juéde zhè yì tiān hěn hǎo, yě hěn gāoxìng."
      },
      {
        "zh": "明天他还要早起，去学校学汉语。",
        "vi": "Mai cậu ấy còn phải dậy sớm, đi học tiếng Hán.",
        "py": "Míngtiān tā hái yào zǎo qǐ, qù xuéxiào xué Hànyǔ."
      }
    ],
    "vocab": [
      {
        "word": "中学生",
        "py": "zhōngxuéshēng",
        "vi": "học sinh trung học"
      },
      {
        "word": "起床",
        "py": "qǐchuáng",
        "vi": "thức dậy"
      },
      {
        "word": "牛奶",
        "py": "niúnǎi",
        "vi": "sữa bò"
      },
      {
        "word": "汽车",
        "py": "qìchē",
        "vi": "ô tô"
      },
      {
        "word": "认真",
        "py": "rènzhēn",
        "vi": "nghiêm túc, chăm chú"
      },
      {
        "word": "准备",
        "py": "zhǔnbèi",
        "vi": "chuẩn bị"
      },
      {
        "word": "睡觉",
        "py": "shuìjiào",
        "vi": "đi ngủ"
      },
      {
        "word": "电脑",
        "py": "diànnǎo",
        "vi": "máy tính"
      }
    ],
    "questions": [
      {
        "q": "小明早上几点起床？",
        "options": [
          "七点半",
          "六点半",
          "六点"
        ],
        "answer": 1,
        "qVi": "Tiểu Minh mấy giờ dậy vào buổi sáng?"
      },
      {
        "q": "他早上先喝什么？",
        "options": [
          "牛奶",
          "茶",
          "水"
        ],
        "answer": 0,
        "qVi": "Sáng cậu ấy uống gì trước?"
      },
      {
        "q": "他怎么去学校？",
        "options": [
          "走路",
          "坐火车",
          "坐汽车"
        ],
        "answer": 2,
        "qVi": "Cậu ấy đi học bằng cách nào?"
      },
      {
        "q": "下午他在学校和朋友做什么？",
        "options": [
          "打球",
          "看电影",
          "买东西"
        ],
        "answer": 0,
        "qVi": "Buổi chiều cậu ấy làm gì với bạn bè ở trường?"
      },
      {
        "q": "他晚上几点睡觉？",
        "options": [
          "九点半",
          "十点",
          "十点半"
        ],
        "answer": 1,
        "qVi": "Tối cậu ấy mấy giờ đi ngủ?"
      }
    ]
  },
  {
    "id": "hsk1-reading-3",
    "book": "hsk1",
    "lesson": "lesson-3",
    "title": "买东西",
    "titleVi": "Đi mua sắm",
    "sentences": [
      {
        "zh": "星期六，李娜和妈妈去商场买东西。",
        "vi": "Thứ bảy, Lý Na và mẹ đi trung tâm thương mại mua đồ.",
        "py": "Xīngqīliù, Lǐ Nà hé māma qù shāngchǎng mǎi dōngxi."
      },
      {
        "zh": "商场里人很多。",
        "vi": "Trong trung tâm thương mại có rất nhiều người.",
        "py": "Shāngchǎng li rén hěn duō."
      },
      {
        "zh": "李娜想买衣服。",
        "vi": "Lý Na muốn mua quần áo.",
        "py": "Lǐ Nà xiǎng mǎi yīfu."
      },
      {
        "zh": "她看到很多衣服，有大的，也有小的。",
        "vi": "Cô ấy thấy rất nhiều quần áo, có cái to, cũng có cái nhỏ.",
        "py": "Tā kàndào hěn duō yīfu, yǒu dà de, yě yǒu xiǎo de."
      },
      {
        "zh": "她问：\"这个多少钱？\"",
        "vi": "Cô ấy hỏi: \"Cái này bao nhiêu tiền?\"",
        "py": "Tā wèn: \"Zhège duōshao qián?\""
      },
      {
        "zh": "那个人说：\"一百块。\"",
        "vi": "Người đó nói: \"Một trăm tệ.\"",
        "py": "Nàge rén shuō: \"Yìbǎi kuài.\""
      },
      {
        "zh": "李娜觉得太贵了。",
        "vi": "Lý Na thấy quá đắt.",
        "py": "Lǐ Nà juéde tài guì le."
      },
      {
        "zh": "妈妈说：\"我们去那边看看吧。\"",
        "vi": "Mẹ nói: \"Chúng ta qua bên kia xem thử đi.\"",
        "py": "Māma shuō: \"Wǒmen qù nàbiān kànkan ba.\""
      },
      {
        "zh": "那边还有一个商店。",
        "vi": "Bên kia còn có một cửa hàng.",
        "py": "Nàbiān hái yǒu yí ge shāngdiàn."
      },
      {
        "zh": "那里的衣服不贵，也很好看。",
        "vi": "Quần áo ở đó không đắt, cũng rất đẹp.",
        "py": "Nàlǐ de yīfu bú guì, yě hěn hǎokàn."
      },
      {
        "zh": "那边的衣服八十块，不很贵。",
        "vi": "Quần áo bên đó tám mươi tệ, không đắt lắm.",
        "py": "Nàbiān de yīfu bāshí kuài, bù hěn guì."
      },
      {
        "zh": "李娜很高兴，马上穿上了。",
        "vi": "Lý Na rất vui, mặc vào ngay.",
        "py": "Lǐ Nà hěn gāoxìng, mǎshàng chuān shàng le."
      },
      {
        "zh": "妈妈也买了水果和牛奶。",
        "vi": "Mẹ cũng mua trái cây và sữa.",
        "py": "Māma yě mǎi le shuǐguǒ hé niúnǎi."
      },
      {
        "zh": "中午，她们在商场旁边吃饭。",
        "vi": "Buổi trưa, các cô ăn cơm cạnh trung tâm thương mại.",
        "py": "Zhōngwǔ, tāmen zài shāngchǎng pángbiān chīfàn."
      },
      {
        "zh": "她们吃了米饭和鸡蛋。",
        "vi": "Các cô ăn cơm và trứng.",
        "py": "Tāmen chī le mǐfàn hé jīdàn."
      },
      {
        "zh": "吃完饭，妈妈给李娜买了一个书包。",
        "vi": "Ăn cơm xong, mẹ mua cho Lý Na một chiếc cặp sách.",
        "py": "Chī wán fàn, māma gěi Lǐ Nà mǎi le yí ge shūbāo."
      },
      {
        "zh": "李娜说：\"谢谢妈妈！我很喜欢。\"",
        "vi": "Lý Na nói: \"Cảm ơn mẹ! Con rất thích.\"",
        "py": "Lǐ Nà shuō: \"Xièxie māma! Wǒ hěn xǐhuan.\""
      },
      {
        "zh": "下午，她们很高兴，一起回家了。",
        "vi": "Buổi chiều, các cô rất vui, cùng nhau về nhà.",
        "py": "Xiàwǔ, tāmen hěn gāoxìng, yìqǐ huí jiā le."
      }
    ],
    "vocab": [
      {
        "word": "商场",
        "py": "shāngchǎng",
        "vi": "trung tâm thương mại"
      },
      {
        "word": "东西",
        "py": "dōngxi",
        "vi": "đồ vật, đồ đạc"
      },
      {
        "word": "贵",
        "py": "guì",
        "vi": "đắt"
      },
      {
        "word": "块",
        "py": "kuài",
        "vi": "tệ (đơn vị tiền Trung Quốc)"
      },
      {
        "word": "水果",
        "py": "shuǐguǒ",
        "vi": "trái cây"
      },
      {
        "word": "书包",
        "py": "shūbāo",
        "vi": "cặp sách"
      },
      {
        "word": "穿上",
        "py": "chuān shàng",
        "vi": "mặc vào"
      }
    ],
    "questions": [
      {
        "q": "李娜和谁去买东西？",
        "options": [
          "和爸爸",
          "和同学",
          "和妈妈"
        ],
        "answer": 2,
        "qVi": "Lý Na đi mua sắm với ai?"
      },
      {
        "q": "第一件衣服多少钱？",
        "options": [
          "一百块",
          "八十块",
          "五十块"
        ],
        "answer": 0,
        "qVi": "Chiếc quần áo đầu tiên giá bao nhiêu?"
      },
      {
        "q": "李娜为什么不去第一个地方买？",
        "options": [
          "衣服太贵了",
          "衣服不好看",
          "没有衣服了"
        ],
        "answer": 0,
        "qVi": "Vì sao Lý Na không mua ở nơi đầu tiên?"
      },
      {
        "q": "妈妈还买了什么？",
        "options": [
          "鸡蛋和米饭",
          "水果和牛奶",
          "书包和水"
        ],
        "answer": 1,
        "qVi": "Mẹ còn mua thêm gì?"
      },
      {
        "q": "吃完饭，妈妈给李娜买了什么？",
        "options": [
          "一个书包",
          "一件衣服",
          "一些水果"
        ],
        "answer": 0,
        "qVi": "Ăn cơm xong, mẹ mua gì cho Lý Na?"
      }
    ]
  },
  {
    "id": "hsk2-reading-1",
    "book": "hsk2",
    "lesson": "lesson-1",
    "title": "第一次坐飞机",
    "titleVi": "Lần đầu tiên đi máy bay",
    "sentences": [
      {
        "zh": "王小红是北京的大学生。",
        "vi": "Vương Tiểu Hồng là sinh viên đại học ở Bắc Kinh.",
        "py": "Wáng Xiǎohóng shì Běijīng de dàxuéshēng."
      },
      {
        "zh": "今年假期，她要和同学一起去上海旅行。",
        "vi": "Kỳ nghỉ năm nay, cô ấy sẽ đi du lịch Thượng Hải cùng bạn học.",
        "py": "Jīnnián jiàqī, tā yào hé tóngxué yìqǐ qù Shànghǎi lǚxíng."
      },
      {
        "zh": "她们买了两张机票。",
        "vi": "Các cô mua hai vé máy bay.",
        "py": "Tāmen mǎi le liǎng zhāng jīpiào."
      },
      {
        "zh": "这是王小红第一次坐飞机。",
        "vi": "Đây là lần đầu tiên Vương Tiểu Hồng đi máy bay.",
        "py": "Zhè shì Wáng Xiǎohóng dì yí cì zuò fēijī."
      },
      {
        "zh": "早上六点，她来到机场。",
        "vi": "Sáu giờ sáng, cô ấy đến sân bay.",
        "py": "Zǎoshang liù diǎn, tā láidào jīchǎng."
      },
      {
        "zh": "机场里人很多，她们排队取票。",
        "vi": "Sân bay rất đông người, các cô xếp hàng lấy vé.",
        "py": "Jīchǎng li rén hěn duō, tāmen páiduì qǔ piào."
      },
      {
        "zh": "八点半，飞机要起飞了。",
        "vi": "Tám giờ rưỡi, máy bay sắp cất cánh.",
        "py": "Bā diǎn bàn, fēijī yào qǐfēi le."
      },
      {
        "zh": "王小红有点儿高兴，也有点儿怕。",
        "vi": "Vương Tiểu Hồng hơi vui, nhưng cũng hơi sợ.",
        "py": "Wáng Xiǎohóng yǒudiǎnr gāoxìng, yě yǒudiǎnr pà."
      },
      {
        "zh": "同学告诉她：\"别怕，坐飞机很安全。\"",
        "vi": "Bạn học nói với cô ấy: \"Đừng sợ, đi máy bay rất an toàn.\"",
        "py": "Tóngxué gàosu tā: \"Bié pà, zuò fēijī hěn ānquán.\""
      },
      {
        "zh": "她的座位很好，能看到白云。",
        "vi": "Chỗ ngồi của cô ấy rất đẹp, nhìn thấy được mây trắng.",
        "py": "Tā de zuòwèi hěn hǎo, néng kàndào báiyún."
      },
      {
        "zh": "天很蓝，云很白，真好看！",
        "vi": "Trời rất xanh, mây rất trắng, đẹp thật!",
        "py": "Tiān hěn lán, yún hěn bái, zhēn hǎokàn!"
      },
      {
        "zh": "两个小时以后，飞机到了上海。",
        "vi": "Hai tiếng sau, máy bay đến Thượng Hải.",
        "py": "Liǎng ge xiǎoshí yǐhòu, fēijī dàole Shànghǎi."
      },
      {
        "zh": "她们先到酒店放东西。",
        "vi": "Các cô trước đến khách sạn để đồ.",
        "py": "Tāmen xiān dào jiǔdiàn fàng dōngxi."
      },
      {
        "zh": "下午，她们去海边玩儿。",
        "vi": "Buổi chiều, các cô đi chơi ở biển.",
        "py": "Xiàwǔ, tāmen qù hǎibiān wánr."
      },
      {
        "zh": "上海非常漂亮，王小红照了很多照片。",
        "vi": "Thượng Hải rất đẹp, Vương Tiểu Hồng chụp rất nhiều ảnh.",
        "py": "Shànghǎi fēicháng piàoliang, Wáng Xiǎohóng zhào le hěn duō zhàopiàn."
      },
      {
        "zh": "她还给妈妈打了电话：\"妈妈，上海真好！\"",
        "vi": "Cô ấy còn gọi điện cho mẹ: \"Mẹ ơi, Thượng Hải đẹp thật!\"",
        "py": "Tā hái gěi māma dǎ le diànhuà: \"Māma, Shànghǎi zhēn hǎo!\""
      },
      {
        "zh": "妈妈说：\"玩得开心点儿。\"",
        "vi": "Mẹ nói: \"Con chơi cho vui nhé.\"",
        "py": "Māma shuō: \"Wán de kāixīn diǎnr.\""
      },
      {
        "zh": "一个星期以后，她们坐飞机回北京了。",
        "vi": "Một tuần sau, các cô đi máy bay về Bắc Kinh.",
        "py": "Yí ge xīngqī yǐhòu, tāmen zuò fēijī huí Běijīng le."
      },
      {
        "zh": "王小红觉得这次旅行很有意思。",
        "vi": "Vương Tiểu Hồng thấy chuyến đi này rất thú vị.",
        "py": "Wáng Xiǎohóng juéde zhè cì lǚxíng hěn yǒuyìsi."
      }
    ],
    "vocab": [
      {
        "word": "假期",
        "py": "jiàqī",
        "vi": "kỳ nghỉ, ngày nghỉ"
      },
      {
        "word": "旅行",
        "py": "lǚxíng",
        "vi": "du lịch"
      },
      {
        "word": "机场",
        "py": "jīchǎng",
        "vi": "sân bay"
      },
      {
        "word": "起飞",
        "py": "qǐfēi",
        "vi": "cất cánh"
      },
      {
        "word": "安全",
        "py": "ānquán",
        "vi": "an toàn"
      },
      {
        "word": "座位",
        "py": "zuòwèi",
        "vi": "chỗ ngồi"
      },
      {
        "word": "酒店",
        "py": "jiǔdiàn",
        "vi": "khách sạn"
      },
      {
        "word": "有意思",
        "py": "yǒuyìsi",
        "vi": "thú vị, có ý nghĩa"
      }
    ],
    "questions": [
      {
        "q": "王小红和同学要去哪里旅行？",
        "options": [
          "上海",
          "北京",
          "海边"
        ],
        "answer": 0,
        "qVi": "Vương Tiểu Hồng và bạn học đi du lịch ở đâu?"
      },
      {
        "q": "这是她第几次坐飞机？",
        "options": [
          "第二次",
          "第一次",
          "第三次"
        ],
        "answer": 1,
        "qVi": "Đây là lần thứ mấy cô ấy đi máy bay?"
      },
      {
        "q": "同学为什么让她别怕？",
        "options": [
          "因为飞机很大",
          "因为坐飞机很安全",
          "因为她坐过飞机"
        ],
        "answer": 1,
        "qVi": "Vì sao bạn học bảo cô ấy đừng sợ?"
      },
      {
        "q": "下午她们去哪里玩儿？",
        "options": [
          "商场",
          "酒店",
          "海边"
        ],
        "answer": 2,
        "qVi": "Buổi chiều các cô đi chơi ở đâu?"
      },
      {
        "q": "她们在上海待了多长时间？",
        "options": [
          "两天",
          "一个星期",
          "一个月"
        ],
        "answer": 1,
        "qVi": "Các cô ở Thượng Hải bao lâu?"
      }
    ]
  },
  {
    "id": "hsk2-reading-2",
    "book": "hsk2",
    "lesson": "lesson-2",
    "title": "我的周末",
    "titleVi": "Cuối tuần của tôi",
    "sentences": [
      {
        "zh": "我叫李文，今年上高中。",
        "vi": "Tôi tên là Lý Văn, năm nay học cấp ba.",
        "py": "Wǒ jiào Lǐ Wén, jīnnián shàng gāozhōng."
      },
      {
        "zh": "平时我要上课，很忙。",
        "vi": "Ngày thường tôi phải đi học, rất bận.",
        "py": "Píngshí wǒ yào shàngkè, hěn máng."
      },
      {
        "zh": "所以我很喜欢周末。",
        "vi": "Vì vậy tôi rất thích ngày cuối tuần.",
        "py": "Suǒyǐ wǒ hěn xǐhuan zhōumò."
      },
      {
        "zh": "星期六早上，我九点才起床。",
        "vi": "Sáng thứ bảy, tôi chín giờ mới dậy.",
        "py": "Xīngqīliù zǎoshang, wǒ jiǔ diǎn cái qǐchuáng."
      },
      {
        "zh": "起床以后，我吃点儿面包，喝一杯牛奶。",
        "vi": "Dậy xong, tôi ăn chút bánh mì, uống một cốc sữa.",
        "py": "Qǐchuáng yǐhòu, wǒ chī diǎnr miànbāo, hē yì bēi niúnǎi."
      },
      {
        "zh": "上午我在家写作业。",
        "vi": "Buổi sáng tôi ở nhà làm bài tập.",
        "py": "Shàngwǔ wǒ zài jiā xiě zuòyè."
      },
      {
        "zh": "写完作业，我打网球或者打篮球。",
        "vi": "Làm xong bài tập, tôi chơi tennis hoặc chơi bóng rổ.",
        "py": "Xiě wán zuòyè, wǒ dǎ wǎngqiú huòzhě dǎ lánqiú."
      },
      {
        "zh": "中午，妈妈做了好吃的饭。",
        "vi": "Buổi trưa, mẹ nấu cơm rất ngon.",
        "py": "Zhōngwǔ, māma zuò le hǎochī de fàn."
      },
      {
        "zh": "我们全家一起吃午饭，很开心。",
        "vi": "Cả nhà tôi cùng nhau ăn trưa, rất vui vẻ.",
        "py": "Wǒmen quán jiā yìqǐ chī wǔfàn, hěn kāixīn."
      },
      {
        "zh": "下午，我常常和同学去公园。",
        "vi": "Buổi chiều, tôi thường đi công viên với bạn học.",
        "py": "Xiàwǔ, wǒ chángcháng hé tóngxué qù gōngyuán."
      },
      {
        "zh": "公园里有很多花，还有小河。",
        "vi": "Trong công viên có rất nhiều hoa, còn có dòng sông nhỏ.",
        "py": "Gōngyuán li yǒu hěn duō huā, hái yǒu xiǎo hé."
      },
      {
        "zh": "我们坐在河边，说说学校里的事情。",
        "vi": "Chúng tôi ngồi bên sông, nói chuyện những việc ở trường.",
        "py": "Wǒmen zuò zài hé biān, shuōshuo xuéxiào li de shìqing."
      },
      {
        "zh": "晚上我在家看小说。",
        "vi": "Buổi tối tôi ở nhà đọc tiểu thuyết.",
        "py": "Wǎnshang wǒ zài jiā kàn xiǎoshuō."
      },
      {
        "zh": "我觉得看小说很有意思。",
        "vi": "Tôi thấy đọc tiểu thuyết rất thú vị.",
        "py": "Wǒ juéde kàn xiǎoshuō hěn yǒuyìsi."
      },
      {
        "zh": "星期天，我们全家去看爷爷和奶奶。",
        "vi": "Chủ nhật, cả nhà tôi đi thăm ông và bà.",
        "py": "Xīngqītiān, wǒmen quán jiā qù kàn yéye hé nǎinai."
      },
      {
        "zh": "奶奶给我们做了很多好吃的菜。",
        "vi": "Bà nấu cho chúng tôi rất nhiều món ngon.",
        "py": "Nǎinai gěi wǒmen zuò le hěn duō hǎochī de cài."
      },
      {
        "zh": "她还让我带回去一些鸡蛋。",
        "vi": "Bà còn cho tôi mang về mấy quả trứng gà.",
        "py": "Tā hái ràng wǒ dài huíqù yìxiē jīdàn."
      },
      {
        "zh": "晚上我准备下周的课。",
        "vi": "Buổi tối tôi chuẩn bị bài cho tuần sau.",
        "py": "Wǎnshang wǒ zhǔnbèi xià zhōu de kè."
      },
      {
        "zh": "我的周末虽然很简单，但是很快乐。",
        "vi": "Cuối tuần của tôi tuy rất đơn giản nhưng rất vui.",
        "py": "Wǒ de zhōumò suīrán hěn jiǎndān, dànshì hěn kuàilè."
      }
    ],
    "vocab": [
      {
        "word": "平时",
        "py": "píngshí",
        "vi": "ngày thường"
      },
      {
        "word": "周末",
        "py": "zhōumò",
        "vi": "cuối tuần"
      },
      {
        "word": "作业",
        "py": "zuòyè",
        "vi": "bài tập"
      },
      {
        "word": "或者",
        "py": "huòzhě",
        "vi": "hoặc"
      },
      {
        "word": "公园",
        "py": "gōngyuán",
        "vi": "công viên"
      },
      {
        "word": "事情",
        "py": "shìqing",
        "vi": "việc, chuyện"
      },
      {
        "word": "小说",
        "py": "xiǎoshuō",
        "vi": "tiểu thuyết"
      },
      {
        "word": "快乐",
        "py": "kuàilè",
        "vi": "vui vẻ, hạnh phúc"
      }
    ],
    "questions": [
      {
        "q": "李文是做什么的？",
        "options": [
          "高中生",
          "大学生",
          "老师"
        ],
        "answer": 0,
        "qVi": "Lý Văn làm nghề gì?"
      },
      {
        "q": "星期六早上他几点起床？",
        "options": [
          "六点",
          "九点",
          "八点"
        ],
        "answer": 1,
        "qVi": "Sáng thứ bảy cậu ấy mấy giờ dậy?"
      },
      {
        "q": "写完作业以后他做什么？",
        "options": [
          "看电视",
          "打球",
          "看小说"
        ],
        "answer": 1,
        "qVi": "Làm bài tập xong cậu ấy làm gì?"
      },
      {
        "q": "星期天全家去看谁？",
        "options": [
          "爷爷和奶奶",
          "外公和外婆",
          "舅舅"
        ],
        "answer": 0,
        "qVi": "Chủ nhật cả nhà đi thăm ai?"
      },
      {
        "q": "奶奶让李文带什么回去？",
        "options": [
          "一些菜",
          "一些水果",
          "一些鸡蛋"
        ],
        "answer": 2,
        "qVi": "Bà bảo Lý Văn mang gì về?"
      }
    ]
  },
  {
    "id": "hsk2-reading-3",
    "book": "hsk2",
    "lesson": "lesson-3",
    "title": "生病的一天",
    "titleVi": "Ngày bị bệnh",
    "sentences": [
      {
        "zh": "上周三的早上，我觉得不舒服。",
        "vi": "Sáng thứ tư tuần trước, tôi thấy không khỏe.",
        "py": "Shàng zhōusān de zǎoshang, wǒ juéde bù shūfu."
      },
      {
        "zh": "我的头很疼，也很难受。",
        "vi": "Đầu tôi rất đau, cũng rất khó chịu.",
        "py": "Wǒ de tóu hěn téng, yě hěn nánshòu."
      },
      {
        "zh": "妈妈说：\"你生病了，今天别去学校了。\"",
        "vi": "Mẹ nói: \"Con bị bệnh rồi, hôm nay đừng đi học nữa.\"",
        "py": "Māma shuō: \"Nǐ shēngbìng le, jīntiān bié qù xuéxiào le.\""
      },
      {
        "zh": "妈妈带我去了医院。",
        "vi": "Mẹ đưa tôi đến bệnh viện.",
        "py": "Māma dài wǒ qù le yīyuàn."
      },
      {
        "zh": "医院里人很多，我们先排队。",
        "vi": "Trong bệnh viện rất đông người, chúng tôi xếp hàng trước.",
        "py": "Yīyuàn li rén hěn duō, wǒmen xiān páiduì."
      },
      {
        "zh": "医生问我：\"你哪里不舒服？\"",
        "vi": "Bác sĩ hỏi tôi: \"Cậu thấy chỗ nào không khỏe?\"",
        "py": "Yīshēng wèn wǒ: \"Nǐ nǎlǐ bù shūfu?\""
      },
      {
        "zh": "我说：\"我头疼，还想睡觉。\"",
        "vi": "Tôi nói: \"Con đau đầu, còn buồn ngủ nữa.\"",
        "py": "Wǒ shuō: \"Wǒ tóuténg, hái xiǎng shuìjiào.\""
      },
      {
        "zh": "医生给我检查了一下儿。",
        "vi": "Bác sĩ khám cho tôi một chút.",
        "py": "Yīshēng gěi wǒ jiǎnchá le yíxiàr."
      },
      {
        "zh": "他说：\"吃点儿药就好了，不用怕。\"",
        "vi": "Ông ấy nói: \"Uống chút thuốc là khỏi, đừng lo.\"",
        "py": "Tā shuō: \"Chī diǎnr yào jiù hǎo le, bú yòng pà.\""
      },
      {
        "zh": "妈妈去药店买了药。",
        "vi": "Mẹ ra hiệu thuốc mua thuốc.",
        "py": "Māma qù yàodiàn mǎi le yào."
      },
      {
        "zh": "回家以后，我吃药，然后睡觉。",
        "vi": "Về nhà xong, tôi uống thuốc, sau đó đi ngủ.",
        "py": "Huí jiā yǐhòu, wǒ chī yào, ránhòu shuìjiào."
      },
      {
        "zh": "睡了一觉，我觉得好多了。",
        "vi": "Ngủ một giấc, tôi thấy đỡ nhiều rồi.",
        "py": "Shuì le yí jiào, wǒ juéde hǎo duō le."
      },
      {
        "zh": "妈妈给我做了鸡蛋和面条儿。",
        "vi": "Mẹ làm cho tôi trứng và mì.",
        "py": "Māma gěi wǒ zuò le jīdàn hé miàntiáor."
      },
      {
        "zh": "她说：\"多喝水，很快就好了。\"",
        "vi": "Bà ấy nói: \"Uống nhiều nước, sẽ nhanh khỏe thôi.\"",
        "py": "Tā shuō: \"Duō hē shuǐ, hěn kuài jiù hǎo le.\""
      },
      {
        "zh": "我在家里休息了两天。",
        "vi": "Tôi nghỉ ngơi ở nhà hai ngày.",
        "py": "Wǒ zài jiā li xiūxi le liǎng tiān."
      },
      {
        "zh": "妈妈一直照顾我。",
        "vi": "Mẹ luôn luôn chăm sóc tôi.",
        "py": "Māma yìzhí zhàogù wǒ."
      },
      {
        "zh": "我很感动，也很感谢妈妈。",
        "vi": "Tôi rất cảm động, cũng rất cảm ơn mẹ.",
        "py": "Wǒ hěn gǎndòng, yě hěn gǎnxiè māma."
      },
      {
        "zh": "星期五，我的病好了，又可以去学校了。",
        "vi": "Thứ sáu, bệnh của tôi khỏi rồi, lại có thể đi học được rồi.",
        "py": "Xīngqīwǔ, wǒ de bìng hǎo le, yòu kěyǐ qù xuéxiào le."
      },
      {
        "zh": "同学们看到我，都很高兴。",
        "vi": "Các bạn học thấy tôi đều rất vui.",
        "py": "Tóngxuémen kàndào wǒ, dōu hěn gāoxìng."
      },
      {
        "zh": "从那以后，我明白了：身体健康最重要。",
        "vi": "Từ đó, tôi hiểu rằng: sức khỏe là quan trọng nhất.",
        "py": "Cóng nà yǐhòu, wǒ míngbái le: shēntǐ jiànkāng zuì zhòngyào."
      }
    ],
    "vocab": [
      {
        "word": "舒服",
        "py": "shūfu",
        "vi": "dễ chịu, khỏe khoắn"
      },
      {
        "word": "头疼",
        "py": "tóuténg",
        "vi": "đau đầu"
      },
      {
        "word": "检查",
        "py": "jiǎnchá",
        "vi": "kiểm tra, khám bệnh"
      },
      {
        "word": "药",
        "py": "yào",
        "vi": "thuốc"
      },
      {
        "word": "照顾",
        "py": "zhàogù",
        "vi": "chăm sóc"
      },
      {
        "word": "感动",
        "py": "gǎndòng",
        "vi": "cảm động"
      },
      {
        "word": "感谢",
        "py": "gǎnxiè",
        "vi": "cảm ơn, biết ơn"
      },
      {
        "word": "健康",
        "py": "jiànkāng",
        "vi": "sức khỏe, khỏe mạnh"
      }
    ],
    "questions": [
      {
        "q": "那天早上\"我\"觉得怎么样？",
        "options": [
          "很不舒服",
          "非常高兴",
          "很累但是很好"
        ],
        "answer": 0,
        "qVi": "Sáng hôm đó \"tôi\" thấy thế nào?"
      },
      {
        "q": "谁带\"我\"去了医院？",
        "options": [
          "爸爸",
          "妈妈",
          "同学"
        ],
        "answer": 1,
        "qVi": "Ai đưa \"tôi\" đi bệnh viện?"
      },
      {
        "q": "医生说\"我\"应该怎么做？",
        "options": [
          "住院",
          "去学校",
          "吃点儿药"
        ],
        "answer": 2,
        "qVi": "Bác sĩ nói \"tôi\" nên làm gì?"
      },
      {
        "q": "\"我\"在家里休息了几天？",
        "options": [
          "两天",
          "一个星期",
          "三天"
        ],
        "answer": 0,
        "qVi": "\"Tôi\" nghỉ ngơi ở nhà mấy ngày?"
      },
      {
        "q": "\"我\"从这件事明白了什么？",
        "options": [
          "学习最重要",
          "身体健康最重要",
          "钱最重要"
        ],
        "answer": 1,
        "qVi": "Từ chuyện này \"tôi\" hiểu được điều gì?"
      }
    ]
  },
  {
    "id": "hsk3-reading-1",
    "book": "hsk3",
    "lesson": "lesson-1",
    "title": "搬家",
    "titleVi": "Chuyển nhà",
    "sentences": [
      {
        "zh": "上个月我们搬家了，新家在城市的北部。",
        "vi": "Tháng trước chúng tôi chuyển nhà, nhà mới ở phía bắc thành phố.",
        "py": "shàng gè yuè wǒmen bānjiā le, xīn jiā zài chéngshì de běibù."
      },
      {
        "zh": "新家比旧家大，一共有三个房间。",
        "vi": "Nhà mới rộng hơn nhà cũ, tổng cộng có ba phòng.",
        "py": "xīn jiā bǐ jiù jiā dà, yīgòng yǒu sān ge fángjiān."
      },
      {
        "zh": "我的房间朝南，白天非常亮。",
        "vi": "Phòng của tôi quay về hướng nam, ban ngày rất sáng.",
        "py": "wǒ de fángjiān cháo nán, báitiān fēicháng liàng."
      },
      {
        "zh": "妈妈在阳台上放了几盆漂亮的花。",
        "vi": "Mẹ đặt mấy chậu hoa đẹp trên ban công.",
        "py": "māma zài yángtái shàng fàng le jǐ pén piàoliang de huā."
      },
      {
        "zh": "房子旁边有一个超市，买东西很方便。",
        "vi": "Cạnh nhà có một siêu thị, mua đồ rất tiện.",
        "py": "fángzi pángbiān yǒu yī ge chāoshì, mǎi dōngxi hěn fāngbiàn."
      },
      {
        "zh": "爸爸说这里的环境比以前好多了。",
        "vi": "Bố nói môi trường ở đây tốt hơn trước nhiều.",
        "py": "bàba shuō zhèlǐ de huánjìng bǐ yǐqián hǎo duō le."
      },
      {
        "zh": "周末我们请朋友来家里吃饭。",
        "vi": "Cuối tuần chúng tôi mời bạn bè đến nhà ăn cơm.",
        "py": "zhōumò wǒmen qǐng péngyou lái jiālǐ chīfàn."
      },
      {
        "zh": "妈妈做了白菜和鱼，大家都说好吃。",
        "vi": "Mẹ làm cải trắng và cá, ai cũng nói ngon.",
        "py": "māma zuò le báicài hé yú, dàjiā dōu shuō hǎochī."
      },
      {
        "zh": "饭后我帮妈妈洗碗，然后打扫房间。",
        "vi": "Sau bữa ăn tôi giúp mẹ rửa bát, rồi quét dọn phòng.",
        "py": "fàn hòu wǒ bāng māma xǐ wǎn, ránhòu dǎsǎo fángjiān."
      },
      {
        "zh": "弟弟把他的书都放进书柜里。",
        "vi": "Em trai xếp hết sách của cậu vào tủ sách.",
        "py": "dìdi bǎ tā de shū dōu fàng jìn shūguì lǐ."
      },
      {
        "zh": "晚上我们一起看电视，聊了很多。",
        "vi": "Tối đó cả nhà cùng xem tivi, nói chuyện rất nhiều.",
        "py": "wǎnshang wǒmen yīqǐ kàn diànshì, liáo le hěnduō."
      },
      {
        "zh": "朋友走的时候说下个月还要再来。",
        "vi": "Khi về, bạn nói tháng sau còn đến nữa.",
        "py": "péngyou zǒu de shíhou shuō xià gè yuè hái yào zài lái."
      },
      {
        "zh": "我觉得搬新家是件快乐的事。",
        "vi": "Tôi thấy chuyển nhà mới là một chuyện vui.",
        "py": "wǒ juéde bān xīn jiā shì jiàn kuàilè de shì."
      }
    ],
    "vocab": [
      {
        "word": "搬家",
        "py": "bānjiā",
        "vi": "chuyển nhà"
      },
      {
        "word": "环境",
        "py": "huánjìng",
        "vi": "môi trường"
      },
      {
        "word": "超市",
        "py": "chāoshì",
        "vi": "siêu thị"
      },
      {
        "word": "方便",
        "py": "fāngbiàn",
        "vi": "tiện lợi"
      },
      {
        "word": "房间",
        "py": "fángjiān",
        "vi": "phòng"
      },
      {
        "word": "以前",
        "py": "yǐqián",
        "vi": "trước đây"
      },
      {
        "word": "快乐",
        "py": "kuàilè",
        "vi": "vui vẻ, hạnh phúc"
      }
    ],
    "questions": [
      {
        "q": "新家有几个房间？",
        "options": [
          "三个",
          "四个",
          "两个"
        ],
        "answer": 0,
        "qVi": "Nhà mới có mấy phòng?"
      },
      {
        "q": "为什么在哪儿买东西都很方便？",
        "options": [
          "因为房子旁边有超市",
          "因为爸爸有汽车",
          "因为超市二十四小时开门"
        ],
        "answer": 0,
        "qVi": "Vì sao mua đồ ở đâu cũng tiện?"
      },
      {
        "q": "饭后\"我\"做了什么？",
        "options": [
          "看了电视",
          "帮妈妈洗碗、打扫房间",
          "去超市买东西"
        ],
        "answer": 1,
        "qVi": "Sau bữa ăn \"tôi\" đã làm gì?"
      }
    ]
  },
  {
    "id": "hsk3-reading-2",
    "book": "hsk3",
    "lesson": "lesson-2",
    "title": "篮球比赛",
    "titleVi": "Trận đấu bóng rổ",
    "sentences": [
      {
        "zh": "星期六我们班和三班有一场篮球比赛。",
        "vi": "Thứ bảy lớp chúng tôi có một trận bóng rổ với lớp ba.",
        "py": "xīngqīliù wǒmen bān hé sān bān yǒu yī chǎng lánqiú bǐsài."
      },
      {
        "zh": "老师把比赛安排在上午九点。",
        "vi": "Thầy sắp xếp trận đấu vào lúc chín giờ sáng.",
        "py": "lǎoshī bǎ bǐsài ānpái zài shàngwǔ jiǔ diǎn."
      },
      {
        "zh": "比赛的地方是学校的体育馆。",
        "vi": "Nơi thi đấu là nhà thi đấu của trường.",
        "py": "bǐsài de dìfang shì xuéxiào de tǐyùguǎn."
      },
      {
        "zh": "我们每天下午都练习一个小时。",
        "vi": "Chiều nào chúng tôi cũng tập một tiếng.",
        "py": "wǒmen měitiān xiàwǔ dōu liànxí yī ge xiǎoshí."
      },
      {
        "zh": "队长让大家注意传球，不要太着急。",
        "vi": "Đội trưởng bảo mọi người chú ý chuyền bóng, đừng vội vàng.",
        "py": "duìzhǎng ràng dàjiā zhùyì chuánqiú, bùyào tài zháojí."
      },
      {
        "zh": "上半场我们落后了三分，大家有点儿紧张。",
        "vi": "Hiệp một chúng tôi bị dẫn trước ba điểm, mọi người hơi căng thẳng.",
        "py": "shàng bàn chǎng wǒmen luòhòu le sān fēn, dàjiā yǒudiǎnr jǐnzhāng."
      },
      {
        "zh": "中间休息的时候，老师给我们讲了新的办法。",
        "vi": "Trong giờ nghỉ, Trong giờ nghỉ, thầy cho chúng tôi biết cách chơi mới.",
        "py": "zhōngjiān xiūxi de shíhou, lǎoshī gěi wǒmen jiǎng le xīn de bànfǎ."
      },
      {
        "zh": "下半场我们互相配合，慢慢追了回来。",
        "vi": "Hiệp hai chúng tôi phối hợp với nhau, từ từ đuổi kịp.",
        "py": "xià bàn chǎng wǒmen hùxiāng pèihé, mànmàn zhuī le huílái."
      },
      {
        "zh": "最后我们赢了，同学们都非常高兴。",
        "vi": "Cuối cùng chúng tôi thắng, các bạn học sinh đều rất vui.",
        "py": "zuìhòu wǒmen yíng le, tóngxuémen dōu fēicháng gāoxìng."
      },
      {
        "zh": "队长说赢不重要，重要的是大家一起努力。",
        "vi": "Đội trưởng nói thắng không quan trọng, quan trọng là cùng nhau cố gắng.",
        "py": "duìzhǎng shuō yíng bù zhòngyào, zhòngyào de shì dàjiā yīqǐ nǔlì."
      },
      {
        "zh": "晚上我们去吃面条，庆祝这次胜利。",
        "vi": "Tối đó chúng tôi đi ăn mì, ăn mừng chiến thắng lần này.",
        "py": "wǎnshang wǒmen qù chī miàntiáo, qìngzhù zhè cì shènglì."
      },
      {
        "zh": "我觉得这场比赛让我学会了合作。",
        "vi": "Tôi thấy trận đấu này giúp tôi học được cách hợp tác.",
        "py": "wǒ juéde zhè chǎng bǐsài ràng wǒ xuéhuì le hézuò."
      },
      {
        "zh": "下个月还有一场比赛，我们会继续练习。",
        "vi": "Tháng sau còn một trận nữa, chúng tôi sẽ tiếp tục luyện tập.",
        "py": "xià gè yuè hái yǒu yī chǎng bǐsài, wǒmen huì jìxù liànxí."
      }
    ],
    "vocab": [
      {
        "word": "比赛",
        "py": "bǐsài",
        "vi": "thi đấu, trận đấu"
      },
      {
        "word": "安排",
        "py": "ānpái",
        "vi": "sắp xếp"
      },
      {
        "word": "紧张",
        "py": "jǐnzhāng",
        "vi": "căng thẳng"
      },
      {
        "word": "配合",
        "py": "pèihé",
        "vi": "phối hợp"
      },
      {
        "word": "庆祝",
        "py": "qìngzhù",
        "vi": "chúc mừng, ăn mừng"
      },
      {
        "word": "合作",
        "py": "hézuò",
        "vi": "hợp tác"
      },
      {
        "word": "继续",
        "py": "jìxù",
        "vi": "tiếp tục"
      }
    ],
    "questions": [
      {
        "q": "比赛安排在什么时间？",
        "options": [
          "星期六上午九点",
          "星期六下午三点",
          "星期日上午九点"
        ],
        "answer": 0,
        "qVi": "Trận đấu được sắp xếp vào lúc nào?"
      },
      {
        "q": "上半场我们班怎么样？",
        "options": [
          "赢了三分",
          "落后了三分",
          "和对方一样"
        ],
        "answer": 1,
        "qVi": "Hiệp một lớp chúng tôi thế nào?"
      },
      {
        "q": "队长认为什么最重要？",
        "options": [
          "赢球",
          "一起努力",
          "多练习传球"
        ],
        "answer": 1,
        "qVi": "Đội trưởng cho rằng điều gì quan trọng nhất?"
      }
    ]
  },
  {
    "id": "hsk3-reading-3",
    "book": "hsk3",
    "lesson": "lesson-3",
    "title": "生病",
    "titleVi": "Bị ốm",
    "sentences": [
      {
        "zh": "上星期我感冒了，头疼，还一直咳嗽。",
        "vi": "Tuần trước tôi bị cảm, đau đầu, còn ho mãi không ngừng.",
        "py": "shàng xīngqī wǒ gǎnmào le, tóuténg, hái yīzhí késou."
      },
      {
        "zh": "妈妈马上带我去了附近的医院。",
        "vi": "Mẹ lập tức đưa tôi đến bệnh viện gần đó.",
        "py": "māma mǎshàng dài wǒ qù le fùjìn de yīyuàn."
      },
      {
        "zh": "医生问我哪里不舒服，我说嗓子很疼。",
        "vi": "Bác sĩ hỏi tôi chỗ nào không khỏe, tôi nói họng rất đau.",
        "py": "yīshēng wèn wǒ nǎlǐ bù shūfu, wǒ shuō sǎngzi hěn téng."
      },
      {
        "zh": "他给我量了体温，有一点儿高。",
        "vi": "Ông ấy đo nhiệt độ cho tôi, hơi cao một chút.",
        "py": "tā gěi wǒ liáng le tǐwēn, yǒu yīdiǎnr gāo."
      },
      {
        "zh": "医生说不用打针，吃药就可以。",
        "vi": "Bác sĩ nói không cần tiêm, uống thuốc là được.",
        "py": "yīshēng shuō bùyòng dǎzhēn, chī yào jiù kěyǐ."
      },
      {
        "zh": "他让我多喝水，这几天要好好休息。",
        "vi": "Ông ấy dặn tôi uống nhiều nước, mấy ngày này phải nghỉ ngơi cho tốt.",
        "py": "tā ràng wǒ duō hē shuǐ, zhè jǐ tiān yào hǎohǎo xiūxi."
      },
      {
        "zh": "这种药一天吃三次，每次吃两片。",
        "vi": "Loại thuốc này một ngày uống ba lần, mỗi lần hai viên.",
        "py": "zhè zhǒng yào yī tiān chī sān cì, měi cì chī liǎng piàn."
      },
      {
        "zh": "妈妈每天给我做粥，还买来水果。",
        "vi": "Mẹ mỗi ngày nấu cháo cho tôi, còn mua cả trái cây.",
        "py": "māma měitiān gěi wǒ zuò zhōu, hái mǎi lái shuǐguǒ."
      },
      {
        "zh": "我在家休息了三天，没有去上课。",
        "vi": "Tôi nghỉ ở nhà ba ngày, không đi học.",
        "py": "wǒ zài jiā xiūxi le sān tiān, méiyǒu qù shàng kè."
      },
      {
        "zh": "同学们给我发消息，问我的身体怎么样。",
        "vi": "Các bạn cùng lớp nhắn tin hỏi thăm sức khỏe của tôi.",
        "py": "tóngxuémen gěi wǒ fā xiāoxi, wèn wǒ de shēntǐ zěnmeyàng."
      },
      {
        "zh": "星期四我的病好了，又能去上学了。",
        "vi": "Thứ năm bệnh của tôi khỏi, lại có thể đi học được rồi.",
        "py": "xīngqīsì wǒ de bìng hǎo le, yòu néng qù shàngxué le."
      },
      {
        "zh": "医生说春天天气变化大，要小心感冒。",
        "vi": "Bác sĩ nói mùa xuân thời tiết thay đổi nhiều, phải cẩn thận tránh cảm.",
        "py": "yīshēng shuō chūntiān tiānqì biànhuà dà, yào xiǎoxīn gǎnmào."
      },
      {
        "zh": "以后我要多运动，让身体更健康。",
        "vi": "Sau này tôi sẽ vận động nhiều hơn để cơ thể khỏe mạnh hơn.",
        "py": "yǐhòu wǒ yào duō yùndòng, ràng shēntǐ gèng jiànkāng."
      }
    ],
    "vocab": [
      {
        "word": "感冒",
        "py": "gǎnmào",
        "vi": "bị cảm, cảm lạnh"
      },
      {
        "word": "医生",
        "py": "yīshēng",
        "vi": "bác sĩ"
      },
      {
        "word": "医院",
        "py": "yīyuàn",
        "vi": "bệnh viện"
      },
      {
        "word": "休息",
        "py": "xiūxi",
        "vi": "nghỉ ngơi"
      },
      {
        "word": "变化",
        "py": "biànhuà",
        "vi": "thay đổi"
      },
      {
        "word": "健康",
        "py": "jiànkāng",
        "vi": "khỏe mạnh"
      },
      {
        "word": "运动",
        "py": "yùndòng",
        "vi": "vận động, thể dục"
      }
    ],
    "questions": [
      {
        "q": "\"我\"为什么去了医院？",
        "options": [
          "因为头疼、咳嗽",
          "因为要陪妈妈",
          "因为要打针"
        ],
        "answer": 0,
        "qVi": "Vì sao \"tôi\" đi bệnh viện?"
      },
      {
        "q": "医生说药怎么吃？",
        "options": [
          "一天两次，每次一片",
          "一天三次，每次两片",
          "一天三次，每次一片"
        ],
        "answer": 1,
        "qVi": "Bác sĩ dặn uống thuốc thế nào?"
      },
      {
        "q": "\"我\"以后打算怎么做？",
        "options": [
          "多喝水",
          "好好休息",
          "多运动"
        ],
        "answer": 2,
        "qVi": "Sau này \"tôi\" định làm gì?"
      }
    ]
  },
  {
    "id": "hsk4-reading-1",
    "book": "hsk4",
    "lesson": "lesson-1",
    "title": "找工作",
    "titleVi": "Tìm việc",
    "sentences": [
      {
        "zh": "大学毕业以后，我开始认真地找工作。",
        "vi": "Sau khi tốt nghiệp đại học, tôi bắt đầu nghiêm túc tìm việc.",
        "py": "dàxué bìyè yǐhòu, wǒ kāishǐ rènzhēn de zhǎo gōngzuò."
      },
      {
        "zh": "我在网上看到一家公司的招聘信息。",
        "vi": "Tôi thấy trên mạng thông tin tuyển dụng của một công ty.",
        "py": "wǒ zài wǎngshàng kàndào yī jiā gōngsī de zhāopìn xìnxī."
      },
      {
        "zh": "那家公司想招一名翻译，我马上发了简历。",
        "vi": "Công ty đó muốn tuyển một phiên dịch, tôi lập tức gửi sơ yếu lý lịch.",
        "py": "nà jiā gōngsī xiǎng zhāo yī míng fānyì, wǒ mǎshàng fā le jiǎnlì."
      },
      {
        "zh": "星期三上午，我去公司参加了面试。",
        "vi": "Sáng thứ tư, tôi đến công ty tham gia phỏng vấn.",
        "py": "xīngqīsān shàngwǔ, wǒ qù gōngsī cānjiā le miànshì."
      },
      {
        "zh": "面试官先让我做了一个简单的自我介绍。",
        "vi": "Người phỏng vấn trước tiên cho tôi giới thiệu bản thân ngắn gọn.",
        "py": "miànshìguān xiān ràng wǒ zuò le yī ge jiǎndān de zìwǒ jièshào."
      },
      {
        "zh": "我说我大学学的是中文，还做过两年翻译。",
        "vi": "Tôi nói tôi học tiếng Trung ở đại học, còn làm phiên dịch hai năm.",
        "py": "wǒ shuō wǒ dàxué xué de shì zhōngwén, hái zuò guo liǎng nián fānyì."
      },
      {
        "zh": "面试官问我为什么想做这份工作。",
        "vi": "Người phỏng vấn hỏi tôi vì sao muốn làm công việc này.",
        "py": "miànshìguān wèn wǒ wèishénme xiǎng zuò zhè fèn gōngzuò."
      },
      {
        "zh": "我说我一直在努力提高自己的水平。",
        "vi": "Tôi nói tôi luôn nỗ lực nâng cao trình độ của mình.",
        "py": "wǒ shuō wǒ yīzhí zài nǔlì tígāo zìjǐ de shuǐpíng."
      },
      {
        "zh": "他还问，如果顾客不满意，我会怎么办。",
        "vi": "Ông ấy còn hỏi, nếu khách hàng không hài lòng thì tôi sẽ làm sao.",
        "py": "tā hái wèn, rúguǒ gùkè bù mǎnyì, wǒ huì zěnme bàn."
      },
      {
        "zh": "我说我会先听清楚对方的意见，再想办法解决。",
        "vi": "Tôi nói tôi sẽ trước tiên lắng nghe rõ ý kiến của đối phương, rồi tìm cách giải quyết.",
        "py": "wǒ shuō wǒ huì xiān tīng qīngchu duìfāng de yìjiàn, zài xiǎng bànfǎ jiějué."
      },
      {
        "zh": "面试进行了半个小时，气氛还算轻松。",
        "vi": "Cuộc phỏng vấn kéo dài nửa tiếng, không khí khá thoải mái.",
        "py": "miànshì jìnxíng le bàn ge xiǎoshí, qìfēn hái suàn qīngsōng."
      },
      {
        "zh": "两天以后，我收到了被录用的消息。",
        "vi": "Hai ngày sau, tôi nhận được tin được nhận vào làm.",
        "py": "liǎng tiān yǐhòu, wǒ shōudào le bèi lùyòng de xiāoxi."
      },
      {
        "zh": "我把这件事告诉了父母，他们非常高兴。",
        "vi": "Tôi kể chuyện này cho bố mẹ, họ đều rất vui.",
        "py": "wǒ bǎ zhè jiàn shì gàosu le fùmǔ, tāmen fēicháng gāoxìng."
      },
      {
        "zh": "我决定好好干，不放过这次难得的机会。",
        "vi": "Tôi quyết định làm việc thật tốt, không bỏ lỡ cơ hội hiếm có lần này.",
        "py": "wǒ juédìng hǎohǎo gàn, bù fàngguò zhè cì nándé de jīhuì."
      }
    ],
    "vocab": [
      {
        "word": "毕业",
        "py": "bìyè",
        "vi": "tốt nghiệp"
      },
      {
        "word": "简历",
        "py": "jiǎnlì",
        "vi": "sơ yếu lý lịch"
      },
      {
        "word": "面试",
        "py": "miànshì",
        "vi": "phỏng vấn"
      },
      {
        "word": "翻译",
        "py": "fānyì",
        "vi": "phiên dịch; phiên dịch viên"
      },
      {
        "word": "介绍",
        "py": "jièshào",
        "vi": "giới thiệu"
      },
      {
        "word": "意见",
        "py": "yìjiàn",
        "vi": "ý kiến"
      },
      {
        "word": "决定",
        "py": "juédìng",
        "vi": "quyết định"
      },
      {
        "word": "机会",
        "py": "jīhuì",
        "vi": "cơ hội"
      }
    ],
    "questions": [
      {
        "q": "那家公司想招什么人？",
        "options": [
          "翻译",
          "经理",
          "秘书"
        ],
        "answer": 0,
        "qVi": "Công ty đó muốn tuyển người làm gì?"
      },
      {
        "q": "顾客不满意的时候，\"我\"会先做什么？",
        "options": [
          "找经理帮助",
          "听清楚对方的意见",
          "向顾客道歉"
        ],
        "answer": 1,
        "qVi": "Khi khách hàng không hài lòng, \"tôi\" sẽ làm gì trước?"
      },
      {
        "q": "\"我\"对这份工作的态度是什么？",
        "options": [
          "先干几天看看",
          "好好干，不放过机会",
          "不太感兴趣"
        ],
        "answer": 1,
        "qVi": "Thái độ của \"tôi\" đối với công việc này là gì?"
      }
    ]
  },
  {
    "id": "hsk4-reading-2",
    "book": "hsk4",
    "lesson": "lesson-2",
    "title": "网上购物",
    "titleVi": "Mua sắm trên mạng",
    "sentences": [
      {
        "zh": "这几年，网上购物变得越来越普遍。",
        "vi": "Vài năm gần đây, mua sắm trên mạng ngày càng phổ biến.",
        "py": "zhè jǐ nián, wǎngshàng gòuwù biàn de yuèláiyuè pǔbiàn."
      },
      {
        "zh": "人们只要用手机下订单，东西就会送到家里。",
        "vi": "Người ta chỉ cần đặt hàng bằng điện thoại, đồ sẽ được giao đến nhà.",
        "py": "rénmen zhǐyào yòng shǒujī xià dìngdān, dōngxi jiù huì sòngdào jiālǐ."
      },
      {
        "zh": "不管是衣服、食品还是日用品，都能在网上买到。",
        "vi": "Dù là quần áo, thực phẩm hay đồ dùng hằng ngày, đều có thể mua trên mạng.",
        "py": "bùguǎn shì yīfu, shípǐn háishì rìyòngpǐn, dōu néng zài wǎngshàng mǎidào."
      },
      {
        "zh": "我妈妈以前喜欢逛百货商店，现在也常常网上购物。",
        "vi": "Mẹ tôi trước thích đi các cửa hàng bách hóa, giờ cũng thường mua sắm online.",
        "py": "wǒ māma yǐqián xǐhuan guàng bǎihuò shāngdiàn, xiànzài yě chángcháng wǎngshàng gòuwù."
      },
      {
        "zh": "她说网上的东西便宜，还可以比较几家再决定。",
        "vi": "Bà nói đồ trên mạng rẻ, còn có thể so sánh vài nơi rồi mới quyết định.",
        "py": "tā shuō wǎngshàng de dōngxi piányi, hái kěyǐ bǐjiào jǐ jiā zài juédìng."
      },
      {
        "zh": "不过，网上购物也有一些问题。",
        "vi": "Tuy nhiên, mua sắm online cũng có một số vấn đề.",
        "py": "búguò, wǎngshàng gòuwù yě yǒu yīxiē wèntí."
      },
      {
        "zh": "有时候收到的货物和照片上的不一样。",
        "vi": "Đôi khi hàng nhận được khác với hình trong ảnh.",
        "py": "yǒushíhou shōudào de huòwù hé zhàopiàn shàng de bù yīyàng."
      },
      {
        "zh": "遇到这种情况，买家可以联系商家退货。",
        "vi": "Gặp trường hợp này, người mua có thể liên hệ người bán để trả lại hàng.",
        "py": "yùdào zhè zhǒng qíngkuàng, mǎijiā kěyǐ liánxì shāngjiā tuìhuò."
      },
      {
        "zh": "另外，快递太多也会造成污染。",
        "vi": "Ngoài ra, quá nhiều bưu kiện cũng gây ra ô nhiễm.",
        "py": "lìngwài, kuàidì tài duō yě huì zàochéng wūrǎn."
      },
      {
        "zh": "很多人建议少用塑料袋，一起保护环境。",
        "vi": "Nhiều người khuyên ít dùng túi ni lông, cùng nhau bảo vệ môi trường.",
        "py": "hěn duō rén jiànyì shǎo yòng sùliàodài, yīqǐ bǎohù huánjìng."
      },
      {
        "zh": "我觉得网上购物确实方便，但不能乱花钱。",
        "vi": "Tôi thấy mua sắm online quả thật tiện, nhưng không được tiêu tiền tùy tiện.",
        "py": "wǒ juéde wǎngshàng gòuwù quèshí fāngbiàn, dàn bùnéng luàn huā qián."
      },
      {
        "zh": "买东西之前，最好先看看别人的评价。",
        "vi": "Trước khi mua đồ, tốt nhất nên xem đánh giá của người khác.",
        "py": "mǎi dōngxi zhīqián, zuìhǎo xiān kànkan biérén de píngjià."
      },
      {
        "zh": "合理消费，我们的生活才会更好。",
        "vi": "Tiêu dùng hợp lý, cuộc sống của chúng ta mới tốt hơn.",
        "py": "hélǐ xiāofèi, wǒmen de shēnghuó cái huì gèng hǎo."
      }
    ],
    "vocab": [
      {
        "word": "普遍",
        "py": "pǔbiàn",
        "vi": "phổ biến"
      },
      {
        "word": "百货",
        "py": "bǎihuò",
        "vi": "hàng bách hóa"
      },
      {
        "word": "比较",
        "py": "bǐjiào",
        "vi": "so sánh; khá, tương đối"
      },
      {
        "word": "网络",
        "py": "wǎngluò",
        "vi": "mạng, mạng internet"
      },
      {
        "word": "保护",
        "py": "bǎohù",
        "vi": "bảo vệ"
      },
      {
        "word": "建议",
        "py": "jiànyì",
        "vi": "đề nghị, khuyên"
      },
      {
        "word": "评价",
        "py": "píngjià",
        "vi": "đánh giá"
      },
      {
        "word": "消费",
        "py": "xiāofèi",
        "vi": "tiêu dùng, tiêu phí"
      }
    ],
    "questions": [
      {
        "q": "妈妈为什么也常常网上购物？",
        "options": [
          "因为商店太远",
          "因为网上东西便宜，还能比较",
          "因为网上没有假货"
        ],
        "answer": 1,
        "qVi": "Vì sao mẹ tôi cũng thường mua sắm trên mạng?"
      },
      {
        "q": "收到和照片不一样的货物怎么办？",
        "options": [
          "只能自己用",
          "联系商家退货",
          "在网上骂商家"
        ],
        "answer": 1,
        "qVi": "Nhận được hàng khác với hình trong ảnh thì phải làm sao?"
      },
      {
        "q": "作者认为网上购物应该注意什么？",
        "options": [
          "不能乱花钱",
          "只买贵的",
          "每天都买东西"
        ],
        "answer": 0,
        "qVi": "Theo tác giả, mua sắm trên mạng nên chú ý điều gì?"
      }
    ]
  },
  {
    "id": "hsk4-reading-3",
    "book": "hsk4",
    "lesson": "lesson-3",
    "title": "团队合作",
    "titleVi": "Hợp tác trong nhóm",
    "sentences": [
      {
        "zh": "今年我在公司负责一个新的项目。",
        "vi": "Năm nay tôi phụ trách một dự án mới ở công ty.",
        "py": "jīnnián wǒ zài gōngsī fùzé yī ge xīn de xiàngmù."
      },
      {
        "zh": "这个项目时间紧，任务重，需要五个人一起做。",
        "vi": "Dự án này thời gian gấp, nhiệm vụ nặng, cần năm người cùng làm.",
        "py": "zhè ge xiàngmù shíjiān jǐn, rènwu zhòng, xūyào wǔ ge rén yīqǐ zuò."
      },
      {
        "zh": "刚开始的时候，大家的意见不太一样。",
        "vi": "Lúc mới bắt đầu, ý kiến của mọi người không thống nhất.",
        "py": "gāng kāishǐ de shíhou, dàjiā de yìjiàn bù tài yīyàng."
      },
      {
        "zh": "有人觉得应该先做调查，有人想直接开始设计。",
        "vi": "Người thì cho rằng nên khảo sát trước, người thì muốn thiết kế luôn.",
        "py": "yǒu rén juéde yīnggāi xiān zuò diàochá, yǒu rén xiǎng zhíjiē kāishǐ shèjì."
      },
      {
        "zh": "我们开了三次会，最后决定先了解客户的需要。",
        "vi": "Chúng tôi họp ba lần, cuối cùng quyết định tìm hiểu nhu cầu của khách hàng trước.",
        "py": "wǒmen kāi le sān cì huì, zuìhòu juédìng xiān liǎojiě kèhù de xūyào."
      },
      {
        "zh": "团队里的每个人工作都很努力。",
        "vi": "Mỗi người trong nhóm đều làm việc rất nỗ lực.",
        "py": "tuánduì lǐ de měi ge rén gōngzuò dōu hěn nǔlì."
      },
      {
        "zh": "遇到困难的时候，我们互相帮助，互相鼓励。",
        "vi": "Khi gặp khó khăn, chúng tôi giúp đỡ và động viên lẫn nhau.",
        "py": "yùdào kùnnán de shíhou, wǒmen hùxiāng bāngzhù, hùxiāng gǔlì."
      },
      {
        "zh": "小王负责写报告，小李负责联系客户。",
        "vi": "Tiểu Vương phụ trách viết báo cáo, Tiểu Lý phụ trách liên hệ khách hàng.",
        "py": "xiǎo wáng fùzé xiě bàogào, xiǎo lǐ fùzé liánxì kèhù."
      },
      {
        "zh": "我每天记录工作的进度，发现问题马上解决。",
        "vi": "Tôi mỗi ngày ghi lại tiến độ công việc, phát hiện vấn đề thì giải quyết ngay.",
        "py": "wǒ měitiān jìlù gōngzuò de jìndù, fāxiàn wèntí mǎshàng jiějué."
      },
      {
        "zh": "有一次客户突然改变要求，大家只好重新做。",
        "vi": "Có lần khách hàng đột nhiên thay đổi yêu cầu, cả nhóm đành phải làm lại.",
        "py": "yǒu yī cì kèhù tūrán gǎibiàn yāoqiú, dàjiā zhǐhǎo chóngxīn zuò."
      },
      {
        "zh": "虽然辛苦，但是没有人抱怨，也没有人放弃。",
        "vi": "Tuy vất vả, nhưng không ai than phiền, cũng không ai bỏ cuộc.",
        "py": "suīrán xīnkǔ, dànshì méiyǒu rén bào yuàn, yě méiyǒu rén fàngqì."
      },
      {
        "zh": "三个星期以后，我们按时完成了项目。",
        "vi": "Ba tuần sau, chúng tôi hoàn thành dự án đúng thời hạn.",
        "py": "sān ge xīngqī yǐhòu, wǒmen ànshí wánchéng le xiàngmù."
      },
      {
        "zh": "客户对结果非常满意，还说要和我们长期合作。",
        "vi": "Khách hàng rất hài lòng với kết quả, còn nói muốn hợp tác lâu dài với chúng tôi.",
        "py": "kèhù duì jiéguǒ fēicháng mǎnyì, hái shuō yào hé wǒmen chángqī hézuò."
      },
      {
        "zh": "这件事让我明白，成功离不开团队的合作。",
        "vi": "Chuyện này khiến tôi hiểu rằng, thành công không thể thiếu sự hợp tác của cả nhóm.",
        "py": "zhè jiàn shì ràng wǒ míngbai, chénggōng líbùkāi tuánduì de hézuò."
      }
    ],
    "vocab": [
      {
        "word": "项目",
        "py": "xiàngmù",
        "vi": "dự án"
      },
      {
        "word": "负责",
        "py": "fùzé",
        "vi": "phụ trách, chịu trách nhiệm"
      },
      {
        "word": "调查",
        "py": "diàochá",
        "vi": "điều tra, khảo sát"
      },
      {
        "word": "报告",
        "py": "bàogào",
        "vi": "báo cáo"
      },
      {
        "word": "记录",
        "py": "jìlù",
        "vi": "ghi chép, ghi lại"
      },
      {
        "word": "按时",
        "py": "ànshí",
        "vi": "đúng giờ, đúng hạn"
      },
      {
        "word": "满意",
        "py": "mǎnyì",
        "vi": "hài lòng"
      },
      {
        "word": "合作",
        "py": "hézuò",
        "vi": "hợp tác"
      }
    ],
    "questions": [
      {
        "q": "团队最后决定先做什么？",
        "options": [
          "直接开始设计",
          "了解客户的需要",
          "开五次会"
        ],
        "answer": 1,
        "qVi": "Cuối cùng nhóm quyết định làm gì trước?"
      },
      {
        "q": "客户突然改变要求以后，大家怎么样？",
        "options": [
          "有人放弃了",
          "抱怨了很多",
          "只好重新做"
        ],
        "answer": 2,
        "qVi": "Sau khi khách hàng đột nhiên thay đổi yêu cầu, mọi người thế nào?"
      },
      {
        "q": "作者从这件事中明白了什么？",
        "options": [
          "成功离不开合作",
          "开会没有用",
          "工作很辛苦"
        ],
        "answer": 0,
        "qVi": "Tác giả hiểu được điều gì từ chuyện này?"
      }
    ]
  },
  {
    "id": "hsk5-reading-1",
    "book": "hsk5",
    "lesson": "lesson-1",
    "title": "茶文化",
    "titleVi": "Văn hóa trà",
    "sentences": [
      {
        "zh": "中国人喝茶已经有几千年的历史了。",
        "vi": "Người Trung Quốc uống trà đã có lịch sử vài nghìn năm.",
        "py": "zhōngguó rén hē chá yǐjīng yǒu jǐ qiān nián de lìshǐ le."
      },
      {
        "zh": "对中国人来说，茶不仅仅是一种饮料，更是一种文化。",
        "vi": "Đối với người Trung Quốc, trà không chỉ là một loại thức uống, mà còn là một nền văn hóa.",
        "py": "duì zhōngguó rén lái shuō, chá bùjǐnjǐn shì yī zhǒng yǐnliào, gèng shì yī zhǒng wénhuà."
      },
      {
        "zh": "传统的中国茶分为绿茶、红茶、乌龙茶等很多种类。",
        "vi": "Trà Trung Quốc truyền thống chia thành trà xanh, trà đỏ, trà ô long v.v. nhiều loại.",
        "py": "chuántǒng de zhōngguó chá fēn wéi lǜchá, hóngchá, wūlóngchá děng hěn duō zhǒnglèi."
      },
      {
        "zh": "不同地区出产的茶叶，味道和香气也各不相同。",
        "vi": "Trà sản xuất ở các vùng khác nhau, hương vị cũng khác nhau.",
        "py": "bùtóng dìqū chūchǎn de cháyè, wèidào hé xiāngqì yě gè bù xiāngtóng."
      },
      {
        "zh": "南方人喜欢喝绿茶，非常讲究茶叶的新鲜。",
        "vi": "Người miền nam thích uống trà xanh, rất chú trọng độ tươi của trà.",
        "py": "nánfāng rén xǐhuan hē lǜchá, fēicháng jiǎngjiu cháyè de xīnxiān."
      },
      {
        "zh": "北方人则更喜欢香味浓的花茶。",
        "vi": "Người miền bắc lại thích trà hoa có hương đậm hơn.",
        "py": "běifāng rén zé gèng xǐhuan xiāngwèi nóng de huāchá."
      },
      {
        "zh": "泡茶也是一门学问，水温和时间都会影响茶的味道。",
        "vi": "Pha trà cũng là một môn học, nhiệt độ nước và thời gian đều ảnh hưởng đến vị trà.",
        "py": "pào chá yě shì yī mén xuéwen, shuǐwēn hé shíjiān dōu huì yǐngxiǎng chá de wèidào."
      },
      {
        "zh": "老年人常说，喝茶可以让人安静下来。",
        "vi": "Người già thường nói, uống trà có thể khiến người ta bình tĩnh lại.",
        "py": "lǎonián rén cháng shuō, hē chá kěyǐ ràng rén ānjìng xiàlái."
      },
      {
        "zh": "现在，越来越多的年轻人对茶文化产生了兴趣。",
        "vi": "Hiện nay, ngày càng nhiều bạn trẻ có hứng thú với văn hóa trà.",
        "py": "xiànzài, yuèláiyuè duō de niánqīng rén duì chá wénhuà chǎnshēng le xìngqù."
      },
      {
        "zh": "城市里出现了不少有特色的茶馆，生意相当不错。",
        "vi": "Ở thành phố xuất hiện không ít quán trà có đặc sắc, việc làm ăn khá tốt.",
        "py": "chéngshì lǐ chūxiàn le bù shǎo yǒu tèsè de cháguǎn, shēngyì xiāngdāng bùcuò."
      },
      {
        "zh": "周末约上几位朋友，在茶馆里聊聊天，是一种享受。",
        "vi": "Cuối tuần hẹn vài người bạn, ngồi trò chuyện trong quán trà, là một sự hưởng thụ.",
        "py": "zhōumò yuē shàng jǐ wèi péngyou, zài cháguǎn lǐ liáo liáo tiān, shì yī zhǒng xiǎngshòu."
      },
      {
        "zh": "有人认为，喝咖啡代表现代，喝茶代表传统。",
        "vi": "Có người cho rằng, uống cà phê đại diện cho hiện đại, uống trà đại diện cho truyền thống.",
        "py": "yǒu rén rènwéi, hē kāfēi dàibiǎo xiàndài, hē chá dàibiǎo chuántǒng."
      },
      {
        "zh": "但我觉得，两者完全可以同时存在。",
        "vi": "Nhưng tôi nghĩ, hai thứ này hoàn toàn có thể cùng tồn tại.",
        "py": "dàn wǒ juéde, liǎng zhě wánquán kěyǐ tóngshí cúnzài."
      },
      {
        "zh": "传统的文化只有融进现代生活，才能真正流传下去。",
        "vi": "Văn hóa truyền thống chỉ có hòa vào cuộc sống hiện đại, mới có thể thực sự được lưu truyền.",
        "py": "chuántǒng de wénhuà zhǐyǒu róng jìn xiàndài shēnghuó, cái néng zhēnzhèng liúchuán xiàqù."
      }
    ],
    "vocab": [
      {
        "word": "传统",
        "py": "chuántǒng",
        "vi": "truyền thống"
      },
      {
        "word": "饮料",
        "py": "yǐnliào",
        "vi": "thức uống"
      },
      {
        "word": "讲究",
        "py": "jiǎngjiu",
        "vi": "chú trọng, cầu kỳ"
      },
      {
        "word": "学问",
        "py": "xuéwen",
        "vi": "học vấn, kiến thức"
      },
      {
        "word": "兴趣",
        "py": "xìngqù",
        "vi": "hứng thú, sở thích"
      },
      {
        "word": "特色",
        "py": "tèsè",
        "vi": "đặc sắc"
      },
      {
        "word": "享受",
        "py": "xiǎngshòu",
        "vi": "hưởng thụ"
      },
      {
        "word": "流传",
        "py": "liúchuán",
        "vi": "lưu truyền"
      }
    ],
    "questions": [
      {
        "q": "对中国人来说，茶是什么？",
        "options": [
          "只是一种饮料",
          "一种饮料，也是一种文化",
          "一种药"
        ],
        "answer": 1,
        "qVi": "Đối với người Trung Quốc, trà là gì?"
      },
      {
        "q": "北方人更喜欢什么茶？",
        "options": [
          "香味浓的花茶",
          "新鲜的绿茶",
          "苦的红茶"
        ],
        "answer": 0,
        "qVi": "Người miền bắc thích loại trà nào hơn?"
      },
      {
        "q": "作者认为传统文化怎样才能流传下去？",
        "options": [
          "靠老年人保护",
          "不和现代生活混合",
          "融进现代生活"
        ],
        "answer": 2,
        "qVi": "Theo tác giả, văn hóa truyền thống phải thế nào mới được lưu truyền?"
      }
    ]
  },
  {
    "id": "hsk5-reading-2",
    "book": "hsk5",
    "lesson": "lesson-2",
    "title": "谈谈读书",
    "titleVi": "Nói về việc đọc sách",
    "sentences": [
      {
        "zh": "现在很多人习惯用手机看新闻、看小说，读书的人似乎越来越少。",
        "vi": "Hiện nay nhiều người quen dùng điện thoại xem tin tức, xem tiểu thuyết, người đọc sách có vẻ ngày càng ít.",
        "py": "xiànzài hěn duō rén xíguàn yòng shǒujī kàn xīnwén, kàn xiǎoshuō, dú shū de rén sìhū yuèláiyuè shǎo."
      },
      {
        "zh": "有人说，纸质书早晚会被电子书代替。",
        "vi": "Có người nói, sách giấy sớm muộn sẽ bị sách điện tử thay thế.",
        "py": "yǒu rén shuō, zhǐzhì shū zǎowǎn huì bèi diànzǐshū dàitì."
      },
      {
        "zh": "但我认为，两种阅读方式各有优点，谁也代替不了谁。",
        "vi": "Nhưng tôi cho rằng, hai cách đọc này mỗi cái có ưu điểm riêng, cái nào cũng không thay thế được cái nào.",
        "py": "dàn wǒ rènwéi, liǎng zhǒng yuèdú fāngshì gè yǒu yōudiǎn, shéi yě dàitì bù liǎo shéi."
      },
      {
        "zh": "电子书方便携带，价格也往往更便宜。",
        "vi": "Sách điện tử tiện mang theo, giá cũng thường rẻ hơn.",
        "py": "diànzǐshū fāngbiàn xiédài, jiàgé yě wǎngwǎng gèng piányi."
      },
      {
        "zh": "而读纸质书更容易让人静下心来，体验也更深刻。",
        "vi": "Còn đọc sách giấy dễ khiến người ta tĩnh tâm hơn, trải nghiệm cũng sâu sắc hơn.",
        "py": "ér dú zhǐzhì shū gèng róngyì ràng rén jìng xià xīn lái, tǐyàn yě gèng shēnkè."
      },
      {
        "zh": "我认识一位老教授，他家里收藏了几千本书。",
        "vi": "Tôi quen một giáo sư già, nhà ông ấy sưu tầm vài nghìn cuốn sách.",
        "py": "wǒ rènshi yī wèi lǎo jiàoshòu, tā jiā lǐ shōucáng le jǐ qiān běn shū."
      },
      {
        "zh": "他说，读书不能只为了考试，更是为了思考。",
        "vi": "Ông nói, đọc sách không thể chỉ vì thi cử, mà quan trọng hơn là để tư duy.",
        "py": "tā shuō, dú shū bù néng zhǐ wèile kǎoshì, gèng shì wèile sīkǎo."
      },
      {
        "zh": "一本好书就像一位好朋友，会影响你一辈子。",
        "vi": "Một cuốn sách hay giống như một người bạn tốt, sẽ ảnh hưởng đến bạn cả đời.",
        "py": "yī běn hǎo shū jiù xiàng yī wèi hǎo péngyou, huì yǐngxiǎng nǐ yībèizi."
      },
      {
        "zh": "当然，读什么书也很重要，要选择对自己有帮助的。",
        "vi": "Tất nhiên, đọc sách gì cũng rất quan trọng, phải chọn sách có lợi cho mình.",
        "py": "dāngrán, dú shénme shū yě hěn zhòngyào, yào xuǎnzé duì zìjǐ yǒu bāngzhù de."
      },
      {
        "zh": "现在不少城市开设了二十四小时图书馆，鼓励市民多读书。",
        "vi": "Hiện nay không ít thành phố mở thư viện hai mươi bốn giờ, khuyến khích dân chúng đọc sách nhiều hơn.",
        "py": "xiànzài bù shǎo chéngshì kāishè le èrshísì xiǎoshí túshūguǎn, gǔlì shìmín duō dú shū."
      },
      {
        "zh": "图书馆里的气氛，能让人的心态自然而然地安静下来。",
        "vi": "Không khí trong thư viện có thể khiến tâm trạng người ta tự nhiên bình tĩnh lại.",
        "py": "túshūguǎn lǐ de qìfēn, néng ràng rén de xīntài zìrán ér rán de ānjìng xiàlái."
      },
      {
        "zh": "我建议每个星期至少抽出一个小时，关掉手机，认真读点书。",
        "vi": "Tôi đề nghị mỗi tuần ít nhất dành ra một tiếng, tắt điện thoại, nghiêm túc đọc chút sách.",
        "py": "wǒ jiànyì měi ge xīngqī zhìshǎo chōuchū yī ge xiǎoshí, guān diào shǒujī, rènzhēn dú diǎn shū."
      },
      {
        "zh": "长期坚持下来，你会发现自己的视野宽了，想法也成熟了。",
        "vi": "Kiên trì lâu dài, bạn sẽ phát hiện tầm nhìn của mình rộng hơn, suy nghĩ cũng chín chắn hơn.",
        "py": "chángqī jiānchí xiàlái, nǐ huì fāxiàn zìjǐ de shìyě kuān le, xiǎngfǎ yě chéngshú le."
      },
      {
        "zh": "读书是一种习惯，更是一种生活态度。",
        "vi": "Đọc sách là một thói quen, mà quan trọng hơn là một thái độ sống.",
        "py": "dú shū shì yī zhǒng xíguàn, gèng shì yī zhǒng shēnghuó tàidù."
      }
    ],
    "vocab": [
      {
        "word": "习惯",
        "py": "xíguàn",
        "vi": "thói quen; quen"
      },
      {
        "word": "代替",
        "py": "dàitì",
        "vi": "thay thế"
      },
      {
        "word": "优点",
        "py": "yōudiǎn",
        "vi": "ưu điểm"
      },
      {
        "word": "体验",
        "py": "tǐyàn",
        "vi": "trải nghiệm"
      },
      {
        "word": "深刻",
        "py": "shēnkè",
        "vi": "sâu sắc"
      },
      {
        "word": "图书馆",
        "py": "túshūguǎn",
        "vi": "thư viện"
      },
      {
        "word": "坚持",
        "py": "jiānchí",
        "vi": "kiên trì"
      },
      {
        "word": "态度",
        "py": "tàidù",
        "vi": "thái độ"
      }
    ],
    "questions": [
      {
        "q": "作者怎样看电子书和纸质书？",
        "options": [
          "电子书会完全代替纸质书",
          "两种方式各有优点",
          "纸质书没有优点"
        ],
        "answer": 1,
        "qVi": "Tác giả nhìn nhận sách điện tử và sách giấy thế nào?"
      },
      {
        "q": "老教授认为读书是为了什么？",
        "options": [
          "只为了考试",
          "为了思考",
          "为了收藏书"
        ],
        "answer": 1,
        "qVi": "Giáo sư già cho rằng đọc sách là để làm gì?"
      },
      {
        "q": "作者建议大家每星期做什么？",
        "options": [
          "买一本书",
          "去一次图书馆",
          "抽一个小时认真读书"
        ],
        "answer": 2,
        "qVi": "Tác giả khuyên mỗi tuần nên làm gì?"
      }
    ]
  },
  {
    "id": "hsk5-reading-3",
    "book": "hsk5",
    "lesson": "lesson-3",
    "title": "春节",
    "titleVi": "Tết Nguyên Đán",
    "sentences": [
      {
        "zh": "春节是中国最重要的传统节日。",
        "vi": "Tết Nguyên Đán là ngày lễ truyền thống quan trọng nhất của Trung Quốc.",
        "py": "chūnjié shì zhōngguó zuì zhòngyào de chuántǒng jiérì."
      },
      {
        "zh": "每年春节前，家家户户都忙着买年货、打扫房子。",
        "vi": "Mỗi năm trước Tết, nhà nào cũng bận rộn mua đồ Tết, dọn dẹp nhà cửa.",
        "py": "měi nián chūnjié qián, jiājiāhùhù dōu mángzhe mǎi niánhuò, dǎsǎo fángzi."
      },
      {
        "zh": "在外地工作的人也纷纷赶回家，和家人团聚。",
        "vi": "Những người làm việc ở xa cũng nối nhau vội về nhà, đoàn tụ với gia đình.",
        "py": "zài wàidì gōngzuò de rén yě fēnfēn gǎn huí jiā, hé jiārén tuánjù."
      },
      {
        "zh": "除夕那天晚上，全家人一起吃年夜饭，气氛特别热闹。",
        "vi": "Tối giao thừa, cả gia đình cùng ăn bữa cơm tất niên, không khí đặc biệt náo nhiệt.",
        "py": "chúxī nà tiān wǎnshang, quán jiā rén yīqǐ chī niányèfàn, qìfēn tèbié rènao."
      },
      {
        "zh": "北方人习惯吃饺子，南方人则常吃年糕。",
        "vi": "Người miền bắc quen ăn sủi cảo, người miền nam thường ăn bánh chưng năm.",
        "py": "běifāng rén xíguàn chī jiǎozi, nánfāng rén zé cháng chī niángāo."
      },
      {
        "zh": "吃完饭，大家一边看节目，一边聊天，一直到半夜。",
        "vi": "Ăn cơm xong, mọi người vừa xem chương trình vừa nói chuyện, cho đến nửa đêm.",
        "py": "chī wán fàn, dàjiā yībiān kàn jiémù, yībiān liáotiān, yīzhí dào bànyè."
      },
      {
        "zh": "大年初一，孩子们给长辈拜年，还能收到红包。",
        "vi": "Mùng một Tết, các cháu chúc Tết người lớn, còn nhận được bao lì xì.",
        "py": "dà nián chūyī, háizimen gěi zhǎngbèi bàinián, hái néng shōudào hóngbāo."
      },
      {
        "zh": "很多地方还会放鞭炮，据说这样可以赶走坏运气。",
        "vi": "Nhiều nơi còn đốt pháo, theo như lời kể thì làm vậy có thể xua đuổi vận xui.",
        "py": "hěn duō dìfang hái huì fàng biānpào, jùshuō zhèyàng kěyǐ gǎnzǒu huài yùnqì."
      },
      {
        "zh": "近年来，为了保护环境，不少城市禁止放鞭炮。",
        "vi": "Những năm gần đây, để bảo vệ môi trường, không ít thành phố cấm đốt pháo.",
        "py": "jìnnián lái, wèile bǎohù huánjìng, bù shǎo chéngshì jìnzhǐ fàng biānpào."
      },
      {
        "zh": "有些人觉得这样少了节日气氛，有些人则表示理解。",
        "vi": "Có người thấy vậy làm mất bớt không khí lễ hội, có người lại tỏ ra thông cảm.",
        "py": "yǒuxiē rén juéde zhèyàng shǎo le jiérì qìfēn, yǒuxiē rén zé biǎoshì lǐjiě."
      },
      {
        "zh": "我认为，节日的核心是亲情，形式可以慢慢变化。",
        "vi": "Tôi cho rằng, cốt lõi của lễ Tết là tình thân, hình thức có thể dần thay đổi.",
        "py": "wǒ rènwéi, jiérì de héxīn shì qīnqíng, xíngshì kěyǐ mànmàn biànhuà."
      },
      {
        "zh": "比如现在流行用手机发红包、视频拜年，同样能表达心意。",
        "vi": "Chẳng hạn nay thịnh hành gửi lì xì bằng điện thoại, chúc Tết qua video, vẫn thể hiện được tấm lòng.",
        "py": "bǐrú xiànzài liúxíng yòng shǒujī fā hóngbāo, shìpín bàinián, tóngyàng néng biǎodá xīnyì."
      },
      {
        "zh": "春节让人们暂时放下工作，回到家庭，这本身就是它的意义。",
        "vi": "Tết khiến mọi người tạm thời gác lại công việc, trở về với gia đình, điều đó tự nó đã là ý nghĩa của Tết.",
        "py": "chūnjié ràng rénmen zànshí fàngxià gōngzuò, huídào jiātíng, zhè běnshēn jiù shì tā de yìyì."
      },
      {
        "zh": "无论时代怎么变，团圆永远是中国人心里最深的感情。",
        "vi": "Dù thời đại thay đổi thế nào, đoàn viên mãi mãi là tình cảm sâu nhất trong lòng người Trung Quốc.",
        "py": "wúlùn shídài zěnme biàn, tuányuán yǒngyuǎn shì zhōngguó rén xīnlǐ zuì shēn de gǎnqíng."
      }
    ],
    "vocab": [
      {
        "word": "节日",
        "py": "jiérì",
        "vi": "ngày lễ, ngày hội"
      },
      {
        "word": "热闹",
        "py": "rènao",
        "vi": "náo nhiệt"
      },
      {
        "word": "饺子",
        "py": "jiǎozi",
        "vi": "sủi cảo, bánh chẻo"
      },
      {
        "word": "红包",
        "py": "hóngbāo",
        "vi": "bao lì xì"
      },
      {
        "word": "禁止",
        "py": "jìnzhǐ",
        "vi": "cấm chỉ, cấm"
      },
      {
        "word": "意义",
        "py": "yìyì",
        "vi": "ý nghĩa"
      },
      {
        "word": "表达",
        "py": "biǎodá",
        "vi": "biểu đạt, bày tỏ"
      },
      {
        "word": "感情",
        "py": "gǎnqíng",
        "vi": "tình cảm"
      }
    ],
    "questions": [
      {
        "q": "为什么不少城市禁止放鞭炮？",
        "options": [
          "因为鞭炮太贵",
          "为了保护环境",
          "因为大家不喜欢"
        ],
        "answer": 1,
        "qVi": "Vì sao không ít thành phố cấm đốt pháo?"
      },
      {
        "q": "作者认为节日的核心是什么？",
        "options": [
          "吃年夜饭",
          "收红包",
          "亲情"
        ],
        "answer": 2,
        "qVi": "Tác giả cho rằng cốt lõi của ngày lễ là gì?"
      },
      {
        "q": "用手机发红包、视频拜年能表达心意吗？",
        "options": [
          "作者认为同样能",
          "完全不能",
          "文章没有提到"
        ],
        "answer": 0,
        "qVi": "Gửi lì xì bằng điện thoại, chúc Tết qua video có thể thể hiện tấm lòng không?"
      }
    ]
  }
];
