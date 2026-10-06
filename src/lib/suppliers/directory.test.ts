import { describe, it, expect } from "vitest";
import {
  directoryEntryFromAssignment,
  directoryEntryFromOffer,
  directoryEntryFromProfile,
} from "./directory";
import type { NormalizedSupplierOffer } from "@/types/supplier-offers";
import type { SupplierProfile } from "@/types/supplier";

const offer: NormalizedSupplierOffer = {
  supplierId: "alibaba:factory-x",
  platformId: "alibaba",
  supplierName: "Factory X",
  storeUrl: "https://alibaba.com/store/x",
  productId: "alibaba:factory-x:robot",
  title: "Green Robot Toy",
  image: null,
  url: "https://alibaba.com/product/robot",
  unitCost: 12.5,
  currency: "USD",
  shippingCost: null,
  shippingDays: null,
  rating: null,
  reviews: null,
  inStock: true,
  stockLevel: null,
  moq: null,
  dataSource: "estimated",
  confidence: 0.4,
  matchReasons: [],
};

describe("supplier directory entries", () => {
  it("builds an entry from an offer", () => {
    const entry = directoryEntryFromOffer(offer, "manual-selection", "2026-01-01T00:00:00Z");
    expect(entry).toMatchObject({
      supplierId: "alibaba:factory-x",
      name: "Factory X",
      platformId: "alibaba",
      storeUrl: "https://alibaba.com/store/x",
      priceRange: { min: 12.5, max: 12.5, currency: "USD" },
      source: "manual-selection",
      firstSeenAt: "2026-01-01T00:00:00Z",
      lastSeenAt: "2026-01-01T00:00:00Z",
    });
  });

  it("omits price range when the offer has no cost", () => {
    const entry = directoryEntryFromOffer({ ...offer, unitCost: null }, "discovery");
    expect(entry.priceRange).toBeNull();
  });

  it("builds an entry from a profile", () => {
    const profile = {
      id: "alibaba:factory-x",
      name: "Factory X",
      slug: "alibaba-factory-x",
      location: "Unknown",
      country: "",
      flag: "",
      description: "",
      specializations: ["toys", "robots"],
      trustBadge: "unverified",
      dataSource: "estimated",
      stats: { totalProducts: 7 },
      catalog: { categories: [], priceRange: { min: 3, max: 20 }, moq: 0, samplesAvailable: false, samplePrice: null },
      source: "alibaba",
      sourceUrl: "https://alibaba.com/store/x",
      lastUpdated: "",
      listings: [{ title: "a", price: 3, image: null, link: "https://x" }],
    } as unknown as SupplierProfile;
    const entry = directoryEntryFromProfile(profile, "discovery");
    expect(entry.listingCount).toBe(1);
    expect(entry.priceRange).toEqual({ min: 3, max: 20 });
    expect(entry.specializations).toEqual(["toys", "robots"]);
  });

  it("builds a minimal entry from an assignment", () => {
    const entry = directoryEntryFromAssignment(
      { supplierId: "cj:shop", supplierName: "Shop", platformId: "cj", unitCost: 4, dataSource: "live" },
      "manual-selection"
    );
    expect(entry).toMatchObject({
      supplierId: "cj:shop",
      platformId: "cj",
      dataSource: "live",
      priceRange: { min: 4, max: 4, currency: null },
    });
    expect(directoryEntryFromAssignment({ supplierId: "cj:shop", supplierName: "Shop" }, "discovery").platformId).toBe(
      "other"
    );
  });
});
