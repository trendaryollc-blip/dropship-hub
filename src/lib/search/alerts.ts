// ── Search Alerts & Watchlist Integration ─────────────────────────────────
//
// CRUD operations and matching logic for search alerts.
// Alerts notify users when new products appear or prices drop.

// ── Types ──────────────────────────────────────────────────────────────────

import type { MergedProduct } from "./dedup";

export interface SearchAlert {
  id: string;
  userId: string;
  query: string;
  platforms: string[];
  priceMin?: number;
  priceMax?: number;
  minRating?: number;
  notifyOn: "new_product" | "price_drop" | "any";
  threshold?: number;
  isActive: boolean;
  lastChecked?: string;
  lastNotified?: string;
  createdAt: string;
}

export interface AlertMatch {
  alertId: string;
  matchedProducts: MergedProduct[];
  matchType: "new_product" | "price_drop";
  priceChange?: number;
}

// ── Firestore Abstraction ─────────────────────────────────────────────────
// This module is designed to work with Firestore but uses function parameters
// for data access to enable testing without a live database.

export interface AlertStore {
  create(data: Omit<SearchAlert, "id" | "createdAt" | "isActive">): Promise<SearchAlert>;
  getAll(userId: string): Promise<SearchAlert[]>;
  get(userId: string, alertId: string): Promise<SearchAlert | null>;
  delete(userId: string, alertId: string): Promise<void>;
  update(userId: string, alertId: string, data: Partial<SearchAlert>): Promise<void>;
}

// ── Alert CRUD ────────────────────────────────────────────────────────────

export async function createAlert(
  store: AlertStore,
  userId: string,
  alert: Omit<SearchAlert, "id" | "userId" | "createdAt" | "isActive">
): Promise<SearchAlert> {
  return store.create({ ...alert, userId });
}

export async function getUserAlerts(
  store: AlertStore,
  userId: string
): Promise<SearchAlert[]> {
  return store.getAll(userId);
}

export async function deleteAlert(
  store: AlertStore,
  userId: string,
  alertId: string
): Promise<void> {
  return store.delete(userId, alertId);
}

export async function toggleAlert(
  store: AlertStore,
  userId: string,
  alertId: string,
  active: boolean
): Promise<void> {
  return store.update(userId, alertId, { isActive: active });
}

// ── Alert Matching ────────────────────────────────────────────────────────

export function matchAlertToProducts(
  alert: SearchAlert,
  products: MergedProduct[]
): AlertMatch | null {
  const matched: MergedProduct[] = [];

  for (const product of products) {
    if (alert.priceMin != null && (product.bestPrice == null || product.bestPrice < alert.priceMin)) continue;
    if (alert.priceMax != null && (product.bestPrice == null || product.bestPrice > alert.priceMax)) continue;
    if (alert.minRating != null && (product.rating == null || product.rating < alert.minRating)) continue;
    if (alert.platforms.length > 0) {
      const alertPlatforms = new Set(alert.platforms);
      if (!product.platforms.some((p) => alertPlatforms.has(p.platform))) continue;
    }
    matched.push(product);
  }

  if (matched.length === 0) return null;

  const matchType = alert.notifyOn === "price_drop"
    ? "price_drop"
    : alert.notifyOn === "new_product"
      ? "new_product"
      : "new_product";

  return {
    alertId: alert.id,
    matchedProducts: matched,
    matchType,
  };
}

// ── Price Drop Detection ──────────────────────────────────────────────────

export function isPriceDrop(
  previous: number | null,
  current: number | null,
  threshold: number
): boolean {
  if (previous == null || current == null) return false;
  if (previous <= 0) return false;
  if (current >= previous) return false;

  const dropPercent = ((previous - current) / previous) * 100;
  return dropPercent >= threshold;
}

// ── Bulk Alert Check ──────────────────────────────────────────────────────

export async function checkAlertsForUser(
  store: AlertStore,
  userId: string,
  searchFn: (query: string, platforms: string[]) => Promise<MergedProduct[]>
): Promise<AlertMatch[]> {
  const alerts = await store.getAll(userId);
  const activeAlerts = alerts.filter((a) => a.isActive);

  const matches: AlertMatch[] = [];

  for (const alert of activeAlerts) {
    const products = await searchFn(alert.query, alert.platforms);
    const match = matchAlertToProducts(alert, products);
    if (match) {
      matches.push(match);
    }
    await store.update(userId, alert.id, {
      lastChecked: new Date().toISOString(),
    });
  }

  return matches;
}
