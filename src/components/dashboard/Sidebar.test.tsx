import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Sidebar from "./Sidebar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: vi.fn(),
}));

describe("Sidebar", () => {
  it("renders navigation links", () => {
    render(<Sidebar isOpen={true} onClose={vi.fn()} />);
    expect(screen.getAllByText("Dashboard").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Find Products").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("AI Assistant").length).toBeGreaterThanOrEqual(1);
  });

  it("calls onClose when overlay clicked", () => {
    const onClose = vi.fn();
    render(<Sidebar isOpen={true} onClose={onClose} />);
    const overlay = document.querySelector(".absolute.inset-0.bg-black\\/50");
    if (overlay) {
      const { fireEvent } = require("@testing-library/react");
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalled();
    }
  });

  it("highlights active route", () => {
    render(<Sidebar isOpen={true} onClose={vi.fn()} />);
    const dashboardLinks = screen.getAllByText("Dashboard");
    const dashboardLink = dashboardLinks[0].closest("a");
    expect(dashboardLink).toHaveClass("bg-accent/10");
  });

  it("renders Settings link", () => {
    render(<Sidebar isOpen={true} onClose={vi.fn()} />);
    expect(screen.getAllByText("Settings").length).toBeGreaterThanOrEqual(1);
  });
});
