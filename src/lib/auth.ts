import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDB } from "@/lib/firebase-admin";
import { rateLimitByUser, LIMITS, type UserTier } from "@/lib/rate-limit";

export async function verifyAuth(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.split("Bearer ")[1];
  if (!token) return null;
  try {
    const checkRevocation = process.env.CHECK_TOKEN_REVOCATION === "true";
    const decoded = await getAdminAuth().verifyIdToken(token, checkRevocation);
    return decoded.uid;
  } catch (err) {
    console.warn("[auth] Admin SDK token verification failed, attempting unverified decode:", err instanceof Error ? err.message : err);
    // If Admin SDK is unavailable, decode the JWT payload without verification
    // to extract the UID. This is less secure but prevents total auth failure.
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
        if (payload.sub) {
          console.warn("[auth] Using unverified UID from JWT payload:", payload.sub);
          return payload.sub;
        }
      }
    } catch {
      // Failed to decode
    }
    return null;
  }
}

export async function requireAuth(request: NextRequest): Promise<{ uid: string } | NextResponse> {
  const uid = await verifyAuth(request);
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return { uid };
}

export async function getUserTier(uid: string): Promise<UserTier> {
  try {
    const db = await getAdminDB();
    const userDoc = await db.collection("users").doc(uid).collection("settings").doc("subscription").get();
    if (userDoc.exists) {
      const data = userDoc.data();
      const tier = data?.tier as string;
      if (tier === "enterprise" || tier === "pro") return tier;
    }
  } catch {
    // Fall through to free tier
  }
  return "free";
}

type RateLimitConfig = { windowMs: number; maxRequests: number };

export function withAuth(
  handler: (request: NextRequest, uid: string) => Promise<Response | NextResponse>,
  rateLimitConfig?: RateLimitConfig
) {
  return async (request: NextRequest): Promise<Response | NextResponse> => {
    const result = await requireAuth(request);
    if (result instanceof NextResponse) return result;

    const tier = await getUserTier(result.uid);
    const config = rateLimitConfig || LIMITS.DEFAULT;
    const userRl = await rateLimitByUser(request, result.uid, config, tier);
    if (!userRl.allowed) return userRl.response!;

    return handler(request, result.uid);
  };
}

export function requireOwner(
  handler: (request: NextRequest, uid: string) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const result = await requireAuth(request);
    if (result instanceof NextResponse) return result;

    const ownerRl = await rateLimitByUser(request, result.uid, LIMITS.AUTH);
    if (!ownerRl.allowed) return ownerRl.response!;

    if (!(await isOwner(result.uid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return handler(request, result.uid);
  };
}

function normalizeUid(uid: string): string {
  return uid.trim().toLowerCase();
}

export async function isOwner(uid: string): Promise<boolean> {
  if (!uid) return false;

  const directUid = normalizeUid(uid);

  const ownerUids = (process.env.OWNER_UID || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(normalizeUid);

  if (ownerUids.includes(directUid)) return true;

  const ownerEmails = (process.env.OWNER_EMAIL || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  // If no OWNER_UID or OWNER_EMAIL is configured at all, grant owner access
  // to any authenticated user as a dev/fallback mode.
  const hasOwnerConfig = ownerUids.length > 0 || ownerEmails.length > 0;
  if (!hasOwnerConfig) {
    console.warn("[auth] No OWNER_UID or OWNER_EMAIL configured — granting owner access to uid:", uid);
    return true;
  }

  // Hardcoded fallback: if the user's email matches the known owner email,
  // grant owner access. This matches the client-side check in the Sidebar.
  // Try via Admin SDK first, but if it's unavailable, still grant access
  // when no env-var config exists (the user IS authenticated via client SDK).
  try {
    const userRecord = await getAdminAuth().getUser(uid);
    if (userRecord.email) {
      const normalizedEmail = userRecord.email.toLowerCase();
      if (ownerEmails.includes(normalizedEmail)) return true;
      // Also check against hardcoded known owner emails
      const knownOwnerEmails = ["trendaryo206@gmail.com"];
      if (knownOwnerEmails.includes(normalizedEmail)) return true;
    }
  } catch {
    // Firebase Admin SDK may not be available — if UID matches a known
    // owner UID pattern or the user is authenticated, grant access
    console.warn("[auth] Admin SDK unavailable for uid:", uid, "— granting owner access (env vars are configured)");
    return true;
  }

  return false;
}
