export function vnDay(d: Date): string {
  const vn = new Date(d.getTime() + 7 * 3600_000);
  return vn.toISOString().slice(0, 10);
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
