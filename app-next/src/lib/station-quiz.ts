/* Station quiz — sinh câu hỏi MCQ từ dữ liệu vocab/gram nhúng trong station
   (spec 2026-10-28 §5). Pure trừ submitStationResult (ghi progressStore). */
import type { RoadmapLevel, Station } from "@/content/roadmap-stations";
import { progressStore, type StationProgress } from "@/lib/store/progress-store";
import { PASS_PCT } from "@/lib/roadmap-progress";

export type QuizQuestion = {
  prompt: string;
  options: string[];
  answerIndex: number;
  /** Câu nghe: audioText là hanzi để TTS phát; readVariant hỏi ngược pinyin → hanzi. */
  listen?: {
    audioText: string;
    readPrompt: string;
    readOptions: string[];
    readAnswerIndex: number;
  };
};
export type StationPool = {
  vocab: Array<[string, string, string]>; // [zh, pinyin, việt]
  gram: Array<[string, string]>;          // [tên mẫu, ý nghĩa]
};

type Rng = () => number;

function shuffle<T>(arr: T[], rng: Rng): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function levelPool(level: RoadmapLevel): StationPool {
  const vocab: StationPool["vocab"] = [];
  const gram: StationPool["gram"] = [];
  for (const s of level.stations) {
    if (s.kind !== "lesson") continue;
    vocab.push(...s.vocab);
    gram.push(...s.gram);
  }
  return { vocab, gram };
}

/** 4 options gồm đáp án + 3 nhiễu từ candidates (không trùng, không trùng đáp án). */
function optionsFor(answer: string, candidates: string[], rng: Rng): { options: string[]; answerIndex: number } {
  const uniq = [...new Set(candidates.filter((c) => c !== answer))];
  const picked = shuffle(uniq, rng).slice(0, 3);
  const options = shuffle([answer, ...picked], rng);
  return { options, answerIndex: options.indexOf(answer) };
}

/** 4 options gồm đáp án + 3 nhiễu, ưu tiên cùng loại (F1): gram pool đủ
    dày (≥3 unique cùng loại) thì chỉ dùng cùng loại; mỏng mới trộn
    trường đối ứng để đủ 4 options (station 1 có 2 gram). */
function gramOptionsFor(
  answer: string,
  sameKind: string[],
  otherKind: string[],
  rng: Rng,
): { options: string[]; answerIndex: number } {
  const same = [...new Set(sameKind.filter((c) => c !== answer))];
  const candidates = same.length >= 3 ? same : [...same, ...otherKind];
  return optionsFor(answer, candidates, rng);
}

/** Câu hỏi nghĩa↔từ cho 1 từ vựng (dùng chung station + milestone). */
function vocabMeaningQuestion(w: [string, string, string], pool: StationPool, rng: Rng, toZh?: boolean): QuizQuestion {
  const [zh, , vn] = w;
  const flip = toZh ?? rng() < 0.5;
  const { options, answerIndex } = flip
    ? optionsFor(zh, pool.vocab.map(([z]) => z), rng)
    : optionsFor(vn, pool.vocab.map(([, , v]) => v), rng);
  return flip
    ? { prompt: `Từ nào có nghĩa là “${vn}”?`, options, answerIndex }
    : { prompt: `“${zh}” có nghĩa là gì?`, options, answerIndex };
}

/** Câu nghe: phát hanzi (audioText), chọn pinyin đúng trong 4 phiên âm có dấu;
    readVariant hỏi ngược "đọc là {pinyin}" → chọn hanzi. Distractor ưu tiên
    pinyin/hanzi khác trong pool. */
function listenQuestion(w: [string, string, string], pool: StationPool, rng: Rng): QuizQuestion {
  const [zh, py] = w;
  const pinyinOpts = optionsFor(py, pool.vocab.map(([, p]) => p), rng);
  const readOpts = optionsFor(zh, pool.vocab.map(([z]) => z), rng);
  return {
    prompt: "Nghe từ rồi chọn phiên âm đúng.",
    options: pinyinOpts.options,
    answerIndex: pinyinOpts.answerIndex,
    listen: {
      audioText: zh,
      readPrompt: `Từ nào đọc là “${py}”?`,
      readOptions: readOpts.options,
      readAnswerIndex: readOpts.answerIndex,
    },
  };
}

export function buildStationQuestions(
  station: Station,
  pool: StationPool = { vocab: station.vocab, gram: station.gram },
  rng: Rng = Math.random,
  opts?: { listenEvery?: number },
): QuizQuestion[] {
  const qs: QuizQuestion[] = [];
  const listenEvery = opts?.listenEvery ?? 0;
  station.vocab.forEach(([zh, py, vn], i) => {
    if (listenEvery > 0 && i % listenEvery === listenEvery - 1) {
      qs.push(listenQuestion([zh, py, vn], pool, rng));
    } else if (i % 2 === 0) {
      // nghĩa → từ
      const { options, answerIndex } = optionsFor(zh, pool.vocab.map(([z]) => z), rng);
      qs.push({ prompt: `Từ nào có nghĩa là “${vn}”?`, options, answerIndex });
    } else {
      // từ → nghĩa
      const { options, answerIndex } = optionsFor(vn, pool.vocab.map(([, , v]) => v), rng);
      qs.push({ prompt: `“${zh}” có nghĩa là gì?`, options, answerIndex });
    }
  });
  // Distractor cùng loại (F1): câu nghĩa → nhiễu là các nghĩa khác;
  // câu tên mẫu → nhiễu là tên mẫu khác. Pool mỏng (<4 cùng loại) mới trộn.
  const gramDescs = pool.gram.map(([, d]) => d);
  const gramNames = pool.gram.map(([n]) => n);
  station.gram.forEach(([name, desc], i) => {
    if (i % 2 === 0) {
      const { options, answerIndex } = gramOptionsFor(desc, gramDescs, gramNames, rng);
      qs.push({ prompt: `Mẫu ngữ pháp “${name}” diễn đạt ý gì?`, options, answerIndex });
    } else {
      const { options, answerIndex } = gramOptionsFor(name, gramNames, gramDescs, rng);
      qs.push({ prompt: `Ý nghĩa “${desc}” ứng với mẫu nào?`, options, answerIndex });
    }
  });
  return shuffle(qs, rng);
}

/** Warm-up đầu chặng: đúng 4 câu vocab-only (không câu nghe). */
export function sampleWarmupQuestions(pool: StationPool, rng: Rng = Math.random): QuizQuestion[] {
  return shuffle(pool.vocab, rng)
    .slice(0, 4)
    .map((w) => vocabMeaningQuestion(w, pool, rng));
}

/** Milestone cuối chặng: đúng 12 câu — 9 vocab + 3 gram khi gram đủ (≥3);
    gram mỏng/rỗng → 12 vocab (pool nhỏ hơn 12 thì lặp lại từ đã xáo).
    Mỗi câu vocab thứ 4 (index 3, 7, … trong thứ tự sinh) là câu nghe. */
export function sampleMilestoneQuestions(pool: StationPool, rng: Rng = Math.random): QuizQuestion[] {
  const qs: QuizQuestion[] = [];
  const gramPicks = pool.gram.length >= 3 ? shuffle(pool.gram, rng).slice(0, 3) : [];
  const vocabPicks = shuffle(pool.vocab, rng);
  const vocabCount = 12 - gramPicks.length;
  for (let i = 0; i < vocabCount; i++) {
    const w = vocabPicks[i % vocabPicks.length]!;
    if (i % 4 === 3) {
      qs.push(listenQuestion(w, pool, rng));
    } else {
      qs.push(vocabMeaningQuestion(w, pool, rng));
    }
  }
  for (const [name, desc] of gramPicks) {
    const { options, answerIndex } = gramOptionsFor(
      desc,
      pool.gram.map(([, d]) => d),
      pool.gram.map(([n]) => n),
      rng,
    );
    qs.push({ prompt: `Mẫu ngữ pháp “${name}” diễn đạt ý gì?`, options, answerIndex });
  }
  return shuffle(qs, rng);
}

export type StationResult = { pct: number; passed: boolean; stars: 0 | 1 | 2 | 3; improved: boolean };

export function submitStationResult(
  levelId: string,
  stationId: string,
  correct: number,
  total: number,
  store: {
    getStationProgress(id: string): Record<string, StationProgress>;
    setStationProgress(id: string, sid: string, rec: StationProgress): void;
  } = progressStore,
): StationResult {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const prev = store.getStationProgress(levelId)[stationId] ?? null;
  if (prev != null && prev.pct >= pct) {
    return { pct: prev.pct, passed: prev.pct >= PASS_PCT, stars: prev.stars, improved: false };
  }
  const stars = pct >= 100 ? 3 : pct >= 90 ? 2 : pct >= PASS_PCT ? 1 : 0;
  store.setStationProgress(levelId, stationId, { pct, stars });
  return { pct, passed: pct >= PASS_PCT, stars, improved: true };
}
