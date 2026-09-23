"use client";

import { motion } from "framer-motion";
import { Clock, AlertTriangle, Cloud, FileText, Package, Sun, CheckCircle2 } from "lucide-react";
import type { DeliveryPredictionResult } from "@/types/shipping";

const riskColors: Record<string, { color: string; bg: string }> = {
  low: { color: "text-emerald-400", bg: "bg-emerald-400/10" },
  medium: { color: "text-amber-400", bg: "bg-amber-400/10" },
  high: { color: "text-red-400", bg: "bg-red-400/10" },
};

const riskIcons: Record<string, typeof Cloud> = {
  weather: Cloud,
  customs: FileText,
  holiday: Sun,
  carrier_delay: Package,
  route_complexity: Package,
  peak_season: AlertTriangle,
};

interface DeliveryTimelineProps {
  prediction: DeliveryPredictionResult;
}

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export default function DeliveryTimeline({ prediction }: DeliveryTimelineProps) {
  const confidencePercent = Math.round(prediction.confidence * 100);
  const confidenceColor = confidencePercent >= 80 ? "text-emerald-400" : confidencePercent >= 60 ? "text-amber-400" : "text-red-400";
  const confidenceBg = confidencePercent >= 80 ? "bg-emerald-400" : confidencePercent >= 60 ? "bg-amber-400" : "bg-red-400";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="glass rounded-xl p-4"
    >
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
          <Clock className="h-4 w-4 text-accent" />
          Delivery Prediction
        </h4>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">Confidence</span>
          <div className="w-16 h-1.5 rounded-full bg-surface overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${confidencePercent}%` }}
              transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
              className={`h-full rounded-full ${confidenceBg}`}
            />
          </div>
          <span className={`text-xs font-semibold ${confidenceColor}`}>{confidencePercent}%</span>
        </div>
      </div>

      {/* Timeline Visual */}
      <div className="relative mb-4">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, delay: 0.2 }}
            className="flex flex-col items-center"
          >
            <div className="w-3 h-3 rounded-full bg-accent shadow-lg shadow-accent/30" />
            <div className="w-0.5 h-8 bg-accent/30" />
          </motion.div>
          <div className="flex-1">
            <p className="text-[10px] text-muted-foreground">Ship Date</p>
            <p className="text-xs font-semibold text-foreground">{prediction.shipByDate}</p>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex flex-col items-center px-4"
          >
            <motion.div
              animate={{ x: [0, 4, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Truck className="h-4 w-4 text-muted-foreground" />
            </motion.div>
            <div className="w-20 h-0.5 bg-surface relative overflow-hidden">
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/50 to-transparent"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-muted-foreground">✈️ In Transit</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 300, delay: 0.4 }}
            className="flex flex-col items-center"
          >
            <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/30" />
            <div className="w-0.5 h-8 bg-emerald-400/30" />
          </motion.div>
          <div className="flex-1 text-right">
            <p className="text-[10px] text-muted-foreground">Estimated Arrival</p>
            <p className="text-xs font-semibold text-emerald-400">{prediction.estimatedArrival.average}</p>
          </div>
        </div>
      </div>

      {/* Date Range */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
        <motion.div variants={item} className="p-2 rounded-lg bg-surface/50 text-center hover:bg-surface transition-colors">
          <p className="text-[9px] text-muted-foreground">Earliest</p>
          <p className="text-xs font-bold text-emerald-400">{prediction.estimatedArrival.earliest}</p>
          <p className="text-[9px] text-muted-foreground">{prediction.predictedDays.min} days</p>
        </motion.div>
        <motion.div variants={item} className="p-2 rounded-lg bg-accent/10 border border-accent/20 text-center">
          <p className="text-[9px] text-muted-foreground">Average</p>
          <p className="text-xs font-bold text-accent">{prediction.estimatedArrival.average}</p>
          <p className="text-[9px] text-muted-foreground">{prediction.predictedDays.average} days</p>
        </motion.div>
        <motion.div variants={item} className="p-2 rounded-lg bg-surface/50 text-center hover:bg-surface transition-colors">
          <p className="text-[9px] text-muted-foreground">Latest</p>
          <p className="text-xs font-bold text-amber-400">{prediction.estimatedArrival.latest}</p>
          <p className="text-[9px] text-muted-foreground">{prediction.predictedDays.max} days</p>
        </motion.div>
      </motion.div>

      {/* Delay Risks */}
      <motion.div variants={container} initial="hidden" animate="show" className="flex flex-wrap gap-2 mb-3">
        {prediction.weatherDelayRisk > 0 && (
          <motion.div variants={item} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-blue-400/5 text-[9px] text-blue-400">
            <Cloud className="h-2.5 w-2.5" /> +{prediction.weatherDelayRisk}d weather
          </motion.div>
        )}
        {prediction.customsDelayRisk > 0 && (
          <motion.div variants={item} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-purple-400/5 text-[9px] text-purple-400">
            <FileText className="h-2.5 w-2.5" /> +{prediction.customsDelayRisk}d customs
          </motion.div>
        )}
        {prediction.holidayDelayRisk > 0 && (
          <motion.div variants={item} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-400/5 text-[9px] text-amber-400">
            <Sun className="h-2.5 w-2.5" /> +{prediction.holidayDelayRisk}d holiday
          </motion.div>
        )}
      </motion.div>

      {/* Risk Factors */}
      {prediction.riskFactors.length > 0 && (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-1.5">
          <p className="text-[10px] text-muted-foreground font-medium">Risk Factors</p>
          {prediction.riskFactors.map((risk, i) => {
            const RiskIcon = riskIcons[risk.type] || Package;
            const rc = riskColors[risk.severity] || riskColors.low;
            return (
              <motion.div
                key={i}
                variants={item}
                className={`flex items-center gap-2 p-2 rounded-lg ${rc.bg} hover:brightness-110 transition-all`}
              >
                <RiskIcon className={`h-3 w-3 ${rc.color} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] font-medium ${rc.color}`}>{risk.description}</p>
                  {risk.estimatedDelayDays > 0 && (
                    <p className="text-[9px] text-muted-foreground">+{risk.estimatedDelayDays} days estimated delay</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Historical Accuracy */}
      <div className="mt-3 pt-3 border-t border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Historical accuracy</span>
          </div>
          <span className="text-[10px] font-semibold text-foreground">{Math.round(prediction.historicalAccuracy * 100)}%</span>
        </div>
        <div className="mt-1 h-1 rounded-full bg-surface overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.round(prediction.historicalAccuracy * 100)}%` }}
            transition={{ duration: 1, delay: 0.5 }}
            className="h-full rounded-full bg-accent"
          />
        </div>
      </div>
    </motion.div>
  );
}

function Truck(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
      <path d="M15 18H9" />
      <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
      <circle cx="17" cy="18" r="2" />
      <circle cx="7" cy="18" r="2" />
    </svg>
  );
}
