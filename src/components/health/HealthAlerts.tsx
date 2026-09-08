"use client";

import { AlertTriangle, Clock, TrendingUp, ShoppingCart, Shield, DollarSign, BarChart3, ArrowRight } from "lucide-react";
import Link from "next/link";

interface Alert {
  id: string;
  type: "critical" | "warning" | "opportunity" | "info";
  title: string;
  description: string;
  icon: typeof AlertTriangle;
  color: string;
  bg: string;
  border: string;
  action: string;
  href: string;
}

interface HealthAlertsProps {
  score: number;
  healthData: {
    searchHistoryCount: number;
    calcHistoryCount: number;
    competitorSearchCount: number;
    storeConnectionCount: number;
    revenueEntryCount: number;
    supplierFavoriteCount: number;
  };
}

function generateAlerts(score: number, data: HealthAlertsProps["healthData"]): Alert[] {
  const alerts: Alert[] = [];

  if (data.searchHistoryCount === 0) {
    alerts.push({
      id: "no-search",
      type: "critical",
      title: "No Product Research",
      description: "You haven't searched for any products yet. Start researching to find winning products.",
      icon: TrendingUp,
      color: "text-red-400",
      bg: "bg-red-400/10",
      border: "border-red-400/20",
      action: "Search Products",
      href: "/products",
    });
  }

  if (data.supplierFavoriteCount < 3) {
    alerts.push({
      id: "few-suppliers",
      type: "warning",
      title: "Need More Suppliers",
      description: `You have ${data.supplierFavoriteCount} supplier(s). Find at least 3 for reliable fulfillment.`,
      icon: Shield,
      color: "text-amber-400",
      bg: "bg-amber-400/10",
      border: "border-amber-400/20",
      action: "Find Suppliers",
      href: "/suppliers",
    });
  }

  if (data.calcHistoryCount === 0) {
    alerts.push({
      id: "no-calc",
      type: "warning",
      title: "No Profit Calculations",
      description: "Calculate profit margins to understand your unit economics before launching.",
      icon: DollarSign,
      color: "text-amber-400",
      bg: "bg-amber-400/10",
      border: "border-amber-400/20",
      action: "Open Calculator",
      href: "/calculator",
    });
  }

  if (data.competitorSearchCount === 0) {
    alerts.push({
      id: "no-competitor",
      type: "info",
      title: "No Competitor Analysis",
      description: "Understanding competition helps you price strategically and find gaps.",
      icon: BarChart3,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
      border: "border-blue-400/20",
      action: "Analyze Competitors",
      href: "/competitors",
    });
  }

  if (data.storeConnectionCount === 0 && data.searchHistoryCount > 2) {
    alerts.push({
      id: "no-store",
      type: "opportunity",
      title: "Ready to Connect Store",
      description: "You've done research. Now connect your store to start selling.",
      icon: ShoppingCart,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
      border: "border-emerald-400/20",
      action: "Connect Store",
      href: "/store",
    });
  }

  if (score >= 60 && data.revenueEntryCount === 0 && data.storeConnectionCount > 0) {
    alerts.push({
      id: "start-tracking",
      type: "opportunity",
      title: "Start Revenue Tracking",
      description: "Your store is connected. Start tracking revenue to monitor performance.",
      icon: TrendingUp,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
      border: "border-emerald-400/20",
      action: "Track Revenue",
      href: "/profit-tracker",
    });
  }

  if (score >= 80) {
    alerts.push({
      id: "scaling-ready",
      type: "opportunity",
      title: "Ready to Scale!",
      description: "Your health score is excellent. Consider scaling your winning products.",
      icon: TrendingUp,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
      border: "border-emerald-400/20",
      action: "View Dashboard",
      href: "/dashboard",
    });
  }

  return alerts.slice(0, 4);
}

export default function HealthAlerts({ score, healthData }: HealthAlertsProps) {
  const alerts = generateAlerts(score, healthData);

  if (alerts.length === 0) return null;

  const typeOrder = { critical: 0, warning: 1, opportunity: 2, info: 3 };
  const sortedAlerts = [...alerts].sort((a, b) => typeOrder[a.type] - typeOrder[b.type]);

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-4 w-4 text-amber-400" />
        <span className="text-sm font-semibold text-foreground">Priority Alerts</span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 font-medium">
          {alerts.length}
        </span>
      </div>

      <div className="space-y-2">
        {sortedAlerts.map((alert) => (
          <Link
            key={alert.id}
            href={alert.href}
            className={`flex items-center gap-3 p-3 rounded-xl border ${alert.bg} ${alert.border} hover:opacity-80 transition-all group`}
          >
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${alert.bg}`}>
              <alert.icon className={`h-4 w-4 ${alert.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium ${alert.color}`}>{alert.title}</p>
              <p className="text-[10px] text-muted-foreground truncate">{alert.description}</p>
            </div>
            <span className={`text-[9px] px-2 py-0.5 rounded-full ${alert.bg} ${alert.color} font-medium shrink-0`}>
              {alert.type}
            </span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
