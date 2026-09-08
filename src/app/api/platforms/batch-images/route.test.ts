import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("Batch Images API Route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("POST returns empty images when urls is empty array", async () => {
    const { POST } = await import("./route");
    const req = { json: async () => ({ urls: [] }) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.images).toEqual([]);
  });

  it("POST returns empty images when urls is not an array", async () => {
    const { POST } = await import("./route");
    const req = { json: async () => ({ urls: "not-array" }) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.images).toEqual([]);
  });

  it("POST limits to 20 URLs and fetches og images", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      headers: { get: () => "text/html" },
      body: {
        getReader: () => ({
          read: vi.fn()
            .mockResolvedValueOnce({ done: false, value: new TextEncoder().encode('<meta property="og:image" content="https://img.com/product.jpg">') })
            .mockResolvedValueOnce({ done: true, value: undefined }),
          cancel: vi.fn(),
        }),
      },
    });
    const { POST } = await import("./route");
    const urls = Array.from({ length: 25 }, (_, i) => `https://example.com/product/${i}`);
    const req = { json: async () => ({ urls }) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.images.length).toBeLessThanOrEqual(20);
  });

  it("POST returns null for failed URL fetches", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    const { POST } = await import("./route");
    const req = { json: async () => ({ urls: ["https://example.com/bad"] }) } as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.images).toEqual([null]);
  });
});
