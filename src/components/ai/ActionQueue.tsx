"use client";

import { type BusinessContext } from "@/app/api/ai/context/route";
import {
  AlertTriangle, Zap, TrendingUp, Clock,
  ArrowRight,
} from "lucide-react";

interface ActionQueueProps {
  context: BusinessContext | null;
  onSendPrompt: (prompt: string) => void;
}

interface ActionItem {
  id: string;
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  detail: string;
  prompt: string;
  icon: typeof AlertTriangle;
  color: string;
}

function getPriorityStyle(priority: ActionItem["priority"]): { bg: string; border: string; dot: string } {
  switch (priority) {
    case "critical": return { bg: "bg-red-500/5", border: "border-red-500/20", dot: "bg-red-500" };
    case "high": return { bg: "bg-amber-500/5", border: "border-amber-500/20", dot: "bg-amber-500" };
    case "medium": return { bg: "bg-blue-500/5", border: "border-blue-500/20", dot: "bg-blue-500" };
    case "low": return { bg: "bg-white/[0.02]", border: "border-white/[0.06]", dot: "bg-white/30" };
  }
}

function buildActions(ctx: BusinessContext): ActionItem[] {
  const actions: ActionItem[] = [];

  // Critical: Escalated CS conversations
  if (ctx.customerService.escalatedQueue > 0) {
    actions.push({
      id: "cs-escalation",
      priority: "critical",
      title: `Handle ${ctx.customerService.escalatedQueue} escalated customer conversation${ctx.customerService.escalatedQueue > 1 ? "s" : ""}`,
      detail: ctx.customerService.recentEscalations[0]
        ? `Latest: ${ctx.customerService.recentEscalations[0].customerName} — "${ctx.customerService.recentEscalations[0].reason.slice(0, 40)}"`
        : "Needs immediate attention",
      prompt: `I have ${ctx.customerService.escalatedQueue} escalated customer conversations. Walk me through each one and tell me exactly how to resolve them.`,
      icon: AlertTriangle,
      color: "text-red-400",
    });
  }

  // Critical: Supplier alerts
  if (ctx.suppliers.criticalAlerts.length > 0) {
    const worst = ctx.suppliers.criticalAlerts[0];
    actions.push({
      id: "supplier-critical",
      priority: "critical",
      title: `Supplier issue: ${worst.supplierName}`,
      detail: `${worst.title} — ${worst.description.slice(0, 50)}`,
      prompt: `My supplier ${worst.supplierName} has a critical alert: "${worst.title}". What should I do? Should I find an alternative?`,
      icon: AlertTriangle,
      color: "text-red-400",
    });
  }

  // Critical: Revenue dropping
  if (ctx.revenue.trend === "down" && ctx.revenue.yesterday > 0) {
    actions.push({
      id: "revenue-drop",
      priority: "critical",
      title: "Revenue is trending down",
      detail: `Today: $${ctx.revenue.today} vs Yesterday: $${ctx.revenue.yesterday}`,
      prompt: `My revenue is trending down — today I made $${ctx.revenue.today} vs $${ctx.revenue.yesterday} yesterday. Analyze why this might be happening and what I should do about it.`,
      icon: TrendingUp,
      color: "text-red-400",
    });
  }

  // High: Products in sunset stage
  if (ctx.products.byStage.sunset > 0) {
    actions.push({
      id: "sunset-products",
      priority: "high",
      title: `${ctx.products.byStage.sunset} product${ctx.products.byStage.sunset > 1 ? "s" : ""} in sunset stage`,
      detail: "These products are declining — consider dropping or replacing",
      prompt: `I have ${ctx.products.byStage.sunset} products in the sunset lifecycle stage. Should I drop them? What replacement products should I look for?`,
      icon: Clock,
      color: "text-amber-400",
    });
  }

  // High: Products in saturation
  if (ctx.products.byStage.saturation > 0) {
    actions.push({
      id: "saturation-products",
      priority: "high",
      title: `${ctx.products.byStage.saturation} product${ctx.products.byStage.saturation > 1 ? "s" : ""} in saturation`,
      detail: "Competition is increasing — take action before margins erode",
      prompt: `I have ${ctx.products.byStage.saturation} products in the saturation stage. How do I protect my margins and should I start looking for alternatives?`,
      icon: TrendingUp,
      color: "text-amber-400",
    });
  }

  // Medium: Missions incomplete
  if (ctx.missions.totalToday > 0 && ctx.missions.completedToday < ctx.missions.totalToday) {
    const remaining = ctx.missions.totalToday - ctx.missions.completedToday;
    actions.push({
      id: "missions",
      priority: "medium",
      title: `${remaining} mission${remaining > 1 ? "s" : ""} left today`,
      detail: `${ctx.missions.completedToday}/${ctx.missions.totalToday} completed`,
      prompt: `I have ${remaining} daily missions left. Give me motivation and tips to complete them quickly.`,
      icon: Zap,
      color: "text-blue-400",
    });
  }

  // Medium: Store errors
  if (ctx.store.productsErrored > 0) {
    actions.push({
      id: "store-errors",
      priority: "medium",
      title: `${ctx.store.productsErrored} product${ctx.store.productsErrored > 1 ? "s" : ""} with errors`,
      detail: "Check your store for push failures",
      prompt: `I have ${ctx.store.productsErrored} products with errors in my store. What's the most common cause and how do I fix them?`,
      icon: AlertTriangle,
      color: "text-blue-400",
    });
  }

  // Low: No store connected
  if (ctx.store.connected === 0) {
    actions.push({
      id: "no-store",
      priority: "low",
      title: "No store connected",
      detail: "Connect a store to start selling",
      prompt: "I haven't connected any stores yet. Walk me through setting up my first Shopify or WooCommerce connection.",
      icon: Zap,
      color: "text-muted-foreground",
    });
  }

  return actions.slice(0, 6);
}

export default function ActionQueue({ context, onSendPrompt }: ActionQueueProps) {
  if (!context) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-white/[0.03] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const actions = buildActions(context);

  if (actions.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 mx-auto mb-3">
          <Zap className="h-5 w-5 text-emerald-400" />
        </div>
        <p className="text-sm font-medium text-emerald-400">All Clear!</p>
        <p className="text-[11px] text-muted-foreground mt-1">No urgent actions needed right now</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {actions.map((action) => {
        const style = getPriorityStyle(action.priority);
        return (
          <button
            key={action.id}
            onClick={() => onSendPrompt(action.prompt)}
            className={`w-full flex items-start gap-3 p-3 rounded-xl ${style.bg} border ${style.border} text-left transition-all hover:scale-[1.01] active:scale-[0.99] group`}
          >
            <div className="flex h-2 w-2 shrink-0 rounded-full mt-1.5" style={{ backgroundColor: `var(--tw-${action.color.replace("text-", "")})` }}>
              <div className={`w-2 h-2 rounded-full ${style.dot}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground">{action.title}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{action.detail}</p>
            </div>
            <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
          </button>
        );
      })}
    </div>
  );
}
