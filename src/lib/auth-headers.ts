import { auth } from "@/lib/firebase";
import { safeFetch } from "@/lib/safe-fetch";

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

/**
 * Authenticated JSON request helper for withAuth-protected API routes.
 * Injects the Firebase ID token automatically and parses JSON via safeFetch
 * (throws FetchError with the server's public error message on failure).
 */
export async function authJson<T = unknown>(
  url: string,
  body?: unknown,
  method: string = "POST"
): Promise<T> {
  const authHeaders = await getAuthHeaders();
  return safeFetch<T>(url, {
    method,
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}


