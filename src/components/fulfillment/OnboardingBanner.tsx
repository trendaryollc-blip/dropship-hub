"use client";

import { Globe, Package, RefreshCw, ArrowRight, X } from "lucide-react";
import Link from "next/link";

export default function OnboardingBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="glass rounded-xl p-5 border border-accent/20 bg-gradient-to-r from-accent/5 to-transparent">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-display text-sm font-semibold text-foreground">Welcome to Fulfillment Center</h3>
          <p className="text-xs text-muted-foreground mt-1">Get started in 3 simple steps</p>
        </div>
        <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground transition-colors p-1">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { step: 1, title: "Connect your store", desc: "Link Shopify, Etsy, or WooCommerce", href: "/store", icon: <Globe className="h-4 w-4" /> },
          { step: 2, title: "Assign suppliers", desc: "Pick who fulfills each product", href: "/products", icon: <Package className="h-4 w-4" /> },
          { step: 3, title: "Sync orders", desc: "Orders auto-appear here", href: null, icon: <RefreshCw className="h-4 w-4" /> },
        ].map((s) => (
          <div key={s.step} className="flex items-center gap-3 p-3 rounded-lg bg-surface/50">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold">
              {s.step}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">{s.title}</p>
              <p className="text-[10px] text-muted-foreground">{s.desc}</p>
            </div>
            {s.href ? (
              <Link href={s.href} className="flex-shrink-0 p-1.5 rounded-lg hover:bg-accent/20 text-accent transition-colors">
                <ArrowRight className="h-3 w-3" />
              </Link>
            ) : (
              <div className="flex-shrink-0 p-1.5 text-muted-foreground">
                {s.icon}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
