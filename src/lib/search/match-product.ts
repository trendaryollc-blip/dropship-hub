/**
 * Match a display name (possibly the dashboard's truncated "…" variant)
 * against a resolved search result by comparing normalized titles, allowing
 * one title to be a prefix of the other (dashboard cards truncate long names).
 */
export interface NamedResult {
  id: string;
  title: string;
}

export function matchProductByName(results: NamedResult[], name: string): string | null {
  const normalize = (s: string) => s.replace(/\.\.\.|…/g, "").trim().toLowerCase();
  const target = normalize(name);
  if (!target) return null;
  for (const r of results) {
    const candidate = normalize(r.title);
    if (!candidate) continue;
    if (candidate === target) return r.id;
    if (candidate.startsWith(target) || target.startsWith(candidate)) return r.id;
  }
  return null;
}