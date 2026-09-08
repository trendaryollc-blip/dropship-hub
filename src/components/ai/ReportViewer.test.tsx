import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ReportViewer from "./ReportViewer";

vi.mock("lucide-react", () => ({
  FileText: () => <div data-testid="icon" />,
  Calendar: () => <div data-testid="icon" />,
  TrendingUp: () => <div data-testid="icon" />,
  TrendingDown: () => <div data-testid="icon" />,
  Minus: () => <div data-testid="icon" />,
  ChevronDown: () => <div data-testid="icon" />,
  ChevronUp: () => <div data-testid="icon" />,
  Download: () => <div data-testid="icon" />,
}));

const mockReport = {
  period: "weekly" as const,
  dateRange: { start: "2025-01-14", end: "2025-01-15" },
  generatedAt: "2025-01-15T10:00:00Z",
  summary: "Revenue up 15%",
  sections: [
    { title: "Revenue", content: "Total: $1,234", icon: "dollar", metric: "$1,234", trend: "up" },
    { title: "Orders", content: "15 processed", icon: "cart", metric: "15", trend: "stable" },
  ],
  healthScore: 85,
  highlights: ["Revenue increased 15%", "New products added"],
  concerns: ["Shipping delays"],
  recommendations: ["Focus on high-margin products"],
};

describe("ReportViewer", () => {
  it("renders period selector", () => {
    render(<ReportViewer report={mockReport} onGenerate={vi.fn()} />);
    expect(screen.getByText("Weekly")).toBeInTheDocument();
    expect(screen.getByText("Monthly")).toBeInTheDocument();
  });

  it("renders report summary", () => {
    render(<ReportViewer report={mockReport} onGenerate={vi.fn()} />);
    expect(screen.getByText("Revenue up 15%")).toBeInTheDocument();
  });

  it("renders sections", () => {
    render(<ReportViewer report={mockReport} onGenerate={vi.fn()} />);
    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("Orders")).toBeInTheDocument();
  });

  it("renders health score as part of score text", () => {
    render(<ReportViewer report={mockReport} onGenerate={vi.fn()} />);
    expect(screen.getByText("85/100")).toBeInTheDocument();
  });

  it("renders highlights", () => {
    render(<ReportViewer report={mockReport} onGenerate={vi.fn()} />);
    expect(screen.getByText("Revenue increased 15%")).toBeInTheDocument();
  });

  it("renders concerns", () => {
    render(<ReportViewer report={mockReport} onGenerate={vi.fn()} />);
    expect(screen.getByText("Shipping delays")).toBeInTheDocument();
  });

  it("renders recommendations", () => {
    render(<ReportViewer report={mockReport} onGenerate={vi.fn()} />);
    expect(screen.getByText("Focus on high-margin products")).toBeInTheDocument();
  });

  it("renders empty state when no report", () => {
    render(<ReportViewer report={null} onGenerate={vi.fn()} />);
    expect(screen.getByText("No report generated yet")).toBeInTheDocument();
  });

  it("renders generate button", () => {
    render(<ReportViewer report={null} onGenerate={vi.fn()} />);
    expect(screen.getByText("Generate Report")).toBeInTheDocument();
  });
});
