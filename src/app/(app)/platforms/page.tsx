"use client";

import Link from "next/link";
import { Store, Truck, Search, ArrowRight, Plug, Globe } from "lucide-react";
import { PageErrorBoundary } from "@/components/ui/PageErrorBoundary";
import { useAPI } from "@/hooks/useAPI";

interface StoreConnection {
  id: string;
  name?: string;
  platform?: string;
  status?: string;
}

const SELLING_PLATFORMS = [
  { id: "shopify", name: "Shopify", desc: "Connect a Shopify store to push products and sync inventory.", href: "/store" },
  { id: "woocommerce", name: "WooCommerce", desc: "Connect WooCommerce for product push and order sync.", href: "/store" },
  { id: "custom", name: "Custom Store", desc: "Generic webhook/API store integration.", href: "/store" },
];

const SOURCING_PLATFORMS = [
  { id: "cj", name: "CJ Dropshipping", desc: "Source products, place sample and fulfillment orders.", href: "/suppliers?tab=discover" },
  { id: "aliexpress", name: "AliExpress", desc: "Search AliExpress listings for products and suppliers.", href: "/products" },
  { id: "alibaba", name: "Alibaba", desc: "Bulk sourcing and supplier discovery.", href: "/suppliers?tab=discover" },
];

export default function PlatformsPage() {
  const { data } = useAPI<{ connections?: StoreConnection[] }>("/api/store/connections");
  const connections = data?.connections ?? [];
  const connectedIds = new Set(connections.map((c) => String(c.platform ?? "").toLowerCase()));

  return (
    <PageErrorBoundary>
      <main className="max-w-7xl mx-auto space-y-6 p-4 md:p-6">
        <div className="text-center space-y-2">
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground tracking-tight flex items-center justify-center gap-3">
            <Plug className="h-8 w-8 text-accent" /> Platforms
          </h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Every selling channel and sourcing platform you can connect, with live connection status.
          </p>
        </div>

        <section>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
            <Store className="h-4 w-4 text-emerald-400" /> Selling channels
            <span className="text-xs text-muted-foreground font-normal">
              {connections.length} connected
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SELLING_PLATFORMS.map((p) => {
              const connected = connectedIds.has(p.id);
              return (
                <Link
                  key={p.id}
                  href={p.href}
                  className="glass rounded-2xl border border-border p-5 hover:border-accent/30 transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-display text-sm font-semibold text-foreground">{p.name}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${connected ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20" : "bg-white/5 text-muted-foreground border border-border"}`}>
                      {connected ? "Connected" : "Not connected"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{p.desc}</p>
                  <span className="text-xs text-accent flex items-center gap-1 group-hover:gap-2 transition-all">
                    {connected ? "Manage in Stores" : "Connect"} <ArrowRight className="h-3 w-3" />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
            <Truck className="h-4 w-4 text-blue-400" /> Sourcing platforms
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SOURCING_PLATFORMS.map((p) => (
              <Link
                key={p.id}
                href={p.href}
                className="glass rounded-2xl border border-border p-5 hover:border-accent/30 transition-all group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Globe className="h-4 w-4 text-blue-400" />
                  <h3 className="font-display text-sm font-semibold text-foreground">{p.name}</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{p.desc}</p>
                <span className="text-xs text-accent flex items-center gap-1 group-hover:gap-2 transition-all">
                  Open <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <div className="glass rounded-2xl border border-border p-5 flex flex-col sm:flex-row items-center gap-3 justify-between">
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <Search className="h-3.5 w-3.5 text-accent" />
            Looking for products across all platforms at once?
          </p>
          <Link href="/products" className="shrink-0 px-4 py-2 rounded-xl bg-accent/10 border border-accent/20 text-accent text-xs font-semibold hover:bg-accent/20 transition-all">
            Search all platforms
          </Link>
        </div>
      </main>
    </PageErrorBoundary>
  );
}
