import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth, getAdminDB } from "@/lib/firebase-admin";
import { rateLimitByUser, LIMITS, type UserTier } from "@/lib/rate-limit";

export async function verifyAuth(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.split("Bearer ")[1];
  if (!token) return null;

  // Try Admin SDK verification first
  const adminAuth = getAdminAuth();
  if (adminAuth) {
    try {
      const checkRevocation = process.env.CHECK_TOKEN_REVOCATION === "true";
      const decoded = await adminAuth.verifyIdToken(token, checkRevocation);
      return decoded.uid;
    } catch (err) {
      console.warn("[auth] Admin SDK token verification failed, attempting unverified decode:", err instanceof Error ? err.message : err);
    }
  } else {
    console.warn("[auth] Firebase Admin Auth unavailable — falling back to unverified JWT decode");
  }

  // Fallback: decode JWT payload without verification
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

export async function requireAuth(request: NextRequest): Promise<{ uid: string } | NextResponse> {
  const uid = await verifyAuth(request);
  if (!uid) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return { uid };
}

export async function getUserTier(uid: string): Promise<UserTier> {
  const db = await getAdminDB();
  if (!db) return "free";
  try {
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
  const adminAuth = getAdminAuth();
  if (adminAuth) {
    try {
      const userRecord = await adminAuth.getUser(uid);
      if (userRecord.email) {
        const normalizedEmail = userRecord.email.toLowerCase();
        if (ownerEmails.includes(normalizedEmail)) return true;
        // Also check against hardcoded known owner emails
        const knownOwnerEmails = ["trendaryo206@gmail.com"];
        if (knownOwnerEmails.includes(normalizedEmail)) return true;
      }
    } catch (err) {
      console.warn("[auth] Admin SDK getUser failed for uid:", uid, ":", err instanceof Error ? err.message : err);
    }
  } else {
    console.warn("[auth] Admin SDK unavailable for uid:", uid, "— falling back to env-var/email checks only");
  }

  // If env vars are configured but Admin SDK is unavailable, we can't verify
  // the email via Admin SDK, so rely on what we've already checked (direct UID match).
  // If no env config exists, grant access as dev fallback (handled above).
  return false;
}
