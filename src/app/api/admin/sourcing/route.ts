import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth";
import { getAdminDB } from "@/lib/firebase-admin";
import { safeErrorMessage } from "@/lib/api-errors";

const SAMPLE_SIZE = 1000;

interface SupplierTally {
  name: string;
  assignments: number;
  listings: number;
}

interface RecentAssignment {
  productId: string;
  supplierName: string;
  source: string;
  aliased: boolean;
  updatedAt: string | null;
}

interface RecentPush {
  productTitle: string;
  storeName: string;
  supplierName: string | null;
  platformProductId: string | null;
  pushedAt: string | null;
}

interface SourcingMetrics {
  pipeline: {
    catalogProducts: number | null;
    supplierAssignments: number | null;
    listingsPushed: number | null;
    ordersReceived: number | null;
  };
  orderRouting: { routed: number; unassigned: number; sampled: number } | null;
  topSuppliers: SupplierTally[];
  recentAssignments: RecentAssignment[];
  recentPushes: RecentPush[];
  estimates: { pipeline: boolean; orderRouting: boolean; breakdowns: boolean };
  generatedAt: string;
}

export const GET = requireOwner(async (_request: NextRequest) => {
  try {
    const db = await getAdminDB();
    if (!db) return NextResponse.json({ error: "Database unavailable" }, { status: 500 });

    // Aggregation counts. Collection-group queries with no filter/orderBy are
    // served by the default document-id index, so no composite index is needed.
    const safeCount = async (name: string): Promise<number | null> => {
      try {
        const snap = await db.collectionGroup(name).count().get();
        const count = snap.data().count;
        return typeof count === "number" ? count : null;
      } catch {
        return null;
      }
    };

    const [catalogProducts, supplierAssignments, listingsPushed, ordersReceived] = await Promise.all([
      safeCount("productCatalog"),
      safeCount("productSuppliers"),
      safeCount("pushedProducts"),
      safeCount("fulfillmentOrders"),
    ]);

    const estimates: SourcingMetrics["estimates"] = {
      pipeline: [catalogProducts, supplierAssignments, listingsPushed, ordersReceived].some((v) => v === null),
      orderRouting: false,
      breakdowns: false,
    };

    const supplierByName = new Map<string, SupplierTally>();
    const bump = (name: string, key: "assignments" | "listings") => {
      const clean = (name || "Unassigned").trim() || "Unassigned";
      const entry = supplierByName.get(clean) || { name: clean, assignments: 0, listings: 0 };
      entry[key] += 1;
      supplierByName.set(clean, entry);
    };

    let recentAssignments: RecentAssignment[] = [];
    try {
      const snap = await db.collectionGroup("productSuppliers").limit(SAMPLE_SIZE).get();
      const rows = snap.docs.map((d) => {
        const data = d.data();
        return {
          productId: String(data.productId || d.id),
          supplierName: String(data.selectedSupplierName || data.supplierName || "Unassigned"),
          source: String(data.source || "manual"),
          aliased: typeof data.aliasedFrom === "string" || typeof data.storeProductId === "string",
          updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : null,
        };
      });
      for (const row of rows) {
        if (!row.aliased) bump(row.supplierName, "assignments");
      }
      recentAssignments = rows
        .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
        .slice(0, 10);
    } catch {
      estimates.breakdowns = true;
    }

    let recentPushes: RecentPush[] = [];
    try {
      const snap = await db.collectionGroup("pushedProducts").limit(SAMPLE_SIZE).get();
      const rows = snap.docs.map((d) => {
        const data = d.data();
        const supplierName =
          typeof data.supplierName === "string" ? data.supplierName : null;
        return {
          productTitle: String(data.productTitle || "Untitled"),
          storeName: String(data.storeName || "Unknown store"),
          supplierName,
          platformProductId: data.platformProductId != null ? String(data.platformProductId) : null,
          pushedAt: typeof data.pushedAt === "string" ? data.pushedAt : null,
        };
      });
      for (const row of rows) {
        if (row.supplierName) bump(row.supplierName, "listings");
      }
      recentPushes = rows
        .sort((a, b) => String(b.pushedAt || "").localeCompare(String(a.pushedAt || "")))
        .slice(0, 10);
    } catch {
      estimates.breakdowns = true;
    }

    let orderRouting: SourcingMetrics["orderRouting"] = null;
    try {
      const snap = await db.collectionGroup("fulfillmentOrders").limit(SAMPLE_SIZE).get();
      let routed = 0;
      let unassigned = 0;
      for (const d of snap.docs) {
        const items = (d.data().items || []) as { supplierId?: string }[];
        const hasSupplier = items.some(
          (it) => it.supplierId && it.supplierId !== "unknown" && it.supplierId !== ""
        );
        if (hasSupplier) routed += 1;
        else unassigned += 1;
      }
      orderRouting = { routed, unassigned, sampled: snap.size };
    } catch {
      estimates.orderRouting = true;
    }

    const topSuppliers = Array.from(supplierByName.values())
      .sort((a, b) => b.assignments + b.listings - (a.assignments + a.listings))
      .slice(0, 8);

    const payload: SourcingMetrics = {
      pipeline: { catalogProducts, supplierAssignments, listingsPushed, ordersReceived },
      orderRouting,
      topSuppliers,
      recentAssignments,
      recentPushes,
      estimates,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to load sourcing metrics") },
      { status: 500 }
    );
  }
});
