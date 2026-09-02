import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { addCashFlowEntry, getAllCashFlowEntries, getCashFlowEntriesByDateRange, updateCashFlowEntry, deleteCashFlowEntry, generateCashFlowProjection, getCashFlowSummary, getUpcomingPayments, validateCashFlowInput } from "@/lib/finance/cashflow-projection";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "list";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const days = parseInt(searchParams.get("days") || "30", 10);

    if (action === "list") {
      const entries = startDate && endDate
        ? getCashFlowEntriesByDateRange(startDate, endDate)
        : getAllCashFlowEntries();
      return NextResponse.json({ success: true, entries, count: entries.length });
    }

    if (action === "summary" && startDate && endDate) {
      const summary = getCashFlowSummary(startDate, endDate);
      return NextResponse.json({ success: true, summary });
    }

    if (action === "upcoming") {
      const payments = getUpcomingPayments(days);
      return NextResponse.json({ success: true, payments, count: payments.length });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch cash flow data", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { action, entry, entryId, updates, projectionInput } = body;

    if (action === "add") {
      if (!entry) {
        return NextResponse.json({ error: "entry data is required" }, { status: 400 });
      }

      const newEntry = addCashFlowEntry(entry);
      return NextResponse.json({ success: true, entry: newEntry });
    }

    if (action === "update" && entryId) {
      if (!updates) {
        return NextResponse.json({ error: "updates data is required" }, { status: 400 });
      }

      const updated = updateCashFlowEntry(entryId, updates);
      if (!updated) {
        return NextResponse.json({ error: "Cash flow entry not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, entry: updated });
    }

    if (action === "delete" && entryId) {
      const deleted = deleteCashFlowEntry(entryId);
      if (!deleted) {
        return NextResponse.json({ error: "Cash flow entry not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: "Cash flow entry deleted" });
    }

    if (action === "project") {
      if (!projectionInput) {
        return NextResponse.json({ error: "projectionInput data is required" }, { status: 400 });
      }

      const validation = validateCashFlowInput(projectionInput);
      if (!validation.valid) {
        return NextResponse.json({ error: "Validation failed", errors: validation.errors }, { status: 400 });
      }

      const projection = generateCashFlowProjection(projectionInput);
      return NextResponse.json({ success: true, projection });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process cash flow request", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});
