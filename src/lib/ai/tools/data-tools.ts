import { z } from "zod";
import { createTool } from "./registry";
import { getRoutingDecisions } from "@/lib/data/order-routing";
import { getRevenueEntries } from "@/lib/data/revenue";
import { getAlerts, markAlertRead, markAllAlertsRead } from "@/lib/data/alerts";
import { getLatestDigest } from "@/lib/data/digest";
import { getMissions, toggleMission } from "@/lib/data/missions";
import { getWatchlist, addToWatchlist } from "@/lib/data/watchlist";
import { getStoreConnections } from "@/lib/data/store-connections";
import { getPushedProducts } from "@/lib/data/pushed-products";
import { getProfitEntries } from "@/lib/data/profit";
import { getPriceRules, getPriceWarStats } from "@/lib/data/price-war";
import { getReturnRequests } from "@/lib/data/returns";
import { getTrendDashboard } from "@/lib/data/trend-predictor";
import { getAdCampaigns } from "@/lib/data/ad-campaigns";

// ─── Get Orders / Routing Decisions ─────────────────────────────────────────

export const getOrdersTool = createTool({
  id: "get_orders",
  name: "Get Orders",
  description: "Get recent order routing decisions and fulfillment status",
  category: "fulfillment",
  safetyLevel: "safe",
  inputSchema: z.object({
    limit: z.number().int().min(1).max(100).default(30),
  }),
  execute: async (input, ctx) => {
    const decisions = await getRoutingDecisions(ctx.uid, input.limit as number);
    return {
      success: true,
      data: decisions,
      summary: `Found ${decisions.length} routing decisions.`,
    };
  },
});

// ─── Get Revenue Data ───────────────────────────────────────────────────────

export const getRevenueDataTool = createTool({
  id: "get_revenue_data",
  name: "Get Revenue Data",
  description: "Get revenue entries for profit analysis",
  category: "financial",
  safetyLevel: "safe",
  inputSchema: z.object({
    limit: z.number().int().min(1).max(100).default(30),
  }),
  execute: async (input, ctx) => {
    const entries = await getRevenueEntries(ctx.uid, input.limit as number);
    return {
      success: true,
      data: entries,
      summary: `Found ${entries.length} revenue entries.`,
    };
  },
});

// ─── Get Profit Entries ─────────────────────────────────────────────────────

export const getProfitEntriesTool = createTool({
  id: "get_profit_entries",
  name: "Get Profit Entries",
  description: "Get profit tracking entries with cost breakdowns",
  category: "financial",
  safetyLevel: "safe",
  inputSchema: z.object({
    limit: z.number().int().min(1).max(100).default(50),
  }),
  execute: async (input, ctx) => {
    const entries = await getProfitEntries(ctx.uid, input.limit as number);
    return {
      success: true,
      data: entries,
      summary: `Found ${entries.length} profit entries.`,
    };
  },
});

// ─── Get Alerts ─────────────────────────────────────────────────────────────

export const getAlertsTool = createTool({
  id: "get_alerts",
  name: "Get Alerts",
  description: "Get business alerts (price changes, stock issues, competitor moves, etc.)",
  category: "monitoring",
  safetyLevel: "safe",
  inputSchema: z.object({
    limit: z.number().int().min(1).max(50).default(20),
  }),
  execute: async (input, ctx) => {
    const alerts = await getAlerts(ctx.uid, input.limit as number);
    const unread = alerts.filter((a) => !a.read).length;
    return {
      success: true,
      data: alerts,
      summary: `Found ${alerts.length} alerts (${unread} unread).`,
    };
  },
});

// ─── Mark Alert Read ────────────────────────────────────────────────────────

export const markAlertReadTool = createTool({
  id: "mark_alert_read",
  name: "Mark Alert Read",
  description: "Mark a single alert as read",
  category: "monitoring",
  safetyLevel: "safe",
  inputSchema: z.object({
    alertId: z.string().min(1),
  }),
  execute: async (input, ctx) => {
    await markAlertRead(ctx.uid, input.alertId as string);
    return {
      success: true,
      data: { alertId: input.alertId },
      summary: "Alert marked as read.",
    };
  },
});

// ─── Mark All Alerts Read ───────────────────────────────────────────────────

export const markAllAlertsReadTool = createTool({
  id: "mark_all_alerts_read",
  name: "Mark All Alerts Read",
  description: "Mark all unread alerts as read",
  category: "monitoring",
  safetyLevel: "safe",
  inputSchema: z.object({}),
  execute: async (input, ctx) => {
    await markAllAlertsRead(ctx.uid);
    return {
      success: true,
      data: {},
      summary: "All alerts marked as read.",
    };
  },
});

// ─── Get Daily Digest ───────────────────────────────────────────────────────

export const getDailyDigestTool = createTool({
  id: "get_daily_digest",
  name: "Get Daily Digest",
  description: "Get the latest AI-generated daily business digest",
  category: "data",
  safetyLevel: "safe",
  inputSchema: z.object({}),
  execute: async (input, ctx) => {
    const digest = await getLatestDigest(ctx.uid);
    if (!digest) {
      return { success: true, data: null, summary: "No digest available yet." };
    }
    return {
      success: true,
      data: digest,
      summary: `Digest from ${digest.date}: Revenue $${digest.metrics.revenue}, Orders ${digest.metrics.orders}, Profit $${digest.metrics.profit}.`,
    };
  },
});

// ─── Get Missions ───────────────────────────────────────────────────────────

export const getMissionsTool = createTool({
  id: "get_missions",
  name: "Get Daily Missions",
  description: "Get today's AI-generated business missions/tasks",
  category: "data",
  safetyLevel: "safe",
  inputSchema: z.object({
    date: z.string().optional(),
  }),
  execute: async (input, ctx) => {
    const missions = await getMissions(ctx.uid, input.date as string | undefined);
    const completed = missions.filter((m) => m.done).length;
    return {
      success: true,
      data: missions,
      summary: `Found ${missions.length} missions (${completed} completed).`,
    };
  },
});

// ─── Complete Mission ───────────────────────────────────────────────────────

export const completeMissionTool = createTool({
  id: "complete_mission",
  name: "Complete Mission",
  description: "Mark a daily mission as completed",
  category: "action",
  safetyLevel: "safe",
  inputSchema: z.object({
    missionId: z.string().min(1),
  }),
  execute: async (input, ctx) => {
    await toggleMission(ctx.uid, input.missionId as string, true);
    return {
      success: true,
      data: { missionId: input.missionId },
      summary: "Mission marked as completed.",
    };
  },
});

// ─── Get Watchlist ──────────────────────────────────────────────────────────

export const getWatchlistTool = createTool({
  id: "get_watchlist",
  name: "Get Watchlist",
  description: "Get products/niches being monitored for price and stock changes",
  category: "monitoring",
  safetyLevel: "safe",
  inputSchema: z.object({
    type: z.string().optional(),
  }),
  execute: async (input, ctx) => {
    const items = await getWatchlist(ctx.uid, input.type as "product" | "niche" | "competitor" | undefined);
    return {
      success: true,
      data: items,
      summary: `Found ${items.length} items on watchlist.`,
    };
  },
});

// ─── Add to Watchlist ───────────────────────────────────────────────────────

export const addToWatchlistTool = createTool({
  id: "add_to_watchlist",
  name: "Add to Watchlist",
  description: "Add a product or niche to the monitoring watchlist",
  category: "monitoring",
  safetyLevel: "safe",
  inputSchema: z.object({
    itemId: z.string().min(1),
    title: z.string().min(1),
    type: z.string().min(1),
    currentPrice: z.number().optional(),
  }),
  execute: async (input, ctx) => {
    await addToWatchlist(ctx.uid, {
      itemId: input.itemId as string,
      title: input.title as string,
      type: input.type as string,
      currentPrice: input.currentPrice as number | undefined,
    } as Parameters<typeof addToWatchlist>[1]);
    return {
      success: true,
      data: { itemId: input.itemId, title: input.title },
      summary: `Added "${input.title}" to watchlist.`,
    };
  },
});

// ─── Get Store Connections ──────────────────────────────────────────────────

export const getStoreConnectionsTool = createTool({
  id: "get_store_connections",
  name: "Get Store Connections",
  description: "Get connected stores (Shopify, WooCommerce, etc.) and their status",
  category: "store",
  safetyLevel: "safe",
  inputSchema: z.object({}),
  execute: async (input, ctx) => {
    const connections = await getStoreConnections(ctx.uid);
    return {
      success: true,
      data: connections,
      summary: `Found ${connections.length} store connections (${connections.filter((c) => c.status === "connected").length} active).`,
    };
  },
});

// ─── Get Pushed Products ────────────────────────────────────────────────────

export const getPushedProductsTool = createTool({
  id: "get_pushed_products",
  name: "Get Pushed Products",
  description: "Get products that have been pushed to connected stores",
  category: "store",
  safetyLevel: "safe",
  inputSchema: z.object({}),
  execute: async (input, ctx) => {
    const products = await getPushedProducts(ctx.uid);
    return {
      success: true,
      data: products,
      summary: `Found ${products.length} pushed products.`,
    };
  },
});

// ─── Get Price Rules ────────────────────────────────────────────────────────

export const getPriceRulesTool = createTool({
  id: "get_price_rules",
  name: "Get Price Rules",
  description: "Get price war rules and their current status",
  category: "pricing",
  safetyLevel: "safe",
  inputSchema: z.object({}),
  execute: async (input, ctx) => {
    const rules = await getPriceRules(ctx.uid);
    return {
      success: true,
      data: rules,
      summary: `Found ${rules.length} price rules (${rules.filter((r) => r.status === "active").length} active).`,
    };
  },
});

// ─── Get Price War Stats ────────────────────────────────────────────────────

export const getPriceWarStatsTool = createTool({
  id: "get_price_war_stats",
  name: "Get Price War Stats",
  description: "Get statistics for price war automation (adjustments, savings, margins)",
  category: "pricing",
  safetyLevel: "safe",
  inputSchema: z.object({}),
  execute: async (input, ctx) => {
    const stats = await getPriceWarStats(ctx.uid);
    return {
      success: true,
      data: stats,
      summary: `Price war: ${stats.activeRules} active rules, ${stats.triggeredToday} triggered today, avg margin ${stats.avgMarginMaintained}%.`,
    };
  },
});

// ─── Get Return Requests ────────────────────────────────────────────────────

export const getReturnRequestsTool = createTool({
  id: "get_return_requests",
  name: "Get Return Requests",
  description: "Get return and refund requests",
  category: "data",
  safetyLevel: "safe",
  inputSchema: z.object({
    status: z.string().optional(),
    limit: z.number().int().min(1).max(50).default(20),
  }),
  execute: async (input, ctx) => {
    const returns = await getReturnRequests(ctx.uid, input.status as "pending" | "approved" | "label_generated" | "shipped_back" | "received" | "inspected" | "refunded" | "denied" | "cancelled" | undefined, input.limit as number);
    return {
      success: true,
      data: returns,
      summary: `Found ${returns.length} return requests.`,
    };
  },
});

// ─── Get Trend Dashboard ────────────────────────────────────────────────────

export const getTrendDashboardTool = createTool({
  id: "get_trend_dashboard",
  name: "Get Trend Dashboard",
  description: "Get trend prediction dashboard (active trends, rising stars, alerts)",
  category: "data",
  safetyLevel: "safe",
  inputSchema: z.object({}),
  execute: async (input, ctx) => {
    const dashboard = await getTrendDashboard(ctx.uid);
    return {
      success: true,
      data: dashboard,
      summary: `Trends: ${dashboard.activeTrends} active, ${dashboard.risingStars} rising stars, ${dashboard.alertsUnread} unread alerts.`,
    };
  },
});

// ─── Get Ad Campaigns ───────────────────────────────────────────────────────

export const getAdCampaignsTool = createTool({
  id: "get_ad_campaigns",
  name: "Get Ad Campaigns",
  description: "Get ad campaigns (Facebook, Google) and their performance",
  category: "data",
  safetyLevel: "safe",
  inputSchema: z.object({}),
  execute: async (input, ctx) => {
    const campaigns = await getAdCampaigns(ctx.uid);
    return {
      success: true,
      data: campaigns,
      summary: `Found ${campaigns.length} ad campaigns.`,
    };
  },
});
