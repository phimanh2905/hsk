/* Tách sentences JSON thành nhiều chunk row cho content_shadowing_subtitles.
   D1/wrangler giới hạn ~100KB mỗi SQL statement — seed WSD (word timing)
   tới 258KB/video. Bảng có PK (video_id, chunk); content layer concat theo
   chunk tăng dần. Dùng chung bởi 4 seed writer (W1/WSD/demo/dialogues). */

/** Tách mảng thành nhóm sao cho JSON.stringify(nhóm) ≤ maxBytes. */
export function chunkByJsonBytes<T>(items: T[], maxBytes: number): T[][] {
  if (items.length === 0) return [[]];
  const out: T[][] = [];
  let cur: T[] = [];
  let curBytes = 2; // "[]"
  for (const it of items) {
    const b = JSON.stringify(it).length + (cur.length > 0 ? 1 : 0); // + dấu phẩy
    if (cur.length > 0 && curBytes + b > maxBytes) {
      out.push(cur);
      cur = [];
      curBytes = 2;
    }
    cur.push(it);
    curBytes += b;
  }
  out.push(cur);
  return out;
}

/** DELETE + các INSERT OR REPLACE (video_id, chunk, sentences) — mỗi statement ≤ maxBytes JSON.
    DELETE đầu để seed tự chứa: W1/WSD/demo ghi đè lẫn nhau cùng video_id, không xóa sẽ
    dính chunk cũ từ seed chạy trước (dup sentences khi số chunk giảm). */
export function subtitleInsertStatements(
  videoId: string,
  sentences: unknown[],
  esc: (s: string) => string,
  maxBytes = 60_000
): string[] {
  return [
    `DELETE FROM content_shadowing_subtitles WHERE video_id = '${esc(videoId)}';`,
    ...chunkByJsonBytes(sentences, maxBytes).map((group, i) =>
      `INSERT OR REPLACE INTO content_shadowing_subtitles (video_id, chunk, sentences) VALUES ('${esc(videoId)}', ${i}, '${esc(JSON.stringify(group))}');`
    ),
  ];
}
