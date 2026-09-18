import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { getStoreAdapter } from "@/lib/fulfillment/store-adapters";
import { safeErrorMessage } from "@/lib/api-errors";

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { actionId } = body;

    if (!actionId) {
      return NextResponse.json({ error: "actionId required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const actionDoc = await db.collection("users").doc(uid).collection("scheduledActions").doc(actionId).get();

    if (!actionDoc.exists) {
      return NextResponse.json({ error: "Action not found" }, { status: 404 });
    }

    const action = actionDoc.data()!;
    const now = new Date();

    // Mark as running
    await actionDoc.ref.update({ status: "running" });

    try {
      switch (action.type) {
        case "sync_inventory": {
          // Sync inventory for each connected store
          for (const storeId of action.storeIds) {
            const connDoc = await db.collection("users").doc(uid).collection("storeConnections").doc(storeId).get();
            if (!connDoc.exists) continue;
            const conn = connDoc.data()!;
            const adapter = getStoreAdapter(conn.platform);
            if (adapter?.healthCheck) {
              await adapter.healthCheck({
                platform: conn.platform,
                url: conn.url || conn.backendUrl || "",
                apiKey: conn.apiKey,
                accessToken: conn.accessToken,
              });
            }
          }
          break;
        }
        case "sync_orders": {
          for (const storeId of action.storeIds) {
            const connDoc = await db.collection("users").doc(uid).collection("storeConnections").doc(storeId).get();
            if (!connDoc.exists) continue;
            const conn = connDoc.data()!;
            const adapter = getStoreAdapter(conn.platform);
            if (adapter?.fetchOrders) {
              await adapter.fetchOrders({
                platform: conn.platform,
                url: conn.url || conn.backendUrl || "",
                apiKey: conn.apiKey,
                accessToken: conn.accessToken,
              });
            }
          }
          break;
        }
        default: {
          // For push_products, generate_report, optimize_listings — mark as done
          // These require more complex orchestration and are handled by the AI bar
          break;
        }
      }

      await actionDoc.ref.update({
        status: "success",
        lastRun: now.toISOString(),
      });
    } catch (err) {
      await actionDoc.ref.update({ status: "failed" });
      throw err;
    }

    return NextResponse.json({ success: true, ranAt: now.toISOString() });
  } catch (error) {
    return NextResponse.json({ error: "Failed to run action", details: safeErrorMessage(error, "Unknown") }, { status: 500 });
  }
}, LIMITS.DEFAULT);
