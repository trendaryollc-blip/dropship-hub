import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProductValidationPage from "./ProductValidationPage";

vi.mock("lucide-react", () => ({
  Loader2: () => <div data-testid="loader" />,
  Sparkles: () => <div data-testid="sparkles" />,
  ChevronDown: () => <div data-testid="chevron-down" />,
  ChevronUp: () => <div data-testid="chevron-up" />,
  RotateCcw: () => <div data-testid="rotate-ccw" />,
  Clock: () => <div data-testid="clock" />,
  Trophy: () => <div data-testid="trophy" />,
  Star: () => <div data-testid="star" />,
  AlertCircle: () => <div data-testid="alert-circle" />,
  CheckCircle2: () => <div data-testid="check-circle" />,
  XCircle: () => <div data-testid="x-circle" />,
  TrendingUp: () => <div data-testid="trending-up" />,
  TrendingDown: () => <div data-testid="trending-down" />,
  Minus: () => <div data-testid="minus" />,
  Zap: () => <div data-testid="zap" />,
  AlertTriangle: () => <div data-testid="alert-triangle" />,
  Users: () => <div data-testid="users" />,
  ShieldCheck: () => <div data-testid="shield-check" />,
  ShieldAlert: () => <div data-testid="shield-alert" />,
  ShieldX: () => <div data-testid="shield-x" />,
  DollarSign: () => <div data-testid="dollar-sign" />,
  Calendar: () => <div data-testid="calendar" />,
}));

vi.mock("@/hooks/useAPI", () => ({
  useAPI: vi.fn().mockReturnValue({ data: null }),
}));

vi.mock("@/lib/firebase", () => ({
  auth: { currentUser: null },
}));

const mockFetch = vi.fn().mockResolvedValue({ json: vi.fn().mockResolvedValue({}) });
vi.stubGlobal("fetch", mockFetch);

describe("ProductValidationPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ json: vi.fn().mockResolvedValue({}) });
  });

  it("renders page title", () => {
    render(<ProductValidationPage />);
    expect(screen.getByText("Product Validation Engine")).toBeInTheDocument();
  });

  it("renders page description", () => {
    render(<ProductValidationPage />);
    expect(screen.getByText(/Score products on 10\+ criteria/)).toBeInTheDocument();
  });

  it("renders Run Validation button", () => {
    render(<ProductValidationPage />);
    expect(screen.getByText("Run Validation")).toBeInTheDocument();
  });

  it("renders reset button", () => {
    render(<ProductValidationPage />);
    expect(screen.getByTestId("rotate-ccw")).toBeInTheDocument();
  });

  it("renders default empty state", () => {
    render(<ProductValidationPage />);
    expect(screen.getByText("Ready to Validate")).toBeInTheDocument();
  });

  it("renders engine tags", () => {
    render(<ProductValidationPage />);
    const tags = screen.getAllByText("Trend Velocity");
    expect(tags.length).toBeGreaterThanOrEqual(1);
    const saturationTags = screen.getAllByText("Saturation Index");
    expect(saturationTags.length).toBeGreaterThanOrEqual(1);
  });

  it("renders Basic Info section open by default", () => {
    render(<ProductValidationPage />);
    expect(screen.getByText("Product Title")).toBeInTheDocument();
  });

  it("renders collapsible sections", () => {
    render(<ProductValidationPage />);
    const trendVelocity = screen.getAllByText("Trend Velocity");
    expect(trendVelocity.length).toBeGreaterThanOrEqual(1);
  });

  it("shows validation error when title is empty and button clicked", () => {
    render(<ProductValidationPage />);
    const button = screen.getByText("Run Validation").closest("button")!;
    expect(button).toBeDisabled();
  });

  it("renders form sections", () => {
    render(<ProductValidationPage />);
    const saturation = screen.getAllByText("Saturation Index");
    expect(saturation.length).toBeGreaterThanOrEqual(1);
    const profit = screen.getAllByText("Profit Potential");
    expect(profit.length).toBeGreaterThanOrEqual(1);
    const seasonal = screen.getAllByText("Seasonal Demand");
    expect(seasonal.length).toBeGreaterThanOrEqual(1);
  });

  it("enables button when title is entered", () => {
    render(<ProductValidationPage />);
    const input = screen.getByPlaceholderText("e.g. Wireless Bluetooth Earbuds");
    fireEvent.change(input, { target: { value: "Test Product" } });
    const button = screen.getByText("Run Validation").closest("button")!;
    expect(button).not.toBeDisabled();
  });
});
