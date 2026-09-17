"use client";

import { Calendar } from "lucide-react";

interface ShipDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  minDate?: string;
}

export default function ShipDatePicker({ value, onChange, minDate }: ShipDatePickerProps) {
  const today = minDate || new Date().toISOString().split("T")[0];
  const maxDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <input
        type="date"
        value={value}
        min={today}
        max={maxDate}
        onChange={(e) => onChange(e.target.value)}
        className="px-3 py-1.5 bg-surface border border-white/10 rounded-lg text-[11px] text-foreground focus:outline-none focus:border-accent [color-scheme:dark]"
      />
    </div>
  );
}
