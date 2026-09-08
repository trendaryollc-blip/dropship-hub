"use client";

import Link from "next/link";
import {
  Zap,
  Globe,
  Shield,
  ArrowUpRight,
  ExternalLink,
} from "lucide-react";

export default function HowItWorksSection() {
  return (
    <>
      {/* How It Works */}
      <div className="glass rounded-2xl p-6 border border-border space-y-4">
        <h2 className="font-display font-semibold text-foreground">How It Works</h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <Zap className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
            <span>
              <strong className="text-foreground">Fallback Chain:</strong> If provider #1 fails, automatically try #2, then #3, and so on.{" "}
              <Link href="/ai" className="text-accent hover:text-accent/80 inline-flex items-center gap-1">
                Test it <ArrowUpRight className="h-3 w-3" />
              </Link>
            </span>
          </div>
          <div className="flex items-start gap-3">
            <Globe className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
            <span>
              <strong className="text-foreground">Free Tiers:</strong> Start with free tiers, upgrade to paid only when needed. Groq offers 14,400 requests/day for free.
            </span>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
            <span>
              <strong className="text-foreground">Security:</strong> API keys are stored securely in Firestore under your account. You can also use environment variables in <code className="px-1 py-0.5 rounded bg-surface text-[11px] text-foreground font-mono">.env.local</code>.
            </span>
          </div>
        </div>
      </div>

      {/* Quick Start Guide */}
      <div className="glass rounded-2xl p-6 border border-border">
        <h2 className="font-display font-semibold text-foreground mb-4">Quick Start</h2>
        <div className="space-y-3">
          {[
            { step: 1, text: "Get a free API key from Groq (fastest setup)", href: "https://groq.com", external: true },
            { step: 2, text: "Paste your key in the Groq provider card above and click Save", href: null, external: false },
            { step: 3, text: "Click Test to verify your connection works", href: null, external: false },
            { step: 4, text: "Search for products with AI-powered insights", href: "/products", external: false },
          ].map((item) => (
            <div key={item.step} className="flex items-center gap-3 p-3 rounded-xl bg-surface/50">
              <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center text-xs font-bold text-accent shrink-0">
                {item.step}
              </div>
              <span className="text-sm text-foreground flex-1">{item.text}</span>
              {item.href && (
                item.external ? (
                  <a href={item.href} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-accent hover:text-accent/80 transition-colors shrink-0">
                    Open <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                ) : (
                  <Link href={item.href}
                    className="flex items-center gap-1 text-[10px] text-accent hover:text-accent/80 transition-colors shrink-0">
                    Go <ArrowUpRight className="h-2.5 w-2.5" />
                  </Link>
                )
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
