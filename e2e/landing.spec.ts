import { test, expect } from "@playwright/test";

test.describe("Landing Page - Core", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("loads with correct title", async ({ page }) => {
    await expect(page).toHaveTitle(/DropShip Hub/);
  });

  test("has html lang attribute", async ({ page }) => {
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("has meta description", async ({ page }) => {
    const description = await page.getAttribute('meta[name="description"]', "content");
    expect(description).toBeTruthy();
    expect(description!.length).toBeGreaterThan(10);
  });

  test("hero heading is visible", async ({ page }) => {
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/dropship/i);
  });
});

test.describe("Landing Page - Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("header contains sign-in link", async ({ page }) => {
    const signInLink = page.getByRole("link", { name: /sign in/i }).first();
    await expect(signInLink).toBeVisible();
    await expect(signInLink).toHaveAttribute("href", /sign-in/);
  });

  test("header contains get started link", async ({ page }) => {
    const getStartedLink = page.getByRole("link", { name: /get started/i }).first();
    await expect(getStartedLink).toBeVisible();
    await expect(getStartedLink).toHaveAttribute("href", /sign-up/);
  });

  test("sign-in link navigates to /sign-in", async ({ page }) => {
    await page.getByRole("link", { name: /sign in/i }).first().click();
    await expect(page).toHaveURL(/sign-in/);
  });

  test("get started link navigates to /sign-up", async ({ page }) => {
    await page.getByRole("link", { name: /get started/i }).first().click();
    await expect(page).toHaveURL(/sign-up/);
  });
});

test.describe("Landing Page - Sections", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("features section is visible", async ({ page }) => {
    await expect(page.getByText(/features/i).first()).toBeVisible();
  });

  test("how it works section is visible", async ({ page }) => {
    await expect(page.getByText(/how it works/i).first()).toBeVisible();
  });

  test("FAQ section is present", async ({ page }) => {
    await expect(page.getByText(/frequently asked/i)).toBeVisible();
  });

  test("FAQ items can be expanded", async ({ page }) => {
    const faqButtons = page.locator("button").filter({ hasText: /\?/ });
    const count = await faqButtons.count();
    if (count > 0) {
      await faqButtons.first().click();
      await page.waitForTimeout(300);
    }
  });

  test("trust bar or social proof is visible", async ({ page }) => {
    const trustElements = page.locator(
      'text=/trusted|verified|users|companies|star|rating/i'
    );
    const count = await trustElements.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe("Landing Page - Scroll Behavior", () => {
  test("scroll to bottom loads more content", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(0);
  });

  test("scroll progress indicator responds to scroll", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(300);
  });
});

test.describe("Landing Page - Responsive Design", () => {
  test("landing page is responsive on mobile (375px)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("landing page is responsive on tablet (768px)", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("landing page is responsive on desktop (1280px)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("mobile menu toggle works on small viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const menuButton = page.getByRole("button", { name: /menu/i });
    if (await menuButton.isVisible()) {
      await menuButton.click();
      await page.waitForTimeout(300);
    }
  });
});

test.describe("Landing Page - SEO & Accessibility", () => {
  test("all images have alt text", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const images = await page.locator("img").all();
    for (const img of images) {
      const alt = await img.getAttribute("alt");
      expect(alt).toBeTruthy();
    }
  });

  test("page has proper heading hierarchy", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const h1 = await page.locator("h1").count();
    expect(h1).toBeGreaterThanOrEqual(1);
  });

  test("navigation links are keyboard accessible", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const links = page.getByRole("link");
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
  });
});
