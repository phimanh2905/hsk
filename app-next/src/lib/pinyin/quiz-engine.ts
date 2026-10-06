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
