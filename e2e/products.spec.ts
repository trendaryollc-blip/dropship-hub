import { test, expect, type Page } from "@playwright/test";
import { setupFirebaseAuth, injectAuthState } from "./helpers";

// ---------------------------------------------------------------------------
// Helpers — each ~authenticated~ test: bootstrap auth, then stub the discovery
// sections and (per test) the search-all / detail endpoints. Routes registered
// later take precedence, so the shared stubs below are installed first and the
// search-specific stubs override them inside each test block.
// ---------------------------------------------------------------------------

async function pageWithAuth(page: Page) {
  await setupFirebaseAuth(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await injectAuthState(page);
  await page.route("**/api/search/suggestions", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ suggestions: [] }) })
  );
}

async function stubDiscoverySections(page: Page) {
  await page.route("**/api/products/trending", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ products: [] }) })
  );
  await page.route("**/api/niches", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ niches: [] }) })
  );
  await page.route("**/api/products/categories", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ categories: [] }) })
  );
  await page.route("**/api/platforms/batch-images", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ urls: [], images: [] }) })
  );
  await page.route("**/api/products/recommendations", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ recommendations: [] }) })
  );
}

async function stubDetailEndpoints(page: Page) {
  await page.route("**/api/products/enrich", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        platforms: [{ platform: "ebay", price: 10.99, rating: 4.2, reviews: 80, inStock: true, url: "https://ebay.com/itm/1" }],
        cheapest: { platform: "ebay", price: 10.99 },
        mostExpensive: { platform: "amazon", price: 29.99 },
        priceSpread: 3.5,
        supplierMatches: [],
      }),
    })
  );
  await page.route("**/api/products/reviews", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ averageRating: 4.2, totalReviews: 90 }) })
  );
  await page.route("**/api/products/market-intel", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ searchVolume: "medium", searchVolumeNumber: 500, trendDirection: "rising", riskScore: 20 }),
    })
  );
  await page.route("**/api/products/listing", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ title: "Optimized Listing Title" }) })
  );
  await page.route("**/api/products/similar", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ similar: [], boughtTogether: [] }) })
  );
  await page.route("**/api/platforms/product-images", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ images: [] }) })
  );
}

function searchResultPayload(overrides: Record<string, unknown> = {}) {
  return {
    platforms: [
      { platform: "amazon", name: "Amazon", resultCount: 2, total: 2, data: [] as unknown[] },
    ],
    platformErrors: [],
    mergedProducts: [
      { id: "prod-1", title: "Test Product 1", price: 29.99, image: "", link: "https://example.com/1", source: "amazon", brand: "TestBrand", rating: 4.5, reviews: 12 },
      { id: "prod-2", title: "Test Product 2", price: 49.99, image: "", link: "https://example.com/2", source: "amazon", brand: "TestBrand", rating: 4.0, reviews: 8 },
    ],
    ...overrides,
  };
}

async function stubSearchAll(page: Page, body: unknown) {
  await page.route("**/api/platforms/search-all", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) })
  );
}

const searchInput = (page: Page) => page.getByRole("combobox", { name: "Search products" });

async function authAndMock(page: Page) {
  await pageWithAuth(page);
  await stubDiscoverySections(page);
}

// ---------------------------------------------------------------------------
// Unauthenticated
// ---------------------------------------------------------------------------

test.describe("Products Page - Unauthenticated", () => {
  test("redirects to sign-in when unauthenticated", async ({ page }) => {
    await page.goto("/products", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/sign-in/, { timeout: 15000 });
  });
});

// ---------------------------------------------------------------------------
// Discovery / initial state
// ---------------------------------------------------------------------------

test.describe("Products Page - Authenticated - Empty State", () => {
  test.beforeEach(async ({ page }) => {
    await authAndMock(page);
    await stubSearchAll(page, { platforms: [], platformErrors: [], mergedProducts: [] });
  });

  test("loads the products page with discovery sections", async ({ page }) => {
    await page.goto("/products", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Discovery")).toBeVisible();
    await expect(page.getByText("How It Works")).toBeVisible();
    await expect(page.getByText("Fresh from live search")).toBeVisible();
  });

  test("renders a searchable input", async ({ page }) => {
    await page.goto("/products", { waitUntil: "domcontentloaded" });
    await expect(searchInput(page)).toBeVisible();
    await searchInput(page).fill("wireless earbuds");
    await expect(searchInput(page)).toHaveValue("wireless earbuds");
  });
});

// ---------------------------------------------------------------------------
// Search flow
// ---------------------------------------------------------------------------

test.describe("Products Page - Authenticated - Search Flow", () => {
  test.beforeEach(async ({ page }) => {
    await authAndMock(page);
  });

  test("searches on Enter, shows results, and syncs the query into the URL", async ({ page }) => {
    await stubSearchAll(page, searchResultPayload());
    await page.goto("/products", { waitUntil: "domcontentloaded" });

    await searchInput(page).fill("wireless earbuds");
    await searchInput(page).press("Enter");

    await expect(page.getByText("Test Product 1")).toBeVisible();
    await expect(page.getByText("Test Product 2")).toBeVisible();
    await expect(page).toHaveURL(/\/products\?q=wireless\+earbuds/);
  });

  test("auto-triggers a search from the ?q= URL parameter", async ({ page }) => {
    await stubSearchAll(page, searchResultPayload());
    await page.goto("/products?q=wireless+earbuds", { waitUntil: "domcontentloaded" });

    await expect(page.getByText("Test Product 1")).toBeVisible();
  });

  test("shows platform progress while the search is pending, then results", async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    await page.route("**/api/platforms/search-all", async (route) => {
      await gate;
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(searchResultPayload()) });
    });

    await page.goto("/products?q=wireless+earbuds", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Searching platforms...")).toBeVisible({ timeout: 15000 });

    release();
    await expect(page.getByText("Test Product 1")).toBeVisible();
    await expect(page.getByText("Searching platforms...")).toHaveCount(0);
  });

  test("shows the empty state when a search returns no products", async ({ page }) => {
    await stubSearchAll(page, { platforms: [], platformErrors: [], mergedProducts: [] });
    await page.goto("/products", { waitUntil: "domcontentloaded" });

    await searchInput(page).fill("no results here");
    await searchInput(page).press("Enter");

    await expect(page.getByText("No products found")).toBeVisible();
  });

  test("surfaces a network error and recovers on a new search", async ({ page }) => {
    let failSearch = true;
    await page.route("**/api/platforms/search-all", async (route) => {
      if (failSearch) {
        await route.fulfill({ status: 500, contentType: "application/json", body: "boom" });
      } else {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(searchResultPayload()) });
      }
    });
    await page.goto("/products", { waitUntil: "domcontentloaded" });

    await searchInput(page).fill("wireless earbuds");
    await searchInput(page).press("Enter");
    await expect(page.getByText("Network error - please try again")).toBeVisible();

    failSearch = false;
    await searchInput(page).press("Enter");
    await expect(page.getByText("Test Product 1")).toBeVisible();
    await expect(page.getByText("Network error - please try again")).toHaveCount(0);
  });

  test("an empty query does not trigger a search", async ({ page }) => {
    await page.goto("/products", { waitUntil: "domcontentloaded" });
    await searchInput(page).fill("");
    await searchInput(page).press("Enter");

    await expect(page.getByText("Discovery")).toBeVisible();
    await expect(page).not.toHaveURL(/q=/);
  });
});

// ---------------------------------------------------------------------------
// Detail page hand-off from a search result
// ---------------------------------------------------------------------------

test.describe("Products Page - Authenticated - Detail Hand-off", () => {
  test.beforeEach(async ({ page }) => {
    await authAndMock(page);
    await stubDetailEndpoints(page);
  });

  test("opens a product detail from a '#' link and rewrites the CTA to a platform search URL", async ({ page }) => {
    await stubSearchAll(
      page,
      searchResultPayload({
        mergedProducts: [
          { id: "prod-1", title: "Test Product 1", price: 29.99, image: "", link: "#", source: "amazon", brand: "TestBrand", rating: 4.5, reviews: 12 },
        ],
        platforms: [{ platform: "amazon", name: "Amazon", resultCount: 1, total: 1, data: [{}] }],
      })
    );
    await page.goto("/products", { waitUntil: "domcontentloaded" });
    await searchInput(page).fill("wireless earbuds");
    await searchInput(page).press("Enter");

    await page.getByRole("link", { name: "Test Product 1" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Test Product 1" })).toBeVisible();
    // No dead "#" link — every "View on Amazon" CTA points at an Amazon search.
    const cta = page.getByRole("link", { name: /view on amazon/i }).first();
    await expect(cta).toHaveAttribute("href", "https://www.amazon.com/s?k=Test%20Product%201");
  });

  test("keeps a real source URL on the detail CTA", async ({ page }) => {
    await stubSearchAll(page, searchResultPayload());
    await page.goto("/products", { waitUntil: "domcontentloaded" });
    await searchInput(page).fill("wireless earbuds");
    await searchInput(page).press("Enter");

    await page.getByRole("link", { name: "Test Product 1" }).click();

    await expect(page.getByRole("heading", { level: 1, name: "Test Product 1" })).toBeVisible();
    const cta = page.getByRole("link", { name: /view on amazon/i }).first();
    await expect(cta).toHaveAttribute("href", "https://example.com/1");
  });
});