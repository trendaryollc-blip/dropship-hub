import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const supplierId = req.nextUrl.searchParams.get("supplierId");
    const type = req.nextUrl.searchParams.get("type") || "list";

    const db = await getAdminDB();

    if (type === "analytics") {
      const snap = await db
        .collection("users").doc(uid).collection("defectReports")
        .orderBy("createdAt", "desc")
        .limit(200)
        .get();

      interface DefectDoc {
        id: string;
        supplierId: string;
        supplierName: string;
        productId: string;
        productName: string;
        severity: string;
        defectType: string;
        description: string;
        reportedBy: string;
        resolution: string;
        resolved: boolean;
        resolvedAt: string | null;
        orderId: string;
        createdAt: string;
      }

      const reports: DefectDoc[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as DefectDoc));

      const supplierMap = new Map<string, typeof reports>();
      const productMap = new Map<string, { productName: string; defectCount: number; supplierName: string }>();
      const severityCounts: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };

      for (const report of reports) {
        const existing = supplierMap.get(report.supplierId) || [];
        existing.push(report);
        supplierMap.set(report.supplierId, existing);

        const productKey = `${report.productId}`;
        const existingProduct = productMap.get(productKey);
        if (existingProduct) {
          existingProduct.defectCount++;
        } else {
          productMap.set(productKey, {
            productName: report.productName,
            defectCount: 1,
            supplierName: report.supplierName,
          });
        }

        severityCounts[report.severity as string] = (severityCounts[report.severity as string] || 0) + 1;
      }

      const suppliers: Record<string, unknown>[] = [];
      for (const [sid, supplierReports] of supplierMap) {
        const firstReport = supplierReports[0];
        const defectTypeCounts = new Map<string, number>();

        for (const r of supplierReports) {
          defectTypeCounts.set(r.defectType, (defectTypeCounts.get(r.defectType) || 0) + 1);
        }

        const topDefectTypes = [...defectTypeCounts.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([type, count]) => ({ type, count }));

        const severityOrder: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };
        const worstSeverity = supplierReports.reduce(
          (worst, r) => (severityOrder[r.severity as string] > severityOrder[worst as string] ? r.severity : worst),
          "low"
        );

        suppliers.push({
          supplierId: sid,
          supplierName: firstReport.supplierName,
          totalDefects: supplierReports.length,
          defectRate: reports.length > 0 ? supplierReports.length / reports.length : 0,
          topDefectTypes,
          severity: worstSeverity,
        });
      }

      suppliers.sort((a, b) => (b.totalDefects as number) - (a.totalDefects as number));

      const topDefectProducts = [...productMap.entries()]
        .sort((a, b) => b[1].defectCount - a[1].defectCount)
        .slice(0, 10)
        .map(([productId, data]) => ({ productId, ...data }));

      return NextResponse.json({
        suppliers,
        totalDefects: reports.length,
        overallDefectRate: reports.length,
        topDefectProducts,
        severityBreakdown: severityCounts,
      });
    }

    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db
      .collection("users").doc(uid).collection("defectReports")
      .orderBy("createdAt", "desc");

    if (supplierId) {
      query = query.where("supplierId", "==", supplierId);
    }

    const snap = await query.limit(100).get();
    const defects = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ defects });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch defects", details: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
  }
}, LIMITS.RETURNS);

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { action, ...data } = body;
    const db = await getAdminDB();

    if (action === "report") {
      const { productId, productName, supplierId, supplierName, orderId, defectType, description, severity, reportedBy } = data;
      if (!productId || !defectType || !description) {
        return NextResponse.json({ error: "productId, defectType, and description required" }, { status: 400 });
      }

      const ref = db.collection("users").doc(uid).collection("defectReports").doc();
      const report = {
        productId,
        productName: productName || "Unknown Product",
        supplierId: supplierId || "unknown",
        supplierName: supplierName || "Unknown Supplier",
        orderId: orderId || "",
        defectType,
        description,
        severity: severity || "medium",
        reportedBy: reportedBy || "customer",
        resolution: "pending",
        resolved: false,
        resolvedAt: null,
        createdAt: new Date().toISOString(),
      };

      await ref.set(report);
      return NextResponse.json({ id: ref.id, ...report, success: true });
    }

    if (action === "resolve") {
      const { defectId, resolution } = data;
      if (!defectId || !resolution) {
        return NextResponse.json({ error: "defectId and resolution required" }, { status: 400 });
      }

      const validResolutions = ["replacement_sent", "refund_issued", "supplier_claimed", "dismissed", "escalated"];
      if (!validResolutions.includes(resolution)) {
        return NextResponse.json({ error: "Invalid resolution" }, { status: 400 });
      }

      const ref = db.collection("users").doc(uid).collection("defectReports").doc(defectId);
      const doc = await ref.get();
      if (!doc.exists) {
        return NextResponse.json({ error: "Defect report not found" }, { status: 404 });
      }

      await ref.update({
        resolution,
        resolved: true,
        resolvedAt: new Date().toISOString(),
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process defect", details: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
  }
}, LIMITS.RETURNS);

export const PATCH = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { defectId, ...updates } = body;
    if (!defectId) {
      return NextResponse.json({ error: "defectId required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const ref = db.collection("users").doc(uid).collection("defectReports").doc(defectId);
    const doc = await ref.get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Defect not found" }, { status: 404 });
    }

    await ref.update(updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update defect", details: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
  }
}, LIMITS.RETURNS);
