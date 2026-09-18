import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { runComplianceCheck } from "@/lib/compliance";
import {
  addComplianceCheck,
  getComplianceChecks,
  getComplianceCheckById,
  deleteComplianceCheck,
  getComplianceStats,
} from "@/lib/data/compliance";
import { ComplianceCheckInputSchema } from "@/lib/data/schemas";
import type { ComplianceCheckInput, BatchComplianceInput } from "@/types/compliance";
import { safeErrorMessage } from "@/lib/api-errors";

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();

    if (body.type === "batch" && Array.isArray(body.products)) {
      const batchInput = body as BatchComplianceInput;
      const reports: unknown[] = [];
      let passed = 0;
      let warnings = 0;
      let violations = 0;
      let blocked = 0;

      for (const product of batchInput.products) {
        const parsed = ComplianceCheckInputSchema.safeParse(product);
        if (!parsed.success) {
          reports.push({
            success: false,
            error: "Invalid input",
            details: parsed.error.flatten().fieldErrors,
            product,
          });
          continue;
        }

        const input: ComplianceCheckInput = parsed.data;
        const report = runComplianceCheck(input);

        const docId = await addComplianceCheck(uid, {
          productTitle: report.productTitle,
          productImage: report.productImage,
          productUrl: report.productUrl,
          category: report.category,
          overallScore: report.overallScore,
          riskLevel: report.riskLevel,
          canList: report.canList,
          checkTypes: input.checkTypes,
          flagCount: report.flags.length,
          violationCount: report.flags.filter(
            (f) => f.severity === "violation" || f.severity === "critical"
          ).length,
          inputs: product as unknown as Record<string, unknown>,
          report,
        });

        report.id = docId || "";
        reports.push({ success: true, report });

        if (!report.canList) blocked++;
        else if (report.riskLevel === "high") violations++;
        else if (report.riskLevel === "medium") warnings++;
        else passed++;
      }

      return NextResponse.json({
        success: true,
        reports,
        summary: {
          total: batchInput.products.length,
          passed,
          warnings,
          violations,
          blocked,
        },
      });
    }

    const parsed = ComplianceCheckInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const input: ComplianceCheckInput = parsed.data;
    const report = runComplianceCheck(input);

    const docId = await addComplianceCheck(uid, {
      productTitle: report.productTitle,
      productImage: report.productImage,
      productUrl: report.productUrl,
      category: report.category,
      overallScore: report.overallScore,
      riskLevel: report.riskLevel,
      canList: report.canList,
      checkTypes: input.checkTypes,
      flagCount: report.flags.length,
      violationCount: report.flags.filter(
        (f) => f.severity === "violation" || f.severity === "critical"
      ).length,
      inputs: body as unknown as Record<string, unknown>,
      report,
    });

    report.id = docId || "";

    return NextResponse.json({ success: true, report });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Compliance check failed") },
      { status: 500 }
    );
  }
});

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "list";

    if (type === "stats") {
      const stats = await getComplianceStats(uid);
      return NextResponse.json({ stats });
    }

    if (type === "detail") {
      const id = searchParams.get("id");
      if (!id) {
        return NextResponse.json({ error: "ID is required" }, { status: 400 });
      }
      const check = await getComplianceCheckById(uid, id);
      if (!check) {
        return NextResponse.json({ error: "Check not found" }, { status: 404 });
      }
      return NextResponse.json({ check });
    }

    if (type === "export") {
      const format = searchParams.get("format") || "json";
      const checks = await getComplianceChecks(uid, 1000);

      if (format === "csv") {
        const headers = [
          "Product Title",
          "Category",
          "Score",
          "Risk Level",
          "Can List",
          "Flags",
          "Date",
        ];
        const escapeCSV = (value: string) => {
          if (value.includes(",") || value.includes('"') || value.includes("\n")) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        };

        const rows = checks.map((check) => [
          escapeCSV(check.productTitle || ""),
          escapeCSV(check.category || ""),
          String(check.overallScore ?? ""),
          escapeCSV(check.riskLevel || ""),
          check.canList ? "Yes" : "No",
          String(check.flagCount ?? 0),
          check.createdAt ? new Date(check.createdAt as unknown as string | number).toISOString() : "",
        ]);

        const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

        return new NextResponse(csv, {
          status: 200,
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": 'attachment; filename="compliance-export.csv"',
          },
        });
      }

      return new NextResponse(JSON.stringify(checks), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": 'attachment; filename="compliance-export.json"',
        },
      });
    }

    const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);
    const checks = await getComplianceChecks(uid, limit);
    return NextResponse.json({ checks });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to fetch compliance data") },
      { status: 500 }
    );
  }
});

export const DELETE = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const deleted = await deleteComplianceCheck(uid, id);
    if (!deleted) {
      return NextResponse.json({ error: "Check not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: safeErrorMessage(error, "Failed to delete") },
      { status: 500 }
    );
  }
});
