/* Nhai HSK — dữ liệu thứ tự nét (port clone/js/hanzi-writer.js:9-29).
   Toạ độ 0–100. Mỗi nét: mảng điểm theo thứ tự bút chạy. */
export type StrokePolyline = number[][];

export const STROKE_DATA: Record<string, StrokePolyline[]> = {
  "你": [
    [[35, 14], [31, 24], [24, 40], [17, 57], [13, 71]],          // 1 撇 (亻)
    [[33, 36], [33, 58], [32, 84]],                              // 2 竖 (亻)
    [[56, 16], [50, 30], [44, 43]],                              // 3 撇 (尔)
    [[41, 31], [60, 28], [75, 36]],                              // 4 横钩
    [[58, 26], [58, 50], [57, 74], [61, 82]],                    // 5 竖钩
    [[52, 56], [45, 66], [35, 79]],                              // 6 撇
    [[65, 57], [71, 68], [77, 82]]                               // 7 点
  ]
};

/* generic 4 nét cho chữ chưa có data: khung 口 sơ khai */
export function genericStrokes(): StrokePolyline[] {
  return [
    [[18, 18], [82, 18]],
    [[82, 18], [82, 82]],
    [[82, 82], [18, 82]],
    [[18, 82], [18, 18], [30, 18]]
  ];
}
