"use client";

import { useState, useRef, useEffect } from "react";
import { Download, FileText, FileSpreadsheet, Copy, Check } from "lucide-react";

interface ValidationExportButtonProps {
  data: Record<string, unknown>;
  title?: string;
}

export default function ValidationExportButton({ data, title = "Validation Report" }: ValidationExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleCSV = () => {
    const rows = Object.entries(data).map(([k, v]) => `${k},"${String(v).replace(/"/g, '""')}"`);
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "_").toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const handleJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "_").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface/50 border border-border/50 hover:bg-surface/80 transition-colors"
      >
        <Download className="h-4 w-4 text-muted-foreground" />
        <span className="text-[11px] text-foreground font-medium">Export</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 py-2 rounded-xl glass border border-border/50 shadow-xl z-50">
          <button
            onClick={handleJSON}
            className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-surface/50 transition-colors"
          >
            <FileText className="h-4 w-4 text-blue-400" />
            <span className="text-[12px] text-foreground">Export as JSON</span>
          </button>
          <button
            onClick={handleCSV}
            className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-surface/50 transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            <span className="text-[12px] text-foreground">Export as CSV</span>
          </button>
          <div className="h-px bg-border/50 my-1" />
          <button
            onClick={handleCopy}
            className="flex items-center gap-3 w-full px-3 py-2.5 hover:bg-surface/50 transition-colors"
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : (
              <Copy className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-[12px] text-foreground">{copied ? "Copied!" : "Copy to clipboard"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
