"use client";

import { cn } from "@/lib/utils";
import { Database, Radio, User, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type DataSourceKind = "live" | "firestore" | "user" | "estimated";

interface DataSourceBadgeProps {
  source: DataSourceKind;
  className?: string;
}

const KINDS: Record<
  DataSourceKind,
  { label: string; icon: LucideIcon; classes: string }
> = {
  live: {
    label: "Live API",
    icon: Radio,
    classes: "bg-emerald-400/10 border-emerald-400/20 text-emerald-400",
  },
  firestore: {
    label: "Your data",
    icon: Database,
    classes: "bg-blue-400/10 border-blue-400/20 text-blue-400",
  },
  user: {
    label: "Your entry",
    icon: User,
    classes: "bg-cyan-400/10 border-cyan-400/20 text-cyan-400",
  },
  estimated: {
    label: "Estimated",
    icon: Sparkles,
    classes: "bg-amber-400/10 border-amber-400/20 text-amber-400",
  },
};

export default function DataSourceBadge({
  source,
  className = "",
}: DataSourceBadgeProps) {
  const kind = KINDS[source] ?? KINDS.estimated;
  const Icon = kind.icon;
  return (
    <span
      data-testid="data-source-badge"
      data-source={source}
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
        kind.classes,
        className
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {kind.label}
    </span>
  );
}
