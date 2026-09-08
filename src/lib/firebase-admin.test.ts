import { describe, it, expect, vi, beforeEach } from "vitest";

vi.unmock("@/lib/firebase-admin");

const mockInitializeApp = vi.fn().mockReturnValue({ name: "admin-app" });
const mockCert = vi.fn().mockReturnValue({ projectId: "test-project" });
const mockAdminGetApps = vi.fn().mockReturnValue([]);
const mockAdminFirestore = vi.fn().mockReturnValue({ name: "admin-firestore" });
const mockAdminAuth = vi.fn().mockReturnValue({ name: "admin-auth" });

vi.mock("firebase-admin/app", () => ({
  initializeApp: (...args: unknown[]) => mockInitializeApp(...args),
  cert: (...args: unknown[]) => mockCert(...args),
  getApps: (...args: unknown[]) => mockAdminGetApps(...args),
}));

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: (...args: unknown[]) => mockAdminFirestore(...args),
}));

vi.mock("firebase-admin/auth", () => ({
  getAuth: (...args: unknown[]) => mockAdminAuth(...args),
}));

describe("firebase-admin SDK", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockInitializeApp.mockReturnValue({ name: "admin-app" });
    mockCert.mockReturnValue({ projectId: "test-project" });
    mockAdminGetApps.mockReturnValue([]);
    mockAdminFirestore.mockReturnValue({ name: "admin-firestore" });
    mockAdminAuth.mockReturnValue({ name: "admin-auth" });
    delete process.env.FIREBASE_SERVICE_ACCOUNT;
  });

  describe("getAdminDB", () => {
    it("returns Firestore instance", async () => {
      process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify({
        projectId: "test-project",
        clientEmail: "test@test.iam.gserviceaccount.com",
        privateKey: "test-key",
      });

      const { getAdminDB } = await import("./firebase-admin");
      const db = await getAdminDB();
      expect(db).toBeDefined();
    });

    it("throws when FIREBASE_SERVICE_ACCOUNT is not set", async () => {
      delete process.env.FIREBASE_SERVICE_ACCOUNT;

      const { getAdminDB } = await import("./firebase-admin");
      await expect(getAdminDB()).rejects.toThrow(
        "FIREBASE_SERVICE_ACCOUNT environment variable is not set"
      );
    });

    it("handles malformed JSON in FIREBASE_SERVICE_ACCOUNT", async () => {
      process.env.FIREBASE_SERVICE_ACCOUNT = "invalid-json";

      const { getAdminDB } = await import("./firebase-admin");
      await expect(getAdminDB()).rejects.toThrow();
    });

    it("repairs corrupted private_key with real newlines", async () => {
      const serviceAccount = {
        projectId: "test-project",
        clientEmail: "test@test.iam.gserviceaccount.com",
        privateKey: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0B\n-----END PRIVATE KEY-----",
      };
      const json = JSON.stringify(serviceAccount);
      const corrupted = json.replace(/\\n/g, "\n");
      process.env.FIREBASE_SERVICE_ACCOUNT = corrupted;

      const { getAdminDB } = await import("./firebase-admin");
      const db = await getAdminDB();
      expect(db).toBeDefined();
    });
  });

  describe("getAdminAuth", () => {
    it("returns Auth instance", async () => {
      process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify({
        projectId: "test-project",
        clientEmail: "test@test.iam.gserviceaccount.com",
        privateKey: "test-key",
      });

      const { getAdminAuth } = await import("./firebase-admin");
      const auth = getAdminAuth();
      expect(auth).toBeDefined();
    });

    it("throws when FIREBASE_SERVICE_ACCOUNT is not set", async () => {
      delete process.env.FIREBASE_SERVICE_ACCOUNT;

      const { getAdminAuth } = await import("./firebase-admin");
      expect(() => getAdminAuth()).toThrow(
        "FIREBASE_SERVICE_ACCOUNT environment variable is not set"
      );
    });
  });

  describe("initializes app only once", () => {
    it("does not reinitialize if apps exist", async () => {
      process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify({
        projectId: "test-project",
        clientEmail: "test@test.iam.gserviceaccount.com",
        privateKey: "test-key",
      });

      const existingApp = { name: "existing-admin-app" };
      mockAdminGetApps.mockReturnValue([existingApp as any]);

      const { getAdminDB } = await import("./firebase-admin");
      const db = await getAdminDB();
      expect(db).toBeDefined();
      expect(mockInitializeApp).not.toHaveBeenCalled();
    });
  });
});
