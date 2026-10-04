import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

const mockAdd = vi.fn();
const mockUpdate = vi.fn();
const mockGet = vi.fn();

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn(async () => ({
    collection: vi.fn((name: string) => {
      if (name === "suppliers") {
        return { doc: vi.fn(() => ({ get: mockGet })) };
      }
      return {
        add: mockAdd,
        doc: vi.fn(() => ({ update: mockUpdate })),
      };
    }),
  })),
}));

vi.mock("@/lib/email/smart-sender", () => ({
  smartSendEmail: vi.fn(),
}));

import { POST } from "./route";
import { smartSendEmail } from "@/lib/email/smart-sender";

function makeReq(body?: any) {
  return {
    json: vi.fn().mockResolvedValue(body ?? {}),
    url: "http://localhost/api/suppliers/contact",
    method: "POST",
    nextUrl: new URL("http://localhost/api/suppliers/contact"),
  } as any;
}

const base = {
  supplierId: "s1",
  supplierName: "Acme",
  name: "John",
  email: "john@example.com",
  subject: "Sourcing",
  message: "Hello",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockAdd.mockResolvedValue({ id: "inq-1", update: mockUpdate });
  mockGet.mockResolvedValue({ data: () => ({}) });
});

describe("POST /api/suppliers/contact", () => {
  it("logs the inquiry when no supplier email exists", async () => {
    const res = await POST(makeReq(base));
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.delivery).toBe("logged");
    expect(smartSendEmail).not.toHaveBeenCalled();
  });

  it("sends the inquiry when a contact email is provided", async () => {
    (smartSendEmail as any).mockResolvedValue({ success: true, provider: "resend", messageId: "e1" });

    const res = await POST(makeReq({ ...base, contactEmail: "supplier@example.com" }));
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.delivery).toBe("sent");
    expect(smartSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "supplier@example.com", replyTo: "john@example.com" })
    );
  });

  it("reports failed when email delivery fails", async () => {
    (smartSendEmail as any).mockResolvedValue({ success: false, provider: "resend", error: "boom" });

    const res = await POST(makeReq({ ...base, contactEmail: "supplier@example.com" }));
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.delivery).toBe("failed");
  });

  it("returns 400 for missing fields", async () => {
    const res = await POST(makeReq({ supplierId: "s1" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid email", async () => {
    const res = await POST(makeReq({ ...base, email: "not-an-email" }));
    expect(res.status).toBe(400);
  });
});
