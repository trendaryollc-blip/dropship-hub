"use client";

import { cn } from "@/lib/utils";
import { Clock, RefreshCw } from "lucide-react";

interface QuotaExhaustedProps {
  provider: string;
  keyCount?: number;
  resetsAt?: string | Date;
  onRetry?: () => void;
  className?: string;
}

export default function QuotaExhausted({
  provider,
  keyCount,
  resetsAt,
  onRetry,
  className = "",
}: QuotaExhaustedProps) {
  const resetLabel =
    resetsAt !== undefined
      ? new Date(resetsAt).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : undefined;

  return (
    <div
      role="status"
      data-testid="quota-exhausted"
      className={cn(
        "rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3.5",
        className
      )}
    >
      <div className="flex items-start gap-2.5">
        <Clock className="h-4 w-4 mt-0.5 shrink-0 text-amber-400" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-amber-400">
            {provider} quota exhausted
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {keyCount !== undefined && (
              <>
                All {keyCount} key{keyCount === 1 ? "" : "s"} hit their free-tier
                limit.{" "}
              </>
            )}
            {resetLabel ? `Resets around ${resetLabel}.` : "Resets with the provider's next quota window."}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Add another key to the pool or upgrade the {provider} plan to restore
            live data. No fallback numbers are shown while quota is exhausted.
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-1.5 text-[11px] font-semibold text-amber-400 hover:bg-amber-400/20 transition-all"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
