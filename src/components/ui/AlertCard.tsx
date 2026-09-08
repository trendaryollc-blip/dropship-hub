"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

interface AlertCardProps {
  type: "opportunity" | "risk" | "info" | "warning";
  title: string;
  description: string;
  action?: string;
  actionHref?: string;
  confidence?: number;
  aiAnalysis?: string;
  timestamp?: string;
  read?: boolean;
  onRead?: () => void;
  className?: string;
}

const typeConfig = {
  opportunity: {
    border: "border-l-emerald-400",
    bg: "bg-emerald-400/5",
    badge: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
    label: "Opportunity",
  },
  risk: {
    border: "border-l-rose-400",
    bg: "bg-rose-400/5",
    badge: "bg-rose-400/10 text-rose-400 border-rose-400/20",
    label: "Risk",
  },
  info: {
    border: "border-l-blue-400",
    bg: "bg-blue-400/5",
    badge: "bg-blue-400/10 text-blue-400 border-blue-400/20",
    label: "Info",
  },
  warning: {
    border: "border-l-amber-400",
    bg: "bg-amber-400/5",
    badge: "bg-amber-400/10 text-amber-400 border-amber-400/20",
    label: "Warning",
  },
};

export default function AlertCard({
  type,
  title,
  description,
  action,
  actionHref,
  confidence,
  aiAnalysis,
  timestamp,
  read = false,
  onRead,
  className = "",
}: AlertCardProps) {
  const [expanded, setExpanded] = useState(false);
  const config = typeConfig[type];

  return (
    <div
      className={`border-l-2 ${config.border} ${config.bg} rounded-r-xl p-3 transition-all duration-200 ${
        read ? "opacity-60" : ""
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${config.badge}`}>
              {config.label}
            </span>
            {confidence !== undefined && (
              <span className="text-[10px] font-mono text-muted-foreground">
                {confidence}% confidence
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-foreground truncate">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {aiAnalysis && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1 rounded-md hover:bg-surface-hover transition-colors text-muted-foreground"
              aria-label={expanded ? "Collapse analysis" : "Expand analysis"}
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
          {!read && onRead && (
            <button
              onClick={onRead}
              className="text-[10px] text-accent hover:text-accent/80 font-medium shrink-0"
            >
              Mark read
            </button>
          )}
        </div>
      </div>

      {expanded && aiAnalysis && (
        <div className="mt-2 p-2 rounded-lg bg-surface/50 border border-border">
          <p className="text-[11px] text-muted-foreground leading-relaxed">{aiAnalysis}</p>
        </div>
      )}

      {action && actionHref && (
        <a
          href={actionHref}
          className="inline-flex items-center gap-1 mt-2 text-[11px] font-medium text-accent hover:text-accent/80 transition-colors"
        >
          {action} <ExternalLink size={10} />
        </a>
      )}

      {timestamp && (
        <p className="text-[10px] text-muted-foreground/50 mt-1.5 font-mono">
          {new Date(timestamp).toLocaleTimeString()}
        </p>
      )}
    </div>
  );
}
