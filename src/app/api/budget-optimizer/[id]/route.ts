import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { updateBudgetRecommendation } from "@/lib/data/budget-recommendations";

export const PATCH = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const id = request.nextUrl.pathname.split("/").pop();
    if (!id) return NextResponse.json({ error: "Missing recommendation ID" }, { status: 400 });

    const body = await request.json();
    const { status } = body as { status?: string };

    if (!status || !["accepted", "rejected"].includes(status)) {
      return NextResponse.json({ error: "Status must be 'accepted' or 'rejected'" }, { status: 400 });
    }

    await updateBudgetRecommendation(uid, id, { status: status as "accepted" | "rejected" });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update recommendation", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});
