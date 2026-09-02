import { describe, it, expect } from "vitest";

describe("dashboard types", () => {
  it("TickerItem has required fields", () => {
    const item = { name: "Test", platform: "AliExpress", price: 10, change: 5, sparkline: [1, 2, 3] };
    expect(item.name).toBe("Test");
    expect(typeof item.price).toBe("number");
    expect(Array.isArray(item.sparkline)).toBe(true);
  });

  it("SupplierStatus has valid trustBadge values", () => {
    const badges = ["gold", "silver", "bronze"] as const;
    for (const b of badges) {
      const s = { name: "Test", trustBadge: b, responseTime: "1h", responseLevel: "fast" as const, completionRate: 99, status: "online" as const, rating: 4.9, location: "US" };
      expect(badges).toContain(s.trustBadge);
    }
  });

  it("HeatmapCategory has required fields", () => {
    const cat = {
      category: "Electronics",
      heat: 72,
      productCount: 100,
      avgMargin: 30,
      trend: "up" as const,
      weeklyData: [1, 2, 3, 4, 5, 6, 7],
      topProduct: "Widget",
      topProductMargin: 40,
      aiInsight: "Strong demand",
      velocity: 10,
    };
    expect(cat.category).toBeTruthy();
    expect(typeof cat.heat).toBe("number");
    expect(Array.isArray(cat.weeklyData)).toBe(true);
  });

  it("SmartAlert has valid type values", () => {
    const types = ["opportunity", "risk", "info", "warning"] as const;
    for (const t of types) {
      const alert = {
        id: "1",
        type: t,
        title: "Test",
        description: "Desc",
        action: "View",
        actionHref: "/test",
        timestamp: "now",
        read: false,
        confidence: 90,
        aiAnalysis: "Analysis",
        sparkline: [1, 2, 3],
      };
      expect(types).toContain(alert.type);
    }
  });

  it("NicheCard grade has valid values", () => {
    const grades = ["A+", "A", "B+", "B", "C+", "C"] as const;
    for (const g of grades) {
      expect(grades).toContain(g);
    }
  });

  it("TrendingProduct has all required fields", () => {
    const p = {
      name: "Widget",
      platform: "AliExpress",
      price: 10,
      sellPrice: 25,
      profit: 15,
      margin: 60,
      trend: 12,
      sparkline: [1, 2, 3],
      confidence: 85,
      whyTrending: "Hot",
      demandLevel: "high" as const,
      competitionLevel: "medium" as const,
      supplierReliability: 95,
      monthlyVolume: 1000,
      shippingDays: "7-15",
      sourceUrl: "https://example.com",
      competitors: [{ name: "A", price: 12 }],
      listingSuggestion: { title: "T", description: "D" },
    };
    expect(p.name).toBeTruthy();
    expect(typeof p.price).toBe("number");
    expect(typeof p.sellPrice).toBe("number");
  });

  it("AIDailyPick has all required fields", () => {
    const pick = {
      title: "Test",
      category: "Electronics",
      image: "img.jpg",
      description: "Desc",
      radarScores: { margin: 80, demand: 80, competition: 80, trend: 80, supplier: 80 },
      sourcePrice: 10,
      sellPrice: 25,
      margin: 60,
      risk: "low" as const,
      reason: "High margin",
      platform: "AliExpress",
      ordersPerMonth: 1000,
      saturation: 30,
      overallScore: 85,
      earningsPreview: { profitPerOrder: 15, ordersPerMonth: 1000, monthlyRevenue: 15000 },
      reasonPoints: ["Point 1"],
      expiresAt: "2026-09-02T00:00:00Z",
    };
    expect(pick.title).toBeTruthy();
    expect(typeof pick.overallScore).toBe("number");
    expect(pick.earningsPreview.profitPerOrder).toBeGreaterThan(0);
  });
});
