"use client";

import { useState } from "react";
import { STORE_CATALOG, STORE_CATEGORIES, type StorePlatform } from "@/lib/store-catalog";
import {
  Loader2, ExternalLink, ChevronDown, ChevronUp,
  Store, ShoppingCart, Puzzle,
} from "lucide-react";
import StoreConnectModal from "./StoreConnectModal";

interface Props {
  onConnected: () => void;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "E-commerce Platform": <Store className="h-3 w-3" />,
  "Marketplace": <ShoppingCart className="h-3 w-3" />,
  "Custom": <Puzzle className="h-3 w-3" />,
};

export default function StoreCuratedTab({ onConnected }: Props) {
  const [filter, setFilter] = useState<"all" | string>("all");
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<StorePlatform | null>(null);

  const filtered = filter === "all"
    ? STORE_CATALOG
    : STORE_CATALOG.filter((p) => p.category === filter);

  // Separate featured from rest
  const featured = filtered.find((p) => p.id === "trendaryo");
  const others = filtered.filter((p) => p.id !== "trendaryo");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-foreground mb-1">Connect Your Store</h2>
        <p className="text-sm text-muted-foreground">
          Pick your store platform below. Follow the setup guide to get your API credentials, then connect in seconds.
        </p>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            filter === "all"
              ? "bg-accent text-white"
              : "bg-surface border border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          All
        </button>
        {STORE_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === cat
                ? "bg-accent text-white"
                : "bg-surface border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {CATEGORY_ICONS[cat]}
            {cat}
          </button>
        ))}
      </div>

      {/* Featured: Trendaryo */}
      {featured && (
        <button
          onClick={() => setShowModal(featured)}
          className="w-full group bg-gradient-to-r from-rose-500/10 to-pink-500/10 border border-rose-500/30 rounded-2xl p-6 hover:border-rose-500/50 transition-all duration-200 text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden" style={{ background: featured.bg }}>
              <Store className="h-8 w-8" style={{ color: featured.color }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-foreground font-bold text-lg">{featured.name}</h3>
                <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 text-xs font-medium rounded-full">Your Store</span>
              </div>
              <p className="text-muted-foreground text-sm mt-1">{featured.description}</p>
            </div>
            <div className="flex items-center gap-1 text-rose-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              Connect →
            </div>
          </div>
        </button>
      )}

      {/* Platform Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {others.map((platform) => (
          <div
            key={platform.id}
            className="glass rounded-2xl border border-border p-5 flex flex-col hover:border-accent/30 transition-all"
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0"
                style={{ background: platform.bg }}
              >
                <Store className="h-6 w-6" style={{ color: platform.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-sm">{platform.name}</h3>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {platform.category}
                </span>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed line-clamp-2">
              {platform.description}
            </p>

            {/* Setup Guide Toggle */}
            <button
              onClick={() => setExpandedGuide(expandedGuide === platform.id ? null : platform.id)}
              className="flex items-center gap-1.5 text-[11px] text-accent hover:text-accent-hover transition-colors mb-3"
            >
              {expandedGuide === platform.id ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
              {expandedGuide === platform.id ? "Hide setup guide" : "How to get API key"}
            </button>

            {/* Expandable Setup Guide */}
            {expandedGuide === platform.id && (
              <div className="mb-3 p-3 rounded-xl bg-surface/50 border border-border space-y-2">
                {platform.setupGuide.map((step, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11px] text-muted-foreground">
                    <span className="flex-shrink-0 w-4 h-4 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[9px] font-bold">
                      {i + 1}
                    </span>
                    <span>
                      {step.text}
                      {step.highlight && (
                        <span className="text-foreground font-medium">{step.highlight}</span>
                      )}
                    </span>
                  </div>
                ))}
                {platform.apiDocsUrl && (
                  <a
                    href={platform.apiDocsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-accent hover:text-accent-hover mt-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Official API Docs <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
            )}

            {/* API Key Link */}
            {platform.keyUrl && platform.keyUrlLabel !== "" && (
              <a
                href={platform.keyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-accent hover:text-accent-hover transition-colors mb-3"
                onClick={(e) => e.stopPropagation()}
              >
                {platform.keyUrlLabel || "Get API Key"} <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}

            {/* Connect Button */}
            <button
              onClick={() => setShowModal(platform)}
              disabled={connecting === platform.id}
              className="w-full mt-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent text-xs font-semibold hover:bg-accent/20 transition-all disabled:opacity-50"
            >
              {connecting === platform.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Store className="h-3 w-3" />
              )}
              {connecting === platform.id ? "Adding..." : "Connect Store"}
            </button>
          </div>
        ))}
      </div>

      {/* Connect Modal */}
      {showModal && (
        <StoreConnectModal
          platform={showModal}
          onClose={() => setShowModal(null)}
          onConnected={() => {
            setShowModal(null);
            onConnected();
          }}
        />
      )}
    </div>
  );
}
