import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { AUTH: { windowMs: 900000, maxRequests: 10 } },
  rateLimitGlobal: vi.fn(async () => ({ allowed: true })),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

const mockAdd = vi.fn().mockResolvedValue({ id: "lead-1" });
let existingDocs: Array<{ id: string; data: () => Record<string, unknown> }> = [];
vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn(async () => ({
    collection: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: vi.fn(() => ({
          get: vi.fn(async () => ({ empty: existingDocs.length === 0, docs: existingDocs })),
        })),
      })),
      add: mockAdd,
    })),
  })),
}));

const mockSmartSend = vi.fn().mockResolvedValue({ success: true, provider: "resend" });
vi.mock("@/lib/email/smart-sender", () => ({
  smartSendEmail: (...args: unknown[]) => mockSmartSend(...args),
}));

import { POST } from "./route";

function makeReq(body: unknown) {
  return new Request("http://localhost/api/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as any;
}

describe("POST /api/subscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    existingDocs = [];
  });

  it("stores a new lead with normalized email", async () => {
    const res = await POST(makeReq({ email: "  Fan@Example.COM ", source: "landing-cta" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockAdd).toHaveBeenCalledTimes(1);
    expect(mockAdd.mock.calls[0][0]).toMatchObject({
      email: "fan@example.com",
      source: "landing-cta",
    });
  });

  it("ignores honeypot submissions without storing", async () => {
    const res = await POST(makeReq({ email: "bot@example.com", website: "http://spam.example" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("reports duplicate subscriptions without storing again", async () => {
    existingDocs = [{ id: "existing", data: () => ({ email: "fan@example.com" }) }];
    const res = await POST(makeReq({ email: "fan@example.com" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.alreadySubscribed).toBe(true);
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("rejects an invalid email", async () => {
    const res = await POST(makeReq({ email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect(mockAdd).not.toHaveBeenCalled();
  });
});
