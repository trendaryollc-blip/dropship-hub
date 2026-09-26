import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse } from "next/server";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

vi.mock("@/lib/validation", () => ({
  validateBody: vi.fn((schema: any, body: any) => ({ success: true, data: body })),
  CSTemplateInputSchema: {},
}));

const setMock = vi.fn();
const deleteMock = vi.fn();
const docRef = { id: "tpl-created-1", set: setMock };
const docFn = vi.fn((id?: string) => (id ? { delete: deleteMock } : docRef));
const nestedCollection = vi.fn(() => ({ doc: docFn }));
const topDoc = vi.fn(() => ({ collection: nestedCollection }));
const collectionMock = vi.fn(() => ({ doc: topDoc }));

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn(async () => ({ collection: collectionMock })),
}));

describe("POST/DELETE /api/customer-service/templates", () => {
  beforeEach(() => vi.clearAllMocks());

  it("POST creates a template with honest defaults", async () => {
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/customer-service/templates", {
      method: "POST",
      body: JSON.stringify({
        name: "Order tracking reply",
        category: "order-status",
        body: "Here is your tracking link: {{trackingUrl}}",
      }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.id).toBe("tpl-created-1");
    expect(setMock).toHaveBeenCalledTimes(1);
    const stored = setMock.mock.calls[0][0];
    expect(stored).toMatchObject({
      name: "Order tracking reply",
      category: "order-status",
      subject: "Order tracking reply",
      variables: [],
      usageCount: 0,
    });
  });

  it("POST persists provided subject and variables", async () => {
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/customer-service/templates", {
      method: "POST",
      body: JSON.stringify({
        name: "Refund policy",
        category: "returns",
        subject: "About your refund",
        body: "We refund within 30 days.",
        variables: ["orderId"],
      }),
    });
    await POST(req as any);
    const stored = setMock.mock.calls[0][0];
    expect(stored.subject).toBe("About your refund");
    expect(stored.variables).toEqual(["orderId"]);
  });

  it("DELETE removes a template by id", async () => {
    const { DELETE } = await import("./route");
    const req = new Request("http://localhost/api/customer-service/templates?id=tpl-9", {
      method: "DELETE",
    });
    const res = await DELETE(req as any);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(deleteMock).toHaveBeenCalledTimes(1);
  });

  it("DELETE without id returns 400", async () => {
    const { DELETE } = await import("./route");
    const req = new Request("http://localhost/api/customer-service/templates", {
      method: "DELETE",
    });
    const res = await DELETE(req as any);

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Missing template ID");
  });

  it("POST returns validation error response when schema rejects", async () => {
    const { validateBody } = await import("@/lib/validation");
    vi.mocked(validateBody).mockReturnValueOnce({
      success: false,
      response: NextResponse.json({ error: "Invalid input" }, { status: 400 }),
    } as any);
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/customer-service/templates", {
      method: "POST",
      body: JSON.stringify({ name: "" }),
    });
    const res = await POST(req as any);

    expect(res.status).toBe(400);
    expect(setMock).not.toHaveBeenCalled();
  });
});
