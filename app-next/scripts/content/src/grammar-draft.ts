/* Prompt build + parse/validate grammar draft (W2.5). LLM chỉ sinh 6 field của
   GrammarPoint (title, hz, topic, def, formula, pitfall, ex) — id = slug pinyin
   không dấu của hz, derive DETERMINISTIC qua python bridge (pypinyin), không tin LLM. */
import { z } from "zod";
import { extractJson } from "./llm";
import { derivePinyinBatch, type CharPy } from "./pinyin-derive";
import type { GrammarPoint, GrammarTopic } from "../../../src/content/grammar-points";

export const CHUNK_SIZE = 10;

export type GrammarDraft = Omit<GrammarPoint, "level"> & {
  level: "HSK 1" | "HSK 2" | "HSK 3" | "HSK 4" | "HSK 5";
};

const TOPIC_VALUES: GrammarTopic[] = ["ba", "bi", "bongu", "hutu"];

export function buildGrammarPrompt(level: number, count: number, existing: string[]): {
  role: "system" | "user";
  content: string;
}[] {
  const system = [
    `Bạn là giáo viên tiếng Trung soạn sổ tay ngữ pháp HSK ${level} cho người Việt học.`,
    `Trả về DUY NHẤT một JSON object dạng {"points":[...]} (response format json_object) với đúng ${count} điểm ngữ pháp PHỔ BIẾN NHẤT của HSK ${level} (cấu trúc câu, bổ ngữ, hư từ…), mỗi phần tử chỉ cần các field:`,
    `- title: tên điểm ngữ pháp viết HOA tiếng Việt (vd "CÂU CHỮ 把")`,
    `- hz: tên cấu trúc bằng chữ Hán ngắn (vd "把字句")`,
    `- topic: MỘT trong ${TOPIC_VALUES.map((t) => `"${t}"`).join("/")} — chọn nhóm gần nhất`,
    `- def: giải thích ngắn gọn tiếng Việt (1–2 câu)`,
    `- formula: mảng ít nhất 2 phần tử, mỗi phần tử ["nhãn thành phần"] hoặc ["nhãn", "key"] — ít nhất MỘT phần tử có "key" (từ khóa cấu trúc)`,
    `- pitfall: đúng 3 chuỗi [lead, bold, rest] ghép thành câu "Bẫy người Việt: lead+bold+rest" — bold là vị trí lỗi người Việt hay mắc, KHÔNG được rỗng`,
    `- ex: 1–3 câu ví dụ {hz, py, vi} đúng mức HSK ${level}, py là pinyin cả câu có dấu thanh`,
    `Không trùng bất kỳ cấu trúc nào trong danh sách tránh. Cấm chép nội dung từ bất kỳ nguồn có bản quyền (giáo trình, website, sách) — chỉ dùng kiến thức ngôn ngữ của bạn. KHÔNG sinh field "id" — hệ thống tự sinh.`
  ].join("\n");

  const user = JSON.stringify({ count, avoid: existing });
  return [
    { role: "system", content: system },
    { role: "user", content: user }
  ];
}

export const grammarDraftSchema = z
  .object({
    title: z.string().min(1),
    hz: z.string().min(1),
    topic: z.enum(["ba", "bi", "bongu", "hutu"]),
    def: z.string().min(1),
    formula: z
      .array(z.tuple([z.string(), z.enum(["key"]).optional()]))
      .min(2)
      .superRefine((f, ctx) => {
        if (!f.some(([, k]) => k === "key")) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "formula cần ít nhất 1 phần tử có 'key'" });
        }
      }),
    pitfall: z.tuple([z.string(), z.string().min(1), z.string()]),
    ex: z
      .object({ hz: z.string().min(1), py: z.string().min(1), vi: z.string().min(1) })
      .array()
      .min(1)
      .max(3)
  });

/* slug pinyin không dấu từ rows python bridge: "ba3","zi3","ju4" -> "ba-zi-ju".
   Bỏ punct/space; nối bằng "-". */
export function slugFromRows(rows: CharPy[]): string {
  const PUNCT = /[，。？！、：；…—,.!?;:()"'\s（）]/;
  return rows
    .filter(({ c }) => !PUNCT.test(c))
    .map(({ t3 }) => t3.replace(/\d+$/, ""))
    .join("-");
}

/* entry point: content string từ chatJson -> validate -> ghép id (slug) + level.
   opts.rows: inject rows đã derive (unit test stub), thứ tự khớp points[].hz. */
export async function parseGrammarResponse(
  level: number,
  content: string,
  existing: string[],
  opts?: { rows?: CharPy[][] }
): Promise<GrammarDraft[]> {
  const parsed = extractJson(content) as { points?: unknown };
  const rawPoints = parsed?.points;
  if (!Array.isArray(rawPoints)) {
    throw new Error(`parseGrammarResponse: response không có "points" là mảng`);
  }
  const hzList = rawPoints.map((p) => String((p as { hz?: unknown })?.hz ?? ""));
  const rows =
    opts?.rows ?? (await derivePinyinBatch(hzList)).perCharRows ?? [];

  const seen = new Set<string>();
  const drafts: GrammarDraft[] = [];
  for (let i = 0; i < rawPoints.length; i++) {
    const v = grammarDraftSchema.safeParse(rawPoints[i]);
    if (!v.success) {
      const issue = v.error.issues[0];
      throw new Error(
        `parseGrammarResponse: field "${issue?.path.join(".") || issue?.message}" lỗi tại index ${i} ("${hzList[i]}")`
      );
    }
    const { hz } = v.data;
    if (existing.includes(hz) || seen.has(hz)) {
      throw new Error(`parseGrammarResponse: điểm ngữ pháp trùng "${hz}" tại index ${i}`);
    }
    seen.add(hz);
    const slugRows = rows[i];
    if (!slugRows) throw new Error(`parseGrammarResponse: thiếu rows derive tại index ${i}`);
    drafts.push({ ...v.data, id: slugFromRows(slugRows), level: `HSK ${level}` as GrammarDraft["level"] });
  }
  return drafts;
}
