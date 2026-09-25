"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Clock, Shield, CheckCircle2, AlertCircle, Star, Zap, Copy, Check } from "lucide-react";
import { useState } from "react";
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
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${rate.carrierName} ${rate.serviceLevel}: $${rate.cost.toFixed(2)} (${rate.estimatedDays.min}-${rate.estimatedDays.max} days)`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay / 1000, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <button
        onClick={onClick}
        aria-label={`${rate.carrierName} ${rate.serviceLevel}: $${rate.cost.toFixed(2)}, ${rate.estimatedDays.min}-${rate.estimatedDays.max} days`}
        className={`w-full text-left glass rounded-xl p-4 transition-all duration-300 group hover:border-accent/30 hover:bg-surface-hover hover:shadow-lg hover:shadow-accent/5 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:ring-offset-2 focus:ring-offset-background ${
          isSelected ? "border-accent ring-1 ring-accent/30 bg-accent/5" : "border-white/5"
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <motion.span
              className="text-2xl"
              whileHover={{ scale: 1.2, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              {carrier?.icon || "📦"}
            </motion.span>
            <div>
              <h4 className="font-display text-sm font-semibold text-foreground group-hover:text-accent transition-colors">{rate.carrierName}</h4>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-semibold border ${badgeColor}`}>
                {rate.serviceLevel}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-foreground group-hover:text-accent transition-colors">${rate.cost.toFixed(2)}</p>
            <p className="text-[10px] text-muted-foreground">{rate.currency}</p>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <AnimatePresence>
            {isCheapest && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"
              >
                <Zap className="h-2.5 w-2.5" /> Cheapest
              </motion.span>
            )}
            {isFastest && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold bg-blue-400/10 text-blue-400 border border-blue-400/20"
              >
                <Clock className="h-2.5 w-2.5" /> Fastest
              </motion.span>
            )}
            {isBestValue && (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-semibold bg-purple-400/10 text-purple-400 border border-purple-400/20"
              >
                <Star className="h-2.5 w-2.5" /> Best Value
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="p-2 rounded-lg bg-surface/50 group-hover:bg-surface transition-colors">
            <div className="flex items-center gap-1 mb-0.5">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className="text-[9px] text-muted-foreground">Delivery</span>
            </div>
            <p className="text-xs font-semibold text-foreground">
              {rate.estimatedDays.min}-{rate.estimatedDays.max} days
            </p>
          </div>
          <div className="p-2 rounded-lg bg-surface/50 group-hover:bg-surface transition-colors">
            <div className="flex items-center gap-1 mb-0.5">
              <Shield className="h-3 w-3 text-muted-foreground" />
              <span className="text-[9px] text-muted-foreground">Reference reliability (static)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex-1 h-1.5 rounded-full bg-surface overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${rate.reliabilityScore}%` }}
                  transition={{ duration: 0.8, delay: delay / 1000 + 0.3, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    rate.reliabilityScore >= 90 ? "bg-emerald-400" : rate.reliabilityScore >= 80 ? "bg-blue-400" : "bg-amber-400"
                  }`}
                />
              </div>
              <span className={`text-[10px] font-semibold ${
                rate.reliabilityScore >= 90 ? "text-emerald-400" : rate.reliabilityScore >= 80 ? "text-blue-400" : "text-amber-400"
              }`}>
                {rate.reliabilityScore}%
              </span>
            </div>
          </div>
        </div>

        {/* Cost per day indicator */}
        <div className="mb-3 p-2 rounded-lg bg-surface/30">
          <div className="flex items-center justify-between">
            <span className="text-[9px] text-muted-foreground">Cost per day (avg)</span>
            <span className="text-[10px] font-semibold text-foreground">
              ${(rate.cost / Math.max(1, (rate.estimatedDays.min + rate.estimatedDays.max) / 2)).toFixed(2)}/day
            </span>
          </div>
        </div>

        {/* Features */}
        <div className="flex flex-wrap gap-1.5 mb-2">
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
              <CheckCircle2 className="h-2.5 w-2.5" /> Carrier guarantee (reference)
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

        {/* Copy button */}
        <div className="flex justify-end">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCopy}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[9px] text-muted-foreground hover:text-accent hover:bg-accent/10 transition-all opacity-0 group-hover:opacity-100"
            aria-label="Copy rate details"
          >
            {copied ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Copy className="h-2.5 w-2.5" />}
            {copied ? "Copied!" : "Copy"}
          </motion.button>
        </div>

        {rate.error && (
          <div className="mt-2 p-2 rounded-lg bg-red-500/5 border border-red-500/20">
            <p className="text-[10px] text-red-400">{rate.error}</p>
          </div>
        )}
      </button>
    </motion.div>
  );
}
