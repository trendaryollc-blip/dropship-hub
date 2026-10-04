"use client";

import { useCallback, useEffect, useState } from "react";

export const DASHBOARD_SECTION_IDS = [
  "command",
  "revenue",
  "insights",
  "discovery",
  "suppliers",
  "orders",
  "market",
  "stores",
  "growth",
] as const;

export type DashboardSectionId = (typeof DASHBOARD_SECTION_IDS)[number];

export const DASHBOARD_SECTION_LABELS: Record<DashboardSectionId, string> = {
  command: "Command Center",
  revenue: "Revenue & Profit",
  insights: "Insights",
  discovery: "Product Discovery",
  suppliers: "Supplier Network",
  orders: "Order Operations",
  market: "Market Intelligence",
  stores: "Store Operations",
  growth: "Growth Tools",
};

const STORAGE_KEY = "dashboard:hidden-sections";

function parseHidden(raw: unknown): DashboardSectionId[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is DashboardSectionId =>
    typeof v === "string" &&
    (DASHBOARD_SECTION_IDS as readonly string[]).includes(v)
  );
}

function loadLocal(): DashboardSectionId[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return parseHidden(JSON.parse(raw));
  } catch {
    return [];
  }
}

/**
 * Hide/show state for dashboard sections.
 * Persists to localStorage only (per-device preference).
 *
 * NOTE: this is separate from useDashboardLayout (Bento grid layout,
 * persisted server-side). Section visibility stays local so the two
 * preferences never overwrite each other in /api/settings/dashboard-layout.
 */
export function useDashboardSections() {
  const [hidden, setHidden] = useState<DashboardSectionId[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage once on mount.
  useEffect(() => {
    setHidden(loadLocal());
    setHydrated(true);
  }, []);

  const persist = useCallback((next: DashboardSectionId[]) => {
    setHidden(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage failures.
    }
  }, []);

  const toggle = useCallback(
    (id: DashboardSectionId) => {
      persist(hidden.includes(id) ? hidden.filter((h) => h !== id) : [...hidden, id]);
    },
    [hidden, persist]
  );

  const reset = useCallback(() => persist([]), [persist]);

  const isVisible = useCallback((id: DashboardSectionId) => !hidden.includes(id), [hidden]);

  return { hidden, hydrated, toggle, reset, isVisible };
}
