"use client";

import { Cloud, FileText, Sun, Package, AlertTriangle, Info } from "lucide-react";
import type { DeliveryRiskFactor } from "@/types/shipping";

interface DelayWarningsProps {
  weatherDelayRisk: number;
  customsDelayRisk: number;
  holidayDelayRisk: number;
  riskFactors: DeliveryRiskFactor[];
}

const riskConfig: Record<string, { icon: typeof Cloud; color: string; bg: string; border: string }> = {
  weather: { icon: Cloud, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
  customs: { icon: FileText, color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20" },
  holiday: { icon: Sun, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
  carrier_delay: { icon: Package, color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20" },
  route_complexity: { icon: Package, color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20" },
  peak_season: { icon: AlertTriangle, color: "text-rose-400", bg: "bg-rose-400/10", border: "border-rose-400/20" },
};

const severityConfig = {
  low: { label: "Low Risk", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  medium: { label: "Medium Risk", color: "text-amber-400", bg: "bg-amber-400/10" },
  high: { label: "High Risk", color: "text-red-400", bg: "bg-red-400/10" },
};

export default function DelayWarnings({ weatherDelayRisk, customsDelayRisk, holidayDelayRisk, riskFactors }: DelayWarningsProps) {
  const hasDelayRisks = weatherDelayRisk > 0 || customsDelayRisk > 0 || holidayDelayRisk > 0;
  const hasRiskFactors = riskFactors.length > 0;

  if (!hasDelayRisks && !hasRiskFactors) return null;

  return (
    <div className="space-y-3">
      {/* Delay Risk Summary */}
      {hasDelayRisks && (
        <div className="glass rounded-xl p-4">
          <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> Potential Delays
          </h4>
          <div className="flex flex-wrap gap-2">
            {weatherDelayRisk > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-400/10 border border-blue-400/20">
                <Cloud className="h-4 w-4 text-blue-400" />
                <div>
                  <p className="text-[10px] font-semibold text-blue-400">Weather</p>
                  <p className="text-[9px] text-blue-400/70">+{weatherDelayRisk} day{weatherDelayRisk !== 1 ? "s" : ""} potential delay</p>
                </div>
              </div>
            )}
            {customsDelayRisk > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-400/10 border border-purple-400/20">
                <FileText className="h-4 w-4 text-purple-400" />
                <div>
                  <p className="text-[10px] font-semibold text-purple-400">Customs</p>
                  <p className="text-[9px] text-purple-400/70">+{customsDelayRisk} day{customsDelayRisk !== 1 ? "s" : ""} potential delay</p>
                </div>
              </div>
            )}
            {holidayDelayRisk > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-400/10 border border-amber-400/20">
                <Sun className="h-4 w-4 text-amber-400" />
                <div>
                  <p className="text-[10px] font-semibold text-amber-400">Holiday</p>
                  <p className="text-[9px] text-amber-400/70">+{holidayDelayRisk} day{holidayDelayRisk !== 1 ? "s" : ""} potential delay</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Risk Factors */}
      {hasRiskFactors && (
        <div className="glass rounded-xl p-4">
          <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
            <Info className="h-3.5 w-3.5 text-muted-foreground" /> Risk Factors
          </h4>
          <div className="space-y-2">
            {riskFactors.map((risk, i) => {
              const config = riskConfig[risk.type] || riskConfig.carrier_delay;
              const severity = severityConfig[risk.severity] || severityConfig.low;
              const Icon = config.icon;

              return (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${config.bg} border ${config.border}`}>
                  <Icon className={`h-4 w-4 ${config.color} shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className={`text-[11px] font-medium ${config.color}`}>{risk.description}</p>
                      <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${severity.bg} ${severity.color} font-semibold`}>
                        {severity.label}
                      </span>
                    </div>
                    {risk.estimatedDelayDays > 0 && (
                      <p className="text-[9px] text-muted-foreground">
                        Estimated delay: +{risk.estimatedDelayDays} day{risk.estimatedDelayDays !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
