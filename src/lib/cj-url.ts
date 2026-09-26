// Pure CJ Dropshipping URL helpers.
//
// This module must stay dependency-free (no firebase-admin / platform-config /
// node built-ins): it is imported by client components, and anything heavier
// would drag server-only packages into the browser bundle.

// CJ product pages live at /product/<slug>-p-<pid>.html. A bare
// /product-p-<pid> (no slug, no .html) is not a route and 302s to
// cjdropshipping.com/404, so the slug segment is required. CJ resolves the
// product by pid — the slug is only cosmetic/SEO — so slugifying the title
// is safe even when it doesn't match CJ's own slug exactly.
export function buildCJProductUrl(pid: string, title = ""): string {
  const cleanPid = (pid || "").trim().replace(/[^A-Za-z0-9._-]/g, "");
  if (!cleanPid) return "https://www.cjdropshipping.com/";
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return `https://www.cjdropshipping.com/product/${slug}-p-${cleanPid}.html`;
}

// Legacy links saved before the slug fix contain the route-less
// /product-p-<pid> form, which CJ 302s to /404 (and /404 then bounces the
// visitor to CJ's homepage). Rewrite them to the canonical
// /product/-p-<pid>.html form at render time so stored products, saved items
// and dashboard deep links keep working without a data migration. Slug-less
// URLs are valid: CJ routes on the pid and canonicalizes the slug itself.
// Returns every other URL untouched.
export function normalizeCJLink(url: string): string {
  if (!url) return url;
  const legacy = url.match(/^(https?:\/\/[^/]*cjdropshipping\.com)\/product-p-([^/?#]+)/i);
  if (!legacy) return url;
  const pid = legacy[2].replace(/\.html$/i, "").replace(/[^A-Za-z0-9._-]/g, "");
  if (!pid) return url;
  return `https://www.cjdropshipping.com/product/-p-${pid}.html`;
}
