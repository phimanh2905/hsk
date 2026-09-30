export type Dist = { forgot: number; hard: number; good: number; easy: number };
export const DIST_META: { key: keyof Dist; label: string; color: string }[] = [
  { key: "forgot", label: "Quên rồi", color: "#c03922" },
  { key: "hard", label: "Khó", color: "#f39c12" },
  { key: "good", label: "Tốt", color: "#43a047" },
  { key: "easy", label: "Dễ", color: "var(--nhai-accent)" },
];
export const R = 15.9155;
export const C = 2 * Math.PI * R;

export function distPercents(dist: Dist): number[] {
  const total = dist.forgot + dist.hard + dist.good + dist.easy;
  if (total <= 0) return DIST_META.map(() => 0);
  const raw = DIST_META.map((m) => ((dist[m.key] || 0) / total) * 100);
  const floors = raw.map((r) => Math.floor(r));
  const left = 100 - floors.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < left; k++) floors[order[k % order.length].i]++;
  return floors;
}

export function donutSlices(dist: Dist): { color: string; len: number; offset: number }[] {
  const total = dist.forgot + dist.hard + dist.good + dist.easy;
  if (total <= 0) return [];
  const out: { color: string; len: number; offset: number }[] = [];
  let acc = 0;
  DIST_META.forEach((m) => {
    const n = dist[m.key] || 0;
    if (n <= 0) return;
    const frac = n / total;
    out.push({ color: m.color, len: Math.max(frac * C - 1.5, 0.5), offset: -acc * C });
    acc += frac;
  });
  return out;
}
