// Server-side only — never import this in client components
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

let adminDb: ReturnType<typeof getFirestore> | null = null;

export async function getAdminDB() {
  if (adminDb) return adminDb;

  if (getApps().length === 0) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}");
    initializeApp({ credential: cert(serviceAccount) });
  }

  adminDb = getFirestore();
  return adminDb;
}
