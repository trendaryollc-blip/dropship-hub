// Server-side only — never import this in client components
import { initializeApp, cert, getApps, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

let adminDb: ReturnType<typeof getFirestore> | null = null;
let adminAuth: ReturnType<typeof getAuth> | null = null;
let initError: string | null = null;

/**
 * Use node-forge (bundled with firebase-admin) to parse and re-export a clean PEM.
 * This handles any DER corruption that simple string repair cannot fix.
 */
function reEncodePrivateKey(pem: string): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const forge = require("node-forge");
  const result = forge.pki.privateKeyFromPem(pem);
  return forge.pki.privateKeyToPem(result);
}

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
    try {
      const fixed = raw.replace(
        /"([^"]+)"\s*:\s*"([^"]*)"/g,
        (_m, key: string, val: string) => `"${key}":"${val.replace(/\n/g, "\\n")}"`
      );
      obj = JSON.parse(fixed);
    } catch {
      try {
        obj = JSON.parse(raw.replace(/[\r\n]+/g, " ").replace(/\s{2,}/g, " "));
      } catch {
        throw new Error(
          "FIREBASE_SERVICE_ACCOUNT is not valid JSON. Re-download from Firebase Console → Project Settings → Service Accounts."
        );
      }
    }
  }

  // --- repair the private key PEM ---
  let pk = obj.private_key as string | undefined;
  if (!pk || typeof pk !== "string") {
    throw new Error("Service account JSON is missing the private_key field.");
  }

  // Convert escaped \n to real newlines
  pk = pk.replace(/\\n/g, "\n");

  // Extract PEM between BEGIN/END markers
  const pemMatch = pk.match(
    /-----BEGIN (?:RSA )?PRIVATE KEY-----\s*([\s\S]*?)\s*-----END (?:RSA )?PRIVATE KEY-----/
  );
  if (!pemMatch) {
    throw new Error("Private key does not contain valid PEM header/footer.");
  }

  const b64 = pemMatch[1].replace(/\s+/g, "");
  const isRSA = pk.includes("BEGIN RSA PRIVATE KEY");
  const header = isRSA ? "-----BEGIN RSA PRIVATE KEY-----" : "-----BEGIN PRIVATE KEY-----";
  const footer = isRSA ? "-----END RSA PRIVATE KEY-----" : "-----END PRIVATE KEY-----";
  let repairedPem = `${header}\n${b64}\n${footer}\n`;

  // Try node-forge re-encoding — this validates and re-exports a clean PEM
  // that jose/google-auth-library can always parse.
  try {
    repairedPem = reEncodePrivateKey(repairedPem);
    console.log("[firebase-admin] Private key re-encoded via node-forge");
  } catch (forgeErr) {
    console.warn(
      "[firebase-admin] node-forge re-encode failed, using raw PEM:",
      forgeErr instanceof Error ? forgeErr.message : forgeErr
    );
  }

  obj.private_key = repairedPem;
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
