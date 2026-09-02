import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SupplierStatusCards from "./SupplierStatusCards";

describe("SupplierStatusCards", () => {
  it("renders supplier status", () => {
    render(
      <SupplierStatusCards
        suppliers={[
          {
            name: "TechSource Global",
            trustBadge: "gold",
            responseTime: "< 2h",
            responseLevel: "fast",
            completionRate: 98.5,
            status: "online",
            rating: 4.8,
            location: "Shenzhen",
          },
          {
            name: "EuropaSupply",
            trustBadge: "silver",
            responseTime: "< 6h",
            responseLevel: "moderate",
            completionRate: 97.1,
            status: "busy",
            rating: 4.6,
            location: "Berlin",
          },
        ]}
      />
    );
    expect(screen.getByText("TechSource Global")).toBeInTheDocument();
    expect(screen.getByText("EuropaSupply")).toBeInTheDocument();
  });

  it("renders supplier network heading", () => {
    render(
      <SupplierStatusCards
        suppliers={[
          {
            name: "PrimeDrop",
            trustBadge: "gold",
            responseTime: "< 1h",
            responseLevel: "fast",
            completionRate: 99.2,
            status: "online",
            rating: 4.9,
            location: "Los Angeles",
          },
        ]}
      />
    );
    expect(screen.getByText("Supplier Network")).toBeInTheDocument();
  });
});
