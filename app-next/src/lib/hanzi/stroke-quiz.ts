/* Chấm điểm nét vẽ tay — port 1:1 bucket()/matchStroke() của opendesign_hsk/hanzi.html.
   Pure functions (spec 2026-10-05 §3), không DOM. acc% tính tại UI: done ? round(ok/done*100) : null.
   Deviation from mock (1 clause): mock không phủ nhánh [157.5°, 180°] nên atan2(0,-100)=+180°
   (đúng hướng Tây) rơi tẹt xuống cuối `return 'N'` — port thêm nhánh đó vào ô W ở dưới.
   Mọi range khác giữ nguyên byte-for-byte. */

import type { StrokeDir } from "@/content/hanzi-studio";

export type Bucket = "E" | "SE" | "S" | "SW" | "W" | "N" | "NE" | "DOT";
export type InkPoint = { x: number; y: number };

export function bucket(dx: number, dy: number): Bucket {
  const len = Math.hypot(dx, dy);
  if (len < 14) return "DOT";
  const a = (Math.atan2(dy, dx) * 180) / Math.PI;
  if (a >= -22.5 && a < 22.5) return "E";
  if (a >= 22.5 && a < 67.5) return "SE";
  if (a >= 67.5 && a < 112.5) return "S";
  if ((a >= 112.5 && a < 157.5) || (a < -157.5 && a >= -180)) return "SW";
  if ((a >= 157.5 && a <= 180) || (a >= -157.5 && a < -112.5)) return "W";
  if (a >= -67.5 && a < -22.5) return "NE";
  return "N";
}

export function matchStroke(pts: InkPoint[], exp: StrokeDir): boolean {
  if (exp === "T") return pts.length > 4;
  const f = pts[0];
  const l = pts[pts.length - 1];
  const b = bucket(l.x - f.x, l.y - f.y);
  if (b === "DOT") return exp === "SE" || exp === "S";
  return b === exp;
}
