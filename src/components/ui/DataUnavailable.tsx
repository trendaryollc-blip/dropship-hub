"use client";

import { cn } from "@/lib/utils";
import { KeyRound, RefreshCw } from "lucide-react";

export interface DataUnavailableSetup {
  what?: string;
  whereToGet?: string;
  whereToSet?: string;
  envVar?: string;
}

interface DataUnavailableProps {
  title?: string;
  reason?: string;
  setup?: DataUnavailableSetup;
  onRetry?: () => void;
  className?: string;
}

export default function DataUnavailable({
  title = "Data not available",
  reason,
  setup,
  onRetry,
  className = "",
}: DataUnavailableProps) {
  return (
    <div
      role="status"
      data-testid="data-unavailable"
      className={cn(
        "rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3.5",
        className
      )}
    >
      <div className="flex items-start gap-2.5">
        <KeyRound className="h-4 w-4 mt-0.5 shrink-0 text-rose-400" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-rose-400">{title}</p>
          {reason && (
            <p className="mt-1 text-xs text-muted-foreground">{reason}</p>
          )}
          {setup && (
            <div className="mt-2 space-y-1 text-[11px] text-muted-foreground">
              {setup.what && (
                <p>
                  <span className="text-foreground/70">Needs:</span> {setup.what}
                </p>
              )}
              {setup.whereToGet && (
                <p>
                  <span className="text-foreground/70">Get it:</span>{" "}
                  <a
                    href={setup.whereToGet}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-rose-400 underline underline-offset-2 hover:text-rose-300"
                  >
                    {setup.whereToGet}
                  </a>
                </p>
              )}
              {setup.whereToSet && (
                <p>
                  <span className="text-foreground/70">Set it:</span>{" "}
                  <code className="rounded bg-surface px-1.5 py-0.5 text-[10px] text-foreground/80">
                    {setup.whereToSet}
                  </code>
                </p>
              )}
            </div>
          )}
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-1.5 text-[11px] font-semibold text-rose-400 hover:bg-rose-400/20 transition-all"
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
