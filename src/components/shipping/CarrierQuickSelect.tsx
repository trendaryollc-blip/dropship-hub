"use client";

import { motion } from "framer-motion";
import { Clock, CheckCircle2 } from "lucide-react";
import { CARRIER_CONFIGS, type CarrierId } from "@/types/shipping";

interface CarrierQuickSelectProps {
  onSelect: (carrierId: CarrierId, serviceLevel: string) => void;
  selectedCarrierId?: CarrierId;
  selectedServiceLevel?: string;
  loading?: boolean;
}

const serviceLevelLabels: Record<string, { label: string; color: string; desc: string }> = {
  economy: { label: "Economy", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", desc: "Slowest but cheapest" },
  standard: { label: "Standard", color: "text-blue-400 bg-blue-400/10 border-blue-400/20", desc: "Good balance" },
  express: { label: "Express", color: "text-purple-400 bg-purple-400/10 border-purple-400/20", desc: "Fast delivery" },
  priority: { label: "Priority", color: "text-amber-400 bg-amber-400/10 border-amber-400/20", desc: "Fastest possible" },
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0 },
};

export default function CarrierQuickSelect({ onSelect, selectedCarrierId, selectedServiceLevel, loading }: CarrierQuickSelectProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-4 shadow-xl shadow-black/10"
    >
      <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
        <Clock className="h-3.5 w-3.5 text-accent" /> Select Carrier & Service Level
      </h4>

      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {CARRIER_CONFIGS.map((carrier) => {
          const isSelected = selectedCarrierId === carrier.id;

          return (
            <motion.div
              key={carrier.id}
              variants={item}
              whileHover={{ y: -2 }}
              className={`rounded-xl border transition-all overflow-hidden ${
                isSelected ? "border-accent/30 bg-accent/5 shadow-lg shadow-accent/5" : "border-white/5 bg-surface/30 hover:border-white/10 hover:bg-surface/50"
              }`}
            >
              {/* Carrier Header */}
              <div className="px-3 py-2.5 border-b border-white/5 bg-surface/20">
                <div className="flex items-center gap-2">
                  <motion.span
                    className="text-lg"
                    whileHover={{ scale: 1.2, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    {carrier.icon}
                  </motion.span>
                  <div className="flex-1">
                    <p className="text-[11px] font-semibold text-foreground">{carrier.name}</p>
                    <p className="text-[8px] text-muted-foreground">Max {carrier.maxWeightKg}kg</p>
                  </div>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <CheckCircle2 className="h-4 w-4 text-accent" />
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Service Levels */}
              <div className="p-2 space-y-1">
                {carrier.supportsInternational ? (
                  ["economy", "standard", "express", "priority"].map((sl) => {
                    const slConfig = serviceLevelLabels[sl];
                    const isActive = isSelected && selectedServiceLevel === sl;
                    return (
                      <motion.button
                        key={sl}
                        whileHover={{ x: 2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onSelect(carrier.id, sl)}
                        disabled={loading}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${
                          isActive
                            ? slConfig.color
                            : "border-white/5 text-muted-foreground hover:text-foreground hover:bg-surface"
                        } disabled:opacity-50`}
                      >
                        <span>{slConfig.label}</span>
                        <span className="text-[8px] opacity-60">{slConfig.desc}</span>
                      </motion.button>
                    );
                  })
                ) : (
                  <p className="text-[9px] text-muted-foreground text-center py-2">International not supported</p>
                )}
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
