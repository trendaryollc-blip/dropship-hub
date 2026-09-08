import { ToolRegistry } from "./registry";

// ─── Financial Tools ────────────────────────────────────────────────────────
import {
  calculateProfitTool,
  calculateShippingTool,
  calculateLandedCostTool,
  calculateMarginTool,
  calculateAdROITool,
  calculateOrderProfitTool,
  calculateAggregatedProfitTool,
} from "./financial";

// ─── Pricing Tools ──────────────────────────────────────────────────────────
import {
  optimizePricingTool,
  evaluatePriceRuleTool,
  calculateFloorPriceTool,
} from "./pricing";

// ─── Listing Tools ──────────────────────────────────────────────────────────
import {
  generateListingTool,
  validateListingTool,
} from "./listings";

// ─── Product Tools ──────────────────────────────────────────────────────────
import {
  searchProductsTool,
  saveProductTool,
  removeProductTool,
  getSavedProductsTool,
  checkSavedTool,
  getProductLifecycleTool,
  getSearchHistoryTool,
  getProductValidationsTool,
} from "./products";

// ─── Supplier Tools ─────────────────────────────────────────────────────────
import {
  searchSuppliersTool,
  getSuppliersTool,
  getSupplierPerformanceTool,
  getSupplierAlertsTool,
  getSupplierScorecardsTool,
  getNegotiationsTool,
} from "./suppliers";

// ─── Data Tools (Orders, Revenue, Alerts, Store, etc.) ──────────────────────
import {
  getOrdersTool,
  getRevenueDataTool,
  getProfitEntriesTool,
  getAlertsTool,
  markAlertReadTool,
  markAllAlertsReadTool,
  getDailyDigestTool,
  getMissionsTool,
  completeMissionTool,
  getWatchlistTool,
  addToWatchlistTool,
  getStoreConnectionsTool,
  getPushedProductsTool,
  getPriceRulesTool,
  getPriceWarStatsTool,
  getReturnRequestsTool,
  getTrendDashboardTool,
  getAdCampaignsTool,
} from "./data-tools";

// ─── Order & Fulfillment Tools (Phase 4) ────────────────────────────────────
import {
  routeOrderTool,
  bulkRouteOrdersTool,
  placeOrderTool,
  bulkPlaceOrdersTool,
  getTrackingTool,
  syncTrackingTool,
  getFulfillmentStatusTool,
  optimizeFulfillmentTool,
  processReturnsTool,
  getSupplierInventoryTool,
} from "./orders-fulfillment";

// ─── Store Management Tools (Phase 4) ───────────────────────────────────────
import {
  pushToStoreTool,
  pushBulkToStoreTool,
  syncInventoryTool,
  getStoreProductsTool,
  updateStoreProductTool,
  removeStoreProductTool,
  getStorePerformanceTool,
} from "./store-management";

// ─── Shipping Tools (Phase 4) ───────────────────────────────────────────────
import {
  compareShippingRatesTool,
  predictDeliveryTool,
  autoSelectShippingTool,
  calculateCustomsTool,
  getShippingOptionsTool,
} from "./shipping";

// ─── Register All Tools ─────────────────────────────────────────────────────

export function registerAllTools(): void {
  ToolRegistry.registerMany([
    // Financial (7)
    calculateProfitTool,
    calculateShippingTool,
    calculateLandedCostTool,
    calculateMarginTool,
    calculateAdROITool,
    calculateOrderProfitTool,
    calculateAggregatedProfitTool,

    // Pricing (3)
    optimizePricingTool,
    evaluatePriceRuleTool,
    calculateFloorPriceTool,

    // Listings (2)
    generateListingTool,
    validateListingTool,

    // Products (8)
    searchProductsTool,
    saveProductTool,
    removeProductTool,
    getSavedProductsTool,
    checkSavedTool,
    getProductLifecycleTool,
    getSearchHistoryTool,
    getProductValidationsTool,

    // Suppliers (6)
    searchSuppliersTool,
    getSuppliersTool,
    getSupplierPerformanceTool,
    getSupplierAlertsTool,
    getSupplierScorecardsTool,
    getNegotiationsTool,

    // Orders & Revenue (3)
    getOrdersTool,
    getRevenueDataTool,
    getProfitEntriesTool,

    // Alerts & Monitoring (5)
    getAlertsTool,
    markAlertReadTool,
    markAllAlertsReadTool,
    getWatchlistTool,
    addToWatchlistTool,

    // Intelligence (4)
    getDailyDigestTool,
    getMissionsTool,
    completeMissionTool,
    getTrendDashboardTool,

    // Store (2)
    getStoreConnectionsTool,
    getPushedProductsTool,

    // Price War (2)
    getPriceRulesTool,
    getPriceWarStatsTool,

    // Other (3)
    getReturnRequestsTool,
    getAdCampaignsTool,

    // Order & Fulfillment (10) - Phase 4
    routeOrderTool,
    bulkRouteOrdersTool,
    placeOrderTool,
    bulkPlaceOrdersTool,
    getTrackingTool,
    syncTrackingTool,
    getFulfillmentStatusTool,
    optimizeFulfillmentTool,
    processReturnsTool,
    getSupplierInventoryTool,

    // Store Management (7) - Phase 4
    pushToStoreTool,
    pushBulkToStoreTool,
    syncInventoryTool,
    getStoreProductsTool,
    updateStoreProductTool,
    removeStoreProductTool,
    getStorePerformanceTool,

    // Shipping (5) - Phase 4
    compareShippingRatesTool,
    predictDeliveryTool,
    autoSelectShippingTool,
    calculateCustomsTool,
    getShippingOptionsTool,
  ]);
}

// Auto-register on import
registerAllTools();

export { ToolRegistry } from "./registry";
