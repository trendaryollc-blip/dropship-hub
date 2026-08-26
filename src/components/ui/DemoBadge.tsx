"use client";

import { Info } from "lucide-react";

export default function DemoBadge({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-400/10 border border-amber-400/20 text-amber-400 text-[10px] font-semibold ${className}`}>
      <Info className="h-3 w-3" />
      Demo Data
    </div>
  );
}
