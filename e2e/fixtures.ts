import { test as base, expect, Page, BrowserContext } from "@playwright/test";

const MOCK_USER = {
  uid: "test-user-123",
  email: "test@example.com",
  displayName: "Test User",
  emailVerified: true,
};

const AUTH_TOKEN = "mock-firebase-id-token";

async function setupFirebaseAuthInterception(page: Page) {
  await page.route("**/identitytoolkit.googleapis.com/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        kind: "identitytoolkit#VerifyPasswordResponse",
        localId: MOCK_USER.uid,
        email: MOCK_USER.email,
        displayName: MOCK_USER.displayName,
        idToken: AUTH_TOKEN,
        registered: true,
      }),
    });
  });

  await page.route("**/securetoken.googleapis.com/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: AUTH_TOKEN,
        token_type: "Bearer",
        expires_in: 3600,
      }),
    });
  });
}

async function injectAuthenticatedState(page: Page) {
  await page.evaluate(({ user, token }) => {
    const dbRequest = indexedDB.open("firebaseLocalStorageDb", 1);
    dbRequest.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("firebaseLocalStorage")) {
        db.createObjectStore("firebaseLocalStorage");
      }
    };
    dbRequest.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const tx = db.transaction("firebaseLocalStorage", "readwrite");
      const store = tx.objectStore("firebaseLocalStorage");
      store.put({
        fbase_key: "firebase:authUser:test-api-key:[DEFAULT]",
        value: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          stsTokenManager: {
            accessToken: token,
            refreshToken: "mock-refresh-token",
            expirationTime: Date.now() + 3600000,
          },
          emailVerified: user.emailVerified,
          createdAt: "1700000000000",
          lastLoginAt: String(Date.now()),
        },
      });
    };
  }, { user: MOCK_USER, token: AUTH_TOKEN });
}

type TestFixtures = {
  authenticatedPage: Page;
  authenticatedContext: BrowserContext;
};

export const test = base.extend<TestFixtures>({
  authenticatedContext: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await setupFirebaseAuthInterception(page);
    await injectAuthenticatedState(page);
    await page.close();
    await use(context);
  },

  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await setupFirebaseAuthInterception(page);
    await injectAuthenticatedState(page);
    await use(page);
    await context.close();
  },
});

export { expect, MOCK_USER, AUTH_TOKEN };

// Helper to setup auth and navigate
export async function setupAuthAndNavigate(page: Page, url: string) {
  await setupFirebaseAuthInterception(page);
  await page.goto("/");
  await injectAuthenticatedState(page);
  await page.goto(url);
  await page.waitForLoadState("networkidle");
}
