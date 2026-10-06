import { describe, it, expect } from "vitest";
import { isMeasuredSupplier, resolveTrustBadge } from "./trust";

describe("supplier trust resolution", () => {
  it("forces unverified when no metrics are measured", () => {
    expect(resolveTrustBadge({ trustBadge: "gold", reliabilityScore: 0 })).toBe("unverified");
  });

  it("keeps a valid tier when reliability is measured", () => {
    expect(resolveTrustBadge({ trustBadge: "gold", reliabilityScore: 87 })).toBe("gold");
  });

  it("keeps a valid tier when completion rate is measured", () => {
    expect(resolveTrustBadge({ trustBadge: "silver", orderCompletionRate: 96 })).toBe("silver");
  });

  it("falls back to unverified for an invalid tier even when measured", () => {
    expect(resolveTrustBadge({ trustBadge: "platinum", reliabilityScore: 50 })).toBe("unverified");
  });

  it("returns unverified for a missing tier when measured", () => {
    expect(resolveTrustBadge({ trustBadge: null, reliabilityScore: 70 })).toBe("unverified");
  });

  it("isMeasuredSupplier is false for zero/undefined signals", () => {
    expect(isMeasuredSupplier({})).toBe(false);
    expect(isMeasuredSupplier({ reliabilityScore: 0, orderCompletionRate: 0 })).toBe(false);
  });
});
