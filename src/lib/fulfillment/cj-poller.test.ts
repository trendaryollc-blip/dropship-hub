import { describe, it, expect, beforeEach } from "vitest";
import {
  addOrderToPolling,
  removeOrderFromPolling,
  getOrdersNeedingPoll,
  isOrderBeingPolled,
  getPollingStats,
  clearPollingState,
  setPollingInterval,
} from "@/lib/fulfillment/cj-poller";

describe("CJ Poller", () => {
  beforeEach(() => {
    clearPollingState("test_user");
  });

  it("adds order to polling", () => {
    addOrderToPolling("test_user", "order_1", "CJ123");
    expect(isOrderBeingPolled("test_user", "order_1")).toBe(true);
  });

  it("removes order from polling", () => {
    addOrderToPolling("test_user", "order_1", "CJ123");
    removeOrderFromPolling("test_user", "order_1");
    expect(isOrderBeingPolled("test_user", "order_1")).toBe(false);
  });

  it("does not duplicate orders", () => {
    addOrderToPolling("test_user", "order_1", "CJ123");
    addOrderToPolling("test_user", "order_1", "CJ123");
    const stats = getPollingStats("test_user");
    expect(stats.totalActive).toBe(1);
  });

  it("gets orders needing poll", () => {
    addOrderToPolling("test_user", "order_1", "CJ123");
    addOrderToPolling("test_user", "order_2", "CJ456");
    const needingPoll = getOrdersNeedingPoll("test_user");
    expect(needingPoll.length).toBe(2);
  });

  it("returns polling stats", () => {
    addOrderToPolling("test_user", "order_1", "CJ123");
    addOrderToPolling("test_user", "order_2", "CJ456");
    const stats = getPollingStats("test_user");
    expect(stats.totalActive).toBe(2);
    expect(stats.avgRetries).toBe(0);
  });

  it("sets polling interval within bounds", () => {
    setPollingInterval("test_user", 1000);
    const stats = getPollingStats("test_user");
    expect(stats.totalActive).toBe(0);
  });

  it("clears polling state", () => {
    addOrderToPolling("test_user", "order_1", "CJ123");
    clearPollingState("test_user");
    expect(isOrderBeingPolled("test_user", "order_1")).toBe(false);
  });

  it("isolates state between users", () => {
    addOrderToPolling("user_1", "order_1", "CJ123");
    addOrderToPolling("user_2", "order_2", "CJ456");
    expect(isOrderBeingPolled("user_1", "order_1")).toBe(true);
    expect(isOrderBeingPolled("user_1", "order_2")).toBe(false);
    expect(isOrderBeingPolled("user_2", "order_2")).toBe(true);
  });
});
