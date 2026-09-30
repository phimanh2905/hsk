import { radicalsSchema } from "./schema";

/* Port 1:1 từ clone/js/data/radicals.js — 214 bộ thủ Kangxi (PLAN-04). */
export type Radical = { i: number; char: string; hanViet: string; meaning: string; strokes: number };

export const radicals: Radical[] = [
 {
  "i": 1,
  "char": "一",
  "hanViet": "Nhất",
  "meaning": "Một, thứ nhất",
  "strokes": 1
 },
 {
  "i": 2,
  "char": "丨",
  "hanViet": "Cổn",
  "meaning": "Nét sổ, đường thẳng đứng trên xuống dưới",
  "strokes": 1
 },
 {
  "i": 3,
  "char": "丶",
  "hanViet": "Chủ",
  "meaning": "Nét chấm, một điểm",
  "strokes": 1
 },
 {
  "i": 4,
  "char": "丿",
  "hanViet": "Phiệt",
  "meaning": "Nét phẩy, nét nghiêng từ phải qua trái, chỉ động tác",
  "strokes": 1
 },
 {
  "i": 5,
  "char": "乙",
  "hanViet": "Ất",
  "meaning": "Can thứ hai trong mười can (Giáp, Ất, Bính, Đinh…)",
  "strokes": 1
 },
 {
  "i": 6,
  "char": "亅",
  "hanViet": "Quyết",
  "meaning": "Nét sổ có móc, cái móc",
  "strokes": 1
 },
 {
  "i": 7,
  "char": "二",
  "hanViet": "Nhị",
  "meaning": "Số hai",
  "strokes": 2
 },
 {
  "i": 8,
  "char": "亠",
  "hanViet": "Đầu",
  "meaning": "Phần đầu, mái che trên cùng",
  "strokes": 2
 },
 {
  "i": 9,
  "char": "人",
  "hanViet": "Nhân",
  "meaning": "亻 Người, con người",
  "strokes": 2
 },
 {
  "i": 10,
  "char": "儿",
  "hanViet": "Nhân",
  "meaning": "儿 Chân người, người đi bước rộng",
  "strokes": 2
 },
 {
  "i": 11,
  "char": "入",
  "hanViet": "Nhập",
  "meaning": "Vào, đi vào",
  "strokes": 2
 },
 {
  "i": 12,
  "char": "八",
  "hanViet": "Bát",
  "meaning": "Số tám; chia tách hai bên",
  "strokes": 2
 },
 {
  "i": 13,
  "char": "冂",
  "hanViet": "Quynh",
  "meaning": "Vùng đất xa, khung viền rộng",
  "strokes": 2
 },
 {
  "i": 14,
  "char": "冖",
  "hanViet": "Mịch",
  "meaning": "Khăn trùm, cái che từ trên xuống",
  "strokes": 2
 },
 {
  "i": 15,
  "char": "冫",
  "hanViet": "Băng",
  "meaning": "Nước đóng băng, cái lạnh",
  "strokes": 2
 },
 {
  "i": 16,
  "char": "几",
  "hanViet": "Kỷ",
  "meaning": "Bàn nhỏ, chiếc ghế thấp",
  "strokes": 2
 },
 {
  "i": 17,
  "char": "凵",
  "hanViet": "Khảm",
  "meaning": "Cái hốc, chỗ trũng để đựng đồ",
  "strokes": 2
 },
 {
  "i": 18,
  "char": "刀",
  "hanViet": "Đao",
  "meaning": "Con dao, lưỡi dao (刂)",
  "strokes": 2
 },
 {
  "i": 19,
  "char": "力",
  "hanViet": "Lực",
  "meaning": "Sức mạnh, sức lực",
  "strokes": 2
 },
 {
  "i": 20,
  "char": "勹",
  "hanViet": "Bao",
  "meaning": "Bó lại, ôm trùm lấy",
  "strokes": 2
 },
 {
  "i": 21,
  "char": "匕",
  "hanViet": "Chủy",
  "meaning": "Muỗng, cái thìa; dao ngắn",
  "strokes": 2
 },
 {
  "i": 22,
  "char": "匚",
  "hanViet": "Phương",
  "meaning": "Cái rương, hộp đựng đồ",
  "strokes": 2
 },
 {
  "i": 23,
  "char": "匸",
  "hanViet": "Hệ",
  "meaning": "Cái che đậy, giấu kín",
  "strokes": 2
 },
 {
  "i": 24,
  "char": "十",
  "hanViet": "Thập",
  "meaning": "Số mười, đầy đủ",
  "strokes": 2
 },
 {
  "i": 25,
  "char": "卜",
  "hanViet": "Bốc",
  "meaning": "Bói toán, đoán điềm",
  "strokes": 2
 },
 {
  "i": 26,
  "char": "卩",
  "hanViet": "Tiết",
  "meaning": "Con dấu, ấn ký (lệnh bài)",
  "strokes": 2
 },
 {
  "i": 27,
  "char": "厂",
  "hanViet": "Hán",
  "meaning": "Vách núi, mái nhà lởm chởm",
  "strokes": 2
 },
 {
  "i": 28,
  "char": "厶",
  "hanViet": "Tư",
  "meaning": "Cái riêng, tư lợi",
  "strokes": 2
 },
 {
  "i": 29,
  "char": "又",
  "hanViet": "Hựu",
  "meaning": "Lại, lần nữa; bàn tay phải",
  "strokes": 2
 },
 {
  "i": 30,
  "char": "口",
  "hanViet": "Khẩu",
  "meaning": "Cái miệng, cửa",
  "strokes": 3
 },
 {
  "i": 31,
  "char": "囗",
  "hanViet": "Vi",
  "meaning": "Vây quanh, bao quanh",
  "strokes": 3
 },
 {
  "i": 32,
  "char": "土",
  "hanViet": "Thổ",
  "meaning": "Đất, mặt đất",
  "strokes": 3
 },
 {
  "i": 33,
  "char": "士",
  "hanViet": "Sĩ",
  "meaning": "Kẻ sĩ, học giả",
  "strokes": 3
 },
 {
  "i": 34,
  "char": "夂",
  "hanViet": "Trĩ",
  "meaning": "Đi mỗi ngày một chậm, từ trên xuống",
  "strokes": 3
 },
 {
  "i": 35,
  "char": "夊",
  "hanViet": "Tuy",
  "meaning": "Bước đi chậm chạp",
  "strokes": 3
 },
 {
  "i": 36,
  "char": "夕",
  "hanViet": "Tịch",
  "meaning": "Buổi tối, chiều muộn",
  "strokes": 3
 },
 {
  "i": 37,
  "char": "大",
  "hanViet": "Đại",
  "meaning": "To lớn, lớn lao",
  "strokes": 3
 },
 {
  "i": 38,
  "char": "女",
  "hanViet": "Nữ",
  "meaning": "Đàn bà, con gái",
  "strokes": 3
 },
 {
  "i": 39,
  "char": "子",
  "hanViet": "Tử",
  "meaning": "Con trai, đứa trẻ",
  "strokes": 3
 },
 {
  "i": 40,
  "char": "宀",
  "hanViet": "Miên",
  "meaning": "Mái nhà, mái che",
  "strokes": 3
 },
 {
  "i": 41,
  "char": "寸",
  "hanViet": "Thốn",
  "meaning": "Cái tấc, đơn vị đo rất nhỏ",
  "strokes": 3
 },
 {
  "i": 42,
  "char": "小",
  "hanViet": "Tiểu",
  "meaning": "Nhỏ, bé",
  "strokes": 3
 },
 {
  "i": 43,
  "char": "尢",
  "hanViet": "Uông",
  "meaning": "Đi khập khiễng, chân yếu",
  "strokes": 3
 },
 {
  "i": 44,
  "char": "尸",
  "hanViet": "Thi",
  "meaning": "Xác chết, thây",
  "strokes": 3
 },
 {
  "i": 45,
  "char": "屮",
  "hanViet": "Triệt",
  "meaning": "Cây mầm nhú lên khỏi đất",
  "strokes": 3
 },
 {
  "i": 46,
  "char": "山",
  "hanViet": "Sơn",
  "meaning": "Núi, đồi",
  "strokes": 3
 },
 {
  "i": 47,
  "char": "巛",
  "hanViet": "Xuyên",
  "meaning": "Dòng sông, con nước (川)",
  "strokes": 3
 },
 {
  "i": 48,
  "char": "工",
  "hanViet": "Công",
  "meaning": "Công việc, thợ thủ công",
  "strokes": 3
 },
 {
  "i": 49,
  "char": "己",
  "hanViet": "Kỷ",
  "meaning": "Bản thân mình",
  "strokes": 3
 },
 {
  "i": 50,
  "char": "巾",
  "hanViet": "Cân",
  "meaning": "Tấm khăn, mảnh vải",
  "strokes": 3
 },
 {
  "i": 51,
  "char": "干",
  "hanViet": "Can",
  "meaning": "Cái khiên; can thiệp; khô",
  "strokes": 3
 },
 {
  "i": 52,
  "char": "幺",
  "hanViet": "Yêu",
  "meaning": "Sợi chỉ nhỏ, nhỏ bé",
  "strokes": 3
 },
 {
  "i": 53,
  "char": "广",
  "hanViet": "Nghiễm",
  "meaning": "Nhà rộng trên núi, mái có điểm",
  "strokes": 3
 },
 {
  "i": 54,
  "char": "廴",
  "hanViet": "Dẫn",
  "meaning": "Bước dài, đi chậm bước rộng",
  "strokes": 3
 },
 {
  "i": 55,
  "char": "廾",
  "hanViet": "Củng",
  "meaning": "Hai tay nâng đỡ, dâng lên",
  "strokes": 3
 },
 {
  "i": 56,
  "char": "弋",
  "hanViet": "Dặc",
  "meaning": "Cây tên có dây bắn chim",
  "strokes": 3
 },
 {
  "i": 57,
  "char": "弓",
  "hanViet": "Cung",
  "meaning": "Cây cung để bắn",
  "strokes": 3
 },
 {
  "i": 58,
  "char": "彐",
  "hanViet": "Ký/kệ",
  "meaning": "Đầu con lợn, hình cái bát",
  "strokes": 3
 },
 {
  "i": 59,
  "char": "彡",
  "hanViet": "Sam",
  "meaning": "Họa tiết, hoa văn, nét lông",
  "strokes": 3
 },
 {
  "i": 60,
  "char": "彳",
  "hanViet": "Sách",
  "meaning": "Bước chân trái, đi từng bước nhỏ",
  "strokes": 3
 },
 {
  "i": 61,
  "char": "心",
  "hanViet": "Tâm",
  "meaning": "Trái tim, tâm trí",
  "strokes": 4
 },
 {
  "i": 62,
  "char": "戈",
  "hanViet": "Qua",
  "meaning": "Cây giáo, vũ khí cổ",
  "strokes": 4
 },
 {
  "i": 63,
  "char": "戶",
  "hanViet": "Hộ",
  "meaning": "Cánh cửa, gia đình",
  "strokes": 4
 },
 {
  "i": 64,
  "char": "手",
  "hanViet": "Thủ",
  "meaning": "Bàn tay (扌)",
  "strokes": 4
 },
 {
  "i": 65,
  "char": "支",
  "hanViet": "Chi",
  "meaning": "Cái cành, nhánh; chống đỡ",
  "strokes": 4
 },
 {
  "i": 66,
  "char": "攴",
  "hanViet": "Phộc",
  "meaning": "Gõ nhẹ, đánh bằng roi (攵)",
  "strokes": 4
 },
 {
  "i": 67,
  "char": "文",
  "hanViet": "Văn",
  "meaning": "Chữ viết, văn chương",
  "strokes": 4
 },
 {
  "i": 68,
  "char": "斗",
  "hanViet": "Đẩu",
  "meaning": "Cái đẩu đựng rượu, đơn vị đo",
  "strokes": 4
 },
 {
  "i": 69,
  "char": "斤",
  "hanViet": "Cân",
  "meaning": "Cây búa rìu; đơn vị cân",
  "strokes": 4
 },
 {
  "i": 70,
  "char": "方",
  "hanViet": "Phương",
  "meaning": "Hình vuông, phương hướng",
  "strokes": 4
 },
 {
  "i": 71,
  "char": "无",
  "hanViet": "Vô",
  "meaning": "Không có, chẳng",
  "strokes": 4
 },
 {
  "i": 72,
  "char": "日",
  "hanViet": "Nhật",
  "meaning": "Mặt trời, ngày",
  "strokes": 4
 },
 {
  "i": 73,
  "char": "曰",
  "hanViet": "Viết",
  "meaning": "Nói rằng, gọi là",
  "strokes": 4
 },
 {
  "i": 74,
  "char": "月",
  "hanViet": "Nguyệt",
  "meaning": "Mặt trăng, tháng",
  "strokes": 4
 },
 {
  "i": 75,
  "char": "木",
  "hanViet": "Mộc",
  "meaning": "Cái cây, gỗ",
  "strokes": 4
 },
 {
  "i": 76,
  "char": "欠",
  "hanViet": "Khiếm",
  "meaning": "Thiếu, khiếm khuyết; ngáp",
  "strokes": 4
 },
 {
  "i": 77,
  "char": "止",
  "hanViet": "Chỉ",
  "meaning": "Dừng lại, bước chân dừng",
  "strokes": 4
 },
 {
  "i": 78,
  "char": "歹",
  "hanViet": "Đãi",
  "meaning": "Xấu, ác; cốt xương gãy",
  "strokes": 4
 },
 {
  "i": 79,
  "char": "殳",
  "hanViet": "Thù",
  "meaning": "Cây giáo ngắn, vũ khí dài",
  "strokes": 4
 },
 {
  "i": 80,
  "char": "毋",
  "hanViet": "Vô",
  "meaning": "Đừng, chớ, cấm",
  "strokes": 4
 },
 {
  "i": 81,
  "char": "比",
  "hanViet": "Tỷ",
  "meaning": "So sánh, đôi bên kề nhau",
  "strokes": 4
 },
 {
  "i": 82,
  "char": "毛",
  "hanViet": "Mao",
  "meaning": "Lông, tóc mảnh",
  "strokes": 4
 },
 {
  "i": 83,
  "char": "氏",
  "hanViet": "Thị",
  "meaning": "Dòng họ, tên họ",
  "strokes": 4
 },
 {
  "i": 84,
  "char": "气",
  "hanViet": "Khí",
  "meaning": "Hơi thở, khí",
  "strokes": 4
 },
 {
  "i": 85,
  "char": "水",
  "hanViet": "Thủy",
  "meaning": "Nước (氵)",
  "strokes": 4
 },
 {
  "i": 86,
  "char": "火",
  "hanViet": "Hỏa",
  "meaning": "Lửa (灬)",
  "strokes": 4
 },
 {
  "i": 87,
  "char": "爪",
  "hanViet": "Trảo",
  "meaning": "Móng vuốt, bàn tay úp (爫)",
  "strokes": 4
 },
 {
  "i": 88,
  "char": "父",
  "hanViet": "Phụ",
  "meaning": "Bố, người cha",
  "strokes": 4
 },
 {
  "i": 89,
  "char": "爻",
  "hanViet": "Hào",
  "meaning": "Khe hở, hào của quẻ bói",
  "strokes": 4
 },
 {
  "i": 90,
  "char": "爿",
  "hanViet": "Tường",
  "meaning": "Nửa thân cây cắt dọc, mảnh gỗ",
  "strokes": 4
 },
 {
  "i": 91,
  "char": "片",
  "hanViet": "Phiến",
  "meaning": "Mảnh, phiến mỏng",
  "strokes": 4
 },
 {
  "i": 92,
  "char": "牙",
  "hanViet": "Nha",
  "meaning": "Răng, ngà",
  "strokes": 4
 },
 {
  "i": 93,
  "char": "牛",
  "hanViet": "Ngưu",
  "meaning": "Con trâu, con bò",
  "strokes": 4
 },
 {
  "i": 94,
  "char": "犬",
  "hanViet": "Khuyển",
  "meaning": "Con chó (犭)",
  "strokes": 4
 },
 {
  "i": 95,
  "char": "玄",
  "hanViet": "Huyền",
  "meaning": "Màu đen thẫm, sâu xa huyền bí",
  "strokes": 5
 },
 {
  "i": 96,
  "char": "玉",
  "hanViet": "Ngọc",
  "meaning": "Đá ngọc (王)",
  "strokes": 5
 },
 {
  "i": 97,
  "char": "瓜",
  "hanViet": "Qua",
  "meaning": "Trái dưa, quả bầu",
  "strokes": 5
 },
 {
  "i": 98,
  "char": "瓦",
  "hanViet": "Ngõa",
  "meaning": "Mảnh ngói, gốm nung",
  "strokes": 5
 },
 {
  "i": 99,
  "char": "甘",
  "hanViet": "Cam",
  "meaning": "Vị ngọt",
  "strokes": 5
 },
 {
  "i": 100,
  "char": "生",
  "hanViet": "Sinh",
  "meaning": "Sinh ra, sống",
  "strokes": 5
 },
 {
  "i": 101,
  "char": "用",
  "hanViet": "Dụng",
  "meaning": "Dùng, sử dụng",
  "strokes": 5
 },
 {
  "i": 102,
  "char": "田",
  "hanViet": "Điền",
  "meaning": "Cánh đồng, ruộng",
  "strokes": 5
 },
 {
  "i": 103,
  "char": "疋",
  "hanViet": "Thất",
  "meaning": "Cuộn vải; gốc chữ chân",
  "strokes": 5
 },
 {
  "i": 104,
  "char": "疒",
  "hanViet": "Nạch",
  "meaning": "Cái giường bệnh, bệnh tật",
  "strokes": 5
 },
 {
  "i": 105,
  "char": "癶",
  "hanViet": "Bát",
  "meaning": "Hai bước chân ngược nhau",
  "strokes": 5
 },
 {
  "i": 106,
  "char": "白",
  "hanViet": "Bạch",
  "meaning": "Màu trắng",
  "strokes": 5
 },
 {
  "i": 107,
  "char": "皮",
  "hanViet": "Bì",
  "meaning": "Da, vỏ bọc",
  "strokes": 5
 },
 {
  "i": 108,
  "char": "皿",
  "hanViet": "Mãnh",
  "meaning": "Cái đĩa, đồ đựng rộng miệng",
  "strokes": 5
 },
 {
  "i": 109,
  "char": "目",
  "hanViet": "Mục",
  "meaning": "Con mắt, nhìn",
  "strokes": 5
 },
 {
  "i": 110,
  "char": "矛",
  "hanViet": "Mâu",
  "meaning": "Cây mác, giáo dài",
  "strokes": 5
 },
 {
  "i": 111,
  "char": "矢",
  "hanViet": "Thỉ",
  "meaning": "Cây tên, mũi nhọn",
  "strokes": 5
 },
 {
  "i": 112,
  "char": "石",
  "hanViet": "Thạch",
  "meaning": "Đá, hòn đá",
  "strokes": 5
 },
 {
  "i": 113,
  "char": "示",
  "hanViet": "Thị",
  "meaning": "Bày tỏ, thần linh (礻)",
  "strokes": 5
 },
 {
  "i": 114,
  "char": "禸",
  "hanViet": "Nhựu",
  "meaning": "Dấu chân thú, vết lún",
  "strokes": 5
 },
 {
  "i": 115,
  "char": "禾",
  "hanViet": "Hòa",
  "meaning": "Cây lúa, cây ngũ cốc",
  "strokes": 5
 },
 {
  "i": 116,
  "char": "穴",
  "hanViet": "Huyệt",
  "meaning": "Cái hang, lỗ hổng",
  "strokes": 5
 },
 {
  "i": 117,
  "char": "立",
  "hanViet": "Lập",
  "meaning": "Đứng, dựng đứng",
  "strokes": 5
 },
 {
  "i": 118,
  "char": "竹",
  "hanViet": "Trúc",
  "meaning": "Cây tre, cây trúc (⺮)",
  "strokes": 6
 },
 {
  "i": 119,
  "char": "米",
  "hanViet": "Mễ",
  "meaning": "Hạt gạo",
  "strokes": 6
 },
 {
  "i": 120,
  "char": "糸",
  "hanViet": "Mịch",
  "meaning": "Sợi tơ, sợi chỉ nhỏ (纟)",
  "strokes": 6
 },
 {
  "i": 121,
  "char": "缶",
  "hanViet": "Phẫu",
  "meaning": "Bình đất nung, cái chum",
  "strokes": 6
 },
 {
  "i": 122,
  "char": "网",
  "hanViet": "Võng",
  "meaning": "Cái lưới (罒)",
  "strokes": 6
 },
 {
  "i": 123,
  "char": "羊",
  "hanViet": "Dương",
  "meaning": "Con dê, con cừu",
  "strokes": 6
 },
 {
  "i": 124,
  "char": "羽",
  "hanViet": "Vũ",
  "meaning": "Lông vũ, cánh chim",
  "strokes": 6
 },
 {
  "i": 125,
  "char": "老",
  "hanViet": "Lão",
  "meaning": "Già, người già",
  "strokes": 6
 },
 {
  "i": 126,
  "char": "而",
  "hanViet": "Nhi",
  "meaning": "Râu dài; và, mà",
  "strokes": 6
 },
 {
  "i": 127,
  "char": "耒",
  "hanViet": "Lỗi",
  "meaning": "Cái cày cổ",
  "strokes": 6
 },
 {
  "i": 128,
  "char": "耳",
  "hanViet": "Nhĩ",
  "meaning": "Cái tai",
  "strokes": 6
 },
 {
  "i": 129,
  "char": "聿",
  "hanViet": "Duật",
  "meaning": "Cây bút, nét viết",
  "strokes": 6
 },
 {
  "i": 130,
  "char": "肉",
  "hanViet": "Nhục",
  "meaning": "Thịt, da thịt (月)",
  "strokes": 6
 },
 {
  "i": 131,
  "char": "臣",
  "hanViet": "Thần",
  "meaning": "Bề tôi, kẻ hầu vua",
  "strokes": 6
 },
 {
  "i": 132,
  "char": "自",
  "hanViet": "Tự",
  "meaning": "Mình, tự nhiên; cái mũi",
  "strokes": 6
 },
 {
  "i": 133,
  "char": "至",
  "hanViet": "Chí",
  "meaning": "Đến, tới nơi",
  "strokes": 6
 },
 {
  "i": 134,
  "char": "臼",
  "hanViet": "Cữu",
  "meaning": "Cối giã gạo",
  "strokes": 6
 },
 {
  "i": 135,
  "char": "舌",
  "hanViet": "Thiệt",
  "meaning": "Cái lưỡi",
  "strokes": 6
 },
 {
  "i": 136,
  "char": "舛",
  "hanViet": "Suyễn",
  "meaning": "Hai bước chân xoay ngược nhau",
  "strokes": 6
 },
 {
  "i": 137,
  "char": "舟",
  "hanViet": "Chu",
  "meaning": "Cái thuyền",
  "strokes": 6
 },
 {
  "i": 138,
  "char": "艮",
  "hanViet": "Cấn",
  "meaning": "Cái cấn, quẻ Cấn; dừng lại",
  "strokes": 6
 },
 {
  "i": 139,
  "char": "色",
  "hanViet": "Sắc",
  "meaning": "Màu sắc, gương mặt",
  "strokes": 6
 },
 {
  "i": 140,
  "char": "艸",
  "hanViet": "Thảo",
  "meaning": "Cây cỏ (艹)",
  "strokes": 6
 },
 {
  "i": 141,
  "char": "虍",
  "hanViet": "Hổ",
  "meaning": "Hổ, báo; vệt hổ",
  "strokes": 6
 },
 {
  "i": 142,
  "char": "虫",
  "hanViet": "Trùng",
  "meaning": "Con sâu, con trùng",
  "strokes": 6
 },
 {
  "i": 143,
  "char": "血",
  "hanViet": "Huyết",
  "meaning": "Máu",
  "strokes": 6
 },
 {
  "i": 144,
  "char": "行",
  "hanViet": "Hành",
  "meaning": "Đi, hàng; đường đi",
  "strokes": 6
 },
 {
  "i": 145,
  "char": "衣",
  "hanViet": "Y",
  "meaning": "Quần áo (衤)",
  "strokes": 6
 },
 {
  "i": 146,
  "char": "襾",
  "hanViet": "Á",
  "meaning": "Cái che phủ xuống",
  "strokes": 6
 },
 {
  "i": 147,
  "char": "見",
  "hanViet": "Kiến",
  "meaning": "Nhìn, gặp (见)",
  "strokes": 7
 },
 {
  "i": 148,
  "char": "角",
  "hanViet": "Giác",
  "meaning": "Cái sừng, góc",
  "strokes": 7
 },
 {
  "i": 149,
  "char": "言",
  "hanViet": "Ngôn",
  "meaning": "Lời nói (讠)",
  "strokes": 7
 },
 {
  "i": 150,
  "char": "谷",
  "hanViet": "Cốc",
  "meaning": "Vực sâu, thung lũng; hạt",
  "strokes": 7
 },
 {
  "i": 151,
  "char": "豆",
  "hanViet": "Đậu",
  "meaning": "Đồ đựng thức ăn cổ; hạt đậu",
  "strokes": 7
 },
 {
  "i": 152,
  "char": "豕",
  "hanViet": "Thỉ",
  "meaning": "Con lợn",
  "strokes": 7
 },
 {
  "i": 153,
  "char": "豸",
  "hanViet": "Trãi",
  "meaning": "Con vật có mai, mèo rừng",
  "strokes": 7
 },
 {
  "i": 154,
  "char": "貝",
  "hanViet": "Bối",
  "meaning": "Con sò, tiền cổ (贝)",
  "strokes": 7
 },
 {
  "i": 155,
  "char": "赤",
  "hanViet": "Xích",
  "meaning": "Màu đỏ, trần trụi",
  "strokes": 7
 },
 {
  "i": 156,
  "char": "走",
  "hanViet": "Tẩu",
  "meaning": "Chạy, đi bộ",
  "strokes": 7
 },
 {
  "i": 157,
  "char": "足",
  "hanViet": "Túc",
  "meaning": "Bàn chân, đủ (⻊)",
  "strokes": 7
 },
 {
  "i": 158,
  "char": "身",
  "hanViet": "Thân",
  "meaning": "Thân thể",
  "strokes": 7
 },
 {
  "i": 159,
  "char": "車",
  "hanViet": "Xa",
  "meaning": "Cái xe (车)",
  "strokes": 7
 },
 {
  "i": 160,
  "char": "辛",
  "hanViet": "Tân",
  "meaning": "Vị cay; cực nhọc",
  "strokes": 7
 },
 {
  "i": 161,
  "char": "辰",
  "hanViet": "Thần",
  "meaning": "Thần; giờ Thìn, tinh tú",
  "strokes": 7
 },
 {
  "i": 162,
  "char": "辵",
  "hanViet": "Sước",
  "meaning": "Đi, bước đi (辶)",
  "strokes": 7
 },
 {
  "i": 163,
  "char": "邑",
  "hanViet": "Ấp",
  "meaning": "Thành ấp, đất thành (阝 phải)",
  "strokes": 7
 },
 {
  "i": 164,
  "char": "酉",
  "hanViet": "Dậu",
  "meaning": "Bình rượu; chi Dậu",
  "strokes": 7
 },
 {
  "i": 165,
  "char": "釆",
  "hanViet": "Biện",
  "meaning": "Phân biệt, nhận rõ vết thú",
  "strokes": 7
 },
 {
  "i": 166,
  "char": "里",
  "hanViet": "Lý",
  "meaning": "Làng xóm; đơn vị độ dài",
  "strokes": 7
 },
 {
  "i": 167,
  "char": "金",
  "hanViet": "Kim",
  "meaning": "Vàng, kim loại (钅)",
  "strokes": 8
 },
 {
  "i": 168,
  "char": "長",
  "hanViet": "Trường",
  "meaning": "Dài; trưởng, lớn tuổi (长)",
  "strokes": 8
 },
 {
  "i": 169,
  "char": "門",
  "hanViet": "Môn",
  "meaning": "Cánh cửa, cổng (门)",
  "strokes": 8
 },
 {
  "i": 170,
  "char": "阜",
  "hanViet": "Phụ",
  "meaning": "Gò đống, đất cao (阝 trái)",
  "strokes": 8
 },
 {
  "i": 171,
  "char": "隶",
  "hanViet": "Lệ",
  "meaning": "Kẻ nô lệ; thuộc về",
  "strokes": 8
 },
 {
  "i": 172,
  "char": "隹",
  "hanViet": "Chuy",
  "meaning": "Chim đuôi ngắn",
  "strokes": 8
 },
 {
  "i": 173,
  "char": "雨",
  "hanViet": "Vũ",
  "meaning": "Cơn mưa, cơi mưa",
  "strokes": 8
 },
 {
  "i": 174,
  "char": "靑",
  "hanViet": "Thanh",
  "meaning": "Màu xanh",
  "strokes": 8
 },
 {
  "i": 175,
  "char": "非",
  "hanViet": "Phi",
  "meaning": "Trái, sai; hai cánh chim bay",
  "strokes": 8
 },
 {
  "i": 176,
  "char": "面",
  "hanViet": "Diện",
  "meaning": "Gương mặt, mặt",
  "strokes": 9
 },
 {
  "i": 177,
  "char": "革",
  "hanViet": "Cách",
  "meaning": "Da thuộc; thay đổi",
  "strokes": 9
 },
 {
  "i": 178,
  "char": "韋",
  "hanViet": "Vi",
  "meaning": "Da thuộc mềm (韦)",
  "strokes": 9
 },
 {
  "i": 179,
  "char": "韭",
  "hanViet": "Cửu",
  "meaning": "Cây hẹ",
  "strokes": 9
 },
 {
  "i": 180,
  "char": "音",
  "hanViet": "Âm",
  "meaning": "Tiếng, âm thanh",
  "strokes": 9
 },
 {
  "i": 181,
  "char": "頁",
  "hanViet": "Hiệt",
  "meaning": "Đầu người (页)",
  "strokes": 9
 },
 {
  "i": 182,
  "char": "風",
  "hanViet": "Phong",
  "meaning": "Gió (风)",
  "strokes": 9
 },
 {
  "i": 183,
  "char": "飛",
  "hanViet": "Phi",
  "meaning": "Bay (飞)",
  "strokes": 9
 },
 {
  "i": 184,
  "char": "食",
  "hanViet": "Thực",
  "meaning": "Ăn, đồ ăn (饣)",
  "strokes": 9
 },
 {
  "i": 185,
  "char": "首",
  "hanViet": "Thủ",
  "meaning": "Cái đầu; đứng đầu",
  "strokes": 9
 },
 {
  "i": 186,
  "char": "香",
  "hanViet": "Hương",
  "meaning": "Mùi thơm",
  "strokes": 9
 },
 {
  "i": 187,
  "char": "馬",
  "hanViet": "Mã",
  "meaning": "Con ngựa (马)",
  "strokes": 10
 },
 {
  "i": 188,
  "char": "骨",
  "hanViet": "Cốt",
  "meaning": "Xương",
  "strokes": 10
 },
 {
  "i": 189,
  "char": "高",
  "hanViet": "Cao",
  "meaning": "Cao, cao thấp",
  "strokes": 10
 },
 {
  "i": 190,
  "char": "髟",
  "hanViet": "Bưu",
  "meaning": "Tóc dài rủ",
  "strokes": 10
 },
 {
  "i": 191,
  "char": "鬥",
  "hanViet": "Đấu",
  "meaning": "Hai tay đánh nhau, cãi nhau",
  "strokes": 10
 },
 {
  "i": 192,
  "char": "鬯",
  "hanViet": "Sưởng",
  "meaning": "Rượu thơ dùng để cúng",
  "strokes": 10
 },
 {
  "i": 193,
  "char": "鬲",
  "hanViet": "Cách",
  "meaning": "Cái đỉnh nồi đất chân cụt",
  "strokes": 10
 },
 {
  "i": 194,
  "char": "鬼",
  "hanViet": "Quỷ",
  "meaning": "Con quỷ, hồn ma",
  "strokes": 10
 },
 {
  "i": 195,
  "char": "魚",
  "hanViet": "Ngư",
  "meaning": "Con cá (鱼)",
  "strokes": 11
 },
 {
  "i": 196,
  "char": "鳥",
  "hanViet": "Điểu",
  "meaning": "Con chim (鸟)",
  "strokes": 11
 },
 {
  "i": 197,
  "char": "鹵",
  "hanViet": "Lỗ",
  "meaning": "Muối mặn, đất mặn",
  "strokes": 11
 },
 {
  "i": 198,
  "char": "鹿",
  "hanViet": "Lộc",
  "meaning": "Con hươu, con nai",
  "strokes": 11
 },
 {
  "i": 199,
  "char": "麥",
  "hanViet": "Mạch",
  "meaning": "Cây lúa mạch (麦)",
  "strokes": 11
 },
 {
  "i": 200,
  "char": "麻",
  "hanViet": "Ma",
  "meaning": "Cây gai dầu, tơ gai",
  "strokes": 11
 },
 {
  "i": 201,
  "char": "黃",
  "hanViet": "Hoàng",
  "meaning": "Màu vàng (黄)",
  "strokes": 12
 },
 {
  "i": 202,
  "char": "黍",
  "hanViet": "Thử",
  "meaning": "Cây kê, hạt kê",
  "strokes": 12
 },
 {
  "i": 203,
  "char": "黑",
  "hanViet": "Hắc",
  "meaning": "Màu đen",
  "strokes": 12
 },
 {
  "i": 204,
  "char": "黹",
  "hanViet": "Chỉ",
  "meaning": "Thêu, đính cúc",
  "strokes": 12
 },
 {
  "i": 205,
  "char": "黽",
  "hanViet": "Mãnh",
  "meaning": "Con ếch nhái (黾)",
  "strokes": 13
 },
 {
  "i": 206,
  "char": "鼎",
  "hanViet": "Đỉnh",
  "meaning": "Cái đỉnh ba chân đun nấu",
  "strokes": 13
 },
 {
  "i": 207,
  "char": "鼓",
  "hanViet": "Cổ",
  "meaning": "Cái trống",
  "strokes": 13
 },
 {
  "i": 208,
  "char": "鼠",
  "hanViet": "Thử",
  "meaning": "Con chuột",
  "strokes": 13
 },
 {
  "i": 209,
  "char": "鼻",
  "hanViet": "Tị",
  "meaning": "Cái mũi",
  "strokes": 14
 },
 {
  "i": 210,
  "char": "齊",
  "hanViet": "Tề",
  "meaning": "Đều đắn, thẳng hàng (齐)",
  "strokes": 14
 },
 {
  "i": 211,
  "char": "齒",
  "hanViet": "Xỉ",
  "meaning": "Răng (齿)",
  "strokes": 15
 },
 {
  "i": 212,
  "char": "龍",
  "hanViet": "Long",
  "meaning": "Con rồng (龙)",
  "strokes": 16
 },
 {
  "i": 213,
  "char": "龜",
  "hanViet": "Quy",
  "meaning": "Con rùa (龟)",
  "strokes": 16
 },
 {
  "i": 214,
  "char": "龠",
  "hanViet": "Dược",
  "meaning": "Sáo ngang, ống sáo cổ",
  "strokes": 17
 }
];

// zod validate (pattern Task 7) — ném lỗi nếu dữ liệu port sai
radicalsSchema.parse(radicals);
