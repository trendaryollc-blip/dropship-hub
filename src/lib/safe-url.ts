import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// Hosts we are willing to fetch HTML from for image extraction / product
// scraping. Product links always come from known marketplace platforms, so an
// allowlist is sufficient and blocks SSRF against internal/metadata endpoints.
export const ALLOWED_HOST_SUFFIXES = [
  "amazon.com", "amazon.co.uk", "amazon.de", "amazon.fr", "amazon.es", "amazon.it",
  "amzn.to", "images-na.ssl-images-amazon.com",
  "ebay.com", "ebay.co.uk", "ebay.de", "ebay.fr", "ebay.es", "ebay.it", "ebaymotors.com",
  "aliexpress.com", "aliexpress.us",
  "cjdropshipping.com", "cjdropshipping.co",
  "walmart.com", "walmart.net",
  "etsy.com",
  "temu.com",
  "shein.com",
  "banggood.com",
  "dhgate.com",
  "alibaba.com", "aliexpress.com",
  "google.com", "shopping.google.com",
  "tiktok.com", "tiktokv.com",
  "shopify.com", "myshopify.com",
  "wixsite.com", "square.site",
  "bigcommerce.com", "squarespace.com",
  "target.com", "bestbuy.com", "costco.com", "homedepot.com", "lowes.com",
];

export const MAX_REDIRECTS = 3;

export function isPrivateIP(ip: string): boolean {
  if (ip.includes(":")) {
    // IPv6: loopback, link-local, unique-local, unspecified
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower === "::") return true;
    if (lower.startsWith("fe80") || lower.startsWith("fc") || lower.startsWith("fd")) return true;
    if (lower.startsWith("::ffff:")) {
      const v4 = lower.slice("::ffff:".length);
      return isPrivateIPv4(v4);
    }
    return false;
  }
  return isPrivateIPv4(ip);
}

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

export function hostAllowed(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    return false;
  }
  return ALLOWED_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`)
  );
}

/**
 * Validate a client-supplied URL before the server fetches anything from it.
 *
 * Guards against:
 *  - non-http(s) schemes (file:, gopher:, etc.)
 *  - hosts outside the marketplace allowlist
 *  - literal private/link-local IPs (cloud metadata, internal services)
 *  - DNS rebinding to private addresses
 *
 * Returns the normalized URL string, or null when the URL is unsafe.
 */
export async function assertSafeUrl(rawUrl: string): Promise<string | null> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  // Prefer https for external fetches; only allow plain http for allowlisted hosts
  if (url.protocol === "http:" && !hostAllowed(url.hostname)) return null;

  if (!hostAllowed(url.hostname)) return null;

  // Block literal private IPs in the URL
  const ipVersion = isIP(url.hostname);
  if (ipVersion && isPrivateIP(url.hostname)) return null;

  // DNS rebinding guard: resolve and ensure no private addresses
  if (!ipVersion) {
    try {
      const addresses = await lookup(url.hostname, { all: true });
      if (addresses.length === 0) return null;
      if (addresses.some((a) => isPrivateIP(a.address))) return null;
    } catch {
      return null;
    }
  }

  return url.toString();
}

/**
 * Follow an http(s) URL across up to MAX_REDIRECTS hops, validating every hop
 * with `assertSafeUrl` so a redirect cannot land on an internal address.
 *
 * Returns the final validated URL and the raw Response (headers/body available
 * to the caller to read), or null when any hop is unsafe/unreachable.
 */
export async function fetchValidatedHtml(
  rawUrl: string,
  signal?: AbortSignal
): Promise<{ url: string; response: Response } | null> {
  let currentUrl: string | undefined = rawUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (!currentUrl) return null;
    const safeUrl = await assertSafeUrl(currentUrl);
    if (!safeUrl) return null;
    currentUrl = safeUrl;

    try {
      const res = await fetch(currentUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml",
        },
        signal,
        redirect: "manual",
      });

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) return null;
        currentUrl = new URL(location, safeUrl).toString();
        continue;
      }

      return { url: currentUrl, response: res };
    } catch {
      return null;
    }
  }

  return null;
}