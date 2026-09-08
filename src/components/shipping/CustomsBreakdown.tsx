"use client";

import { Shield, AlertTriangle, Info, CheckCircle2 } from "lucide-react";
import type { CustomsCalculationResult } from "@/types/shipping";

interface CustomsBreakdownProps {
  result: CustomsCalculationResult;
}

const warningColors: Record<string, { color: string; bg: string; border: string }> = {
  info: { color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
  warning: { color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
  critical: { color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20" },
};

export default function CustomsBreakdown({ result }: CustomsBreakdownProps) {
  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-[9px] text-muted-foreground mb-1">Subtotal</p>
          <p className="text-sm font-bold text-foreground">${result.summary.subtotal.toFixed(2)}</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-[9px] text-muted-foreground mb-1">Import Duties</p>
          <p className="text-sm font-bold text-red-400">${result.summary.totalDuties.toFixed(2)}</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-[9px] text-muted-foreground mb-1">VAT/GST</p>
          <p className="text-sm font-bold text-purple-400">${result.summary.totalVAT.toFixed(2)}</p>
        </div>
        <div className="glass rounded-xl p-3 text-center">
          <p className="text-[9px] text-muted-foreground mb-1">Total Landed Cost</p>
          <p className="text-sm font-bold text-accent">${result.summary.totalLandedCost.toFixed(2)}</p>
        </div>
      </div>

      {/* Breakdown Bar */}
      {result.summary.breakdown.length > 0 && (
        <div className="glass rounded-xl p-4">
          <h4 className="text-xs font-semibold text-foreground mb-3">Cost Breakdown</h4>
          <div className="flex rounded-full h-3 overflow-hidden mb-3">
            {result.summary.breakdown.map((item, i) => {
              const pct = result.summary.totalLandedCost > 0 ? (item.amount / result.summary.totalLandedCost) * 100 : 0;
              return (
                <div
                  key={i}
                  style={{ width: `${pct}%`, backgroundColor: item.color }}
                  className="transition-all duration-500"
                  title={`${item.name}: $${item.amount.toFixed(2)}`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3">
            {result.summary.breakdown.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] text-muted-foreground">{item.name}</span>
                <span className="text-[10px] font-semibold text-foreground">${item.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* De Minimis Info */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield className="h-4 w-4 text-accent" />
          <h4 className="text-xs font-semibold text-foreground">De Minimis Threshold</h4>
        </div>
        <div className="p-3 rounded-lg bg-surface/50">
          <p className="text-xs text-foreground mb-1">
            <span className="font-semibold">{result.deMinimis.currency} {result.deMinimis.threshold.toLocaleString()}</span>
            {result.deMinimis.applies && (
              <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${
                result.totalDeclaredValue <= result.deMinimis.threshold
                  ? "bg-emerald-400/10 text-emerald-400"
                  : "bg-amber-400/10 text-amber-400"
              }`}>
                {result.totalDeclaredValue <= result.deMinimis.threshold ? "Below threshold" : "Above threshold"}
              </span>
            )}
          </p>
          <p className="text-[10px] text-muted-foreground">{result.deMinimis.explanation}</p>
        </div>
      </div>

      {/* Item Details */}
      <div className="glass rounded-xl p-4">
        <h4 className="text-xs font-semibold text-foreground mb-3">Item Details</h4>
        <div className="space-y-2">
          {result.items.map((item, i) => (
            <div key={i} className="p-3 rounded-lg bg-surface/50">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs font-medium text-foreground">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">HS Code: {item.hsCode} · Qty: {item.quantity}</p>
                </div>
                <p className="text-xs font-semibold text-foreground">${item.totalValue.toFixed(2)}</p>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <p className="text-[9px] text-muted-foreground">Duty</p>
                  <p className="text-[10px] font-semibold text-red-400">{(item.dutyRate * 100).toFixed(1)}%</p>
                  <p className="text-[9px] text-muted-foreground">${item.dutyAmount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground">VAT</p>
                  <p className="text-[10px] font-semibold text-purple-400">{(item.vatRate * 100).toFixed(1)}%</p>
                  <p className="text-[9px] text-muted-foreground">${item.vatAmount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground">Total Tax</p>
                  <p className="text-[10px] font-semibold text-amber-400">${item.totalTaxes.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground">Landed</p>
                  <p className="text-[10px] font-semibold text-accent">${item.landedCost.toFixed(2)}</p>
                </div>
              </div>
              {item.notes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {item.notes.map((note, j) => (
                    <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-surface text-muted-foreground">{note}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="glass rounded-xl p-4">
          <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" /> Warnings
          </h4>
          <div className="space-y-2">
            {result.warnings.map((warning, i) => {
              const wc = warningColors[warning.severity] || warningColors.info;
              return (
                <div key={i} className={`flex items-start gap-2 p-2 rounded-lg ${wc.bg} border ${wc.border}`}>
                  {warning.severity === "critical" ? (
                    <AlertTriangle className={`h-3 w-3 ${wc.color} shrink-0 mt-0.5`} />
                  ) : (
                    <Info className={`h-3 w-3 ${wc.color} shrink-0 mt-0.5`} />
                  )}
                  <p className={`text-[10px] ${wc.color}`}>{warning.message}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tips */}
      {result.tips.length > 0 && (
        <div className="glass rounded-xl p-4">
          <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Tips
          </h4>
          <div className="space-y-1.5">
            {result.tips.map((tip, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-emerald-400/5">
                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-emerald-400">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Effective Tax Rate */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Effective Tax Rate</span>
          <span className="text-sm font-bold text-accent">{result.summary.effectiveTaxRate.toFixed(1)}%</span>
        </div>
      </div>
    </div>
  );
}
