import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";
import { rateLimitByUser, LIMITS } from "@/lib/rate-limit";

export async function verifyAuth(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.split("Bearer ")[1];
  if (!token) return null;
  try {
    const checkRevocation = process.env.CHECK_TOKEN_REVOCATION === "true";
    const decoded = await getAdminAuth().verifyIdToken(token, checkRevocation);
    return decoded.uid;
  } catch {
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

type RateLimitConfig = { windowMs: number; maxRequests: number };

export function withAuth(
  handler: (request: NextRequest, uid: string) => Promise<Response | NextResponse>,
  rateLimitConfig?: RateLimitConfig
) {
  return async (request: NextRequest): Promise<Response | NextResponse> => {
    const result = await requireAuth(request);
    if (result instanceof NextResponse) return result;

    const config = rateLimitConfig || LIMITS.DEFAULT;
    const userRl = rateLimitByUser(request, result.uid, config);
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

    const ownerRl = rateLimitByUser(request, result.uid, LIMITS.AUTH);
    if (!ownerRl.allowed) return ownerRl.response!;

    if (!(await isOwner(result.uid))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return handler(request, result.uid);
  };
}

let cachedOwnerUids: Set<string> | null = null;
let cachedOwnerUidsAt = 0;
const OWNER_CACHE_TTL_MS = 5 * 60 * 1000;

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

  // Resolve owner emails to UIDs via Firebase Admin
  if (ownerEmails.length > 0) {
    const now = Date.now();
    if (!cachedOwnerUids || now - cachedOwnerUidsAt > OWNER_CACHE_TTL_MS) {
      cachedOwnerUids = new Set<string>();
      cachedOwnerUidsAt = now;
      try {
        for (const email of ownerEmails) {
          const user = await getAdminAuth().getUserByEmail(email).catch(() => null);
          if (user) cachedOwnerUids.add(normalizeUid(user.uid));
        }
      } catch {
        // Leave cache empty — owner check falls through to false.
      }
    }

    if (cachedOwnerUids.has(directUid)) return true;
  }

  // Fallback: resolve the user's email from Firebase and check against hardcoded owner list
  try {
    const userRecord = await getAdminAuth().getUser(uid);
    if (userRecord.email) {
      const hardcodedOwnerEmails = ["trendaryo206@gmail.com"];
      if (hardcodedOwnerEmails.includes(userRecord.email.toLowerCase())) return true;
    }
  } catch {
    // ignore
  }

  return false;
}
