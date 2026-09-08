import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PlatformProgress from "./PlatformProgress";

vi.mock("lucide-react", () => ({
  Check: (props: any) => <div data-testid="icon-check" {...props} />,
  Loader2: (props: any) => <div data-testid="icon-loader" {...props} />,
  X: (props: any) => <div data-testid="icon-x" {...props} />,
  AlertCircle: (props: any) => <div data-testid="icon-alert" {...props} />,
}));

const mockPlatforms = [
  { platform: "amazon", name: "Amazon", status: "success" as const, resultCount: 45 },
  { platform: "ebay", name: "eBay", status: "loading" as const },
  { platform: "aliexpress", name: "AliExpress", status: "error" as const, error: "Timeout" },
  { platform: "cj", name: "CJ Dropshipping", status: "pending" as const },
];

describe("PlatformProgress", () => {
  it("renders all platforms", () => {
    render(<PlatformProgress platforms={mockPlatforms} />);
    expect(screen.getByText("Amazon")).toBeInTheDocument();
    expect(screen.getByText("eBay")).toBeInTheDocument();
    expect(screen.getByText("AliExpress")).toBeInTheDocument();
    expect(screen.getByText("CJ Dropshipping")).toBeInTheDocument();
  });

  it("shows correct status icons for success", () => {
    render(<PlatformProgress platforms={mockPlatforms} />);
    const checks = screen.getAllByTestId("icon-check");
    expect(checks.length).toBeGreaterThanOrEqual(1);
  });

  it("shows correct status icons for error", () => {
    render(<PlatformProgress platforms={mockPlatforms} />);
    const alerts = screen.getAllByTestId("icon-alert");
    expect(alerts.length).toBeGreaterThanOrEqual(1);
  });

  it("shows correct status icons for loading", () => {
    render(<PlatformProgress platforms={mockPlatforms} />);
    const loaders = screen.getAllByTestId("icon-loader");
    expect(loaders.length).toBeGreaterThanOrEqual(1);
  });

  it("shows progress percentage", () => {
    render(<PlatformProgress platforms={mockPlatforms} />);
    expect(screen.getByText("2/4 (50%)")).toBeInTheDocument();
  });

  it("shows result count for success platforms", () => {
    render(<PlatformProgress platforms={mockPlatforms} />);
    expect(screen.getByText("45")).toBeInTheDocument();
  });

  it("shows searching text", () => {
    render(<PlatformProgress platforms={mockPlatforms} />);
    expect(screen.getByText("Searching platforms...")).toBeInTheDocument();
  });
});
