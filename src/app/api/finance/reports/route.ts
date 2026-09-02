import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { generatePnLReport, getReport, getAllReports, deleteReport, exportReportToCSV, exportReportToPDFData, validatePnLReportInput } from "@/lib/finance/pnl-report";

export const GET = withAuth(async (request: NextRequest, _uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "list";
    const reportId = searchParams.get("reportId");

    if (action === "list") {
      const reports = getAllReports();
      return NextResponse.json({ success: true, reports, count: reports.length });
    }

    if (action === "get" && reportId) {
      const report = getReport(reportId);
      if (!report) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, report });
    }

    if (action === "export_csv" && reportId) {
      const report = getReport(reportId);
      if (!report) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }
      const csv = exportReportToCSV(report);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="pnl-report-${reportId}.csv"`,
        },
      });
    }

    if (action === "export_pdf" && reportId) {
      const report = getReport(reportId);
      if (!report) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }
      const pdfData = exportReportToPDFData(report);
      return NextResponse.json({ success: true, pdfData });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch reports", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { action, input, reportId } = body;

    if (action === "generate") {
      if (!input) {
        return NextResponse.json({ error: "input data is required" }, { status: 400 });
      }

      const validation = validatePnLReportInput(input);
      if (!validation.valid) {
        return NextResponse.json({ error: "Validation failed", errors: validation.errors }, { status: 400 });
      }

      const db = await getAdminDB();
      const snap = await db.collection("users").doc(uid).collection("profitEntries")
        .where("date", ">=", input.startDate)
        .where("date", "<=", input.endDate)
        .get();

      const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<Record<string, unknown>>;

      const reportOrders = orders.map((o) => ({
        orderId: typeof o.orderId === "string" ? o.orderId : String(o.id || ""),
        orderDate: typeof o.date === "string" ? o.date : "",
        revenue: typeof o.revenue === "number" ? o.revenue : 0,
        cogs: typeof o.cogs === "number" ? o.cogs : 0,
        shippingCost: typeof o.shippingCost === "number" ? o.shippingCost : 0,
        platformFee: typeof o.platformFee === "number" ? o.platformFee : 0,
        paymentProcessing: typeof o.paymentProcessing === "number" ? o.paymentProcessing : 0,
        refunds: typeof o.refunds === "number" ? o.refunds : 0,
        adSpend: typeof o.adSpend === "number" ? o.adSpend : 0,
        otherCosts: typeof o.otherCosts === "number" ? o.otherCosts : 0,
        productTitle: typeof o.productTitle === "string" ? o.productTitle : "Unknown",
        productId: typeof o.productId === "string" ? o.productId : String(o.id || ""),
        platform: typeof o.platform === "string" ? o.platform : "Unknown",
        supplierId: typeof o.supplierId === "string" ? o.supplierId : "unknown",
        supplierName: typeof o.supplierName === "string" ? o.supplierName : "Unknown",
        status: typeof o.status === "string" ? o.status : "completed",
      }));

      const report = generatePnLReport(input, { orders: reportOrders });
      return NextResponse.json({ success: true, report });
    }

    if (action === "delete" && reportId) {
      const deleted = deleteReport(reportId);
      if (!deleted) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }
      return NextResponse.json({ success: true, message: "Report deleted" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process report request", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

function getAdminDB(): FirebaseFirestore.Firestore {
  throw new Error("Not implemented");
}
