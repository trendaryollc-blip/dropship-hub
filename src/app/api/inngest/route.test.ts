import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("inngest/next", () => ({
  serve: vi.fn(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn() })),
}));

vi.mock("@/lib/jobs/client", () => ({ inngest: {} }));

vi.mock("@/lib/jobs/functions", () => ({
  priceCheckJob: {},
  inventorySyncJob: {},
  orderProcessingJob: {},
  digestEmailJob: {},
  scheduledPriceCheckJob: {},
  scheduledInventorySyncJob: {},
  scheduledDigestJob: {},
  autoModeExecutionJob: {},
  autoOrderFulfillmentJob: {},
  supplierDueDiligenceJob: {},
}));

describe("/api/inngest", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("exports GET as a function", async () => {
    const { GET } = await import("./route");
    expect(typeof GET).toBe("function");
  });

  it("exports POST as a function", async () => {
    const { POST } = await import("./route");
    expect(typeof POST).toBe("function");
  });

  it("exports PUT as a function", async () => {
    const { PUT } = await import("./route");
    expect(typeof PUT).toBe("function");
  });
});
