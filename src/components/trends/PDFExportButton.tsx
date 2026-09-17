"use client";

import { useState } from "react";
import { Loader2, FileText } from "lucide-react";
import type { TrendPrediction, RisingStar } from "@/types/trend-predictor";
import { generatePDFHTML, downloadPDFHTML, createReportData } from "@/lib/trends/pdf-report";

interface PDFExportButtonProps {
  predictions?: TrendPrediction[];
  risingStars?: RisingStar[];
  accuracyStats?: {
    overallAccuracy: number;
    directionAccuracy: number;
    peakAccuracy: number;
    totalPredictions: number;
  };
  label?: string;
  className?: string;
}

export default function PDFExportButton({
  predictions = [],
  risingStars = [],
  accuracyStats,
  label = "Export PDF",
  className = "",
}: PDFExportButtonProps) {
  const [generating, setGenerating] = useState(false);

  const handleExport = async () => {
    setGenerating(true);
    try {
      const reportData = createReportData({
        predictions,
        risingStars,
        accuracyStats,
      });
      const html = generatePDFHTML(reportData);
      const filename = `trend-report-${new Date().toISOString().split("T")[0]}.html`;
      downloadPDFHTML(html, filename);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={generating || (predictions.length === 0 && risingStars.length === 0)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs font-semibold text-foreground hover:bg-surface-hover disabled:opacity-50 transition-all ${className}`}
    >
      {generating ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <FileText className="h-3.5 w-3.5" />
      )}
      {generating ? "Generating..." : label}
    </button>
  );
}
