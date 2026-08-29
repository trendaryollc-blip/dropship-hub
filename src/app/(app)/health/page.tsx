"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Zap, CheckCircle2, ArrowUpRight, Target, Shield, DollarSign,
  BarChart3, Package, RotateCcw, ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useAuth } from "@/components/auth/AuthProvider";

interface HealthItem {
  label: string;
  done: boolean;
  impact: string;
}

interface HealthCategory {
  id: string;
  label: string;
  icon: typeof Zap;
  color: string;
  bgColor: string;
  borderColor: string;
  href: string;
  hrefLabel: string;
  items: HealthItem[];
}

const STORAGE_KEY = "dropship-health-state";

const defaultCategories: HealthCategory[] = [
  {
    id: "product", label: "Product Research",
    icon: Package, color: "text-blue-400", bgColor: "bg-blue-400/10", borderColor: "border-blue-400/20",
    href: "/products", hrefLabel: "Search Products",
    items: [
      { label: "Search for trending products", done: false, impact: "high" },
      { label: "Analyze product profit margins", done: false, impact: "high" },
      { label: "Check competition levels", done: false, impact: "medium" },
      { label: "Verify supplier availability", done: false, impact: "medium" },
    ],
  },
  {
    id: "supplier", label: "Supplier Network",
    icon: Shield, color: "text-emerald-400", bgColor: "bg-emerald-400/10", borderColor: "border-emerald-400/20",
    href: "/suppliers", hrefLabel: "Find Suppliers",
    items: [
      { label: "Find 3+ reliable suppliers", done: false, impact: "high" },
      { label: "Set up backup suppliers", done: false, impact: "high" },
      { label: "Verify supplier trust badges", done: false, impact: "medium" },
      { label: "Check shipping times", done: false, impact: "low" },
    ],
  },
  {
    id: "financial", label: "Financial Health",
    icon: DollarSign, color: "text-amber-400", bgColor: "bg-amber-400/10", borderColor: "border-amber-400/20",
    href: "/calculator", hrefLabel: "Open Calculator",
    items: [
      { label: "Calculate break-even point", done: false, impact: "high" },
      { label: "Set up profit tracking", done: false, impact: "high" },
      { label: "Analyze cost breakdown", done: false, impact: "medium" },
      { label: "Plan ad budget allocation", done: false, impact: "medium" },
    ],
  },
  {
    id: "market", label: "Market Intelligence",
    icon: BarChart3, color: "text-purple-400", bgColor: "bg-purple-400/10", borderColor: "border-purple-400/20",
    href: "/competitors", hrefLabel: "Analyze Competitors",
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

function loadStateLocal(): Record<string, boolean[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveStateLocal(state: Record<string, boolean[]>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

async function loadStateFirestore(uid: string): Promise<Record<string, boolean[]> | null> {
  try {
    const snap = await getDoc(doc(db, "users", uid, "settings", "health"));
    return snap.exists() ? (snap.data().state as Record<string, boolean[]>) : null;
  } catch (err) {
    console.error("Failed to load health state from Firestore:", err);
    return null;
  }
}

async function saveStateFirestore(uid: string, state: Record<string, boolean[]>) {
  try {
    await setDoc(doc(db, "users", uid, "settings", "health"), { state });
  } catch (err) {
    console.error("Failed to save health state to Firestore:", err);
  }
}

function mergeWithSaved(cats: HealthCategory[]): HealthCategory[] {
  const saved = loadStateLocal();
  if (Object.keys(saved).length === 0) return cats;
  return cats.map((cat) => {
    const savedItems = saved[cat.id];
    if (savedItems && savedItems.length === cat.items.length) {
      return { ...cat, items: cat.items.map((item, i) => ({ ...item, done: savedItems[i] })) };
    }
    return cat;
  });
}

export default function HealthPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<HealthCategory[]>(defaultCategories);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    async function hydrate() {
      let merged = mergeWithSaved(defaultCategories);
      if (user) {
        const firestoreState = await loadStateFirestore(user.uid);
        if (firestoreState && Object.keys(firestoreState).length > 0) {
          const restored = defaultCategories.map((cat) => {
            const savedItems = firestoreState[cat.id];
            if (savedItems && savedItems.length === cat.items.length) {
              return { ...cat, items: cat.items.map((item, i) => ({ ...item, done: savedItems[i] })) };
            }
            return cat;
          });
          merged = restored;
          saveStateLocal(firestoreState);
        } else {
          const localState = loadStateLocal();
          if (Object.keys(localState).length > 0) {
            saveStateFirestore(user.uid, localState);
          }
        }
      }
      setCategories(merged);
      setMounted(true);
    }
    hydrate();
  }, [user]);

  const toggleItem = useCallback((catId: string, itemIndex: number) => {
    setCategories((prev) => {
      const next = prev.map((cat) => {
        if (cat.id !== catId) return cat;
        const newItems = cat.items.map((item, i) =>
          i === itemIndex ? { ...item, done: !item.done } : item
        );
        return { ...cat, items: newItems };
      });
      const stateToSave: Record<string, boolean[]> = {};
      next.forEach((cat) => {
        stateToSave[cat.id] = cat.items.map((item) => item.done);
      });
      saveStateLocal(stateToSave);
      if (user) {
        saveStateFirestore(user.uid, stateToSave);
      }
      return next;
    });
  }, [user]);

  const resetAll = useCallback(() => {
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        items: cat.items.map((item) => ({ ...item, done: false })),
      }))
    );
    localStorage.removeItem(STORAGE_KEY);
    if (user) {
      saveStateFirestore(user.uid, {});
    }
  }, [user]);

  const catScores = categories.map((cat) => {
    const doneCount = cat.items.filter((i) => i.done).length;
    return Math.round((doneCount / cat.items.length) * 25);
  });

  const totalScore = catScores.reduce((a, b) => a + b, 0);
  const percentage = totalScore;
  const totalDone = categories.reduce((sum, cat) => sum + cat.items.filter((i) => i.done).length, 0);
  const totalItems = categories.reduce((sum, cat) => sum + cat.items.length, 0);

  const getScoreLabel = (pct: number) => {
    if (pct >= 80) return "Excellent";
    if (pct >= 60) return "Good";
    if (pct >= 40) return "Fair";
    return "Needs Improvement";
  };

  const circumference = 2 * Math.PI * 88;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Zap className="h-7 w-7 text-accent" /> Business Health Score
          </h1>
          <p className="text-muted-foreground">Your comprehensive dropshipping readiness assessment with actionable recommendations.</p>
        </div>
        {totalDone > 0 && (
          <button
            onClick={resetAll}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-red-400/20 hover:text-red-400 transition-all shrink-0"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        )}
      </div>

      {/* Main Score */}
      <div className="glass rounded-2xl p-8">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="relative w-48 h-48 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="88" fill="none" stroke="currentColor" strokeWidth="10" className="text-surface" />
              <circle
                cx="100" cy="100" r="88" fill="none" strokeWidth="10" strokeLinecap="round"
                strokeDasharray={`${(percentage / 100) * circumference} ${circumference}`}
                className="transition-all duration-700"
                style={{ stroke: "url(#mainGradient)" }}
              />
              <defs>
                <linearGradient id="mainGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#22c55e" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-5xl font-bold text-foreground">{mounted ? percentage : 0}</span>
              <span className="text-sm text-muted-foreground mt-1">{getScoreLabel(percentage)}</span>
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <h2 className="font-display text-xl font-bold text-foreground mb-2">
              {totalDone === 0 ? "Start Your Journey" : `Your Score: ${percentage}/100`}
            </h2>
            <p className="text-muted-foreground mb-4">
              {totalDone === 0
                ? "Complete the tasks below to build your business health score. Each action improves your readiness for success."
                : `You've completed ${totalDone} of ${totalItems} tasks (${percentage}%). Keep going to reach the next level!`}
            </p>
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              {categories.map((cat, i) => (
                <div key={cat.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-border">
                  <div className={`w-2 h-2 rounded-full ${catScores[i] > 0 ? "bg-emerald-400" : "bg-muted-foreground/30"}`} />
                  <span className="text-xs text-muted-foreground">{cat.label}</span>
                  <span className="text-xs font-bold text-foreground">{catScores[i]}/25</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categories.map((cat, catIdx) => {
          const catPct = Math.round((cat.items.filter((i) => i.done).length / cat.items.length) * 100);
          const catScore = catScores[catIdx];
          return (
            <div key={cat.id} className={`glass rounded-2xl p-5 border transition-all ${catPct === 100 ? cat.borderColor : "border-transparent"}`}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-xl ${cat.bgColor}`}>
                  <cat.icon className={`h-5 w-5 ${cat.color}`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-sm font-semibold text-foreground">{cat.label}</h3>
                  <p className="text-xs text-muted-foreground">{catScore}/25 points · {cat.items.filter((i) => i.done).length}/{cat.items.length} done</p>
                </div>
                <span className={`text-lg font-bold font-display ${catPct >= 50 ? "text-emerald-400" : "text-muted-foreground"}`}>{catPct}%</span>
              </div>

              <div className="h-2 rounded-full bg-surface overflow-hidden mb-4">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${catPct > 0 ? "bg-gradient-to-r from-accent to-emerald-400" : "bg-muted-foreground/20"}`}
                  style={{ width: `${catPct}%` }}
                />
              </div>

              <div className="space-y-1.5">
                {cat.items.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => toggleItem(cat.id, i)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-surface/50 hover:bg-surface transition-all text-left group"
                  >
                    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
                      item.done
                        ? "bg-emerald-400/10 border-emerald-400/30"
                        : "border-border group-hover:border-muted-foreground/50"
                    }`}>
                      {item.done ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/20 group-hover:bg-muted-foreground/40 transition-colors" />
                      )}
                    </div>
                    <span className={`text-xs flex-1 transition-colors ${
                      item.done ? "text-foreground line-through decoration-muted-foreground/40" : "text-muted-foreground group-hover:text-foreground"
                    }`}>
                      {item.label}
                    </span>
                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                      item.impact === "high" ? "bg-red-400/10 text-red-400"
                        : item.impact === "medium" ? "bg-amber-400/10 text-amber-400"
                        : "bg-surface text-muted-foreground"
                    }`}>
                      {item.impact}
                    </span>
                  </button>
                ))}
              </div>

              <Link
                href={cat.href}
                className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-accent/30 hover:bg-accent/5 transition-all"
              >
                {cat.hrefLabel} <ExternalLink className="h-3 w-3" />
              </Link>
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
              className="flex items-center gap-3 p-3 rounded-xl bg-surface/50 hover:bg-surface transition-all group">
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
