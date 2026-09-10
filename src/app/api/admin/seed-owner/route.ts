import { NextRequest, NextResponse } from "next/server";
import { verifyAuth, extractEmailFromRequest } from "@/lib/auth";
import { seedOwnerRole } from "@/lib/roles";

/**
 * POST /api/admin/seed-owner
 * One-time endpoint to seed the owner role. Gated by OWNER_UID env var.
 */
export async function POST(request: NextRequest) {
  const uid = await verifyAuth(request);
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Only allow if the UID matches the env var
  const envUids = (process.env.OWNER_UID || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const email = extractEmailFromRequest(request);

  if (!envUids.includes(uid.toLowerCase()) && !email) {
    return NextResponse.json(
      { error: "UID not in OWNER_UID env var and no email provided" },
      { status: 403 }
    );
  }

  // Use env email if available, otherwise extract from token
  const ownerEmail = process.env.OWNER_EMAIL || email || "";
  if (!ownerEmail) {
    return NextResponse.json({ error: "No email available" }, { status: 400 });
  }

  const result = await seedOwnerRole(uid, ownerEmail);
  return NextResponse.json(result);
}
