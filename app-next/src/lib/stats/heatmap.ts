export function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function vnDay(d: Date): string {
  const vn = new Date(d.getTime() + 7 * 3600_000);
  return vn.toISOString().slice(0, 10);
}
export function heatData(real: Record<string, number> | null, now: Date): Record<string, number> {
  const rnd = mulberry32(20251021);
  const map: Record<string, number> = {};
  for (let back = 11; back >= 0; back--) {
    const d = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const y = d.getFullYear(), m = d.getMonth();
    const days = new Date(y, m + 1, 0).getDate();
    for (let day = 1; day <= days; day++) {
      const key = y + "-" + String(m + 1).padStart(2, "0") + "-" + String(day).padStart(2, "0");
      const r = rnd();
      map[key] = real && real[key] != null ? real[key]
        : r < 0.45 ? 0 : r < 0.7 ? 1 + Math.floor(rnd() * 2) : r < 0.9 ? 3 + Math.floor(rnd() * 3) : 6 + Math.floor(rnd() * 5);
    }
  }
  return map;
}
/* Mức độ = alpha của jade (--action-primary) 20/40/60/80/100% — không màu một mình: tooltip `title` kèm số xp. */
export function heatClass(v: number): string {
  if (!v || v <= 0) return "bg-border-subtle";
  if (v <= 2) return "bg-action-primary/20";
  if (v <= 5) return "bg-action-primary/40";
  if (v <= 9) return "bg-action-primary/60";
  if (v <= 14) return "bg-action-primary/80";
  return "bg-action-primary";
}
export function computeStreak(days: Record<string, number>, today: string): number {
  const DAY = 86_400_000;
  const ms = Date.parse(today + "T00:00:00+07:00");
  if (isNaN(ms)) return 0;
  let cur = days[today] > 0 ? ms : days[vnDay(new Date(ms - DAY))] > 0 ? ms - DAY : 0;
  if (!cur) return 0;
  let streak = 0;
  while (days[vnDay(new Date(cur))] > 0) { streak++; cur -= DAY; }
  return streak;
}
