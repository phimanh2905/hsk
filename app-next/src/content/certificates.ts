/* Nhai HSK — SP1: dữ liệu Luyện thi chứng chỉ (port từ clone/js/data/certificates.js — UI-only, đúng số liệu SPEC-07). */

export type CertificateCard = { logo: string; name: string; zh: string; desc: string };

export const certificateData: { hsk: CertificateCard[]; hskk: CertificateCard[] } = {
  hsk: [
    {
      logo: "H1", name: "HSK 1", zh: "汉语水平考试 一级",
      desc: "500 từ, 300 chữ Hán — nhập môn: chào hỏi, giới thiệu bản thân, sinh hoạt cơ bản.",
    },
    {
      logo: "H2", name: "HSK 2", zh: "汉语水平考试 二级",
      desc: "1.272 từ, 600 chữ Hán — hội thoại đơn giản về đời sống hằng ngày.",
    },
    {
      logo: "H3", name: "HSK 3", zh: "汉语水平考试 三级",
      desc: "2.245 từ, 900 chữ Hán — hoàn thành bậc sơ đẳng, tự tin với chủ đề quen thuộc.",
    },
    {
      logo: "H4", name: "HSK 4", zh: "汉语水平考试 四级",
      desc: "3.245 từ, 1.200 chữ Hán — mở đầu bậc trung đẳng, trao đổi học tập và công việc.",
    },
    {
      logo: "H5", name: "HSK 5", zh: "汉语水平考试 五级",
      desc: "4.316 từ, 1.500 chữ Hán — đọc báo, xem phim, thảo luận có chiều sâu.",
    },
    {
      logo: "H6", name: "HSK 6", zh: "汉语水平考试 六级",
      desc: "5.456 từ, 1.800 chữ Hán — hoàn thành bậc trung đẳng, diễn đạt thành thạo.",
    },
    {
      logo: "7-9", name: "HSK 7–9", zh: "汉语水平考试 七至九级",
      desc: "11.092 từ, 3.000 chữ Hán — bậc cao đẳng: một bài thi chung xếp cấp 7/8/9, đủ 5 kỹ năng nghe nói đọc viết dịch.",
    },
  ],
  hskk: [
    {
      logo: "K1", name: "HSKK Sơ cấp", zh: "汉语水平口语考试 初级",
      desc: "Hỏi đáp và kể chuyện ngắn với vốn từ nền tảng — phù hợp trình độ HSK 1–2.",
    },
    {
      logo: "K2", name: "HSKK Trung cấp", zh: "汉语水平口语考试 中级",
      desc: "Nghe rồi thuật lại, miêu tả tranh, trả lời câu hỏi — phù hợp trình độ HSK 3–4.",
    },
    {
      logo: "K3", name: "HSKK Cao cấp", zh: "汉语水平口语考试 高级",
      desc: "Thuật lại đoạn dài, đọc thành tiếng, trình bày quan điểm — phù hợp trình độ HSK 5–6.",
    },
  ],
};
