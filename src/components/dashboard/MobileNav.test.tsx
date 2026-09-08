import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

import MobileNav from "./MobileNav";

describe("MobileNav", () => {
  it("renders all nav items", () => {
    render(<MobileNav />);
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Search")).toBeInTheDocument();
    expect(screen.getByText("AI")).toBeInTheDocument();
    expect(screen.getByText("Orders")).toBeInTheDocument();
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("renders links with correct hrefs", () => {
    render(<MobileNav />);
    const homeLink = screen.getByText("Home").closest("a");
    expect(homeLink).toHaveAttribute("href", "/dashboard");
  });

  it("hides on desktop (md breakpoint)", () => {
    const { container } = render(<MobileNav />);
    const nav = container.querySelector("nav");
    expect(nav).toHaveClass("md:hidden");
  });
});
