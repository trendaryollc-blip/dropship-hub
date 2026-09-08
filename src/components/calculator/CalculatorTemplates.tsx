"use client";

import { useState } from "react";
import { Layers, ArrowRight, Sparkles, Target, Package, TrendingUp } from "lucide-react";

interface Template {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof Layers;
  color: string;
  bg: string;
  border: string;
  steps: string[];
}

const TEMPLATES: Template[] = [
  {
    id: "new-product",
    title: "New Product Analysis",
    subtitle: "Full profit analysis for a new product you want to sell",
    icon: Package,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
    steps: ["Enter product cost", "Set selling price", "Add shipping & fees", "View profit breakdown"],
  },
  {
    id: "competitor-match",
    title: "Competitor Price Match",
    subtitle: "Find the right price to beat competitors while staying profitable",
    icon: Target,
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    border: "border-violet-400/20",
    steps: ["Enter your cost", "Enter competitor price", "AI suggests optimal price", "Compare scenarios"],
  },
  {
    id: "bulk-order",
    title: "Bulk Order Pricing",
    subtitle: "Calculate margins for volume orders with MOQ discounts",
    icon: Layers,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
    steps: ["Set base cost", "Enter quantity (10/50/100/500)", "Apply volume discounts", "See per-unit margin"],
  },
  {
    id: "subscription",
    title: "Subscription Box",
    subtitle: "Calculate margins for recurring revenue products",
    icon: TrendingUp,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
    steps: ["Set product cost", "Set monthly price", "Factor in shipping", "Calculate LTV & churn impact"],
  },
];

interface CalculatorTemplatesProps {
  onApplyTemplate: (templateId: string) => void;
}

export default function CalculatorTemplates({ onApplyTemplate }: CalculatorTemplatesProps) {
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <Layers className="h-4 w-4 text-accent" />
        <span className="text-sm font-semibold text-foreground">Calculator Templates</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TEMPLATES.map((template) => (
          <div key={template.id}>
            <button
              onClick={() => setExpandedTemplate(expandedTemplate === template.id ? null : template.id)}
              className={`w-full flex items-start gap-3 p-4 rounded-xl border transition-all text-left ${
                expandedTemplate === template.id
                  ? `${template.bg} ${template.border}`
                  : "bg-surface/50 border-border hover:border-accent/20"
              }`}
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${template.bg} ${template.color}`}>
                <template.icon className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${template.color}`}>{template.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{template.subtitle}</p>
              </div>
              <ArrowRight className={`h-4 w-4 text-muted-foreground shrink-0 mt-1 transition-transform ${expandedTemplate === template.id ? "rotate-90" : ""}`} />
            </button>

            {expandedTemplate === template.id && (
              <div className="mt-2 p-3 rounded-xl bg-surface/30 border border-border/50">
                <div className="space-y-2 mb-3">
                  {template.steps.map((step, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full ${template.bg} ${template.color} flex items-center justify-center text-[9px] font-bold shrink-0`}>
                        {i + 1}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{step}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => onApplyTemplate(template.id)}
                  className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg ${template.bg} ${template.color} text-xs font-medium hover:opacity-80 transition-opacity`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Use Template
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
