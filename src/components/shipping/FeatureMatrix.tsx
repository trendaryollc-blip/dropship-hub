"use client";

import { CheckCircle2, X, Shield } from "lucide-react";
import type { CarrierRateResponse } from "@/types/shipping";
import { CARRIER_CONFIGS } from "@/types/shipping";

interface FeatureMatrixProps {
  rates: CarrierRateResponse[];
}

const features = [
  { key: "trackingIncluded" as const, label: "Tracking", icon: "📍" },
  { key: "insuranceIncluded" as const, label: "Insurance", icon: "🛡️" },
  { key: "guaranteedDelivery" as const, label: "Guaranteed", icon: "✅" },
  { key: "customsHandled" as const, label: "Customs Handled", icon: "🌐" },
];

export default function FeatureMatrix({ rates }: FeatureMatrixProps) {
  if (rates.length === 0) return null;

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5">
        <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-accent" /> Feature Comparison
        </h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5">
              <th className="px-4 py-2.5 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider w-[120px]">
                Feature
              </th>
              {rates.map((rate) => {
                const carrier = CARRIER_CONFIGS.find((c) => c.id === rate.carrierId);
                return (
                  <th key={`${rate.carrierId}-${rate.serviceLevel}`} className="px-3 py-2.5 text-center min-w-[80px]">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-sm">{carrier?.icon || "📦"}</span>
                      <span className="text-[8px] text-muted-foreground leading-tight">{rate.serviceLevel}</span>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {features.map((feat, i) => (
              <tr key={feat.key} className={`border-b border-white/5 ${i % 2 === 0 ? "bg-surface/20" : ""}`}>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">{feat.icon}</span>
                    <span className="text-[10px] font-medium text-foreground">{feat.label}</span>
                  </div>
                </td>
                {rates.map((rate) => (
                  <td key={`${rate.carrierId}-${rate.serviceLevel}-${feat.key}`} className="px-3 py-2 text-center">
                    {rate[feat.key] ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 mx-auto" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-muted-foreground/30 mx-auto" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
            {/* Cost row */}
            <tr className="border-b border-white/5 bg-surface/20">
              <td className="px-4 py-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">💰</span>
                  <span className="text-[10px] font-medium text-foreground">Cost</span>
                </div>
              </td>
              {rates.map((rate) => (
                <td key={`${rate.carrierId}-${rate.serviceLevel}-cost`} className="px-3 py-2 text-center">
                  <span className="text-[10px] font-bold text-accent">${rate.cost.toFixed(2)}</span>
                </td>
              ))}
            </tr>
            {/* Delivery row */}
            <tr className="border-b border-white/5">
              <td className="px-4 py-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">📦</span>
                  <span className="text-[10px] font-medium text-foreground">Delivery</span>
                </div>
              </td>
              {rates.map((rate) => (
                <td key={`${rate.carrierId}-${rate.serviceLevel}-delivery`} className="px-3 py-2 text-center">
                  <span className="text-[10px] text-foreground">{rate.estimatedDays.min}-{rate.estimatedDays.max}d</span>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
