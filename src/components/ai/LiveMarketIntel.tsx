"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  TrendingUp, Flame, Zap, ArrowUpRight, RefreshCw,
  Globe, BarChart3, ShoppingCart,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";

interface TrendingProduct {
  id: string;
  name: string;
  trend: number;
  price: number;
  margin: number;
  platform: string;
}

interface MarketAlert {
  id: string;
  type: "trending" | "price" | "competition" | "opportunity";
  text: string;
  value: string;
  color: string;
}

const defaultTrending: TrendingProduct[] = [
  { id: "1", name: "Pet GPS Tracker", trend: 340, price: 29.99, margin: 65, platform: "Amazon" },
  { id: "2", name: "Posture Corrector", trend: 180, price: 24.99, margin: 72, platform: "Shopify" },
  { id: "3", name: "LED Strip Lights", trend: 95, price: 19.99, margin: 58, platform: "AliExpress" },
  { id: "4", name: "Portable Espresso", trend: 120, price: 49.99, margin: 45, platform: "Amazon" },
  { id: "5", name: "Smart Water Bottle", trend: 85, price: 34.99, margin: 52, platform: "TikTok" },
];

const defaultAlerts: MarketAlert[] = [
  { id: "1", type: "trending", text: "Pet supplies demand surging", value: "+23%", color: "text-emerald-400 bg-emerald-400/10" },
  { id: "2", type: "price", text: "AliExpress shipping costs down", value: "-12%", color: "text-blue-400 bg-blue-400/10" },
  { id: "3", type: "competition", text: "LED niche saturation rising", value: "High", color: "text-amber-400 bg-amber-400/10" },
  { id: "4", type: "opportunity", text: "Summer products peaking NOW", value: "Hot", color: "text-purple-400 bg-purple-400/10" },
];

export default function LiveMarketIntel() {
  const { user } = useAuth();
  const [trending, setTrending] = useState<TrendingProduct[]>(defaultTrending);
  const [alerts, setAlerts] = useState<MarketAlert[]>(defaultAlerts);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"trending" | "alerts">("trending");

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/market-intel?uid=${user.uid}`);
      if (res.ok) {
        const data = await res.json();
        if (data.trending?.length) setTrending(data.trending);
        if (data.alerts?.length) setAlerts(data.alerts);
      }
    } catch { /* use defaults */ }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 600000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return (
    <div className="bg-white/[0.02] rounded-2xl border border-white/[0.06] overflow-hidden h-fit">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/[0.04]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
            <Globe className="h-3.5 w-3.5 text-accent" />
          </div>
          <span className="text-sm font-semibold text-foreground">Market Intel</span>
        </div>
        <button
          onClick={fetchData}
          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.04]">
        <button
          onClick={() => setActiveTab("trending")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2 ${
            activeTab === "trending"
              ? "text-accent border-accent"
              : "text-muted-foreground hover:text-foreground border-transparent"
          }`}
        >
          <Flame className="h-3 w-3" />
          Trending
        </button>
        <button
          onClick={() => setActiveTab("alerts")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2 ${
            activeTab === "alerts"
              ? "text-accent border-accent"
              : "text-muted-foreground hover:text-foreground border-transparent"
          }`}
        >
          <Zap className="h-3 w-3" />
          Alerts
        </button>
      </div>

      {/* Content */}
      <div className="p-3 max-h-[380px] overflow-y-auto">
        {activeTab === "trending" && (
          <div className="space-y-1.5">
            {trending.map((product, i) => (
              <Link
                key={product.id}
                href="/products"
                className="group flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition-all"
              >
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${
                  i === 0 ? "bg-amber-400/20 text-amber-400" :
                  i === 1 ? "bg-gray-300/20 text-gray-300" :
                  i === 2 ? "bg-orange-400/20 text-orange-400" :
                  "bg-white/5 text-muted-foreground"
                }`}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate group-hover:text-accent transition-colors">
                    {product.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground">${product.price}</span>
                    <span className="text-[10px] text-emerald-400 font-medium">{product.margin}% margin</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-400/10 shrink-0">
                  <TrendingUp className="h-2.5 w-2.5 text-emerald-400" />
                  <span className="text-[10px] font-bold text-emerald-400">+{product.trend}%</span>
                </div>
              </Link>
            ))}
            <Link
              href="/products"
              className="flex items-center justify-center gap-1.5 py-2.5 text-[11px] text-accent hover:text-accent/80 font-medium transition-colors rounded-lg hover:bg-accent/5"
            >
              View all trending <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        )}

        {activeTab === "alerts" && (
          <div className="space-y-1.5">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-all"
              >
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${alert.color}`}>
                  {alert.value}
                </span>
                <p className="text-[13px] text-foreground flex-1">{alert.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats Footer */}
      <div className="grid grid-cols-2 border-t border-white/[0.04]">
        <div className="p-3 text-center border-r border-white/[0.04]">
          <div className="flex items-center justify-center gap-1 mb-1">
            <ShoppingCart className="h-3 w-3 text-muted-foreground" />
          </div>
          <p className="text-base font-bold text-foreground">847</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Products</p>
        </div>
        <div className="p-3 text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <BarChart3 className="h-3 w-3 text-emerald-400" />
          </div>
          <p className="text-base font-bold text-emerald-400">+12%</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Growth</p>
        </div>
      </div>
    </div>
  );
}
