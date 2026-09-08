"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Package, TrendingUp, Truck, AlertTriangle, Info, Lightbulb,
  X, ArrowRight,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { ContextualAction } from "@/types/dashboard";

const iconMap: Record<string, typeof Package> = {
  Package, TrendingUp, Truck, AlertTriangle, Info, Lightbulb,
};

const typeConfig = {
  urgent: {
    border: "border-l-red-400",
    bg: "bg-red-400/5",
    hoverBg: "hover:bg-red-400/10",
    badgeBg: "bg-red-400/10",
    badgeText: "text-red-400",
    badgeBorder: "border-red-400/20",
    icon: AlertTriangle,
    iconColor: "text-red-400",
  },
  suggestion: {
    border: "border-l-emerald-400",
    bg: "bg-emerald-400/5",
    hoverBg: "hover:bg-emerald-400/10",
    badgeBg: "bg-emerald-400/10",
    badgeText: "text-emerald-400",
    badgeBorder: "border-emerald-400/20",
    icon: Lightbulb,
    iconColor: "text-emerald-400",
  },
  info: {
    border: "border-l-blue-400",
    bg: "bg-blue-400/5",
    hoverBg: "hover:bg-blue-400/10",
    badgeBg: "bg-blue-400/10",
    badgeText: "text-blue-400",
    badgeBorder: "border-blue-400/20",
    icon: Info,
    iconColor: "text-blue-400",
  },
};

function ActionChip({ action, index, onDismiss }: {
  action: ContextualAction;
  index: number;
  onDismiss: (id: string) => void;
}) {
  const { ref, isInView } = useInView({ threshold: 0.2 });
  const cfg = typeConfig[action.type];
  const Icon = iconMap[action.icon] || cfg.icon;

  return (
    <div
      ref={ref}
      className={`relative flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-xl border-l-2 ${cfg.border} ${cfg.bg} ${cfg.hoverBg} transition-all duration-400 group ${isInView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${cfg.badgeBg} border ${cfg.badgeBorder}`}>
        <Icon className={`h-3 w-3 ${cfg.iconColor}`} />
      </div>
      <p className="text-xs text-muted-foreground flex-1 min-w-0">
        <span className="text-foreground font-medium">{action.message}</span>
      </p>
      <Link
        href={action.href}
        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface/50 border border-border text-[10px] font-semibold text-accent hover:bg-accent/10 hover:border-accent/20 transition-all shrink-0"
      >
        {action.action}
        <ArrowRight className="h-2.5 w-2.5" />
      </Link>
      <button
        onClick={(e) => { e.preventDefault(); onDismiss(action.id); }}
        className="p-1 rounded-md text-muted-foreground/40 hover:text-muted-foreground hover:bg-surface transition-all opacity-0 group-hover:opacity-100 shrink-0"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

export default function ContextualActions({ actions }: { actions: ContextualAction[] }) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const visible = actions.filter((a) => !dismissed.includes(a.id));

  if (visible.length === 0) return null;

  const dismiss = (id: string) => setDismissed((prev) => [...prev, id]);

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((action, i) => (
        <ActionChip key={action.id} action={action} index={i} onDismiss={dismiss} />
      ))}
    </div>
  );
}
