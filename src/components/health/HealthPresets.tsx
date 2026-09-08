"use client";

import { useState } from "react";
import { Layers, ArrowRight, Sparkles, Rocket, Target, Crown, Check } from "lucide-react";

interface PresetTemplate {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof Layers;
  color: string;
  bg: string;
  border: string;
  targetScore: number;
  focus: string;
  tasks: string[];
}

const PRESETS: PresetTemplate[] = [
  {
    id: "beginner",
    title: "Beginner Launch",
    subtitle: "Get from zero to your first sale",
    icon: Rocket,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
    targetScore: 40,
    focus: "Product Research",
    tasks: ["Search for trending products", "Analyze product profit margins", "Find 3+ reliable suppliers", "Calculate break-even point"],
  },
  {
    id: "intermediate",
    title: "Intermediate Growth",
    subtitle: "Build a sustainable business foundation",
    icon: Target,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
    targetScore: 70,
    focus: "Operations",
    tasks: ["Set up backup suppliers", "Set up profit tracking", "Analyze top competitors", "Plan ad budget allocation"],
  },
  {
    id: "advanced",
    title: "Advanced Scale",
    subtitle: "Optimize for maximum profitability",
    icon: Crown,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    border: "border-purple-400/20",
    targetScore: 90,
    focus: "Optimization",
    tasks: ["Verify supplier trust badges", "Analyze cost breakdown", "Identify market gaps", "Connect your first store"],
  },
];

interface HealthPresetsProps {
  onApplyPreset: (presetId: string, focusCategory: string) => void;
}

export default function HealthPresets({ onApplyPreset }: HealthPresetsProps) {
  const [expandedPreset, setExpandedPreset] = useState<string | null>(null);
  const [appliedPreset, setAppliedPreset] = useState<string | null>(null);

  const handleApply = (preset: PresetTemplate) => {
    onApplyPreset(preset.id, preset.focus);
    setAppliedPreset(preset.id);
    setTimeout(() => setAppliedPreset(null), 1500);
  };

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Layers className="h-4 w-4 text-accent" />
        <span className="text-sm font-semibold text-foreground">Quick Start Templates</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {PRESETS.map((preset) => (
          <div key={preset.id}>
            <button
              onClick={() => setExpandedPreset(expandedPreset === preset.id ? null : preset.id)}
              className={`w-full flex flex-col items-start gap-2 p-4 rounded-xl border transition-all text-left ${
                expandedPreset === preset.id
                  ? `${preset.bg} ${preset.border}`
                  : "bg-surface/50 border-border hover:border-accent/20"
              }`}
            >
              <div className="flex items-center gap-2 w-full">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${preset.bg} ${preset.color}`}>
                  <preset.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${preset.color}`}>{preset.title}</p>
                  <p className="text-[10px] text-muted-foreground">{preset.subtitle}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full">
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface border border-border text-muted-foreground">
                  Target: {preset.targetScore}+
                </span>
                <ArrowRight className={`h-3.5 w-3.5 text-muted-foreground ml-auto transition-transform ${expandedPreset === preset.id ? "rotate-90" : ""}`} />
              </div>
            </button>

            {expandedPreset === preset.id && (
              <div className="mt-2 p-3 rounded-xl bg-surface/30 border border-border/50">
                <p className="text-[10px] text-muted-foreground mb-2">Focus: <span className="font-medium text-foreground">{preset.focus}</span></p>
                <div className="space-y-1.5 mb-3">
                  {preset.tasks.map((task, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className={`w-4 h-4 rounded-full ${preset.bg} ${preset.color} flex items-center justify-center text-[8px] font-bold shrink-0`}>
                        {i + 1}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{task}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => handleApply(preset)}
                  className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg ${preset.bg} ${preset.color} text-xs font-medium hover:opacity-80 transition-all ${appliedPreset === preset.id ? "ring-2 ring-emerald-400" : ""}`}
                >
                  {appliedPreset === preset.id ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      Applied!
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      Use Template
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
