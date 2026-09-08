import { describe, it, expect } from "vitest";
import type {
  PlatformSearchResult,
  PlatformProduct,
  SearchFilters,
  PlatformConfig,
} from "@/types/products-types";

describe("Platforms Page - Data Types", () => {
  it("platform search result has required fields", () => {
    const result: PlatformSearchResult = {
      platform: "aliexpress",
      query: "wireless earbuds",
      results: [],
      totalResults: 0,
      page: 1,
      hasMore: false,
      searchTime: 1250,
    };
    expect(result.searchTime).toBeGreaterThan(0);
  });

  it("platform product has required fields", () => {
    const product: PlatformProduct = {
      id: "pp-1",
      title: "Wireless Earbuds",
      price: 8.50,
      originalPrice: 15.00,
      currency: "USD",
      url: "https://aliexpress.com/item/123",
      imageUrl: "https://example.com/img.jpg",
      platform: "aliexpress",
      rating: 4.5,
      reviewCount: 1200,
      orders: 5000,
      seller: {
        name: "Tech Store",
        rating: 4.8,
        followers: 15000,
        responseRate: 98,
      },
      shipping: {
        cost: 2.50,
        estimatedDays: { min: 15, max: 25 },
        freeShipping: false,
      },
    };
    expect(product.price).toBeLessThan(product.originalPrice);
    expect(product.rating).toBeGreaterThan(0);
    expect(product.rating).toBeLessThanOrEqual(5);
  });

  it("search filters has required fields", () => {
    const filters: SearchFilters = {
      query: "wireless earbuds",
      platforms: ["aliexpress", "cj"],
      minPrice: 5,
      maxPrice: 50,
      minRating: 4,
      minOrders: 100,
      freeShipping: false,
      sortBy: "orders",
      sortOrder: "desc",
    };
    expect(filters.minPrice).toBeLessThan(filters.maxPrice);
  });

  it("platform config has required fields", () => {
    const config: PlatformConfig = {
      id: "aliexpress",
      name: "AliExpress",
      baseUrl: "https://aliexpress.com",
      icon: "AliExpress",
      color: "#e11d48",
      supported: true,
      rateLimit: 100,
    };
    expect(config.supported).toBe(true);
    expect(config.rateLimit).toBeGreaterThan(0);
  });

  it("sort options", () => {
    const sortOptions = ["relevance", "price_asc", "price_desc", "rating", "orders", "newest"] as const;
    expect(sortOptions).toHaveLength(6);
  });
});

describe("Platforms Page - Business Logic", () => {
  it("can filter by price range", () => {
    const products: PlatformProduct[] = [
      { id: "1", price: 5 } as PlatformProduct,
      { id: "2", price: 25 } as PlatformProduct,
      { id: "3", price: 60 } as PlatformProduct,
    ];
    const filtered = products.filter((p) => p.price >= 10 && p.price <= 50);
    expect(filtered).toHaveLength(1);
  });

  it("can filter by minimum rating", () => {
    const products: PlatformProduct[] = [
      { id: "1", rating: 4.5 } as PlatformProduct,
      { id: "2", rating: 3.2 } as PlatformProduct,
      { id: "3", rating: 4.8 } as PlatformProduct,
    ];
    const highRated = products.filter((p) => p.rating >= 4);
    expect(highRated).toHaveLength(2);
  });

  it("can sort by price ascending", () => {
    const products: PlatformProduct[] = [
      { id: "1", price: 25 } as PlatformProduct,
      { id: "2", price: 10 } as PlatformProduct,
      { id: "3", price: 35 } as PlatformProduct,
    ];
    const sorted = [...products].sort((a, b) => a.price - b.price);
    expect(sorted[0].id).toBe("2");
  });

  it("can sort by orders descending", () => {
    const products: PlatformProduct[] = [
      { id: "1", orders: 1000 } as PlatformProduct,
      { id: "2", orders: 5000 } as PlatformProduct,
      { id: "3", orders: 2500 } as PlatformProduct,
    ];
    const sorted = [...products].sort((a, b) => b.orders - a.orders);
    expect(sorted[0].id).toBe("2");
  });

  it("can filter by free shipping", () => {
    const products: PlatformProduct[] = [
      { id: "1", shipping: { freeShipping: true } } as PlatformProduct,
      { id: "2", shipping: { freeShipping: false } } as PlatformProduct,
      { id: "3", shipping: { freeShipping: true } } as PlatformProduct,
    ];
    const freeShip = products.filter((p) => p.shipping.freeShipping);
    expect(freeShip).toHaveLength(2);
  });

  it("can calculate average price across platforms", () => {
    const products: PlatformProduct[] = [
      { id: "1", price: 8.50, platform: "aliexpress" } as PlatformProduct,
      { id: "2", price: 12.00, platform: "cj" } as PlatformProduct,
      { id: "3", price: 10.00, platform: "aliexpress" } as PlatformProduct,
    ];
    const byPlatform = products.reduce((acc, p) => {
      if (!acc[p.platform]) acc[p.platform] = [];
      acc[p.platform].push(p.price);
      return acc;
    }, {} as Record<string, number[]>);
    const aliAvg = byPlatform.aliexpress.reduce((a, b) => a + b, 0) / byPlatform.aliexpress.length;
    expect(aliAvg).toBeCloseTo(9.25, 2);
  });
});
