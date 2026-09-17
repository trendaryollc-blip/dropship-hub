"use client";

import { motion } from "framer-motion";
import { Package } from "lucide-react";

interface PackagePreset {
  name: string;
  icon: string;
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
}

const presets: PackagePreset[] = [
  { name: "Small Envelope", icon: "✉️", weightKg: 0.2, lengthCm: 20, widthCm: 15, heightCm: 2 },
  { name: "Medium Box", icon: "📦", weightKg: 1, lengthCm: 30, widthCm: 25, heightCm: 15 },
  { name: "Large Box", icon: "📫", weightKg: 3, lengthCm: 45, widthCm: 35, heightCm: 25 },
  { name: "Extra Large", icon: "🚚", weightKg: 8, lengthCm: 60, widthCm: 50, heightCm: 40 },
  { name: "Phone Case", icon: "📱", weightKg: 0.1, lengthCm: 18, widthCm: 10, heightCm: 2 },
  { name: "T-Shirt Pack", icon: "👕", weightKg: 0.3, lengthCm: 25, widthCm: 20, heightCm: 5 },
  { name: "Shoe Box", icon: "👟", weightKg: 1.2, lengthCm: 35, widthCm: 25, heightCm: 15 },
  { name: "Electronics", icon: "🔌", weightKg: 0.5, lengthCm: 25, widthCm: 20, heightCm: 10 },
];

interface PackagePresetsProps {
  onSelect: (preset: PackagePreset) => void;
  activePreset?: string;
}

export default function PackagePresets({ onSelect, activePreset }: PackagePresetsProps) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2 mb-2">
        <Package className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Quick Presets</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {presets.map((preset, i) => (
          <motion.button
            key={preset.name}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.03 }}
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(preset)}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-medium border transition-all ${
              activePreset === preset.name
                ? "border-accent/30 bg-accent/10 text-accent shadow-sm shadow-accent/10"
                : "border-white/5 bg-surface text-muted-foreground hover:text-foreground hover:bg-surface-hover hover:border-white/10"
            }`}
          >
            <motion.span
              className="text-xs"
              whileHover={{ rotate: 10 }}
            >
              {preset.icon}
            </motion.span>
            {preset.name}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
