import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { fetchCJInventory, syncInventoryForStore, detectInventoryChanges, generateInventoryAlerts } from "@/lib/fulfillment/inventory-sync";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "list";
    const productIds = searchParams.get("productIds")?.split(",").filter(Boolean);

    if (action === "list") {
      const inventory = await fetchCJInventory(productIds);
      return NextResponse.json({ success: true, inventory, count: inventory.length });
    }

    if (action === "alerts") {
      const currentInventory = await fetchCJInventory(productIds);
      const alerts = generateInventoryAlerts([]);
      return NextResponse.json({ success: true, alerts, inventoryCount: currentInventory.length });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch inventory", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { action, storeId, storePlatform, productMappings } = body;

    if (action === "sync") {
      if (!storeId || !storePlatform || !productMappings) {
        return NextResponse.json(
          { error: "storeId, storePlatform, and productMappings are required" },
          { status: 400 }
        );
      }

      const result = await syncInventoryForStore(storeId, storePlatform, productMappings);
      return NextResponse.json({ success: true, result });
    }

    if (action === "detect_changes") {
      const { previousInventory, currentInventory } = body;
      if (!previousInventory || !currentInventory) {
        return NextResponse.json(
          { error: "previousInventory and currentInventory are required" },
          { status: 400 }
        );
      }

      const changes = detectInventoryChanges(previousInventory, currentInventory);
      const alerts = generateInventoryAlerts(changes);
      return NextResponse.json({ success: true, changes, alerts });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process inventory request", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});
