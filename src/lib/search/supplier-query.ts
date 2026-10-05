// ── Supplier Natural-Language Query Matching ─────────────────────────────
//
// Parses a phrase like "find reliable suppliers for baby toys" into
// meaningful keywords and scores suppliers against them, so a full sentence
// narrows the list instead of matching nothing.

import type { SupplierProfile } from "@/types/supplier";

const STOP_WORDS = new Set([
  "the", "a", "an", "for", "with", "and", "or", "to", "in", "on", "at",
  "by", "of", "is", "it", "that", "this", "from", "but", "not", "be",
  "as", "are", "was", "were", "i", "me", "my", "we", "our", "you", "your",
  "they", "them", "find", "found", "search", "show", "list", "give",
  "look", "looking", "want", "need", "get", "please", "help", "some",
  "any", "all", "which", "what", "who", "where", "when", "supplier",
  "suppliers", "vendor", "vendors", "manufacturer", "manufacturers",
]);

export function buildSupplierSearchQuery(product: string, category: string, maxLength = 200): string {
  const title = product.trim();
  const categoryName = category.trim();
  const usableCategory = /^(general|uncategorized)$/i.test(categoryName) ? "" : categoryName;
  if (!title) return usableCategory.slice(0, maxLength);
  if (!usableCategory) return title.slice(0, maxLength);

  const combined = `${title} ${usableCategory}`;
  return combined.length <= maxLength ? combined : title.slice(0, maxLength);
}

export function parseSupplierQuery(query: string): string[] {
  const trimmed = (query || "").trim().toLowerCase();
  if (!trimmed) return [];

  const tokens = trimmed
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));

  return tokens.length > 0 ? tokens : [trimmed];
}

function variants(token: string): string[] {
  const out = [token];
  if (token.endsWith("ies") && token.length > 4) out.push(`${token.slice(0, -3)}y`);
  else if (token.endsWith("es") && token.length > 3) out.push(token.slice(0, -2));
  if (token.endsWith("s") && token.length > 2) out.push(token.slice(0, -1));
  return out;
}

function contains(field: string, token: string): boolean {
  if (!field) return false;
  const haystack = field.toLowerCase();
  return variants(token).some((v) => haystack.includes(v));
}

// Higher weight = stronger signal (name/spec match outranks a description
// mention). Each query keyword contributes its best matching field only.
export function scoreSupplierMatch(supplier: SupplierProfile, tokens: string[]): number {
  if (tokens.length === 0) return 0;

  const fields = [
    { text: supplier.name, weight: 3 },
    { text: supplier.specializations.join(" "), weight: 2 },
    { text: supplier.catalog?.categories?.join(" ") || "", weight: 2 },
    { text: `${supplier.location} ${supplier.country}`, weight: 1 },
    { text: supplier.description || "", weight: 1 },
  ].filter((f) => f.text);

  return tokens.reduce((total, token) => {
    const best = fields.reduce((max, f) => (contains(f.text, token) ? Math.max(max, f.weight) : max), 0);
    return total + best;
  }, 0);
}

export function filterSuppliersByQuery<T extends SupplierProfile>(suppliers: T[], query: string): T[] {
  const tokens = parseSupplierQuery(query);
  if (tokens.length === 0) return suppliers;

  return suppliers
    .map((supplier) => ({ supplier, score: scoreSupplierMatch(supplier, tokens) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.supplier);
}
