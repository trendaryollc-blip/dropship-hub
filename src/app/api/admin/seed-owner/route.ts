import { NextRequest, NextResponse } from "next/server";
import { verifyAuth } from "@/lib/auth";
import { rateLimitByUser, LIMITS } from "@/lib/rate-limit";
import { seedOwnerRole } from "@/lib/roles";

/**
 * POST /api/admin/seed-owner
 * One-time endpoint to seed the owner role. STRICTLY gated by the OWNER_UID
 * env var: the caller's Firebase UID must exactly match. Email claims are
 * intentionally NOT accepted — every authenticated user has one, so
 * accepting an email as an alternative would let the first user who hits
 * this endpoint claim ownership of a fresh database.
 */
export async function POST(request: NextRequest) {
  const uid = await verifyAuth(request);
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Brute-force protection — the AUTH limit is the strictest bucket.
  const rl = await rateLimitByUser(request, uid, LIMITS.AUTH);
  if (!rl.allowed) return rl.response!;

  const envUids = (process.env.OWNER_UID || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (!envUids.includes(uid.trim().toLowerCase())) {
    return NextResponse.json(
      { error: "Forbidden — caller UID is not the configured OWNER_UID" },
      { status: 403 }
    );
  }

  const ownerEmail = process.env.OWNER_EMAIL || "";
  if (!ownerEmail) {
    return NextResponse.json({ error: "OWNER_EMAIL env var is not set" }, { status: 400 });
  }

  const result = await seedOwnerRole(uid, ownerEmail);
  return NextResponse.json(result);
}
