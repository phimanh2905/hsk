/* Port 1:1 từ clone/js/create-file.js:687-719 — reducer cho state CF v2. */

import { cfDefaultsFor, formatVocabMock, mergeCfState } from "./defaults";
import type { CfAction, CfState } from "./types";

function stepVal(cur: number, dir: number, min: number, max: number): number {
  const next = (parseInt(String(cur), 10) || 0) + dir;
  return Math.min(max, Math.max(min, next));
}

export function cfReducer(state: CfState, action: CfAction): CfState {
  switch (action.type) {
    case "set":
      return { ...state, [action.key]: action.value } as CfState;
    case "setTraceStyle": {
      /* checkbox nhóm traceStyle: toggle; bỏ ô cuối → về ["faint"] */
      const arr = state.traceStyle.slice();
      const ix = arr.indexOf(action.value);
      if (action.checked && ix < 0) arr.push(action.value);
      if (!action.checked && ix >= 0) arr.splice(ix, 1);
      return { ...state, traceStyle: arr.length ? arr : ["faint"] };
    }
    case "setScript":
      /* checkbox 1 chọn — bỏ chọn 1 trong 2 thì về lại cái còn lại */
      return { ...state, script: action.checked ? action.value : action.value === "khai" ? "hanh" : "khai" };
    case "step": {
      const key = action.key;
      return { ...state, [key]: stepVal(state[key], action.dir, action.min, action.max) } as CfState;
    }
    case "setMeaning": {
      const chars = state.chars.slice();
      if (chars[action.index]) chars[action.index] = { ...chars[action.index], meaning: action.value };
      return { ...state, chars };
    }
    case "deleteChar": {
      const chars = state.chars.slice();
      chars.splice(action.index, 1);
      return { ...state, chars };
    }
    case "addChars": {
      /* bỏ từ trùng theo hanzi (như clone cfFind) */
      const chars = state.chars.slice();
      action.chars.forEach((c) => {
        if (!c || !c.hanzi) return;
        if (chars.some((x) => x.hanzi === c.hanzi)) return;
        chars.push({ hanzi: c.hanzi, pinyin: c.pinyin, hv: c.hv, meaning: c.meaning });
      });
      return { ...state, chars };
    }
    case "clearChars":
      return { ...state, chars: [] };
    case "formatAiMock":
      return { ...state, chars: formatVocabMock(state.chars) };
    case "setTpl":
      /* chỉ đổi tpl, giữ nguyên phần còn lại (clone data-switch) */
      return { ...state, tpl: action.tpl };
    case "hydrate":
      return mergeCfState(action.state, state.tpl);
    case "reset":
      return cfDefaultsFor(action.tpl);
    default:
      return state;
  }
}
