/* Port 1:1 từ clone/js/data/vocab.js — dữ liệu từ vựng.
   Bài 1 HSK1 đúng theo SPEC-02; bài 2-15: 8-10 từ HSK1 mỗi bài; mỗi book khác 1 bài demo. */
import { toPinyin } from "@/lib/pinyin-utils";

export type PinyinPerChar = { c: string; py: string };
export type Example = { zh: string; pinyinPerChar: PinyinPerChar[]; vi: string };
export type VocabWord = {
  hanzi: string;
  pinyin: string;
  hanViet: string;
  meaning: string;
  pos: string;
  example: Example;
};
export type VocabLesson = { title: string; words: VocabWord[] };

function py(s: string): string {
  return toPinyin(s);
}
/* exPy: mỗi âm tiết/ký tự cách nhau bởi dấu cách, khớp 1-1 với từng ký tự của exZh */
const PUNCT = /[，。？！、：；…—]/;
function perChar(exZh: string, exPy: string): PinyinPerChar[] {
  const chars = Array.from(exZh);
  const pys = exPy.trim().split(/\s+/);
  return chars.map((c, i) => {
    if (PUNCT.test(c)) return { c: c, py: c };
    return { c: c, py: pys[i] ? py(pys[i]) : "" };
  });
}
/* pinyin có số -> tự chuyển thành dấu; không có số -> giữ nguyên (vd "Wáng lǎoshī") */
function W(
  hanzi: string,
  pinyin: string,
  hanViet: string,
  meaning: string,
  pos: string,
  exZh: string,
  exPy: string,
  exVi: string
): VocabWord {
  return {
    hanzi: hanzi,
    pinyin: /\d/.test(pinyin) ? py(pinyin) : pinyin,
    hanViet: hanViet,
    meaning: meaning,
    pos: pos,
    example: { zh: exZh, pinyinPerChar: perChar(exZh, exPy), vi: exVi }
  };
}

/* ================= HSK1 ================= */
const hsk1: Record<string, VocabLesson> = {};

hsk1["lesson-1"] = {
  title: "Xin chào!",
  words: [
    W("你好", "nǐ hǎo", "NHĨ HẢO", "Xin chào", "Cụm từ", "李明，你好。", "li3 ming2 , ni3 hao3 .", "Chào Lý Minh"),
    W("王老师", "Wáng lǎoshī", "VƯƠNG LÃO SƯ", "Cô Vương", "Danh từ", "王老师，您好。", "wang2 lao3 shi1 , nin2 hao3 .", "Xin chào cô Vương"),
    W("大家", "dàjiā", "ĐẠI GIA", "Mọi người", "Đại từ", "大家好，我是新学生。", "da4 jia1 hao3 , wo3 shi4 xin1 xue2 sheng5 .", "Chào mọi người, tôi là học sinh mới"),
    W("好", "hǎo", "HẢO", "Tốt, khỏe", "Tính từ", "老师，您好。", "lao3 shi1 , nin2 hao3 .", "Xin chào thầy"),
    W("学生", "xuésheng", "HỌC SINH", "Học sinh", "Danh từ", "我是这里的学生。", "wo3 shi4 zhe4 li3 de5 xue2 sheng5 .", "Tôi là học sinh ở đây"),
    W("们", "men", "MÔN", "Các, những (hậu tố chỉ số nhiều)", "Hậu tố", "老师们好。", "lao3 shi1 men5 hao3 .", "Chào các thầy cô"),
    W("老师", "lǎoshī", "LÃO SƯ", "Giáo viên, thầy cô", "Danh từ", "王老师，您好。", "wang2 lao3 shi1 , nin2 hao3 .", "Xin chào cô Vương"),
    W("您", "nín", "NÂM", "Ngài, ông, bà (trang trọng)", "Đại từ", "您是老师吗", "nin2 shi4 lao3 shi1 ma5", "Ngài là giáo viên phải không"),
    W("你们", "nǐmen", "NHĨ MÔN", "Các bạn", "Đại từ", "你们是学生吗", "ni3 men5 shi4 xue2 sheng5 ma5", "Các bạn là học sinh phải không"),
    W("谢谢", "xièxie", "TẠ TẠ", "Cảm ơn", "Động từ", "老师，谢谢您。", "lao3 shi1 , xie4 xie5 nin2 .", "Thưa thầy, cảm ơn thầy"),
    W("不客气", "bú kèqi", "BẤT KHÁCH KHÍ", "Không có gì, đừng khách sáo", "Cụm từ", "谢谢你，不客气。", "xie4 xie5 ni3 , bu2 ke4 qi5 .", "Cảm ơn bạn, không có gì"),
    W("同学", "tóngxué", "ĐỒNG HỌC", "Bạn học", "Danh từ", "同学们好！", "tong2 xue2 men5 hao3 .", "Chào các bạn học"),
    W("再见", "zàijiàn", "TÁI KIẾN", "Tạm biệt", "Động từ", "老师，再见！", "lao3 shi1 , zai4 jian4 .", "Tạm biệt thầy")
  ]
};

hsk1["lesson-2"] = {
  title: "Gia đình",
  words: [
    W("爸爸", "ba4 ba5", "BÁ BA", "Bố", "Danh từ", "我爸爸是老师。", "wo3 ba4 ba5 shi4 lao3 shi1 .", "Bố tôi là giáo viên"),
    W("妈妈", "ma1 ma5", "MA MA", "Mẹ", "Danh từ", "我爱妈妈。", "wo3 ai4 ma1 ma5 .", "Con yêu mẹ"),
    W("儿子", "er2 zi5", "NHI TỬ", "Con trai", "Danh từ", "我有一个儿子。", "wo3 you3 yi1 ge4 er2 zi5 .", "Tôi có một đứa con trai"),
    W("女儿", "nv3 er2", "NỮ NHI", "Con gái", "Danh từ", "女儿很漂亮。", "nv3 er2 hen3 piao4 liang4 .", "Con gái rất xinh đẹp"),
    W("先生", "xian1 sheng5", "TIÊN SINH", "Ông, anh (trang trọng)", "Danh từ", "先生，你好。", "xian1 sheng5 , ni3 hao3 .", "Chào ông"),
    W("小姐", "xiao3 jie3", "TIỂU TỈ", "Cô, chị", "Danh từ", "小姐，谢谢您。", "xiao3 jie3 , xie4 xie5 nin2 .", "Cô ơi, cảm ơn cô"),
    W("朋友", "peng2 you5", "BỒNG HỮU", "Bạn bè", "Danh từ", "我们是好朋友。", "wo3 men5 shi4 hao3 peng2 you5 .", "Chúng tôi là bạn tốt"),
    W("名字", "ming2 zi5", "DANH TỰ", "Tên", "Danh từ", "你叫什么名字？", "ni3 jiao4 shen2 me5 ming2 zi5 ?", "Bạn tên là gì?")
  ]
};

hsk1["lesson-3"] = {
  title: "Số đếm",
  words: [
    W("一", "yi1", "NHẤT", "Một", "Số từ", "我要一杯茶。", "wo3 yao4 yi1 bei1 cha2 .", "Tôi muốn một cốc trà"),
    W("二", "er4", "NHỊ", "Hai", "Số từ", "一加一是二。", "yi1 jia1 yi1 shi4 er4 .", "Một cộng một bằng hai"),
    W("三", "san1", "TAM", "Ba", "Số từ", "我有三本书。", "wo3 you3 san1 ben3 shu1 .", "Tôi có ba quyển sách"),
    W("四", "si4", "TỨ", "Bốn", "Số từ", "现在四点。", "xian4 zai4 si4 dian3 .", "Bây giờ là bốn giờ"),
    W("五", "wu3", "NGŨ", "Năm", "Số từ", "今天星期五。", "jin1 tian1 xing1 qi1 wu3 .", "Hôm nay là thứ Sáu"),
    W("六", "liu4", "LỤC", "Sáu", "Số từ", "现在六点。", "xian4 zai4 liu4 dian3 .", "Bây giờ là sáu giờ"),
    W("七", "qi1", "THẤT", "Bảy", "Số từ", "七月七号。", "qi1 yue4 qi1 hao4 .", "Tháng Bảy ngày bảy"),
    W("八", "ba1", "BÁT", "Tám", "Số từ", "我八点去学校。", "wo3 ba1 dian3 qu4 xue2 xiao4 .", "Lúc tám giờ tôi đến trường")
  ]
};

hsk1["lesson-4"] = {
  title: "Thời gian",
  words: [
    W("今天", "jin1 tian1", "KIM THIÊN", "Hôm nay", "Danh từ", "今天我很好。", "jin1 tian1 wo3 hen3 hao3 .", "Hôm nay tôi ổn"),
    W("明天", "ming2 tian1", "MINH THIÊN", "Ngày mai", "Danh từ", "明天见！", "ming2 tian1 jian4 !", "Hẹn gặp ngày mai!"),
    W("昨天", "zuo2 tian1", "TÁC THIÊN", "Hôm qua", "Danh từ", "昨天下雨了。", "zuo2 tian1 xia4 yu3 le5 .", "Hôm qua trời mưa rồi"),
    W("现在", "xian4 zai4", "HIỆN TẠI", "Bây giờ", "Danh từ", "现在几点？", "xian4 zai4 ji3 dian3 ?", "Bây giờ là mấy giờ?"),
    W("上午", "shang4 wu3", "THƯỢNG NGỌ", "Buổi sáng", "Danh từ", "上午我们学汉语。", "shang4 wu3 wo3 men5 xue2 han4 yu3 .", "Buổi sáng chúng tôi học tiếng Trung"),
    W("中午", "zhong1 wu3", "TRUNG NGỌ", "Buổi trưa", "Danh từ", "中午我吃饭。", "zhong1 wu3 wo3 chi1 fan4 .", "Buổi trưa tôi ăn cơm"),
    W("下午", "xia4 wu3", "HẠ NGỌ", "Buổi chiều", "Danh từ", "下午很热。", "xia4 wu3 hen3 re4 .", "Buổi chiều rất nóng"),
    W("星期", "xing1 qi1", "TINH KỲ", "Tuần, thứ trong tuần", "Danh từ", "星期四下雨。", "xing1 qi1 si4 xia4 yu3 .", "Thứ Năm trời mưa")
  ]
};

hsk1["lesson-5"] = {
  title: "Ăn uống",
  words: [
    W("茶", "cha2", "TRÀ", "Trà", "Danh từ", "这杯茶很好喝。", "zhe4 bei1 cha2 hen3 hao3 he1 .", "Cốc trà này rất ngon"),
    W("喝", "he1", "HÁT", "Uống", "Động từ", "我要喝水。", "wo3 yao4 he1 shui3 .", "Tôi muốn uống nước"),
    W("吃", "chi1", "THỨC", "Ăn", "Động từ", "我爱吃苹果。", "wo3 ai4 chi1 ping2 guo3 .", "Tôi thích ăn táo"),
    W("苹果", "ping2 guo3", "BÌNH QUẢ", "Quả táo", "Danh từ", "这是一个苹果。", "zhe4 shi4 yi1 ge4 ping2 guo3 .", "Đây là một quả táo"),
    W("水果", "shui3 guo3", "THỦY QUẢ", "Trái cây", "Danh từ", "我买水果。", "wo3 mai3 shui3 guo3 .", "Tôi mua trái cây"),
    W("米饭", "mi3 fan4", "MỘC PHẠN", "Cơm", "Danh từ", "我吃米饭。", "wo3 chi1 mi3 fan4 .", "Tôi ăn cơm"),
    W("鸡蛋", "ji1 dan4", "KÊ ĐÀN", "Trứng gà", "Danh từ", "鸡蛋很好吃。", "ji1 dan4 hen3 hao3 chi1 .", "Trứng rất ngon"),
    W("菜", "cai4", "THÁI", "Món ăn, rau", "Danh từ", "这里的菜很好吃。", "zhe4 li3 de5 cai4 hen3 hao3 chi1 .", "Món ăn ở đây rất ngon")
  ]
};

hsk1["lesson-6"] = {
  title: "Nơi chốn",
  words: [
    W("商店", "shang1 dian4", "THƯƠNG ĐIỆN", "Cửa hàng", "Danh từ", "我去商店买茶。", "wo3 qu4 shang1 dian4 mai3 cha2 .", "Tôi đi cửa hàng mua trà"),
    W("饭馆", "fan4 guan3", "PHẠN QUẢN", "Nhà hàng", "Danh từ", "我们去饭馆吃饭。", "wo3 men5 qu4 fan4 guan3 chi1 fan4 .", "Chúng tôi đến nhà hàng ăn cơm"),
    W("学校", "xue2 xiao4", "HỌC HIỆU", "Trường học", "Danh từ", "我们在学校学习。", "wo3 men5 zai4 xue2 xiao4 xue2 xi2 .", "Chúng tôi học ở trường"),
    W("家", "jia1", "GIA", "Nhà, gia đình", "Danh từ", "我的家很大。", "wo3 de5 jia1 hen3 da4 .", "Nhà của tôi rất lớn"),
    W("中国", "zhong1 guo2", "TRUNG QUỐC", "Nước Trung Quốc", "Danh từ", "我是中国人。", "wo3 shi4 zhong1 guo2 ren2 .", "Tôi là người Trung Quốc"),
    W("北京", "bei3 jing1", "BẮC KINH", "Thủ đô Bắc Kinh", "Danh từ", "我去北京。", "wo3 qu4 bei3 jing1 .", "Tôi đi Bắc Kinh"),
    W("汉语", "han4 yu3", "HÁN NGỮ", "Tiếng Trung", "Danh từ", "我的汉语书在这里。", "wo3 de5 han4 yu3 shu1 zai4 zhe4 li3 .", "Sách tiếng Trung của tôi ở đây"),
    W("书", "shu1", "THƯ", "Sách", "Danh từ", "我买一本书。", "wo3 mai3 yi1 ben3 shu1 .", "Tôi mua một quyển sách")
  ]
};

hsk1["lesson-7"] = {
  title: "Học tập",
  words: [
    W("学习", "xue2 xi2", "HỌC TẬP", "Học tập", "Động từ", "我学习汉语。", "wo3 xue2 xi2 han4 yu3 .", "Tôi học tiếng Trung"),
    W("写", "xie3", "TẢ", "Viết", "Động từ", "我写汉字。", "wo3 xie3 han4 zi4 .", "Tôi viết chữ Hán"),
    W("字", "zi4", "TỰ", "Chữ", "Danh từ", "我认识这个字。", "wo3 ren4 shi5 zhe4 ge4 zi4 .", "Tôi nhận ra chữ này"),
    W("电脑", "dian4 nao3", "ĐIỆN NÃO", "Máy tính", "Danh từ", "电脑很贵。", "dian4 nao3 hen3 gui4 .", "Máy tính thì đắt"),
    W("电视", "dian4 shi4", "ĐIỆN THẾ", "Ti-vi", "Danh từ", "我们看电视。", "wo3 men5 kan4 dian4 shi4 .", "Chúng tôi xem ti-vi"),
    W("电影", "dian4 ying3", "ĐIỆN ẢNH", "Bộ phim", "Danh từ", "我们去看电影。", "wo3 men5 qu4 kan4 dian4 ying3 .", "Chúng tôi đi xem phim"),
    W("本", "ben3", "BẢN", "Quyển (danh từ chỉ đơn vị)", "Lượng từ", "这本书是本好书。", "zhe4 ben3 shu1 shi4 ben3 hao3 shu1 .", "Quyển sách này là một quyển sách hay"),
    W("些", "xie1", "TÍA", "Một ít, vài", "Lượng từ", "我买些水果。", "wo3 mai3 xie1 shui3 guo3 .", "Tôi mua một ít trái cây")
  ]
};

hsk1["lesson-8"] = {
  title: "Thời tiết",
  words: [
    W("天气", "tian1 qi4", "THIÊN KHÍ", "Thời tiết", "Danh từ", "今天天气很好。", "jin1 tian1 tian1 qi4 hen3 hao3 .", "Hôm nay thời tiết rất tốt"),
    W("冷", "leng3", "LẠNH", "Lạnh", "Tính từ", "今天很冷。", "jin1 tian1 hen3 leng3 .", "Hôm nay rất lạnh"),
    W("热", "re4", "NHIỆT", "Nóng", "Tính từ", "今天太热了。", "jin1 tian1 tai4 re4 le5 .", "Hôm nay nóng quá"),
    W("下雨", "xia4 yu3", "HẠ VŨ", "Mưa", "Động từ", "明天下雨。", "ming2 tian1 xia4 yu3 .", "Ngày mai trời mưa"),
    W("很", "hen3", "HẾN", "Rất", "Phó từ", "我很高兴。", "wo3 hen3 gao1 xing4 .", "Tôi rất vui"),
    W("太", "tai4", "THÁI", "Quá, quá lắm", "Phó từ", "太好了！", "tai4 hao3 le5 !", "Tuyệt quá!"),
    W("怎么", "zen3 me5", "CHẾ MÔ", "Làm sao, như thế nào", "Đại từ", "你怎么去学校？", "ni3 zen3 me5 qu4 xue2 xiao4 ?", "Bạn đi trường bằng cách nào?"),
    W("怎么样", "zen3 me5 yang4", "CHẾ MÔ DƯƠNG", "Ra sao rồi", "Đại từ", "你今天怎么样？", "ni3 jin1 tian1 zen3 me5 yang4 ?", "Hôm nay bạn thế nào?")
  ]
};

hsk1["lesson-9"] = {
  title: "Động từ thường ngày",
  words: [
    W("听", "ting1", "THINH", "Nghe", "Động từ", "我听老师说话。", "wo3 ting1 lao3 shi1 shuo1 hua4 .", "Tôi nghe thầy nói chuyện"),
    W("说话", "shuo1 hua4", "THUYẾT HOẠ", "Nói chuyện", "Động từ", "我和同学说话。", "wo3 he2 tong2 xue2 shuo1 hua4 .", "Tôi nói chuyện với bạn học"),
    W("睡觉", "shui4 jiao4", "THỦY GIÁC", "Ngủ", "Động từ", "我十点睡觉。", "wo3 shi2 dian3 shui4 jiao4 .", "Lúc mười giờ tôi đi ngủ"),
    W("打电话", "da3 dian4 hua4", "ĐẢ ĐIỆN HOẠ", "Gọi điện thoại", "Động từ", "我打电话给朋友。", "wo3 da3 dian4 hua4 gei3 peng2 you5 .", "Tôi gọi điện cho bạn"),
    W("开", "kai1", "KHAI", "Lái (xe), mở", "Động từ", "他开车。", "ta1 kai1 che1 .", "Anh ấy lái xe"),
    W("坐", "zuo4", "TỌA", "Ngồi", "Động từ", "我坐在椅子上。", "wo3 zuo4 zai4 yi3 zi5 shang4 .", "Tôi ngồi trên ghế"),
    W("回", "hui2", "HỒI", "Quay về", "Động từ", "我回家。", "wo3 hui2 jia1 .", "Tôi về nhà"),
    W("看见", "kan4 jian4", "KHÁN KIẾN", "Nhìn thấy", "Động từ", "我看见猫了。", "wo3 kan4 jian4 mao1 le5 .", "Tôi nhìn thấy con mèo rồi")
  ]
};

hsk1["lesson-10"] = {
  title: "Đại từ nhân xưng",
  words: [
    W("我", "wo3", "NGÃ", "Tôi, tớ", "Đại từ", "我是学生。", "wo3 shi4 xue2 sheng5 .", "Tôi là học sinh"),
    W("你", "ni3", "NHĨ", "Bạn, cậu", "Đại từ", "你好吗？", "ni3 hao3 ma5 ?", "Bạn có khỏe không?"),
    W("他", "ta1", "THA", "Anh ấy, bạn ấy (nam)", "Đại từ", "他是老师。", "ta1 shi4 lao3 shi1 .", "Anh ấy là giáo viên"),
    W("她", "ta1", "THA", "Cô ấy, bạn ấy (nữ)", "Đại từ", "她是我的同学。", "ta1 shi4 wo3 de5 tong2 xue2 .", "Cô ấy là bạn học của tôi"),
    W("我们", "wo3 men5", "NGÃ MÔN", "Chúng tôi, chúng tớ", "Đại từ", "我们去学校。", "wo3 men5 qu4 xue2 xiao4 .", "Chúng tôi đi trường"),
    W("他们", "ta1 men5", "THA MÔN", "Họ", "Đại từ", "他们是中国人。", "ta1 men5 shi4 zhong1 guo2 .", "Họ là người Trung Quốc"),
    W("谁", "shei2", "THỪA", "Ai", "Đại từ", "他是谁？", "ta1 shi4 shei2 ?", "Anh ấy là ai?"),
    W("什么", "shen2 me5", "THẬP MÔ", "Cái gì", "Đại từ", "这是什么？", "zhe4 shi4 shen2 me5 ?", "Đây là cái gì?")
  ]
};

hsk1["lesson-11"] = {
  title: "Đồ vật quanh ta",
  words: [
    W("杯子", "bei1 zi5", "BÔI TỬ", "Cốc, ly", "Danh từ", "桌子上有一个杯子。", "zhuo1 zi5 shang4 you3 yi1 ge4 bei1 zi5 .", "Trên bàn có một cái cốc"),
    W("桌子", "zhuo1 zi5", "CHƯƠNG TỬ", "Cái bàn", "Danh từ", "这个桌子很大。", "zhe4 ge4 zhuo1 zi5 hen3 da4 .", "Cái bàn này rất lớn"),
    W("椅子", "yi3 zi5", "Ỷ TỬ", "Cái ghế", "Danh từ", "这里的椅子很多。", "zhe4 li3 de5 yi3 zi5 hen3 duo1 .", "Ở đây có nhiều ghế"),
    W("衣服", "yi1 fu5", "Y PHỤC", "Quần áo", "Danh từ", "这件衣服很漂亮。", "zhe4 jian4 yi1 fu5 hen3 piao4 liang4 .", "Bộ quần áo này rất đẹp"),
    W("钱", "qian2", "TIỀN", "Tiền", "Danh từ", "钱在桌子上。", "qian2 zai4 zhuo1 zi5 shang4 .", "Tiền ở trên bàn"),
    W("块", "kuai4", "KHOÁI", "Tệ, đồng (đơn vị tiền)", "Lượng từ", "这本书十块钱。", "zhe4 ben3 shu1 shi2 kuai4 qian2 .", "Quyển sách này mười tệ"),
    W("里", "li3", "LÝ", "Trong, ở trong", "Danh từ", "家里很冷。", "jia1 li3 hen3 leng3 .", "Trong nhà rất lạnh"),
    W("上", "shang4", "THƯỢNG", "Trên, ở trên", "Danh từ", "桌子上有一本书。", "zhuo1 zi5 shang4 you3 yi1 ben3 shu1 .", "Trên bàn có một quyển sách")
  ]
};

hsk1["lesson-12"] = {
  title: "Tính từ hay dùng",
  words: [
    W("大", "da4", "ĐẠI", "Lớn", "Tính từ", "这个学校很大。", "zhe4 ge4 xue2 xiao4 hen3 da4 .", "Trường này rất lớn"),
    W("小", "xiao3", "TIỂU", "Nhỏ", "Tính từ", "我的猫很小。", "wo3 de5 mao1 hen3 xiao3 .", "Con mèo của tôi rất nhỏ"),
    W("多", "duo1", "ĐA", "Nhiều", "Tính từ", "水果很多。", "shui3 guo3 hen3 duo1 .", "Trái cây thì nhiều"),
    W("少", "shao3", "THIỂU", "Ít", "Tính từ", "今天人很少。", "jin1 tian1 ren2 hen3 shao3 .", "Hôm nay người rất ít"),
    W("高兴", "gao1 xing4", "CAO HƯNG", "Vui mừng", "Tính từ", "认识你很高兴。", "ren4 shi5 ni3 hen3 gao1 xing4 .", "Rất vui khi được biết bạn"),
    W("漂亮", "piao4 liang4", "PHIÊU LIỆU", "Xinh đẹp", "Tính từ", "她很漂亮。", "ta1 hen3 piao4 liang4 .", "Cô ấy rất xinh"),
    W("贵", "gui4", "QUÝ", "Đắt", "Tính từ", "这个太贵了。", "zhe4 ge4 tai4 gui4 le5 .", "Cái này đắt quá"),
    W("忙", "mang2", "MANG", "Bận rộn", "Tính từ", "我很忙。", "wo3 hen3 mang2 .", "Tôi rất bận")
  ]
};

hsk1["lesson-13"] = {
  title: "Động từ & tồn tại",
  words: [
    W("是", "shi4", "THỊ", "Là, thì là", "Động từ", "他是我的朋友。", "ta1 shi4 wo3 de5 peng2 you5 .", "Anh ấy là bạn của tôi"),
    W("有", "you3", "HỮU", "Có, sở hữu", "Động từ", "我有很多书。", "wo3 you3 hen3 duo1 shu1 .", "Tôi có nhiều sách"),
    W("来", "lai2", "LAI", "Đến", "Động từ", "他明天来。", "ta1 ming2 tian1 lai2 .", "Anh ấy đến vào ngày mai"),
    W("去", "qu4", "KHỨ", "Đi", "Động từ", "我去商店。", "wo3 qu4 shang1 dian4 .", "Tôi đi cửa hàng"),
    W("想", "xiang3", "TƯỞNG", "Muốn", "Động từ", "我想喝茶。", "wo3 xiang3 he1 cha2 .", "Tôi muốn uống trà"),
    W("会", "hui4", "HỘI", "Biết, có thể", "Động từ", "我会说汉语。", "wo3 hui4 shuo1 han4 yu3 .", "Tôi biết nói tiếng Trung"),
    W("能", "neng2", "NĂNG", "Có thể", "Động từ", "你能来吗？", "ni3 neng2 lai2 ma5 ?", "Bạn đến được không?"),
    W("做", "zuo4", "TÁC", "Làm", "Động từ", "你做什么工作？", "ni3 zuo4 shen2 me5 gong1 zuo4 ?", "Bạn làm công việc gì?")
  ]
};

hsk1["lesson-14"] = {
  title: "Phụ từ & phủ định",
  words: [
    W("的", "de5", "ĐÍCH", "(Trợ từ sở hữu)", "Trợ từ", "这是我的书。", "zhe4 shi4 wo3 de5 shu1 .", "Đây là sách của tôi"),
    W("吗", "ma5", "MA", "(Trợ từ nghi vấn)", "Trợ từ", "你是学生吗？", "ni3 shi4 xue2 sheng5 ma5 ?", "Bạn là học sinh phải không?"),
    W("呢", "ne5", "NÍ", "(Trợ từ hỏi lại)", "Trợ từ", "我很好，你呢？", "wo3 hen3 hao3 , ni3 ne5 ?", "Tôi ổn, còn bạn?"),
    W("了", "le5", "LIỄU", "(Trợ từ hoàn thành)", "Trợ từ", "下雨了。", "xia4 yu3 le5 .", "Trời mưa rồi"),
    W("不", "bu2", "BẤT", "Không, chẳng", "Phó từ", "我不去。", "wo3 bu2 qu4 .", "Tôi không đi"),
    W("没", "mei2", "MẠT", "Chưa, không có", "Phó từ", "我没有钱。", "wo3 mei2 you3 qian2 .", "Tôi không có tiền"),
    W("也", "ye3", "DÃ", "Cũng", "Phó từ", "他也是学生。", "ta1 ye3 shi4 xue2 sheng5 .", "Anh ấy cũng là học sinh"),
    W("都", "dou1", "ĐÔ", "Đều, đều cả", "Phó từ", "我们都是学生。", "wo3 men5 dou1 shi4 xue2 sheng5 .", "Chúng tôi đều là học sinh")
  ]
};

hsk1["lesson-15"] = {
  title: "Từ hay gặp",
  words: [
    W("爱", "ai4", "ÁI", "Yêu", "Động từ", "我爱你。", "wo3 ai4 ni3 .", "Tôi yêu bạn"),
    W("请", "qing3", "THỈNH", "Mời, xin", "Động từ", "请坐。", "qing3 zuo4 .", "Mời ngồi"),
    W("喂", "wei4", "VI", "A-lô (khi gọi điện)", "Thán từ", "喂，你好！", "wei4 , ni3 hao3 !", "A-lô, xin chào!"),
    W("在", "zai4", "TẠI", "Ở, đang ở", "Động từ", "我在家里。", "wo3 zai4 jia1 li3 .", "Tôi ở trong nhà"),
    W("住", "zhu4", "TRỤ", "Cư trú, sống", "Động từ", "我住在中国。", "wo3 zhu4 zai4 zhong1 guo2 .", "Tôi sống ở Trung Quốc"),
    W("岁", "sui4", "TUỲ", "Tuổi", "Lượng từ", "我二十岁。", "wo3 er4 shi2 sui4 .", "Tôi hai mươi tuổi"),
    W("狗", "gou3", "CẨU", "Con chó", "Danh từ", "我家的狗很大。", "wo3 jia1 de5 gou3 hen3 da4 .", "Con chó nhà tôi rất to"),
    W("猫", "mao1", "MAO", "Con mèo", "Danh từ", "猫在椅子上。", "mao1 zai4 yi3 zi5 shang4 .", "Con mèo ở trên ghế"),
    W("医生", "yi1 sheng1", "Y SINH", "Bác sĩ", "Danh từ", "我妈妈是医生。", "wo3 ma1 ma5 shi4 yi1 sheng1 .", "Mẹ tôi là bác sĩ"),
    W("工作", "gong1 zuo4", "CÔNG TÁC", "Công việc, làm việc", "Danh từ", "我的工作很多。", "wo3 de5 gong1 zuo4 hen3 duo1 .", "Công việc của tôi rất nhiều")
  ]
};

/* ================= Các book khác — mỗi book 1 bài demo ================= */
const hsk2: Record<string, VocabLesson> = {};
hsk2["lesson-1"] = {
  title: "Bắt đầu HSK2",
  words: [
    W("正在", "zheng4 zai4", "CHÍNH TẠI", "Đang (diễn ra)", "Phó từ", "他正在学习。", "ta1 zheng4 zai4 xue2 xi2 .", "Anh ấy đang học"),
    W("可能", "ke3 neng2", "KHẢ NĂNG", "Có thể, khả năng", "Phó từ", "明天可能下雨。", "ming2 tian1 ke3 neng2 xia4 yu3 .", "Ngày mai có thể mưa"),
    W("虽然", "sui1 ran2", "TUY NHIÊN", "Tuy rằng", "Liên từ", "虽然很忙，我很高兴。", "sui1 ran2 hen3 mang2 , wo3 hen3 gao1 xing4 .", "Tuy bận, tôi vẫn rất vui"),
    W("但是", "dan4 shi4", "ĐẠN THỊ", "Nhưng", "Liên từ", "东西贵，但是很好。", "dong1 xi5 gui4 , dan4 shi4 hen3 hao3 .", "Đồ đắt, nhưng rất tốt"),
    W("因为", "yin1 wei4", "NHÂN VI", "Vì, bởi vì", "Liên từ", "我学习汉语，因为我爱中国。", "wo3 xue2 xi2 han4 yu3 , yin1 wei4 wo3 ai4 zhong1 guo2 .", "Tôi học tiếng Trung, vì tôi yêu Trung Quốc"),
    W("觉得", "jue2 de5", "GIÁC ĐẮC", "Cảm thấy", "Động từ", "我觉得很好。", "wo3 jue2 de5 hen3 hao3 .", "Tôi cảm thấy rất tốt")
  ]
};

const hsk3: Record<string, VocabLesson> = {};
hsk3["lesson-1"] = {
  title: "Nhịp sống hằng ngày",
  words: [
    W("马上", "ma3 shang4", "MÃ THƯỢNG", "Ngay lập tức", "Phó từ", "我马上来。", "wo3 ma3 shang4 lai2 .", "Tôi đến ngay"),
    W("世界", "shi4 jie4", "THẾ GIỚI", "Thế giới", "Danh từ", "世界很大。", "shi4 jie4 hen3 da4 .", "Thế giới rất rộng lớn"),
    W("帮助", "bang1 zhu4", "BANG TRỢ", "Giúp đỡ", "Động từ", "老师帮助我。", "lao3 shi1 bang1 zhu4 wo3 .", "Thầy giúp đỡ tôi"),
    W("故事", "gu4 shi5", "CỐ SỰ", "Câu chuyện", "Danh từ", "这个故事很有意思。", "zhe4 ge4 gu4 shi5 hen3 you3 yi4 si5 .", "Câu chuyện này rất thú vị"),
    W("机场", "ji1 chang3", "CƠ TRƯỜNG", "Sân bay", "Danh từ", "我去机场。", "wo3 qu4 ji1 chang3 .", "Tôi đi sân bay"),
    W("借", "jie4", "TÁ", "Mượn, cho vay", "Động từ", "我借一本书。", "wo3 jie4 yi1 ben3 shu1 .", "Tôi mượn một quyển sách")
  ]
};

const hsk4: Record<string, VocabLesson> = {};
hsk4["lesson-1"] = {
  title: "Hướng tới thành công",
  words: [
    W("成功", "cheng2 gong1", "THÀNH CÔNG", "Thành công", "Danh từ", "他获得了成功。", "ta1 huo4 de2 le5 cheng2 gong1 .", "Anh ấy đạt được thành công"),
    W("计划", "ji4 hua4", "KẾ HOẠCH", "Kế hoạch", "Danh từ", "我的计划很好。", "wo3 de5 ji4 hua4 hen3 hao3 .", "Kế hoạch của tôi rất tốt"),
    W("广告", "guang3 gao4", "QUẢNG CÁO", "Quảng cáo", "Danh từ", "这个广告很有名。", "zhe4 ge4 guang3 gao4 hen3 you3 ming2 .", "Quảng cáo này rất nổi tiếng"),
    W("提高", "ti2 gao1", "ĐỀ CAO", "Nâng cao", "Động từ", "我要提高汉语水平。", "wo3 yao4 ti2 gao1 han4 yu3 shui3 ping2 .", "Tôi muốn nâng cao trình độ tiếng Trung"),
    W("效果", "xiao4 guo3", "HIỆU QUẢ", "Hiệu quả", "Danh từ", "效果很好。", "xiao4 guo3 hen3 hao3 .", "Hiệu quả rất tốt"),
    W("竞争", "jing4 zheng1", "CỘNH TRANH", "Cạnh tranh", "Động từ", "竞争很厉害。", "jing4 zheng1 hen3 li4 hai5 .", "Sự cạnh tranh rất khốc liệt")
  ]
};

const hsk5: Record<string, VocabLesson> = {};
hsk5["lesson-1"] = {
  title: "Chủ đề xã hội",
  words: [
    W("主题", "zhu3 ti2", "CHỦ ĐỀ", "Chủ đề", "Danh từ", "这篇文章的主题很好。", "zhe4 pian1 wen2 zhang1 de5 zhu3 ti2 hen3 hao3 .", "Chủ đề bài viết này rất hay"),
    W("现象", "xian4 xiang4", "HIỆN TƯỢNG", "Hiện tượng", "Danh từ", "这是一种现象。", "zhe4 shi4 yi1 zhong3 xian4 xiang4 .", "Đây là một loại hiện tượng"),
    W("规定", "gui1 ding4", "QUY ĐỊNH", "Quy định", "Danh từ", "学校有新规定。", "xue2 xiao4 you3 xin1 gui1 ding4 .", "Trường có quy định mới"),
    W("调查", "diao4 cha2", "ĐIỀU TRA", "Điều tra, khảo sát", "Động từ", "我们做了一项调查。", "wo3 men5 zuo4 le5 yi1 xiang4 diao4 cha2 .", "Chúng tôi tiến hành một cuộc khảo sát"),
    W("体现", "ti3 xian4", "THỂ HIỆN", "Thể hiện", "Động từ", "这幅画体现了生活。", "zhe4 fu2 hua4 ti3 xian4 le5 sheng1 huo2 .", "Bức tranh này thể hiện cuộc sống")
  ]
};

const hsk6: Record<string, VocabLesson> = {};
hsk6["lesson-1"] = {
  title: "Ngôn ngữ tinh tế",
  words: [
    W("沉默", "chen2 mo4", "TRẦM MỘC", "Trầm mặc", "Tính từ", "他沉默了很久。", "ta1 chen2 mo4 le5 hen3 jiu3 .", "Anh ấy trầm mặc rất lâu"),
    W("素质", "su4 zhi4", "TỐ CHẤT", "Tố chất, phẩm chất", "Danh từ", "他的素质很好。", "ta1 de5 su4 zhi4 hen3 hao3 .", "Phẩm chất của anh ấy rất tốt"),
    W("深刻", "shen1 ke4", "THÂM KHẮC", "Sâu sắc", "Tính từ", "这个印象很深刻。", "zhe4 ge4 yin4 xiang4 hen3 shen1 ke4 .", "Ấn tượng này rất sâu sắc"),
    W("辩论", "bian4 lun4", "BIỆN LUẬN", "Tranh luận", "Động từ", "他们辩论了一个小时。", "ta1 men5 bian4 lun4 le5 yi1 ge4 xiao3 shi2 .", "Họ tranh luận một tiếng đồng hồ"),
    W("途径", "tu2 jing4", "ĐỒ KINH", "Con đường, biện pháp", "Danh từ", "学习是成功的途径。", "xue2 xi2 shi4 cheng2 gong1 de5 tu2 jing4 .", "Học tập là con đường dẫn đến thành công")
  ]
};

export const vocab: Record<string, Record<string, VocabLesson>> = {
  hsk1: hsk1,
  hsk2: hsk2,
  hsk3: hsk3,
  hsk4: hsk4,
  hsk5: hsk5,
  hsk6: hsk6
};
