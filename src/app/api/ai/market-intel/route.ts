import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";

const NOTICE = "Market intel needs a live shopping results source (SerpAPI) — not connected";

export const GET = withAuth(async (_req: NextRequest, _uid: string) => {
  try {
    return NextResponse.json({
      trending: [],
      alerts: [],
      signals: [],
      source: "unavailable",
      notice: NOTICE,
    });
  } catch {
    return NextResponse.json({ trending: [], alerts: [], signals: [], source: "unavailable", notice: NOTICE });
  }
}, LIMITS.AI_CHAT);
