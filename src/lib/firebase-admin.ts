// Server-side only — never import this in client components
import { initializeApp, cert, getApps, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const crypto = require("crypto");

let adminDb: ReturnType<typeof getFirestore> | null = null;
let adminAuth: ReturnType<typeof getAuth> | null = null;
let initError: string | null = null;

/**
 * Use Node.js crypto to parse any PEM key and re-export a clean PKCS#8 PEM.
 * Node's crypto parser is much more lenient than jose's and handles PKCS#1,
 * PKCS#8, encrypted keys, and other edge-cases that jose rejects.
 */
function cleanPem(rawPem: string): string {
  try {
    const keyObject = crypto.createPrivateKey({ key: rawPem, format: "pem" });
    return keyObject.export({ type: "pkcs8", format: "pem" }) as string;
  } catch {
    // If PKCS#8 export fails, try PKCS#1 (RSA only)
    try {
      const keyObject = crypto.createPrivateKey({ key: rawPem, format: "pem" });
      return keyObject.export({ type: "pkcs1", format: "pem" }) as string;
    } catch {
      return rawPem;
    }
  }
}

/**
 * If the base64 body has extra bytes that make the DER longer than the
 * ASN.1 header declares, jose will reject it. Trim to the declared length.
 */
function trimDerTrailingBytes(pem: string): string {
  const match = pem.match(
    /-----BEGIN (?:RSA )?PRIVATE KEY-----\n([\s\S]+?)\n-----END (?:RSA )?PRIVATE KEY-----/
  );
  if (!match) return pem;

  const b64 = match[1].replace(/\s+/g, "");
  const der = Buffer.from(b64, "base64");
  if (der.length < 5) return pem;

  // Read ASN.1 SEQUENCE length (tag 0x30)
  if (der[0] !== 0x30) return pem;
  let lenBytes: number;
  let contentLen: number;
  const lenByte = der[1];
  if (lenByte < 0x80) {
    lenBytes = 1;
    contentLen = lenByte;
  } else {
    lenBytes = lenByte & 0x7f;
    contentLen = 0;
    for (let i = 0; i < lenBytes; i++) {
      contentLen = (contentLen << 8) | der[2 + i];
    }
    lenBytes += 1; // include the length-of-length byte
  }

  const expectedTotal = 1 + lenBytes + contentLen;
  if (der.length === expectedTotal) return pem;

  // Truncate to the expected DER length and rebuild PEM
  const trimmed = der.subarray(0, expectedTotal);
  const trimmedB64 = trimmed.toString("base64");
  const isRsa = pem.includes("BEGIN RSA PRIVATE KEY");
  const header = isRsa ? "-----BEGIN RSA PRIVATE KEY-----" : "-----BEGIN PRIVATE KEY-----";
  const footer = isRsa ? "-----END RSA PRIVATE KEY-----" : "-----END PRIVATE KEY-----";
  return `${header}\n${trimmedB64}\n${footer}\n`;
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
  const paddedB64 = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const isRSA = pk.includes("BEGIN RSA PRIVATE KEY");
  const header = isRSA ? "-----BEGIN RSA PRIVATE KEY-----" : "-----BEGIN PRIVATE KEY-----";
  const footer = isRSA ? "-----END RSA PRIVATE KEY-----" : "-----END PRIVATE KEY-----";
  const rawPem = `${header}\n${paddedB64}\n${footer}\n`;

  // Use Node.js crypto to parse and re-export a clean PEM.
  // This is more reliable than node-forge because Node's crypto uses
  // OpenSSL under the hood and handles many more PEM edge-cases.
  const cleanedPem = cleanPem(rawPem);
  // jose rejects PEMs whose DER has trailing bytes beyond the ASN.1 header length
  const repairedPem = trimDerTrailingBytes(cleanedPem);
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
