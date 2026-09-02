import { describe, it, expect } from "vitest";

describe("data barrel re-exports", () => {
  it("re-exports user-settings", async () => {
    const mod = await import("./data");
    expect(typeof mod.getUserSettings).toBe("function");
    expect(typeof mod.updateUserSettings).toBe("function");
  });

  it("re-exports favorites", async () => {
    const mod = await import("./data");
    expect(typeof mod.addFavorite).toBe("function");
    expect(typeof mod.removeFavorite).toBe("function");
    expect(typeof mod.getFavorites).toBe("function");
    expect(typeof mod.isFavorited).toBe("function");
  });

  it("re-exports calc-history", async () => {
    const mod = await import("./data");
    expect(typeof mod.saveCalcHistory).toBe("function");
    expect(typeof mod.getCalcHistory).toBe("function");
  });

  it("re-exports chat-history", async () => {
    const mod = await import("./data");
    expect(typeof mod.saveChatMessage).toBe("function");
    expect(typeof mod.getChatHistory).toBe("function");
  });

  it("re-exports product-notes", async () => {
    const mod = await import("./data");
    expect(typeof mod.saveProductNote).toBe("function");
    expect(typeof mod.getProductNote).toBe("function");
  });

  it("re-exports revenue", async () => {
    const mod = await import("./data");
    expect(typeof mod.addRevenueEntry).toBe("function");
    expect(typeof mod.getRevenueEntries).toBe("function");
    expect(typeof mod.deleteRevenueEntry).toBe("function");
  });

  it("re-exports alerts", async () => {
    const mod = await import("./data");
    expect(typeof mod.addAlert).toBe("function");
    expect(typeof mod.getAlerts).toBe("function");
    expect(typeof mod.markAlertRead).toBe("function");
    expect(typeof mod.markAllAlertsRead).toBe("function");
  });

  it("re-exports missions", async () => {
    const mod = await import("./data");
    expect(typeof mod.addMission).toBe("function");
    expect(typeof mod.getMissions).toBe("function");
    expect(typeof mod.toggleMission).toBe("function");
  });

  it("re-exports watchlist", async () => {
    const mod = await import("./data");
    expect(typeof mod.addToWatchlist).toBe("function");
    expect(typeof mod.removeFromWatchlist).toBe("function");
    expect(typeof mod.getWatchlist).toBe("function");
  });

  it("re-exports search-history", async () => {
    const mod = await import("./data");
    expect(typeof mod.addSearchHistory).toBe("function");
    expect(typeof mod.getSearchHistory).toBe("function");
    expect(typeof mod.clearSearchHistory).toBe("function");
    expect(typeof mod.addCompetitorSearch).toBe("function");
    expect(typeof mod.getCompetitorSearches).toBe("function");
  });

  it("re-exports enrichment-cache", async () => {
    const mod = await import("./data");
    expect(typeof mod.cacheEnrichment).toBe("function");
    expect(typeof mod.getEnrichmentCache).toBe("function");
  });

  it("re-exports digest", async () => {
    const mod = await import("./data");
    expect(typeof mod.saveDigest).toBe("function");
    expect(typeof mod.getDigests).toBe("function");
    expect(typeof mod.deleteDigest).toBe("function");
  });

  it("re-exports profit", async () => {
    const mod = await import("./data");
    expect(typeof mod.addCostProfile).toBe("function");
    expect(typeof mod.getCostProfiles).toBe("function");
    expect(typeof mod.deleteCostProfile).toBe("function");
    expect(typeof mod.addProfitEntry).toBe("function");
    expect(typeof mod.getProfitEntries).toBe("function");
  });

  it("re-exports supplier-performance", async () => {
    const mod = await import("./data");
    expect(typeof mod.addSupplierPerformance).toBe("function");
    expect(typeof mod.getSupplierPerformanceHistory).toBe("function");
    expect(typeof mod.addSupplierAlert).toBe("function");
    expect(typeof mod.getSupplierAlerts).toBe("function");
  });

  it("re-exports product-lifecycle", async () => {
    const mod = await import("./data");
    expect(typeof mod.addProductLifecycle).toBe("function");
    expect(typeof mod.getProductLifecycles).toBe("function");
    expect(typeof mod.addLifecycleSnapshot).toBe("function");
    expect(typeof mod.getLifecycleSnapshots).toBe("function");
    expect(typeof mod.addLifecycleAlert).toBe("function");
    expect(typeof mod.getLifecycleAlerts).toBe("function");
  });

  it("re-exports customer-service", async () => {
    const mod = await import("./data");
    expect(typeof mod.addCSConversation).toBe("function");
    expect(typeof mod.getCSConversations).toBe("function");
    expect(typeof mod.addCSMessage).toBe("function");
    expect(typeof mod.getCSMessages).toBe("function");
    expect(typeof mod.addCSTemplate).toBe("function");
    expect(typeof mod.getCSTemplates).toBe("function");
    expect(typeof mod.deleteCSTemplate).toBe("function");
  });

  it("re-exports order-routing", async () => {
    const mod = await import("./data");
    expect(typeof mod.addRoutingDecision).toBe("function");
    expect(typeof mod.getRoutingDecisions).toBe("function");
    expect(typeof mod.saveRoutingPreferences).toBe("function");
    expect(typeof mod.getRoutingPreferences).toBe("function");
  });

  it("re-exports store-connections", async () => {
    const mod = await import("./data");
    expect(typeof mod.addStoreConnection).toBe("function");
    expect(typeof mod.getStoreConnections).toBe("function");
    expect(typeof mod.deleteStoreConnection).toBe("function");
    expect(typeof mod.updateStoreConnection).toBe("function");
  });

  it("re-exports pushed-products", async () => {
    const mod = await import("./data");
    expect(typeof mod.addPushedProduct).toBe("function");
    expect(typeof mod.getPushedProducts).toBe("function");
    expect(typeof mod.deletePushedProduct).toBe("function");
  });
});
