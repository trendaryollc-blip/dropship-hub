"use client";

import { Fragment } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";

const routeLabels: Record<string, string> = {
  "ad-roi": "Ad ROI",
  "ai": "AI",
  "ai-keys": "AI Keys",
  "amazon-fba": "Amazon FBA",
  "api-keys": "API Keys",
  "break-even": "Break-Even",
  "cash-flow": "Cash Flow",
  "customer-service": "Customer Service",
  "landed-cost": "Landed Cost",
  "multi-store": "Multi-Store",
  "order-router": "Order Router",
  "platform-comparison": "Platform Comparison",
  "price-war": "Price War",
  "product-lifecycle": "Product Lifecycle",
  "product-listings": "Product Listings",
  "product-validation": "Product Validation",
  "profit-tracker": "Profit Tracker",
  "refund-cascade": "Refund Cascade",
  "shipping-optimizer": "Shipping Optimizer",
  "social-content": "Social Content",
  "srm": "SRM",
  "supplier-performance": "Supplier Performance",
  "supplier-providers": "Supplier Providers",
  "tracking-page": "Tracking Page",
};

const knownSegments = new Set([
  "admin", "ai", "analytics", "bulk-orders", "calculator", "cash-flow", "competitors",
  "compliance", "customer-service", "dashboard", "digest", "fulfillment", "health",
  "missions", "monitoring", "multi-store", "order-router", "platforms", "price-war",
  "product-lifecycle", "product-listings", "product-validation", "products",
  "profit-tracker", "refund-cascade", "reports", "returns", "revenue", "reviews",
  "saved", "settings", "shipping-optimizer", "social-content", "srm", "store",
  "supplier-performance", "suppliers", "t", "tracking-page", "trends",
  "ad-roi", "ai-keys", "amazon-fba", "api-keys", "break-even", "customs",
  "landed-cost", "margin", "platform-comparison", "profit", "shipping",
  "niches", "id",
]);

function toLabel(segment: string): string {
  const known = routeLabels[segment];
  if (known) return known;
  if (!knownSegments.has(segment) && /^[a-z0-9]{10,}$/i.test(segment)) return "Details";
  return segment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface Crumb {
  label: string;
  href: string;
  isLast: boolean;
  linked: boolean;
}

function getCrumbs(pathname: string): Crumb[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) {
    return [{ label: "Dashboard", href: "/", isLast: true, linked: false }];
  }
  return segments.map((seg, i) => ({
    label: toLabel(seg),
    href: `/${segments.slice(0, i + 1).join("/")}`,
    isLast: i === segments.length - 1,
    linked: knownSegments.has(seg),
  }));
}

export default function HeaderBreadcrumbs({ className = "" }: { className?: string }) {
  const pathname = usePathname();
  const crumbs = getCrumbs(pathname);

  return (
    <nav
      aria-label="Header breadcrumb"
      className={`flex items-center gap-1.5 min-w-0 overflow-hidden ${className}`}
    >
      {crumbs.map((crumb, index) => (
        <Fragment key={crumb.href}>
          {index > 0 && (
            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/40" />
          )}
          {crumb.isLast || !crumb.linked ? (
            <span
              className={`text-sm truncate ${crumb.isLast ? "font-medium text-foreground" : "text-muted-foreground"}`}
            >
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.href}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors truncate"
            >
              {crumb.label}
            </Link>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
