// Server-side only — never import this in client components
import { initializeApp, cert, getApps, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

let adminDb: ReturnType<typeof getFirestore> | null = null;
let adminAuth: ReturnType<typeof getAuth> | null = null;
let initError: string | null = null;

/**
 * Build a ServiceAccount from the raw JSON env var, repairing common
 * Vercel env-var corruptions along the way.
 */
function buildServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT is not set. Go to Vercel → Settings → Environment Variables."
    );
  }

  // --- try parsing as-is first ---
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(raw);
  } catch {
    // Vercel may convert \n inside JSON strings to real newlines.
    // Strategy: rebuild the JSON by finding key:value pairs with a regex.
    try {
      const fixed = raw
        // collapse real newlines inside string values by matching key:value pairs
        .replace(/"([^"]+)"\s*:\s*"([^"]*)"/g, (_m, key: string, val: string) => {
          return `"${key}":"${val.replace(/\n/g, "\\n")}"`;
        });
      obj = JSON.parse(fixed);
    } catch {
      // last-ditch: strip all newlines and collapse whitespace
      try {
        obj = JSON.parse(raw.replace(/[\r\n]+/g, " ").replace(/\s{2,}/g, " "));
      } catch (e) {
        throw new Error(
          `FIREBASE_SERVICE_ACCOUNT is not valid JSON. ` +
          `Re-download the JSON from Firebase Console → Project Settings → Service Accounts → Generate new private key, ` +
          `and paste the entire single-line JSON into the Vercel env var.`
        );
      }
    }
  }

  // --- repair the private key PEM ---
  let pk = obj.private_key as string | undefined;
  if (!pk || typeof pk !== "string") {
    throw new Error("Service account JSON is missing the private_key field.");
  }

  // Convert any escaped \n to real newlines
  pk = pk.replace(/\\n/g, "\n");

  // Extract the base64 payload between BEGIN and END markers
  const pemMatch = pk.match(
    /-----BEGIN (?:RSA )?PRIVATE KEY-----\s*([\s\S]*?)\s*-----END (?:RSA )?PRIVATE KEY-----/
  );
  if (!pemMatch) {
    throw new Error(
      "Private key does not contain valid PEM header/footer. " +
      "Re-download the service account JSON from Firebase Console."
    );
  }

  // Strip all whitespace / line breaks from the base64, then re-chunk to 64-char lines
  const b64 = pemMatch[1].replace(/\s+/g, "");
  const chunked = b64.match(/.{1,64}/g)?.join("\n") || b64;
  const header = pk.includes("BEGIN RSA PRIVATE KEY")
    ? "-----BEGIN RSA PRIVATE KEY-----"
    : "-----BEGIN PRIVATE KEY-----";
  const footer = pk.includes("END RSA PRIVATE KEY")
    ? "-----END RSA PRIVATE KEY-----"
    : "-----END PRIVATE KEY-----";

  obj.private_key = `${header}\n${chunked}\n${footer}\n`;

  console.log("[firebase-admin] Service account loaded, project:", obj.project_id);

  return obj as unknown as ServiceAccount;
}

function ensureApp() {
  if (getApps().length === 0) {
    try {
      const serviceAccount = buildServiceAccount();
      initializeApp({ credential: cert(serviceAccount) });
      console.log("[firebase-admin] Firebase Admin SDK initialized successfully");
    } catch (err) {
      initError = err instanceof Error ? err.message : String(err);
      console.error("[firebase-admin] Failed to initialize:", initError);
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

export function checkAdminHealth(): string | null {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!json) return "FIREBASE_SERVICE_ACCOUNT is not set";
  try {
    buildServiceAccount();
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "FIREBASE_SERVICE_ACCOUNT is invalid";
  }
}
