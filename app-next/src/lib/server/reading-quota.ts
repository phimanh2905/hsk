/* Quota generate bài đọc AI theo ngày — TZ cố định Asia/Ho_Chi_Minh tính
   server-side, client không tự tính (spec §4.2). */

export const READING_DAILY_LIMIT = 3;

export function hoChiMinhDay(d = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).format(d);
}

/* Epoch ms của 00:00 ngày kế (theo TZ HCM): lấy chuỗi ngày kế định dạng
   sv-SE ("YYYY-MM-DD") rồi parse như UTC — không phụ thuộc offset runtime. */
export function nextQuotaReset(d = new Date()): number {
  const tomorrow = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(d.getTime() + 24 * 60 * 60 * 1000));
  return Date.parse(`${tomorrow}T00:00:00+07:00`);
}
