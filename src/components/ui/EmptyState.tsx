"use client";

import { cn } from "@/lib/utils";
import { Search, Package, FileText, ShoppingCart, TrendingUp, Inbox } from "lucide-react";

const defaultIcons: Record<string, typeof Inbox> = {
  search: Search,
  products: Package,
  orders: ShoppingCart,
  analytics: TrendingUp,
  documents: FileText,
};

interface EmptyStateProps {
  icon?: typeof Inbox;
  iconName?: string;
  title: string;
  description: string;
  action?: { label: string; href: string } | { label: string; onClick: () => void };
  className?: string;
}

export default function EmptyState({ icon: IconProp, iconName, title, description, action, className }: EmptyStateProps) {
  const Icon = IconProp || (iconName ? defaultIcons[iconName] : Inbox) || Inbox;

  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4", className)}>
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface border border-border mb-5">
        <Icon className="h-8 w-8 text-muted-foreground/40" />
      </div>
      <h3 className="font-display text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground text-center max-w-sm mb-5">{description}</p>
      {action && "href" in action ? (
        <a
          href={action.href}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-all"
        >
          {action.label}
        </a>
      ) : action && "onClick" in action ? (
        <button
          onClick={action.onClick}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-all"
        >
          {action.label}
        </button>
      ) : null}
    </div>
  );
}
