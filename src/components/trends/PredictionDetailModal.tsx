"use client";

import { useState, useMemo } from "react";
import { X, TrendingUp, TrendingDown, Minus, Flame, ExternalLink, Plus, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ScoreRing from "@/components/ui/ScoreRing";
import TrendLifecycleCurve from "./TrendLifecycleCurve";
import PlatformBreakdown from "./PlatformBreakdown";
import GeographicHeatmap from "./GeographicHeatmap";
import PDFExportButton from "./PDFExportButton";
import type { TrendPrediction, TrendSignal } from "@/types/trend-predictor";
import { exportAnalysisToCSV } from "@/lib/trends/export";
import { formatDate } from "@/lib/dates";

interface PredictionDetailModalProps {
  prediction: TrendPrediction;
  signals?: TrendSignal[];
  geoData?: { region: string; value: number }[];
  history?: { date: string; value: number }[];
  isOpen: boolean;
  onClose: () => void;
  onAddToWatchlist?: (keyword: string, category: string) => void;
}

const DIRECTION_ICONS = { rising: TrendingUp, peaking: Flame, stable: Minus, declining: TrendingDown } as Record<string, typeof TrendingUp>;
const DIRECTION_COLORS = { rising: "text-emerald-400", peaking: "text-amber-400", stable: "text-blue-400", declining: "text-red-400" } as Record<string, string>;

export default function PredictionDetailModal({
  prediction,
  signals = [],
  geoData = [],
  history = [],
  isOpen,
  onClose,
  onAddToWatchlist,
}: PredictionDetailModalProps) {
  const [activeSection, setActiveSection] = useState<"overview" | "platforms" | "geography" | "reasoning">("overview");

  const platformData = useMemo(() => signals.map((s) => ({
    platform: s.platform,
    volume: s.volume,
    growth: s.growthRate,
    engagement: s.velocity,
  })), [signals]);

  const DirIcon = DIRECTION_ICONS[prediction.direction] || Minus;
  const dirColor = DIRECTION_COLORS[prediction.direction] || "text-gray-400";

  return (
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          key="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
          onKeyDown={(e) => e.key === "Escape" && onClose()}
        >
          <motion.div
            key="modal-content"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-background border border-border shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Trend analysis for ${prediction.productIdea}`}
          >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <DirIcon className={`h-5 w-5 ${dirColor}`} />
                  <h2 className="font-display text-lg sm:text-xl font-bold text-foreground truncate">
                    {prediction.productIdea}
                  </h2>
                  <span className="text-xs text-muted-foreground">· {prediction.category}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Created {formatDate(prediction.createdAt) || "—"}</span>
                  <span>·</span>
                  <span className={`font-semibold ${dirColor}`}>{prediction.direction}</span>
                  <span>·</span>
                  <span>{prediction.timeToPeak ? `${prediction.timeToPeak} to peak` : "Peak timing not available"}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {onAddToWatchlist && (
                  <button
                    onClick={() => onAddToWatchlist(prediction.productIdea, prediction.category)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/80 transition-all"
                  >
                    <Plus className="h-3.5 w-3.5" /> Watch
                  </button>
                )}
                <button
                  onClick={() => exportAnalysisToCSV(prediction.productIdea, signals, prediction)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs font-semibold text-foreground hover:bg-surface-hover transition-all"
                >
                  <Download className="h-3.5 w-3.5" /> CSV
                </button>
                <PDFExportButton
                  predictions={[prediction]}
                  label="PDF"
                  className="!px-3 !py-1.5 !rounded-lg"
                />
                <button onClick={onClose} aria-label="Close modal" className="p-1.5 rounded-lg hover:bg-surface transition-all">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Section Tabs */}
            <div className="flex gap-1 mt-3">
              {(["overview", "platforms", "geography", "reasoning"] as const).map((section) => (
                <button
                  key={section}
                  onClick={() => setActiveSection(section)}
                  className={`px-3 py-1 rounded-lg text-[11px] font-semibold capitalize transition-all ${
                    activeSection === section
                      ? "bg-accent text-white"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface"
                  }`}
                >
                  {section}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-5 space-y-4">
            {activeSection === "overview" && (
              <>
                {/* Score + Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="col-span-2 sm:col-span-1 flex justify-center">
                    <ScoreRing value={prediction.trendScore} size={100} />
                  </div>
                  <div className="p-3 rounded-xl bg-surface">
                    <p className="text-[10px] text-muted-foreground">Confidence</p>
                    <p className={`text-sm font-bold capitalize ${
                      prediction.confidence === "high" ? "text-emerald-400" :
                      prediction.confidence === "medium" ? "text-amber-400" : "text-red-400"
                    }`}>{prediction.confidence}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-surface">
                    <p className="text-[10px] text-muted-foreground">Time to Peak</p>
                    <p className="text-sm font-bold text-foreground">{prediction.timeToPeak || "—"}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-surface">
                    <p className="text-[10px] text-muted-foreground">Est. Margin</p>
                    <p className="text-sm font-bold text-emerald-400">{prediction.estimatedMargin}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-surface">
                    <p className="text-[10px] text-muted-foreground">Competition</p>
                    <p className={`text-sm font-bold ${
                      prediction.competitionLevel === "low" ? "text-emerald-400" :
                      prediction.competitionLevel === "medium" ? "text-amber-400" : "text-red-400"
                    }`}>{prediction.competitionLevel.replace("_", " ")}</p>
                  </div>
                </div>

                {/* Lifecycle Curve */}
                <TrendLifecycleCurve
                  actualData={history}
                  emptyNote="No history source connected — connect Google Trends to see actual interest over time"
                  forecastNote="Forecast unavailable — no historical series"
                  currentStage={prediction.direction === "rising" ? "rising" : prediction.direction === "peaking" ? "peak" : prediction.direction === "declining" ? "declining" : "emerging"}
                  predictedPeakDate={prediction.predictedPeak ?? undefined}
                  height={220}
                />

                {/* Related Keywords */}
                <div className="rounded-xl bg-surface border border-border p-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Related Keywords</p>
                  <div className="flex flex-wrap gap-1.5">
                    {prediction.relatedKeywords?.map((kw, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-accent/10 text-accent text-[11px] font-semibold">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Suggested Platforms */}
                <div className="rounded-xl bg-surface border border-border p-3">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Suggested Platforms</p>
                  <div className="flex flex-wrap gap-1.5">
                    {prediction.suggestedPlatforms?.map((p, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg bg-blue-400/10 text-blue-400 text-[11px] font-semibold capitalize flex items-center gap-1">
                        {p} <ExternalLink className="h-2.5 w-2.5" />
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}

            {activeSection === "platforms" && (
              <PlatformBreakdown data={platformData} metric="volume" height={250} />
            )}

            {activeSection === "geography" && (
              <GeographicHeatmap data={geoData} height={300} />
            )}

            {activeSection === "reasoning" && (
              <div className="rounded-xl bg-surface border border-border p-4">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Scoring rationale</p>
                <p className="text-sm text-foreground leading-relaxed">{prediction.reasoning}</p>
                <div className="mt-4 pt-3 border-t border-border">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Saturation Risk: </span>
                      <span className="font-semibold text-foreground">{prediction.saturationRisk}%</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Predicted Peak: </span>
                      <span className="font-semibold text-foreground">{prediction.predictedPeak || "—"}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
