import { describe, it, expect } from "vitest";
import { cfReducer, cfDefaults, cfDefaultsFor, mergeCfState, parseLine, DEFAULT_CHARS } from "../types";
import type { CfState } from "../types";

describe("cfDefaults (bảng mặc định gốc clone)", () => {
  it("đúng 17 keys mặc định (brief ghi 18 nhưng CfState liệt kê 17, khớp clone cfDefaults): Điền tự, gray, 12/1/0, 3/12, Khải thư, CNstrokeorder, Tô mờ, 30%, 78%, Pinyin+Nghĩa", () => {
    const d = cfDefaults();
    expect(d).toMatchObject({
      tpl: null, title: "", nameDate: true, cellType: "dien-tu", cellColor: "gray",
      perRow: 12, fillRows: 1, blankRows: 0, faintCount: 3, script: "khai",
      strokeSource: "CNstrokeorder", traceStyle: ["faint"], opacity: 30, fontSize: 78,
      showPinyin: true, showMeaning: true,
    });
    expect(d.chars).toEqual(DEFAULT_CHARS);
    expect(Object.keys(d)).toHaveLength(17);
  });
  it("cfDefaultsFor: stroke-order → 6 chữ 永 远 学 习 汉 字; vocab → từ Bài 1 HSK1; khác → DEFAULT_CHARS", () => {
    expect(cfDefaultsFor("stroke-order").chars.map((c) => c.hanzi)).toEqual(["永", "远", "学", "习", "汉", "字"]);
    expect(cfDefaultsFor("big-char").chars[0]).toMatchObject({ hanzi: "永", pinyin: "yǒng", hv: "VĨNH" });
    expect(cfDefaultsFor("vocab").chars[0].hanzi).toBe("你好");
    expect(cfDefaultsFor("grid-paper").chars).toEqual(DEFAULT_CHARS);
  });
  it("mergeCfState: key có trong raw thắng, chars/traceStyle hỏng → default", () => {
    const base = cfDefaults();
    const merged = mergeCfState({ ...base, perRow: 8, chars: "x", traceStyle: [] }, null);
    expect(merged.perRow).toBe(8);
    expect(merged.chars).toEqual(DEFAULT_CHARS);
    expect(merged.traceStyle).toEqual(["faint"]);
  });
});

describe("cfReducer", () => {
  const s = (): CfState => cfDefaults();
  it("set đổi scalar; step clamp min/max", () => {
    expect(cfReducer(s(), { type: "set", key: "cellType", value: "mi" }).cellType).toBe("mi");
    let st = cfReducer(s(), { type: "step", key: "perRow", dir: -1, min: 6, max: 16 });
    expect(st.perRow).toBe(11);
    st = cfReducer(st, { type: "step", key: "perRow", dir: -9, min: 6, max: 16 });
    expect(st.perRow).toBe(6);
    st = cfReducer(st, { type: "step", key: "perRow", dir: 99, min: 6, max: 16 });
    expect(st.perRow).toBe(16);
  });
  it("setTraceStyle toggle; bỏ ô cuối → về ['faint']", () => {
    let st = cfReducer(s(), { type: "setTraceStyle", value: "hollow", checked: true });
    expect(st.traceStyle).toEqual(["faint", "hollow"]);
    st = cfReducer(st, { type: "setTraceStyle", value: "faint", checked: false });
    st = cfReducer(st, { type: "setTraceStyle", value: "hollow", checked: false });
    expect(st.traceStyle).toEqual(["faint"]);
  });
  it("setScript: bỏ chọn Khải thư → về Hành thư (checkbox 1 chọn)", () => {
    expect(cfReducer(s(), { type: "setScript", value: "khai", checked: false }).script).toBe("hanh");
    expect(cfReducer(s(), { type: "setScript", value: "hanh", checked: true }).script).toBe("hanh");
  });
  it("chars: setMeaning/deleteChar/clearChars/addChars parseLine bỏ từ trùng", () => {
    let st = cfReducer(s(), { type: "setMeaning", index: 0, value: "học hành" });
    expect(st.chars[0].meaning).toBe("học hành");
    st = cfReducer(st, { type: "deleteChar", index: 0 });
    expect(st.chars).toHaveLength(3);
    st = cfReducer(st, { type: "addChars", chars: [parseLine("学习 xué xí học tập")!, parseLine("美好 měi hảo tốt đẹp")!] });
    // 学习 đã bị deleteChar ở trên nên không còn trong list → clone cfFind vẫn thêm lại; 美好 là từ mới; chỉ trùng hiện hữu mới bị bỏ
    expect(st.chars.map((c) => c.hanzi)).toEqual(["朋友", "老师", "工作", "学习", "美好"]);
    // trùng hiện hữu → bỏ: thêm lại 朋友 bị từ chối
    st = cfReducer(st, { type: "addChars", chars: [parseLine("朋友 péng yǒu bạn bè")!] });
    expect(st.chars.map((c) => c.hanzi)).toEqual(["朋友", "老师", "工作", "学习", "美好"]);
    st = cfReducer(st, { type: "clearChars" });
    expect(st.chars).toHaveLength(0);
  });
  it("formatAiMock: pinyin chuẩn hoá space, Hán Việt IN HOA từ charInfo, nghĩa fallback chữ đầu", () => {
    const st = cfReducer(s(), { type: "formatAiMock" });
    expect(st.chars[0]).toMatchObject({ hanzi: "学习", pinyin: "xué xí", hv: "HỌC TẬP" });
  });
  it("setTpl đổi tpl giữ nguyên phần còn lại; reset trả default template", () => {
    let st = cfReducer(s(), { type: "step", key: "perRow", dir: 1, min: 6, max: 16 });
    st = cfReducer(st, { type: "setTpl", tpl: "cover" });
    expect(st.tpl).toBe("cover");
    expect(st.perRow).toBe(13);
    expect(cfReducer(st, { type: "reset", tpl: "cover" }).tpl).toBe("cover");
  });
});
