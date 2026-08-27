"use client";

import { type LucideIcon } from "lucide-react";

interface PromptCardProps {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  gradient: string;
  border: string;
  colorClass: string;
  liveBadge?: string;
  onClick: () => void;
  disabled?: boolean;
}

export default function PromptCard({
  title,
  subtitle,
  icon: Icon,
  gradient,
  border,
  colorClass,
  liveBadge,
  onClick,
  disabled = false,
}: PromptCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group relative flex items-start gap-3 p-4 rounded-2xl border ${gradient} ${border} text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed w-full`}
    >
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${gradient} ${colorClass} group-hover:scale-110 transition-transform`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={`text-sm font-semibold ${colorClass}`}>{title}</p>
          {liveBadge && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-[9px] font-medium text-muted-foreground truncate max-w-[100px]">
              {liveBadge}
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{subtitle}</p>
      </div>
      <div className={`absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity`}>
        <div className={`w-1.5 h-1.5 rounded-full ${colorClass.replace("text-", "bg-")}`} />
      </div>
    </button>
  );
}
