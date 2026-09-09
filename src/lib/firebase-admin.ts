// Server-side only — never import this in client components
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

let adminDb: ReturnType<typeof getFirestore> | null = null;
let adminAuth: ReturnType<typeof getAuth> | null = null;
let initError: string | null = null;

function getServiceAccount() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!json) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT environment variable is not set. " +
      "Go to Vercel Dashboard → Settings → Environment Variables and add the full service-account JSON."
    );
  }
  try {
    return JSON.parse(json);
  } catch {
    // Vercel's env var field can corrupt \n inside JSON string values by
    // converting them to real newlines.  Try to repair the most common case:
    // restore literal \n inside the private_key value so JSON.parse succeeds.
    try {
      const repaired = json.replace(
        /("(?:private_key|privateKey)"\s*:\s*")([\s\S]*?)("\s*[,}])/g,
        (_match, prefix: string, key: string, suffix: string) => {
          const fixedKey = key.replace(/\n/g, "\\n");
          return `${prefix}${fixedKey}${suffix}`;
        }
      );
      return JSON.parse(repaired);
    } catch (repairErr) {
      const snippet = json.slice(0, 120);
      console.error(
        "[firebase-admin] FIREBASE_SERVICE_ACCOUNT JSON parse failed.",
        "First 120 chars:", snippet,
        "Repair attempt error:", repairErr instanceof Error ? repairErr.message : repairErr
      );
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT contains invalid JSON. " +
        "In Vercel, paste the ENTIRE service-account JSON as a single-line value. " +
        "Make sure there are no stray line breaks outside the private_key field."
      );
    }
  }
}

function ensureApp() {
  if (getApps().length === 0) {
    try {
      const serviceAccount = getServiceAccount();
      initializeApp({ credential: cert(serviceAccount) });
    } catch (err) {
      initError = err instanceof Error ? err.message : String(err);
      console.error("[firebase-admin] Failed to initialize Firebase Admin SDK:", initError);
    }
  }
}

export async function getAdminDB() {
  if (adminDb) return adminDb;
  ensureApp();
  if (initError) throw new Error(`Firebase Admin SDK not available: ${initError}`);
  adminDb = getFirestore();
  return adminDb;
}

export function getAdminAuth() {
  if (adminAuth) return adminAuth;
  ensureApp();
  if (initError) throw new Error(`Firebase Admin SDK not available: ${initError}`);
  adminAuth = getAuth();
  return adminAuth;
}

/**
 * Check if Firebase Admin SDK is properly configured.
 * Returns a descriptive error string if misconfigured, or null if healthy.
 */
export function checkAdminHealth(): string | null {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!json) return "FIREBASE_SERVICE_ACCOUNT is not set";
  try {
    JSON.parse(json);
    return null;
  } catch {
    try {
      const repaired = json.replace(
        /("(?:private_key|privateKey)"\s*:\s*")([\s\S]*?)("\s*[,}])/g,
        (_m, p: string, k: string, s: string) => `${p}${k.replace(/\n/g, "\\n")}${s}`
      );
      JSON.parse(repaired);
      return null;
    } catch {
      return "FIREBASE_SERVICE_ACCOUNT contains invalid JSON";
    }
  }
}
