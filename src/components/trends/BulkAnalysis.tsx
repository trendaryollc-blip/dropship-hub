"use client";

import { useState, useRef } from "react";
import { Upload, FileText, Loader2, AlertCircle } from "lucide-react";
import Papa from "papaparse";
import type { TrendPrediction } from "@/types/trend-predictor";

interface BulkAnalysisProps {
  onAnalyzeBatch: (keywords: string[]) => Promise<TrendPrediction[]>;
  className?: string;
}

export default function BulkAnalysis({ onAnalyzeBatch, className = "" }: BulkAnalysisProps) {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [results, setResults] = useState<TrendPrediction[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [status, setStatus] = useState<"idle" | "parsing" | "analyzing" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus("parsing");
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const data = result.data as Record<string, string>[];
        const keywordCol = Object.keys(data[0] || {}).find((k) =>
          k.toLowerCase().includes("keyword") || k.toLowerCase().includes("query") || k.toLowerCase().includes("term")
        );
        if (!keywordCol) {
          setError("CSV must have a 'keyword', 'query', or 'term' column");
          setStatus("error");
          return;
        }
        const extracted = data.map((row) => row[keywordCol]?.trim()).filter(Boolean);
        setKeywords(extracted);
        setStatus("idle");
      },
      error: () => {
        setError("Failed to parse CSV file");
        setStatus("error");
      },
    });
  };

  const handleAnalyze = async () => {
    if (keywords.length === 0) return;
    setStatus("analyzing");
    setProgress({ current: 0, total: keywords.length });
    setError(null);

    try {
      const batchSize = 5;
      const allResults: TrendPrediction[] = [];
      for (let i = 0; i < keywords.length; i += batchSize) {
        const batch = keywords.slice(i, i + batchSize);
        const batchResults = await onAnalyzeBatch(batch);
        allResults.push(...batchResults);
        setProgress({ current: Math.min(i + batchSize, keywords.length), total: keywords.length });
      }
      setResults(allResults);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setStatus("error");
    }
  };

  const handleExport = () => {
    const headers = ["Keyword", "Trend Score", "Direction", "Confidence", "Time to Peak", "Margin", "Competition"];
    const rows = results.map((r) => [
      r.productIdea, r.trendScore, r.direction, r.confidence, r.timeToPeak, `${r.estimatedMargin}%`, r.competitionLevel,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bulk-analysis-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="glass rounded-2xl p-4 sm:p-5 space-y-3">
        <h3 className="font-display text-sm font-semibold text-foreground">Bulk CSV Analysis</h3>

        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="hidden"
        />

        <div className="flex items-center gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface border border-border text-sm font-medium text-foreground hover:bg-surface-hover transition-all"
          >
            <Upload className="h-4 w-4" /> Upload CSV
          </button>
          {keywords.length > 0 && (
            <span className="text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5 inline mr-1" />
              {keywords.length} keywords loaded
            </span>
          )}
        </div>

        {keywords.length > 0 && status !== "analyzing" && (
          <div className="max-h-32 overflow-y-auto rounded-lg bg-surface p-2 text-xs text-muted-foreground">
            {keywords.slice(0, 20).map((kw, i) => (
              <div key={i} className="py-0.5">{i + 1}. {kw}</div>
            ))}
            {keywords.length > 20 && <div className="py-0.5 text-muted-foreground">... and {keywords.length - 20} more</div>}
          </div>
        )}

        {status === "analyzing" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Analyzing...</span>
              <span className="text-foreground font-medium">{progress.current}/{progress.total}</span>
            </div>
            <div className="h-2 rounded-full bg-background overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleAnalyze}
            disabled={keywords.length === 0 || status === "analyzing"}
            className="flex-1 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/80 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {status === "analyzing" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {status === "analyzing" ? "Analyzing..." : `Analyze ${keywords.length} Keywords`}
          </button>
          {results.length > 0 && (
            <button
              onClick={handleExport}
              className="px-4 py-2.5 rounded-xl bg-surface border border-border text-sm font-semibold text-foreground hover:bg-surface-hover transition-all"
            >
              Export CSV
            </button>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-red-400/10 text-red-400 text-xs">
            <AlertCircle className="h-3.5 w-3.5" /> {error}
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="glass rounded-2xl p-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="text-left py-2 text-muted-foreground font-semibold">#</th>
                <th scope="col" className="text-left py-2 text-muted-foreground font-semibold">Keyword</th>
                <th scope="col" className="text-right py-2 text-muted-foreground font-semibold">Score</th>
                <th scope="col" className="text-right py-2 text-muted-foreground font-semibold">Direction</th>
                <th scope="col" className="text-right py-2 text-muted-foreground font-semibold">Peak</th>
                <th scope="col" className="text-right py-2 text-muted-foreground font-semibold">Margin</th>
                <th scope="col" className="text-right py-2 text-muted-foreground font-semibold">Competition</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={r.id} className="border-b border-border/50">
                  <td className="py-1.5 text-muted-foreground">{i + 1}</td>
                  <td className="py-1.5 font-medium text-foreground">{r.productIdea}</td>
                  <td className="text-right py-1.5 font-bold text-foreground">{r.trendScore}%</td>
                  <td className={`text-right py-1.5 font-semibold capitalize ${
                    r.direction === "rising" ? "text-emerald-400" :
                    r.direction === "peaking" ? "text-amber-400" :
                    r.direction === "declining" ? "text-red-400" : "text-blue-400"
                  }`}>{r.direction}</td>
                  <td className="text-right py-1.5 text-foreground">{r.timeToPeak}</td>
                  <td className="text-right py-1.5 font-semibold text-emerald-400">{r.estimatedMargin}%</td>
                  <td className={`text-right py-1.5 font-semibold ${
                    r.competitionLevel === "low" ? "text-emerald-400" :
                    r.competitionLevel === "medium" ? "text-amber-400" : "text-red-400"
                  }`}>{r.competitionLevel.replace("_", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
