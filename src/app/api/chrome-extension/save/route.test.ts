import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => handler(req, "test-user-123")),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

const mockAdd = vi.fn().mockResolvedValue({ id: "new-id" });
const mockDoc = vi.fn().mockReturnValue({
  collection: vi.fn().mockReturnValue({
    add: mockAdd,
  }),
});
const mockCollection = vi.fn().mockReturnValue({ doc: mockDoc });

vi.doMock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn().mockResolvedValue({ collection: mockCollection }),
}));

function makeReq(url: string, init?: RequestInit) {
  const req = new Request(url, init);
  (req as any).nextUrl = new URL(url);
  return req;
}

describe("/api/chrome-extension/save", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns 400 when title is missing", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue({ collection: mockCollection }),
    }));

    const { POST } = await import("./route");
    const response = await POST(makeReq("http://localhost/api/chrome-extension/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: "https://example.com/product" }),
    }) as any);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("Title and URL are required");
  });

  it("returns 400 when url is missing", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue({ collection: mockCollection }),
    }));

    const { POST } = await import("./route");
    const response = await POST(makeReq("http://localhost/api/chrome-extension/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Test Product" }),
    }) as any);

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe("Title and URL are required");
  });

  it("saves product and returns success with id", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue({ collection: mockCollection }),
    }));

    const { POST } = await import("./route");
    const response = await POST(makeReq("http://localhost/api/chrome-extension/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Widget", url: "https://example.com/widget", price: 29.99, image: "img.png", source: "chrome" }),
    }) as any);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.id).toBe("new-id");
    expect(mockAdd).toHaveBeenCalledWith(expect.objectContaining({
      title: "Widget",
      url: "https://example.com/widget",
      price: 29.99,
      image: "img.png",
      source: "chrome",
    }));
  });
});
