/* Nhai HSK clone — PLAN-21: dữ liệu lộ trình pinyin 8 buổi (roadmap-pinyin.html timeline + roadmap-session.html).
   window.NHAI_DATA.roadmap.pinyin.sessions[8] */
(function () {
  "use strict";
  window.NHAI_DATA = window.NHAI_DATA || {};

  window.NHAI_DATA.roadmap = window.NHAI_DATA.roadmap || {};
  window.NHAI_DATA.roadmap.pinyin = {
    sessions: [
      {
        n: 1,
        title: "4 thanh cơ bản",
        minutes: 15,
        desc: "Ā á ǎ à — bốn thanh điệu nền tảng của tiếng Trung. Nắm chắc buổi này thì mọi buổi sau đều dễ.",
        learn: [
          { tone: "ā", name: "Thanh ngang (thanh 1)", detail: "Đọc cao và đều, không lên không xuống — như hát một nốt dài.", ex: { hanzi: "妈", pinyin: "mā", meaning: "mẹ" } },
          { tone: "á", name: "Thanh sắc (thanh 2)", detail: "Giọng đi lên từ vừa phải lên cao — giống câu hỏi “hả?”.", ex: { hanzi: "麻", pinyin: "má", meaning: "gai dầu" } },
          { tone: "ǎ", name: "Thanh hỏi (thanh 3)", detail: "Hạ xuống thấp rồi hơi vổ lên lại — dấu rơi như chữ ả tiếng Việt.", ex: { hanzi: "马", pinyin: "mǎ", meaning: "con ngựa" } },
          { tone: "à", name: "Thanh huyền (thanh 4)", detail: "Giọng rơi xuống nhanh và dứt khoát — như khi mắng người khác.", ex: { hanzi: "骂", pinyin: "mà", meaning: "mắng" } }
        ],
        cards: [
          { hanzi: "妈", pinyin: "mā", hv: "Mã", meaning: "mẹ" },
          { hanzi: "麻", pinyin: "má", hv: "Ma", meaning: "gai dầu" },
          { hanzi: "马", pinyin: "mǎ", hv: "Mã", meaning: "con ngựa" },
          { hanzi: "骂", pinyin: "mà", hv: "Mạ", meaning: "mắng, chửi" },
          { hanzi: "猫", pinyin: "māo", hv: "Mão", meaning: "con mèo" },
          { hanzi: "帽", pinyin: "mào", hv: "Mạo", meaning: "cái mũ" }
        ],
        quiz: [
          { q: "Thanh sắc (thanh 2) có dấu như thế nào?", options: ["Dấu huyền (`)", "Dấu sắc (´)", "Dấu hỏi (˘)", "Không có dấu"], answer: 1, explain: "Thanh 2 là dấu sắc — giọng đi lên, ví dụ má." },
          { q: "Từ 马 (con ngựa) được đọc với thanh nào?", options: ["Thanh ngang", "Thanh hỏi", "Thanh sắc", "Thanh huyền"], answer: 1, explain: "马 là mǎ — thanh hỏi (thanh 3)." }
        ],
        test: [
          { q: "Bốn thanh cơ bản của tiếng Trung là…", options: ["ā á ǎ à", "a á à ǎ", "ā ǎ á à", "a ā à á"], answer: 0, explain: "Thứ tự chuẩn: ngang ā, sắc á, hỏi ǎ, huyền à." },
          { prompt: "Viết pinyin có dấu thanh của 妈 (mẹ).", answer: "mā" }
        ]
      },
      {
        n: 2,
        title: "Thanh biến đổi",
        minutes: 18,
        desc: "Quy tắc đặt thanh: hai thanh 3 liền nhau, 不 và 一 khi nào đọc thay đổi.",
        learn: [
          { title: "Hai thanh 3 liền nhau", detail: "Khi hai âm thanh 3 đứng cạnh nhau, thanh trước đọc thành thanh 2: nǐ + hǎo → ní hǎo (你好). Vẫn viết dấu hỏi, chỉ đổi khi đọc." },
          { title: "不 đổi thanh", detail: "不 gốc là bù (thanh 4), nhưng đứng trước một âm thanh 4 thì đọc thành thanh 2: 不是 đọc bú shì, 不是的 đọc bú shì de." },
          { title: "一 đổi thanh", detail: "一 gốc là yī (thanh 1). Trước thanh 4 đọc thành thanh 2: 一个 đọc yí gè; trước thanh 1/2/3 đọc thành thanh 4: 一天 đọc yì tiān." }
        ],
        cards: [
          { hanzi: "你", pinyin: "nǐ", hv: "Nĩ", meaning: "bạn" },
          { hanzi: "不", pinyin: "bù", hv: "Bất", meaning: "không" },
          { hanzi: "一", pinyin: "yī", hv: "Nhất", meaning: "một" },
          { hanzi: "你好", pinyin: "nǐ hǎo", hv: "Nĩ Hảo", meaning: "xin chào" },
          { hanzi: "不是", pinyin: "bú shì", hv: "Bất Thị", meaning: "không phải" },
          { hanzi: "一起", pinyin: "yì qǐ", hv: "Nhất Khởi", meaning: "cùng nhau" }
        ],
        quiz: [
          { q: "不 đứng trước một âm thanh 4 thì đọc thế nào?", options: ["bù (giữ nguyên)", "bú (thành thanh 2)", "bu (thanh nhẹ)", "bū (thanh 1)"], answer: 1, explain: "Trước thanh 4, 不 đọc thành bú — ví dụ 不是 bú shì." },
          { q: "Hai âm thanh 3 đứng cạnh nhau thì…", options: ["Cả hai giữ thanh 3", "Thanh trước đọc thành thanh 2", "Thanh sau đọc thành thanh 2", "Cả hai thành thanh 4"], answer: 1, explain: "Thanh trước biến thành thanh 2: nǐ hǎo → ní hǎo." }
        ],
        test: [
          { q: "Từ 一个 (một cái) được đọc là…", options: ["yī gè", "yí gè", "yì gè", "yī ge"], answer: 1, explain: "一 trước thanh 4 (gè) đọc thành yí." },
          { prompt: "Viết pinyin của 不是 khi đọc theo quy tắc biến điệu.", answer: "bú shì" }
        ]
      },
      {
        n: 3,
        title: "Nguyên âm & phụ âm",
        minutes: 20,
        desc: "Bảng 21 nguyên âm (vận mẫu) và các nhóm phụ âm (thanh mẫu) — xương sống của pinyin.",
        learn: [
          { title: "Vận mẫu đơn (6 âm)", detail: "a o e i u ü — sáu nguyên âm đơn tạo nền cho mọi vần. ü phát âm như “iu” môi tròn: 鱼 yú (con cá)." },
          { title: "Vận mẫu ghép", detail: "Hai ba nguyên âm ghép lại: ai ei ao ou (hai nhận dấu nếu có a), ia ua uo üe…, và vần đuôi -n / -ng: an ang en eng ong." },
          { title: "Nhóm thanh mẫu môi và đầu lưỡi", detail: "Nhóm môi: b p m f — môi bật hơi. Nhóm đầu lưỡi: d t n l — đầu lưỡi chạm nước." },
          { title: "Nhóm thanh mẫu mặt lưỡi j q x", detail: "j q x luôn đi với i hoặc ü, và khi đi với ü thì ü mất hai chấm: 去 qù, 家 jiā." }
        ],
        cards: [
          { hanzi: "爱", pinyin: "ài", hv: "Ái", meaning: "yêu" },
          { hanzi: "飞", pinyin: "fēi", hv: "Phi", meaning: "bay" },
          { hanzi: "猫", pinyin: "māo", hv: "Mão", meaning: "con mèo" },
          { hanzi: "头", pinyin: "tóu", hv: "Đầu", meaning: "cái đầu" },
          { hanzi: "家", pinyin: "jiā", hv: "Gia", meaning: "nhà, gia đình" },
          { hanzi: "星", pinyin: "xīng", hv: "Tinh", meaning: "ngôi sao" }
        ],
        quiz: [
          { q: "Tiếng Trung chuẩn có bao nhiêu vận mẫu đơn?", options: ["4", "5", "6", "7"], answer: 2, explain: "Sáu vận mẫu đơn: a o e i u ü." },
          { q: "Âm nào thuộc nhóm thanh mẫu mặt lưỡi?", options: ["b", "m", "q", "t"], answer: 2, explain: "Nhóm mặt lưỡi là j q x — luôn đi với i/ü." }
        ],
        test: [
          { q: "Vận mẫu đơn gồm những âm nào?", options: ["a o e i u ü", "b p m f", "ai ei ui", "an en in"], answer: 0, explain: "Vận mẫu đơn là 6 nguyên âm a o e i u ü." },
          { prompt: "Viết pinyin của 爱 (yêu).", answer: "ài" }
        ]
      },
      {
        n: 4,
        title: "Tổng hợp âm tiết",
        minutes: 20,
        desc: "Ghép âm tiết: thanh mẫu + vận mẫu + thanh điệu, và cách viết khi i/u/ü đứng đầu.",
        learn: [
          { title: "Cấu trúc âm tiết", detail: "Một âm tiết đầy đủ = thanh mẫu (phụ âm đầu) + vận mẫu (vần) + thanh điệu. Ví dụ: m + ā + thanh 1 = mā (妈)." },
          { title: "Âm tiết không có thanh mẫu", detail: "Nhiều vần tự đứng thành âm tiết: 啊 ā, 鹅 é, 爱 ài, 安 ān — không cần phụ âm đầu." },
          { title: "i / u / ü đứng đầu", detail: "Khi không có thanh mẫu, i → yi, u → wu, ü → yu: 医 yī, 五 wǔ, 鱼 yú." }
        ],
        cards: [
          { hanzi: "妈", pinyin: "mā", hv: "Mã", meaning: "mẹ" },
          { hanzi: "家", pinyin: "jiā", hv: "Gia", meaning: "nhà" },
          { hanzi: "学", pinyin: "xué", hv: "Học", meaning: "học" },
          { hanzi: "好", pinyin: "hǎo", hv: "Hảo", meaning: "tốt" },
          { hanzi: "中", pinyin: "zhōng", hv: "Trung", meaning: "trung, ở giữa" },
          { hanzi: "国", pinyin: "guó", hv: "Quốc", meaning: "nước" }
        ],
        quiz: [
          { q: "Một âm tiết đầy đủ gồm…", options: ["Thanh + vần", "Thanh mẫu + vận mẫu + thanh điệu", "Chỉ vận mẫu", "Hai vận mẫu ghép"], answer: 1, explain: "Thanh mẫu + vận mẫu + thanh điệu, ví dụ m-ā-1 = mā." },
          { q: "Khi i đứng đầu âm tiết (không có thanh mẫu) viết thành…", options: ["yi", "ji", "li", "i"], answer: 0, explain: "i đầu âm tiết viết thành yi: 医 yī." }
        ],
        test: [
          { q: "mā được ghép từ…", options: ["Thanh mẫu m + vận mẫu a + thanh 1", "Vận mẫu m + a", "Hai vận mẫu", "Không ghép được"], answer: 0, explain: "m là thanh mẫu, a là vận mẫu, dấu ngang là thanh 1." },
          { prompt: "Ghép thanh mẫu zh + vận mẫu ōng + thanh 1 — viết pinyin của 中.", answer: "zhōng" }
        ]
      },
      {
        n: 5,
        title: "Dấu thanh",
        minutes: 15,
        desc: "Dấu thanh đặt ở đâu trên vần và quy tắc trả dấu khi có nhiều nguyên âm.",
        learn: [
          { title: "Dấu đặt trên nguyên âm chính", detail: "Có a thì a nhận dấu: hǎo. Không có a thì o hoặc e nhận: gōu (dấu ở o), méi (dấu ở e). Nguyên âm chính là âm mở miệng nhất." },
          { title: "Quy tắc iu / ui", detail: "iu và ui thì dấu trả về âm cuối: niù → liù (sáu), huì (biết)." },
          { title: "i mang dấu bỏ chấm", detail: "Khi i mang dấu thanh thì bỏ chấm: nǐ (không viết nǐ̇)." }
        ],
        cards: [
          { hanzi: "好", pinyin: "hǎo", hv: "Hảo", meaning: "tốt" },
          { hanzi: "们", pinyin: "men", hv: "Môn", meaning: "thanh nhẹ, số nhiều" },
          { hanzi: "妈妈", pinyin: "māma", hv: "Mã Ma", meaning: "mẹ" },
          { hanzi: "谢谢", pinyin: "xièxie", hv: "Tạ Tạ", meaning: "cảm ơn" },
          { hanzi: "对", pinyin: "duì", hv: "Đối", meaning: "đúng" },
          { hanzi: "六", pinyin: "liù", hv: "Lục", meaning: "sáu" }
        ],
        quiz: [
          { q: "Vần hao mang thanh 3 viết thế nào?", options: ["hāo", "háo", "hǎo", "hào"], answer: 2, explain: "Có a nên a nhận dấu hỏi: hǎo." },
          { q: "Khi i mang dấu thanh thì…", options: ["Giữ hai chấm", "Bỏ chấm của i", "Viết thành ü", "Không đánh dấu được"], answer: 1, explain: "i mang dấu thì bỏ chấm: nǐ, xǐ." }
        ],
        test: [
          { q: "Trong liù (sáu), dấu thanh đặt trên i vì…", options: ["i luôn nhận dấu", "iu/ui trả dấu về âm cuối", "u không được nhận dấu", "ngẫu nhiên"], answer: 1, explain: "Quy tắc iu: dấu rơi về cuối — liù." },
          { prompt: "Viết pinyin có dấu của 好 (tốt).", answer: "hǎo" }
        ]
      },
      {
        n: 6,
        title: "Luyện đọc",
        minutes: 20,
        desc: "Đọc câu ngắn: đọc trọn âm tiết, ngữ điệu câu hỏi đi lên, câu khẳng định đi xuống.",
        learn: [
          { title: "Đọc trọn âm tiết", detail: "Mỗi chữ Hán là một âm tiết, đọc dứt khoát, không nối vần như tiếng Việt: nǐ hǎo là hai âm riêng." },
          { title: "Ngữ điệu câu hỏi", detail: "Câu hỏi có 吗 (ma) cuối câu thường ngửng nhẹ lên ở cuối dù các thanh giữ nguyên dấu." },
          { title: "Ngữ điệu câu khẳng định", detail: "Câu khẳng định kết thúc đi xuống, thanh cuối đọc rõ và hơi nặng." }
        ],
        cards: [
          { hanzi: "你好", pinyin: "nǐ hǎo", hv: "Nĩ Hảo", meaning: "xin chào" },
          { hanzi: "谢谢", pinyin: "xièxie", hv: "Tạ Tạ", meaning: "cảm ơn" },
          { hanzi: "再见", pinyin: "zàijiàn", hv: "Tái Kiến", meaning: "tạm biệt" },
          { hanzi: "我", pinyin: "wǒ", hv: "Ngã", meaning: "tôi" },
          { hanzi: "爱", pinyin: "ài", hv: "Ái", meaning: "yêu" },
          { hanzi: "吗", pinyin: "ma", hv: "Ma", meaning: "trợ từ hỏi" }
        ],
        quiz: [
          { q: "Câu hỏi kết thúc bằng 吗 thường đọc…", options: ["Đi xuống nặng", "Ngửng nhẹ lên", "Thanh nặng", "Thanh liệt"], answer: 1, explain: "Cuối câu hỏi ngửng nhẹ lên, ví dụ Nǐ hǎo ma?" },
          { q: "Zàijiàn nghĩa là…", options: ["Xin chào", "Cảm ơn", "Tạm biệt", "Xin lỗi"], answer: 2, explain: "再见 zàijiàn — hẹn gặp lại." }
        ],
        test: [
          { q: "Wǒ ài nǐ nghĩa là…", options: ["Bạn yêu tôi", "Tôi yêu bạn", "Chúng ta yêu nhau", "Ai yêu bạn"], answer: 1, explain: "我 wǒ = tôi, 爱 ài = yêu, 你 nǐ = bạn." },
          { prompt: "Viết pinyin có dấu của 谢谢 (cảm ơn).", answer: "xièxie" }
        ]
      },
      {
        n: 7,
        title: "Ngữ pháp cơ bản",
        minutes: 20,
        desc: "Trợ từ, mạo từ (lượng từ) và trật tự câu S-V-O trong tiếng Trung.",
        learn: [
          { title: "Trợ từ sở hữu 的", detail: "的 (de, thanh nhẹ) gắn sau đại từ/danh từ để sở hữu: 我的书 wǒ de shū — sách của tôi." },
          { title: "Trợ từ hỏi 吗", detail: "Thêm 吗 (ma) vào cuối câu khẳng định để thành câu hỏi có/không: 你是学生吗? — Bạn là học sinh à?" },
          { title: "Mạo từ và lượng từ", detail: "Tiếng Trung không có a/the; thay vào đó là lượng từ đứng trước danh từ khi đếm: 一个 (một cái), 两本 (hai cuốn). 个 là lượng từ dùng chung phổ biến nhất." }
        ],
        cards: [
          { hanzi: "的", pinyin: "de", hv: "Đích", meaning: "trợ từ sở hữu" },
          { hanzi: "吗", pinyin: "ma", hv: "Ma", meaning: "trợ từ hỏi" },
          { hanzi: "个", pinyin: "gè", hv: "Cá", meaning: "lượng từ (cái)" },
          { hanzi: "我", pinyin: "wǒ", hv: "Ngã", meaning: "tôi" },
          { hanzi: "是", pinyin: "shì", hv: "Thị", meaning: "là" },
          { hanzi: "他", pinyin: "tā", hv: "Tha", meaning: "anh ấy, nó" }
        ],
        quiz: [
          { q: "Trợ từ 的 dùng để…", options: ["Hỏi", "Sở hữu / bổ nghĩa", "Kết thúc câu hỏi", "Đếm"], answer: 1, explain: "的 tạo sở hữu: 我的 — của tôi." },
          { q: "Trật tự câu cơ bản tiếng Trung là…", options: ["S-O-V", "S-V-O", "V-S-O", "O-S-V"], answer: 1, explain: "Chủ ngữ — động từ — tân ngữ, giống tiếng Việt." }
        ],
        test: [
          { q: "Trong 这是我的书, trợ từ 的 có tác dụng gì?", options: ["Nghi vấn", "Sở hữu (của tôi)", "Số nhiều", "Phủ định"], answer: 1, explain: "我的 = của tôi — 的 chỉ sở hữu." },
          { prompt: "Viết pinyin (thanh nhẹ, không dấu) của trợ từ sở hữu 的.", answer: "de" }
        ]
      },
      {
        n: 8,
        title: "Bài tổng kết",
        minutes: 25,
        desc: "Ôn toàn bộ: 4 thanh, quy tắc biến điệu, thanh mẫu — vận mẫu và ngữ pháp cơ bản.",
        learn: [
          { title: "Ôn 4 thanh", detail: "ā ngang — á sắc — ǎ hỏi — à huyền. Hai thanh 3 liền đổi trước thành thanh 2; 不, 一 đổi theo âm sau." },
          { title: "Ôn thanh mẫu và vận mẫu", detail: "Ghi nhớ các nhóm thanh mẫu (b p m f, d t n l, j q x, zh ch sh r, z c s, g k h) và vận mẫu đơn a o e i u ü." },
          { title: "Ôn dấu thanh và ngữ pháp", detail: "Dấu rơi về nguyên âm chính (a → o/e, iu/ui về cuối), i mang dấu bỏ chấm; câu S-V-O, 的 sở hữu, 吗 hỏi, 个 đếm." }
        ],
        cards: [
          { hanzi: "学生", pinyin: "xuésheng", hv: "Học Sinh", meaning: "học sinh" },
          { hanzi: "中文", pinyin: "zhōngwén", hv: "Trung Văn", meaning: "tiếng Trung" },
          { hanzi: "老师", pinyin: "lǎoshī", hv: "Lão Sư", meaning: "giáo viên" },
          { hanzi: "同学", pinyin: "tóngxué", hv: "Đồng Học", meaning: "bạn cùng lớp" },
          { hanzi: "谢谢", pinyin: "xièxie", hv: "Tạ Tạ", meaning: "cảm ơn" },
          { hanzi: "再见", pinyin: "zàijiàn", hv: "Tái Kiến", meaning: "tạm biệt" }
        ],
        quiz: [
          { q: "Dấu của ǎ gọi là thanh gì?", options: ["Thanh sắc", "Thanh hỏi", "Thanh huyền", "Thanh ngang"], answer: 1, explain: "ǎ là dấu hỏi — thanh 3." },
          { q: "Hai âm thanh 3 đứng cạnh nhau đọc…", options: ["3-3", "2-3", "3-2", "4-4"], answer: 1, explain: "Thanh trước đổi thành thanh 2: 2-3." }
        ],
        test: [
          { q: "Nǐ hǎo nghĩa là…", options: ["Tạm biệt", "Xin chào", "Cảm ơn", "Xin lỗi"], answer: 1, explain: "你好 — lời chào phổ biến nhất." },
          { prompt: "Viết pinyin đầy đủ có dấu của 中文 (tiếng Trung).", answer: "zhōngwén" }
        ]
      }
    ]
  };
})();
