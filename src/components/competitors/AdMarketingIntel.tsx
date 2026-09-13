"use client";

import { useState } from "react";
import { Megaphone, Users, TrendingUp, Globe, ChevronDown, BarChart3 } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { CompetitorAdIntel } from "@/types/competitors";

function AdPlatformCard({ platform }: { platform: CompetitorAdIntel["platforms"][0] }) {
  return (
    <div className="bg-surface/50 rounded-xl p-3 border border-border/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-foreground">{platform.platform}</span>
        <span className="text-[10px] text-accent font-medium">{platform.adType}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <p className="text-[10px] text-muted-foreground">Est. Spend</p>
          <p className="text-sm font-display font-bold text-foreground">{platform.estimatedSpend}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground">Ad Count</p>
          <p className="text-sm font-display font-bold text-foreground">{platform.adCount}</p>
        </div>
      </div>
      {platform.topKeywords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {platform.topKeywords.slice(0, 3).map((kw) => (
            <span key={kw} className="text-[9px] px-1.5 py-0.5 rounded bg-accent/5 text-accent/70 border border-accent/10">
              {kw}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdMarketingIntel({ intel }: { intel: CompetitorAdIntel[] }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <h3 className="font-display text-base font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="text-lg">📣</span> Ad & Marketing Intel
        <span className="text-xs font-normal text-muted-foreground ml-1">({intel.length} competitors)</span>
      </h3>

      <div className="space-y-3">
        {intel.map((comp, i) => {
          const isOpen = expanded === comp.sellerName;
          return (
            <div
              key={comp.sellerName}
              className={`glass rounded-xl border transition-all duration-500 ${isOpen ? "border-accent/30 shadow-lg shadow-accent/5" : "border-border hover:border-accent/15"} ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <button
                onClick={() => setExpanded(isOpen ? null : comp.sellerName)}
                className="w-full p-4 flex items-center gap-3 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-400/10 flex items-center justify-center shrink-0">
                  <Megaphone className="h-5 w-5 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-display text-sm font-semibold text-foreground truncate">{comp.sellerName}</h4>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>Total spend: {comp.totalAdSpend}</span>
                    <span>·</span>
                    <span>SEO: {comp.seoScore}/100</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-medium text-foreground">{comp.keywordOverlap}%</p>
                    <p className="text-[9px] text-muted-foreground">Keyword overlap</p>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </div>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 border-t border-border/50">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4 mb-4">
                    <div className="bg-surface/50 rounded-xl p-3 border border-border/50 text-center">
                      <BarChart3 className="h-4 w-4 text-accent mx-auto mb-1" />
                      <p className="font-display text-lg font-bold text-foreground">{comp.seoScore}</p>
                      <p className="text-[10px] text-muted-foreground">SEO Score</p>
                    </div>
                    <div className="bg-surface/50 rounded-xl p-3 border border-border/50 text-center">
                      <Globe className="h-4 w-4 text-purple-400 mx-auto mb-1" />
                      <p className="font-display text-lg font-bold text-foreground">{comp.totalAdSpend}</p>
                      <p className="text-[10px] text-muted-foreground">Total Ad Spend</p>
                    </div>
                    <div className="bg-surface/50 rounded-xl p-3 border border-border/50 text-center">
                      <TrendingUp className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
                      <p className="font-display text-lg font-bold text-foreground">{comp.keywordOverlap}%</p>
                      <p className="text-[10px] text-muted-foreground">Keyword Overlap</p>
                    </div>
                  </div>

                  <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Platform Breakdown</h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                    {comp.platforms.map((p) => (
                      <AdPlatformCard key={p.platform} platform={p} />
                    ))}
                  </div>

                  {comp.socialPresence.length > 0 && (
                    <>
                      <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Social Presence</h5>
                      <div className="flex flex-wrap gap-2 mb-4">
                        {comp.socialPresence.map((sp) => (
                          <div key={sp.platform} className="flex items-center gap-2 bg-surface/50 rounded-lg px-3 py-2 border border-border/50">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs font-medium text-foreground">{sp.platform}</span>
                            <span className="text-[10px] text-muted-foreground">{sp.followers.toLocaleString()} followers</span>
                            <span className="text-[10px] text-accent">{sp.engagement}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {comp.topPerformingAd && (
                    <div className="rounded-xl bg-accent/5 border border-accent/15 p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Megaphone className="h-3.5 w-3.5 text-accent" />
                        <span className="text-[10px] font-semibold text-accent uppercase tracking-wider">Top Performing Ad</span>
                      </div>
                      <p className="text-sm text-foreground font-medium">{comp.topPerformingAd.title}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                        <span>{comp.topPerformingAd.platform}</span>
                        <span>·</span>
                        <span>Reach: {comp.topPerformingAd.estimatedReach}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
