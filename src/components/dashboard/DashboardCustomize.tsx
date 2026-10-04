"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, RotateCcw } from "lucide-react";
import {
  DASHBOARD_SECTION_IDS,
  DASHBOARD_SECTION_LABELS,
  type DashboardSectionId,
} from "@/hooks/useDashboardSections";

export function DashboardCustomize({
  hidden,
  onToggle,
  onReset,
}: {
  hidden: DashboardSectionId[];
  onToggle: (id: DashboardSectionId) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape and on outside click.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open ]);

  const hiddenCount = hidden.length;

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Customize dashboard sections${hiddenCount > 0 ? `, ${hiddenCount} hidden` : ""}`}
        title="Show, hide, or reset dashboard sections"
        className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-gray-400 transition-all hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60"
      >
        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
        Customize
        {hiddenCount > 0 && (
          <span className="rounded-full bg-[var(--accent)]/20 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {hiddenCount} hidden
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Dashboard section visibility"
          className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-white/[0.1] bg-gray-900/95 p-3 shadow-2xl backdrop-blur-xl"
        >
          <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
            Sections
          </p>
          <ul className="space-y-1">
            {DASHBOARD_SECTION_IDS.map((id) => {
              const visible = !hidden.includes(id);
              return (
                <li key={id}>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs text-gray-300 transition-colors hover:bg-white/[0.05] focus-within:ring-2 focus-within:ring-[var(--accent)]/60">
                    <input
                      type="checkbox"
                      checked={visible}
                      onChange={() => onToggle(id)}
                      aria-label={`Show ${DASHBOARD_SECTION_LABELS[id]} section`}
                      className="h-3.5 w-3.5 shrink-0 accent-[var(--accent)]"
                    />
                    <span className="flex-1">{DASHBOARD_SECTION_LABELS[id]}</span>
                  </label>
                </li>
              );
            })}
          </ul>
          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => {
                onReset();
              }}
              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-gray-400 transition-all hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              Show all sections
            </button>
          )}
        </div>
      )}
    </div>
  );
}
