"use client";

import { Clock, Shield, CheckCircle2, AlertCircle, Star, Zap } from "lucide-react";
import type { CarrierRateResponse } from "@/types/shipping";
import { CARRIER_MAP } from "@/types/shipping";

const serviceLevelColors: Record<string, string> = {
  economy: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  standard: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  express: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  priority: "text-amber-400 bg-amber-400/10 border-amber-400/20",
};

interface CarrierComparisonCardProps {
  rate: CarrierRateResponse;
  isCheapest?: boolean;
  isFastest?: boolean;
  isBestValue?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  delay?: number;
}

export default function CarrierComparisonCard({
  rate,
  isCheapest,
  isFastest,
  isBestValue,
  isSelected,
  onClick,
  delay = 0,
}: CarrierComparisonCardProps) {
  const carrier = CARRIER_MAP[rate.carrierId];
  const badgeColor = serviceLevelColors[rate.serviceLevel] || serviceLevelColors.standard;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left glass rounded-xl p-4 transition-all duration-300 hover:border-accent/30 hover:bg-surface-hover ${
        isSelected ? "border-accent ring-1 ring-accent/30 bg-accent/5" : "border-white/5"
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{carrier?.icon || "📦"}</span>
          <div>
            <h4 className="font-display text-sm font-semibold text-foreground">{rate.carrierName}</h4>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-semibold border ${badgeColor}`}>
              {rate.serviceLevel}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-foreground">${rate.cost.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">{rate.currency}</p>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {isCheapest && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
            <Zap className="h-2.5 w-2.5" /> Cheapest
          </span>
        )}
        {isFastest && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold bg-blue-400/10 text-blue-400 border border-blue-400/20">
            <Clock className="h-2.5 w-2.5" /> Fastest
          </span>
        )}
        {isBestValue && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold bg-purple-400/10 text-purple-400 border border-purple-400/20">
            <Star className="h-2.5 w-2.5" /> Best Value
          </span>
        )}
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="p-2 rounded-lg bg-surface/50">
          <div className="flex items-center gap-1 mb-0.5">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <span className="text-[9px] text-muted-foreground">Delivery</span>
          </div>
          <p className="text-xs font-semibold text-foreground">
            {rate.estimatedDays.min}-{rate.estimatedDays.max} days
          </p>
        </div>
        <div className="p-2 rounded-lg bg-surface/50">
          <div className="flex items-center gap-1 mb-0.5">
            <Shield className="h-3 w-3 text-muted-foreground" />
            <span className="text-[9px] text-muted-foreground">Reliability</span>
          </div>
          <p className={`text-xs font-semibold ${rate.reliabilityScore >= 90 ? "text-emerald-400" : rate.reliabilityScore >= 80 ? "text-blue-400" : "text-amber-400"}`}>
            {rate.reliabilityScore}%
          </p>
        </div>
      </div>

      {/* Features */}
      <div className="flex flex-wrap gap-1.5">
        {rate.trackingIncluded && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] text-emerald-400 bg-emerald-400/5">
            <CheckCircle2 className="h-2.5 w-2.5" /> Tracking
          </span>
        )}
        {rate.insuranceIncluded && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] text-blue-400 bg-blue-400/5">
            <CheckCircle2 className="h-2.5 w-2.5" /> Insurance
          </span>
        )}
        {rate.guaranteedDelivery && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] text-purple-400 bg-purple-400/5">
            <CheckCircle2 className="h-2.5 w-2.5" /> Guaranteed
          </span>
        )}
        {rate.customsHandled && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] text-amber-400 bg-amber-400/5">
            <CheckCircle2 className="h-2.5 w-2.5" /> Customs
          </span>
        )}
        {!rate.trackingIncluded && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] text-muted-foreground bg-surface">
            <AlertCircle className="h-2.5 w-2.5" /> No Tracking
          </span>
        )}
      </div>

      {rate.error && (
        <div className="mt-2 p-2 rounded-lg bg-red-500/5 border border-red-500/20">
          <p className="text-[10px] text-red-400">{rate.error}</p>
        </div>
      )}
    </button>
  );
}
