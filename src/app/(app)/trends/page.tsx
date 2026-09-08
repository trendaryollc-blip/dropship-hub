"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, Search, Plus, Trash2, Loader2, Flame, Zap, Eye } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAPI } from "@/hooks/useAPI";
import type { TrendPrediction, RisingStar } from "@/types/trend-predictor";

const DIRECTION_ICONS = { rising: TrendingUp, peaking: Flame, stable: Minus, declining: TrendingDown } as Record<string, typeof TrendingUp>;
const DIRECTION_COLORS = { rising: "text-emerald-400", peaking: "text-amber-400", stable: "text-blue-400", declining: "text-red-400" } as Record<string, string>;
const STATUS_COLORS = { emerging: "bg-purple-400/10 text-purple-400", rising: "bg-emerald-400/10 text-emerald-400", hot: "bg-red-400/10 text-red-400", peaking: "bg-amber-400/10 text-amber-400", saturated: "bg-gray-400/10 text-gray-400" };

export default function TrendsPage() {
  const { user } = useAuth();
  const uid = user?.uid || "";

  const { data: trendingData } = useAPI<{ trending?: any[]; risingStars?: RisingStar[] }>(uid ? `/api/ai/trends?uid=${uid}` : null);
  const { data: risingData } = useAPI<{ risingStars?: RisingStar[] }>(uid ? `/api/ai/trends/rising-stars?uid=${uid}` : null);
  const { data: predictionsData } = useAPI<{ predictions?: TrendPrediction[] }>(uid ? `/api/ai/trends/predictions?uid=${uid}` : null);
  const { data: watchlistData, mutate: mutateWatchlist } = useAPI<{ entries?: any[] }>(uid ? `/api/ai/trends/watchlist?uid=${uid}` : null);

  const trending = trendingData?.trending || [];
  const risingStars = risingData?.risingStars || trendingData?.risingStars || [];
  const predictions = predictionsData?.predictions || [];
  const watchlist = watchlistData?.entries || [];

  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchCategory, setSearchCategory] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "analyze" | "predictions" | "watchlist">("dashboard");
  const [watchKeyword, setWatchKeyword] = useState("");
  const [watchCategory, setWatchCategory] = useState("");

  const handleAnalyze = async () => {
    if (!searchKeyword.trim()) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/ai/trends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: searchKeyword.trim(), category: searchCategory.trim() || undefined }),
      });
      const data = await res.json();
      setAnalysisResult(data);
    } catch (e) { if (process.env.NODE_ENV === "development") console.error(e); }
    finally { setAnalyzing(false); }
  };

  const handleAddWatchlist = async () => {
    if (!watchKeyword.trim()) return;
    try {
      await fetch("/api/ai/trends/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: watchKeyword.trim(), category: watchCategory.trim() || "general", alertOnRising: true, alertOnPeak: true, alertOnSaturation: true }),
      });
      mutateWatchlist();
      setWatchKeyword("");
      setWatchCategory("");
    } catch (e) { if (process.env.NODE_ENV === "development") console.error(e); }
  };

  const handleRemoveWatchlist = async (id: string) => {
    try {
      await fetch(`/api/ai/trends/watchlist?id=${id}`, { method: "DELETE" });
      mutateWatchlist();
    } catch (e) { if (process.env.NODE_ENV === "development") console.error(e); }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-3 sm:px-4 lg:px-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground">AI Trend Predictor</h1>
            <span className="px-2 py-0.5 rounded-lg bg-purple-400/10 text-purple-400 text-[10px] font-bold">AI POWERED</span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">Predict which products will trend before they peak. Find rising stars with low competition.</p>
        </div>
        <div className="flex items-center bg-surface rounded-xl border border-border p-0.5">
          {(["dashboard", "analyze", "predictions", "watchlist"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-semibold capitalize transition-all ${activeTab === tab ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-muted-foreground hover:text-foreground"}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "dashboard" && (
        <>
          {trending.length > 0 && (
            <div className="glass rounded-2xl p-4 sm:p-5">
              <h3 className="font-display text-sm font-semibold text-foreground mb-3">Trending Keywords</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                {trending.map((t: any) => {
                  const DirIcon = DIRECTION_ICONS[t.direction as keyof typeof DIRECTION_ICONS] || Minus;
                  const dirColor = DIRECTION_COLORS[t.direction as keyof typeof DIRECTION_COLORS] || "text-gray-400";
                  return (
                    <div key={t.id} className="p-3 rounded-xl bg-surface border border-border hover:border-accent/20 transition-all">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-foreground truncate">{t.keyword}</span>
                        <DirIcon className={`h-3.5 w-3.5 ${dirColor}`} />
                      </div>
                      <p className="text-[10px] text-muted-foreground">{t.growth > 0 ? "+" : ""}{t.growth}% growth</p>
                      <p className="text-[10px] text-muted-foreground">{t.volume?.toLocaleString()} volume</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {risingStars.length > 0 && (
            <div className="glass rounded-2xl p-4 sm:p-5">
              <h3 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-400" /> Rising Stars
              </h3>
              <div className="space-y-2">
                {risingStars.slice(0, 8).map((rs) => (
                  <div key={rs.id} className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border hover:border-accent/20 transition-all">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-foreground">{rs.productKeyword}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${STATUS_COLORS[rs.status]}`}>{rs.status}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{rs.category} · {rs.growthVelocity.toFixed(0)}% velocity · {rs.opportunityScore}% opportunity</p>
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
            <div className="glass rounded-2xl p-12 text-center">
              <TrendingUp className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Click "Analyze" to discover trending products and rising stars</p>
            </div>
          )}
        </>
      )}

      {activeTab === "analyze" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="glass rounded-2xl p-4 sm:p-5 space-y-4">
            <h3 className="font-display text-sm font-semibold text-foreground">Analyze Trend</h3>
            <input value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleAnalyze()} placeholder="Enter keyword (e.g. wireless earbuds)" className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40" />
            <input value={searchCategory} onChange={(e) => setSearchCategory(e.target.value)} placeholder="Category (optional)" className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40" />
            <button onClick={handleAnalyze} disabled={analyzing || !searchKeyword.trim()} className="w-full py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/80 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {analyzing ? "Analyzing..." : "Analyze Trend"}
            </button>
          </div>

          <div className="space-y-4">
            {analysisResult?.prediction && (
              <div className="glass rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-semibold text-foreground">Analysis Result</h3>
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${analysisResult.prediction.confidence === "high" ? "bg-emerald-400/10 text-emerald-400" : analysisResult.prediction.confidence === "medium" ? "bg-amber-400/10 text-amber-400" : "bg-red-400/10 text-red-400"}`}>
                    {analysisResult.prediction.confidence} confidence
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-surface">
                    <p className="text-[10px] text-muted-foreground">Trend Score</p>
                    <p className="text-lg font-bold text-foreground">{analysisResult.prediction.trendScore}%</p>
                  </div>
                  <div className="p-3 rounded-xl bg-surface">
                    <p className="text-[10px] text-muted-foreground">Direction</p>
                    <p className={`text-lg font-bold capitalize ${DIRECTION_COLORS[analysisResult.prediction.direction]}`}>{analysisResult.prediction.direction}</p>
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
                    <span key={i} className="px-2 py-0.5 rounded-lg bg-accent/10 text-accent text-[9px] font-semibold">{kw}</span>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1">
                  {analysisResult.prediction.suggestedPlatforms?.map((p: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 rounded-lg bg-blue-400/10 text-blue-400 text-[9px] font-semibold capitalize">{p}</span>
                  ))}
                </div>
              </div>
            )}

            {analysisResult?.risingStars?.length > 0 && (
              <div className="glass rounded-2xl p-4 sm:p-5">
                <h3 className="font-display text-sm font-semibold text-foreground mb-3">Rising Stars Found</h3>
                <div className="space-y-2">
                  {analysisResult.risingStars.map((rs: RisingStar) => (
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
              <div className="glass rounded-2xl p-12 text-center">
                <Search className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Enter a keyword to analyze trends and discover opportunities</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "predictions" && (
        <div className="space-y-3">
          {predictions.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Zap className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No predictions yet. Analyze a keyword to generate predictions.</p>
            </div>
          ) : (
            predictions.map((pred) => {
              const DirIcon = DIRECTION_ICONS[pred.direction] || Minus;
              const dirColor = DIRECTION_COLORS[pred.direction] || "text-gray-400";
              return (
                <div key={pred.id} className="glass rounded-xl p-4 hover:border-accent/20 transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <DirIcon className={`h-4 w-4 ${dirColor}`} />
                        <h4 className="text-sm font-medium text-foreground">{pred.productIdea}</h4>
                        <span className="text-[10px] text-muted-foreground">· {pred.category}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mb-2">{pred.reasoning}</p>
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>Score: <span className="text-foreground font-semibold">{pred.trendScore}%</span></span>
                        <span>Peak: <span className="text-foreground font-semibold">{pred.timeToPeak}</span></span>
                        <span>Margin: <span className="text-emerald-400 font-semibold">{pred.estimatedMargin}%</span></span>
                        <span className={`font-semibold ${pred.competitionLevel === "low" ? "text-emerald-400" : pred.competitionLevel === "medium" ? "text-amber-400" : "text-red-400"}`}>
                          {pred.competitionLevel} competition
                        </span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold shrink-0 ${pred.confidence === "high" ? "bg-emerald-400/10 text-emerald-400" : pred.confidence === "medium" ? "bg-amber-400/10 text-amber-400" : "bg-red-400/10 text-red-400"}`}>
                      {pred.confidence}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === "watchlist" && (
        <div className="space-y-4">
          <div className="glass rounded-2xl p-4 flex items-center gap-3">
            <input value={watchKeyword} onChange={(e) => setWatchKeyword(e.target.value)} placeholder="Keyword to watch" className="flex-1 px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40" />
            <input value={watchCategory} onChange={(e) => setWatchCategory(e.target.value)} placeholder="Category" className="px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40" />
            <button onClick={handleAddWatchlist} disabled={!watchKeyword.trim()} className="px-3 py-2 rounded-xl bg-accent text-white text-[10px] font-semibold hover:bg-accent/80 disabled:opacity-50 transition-all flex items-center gap-1.5">
              <Plus className="h-3 w-3" /> Add
            </button>
          </div>

          {watchlist.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Eye className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Add keywords to your watchlist to track trends over time</p>
            </div>
          ) : (
            <div className="space-y-2">
              {watchlist.map((w: any) => (
                <div key={w.id} className="glass rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-foreground">{w.keyword}</span>
                    <span className="text-[10px] text-muted-foreground ml-2">{w.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {w.alertOnRising && <span className="px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-400 text-[8px] font-bold">Rising</span>}
                      {w.alertOnPeak && <span className="px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 text-[8px] font-bold">Peak</span>}
                      {w.alertOnSaturation && <span className="px-1.5 py-0.5 rounded bg-red-400/10 text-red-400 text-[8px] font-bold">Saturation</span>}
                    </div>
                    <button onClick={() => handleRemoveWatchlist(w.id)} className="p-1 rounded hover:bg-surface-hover"><Trash2 className="h-3 w-3 text-muted-foreground" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
