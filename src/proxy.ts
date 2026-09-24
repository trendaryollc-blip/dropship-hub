import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side UX gate for authenticated app routes.
 *
 * Firebase client sessions live in IndexedDB, not cookies, so proxy
 * cannot cryptographically verify the user here. AuthProvider mirrors the
 * signed-in state into `dh_session` for this redirect only. Real protection
 * remains the Bearer ID-token checks in `withAuth` / `requireAuth`.
 */

const PROTECTED_PREFIXES = [
  "/admin",
  "/ad-roi",
  "/ai",
  "/bulk-orders",
  "/calculator",
  "/cash-flow",
  "/competitors",
  "/compliance",
  "/customer-service",
  "/dashboard",
  "/digest",
  "/fulfillment",
  "/health",
  "/missions",
  "/monitoring",
  "/multi-store",
  "/order-router",
  "/platforms",
  "/price-war",
  "/product-lifecycle",
  "/product-listings",
  "/product-validation",
  "/products",
  "/profit-tracker",
  "/refund-cascade",
  "/reports",
  "/returns",
  "/revenue",
  "/reviews",
  "/saved",
  "/settings",
  "/shipping-optimizer",
  "/social-content",
  "/srm",
  "/store",
  "/supplier-performance",
  "/suppliers",
  "/tracking-page",
  "/trends",
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const hasSession = request.cookies.get("dh_session")?.value === "1";
  if (hasSession) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/sign-in";
  // Preserve the full original location (path + query) so shareable links such
  // as /products?q=... keep their params after the auth bounce.
  url.search = `?callbackUrl=${encodeURIComponent(pathname + request.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Skip API routes, Next internals, and files with extensions.
     * Auth pages and marketing pages are not in PROTECTED_PREFIXES.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
