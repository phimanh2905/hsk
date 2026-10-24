/* CLI gen-vocab-static (W2.4): sinh lại static src/content/vocab.ts từ
   data/vocab/hskN.json + data/vocab/lessons-hskN.json (HSK 3.0, W2.2 + W2.3),
   đồng thời IN RA các mảng titles để cập nhật phần data của src/content/courses.ts.

   Giữ nguyên verbatim từ file static hiện tại:
   - imports + types (PinyinPerChar/Example/VocabWord/VocabLesson) + helper py/perChar/W
     (đoạn đầu file, cắt tại marker "/* ================= HSK1")
   - khối demo hsk6 (từ "const hsk6:" đến trước "export const vocab")
   - khối "export const vocab" cuối file.

   hsk1..hsk5 emit dạng object literal trực tiếp (không gọi W) vì data đã có
   dấu pinyin đầy đủ — mỗi word là JSON.stringify(w) trên một dòng.

   KHÔNG chạy trong build/CI — tool thủ công.

   Usage: pnpm dlx tsx scripts/content/gen-vocab-static.mts
     [--data <dir>] [--src <vocab.ts>] [--courses <courses.ts>] [--out <vocab.ts>]
   Mặc định: data=scripts/content/data/vocab, src=out là src/content/vocab.ts thật.
   Smoke fixture: truyền --data/--src/--courses/--out trỏ vào thư mục tạm. */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { VocabWord } from "../../src/content/vocab";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(scriptDir, "../..");

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const dataDir = argValue("--data") ?? path.join(scriptDir, "data/vocab");
const srcPath = argValue("--src") ?? path.join(appRoot, "src/content/vocab.ts");
const coursesPath = argValue("--courses") ?? path.join(appRoot, "src/content/courses.ts");
const outPath = argValue("--out") ?? srcPath;

const HSK1_MARKER = "/* ================= HSK1";
const HSK6_START = "const hsk6:";
const EXPORT_MARKER = "export const vocab";

type LessonSplit = { title: string; hanziList: string[] }[];

const current = readFileSync(srcPath, "utf8");
const iHsk1 = current.indexOf(HSK1_MARKER);
if (iHsk1 < 0) throw new Error(`Không tìm thấy marker "${HSK1_MARKER}" trong ${srcPath}`);
const iHsk6 = current.indexOf(HSK6_START);
if (iHsk6 < 0) throw new Error(`Không tìm thấy marker "${HSK6_START}" trong ${srcPath}`);
const iExport = current.indexOf(EXPORT_MARKER);
if (iExport < 0 || iExport < iHsk6) throw new Error(`Không tìm thấy marker "${EXPORT_MARKER}" trong ${srcPath}`);

const helpersPart = current.slice(0, iHsk1).replace(/\s*$/, "\n");
const hsk6Part = current.slice(iHsk6, iExport).replace(/\s*$/, "\n");
const exportPart = current.slice(iExport);

const header = [
  "/* Dữ liệu từ vựng HSK 3.0 — SINH TỰ ĐỘNG bởi scripts/content/gen-vocab-static.mts.",
  `   Nguồn: data/vocab/{hskN,lessons-hskN}.json · ngày sinh: ${new Date().toISOString().slice(0, 10)}.`,
  "   hsk6 là bài demo giữ từ bản cũ. KHÔNG sửa tay — chạy lại script để regen. */"
].join("\n");

function loadJson<T>(p: string): T {
  if (!existsSync(p)) throw new Error(`Thiếu file data: ${p} — chạy W2.2/W2.3 (data chạy bù) trước`);
  return JSON.parse(readFileSync(p, "utf8")) as T;
}

const levelBlocks: string[] = [];
const titlesOutput: string[] = [];

// Đọc cardMeta hiện có của courses.ts để giữ nguyên phần "· N mẫu" khi gợi ý cardMeta mới
const coursesSrc = existsSync(coursesPath) ? readFileSync(coursesPath, "utf8") : "";
function currentCardMeta(slug: string): string | undefined {
  const m = coursesSrc.match(new RegExp(`slug: "${slug}".*?cardMeta: "([^"]+)"`, "s"));
  return m?.[1];
}

for (const level of [1, 2, 3, 4, 5]) {
  const words = loadJson<VocabWord[]>(path.join(dataDir, `hsk${level}.json`));
  const split = loadJson<LessonSplit>(path.join(dataDir, `lessons-hsk${level}.json`));
  // Ruling W2 chạy bù: homograph (cùng hanzi khác pinyin/nghĩa) hợp lệ trong data —
  // giữ bản đầu cho lookup bài học; bản thứ hai vẫn có trong D1 seed? Không —
  // static chỉ phát từ trong bài (second-entry 0.2% chấp nhận không vào bài).
  const byHanzi = new Map<string, VocabWord>();
  for (const w of words) {
    if (byHanzi.has(w.hanzi)) {
      console.warn(`hsk${level}.json: hanzi trùng "${w.hanzi}" — giữ bản đầu (homograph)`);
      continue;
    }
    byHanzi.set(w.hanzi, w);
  }
  const used = new Set<string>();
  const lines: string[] = [];
  lines.push(`/* ================= HSK${level} ================= */`);
  lines.push(`const hsk${level}: Record<string, VocabLesson> = {};`);
  split.forEach((lesson, li) => {
    const lessonWords = lesson.hanziList.map((h) => {
      const w = byHanzi.get(h);
      if (!w) throw new Error(`hsk${level} bài ${li + 1} ("${lesson.title}"): hanzi "${h}" không có trong hsk${level}.json`);
      used.add(h);
      return w;
    });
    lines.push("");
    lines.push(`hsk${level}["lesson-${li + 1}"] = {`);
    lines.push(`  title: ${JSON.stringify(lesson.title)},`);
    lines.push("  words: [");
    for (let wi = 0; wi < lessonWords.length; wi++) {
      const comma = wi < lessonWords.length - 1 ? "," : "";
      lines.push(`    ${JSON.stringify(lessonWords[wi])}${comma}`);
    }
    lines.push("  ]");
    lines.push("};");
  });
  // Ruling: homograph second-entry (cùng hanzi) không gán bài — chấp nhận (0.2%),
  // chỉ cảnh báo thay vì fail. Bài học vẫn dạy đủ nghĩa chính.
  const missing = words.length - used.size;
  if (missing > 0) {
    const miss = [...byHanzi.keys()].filter((h) => !used.has(h)).slice(0, 10);
    console.warn(`hsk${level}: ${missing} từ không thuộc bài nào (homograph — vd: ${miss.join(", ")})`);
  }
  levelBlocks.push(lines.join("\n") + "\n");

  // In ra mảng titles cho courses.ts (chạy bằng tay phần dán — logic courses giữ nguyên)
  const total = words.length;
  const old = currentCardMeta(`hsk${level}`);
  const samples = old?.match(/·\s*(\d+)\s*mẫu/);
  const cardMeta = samples ? `${total} từ vựng · ${samples[1]} mẫu` : `${total} từ vựng`;
  titlesOutput.push(
    `const hsk${level}Titles: { t: string; w: number }[] = [`,
    ...split.map((l, i) =>
      `  { t: ${JSON.stringify(l.title)}, w: ${l.hanziList.length} }${i < split.length - 1 ? "," : ""}`
    ),
    `]; // ${split.length} bài — cardMeta: "${cardMeta}", lessons: ${split.length}`
  );
}

const emitted = [
  header,
  helpersPart,
  levelBlocks.join("\n"),
  "/* ================= HSK6 — bài demo giữ từ bản cũ ================= */\n",
  hsk6Part,
  "\n",
  exportPart
].join("\n");

writeFileSync(outPath, emitted);
console.log(`Đã ghi ${outPath}`);
console.log(`hsk1..hsk5 từ data; hsk6 demo giữ nguyên. Tong dong: ${emitted.split("\n").length}`);
console.log("");
console.log("=== Dán các mảng titles sau vào src/content/courses.ts (thay hsk1Titles + thêm hsk2..hsk5Titles, đổi config hsk1..hsk5 dùng titles) ===");
for (const line of titlesOutput) console.log(line);
