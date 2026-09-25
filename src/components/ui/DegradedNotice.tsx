"use client";

import { cn } from "@/lib/utils";
import { TriangleAlert } from "lucide-react";

interface DegradedNoticeProps {
  failedPlatforms: string[];
  succeededCount?: number;
  className?: string;
}

export default function DegradedNotice({
  failedPlatforms,
  succeededCount,
  className = "",
}: DegradedNoticeProps) {
  if (failedPlatforms.length === 0) return null;

  return (
    <div
      role="status"
      data-testid="degraded-notice"
      className={cn(
        "flex items-start gap-2.5 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3",
        className
      )}
    >
      <TriangleAlert className="h-4 w-4 mt-0.5 shrink-0 text-amber-400" />
      <div className="min-w-0 flex-1 text-xs text-muted-foreground">
        <span className="font-semibold text-amber-400">Partial results.</span>{" "}
        {succeededCount !== undefined && (
          <>
            {succeededCount} platform{succeededCount === 1 ? "" : "s"} responded;{" "}
          </>
        )}
        didn&apos;t respond: {failedPlatforms.join(", ")}. Missing platforms show
        no data rather than estimates.
      </div>
    </div>
  );
}
