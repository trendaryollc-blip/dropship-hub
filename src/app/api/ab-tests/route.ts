import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { validateBody } from "@/lib/validation";
import { getABTests, addABTest } from "@/lib/data/ab-tests";
import { AddABTestInputSchema } from "@/lib/data/schemas";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    let tests = await getABTests(uid);

    if (status && status !== "all") {
      tests = tests.filter((t) => t.status === status);
    }

    return NextResponse.json({ tests });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch A/B tests", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const validation = validateBody(AddABTestInputSchema, body);
    if (!validation.success) return validation.response;

    const testId = await addABTest(uid, validation.data);
    return NextResponse.json({ success: true, id: testId });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create A/B test", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});
