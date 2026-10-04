"use client";

import { useId, useState } from "react";
import { Info } from "lucide-react";

/**
 * Keyboard-accessible inline help tooltip for complex dashboard metrics.
 * Shows on hover AND keyboard focus (unlike title-only tooltips).
 */
export function MetricHelp({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        aria-label={`What is ${label}?`}
        aria-expanded={open}
        aria-describedby={tooltipId}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-gray-500 hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60 transition-colors"
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
      {open && (
        <span
          id={tooltipId}
          role="tooltip"
          className="absolute left-1/2 top-full z-50 mt-2 w-56 -translate-x-1/2 rounded-xl border border-white/[0.1] bg-gray-900/95 p-2.5 text-[11px] leading-relaxed text-gray-300 shadow-2xl backdrop-blur-xl"
        >
          {text}
        </span>
      )}
    </span>
  );
}
