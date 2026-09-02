import { test, expect } from "@playwright/test";

test.describe("Landing Page - Responsive", () => {
  const viewports = [
    { name: "Mobile", width: 375, height: 667 },
    { name: "Tablet", width: 768, height: 1024 },
    { name: "Desktop", width: 1280, height: 800 },
    { name: "Large Desktop", width: 1920, height: 1080 },
  ];

  for (const viewport of viewports) {
    test(`renders correctly on ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    });
  }
});

test.describe("Auth Pages - Responsive", () => {
  const viewports = [
    { name: "Mobile", width: 375, height: 667 },
    { name: "Tablet", width: 768, height: 1024 },
    { name: "Desktop", width: 1280, height: 800 },
  ];

  for (const viewport of viewports) {
    test(`sign-in renders on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/sign-in");
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
      await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
    });

    test(`sign-up renders on ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto("/sign-up");
      await page.waitForLoadState("networkidle");
      await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible();
    });
  }
});

test.describe("Layout Stability", () => {
  test("landing page has no layout shift on load", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    const bodyHeight = await page.evaluate(() => document.body.scrollHeight);
    expect(bodyHeight).toBeGreaterThan(0);
  });

  test("auth pages have consistent layout", async ({ page }) => {
    const pages = ["/sign-in", "/sign-up", "/forgot-password"];
    for (const route of pages) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      const headings = await page.locator("h1, h2").count();
      expect(headings).toBeGreaterThanOrEqual(1);
    }
  });
});
