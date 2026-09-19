import type { Page } from "@playwright/test";

/**
 * Intercepts Firebase Auth network calls and fulfills them with a mock user so
 * specs can authenticate without hitting real Firebase endpoints.
 */
export async function setupFirebaseAuth(page: Page) {
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

/**
 * Seeds the Firebase IndexedDB local-storage entry so the app treats the
 * session as authenticated from the first load.
 */
export async function injectAuthState(page: Page) {
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
