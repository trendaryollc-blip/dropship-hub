"use client";

import { motion } from "framer-motion";
import { Award, TrendingUp, DollarSign, Clock, Shield, Star, Copy, Check } from "lucide-react";
import { useState } from "react";
import type { AutoSelectResult } from "@/types/shipping";
import { CARRIER_MAP } from "@/types/shipping";

interface ScoreBreakdownProps {
  result: AutoSelectResult;
}

const scoreDimensions = [
  { key: "costScore" as const, label: "Cost", icon: DollarSign, color: "bg-emerald-400", textColor: "text-emerald-400", weight: "30%" },
  { key: "speedScore" as const, label: "Speed", icon: Clock, color: "bg-blue-400", textColor: "text-blue-400", weight: "30%" },
  { key: "reliabilityScore" as const, label: "Reliability", icon: Shield, color: "bg-purple-400", textColor: "text-purple-400", weight: "25%" },
  { key: "featureScore" as const, label: "Features", icon: Star, color: "bg-amber-400", textColor: "text-amber-400", weight: "15%" },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export default function ScoreBreakdown({ result }: ScoreBreakdownProps) {
  const [copied, setCopied] = useState(false);
  if (!result.scoreBreakdown || result.scoreBreakdown.length === 0) return null;

  const sorted = [...result.scoreBreakdown].sort((a, b) => b.totalScore - a.totalScore);
  const maxScore = Math.max(...sorted.map((s) => s.totalScore), 1);
  const winnerId = sorted[0]?.carrierId;

  const handleCopy = () => {
    const text = sorted.map((s) => {
      const carrier = CARRIER_MAP[s.carrierId];
      return `${carrier?.icon || "📦"} ${s.carrierName}: ${s.totalScore.toFixed(1)} (Cost: ${s.costScore.toFixed(0)}, Speed: ${s.speedScore.toFixed(0)}, Reliability: ${s.reliabilityScore.toFixed(0)}, Features: ${s.featureScore.toFixed(0)})`;
    }).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass rounded-xl p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
          <Award className="h-3.5 w-3.5 text-accent" /> Score Breakdown
        </h4>
        <div className="flex items-center gap-2">
          <span className="text-[9px] px-2 py-0.5 rounded bg-accent/10 text-accent font-medium">
            {result.optimization} mode
          </span>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCopy}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-[9px] text-muted-foreground hover:text-accent hover:bg-accent/10 transition-all"
          >
            {copied ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Copy className="h-2.5 w-2.5" />}
          </motion.button>
        </div>
      </div>

      {/* Weight Distribution */}
      <div className="flex items-center gap-2 mb-4 p-2 rounded-lg bg-surface/50">
        {scoreDimensions.map((dim) => (
          <div key={dim.key} className="flex items-center gap-1">
            <div className={`w-1.5 h-1.5 rounded-full ${dim.color}`} />
            <span className="text-[9px] text-muted-foreground">{dim.label} {dim.weight}</span>
          </div>
        ))}
      </div>

      {/* Carrier Scores */}
      <motion.div variants={container} initial="hidden" animate="show" className="space-y-3">
        {sorted.map((score, i) => {
          const carrier = CARRIER_MAP[score.carrierId];
          const isWinner = score.carrierId === winnerId;
          const barWidth = (score.totalScore / maxScore) * 100;

          return (
            <motion.div
              key={score.carrierId}
              variants={item}
              whileHover={{ x: 4 }}
              className={`p-3 rounded-xl transition-all ${isWinner ? "bg-accent/5 border border-accent/20 shadow-lg shadow-accent/5" : "bg-surface/30 border border-white/5 hover:border-white/10"}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <motion.span
                    className="text-lg"
                    whileHover={{ scale: 1.2 }}
                  >
                    {carrier?.icon || "📦"}
                  </motion.span>
                  <span className="text-[11px] font-semibold text-foreground">{score.carrierName}</span>
                  {isWinner && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold bg-accent text-white"
                    >
                      <TrendingUp className="h-2 w-2" /> BEST
                    </motion.span>
                  )}
                </div>
                <span className={`text-xs font-bold ${isWinner ? "text-accent" : "text-foreground"}`}>
                  {score.totalScore.toFixed(1)}
                </span>
              </div>

              {/* Total Bar */}
              <div className="h-2.5 rounded-full bg-surface overflow-hidden mb-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${barWidth}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
                  className={`h-full rounded-full ${isWinner ? "bg-accent" : "bg-muted-foreground/30"}`}
                />
              </div>

              {/* Dimension Bars */}
              <div className="grid grid-cols-4 gap-2">
                {scoreDimensions.map((dim) => {
                  const val = score[dim.key];
                  return (
                    <div key={dim.key}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[8px] text-muted-foreground">{dim.label}</span>
                        <span className={`text-[8px] font-medium ${dim.textColor}`}>{val.toFixed(0)}</span>
                      </div>
                      <div className="h-1 rounded-full bg-surface overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${val}%` }}
                          transition={{ duration: 0.6, delay: i * 0.1 + 0.3 }}
                          className={`h-full rounded-full ${dim.color}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
