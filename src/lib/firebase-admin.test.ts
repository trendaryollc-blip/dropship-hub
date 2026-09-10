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

function makeServiceAccount(overrides: Record<string, string> = {}) {
  return {
    type: "service_account",
    project_id: "test-project",
    private_key_id: "key-id",
    private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASC\n-----END PRIVATE KEY-----\n",
    client_email: "test@test.iam.gserviceaccount.com",
    client_id: "123456",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/test",
    universe_domain: "googleapis.com",
    ...overrides,
  };
}

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
      process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify(makeServiceAccount());

      const { getAdminDB } = await import("./firebase-admin");
      const db = await getAdminDB();
      expect(db).toBeDefined();
    });

    it("throws when FIREBASE_SERVICE_ACCOUNT is not set", async () => {
      delete process.env.FIREBASE_SERVICE_ACCOUNT;

      const { getAdminDB } = await import("./firebase-admin");
      await expect(getAdminDB()).rejects.toThrow("FIREBASE_SERVICE_ACCOUNT is not set");
    });

    it("handles malformed JSON in FIREBASE_SERVICE_ACCOUNT", async () => {
      process.env.FIREBASE_SERVICE_ACCOUNT = "invalid-json";

      const { getAdminDB } = await import("./firebase-admin");
      await expect(getAdminDB()).rejects.toThrow();
    });

    it("repairs corrupted private_key with real newlines", async () => {
      const sa = makeServiceAccount();
      const json = JSON.stringify(sa);
      const corrupted = json.replace(/\\n/g, "\n");
      process.env.FIREBASE_SERVICE_ACCOUNT = corrupted;

      const { getAdminDB } = await import("./firebase-admin");
      const db = await getAdminDB();
      expect(db).toBeDefined();
    });
  });

  describe("getAdminAuth", () => {
    it("returns Auth instance", async () => {
      process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify(makeServiceAccount());

      const { getAdminAuth } = await import("./firebase-admin");
      const auth = getAdminAuth();
      expect(auth).toBeDefined();
    });

    it("throws when FIREBASE_SERVICE_ACCOUNT is not set", async () => {
      delete process.env.FIREBASE_SERVICE_ACCOUNT;

      const { getAdminAuth } = await import("./firebase-admin");
      expect(() => getAdminAuth()).toThrow("FIREBASE_SERVICE_ACCOUNT is not set");
    });
  });

  describe("initializes app only once", () => {
    it("does not reinitialize if apps exist", async () => {
      process.env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify(makeServiceAccount());

      const existingApp = { name: "existing-admin-app" };
      mockAdminGetApps.mockReturnValue([existingApp as any]);

      const { getAdminDB } = await import("./firebase-admin");
      const db = await getAdminDB();
      expect(db).toBeDefined();
      expect(mockInitializeApp).not.toHaveBeenCalled();
    });
  });
});
