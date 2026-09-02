import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { addCOGSEntry, getCOGSByProduct, getAllCOGSEntries, updateCOGSEntry, deleteCOGSEntry, getCOGSSummary, bulkUpdateCOGS } from "@/lib/finance/cogs-tracker";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "list";
    const productId = searchParams.get("productId");

    if (action === "list") {
      const entries = getAllCOGSEntries();
      return NextResponse.json({ success: true, entries, count: entries.length });
    }

    if (action === "get" && productId) {
      const entry = getCOGSByProduct(productId);
      if (!entry) {
        return NextResponse.json({ error: "COGS entry not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, entry });
    }

    if (action === "summary") {
      const summary = getCOGSSummary();
      return NextResponse.json({ success: true, summary });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch COGS data", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { action, entry, entries, updates, entryId } = body;

    if (action === "add") {
      if (!entry) {
        return NextResponse.json({ error: "entry data is required" }, { status: 400 });
      }

      const newEntry = addCOGSEntry(entry);
      return NextResponse.json({ success: true, entry: newEntry });
    }

    if (action === "update" && entryId) {
      if (!updates) {
        return NextResponse.json({ error: "updates data is required" }, { status: 400 });
      }

      const updated = updateCOGSEntry(entryId, updates);
      if (!updated) {
        return NextResponse.json({ error: "COGS entry not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, entry: updated });
    }

    if (action === "delete" && entryId) {
      const deleted = deleteCOGSEntry(entryId);
      if (!deleted) {
        return NextResponse.json({ error: "COGS entry not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: "COGS entry deleted" });
    }

    if (action === "bulk_update") {
      if (!entries || !Array.isArray(entries)) {
        return NextResponse.json({ error: "entries array is required" }, { status: 400 });
      }

      const result = bulkUpdateCOGS(entries);
      return NextResponse.json({ success: true, result });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process COGS request", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});
