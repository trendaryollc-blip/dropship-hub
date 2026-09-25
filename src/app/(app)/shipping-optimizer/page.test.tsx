import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SHIPPING_ZONES } from "@/lib/shipping/country-data";

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "test-user", email: "test@example.com" },
  }),
}));

vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: vi.fn().mockResolvedValue({}),
}));

import ShippingOptimizerPage from "./page";

describe("ShippingOptimizerPage header", () => {
  it("labels rates as estimated reference data", () => {
    render(<ShippingOptimizerPage />);
    expect(screen.getByText("Estimated rates (reference table)")).toBeInTheDocument();
    expect(screen.queryByText("Real-time rates")).not.toBeInTheDocument();
  });

  it("renders the country count from zone data instead of a hardcoded number", () => {
    render(<ShippingOptimizerPage />);
    expect(screen.getByText(`${Object.keys(SHIPPING_ZONES).length} countries`)).toBeInTheDocument();
  });
});
