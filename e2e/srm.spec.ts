import { test, expect } from "@playwright/test";

async function setupFirebaseAuth(page: import("@playwright/test").Page) {
  await page.route("**/identitytoolkit.googleapis.com/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ localId: "test-user-123", email: "test@example.com", idToken: "mock-token", registered: true }),
    });
  });
  await page.route("**/securetoken.googleapis.com/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ access_token: "mock-token", token_type: "Bearer", expires_in: 3600 }),
    });
  });
}

async function injectAuthState(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    const dbRequest = indexedDB.open("firebaseLocalStorageDb", 1);
    dbRequest.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("firebaseLocalStorage")) db.createObjectStore("firebaseLocalStorage");
    };
    dbRequest.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const tx = db.transaction("firebaseLocalStorage", "readwrite");
      tx.objectStore("firebaseLocalStorage").put({
        fbase_key: "firebase:authUser:test-api-key:[DEFAULT]",
        value: { uid: "test-user-123", email: "test@example.com", stsTokenManager: { accessToken: "mock-token", refreshToken: "mock-refresh", expirationTime: Date.now() + 3600000 }, emailVerified: true },
      });
    };
  });
}

const MOCK_SCORECARDS = {
  scorecards: [
    {
      supplierId: "cj-dropshipping",
      supplierName: "CJ Dropshipping",
      overallScore: 87.5,
      criteria: {
        speed: { score: 85, weight: 0.2, weightedScore: 17, details: "Speed score", dataPoints: 1 },
        quality: { score: 90, weight: 0.25, weightedScore: 22.5, details: "Quality score", dataPoints: 1 },
        communication: { score: 82, weight: 0.15, weightedScore: 12.3, details: "Communication score", dataPoints: 1 },
        price: { score: 95, weight: 0.2, weightedScore: 19, details: "Price score", dataPoints: 1 },
        reliability: { score: 88, weight: 0.2, weightedScore: 17.6, details: "Reliability score", dataPoints: 1 },
      },
      grade: "B+",
      trend: "improving",
      lastEvaluated: new Date().toISOString(),
      history: [
        { date: "2026-01-01", overallScore: 85, criteria: { speed: 80, quality: 88, communication: 80, price: 92, reliability: 85 } },
        { date: "2026-01-15", overallScore: 87.5, criteria: { speed: 85, quality: 90, communication: 82, price: 95, reliability: 88 } },
      ],
    },
  ],
};

const MOCK_MESSAGES = {
  messages: [
    {
      id: "msg-1",
      supplierId: "cj-dropshipping",
      supplierName: "CJ Dropshipping",
      direction: "outgoing",
      subject: "Price inquiry for bulk order",
      body: "We would like to discuss pricing for a bulk order of 500 units.",
      status: "sent",
      messageType: "negotiation",
      createdAt: new Date().toISOString(),
    },
    {
      id: "msg-2",
      supplierId: "cj-dropshipping",
      supplierName: "CJ Dropshipping",
      direction: "incoming",
      subject: "Re: Price inquiry",
      body: "We can offer a 15% discount for 500+ units.",
      status: "unread",
      messageType: "negotiation",
      createdAt: new Date().toISOString(),
    },
  ],
};

const MOCK_NEGOTIATIONS = {
  negotiations: [
    {
      id: "neg-1",
      supplierId: "cj-dropshipping",
      supplierName: "CJ Dropshipping",
      productTitle: "Wireless Earbuds",
      status: "active",
      rounds: [
        { roundNumber: 1, initiator: "us", price: 12.5, message: "Initial offer", timestamp: new Date().toISOString() },
        { roundNumber: 2, initiator: "supplier", price: 14.0, message: "Counter offer", timestamp: new Date().toISOString() },
      ],
      initialPrice: 12.5,
      currentOffer: 14.0,
      targetPrice: 10.0,
      quantity: 500,
      notes: "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
};

const MOCK_RULES = {
  rules: [
    {
      id: "rule-1",
      supplierId: "cj-dropshipping",
      supplierName: "CJ Dropshipping",
      enabled: true,
      threshold: 70,
      metric: "overall_score",
      action: "alert",
      triggerCount: 2,
      createdAt: new Date().toISOString(),
    },
  ],
};

test.describe("SRM Page", () => {
  test("redirects to sign-in when unauthenticated", async ({ page }) => {
    await page.goto("/srm");
    await expect(page).toHaveURL(/sign-in/, { timeout: 15000 });
  });
});

test.describe("SRM Page - Authenticated", () => {
  test.beforeEach(async ({ page }) => {
    await setupFirebaseAuth(page);
    await page.goto("/");
    await injectAuthState(page);

    await page.route("**/api/srm/messages*", (route) => {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_MESSAGES) });
    });
    await page.route("**/api/srm/negotiations*", (route) => {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_NEGOTIATIONS) });
    });
    await page.route("**/api/srm/scorecards*", (route) => {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_SCORECARDS) });
    });
    await page.route("**/api/srm/auto-switch*", (route) => {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ rules: MOCK_RULES.rules, logs: [] }) });
    });
  });

  test("loads SRM page with heading", async ({ page }) => {
    await page.goto("/srm");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Supplier Relationship Management")).toBeVisible();
  });

  test("shows compose message button", async ({ page }) => {
    await page.goto("/srm");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Compose Message")).toBeVisible();
  });

  test("shows KPI cards", async ({ page }) => {
    await page.goto("/srm");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Supplier Score")).toBeVisible();
    await expect(page.getByText("Active Negotiations")).toBeVisible();
  });

  test("has tab navigation", async ({ page }) => {
    await page.goto("/srm");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Scorecards")).toBeVisible();
    await expect(page.getByText("Messages")).toBeVisible();
    await expect(page.getByText("Negotiations")).toBeVisible();
    await expect(page.getByText("Auto-Switch")).toBeVisible();
  });

  test("shows scorecards by default", async ({ page }) => {
    await page.goto("/srm");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("CJ Dropshipping")).toBeVisible();
    await expect(page.getByText("87.5")).toBeVisible();
  });

  test("scorecard shows grade", async ({ page }) => {
    await page.goto("/srm");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("B+").first()).toBeVisible();
  });

  test("scorecard shows trend", async ({ page }) => {
    await page.goto("/srm");
    await page.waitForLoadState("networkidle");
    // Trend icon should be visible
    await expect(page.getByText("CJ Dropshipping")).toBeVisible();
  });

  test("can switch to messages tab", async ({ page }) => {
    await page.goto("/srm");
    await page.waitForLoadState("networkidle");
    await page.getByText("Messages").click();
    await page.waitForTimeout(300);
    await expect(page.getByText("Price inquiry for bulk order")).toBeVisible();
  });

  test("message shows direction", async ({ page }) => {
    await page.goto("/srm");
    await page.waitForLoadState("networkidle");
    await page.getByText("Messages").click();
    await page.waitForTimeout(300);
    await expect(page.getByText("outgoing").first()).toBeVisible();
  });

  test("message shows status", async ({ page }) => {
    await page.goto("/srm");
    await page.waitForLoadState("networkidle");
    await page.getByText("Messages").click();
    await page.waitForTimeout(300);
    await expect(page.getByText("sent").first()).toBeVisible();
  });

  test("can switch to negotiations tab", async ({ page }) => {
    await page.goto("/srm");
    await page.waitForLoadState("networkidle");
    await page.getByText("Negotiations").click();
    await page.waitForTimeout(300);
    await expect(page.getByText("Wireless Earbuds")).toBeVisible();
  });

  test("negotiation shows status", async ({ page }) => {
    await page.goto("/srm");
    await page.waitForLoadState("networkidle");
    await page.getByText("Negotiations").click();
    await page.waitForTimeout(300);
    await expect(page.getByText("active").first()).toBeVisible();
  });

  test("negotiation shows price progress", async ({ page }) => {
    await page.goto("/srm");
    await page.waitForLoadState("networkidle");
    await page.getByText("Negotiations").click();
    await page.waitForTimeout(300);
    await expect(page.getByText("$12.5")).toBeVisible();
    await expect(page.getByText("$14")).toBeVisible();
    await expect(page.getByText("$10")).toBeVisible();
  });

  test("negotiation expands on click", async ({ page }) => {
    await page.goto("/srm");
    await page.waitForLoadState("networkidle");
    await page.getByText("Negotiations").click();
    await page.waitForTimeout(300);
    await page.getByText("Wireless Earbuds").click();
    await page.waitForTimeout(300);
    await expect(page.getByText("Initial offer")).toBeVisible();
    await expect(page.getByText("Counter offer")).toBeVisible();
  });

  test("can switch to auto-switch tab", async ({ page }) => {
    await page.goto("/srm");
    await page.waitForLoadState("networkidle");
    await page.getByText("Auto-Switch").click();
    await page.waitForTimeout(300);
    await expect(page.getByText("Auto-Switch Rules")).toBeVisible();
  });

  test("auto-switch shows existing rules", async ({ page }) => {
    await page.goto("/srm");
    await page.waitForLoadState("networkidle");
    await page.getByText("Auto-Switch").click();
    await page.waitForTimeout(300);
    await expect(page.getByText("overall_score")).toBeVisible();
  });

  test("compose modal opens", async ({ page }) => {
    await page.goto("/srm");
    await page.waitForLoadState("networkidle");
    await page.getByText("Compose Message").click();
    await page.waitForTimeout(300);
    await expect(page.getByText("Cancel")).toBeVisible();
  });

  test("compose modal has subject input", async ({ page }) => {
    await page.goto("/srm");
    await page.waitForLoadState("networkidle");
    await page.getByText("Compose Message").click();
    await page.waitForTimeout(300);
    await expect(page.getByPlaceholder("Subject")).toBeVisible();
  });

  test("compose modal has body textarea", async ({ page }) => {
    await page.goto("/srm");
    await page.waitForLoadState("networkidle");
    await page.getByText("Compose Message").click();
    await page.waitForTimeout(300);
    await expect(page.getByPlaceholder("Message body...")).toBeVisible();
  });

  test("compose modal closes on cancel", async ({ page }) => {
    await page.goto("/srm");
    await page.waitForLoadState("networkidle");
    await page.getByText("Compose Message").click();
    await page.waitForTimeout(300);
    await page.getByText("Cancel").click();
    await page.waitForTimeout(300);
    await expect(page.getByPlaceholder("Subject")).not.toBeVisible();
  });

  test("scorecard shows criteria breakdown on expand", async ({ page }) => {
    await page.goto("/srm");
    await page.waitForLoadState("networkidle");
    await page.getByText("CJ Dropshipping").click();
    await page.waitForTimeout(300);
    await expect(page.getByText("Speed")).toBeVisible();
    await expect(page.getByText("Quality")).toBeVisible();
    await expect(page.getByText("Communication")).toBeVisible();
    await expect(page.getByText("Price")).toBeVisible();
    await expect(page.getByText("Reliability")).toBeVisible();
  });
});

test.describe("SRM Page - Responsive", () => {
  test("page is responsive on mobile", async ({ page }) => {
    await setupFirebaseAuth(page);
    await page.goto("/");
    await injectAuthState(page);
    await page.route("**/api/srm/*", (route) => {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ scorecards: [], messages: [], negotiations: [], rules: [], logs: [] }) });
    });

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/srm");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Supplier Relationship Management")).toBeVisible();
  });
});
