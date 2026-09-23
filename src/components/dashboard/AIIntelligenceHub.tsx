"use client";

import Link from "next/link";
import Image from "next/image";
import {
  DollarSign, Package, Brain, Sparkles, Star, ChevronRight,
  CheckCircle2, Calculator, ExternalLink, Bell, Zap, AlertTriangle, Shield, Info,
  ArrowUpRight,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { SectionDivider } from "./SectionDivider";
import { ScoreRing } from "./ScoreRing";
import type { AIDailyPick, AIBriefing, SmartAlert } from "@/types/dashboard";

/**
 * The route sends human strings ("just now", "retrying...") rather than ISO
 * timestamps. Only feed through Date formatting when the value actually parses.
 */
function formatLastScan(value: string | undefined | null): string {
  if (!value) return "N/A";
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }
  return value;
}

/**
 * Same defensive parsing for the daily pick expiry — a malformed value must
 * never crash the section with an `Invalid time value` RangeError.
 */
function formatExpiryDate(value: string | undefined | null): string {
  if (!value) return "Today";
  const date = new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return date.toLocaleDateString();
  }
  return value;
}

export function AIIntelligenceHub({
  dailyPick, briefing, alerts, onAlertRead, onMarkAllRead,
}: {
  dailyPick: AIDailyPick | null; briefing: AIBriefing; alerts: SmartAlert[]; onAlertRead: (id: string) => void; onMarkAllRead?: () => void;
}) {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <SectionDivider label="AI Intelligence" icon={Brain} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-4">

        {/* ═══ AI Daily Pick — Full Detail Card ═══ */}
        {dailyPick && (
          <div className="lg:col-span-2 rounded-2xl bg-gradient-to-br from-purple-500/[0.06] to-pink-500/[0.03] border border-purple-500/15 hover:border-purple-500/25 transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/10 rounded-full blur-[60px]" />
            <div className="relative z-10 p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30 animate-pulse">
                    <Sparkles className="h-4.5 w-4.5 text-purple-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">AI Pick of the Day</span>
                      <ScoreRing score={dailyPick.overallScore ?? 0} size={32} strokeWidth={3} />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {dailyPick.category} &middot; {dailyPick.platform} &middot; Expires {formatExpiryDate(dailyPick.expiresAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {dailyPick.yesterdayPick && (
                    <span className={`text-[9px] px-2 py-1 rounded-full font-medium ${dailyPick.yesterdayPick.up ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                      Yesterday: {dailyPick.yesterdayPick.result}
                    </span>
                  )}
                  <span className={`text-[9px] px-2 py-1 rounded-full font-medium border ${
                    dailyPick.risk === "low" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
                    dailyPick.risk === "medium" ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
                    "text-red-400 bg-red-500/10 border-red-500/20"
                  }`}>
                    {dailyPick.risk === "low" ? "Low Risk" : dailyPick.risk === "medium" ? "Med Risk" : "High Risk"}
                  </span>
                </div>
              </div>

              {/* Image + Details Row */}
              <div className="flex gap-5 mb-5">
                {/* Product Image */}
                <div className="w-40 h-40 rounded-xl overflow-hidden bg-gradient-to-br from-purple-500/15 to-pink-500/10 border border-purple-500/15 shrink-0 relative">
                  {dailyPick.image ? (
                    <Image src={dailyPick.image} alt={dailyPick.title} fill className="object-cover" sizes="160px" />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Package className="h-12 w-12 text-purple-400/30" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-purple-500 text-white text-[8px] font-bold uppercase shadow-lg">AI Pick</div>
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/50 backdrop-blur-sm">
                    <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
                    <span className="text-[9px] font-semibold text-white">{dailyPick.overallScore}/100</span>
                  </div>
                </div>

                {/* Product Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 font-bold uppercase">{dailyPick.category}</span>
                    <span className="text-[9px] px-2 py-0.5 rounded bg-white/[0.06] text-gray-400 font-medium">{dailyPick.platform}</span>
                  </div>
                  <h3 className="text-base font-bold text-white mb-1.5 leading-snug">{dailyPick.title}</h3>
                  <p className="text-[11px] text-gray-400 leading-relaxed mb-3">{dailyPick.description}</p>

                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                      <p className="text-[8px] text-gray-500 uppercase mb-0.5">Source Price</p>
                      <p className="text-xs font-bold text-white">${(dailyPick.sourcePrice ?? 0).toFixed(2)}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/15">
                      <p className="text-[8px] text-emerald-400/70 uppercase mb-0.5">Sell Price</p>
                      <p className="text-xs font-bold text-emerald-400">${(dailyPick.sellPrice ?? 0).toFixed(2)}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                      <p className="text-[8px] text-gray-500 uppercase mb-0.5">Margin</p>
                      <p className="text-xs font-bold text-white">{dailyPick.margin ?? 0}%</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                      <p className="text-[8px] text-gray-500 uppercase mb-0.5">Orders/mo</p>
                      <p className="text-xs font-bold text-white" title="Model estimate derived from reviews and rating — not observed sales">
                        ~{((dailyPick.ordersPerMonth ?? 0) / 1000).toFixed(1)}K
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Why AI Picked This + Earnings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                {/* Why AI Picked This */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="h-4 w-4 text-purple-400" />
                    <span className="text-xs font-bold text-white">Why AI Picked This</span>
                  </div>
                  <div className="space-y-2">
                    {(dailyPick.reasonPoints ?? []).map((point, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-purple-400 mt-0.5 shrink-0" />
                        <span className="text-[11px] text-gray-400 leading-relaxed">{point}</span>
                      </div>
                    ))}
                    {(!dailyPick.reasonPoints || dailyPick.reasonPoints.length === 0) && dailyPick.reason && (
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-purple-400 mt-0.5 shrink-0" />
                        <span className="text-[11px] text-gray-400 leading-relaxed">{dailyPick.reason}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Earnings Preview */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/[0.06] to-emerald-600/[0.03] border border-emerald-500/15">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">Earnings Preview</span>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">Profit per Order</span>
                      <span className="text-xs font-bold text-emerald-400">${(dailyPick.earningsPreview?.profitPerOrder ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">Est. Orders per Month</span>
                      <span className="text-xs font-bold text-white" title="Model estimate derived from reviews and rating — not observed sales">
                        ~{dailyPick.earningsPreview?.ordersPerMonth ?? 0}
                      </span>
                    </div>
                    <div className="h-px bg-emerald-500/10" />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-emerald-400/80 font-medium">Monthly Revenue Est.</span>
                      <span className="text-sm font-bold text-emerald-400">${(dailyPick.earningsPreview?.monthlyRevenue ?? 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Saturation + Action Buttons */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-500">Market Saturation</span>
                    <span className="text-[10px] font-semibold text-white">{dailyPick.saturation ?? 0}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-1000"
                      style={{ width: `${dailyPick.saturation ?? 0}%` }} />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link href="/products" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-purple-500 text-white text-xs font-semibold hover:bg-purple-600 transition-all active:scale-[0.97]">
                  Start Selling <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
                <Link href={`/calculator/profit?cost=${dailyPick.sourcePrice}&price=${dailyPick.sellPrice}`} className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/[0.1] text-gray-300 text-xs font-medium hover:bg-white/[0.05] transition-all">
                  <Calculator className="h-3.5 w-3.5" /> Compare
                </Link>
                <a href={dailyPick.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/[0.1] text-gray-300 text-xs font-medium hover:bg-white/[0.05] transition-all">
                  <ExternalLink className="h-3.5 w-3.5" /> Source
                </a>
              </div>
            </div>
          </div>
        )}

        {/* AI Briefing + Alerts */}
        <div className="space-y-3">
          {/* Briefing Card */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-all duration-300">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-semibold text-white">AI Briefing</span>
              <span className="ml-auto text-[9px] text-gray-600">{formatLastScan(briefing.lastScan)}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
              <div className="text-center p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/15">
                <p className="font-display text-lg font-bold text-emerald-400">{briefing.opportunities ?? 0}</p>
                <p className="text-[8px] text-emerald-400/70 uppercase">Opps</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-red-500/10 border border-red-500/15">
                <p className="font-display text-lg font-bold text-red-400">{briefing.risks ?? 0}</p>
                <p className="text-[8px] text-red-400/70 uppercase">Risks</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-blue-500/10 border border-blue-500/15">
                <p className="font-display text-lg font-bold text-blue-400">{briefing.trends ?? 0}</p>
                <p className="text-[8px] text-blue-400/70 uppercase">Trends</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] text-gray-500">Sentiment:</span>
              <span className={`text-[10px] font-semibold ${(briefing.sentiment ?? 0) >= 60 ? "text-emerald-400" : (briefing.sentiment ?? 0) >= 40 ? "text-amber-400" : "text-red-400"}`}>
                {briefing.sentimentLabel ?? "N/A"}
              </span>
              <span className="text-[10px] text-gray-600">({briefing.sentiment ?? 0}%)</span>
            </div>
            {(briefing.insights ?? []).length > 0 && (
              <div className="space-y-1.5">
                {(briefing.insights ?? []).slice(0, 2).map((insight: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-[10px] text-gray-400">
                    <ChevronRight className="h-3 w-3 text-cyan-400 mt-0.5 shrink-0" />
                    <span className="leading-relaxed">{insight}</span>
                  </div>
                ))}
              </div>
            )}
            <Link href="/ai" className="mt-3 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-semibold hover:bg-cyan-500/20 transition-all">
              Full AI Tools <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Smart Alerts */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-semibold text-white">Smart Alerts</span>
              </div>
              <div className="flex items-center gap-1.5">
                {onMarkAllRead && alerts.some((a) => !a.read) && (
                  <button
                    type="button"
                    onClick={onMarkAllRead}
                    className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:text-white hover:bg-white/[0.08] transition-all"
                  >
                    Mark all read
                  </button>
                )}
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-medium">{alerts.filter(a => !a.read).length} new</span>
              </div>
            </div>
            <div className="space-y-2 max-h-36 overflow-y-auto">
              {alerts.length === 0 && (
                <p className="text-[10px] text-gray-600 text-center py-3">No alerts right now</p>
              )}
              {alerts.slice(0, 4).map((alert) => {
                const typeIcon: Record<string, typeof Zap> = { opportunity: Zap, risk: AlertTriangle, info: Info, warning: Shield };
                const typeColor: Record<string, string> = { opportunity: "text-emerald-400", risk: "text-red-400", info: "text-blue-400", warning: "text-amber-400" };
                const Icon = typeIcon[alert.type] || Info;
                return (
                  <Link key={alert.id} href={alert.actionHref || "/monitoring"}
                    onClick={() => onAlertRead(alert.id)}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all ${alert.read ? "bg-white/[0.02] border-white/[0.04] opacity-60" : "bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.06]"}`}>
                    <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${typeColor[alert.type] || "text-gray-400"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium text-white truncate">{alert.title}</p>
                      <p className="text-[9px] text-gray-500 mt-0.5">{alert.timestamp}</p>
                    </div>
                    <ArrowUpRight className="h-3 w-3 text-gray-600 shrink-0 mt-0.5" />
                  </Link>
                );
              })}
            </div>
            {alerts.length > 0 && (
              <Link href="/monitoring" className="mt-3 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-semibold hover:bg-amber-500/20 transition-all">
                View All Alerts <ArrowUpRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
