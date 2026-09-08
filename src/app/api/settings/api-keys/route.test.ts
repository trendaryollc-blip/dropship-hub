import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSet = vi.fn().mockResolvedValue(undefined);
const mockGet = vi.fn().mockResolvedValue({ exists: false, data: () => ({}) });
const mockDocRef = { get: mockGet, set: mockSet, update: vi.fn().mockResolvedValue(undefined) };
const mockSettingsDoc = vi.fn().mockReturnValue(mockDocRef);
const mockSettingsCol = vi.fn().mockReturnValue({ doc: mockSettingsDoc });
const mockUserDoc = vi.fn().mockReturnValue({ collection: mockSettingsCol, get: mockGet });
const mockUsersCol = vi.fn().mockReturnValue({ doc: mockUserDoc });
const mockDb = { collection: mockUsersCol };

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, { uid: "test-user-123" });
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn().mockResolvedValue(mockDb),
}));

describe("/api/settings/api-keys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSet.mockResolvedValue(undefined);
    mockGet.mockResolvedValue({ exists: false, data: () => ({}) });
  });

  it("GET returns masked API keys", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/settings/api-keys");
    const response = await GET(request as any);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.keys).toBeDefined();
  });

  it("POST saves API key", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/settings/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "openai", key: "sk-test123" }),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it("POST returns 400 for missing provider", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/settings/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "sk-test123" }),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(400);
  });

  it("POST returns 400 for missing key", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/settings/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "openai" }),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(400);
  });

  it("DELETE removes API key", async () => {
    const { DELETE } = await import("./route");
    const request = new Request("http://localhost/api/settings/api-keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "openai" }),
    });
    const response = await DELETE(request as any);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it("DELETE returns 400 for missing provider", async () => {
    const { DELETE } = await import("./route");
    const request = new Request("http://localhost/api/settings/api-keys", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const response = await DELETE(request as any);
    expect(response.status).toBe(400);
  });
});
