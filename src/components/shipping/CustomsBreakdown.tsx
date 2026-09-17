"use client";

import { motion } from "framer-motion";
import { Shield, AlertTriangle, Info, CheckCircle2, Copy, Check } from "lucide-react";
import { useState } from "react";
import type { CustomsCalculationResult } from "@/types/shipping";

interface CustomsBreakdownProps {
  result: CustomsCalculationResult;
}

const warningColors: Record<string, { color: string; bg: string; border: string }> = {
  info: { color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
  warning: { color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
  critical: { color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20" },
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export default function CustomsBreakdown({ result }: CustomsBreakdownProps) {
  const [copied, setCopied] = useState(false);

  const handleCopySummary = () => {
    const text = [
      `Customs Summary`,
      `Subtotal: $${result.summary.subtotal.toFixed(2)}`,
      `Duties: $${result.summary.totalDuties.toFixed(2)}`,
      `VAT/GST: $${result.summary.totalVAT.toFixed(2)}`,
      `Total Landed Cost: $${result.summary.totalLandedCost.toFixed(2)}`,
      `Effective Tax Rate: ${result.summary.effectiveTaxRate.toFixed(1)}%`,
    ].join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Subtotal", value: result.summary.subtotal, color: "text-foreground" },
          { label: "Import Duties", value: result.summary.totalDuties, color: "text-red-400" },
          { label: "VAT/GST", value: result.summary.totalVAT, color: "text-purple-400" },
          { label: "Total Landed Cost", value: result.summary.totalLandedCost, color: "text-accent" },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            variants={item}
            whileHover={{ scale: 1.02, y: -2 }}
            className="glass rounded-xl p-3 text-center cursor-default"
          >
            <p className="text-[9px] text-muted-foreground mb-1">{card.label}</p>
            <motion.p
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 + 0.2, type: "spring", stiffness: 200 }}
              className={`text-sm font-bold ${card.color}`}
            >
              ${card.value.toFixed(2)}
            </motion.p>
          </motion.div>
        ))}
      </div>

      {/* Breakdown Bar */}
      {result.summary.breakdown.length > 0 && (
        <motion.div variants={item} className="glass rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-foreground">Cost Breakdown</h4>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCopySummary}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-[9px] text-muted-foreground hover:text-accent hover:bg-accent/10 transition-all"
            >
              {copied ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Copy className="h-2.5 w-2.5" />}
              {copied ? "Copied!" : "Copy"}
            </motion.button>
          </div>
          <div className="flex rounded-full h-3 overflow-hidden mb-3">
            {result.summary.breakdown.map((breakdownItem, i) => {
              const pct = result.summary.totalLandedCost > 0 ? (breakdownItem.amount / result.summary.totalLandedCost) * 100 : 0;
              return (
                <motion.div
                  key={i}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
                  style={{ backgroundColor: breakdownItem.color }}
                  title={`${breakdownItem.name}: $${breakdownItem.amount.toFixed(2)}`}
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3">
            {result.summary.breakdown.map((breakdownItem, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.1 + 0.5 }}
                className="flex items-center gap-1.5"
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: breakdownItem.color }} />
                <span className="text-[10px] text-muted-foreground">{breakdownItem.name}</span>
                <span className="text-[10px] font-semibold text-foreground">${breakdownItem.amount.toFixed(2)}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* De Minimis Info */}
      <motion.div variants={item} className="glass rounded-xl p-4">
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
      </motion.div>

      {/* Item Details */}
      <motion.div variants={item} className="glass rounded-xl p-4">
        <h4 className="text-xs font-semibold text-foreground mb-3">Item Details</h4>
        <div className="space-y-2">
          {result.items.map((customsItem, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ x: 4 }}
              className="p-3 rounded-lg bg-surface/50 hover:bg-surface transition-all border border-white/5 hover:border-white/10"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-xs font-medium text-foreground">{customsItem.name}</p>
                  <p className="text-[10px] text-muted-foreground">HS Code: {customsItem.hsCode} · Qty: {customsItem.quantity}</p>
                </div>
                <p className="text-xs font-semibold text-foreground">${customsItem.totalValue.toFixed(2)}</p>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <p className="text-[9px] text-muted-foreground">Duty</p>
                  <p className="text-[10px] font-semibold text-red-400">{(customsItem.dutyRate * 100).toFixed(1)}%</p>
                  <p className="text-[9px] text-muted-foreground">${customsItem.dutyAmount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground">VAT</p>
                  <p className="text-[10px] font-semibold text-purple-400">{(customsItem.vatRate * 100).toFixed(1)}%</p>
                  <p className="text-[9px] text-muted-foreground">${customsItem.vatAmount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground">Total Tax</p>
                  <p className="text-[10px] font-semibold text-amber-400">${customsItem.totalTaxes.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[9px] text-muted-foreground">Landed</p>
                  <p className="text-[10px] font-semibold text-accent">${customsItem.landedCost.toFixed(2)}</p>
                </div>
              </div>
              {customsItem.notes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {customsItem.notes.map((note, j) => (
                    <span key={j} className="text-[9px] px-1.5 py-0.5 rounded bg-surface text-muted-foreground">{note}</span>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <motion.div variants={item} className="glass rounded-xl p-4">
          <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" /> Warnings
          </h4>
          <div className="space-y-2">
            {result.warnings.map((warning, i) => {
              const wc = warningColors[warning.severity] || warningColors.info;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className={`flex items-start gap-2 p-2 rounded-lg ${wc.bg} border ${wc.border}`}
                >
                  {warning.severity === "critical" ? (
                    <AlertTriangle className={`h-3 w-3 ${wc.color} shrink-0 mt-0.5`} />
                  ) : (
                    <Info className={`h-3 w-3 ${wc.color} shrink-0 mt-0.5`} />
                  )}
                  <p className={`text-[10px] ${wc.color}`}>{warning.message}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Tips */}
      {result.tips.length > 0 && (
        <motion.div variants={item} className="glass rounded-xl p-4">
          <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Tips
          </h4>
          <div className="space-y-1.5">
            {result.tips.map((tip, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-2 p-2 rounded-lg bg-emerald-400/5 hover:bg-emerald-400/10 transition-colors"
              >
                <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-emerald-400">{tip}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Effective Tax Rate */}
      <motion.div
        variants={item}
        whileHover={{ scale: 1.01 }}
        className="glass rounded-xl p-4"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Effective Tax Rate</span>
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 rounded-full bg-surface overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(result.summary.effectiveTaxRate * 2, 100)}%` }}
                transition={{ duration: 1, delay: 0.5 }}
                className="h-full rounded-full bg-accent"
              />
            </div>
            <span className="text-sm font-bold text-accent">{result.summary.effectiveTaxRate.toFixed(1)}%</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
