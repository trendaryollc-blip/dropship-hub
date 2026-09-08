import { z } from "zod";
import { createTool } from "./registry";
import { searchSuppliers, getSuppliers } from "@/lib/supplier-service";
import {
  getSupplierPerformanceHistory,
  addSupplierPerformance,
  getSupplierAlerts,
  addSupplierAlert,
} from "@/lib/data/supplier-performance";
import {
  getSupplierScorecards,
  saveSupplierScorecard,
  getNegotiations,
  addNegotiation,
} from "@/lib/data/srm";

// ─── Search Suppliers ───────────────────────────────────────────────────────

export const searchSuppliersTool = createTool({
  id: "search_suppliers",
  name: "Search Suppliers",
  description: "Search for suppliers across platforms (CJ Dropshipping, AliExpress, etc.)",
  category: "supplier",
  safetyLevel: "safe",
  inputSchema: z.object({
    query: z.string().min(1).max(500),
  }),
  execute: async (input) => {
    const results = await searchSuppliers(input.query as string);
    return {
      success: true,
      data: results,
      summary: `Found ${results.length} suppliers for "${input.query}".`,
    };
  },
});

// ─── Get All Suppliers ──────────────────────────────────────────────────────

export const getSuppliersTool = createTool({
  id: "get_suppliers",
  name: "Get Suppliers",
  description: "Get all available suppliers with their profiles and ratings",
  category: "supplier",
  safetyLevel: "safe",
  inputSchema: z.object({}),
  execute: async () => {
    const suppliers = await getSuppliers();
    return {
      success: true,
      data: suppliers,
      summary: `Found ${suppliers.length} suppliers.`,
    };
  },
});

// ─── Get Supplier Performance ───────────────────────────────────────────────

export const getSupplierPerformanceTool = createTool({
  id: "get_supplier_performance",
  name: "Get Supplier Performance",
  description: "Get performance history for a specific supplier (reliability, refund rate, shipping speed)",
  category: "supplier",
  safetyLevel: "safe",
  inputSchema: z.object({
    supplierId: z.string().min(1),
  }),
  execute: async (input, ctx) => {
    const history = await getSupplierPerformanceHistory(ctx.uid, input.supplierId as string);
    return {
      success: true,
      data: history,
      summary: `Found ${history.length} performance records for supplier ${input.supplierId}.`,
    };
  },
});

// ─── Get Supplier Alerts ────────────────────────────────────────────────────

export const getSupplierAlertsTool = createTool({
  id: "get_supplier_alerts",
  name: "Get Supplier Alerts",
  description: "Get alerts related to supplier issues (low reliability, stock issues, etc.)",
  category: "supplier",
  safetyLevel: "safe",
  inputSchema: z.object({}),
  execute: async (input, ctx) => {
    const alerts = await getSupplierAlerts(ctx.uid);
    return {
      success: true,
      data: alerts,
      summary: `Found ${alerts.length} supplier alerts.`,
    };
  },
});

// ─── Get Supplier Scorecards ────────────────────────────────────────────────

export const getSupplierScorecardsTool = createTool({
  id: "get_supplier_scorecards",
  name: "Get Supplier Scorecards",
  description: "Get quality scorecards for all suppliers (speed, quality, communication, price, reliability)",
  category: "supplier",
  safetyLevel: "safe",
  inputSchema: z.object({}),
  execute: async (input, ctx) => {
    const scorecards = await getSupplierScorecards(ctx.uid);
    return {
      success: true,
      data: scorecards,
      summary: `Found ${scorecards.length} supplier scorecards.`,
    };
  },
});

// ─── Get Negotiations ───────────────────────────────────────────────────────

export const getNegotiationsTool = createTool({
  id: "get_negotiations",
  name: "Get Negotiations",
  description: "Get negotiation history with suppliers",
  category: "supplier",
  safetyLevel: "safe",
  inputSchema: z.object({
    supplierId: z.string().optional(),
  }),
  execute: async (input, ctx) => {
    const negotiations = await getNegotiations(ctx.uid, input.supplierId as string | undefined);
    return {
      success: true,
      data: negotiations,
      summary: `Found ${negotiations.length} negotiations.`,
    };
  },
});
