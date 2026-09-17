"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, CheckCircle2, X, ChevronDown } from "lucide-react";
import type { ShippingOptimization, CarrierId } from "@/types/shipping";
import { CARRIER_CONFIGS } from "@/types/shipping";

interface ConstraintBuilderProps {
  optimization: ShippingOptimization;
  onOptimizationChange: (opt: ShippingOptimization) => void;
  maxBudget: string;
  onMaxBudgetChange: (val: string) => void;
  maxDeliveryDays: string;
  onMaxDeliveryDaysChange: (val: string) => void;
  requiredTracking: boolean;
  onRequiredTrackingChange: (val: boolean) => void;
  requiredInsurance: boolean;
  onRequiredInsuranceChange: (val: boolean) => void;
  excludeCarriers: CarrierId[];
  onExcludeCarriersChange: (val: CarrierId[]) => void;
}

const optimizationModes: { id: ShippingOptimization; label: string; description: string; icon: string; color: string }[] = [
  { id: "cost", label: "Cheapest", description: "Minimize shipping expenses", icon: "💰", color: "border-emerald-400/40 bg-emerald-400/10 text-emerald-400" },
  { id: "speed", label: "Fastest", description: "Get it there ASAP", icon: "⚡", color: "border-blue-400/40 bg-blue-400/10 text-blue-400" },
  { id: "balanced", label: "Balanced", description: "Best mix of cost and speed", icon: "⚖️", color: "border-purple-400/40 bg-purple-400/10 text-purple-400" },
  { id: "reliability", label: "Reliable", description: "Prioritize on-time delivery", icon: "🛡️", color: "border-amber-400/40 bg-amber-400/10 text-amber-400" },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

export default function ConstraintBuilder({
  optimization,
  onOptimizationChange,
  maxBudget,
  onMaxBudgetChange,
  maxDeliveryDays,
  onMaxDeliveryDaysChange,
  requiredTracking,
  onRequiredTrackingChange,
  requiredInsurance,
  onRequiredInsuranceChange,
  excludeCarriers,
  onExcludeCarriersChange,
}: ConstraintBuilderProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const toggleExclude = (id: CarrierId) => {
    onExcludeCarriersChange(
      excludeCarriers.includes(id)
        ? excludeCarriers.filter((c) => c !== id)
        : [...excludeCarriers, id]
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass rounded-2xl p-4 shadow-xl shadow-black/10"
    >
      {/* Optimization Mode */}
      <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
        <Settings className="h-3.5 w-3.5 text-accent" /> Optimization Mode
      </h4>
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 gap-2 mb-4">
        {optimizationModes.map((mode) => (
          <motion.button
            key={mode.id}
            variants={item}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onOptimizationChange(mode.id)}
            className={`p-3 rounded-xl text-left border transition-all ${
              optimization === mode.id
                ? `${mode.color} ring-1 ring-current/20 shadow-lg shadow-current/5`
                : "border-white/5 bg-surface hover:bg-surface-hover hover:border-white/10"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <motion.span
                className="text-sm"
                animate={optimization === mode.id ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                {mode.icon}
              </motion.span>
              <span className={`text-[11px] font-semibold ${optimization === mode.id ? "text-current" : "text-foreground"}`}>
                {mode.label}
              </span>
            </div>
            <p className="text-[9px] text-muted-foreground">{mode.description}</p>
          </motion.button>
        ))}
      </motion.div>

      {/* Quick Constraints */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block font-medium">Max Budget (USD)</label>
          <input
            type="number"
            min="0"
            value={maxBudget}
            onChange={(e) => onMaxBudgetChange(e.target.value)}
            placeholder="No limit"
            className="w-full px-3 py-1.5 bg-surface border border-white/10 rounded-xl text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
          />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block font-medium">Max Delivery Days</label>
          <input
            type="number"
            min="1"
            value={maxDeliveryDays}
            onChange={(e) => onMaxDeliveryDaysChange(e.target.value)}
            placeholder="No limit"
            className="w-full px-3 py-1.5 bg-surface border border-white/10 rounded-xl text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
          />
        </div>
      </div>

      {/* Feature Requirements */}
      <div className="flex flex-wrap gap-2 mb-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onRequiredTrackingChange(!requiredTracking)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-medium border transition-all ${
            requiredTracking
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400 shadow-sm shadow-emerald-400/10"
              : "border-white/5 bg-surface text-muted-foreground hover:text-foreground hover:border-white/10"
          }`}
        >
          <motion.div
            animate={requiredTracking ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.2 }}
          >
            {requiredTracking ? <CheckCircle2 className="h-3 w-3" /> : <div className="w-3 h-3 rounded border border-white/20" />}
          </motion.div>
          Tracking Required
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onRequiredInsuranceChange(!requiredInsurance)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-medium border transition-all ${
            requiredInsurance
              ? "border-blue-400/30 bg-blue-400/10 text-blue-400 shadow-sm shadow-blue-400/10"
              : "border-white/5 bg-surface text-muted-foreground hover:text-foreground hover:border-white/10"
          }`}
        >
          <motion.div
            animate={requiredInsurance ? { scale: [1, 1.3, 1] } : {}}
            transition={{ duration: 0.2 }}
          >
            {requiredInsurance ? <CheckCircle2 className="h-3 w-3" /> : <div className="w-3 h-3 rounded border border-white/20" />}
          </motion.div>
          Insurance Required
        </motion.button>
      </div>

      {/* Advanced Toggle */}
      <motion.button
        whileHover={{ x: 2 }}
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="inline-flex items-center gap-1 text-[10px] text-accent hover:text-accent/80 transition-all font-medium"
      >
        <motion.div animate={{ rotate: showAdvanced ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-3 w-3" />
        </motion.div>
        {showAdvanced ? "Hide" : "Show"} Advanced Settings
      </motion.button>

      {/* Advanced: Carrier Exclusion */}
      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-white/5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Exclude Carriers</p>
              <div className="flex flex-wrap gap-1.5">
                {CARRIER_CONFIGS.map((carrier, i) => {
                  const excluded = excludeCarriers.includes(carrier.id);
                  return (
                    <motion.button
                      key={carrier.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleExclude(carrier.id)}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                        excluded
                          ? "border-red-400/30 bg-red-400/10 text-red-400 line-through"
                          : "border-white/5 bg-surface text-muted-foreground hover:text-foreground hover:border-white/10"
                      }`}
                    >
                      {excluded ? <X className="h-2.5 w-2.5" /> : <CheckCircle2 className="h-2.5 w-2.5" />}
                      <span>{carrier.icon}</span>
                      {carrier.name.split(" ")[0]}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
