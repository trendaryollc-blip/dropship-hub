"use client";

import { ArrowLeftRight } from "lucide-react";

interface SwapButtonProps {
  onSwap: () => void;
}

export default function SwapButton({ onSwap }: SwapButtonProps) {
  return (
    <button
      onClick={onSwap}
      className="p-2 rounded-lg bg-surface border border-white/10 text-muted-foreground hover:text-accent hover:border-accent/30 hover:bg-accent/5 transition-all"
      title="Swap origin and destination"
    >
      <ArrowLeftRight className="h-3.5 w-3.5" />
    </button>
  );
}
