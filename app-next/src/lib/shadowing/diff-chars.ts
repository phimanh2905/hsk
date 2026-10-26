/* Per-char diff 2 con trỏ cho chế độ Chép chính tả (port Ý TƯỞNG cơ chế diff
   của đối thủ, viết lại). Chuẩn hóa NFKC + lowercase + bỏ dấu thanh; dấu câu
   và khoảng trắng bị skip ở CẢ HAI phía. marks theo ký tự GỐC của src để UI
   tô màu giữ nguyên dấu câu người dùng gõ. */
import { stripTones } from "@/lib/pinyin-utils";

export type MarkState = "ok" | "bad" | "skip";
export type CharMark = { ch: string; state: MarkState };
export type DiffResult = { marks: CharMark[]; errors: number; missing: number; total: number };

const SKIP_RE = /[\s,.!?，。！？、：;；:'"“”’‘·()（）\-—…]/;

function normChar(ch: string): string {
  const n = stripTones(ch.normalize("NFKC").toLowerCase());
  return SKIP_RE.test(n) ? "" : n;
}

/** mảng ký tự đã chuẩn hóa + vị trí ký tự gốc tương ứng */
function normIndexed(s: string): { n: string; i: number }[] {
  const out: { n: string; i: number }[] = [];
  Array.from(s).forEach((ch, i) => {
    const n = normChar(ch);
    if (n !== "") out.push({ n, i });
  });
  return out;
}

export function diffChars(src: string, want: string): DiffResult {
  const marks: CharMark[] = Array.from(src).map((ch) => ({ ch, state: normChar(ch) === "" ? "skip" : "bad" }));
  const A = normIndexed(src);
  const B = normIndexed(want).map((x) => x.n);
  const WINDOW = 4; // cửa sổ lookahead để resync khi lệch 1-2 chữ
  let errors = 0;
  let matched = 0;
  let skippedWant = 0; // ký tự want bị bỏ qua khi resync (thừa/thiếu cục bộ)
  let j = 0;
  for (let t = 0; t < A.length; t++) {
    const a = A[t];
    if (j < B.length && a.n === B[j]) {
      marks[a.i].state = "ok";
      matched++;
      j++;
      continue;
    }
    // 1) want[j] khớp ký tự src phía sau → a là chữ thừa → bad, giữ j
    const srcAhead = A.slice(t + 1, t + 1 + WINDOW).some((x) => j < B.length && x.n === B[j]);
    if (srcAhead) {
      marks[a.i].state = "bad";
      errors++;
      continue;
    }
    // 2) a.n khớp want phía sau → các chữ want[j..k-1] bị bỏ qua khi resync
    let k = -1;
    for (let q = j + 1; q < B.length && q <= j + WINDOW; q++) {
      if (B[q] === a.n) { k = q; break; }
    }
    if (k !== -1) {
      marks[a.i].state = "ok";
      matched++;
      skippedWant += k - j;
      j = k + 1;
      continue;
    }
    marks[a.i].state = "bad";
    errors++;
  }
  // skippedWant chỉ được trừ khỏi missing ở mức số lỗi tương ứng:
  // thay thế có chủ đích (errors>0) mới excused, thiếu chữ thuần (errors=0) vẫn missing.
  return { marks, errors, missing: Math.max(0, B.length - matched - Math.min(skippedWant, errors)), total: B.length };
}
