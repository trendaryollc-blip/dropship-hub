import { test, expect } from "@playwright/test";

const protectedRoutes = [
  { path: "/dashboard", name: "Dashboard" },
  { path: "/products", name: "Products" },
  { path: "/saved", name: "Saved Products" },
  { path: "/suppliers", name: "Suppliers" },
  { path: "/calculator", name: "Calculator" },
  { path: "/competitors", name: "Competitors" },
  { path: "/health", name: "Health Score" },
  { path: "/store", name: "My Store" },
  { path: "/fulfillment", name: "Fulfillment" },
  { path: "/ai", name: "AI Assistant" },
  { path: "/customer-service", name: "Customer Service" },
  { path: "/settings", name: "Settings" },
  { path: "/platforms", name: "Platforms" },
  { path: "/revenue", name: "Revenue" },
  { path: "/profit-tracker", name: "Profit Tracker" },
  { path: "/monitoring", name: "Monitoring" },
  { path: "/missions", name: "Missions" },
  { path: "/ad-roi", name: "Ad ROI" },
  { path: "/order-router", name: "Order Router" },
  { path: "/product-lifecycle", name: "Product Lifecycle" },
  { path: "/supplier-performance", name: "Supplier Performance" },
];

for (const route of protectedRoutes) {
  test.describe(`${route.name} (${route.path})`, () => {
    test("redirects to sign-in when unauthenticated", async ({ page }) => {
      await page.goto(route.path);
      await expect(page).toHaveURL(/sign-in/, { timeout: 15000 });
    });

    test("redirect URL includes callbackUrl parameter", async ({ page }) => {
      await page.goto(route.path);
      await page.waitForURL(/sign-in/, { timeout: 15000 });
      const url = page.url();
      expect(url).toContain("callbackUrl=");
      expect(url).toContain(encodeURIComponent(route.path));
    });
  });
}

test.describe("Public routes are accessible without auth", () => {
  const publicRoutes = ["/", "/sign-in", "/sign-up", "/forgot-password"];

  for (const route of publicRoutes) {
    test(`${route} is accessible`, async ({ page }) => {
      const response = await page.goto(route);
      expect(response?.status()).toBeLessThan(500);
      // Should NOT redirect to sign-in (except for sign-in page itself)
      if (route !== "/sign-in") {
        await page.waitForTimeout(1000);
        expect(page.url()).not.toContain("/sign-in");
      }
    });
  }
});

test.describe("Protected routes - multiple rapid navigations", () => {
  test("navigating between protected routes consistently redirects", async ({
    page,
  }) => {
    const routes = ["/dashboard", "/products", "/calculator", "/settings"];
    for (const route of routes) {
      await page.goto(route);
      await expect(page).toHaveURL(/sign-in/, { timeout: 10000 });
    }
  });
});

test.describe("Protected routes - API routes", () => {
  test("api routes return proper response without auth", async ({ request }) => {
    const routes = [
      "/api/products/trending",
      "/api/niches",
      "/api/suppliers",
    ];
    for (const route of routes) {
      const response = await request.get(route);
      // Should not return 500 for unauthenticated access
      expect(response.status()).not.toBe(500);
    }
  });
});

test.describe("Session expiry handling", () => {
  test("redirect to sign-in after session expires (expired=1 param)", async ({
    page,
  }) => {
    await page.goto("/sign-in?expired=1&callbackUrl=%2Fdashboard");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/sign-in/);
    await expect(page).toHaveURL(/expired=1/);
  });
});
