import { describe, it, expect } from "vitest";
import { pickDaily } from "@/lib/shadowing/daily";
import { videosFixture, subsFixture } from "./fixtures";

describe("pickDaily (spec §2.2)", () => {
  it("chỉ chọn trong video CÓ subtitle; cùng ngày → cùng video, khác ngày → có thể khác", () => {
    const d1 = new Date("2026-10-05T10:00:00Z");
    const d2 = new Date("2026-10-06T10:00:00Z");
    const v1 = pickDaily(videosFixture, subsFixture, d1);
    expect(subsFixture[v1.id]).toBeTruthy();
    expect(pickDaily(videosFixture, subsFixture, d1)).toEqual(v1);
    // 2 ngày liên tiếp bám công thức mod — chỉ assert tính deterministic, không assert giá trị cụ thể
    expect(pickDaily(videosFixture, subsFixture, d2)).toEqual(v1); // candidates có 1 phần tử trong fixture
  });
});
