"use client";

import Link from "next/link";
import {
  Search,
  Truck,
  Calculator,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Package,
  DollarSign,
  ShoppingCart,
  BarChart3,
  Sparkles,
  Clock,
  Zap,
  Target,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

const quickActions = [
  {
    label: "Search Products",
    description: "Find winning products across 10+ platforms",
    href: "/products",
    icon: Search,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/20",
  },
  {
    label: "Find Suppliers",
    description: "Discover reliable suppliers with AI scoring",
    href: "/suppliers",
    icon: Truck,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
  },
  {
    label: "Calculate Profit",
    description: "Real-time margins, shipping, and ROI",
    href: "/calculator",
    icon: Calculator,
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
  },
  {
    label: "AI Assistant",
    description: "Get recommendations and optimization tips",
    href: "/ai",
    icon: Sparkles,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    border: "border-purple-400/20",
  },
];

const stats = [
  { label: "Products Analyzed", value: "0", change: "+12%", up: true, icon: Package },
  { label: "Estimated Profit", value: "$0", change: "+8%", up: true, icon: DollarSign },
  { label: "Active Orders", value: "0", change: "+24%", up: true, icon: ShoppingCart },
  { label: "Revenue This Month", value: "$0", change: "0%", up: true, icon: BarChart3 },
];

const recentActivity = [
  { text: "No recent activity yet", detail: "Start by searching for products", time: "Just now", icon: Clock },
];

export default function DashboardHome() {
  const healthScore = 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Welcome banner */}
      <div className="relative glass rounded-2xl p-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-[300px] h-[200px] bg-accent/[0.06] rounded-full blur-[80px]" />
        <div className="relative z-10">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
            Welcome to <span className="gradient-text">DropShip Hub</span>
          </h1>
          <p className="text-muted-foreground max-w-xl">
            Your all-in-one dropshipping command center. Search products, analyze competitors, calculate profits, and find the best suppliers — all from here.
          </p>
        </div>
      </div>

      {/* Business Health Score + Stats row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Health Score */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">Business Health</h3>
          </div>
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="8" className="text-surface" />
                <circle
                  cx="60" cy="60" r="52" fill="none" stroke="url(#healthGradient)" strokeWidth="8"
                  strokeDasharray={`${(healthScore / 100) * 327} 327`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
                <defs>
                  <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#22c55e" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-display text-3xl font-bold text-foreground">{healthScore}</span>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">out of 100</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 justify-center text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span className="text-muted-foreground">Start using the app to build your score</span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          {stats.map((stat) => (
            <div key={stat.label} className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface border border-border">
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className={`flex items-center gap-1 text-xs font-medium ${stat.up ? "text-emerald-400" : "text-red-400"}`}>
                  {stat.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {stat.change}
                </span>
              </div>
              <p className="font-display text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className={`group glass rounded-2xl p-5 hover:bg-surface-hover transition-all border ${action.border} hover:border-opacity-50`}
            >
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${action.bg} mb-3`}>
                <action.icon className={`h-5 w-5 ${action.color}`} />
              </div>
              <h3 className="font-display text-sm font-semibold text-foreground mb-1 flex items-center gap-1.5">
                {action.label}
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity + Tips row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="glass rounded-2xl p-6">
          <h3 className="font-display text-sm font-semibold text-foreground mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-surface/50">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface border border-border">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{item.text}</p>
                  <p className="text-xs text-muted-foreground">{item.detail}</p>
                </div>
                <span className="text-[10px] text-muted-foreground/60 shrink-0">{item.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Getting Started Tips */}
        <div className="glass rounded-2xl p-6">
          <h3 className="font-display text-sm font-semibold text-foreground mb-4">Getting Started</h3>
          <div className="space-y-3">
            {[
              { done: false, text: "Search for your first product", href: "/products" },
              { done: false, text: "Connect your online store", href: "/store" },
              { done: false, text: "Calculate profit margins", href: "/calculator" },
              { done: false, text: "Find reliable suppliers", href: "/suppliers" },
              { done: false, text: "Analyze your competitors", href: "/competitors" },
              { done: false, text: "Set up AI providers", href: "/settings" },
            ].map((tip, i) => (
              <Link
                key={i}
                href={tip.href}
                className="flex items-center gap-3 p-3 rounded-xl bg-surface/50 hover:bg-surface-hover transition-all group"
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border">
                  {tip.done ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Target className="h-3.5 w-3.5 text-muted-foreground group-hover:text-accent transition-colors" />
                  )}
                </div>
                <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                  {tip.text}
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground transition-all ml-auto" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
