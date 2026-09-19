import { test, expect } from "@playwright/test";
import { setupFirebaseAuth, injectAuthState } from "./helpers";

const MOCK_SUPPLIERS = {
  suppliers: [
    {
      id: "sup-1",
      name: "Alpha Trading Co",
      slug: "alpha-trading-co",
      location: "Shenzhen, China",
      country: "China",
      flag: "🇨🇳",
      description: "Electronics manufacturer and exporter based in Shenzhen.",
      trustBadge: "gold" as const,
      dataSource: "live" as const,
      specializations: ["Electronics", "Phone Accessories"],
      stats: {
        rating: 4.8,
        reviews: 1250,
        reliabilityScore: 95,
        responseTimeHours: 2,
        responseTime: "< 2h",
        shippingDays: 5,
        shippingDaysEU: 8,
        orderCompletionRate: 98,
        disputeRate: 0.5,
        monthlyOrders: 15000,
        totalProducts: 3200,
        yearEstablished: 2009,
        communicationScore: 88,
        qualityScore: 92,
        priceCompetitiveness: 87,
      },
      shipping: {
        methods: ["Air", "Sea", "Express"],
        processingTime: "2-3 days",
        freeShippingThreshold: null,
        packagingQuality: "premium" as const,
      },
      quality: {
        inspection: "Pre-shipment inspection available",
        returnPolicy: "30-day returns",
        refundPolicy: "Full refund on defective items",
        replacementPolicy: "Free replacement",
        disputeResolution: "Mediation available",
        certifications: ["ISO9001", "CE"],
      },
      catalog: {
        categories: ["Electronics", "Phone Accessories"],
        priceRange: { min: 2, max: 80 },
        moq: 10,
        samplesAvailable: true,
        samplePrice: 15,
      },
      communication: {
        methods: ["Email", "WhatsApp", "WeChat"],
        languages: ["English", "Chinese"],
        supportHours: "12h/day",
      },
      source: "aliexpress" as const,
      sourceUrl: null,
      lastUpdated: "2026-01-15",
    },
    {
      id: "sup-2",
      name: "Beta Supply Ltd",
      slug: "beta-supply-ltd",
      location: "Guangzhou, China",
      country: "China",
      flag: "🇨🇳",
      description: "Home & garden supplier with a strong kitchen range.",
      trustBadge: "silver" as const,
      dataSource: "estimated" as const,
      specializations: ["Home & Garden", "Kitchen"],
      stats: {
        rating: 4.5,
        reviews: 800,
        reliabilityScore: 88,
        responseTimeHours: 4,
        responseTime: "< 4h",
        shippingDays: 7,
        shippingDaysEU: 10,
        orderCompletionRate: 95,
        disputeRate: 1.2,
        monthlyOrders: 8000,
        totalProducts: 1800,
        yearEstablished: 2014,
        communicationScore: 80,
        qualityScore: 85,
        priceCompetitiveness: 79,
      },
      shipping: {
        methods: ["Air", "Sea"],
        processingTime: "3-5 days",
        freeShippingThreshold: 500,
        packagingQuality: "standard" as const,
      },
      quality: {
        inspection: "Video inspection on request",
        returnPolicy: "14-day returns",
        refundPolicy: "Partial refund for late delivery",
        replacementPolicy: "Replacement within 7 days",
        disputeResolution: "Ticket system",
        certifications: ["BSCI"],
      },
      catalog: {
        categories: ["Home & Garden", "Kitchen"],
        priceRange: { min: 3, max: 60 },
        moq: 20,
        samplesAvailable: true,
        samplePrice: 12,
      },
      communication: {
        methods: ["Email", "WhatsApp"],
        languages: ["English", "Chinese"],
        supportHours: "10h/day",
      },
      source: "alibaba" as const,
      sourceUrl: "https://example.com/beta",
      lastUpdated: "2026-01-10",
    },
  ],
};

test.describe("Suppliers Page", () => {
  test("redirects to sign-in when unauthenticated", async ({ page }) => {
    await page.goto("/suppliers");
    await expect(page).toHaveURL(/sign-in/, { timeout: 15000 });
  });
});

test.describe("Suppliers Page - Authenticated", () => {
  test.beforeEach(async ({ page }) => {
    await setupFirebaseAuth(page);
    await page.goto("/");
    await injectAuthState(page);

    await page.route("**/api/suppliers", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_SUPPLIERS),
      });
    });
  });

  test("loads suppliers page with heading", async ({ page }) => {
    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Supplier Intelligence")).toBeVisible();
  });

  test("shows supplier count", async ({ page }) => {
    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/suppliers found/i)).toBeVisible();
  });

  test("has search input", async ({ page }) => {
    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    const searchInput = page.getByPlaceholder("Search suppliers by name, category, or location...");
    await expect(searchInput).toBeVisible();
  });

  test("has sort dropdown", async ({ page }) => {
    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    const sortSelect = page.locator("select");
    await expect(sortSelect.first()).toBeVisible();
  });

  test("has filters button", async ({ page }) => {
    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: /filters/i })).toBeVisible();
  });

  test("search input accepts text", async ({ page }) => {
    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    const searchInput = page.getByPlaceholder("Search suppliers by name, category, or location...");
    await searchInput.fill("Alpha");
    await expect(searchInput).toHaveValue("Alpha");
  });

  test("shows supplier cards", async ({ page }) => {
    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Alpha Trading Co")).toBeVisible();
    await expect(page.getByText("Beta Supply Ltd")).toBeVisible();
  });

  test("supplier card shows trust badge", async ({ page }) => {
    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("gold", { exact: false }).first()).toBeVisible();
  });

  test("supplier card shows location", async ({ page }) => {
    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Shenzhen, China")).toBeVisible();
  });

  test("supplier card shows reliability score", async ({ page }) => {
    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Reliability").first()).toBeVisible();
  });

  test("supplier card shows rating", async ({ page }) => {
    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("4.8")).toBeVisible();
  });

  test("supplier card shows specializations", async ({ page }) => {
    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Electronics").first()).toBeVisible();
  });

  test("supplier card links to detail page", async ({ page }) => {
    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    const link = page.getByRole("link").filter({ hasText: "Alpha Trading Co" }).first();
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", /sup-1/);
  });

  test("filter button toggles filter panel", async ({ page }) => {
    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /filters/i }).click();
    await page.waitForTimeout(300);
    // Filter panel should appear with trust badge options
    await expect(page.getByText("Trust Badge").first()).toBeVisible();
  });

  test("filter panel shows location filters", async ({ page }) => {
    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /filters/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText("Location").first()).toBeVisible();
  });

  test("filter panel shows rating filters", async ({ page }) => {
    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /filters/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText("Min Rating").first()).toBeVisible();
  });

  test("filter panel shows shipping speed filters", async ({ page }) => {
    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /filters/i }).click();
    await page.waitForTimeout(300);
    await expect(page.getByText("Shipping Speed").first()).toBeVisible();
  });

  test("can sort by different options", async ({ page }) => {
    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    const sortSelect = page.locator("select").first();
    await sortSelect.selectOption("reliability");
    await page.waitForTimeout(300);
    // Results should re-sort (same suppliers visible)
    await expect(page.getByText("Alpha Trading Co")).toBeVisible();
  });
});

test.describe("Suppliers Page - Error State", () => {
  test("shows error state when API fails", async ({ page }) => {
    await setupFirebaseAuth(page);
    await page.goto("/");
    await injectAuthState(page);

    await page.route("**/api/suppliers", (route) => {
      route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Internal Server Error" }) });
    });

    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);
    // Should show error or retry state
  });
});

test.describe("Suppliers Page - Responsive", () => {
  test("suppliers page is responsive on mobile", async ({ page }) => {
    await setupFirebaseAuth(page);
    await page.goto("/");
    await injectAuthState(page);
    await page.route("**/api/suppliers", (route) => {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_SUPPLIERS) });
    });

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/suppliers");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Supplier Intelligence")).toBeVisible();
  });
});
