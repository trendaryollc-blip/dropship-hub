import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { updateABTest, getABTests } from "@/lib/data/ab-tests";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const id = request.nextUrl.pathname.split("/").pop();
    if (!id) return NextResponse.json({ error: "Missing test ID" }, { status: 400 });

    const tests = await getABTests(uid);
    const test = tests.find((t) => t.id === id);
    if (!test) return NextResponse.json({ error: "Test not found" }, { status: 404 });

    return NextResponse.json({ test });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch test", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

export const PATCH = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const id = request.nextUrl.pathname.split("/").pop();
    if (!id) return NextResponse.json({ error: "Missing test ID" }, { status: 400 });

    const body = await request.json();
    await updateABTest(uid, id, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update test", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});
