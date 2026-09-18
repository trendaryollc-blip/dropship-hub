import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { StoreConnectionSchema, StoreConnectionUpdateSchema, validateBody } from "@/lib/validation";
import { LIMITS } from "@/lib/rate-limit";
import { unregisterShopifyWebhooks } from "@/lib/shopify/webhooks";
import { safeErrorMessage } from "@/lib/api-errors";

const SENSITIVE_FIELDS = ["apiKey", "apiSecret", "accessToken", "consumerKey", "consumerSecret", "password"];

function sanitizeConnection(doc: Record<string, unknown>) {
  const clean = { ...doc };
  for (const field of SENSITIVE_FIELDS) {
    delete clean[field];
  }
  return clean;
}

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const snap = await db.collection("users").doc(uid).collection("storeConnections").orderBy("connectedAt", "desc").get();
    const connections = snap.docs.map((d) => ({ id: d.id, ...sanitizeConnection(d.data() as Record<string, unknown>) }));
    return NextResponse.json({ connections });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch connections", details: safeErrorMessage(error, "Unknown") }, { status: 500 });
  }
}, LIMITS.DEFAULT);

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const validation = validateBody(StoreConnectionSchema, body);
    if (!validation.success) return validation.response;
    const store = validation.data;

    const db = await getAdminDB();
    const ref = await db.collection("users").doc(uid).collection("storeConnections").add({
      ...store,
      status: "connected",
      connectedAt: new Date().toISOString(),
    });

    // Auto-sync: trigger initial product/inventory sync for the new connection
    // Non-blocking — runs in background, errors are logged but don't block the response
    const connId = ref.id;
    import("@/lib/fulfillment/store-adapters").then(({ getStoreAdapter }) => {
      const adapter = getStoreAdapter(store.platform);
      if (adapter?.healthCheck) {
        adapter.healthCheck({
          platform: store.platform,
          url: store.url,
          apiKey: store.apiKey,
          accessToken: store.accessToken,
        }).then(async (result) => {
          // Update lastSyncAt after initial health probe
          await db.collection("users").doc(uid).collection("storeConnections").doc(connId).update({
            lastSyncAt: new Date().toISOString(),
            healthStatus: result.status,
          });
        }).catch((err) => {
          console.error(`Auto-sync failed for new connection ${connId}:`, err);
        });
      }
    }).catch(() => {
      // Adapter import failed — skip auto-sync silently
    });

    return NextResponse.json({ id: ref.id, ...store, status: "connected" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to add connection", details: safeErrorMessage(error, "Unknown") }, { status: 500 });
  }
}, LIMITS.DEFAULT);

export const DELETE = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const storeId = req.nextUrl.searchParams.get("storeId");
    if (!storeId) return NextResponse.json({ error: "storeId required" }, { status: 400 });

    const db = await getAdminDB();
    const storeDoc = await db.collection("users").doc(uid).collection("storeConnections").doc(storeId).get();

    if (storeDoc.exists) {
      const store = storeDoc.data();
      if (store?.platform === "shopify" && store?.storeDomain && store?.accessToken) {
        unregisterShopifyWebhooks(store.storeDomain, store.accessToken).catch((err) => {
          console.error("Failed to unregister Shopify webhooks:", err);
        });
      }
    }

    await db.collection("users").doc(uid).collection("storeConnections").doc(storeId).delete();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete connection", details: safeErrorMessage(error, "Unknown") }, { status: 500 });
  }
}, LIMITS.DEFAULT);

export const PUT = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { storeId, ...updates } = body;
    if (!storeId) return NextResponse.json({ error: "storeId required" }, { status: 400 });

    const validation = validateBody(StoreConnectionUpdateSchema, updates);
    if (!validation.success) return validation.response;

    const db = await getAdminDB();
    await db.collection("users").doc(uid).collection("storeConnections").doc(storeId).update(validation.data);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update connection", details: safeErrorMessage(error, "Unknown") }, { status: 500 });
  }
}, LIMITS.DEFAULT);
