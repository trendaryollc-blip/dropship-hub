import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => handler(req, "test-user-123")),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const mockGetInvoices = vi.fn();
vi.mock("@/lib/billing/stripe", () => ({
  getInvoices: (...args: any[]) => mockGetInvoices(...args),
}));

function makeReq(url: string) {
  const req = new Request(url);
  (req as any).nextUrl = new URL(url);
  return req;
}

describe("/api/billing/invoices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("GET returns invoices array", async () => {
    const fakeInvoices = [
      { id: "inv_1", amount: 2000, status: "paid" },
      { id: "inv_2", amount: 3500, status: "open" },
    ];
    mockGetInvoices.mockResolvedValue(fakeInvoices);

    const { GET } = await import("./route");
    const response = await GET(makeReq("http://localhost/api/billing/invoices") as any);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.invoices).toEqual(fakeInvoices);
    expect(mockGetInvoices).toHaveBeenCalledWith("test-user-123", 50);
  });

  it("GET respects limit search param", async () => {
    mockGetInvoices.mockResolvedValue([]);

    const { GET } = await import("./route");
    const response = await GET(makeReq("http://localhost/api/billing/invoices?limit=10") as any);

    expect(response.status).toBe(200);
    expect(mockGetInvoices).toHaveBeenCalledWith("test-user-123", 10);
  });

  it("GET returns 500 on error", async () => {
    mockGetInvoices.mockRejectedValue(new Error("Stripe error"));

    const { GET } = await import("./route");
    const response = await GET(makeReq("http://localhost/api/billing/invoices") as any);

    expect(response.status).toBe(500);
  });
});
