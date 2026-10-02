import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Input } from "../input";
import { Textarea } from "../textarea";
import { Select } from "../select";

describe("Input / Textarea / Select", () => {
  it("Input: min-h-11, rounded-control, border-border-default, focus ring jade", () => {
    render(<Input aria-label="Email" placeholder="a@b.c" />);
    const el = screen.getByLabelText("Email");
    expect(el.className).toContain("min-h-11");
    expect(el.className).toContain("rounded-control");
    expect(el.className).toContain("border-border-default");
    expect(el.className).toContain("ring-action-focus");
  });

  it("Textarea: rounded-control + focus ring jade, className merge", () => {
    render(<Textarea aria-label="Ghi chú" className="resize-y" />);
    const el = screen.getByLabelText("Ghi chú");
    expect(el.className).toContain("rounded-control");
    expect(el.className).toContain("resize-y");
    expect(el.className).toContain("ring-action-focus");
  });

  it("Select: min-h-11 + options render", () => {
    render(
      <Select aria-label="Cấp độ">
        <option>HSK 1</option>
        <option>HSK 2</option>
      </Select>,
    );
    const el = screen.getByLabelText("Cấp độ") as HTMLSelectElement;
    expect(el.className).toContain("min-h-11");
    expect(el.options).toHaveLength(2);
  });
});
