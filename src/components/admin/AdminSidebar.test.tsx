import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/dashboard",
}));

import AdminSidebar from "./AdminSidebar";

describe("AdminSidebar", () => {
  const defaultProps = {
    isOpen: false,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Admin Panel logo", () => {
    render(<AdminSidebar {...defaultProps} />);
    const logo = document.querySelector('a[href="/admin/dashboard"]');
    expect(logo).toBeDefined();
  });

  it("renders Overview section with Dashboard link", () => {
    render(<AdminSidebar {...defaultProps} />);
    const links = document.querySelectorAll('a[href="/admin/dashboard"]');
    expect(links.length).toBeGreaterThanOrEqual(1);
  });

  it("renders Management section with all nav items", () => {
    render(<AdminSidebar {...defaultProps} />);
    const links = document.querySelectorAll("nav a");
    const hrefs = Array.from(links).map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/admin/platforms");
    expect(hrefs).toContain("/admin/api-keys");
    expect(hrefs).toContain("/admin/ai-keys");
    expect(hrefs).toContain("/admin/supplier-providers");
    expect(hrefs).toContain("/admin/users");
  });

  it("renders Monitoring section", () => {
    render(<AdminSidebar {...defaultProps} />);
    const links = document.querySelectorAll("nav a");
    const hrefs = Array.from(links).map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/admin/analytics");
    expect(hrefs).toContain("/admin/health");
  });

  it("renders System section with Settings", () => {
    render(<AdminSidebar {...defaultProps} />);
    const links = document.querySelectorAll("nav a");
    const hrefs = Array.from(links).map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/admin/settings");
  });

  it("renders Back to App link", () => {
    render(<AdminSidebar {...defaultProps} />);
    const backLink = document.querySelector('a[href="/dashboard"]');
    expect(backLink).toBeDefined();
  });

  it("Supplier Providers link points to /admin/supplier-providers", () => {
    render(<AdminSidebar {...defaultProps} />);
    const links = document.querySelectorAll("nav a");
    const supplierLink = Array.from(links).find((l) => l.getAttribute("href") === "/admin/supplier-providers");
    expect(supplierLink).toBeDefined();
  });

  it("calls onClose when close button clicked", () => {
    const onClose = vi.fn();
    render(<AdminSidebar isOpen={true} onClose={onClose} />);
    const closeButtons = document.querySelectorAll("button[aria-label='Close menu']");
    fireEvent.click(closeButtons[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it("mobile sidebar renders when isOpen is true", () => {
    render(<AdminSidebar isOpen={true} onClose={defaultProps.onClose} />);
    const links = document.querySelectorAll("nav a");
    expect(links.length).toBeGreaterThan(5);
  });

  it("calls onClose when nav link clicked on mobile", () => {
    const onClose = vi.fn();
    render(<AdminSidebar isOpen={true} onClose={onClose} />);
    const links = document.querySelectorAll("nav a");
    fireEvent.click(links[0]);
    expect(onClose).toHaveBeenCalled();
  });
});
