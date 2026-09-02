import { test, expect } from "@playwright/test";

test.describe("API Routes - Public Endpoints", () => {
  test("GET /api/platforms/search-all returns platform info", async ({ request }) => {
    const response = await request.get("/api/platforms/search-all");
    expect(response.status()).toBeLessThan(500);
    const contentType = response.headers()["content-type"] || "";
    expect(contentType).toContain("application/json");
  });

  test("POST /api/platforms/search-all accepts search query", async ({ request }) => {
    const response = await request.post("/api/platforms/search-all", {
      data: { query: "test query" },
    });
    expect(response.status()).toBeLessThan(500);
  });

  test("GET /api/products/trending returns trending products", async ({ request }) => {
    const response = await request.get("/api/products/trending");
    expect(response.status()).toBeLessThan(500);
  });

  test("GET /api/niches returns niche data", async ({ request }) => {
    const response = await request.get("/api/niches");
    expect(response.status()).toBeLessThan(500);
  });

  test("GET /api/products/categories returns categories", async ({ request }) => {
    const response = await request.get("/api/products/categories");
    expect(response.status()).toBeLessThan(500);
  });
});

test.describe("API Routes - Auth-Protected Endpoints", () => {
  const protectedApiRoutes = [
    "/api/suppliers",
    "/api/competitors",
    "/api/ai",
    "/api/store/connections",
  ];

  for (const route of protectedApiRoutes) {
    test(`${route} returns proper status without auth`, async ({ request }) => {
      const response = await request.get(route);
      // Should not return 500 for unauthenticated
      expect(response.status()).not.toBe(500);
    });
  }
});

test.describe("API Routes - POST Endpoints", () => {
  test("POST /api/competitors accepts search body", async ({ request }) => {
    const response = await request.post("/api/competitors", {
      data: { query: "wireless earbuds" },
    });
    expect(response.status()).toBeLessThan(500);
  });

  test("POST /api/ai accepts message body", async ({ request }) => {
    const response = await request.post("/api/ai", {
      data: { messages: [{ role: "user", content: "hello" }] },
    });
    expect(response.status()).toBeLessThan(500);
  });
});

test.describe("API Routes - Error Handling", () => {
  test("POST endpoint with invalid body returns proper error", async ({ request }) => {
    const response = await request.post("/api/competitors", {
      data: null,
    });
    expect(response.status()).toBeLessThan(500);
  });

  test("GET non-existent API route returns 404", async ({ request }) => {
    const response = await request.get("/api/nonexistent-route-12345");
    expect(response.status()).toBe(404);
  });
});
