// Server-side only — never import this in client components
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

let adminDb: ReturnType<typeof getFirestore> | null = null;
let adminAuth: ReturnType<typeof getAuth> | null = null;

function getServiceAccount() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!json) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT environment variable is not set");
  }
  try {
    return JSON.parse(json);
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT contains invalid JSON");
  }
}

function ensureApp() {
  if (getApps().length === 0) {
    const serviceAccount = getServiceAccount();
    initializeApp({ credential: cert(serviceAccount) });
  }
}

export async function getAdminDB() {
  if (adminDb) return adminDb;
  ensureApp();
  adminDb = getFirestore();
  return adminDb;
}

export function getAdminAuth() {
  if (adminAuth) return adminAuth;
  ensureApp();
  adminAuth = getAuth();
  return adminAuth;
}
