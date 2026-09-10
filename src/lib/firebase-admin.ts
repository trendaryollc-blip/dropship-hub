// Server-side only — never import this in client components
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

let adminDb: ReturnType<typeof getFirestore> | null = null;
let adminAuth: ReturnType<typeof getAuth> | null = null;
let initError: string | null = null;

function repairPrivateKey(pem: string): string {
  // Step 1: Convert literal \n sequences to actual newlines
  const normalized = pem.replace(/\\n/g, "\n");

  // Step 2: Split into lines, trim, filter empties
  const lines = normalized.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Step 3: Find PEM boundaries
  const header = lines.find((l) => l.startsWith("-----BEGIN"));
  const footer = lines.find((l) => l.startsWith("-----END"));
  if (!header || !footer) {
    console.error("[firebase-admin] PEM header/footer not found in private_key");
    return pem;
  }

  const headerIdx = lines.indexOf(header);
  const footerIdx = lines.indexOf(footer);
  const base64Lines = lines
    .slice(headerIdx + 1, footerIdx)
    .join("")
    .match(/.{1,64}/g) || [];

  const result = [header, ...base64Lines, footer].join("\n") + "\n";

  console.log("[firebase-admin] Private key repaired successfully");
  return result;
}

function getServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT environment variable is not set. " +
      "Go to Vercel Dashboard → Settings → Environment Variables and add the full service-account JSON."
    );
  }

  // Step 1: Try parsing as-is
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Step 2: Vercel can corrupt \n inside JSON strings by converting them to
    // real newlines. Try to repair by collapsing newlines inside all string values.
    try {
      const repaired = raw.replace(
        /("(?:private_key|private_key_id|client_email|client_id|token_uri|type)"\s*:\s*")([\s\S]*?)("\s*[,}])/g,
        (_match, prefix: string, value: string, suffix: string) => {
          return `${prefix}${value.replace(/\n/g, "\\n")}${suffix}`;
        }
      );
      parsed = JSON.parse(repaired);
    } catch {
      // Step 3: More aggressive — collapse ALL newlines between quotes
      try {
        const aggressivelyRepaired = raw
          .replace(/\n/g, " ")
          .replace(/\s{2,}/g, " ");
        parsed = JSON.parse(aggressivelyRepaired);
      } catch (repairErr) {
        console.error("[firebase-admin] FIREBASE_SERVICE_ACCOUNT JSON parse failed.", repairErr);
        throw new Error(
          "FIREBASE_SERVICE_ACCOUNT contains invalid JSON. " +
          "In Vercel, paste the ENTIRE service-account JSON as a single-line value."
        );
      }
    }
  }

  // Step 4: Repair the private_key PEM if present
  const pk = parsed.private_key;
  if (pk && typeof pk === "string") {
    const originalLength = pk.length;
    parsed.private_key = repairPrivateKey(pk);
    console.log(`[firebase-admin] Private key: ${originalLength} → ${(parsed.private_key as string).length} chars`);
  } else {
    console.error("[firebase-admin] No private_key found in service account JSON");
  }

  return parsed;
}

function ensureApp() {
  if (getApps().length === 0) {
    try {
      const serviceAccount = getServiceAccount();
      initializeApp({ credential: cert(serviceAccount as Record<string, string>) });
      console.log("[firebase-admin] Firebase Admin SDK initialized successfully");
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
    getServiceAccount();
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "FIREBASE_SERVICE_ACCOUNT is invalid";
  }
}
