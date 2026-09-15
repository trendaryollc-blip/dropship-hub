"use client";

import { Truck, ShieldCheck, ShieldAlert, ShieldX, Clock, CreditCard, Package } from "lucide-react";
import type { SupplierValidationResult } from "@/types/product-validation";

const tierConfig = {
  platinum: { color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20", label: "Platinum", gradient: "from-emerald-400 to-emerald-500" },
  gold: { color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20", label: "Gold", gradient: "from-yellow-400 to-yellow-500" },
  silver: { color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20", label: "Silver", gradient: "from-blue-400 to-blue-500" },
  bronze: { color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20", label: "Bronze", gradient: "from-amber-400 to-amber-500" },
  unverified: { color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20", label: "Unverified", gradient: "from-red-400 to-red-500" },
};

const trustStatusConfig = {
  pass: { icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-400/5", border: "border-emerald-400/15" },
  warn: { icon: ShieldAlert, color: "text-amber-400", bg: "bg-amber-400/5", border: "border-amber-400/15" },
  fail: { icon: ShieldX, color: "text-red-400", bg: "bg-red-400/5", border: "border-red-400/15" },
};

export default function SupplierValidationCard({ data }: { data: SupplierValidationResult }) {
  const tier = tierConfig[data.tier];
  const circumference = 2 * Math.PI * 35;
  const dashoffset = circumference - (data.score / 100) * circumference;

  return (
    <div className="glass rounded-2xl p-6 relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${tier.gradient} opacity-[0.03] pointer-events-none`} />

      {/* Header */}
      <div className="flex items-center justify-between mb-5 relative">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl ${tier.bg} flex items-center justify-center border ${tier.border}`}>
            <Truck className={`h-5 w-5 ${tier.color}`} />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-foreground">Supplier Validation</h3>
            <p className="text-[11px] text-muted-foreground">Trust signals & reliability</p>
          </div>
        </div>
        <span className={`text-xs px-3 py-1.5 rounded-full font-semibold border ${tier.color} ${tier.bg} ${tier.border}`}>
          {tier.label} Tier
        </span>
      </div>

      {/* Score + Shipping Analysis */}
      <div className="flex items-center gap-6 mb-5 relative">
        <div className="relative w-28 h-28 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="35" fill="none" stroke="currentColor" strokeWidth="5" className="text-surface" />
            <circle cx="40" cy="40" r="35" fill="none" strokeWidth="5" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={dashoffset}
              className={tier.color} style={{ stroke: "currentColor", transition: "stroke-dashoffset 1s ease" }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-display font-black ${tier.color}`}>{data.score}</span>
            <span className="text-[8px] text-muted-foreground">/ 100</span>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2 p-3 rounded-xl bg-surface/40 border border-border/30">
            <Clock className="h-4 w-4 text-blue-400" />
            <div>
              <p className="text-[10px] text-muted-foreground font-medium">Avg Fulfillment</p>
              <p className="text-sm font-bold text-foreground">{data.shippingAnalysis.avgDays} days</p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-surface/40 border border-border/30">
            <CreditCard className="h-4 w-4 text-emerald-400" />
            <div>
              <p className="text-[10px] text-muted-foreground font-medium">Payment Protection</p>
              <p className={`text-sm font-bold ${data.paymentProtection.isProtected ? "text-emerald-400" : "text-red-400"}`}>
                {data.paymentProtection.isProtected ? "Protected" : "Unprotected"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Trust Signals */}
      {data.trustSignals.length > 0 && (
        <div className="mb-5 relative">
          <p className="text-[11px] text-muted-foreground mb-3 font-semibold uppercase tracking-wider">Trust Signals</p>
          <div className="space-y-2">
            {data.trustSignals.map((signal, i) => {
              const cfg = trustStatusConfig[signal.status];
              const StatusIcon = cfg.icon;
              return (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl ${cfg.bg} border ${cfg.border}`}>
                  <StatusIcon className={`h-4 w-4 ${cfg.color} mt-0.5 shrink-0`} />
                  <div className="flex-1">
                    <p className={`text-[12px] font-medium ${cfg.color}`}>{signal.label}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{signal.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Risk Assessment */}
      <div className="mb-5 relative">
        <div className={`p-4 rounded-xl ${data.riskAssessment.overall === "low" ? "bg-emerald-400/5 border border-emerald-400/15" : data.riskAssessment.overall === "medium" ? "bg-amber-400/5 border border-amber-400/15" : "bg-red-400/5 border border-red-400/15"}`}>
          <p className="text-[10px] text-muted-foreground mb-1.5 font-medium">Risk Level</p>
          <p className={`text-lg font-display font-bold capitalize ${data.riskAssessment.overall === "low" ? "text-emerald-400" : data.riskAssessment.overall === "medium" ? "text-amber-400" : "text-red-400"}`}>
            {data.riskAssessment.overall}
          </p>
          {data.riskAssessment.factors.length > 0 && (
            <div className="mt-2 space-y-1">
              {data.riskAssessment.factors.map((f, i) => (
                <p key={i} className="text-[10px] text-muted-foreground">• {f}</p>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recommendation */}
      <div className="p-3 rounded-xl bg-surface/20 border border-border/30 mb-4">
        <div className="flex items-start gap-2">
          <Package className="h-4 w-4 text-accent shrink-0 mt-0.5" />
          <p className="text-[12px] text-foreground/80 leading-relaxed">{data.recommendation}</p>
        </div>
      </div>

      {/* Insight */}
      <div className="p-3 rounded-xl bg-accent/5 border border-accent/10">
        <p className="text-[12px] text-foreground/80 leading-relaxed">{data.insight}</p>
      </div>
    </div>
  );
}
