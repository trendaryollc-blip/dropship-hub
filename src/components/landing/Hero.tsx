"use client";

import Link from "next/link";

import { ArrowRight, ArrowUpRight, Sparkles, Flame, Target, Trophy } from "lucide-react";
import ParticleField from "./ParticleField";
import TypeWriter from "./TypeWriter";

const trendingProducts = [
  { name: "Pet GPS Tracker Mini", platform: "AliExpress", profit: "$20.19", margin: "58", trend: "+41", confidence: 92 },
  { name: "Smart LED Strip 5m", platform: "CJ Dropshipping", profit: "$13.49", margin: "74", trend: "+32", confidence: 87 },
  { name: "Portable Espresso Maker", platform: "Amazon", profit: "$17.49", margin: "58", trend: "+28", confidence: 85 },
];

const nicheCards = [
  { name: "Pet Tech", score: 89, growth: "+24%" },
  { name: "Home Office", score: 82, growth: "+18%" },
  { name: "Outdoor Gear", score: 78, growth: "+31%" },
];

function MiniSparkline({ points, id }: { points: number[]; id: string }) {
  const w = 60;
  const h = 20;
  const max = Math.max.apply(null, points);
  const min = Math.min.apply(null, points);
  const range = max - min || 1;
  const coords = points.map(function(p, i) {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((p - min) / range) * (h - 4) - 2;
    return String(x) + "," + String(y);
  }).join(" ");
  const areaCoords = coords + " " + String(w) + "," + String(h) + " 0," + String(h);
  const gradId = "hs-" + id;
  return (
    <svg viewBox={"0 0 " + String(w) + " " + String(h)} className="h-5 w-12 shrink-0" fill="none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaCoords} fill={"url(#" + gradId + ")"} />
      <polyline points={coords} fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ConfidenceRing({ score }: { score: number }) {
  const r = 10;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  let color = "#22c55e";
  if (score < 85) { color = "#f59e0b"; }
  if (score < 70) { color = "#ef4444"; }
  return (
    <svg viewBox="0 0 26 26" className="h-6 w-6 shrink-0">
      <circle cx="13" cy="13" r={String(r)} fill="none" stroke="currentColor" strokeWidth="2.5" className="text-border" />
      <circle cx="13" cy="13" r={String(r)} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={String(circ)} strokeDashoffset={String(offset)} className="origin-center -rotate-90" />
      <text x="13" y="13" textAnchor="middle" dominantBaseline="central" className="fill-foreground text-[7px] font-bold">{String(score)}</text>
    </svg>
  );
}

export default function Hero() {

  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
      <ParticleField />

        <div className="absolute inset-0 grid-pattern pointer-events-none" />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-accent/[0.07] rounded-full blur-[120px]" />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-accent-warm/[0.04] rounded-full blur-[100px]" />

        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <div className="animate-slide-up flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-accent/20 text-xs font-medium text-accent">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              AI-Powered Dashboard — Free to start
            </div>
          </div>

          <div className="text-center max-w-4xl mx-auto">
            <h1 className="animate-slide-up font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
              <span className="text-foreground">Your AI-Powered</span>
              <br />
              <span className="gradient-text">
                Dropshipping {" "}
                <TypeWriter
                  words={["Command Center", "Profit Engine", "Market Intelligence", "Winning Edge"]}
                  typingSpeed={80}
                  pauseTime={2000}
                />
              </span>
            </h1>

            <p className="animate-slide-up-delay-1 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              One dashboard with AI daily picks, live market monitoring, niche radar, trending product scores, and gamified missions. Built for dropshippers who move fast.
            </p>

            <div className="animate-slide-up-delay-2 flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link
                href="/sign-up"
                className="group relative inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-white rounded-2xl bg-accent hover:bg-accent-hover transition-all hover:shadow-[0_0_30px_rgba(var(--glow-color),0.4)] active:scale-[0.97]"
              >
                Start For Free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                <div className="absolute inset-0 rounded-2xl bg-accent/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center gap-2 px-8 py-4 text-base font-medium text-muted-foreground hover:text-foreground rounded-2xl border border-border hover:border-muted-foreground/30 hover:bg-surface transition-all"
              >
                See How It Works
              </Link>
            </div>
          </div>
        </div>

        <div className="animate-slide-up-delay-3 relative max-w-5xl mx-auto mb-12">
          <div className="absolute -inset-4 bg-accent/[0.08] rounded-3xl blur-2xl opacity-50" />

          <div className="relative rounded-2xl border border-border bg-surface/80 backdrop-blur-xl p-2 md:p-3 shadow-2xl shadow-accent/10">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400/60" />
                <div className="w-3 h-3 rounded-full bg-amber-400/60" />
                <div className="w-3 h-3 rounded-full bg-emerald-400/60" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1.5 rounded-lg bg-background border border-border text-[10px] text-muted-foreground font-mono">
                  dropshiphub.com/dashboard
                </div>
              </div>
            </div>

            <div className="relative p-4 md:p-6 bg-background/50 min-h-[360px] md:min-h-[460px]">
              <div className="glass rounded-xl p-3 flex items-center gap-3 mb-4 border border-accent/20">
                <Sparkles className="h-4 w-4 text-accent shrink-0" />
                <span className="text-xs font-medium text-foreground whitespace-nowrap">AI is monitoring</span>
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                <span className="text-[11px] text-muted-foreground truncate">
                  Pet GPS trackers trending +41% — strong buy signal with 58% margin
                </span>
                <div className="hidden md:flex items-center gap-2 ml-auto shrink-0">
                  <span className="px-2 py-0.5 rounded-md bg-emerald-400/10 text-[10px] font-medium text-emerald-400">5 opps</span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-400/10 text-[10px] font-medium text-amber-400">2 risks</span>
                  <span className="px-2 py-0.5 rounded-md bg-accent/10 text-[10px] font-medium text-accent">3 trends</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 glass rounded-xl p-3 md:p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Flame className="h-4 w-4 text-amber-400" />
                    <span className="text-xs font-semibold text-foreground">Trending Products</span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-400/10 text-[10px] font-medium text-amber-400">3 hot</span>
                    <Link href="/products" className="ml-auto text-[10px] text-accent font-medium hover:underline flex items-center gap-1">View all <ArrowUpRight className="h-3 w-3" /></Link>
                  </div>
                  <div className="space-y-2">
                    {trendingProducts.map(function(p, i) {
                      const rankColors = ["linear-gradient(135deg, #FFD700 0%, #FFA500 100%)", "linear-gradient(135deg, #C0C0C0 0%, #A0A0A0 100%)", "linear-gradient(135deg, #CD7F32 0%, #B87333 100%)"];
                      return (
                        <div key={i} className="flex items-center gap-2 md:gap-3 p-2 rounded-lg hover:bg-surface/80 transition-colors">
                          <div className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: rankColors[i] || rankColors[0] }}>
                            <span className="text-background">{"#" + String(i + 1)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-semibold text-foreground truncate">{p.name}</span>
                              <span className="text-[9px] text-muted-foreground">{p.platform}</span>
                              <span className="px-1.5 py-0.5 rounded bg-accent/10 text-[8px] font-medium text-accent hidden sm:inline-block">High demand</span>
                            </div>
                          </div>
                          <MiniSparkline points={[20, 25, 22, 28, 30, 35, 32]} id={"prod" + String(i)} />
                          <ConfidenceRing score={p.confidence} />
                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-bold text-emerald-400">{p.profit}</span>
                            <span className="text-[9px] text-muted-foreground"> / {p.margin}%</span>
                            <div className="text-[9px] font-medium text-emerald-400">{p.trend}%</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="glass rounded-xl p-3 md:p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="h-4 w-4 text-accent" />
                    <span className="text-xs font-semibold text-foreground">Niche Radar</span>
                  </div>
                  <div className="space-y-2">
                    {nicheCards.map(function(n, i) {
                      return (
                        <div key={i} className="p-2 rounded-lg bg-surface/60 border border-border/50">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-semibold text-foreground">{n.name}</span>
                            <span className="text-[10px] font-bold text-accent">{n.score}/100</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="flex-1 h-1.5 rounded-full bg-surface overflow-hidden">
                              <div className="h-full rounded-full bg-gradient-to-r from-accent to-emerald-400 transition-all duration-700" style={{ width: n.score + "%" }} />
                            </div>
                            <span className="text-[9px] font-medium text-emerald-400">{n.growth}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Link href="/dashboard" className="group glass rounded-2xl p-4 md:p-5 hover:border-accent/20 transition-all hover:bg-surface-hover hover:scale-[1.02] cursor-pointer block">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-accent/10 mb-3">
                <Sparkles className="h-5 w-5 text-accent" />
              </div>
              <p className="font-display text-sm font-semibold text-foreground mb-1 group-hover:text-accent transition-colors">AI Daily Pick</p>
              <p className="text-xs text-muted-foreground">New pick every 24h</p>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-2" />
            </Link>
            <Link href="/products" className="group glass rounded-2xl p-4 md:p-5 hover:border-accent/20 transition-all hover:bg-surface-hover hover:scale-[1.02] cursor-pointer block">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-400/10 mb-3">
                <Flame className="h-5 w-5 text-emerald-400" />
              </div>
              <p className="font-display text-sm font-semibold text-foreground mb-1 group-hover:text-accent transition-colors">Live Monitoring</p>
              <p className="text-xs text-muted-foreground">Real-time market data</p>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-2" />
            </Link>
            <Link href="/calculator" className="group glass rounded-2xl p-4 md:p-5 hover:border-accent/20 transition-all hover:bg-surface-hover hover:scale-[1.02] cursor-pointer block">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-amber-400/10 mb-3">
                <Target className="h-5 w-5 text-amber-400" />
              </div>
              <p className="font-display text-sm font-semibold text-foreground mb-1 group-hover:text-accent transition-colors">Smart Calculator</p>
              <p className="text-xs text-muted-foreground">AI-powered margins</p>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-2" />
            </Link>
            <Link href="/products/niches" className="group glass rounded-2xl p-4 md:p-5 hover:border-accent/20 transition-all hover:bg-surface-hover hover:scale-[1.02] cursor-pointer block">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-purple-400/10 mb-3">
                <Trophy className="h-5 w-5 text-purple-400" />
              </div>
              <p className="font-display text-sm font-semibold text-foreground mb-1 group-hover:text-accent transition-colors">Niche Radar</p>
              <p className="text-xs text-muted-foreground">Score & analyze niches</p>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity mt-2" />
            </Link>
          </div>
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-16 bg-accent/[0.06] blur-[60px] rounded-full" />
        </div>
    </section>
  );
}
