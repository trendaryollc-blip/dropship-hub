import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AutoRulesPanel } from "./AutoRulesPanel";

const mockSafeFetch = vi.fn();
vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: (...args: any[]) => mockSafeFetch(...args),
}));

describe("AutoRulesPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders panel title", () => {
    mockSafeFetch.mockResolvedValue({ rules: [] });
    render(<AutoRulesPanel />);
    expect(screen.getByText("Auto Mode Rules")).toBeInTheDocument();
  });

  it("renders add rule button", () => {
    mockSafeFetch.mockResolvedValue({ rules: [] });
    render(<AutoRulesPanel />);
    expect(screen.getByText("+ Add Rule")).toBeInTheDocument();
  });

  it("shows loading state initially", () => {
    mockSafeFetch.mockReturnValue(new Promise(() => {}));
    render(<AutoRulesPanel />);
    expect(screen.getByText("Loading rules...")).toBeInTheDocument();
  });

  it("shows empty state when no rules", async () => {
    mockSafeFetch.mockResolvedValue({ rules: [] });
    render(<AutoRulesPanel />);
    await waitFor(() => expect(screen.getByText("No auto rules configured")).toBeInTheDocument());
  });

  it("renders rules after loading", async () => {
    mockSafeFetch.mockResolvedValue({
      rules: [
        { id: "rule-1", toolId: "calculate_profit", enabled: true, trigger: "schedule", schedule: "daily", params: {} },
        { id: "rule-2", toolId: "get_alerts", enabled: false, trigger: "event", event: "new_order", params: {} },
      ],
    });
    render(<AutoRulesPanel />);
    await waitFor(() => expect(screen.getByText("Calculate Profit")).toBeInTheDocument());
    expect(screen.getByText("Get Alerts")).toBeInTheDocument();
  });

  it("shows rule trigger labels", async () => {
    mockSafeFetch.mockResolvedValue({
      rules: [
        { id: "rule-1", toolId: "calculate_profit", enabled: true, trigger: "schedule", schedule: "daily", params: {} },
      ],
    });
    render(<AutoRulesPanel />);
    await waitFor(() => expect(screen.getByText("Schedule: daily")).toBeInTheDocument());
  });
});
