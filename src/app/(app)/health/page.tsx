"use client";

import { useState } from "react";
import {
  Zap, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  ArrowUpRight, Target, Shield, DollarSign, Users,
  BarChart3, ShoppingCart, Package,
} from "lucide-react";
import Link from "next/link";

interface HealthCategory {
  id: string;
  label: string;
  score: number;
  maxScore: number;
  icon: typeof Zap;
  color: string;
  bgColor: string;
  items: { label: string; done: boolean; impact: string }[];
}

const categories: HealthCategory[] = [
  {
    id: "product", label: "Product Research", score: 0, maxScore: 25,
    icon: Package, color: "text-blue-400", bgColor: "bg-blue-400/10",
    items: [
      { label: "Search for trending products", done: false, impact: "high" },
      { label: "Analyze product profit margins", done: false, impact: "high" },
      { label: "Check competition levels", done: false, impact: "medium" },
      { label: "Verify supplier availability", done: false, impact: "medium" },
    ],
  },
  {
    id: "supplier", label: "Supplier Network", score: 0, maxScore: 25,
    icon: Shield, color: "text-emerald-400", bgColor: "bg-emerald-400/10",
    items: [
      { label: "Find 3+ reliable suppliers", done: false, impact: "high" },
      { label: "Set up backup suppliers", done: false, impact: "high" },
      { label: "Verify supplier trust badges", done: false, impact: "medium" },
      { label: "Check shipping times", done: false, impact: "low" },
    ],
  },
  {
    id: "financial", label: "Financial Health", score: 0, maxScore: 25,
    icon: DollarSign, color: "text-amber-400", bgColor: "bg-amber-400/10",
    items: [
      { label: "Calculate break-even point", done: false, impact: "high" },
      { label: "Set up profit tracking", done: false, impact: "high" },
      { label: "Analyze cost breakdown", done: false, impact: "medium" },
      { label: "Plan ad budget allocation", done: false, impact: "medium" },
    ],
  },
  {
    id: "market", label: "Market Intelligence", score: 0, maxScore: 25,
    icon: BarChart3, color: "text-purple-400", bgColor: "bg-purple-400/10",
    items: [
      { label: "Analyze top competitors", done: false, impact: "high" },
      { label: "Identify market gaps", done: false, impact: "high" },
      { label: "Track pricing trends", done: false, impact: "medium" },
      { label: "Monitor seasonal patterns", done: false, impact: "low" },
    ],
  },
];

const recommendations = [
  { priority: "high", text: "Find reliable suppliers with gold trust badges", href: "/suppliers", icon: Shield },
  { priority: "high", text: "Calculate profit margins for your top 3 products", href: "/calculator", icon: DollarSign },
  { priority: "medium", text: "Analyze your top 3 competitors", href: "/competitors", icon: BarChart3 },
  { priority: "medium", text: "Search for trending products in your niche", href: "/products", icon: Target },
  { priority: "low", text: "Set up AI providers for automated insights", href: "/settings", icon: Zap },
];

export default function HealthPage() {
  const totalScore = categories.reduce((sum, c) => sum + c.score, 0);
  const maxTotal = categories.reduce((sum, c) => sum + c.maxScore, 0);
  const percentage = Math.round((totalScore / maxTotal) * 100);

  const getScoreColor = (pct: number) => {
    if (pct >= 80) return "from-emerald-400 to-emerald-500";
    if (pct >= 60) return "from-accent to-blue-400";
    if (pct >= 40) return "from-amber-400 to-orange-400";
    return "from-red-400 to-red-500";
  };

  const getScoreLabel = (pct: number) => {
    if (pct >= 80) return "Excellent";
    if (pct >= 60) return "Good";
    if (pct >= 40) return "Fair";
    return "Needs Improvement";
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Zap className="h-7 w-7 text-accent" /> Business Health Score
        </h1>
        <p className="text-muted-foreground">Your comprehensive dropshipping readiness assessment with actionable recommendations.</p>
      </div>

      {/* Main Score */}
      <div className="glass rounded-2xl p-8">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="relative w-48 h-48 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" strokeWidth="10" className="text-surface" />
              <circle cx="100" cy="100" r="88" fill="none" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${(percentage / 100) * 553} 553`}
                className="transition-all duration-1000"
                style={{ stroke: `url(#mainGradient)` }} />
              <defs>
                <linearGradient id="mainGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#22c55e" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-5xl font-bold text-foreground">{percentage}</span>
              <span className="text-sm text-muted-foreground mt-1">{getScoreLabel(percentage)}</span>
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <h2 className="font-display text-xl font-bold text-foreground mb-2">
              {percentage === 0 ? "Start Your Journey" : `Your Score: ${percentage}/100`}
            </h2>
            <p className="text-muted-foreground mb-4">
              {percentage === 0
                ? "Complete the tasks below to build your business health score. Each action improves your readiness for success."
                : `You've completed ${totalScore} out of ${maxTotal} possible points. Keep going to reach the next level!`}
            </p>
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border">
                  <div className={`w-2 h-2 rounded-full ${cat.score > 0 ? "bg-emerald-400" : "bg-muted-foreground/30"}`} />
                  <span className="text-xs text-muted-foreground">{cat.label}</span>
                  <span className="text-xs font-bold text-foreground">{cat.score}/{cat.maxScore}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((cat) => {
          const catPct = Math.round((cat.score / cat.maxScore) * 100);
          return (
            <div key={cat.id} className="glass rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-xl ${cat.bgColor}`}>
                  <cat.icon className={`h-5 w-5 ${cat.color}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-sm font-semibold text-foreground">{cat.label}</h3>
                  <p className="text-xs text-muted-foreground">{cat.score}/{cat.maxScore} points</p>
                </div>
                <span className={`text-lg font-bold font-display ${catPct >= 50 ? "text-emerald-400" : "text-muted-foreground"}`}>{catPct}%</span>
              </div>

              <div className="h-2 rounded-full bg-surface overflow-hidden mb-4">
                <div className={`h-full rounded-full transition-all duration-500 ${cat.score > 0 ? "bg-gradient-to-r from-accent to-emerald-400" : "bg-muted-foreground/20"}`}
                  style={{ width: `${catPct}%` }} />
              </div>

              <div className="space-y-2">
                {cat.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-surface/50">
                    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${item.done ? "bg-emerald-400/10 border-emerald-400/20" : "border-border"}`}>
                      {item.done ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <div className="w-2 h-2 rounded-full bg-muted-foreground/20" />}
                    </div>
                    <span className={`text-xs flex-1 ${item.done ? "text-foreground" : "text-muted-foreground"}`}>{item.label}</span>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${item.impact === "high" ? "bg-red-400/10 text-red-400" : item.impact === "medium" ? "bg-amber-400/10 text-amber-400" : "bg-surface text-muted-foreground"}`}>
                      {item.impact}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recommendations */}
      <div className="glass rounded-2xl p-6">
        <h3 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-accent" /> Priority Actions
        </h3>
        <div className="space-y-2">
          {recommendations.map((rec, i) => (
            <Link key={i} href={rec.href}
              className="flex items-center gap-3 p-3 rounded-xl bg-surface/50 hover:bg-surface-hover transition-all group">
              <div className={`p-2 rounded-lg ${rec.priority === "high" ? "bg-red-400/10" : rec.priority === "medium" ? "bg-amber-400/10" : "bg-surface"}`}>
                <rec.icon className={`h-4 w-4 ${rec.priority === "high" ? "text-red-400" : rec.priority === "medium" ? "text-amber-400" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-foreground group-hover:text-accent transition-colors">{rec.text}</p>
              </div>
              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${rec.priority === "high" ? "bg-red-400/10 text-red-400" : rec.priority === "medium" ? "bg-amber-400/10 text-amber-400" : "bg-surface text-muted-foreground"}`}>
                {rec.priority}
              </span>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
