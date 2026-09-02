import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { addTaxRate, getTaxRatesByCountry, getTaxRatesByState, getAllTaxRates, updateTaxRate, deleteTaxRate, calculateTax, estimateTaxForOrder, generateTaxReport, getTaxCalculationHistory, initializeDefaultTaxRates } from "@/lib/finance/tax-estimator";

initializeDefaultTaxRates();

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "list";
    const country = searchParams.get("country");
    const state = searchParams.get("state");

    if (action === "list") {
      const rates = country
        ? state
          ? getTaxRatesByState(country, state)
          : getTaxRatesByCountry(country)
        : getAllTaxRates();
      return NextResponse.json({ success: true, rates, count: rates.length });
    }

    if (action === "history") {
      const limit = parseInt(searchParams.get("limit") || "50", 10);
      const history = getTaxCalculationHistory(limit);
      return NextResponse.json({ success: true, history });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch tax data", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { action, rate, rateId, updates, input, order, reportInput } = body;

    if (action === "add_rate") {
      if (!rate) {
        return NextResponse.json({ error: "rate data is required" }, { status: 400 });
      }

      const newRate = addTaxRate(rate);
      return NextResponse.json({ success: true, rate: newRate });
    }

    if (action === "update_rate" && rateId) {
      if (!updates) {
        return NextResponse.json({ error: "updates data is required" }, { status: 400 });
      }

      const updated = updateTaxRate(rateId, updates);
      if (!updated) {
        return NextResponse.json({ error: "Tax rate not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, rate: updated });
    }

    if (action === "delete_rate" && rateId) {
      const deleted = deleteTaxRate(rateId);
      if (!deleted) {
        return NextResponse.json({ error: "Tax rate not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: "Tax rate deleted" });
    }

    if (action === "calculate") {
      if (!input) {
        return NextResponse.json({ error: "input data is required" }, { status: 400 });
      }

      const result = calculateTax(input);
      return NextResponse.json({ success: true, result });
    }

    if (action === "estimate_order") {
      if (!order) {
        return NextResponse.json({ error: "order data is required" }, { status: 400 });
      }

      const result = estimateTaxForOrder(order);
      return NextResponse.json({ success: true, result });
    }

    if (action === "generate_report") {
      if (!reportInput) {
        return NextResponse.json({ error: "reportInput data is required" }, { status: 400 });
      }

      const report = generateTaxReport(reportInput);
      return NextResponse.json({ success: true, report });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process tax request", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});
