import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { validateBody } from "@/lib/validation";
import { getAdConnections, addAdConnection } from "@/lib/data/ad-connections";
import { AddAdConnectionInputSchema } from "@/lib/data/schemas";

export const GET = withAuth(async (_request: NextRequest, uid: string) => {
  try {
    const connections = await getAdConnections(uid);
    return NextResponse.json({ connections });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch connections", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const validation = validateBody(AddAdConnectionInputSchema, body);
    if (!validation.success) return validation.response;

    const connectionId = await addAdConnection(uid, validation.data);
    return NextResponse.json({ success: true, id: connectionId });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to save connection", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});
