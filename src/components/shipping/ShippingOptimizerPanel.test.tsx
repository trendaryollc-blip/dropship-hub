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
    expect(screen.getByText("Compare Rates")).toBeInTheDocument();
    expect(screen.getByText("Auto-Select")).toBeInTheDocument();
    expect(screen.getByText("Predictions")).toBeInTheDocument();
    expect(screen.getByText("Customs")).toBeInTheDocument();
  });

  it("renders compare button on default tab", () => {
    render(<ShippingOptimizerPanel />);
    expect(screen.getByText("Compare All Carriers")).toBeInTheDocument();
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
    fireEvent.click(screen.getByText("Customs"));
    await waitFor(() => {
      expect(screen.getByText("Items (JSON Array)")).toBeInTheDocument();
    });
  });

  it("switches to predictions tab", async () => {
    render(<ShippingOptimizerPanel />);
    fireEvent.click(screen.getByText("Predictions"));
    await waitFor(() => {
      expect(screen.getByText("Select Carrier & Service")).toBeInTheDocument();
    });
  });

  it("switches to auto-select tab", async () => {
    render(<ShippingOptimizerPanel />);
    fireEvent.click(screen.getByText("Auto-Select"));
    await waitFor(() => {
      expect(screen.getByText("Optimization Mode")).toBeInTheDocument();
    });
  });

  it("shows optimization mode buttons", async () => {
    render(<ShippingOptimizerPanel />);
    fireEvent.click(screen.getByText("Auto-Select"));
    await waitFor(() => {
      expect(screen.getByText("Cheapest")).toBeInTheDocument();
      expect(screen.getByText("Fastest")).toBeInTheDocument();
      expect(screen.getByText("Balanced")).toBeInTheDocument();
      expect(screen.getByText("Reliable")).toBeInTheDocument();
    });
  });
});
