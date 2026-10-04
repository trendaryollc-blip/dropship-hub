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

vi.mock("@/lib/data/srm", () => ({
  getSupplierMessages: vi.fn(),
  addSupplierMessage: vi.fn(),
  markMessageRead: vi.fn(),
  deleteSupplierMessage: vi.fn(),
}));

vi.mock("@/lib/cj-auth", () => ({
  getCJAccessToken: vi.fn(),
}));

vi.mock("@/lib/email/smart-sender", () => ({
  smartSendEmail: vi.fn(),
}));

import { GET, POST, PUT, DELETE } from "./route";
import {
  getSupplierMessages, addSupplierMessage, markMessageRead, deleteSupplierMessage,
} from "@/lib/data/srm";
import { smartSendEmail } from "@/lib/email/smart-sender";

function makeReq(body?: any, method = "POST", url = "http://localhost/api/srm/messages") {
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

describe("GET /api/srm/messages", () => {
  it("returns messages for user", async () => {
    (getSupplierMessages as any).mockResolvedValue([
      { id: "m1", subject: "Hello", body: "Test message" },
    ]);

    const res = await GET(makeReq(undefined, "GET"));
    const json = await res.json();
    expect(json.messages).toBeDefined();
    expect(json.messages.length).toBe(1);
  });

  it("filters by supplierId", async () => {
    (getSupplierMessages as any).mockResolvedValue([]);

    const url = "http://localhost/api/srm/messages?supplierId=s1";
    const res = await GET(makeReq(undefined, "GET", url));
    expect(getSupplierMessages).toHaveBeenCalledWith("test-user-123", "s1");
  });
});

describe("POST /api/srm/messages", () => {
  it("sends a message and saves it", async () => {
    (addSupplierMessage as any).mockResolvedValue("msg-new-1");

    const res = await POST(makeReq({
      supplierId: "s1",
      supplierName: "Acme",
      subject: "Question",
      body: "What is the lead time?",
    }));

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.id).toBe("msg-new-1");
    expect(json.status).toBe("logged");
  });

  it("returns 400 for missing fields", async () => {
    const res = await POST(makeReq({ supplierId: "s1" }));
    const json = await res.json();
    expect(json.error).toContain("Missing required fields");
  });

  it("delivers via email when supplierEmail is provided", async () => {
    (addSupplierMessage as any).mockResolvedValue("msg-new-2");
    (smartSendEmail as any).mockResolvedValue({ success: true, provider: "resend", messageId: "m1" });

    const res = await POST(makeReq({
      supplierId: "s1",
      supplierName: "Acme",
      subject: "Question",
      body: "What is the lead time?",
      supplierEmail: "supplier@example.com",
    }));

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.status).toBe("sent");
    expect(smartSendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "supplier@example.com" }));
  });

  it("marks failed when email delivery fails", async () => {
    (addSupplierMessage as any).mockResolvedValue("msg-new-3");
    (smartSendEmail as any).mockResolvedValue({ success: false, provider: "resend", error: "No email provider configured" });

    const res = await POST(makeReq({
      supplierId: "s1",
      supplierName: "Acme",
      subject: "Question",
      body: "Hello",
      supplierEmail: "supplier@example.com",
    }));

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.status).toBe("failed");
  });
});

describe("PUT /api/srm/messages", () => {
  it("marks a message as read", async () => {
    (markMessageRead as any).mockResolvedValue(undefined);

    const res = await PUT(makeReq({ action: "mark_read", messageId: "m1" }));
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 400 for invalid action", async () => {
    const res = await PUT(makeReq({ action: "invalid" }));
    const json = await res.json();
    expect(json.error).toBe("Invalid action");
  });
});

describe("DELETE /api/srm/messages", () => {
  it("deletes a message", async () => {
    (deleteSupplierMessage as any).mockResolvedValue(undefined);

    const url = "http://localhost/api/srm/messages?messageId=m1";
    const res = await DELETE(makeReq(undefined, "DELETE", url));
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 400 without messageId", async () => {
    const res = await DELETE(makeReq(undefined, "DELETE"));
    const json = await res.json();
    expect(json.error).toContain("messageId required");
  });
});
