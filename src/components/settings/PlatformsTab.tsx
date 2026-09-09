"use client";

import Link from "next/link";
import {
  Globe,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ArrowUpRight,
  Store,
} from "lucide-react";
import type { PlatformConnector } from "./constants";

interface PlatformsTabProps {
  platformConnectors: PlatformConnector[];
}

export default function PlatformsTab({ platformConnectors }: PlatformsTabProps) {
  return (
    <div className="space-y-4 animate-slide-up">
      <div className="glass rounded-2xl p-5 border border-accent/10">
        <div className="flex items-start gap-3">
          <Globe className="h-5 w-5 text-accent shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Platform Integrations</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              These connectors power the product search and supplier intelligence features. Advanced configuration — API keys are set in environment variables.
            </p>
          </div>
        </div>
      </div>

      {platformConnectors.map((platform) => (
        <div key={platform.id} className="glass rounded-2xl p-6 border border-border space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-accent/10 border border-accent/20">
                  <platform.icon className="w-5 h-5 text-accent" />
                </div>
                <h3 className="font-display font-semibold text-foreground">{platform.name}</h3>
                <span className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${
                  platform.configured
                    ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"
                    : "bg-amber-400/10 text-amber-400 border border-amber-400/20"
                }`}>
                  {platform.configured
                    ? <><CheckCircle2 className="h-3 w-3" /> Connected</>
                    : <><AlertTriangle className="h-3 w-3" /> Not Configured</>
                  }
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{platform.description}</p>
            </div>
            <Link href={platform.href}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent/10 border border-accent/20 text-xs font-medium text-accent hover:bg-accent/20 transition-all shrink-0">
              {platform.hrefLabel} <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          <div className="flex flex-wrap gap-2">
            {platform.features.map((feature) => (
              <span key={feature} className="px-2 py-1 rounded-lg text-xs bg-surface text-muted-foreground border border-border">{feature}</span>
            ))}
          </div>
        </div>
      ))}

      <Link href="/store"
        className="glass rounded-2xl p-5 border border-border hover:border-accent/20 transition-all group block">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent/10 border border-accent/20">
              <Store className="h-4 w-4 text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">Need to connect your store?</p>
              <p className="text-xs text-muted-foreground">Link Shopify, WooCommerce, or custom stores in My Store.</p>
            </div>
          </div>
          <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors shrink-0" />
        </div>
      </Link>
    </div>
  );
}
