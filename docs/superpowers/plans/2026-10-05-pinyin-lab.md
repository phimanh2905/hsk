# Pinyin Lab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port 100% mock `opendesign_hsk/pinyin.html` ("拼音实验室 · Pinyin Lab") thành trang `/pinyin` mới (mode-seg: Ma trận + Quiz), thay thế matrix cũ; `/pinyin/practice` thành redirect; kết quả luyện persist qua `progressStore`.

**Architecture:** Client root `pinyin-lab-root.tsx` sở hữu state mode/ma trận/quiz; presentational components trong `src/components/pinyin/lab/`; data module `pinyin-lab.ts` port nguyên bảng mock; quiz engine pure lib với rng inject; `SegmentedControl` thăng hạng lên `src/components/ui/`. Route group `(wide)` tạo nếu chưa có (dùng chung với plan hanzi-studio).

**Tech Stack:** Next.js 16 (App Router, searchParams Promise), React 19, Tailwind v4 semantic tokens, vitest + testing-library (jsdom).

**Spec:** `docs/superpowers/specs/2026-10-05-pinyin-lab-design.md` — executors đọc cả spec và plan.

## Global Constraints

- Mọi màu dùng semantic token (`action-primary`, `learning-progress`, `jade-wash`, `rose-wash`, `rose-ink`, `amber-wash`, `surface-muted`, `border-subtle`…) — cấm hard-code hex (riêng shadow emit `rgba(200,60,50,.35)` là brand glow của mock, chấp nhận).
- Glyph/ví dụ Hán luôn kèm class `zh`.
- Copy tiếng Việt giữ đúng mock: "Ma trận âm & 4 thanh điệu", "Luyện phản xạ tai nghe", "NHÓM CHÍNH", "PHÂN LOẠI", "Chạm ô để nghe và xem chi tiết bên phải.", "Chạm ô để nghe mẫu. Nhóm: đơn · kép · mũi.", "Âm đang chọn:", "Khẩu hình:", "Bảng ghép 4 thanh điệu", "Luyện riêng với âm này", "Nghe âm thanh", "Nghe chậm 0.8x", "Nghe kỹ và chọn âm tiết đúng vừa phát ra (Space = nghe lại)", "Chọn một đáp án để kiểm tra", "Câu tiếp theo (Enter)", "Chơi phiên mới (Enter)", "Hoàn thành phiên!", "Phiên mới: 10 câu ngẫu nhiên".
- Giữ `data-od-id` của mock làm hook e2e.
- Không đụng `content/pinyin.ts`, `content/roadmapPinyin.ts`, `/roadmap/pinyin`, `pinyin-utils.ts`.
- **Không side-effect trong `setQuiz` updater** (StrictMode chạy updater 2 lần → speak/XP kép). Root đọc state qua `quizRef`, mutate qua `setQuiz(fullObject)`.
- Animation `pop`/`shake` tôn trọng `prefers-reduced-motion`.
- Test: vitest, style import tường minh từ `vitest`, click qua `act(() => el.click())`.
- Chạy 1 file test: `npx vitest run <path>` (cwd `app-next/`).

## Review Focus

1. **Drill với âm không có trong pool** — kỳ vọng: pool con rỗng thì `pickTarget` fallback toàn pool thay vì `undefined` crash. → Test pin ở Task 2.
2. **Trả lời 2 lần / Enter giữa câu chưa answered** — kỳ vọng: `choose()` no-op khi đã picked; Enter chỉ có tác dụng khi đã trả lời hoặc done. → Test pin ở Task 10.
3. **Space phát lại ở view matrix** — kỳ vọng: keyboard handler gate theo mode, matrix không phát gì, không crash. → Test pin ở Task 10.
4. **Filter đổi làm `sel` không còn trong ma trận** (đang chọn `b`, lọc "palatal") — kỳ vọng: inspector vẫn render data của `b` (mock giữ sel), lookup `TONES[sel]` an toàn. → Test pin ở Task 7.
5. **Hoàn thành phiên double-fire XP** — kỳ vọng: XP + best chỉ ghi đúng 1 lần/phiên dù StrictMode/re-render. → Test pin ở Task 10.

*(Ngoài test: soát thủ công dark mode — contour amber, card jade/rose wash đủ tương phản.)*

---

### Task 1: Content module `pinyin-lab.ts`

**Files:**
- Create: `app-next/src/content/pinyin-lab.ts`
- Test: `app-next/src/content/__tests__/pinyin-lab.test.ts`

**Interfaces:**
- Consumes: không.
- Produces: `PINYIN_LAB_GROUPS` (7 nhóm, 23 thanh mẫu), `PINYIN_LAB_DESC`, `PINYIN_LAB_TIP`, `PINYIN_LAB_BASE`, `PINYIN_LAB_TONES` (23×4), `PINYIN_LAB_FINALS` (4 nhóm, 36), `PINYIN_LAB_ART_INI`, `PINYIN_LAB_ART_FIN`, `PINYIN_LAB_GROUP_OF`, `PINYIN_LAB_SANDHI`, `PINYIN_LAB_TONE_CARDS`, types `PinyinLabToneRow`, `PinyinLabFinalsGroup`, `PinyinLabSandhi`, `PinyinLabToneCard` — đúng theo spec §2.

- [ ] **Step 1: Write the failing test**

```ts
// app-next/src/content/__tests__/pinyin-lab.test.ts
import { describe, it, expect } from "vitest";
import {
  PINYIN_LAB_GROUPS, PINYIN_LAB_DESC, PINYIN_LAB_TIP, PINYIN_LAB_BASE,
  PINYIN_LAB_TONES, PINYIN_LAB_FINALS, PINYIN_LAB_GROUP_OF,
  PINYIN_LAB_SANDHI, PINYIN_LAB_TONE_CARDS,
} from "../pinyin-lab";

describe("PINYIN_LAB data (port mock)", () => {
  it("GROUPS: 7 nhóm, đủ 23 thanh mẫu không trùng; GROUP_OF phủ hết", () => {
    const all = PINYIN_LAB_GROUPS.flatMap((g) => g.items);
    expect(PINYIN_LAB_GROUPS.length).toBe(7);
    expect(all.length).toBe(23);
    expect(new Set(all).size).toBe(23);
    for (const x of all) expect(PINYIN_LAB_GROUP_OF[x], x).toBeTruthy();
  });

  it("DESC/TIP/BASE đủ 23 âm; TONES 23 âm × 4 hàng [py, zh, vi]", () => {
    const all = PINYIN_LAB_GROUPS.flatMap((g) => g.items);
    for (const x of all) {
      expect(PINYIN_LAB_DESC[x], `desc ${x}`).toBeTruthy();
      expect(PINYIN_LAB_TIP[x], `tip ${x}`).toBeTruthy();
      expect(PINYIN_LAB_BASE[x], `base ${x}`).toBeTruthy();
      expect(PINYIN_LAB_TONES[x], `tones ${x}`).toHaveLength(4);
      for (const row of PINYIN_LAB_TONES[x]) expect(row).toHaveLength(3);
    }
  });

  it("TONES: tổng 92 hàng, mỗi âm đủ 4 py khác nhau", () => {
    const rows = Object.values(PINYIN_LAB_TONES).flat();
    expect(rows.length).toBe(92);
    for (const rowsOfOne of Object.values(PINYIN_LAB_TONES)) {
      expect(new Set(rowsOfOne.map((r) => r[0])).size).toBe(4);
    }
  });

  it("FINALS: đúng 4 nhóm label mock, đủ 36 item dạng [py, '<Hán> <pinyin>']", () => {
    const all = PINYIN_LAB_FINALS.flatMap((g) => g.items);
    expect(PINYIN_LAB_FINALS.map((g) => g.label)).toEqual([
      "Đơn · Nguyên âm đơn", "Kép · Nguyên âm đôi", "Mũi · Âm mũi", "Đặc biệt",
    ]);
    expect(all.length).toBe(36);
    for (const [, ex] of all) expect(ex.split(" ").length).toBe(2);
  });

  it("SANDHI: 3 quy tắc, mỗi rule ≥ 3 ví dụ [py, zh, vi]", () => {
    expect(PINYIN_LAB_SANDHI.length).toBe(3);
    for (const r of PINYIN_LAB_SANDHI) {
      expect(r.t).toBeTruthy();
      expect(r.d).toBeTruthy();
      expect(r.ex.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("TONE_CARDS: 4 card mā má mǎ mà + contour flat/up/dip/down", () => {
    expect(PINYIN_LAB_TONE_CARDS.map((c) => c.ex.py)).toEqual(["mā", "má", "mǎ", "mà"]);
    expect(PINYIN_LAB_TONE_CARDS.map((c) => c.contour)).toEqual(["flat", "up", "dip", "down"]);
    expect(PINYIN_LAB_TONE_CARDS.map((c) => c.name)).toEqual([
      "Thanh 1 (55)", "Thanh 2 (35)", "Thanh 3 (214)", "Thanh 4 (51)",
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && npx vitest run src/content/__tests__/pinyin-lab.test.ts`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Write the data module**

```ts
// app-next/src/content/pinyin-lab.ts
/* Pinyin Lab — dữ liệu port 1:1 opendesign_hsk/pinyin.html (spec 2026-10-05 §2).
   Tách khỏi content/pinyin.ts (matrix 406 âm tiết). Tiền tố PINYIN_LAB_ tránh đụng tên. */

export type PinyinLabGroup = { label: string; items: string[] };
export type PinyinLabToneRow = [py: string, zh: string, vi: string];
export type PinyinLabFinalsGroup = { label: string; items: [py: string, ex: string][] };
export type PinyinLabSandhi = { t: string; d: string; ex: [py: string, zh: string, vi: string][] };
export type PinyinLabToneCard = {
  name: string;
  sub: string;
  contour: "flat" | "up" | "dip" | "down";
  ex: { py: string; zh: string; vi: string };
};

export const PINYIN_LAB_GROUPS: PinyinLabGroup[] = [
  { label: "Âm môi · 唇音", items: ["b", "p", "m", "f"] },
  { label: "Âm đầu lưỡi · 舌尖音", items: ["d", "t", "n", "l"] },
  { label: "Âm cuống lưỡi · 舌根音", items: ["g", "k", "h"] },
  { label: "Âm mặt lưỡi · 舌面音", items: ["j", "q", "x"] },
  { label: "Âm uốn lưỡi · 翘舌音", items: ["zh", "ch", "sh", "r"] },
  { label: "Âm răng · 平舌音", items: ["z", "c", "s"] },
  { label: "Bán nguyên âm", items: ["w", "y"] },
];

export const PINYIN_LAB_DESC: Record<string, string> = {
  b: "Âm hai môi, không bật hơi — nghe trầm gọn, gần âm B tiếng Việt nhưng nhẹ hơn.",
  p: "Âm hai môi, bật hơi mạnh — đặt mu bàn tay trước miệng sẽ cảm nhận luồng hơi rõ.",
  m: "Âm hai môi, luồng hơi thoát qua mũi, dây thanh rung.",
  f: "Răng trên chạm môi dưới, hơi xát thoát ra — như âm F.",
  d: "Đầu lưỡi chạm lợi răng trên, bật mở gọn, không bật hơi.",
  t: "Như d nhưng bật hơi mạnh — phân biệt d/t chính bằng luồng hơi.",
  n: "Đầu lưỡi chạm lợi, hơi thoát qua mũi — như N.",
  l: "Đầu lưỡi chạm lợi, hơi thoát hai bên rìa lưỡi — như L.",
  g: "Cuống lưỡi nâng chặn vòm mềm, bật mở gọn, không bật hơi.",
  k: "Như g nhưng bật hơi mạnh — phân biệt g/k bằng luồng hơi.",
  h: "Hơi xát qua họng, không ma sát mạnh — nhẹ hơn H tiếng Việt.",
  j: "Mặt lưỡi nâng sát vòm cứng, bật mở gọn, không bật hơi.",
  q: "Vị trí như j nhưng bật hơi mạnh — cặp đối lập j/q.",
  x: "Mặt lưỡi gần vòm cứng, hơi xát ra — như tiếng “xì” nhẹ.",
  zh: "Đầu lưỡi cuộn lên vòm cứng, bật mở gọn, không bật hơi.",
  ch: "Như zh nhưng bật hơi mạnh — cặp đối lập zh/ch.",
  sh: "Đầu lưỡi cuộn, hơi xát mạnh — âm “s” nặng, uốn lưỡi.",
  r: "Đầu lưỡi cuộn, hơi thoát kèm rung nhẹ — gần âm R.",
  z: "Đầu lưỡi ngay sau răng, bật mở gọn, không bật hơi.",
  c: "Vị trí như z nhưng bật hơi mạnh — cặp đối lập z/c.",
  s: "Hơi xát qua kẽ răng — như âm X nhưng đầu lưỡi thấp hơn.",
  w: "Tròn môi, lướt như “u” dài — gần W tiếng Anh.",
  y: "Mặt lưỡi nâng cao, lướt như “i” dài — gần Y tiếng Anh.",
};

export const PINYIN_LAB_TIP: Record<string, string> = {
  b: "Hai môi khép chặt cản luồng hơi, mở nhẹ, dây thanh KHÔNG rung thêm — tương đương P tiếng Việt (không phải B).",
  p: "Giống b nhưng tung luồng hơi mạnh — thử với tờ giấy trước miệng.",
  m: "Khép môi, để hơi đi qua mũi, ngân như “mmm”.",
  f: "Cắn nhẹ môi dưới bằng răng trên rồi thổi hơi ra.",
  d: "Đầu lưỡi ép lợi răng trên rồi bật mở — gọn, không kèm hơi.",
  t: "Giống d + luồng hơi mạnh phả ra.",
  n: "Lưỡi như d nhưng hơi đi lên mũi — ngân như “nnn”.",
  l: "Lưỡi chạm lợi, hạ hai rìa lưỡi cho hơi thoát ngang.",
  g: "Cuống lưỡi ép vòm mềm rồi bật mở — gọn, trầm.",
  k: "Giống g + luồng hơi mạnh.",
  h: "Thở hắt từ họng, miệng mở vừa — nhẹ, không gằn.",
  j: "Mặt lưỡi áp sát vòm cứng rồi bật mở gọn — không hơi.",
  q: "Giống j + luồng hơi mạnh xì ra.",
  x: "Giữ lưỡi gần vòm cứng, xì hơi dài như “xì”.",
  zh: "Cuộn đầu lưỡi lên, bật mở gọn — “tr” nặng.",
  ch: "Giống zh + bật hơi mạnh.",
  sh: "Cuộn lưỡi, xì hơi dài — “s” nặng uốn lưỡi.",
  r: "Cuộn lưỡi, rung nhẹ kèm hơi — gần “r”.",
  z: "Lưỡi ngay sau răng, bật mở gọn — nhẹ như “ch” non.",
  c: "Giống z + bật hơi mạnh.",
  s: "Xì hơi qua kẽ răng, lưỡi thấp — như “xì”.",
  w: "Môi tròn thu nhỏ, lướt nhanh sang nguyên âm sau.",
  y: "Lưỡi nâng cao, lướt nhanh — như “i” ngắn dẫn.",
};

export const PINYIN_LAB_BASE: Record<string, string> = {
  b: "bō", p: "pō", m: "mō", f: "fō", d: "dē", t: "tē", n: "nē", l: "lē",
  g: "gē", k: "kē", h: "hē", j: "jī", q: "qī", x: "xī", zh: "zhī", ch: "chī",
  sh: "shī", r: "rì", z: "zī", c: "cī", s: "sī", w: "wō", y: "yī",
};

export const PINYIN_LAB_TONES: Record<string, PinyinLabToneRow[]> = {
  b: [["bā", "八", "Số 8"], ["bá", "拔", "Nhổ lên"], ["bǎ", "把", "Cầm, nắm"], ["bà", "爸", "Bố"]],
  p: [["pī", "批", "Phê duyệt"], ["pí", "皮", "Da"], ["pǐ", "痞", "Du côn"], ["pì", "屁", "Xì hơi"]],
  m: [["mā", "妈", "Mẹ"], ["má", "麻", "Vừng, tê"], ["mǎ", "马", "Ngựa"], ["mà", "骂", "Mắng"]],
  f: [["fēi", "飞", "Bay"], ["féi", "肥", "Béo"], ["fěi", "匪", "Cướp"], ["fèi", "肺", "Phổi"]],
  d: [["dā", "搭", "Dựng, đi nhờ"], ["dá", "答", "Trả lời"], ["dǎ", "打", "Đánh"], ["dà", "大", "Lớn"]],
  t: [["tī", "踢", "Đá"], ["tí", "题", "Đề bài"], ["tǐ", "体", "Cơ thể"], ["tì", "替", "Thay thế"]],
  n: [["nī", "尼", "Ni cô"], ["nǐ", "你", "Bạn"], ["nì", "溺", "Chết đuối"], ["nà", "那", "Kia"]],
  l: [["lū", "撸", "Tuốt"], ["lú", "卢", "Họ Lư"], ["lǔ", "鲁", "Họ Lỗ"], ["lù", "路", "Đường"]],
  g: [["gē", "哥", "Anh trai"], ["gé", "革", "Cách mạng"], ["gǒu", "狗", "Chó"], ["gòu", "够", "Đủ"]],
  k: [["kē", "科", "Khoa học"], ["ké", "壳", "Vỏ"], ["kǒu", "口", "Miệng"], ["kòu", "扣", "Trừ, cài"]],
  h: [["hē", "喝", "Uống"], ["hé", "和", "Và"], ["hǎo", "好", "Tốt"], ["hào", "号", "Số hiệu"]],
  j: [["jī", "鸡", "Gà"], ["jí", "急", "Gấp"], ["jǐ", "几", "Mấy"], ["jì", "记", "Ghi nhớ"]],
  q: [["qī", "七", "Số 7"], ["qí", "旗", "Cờ"], ["qǐ", "起", "Dậy, bắt đầu"], ["qì", "气", "Khí"]],
  x: [["xī", "西", "Phía tây"], ["xí", "席", "Chỗ ngồi"], ["xǐ", "洗", "Rửa"], ["xì", "戏", "Kịch"]],
  zh: [["zhī", "知", "Biết"], ["zhí", "直", "Thẳng"], ["zhǐ", "纸", "Giấy"], ["zhì", "治", "Trị liệu"]],
  ch: [["chī", "吃", "Ăn"], ["chí", "迟", "Muộn"], ["chǐ", "尺", "Thước"], ["chì", "翅", "Cánh"]],
  sh: [["shī", "师", "Thầy"], ["shí", "十", "Số 10"], ["shǐ", "使", "Khiến"], ["shì", "是", "Là"]],
  r: [["rì", "日", "Ngày"], ["rě", "惹", "Chọc giận"], ["rěn", "忍", "Nhẫn nhịn"], ["rèn", "认", "Nhận ra"]],
  z: [["zī", "资", "Vốn"], ["zé", "责", "Trách nhiệm"], ["zǐ", "紫", "Tím"], ["zì", "字", "Chữ"]],
  c: [["cāi", "猜", "Đoán"], ["cái", "才", "Mới"], ["cǎi", "彩", "Màu sắc"], ["cài", "菜", "Món ăn"]],
  s: [["sī", "丝", "Tơ lụa"], ["sā", "撒", "Rắc, tung"], ["sǐ", "死", "Chết"], ["sì", "四", "Số 4"]],
  w: [["wā", "挖", "Đào"], ["wá", "娃", "Em bé"], ["wǎ", "瓦", "Ngói"], ["wà", "袜", "Tất"]],
  y: [["yī", "一", "Số 1"], ["yí", "姨", "Dì"], ["yǐ", "已", "Đã"], ["yì", "义", "Nghĩa"]],
};

export const PINYIN_LAB_FINALS: PinyinLabFinalsGroup[] = [
  { label: "Đơn · Nguyên âm đơn", items: [["a", "啊 ā"], ["o", "哦 ò"], ["e", "饿 è"], ["i", "衣 yī"], ["u", "乌 wū"], ["ü", "鱼 yú"], ["ê", "欸 ê̄"]] },
  { label: "Kép · Nguyên âm đôi", items: [["ai", "爱 ài"], ["ei", "飞 fēi"], ["ao", "好 hǎo"], ["ou", "狗 gǒu"], ["ia", "家 jiā"], ["iao", "教 jiào"], ["ie", "姐 jiě"], ["iou", "酒 jiǔ"], ["ua", "花 huā"], ["uo", "火 huǒ"], ["uai", "怪 guài"], ["uei", "味 wèi"], ["üe", "月 yuè"]] },
  { label: "Mũi · Âm mũi", items: [["an", "安 ān"], ["en", "恩 ēn"], ["ang", "脏 zāng"], ["eng", "灯 dēng"], ["ian", "烟 yān"], ["in", "音 yīn"], ["iang", "羊 yáng"], ["ing", "英 yīng"], ["uan", "关 guān"], ["un", "问 wèn"], ["uang", "光 guāng"], ["ueng", "翁 wēng"], ["üan", "元 yuán"], ["ün", "云 yún"], ["iong", "穷 qióng"]] },
  { label: "Đặc biệt", items: [["er", "耳 ěr"]] },
];

export const PINYIN_LAB_ART_INI: [key: string, label: string][] = [
  ["all", "Tất cả"], ["labial", "Âm môi (b,p,m,f)"], ["apical", "Âm đầu lưỡi (d,t,n,l)"],
  ["velar", "Âm cuống lưỡi (g,k,h)"], ["palatal", "Âm mặt lưỡi (j,q,x)"],
  ["retroflex", "Âm uốn lưỡi (zh,ch,sh,r)"], ["dental", "Âm răng (z,c,s)"],
];

export const PINYIN_LAB_ART_FIN: [key: string, label: string][] = [
  ["all", "Tất cả"], ["simple", "Đơn"], ["compound", "Kép"], ["nasal", "Mũi"],
];

export const PINYIN_LAB_GROUP_OF: Record<string, string> = {
  b: "labial", p: "labial", m: "labial", f: "labial",
  d: "apical", t: "apical", n: "apical", l: "apical",
  g: "velar", k: "velar", h: "velar",
  j: "palatal", q: "palatal", x: "palatal",
  zh: "retroflex", ch: "retroflex", sh: "retroflex", r: "retroflex",
  z: "dental", c: "dental", s: "dental",
  w: "labial", y: "palatal",
};

export const PINYIN_LAB_SANDHI: PinyinLabSandhi[] = [
  { t: "一 yī — biến điệu theo thanh sau nó",
    d: "Đứng trước thanh 4 đọc yì (thanh 4); trước thanh 1/2/3 đọc yí (thanh 2); đếm số thứ tự giữ nguyên yī.",
    ex: [["yídìng", "一定", "nhất định"], ["yìqǐ", "一起", "cùng nhau"], ["dìyī", "第一", "thứ nhất"]] },
  { t: "不 bù — đứng trước thanh 4 đọc bú",
    d: "不 + thanh 4 → bú (thanh 2). Các trường hợp còn lại giữ bù.",
    ex: [["búduì", "不对", "không đúng"], ["bùhǎo", "不好", "không tốt"], ["bùxíng", "不行", "không được"]] },
  { t: "Hai thanh 3 liền nhau — từ đầu đọc như thanh 2",
    d: "你好 vốn nǐ+hǎo, khi nói từ đầu vút lên như ní. Quy tắc vàng của khẩu ngữ.",
    ex: [["níhǎo", "你好", "xin chào"], ["hěnhǎo", "很好", "rất tốt"], ["měilì", "美丽", "xinh đẹp"]] },
];

export const PINYIN_LAB_TONE_CARDS: PinyinLabToneCard[] = [
  { name: "Thanh 1 (55)", sub: "· Cao – Bằng", contour: "flat", ex: { py: "mā", zh: "妈", vi: "Mẹ" } },
  { name: "Thanh 2 (35)", sub: "· Lên cao", contour: "up", ex: { py: "má", zh: "麻", vi: "Vừng" } },
  { name: "Thanh 3 (214)", sub: "· Xuống rồi lên", contour: "dip", ex: { py: "mǎ", zh: "马", vi: "Ngựa" } },
  { name: "Thanh 4 (51)", sub: "· Rơi dứt khoát", contour: "down", ex: { py: "mà", zh: "骂", vi: "Mắng" } },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app-next && npx vitest run src/content/__tests__/pinyin-lab.test.ts`
Expected: PASS (6 test).

- [ ] **Step 5: Commit**

```bash
git add app-next/src/content/pinyin-lab.ts app-next/src/content/__tests__/pinyin-lab.test.ts
git commit -m "feat(content): pinyin-lab — 23 thanh mẫu/36 vận mẫu/tones/sandhi port từ mock"
```

---

### Task 2: Pure lib `quiz-engine.ts`

**Files:**
- Create: `app-next/src/lib/pinyin/quiz-engine.ts`
- Test: `app-next/src/lib/pinyin/__tests__/quiz-engine.test.ts`

**Interfaces:**
- Consumes: `PINYIN_LAB_TONES` (inject để test).
- Produces: `buildPool(tones?)`, `pickTarget(pool, drillIni, rng)`, `distractors(pool, target, rng)`, type `PinyinLabPoolItem`.

- [ ] **Step 1: Write the failing test**

```ts
// app-next/src/lib/pinyin/__tests__/quiz-engine.test.ts
import { describe, it, expect } from "vitest";
import { buildPool, pickTarget, distractors, type PinyinLabPoolItem } from "../quiz-engine";
import { PINYIN_LAB_TONES } from "@/content/pinyin-lab";

function seqRng(values: number[]) {
  let i = 0;
  return () => values[i++ % values.length];
}

describe("buildPool", () => {
  it("92 items (23 âm × 4 thanh), shape đúng", () => {
    const pool = buildPool();
    expect(pool.length).toBe(92);
    expect(pool.find((p) => p.ini === "b" && p.tone === 1)).toEqual({
      py: "bā", zh: "八", vi: "Số 8", tone: 1, ini: "b",
    });
  });
});

describe("pickTarget (Review Focus #1)", () => {
  it("drillIni lọc đúng nhóm âm", () => {
    const t = pickTarget(buildPool(), "sh", seqRng([0]));
    expect(t.ini).toBe("sh");
  });
  it("drillIni không có trong pool → fallback toàn pool, không crash", () => {
    const t = pickTarget(buildPool(), "ng", seqRng([0.999]));
    expect(t.ini).toBe("y"); // phần tử cuối toàn pool
  });
});

describe("distractors", () => {
  const pool = buildPool();
  it("2 cùng ini khác py + 1 khác ini cùng tone, không trùng target", () => {
    const target: PinyinLabPoolItem = { py: "bà", zh: "爸", vi: "Bố", tone: 4, ini: "b" };
    const out = distractors(pool, target, seqRng([0, 0, 0, 0, 0, 0, 0]));
    expect(out).toHaveLength(3);
    expect(out.filter((o) => o.ini === "b")).toHaveLength(2);
    expect(out.filter((o) => o.ini !== "b" && o.tone === 4)).toHaveLength(1);
    expect(out.every((o) => o.py !== target.py)).toBe(true);
  });
  it("không chọn trùng nhau (rng thật)", () => {
    const out = distractors(pool, pool[0], Math.random);
    expect(new Set(out.map((o) => o.py)).size).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && npx vitest run src/lib/pinyin/__tests__/quiz-engine.test.ts`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Write the implementation**

```ts
// app-next/src/lib/pinyin/quiz-engine.ts
/* Engine quiz Pinyin Lab — port POOL/pickTarget/distractors của opendesign_hsk/pinyin.html.
   Pure + rng inject (Math.random hoặc mulberry32) để test deterministic. */

import { PINYIN_LAB_TONES, type PinyinLabToneRow } from "@/content/pinyin-lab";

export type PinyinLabPoolItem = { py: string; zh: string; vi: string; tone: number; ini: string };

export function buildPool(tones: Record<string, PinyinLabToneRow[]> = PINYIN_LAB_TONES): PinyinLabPoolItem[] {
  const pool: PinyinLabPoolItem[] = [];
  for (const [ini, rows] of Object.entries(tones)) {
    rows.forEach(([py, zh, vi], i) => pool.push({ py, zh, vi, tone: i + 1, ini }));
  }
  return pool;
}

export function pickTarget(pool: PinyinLabPoolItem[], drillIni: string | null, rng: () => number): PinyinLabPoolItem {
  const cands = drillIni ? pool.filter((p) => p.ini === drillIni) : [];
  const src = cands.length ? cands : pool; // fallback: drill rỗng → toàn pool (Review Focus #1)
  return src[Math.floor(rng() * src.length)];
}

export function distractors(pool: PinyinLabPoolItem[], target: PinyinLabPoolItem, rng: () => number): PinyinLabPoolItem[] {
  const same = pool.filter((p) => p.ini === target.ini && p.py !== target.py);
  const diff = pool.filter((p) => p.ini !== target.ini && p.tone === target.tone && p.py !== target.py);
  const out: PinyinLabPoolItem[] = [];
  while (same.length && out.length < 2) out.push(same.splice(Math.floor(rng() * same.length), 1)[0]);
  while (diff.length && out.length < 3) out.push(diff.splice(Math.floor(rng() * diff.length), 1)[0]);
  while (out.length < 3) {
    const p = pool[Math.floor(rng() * pool.length)];
    if (p.py !== target.py && !out.includes(p)) out.push(p);
  }
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app-next && npx vitest run src/lib/pinyin/__tests__/quiz-engine.test.ts`
Expected: PASS (5 test).

- [ ] **Step 5: Commit**

```bash
git add app-next/src/lib/pinyin/quiz-engine.ts app-next/src/lib/pinyin/__tests__/quiz-engine.test.ts
git commit -m "feat(lib): quiz-engine pinyin lab — pool/pickTarget/distractors pure + rng inject"
```

---

### Task 3: `SegmentedControl` thăng hạng lên `components/ui/`

**Files:**
- Create: `app-next/src/components/ui/segmented-control.tsx`
- Test: `app-next/src/components/ui/__tests__/segmented-control.test.tsx`

**Interfaces:**
- Produces: `SegmentedControl<K extends string>({ tabs: {key: K; label: ReactNode}[], value: K, onChange: (k: K) => void, label: string, radius?: "xl"|"2xl", className? })` — Task 10 dùng; plan hanzi-studio sẽ import từ đây thay vì tạo riêng (ghi chú phối hợp, không sửa plan đó trong plan này).

- [ ] **Step 1: Write the failing test**

```tsx
// app-next/src/components/ui/__tests__/segmented-control.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { SegmentedControl } from "../segmented-control";

afterEach(cleanup);

const TABS = [
  { key: "a" as const, label: "Tab A" },
  { key: "b" as const, label: "Tab B" },
];

describe("SegmentedControl", () => {
  it("aria-pressed theo value; label → aria-label", () => {
    const { container } = render(<SegmentedControl label="Nhóm" tabs={TABS} value="b" onChange={() => {}} />);
    const group = container.querySelector('[role="group"][aria-label="Nhóm"]')!;
    const btns = group.querySelectorAll("button");
    expect(btns[0].getAttribute("aria-pressed")).toBe("false");
    expect(btns[1].getAttribute("aria-pressed")).toBe("true");
  });
  it("click → onChange(key)", () => {
    const onChange = vi.fn();
    const { container } = render(<SegmentedControl label="N" tabs={TABS} value="a" onChange={onChange} />);
    act(() => { container.querySelectorAll("button")[1].click(); });
    expect(onChange).toHaveBeenCalledWith("b");
  });
  it("radius 2xl/xl đặt class bo đúng", () => {
    const { container, rerender } = render(
      <SegmentedControl label="N" tabs={TABS} value="a" onChange={() => {}} radius="2xl" />,
    );
    expect(container.firstElementChild!.className).toContain("rounded-2xl");
    rerender(<SegmentedControl label="N" tabs={TABS} value="a" onChange={() => {}} />);
    expect(container.firstElementChild!.className).toContain("rounded-xl");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && npx vitest run src/components/ui/__tests__/segmented-control.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Write the component**

```tsx
// app-next/src/components/ui/segmented-control.tsx
"use client";

/* Segmented góc bo (rounded-12/16) — port .mode-seg/.mode-tabs của opendesign mocks.
   Dùng chung bởi Pinyin Lab (mode-seg) và Hanzi Studio (mode-tabs/speed/pane).
   KHÔNG dùng cho seg tròn (rounded-full) — đó là SegmentedTabs. */
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function SegmentedControl<K extends string>({
  tabs,
  value,
  onChange,
  label,
  radius = "xl",
  className,
}: {
  tabs: ReadonlyArray<{ key: K; label: ReactNode }>;
  value: K;
  onChange: (k: K) => void;
  label: string;
  radius?: "xl" | "2xl";
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "flex gap-0.5 border border-border-default bg-surface-muted p-[3px]",
        radius === "2xl" ? "rounded-2xl" : "rounded-xl",
        className,
      )}
    >
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          aria-pressed={t.key === value}
          onClick={() => onChange(t.key)}
          className={cn(
            "min-h-11 flex-1 rounded-[9px] px-3 text-[13px] font-bold transition-colors",
            t.key === value
              ? "border border-border-default bg-surface-elevated text-text-primary shadow-xs"
              : "border border-transparent text-text-secondary hover:text-text-primary",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app-next && npx vitest run src/components/ui/__tests__/segmented-control.test.tsx`
Expected: PASS (3 test).

- [ ] **Step 5: Commit**

```bash
git add app-next/src/components/ui/segmented-control.tsx app-next/src/components/ui/__tests__/segmented-control.test.tsx
git commit -m "feat(ui): SegmentedControl — segmented góc bo dùng chung (port mock)"
```

---

### Task 4: Route group `(wide)` (idempotent) + chuyển `/pinyin`

**Files:**
- Create (chỉ khi chưa có): `app-next/src/app/(wide)/layout.tsx`
- Move: `app-next/src/app/(app)/pinyin/` → `app-next/src/app/(wide)/pinyin/` (nội dung page + practice giữ nguyên — thay ở Task 10)

- [ ] **Step 1: Tạo (wide) nếu chưa có**

```bash
cd app-next && ls "src/app/(wide)" 2>/dev/null || mkdir -p "src/app/(wide)"
```

Nếu `src/app/(wide)/layout.tsx` chưa tồn tại, tạo đúng nội dung sau (nếu đã có — hanzi plan chạy trước — bỏ qua):

```tsx
// app-next/src/app/(wide)/layout.tsx
/* Route group (wide) — container 1280px cho các trang mock max-width lớn.
   Shell nằm ở root layout nên URL không đổi; (app) giữ max-w-5xl.
   Dùng chung bởi plan hanzi-studio + pinyin-lab (spec 2026-10-05). */

export default function WideLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-[1280px] px-4 py-6 pb-28 lg:pb-6">{children}</div>;
}
```

- [ ] **Step 2: Move thư mục**

```bash
cd app-next && git mv "src/app/(app)/pinyin" "src/app/(wide)/pinyin"
```

- [ ] **Step 3: Verify**

Run: `cd app-next && grep -rn '(app)/pinyin' src ; npm run typecheck && npx vitest run src/components/pinyin`
Expected: grep không ra gì; typecheck sạch; test pinyin hiện có PASS (components chưa đổi).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "refactor(app): chuyển /pinyin sang route group (wide) (tạo nếu thiếu)"
```

---

### Task 5: `ToneLab` + `SandhiRules` (2 panel tĩnh)

**Files:**
- Create: `app-next/src/components/pinyin/lab/tone-lab.tsx`, `app-next/src/components/pinyin/lab/sandhi-rules.tsx`
- Test: `app-next/src/components/pinyin/lab/__tests__/tone-lab.test.tsx`

**Interfaces:**
- Consumes: `PINYIN_LAB_TONE_CARDS`, `PINYIN_LAB_SANDHI`, `useTts`.
- Produces: `ToneLab()` (không props, tự speak); `SandhiRules({ onSpeak }: { onSpeak: (s: string) => void })`.

- [ ] **Step 1: Write the failing test**

```tsx
// app-next/src/components/pinyin/lab/__tests__/tone-lab.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { ToneLab } from "../tone-lab";
import { SandhiRules } from "../sandhi-rules";

const speakMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/tts/use-tts", () => ({
  useTts: () => ({ speak: speakMock, cancel: () => {}, speaking: false }),
}));

function getByODId(id: string) {
  return document.querySelector(`[data-od-id="${id}"]`) as HTMLElement;
}

afterEach(() => { cleanup(); speakMock.mockClear(); });

describe("ToneLab", () => {
  it("4 card đúng tên + ví dụ; 4 contour svg riêng biệt", () => {
    const { container } = render(<ToneLab />);
    expect(getByODId("tone-lab").textContent).toContain("Thanh 1 (55)");
    expect(getByODId("tone-lab").textContent).toContain("mā");
    expect(getByODId("tone-lab").textContent).toContain("妈 · Mẹ");
    const contours = container.querySelectorAll('svg[viewBox="0 0 120 44"]'); // bỏ qua svg icon
    expect(contours.length).toBe(4);
    expect(contours[2].querySelector("polyline")).not.toBeNull(); // thanh 3: dip
  });
  it("speaker: speak(py) rate 0.95", () => {
    const { getByLabelText } = render(<ToneLab />);
    act(() => getByLabelText("Nghe mā").click());
    expect(speakMock).toHaveBeenCalledWith("mā", { rate: 0.95 });
  });
});

describe("SandhiRules", () => {
  it("3 rule; ví dụ bấm → onSpeak(py)", () => {
    const onSpeak = vi.fn();
    const { getByText } = render(<SandhiRules onSpeak={onSpeak} />);
    expect(document.querySelectorAll("[data-rule]").length).toBe(3);
    act(() => getByText("yídìng", { exact: false }).click());
    expect(onSpeak).toHaveBeenCalledWith("yídìng");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && npx vitest run src/components/pinyin/lab/__tests__/tone-lab.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Write the components**

```tsx
// app-next/src/components/pinyin/lab/tone-lab.tsx
"use client";

/* Tone lab — port .tones/.tone/.ex/.spk của opendesign_hsk/pinyin.html: 4 card
   thanh điệu với SVG contour + ví dụ mā má mǎ mà + speaker (pop khi phát). */
import { useState } from "react";
import { Volume2 } from "@/components/ui/icon";
import { PINYIN_LAB_TONE_CARDS } from "@/content/pinyin-lab";
import { useTts } from "@/lib/tts/use-tts";
import { cn } from "@/lib/cn";

const CONTOUR: Record<string, React.ReactNode> = {
  flat: <line x1="8" y1="10" x2="112" y2="10" />,
  up: <line x1="8" y1="36" x2="112" y2="10" />,
  dip: <polyline points="8,10 60,36 112,22" />,
  down: <line x1="8" y1="10" x2="112" y2="36" />,
};

export function ToneLab() {
  const { speak } = useTts();
  const [playing, setPlaying] = useState<string | null>(null);

  const say = (py: string) => {
    setPlaying(py);
    window.setTimeout(() => setPlaying((cur) => (cur === py ? null : cur)), 500);
    speak(py, { rate: 0.95 });
  };

  return (
    <div data-od-id="tone-lab" className="mb-4 grid grid-cols-1 gap-3 min-[461px]:grid-cols-2 min-[861px]:grid-cols-4">
      {PINYIN_LAB_TONE_CARDS.map((c) => (
        <article
          key={c.name}
          className="rounded-card border border-border-subtle bg-surface-elevated p-4 shadow-xs transition-transform hover:-translate-y-0.5"
        >
          <h3 className="text-[13.5px] font-bold text-text-primary">
            {c.name} <small className="font-medium text-text-secondary">{c.sub}</small>
          </h3>
          <svg
            viewBox="0 0 120 44"
            aria-hidden="true"
            className="my-2.5 block h-11 w-full"
            stroke="var(--learning-progress)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          >
            {CONTOUR[c.contour]}
          </svg>
          <div className="flex items-center gap-2 rounded-[10px] border border-border-subtle bg-surface-muted px-2.5 py-2">
            <span>
              <b className="text-sm text-text-primary">{c.ex.py}</b>{" "}
              <small className="text-xs font-medium text-text-secondary">
                <span className="zh">{c.ex.zh}</span> · {c.ex.vi}
              </small>
            </span>
            <button
              type="button"
              aria-label={`Nghe ${c.ex.py}`}
              onClick={() => say(c.ex.py)}
              className={cn(
                "ml-auto grid h-[34px] w-[34px] min-w-[34px] place-items-center rounded-full border border-border-subtle bg-surface-elevated text-action-primary hover:border-action-primary",
                playing === c.ex.py && "animate-[pop_0.5s_ease]",
              )}
            >
              <Volume2 size={15} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
```

```tsx
// app-next/src/components/pinyin/lab/sandhi-rules.tsx
"use client";

/* Sandhi — port #sandhiPane/.rule/.exbtn của mock: 3 quy tắc biến âm + ví dụ phát âm. */
import { PINYIN_LAB_SANDHI } from "@/content/pinyin-lab";

export function SandhiRules({ onSpeak }: { onSpeak: (s: string) => void }) {
  return (
    <div data-od-id="sandhi-rules" className="grid gap-3">
      {PINYIN_LAB_SANDHI.map((r) => (
        <article key={r.t} data-rule className="rounded-card border border-border-subtle bg-surface-elevated p-[18px] shadow-xs">
          <h3 className="text-[15px] font-bold text-text-primary">{r.t}</h3>
          <p className="mb-2.5 mt-1.5 text-[13px] text-text-secondary">{r.d}</p>
          <div className="flex flex-wrap gap-2">
            {r.ex.map(([py, zh, vi]) => (
              <button
                key={py}
                type="button"
                onClick={() => onSpeak(py)}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border border-border-subtle bg-surface-muted px-3 py-2 text-[13px] font-bold text-text-primary hover:border-action-primary hover:text-action-primary"
              >
                {py} · <span className="zh">{zh}</span>{" "}
                <small className="font-normal text-text-secondary">{vi}</small>
              </button>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app-next && npx vitest run src/components/pinyin/lab/__tests__/tone-lab.test.tsx`
Expected: PASS (3 test).

- [ ] **Step 5: Commit**

```bash
git add app-next/src/components/pinyin/lab/
git commit -m "feat(pinyin): ToneLab + SandhiRules — 4 card thanh điệu + 3 quy tắc biến âm (port mock)"
```

---

### Task 6: `SoundMatrix` — ma trận thanh mẫu/vận mẫu

**Files:**
- Create: `app-next/src/components/pinyin/lab/sound-matrix.tsx`
- Test: `app-next/src/components/pinyin/lab/__tests__/sound-matrix.test.tsx`

**Interfaces:**
- Consumes: `PINYIN_LAB_GROUPS/BASE/FINALS/GROUP_OF`.
- Produces: `SoundMatrix({ cat, art, sel, onSel, onSpeak }: { cat: "ini" | "fin"; art: string; sel: string; onSel: (ch: string) => void; onSpeak: (s: string) => void })`.

- [ ] **Step 1: Write the failing test**

```tsx
// app-next/src/components/pinyin/lab/__tests__/sound-matrix.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { SoundMatrix } from "../sound-matrix";

afterEach(cleanup);

const setup = (over: Partial<Parameters<typeof SoundMatrix>[0]> = {}) =>
  render(<SoundMatrix cat="ini" art="all" sel="b" onSel={() => {}} onSpeak={() => {}} {...over} />);

describe("SoundMatrix — thanh mẫu", () => {
  it("đủ 23 icard theo 7 nhóm; ô b active; small là [BASE]", () => {
    const { container } = setup();
    expect(container.querySelectorAll("[data-ini]").length).toBe(23);
    expect(container.querySelectorAll("[data-group]").length).toBe(7);
    const b = container.querySelector('[data-ini="b"]')!;
    expect(b.className).toContain("border-action-primary");
    expect(b.textContent).toContain("[bō]");
  });
  it("art lọc: palatal → chỉ j q x (w/y biến mất khi art != all)", () => {
    const { container } = setup({ art: "palatal" });
    const cards = [...container.querySelectorAll("[data-ini]")].map((el) => el.getAttribute("data-ini"));
    expect(cards).toEqual(["j", "q", "x"]);
  });
  it("heading nhóm chỉ hiện khi có item; bấm ô → onSel(ch)", () => {
    const onSel = vi.fn();
    const { container } = setup({ art: "velar", onSel });
    expect(container.querySelectorAll("[data-group]").length).toBe(1);
    act(() => (container.querySelector('[data-ini="g"]') as HTMLElement).click());
    expect(onSel).toHaveBeenCalledWith("g");
  });
});

describe("SoundMatrix — vận mẫu", () => {
  it("36 icard theo 4 nhóm; bấm → onSpeak(Hán đầu của ex)", () => {
    const onSpeak = vi.fn();
    const { container } = setup({ cat: "fin", art: "all", onSpeak });
    expect(container.querySelectorAll("[data-fin]").length).toBe(36);
    expect(container.querySelectorAll("[data-group]").length).toBe(4);
    act(() => (container.querySelector('[data-fin="ai"]') as HTMLElement).click());
    expect(onSpeak).toHaveBeenCalledWith("爱"); // mock: speak(ex.split(" ")[0])
  });
  it("art lọc nhóm: simple → chỉ nhóm Đơn (7 ô)", () => {
    const { container } = setup({ cat: "fin", art: "simple" });
    expect(container.querySelectorAll("[data-fin]").length).toBe(7);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && npx vitest run src/components/pinyin/lab/__tests__/sound-matrix.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Write the component**

```tsx
// app-next/src/components/pinyin/lab/sound-matrix.tsx
"use client";

/* Ma trận âm — port renderMatrix() của mock: thanh mẫu grouped 7 nhóm khẩu hình /
   vận mẫu grouped 4 nhóm; icard active + [BASE]; bấm ô phát âm. Presentational. */
import {
  PINYIN_LAB_GROUPS, PINYIN_LAB_BASE, PINYIN_LAB_FINALS, PINYIN_LAB_GROUP_OF,
} from "@/content/pinyin-lab";
import { cn } from "@/lib/cn";

const ICARD =
  "min-h-[76px] rounded-xl border border-border-subtle bg-surface-muted px-1.5 py-2.5 text-center transition-all hover:-translate-y-0.5 hover:border-border-strong";

export function SoundMatrix({
  cat, art, sel, onSel, onSpeak,
}: {
  cat: "ini" | "fin";
  art: string;
  sel: string;
  onSel: (ch: string) => void;
  onSpeak: (s: string) => void;
}) {
  if (cat === "fin") {
    const want = art === "all" ? null : ({ simple: "Đơn", compound: "Kép", nasal: "Mũi" } as Record<string, string>)[art] ?? null;
    return (
      <div data-od-id="sound-matrix-body">
        {PINYIN_LAB_FINALS.filter((g) => !want || g.label.startsWith(want)).map((g) => (
          <section key={g.label}>
            <div data-group className="mb-2 mt-3.5 text-[11.5px] font-extrabold tracking-[0.06em] text-text-secondary first:mt-0">
              {g.label}
            </div>
            <div className="grid grid-cols-3 gap-2 min-[521px]:grid-cols-4">
              {g.items.map(([py, ex]) => (
                <button key={py} type="button" data-fin={py} onClick={() => onSpeak(ex.split(" ")[0])} className={cn(ICARD, "cursor-pointer")}>
                  <b className="block text-[22px] leading-[1.3] text-text-primary">{py}</b>
                  <small className="text-[11px] text-text-secondary">
                    <span className="zh">{ex.split(" ")[0]}</span> {ex.split(" ")[1]}
                  </small>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div data-od-id="sound-matrix-body">
      {PINYIN_LAB_GROUPS.map((g) => {
        const items = g.items.filter((x) => {
          if (art === "all") return true;
          if (x === "w" || x === "y") return false; // mock: bán nguyên âm không thuộc nhóm art
          return PINYIN_LAB_GROUP_OF[x] === art;
        });
        if (!items.length) return null;
        return (
          <section key={g.label}>
            <div data-group className="mb-2 mt-3.5 text-[11.5px] font-extrabold tracking-[0.06em] text-text-secondary first:mt-0">
              {g.label}
            </div>
            <div className="grid grid-cols-3 gap-2 min-[521px]:grid-cols-4">
              {items.map((x) => (
                <button
                  key={x}
                  type="button"
                  data-ini={x}
                  onClick={() => onSel(x)}
                  className={cn(
                    ICARD,
                    "cursor-pointer",
                    x === sel && "border-2 border-action-primary bg-rose-wash px-1 py-2",
                  )}
                >
                  <b className="block text-[22px] leading-[1.3] text-text-primary">{x}</b>
                  <small className="font-mono text-[11px] text-text-secondary">[{PINYIN_LAB_BASE[x]}]</small>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app-next && npx vitest run src/components/pinyin/lab/__tests__/sound-matrix.test.tsx`
Expected: PASS (5 test).

- [ ] **Step 5: Commit**

```bash
git add app-next/src/components/pinyin/lab/sound-matrix.tsx app-next/src/components/pinyin/lab/__tests__/sound-matrix.test.tsx
git commit -m "feat(pinyin): SoundMatrix — ma trận thanh mẫu/vận mẫu grouped + filter khẩu hình"
```

---

### Task 7: `SoundInspector` — chi tiết âm

**Files:**
- Create: `app-next/src/components/pinyin/lab/sound-inspector.tsx`
- Test: `app-next/src/components/pinyin/lab/__tests__/sound-inspector.test.tsx`

**Interfaces:**
- Consumes: `PINYIN_LAB_DESC/TIP/TONES`.
- Produces: `SoundInspector({ sel, onDrill, onSpeak }: { sel: string; onDrill: (ch: string) => void; onSpeak: (s: string) => void })`.

- [ ] **Step 1: Write the failing test**

```tsx
// app-next/src/components/pinyin/lab/__tests__/sound-inspector.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { SoundInspector } from "../sound-inspector";

afterEach(cleanup);

describe("SoundInspector", () => {
  it("thanh mẫu: title + desc + 'Khẩu hình:' + 4 hàng tone + speaker", () => {
    const onSpeak = vi.fn();
    const { getByLabelText, getByText } = render(
      <SoundInspector sel="b" onDrill={() => {}} onSpeak={onSpeak} />,
    );
    expect(getByText("Âm đang chọn: b (thanh mẫu)")).toBeTruthy();
    expect(document.body.textContent).toContain("Âm hai môi, không bật hơi");
    expect(document.body.textContent).toContain("Khẩu hình:");
    expect(document.body.textContent).toContain("Bảng ghép 4 thanh điệu");
    expect(document.body.textContent).toContain("爸");
    act(() => getByLabelText("Nghe bà").click());
    expect(onSpeak).toHaveBeenCalledWith("bà");
  });
  it("bán nguyên âm w: title '(bán nguyên âm)'", () => {
    const { getByText } = render(<SoundInspector sel="w" onDrill={() => {}} onSpeak={() => {}} />);
    expect(getByText("Âm đang chọn: w (bán nguyên âm)")).toBeTruthy();
  });
  it("drill → onDrill(sel)", () => {
    const onDrill = vi.fn();
    const { getByText } = render(<SoundInspector sel="b" onDrill={onDrill} onSpeak={() => {}} />);
    act(() => getByText("Luyện riêng với âm này").click());
    expect(onDrill).toHaveBeenCalledWith("b");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && npx vitest run src/components/pinyin/lab/__tests__/sound-inspector.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Write the component**

```tsx
// app-next/src/components/pinyin/lab/sound-inspector.tsx
"use client";

/* Inspector — port aside.insp của mock: sticky phải, big/desc/tip khẩu hình,
   bảng 4 thanh điệu với speaker từng hàng, nút drill sang quiz. */
import { Volume2 } from "@/components/ui/icon";
import { PINYIN_LAB_DESC, PINYIN_LAB_TIP, PINYIN_LAB_TONES } from "@/content/pinyin-lab";

export function SoundInspector({
  sel, onDrill, onSpeak,
}: {
  sel: string;
  onDrill: (ch: string) => void;
  onSpeak: (s: string) => void;
}) {
  const isSemi = sel === "w" || sel === "y";
  const rows = PINYIN_LAB_TONES[sel] ?? []; // sel có thể ngoài data — an toàn (Review Focus #4)

  return (
    <aside
      data-od-id="sound-inspector"
      aria-label="Chi tiết âm"
      className="self-start max-lg:static lg:sticky lg:top-20 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:pr-1 [scrollbar-width:thin]"
    >
      <div className="rounded-card border border-border-subtle bg-surface-elevated p-[18px] shadow-xs">
        <h2 className="text-sm font-bold text-text-primary">
          Âm đang chọn: {sel}
          {isSemi ? " (bán nguyên âm)" : " (thanh mẫu)"}
        </h2>
        <div className="mt-1 text-[44px] leading-[1.2] text-text-primary">{sel}</div>
        <p className="mb-1 mt-1.5 text-[13px] text-text-secondary">{PINYIN_LAB_DESC[sel] ?? ""}</p>
        <div className="mb-3 rounded-[10px] border border-border-subtle bg-surface-muted px-3 py-2.5 text-[12.5px] text-text-secondary">
          Khẩu hình: {PINYIN_LAB_TIP[sel] ?? ""}
        </div>
        <h2 className="mb-2 text-sm font-bold text-text-primary">Bảng ghép 4 thanh điệu</h2>
        <div className="grid gap-[7px]">
          {rows.map(([py, zh, vi]) => (
            <div
              key={py}
              className="flex items-center gap-2.5 rounded-[10px] border border-border-subtle bg-surface-muted px-2.5 py-2 text-[13.5px] text-text-primary"
            >
              <b className="min-w-[44px]">{py}</b>
              <span className="zh">{zh}</span>
              <small className="text-text-secondary">{vi}</small>
              <button
                type="button"
                aria-label={`Nghe ${py}`}
                onClick={() => onSpeak(py)}
                className="ml-auto grid h-8 w-8 min-w-8 place-items-center rounded-lg border border-border-subtle bg-surface-elevated text-action-primary hover:border-action-primary"
              >
                <Volume2 size={14} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onDrill(sel)}
          className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-xl border bg-transparent px-5 font-semibold text-action-primary transition-colors hover:bg-rose-wash"
          style={{ borderColor: "color-mix(in srgb, var(--action-primary) 40%, transparent)" }}
        >
          Luyện riêng với âm này
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app-next && npx vitest run src/components/pinyin/lab/__tests__/sound-inspector.test.tsx`
Expected: PASS (3 test).

- [ ] **Step 5: Commit**

```bash
git add app-next/src/components/pinyin/lab/sound-inspector.tsx app-next/src/components/pinyin/lab/__tests__/sound-inspector.test.tsx
git commit -m "feat(pinyin): SoundInspector — chi tiết âm + bảng 4 thanh + drill (port mock)"
```

---

### Task 8: `QuizView` — view luyện phản xạ

**Files:**
- Create: `app-next/src/components/pinyin/lab/quiz-view.tsx`
- Test: `app-next/src/components/pinyin/lab/__tests__/quiz-view.test.tsx`

**Interfaces:**
- Consumes: `IconButton`, `Volume2`, `PINYIN_LAB_DESC`, type `PinyinLabPoolItem`.
- Produces: `QuizView(props: QuizViewProps)` — presentational thuần:

```ts
export type QuizViewProps = {
  qi: number; total: number; score: number; streak: number; done: boolean;
  opts: PinyinLabPoolItem[];   // 4 items đã shuffle
  target: PinyinLabPoolItem | null;
  picked: number | null;       // index đã chọn; null = chưa trả lời
  playing: boolean;
  onChoose: (i: number) => void;
  onNext: () => void;
  onReplay: () => void;
  onSlow: () => void;
  onReset: () => void;
};
```

- [ ] **Step 1: Write the failing test**

```tsx
// app-next/src/components/pinyin/lab/__tests__/quiz-view.test.tsx
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { buildPool } from "@/lib/pinyin/quiz-engine";
import { PINYIN_LAB_DESC } from "@/content/pinyin-lab";
import { QuizView } from "../quiz-view";

const pool = buildPool();
const target = pool.find((p) => p.py === "bà")!;
const opts = [pool[0], pool[1], pool[2], target];

const base = {
  qi: 0, total: 10, score: 0, streak: 0, done: false,
  opts, target, picked: null as number | null, playing: false,
  onChoose: vi.fn(), onNext: vi.fn(), onReplay: vi.fn(), onSlow: vi.fn(), onReset: vi.fn(),
};

afterEach(cleanup);

describe("QuizView", () => {
  it("head: 'Câu 1 / 10', 'Độ chính xác: —', streak; chưa trả lời → next disabled", () => {
    const { getByText } = render(<QuizView {...base} />);
    expect(getByText("Câu 1 / 10")).toBeTruthy();
    expect(getByText("Độ chính xác: —")).toBeTruthy();
    expect(document.body.textContent).toContain("Chuỗi đúng:");
    expect((getByText("Chọn một đáp án để kiểm tra") as HTMLButtonElement).disabled).toBe(true);
  });

  it("4 option key A–D; click → onChoose(i)", () => {
    const onChoose = vi.fn();
    const { container } = render(<QuizView {...base} onChoose={onChoose} />);
    const optionBtns = container.querySelectorAll("[data-opt]");
    expect(optionBtns.length).toBe(4);
    expect(optionBtns[0].textContent).toContain("A");
    act(() => (optionBtns[2] as HTMLElement).click());
    expect(onChoose).toHaveBeenCalledWith(2);
  });

  it("picked sai: opt good/bad + feedback 'Chưa đúng.' + next 'Câu tiếp theo (Enter)'", () => {
    const { getByText, container } = render(<QuizView {...base} picked={0} qi={1} score={0} streak={0} />);
    expect(container.querySelector("[data-opt='3']")!.className).toContain("good"); // đáp án đúng idx 3
    expect(container.querySelector("[data-opt='0']")!.className).toContain("bad");
    expect(document.body.textContent).toContain("Chưa đúng.");
    expect(document.body.textContent).toContain("Đáp án là");
    expect(getByText("Câu tiếp theo (Enter)")).toBeTruthy();
  });

  it("đáp án đúng: feedback 'Chính xác!' kèm DESC của âm", () => {
    render(<QuizView {...base} picked={3} qi={1} score={1} streak={1} />);
    expect(document.body.textContent).toContain("Chính xác!");
    expect(document.body.textContent).toContain(PINYIN_LAB_DESC.b);
  });

  it("done: tổng kết đúng tier + primary 'Chơi phiên mới' → onNext; reset × → onReset", () => {
    const onNext = vi.fn();
    const onReset = vi.fn();
    const { getByText, getByLabelText } = render(
      <QuizView {...base} done qi={10} score={7} opts={[]} target={null} onNext={onNext} onReset={onReset} />,
    );
    expect(document.body.textContent).toContain("Hoàn thành phiên!");
    expect(document.body.textContent).toContain("Đúng 7/10 (70%)");
    expect(document.body.textContent).toContain("Tai nghe rất thính!"); // tier score >= 8? 7 → tier giữa
    act(() => getByText("Chơi phiên mới (Enter)").click());
    expect(onNext).toHaveBeenCalledTimes(1);
    act(() => getByLabelText("Chơi lại phiên mới").click());
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("emit/slow gọi đúng callbacks", () => {
    const onReplay = vi.fn();
    const onSlow = vi.fn();
    const { getByLabelText, getByText } = render(<QuizView {...base} onReplay={onReplay} onSlow={onSlow} />);
    act(() => getByLabelText("Nghe âm thanh").click());
    expect(onReplay).toHaveBeenCalledTimes(1);
    act(() => getByText("Nghe chậm 0.8x").click());
    expect(onSlow).toHaveBeenCalledTimes(1);
  });
});
```

**Lưu ý copy tier:** score 7 → tier giữa "Tiến bộ rõ — luyện thêm nhóm âm yếu nhé." (7 < 8). Sửa assertion tier cho đúng: dùng score 9 → "Tai nghe rất thính!". (Trong test trên đổi `score={7}` → `score={9}` và "Đúng 9/10 (90%)".)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && npx vitest run src/components/pinyin/lab/__tests__/quiz-view.test.tsx`
Expected: FAIL — module không tồn tại.

- [ ] **Step 3: Write the component**

```tsx
// app-next/src/components/pinyin/lab/quiz-view.tsx
"use client";

/* View luyện phản xạ — port #viewQuiz của mock: quiz-head + deck (emit, slow,
   4 options A–D, feedback, next). Presentational; engine + TTS ở root. */
import { Flame, Volume2 } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { PINYIN_LAB_DESC } from "@/content/pinyin-lab";
import type { PinyinLabPoolItem } from "@/lib/pinyin/quiz-engine";
import { cn } from "@/lib/cn";

const KEYS = ["A", "B", "C", "D"];

export type QuizViewProps = {
  qi: number;
  total: number;
  score: number;
  streak: number;
  done: boolean;
  opts: PinyinLabPoolItem[];
  target: PinyinLabPoolItem | null;
  picked: number | null;
  playing: boolean;
  onChoose: (i: number) => void;
  onNext: () => void;
  onReplay: () => void;
  onSlow: () => void;
  onReset: () => void;
};

export function QuizView(p: QuizViewProps) {
  const rightIdx = p.target && !p.done ? p.opts.findIndex((o) => o.py === p.target!.py) : -1;
  const acc = p.qi ? Math.round((p.score / p.qi) * 100) : null;

  return (
    <div data-od-id="quiz-view">
      <div
        data-od-id="quiz-header"
        className="flex flex-wrap items-center gap-2.5 rounded-card border border-border-subtle bg-surface-elevated px-[18px] py-3.5 text-[13.5px] font-bold text-text-primary"
      >
        <span>Câu {Math.min(p.qi + 1, p.total)} / {p.total}</span>
        <span className="text-text-secondary">·</span>
        <span>Độ chính xác: {acc === null ? "—" : acc + "%"}</span>
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-amber-line bg-amber-wash px-3 py-1 text-xs font-extrabold text-amber-ink">
          <Flame size={13} aria-hidden="true" /> Chuỗi đúng: <b>{p.streak}</b>
        </span>
        <IconButton
          label="Chơi lại phiên mới"
          variant="ghost"
          className="h-9 min-h-9 w-9 min-w-9 rounded-[10px]"
          onClick={p.onReset}
        >
          ×
        </IconButton>
      </div>

      <div
        data-od-id="quiz-deck"
        className="mx-auto mt-3.5 w-full max-w-[640px] rounded-[20px] border border-border-subtle bg-surface-elevated px-6 py-7 text-center shadow-xs"
      >
        <button
          type="button"
          aria-label="Nghe âm thanh"
          onClick={p.onReplay}
          className={cn(
            "inline-grid h-20 w-20 place-items-center rounded-full border border-action-primary bg-action-primary text-white shadow-[0_10px_26px_rgba(200,60,50,.35)] transition-transform hover:scale-105 active:scale-95",
            p.playing && "animate-[pop_0.5s_ease]",
          )}
        >
          <Volume2 size={32} strokeWidth={2} aria-hidden="true" />
        </button>
        <div>
          <button
            type="button"
            onClick={p.onSlow}
            className="mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border-subtle bg-surface-muted px-4 py-2 text-[12.5px] font-bold text-text-secondary hover:border-action-primary hover:text-action-primary"
          >
            Nghe chậm 0.8x
          </button>
        </div>
        <p className="mt-2.5 text-[13px] font-medium text-text-secondary">
          Nghe kỹ và chọn âm tiết đúng vừa phát ra <b className="text-text-primary">(Space = nghe lại)</b>
        </p>

        {!p.done && (
          <div data-od-id="quiz-opts" className="mt-[18px] grid grid-cols-1 gap-2.5 min-[481px]:grid-cols-2">
            {p.opts.map((o, i) => {
              const isPicked = p.picked === i;
              const isRight = p.picked !== null && i === rightIdx;
              return (
                <button
                  key={o.py + i}
                  type="button"
                  data-opt={i}
                  disabled={p.picked !== null}
                  onClick={() => p.onChoose(i)}
                  className={cn(
                    "flex min-h-[76px] items-center gap-3 rounded-[14px] border border-border-subtle bg-surface-muted px-[18px] text-2xl font-semibold tracking-[0.02em] text-text-primary",
                    p.picked === null && "hover:border-border-strong",
                    isRight && "good border-2 border-learning-mastered bg-jade-wash text-[color:var(--hz-jade-ink,#065F46)]",
                    isPicked && !isRight && "bad border-2 border-action-primary bg-rose-wash text-rose-ink animate-[shake_0.35s_ease]",
                    p.picked !== null && "cursor-default",
                  )}
                >
                  <span className="grid h-7 w-7 min-w-7 place-items-center rounded-full border border-border-subtle bg-surface-elevated text-[11px] font-extrabold text-text-secondary">
                    {KEYS[i]}
                  </span>
                  <span>{o.py}</span>
                </button>
              );
            })}
          </div>
        )}

        {!p.done && p.picked !== null && p.target && (
          <div
            data-od-id="quiz-feedback"
            className="mt-3.5 rounded-xl border border-border-subtle bg-surface-muted p-3.5 text-left text-[13.5px] text-text-primary"
          >
            {p.picked === rightIdx ? (
              <>
                <b className="text-feedback-success">Chính xác!</b> “{p.target.py}” (<span className="zh">{p.target.zh}</span> — {p.target.vi}). {PINYIN_LAB_DESC[p.target.ini]}
              </>
            ) : (
              <>
                <b className="text-action-primary">Chưa đúng.</b> Đáp án là “{p.target.py}” (<span className="zh">{p.target.zh}</span> — {p.target.vi}). {PINYIN_LAB_DESC[p.target.ini]}
              </>
            )}
          </div>
        )}

        {p.done && (
          <div
            data-od-id="quiz-feedback"
            className="mt-3.5 rounded-xl border border-border-subtle bg-surface-muted p-3.5 text-left text-[13.5px] text-text-primary"
          >
            <b className="text-feedback-success">Hoàn thành phiên!</b> Đúng {p.score}/{p.total} ({Math.round((p.score / p.total) * 100)}%).{" "}
            {p.score >= 8 ? "Tai nghe rất thính!" : p.score >= 5 ? "Tiến bộ rõ — luyện thêm nhóm âm yếu nhé." : "Hãy nghe chậm và đối chiếu từng cặp."}
          </div>
        )}

        <button
          type="button"
          disabled={p.picked === null && !p.done}
          onClick={p.onNext}
          className="mt-3.5 inline-flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl border border-action-primary bg-action-primary text-[14.5px] font-semibold text-white hover:bg-action-primary-hover disabled:cursor-not-allowed disabled:border-border-subtle disabled:bg-surface-muted disabled:text-text-secondary disabled:shadow-none"
        >
          {p.done ? "Chơi phiên mới (Enter)" : p.picked !== null ? "Câu tiếp theo (Enter)" : "Chọn một đáp án để kiểm tra"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app-next && npx vitest run src/components/pinyin/lab/__tests__/quiz-view.test.tsx`
Expected: PASS (6 test).

- [ ] **Step 5: Commit**

```bash
git add app-next/src/components/pinyin/lab/quiz-view.tsx app-next/src/components/pinyin/lab/__tests__/quiz-view.test.tsx
git commit -m "feat(pinyin): QuizView — head/deck/options/feedback port mock"
```

---

### Task 9: `progressStore` — best pinyin lab

**Files:**
- Modify: `app-next/src/lib/store/progress-store.ts` (class `ProgressStore` + interface `ProgressStoreApi` nếu class implement interface)
- Test: `app-next/src/lib/store/__tests__/progress-store-pinyin-lab.test.ts`

**Interfaces:**
- Consumes: `readNum/writeNum/dispatchProgress` nội bộ file store.
- Produces: `progressStore.getPinyinLabBest(): number`, `progressStore.recordPinyinLabResult(correct: number): void` (Task 10 dùng).

- [ ] **Step 1: Write the failing test**

```ts
// app-next/src/lib/store/__tests__/progress-store-pinyin-lab.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { progressStore } from "../progress-store";

describe("progressStore pinyin lab best", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("mặc định best = 0", () => {
    expect(progressStore.getPinyinLabBest()).toBe(0);
  });

  it("recordPinyinLabResult: ghi best khi cao hơn; không giảm khi thấp hơn", () => {
    progressStore.recordPinyinLabResult(6);
    expect(progressStore.getPinyinLabBest()).toBe(6);
    progressStore.recordPinyinLabResult(3);
    expect(progressStore.getPinyinLabBest()).toBe(6);
    progressStore.recordPinyinLabResult(9);
    expect(progressStore.getPinyinLabBest()).toBe(9);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app-next && npx vitest run src/lib/store/__tests__/progress-store-pinyin-lab.test.ts`
Expected: FAIL — `getPinyinLabBest is not a function`.

- [ ] **Step 3: Implement**

Trong class `ProgressStore` (thêm cụm mới gần các method roadmap) — đồng bộ signature trong `ProgressStoreApi` nếu có:

```ts
  /* ---------- Pinyin Lab (spec 2026-10-05 §7) ---------- */

  getPinyinLabBest(): number {
    return readNum("bye.pinyin.lab.best");
  }

  recordPinyinLabResult(correct: number): void {
    if (correct <= this.getPinyinLabBest()) return;
    writeNum("bye.pinyin.lab.best", correct);
    dispatchProgress();
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app-next && npx vitest run src/lib/store/__tests__/progress-store-pinyin-lab.test.ts`
Expected: PASS (2 test).

- [ ] **Step 5: Commit**

```bash
git add app-next/src/lib/store/progress-store.ts app-next/src/lib/store/__tests__/progress-store-pinyin-lab.test.ts
git commit -m "feat(store): recordPinyinLabResult + getPinyinLabBest — best luyện phản xạ"
```

---

### Task 10: Root `PinyinLabRoot` + page mới + redirect practice + dọn cũ

**Files:**
- Create: `app-next/src/app/(wide)/pinyin/pinyin-lab-root.tsx`
- Modify: `app-next/src/app/(wide)/pinyin/page.tsx` (thay toàn bộ)
- Modify: `app-next/src/app/(wide)/pinyin/practice/page.tsx` (thay bằng redirect)
- Delete: `app-next/src/components/pinyin/matrix-client.tsx`, `tone-dialog.tsx`, `practice-client.tsx`, `app-next/src/components/pinyin/__tests__/practice-logic.test.ts`
- Modify: `app-next/src/app/globals.css` (keyframes `pop`/`shake` nếu chưa có)
- Test: `app-next/src/app/(wide)/pinyin/__tests__/pinyin-lab-root.test.tsx`

**Interfaces:**
- Consumes: Task 1–9.
- Produces: `default export PinyinLabRoot({ initialMode, initialDrill })`; `/pinyin` hoàn chỉnh; `/pinyin/practice` redirect.

- [ ] **Step 1: Keyframes globals.css**

`grep -n "keyframes pop\|keyframes shake" src/app/globals.css` — nếu thiếu, thêm:

```css
/* Pinyin Lab (port .spk.playing/.opt.bad của opendesign pinyin.html) */
@keyframes pop { 0% { transform: scale(1); } 40% { transform: scale(1.18); } 100% { transform: scale(1); } }
@keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
@media (prefers-reduced-motion: reduce) {
  .animate-\[pop_0\.5s_ease\], .animate-\[shake_0\.35s_ease\] { animation: none; }
}
```

- [ ] **Step 2: Write the failing test**

```tsx
// app-next/src/app/(wide)/pinyin/__tests__/pinyin-lab-root.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import PinyinLabRoot from "../pinyin-lab-root";
import { progressStore } from "@/lib/store/progress-store";

const speakMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/tts/use-tts", () => ({
  useTts: () => ({ speak: speakMock, cancel: () => {}, speaking: false }),
}));

function getByODId(id: string) {
  return document.querySelector(`[data-od-id="${id}"]`) as HTMLElement;
}

beforeEach(() => {
  speakMock.mockClear();
  vi.spyOn(progressStore, "addXp").mockImplementation(() => {});
  vi.spyOn(progressStore, "recordPinyinLabResult").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  cleanup();
});

describe("PinyinLabRoot — ma trận", () => {
  it("mặc định mode matrix: tone lab + toolbar + matrix + inspector; số đếm động", () => {
    render(<PinyinLabRoot initialMode="matrix" initialDrill={null} />);
    expect(getByODId("tone-lab")).toBeTruthy();
    expect(getByODId("mode-switcher").textContent).toContain("Ma trận âm & 4 thanh điệu");
    expect(document.body.textContent).toContain("Thanh mẫu (23)");
    expect(document.body.textContent).toContain("Vận mẫu (36)");
    expect(document.body.textContent).toContain("Biến âm (一 · 不 · 3声)");
    expect(getByODId("sound-matrix")).toBeTruthy();
    expect(getByODId("sound-inspector")).toBeTruthy();
  });

  it("cat 'Biến âm' → sandhi thay split pane", () => {
    const { getByText } = render(<PinyinLabRoot initialMode="matrix" initialDrill={null} />);
    act(() => getByText("Biến âm (一 · 不 · 3声)").click());
    expect(getByODId("sandhi-rules")).toBeTruthy();
    expect(document.querySelector('[data-od-id="sound-matrix"]')).toBeNull();
  });

  it("chọn ô → inspector đổi + speak BASE; drill → mode quiz + phát câu đầu", () => {
    const { container, getByText } = render(<PinyinLabRoot initialMode="matrix" initialDrill={null} />);
    act(() => (container.querySelector('[data-ini="g"]') as HTMLElement).click());
    expect(document.body.textContent).toContain("Âm đang chọn: g (thanh mẫu)");
    expect(speakMock).toHaveBeenCalledWith("gē", { rate: 0.95 });
    speakMock.mockClear();
    act(() => getByText("Luyện riêng với âm này").click());
    expect(getByODId("quiz-view")).toBeTruthy();
    expect(speakMock).toHaveBeenCalled(); // phát câu đầu
  });

  it("Review Focus #3: Space ở matrix không phát gì", () => {
    render(<PinyinLabRoot initialMode="matrix" initialDrill={null} />);
    const calls = speakMock.mock.calls.length;
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true })); });
    expect(speakMock.mock.calls.length).toBe(calls);
  });
});

describe("PinyinLabRoot — quiz", () => {
  it("initialMode quiz: mount → quiz-view + phát câu đầu", () => {
    render(<PinyinLabRoot initialMode="quiz" initialDrill={null} />);
    expect(getByODId("quiz-view")).toBeTruthy();
    expect(speakMock).toHaveBeenCalled();
  });

  it("initialDrill: vào thẳng quiz (pool lọc — assert qua UI không crash + 4 option)", () => {
    render(<PinyinLabRoot initialMode="quiz" initialDrill="sh" />);
    expect(document.querySelectorAll("[data-opt]").length).toBe(4);
  });

  it("trả lời → feedback; Enter sang câu 2 (Review Focus #2: trả lời 2 lần no-op)", () => {
    const { container } = render(<PinyinLabRoot initialMode="quiz" initialDrill={null} />);
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "1", bubbles: true })); });
    expect(document.body.textContent).toMatch(/Chính xác!|Chưa đúng\./);
    expect(document.body.textContent).toMatch(/Độ chính xác: \d+%/);
    const q1 = document.body.textContent!.match(/Câu (\d+) \/ 10/)![1];
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "3", bubbles: true })); }); // đã picked → no-op
    expect(document.body.textContent!.match(/Câu (\d+) \/ 10/)![1]).toBe(q1);
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); });
    expect(document.body.textContent).toMatch(/Câu 2 \/ 10/);
  });

  it("Space phát lại khi chưa trả lời (quiz mode)", () => {
    render(<PinyinLabRoot initialMode="quiz" initialDrill={null} />);
    const calls = speakMock.mock.calls.length;
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true })); });
    expect(speakMock.mock.calls.length).toBe(calls + 1);
  });

  it("reset × → phiên mới + toast copy mock", () => {
    render(<PinyinLabRoot initialMode="quiz" initialDrill={null} />);
    // toastProvider không có trong mount đơn lẻ → useToastSafe no-op; chỉ assert không crash + quiz vẫn hiện
    act(() => (document.querySelector('[aria-label="Chơi lại phiên mới"]') as HTMLElement).click());
    expect(getByODId("quiz-view")).toBeTruthy();
    expect(document.querySelectorAll("[data-opt]").length).toBe(4);
  });

  it("10 câu → tổng kết + XP/best đúng 1 lần (Review Focus #5)", () => {
    render(<PinyinLabRoot initialMode="quiz" initialDrill={null} />);
    for (let q = 0; q < 9; q++) {
      act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "1", bubbles: true })); });
      act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); });
    }
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "1", bubbles: true })); }); // câu 10 → done
    expect(document.body.textContent).toContain("Hoàn thành phiên!");
    expect(progressStore.addXp).toHaveBeenCalledTimes(1);
    expect(progressStore.recordPinyinLabResult).toHaveBeenCalledTimes(1);
    // Enter sau done → phiên mới (mock startQuiz)
    act(() => { window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); });
    expect(document.body.textContent).toMatch(/Câu 1 \/ 10/);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd app-next && npx vitest run "src/app/(wide)/pinyin/__tests__/pinyin-lab-root.test.tsx"`
Expected: FAIL — module không tồn tại.

- [ ] **Step 4: Write the root + pages**

```tsx
// app-next/src/app/(wide)/pinyin/pinyin-lab-root.tsx
"use client";

/* Pinyin Lab root — port 1:1 opendesign_hsk/pinyin.html (spec 2026-10-05).
   Sở hữu state mode/ma trận/quiz; engine pure ở lib/pinyin/quiz-engine.
   KHÔNG side-effect trong setQuiz updater (StrictMode) — đọc state qua quizRef.
   Quiz build sau mount (hydration-safe); XP + best qua progressStore. */
import { useEffect, useRef, useState } from "react";
import {
  PINYIN_LAB_ART_FIN, PINYIN_LAB_ART_INI, PINYIN_LAB_BASE,
  PINYIN_LAB_FINALS, PINYIN_LAB_GROUPS,
} from "@/content/pinyin-lab";
import {
  buildPool, distractors, pickTarget, type PinyinLabPoolItem,
} from "@/lib/pinyin/quiz-engine";
import { progressStore } from "@/lib/store/progress-store";
import { useTts } from "@/lib/tts/use-tts";
import { useKeyboard } from "@/lib/use-keyboard";
import { useToastSafe } from "@/components/shell/toast-provider";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { ToneLab } from "@/components/pinyin/lab/tone-lab";
import { SoundMatrix } from "@/components/pinyin/lab/sound-matrix";
import { SoundInspector } from "@/components/pinyin/lab/sound-inspector";
import { SandhiRules } from "@/components/pinyin/lab/sandhi-rules";
import { QuizView } from "@/components/pinyin/lab/quiz-view";

const TOTAL = 10;
type Cat = "ini" | "fin" | "tone";
type Mode = "matrix" | "quiz";

type QuizState = {
  qi: number;
  score: number;
  streak: number;
  target: PinyinLabPoolItem | null;
  opts: PinyinLabPoolItem[];
  picked: number | null;
  done: boolean;
};

const IDLE_QUIZ: QuizState = { qi: 0, score: 0, streak: 0, target: null, opts: [], picked: null, done: false };

/* Số đếm động (spec §1) — mock hardcode 23/36, port tính từ data */
const INI_COUNT = PINYIN_LAB_GROUPS.flatMap((g) => g.items).length;
const FIN_COUNT = PINYIN_LAB_FINALS.flatMap((g) => g.items).length;

export default function PinyinLabRoot({
  initialMode,
  initialDrill,
}: {
  initialMode: Mode;
  initialDrill: string | null;
}) {
  const toast = useToastSafe();
  const { speak } = useTts();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [cat, setCat] = useState<Cat>("ini");
  const [art, setArt] = useState<string>("all");
  const [sel, setSel] = useState("b");
  const [quiz, setQuiz] = useState<QuizState>(IDLE_QUIZ);
  const [playing, setPlaying] = useState(false);

  const poolRef = useRef<PinyinLabPoolItem[] | null>(null);
  if (poolRef.current === null) poolRef.current = buildPool();
  const quizRef = useRef(quiz);
  quizRef.current = quiz;
  const speakRef = useRef(speak);
  speakRef.current = speak;
  const drillRef = useRef<string | null>(initialDrill);
  const settledRef = useRef(false); // XP/best chỉ ghi 1 lần/phiên (Review Focus #5)
  const spokenQRef = useRef(-1); // mỗi câu chỉ tự phát 1 lần
  const bootedRef = useRef(false);

  const pop = () => {
    setPlaying(true);
    window.setTimeout(() => setPlaying(false), 500);
  };

  /* --- ma trận --- */
  const chooseCell = (ch: string) => {
    setSel(ch);
    pop();
    speak(PINYIN_LAB_BASE[ch] ?? ch, { rate: 0.95 }); // mock: speak(BASE[sel])
  };

  /* --- quiz engine (port mock startQuiz/nextQ/answer) --- */
  function nextQ() {
    const pool = poolRef.current!;
    const target = pickTarget(pool, drillRef.current, Math.random);
    const opts = [...distractors(pool, target, Math.random), target];
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]];
    }
    setQuiz((prev) => ({ ...prev, target, opts, picked: null }));
  }

  function startQuiz(drillIni: string | null) {
    drillRef.current = drillIni;
    settledRef.current = false;
    spokenQRef.current = -1;
    setQuiz({ ...IDLE_QUIZ });
    nextQ();
  }

  /* tự phát câu mới (mock nextQ → speak); StrictMode-safe qua spokenQRef */
  useEffect(() => {
    if (quiz.target && spokenQRef.current !== quiz.qi) {
      spokenQRef.current = quiz.qi;
      pop();
      speak(quiz.target.py, { rate: 0.95 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz.target, quiz.qi]);

  function choose(i: number) {
    const prev = quizRef.current;
    if (prev.picked !== null || prev.done || !prev.target) return; // Review Focus #2
    const right = prev.opts.findIndex((o) => o.py === prev.target!.py);
    const ok = i === right;
    const qi = prev.qi + 1;
    const score = prev.score + (ok ? 1 : 0);
    const done = qi >= TOTAL; // mock: nhánh tổng kết là dead-code → port chủ ý hiện tổng kết
    if (done && !settledRef.current) {
      settledRef.current = true;
      progressStore.addXp(score);
      progressStore.recordPinyinLabResult(score);
    }
    setQuiz({ ...prev, picked: i, qi, score, streak: ok ? prev.streak + 1 : 0, done });
  }

  function next() {
    const prev = quizRef.current;
    if (prev.picked === null && !prev.done) return;
    if (prev.done) startQuiz(drillRef.current); // mock: Enter ở tổng kết → phiên mới
    else nextQ();
  }

  function replay() {
    const prev = quizRef.current;
    if (prev.target && prev.picked === null) {
      pop();
      speakRef.current(prev.target.py, { rate: 0.95 });
    }
  }

  function slow() {
    const prev = quizRef.current;
    if (prev.target) speakRef.current(prev.target.py, { rate: 0.65 });
  }

  /* --- keyboard (port mock keydown; useKeyboard bỏ qua INPUT/TEXTAREA) --- */
  useKeyboard({
    " ": (e) => { if (mode === "quiz") { e.preventDefault(); replay(); } },
    "1": () => mode === "quiz" && choose(0),
    "2": () => mode === "quiz" && choose(1),
    "3": () => mode === "quiz" && choose(2),
    "4": () => mode === "quiz" && choose(3),
    a: () => mode === "quiz" && choose(0),
    b: () => mode === "quiz" && choose(1),
    c: () => mode === "quiz" && choose(2),
    d: () => mode === "quiz" && choose(3),
    A: () => mode === "quiz" && choose(0),
    B: () => mode === "quiz" && choose(1),
    C: () => mode === "quiz" && choose(2),
    D: () => mode === "quiz" && choose(3),
    Enter: () => { if (mode === "quiz") next(); },
  });

  /* mount lần đầu ở quiz mode → bắt đầu phiên (hydration: server render skeleton) */
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    if (initialMode === "quiz") startQuiz(initialDrill);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <header data-od-id="pinyin-header">
        <h1 className="text-[22px] font-bold tracking-tight">
          <span className="zh text-action-primary">拼音实验室</span> · Pinyin Lab
        </h1>
        <p className="mt-0.5 text-[13px] text-text-secondary">
          Làm chủ ngữ âm, vị trí đặt lưỡi và phản xạ 4 thanh điệu tiếng Trung
        </p>
      </header>

      <div data-od-id="mode-switcher" className="mx-auto w-full max-w-[560px]">
        <SegmentedControl
          label="Chế độ học"
          radius="2xl"
          tabs={[
            { key: "matrix" as const, label: "Ma trận âm & 4 thanh điệu" },
            { key: "quiz" as const, label: "Luyện phản xạ tai nghe" },
          ]}
          value={mode}
          onChange={(m) => {
            setMode(m);
            if (m === "quiz") startQuiz(drillRef.current); // mock: vào tab quiz luôn khởi phiên mới
          }}
        />
      </div>

      {mode === "matrix" ? (
        <div data-od-id="matrix-view">
          <ToneLab />

          <div
            data-od-id="matrix-filters"
            className="mb-3.5 flex flex-col gap-2.5 rounded-card border border-border-subtle bg-surface-elevated px-4 py-3.5 shadow-xs"
          >
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="min-w-[88px] text-[11px] font-extrabold tracking-[0.07em] text-text-secondary/70">
                NHÓM CHÍNH
              </span>
              <SegmentedTabs
                label="Nhóm âm"
                tabs={[
                  { key: "ini" as const, label: `Thanh mẫu (${INI_COUNT})` },
                  { key: "fin" as const, label: `Vận mẫu (${FIN_COUNT})` },
                  { key: "tone" as const, label: "Biến âm (一 · 不 · 3声)" },
                ]}
                value={cat}
                onChange={(c) => { setCat(c); setArt("all"); }}
              />
            </div>
            {cat !== "tone" && (
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="min-w-[88px] text-[11px] font-extrabold tracking-[0.07em] text-text-secondary/70">
                  PHÂN LOẠI
                </span>
                <SegmentedTabs
                  label="Vị trí phát âm"
                  tabs={(cat === "ini" ? PINYIN_LAB_ART_INI : PINYIN_LAB_ART_FIN).map(([key, label]) => ({ key, label }))}
                  value={art}
                  onChange={setArt}
                />
              </div>
            )}
          </div>

          {cat === "tone" ? (
            <SandhiRules onSpeak={(s) => speak(s, { rate: 0.95 })} />
          ) : (
            <div className="grid items-start gap-3.5 lg:grid-cols-[6fr_4fr]">
              <section
                data-od-id="sound-matrix"
                aria-label="Ma trận âm"
                className="rounded-card border border-border-subtle bg-surface-elevated p-[18px] shadow-xs"
              >
                <h2 className="text-sm font-bold text-text-primary">
                  {cat === "ini" ? `Thanh mẫu · Phụ âm đầu (${INI_COUNT})` : `Vận mẫu · Nguyên âm cuối (${FIN_COUNT})`}
                </h2>
                <p className="mb-3 text-xs text-text-secondary">
                  {cat === "ini"
                    ? "Chạm ô để nghe và xem chi tiết bên phải."
                    : "Chạm ô để nghe mẫu. Nhóm: đơn · kép · mũi."}
                </p>
                {cat === "ini" ? (
                  <SoundMatrix
                    key="ini"
                    cat="ini"
                    art={art}
                    sel={sel}
                    onSel={chooseCell}
                    onSpeak={() => {}}
                  />
                ) : (
                  <SoundMatrix
                    key="fin"
                    cat="fin"
                    art={art}
                    sel={sel}
                    onSel={() => {}}
                    onSpeak={(s) => { pop(); speak(s, { rate: 0.95 }); }}
                  />
                )}
              </section>
              <SoundInspector
                sel={sel}
                onDrill={(ch) => {
                  startQuiz(ch);
                  setMode("quiz");
                  toast(`Luyện riêng với âm “${ch}”`);
                }}
                onSpeak={(s) => speak(s, { rate: 0.95 })}
              />
            </div>
          )}
        </div>
      ) : (
        <div data-od-id="quiz-view-wrap">
          {quiz.target || quiz.done ? (
            <QuizView
              qi={quiz.qi}
              total={TOTAL}
              score={quiz.score}
              streak={quiz.streak}
              done={quiz.done}
              opts={quiz.opts}
              target={quiz.target}
              picked={quiz.picked}
              playing={playing}
              onChoose={choose}
              onNext={next}
              onReplay={replay}
              onSlow={slow}
              onReset={() => {
                startQuiz(null); // mock: reset xoá drill
                toast("Phiên mới: 10 câu ngẫu nhiên");
              }}
            />
          ) : (
            <div
              aria-hidden="true"
              className="mx-auto mt-3.5 h-72 w-full max-w-[640px] animate-pulse rounded-[20px] border border-border-subtle bg-surface-elevated"
            />
          )}
        </div>
      )}
    </div>
  );
}
```

**Chú ý port (đã hardcoded đúng trong code ở trên):** `chooseCell` dùng `PINYIN_LAB_BASE[ch]` đúng mock (`speak(BASE[sel])`); tổng kết phiên là hành vi chủ ý (nhánh tổng kết của mock là dead-code — mock nhảy thẳng phiên mới, port chọn hiện tổng kết để có chỗ hook XP).

```tsx
// app-next/src/app/(wide)/pinyin/page.tsx (thay toàn bộ)
/* /pinyin — Pinyin Lab: ma trận âm & 4 thanh điệu + luyện phản xạ tai nghe
   (port opendesign_hsk/pinyin.html, spec 2026-10-05). Server SSG đọc searchParams
   cho mode/drill; tương tác trong PinyinLabRoot. */

import type { Metadata } from "next";
import PinyinLabRoot from "./pinyin-lab-root";

export const metadata: Metadata = {
  title: "Pinyin Lab",
  description: "Làm chủ ngữ âm, vị trí đặt lưỡi và phản xạ 4 thanh điệu tiếng Trung.",
};

export default async function PinyinPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; drill?: string }>;
}) {
  const sp = await searchParams;
  return (
    <PinyinLabRoot
      initialMode={sp.mode === "quiz" ? "quiz" : "matrix"}
      initialDrill={typeof sp.drill === "string" ? sp.drill : null}
    />
  );
}
```

```tsx
// app-next/src/app/(wide)/pinyin/practice/page.tsx (thay toàn bộ)
/* /pinyin/practice — giữ URL cho link cũ (roadmap, e2e): chuyển thẳng quiz mode. */

import { redirect } from "next/navigation";

export default function PinyinPracticePage() {
  redirect("/pinyin?mode=quiz");
}
```

```bash
cd app-next && git rm src/components/pinyin/matrix-client.tsx src/components/pinyin/tone-dialog.tsx src/components/pinyin/practice-client.tsx src/components/pinyin/__tests__/practice-logic.test.ts
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd app-next && npx vitest run "src/app/(wide)/pinyin" src/components/pinyin src/lib/store`
Expected: PASS — test root (10 test) + mọi test lab + store; không còn test cũ hư.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(pinyin): Pinyin Lab thay /pinyin + redirect /pinyin/practice + XP/best qua store"
```

---

### Task 11: Verification toàn bộ

**Files:** không tạo/sửa (chỉ chạy kiểm chứng; sửa nếu phát hiện lỗi).

- [ ] **Step 1: Typecheck + lint + toàn bộ unit tests**

```bash
cd app-next && npm run typecheck && npm run lint && npm test
```

Expected: cả 3 sạch; suite đầy đủ PASS (e2e hydration vẫn pass vì `/pinyin/practice` redirect server-side).

- [ ] **Step 2: Build production**

```bash
cd app-next && npm run build
```

Expected: build thành công; `/pinyin` và `/pinyin/practice` trong output.

- [ ] **Step 3: Soát trực quan bằng browser (spec §5–§7)**

```bash
cd app-next && npm run dev
```

Dùng skill browser-use mở `http://localhost:3100/pinyin` và kiểm:
1. Light + dark: contour amber, card jade/rose wash đủ tương phản; icard active accent.
2. Ma trận: filter NHÓM CHÍNH/PHÂN LOẠI lọc đúng; chọn ô → speaker + inspector; bảng 4 thanh phát âm từng hàng; drill → quiz.
3. Biến âm: 3 rule + ví dụ phát âm.
4. Quiz: emit + chậm 0.8x; đúng/sai → jade/rose + feedback; streak; Enter/Space/1-4/a-d; reset; hoàn thành → tổng kết + XP tăng (nếu shell hiển thị).
5. `/pinyin/practice` redirect về `/pinyin?mode=quiz`.
6. So khớp tỉ mỉ với `opendesign_hsk/pinyin.html` mở cạnh bên (cùng viewport 1280px).

Lỗi tìm thấy → sửa + chạy lại Step 1, commit `fix(pinyin): …`.

- [ ] **Step 4: Commit cuối (nếu có fix) + báo cáo**

```bash
git status --short
```

Expected: sạch. Báo cáo kết quả vào message kết thúc phiên.
