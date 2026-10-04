import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import BottomNav from "../bottom-nav";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

describe("BottomNav mới (spec 2026-10-04)", () => {
  it("đúng 5 mục: Home, Roadmap, Hanzi, Practice, Profile", () => {
    render(<BottomNav />);
    for (const label of ["Home", "Roadmap", "Hanzi", "Practice", "Profile"]) {
      expect(screen.getByRole("link", { name: new RegExp(label) })).toBeInTheDocument();
    }
  });
  it("active item theo pathname có aria-current=page", () => {
    render(<BottomNav />);
    expect(screen.getByRole("link", { name: /Home/ })).toHaveAttribute("aria-current", "page");
  });
});
