import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { deleteAdConnection } from "@/lib/data/ad-connections";

export const DELETE = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const id = request.nextUrl.pathname.split("/").pop();
    if (!id) return NextResponse.json({ error: "Missing connection ID" }, { status: 400 });

    await deleteAdConnection(uid, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete connection", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});
