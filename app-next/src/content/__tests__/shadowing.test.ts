import { describe, it, expect } from "vitest";
import {
  shadowingPlaylists, shadowingVideos, shadowingSubtitles,
  shadowingVideoById, relatedVideos,
} from "../shadowing";

describe("shadowing content (SPEC-06 bộ DEMO + SPEC-19 tiêu đề song ngữ)", () => {
  it("đủ 5 playlist, slug + tổng số theo SPEC-06", () => {
    expect(shadowingPlaylists.map((p) => p.slug)).toEqual([
      "daihuaxiyou", "long-baba", "so-cap", "an-kha-hy", "simple-days",
    ]);
    expect(shadowingPlaylists[0]).toMatchObject({ total: 84, channel: "DaihuaXiyou Official" });
    expect(shadowingPlaylists[3].name).toBe("Tiếng Trung Sơ Cấp · An Khả Hy");
  });
  it("đúng 20 video, mỗi playlist 4 card, id YouTube thật từ data clone", () => {
    expect(shadowingVideos).toHaveLength(20);
    for (const p of shadowingPlaylists) {
      expect(shadowingVideos.filter((v) => v.playlistId === p.slug)).toHaveLength(4);
    }
    expect(shadowingVideoById("EA3rwvr99Q0")).toMatchObject({
      title: "墓碑上的QR碼，別掃。QR code on the tombstone, don't scan. #daihuaxiyou #呆話西遊",
      hsk: "HSK3", views: 397, duration: "2:46",
    });
    expect(shadowingVideoById("daihua-x4")).toBeNull(); // pseudo-id SPEC-19 không đưa vào bộ DEMO
  });
  it("phụ đề EA3rwvr99Q0 đủ 9 câu theo SPEC-06 (start/end 0→165)", () => {
    const s = shadowingSubtitles["EA3rwvr99Q0"];
    expect(s).toHaveLength(9);
    expect(s[0]).toMatchObject({ n: 1, start: 0, end: 18, pinyin: "Á! Wǒ cái líkāi jǐ tiān! Nǐmen zěnme jiù dōu méi le ya! Méi nǐmen wǒ kě zěnme wǒ a!" });
    expect(s[8].end).toBe(165);
    expect(s[8].vi).toBe("Mình đã bảo cậu bao nhiêu lần rồi? Đừng có quét mã QR bừa bãi! Đừng quét mã QR bừa bãi!");
  });
  it("relatedVideos trả tối đa 4 video cùng playlist, loại chính nó", () => {
    const rel = relatedVideos("EA3rwvr99Q0");
    expect(rel).toHaveLength(3); // playlist daihuaxiyou chỉ còn 3 video khác
    expect(rel.some((v) => v.id === "EA3rwvr99Q0")).toBe(false);
    expect(relatedVideos("sXo-yHFkAio", 4)[0].playlistId).toBe("daihuaxiyou");
  });
});
