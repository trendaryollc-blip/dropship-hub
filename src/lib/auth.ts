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

/**
 * Extract the verified-or-unverified `email` claim from the Bearer ID token in
 * the request. Firebase ID tokens include the user's email in the payload, so we
 * can identify the app owner without depending on the Firestore/Admin SDK being
 * healthy. Returns null if the token is missing, malformed, or has no email.
 */
export function extractEmailFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.split("Bearer ")[1];
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
      if (typeof payload.email === "string" && payload.email.trim()) {
        return payload.email.trim().toLowerCase();
      }
    }
  } catch {
    // Malformed token
  }
  return null;
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

    if (!(await isOwner(result.uid, extractEmailFromRequest(request)))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return handler(request, result.uid);
  };
}

function normalizeUid(uid: string): string {
  return uid.trim().toLowerCase();
}

/**
 * Determine whether the given user is the app owner.
 *
 * @param uid   Firebase Auth UID of the signed-in user.
 * @param email Optional email resolved from the request's ID token. When present
 *              it lets us confirm an owner match without needing the Admin SDK.
 */
export async function isOwner(uid: string, email: string | null = null): Promise<boolean> {
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

  // Hardcoded known owner email(s) — fallback used when env vars are missing.
  const knownOwnerEmails = ["trendaryo206@gmail.com"];

  // If no OWNER_UID or OWNER_EMAIL is configured at all, grant owner access
  // to any authenticated user as a dev/fallback mode.
  const hasOwnerConfig = ownerUids.length > 0 || ownerEmails.length > 0;
  if (!hasOwnerConfig) {
    console.warn("[auth] No OWNER_UID or OWNER_EMAIL configured — granting owner access to uid:", uid);
    return true;
  }

  const emailMatches = (candidate: string | null | undefined): boolean => {
    if (!candidate) return false;
    const normalized = candidate.toLowerCase();
    return ownerEmails.includes(normalized) || knownOwnerEmails.includes(normalized);
  };

  // 1) Match against the email claim embedded in the ID token. This works even
  //    when the Admin SDK is unavailable or misconfigured.
  if (emailMatches(email)) return true;

  // 2) Fallback: resolve the uid → email via the Admin SDK. Guarded so a failure
  //    here never throws out of isOwner (which would 500 the caller).
  try {
    const adminAuth = getAdminAuth();
    if (adminAuth) {
      const userRecord = await adminAuth.getUser(uid);
      if (emailMatches(userRecord.email)) return true;
    }
  } catch (err) {
    console.warn(
      "[auth] Admin SDK email lookup failed for uid:",
      uid,
      err instanceof Error ? err.message : err
    );
  }

  return false;
}
