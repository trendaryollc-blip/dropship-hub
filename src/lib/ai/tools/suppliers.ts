import { z } from "zod";
import { createTool } from "./registry";
import { searchSuppliers, getSuppliers } from "@/lib/supplier-service";
import {
  searchSupplierPlatforms,
  buildSupplierProfiles,
  getSupplierPlatformStatuses,
} from "@/lib/supplier-platform-search";
import { parseSupplierQuery, scoreSupplierMatch } from "@/lib/search/supplier-query";
import { safeErrorMessage } from "@/lib/api-errors";
import { enforceSearchDailyLimit } from "@/lib/ai/tool-rate-limit";
import type { SupplierProfile } from "@/types/supplier";
import {
  getSupplierPerformanceHistory,
  getSupplierAlerts,
} from "@/lib/data/supplier-performance";
import {
  getSupplierScorecards,
  getNegotiations,
} from "@/lib/data/srm";

// ─── Search Suppliers ───────────────────────────────────────────────────────

const MAX_TOOL_SUPPLIERS = 40;

export const searchSuppliersTool = createTool({
  id: "search_suppliers",
  name: "Search Suppliers",
  description:
    "Search the supplier directory and live supplier platforms (Alibaba, DHgate, Global Sources, AliExpress, CJ Dropshipping) for suppliers matching a query",
  category: "supplier",
  safetyLevel: "safe",
  inputSchema: z.object({
    query: z.string().min(1).max(500),
  }),
  execute: async (input, ctx) => {
    const query = input.query as string;
    const issues: string[] = [];
    const notes: string[] = [];
    let discovered: SupplierProfile[] = [];
    let configured: string[] = [];

    try {
      const statuses = await getSupplierPlatformStatuses();
      configured = statuses.filter((s) => s.configured).map((s) => s.id);
      if (configured.length > 0) {
        const budget = await enforceSearchDailyLimit(ctx.uid);
        if (budget.allowed) {
          const outcome = await searchSupplierPlatforms(query, configured);
          discovered = buildSupplierProfiles(outcome.sources, query);
          for (const platformError of outcome.errors) {
            issues.push(`${platformError.name}: ${platformError.error}`);
          }
        } else {
          notes.push(`platform search skipped (${budget.error})`);
        }
      } else {
        notes.push("platform search skipped (no supplier platform keys configured)");
      }
    } catch (error) {
      issues.push(`platform search failed: ${safeErrorMessage(error, "platform search failed")}`);
    }

    let local: SupplierProfile[] = [];
    try {
      local = await searchSuppliers(query);
    } catch (error) {
      issues.push(`supplier directory search failed: ${safeErrorMessage(error, "search failed")}`);
    }

    const seen = new Set(discovered.map((d) => d.id));
    const merged = [...discovered, ...local.filter((l) => !seen.has(l.id))];
    const tokens = parseSupplierQuery(query);
    const ranked = merged
      .map((supplier) => ({ supplier, score: scoreSupplierMatch(supplier, tokens) }))
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.supplier)
      .slice(0, MAX_TOOL_SUPPLIERS);

    const summaryParts = [`Found ${ranked.length} suppliers for "${query}"`];
    if (discovered.length > 0) {
      summaryParts.push(`${discovered.length} discovered live from ${configured.length} platform(s)`);
    }
    summaryParts.push(...notes);
    if (issues.length > 0) {
      summaryParts.push(`${issues.length} issue(s): ${issues.join("; ")}`);
    }

    return {
      success: true,
      data: ranked,
      summary: `${summaryParts.join(" — ")}.`,
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
