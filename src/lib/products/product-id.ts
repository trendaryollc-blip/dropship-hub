// ── Stable product identity ───────────────────────────────────────────────
// A product must keep the same id everywhere it appears: the search card, the
// detail page, the supplier assignment, the store push and the order webhook.
// Search results carry an id from the dedup pipeline; when one is missing we
// derive a deterministic id from the product's source + link/title so the same
// product always resolves to the same key.

export interface ProductIdentityInput {
  id?: string | null;
  productId?: string | null;
  source?: string | null;
  link?: string | null;
  title?: string | null;
}

/** FNV-1a 32-bit hash — deterministic, dependency-free, client + server safe. */
function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

/**
 * Resolve a stable product id. Prefers an existing id, then a platform product
 * id, then a deterministic hash of source + link/title. Never returns a value
 * containing "/" so it is safe as a Firestore document id.
 */
export function stableProductId(input: ProductIdentityInput): string {
  const explicit = (input.id || input.productId || "").trim();
  if (explicit) return sanitizeDocId(explicit);

  const basis = `${(input.source || "").toLowerCase()}|${(input.link || input.title || "").trim().toLowerCase()}`;
  return sanitizeDocId(`p_${fnv1a(basis)}`);
}

/** Firestore doc ids cannot contain "/". Match the server-side convention. */
export function sanitizeDocId(id: string): string {
  return id.replace(/\//g, "__SLASH__");
}
