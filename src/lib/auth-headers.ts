import { auth } from "@/lib/firebase";

/**
 * Headers for calling withAuth-protected API routes from the client.
 * Returns an empty object when signed out (the server will respond 401 and
 * the caller can surface a sign-in prompt).
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return {};
  try {
    return { Authorization: `Bearer ${await user.getIdToken()}` };
  } catch {
    return {};
  }
}
