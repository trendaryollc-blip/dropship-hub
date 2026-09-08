import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { getStoreInventory, upsertStoreInventory, syncInventoryAcrossStores, addInventorySyncLog, getInventorySyncLogs } from "@/lib/data/multi-store";

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "inventory";

    if (type === "logs") {
      const logs = await getInventorySyncLogs(uid);
      return NextResponse.json({ logs });
    }

    const inventory = await getStoreInventory(uid);
    return NextResponse.json({ inventory });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch inventory", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "sync") {
      const { productId, sourceStoreId, newStock } = body;
      if (!productId || !sourceStoreId || newStock === undefined) {
        return NextResponse.json({ error: "Missing required fields for sync" }, { status: 400 });
      }

      await syncInventoryAcrossStores(uid, productId, sourceStoreId, newStock);
      await addInventorySyncLog(uid, {
        productId,
        productTitle: body.productTitle || "",
        sourceStoreId,
        sourceStoreName: body.sourceStoreName || "",
        action: "sync",
        quantityChange: body.quantityChange || 0,
        previousStock: body.previousStock || 0,
        newStock,
        status: "success",
        createdAt: new Date().toISOString(),
      });

      return NextResponse.json({ success: true });
    }

    if (action === "upsert") {
      const { item } = body;
      if (!item?.id || !item?.productId) {
        return NextResponse.json({ error: "Missing item data" }, { status: 400 });
      }

      await upsertStoreInventory(uid, item);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process inventory action", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);
