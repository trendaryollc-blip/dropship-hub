import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StreamingProgress from "./StreamingProgress";

vi.mock("lucide-react", () => ({
  Check: (props: any) => <div data-testid="icon-check" {...props} />,
  Loader2: (props: any) => <div data-testid="icon-loader" {...props} />,
  X: (props: any) => <div data-testid="icon-x" {...props} />,
  AlertCircle: (props: any) => <div data-testid="icon-alert" {...props} />,
  Zap: (props: any) => <div data-testid="icon-zap" {...props} />,
}));

const mockPlatforms = [
  { platform: "amazon", name: "Amazon", status: "success" as const, resultCount: 45 },
  { platform: "ebay", name: "eBay", status: "loading" as const },
  { platform: "aliexpress", name: "AliExpress", status: "error" as const, error: "Timeout" },
  { platform: "cj", name: "CJ Dropshipping", status: "pending" as const },
];

describe("StreamingProgress", () => {
  it("renders all platforms", () => {
    render(<StreamingProgress platforms={mockPlatforms} isStreaming={true} totalResults={45} />);
    expect(screen.getByText("Amazon")).toBeInTheDocument();
    expect(screen.getByText("eBay")).toBeInTheDocument();
    expect(screen.getByText("AliExpress")).toBeInTheDocument();
    expect(screen.getByText("CJ Dropshipping")).toBeInTheDocument();
  });

  it("shows streaming text when isStreaming", () => {
    render(<StreamingProgress platforms={mockPlatforms} isStreaming={true} totalResults={0} />);
    expect(screen.getByText("Streaming results...")).toBeInTheDocument();
  });

  it("shows complete text when not streaming", () => {
    render(<StreamingProgress platforms={mockPlatforms} isStreaming={false} totalResults={45} />);
    expect(screen.getByText("Search complete")).toBeInTheDocument();
  });

  it("shows total results count", () => {
    render(<StreamingProgress platforms={mockPlatforms} isStreaming={false} totalResults={45} />);
    expect(screen.getByText("45 products found")).toBeInTheDocument();
  });

  it("shows progress percentage", () => {
    render(<StreamingProgress platforms={mockPlatforms} isStreaming={true} totalResults={10} />);
    expect(screen.getByText("2/4 (50%)")).toBeInTheDocument();
  });

  it("shows result count for success platforms", () => {
    render(<StreamingProgress platforms={mockPlatforms} isStreaming={true} totalResults={45} />);
    expect(screen.getByText("45")).toBeInTheDocument();
  });

  it("renders retry button for error platforms", () => {
    const onRetry = vi.fn();
    render(<StreamingProgress platforms={mockPlatforms} isStreaming={true} totalResults={0} onRetry={onRetry} />);
    expect(screen.getByText("retry")).toBeInTheDocument();
  });

  it("calls onRetry when retry clicked", () => {
    const onRetry = vi.fn();
    render(<StreamingProgress platforms={mockPlatforms} isStreaming={true} totalResults={0} onRetry={onRetry} />);
    fireEvent.click(screen.getByText("retry"));
    expect(onRetry).toHaveBeenCalledWith("aliexpress");
  });

  it("shows elapsed time when streaming", () => {
    render(<StreamingProgress platforms={mockPlatforms} isStreaming={true} totalResults={0} />);
    expect(screen.getByText("0.0s")).toBeInTheDocument();
  });
});
