import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SegmentedTabs } from "../segmented-tabs";

describe("SegmentedTabs", () => {
  it("tab active có aria-pressed=true, tab kia false", () => {
    render(
      <SegmentedTabs
        label="Chuyển trạng thái hero"
        tabs={[
          { key: "lesson", label: "Bài học" },
          { key: "srs", label: "Ôn tập SRS · 18" },
        ]}
        value="lesson"
        onChange={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: "Bài học" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Ôn tập SRS · 18" })).toHaveAttribute("aria-pressed", "false");
  });
  it("click tab gọi onChange với key đúng", async () => {
    const onChange = vi.fn();
    render(
      <SegmentedTabs
        label="g"
        tabs={[
          { key: "lesson", label: "Bài học" },
          { key: "srs", label: "SRS" },
        ]}
        value="lesson"
        onChange={onChange}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: "SRS" }));
    expect(onChange).toHaveBeenCalledWith("srs");
  });
  it("group có aria-label", () => {
    render(
      <SegmentedTabs label="Chuyển trạng thái hero" tabs={[{ key: "a", label: "A" }]} value="a" onChange={() => {}} />
    );
    expect(screen.getByRole("group", { name: "Chuyển trạng thái hero" })).toBeInTheDocument();
  });
});
