import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { DEFAULT: { windowMs: 60000, maxRequests: 60 }, FULFILLMENT: { windowMs: 60000, maxRequests: 30 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn(),
}));

function buildMockDocs(data: any[]) {
  return data.map((d) => ({ id: d.id || "doc-1", data: () => d }));
}

function buildQueryChain(docs: any[]) {
  return {
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({ docs: buildMockDocs(docs), empty: docs.length === 0 }),
  };
}

import { POST, GET } from "./route";
import { getAdminDB } from "@/lib/firebase-admin";

function makeReq(body?: any, method = "POST", url = "http://localhost/api/monitoring/reprice") {
  return {
    json: vi.fn().mockResolvedValue(body ?? {}),
    url,
    method,
    nextUrl: new URL(url),
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/monitoring/reprice", () => {
  it("reprices products with repricing rules", async () => {
    const batchCommit = vi.fn();
    const makeDocRef = (id?: string) => {
      const ref: any = {
        id: id || "auto-doc",
        set: vi.fn(),
        get: vi.fn().mockResolvedValue({ exists: true, data: () => ({}) }),
      };
      ref.collection = vi.fn().mockImplementation((sub: string) => {
        if (sub === "priceHistory") {
          return {
            orderBy: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            get: vi.fn().mockResolvedValue({ docs: [], empty: true }),
            doc: vi.fn().mockReturnValue({ set: vi.fn() }),
          };
        }
        if (sub === "alerts") {
          return { doc: vi.fn().mockReturnValue({ set: vi.fn() }) };
        }
        return { doc: vi.fn().mockReturnValue(makeDocRef()) };
      });
      return ref;
    };

    const userDocRef = makeDocRef("user-1");
    userDocRef.collection = vi.fn().mockImplementation((sub: string) => {
      if (sub === "monitoredProducts") {
        return {
          where: vi.fn().mockReturnThis(),
          get: vi.fn().mockResolvedValue({
            docs: [{
              id: "prod-1",
              data: () => ({
                productTitle: "Widget",
                currentPrice: 10,
                repricingRule: { type: "maintain_margin", value: 30 },
                storeConnections: [],
              }),
            }],
          }),
          doc: vi.fn().mockReturnValue(makeDocRef("prod-1")),
        };
      }
      return { doc: vi.fn().mockReturnValue(makeDocRef()) };
    });

    const mockDb: any = {
      collection: vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue(userDocRef),
      }),
      batch: vi.fn().mockReturnValue({ set: vi.fn(), commit: batchCommit }),
    };
    (getAdminDB as any).mockResolvedValue(mockDb);

    const res = await POST(makeReq({}));
    const json = await res.json();
    expect(json.repriced).toBeDefined();
    expect(json.results).toBeDefined();
  });

  it("returns empty results when no products have repricing rules", async () => {
    const mockDb: any = {
      collection: vi.fn().mockImplementation((name: string) => {
        if (name === "users") {
          return {
            doc: vi.fn().mockReturnValue({
              collection: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnThis(),
                get: vi.fn().mockResolvedValue({ docs: [], empty: true }),
              }),
            }),
          };
        }
        return {};
      }),
      batch: vi.fn().mockReturnValue({ set: vi.fn(), commit: vi.fn() }),
    };
    (getAdminDB as any).mockResolvedValue(mockDb);

    const res = await POST(makeReq({}));
    const json = await res.json();
    expect(json.repriced).toBe(0);
    expect(json.results).toEqual([]);
  });
});

describe("GET /api/monitoring/reprice", () => {
  it("returns repricing rules and status", async () => {
    const mockDb: any = {
      collection: vi.fn().mockImplementation((name: string) => {
        if (name === "users") {
          return {
            doc: vi.fn().mockReturnValue({
              collection: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnThis(),
                get: vi.fn().mockResolvedValue({
                  docs: [{
                    id: "prod-1",
                    data: () => ({
                      productTitle: "Widget",
                      currentPrice: 10,
                      repricingRule: { type: "maintain_margin", value: 30 },
                      lastReprice: "2025-01-01",
                    }),
                  }],
                }),
              }),
            }),
          };
        }
        return {};
      }),
    };
    (getAdminDB as any).mockResolvedValue(mockDb);

    const res = await GET(makeReq(undefined, "GET"));
    const json = await res.json();
    expect(json.count).toBe(1);
    expect(json.products[0].rule).toEqual({ type: "maintain_margin", value: 30 });
  });
});
