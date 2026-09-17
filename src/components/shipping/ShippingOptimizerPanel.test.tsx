import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ShippingOptimizerPanel from "./ShippingOptimizerPanel";

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "test-user", email: "test@example.com" },
  }),
}));

vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: vi.fn().mockResolvedValue({}),
}));

function clickTab(name: string) {
  fireEvent.click(screen.getAllByText(name)[0]);
}

describe("ShippingOptimizerPanel", () => {
  it("renders shipment details heading", () => {
    render(<ShippingOptimizerPanel />);
    expect(screen.getByText("Shipment Details")).toBeInTheDocument();
  });

  it("renders default form values", () => {
    render(<ShippingOptimizerPanel />);
    expect(screen.getByDisplayValue("0.5")).toBeInTheDocument();
    expect(screen.getByDisplayValue("25")).toBeInTheDocument();
  });

  it("renders tab buttons", () => {
    render(<ShippingOptimizerPanel />);
    expect(screen.getAllByText("Compare Rates").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Auto-Select").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Predictions").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Customs").length).toBeGreaterThanOrEqual(1);
  });

  it("renders compare button on default tab", () => {
    render(<ShippingOptimizerPanel />);
    expect(screen.getAllByText("Compare All Carriers").length).toBeGreaterThanOrEqual(1);
  });

  it("renders form labels", () => {
    render(<ShippingOptimizerPanel />);
    expect(screen.getByText("Origin")).toBeInTheDocument();
    expect(screen.getByText("Destination")).toBeInTheDocument();
    expect(screen.getByText("Weight (kg)")).toBeInTheDocument();
    expect(screen.getByText("Value (USD)")).toBeInTheDocument();
  });

  it("renders dimension labels", () => {
    render(<ShippingOptimizerPanel />);
    expect(screen.getByText("Length (cm)")).toBeInTheDocument();
    expect(screen.getByText("Width (cm)")).toBeInTheDocument();
    expect(screen.getByText("Height (cm)")).toBeInTheDocument();
  });

  it("switches to customs tab", async () => {
    render(<ShippingOptimizerPanel />);
    clickTab("Customs");
    await waitFor(() => {
      expect(screen.getByText("Shipment Items")).toBeInTheDocument();
    });
  });

  it("switches to predictions tab", async () => {
    render(<ShippingOptimizerPanel />);
    clickTab("Predictions");
    await waitFor(() => {
      expect(screen.getByText("Select Carrier & Service Level")).toBeInTheDocument();
    });
  });

  it("switches to auto-select tab", async () => {
    render(<ShippingOptimizerPanel />);
    clickTab("Auto-Select");
    await waitFor(() => {
      expect(screen.getByText("Optimization Mode")).toBeInTheDocument();
    });
  });

  it("shows optimization mode buttons", async () => {
    render(<ShippingOptimizerPanel />);
    clickTab("Auto-Select");
    await waitFor(() => {
      expect(screen.getByText("Cheapest")).toBeInTheDocument();
      expect(screen.getByText("Fastest")).toBeInTheDocument();
      expect(screen.getByText("Balanced")).toBeInTheDocument();
      expect(screen.getByText("Reliable")).toBeInTheDocument();
    });
  });
});
