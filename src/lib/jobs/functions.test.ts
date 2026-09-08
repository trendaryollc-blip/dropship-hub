import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./client", () => ({
  inngest: {
    createFunction: vi.fn((config, handler) => ({
      ...config,
      handler,
    })),
  },
}));

vi.mock("@/lib/monitoring/scheduler", () => ({
  runPriceCheckForUser: vi.fn().mockResolvedValue({ checked: 10, updated: 2 }),
  runPriceCheckForProduct: vi.fn().mockResolvedValue({ checked: 1, updated: 0 }),
}));

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn(),
  getAdminAuth: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  silentCatch: vi.fn(),
  createLogger: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

vi.mock("@/lib/ai/modes/auto-rules", () => ({
  evaluateAutoTriggers: vi.fn().mockResolvedValue({ triggered: ["rule-1"], errors: [] }),
}));

vi.mock("@/lib/fulfillment/orchestrator", () => ({
  orchestrateOrder: vi.fn().mockResolvedValue({ success: true }),
  createOrchestrationInput: vi.fn().mockReturnValue({
    uid: "user-1",
    order: {},
    source: "scheduled",
    suppliers: [],
    options: [],
    config: { autoApprove: { "*": true }, optimization: "balanced" },
  }),
}));

vi.mock("@/lib/email-digest", () => ({
  generateDigest: vi.fn().mockResolvedValue({ html: "<p>digest</p>" }),
}));

import {
  priceCheckJob,
  inventorySyncJob,
  orderProcessingJob,
  digestEmailJob,
  scheduledPriceCheckJob,
  scheduledInventorySyncJob,
  scheduledDigestJob,
  autoModeExecutionJob,
  autoOrderFulfillmentJob,
} from "./functions";
import { getAdminDB } from "@/lib/firebase-admin";
import { runPriceCheckForUser, runPriceCheckForProduct } from "@/lib/monitoring/scheduler";
import { evaluateAutoTriggers } from "@/lib/ai/modes/auto-rules";
import { orchestrateOrder, createOrchestrationInput } from "@/lib/fulfillment/orchestrator";

function createMockStep() {
  return {
    run: vi.fn(async (name: string, fn: () => Promise<any>) => fn()),
  };
}

function buildMockDb(overrides: Record<string, any> = {}) {
  const storeConnectionsDoc = {
    get: vi.fn().mockResolvedValue({ exists: true, data: () => ({ status: "connected" }), id: "store-1" }),
    collection: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          docs: [{ id: "store-1", data: () => ({ status: "connected" }) }],
          size: 1,
        }),
      }),
      get: vi.fn().mockResolvedValue({
        docs: [{ id: "store-1", data: () => ({ status: "connected" }) }],
        size: 1,
      }),
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ status: "connected" }),
          id: "store-1",
        }),
      }),
    }),
  };

  const monitoredProductsCollection = {
    get: vi.fn().mockResolvedValue({
      docs: [{ data: () => ({ storeConnections: [{ storeId: "store-1" }], price: 29.99 }) }],
    }),
  };

  const fulfillmentOrdersCollection = {
    doc: vi.fn().mockReturnValue(
      overrides.orderDoc || {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ status: "pending", items: [] }),
          ref: { update: vi.fn().mockResolvedValue(undefined) },
        }),
      }
    ),
    where: vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue(
          overrides.pendingOrders || { docs: [] }
        ),
      }),
    }),
  };

  if (overrides.orderDoc) {
    fulfillmentOrdersCollection.doc.mockReturnValue(overrides.orderDoc);
  }

  const settingsCollection = {
    doc: vi.fn().mockReturnValue({
      get: vi.fn().mockResolvedValue(
        overrides.settingsDoc || {
          exists: true,
          data: () => ({ digestEnabled: true }),
        }
      ),
    }),
  };

  const usersCollection = {
    doc: vi.fn().mockReturnValue({
      get: vi.fn().mockResolvedValue(
        overrides.userDoc || {
          exists: true,
          data: () => ({ email: "test@example.com", status: "active" }),
        }
      ),
      collection: vi.fn((name: string) => {
        if (name === "storeConnections") return storeConnectionsDoc.collection("storeConnections");
        if (name === "monitoredProducts") return monitoredProductsCollection;
        if (name === "fulfillmentOrders") return fulfillmentOrdersCollection;
        if (name === "settings") return settingsCollection;
        return { get: vi.fn().mockResolvedValue({ docs: [], size: 0 }) };
      }),
      ref: {
        collection: vi.fn().mockReturnValue(settingsCollection),
      },
    }),
    get: vi.fn().mockResolvedValue(
      overrides.usersList || {
        docs: [{ id: "user-1", data: () => ({}), ref: { collection: vi.fn().mockReturnValue(settingsCollection) } }],
      }
    ),
    where: vi.fn().mockReturnValue({
      get: vi.fn().mockResolvedValue({
        docs: [{ id: "user-1", data: () => ({}) }],
      }),
    }),
  };

  const db = {
    collection: vi.fn().mockReturnValue(usersCollection),
    ...overrides.db,
  };

  return db;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("priceCheckJob", () => {
  it("calls runPriceCheckForUser when no productId", async () => {
    const step = createMockStep();
    const result = await priceCheckJob.handler({
      event: { data: { uid: "user-1" } } as any,
      step: step as any,
    });

    expect(runPriceCheckForUser).toHaveBeenCalledWith("user-1");
    expect(result).toEqual({ checked: 10, updated: 2 });
  });

  it("calls runPriceCheckForProduct when productId provided", async () => {
    const step = createMockStep();
    const result = await priceCheckJob.handler({
      event: { data: { uid: "user-1", productId: "prod-42" } } as any,
      step: step as any,
    });

    expect(runPriceCheckForProduct).toHaveBeenCalledWith("user-1", "prod-42");
    expect(result).toEqual({ checked: 1, updated: 0 });
  });
});

describe("inventorySyncJob", () => {
  it("returns synced count", async () => {
    const mockDb = buildMockDb();
    (getAdminDB as any).mockResolvedValue(mockDb);

    const step = createMockStep();
    const result = await inventorySyncJob.handler({
      event: { data: { uid: "user-1" } } as any,
      step: step as any,
    });

    expect(result).toEqual({ synced: 1, errors: 0, storeCount: 1 });
  });
});

describe("orderProcessingJob", () => {
  it("processes pending order", async () => {
    const mockUpdate = vi.fn().mockResolvedValue(undefined);
    const mockDb = buildMockDb({
      orderDoc: {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ status: "pending", items: [] }),
          ref: { update: mockUpdate },
        }),
      },
    });
    (getAdminDB as any).mockResolvedValue(mockDb);

    const step = createMockStep();
    const result = await orderProcessingJob.handler({
      event: { data: { uid: "user-1", orderId: "order-1" } } as any,
      step: step as any,
    });

    expect(result).toEqual({ success: true, orderId: "order-1" });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "processing" })
    );
  });

  it("skips non-pending order", async () => {
    const mockDb = buildMockDb({
      orderDoc: {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ status: "shipped" }),
          ref: { update: vi.fn() },
        }),
      },
    });
    (getAdminDB as any).mockResolvedValue(mockDb);

    const step = createMockStep();
    const result = await orderProcessingJob.handler({
      event: { data: { uid: "user-1", orderId: "order-2" } } as any,
      step: step as any,
    });

    expect(result).toEqual({ success: true, skipped: true, reason: "Order already shipped" });
  });

  it("returns error when order not found", async () => {
    const mockDb = buildMockDb({
      orderDoc: {
        get: vi.fn().mockResolvedValue({
          exists: false,
          data: () => null,
          ref: { update: vi.fn() },
        }),
      },
    });
    (getAdminDB as any).mockResolvedValue(mockDb);

    const step = createMockStep();
    const result = await orderProcessingJob.handler({
      event: { data: { uid: "user-1", orderId: "order-999" } } as any,
      step: step as any,
    });

    expect(result).toEqual({ success: false, error: "Order not found" });
  });
});

describe("scheduledPriceCheckJob", () => {
  it("iterates over all users", async () => {
    const mockDb = buildMockDb({
      usersList: {
        docs: [
          { id: "user-1", data: () => ({}), ref: { collection: vi.fn().mockReturnValue({ doc: vi.fn().mockReturnValue({ get: vi.fn().mockResolvedValue({ exists: true, data: () => ({ digestEnabled: true }) }) }) }) } },
          { id: "user-2", data: () => ({}), ref: { collection: vi.fn().mockReturnValue({ doc: vi.fn().mockReturnValue({ get: vi.fn().mockResolvedValue({ exists: true, data: () => ({ digestEnabled: true }) }) }) }) } },
        ],
      },
    });
    (getAdminDB as any).mockResolvedValue(mockDb);

    const step = createMockStep();
    const result = await scheduledPriceCheckJob.handler({
      event: {} as any,
      step: step as any,
    });

    expect(runPriceCheckForUser).toHaveBeenCalledTimes(2);
    expect(runPriceCheckForUser).toHaveBeenCalledWith("user-1");
    expect(runPriceCheckForUser).toHaveBeenCalledWith("user-2");
    expect(result).toEqual({ usersChecked: 2 });
  });
});

describe("scheduledInventorySyncJob", () => {
  it("iterates over all users", async () => {
    const mockDb = buildMockDb();
    (getAdminDB as any).mockResolvedValue(mockDb);

    const step = createMockStep();
    const result = await scheduledInventorySyncJob.handler({
      event: {} as any,
      step: step as any,
    });

    expect(result).toEqual({ usersSynced: 1 });
  });
});

describe("scheduledDigestJob", () => {
  it("filters users with digest enabled", async () => {
    const mockDb = buildMockDb({
      settingsDoc: {
        exists: true,
        data: () => ({ digestEnabled: true }),
      },
    });
    (getAdminDB as any).mockResolvedValue(mockDb);

    const step = createMockStep();
    const result = await scheduledDigestJob.handler({
      event: {} as any,
      step: step as any,
    });

    expect(result).toEqual({ usersToDigest: 1 });
  });
});

describe("autoModeExecutionJob", () => {
  it("processes single user from event data", async () => {
    (evaluateAutoTriggers as any).mockResolvedValue({
      triggered: ["rule-a", "rule-b"],
      errors: [],
    });

    const step = createMockStep();
    const result = await autoModeExecutionJob.handler({
      event: { data: { uid: "user-1" } } as any,
      step: step as any,
    });

    expect(evaluateAutoTriggers).toHaveBeenCalledWith("user-1");
    expect(result).toEqual({
      usersProcessed: 1,
      totalTriggered: 2,
      totalErrors: 0,
    });
  });
});

describe("autoOrderFulfillmentJob", () => {
  it("processes pending orders", async () => {
    const mockOrderDoc = {
      data: () => ({ orderId: "order-1", status: "pending" }),
    };

    const mockDb = buildMockDb({
      pendingOrders: {
        docs: [mockOrderDoc],
      },
    });
    (getAdminDB as any).mockResolvedValue(mockDb);
    (createOrchestrationInput as any).mockReturnValue({
      uid: "user-1",
      order: mockOrderDoc.data(),
      source: "scheduled",
      suppliers: [],
      options: [],
      config: { autoApprove: { "*": true }, optimization: "balanced" },
    });
    (orchestrateOrder as any).mockResolvedValue({ success: true });

    const step = createMockStep();
    const result = await autoOrderFulfillmentJob.handler({
      event: { data: { uid: "user-1" } } as any,
      step: step as any,
    });

    expect(orchestrateOrder).toHaveBeenCalled();
    expect(result).toEqual({
      usersProcessed: 1,
      totalProcessed: 1,
      totalFailed: 0,
    });
  });
});
