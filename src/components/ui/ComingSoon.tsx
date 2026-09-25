"use client";

import { cn } from "@/lib/utils";
import { Construction } from "lucide-react";

interface ComingSoonProps {
  title?: string;
  /** The concrete deliverable being built — never an open-ended promise. */
  whatNeeded: string;
  /** Optional pointer: where the required source/data comes from. */
  howToGet?: string;
  className?: string;
}

export default function ComingSoon({
  title = "Coming soon",
  whatNeeded,
  howToGet,
  className = "",
}: ComingSoonProps) {
  return (
    <div
      role="status"
      data-testid="coming-soon"
      className={cn(
        "rounded-xl border border-purple-400/20 bg-purple-400/10 px-4 py-3.5",
        className
      )}
    >
      <div className="flex items-start gap-2.5">
        <Construction className="h-4 w-4 mt-0.5 shrink-0 text-purple-400" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-purple-400">{title}</p>
          <p className="mt-1 text-xs text-muted-foreground">{whatNeeded}</p>
          {howToGet && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              <span className="text-foreground/70">Source:</span> {howToGet}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
