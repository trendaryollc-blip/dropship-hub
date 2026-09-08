"use client";

import { type LucideIcon } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export default function SectionHeader({
  title,
  description,
  icon: Icon,
  action,
  className = "",
}: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between pt-2 ${className}`}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/10 border border-accent/20">
            <Icon className="h-3 w-3 text-accent" />
          </div>
        )}
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground font-display">
            {title}
          </span>
          {description && (
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {action && (
        action.href ? (
          <a
            href={action.href}
            className="text-[10px] font-medium text-accent hover:text-accent/80 transition-colors"
          >
            {action.label}
          </a>
        ) : (
          <button
            onClick={action.onClick}
            className="text-[10px] font-medium text-accent hover:text-accent/80 transition-colors"
          >
            {action.label}
          </button>
        )
      )}
      <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent ml-3" />
    </div>
  );
}
