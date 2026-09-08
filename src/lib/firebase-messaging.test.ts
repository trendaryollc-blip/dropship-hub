import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("firebase/messaging", () => ({
  getMessaging: vi.fn(() => ({ name: "mock-messaging" })),
  getToken: vi.fn().mockResolvedValue("mock-fcm-token"),
  onMessage: vi.fn(() => vi.fn()),
}));

describe("firebase-messaging.ts", () => {
  const originalWindow = globalThis.window;
  const originalNotification = (globalThis as Record<string, unknown>).Notification;
  const originalLocalStorage = globalThis.localStorage;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    globalThis.window = originalWindow;
    if (originalNotification !== undefined) {
      (globalThis as Record<string, unknown>).Notification = originalNotification;
    }
    if (originalLocalStorage !== undefined) {
      globalThis.localStorage = originalLocalStorage;
    }
  });

  it("onForegroundMessage returns unsubscribe function", async () => {
    globalThis.window = {} as unknown as Window;
    const { onForegroundMessage } = await import("./firebase-messaging");
    const unsub = onForegroundMessage(() => {});
    expect(typeof unsub).toBe("function");
  });

  it("getStoredToken returns token from localStorage", async () => {
    globalThis.window = {} as unknown as Window;
    const mockStorage = { getItem: vi.fn().mockReturnValue("stored-token") };
    globalThis.localStorage = mockStorage as unknown as Storage;

    const { getStoredToken } = await import("./firebase-messaging");
    const token = getStoredToken();
    expect(token).toBe("stored-token");
  });

  it("getStoredToken returns null when no token stored", async () => {
    globalThis.window = {} as unknown as Window;
    const mockStorage = { getItem: vi.fn().mockReturnValue(null) };
    globalThis.localStorage = mockStorage as unknown as Storage;

    const { getStoredToken } = await import("./firebase-messaging");
    const token = getStoredToken();
    expect(token).toBeNull();
  });

  it("returns null when window is undefined (SSR)", async () => {
    // @ts-expect-error - testing SSR
    delete globalThis.window;
    const { requestNotificationPermission, getStoredToken } = await import("./firebase-messaging");
    expect(await requestNotificationPermission()).toBeNull();
    expect(getStoredToken()).toBeNull();
  });

  it("requestNotificationPermission returns null when Notification API missing", async () => {
    globalThis.window = {} as unknown as Window;
    delete (globalThis as Record<string, unknown>).Notification;

    const { requestNotificationPermission } = await import("./firebase-messaging");
    const token = await requestNotificationPermission();
    expect(token).toBeNull();
  });
});
