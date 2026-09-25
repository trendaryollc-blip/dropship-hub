import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { orchestrateOrder, createOrchestrationInput } from "@/lib/fulfillment/orchestrator";
import { createDefaultRules } from "@/lib/fulfillment/rules-engine";
import type { FulfillmentOrder } from "@/types/fulfillment";
import type { FulfillmentRule } from "@/types/automation";
import { safeErrorMessage } from "@/lib/api-errors";

type AdminDB = Awaited<ReturnType<typeof getAdminDB>>;

interface StoredSupplierMetrics {
  reliabilityScore: number;
  shippingDays: number;
  qualityScore: number;
  stockLevel: number;
}

const DEFAULT_SUPPLIER_METRICS: StoredSupplierMetrics = {
  stockLevel: 999,
  shippingDays: 10,
  reliabilityScore: 85,
  qualityScore: 80,
};

interface SupplierMetricsLookup {
  byId: Map<string, StoredSupplierMetrics>;
  byName: Map<string, StoredSupplierMetrics>;
}

interface SupplierInventoryEntry {
  supplierId: string;
  supplierName: string;
  inStock: boolean;
  stockLevel: number;
  unitCost: number;
  shippingCost: number;
  shippingDays: number;
  reliabilityScore: number;
  qualityScore: number;
}

function toStoredMetrics(data: FirebaseFirestore.DocumentData): StoredSupplierMetrics | null {
  if (typeof data.reliabilityScore !== "number" || typeof data.avgShippingDays !== "number") return null;
  return {
    reliabilityScore: data.reliabilityScore,
    shippingDays: data.avgShippingDays,
    qualityScore: typeof data.qualityScore === "number" ? data.qualityScore : DEFAULT_SUPPLIER_METRICS.qualityScore,
    stockLevel: typeof data.stockLevel === "number" ? data.stockLevel : DEFAULT_SUPPLIER_METRICS.stockLevel,
  };
}

async function loadStoredSupplierMetrics(db: AdminDB, uid: string): Promise<SupplierMetricsLookup> {
  const byId = new Map<string, StoredSupplierMetrics>();
  const byName = new Map<string, StoredSupplierMetrics>();
  try {
    const snap = await db
      .collection("users")
      .doc(uid)
      .collection("supplierPerformance")
      .orderBy("createdAt", "desc")
      .get();
    for (const doc of snap.docs) {
      const data = doc.data();
      const metrics = toStoredMetrics(data);
      if (!metrics) continue;
      if (typeof data.supplierId === "string" && data.supplierId && !byId.has(data.supplierId)) {
        byId.set(data.supplierId, metrics);
      }
      if (typeof data.supplierName === "string" && data.supplierName && !byName.has(data.supplierName)) {
        byName.set(data.supplierName, metrics);
      }
    }
  } catch {
    return { byId, byName };
  }
  return { byId, byName };
}

function buildSupplierInventory(
  items: FulfillmentOrder["items"],
  lookup: SupplierMetricsLookup
): { inventory: SupplierInventoryEntry[]; storedCount: number; defaultCount: number } {
  const inventory: SupplierInventoryEntry[] = [];
  let storedCount = 0;
  let defaultCount = 0;

  for (const item of items) {
    const stored =
      (item.supplierId && lookup.byId.get(item.supplierId)) ||
      (item.supplierName && lookup.byName.get(item.supplierName)) ||
      null;

    if (stored) storedCount++;
    else defaultCount++;

    inventory.push({
      supplierId: item.supplierId || "cj",
      supplierName: item.supplierName || "CJ Dropshipping",
      inStock: true,
      stockLevel: stored ? stored.stockLevel : DEFAULT_SUPPLIER_METRICS.stockLevel,
      unitCost: item.unitCost || 0,
      shippingCost: 0,
      shippingDays: stored ? stored.shippingDays : DEFAULT_SUPPLIER_METRICS.shippingDays,
      reliabilityScore: stored ? stored.reliabilityScore : DEFAULT_SUPPLIER_METRICS.reliabilityScore,
      qualityScore: stored ? stored.qualityScore : DEFAULT_SUPPLIER_METRICS.qualityScore,
    });
  }

  return { inventory, storedCount, defaultCount };
}

function selectionBasisFor(storedCount: number, defaultCount: number): string {
  if (defaultCount === 0) return "stored supplier performance data";
  if (storedCount === 0) return "default metrics — no supplier data stored";
  return "stored supplier performance data where available, defaults for the rest";
}

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { orderId, action, trigger = "manual" } = body;

    // Handle bulk auto-fulfill action
    if (action === "auto_fulfill" && !orderId) {
      const db = await getAdminDB();
      const pendingSnap = await db.collection("users").doc(uid).collection("fulfillmentOrders")
        .where("status", "==", "pending")
        .orderBy("createdAt", "desc")
        .limit(50)
        .get();

      let processed = 0;
      let failed = 0;
      const metricsLookup = await loadStoredSupplierMetrics(db, uid);
      let totalStoredMetrics = 0;
      let totalDefaultMetrics = 0;

      for (const doc of pendingSnap.docs) {
        try {
          const orderData = { id: doc.id, ...doc.data() } as FulfillmentOrder;

          const rulesSnap = await db.collection("users").doc(uid).collection("fulfillmentRules").get();
          const rules: FulfillmentRule[] = rulesSnap.empty
            ? createDefaultRules()
            : rulesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FulfillmentRule));

          const built = buildSupplierInventory(orderData.items, metricsLookup);
          const supplierInventory = built.inventory;
          totalStoredMetrics += built.storedCount;
          totalDefaultMetrics += built.defaultCount;

          const settingsDoc = await db.collection("users").doc(uid).collection("fulfillmentSettings").doc("config").get();
          const settings = settingsDoc.exists ? settingsDoc.data() : {};

          const input = createOrchestrationInput(
            uid,
            orderData,
            "bulk",
            rules,
            supplierInventory,
            {
              autoApprove: settings?.autoApprove,
              optimization: settings?.optimization || "balanced",
              maxShippingDays: settings?.maxShippingDays,
              minReliabilityScore: settings?.minReliabilityScore,
            }
          );

          const result = await orchestrateOrder(input);

          if (result.action === "placed_order" || result.action === "auto_fulfilled") {
            const updateData: Record<string, unknown> = {
              status: result.state.selectedSupplier ? "in_progress" : "pending",
              updatedAt: new Date().toISOString(),
            };
            if (result.state.selectedSupplier) updateData.assignedSupplier = result.state.selectedSupplier;
            if (result.state.cjOrderId) {
              updateData.platformOrders = [{
                platform: "cj",
                platformOrderId: result.state.cjOrderId,
                trackingNumber: null,
                carrier: null,
                status: "placed",
                placedAt: new Date().toISOString(),
                shippedAt: null,
                deliveredAt: null,
                estimatedDelivery: null,
                error: null,
              }];
            }
            await db.collection("users").doc(uid).collection("fulfillmentOrders").doc(doc.id).update(updateData);
            processed++;
          } else {
            failed++;
          }
        } catch {
          failed++;
        }
      }

      return NextResponse.json({
        success: true,
        processed,
        failed,
        selectionBasis: selectionBasisFor(totalStoredMetrics, totalDefaultMetrics),
        message: `Auto-fulfill complete: ${processed} processed, ${failed} failed out of ${pendingSnap.size} pending orders`,
      });
    }

    // Handle single order action
    if (!orderId) {
      return NextResponse.json({ error: "orderId required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const orderDoc = await db.collection("users").doc(uid).collection("fulfillmentOrders").doc(orderId).get();
    if (!orderDoc.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const orderData = { id: orderDoc.id, ...orderDoc.data() } as FulfillmentOrder;

    const rulesSnap = await db.collection("users").doc(uid).collection("fulfillmentRules").get();
    const rules: FulfillmentRule[] = rulesSnap.empty
      ? createDefaultRules()
      : rulesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FulfillmentRule));

    const metricsLookup = await loadStoredSupplierMetrics(db, uid);
    const built = buildSupplierInventory(orderData.items, metricsLookup);
    const supplierInventory = built.inventory;
    const usedEmptyFallback = supplierInventory.length === 0;

    if (usedEmptyFallback) {
      supplierInventory.push({
        supplierId: "cj",
        supplierName: "CJ Dropshipping",
        inStock: true,
        stockLevel: DEFAULT_SUPPLIER_METRICS.stockLevel,
        unitCost: 0,
        shippingCost: 0,
        shippingDays: DEFAULT_SUPPLIER_METRICS.shippingDays,
        reliabilityScore: DEFAULT_SUPPLIER_METRICS.reliabilityScore,
        qualityScore: DEFAULT_SUPPLIER_METRICS.qualityScore,
      });
    }

    const settingsDoc = await db.collection("users").doc(uid).collection("fulfillmentSettings").doc("config").get();
    const settings = settingsDoc.exists ? settingsDoc.data() : {};

    const input = createOrchestrationInput(
      uid,
      orderData,
      trigger as "webhook" | "poll" | "manual" | "bulk" | "scheduled",
      rules,
      supplierInventory,
      {
        autoApprove: settings?.autoApprove,
        optimization: settings?.optimization || "balanced",
        maxShippingDays: settings?.maxShippingDays,
        minReliabilityScore: settings?.minReliabilityScore,
      }
    );

    const result = await orchestrateOrder(input);

    if (result.action === "placed_order" || result.action === "auto_fulfilled") {
      const updateData: Record<string, unknown> = {
        status: result.state.selectedSupplier ? "in_progress" : "pending",
        updatedAt: new Date().toISOString(),
      };

      if (result.state.selectedSupplier) {
        updateData.assignedSupplier = result.state.selectedSupplier;
      }
      if (result.state.cjOrderId) {
        updateData.platformOrders = [{
          platform: "cj",
          platformOrderId: result.state.cjOrderId,
          trackingNumber: null,
          carrier: null,
          status: "placed",
          placedAt: new Date().toISOString(),
          shippedAt: null,
          deliveredAt: null,
          estimatedDelivery: null,
          error: null,
        }];
      }

      await db.collection("users").doc(uid).collection("fulfillmentOrders").doc(orderId).update(updateData);
    }

    if (result.action === "rejected") {
      await db.collection("users").doc(uid).collection("fulfillmentOrders").doc(orderId).update({
        status: "pending",
        automationError: result.message,
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      action: result.action,
      message: result.message,
      selectionBasis: selectionBasisFor(built.storedCount, built.defaultCount + (usedEmptyFallback ? 1 : 0)),
      pipeline: {
        status: result.state.status,
        selectedSupplier: result.state.selectedSupplier,
        cjOrderId: result.state.cjOrderId,
        steps: result.state.steps,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Auto-processing failed", details: safeErrorMessage(error, "Unknown") },
      { status: 500 }
    );
  }
}, LIMITS.FULFILLMENT);

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const pendingSnap = await db.collection("users").doc(uid).collection("fulfillmentOrders")
      .where("status", "==", "pending")
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();

    const orders = pendingSnap.docs.map((d) => ({
      id: d.id,
      orderNumber: d.data().orderNumber,
      customerName: d.data().customerName,
      totalRevenue: d.data().totalRevenue,
      storePlatform: d.data().storePlatform,
      createdAt: d.data().createdAt,
    }));

    return NextResponse.json({ orders, count: orders.length });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch pending orders", details: safeErrorMessage(error, "Unknown") },
      { status: 500 }
    );
  }
}, LIMITS.FULFILLMENT);
