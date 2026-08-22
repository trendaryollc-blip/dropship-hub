"use client";

import Link from "next/link";
import { Brain, TrendingUp, AlertTriangle, Info, AlertOctagon, CheckCheck, ArrowUpRight } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { SmartAlert } from "@/lib/mock-dashboard";

const alertConfig = {
  opportunity: {
    icon: TrendingUp,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-l-emerald-400",
    dot: "bg-emerald-400",
  },
  risk: {
    icon: AlertTriangle,
    color: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-l-red-400",
    dot: "bg-red-400",
  },
  info: {
    icon: Info,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-l-blue-400",
    dot: "bg-blue-400",
  },
  warning: {
    icon: AlertOctagon,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-l-amber-400",
    dot: "bg-amber-400",
  },
};

function AlertCard({ alert, index, onRead }: { alert: SmartAlert; index: number; onRead: (id: string) => void }) {
  const { ref, isInView } = useInView({ threshold: 0.2 });
  const config = alertConfig[alert.type];
  const Icon = config.icon;

  return (
    <div
      ref={ref}
      className={`relative flex items-start gap-3 p-3.5 rounded-xl border-l-2 ${config.border} ${alert.read ? "bg-surface/30" : "bg-surface/60"} transition-all duration-500 hover:bg-surface-hover group ${isInView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${config.bg}`}>
        <Icon className={`h-4 w-4 ${config.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm font-medium ${alert.read ? "text-muted-foreground" : "text-foreground"}`}>
            {alert.title}
          </p>
          {!alert.read && (
            <span className="shrink-0 w-2 h-2 rounded-full bg-accent mt-1.5" />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{alert.description}</p>
        <div className="flex items-center gap-2 mt-2">
          <Link
            href={alert.actionHref}
            onClick={() => onRead(alert.id)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:text-accent-hover transition-colors"
          >
            {alert.action}
            <ArrowUpRight className="h-3 w-3" />
          </Link>
          <span className="text-[10px] text-muted-foreground/60">{alert.timestamp}</span>
        </div>
      </div>
    </div>
  );
}

export default function SmartAlerts({
  alerts,
  onRead,
  onReadAll,
}: {
  alerts: SmartAlert[];
  onRead: (id: string) => void;
  onReadAll: () => void;
}) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <div ref={ref} className={`glass rounded-2xl p-5 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-400/10">
            <Brain className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Market Intelligence</h3>
            {unreadCount > 0 && (
              <p className="text-[10px] text-accent">{unreadCount} new alert{unreadCount > 1 ? "s" : ""}</p>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={onReadAll}
            className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </div>

      <div className="space-y-2 stagger-children">
        {alerts.map((alert, i) => (
          <AlertCard key={alert.id} alert={alert} index={i} onRead={onRead} />
        ))}
      </div>
    </div>
  );
}
