import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getSupplierById } from "@/lib/supplier-service";
import { getDueDiligence, saveDueDiligence, isDueDiligenceFresh } from "@/lib/data/supplier-due-diligence";
import { generateDueDiligenceReport } from "@/lib/ai/due-diligence";
import { GenerateDueDiligenceInputSchema } from "@/lib/data/schemas";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  const { searchParams } = new URL(request.url);
  const supplierId = searchParams.get("supplierId");

  if (!supplierId) {
    return NextResponse.json({ error: "supplierId is required" }, { status: 400 });
  }

  const existing = await getDueDiligence(uid, supplierId);
  if (existing) {
    const isFresh = await isDueDiligenceFresh(uid, supplierId);
    return NextResponse.json({ report: existing, cached: true, fresh: isFresh });
  }

  return NextResponse.json({ report: null, cached: false });
});

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  let input;
  try {
    const body = await request.json();
    input = GenerateDueDiligenceInputSchema.parse(body);
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json({ error: "Invalid input", details: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {

    // Check cache first (unless force refresh)
    if (!input.forceRefresh) {
      const fresh = await isDueDiligenceFresh(uid, input.supplierId);
      if (fresh) {
        const existing = await getDueDiligence(uid, input.supplierId);
        if (existing) {
          return NextResponse.json({ report: existing, cached: true });
        }
      }
    }

    // Get supplier data
    const supplier = await getSupplierById(input.supplierId);
    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    // Generate report via AI
    const { report, provider } = await generateDueDiligenceReport(supplier);

    // Set timestamps
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const fullReport = {
      ...report,
      generatedAt: now.toISOString(),
      expiresAt,
    };

    // Save to Firestore
    await saveDueDiligence(uid, input.supplierId, fullReport);

    return NextResponse.json({ report: fullReport, provider, cached: false });
  } catch (error) {
    console.error("Due diligence generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate due diligence report" },
      { status: 500 }
    );
  }
});
