import { getAdminDB } from "@/lib/firebase-admin";

export type UserRole = "owner" | "admin" | "user";

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  createdAt: string;
  lastActiveAt: string;
  banned: boolean;
  tier: string;
}

/**
 * Get a user's role from Firestore.
 * Falls back to "user" if the document doesn't exist or Admin SDK is unavailable.
 */
export async function getUserRole(uid: string): Promise<UserRole> {
  try {
    const db = await getAdminDB();
    if (!db) return "user";
    const userDoc = await db.collection("users").doc(uid).get();
    if (userDoc.exists) {
      const data = userDoc.data();
      const role = data?.role as string;
      if (role === "owner" || role === "admin") return role;
    }
  } catch {
    // Fall through to "user"
  }
  return "user";
}

/**
 * Check if a user has admin or owner privileges.
 */
export async function isAdmin(uid: string): Promise<boolean> {
  const role = await getUserRole(uid);
  return role === "owner" || role === "admin";
}

/**
 * Check if a user is the owner.
 */
export async function isOwnerRole(uid: string): Promise<boolean> {
  const role = await getUserRole(uid);
  return role === "owner";
}

/**
 * Get full user profile from Firestore.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const db = await getAdminDB();
    if (!db) return null;
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) return null;
    const data = userDoc.data()!;
    return {
      uid,
      email: data.email ?? null,
      displayName: data.displayName ?? null,
      role: (data.role as UserRole) || "user",
      createdAt: data.createdAt ?? "",
      lastActiveAt: data.lastActiveAt ?? "",
      banned: data.banned ?? false,
      tier: data.tier ?? "free",
    };
  } catch {
    return null;
  }
}

/**
 * List all users (admin/owner only).
 */
export async function listUsers(limit = 100): Promise<UserProfile[]> {
  try {
    const db = await getAdminDB();
    if (!db) return [];
    const snapshot = await db.collection("users").limit(limit).get();
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        uid: doc.id,
        email: data.email ?? null,
        displayName: data.displayName ?? null,
        role: (data.role as UserRole) || "user",
        createdAt: data.createdAt ?? "",
        lastActiveAt: data.lastActiveAt ?? "",
        banned: data.banned ?? false,
        tier: data.tier ?? "free",
      };
    });
  } catch {
    return [];
  }
}

/**
 * Update a user's role (owner only).
 */
export async function setUserRole(uid: string, role: UserRole): Promise<boolean> {
  try {
    const db = await getAdminDB();
    if (!db) return false;
    await db.collection("users").doc(uid).update({ role, updatedAt: new Date().toISOString() });
    return true;
  } catch {
    return false;
  }
}

/**
 * Ban or unban a user (owner only).
 */
export async function setUserBanned(uid: string, banned: boolean): Promise<boolean> {
  try {
    const db = await getAdminDB();
    if (!db) return false;
    await db.collection("users").doc(uid).update({ banned, updatedAt: new Date().toISOString() });
    return true;
  } catch {
    return false;
  }
}

/**
 * Seed the owner role for a user. Only works if no owner exists yet,
 * or if the UID matches the OWNER_UID env var.
 */
export async function seedOwnerRole(uid: string, email: string): Promise<{ success: boolean; message: string }> {
  try {
    const db = await getAdminDB();
    if (!db) return { success: false, message: "Database unavailable" };

    // Check if an owner already exists
    const ownersSnapshot = await db.collection("users").where("role", "==", "owner").limit(1).get();
    if (!ownersSnapshot.empty) {
      // Allow re-seeding if the UID matches env var
      const envUids = (process.env.OWNER_UID || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
      if (!envUids.includes(uid.toLowerCase())) {
        return { success: false, message: "An owner already exists. Use OWNER_UID env var to override." };
      }
    }

    // Set or create the user document with owner role
    await db.collection("users").doc(uid).set(
      {
        email,
        role: "owner",
        banned: false,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
      { merge: true }
    );

    return { success: true, message: `User ${uid} set as owner` };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : "Failed to seed owner" };
  }
}
