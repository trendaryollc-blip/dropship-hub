"use client";

import { useState, useCallback } from "react";
import {
  TrendingUp, TrendingDown, Minus, Search, Plus, Trash2, Loader2, Flame, Zap, Eye,
  Download, RefreshCw, Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import VoiceInput from "@/components/ai/VoiceInput";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAPI } from "@/hooks/useAPI";
import KPICard from "@/components/ui/KPICard";
import MiniSparkline from "@/components/ui/MiniSparkline";
import EmptyState from "@/components/ui/EmptyState";
import TrendLifecycleCurve from "@/components/trends/TrendLifecycleCurve";
import TrendStageIndicator from "@/components/trends/TrendStageIndicator";
import PlatformBreakdown from "@/components/trends/PlatformBreakdown";
import GeographicHeatmap from "@/components/trends/GeographicHeatmap";
import PredictionDetailModal from "@/components/trends/PredictionDetailModal";
import KeywordComparison from "@/components/trends/KeywordComparison";
import BulkAnalysis from "@/components/trends/BulkAnalysis";
import AlertConfig from "@/components/trends/AlertConfig";
import NotificationCenter from "@/components/trends/NotificationCenter";
import AccuracyTracker from "@/components/trends/AccuracyTracker";
import PDFExportButton from "@/components/trends/PDFExportButton";
import { exportPredictionsToCSV, exportWatchlistToCSV, exportRisingStarsToCSV } from "@/lib/trends/export";
import type { TrendPrediction, RisingStar, TrendWatchlistEntry, TrendAnalysisResponse, TrendSignal } from "@/types/trend-predictor";

interface TrendingItem {
  id: string;
  keyword: string;
  direction: string;
  growth: number;
  volume: number;
}

const DIRECTION_ICONS = { rising: TrendingUp, peaking: Flame, stable: Minus, declining: TrendingDown } as Record<string, typeof TrendingUp>;
const DIRECTION_COLORS = { rising: "text-emerald-400", peaking: "text-amber-400", stable: "text-blue-400", declining: "text-red-400" } as Record<string, string>;
const STATUS_COLORS = { emerging: "bg-purple-400/10 text-purple-400", rising: "bg-emerald-400/10 text-emerald-400", hot: "bg-red-400/10 text-red-400", peaking: "bg-amber-400/10 text-amber-400", saturated: "bg-gray-400/10 text-gray-400" };

type Tab = "dashboard" | "analyze" | "predictions" | "watchlist" | "compare" | "bulk";

export default function TrendsPage() {
  const { user } = useAuth();
  const uid = user?.uid || "";

  const { data: trendingData, mutate: mutateTrending } = useAPI<{ trending?: TrendingItem[]; risingStars?: RisingStar[] }>(uid ? `/api/ai/trends?uid=${uid}` : null);
  const { data: risingData } = useAPI<{ risingStars?: RisingStar[] }>(uid ? `/api/ai/trends/rising-stars?uid=${uid}` : null);
  const { data: predictionsData, mutate: mutatePredictions } = useAPI<{ predictions?: TrendPrediction[] }>(uid ? `/api/ai/trends/predictions?uid=${uid}` : null);
  const { data: watchlistData, mutate: mutateWatchlist } = useAPI<{ entries?: TrendWatchlistEntry[] }>(uid ? `/api/ai/trends/watchlist?uid=${uid}` : null);

  const trending = trendingData?.trending || [];
  const risingStars = risingData?.risingStars || trendingData?.risingStars || [];
  const predictions = predictionsData?.predictions || [];
  const watchlist = watchlistData?.entries || [];

  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchCategory, setSearchCategory] = useState("");
  const [searchTimeframe, setSearchTimeframe] = useState<"7d" | "30d" | "90d">("30d");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<TrendAnalysisResponse | null>(null);
  const [selectedPrediction, setSelectedPrediction] = useState<TrendPrediction | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [watchKeyword, setWatchKeyword] = useState("");
  const [watchCategory, setWatchCategory] = useState("");
  const [sortField, setSortField] = useState<"date" | "score" | "margin">("date");
  const [filterDirection, setFilterDirection] = useState<string>("all");
  const [filterConfidence, setFilterConfidence] = useState<string>("all");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const handleAnalyze = async (keywordOverride?: string) => {
    const kw = keywordOverride?.trim() || searchKeyword.trim();
    if (!kw) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/ai/trends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: kw,
          category: searchCategory.trim() || undefined,
          timeframe: searchTimeframe,
        }),
      });
      const data = await res.json();
      setAnalysisResult(data);
      mutatePredictions();
    } catch (e) {
      console.error("[Trends] Error:", e instanceof Error ? e.message : e);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleBatchAnalyze = async (keywords: string[]): Promise<TrendPrediction[]> => {
    const results: TrendPrediction[] = [];
    for (const kw of keywords) {
      try {
        const res = await fetch("/api/ai/trends", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keyword: kw, timeframe: searchTimeframe }),
        });
        const data = await res.json();
        if (data.prediction) results.push(data.prediction);
      } catch {
        // Skip failed keywords
      }
    }
    return results;
  };

  const handleAddWatchlist = async () => {
    if (!watchKeyword.trim()) return;
    try {
      await fetch("/api/ai/trends/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: watchKeyword.trim(),
          category: watchCategory.trim() || "general",
          alertOnRising: true,
          alertOnPeak: true,
          alertOnSaturation: true,
        }),
      });
      mutateWatchlist();
      setWatchKeyword("");
      setWatchCategory("");
    } catch (e) {
      console.error("[Trends] Error:", e instanceof Error ? e.message : e);
    }
  };

  const handleRemoveWatchlist = async (id: string) => {
    try {
      await fetch(`/api/ai/trends/watchlist?id=${id}`, { method: "DELETE" });
      mutateWatchlist();
    } catch (e) {
      console.error("[Trends] Error:", e instanceof Error ? e.message : e);
    }
  };

  const handleWatchlistAlertUpdate = async (id: string, config: { alertOnRising: boolean; alertOnPeak: boolean; alertOnSaturation: boolean }) => {
    try {
      await fetch("/api/ai/trends/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...config }),
      });
      mutateWatchlist();
    } catch {
      // Non-critical
    }
  };

  const handleRefresh = () => {
    setLastRefresh(new Date());
    mutateTrending();
    mutatePredictions();
    mutateWatchlist();
  };

  const handleViewPrediction = (pred: TrendPrediction) => {
    setSelectedPrediction(pred);
    setModalOpen(true);
  };

  const filteredPredictions = predictions
    .filter((p) => filterDirection === "all" || p.direction === filterDirection)
    .filter((p) => filterConfidence === "all" || p.confidence === filterConfidence)
    .sort((a, b) => {
      if (sortField === "score") return b.trendScore - a.trendScore;
      if (sortField === "margin") return b.estimatedMargin - a.estimatedMargin;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const sparkData = (seed: number) => Array.from({ length: 7 }, (_, i) => 30 + ((seed + i * 7) % 40));

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-3 sm:px-4 lg:px-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground">AI Trend Predictor</h1>
            <span className="px-2 py-0.5 rounded-lg bg-purple-400/10 text-purple-400 text-[10px] font-bold">AI POWERED</span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
            Predict which products will trend before they peak. Find rising stars with low competition.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" /> {lastRefresh.toLocaleTimeString()}
          </span>
          <button onClick={handleRefresh} className="p-2 rounded-lg hover:bg-surface transition-all" title="Refresh data">
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </button>
          <NotificationCenter uid={uid} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center bg-surface rounded-xl border border-border p-0.5 overflow-x-auto">
        {([
          { key: "dashboard", label: "Dashboard" },
          { key: "analyze", label: "Analyze" },
          { key: "compare", label: "Compare" },
          { key: "bulk", label: "Bulk" },
          { key: "predictions", label: "Predictions" },
          { key: "watchlist", label: "Watchlist" },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-semibold capitalize transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-accent text-white shadow-lg shadow-accent/20"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── DASHBOARD TAB ─── */}
      {activeTab === "dashboard" && (
        <div className="space-y-4">
          {/* KPI Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KPICard icon={TrendingUp} label="Active Trends" value={watchlist.length} sparkline={sparkData(1)} />
            <KPICard icon={Flame} label="Rising Stars" value={risingStars.length} sparkline={sparkData(2)} />
            <KPICard icon={Zap} label="Predictions Today" value={predictions.length} sparkline={sparkData(3)} />
            <KPICard icon={Eye} label="Watchlist Items" value={watchlist.length} sparkline={sparkData(4)} />
          </div>

          {/* Accuracy Tracker */}
          <AccuracyTracker uid={uid} />

          {/* Trending Keywords */}
          {trending.length > 0 && (
            <div className="glass rounded-2xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-sm font-semibold text-foreground">Trending Keywords</h3>
                <button onClick={() => exportRisingStarsToCSV(risingStars)} className="text-[10px] text-accent hover:underline flex items-center gap-1">
                  <Download className="h-3 w-3" /> Export
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                {trending.map((t) => {
                  const DirIcon = DIRECTION_ICONS[t.direction as keyof typeof DIRECTION_ICONS] || Minus;
                  const dirColor = DIRECTION_COLORS[t.direction as keyof typeof DIRECTION_COLORS] || "text-gray-400";
                  return (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-surface border border-border hover:border-accent/20 transition-all cursor-pointer"
                      onClick={() => { setSearchKeyword(t.keyword); setActiveTab("analyze"); }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-foreground truncate">{t.keyword}</span>
                        <DirIcon className={`h-3.5 w-3.5 ${dirColor}`} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-muted-foreground">
                            {t.growth > 0 ? "+" : ""}{t.growth}% growth
                          </p>
                          <p className="text-[10px] text-muted-foreground">{t.volume?.toLocaleString()} volume</p>
                        </div>
                        <MiniSparkline data={sparkData(t.keyword.charCodeAt(0))} width={40} height={16} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rising Stars */}
          {risingStars.length > 0 && (
            <div className="glass rounded-2xl p-4 sm:p-5">
              <h3 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-400" /> Rising Stars
              </h3>
              <div className="space-y-2">
                {risingStars.slice(0, 8).map((rs) => (
                  <div
                    key={rs.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border hover:border-accent/20 transition-all cursor-pointer"
                    onClick={() => { setSearchKeyword(rs.productKeyword); setActiveTab("analyze"); }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-foreground">{rs.productKeyword}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${STATUS_COLORS[rs.status]}`}>{rs.status}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {rs.category} · {rs.growthVelocity.toFixed(0)}% velocity · {rs.opportunityScore}% opportunity
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-xs font-bold text-foreground">{rs.opportunityScore}%</p>
                      <p className="text-[9px] text-muted-foreground">opportunity</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {trending.length === 0 && risingStars.length === 0 && (
            <EmptyState iconName="analytics" title="No trends data yet" description="Click 'Analyze' to discover trending products and rising stars"
              action={{ label: "Start Analyzing", onClick: () => setActiveTab("analyze") }} />
          )}
        </div>
      )}

      {/* ─── ANALYZE TAB ─── */}
      {activeTab === "analyze" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="glass rounded-2xl p-4 sm:p-5 space-y-4">
            <h3 className="font-display text-sm font-semibold text-foreground">Analyze Trend</h3>
            <input
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              placeholder="Enter keyword (e.g. wireless earbuds)"
              aria-label="Search keyword"
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40"
            />
            <div className="flex gap-2">
              <VoiceInput onTranscript={(text) => setSearchKeyword(text)} />
              <input
                value={searchCategory}
                onChange={(e) => setSearchCategory(e.target.value)}
                placeholder="Category (optional)"
                aria-label="Category"
                className="flex-1 px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40"
              />
            </div>
            <div className="flex gap-2">
              {(["7d", "30d", "90d"] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setSearchTimeframe(tf)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
                    searchTimeframe === tf ? "bg-accent text-white" : "bg-surface text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
            <button
               onClick={() => handleAnalyze()}
              disabled={analyzing || !searchKeyword.trim()}
              className="w-full py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/80 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {analyzing ? "Analyzing..." : "Analyze Trend"}
            </button>
          </div>

          <div className="space-y-4">
            {analysisResult?.prediction && (
              <>
                {/* Main Result Card */}
                <div className="glass rounded-2xl p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-sm font-semibold text-foreground">Analysis Result</h3>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                        analysisResult.prediction.confidence === "high" ? "bg-emerald-400/10 text-emerald-400" :
                        analysisResult.prediction.confidence === "medium" ? "bg-amber-400/10 text-amber-400" :
                        "bg-red-400/10 text-red-400"
                      }`}>
                        {analysisResult.prediction.confidence} confidence
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-surface">
                      <p className="text-[10px] text-muted-foreground">Trend Score</p>
                      <p className="text-lg font-bold text-foreground">{analysisResult.prediction.trendScore}%</p>
                    </div>
                    <div className="p-3 rounded-xl bg-surface">
                      <p className="text-[10px] text-muted-foreground">Direction</p>
                      <p className={`text-lg font-bold capitalize ${DIRECTION_COLORS[analysisResult.prediction.direction]}`}>
                        {analysisResult.prediction.direction}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-surface">
                      <p className="text-[10px] text-muted-foreground">Time to Peak</p>
                      <p className="text-lg font-bold text-foreground">{analysisResult.prediction.timeToPeak}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-surface">
                      <p className="text-[10px] text-muted-foreground">Est. Margin</p>
                      <p className="text-lg font-bold text-emerald-400">{analysisResult.prediction.estimatedMargin}%</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-surface">
                    <p className="text-[10px] text-muted-foreground mb-1">Reasoning</p>
                    <p className="text-xs text-foreground">{analysisResult.prediction.reasoning}</p>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {analysisResult.prediction.relatedKeywords?.map((kw: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded-lg bg-accent/10 text-accent text-[9px] font-semibold cursor-pointer hover:bg-accent/20"
                        onClick={() => { setSearchKeyword(kw); handleAnalyze(kw); }}>
                        {kw}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {analysisResult.prediction.suggestedPlatforms?.map((p: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded-lg bg-blue-400/10 text-blue-400 text-[9px] font-semibold capitalize">{p}</span>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={() => handleViewPrediction(analysisResult.prediction)}
                      className="flex-1 py-2 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground hover:bg-surface-hover transition-all flex items-center justify-center gap-1.5"
                    >
                      View Full Details
                    </button>
                    <button
                      onClick={() => {
                        setWatchKeyword(analysisResult.prediction.productIdea);
                        setWatchCategory(analysisResult.prediction.category);
                        setActiveTab("watchlist");
                      }}
                      className="flex-1 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent/80 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add to Watchlist
                    </button>
                  </div>
                </div>

                {/* Lifecycle Curve */}
                {analysisResult.signals && analysisResult.signals.length > 0 && (
                  <TrendLifecycleCurve
                    actualData={Array.from({ length: 30 }, (_, i) => {
                      const d = new Date(); d.setDate(d.getDate() - 29 + i);
                      const seed = analysisResult.prediction.productIdea.charCodeAt(0) + i;
                      return { date: d.toISOString().split("T")[0], value: 30 + (seed % 40) + Math.round(Math.sin(i / 5) * 15) };
                    })}
                    predictedData={Array.from({ length: 90 }, (_, i) => {
                      const d = new Date(); d.setDate(d.getDate() + i + 1);
                      return { date: d.toISOString().split("T")[0], value: Math.round(50 + Math.sin(i / 10) * 20 - (i > 60 ? i - 60 : 0)), predicted: true };
                    })}
                    currentStage={analysisResult.prediction.direction === "rising" ? "rising" : analysisResult.prediction.direction === "peaking" ? "peak" : analysisResult.prediction.direction === "declining" ? "declining" : "emerging"}
                    predictedPeakDate={analysisResult.prediction.predictedPeak}
                    height={200}
                  />
                )}

                {/* Platform Breakdown */}
                {analysisResult.signals && analysisResult.signals.length > 0 && (
                  <PlatformBreakdown
                    data={analysisResult.signals.map((s) => ({ platform: s.platform, volume: s.volume, growth: s.growthRate, engagement: s.velocity }))}
                    metric="volume"
                    height={150}
                  />
                )}
              </>
            )}

            {analysisResult?.risingStars && analysisResult.risingStars.length > 0 && (
              <div className="glass rounded-2xl p-4 sm:p-5">
                <h3 className="font-display text-sm font-semibold text-foreground mb-3">Rising Stars Found</h3>
                <div className="space-y-2">
                  {analysisResult.risingStars.map((rs) => (
                    <div key={rs.id} className="flex items-center justify-between p-2.5 rounded-xl bg-surface border border-border">
                      <div>
                        <span className="text-xs font-medium text-foreground">{rs.productKeyword}</span>
                        <span className={`ml-2 px-1.5 py-0.5 rounded text-[8px] font-bold ${STATUS_COLORS[rs.status]}`}>{rs.status}</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-400">{rs.opportunityScore}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!analysisResult && (
              <EmptyState iconName="search" title="Enter a keyword" description="Analyze any keyword to see trends, predictions, and opportunities" />
            )}
          </div>
        </div>
      )}

      {/* ─── COMPARE TAB ─── */}
      {activeTab === "compare" && (
        <KeywordComparison onAnalyze={handleBatchAnalyze} />
      )}

      {/* ─── BULK TAB ─── */}
      {activeTab === "bulk" && (
        <BulkAnalysis onAnalyzeBatch={handleBatchAnalyze} />
      )}

      {/* ─── PREDICTIONS TAB ─── */}
      {activeTab === "predictions" && (
        <div className="space-y-3">
          {/* Controls */}
          {predictions.length > 0 && (
            <div className="glass rounded-xl p-3 flex flex-wrap items-center gap-2">
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as typeof sortField)}
                className="px-2 py-1.5 rounded-lg bg-surface border border-border text-[10px] text-foreground"
              >
                <option value="date">Sort by Date</option>
                <option value="score">Sort by Score</option>
                <option value="margin">Sort by Margin</option>
              </select>
              <select
                value={filterDirection}
                onChange={(e) => setFilterDirection(e.target.value)}
                className="px-2 py-1.5 rounded-lg bg-surface border border-border text-[10px] text-foreground"
              >
                <option value="all">All Directions</option>
                <option value="rising">Rising</option>
                <option value="stable">Stable</option>
                <option value="peaking">Peaking</option>
                <option value="declining">Declining</option>
              </select>
              <select
                value={filterConfidence}
                onChange={(e) => setFilterConfidence(e.target.value)}
                className="px-2 py-1.5 rounded-lg bg-surface border border-border text-[10px] text-foreground"
              >
                <option value="all">All Confidence</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <button
                onClick={() => exportPredictionsToCSV(filteredPredictions)}
                className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-[10px] font-semibold text-foreground hover:bg-surface-hover transition-all"
              >
                <Download className="h-3 w-3" /> Export CSV
              </button>
              <PDFExportButton
                predictions={filteredPredictions}
                accuracyStats={undefined}
                label="Export PDF"
                className="!text-[10px]"
              />
            </div>
          )}

          {filteredPredictions.length === 0 ? (
            <EmptyState iconName="analytics" title="No predictions yet" description="Analyze keywords to generate predictions"
              action={{ label: "Analyze Keywords", onClick: () => setActiveTab("analyze") }} />
          ) : (
            filteredPredictions.map((pred) => {
              const DirIcon = DIRECTION_ICONS[pred.direction] || Minus;
              const dirColor = DIRECTION_COLORS[pred.direction] || "text-gray-400";
              return (
                <div
                  key={pred.id}
                  className="glass rounded-xl p-4 hover:border-accent/20 transition-all cursor-pointer"
                  onClick={() => handleViewPrediction(pred)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <DirIcon className={`h-4 w-4 ${dirColor}`} />
                        <h4 className="text-sm font-medium text-foreground">{pred.productIdea}</h4>
                        <span className="text-[10px] text-muted-foreground">· {pred.category}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mb-2 line-clamp-1">{pred.reasoning}</p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>Score: <span className="text-foreground font-semibold">{pred.trendScore}%</span></span>
                        <span>Peak: <span className="text-foreground font-semibold">{pred.timeToPeak}</span></span>
                        <span>Margin: <span className="text-emerald-400 font-semibold">{pred.estimatedMargin}%</span></span>
                        <span className={`font-semibold ${
                          pred.competitionLevel === "low" ? "text-emerald-400" :
                          pred.competitionLevel === "medium" ? "text-amber-400" : "text-red-400"
                        }`}>
                          {pred.competitionLevel.replace("_", " ")} competition
                        </span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 ${
                      pred.confidence === "high" ? "bg-emerald-400/10 text-emerald-400" :
                      pred.confidence === "medium" ? "bg-amber-400/10 text-amber-400" :
                      "bg-red-400/10 text-red-400"
                    }`}>
                      {pred.confidence}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── WATCHLIST TAB ─── */}
      {activeTab === "watchlist" && (
        <div className="space-y-4">
          <div className="glass rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              value={watchKeyword}
              onChange={(e) => setWatchKeyword(e.target.value)}
              placeholder="Keyword to watch"
              aria-label="Watchlist keyword"
              className="flex-1 px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40"
            />
            <input
              value={watchCategory}
              onChange={(e) => setWatchCategory(e.target.value)}
              placeholder="Category"
              aria-label="Watchlist category"
              className="px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40"
            />
            <button
              onClick={handleAddWatchlist}
              disabled={!watchKeyword.trim()}
              className="px-3 py-2 rounded-xl bg-accent text-white text-[10px] font-semibold hover:bg-accent/80 disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              <Plus className="h-3 w-3" /> Add
            </button>
            <button
              onClick={() => exportWatchlistToCSV(watchlist)}
              disabled={watchlist.length === 0}
              className="px-3 py-2 rounded-xl bg-surface border border-border text-[10px] font-semibold text-foreground hover:bg-surface-hover disabled:opacity-50 transition-all flex items-center gap-1.5"
            >
              <Download className="h-3 w-3" /> Export
            </button>
          </div>

          {watchlist.length === 0 ? (
            <EmptyState iconName="documents" title="No watchlist entries" description="Add keywords to track trends over time and get alerts" />
          ) : (
            <div className="space-y-2">
              {watchlist.map((w) => (
                <div key={w.id} className="glass rounded-xl p-3 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{w.keyword}</span>
                      <span className="text-[10px] text-muted-foreground">{w.category}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <MiniSparkline data={sparkData(w.keyword.charCodeAt(0))} width={50} height={14} />
                      {w.alertOnRising && <span className="px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-400 text-[8px] font-bold">Rising</span>}
                      {w.alertOnPeak && <span className="px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 text-[8px] font-bold">Peak</span>}
                      {w.alertOnSaturation && <span className="px-1.5 py-0.5 rounded bg-red-400/10 text-red-400 text-[8px] font-bold">Saturation</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-3">
                    <AlertConfig entry={w} onUpdate={handleWatchlistAlertUpdate} />
                    <button
                      onClick={() => { setSearchKeyword(w.keyword); setActiveTab("analyze"); }}
                      className="p-1.5 rounded-lg hover:bg-surface transition-all"
                      title="Analyze this keyword"
                    >
                      <Search className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => handleRemoveWatchlist(w.id)}
                      className="p-1.5 rounded-lg hover:bg-surface transition-all"
                      title="Remove from watchlist"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Prediction Detail Modal */}
      <PredictionDetailModal
        prediction={selectedPrediction || predictions[0] || {
          id: "", productIdea: "", category: "", trendScore: 0, confidence: "low",
          direction: "stable", predictedPeak: "", timeToPeak: "", saturationRisk: 0,
          competitionLevel: "low", reasoning: "", signals: [], relatedKeywords: [],
          suggestedPlatforms: [], estimatedMargin: 0, createdAt: "",
        }}
        signals={analysisResult?.signals || []}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAddToWatchlist={(kw, cat) => {
          setWatchKeyword(kw);
          setWatchCategory(cat);
          setActiveTab("watchlist");
          setModalOpen(false);
        }}
      />
    </div>
  );
}
