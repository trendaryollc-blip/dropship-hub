import type { getAdminDB } from "@/lib/firebase-admin";

/** Admin Firestore handle type, shared by the supplier persistence helpers. */
export type AdminDB = Awaited<ReturnType<typeof getAdminDB>>;

/** Firestore doc ids cannot contain "/". Supplier/product ids may. */
export function sanitizeKey(id: string): string {
  return id.replace(/\//g, "__SLASH__") || "unknown";
}
