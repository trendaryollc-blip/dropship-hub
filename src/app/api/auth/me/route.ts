import { NextRequest, NextResponse } from "next/server";
import { withAuth, isOwner } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";

// GET — current signed-in user's role info (owner status only; never keys/secrets)
export const GET = withAuth(async (request: NextRequest, uid: string) => {
  const owner = await isOwner(uid);

  return NextResponse.json({ uid, isOwner: owner });
}, LIMITS.DEFAULT);
