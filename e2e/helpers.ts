import type { Page } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * The Playwright test process does not load Next.js-style env files (.env.local
 * etc.), so NEXT_PUBLIC_FIREBASE_API_KEY is often undefined here even though
 * the app build embedded the real key. Firebase persists its session under
 * `firebase:authUser:<apiKey>:[DEFAULT]`, so the seeded record must match the
 * KEY THE BUILD actually used, or session restore silently finds nothing and
 * the app bounces to /sign-in. Read the key out of the standard env files.
 */
function apiKeyFromEnvFiles(): string | undefined {
  for (const file of [".env.local", ".env", ".env.development.local", ".env.production.local"]) {
    try {
      const path = join(process.cwd(), file);
      if (!existsSync(path)) continue;
      const match = readFileSync(path, "utf8").match(/^NEXT_PUBLIC_FIREBASE_API_KEY\s*=\s*(.+)$/m);
      if (match) return match[1].trim().replace(/^["']|["']$/g, "");
    } catch {
      // ignore unreadable env files
    }
  }
  return undefined;
}

/**
 * Intercepts Firebase Auth network calls and fulfills them with a mock user so
 * specs can authenticate without hitting real Firebase endpoints.
 */
export async function setupFirebaseAuth(page: Page) {
  // Firebase client SDK endpoints that hit real Google servers in production.
  // In tests there is no live Firebase project: stub them so the network
  // reaches idle (real requests to identitytoolkit/securetoken/firestore
  // would otherwise hang, which is what made CI's e2e job run 2+ hours).
  await page.route("**/securetoken.googleapis.com/**", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ access_token: "mock-token", refresh_token: "mock-refresh", token_type: "Bearer", expires_in: "86400" }),
    });
  });
  await page.route("**/firestore.googleapis.com/**", (route) => {
    route.fulfill({ status: 403, contentType: "text/plain", body: "denied" });
  });

  await page.route("**/identitytoolkit.googleapis.com/**", (route) => {
    const url = route.request().url();
    const body = url.includes("accounts:lookup")
      // Token validation performed when a persisted session is restored.
      ? {
          users: [
            {
              localId: "test-user-123",
              email: "test@example.com",
              emailVerified: true,
              displayName: "Test User",
              createdAt: "1735689600000",
              lastLoginAt: "1735689600000",
              lastRefreshAt: "2026-01-01T00:00:00Z",
            },
          ],
        }
      : { localId: "test-user-123", email: "test@example.com", idToken: "mock-token", refreshToken: "mock-refresh", expiresIn: "3600", registered: true };
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(body),
    });
  });
}

/**
 * Seeds the Firebase IndexedDB local-storage entry so the app treats the
 * session as authenticated from the first load.
 *
 * Two things are critical:
 * 1. The schema must match what @firebase/auth v12 persists: an object store
 *    with keyPath "fbase_key" holding { fbase_key, value } records, where the
 *    key embeds the configured API key (CI builds use "test") and `value`
 *    satisfies UserImpl._fromJSON (requires uid, stsTokenManager,
 *    emailVerified and isAnonymous booleans).
 * 2. Auth session restore only happens at Firebase initialization, i.e.
 *    during the FIRST page load. Seeding after the app has already loaded
 *    (past the initial goto) is ignored, so this uses addInitScript to run
 *    before every navigation.
 */
export async function injectAuthState(page: Page) {
  // Seed every API key we might be running against so the record is found
  // regardless of how the app was built (CI uses "test").
  const apiKeys = Array.from(
    new Set([process.env.NEXT_PUBLIC_FIREBASE_API_KEY, apiKeyFromEnvFiles(), "test-api-key", "test"].filter(Boolean))
  );

  await page.addInitScript((keys) => {
    const uid = "test-user-123";
    localStorage.setItem(`onboarding_${uid}`, "done");
    const dbRequest = indexedDB.open("firebaseLocalStorageDb", 1);
    dbRequest.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("firebaseLocalStorage")) {
        db.createObjectStore("firebaseLocalStorage", { keyPath: "fbase_key" });
      }
    };
    dbRequest.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const tx = db.transaction("firebaseLocalStorage", "readwrite");
      const store = tx.objectStore("firebaseLocalStorage");
      for (const apiKey of keys) {
        store.put({
          fbase_key: `firebase:authUser:${apiKey}:[DEFAULT]`,
          value: {
            uid: "test-user-123",
            email: "test@example.com",
            emailVerified: true,
            isAnonymous: false,
            providerData: [],
            stsTokenManager: { accessToken: "mock-token", refreshToken: "mock-refresh", expirationTime: Date.now() + 3600000 },
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          },
        });
      }
      tx.oncomplete = () => db.close();
    };
    dbRequest.onerror = () => {};
  }, apiKeys);

  // Also push the record for the already-loaded page (e.g. specs that seed
  // after a first goto and don't navigate again) — matching the legacy flow.
  await page.evaluate((keys) => {
    localStorage.setItem("onboarding_test-user-123", "done");
    return new Promise((resolve) => {
      const dbRequest = indexedDB.open("firebaseLocalStorageDb", 1);
      dbRequest.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains("firebaseLocalStorage")) {
          db.createObjectStore("firebaseLocalStorage", { keyPath: "fbase_key" });
        }
      };
      dbRequest.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const tx = db.transaction("firebaseLocalStorage", "readwrite");
        const store = tx.objectStore("firebaseLocalStorage");
        for (const apiKey of keys) {
          store.put({
            fbase_key: `firebase:authUser:${apiKey}:[DEFAULT]`,
            value: {
              uid: "test-user-123",
              email: "test@example.com",
              emailVerified: true,
              isAnonymous: false,
              providerData: [],
              stsTokenManager: { accessToken: "mock-token", refreshToken: "mock-refresh", expirationTime: Date.now() + 3600000 },
              createdAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
            },
          });
        }
        tx.oncomplete = () => { db.close(); resolve(null); };
      };
      dbRequest.onerror = () => resolve(null);
    });
  }, apiKeys);
}
