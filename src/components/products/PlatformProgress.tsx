"use client";

import { Check, Loader2, X, AlertCircle } from "lucide-react";

interface PlatformStatus {
  platform: string;
  name: string;
  status: "pending" | "loading" | "success" | "error";
  resultCount?: number;
  error?: string;
}

interface PlatformProgressProps {
  platforms: PlatformStatus[];
}

const platformIcons: Record<string, string> = {
  amazon: "\ud83d\udce6", ebay: "\ud83c\udff7\ufe0f", aliexpress: "\ud83c\udde8\ud83c\uddf3",
  cj: "\ud83d\ude9a", google_shopping: "\ud83d\udd0d", walmart: "\ud83c\udfea",
  etsy: "\ud83c\udfa8", temu: "\ud83d\udce8", shein: "\ud83d\udc57",
  banggood: "\ud83d\udcb0", dhgate: "\ud83d\udce2", alibaba: "\ud83c\udf10",
};

export default function PlatformProgress({ platforms }: PlatformProgressProps) {
  const completed = platforms.filter((p) => p.status === "success" || p.status === "error").length;
  const total = platforms.length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Loader2 className="h-4 w-4 text-accent animate-spin" />
          </div>
          <span className="text-sm font-medium text-foreground">
            Searching platforms...
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {completed}/{total} ({percent}%)
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 rounded-full bg-surface overflow-hidden mb-3">
        <div
          className="h-full rounded-full bg-gradient-to-r from-accent to-emerald-400 transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Platform grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {platforms.map((p) => (
          <div
            key={p.platform}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all ${
              p.status === "success"
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : p.status === "error"
                  ? "bg-red-500/10 text-red-400 border border-red-500/20"
                  : p.status === "loading"
                    ? "bg-accent/10 text-accent border border-accent/20"
                    : "bg-surface/50 text-muted-foreground border border-transparent"
            }`}
          >
            <span>{platformIcons[p.platform] || "\ud83d\udd17"}</span>
            <span className="truncate font-medium">{p.name}</span>
            <span className="ml-auto shrink-0">
              {p.status === "success" && <Check className="h-3 w-3" />}
              {p.status === "error" && <AlertCircle className="h-3 w-3" />}
              {p.status === "loading" && <Loader2 className="h-3 w-3 animate-spin" />}
            </span>
            {p.status === "success" && p.resultCount !== undefined && (
              <span className="text-[9px] text-emerald-400/70">{p.resultCount}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
