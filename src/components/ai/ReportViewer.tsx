"use client";

import { useState } from "react";
import {
  FileText, Calendar, TrendingUp, TrendingDown,
  Minus, ChevronDown, ChevronUp, Download,
} from "lucide-react";

interface ReportSection {
  title: string;
  content: string;
  metric?: string;
  trend?: "up" | "down" | "stable";
  icon: string;
}

interface BusinessReport {
  period: "weekly" | "monthly";
  dateRange: { start: string; end: string };
  generatedAt: string;
  summary: string;
  sections: ReportSection[];
  healthScore: number;
  highlights: string[];
  concerns: string[];
  recommendations: string[];
}

interface ReportViewerProps {
  report: BusinessReport | null;
  onGenerate: (period: "weekly" | "monthly") => void;
  loading?: boolean;
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "up") return <TrendingUp className="h-4 w-4 text-emerald-400" />;
  if (trend === "down") return <TrendingDown className="h-4 w-4 text-red-400" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

export default function ReportViewer({ report, onGenerate, loading = false }: ReportViewerProps) {
  const [expanded, setExpanded] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<"weekly" | "monthly">("weekly");

  return (
    <div className="space-y-4">
      {/* Period selector */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSelectedPeriod("weekly")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            selectedPeriod === "weekly"
              ? "bg-accent/10 text-accent border border-accent/20"
              : "bg-white/[0.03] text-muted-foreground border border-white/[0.06] hover:bg-white/[0.05]"
          }`}
        >
          Weekly
        </button>
        <button
          onClick={() => setSelectedPeriod("monthly")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            selectedPeriod === "monthly"
              ? "bg-accent/10 text-accent border border-accent/20"
              : "bg-white/[0.03] text-muted-foreground border border-white/[0.06] hover:bg-white/[0.05]"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => onGenerate(selectedPeriod)}
          disabled={loading}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate Report"}
        </button>
      </div>

      {/* Report content */}
      {report && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
          {/* Header */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between p-4 hover:bg-white/[0.03] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                <FileText className="h-5 w-5 text-accent" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">
                  {report.period === "weekly" ? "Weekly" : "Monthly"} Business Report
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {report.dateRange.start} to {report.dateRange.end}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-lg font-bold text-foreground">{report.healthScore}/100</p>
                <p className="text-[9px] text-muted-foreground">Health</p>
              </div>
              {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </div>
          </button>

          {expanded && (
            <div className="px-4 pb-4 space-y-4 border-t border-white/[0.06]">
              {/* Summary */}
              <p className="text-sm text-muted-foreground pt-3">{report.summary}</p>

              {/* Sections */}
              <div className="space-y-2">
                {report.sections.map((section, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                    <TrendIcon trend={section.trend || "stable"} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-foreground">{section.title}</p>
                        {section.metric && (
                          <span className="text-xs font-bold text-accent">{section.metric}</span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{section.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Highlights */}
              {report.highlights.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider mb-2">Highlights</p>
                  <div className="space-y-1">
                    {report.highlights.map((h, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px] text-emerald-400/80">
                        <span>+</span>
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Concerns */}
              {report.concerns.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-2">Concerns</p>
                  <div className="space-y-1">
                    {report.concerns.map((c, i) => (
                      <div key={i} className="flex items-center gap-2 text-[11px] text-amber-400/80">
                        <span>!</span>
                        <span>{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              <div>
                <p className="text-[10px] font-semibold text-accent uppercase tracking-wider mb-2">Recommendations</p>
                <div className="space-y-1">
                  {report.recommendations.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px] text-foreground/80">
                      <span className="text-accent">{i + 1}.</span>
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!report && !loading && (
        <div className="text-center py-8 rounded-2xl border border-dashed border-white/[0.1]">
          <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No report generated yet</p>
          <p className="text-[11px] text-muted-foreground/60 mt-1">Click "Generate Report" to create your first business report</p>
        </div>
      )}
    </div>
  );
}
