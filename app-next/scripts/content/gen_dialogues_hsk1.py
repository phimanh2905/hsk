#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate HSK1 dialogues (27 lessons) -> scripts/content/out/dialogues-raw-hsk1.json"""
import json

D = []

def dlg(idx, title, titleVi, lines):
    obj = {"id": f"hsk1/lesson-{idx}", "book": "hsk1", "lesson": f"lesson-{idx}",
           "title": title, "titleVi": titleVi, "lines": []}
    for i, (zh, py, vi) in enumerate(lines, 1):
        obj["lines"].append({"n": i, "speaker": "A" if i % 2 == 1 else "B",
                             "zh": zh, "pinyin": py, "vi": vi})
    D.append(obj)

# Lesson 1 – Chào hỏi & xưng hô
dlg(1, "你好", "Chào hỏi & xưng hô", [
    ("你好！", "Nǐ hǎo!", "Chào bạn!"),
    ("你好！请问，你叫什么名字？", "Nǐ hǎo! Qǐngwèn, nǐ jiào shénme míngzi?", "Chào bạn! Cho hỏi, bạn tên là gì?"),
    ("我叫王小美。你呢？", "Wǒ jiào Wáng Xiǎoměi. Nǐ ne?", "Tôi gọi là Vương Tiểu Mỹ. Còn bạn?"),
    ("我叫李大伟。这位是王先生。", "Wǒ jiào Lǐ Dàwěi. Zhè wèi shì Wáng xiānsheng.", "Tôi tên Lý Đại Vỹ. Vị này là ông Vương."),
    ("王先生，你好！", "Wáng xiānsheng, nǐ hǎo!", "Chào ông Vương!"),
    ("你好，你好！请进，请坐。", "Nǐ hǎo, nǐ hǎo! Qǐng jìn, qǐng zuò.", "Chào chào! Mời vào, mời ngồi."),
    ("谢谢！她们是谁？", "Xièxie! Tāmen shì shéi?", "Cảm ơn! Họ là ai vậy?"),
    ("她们是我的朋友们。小姐，你好吗？", "Tāmen shì wǒ de péngyǒumen. Xiǎojiě, nǐ hǎo ma?", "Họ là bạn của tôi. Cô gái, bạn khỏe không?"),
    ("我很好，谢谢。对不起，我要走了。", "Wǒ hěn hǎo, xièxie. Duìbuqǐ, wǒ yào zǒu le.", "Tôi khỏe, cảm ơn. Xin lỗi, tôi phải đi rồi."),
    ("没关系。再见！", "Méi guānxi. Zàijiàn!", "Không sao đâu. Tạm biệt!"),
    ("再见！明天见。", "Zàijiàn! Míngtiān jiàn.", "Tạm biệt! Hẹn gặp ngày mai."),
])

# Lesson 2 – 介绍 & từ để hỏi
dlg(2, "介绍", "Giới thiệu & từ để hỏi", [
    ("老师，您好！这是我的朋友。", "Lǎoshī, nín hǎo! Zhè shì wǒ de péngyǒu.", "Thưa thầy, chào thầy! Đây là bạn của em."),
    ("你好！请你介绍一下。", "Nǐ hǎo! Qǐng nǐ jièshào yíxià.", "Chào em! Em hãy giới thiệu nhé."),
    ("他叫马克，他是外国人。", "Tā jiào Mǎkè, tā shì wàiguórén.", "Anh ấy tên Mã Khắc, anh ấy là người nước ngoài."),
    ("你好，马克！你是哪国人？", "Nǐ hǎo, Mǎkè! Nǐ shì nǎ guó rén?", "Chào Mã Khắc! Bạn là người nước nào?"),
    ("我是美国人。这是哪儿？", "Wǒ shì Měiguórén. Zhè shì nǎr?", "Tôi là người Mỹ. Đây là đâu vậy?"),
    ("这里是我们学校，那边是图书馆。", "Zhèlǐ shì wǒmen xuéxiào, nàbiān shì túshūguǎn.", "Đây là trường của chúng tôi, kia là thư viện."),
    ("谁在那边？他们在这里做什么？", "Shéi zài nàbiān? Tāmen zài zhèlǐ zuò shénme?", "Ai ở đằng kia vậy? Họ đang làm gì ở đây?"),
    ("那边是我的同学们，他们在这儿学习汉语。", "Nàbiān shì wǒ de tóngxuémen, tāmen zài zhèr xuéxí Hànyǔ.", "Kia là các bạn cùng lớp của tôi, họ đang học tiếng Trung ở đây."),
    ("哪些人也是学生？", "Nǎxiē rén yě shì xuésheng?", "Những ai cũng là học sinh vậy?"),
    ("这些都是学生。你不要开玩笑，快去认识他们！", "Zhèxiē dōu shì xuésheng. Nǐ búyào kāi wánxiào, kuài qù rènshi tāmen!", "Tất cả những người này đều là học sinh. Đừng đùa nữa, mau đi làm quen với họ đi!"),
    ("好，我现在就过去。", "Hǎo, wǒ xiànzài jiù guòqù.", "Được, tôi sẽ qua đó ngay bây giờ."),
])

# Lesson 3 – Gia đình
dlg(3, "家人", "Gia đình", [
    ("请进！这是我的家。", "Qǐng jìn! Zhè shì wǒ de jiā.", "Mời vào! Đây là nhà của tôi."),
    ("谢谢！你的家人都在家里吗？", "Xièxie! Nǐ de jiārén dōu zài jiālǐ ma?", "Cảm ơn! Gia đình bạn có ai ở nhà hết không?"),
    ("他们在客厅。这是我爸爸和妈妈。", "Tāmen zài kètīng. Zhè shì wǒ bàba hé māma.", "Họ ở phòng khách. Đây là bố và mẹ của tôi."),
    ("叔叔阿姨好！这几位是谁？", "Shūshu āyí hǎo! Zhè jǐ wèi shì shéi?", "Chào chú và dì! Mấy người này là ai vậy?"),
    ("这是我哥哥，这是我姐姐，那是我妹妹。", "Zhè shì wǒ gēge, zhè shì wǒ jiějie, nà shì wǒ mèimei.", "Đây là anh trai tôi, đây là chị gái tôi, còn kia là em gái tôi."),
    ("你的爷爷和奶奶呢？", "Nǐ de yéye hé nǎinai ne?", "Ông và bà của bạn đâu?"),
    ("他们不在，他们去儿子家了。", "Tāmen bú zài, tāmen qù érzi jiā le.", "Họ không ở đây, họ đi nhà con trai rồi."),
    ("你有儿子吗？", "Nǐ yǒu érzi ma?", "Bạn có con trai không?"),
    ("没有儿子，我有一个女儿。", "Méiyǒu érzi, wǒ yǒu yí ge nǚ'ér.", "Không có con trai, tôi có một con gái."),
    ("她真可爱！你女儿几岁了？", "Tā zhēn kě'ài! Nǐ nǚ'ér jǐ suì le?", "Cô bé đáng yêu thật! Con gái bạn mấy tuổi rồi?"),
    ("她五岁了。来，我们喝茶吧。", "Tā wǔ suì le. Lái, wǒmen hē chá ba.", "Nó năm tuổi rồi. Nào, mình uống trà đi."),
])

# Lesson 4 – 生日 & 朋友
dlg(4, "生日", "Sinh nhật & bạn bè", [
    ("今天是我的生日！", "Jīntiān shì wǒ de shēngrì!", "Hôm nay là sinh nhật của tôi!"),
    ("真的吗？生日快乐！", "Zhēn de ma? Shēngrì kuàilè!", "Thật sao? Chúc mừng sinh nhật!"),
    ("谢谢！我请了很多朋友。", "Xièxie! Wǒ qǐng le hěn duō péngyǒu.", "Cảm ơn! Tôi mời rất nhiều bạn bè."),
    ("有小朋友吗？我的孩子想去。", "Yǒu xiǎopéngyǒu ma? Wǒ de háizi xiǎng qù.", "Có trẻ con không? Con của tôi muốn đi."),
    ("有，他们都是我的小同学。", "Yǒu, tāmen dōu shì wǒ de xiǎo tóngxué.", "Có, các bạn ấy đều là bạn học nhỏ của tôi."),
    ("你们班的男生多还是女生多？", "Nǐmen bān de nánshēng duō háishì nǚshēng duō?", "Lớp của bạn nam nhiều hay nữ nhiều?"),
    ("男生多，女生只有四个。", "Nánshēng duō, nǚshēng zhǐyǒu sì ge.", "Nam nhiều hơn, nữ chỉ có bốn bạn."),
    ("我女儿也是你的同学吗？", "Wǒ nǚ'ér yě shì nǐ de tóngxué ma?", "Con gái tôi cũng là bạn cùng lớp của bạn à?"),
    ("是，她是我的好朋友，我们都喜欢她。", "Shì, tā shì wǒ de hǎo péngyǒu, wǒmen dōu xǐhuan tā.", "Vâng, bạn ấy là bạn thân của tôi, ai cũng thích bạn ấy."),
    ("太好了！现在我们去看她吧。", "Tài hǎo le! Xiànzài wǒmen qù kàn tā ba.", "Tốt quá! Bây giờ chúng ta đi thăm cô bé nhé."),
])

# Lesson 5 – Số & mua sắm
dlg(5, "多少钱", "Số & lượng từ", [
    ("老板，这个多少钱？", "Lǎobǎn, zhège duōshao qián?", "Chủ cửa hàng, cái này bao nhiêu tiền?"),
    ("十块。", "Shí kuài.", "Mười tệ."),
    ("太贵了，八块可以吗？", "Tài guì le, bā kuài kěyǐ ma?", "Đắt quá, tám tệ được không?"),
    ("可以。你还要别的吗？", "Kěyǐ. Nǐ hái yào bié de ma?", "Được. Bạn còn muốn mua gì nữa không?"),
    ("我要三本书，一个杯子，两包茶。", "Wǒ yào sān běn shū, yí ge bēizi, liǎng bāo chá.", "Tôi muốn ba cuốn sách, một cái cốc, hai gói trà."),
    ("一共一百零八块。", "Yígòng yìbǎi líng bā kuài.", "Cộng lại là một trăm lẻ tám tệ."),
    ("这里是两百元。", "Zhèlǐ shì liǎngbǎi yuán.", "Đây là hai trăm tệ."),
    ("找你九十二块。", "Zhǎo nǐ jiǔshí'èr kuài.", "Tôi trả lại bạn chín mươi hai tệ."),
    ("这些钱是对的。再见！", "Zhèxiē qián shì duì de. Zàijiàn!", "Tiền này là đúng rồi. Tạm biệt!"),
    ("再见！明天再来。", "Zàijiàn! Míngtiān zài lái.", "Tạm biệt! Mai quay lại nhé."),
])

# Lesson 6 – 日期
dlg(6, "今天几号", "Thời gian & ngày tháng", [
    ("请问，今天是几月几号？", "Qǐngwèn, jīntiān shì jǐ yuè jǐ hào?", "Cho hỏi, hôm nay là ngày mấy tháng mấy?"),
    ("今天是十月十五号。", "Jīntiān shì shí yuè shíwǔ hào.", "Hôm nay là ngày mười lăm tháng mười."),
    ("明天是你的生日吗？", "Míngtiān shì nǐ de shēngrì ma?", "Mai là sinh nhật của bạn à?"),
    ("不是，我的生日是十二月一日。", "Bú shì, wǒ de shēngrì shì shí'èr yuè yí rì.", "Không phải, sinh nhật tôi là ngày một tháng mười hai."),
    ("你前天去哪儿了？我昨天找你。", "Nǐ qiántiān qù nǎr le? Wǒ zuótiān zhǎo nǐ.", "Hôm kia bạn đi đâu vậy? Tôi tìm bạn hôm qua."),
    ("我昨天在家里，前天在朋友家。", "Wǒ zuótiān zài jiālǐ, qiántiān zài péngyǒu jiā.", "Hôm qua tôi ở nhà, hôm kia ở nhà bạn tôi."),
    ("下个星期天你有空吗？", "Xià ge xīngqītiān nǐ yǒu kòng ma?", "Chủ nhật tới bạn có rảnh không?"),
    ("星期日我有点儿事。", "Xīngqīrì wǒ yǒudiǎnr shì.", "Chủ nhật tôi hơi có việc."),
    ("那后天呢？", "Nà hòutiān ne?", "Vậy mốt thì sao?"),
    ("后天可以。我们晚上见。", "Hòutiān kěyǐ. Wǒmen wǎnshang jiàn.", "Mốt thì được. Tối chúng ta gặp nhau nhé."),
])

# Lesson 7 – 时间
dlg(7, "几点了", "Thời gian trong ngày", [
    ("现在几点了？", "Xiànzài jǐ diǎn le?", "Bây giờ là mấy giờ rồi?"),
    ("现在是上午九点。", "Xiànzài shì shàngwǔ jiǔ diǎn.", "Bây giờ là chín giờ sáng."),
    ("我早上六点就起床了，很累。", "Wǒ zǎoshang liù diǎn jiù qǐchuáng le, hěn lèi.", "Tôi sáu giờ sáng đã dậy rồi, rất mệt."),
    ("你昨天晚上几点睡觉？", "Nǐ zuótiān wǎnshang jǐ diǎn shuìjiào?", "Tối qua bạn mấy giờ đi ngủ?"),
    ("十二点半，我睡的时间太少了。", "Shí'èr diǎn bàn, wǒ shuì de shíjiān tài shǎo le.", "Mười hai giờ rưỡi, thời gian tôi ngủ quá ít."),
    ("今晚你要工作到什么时候？", "Jīnwǎn nǐ yào gōngzuò dào shénme shíhou?", "Tối nay bạn sẽ làm việc đến mấy giờ?"),
    ("中午十二点我就下班了。", "Zhōngwǔ shí'èr diǎn wǒ jiù xiàbān le.", "Mười hai giờ trưa tôi đã tan làm rồi."),
    ("那下午我们一起去学校吧。", "Nà xiàwǔ wǒmen yìqǐ qù xuéxiào ba.", "Vậy chiều chúng ta cùng đến trường nhé."),
    ("好，我马上来。你等我一会儿。", "Hǎo, wǒ mǎshàng lái. Nǐ děng wǒ yíhuìr.", "Được, tôi đến ngay. Bạn chờ tôi một lát."),
    ("今年的新年你回家吗？", "Jīnnián de xīnnián nǐ huí jiā ma?", "Năm nay ngày Tết bạn có về nhà không?"),
    ("我们学校明年一月放假，我今年不能回家。", "Wǒmen xuéxiào míngnián yí yuè fàngjià, wǒ jīnnián bù néng huí jiā.", "Trường tôi nghỉ hè tháng Một năm sau, năm nay tôi không về được."),
])

# Lesson 8 – 学习
dlg(8, "学中文", "Học tập & trường lớp", [
    ("你在哪儿学习汉语？", "Nǐ zài nǎr xuéxí Hànyǔ?", "Bạn học tiếng Trung ở đâu?"),
    ("我在语言学院学习中文。", "Wǒ zài yǔyán xuéyuàn xuéxí Zhōngwén.", "Tôi học tiếng Trung ở Học viện ngôn ngữ."),
    ("你们班有多少个学生？", "Nǐmen bān yǒu duōshao ge xuésheng?", "Lớp của bạn có bao nhiêu học sinh?"),
    ("十个学生，两个老师。", "Shí ge xuésheng, liǎng ge lǎoshī.", "Mười học sinh, hai giáo viên."),
    ("我们今天读课文，明天听写汉字。", "Wǒmen jīntiān dú kèwén, míngtiān tīngxiě Hànzì.", "Hôm nay chúng tôi đọc bài học."),
    ("今天的课文难吗？", "Jīntiān de kèwén nán ma?", "Bài học hôm nay khó không?"),
    ("不太难，可是我的书包里有二十个生字。", "Bú tài nán, kěshì wǒ de shūbāo lǐ yǒu èrshí ge shēngzì.", "Không quá khó, nhưng cặp của tôi có hai mươi chữ mới."),
    ("你的课本呢？", "Nǐ de kèběn ne?", "Sách giáo khoa của bạn đâu?"),
    ("书和本子都在桌子上。", "Shū hé běnzi dōu zài zhuōzi shang.", "Sách và vở đều ở trên bàn."),
    ("放学以后，我们一起读书吧。", "Fàngxué yǐhòu, wǒmen yìqǐ dúshū ba.", "Sau giờ học, mình cùng đọc sách nhé."),
])

# Lesson 9 – 考试
dlg(9, "考试", "Học tập (phần 2)", [
    ("明天我们考试，你记得吗？", "Míngtiān wǒmen kǎoshì, nǐ jìde ma?", "Ngày mai chúng ta kiểm tra, bạn nhớ không?"),
    ("哎呀！我忘了！考什么？", "Āiyā! Wǒ wàng le! Kǎo shénme?", "Trời ơi, tôi quên mất rồi! Thi cái gì vậy?"),
    ("考汉字和课文。你不应该忘记！", "Kǎo Hànzì hé kèwén. Nǐ bù yīnggāi wàngjì!", "Thi chữ Hán và bài học. Bạn không nên quên chứ!"),
    ("我晚上在图书馆复习，你别担心。", "Wǒ wǎnshang zài túshūguǎn fùxí, nǐ bié dānxīn.", "Tối tôi ôn bài ở thư viện, bạn đừng lo."),
    ("我早上八点上课，中午下课。", "Wǒ zǎoshang bā diǎn shàngkè, zhōngwǔ xiàkè.", "Tôi tám giờ sáng vào lớp, trưa thì tan học."),
    ("你女儿在哪个小学上学？", "Nǐ nǚ'ér zài nǎ ge xiǎoxué shàngxué?", "Con gái bạn học tiểu học nào?"),
    ("她在第五小学，她每天走路去上学。", "Tā zài dì-wǔ xiǎoxué, tā měitiān zǒulù qù shàngxué.", "Nó học tiểu học số năm, ngày nào cũng đi bộ đến trường."),
    ("中学生也考试吗？", "Zhōngxuéshēng yě kǎoshì ma?", "Học sinh trung học cũng có thi không?"),
    ("当然，他们考试很多，知识也很多。", "Dāngrán, tāmen kǎoshì hěn duō, zhīshi yě hěn duō.", "Đương nhiên rồi, họ thi rất nhiều, kiến thức cũng nhiều."),
    ("那我们快去教学楼吧！要记住明天的考试！", "Nà wǒmen kuài qù jiàoxué lóu ba! Yào jìzhù míngtiān de kǎoshì!", "Vậy mình mau đến tòa nhà học đi! Phải nhớ kỳ thi ngày mai đó!"),
])

# Lesson 10 – 工作
dlg(10, "打电话", "Công nghệ & công việc", [
    ("喂，你在干什么？", "Wéi, nǐ zài gàn shénme?", "A-lô, bạn đang làm gì vậy?"),
    ("我在上网，你在忙吗？", "Wǒ zài shàngwǎng, nǐ zài máng ma?", "Tôi đang lướt mạng, bạn có bận không?"),
    ("很忙。我在开会，我的手机要没电了。", "Hěn máng. Wǒ zài kāihuì, wǒ de shǒujī yào méi diàn le.", "Bận lắm. Tôi đang họp, điện thoại sắp hết pin rồi."),
    ("那你晚上给我打电话吧。", "Nà nǐ wǎnshang gěi wǒ dǎ diànhuà ba.", "Vậy tối bạn gọi điện cho tôi nhé."),
    ("好。我六点下班，七点到家。", "Hǎo. Wǒ liù diǎn xiàbān, qī diǎn dào jiā.", "Được. Sáu giờ tôi tan làm, bảy giờ về đến nhà."),
    ("你今天上班累吗？", "Nǐ jīntiān shàngbān lèi ma?", "Hôm nay đi làm bạn có mệt không?"),
    ("很累，工人叔叔们从早工作到晚。", "Hěn lèi, gōngrén shūshumen cóng zǎo gōngzuò dào wǎn.", "Mệt lắm, các chú công nhân làm việc từ sáng đến tối."),
    ("晚上看看电视吧，别工作了。", "Wǎnshang kànkan diànshì ba, bié gōngzuò le.", "Tối thì xem tivi đi, đừng làm việc nữa."),
    ("好主意！我买了一个新电视机。", "Hǎo zhǔyi! Wǒ mǎi le yí ge xīn diànshìjī.", "Ý hay đấy! Tôi mới mua một cái tivi mới."),
    ("太好了，晚上见！别忘了打电话！", "Tài hǎo le, wǎnshang jiàn! Bié wàngle dǎ diànhuà!", "Tốt quá, tối gặp nhau nhé! Đừng quên gọi điện đó!"),
])

# Lesson 11 – 买东西
dlg(11, "买东西", "Mua sắm", [
    ("我累了，我们休息一下吧。", "Wǒ lèi le, wǒmen xiūxi yíxià ba.", "Tôi mệt rồi, mình nghỉ một chút nhé."),
    ("好。你看，前面有一个大商场。", "Hǎo. Nǐ kàn, qiánmiàn yǒu yí ge dà shāngchǎng.", "Được đấy. Nhìn kìa, phía trước có một trung tâm thương mại to."),
    ("我们去书店，我要买一本汉语书。", "Wǒmen qù shūdiàn, wǒ yào mǎi yì běn Hànyǔ shū.", "Chúng ta đến nhà sách đi, tôi muốn mua một cuốn sách tiếng Trung."),
    ("好，再买些东西吃吧，我饿了。", "Hǎo, zài mǎi xiē dōngxi chī ba, wǒ è le.", "Được, rồi mua thêm đồ ăn nhé, tôi đói rồi."),
    ("我带了我的钱包，我来拿钱。", "Wǒ dài le wǒ de qiánbāo, wǒ lái ná qián.", "Tôi mang ví rồi, để tôi lấy tiền."),
    ("这个书店的东西很贵吗？", "Zhège shūdiàn de dōngxi hěn guì ma?", "Đồ ở nhà sách này có đắt không?"),
    ("不贵，书也很好。", "Bú guì, shū yě hěn hǎo.", "Không đắt, sách cũng hay nữa."),
    ("那快走吧！", "Nà kuài zǒu ba!", "Vậy mau đi thôi!"),
    ("等等，你的钱包在桌子上，别忘了！", "Děngdeng, nǐ de qiánbāo zài zhuōzi shang, bié wàngle!", "Khoan đã, ví của bạn trên bàn kìa, đừng quên!"),
    ("谢谢！走，我们先去上边儿的书店。", "Xièxie! Zǒu, wǒmen xiān qù shàngbiānr de shūdiàn.", "Cảm ơn! Đi thôi, mình lên nhà sách ở tầng trên trước."),
])

# Lesson 12 – 方位
dlg(12, "在哪边", "Phương vị & nơi chốn", [
    ("请问，车站在这边吗？", "Qǐngwèn, chēzhàn zài zhè biān ma?", "Cho hỏi, bến xe ở phía này phải không?"),
    ("不是，车站在东边，饭店的旁边。", "Bú shì, chēzhàn zài dōngbiān, fàndiàn de pángbiān.", "Không phải đâu, bến xe ở phía đông, cạnh khách sạn."),
    ("那银行在哪儿？", "Nà yínháng zài nǎr?", "Vậy ngân hàng ở đâu?"),
    ("银行在饭店的西边。", "Yínháng zài fàndiàn de xībiān.", "Ngân hàng ở phía tây của khách sạn."),
    ("楼上是什么？楼下呢？", "Lóushàng shì shénme? Lóuxià ne?", "Tầng trên là gì vậy? Tầng dưới thì sao?"),
    ("楼上是教室，楼下是图书馆。", "Lóushàng shì jiàoshì, lóuxià shì túshūguǎn.", "Tầng trên là phòng học, tầng dưới là thư viện."),
    ("桌子里边有个杯子，杯子后边有个书包。", "Zhuōzi lǐbian yǒu ge bēizi, bēizi hòubiān yǒu ge shūbāo.", "Trong bàn có một cái cốc, sau cái cốc có một cái cặp."),
    ("你的左边是学校，右边是医院，明白了？", "Nǐ de zuǒbiān shì xuéxiào, yòubiān shì yīyuàn, míngbai le?", "Bên trái bạn là trường, bên phải là bệnh viện, hiểu chưa?"),
    ("明白了！中间的那个大房子是什么？", "Míngbai le! Zhōngjiān de nà ge dà fángzi shì shénme?", "Rồi! Ngôi nhà to ở giữa là gì vậy?"),
    ("那是学校，从北边走路来，五分钟就到了。", "Nà shì xuéxiào, cóng běibiān zǒulù lái, wǔ fēnzhōng jiù dào le.", "Đó là trường, đi bộ từ phía bắc, năm phút là đến."),
])

# Lesson 13 – 地方
dlg(13, "请进来", "Nơi chốn (phần 2)", [
    ("你们好！请进来，请进来！", "Nǐmen hǎo! Qǐng jìnlái, qǐng jìnlái!", "Chào các bạn! Mời vào, mời vào!"),
    ("谢谢！你的房子真大。", "Xièxie! Nǐ de fángzi zhēn dà.", "Cảm ơn! Nhà bạn rộng thật."),
    ("这是我的房间，门在门口。", "Zhè shì wǒ de fángjiān, mén zài ménkǒu.", "Đây là phòng của tôi, cửa ở ngay cửa vào."),
    ("你的书都放在哪儿？", "Nǐ de shū dōu fàng zài nǎr?", "Sách của bạn để ở đâu hết vậy?"),
    ("书在楼上，本子在桌子上，书包在地上。", "Shū zài lóushàng, běnzi zài zhuōzi shang, shūbāo zài dìshang.", "Sách ở tầng trên, vở trên bàn, cặp sách dưới đất."),
    ("我们走吧，飞机票在身上吗？", "Wǒmen zǒu ba, fēijīpiào zài shēnshang ma?", "Mình đi thôi, vé máy bay mang theo người chưa?"),
    ("在身上。机场离这儿远吗？", "Zài shēnshang. Jīchǎng lí zhèr yuǎn ma?", "Rồi. Sân bay cách đây xa không?"),
    ("不太远，车站就在楼下。", "Bú tài yuǎn, chēzhàn jiù zài lóuxià.", "Không xa lắm, bến xe ngay dưới tầng."),
    ("你住在哪个国家？", "Nǐ zhù zài nǎ ge guójiā?", "Bạn sống ở quốc gia nào?"),
    ("我住在中国，我的家就在这里。", "Wǒ zhù zài Zhōngguó, wǒ de jiā jiù zài zhèlǐ.", "Tôi sống ở Trung Quốc, nhà tôi ở ngay đây."),
    ("电影院在哪儿？我们出去的时候想看电影。", "Diànyǐngyuàn zài nǎr? Wǒmen chūqù de shíhou xiǎng kàn diànyǐng.", "Rạp chiếu phim ở đâu? Lúc đi ra tụi mình muốn xem phim."),
    ("从门口出来，往南走就是电影院。", "Cóng ménkǒu chūlái, wǎng nán zǒu jiù shì diànyǐngyuàn.", "Ra khỏi cửa, đi về phía nam là tới rạp phim."),
])

# Lesson 14 – 交通
dlg(14, "坐火车", "Giao thông & đi lại", [
    ("明天我们去上海，怎么走？", "Míngtiān wǒmen qù Shànghǎi, zěnme zǒu?", "Ngày mai chúng ta đi Thượng Hải, đi đường nào?"),
    ("坐火车快，开车太慢了。", "Zuò huǒchē kuài, kāichē tài màn le.", "Đi tàu hỏa thì nhanh, lái xe thì chậm quá."),
    ("对，打车去火车站吧。", "Duì, dǎchē qù huǒchēzhàn ba.", "Đúng đó, bắt taxi đến nhà ga nhé."),
    ("好。上车的钱我来拿。", "Hǎo. Shàngchē de qián wǒ lái ná.", "Được. Tiền xe để tôi trả."),
    ("到了！下车吧，我们在这里买票。", "Dào le! Xiàchē ba, wǒmen zài zhèlǐ mǎi piào.", "Đến rồi! Xuống xe đi, mình mua vé ở đây."),
    ("两张去上海的票，多少钱？", "Liǎng zhāng qù Shànghǎi de piào, duōshao qián?", "Hai vé đi Thượng Hải, bao nhiêu tiền?"),
    ("二百元。飞机票很贵，火车票便宜。", "Èrbǎi yuán. Fēijīpiào hěn guì, huǒchēpiào piányi.", "Hai trăm tệ. Vé máy bay đắt lắm, vé tàu thì rẻ."),
    ("路远吗？", "Lù yuǎn ma?", "Đường có xa không?"),
    ("有点儿远，可是不飞，走路怎么行？", "Yǒudiǎnr yuǎn, kěshì bù fēi, zǒulù zěnme xíng?", "Hơi xa, nhưng không bay được thì đi bộ làm sao nổi?"),
    ("哈哈，火车跑得快！我们坐汽车再走一段路就到了。", "Hāhā, huǒchē pǎo de kuài! Wǒmen zuò qìchē zài zǒu yí duàn lù jiù dào le.", "Haha, tàu chạy nhanh mà! Rồi đi ô tô tiếp một đoạn đường nữa là tới."),
])

# Lesson 15 – 吃饭
dlg(15, "吃饭", "Ăn uống", [
    ("我饿了，我们去吃饭吧。", "Wǒ è le, wǒmen qù chīfàn ba.", "Tôi đói rồi, mình đi ăn cơm nhé."),
    ("好，我想喝一杯茶。你渴吗？", "Hǎo, wǒ xiǎng hē yì bēi chá. Nǐ kě ma?", "Được, tôi muốn uống một cốc trà. Bạn có khát không?"),
    ("渴，我要一杯水。", "Kě, wǒ yào yì bēi shuǐ.", "Khát lắm, tôi muốn một cốc nước."),
    ("来两杯水，一杯牛奶，两碗米饭。", "Lái liǎng bēi shuǐ, yì bēi niúnǎi, liǎng wǎn mǐfàn.", "Cho hai cốc nước, một cốc sữa, hai bát cơm."),
    ("你们有什么菜？", "Nǐmen yǒu shénme cài?", "Quán có những món gì vậy?"),
    ("有鸡蛋、肉、面条儿和面包。", "Yǒu jīdàn, ròu, miàntiáor hé miànbāo.", "Có trứng, thịt, mì và bánh mì."),
    ("我要鸡蛋和肉，我想这里的菜很好吃。", "Wǒ yào jīdàn hé ròu, wǒ xiǎng zhèlǐ de cài hěn hǎochī.", "Tôi muốn trứng và thịt, tôi nghĩ món ở đây rất ngon."),
    ("早饭吃什么？", "Zǎofàn chī shénme?", "Bữa sáng ăn gì?"),
    ("早饭我常吃鸡蛋。晚上回家吃晚饭。", "Zǎofàn wǒ cháng chī jīdàn. Wǎnshang huí jiā chī wǎnfàn.", "Sáng tôi thường ăn trứng. Tối về nhà ăn cơm."),
    ("桌子上有水果，我们坐下，慢慢吃。", "Zhuōzi shang yǒu shuǐguǒ, wǒmen zuòxià, mànmàn chī.", "Trên bàn có trái cây, mình ngồi xuống, ăn từ từ nhé."),
    ("真好吃！我还要一杯茶。", "Zhēn hǎochī! Wǒ hái yào yì bēi chá.", "Ngon thật! Tôi còn muốn thêm một cốc trà nữa."),
])

# Lesson 16 – 健康
dlg(16, "生病", "Sức khỏe & cảm xúc", [
    ("你怎么了？你生病了吗？", "Nǐ zěnme le? Nǐ shēngbìng le ma?", "Bạn làm sao vậy? Bạn ốm à?"),
    ("是的，我病了，我去医院看病。", "Shì de, wǒ bìng le, wǒ qù yīyuàn kànbìng.", "Đúng vậy, tôi ốm rồi, tôi đến bệnh viện khám."),
    ("医生怎么说？你的身体好吗？", "Yīshēng zěnme shuō? Nǐ de shēntǐ hǎo ma?", "Bác sĩ nói sao? Sức khỏe của bạn có ổn không?"),
    ("医生说没有大问题，我不用去医院了。", "Yīshēng shuō méiyǒu dà wèntí, wǒ búyòng qù yīyuàn le.", "Bác sĩ nói không có vấn đề gì lớn, tôi không cần đến bệnh viện nữa."),
    ("太好了！我很高兴！你的手怎么样？", "Tài hǎo le! Wǒ hěn gāoxìng! Nǐ de shǒu zěnmeyàng?", "Tốt quá! Tôi rất vui! Cái tay của bạn thế nào rồi?"),
    ("好多了。洗手的时候有一点儿疼。", "Hǎo duō le. Xǐshǒu de shíhou yǒu yìdiǎnr téng.", "Khỏe hơn nhiều rồi. Lúc rửa tay còn hơi đau một chút."),
    ("医院里有很多病人吗？", "Yīyuàn lǐ yǒu hěn duō bìngrén ma?", "Trong bệnh viện có nhiều bệnh nhân không?"),
    ("很多。有的病人生气了，有的病人在笑。", "Hěn duō. Yǒu de bìngrén shēngqì le, yǒu de bìngrén zài xiào.", "Nhiều lắm. Có bệnh nhân thì đang giận, có người đang cười."),
    ("你的爱好是什么？", "Nǐ de àihào shì shénme?", "Sở thích của bạn là gì?"),
    ("我的爱好是唱歌，唱歌让我高兴。", "Wǒ de àihào shì chànggē, chànggē ràng wǒ gāoxìng.", "Sở thích của tôi là hát, hát khiến tôi vui."),
    ("我知道洗手间在哪儿，我们一起去吧。", "Wǒ zhīdào xǐshǒujiān zài nǎr, wǒmen yìqǐ qù ba.", "Tôi biết nhà vệ sinh ở đâu, mình cùng đi nhé."),
])

# Lesson 17 – 天气
dlg(17, "天气", "Thời tiết & mô tả", [
    ("今天天气真好！", "Jīntiān tiānqì zhēn hǎo!", "Thời tiết hôm nay đẹp thật!"),
    ("是啊，天上有太阳，没有雨。", "Shì a, tiānshang yǒu tàiyáng, méiyǒu yǔ.", "Ừ mà, trời có nắng, không có mưa."),
    ("昨天下午下雨了，风很大。", "Zuótiān xiàwǔ xià yǔ le, fēng hěn dà.", "Chiều qua trời mưa, gió rất lớn."),
    ("明天会不会下雨？", "Míngtiān huì bú huì xià yǔ?", "Mai có mưa không nhỉ?"),
    ("我希望明天还是好天气。", "Wǒ xīwàng míngtiān háishì hǎo tiānqì.", "Tôi hy vọng mai vẫn là thời tiết đẹp."),
    ("我们去公园玩儿吧，那里很好玩儿！", "Wǒmen qù gōngyuán wánr ba, nàlǐ hěn hǎowánr!", "Mình đi công viên chơi nhé, ở đó vui lắm!"),
    ("好！我妈妈说，认真读书，也要认真玩儿。", "Hǎo! Wǒ māma shuō, rènzhēn dúshū, yě yào rènzhēn wánr.", "Hay đấy! Mẹ tôi nói, học nghiêm túc mà chơi cũng phải chơi nghiêm túc."),
    ("你看那座山，真高真白！", "Nǐ kàn nà zuò shān, zhēn gāo zhēn bái!", "Bạn nhìn ngọn núi kia kìa, cao và trắng thật!"),
    ("那是雪。山上的树很小，山下的树很大。", "Nà shì xuě. Shānshang de shù hěn xiǎo, shānxià de shù hěn dà.", "Đó là tuyết. Cây trên núi nhỏ lắm, cây dưới núi thì to."),
    ("这棵老树真好看！快点走，别太慢了！", "Zhè kē lǎo shù zhēn hǎokàn! Kuàidiǎn zǒu, bié tài màn le!", "Cây già này đẹp thật! Đi nhanh lên, đừng chậm thế!"),
    ("我的新鞋太大了，我走得慢。", "Wǒ de xīn xié tài dà le, wǒ zǒu de màn.", "Đôi giày mới của tôi rộng quá nên tôi đi chậm."),
])

# Lesson 18 – 形容词
dlg(18, "太贵了", "Tính từ & mô tả", [
    ("这个杯子真好看！多少钱？", "Zhège bēizi zhēn hǎokàn! Duōshao qián?", "Cái cốc này xinh thật! Bao nhiêu tiền?"),
    ("一百块，太贵了！", "Yìbǎi kuài, tài guì le!", "Một trăm tệ, đắt quá!"),
    ("真的太贵了。那个新杯子呢？", "Zhēn de tài guì le. Nàge xīn bēizi ne?", "Đắt thật đấy. Cái cốc mới kia thì sao?"),
    ("那个很难看，还不好用。", "Nàge hěn nánkàn, hái bù hǎo yòng.", "Cái kia xấu lắm, mà dùng cũng không tiện."),
    ("你看，这两个一样吗？", "Nǐ kàn, zhè liǎng ge yíyàng ma?", "Bạn xem, hai cái này giống nhau không?"),
    ("不一样，一个大，一个小，一个重，一个轻。", "Bù yíyàng, yí ge dà, yí ge xiǎo, yí ge zhòng, yí ge qīng.", "Không giống, một cái to một cái nhỏ, một cái nặng một cái nhẹ."),
    ("今天真冷，明天会不会很热？", "Jīntiān zhēn lěng, míngtiān huì bú huì hěn rè?", "Hôm nay lạnh thật, mai có nóng lắm không?"),
    ("明天热，后天更热。", "Míngtiān rè, hòutiān gèng rè.", "Mai nóng, mốt còn nóng hơn."),
    ("你的答案对了没有？", "Nǐ de dá'àn duì le méiyǒu?", "Câu trả lời của bạn đúng chưa?"),
    ("对了。老师说我最棒！", "Duì le. Lǎoshī shuō wǒ zuì bàng!", "Đúng rồi. Thầy cô nói tôi là giỏi nhất!"),
    ("真棒！我答错了，我很不高兴。", "Zhēn bàng! Wǒ dácuò le, wǒ hěn bù gāoxìng.", "Giỏi thật! Tôi trả lời sai, tôi không vui chút nào."),
    ("没关系，你的成绩不差，真的非常不错！", "Méi guānxi, nǐ de chéngjì bú chà, zhēn de fēicháng búcuò!", "Không sao, kết quả của bạn không tệ, thật sự rất ổn!"),
])

# Lesson 19 – 天然 & 电影
dlg(19, "看电影", "Thiên nhiên & giải trí", [
    ("今天晚上我们去看电影吧！", "Jīntiān wǎnshang wǒmen qù kàn diànyǐng ba!", "Tối nay mình đi xem phim nhé!"),
    ("好！什么电影？", "Hǎo! Shénme diànyǐng?", "Được! Phim gì vậy?"),
    ("一部新的中国电影，很有名。", "Yí bù xīn de Zhōngguó diànyǐng, hěn yǒumíng.", "Một bộ phim Trung Quốc mới, nổi tiếng lắm."),
    ("我看过了，我第二次看。", "Wǒ kànguò le, wǒ dì-èr cì kàn.", "Tôi xem rồi, đây là lần thứ hai tôi xem."),
    ("你在哪儿看见它的？", "Nǐ zài nǎr kànjiàn tā de?", "Bạn xem nó ở đâu vậy?"),
    ("我看到了电影的信息，马上就去买了票。", "Wǒ kàndào le diànyǐng de xìnxī, mǎshàng jiù qù mǎi le piào.", "Tôi thấy thông tin phim, liền đi mua vé ngay."),
    ("我们唱歌还是看电影？", "Wǒmen chànggē háishì kàn diànyǐng?", "Mình hát hay xem phim đây?"),
    ("先看电影，回家的时候再唱歌。", "Xiān kàn diànyǐng, huíjiā de shíhou zài chànggē.", "Xem phim trước, về nhà thì hát sau."),
    ("去山上的路上，我听到了一首歌。", "Qù shānshang de lùshang, wǒ tīngdào le yì shǒu gē.", "Trên đường lên núi, tôi nghe được một bài hát."),
    ("好好听！树上有很多鸟，地上有很多花。", "Hǎo hǎotīng! Shùshang yǒu hěn duō niǎo, dìshang yǒu hěn duō huā.", "Hay thật! Trên cây có nhiều chim, dưới đất có nhiều hoa."),
    ("这个国家的地方真美！", "Zhège guójiā de dìfang zhēn měi!", "Đất nước này cảnh đẹp thật!"),
])

# Lesson 20 – 打球
dlg(20, "打球", "Thể thao & từ nối", [
    ("你会打球吗？", "Nǐ huì dǎqiú ma?", "Bạn chơi bóng được không?"),
    ("会，我常常和朋友们一起打球。", "Huì, wǒ chángcháng hé péngyǒumen yìqǐ dǎqiú.", "Được chứ, tôi thường chơi bóng cùng bạn bè."),
    ("很好！我也是。我们一块儿去吧！", "Hěn hǎo! Wǒ yě shì. Wǒmen yíkuàir qù ba!", "Tốt lắm! Tôi cũng vậy. Mình cùng đi thôi!"),
    ("好，还是老地方。", "Hǎo, háishì lǎo dìfang.", "Được, vẫn chỗ cũ nhé."),
    ("先做运动，然后再吃饭。", "Xiān zuò yùndòng, ránhòu zài chīfàn.", "Tập thể dục trước, rồi mới ăn cơm sau."),
    ("今天你们都很忙吗？", "Jīntiān nǐmen dōu hěn máng ma?", "Hôm nay các bạn đều bận à?"),
    ("大家都想玩儿球，都很高兴。", "Dàjiā dōu xiǎng wánr qiú, dōu hěn gāoxìng.", "Ai cũng muốn chơi bóng, ai cũng vui."),
    ("我一边听音乐，一边走路来。", "Wǒ yìbiān tīng yīnyuè, yìbiān zǒulù lái.", "Tôi vừa nghe nhạc vừa đi bộ đến đây."),
    ("你走得很快！", "Nǐ zǒu de hěn kuài!", "Bạn đi nhanh thật đấy!"),
    ("是的，因为我还有事，我得早点儿回家。", "Shì de, yīnwèi wǒ hái yǒu shì, wǒ děi zǎodiǎnr huí jiā.", "Đúng vậy, vì tôi còn việc, phải về nhà sớm một chút."),
    ("没问题，就一会儿，马上就完了。", "Méi wèntí, jiù yíhuìr, mǎshàng jiù wán le.", "Không sao đâu, chỉ một lát thôi, xong ngay mà."),
])

# Lesson 21 – 语法
dlg(21, "你会说中文吗", "Từ nối & ngữ pháp", [
    ("你会说中文吗？", "Nǐ huì shuō Zhōngwén ma?", "Bạn nói được tiếng Trung không?"),
    ("会说一点儿，我说得不好。", "Huì shuō yìdiǎnr, wǒ shuō de bù hǎo.", "Nói được một chút, tôi nói chưa tốt."),
    ("你想学吗？我可以教你。", "Nǐ xiǎng xué ma? Wǒ kěyǐ jiāo nǐ.", "Bạn có muốn học không? Tôi có thể dạy bạn."),
    ("太好了！给这本书，是给你的。", "Tài hǎo le! Gěi zhè běn shū, shì gěi nǐ de.", "Tốt quá! Cầm cuốn sách này, là tặng bạn đấy."),
    ("谢谢！这本书非常有用。", "Xièxie! Zhè běn shū fēicháng yǒuyòng.", "Cảm ơn! Cuốn sách này rất hữu ích."),
    ("你要怎么学？每天学吗？", "Nǐ yào zěnme xué? Měitiān xué ma?", "Bạn định học thế nào? Học mỗi ngày à?"),
    ("对，正学着呢。可是不知道为什么很难。", "Duì, zhèng xuézhe ne. Kěshì bù zhīdào wèishénme hěn nán.", "Đúng rồi, đang học đây. Nhưng không biết sao nó khó quá."),
    ("别担心！没有不会的学生，只有不会的老师。", "Bié dānxīn! Méiyǒu bú huì de xuésheng, zhǐyǒu bú huì de lǎoshī.", "Đừng lo! Không có học sinh dốt, chỉ có thầy cô dạy dốt."),
    ("哈哈，你真会说话！我是不是有很多问题？", "Hāhā, nǐ zhēn huì shuōhuà! Wǒ shì bú shì yǒu hěn duō wèntí?", "Haha, bạn nói hay thật! Chắc tôi hỏi nhiều câu lắm nhỉ?"),
    ("不多，还有别的问题吗？", "Bù duō, hái yǒu bié de wèntí ma?", "Không nhiều đâu, còn câu hỏi nào nữa không?"),
    ("没有了。我们喝着茶，慢慢说。", "Méiyǒu le. Wǒmen hēzhe chá, mànmàn shuō.", "Hết rồi rồi. Mình vừa uống trà vừa nói chuyện từ từ nhé."),
    ("好，从今天开始，我每天教你一个小时。", "Hǎo, cóng jīntiān kāishǐ, wǒ měitiān jiāo nǐ yí ge xiǎoshí.", "Được, từ hôm nay, mỗi ngày tôi dạy bạn một tiếng."),
])

# Lesson 22 – 日常
dlg(22, "回家", "Hoạt động thường ngày", [
    ("外面很冷，快把门关上！", "Wàimiàn hěn lěng, kuài bǎ mén guānshang!", "Ngoài trời lạnh lắm, mau đóng cửa lại đi!"),
    ("好。把窗户打开吗？", "Hǎo. Bǎ chuānghu dǎkāi ma?", "Rồi. Có mở cửa sổ không?"),
    ("不要，太冷了。请帮我一个忙。", "Bú yào, tài lěng le. Qǐng bāng wǒ yí ge máng.", "Đừng, lạnh lắm. Giúp tôi một việc nhé."),
    ("什么事？你说，我帮忙。", "Shénme shì? Nǐ shuō, wǒ bāngmáng.", "Việc gì vậy? Bạn cứ nói, tôi giúp."),
    ("请把我的衣服放回房间里。", "Qǐng bǎ wǒ de yīfu fàng huí fángjiān lǐ.", "Hãy cầm quần áo của tôi đặt lại vào phòng giúp tôi."),
    ("行，没问题。", "Xíng, méi wèntí.", "Được, không sao."),
    ("谢谢！你现在回去吗？", "Xièxie! Nǐ xiànzài huíqù ma?", "Cảm ơn! Bây giờ bạn quay về à?"),
    ("是的，我得回家了。再见！", "Shì de, wǒ děi huí jiā le. Zàijiàn!", "Vâng, tôi phải về nhà rồi. Tạm biệt!"),
    ("路上小心！到了给我打电话。", "Lùshang xiǎoxīn! Dào le gěi wǒ dǎ diànhuà.", "Đi đường cẩn thận nhé! Đến nơi thì gọi điện cho tôi."),
    ("好，我到家就打给你。", "Hǎo, wǒ dào jiā jiù dǎ gěi nǐ.", "Được, về đến nhà tôi sẽ gọi cho bạn."),
])

# Lesson 23 – 起床
dlg(23, "起床", "Hoạt động thường ngày (phần 2)", [
    ("早上好！你几点起床？", "Zǎoshang hǎo! Nǐ jǐ diǎn qǐchuáng?", "Chào buổi sáng! Bạn mấy giờ dậy?"),
    ("我六点起床，然后去找早饭。", "Wǒ liù diǎn qǐchuáng, ránhòu qù zhǎo zǎofàn.", "Tôi sáu giờ dậy, rồi đi tìm đồ ăn sáng."),
    ("你今天去哪儿？", "Nǐ jīntiān qù nǎr?", "Hôm nay bạn đi đâu?"),
    ("我回去学校，有课。", "Wǒ huíqù xuéxiào, yǒu kè.", "Tôi quay lại trường, có tiết học."),
    ("用我的书吧，非常有用。", "Yòng wǒ de shū ba, fēicháng yǒuyòng.", "Dùng sách của tôi đi, rất hữu ích đấy."),
    ("谢谢！找到它了！", "Xièxie! Zhǎodào tā le!", "Cảm ơn! Tôi tìm thấy nó rồi!"),
    ("你晚上做什么？", "Nǐ wǎnshang zuò shénme?", "Buổi tối bạn làm gì?"),
    ("睡觉以前看书，十一点睡觉。", "Shuìjiào yǐqián kànshū, shíyī diǎn shuìjiào.", "Trước khi ngủ thì đọc sách, mười một giờ đi ngủ."),
    ("真有规律！你的生活很有名吗？哈哈！", "Zhēn yǒu guīlǜ! Nǐ de shēnghuó hěn yǒumíng ma? Hāhā!", "Đều đặn thật! Cuộc sống của bạn có nổi tiếng không? Haha!"),
    ("别笑话我！我等你的答案。", "Bié xiàohua wǒ! Wǒ děng nǐ de dá'àn.", "Đừng chọc tôi! Tôi đang chờ câu trả lời của bạn đấy."),
    ("好了，我们来吧！", "Hǎo le, wǒmen lái ba!", "Xong rồi, mình bắt đầu nhé!"),
])

# Lesson 24 – 交流
dlg(24, "认识你", "Giao tiếp & suy nghĩ", [
    ("你好，我认识你吗？", "Nǐ hǎo, wǒ rènshi nǐ ma?", "Chào bạn, tôi quen bạn nhỉ?"),
    ("认识！上次我们见过面。", "Rènshi! Shàng cì wǒmen jiànguò miàn.", "Quen chứ! Lần trước chúng ta đã gặp nhau rồi."),
    ("啊，想起来了！你最近怎么样？", "A, xiǎng qǐlái le! Nǐ zuìjìn zěnmeyàng?", "À, nhớ ra rồi! Dạo này bạn thế nào?"),
    ("挺好的。我告诉你一个好消息。", "Tǐng hǎo de. Wǒ gàosu nǐ yí ge hǎo xiāoxi.", "Vẫn tốt. Tôi báo cho bạn một tin vui nhé."),
    ("什么事？请说！", "Shénme shì? Qǐng shuō!", "Việc gì vậy? Bạn nói đi!"),
    ("我考试最好，我妈妈很高兴。", "Wǒ kǎoshì zuì hǎo, wǒ māma hěn gāoxìng.", "Tôi thi tốt nhất, mẹ tôi rất vui."),
    ("真棒！你的朋友们也考得好吗？", "Zhēn bàng! Nǐ de péngyǒumen yě kǎo de hǎo ma?", "Giỏi thật! Bạn bè của bạn cũng thi tốt không?"),
    ("别人都很好，没有人觉得难。", "Biérén dōu hěn hǎo, méiyǒu rén juéde nán.", "Mọi người đều làm tốt cả, không ai thấy khó cả."),
    ("我问你一个问题，好吗？", "Wǒ wèn nǐ yí ge wèntí, hǎo ma?", "Tôi hỏi bạn một câu nhé?"),
    ("问吧，我明白的话就回答你。", "Wèn ba, wǒ míngbai de huà jiù huídá nǐ.", "Hỏi đi, nếu tôi hiểu thì tôi sẽ trả lời."),
    ("没关系，你不用回答。都是小事。", "Méi guānxi, nǐ búyòng huídá. Dōu shì xiǎoshì.", "Không sao đâu, bạn không cần trả lời. Chỉ là chuyện nhỏ thôi."),
    ("谢谢你的好意，朋友们都说我很好。", "Xièxie nǐ de hǎoyì, péngyǒumen dōu shuō wǒ hěn hǎo.", "Cảm ơn tấm lòng của bạn, bạn bè ai cũng nói tôi dễ mến."),
])

# Lesson 25 – 数量
dlg(25, "多少", "Thời gian & tần suất (bổ sung)", [
    ("你今年多大了？", "Nǐ jīnnián duō dà le?", "Năm nay bạn bao nhiêu tuổi rồi?"),
    ("我二十岁。你呢？", "Wǒ èrshí suì. Nǐ ne?", "Tôi hai mươi tuổi. Còn bạn?"),
    ("我比你大一岁，我二十一。", "Wǒ bǐ nǐ dà yí suì, wǒ èrshíyī.", "Tôi hơn bạn một tuổi, tôi hai mươi một."),
    ("白天你在学校学习几个小时？", "Báitiān nǐ zài xuéxiào xuéxí jǐ ge xiǎoshí?", "Ban ngày bạn học mấy tiếng ở trường?"),
    ("大概六个小时，有时候多，有时候少。", "Dàgài liù ge xiǎoshí, yǒushíhou duō, yǒushíhou shǎo.", "Khoảng sáu tiếng, lúc thì nhiều, lúc thì ít."),
    ("每天学那么久！你最好休息一下儿。", "Měitiān xué nàme jiǔ! Nǐ zuì hǎo xiūxi yíxiàr.", "Mỗi ngày học lâu thế! Tốt nhất bạn nên nghỉ ngơi một chút."),
    ("你说得对，我上学期就是这样累病的。", "Nǐ shuō de duì, wǒ shàngxuéqī jiù shì zhèyàng lèi bìng de.", "Bạn nói đúng, học kỳ trước tôi đã mệt bệnh như thế đấy."),
    ("今天几号？我们下次考试是什么时候？", "Jīntiān jǐ hào? Wǒmen xià cì kǎoshì shì shénme shíhou?", "Hôm nay ngày mấy? Lần thi tới của chúng ta là khi nào?"),
    ("今天是八号，考试在下星期一。", "Jīntiān shì bā hào, kǎoshì zài xià xīngqīyī.", "Hôm nay là ngày mùng tám, thi vào thứ Hai tuần sau."),
    ("最后，别忘了带笔！上次的笔忘在我家了。", "Zuìhòu, bié wàngle dài bǐ! Shàng cì de bǐ wàng zài wǒ jiā le.", "Cuối cùng, đừng quên mang bút nhé! Cái bút lần trước bạn để quên ở nhà tôi."),
    ("我记住了，这次一定不忘记。", "Wǒ jìzhù le, zhè cì yídìng bú wàngjì.", "Tôi nhớ rồi, lần này nhất định không quên."),
])

# Lesson 26 – 喜好
dlg(26, "喜欢", "Sở thích & hoạt động cá nhân", [
    ("你喜欢学汉语吗？", "Nǐ xǐhuan xué Hànyǔ ma?", "Bạn có thích học tiếng Trung không?"),
    ("喜欢！汉语很有意思。", "Xǐhuan! Hànyǔ hěn yǒu yìsi.", "Thích chứ! Tiếng Trung rất thú vị."),
    ("今天课上到第几页了？", "Jīntiān kè shàng dào dì-jǐ yè le?", "Hôm nay học đến trang thứ mấy rồi?"),
    ("第十页，老师说这篇课文很重要。", "Dì-shí yè, lǎoshī shuō zhè piān kèwén hěn zhòngyào.", "Trang mười, thầy giáo nói bài học này rất quan trọng."),
    ("我已经读了两遍。中间有几句话我不会。", "Wǒ yǐjīng dú le liǎng biàn. Zhōngjiān yǒu jǐ jù huà wǒ bú huì.", "Tôi đã đọc hai lần rồi. Giữa bài có mấy câu tôi không biết."),
    ("下课以后我教你说。", "Xiàkè yǐhòu wǒ jiāo nǐ shuō.", "Sau giờ học tôi dạy bạn nói."),
    ("谢谢！我想去北京看看。", "Xièxie! Wǒ xiǎng qù Běijīng kànkan.", "Cảm ơn! Tôi muốn đi Bắc Kinh chơi."),
    ("好啊！我来给你画一张地图。", "Hǎo a! Wǒ lái gěi nǐ huà yì zhāng dìtú.", "Hay đấy! Để tôi vẽ cho bạn một tấm bản đồ."),
    ("我还有很多事要做，我的床还没收拾呢。", "Wǒ hái yǒu hěn duō shì yào zuò, wǒ de chuáng hái méi shōushi ne.", "Tôi còn nhiều việc phải làm, giường tôi còn chưa dọn nữa."),
    ("别忙了，先去买两个包子吃吧！", "Bié máng le, xiān qù mǎi liǎng ge bāozi chī ba!", "Đừng bận nữa, đi mua hai cái bánh bao ăn đã!"),
    ("好主意！包子很好吃。", "Hǎo zhǔyi! Bāozi hěn hǎochī.", "Ý hay đấy! Bánh bao ăn rất ngon."),
])

# Lesson 27 – 准备
dlg(27, "准备", "Sở thích & hoạt động cá nhân (phần 2)", [
    ("你今天请假了吗？", "Nǐ jīntiān qǐngjià le ma?", "Hôm nay bạn xin nghỉ phép rồi à?"),
    ("请了，我有很多事要准备。", "Qǐng le, wǒ yǒu hěn duō shì yào zhǔnbèi.", "Xin rồi, tôi có nhiều việc phải chuẩn bị."),
    ("你要干什么？", "Nǐ yào gàn shénme?", "Bạn định làm gì vậy?"),
    ("爸爸过生日，我要做一顿好饭。", "Bàba guò shēngrì, wǒ yào zuò yí dùn hǎofàn.", "Bố tôi sắp sinh nhật, tôi định nấu một bữa cơm ngon."),
    ("让我帮你吧。先买什么？", "Ràng wǒ bāng nǐ ba. Xiān mǎi shénme?", "Để tôi giúp bạn. Mua gì trước?"),
    ("买饭和菜，还要少买一点儿水果。", "Mǎi fàn hé cài, hái yào shǎo mǎi yìdiǎnr shuǐguǒ.", "Mua cơm và rau, còn cần mua ít trái cây."),
    ("这个动作真快！已经七点了。", "Zhège dòngzuò zhēn kuài! Yǐjīng qī diǎn le.", "Vân tay lẹ thật! Đã bảy giờ rồi."),
    ("时间过得真快，我们继续吧。", "Shíjiān guò de zhēn kuài, wǒmen jìxù ba.", "Thời gian trôi nhanh thật, mình làm tiếp nhé."),
    ("你的口渴了吧？喝点儿水。", "Nǐ de kǒu kě le ba? Hē diǎnr shuǐ.", "Bạn khát rồi phải không? Uống chút nước đi."),
    ("谢谢！对了，这句话怎么说：生日快乐？", "Xièxie! Duìle, zhè jù huà zěnme shuō: shēngrì kuàilè?", "Cảm ơn! Này, câu này nói sao nhỉ: chúc mừng sinh nhật?"),
    ("就说：生日快乐！爸爸一定很高兴。", "Jiù shuō: shēngrì kuàilè! Bàba yídìng hěn gāoxìng.", "Chỉ cần nói: chúc mừng sinh nhật! Bố bạn nhất định sẽ rất vui."),
    ("太好了，重要的事情都准备好了！", "Tài hǎo le, zhòngyào de shìqing dōu zhǔnbèi hǎo le!", "Tốt quá, những việc quan trọng đều đã chuẩn bị xong rồi!"),
])

out = {"dialogues": D}
path = "/Volumes/samsung512/Code/hsk/app-next/scripts/content/out/dialogues-raw-hsk1.json"
with open(path, "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=2)
print("wrote", len(D))
