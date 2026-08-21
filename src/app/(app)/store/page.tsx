"use client";

import { useState } from "react";
import {
  Store, ShoppingCart, Users, DollarSign,
  BarChart3, Settings, ExternalLink, CheckCircle2, AlertTriangle,
  Zap, Package, Globe, Key, Link2, Loader2, X,
} from "lucide-react";

interface StorePlatform {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
  status?: "active" | "error" | "syncing";
  products?: number;
  orders?: number;
  revenue?: number;
  lastSync?: string;
  isCustom?: boolean;
  customUrl?: string;
}

interface CustomStoreConfig {
  name: string;
  url: string;
  apiKey: string;
  productsEndpoint: string;
  ordersEndpoint: string;
  customersEndpoint: string;
}

interface BenchmarkMetric {
  label: string;
  yourValue: string;
  industryAvg: string;
  topPerformer: string;
  percentile: number;
  trend: "up" | "down" | "stable";
}

const defaultPlatforms: StorePlatform[] = [
  { id: "shopify", name: "Shopify", icon: "🛍️", connected: false },
  { id: "woocommerce", name: "WooCommerce", icon: "🛒", connected: false },
  { id: "bigcommerce", name: "BigCommerce", icon: "🏪", connected: false },
  { id: "squarespace", name: "Squarespace", icon: "🎨", connected: false },
];

const defaultCustomConfig: CustomStoreConfig = {
  name: "",
  url: "",
  apiKey: "",
  productsEndpoint: "/api/products",
  ordersEndpoint: "/api/orders",
  customersEndpoint: "/api/customers",
};

const benchmarks: BenchmarkMetric[] = [
  { label: "Conversion Rate", yourValue: "—", industryAvg: "2.5%", topPerformer: "4.8%", percentile: 0, trend: "stable" },
  { label: "Average Order Value", yourValue: "—", industryAvg: "$45", topPerformer: "$85", percentile: 0, trend: "stable" },
  { label: "Customer Acquisition Cost", yourValue: "—", industryAvg: "$18", topPerformer: "$8", percentile: 0, trend: "stable" },
  { label: "Return on Ad Spend", yourValue: "—", industryAvg: "3.2x", topPerformer: "6.5x", percentile: 0, trend: "stable" },
  { label: "Cart Abandonment Rate", yourValue: "—", industryAvg: "68%", topPerformer: "42%", percentile: 0, trend: "stable" },
  { label: "Customer Lifetime Value", yourValue: "—", industryAvg: "$62", topPerformer: "$180", percentile: 0, trend: "stable" },
  { label: "Repeat Purchase Rate", yourValue: "—", industryAvg: "27%", topPerformer: "45%", percentile: 0, trend: "stable" },
  { label: "Shipping Speed (days)", yourValue: "—", industryAvg: "5.2", topPerformer: "1.5", percentile: 0, trend: "stable" },
];

export default function StorePage() {
  const [connectedStores, setConnectedStores] = useState<StorePlatform[]>(defaultPlatforms);
  const [activeTab, setActiveTab] = useState<"connect" | "benchmark">("connect");
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customConfig, setCustomConfig] = useState<CustomStoreConfig>(defaultCustomConfig);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleConnect = (platformId: string) => {
    setConnectedStores((prev) =>
      prev.map((p) =>
        p.id === platformId
          ? { ...p, connected: true, status: "active", products: 0, orders: 0, revenue: 0, lastSync: "Just now" }
          : p
      )
    );
  };

  const handleDisconnect = (platformId: string) => {
    setConnectedStores((prev) =>
      prev.map((p) =>
        p.id === platformId
          ? { ...p, connected: false, status: undefined, products: undefined, orders: undefined, revenue: undefined, lastSync: undefined }
          : p
      )
    );
  };

  const handleTestCustomStore = async () => {
    if (!customConfig.url) return;
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/store/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", ...customConfig }),
      });
      const data = await res.json();
      setTestResult({
        success: res.ok,
        message: res.ok ? `Connected! Found ${data.data?.productCount ?? "?"} products.` : data.error || "Connection failed",
      });
    } catch {
      setTestResult({ success: false, message: "Network error - could not reach your store" });
    } finally {
      setTesting(false);
    }
  };

  const handleConnectCustomStore = () => {
    if (!customConfig.name || !customConfig.url) return;

    const storeId = `custom-${Date.now()}`;
    setConnectedStores((prev) => [
      ...prev,
      {
        id: storeId,
        name: customConfig.name,
        icon: "🔗",
        connected: true,
        status: "active",
        products: 0,
        orders: 0,
        revenue: 0,
        lastSync: "Just now",
        isCustom: true,
        customUrl: customConfig.url,
      },
    ]);
    setCustomConfig(defaultCustomConfig);
    setShowCustomModal(false);
    setTestResult(null);
  };

  const connectedCount = connectedStores.filter((p) => p.connected).length;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Store className="h-7 w-7 text-accent" /> My Store
        </h1>
        <p className="text-muted-foreground">Connect your store and benchmark your performance against industry standards.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setActiveTab("connect")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === "connect" ? "bg-accent text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]" : "bg-surface border border-border text-muted-foreground hover:text-foreground"}`}>
          <Store className="h-4 w-4" /> Connect Store
        </button>
        <button onClick={() => setActiveTab("benchmark")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === "benchmark" ? "bg-accent text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]" : "bg-surface border border-border text-muted-foreground hover:text-foreground"}`}>
          <BarChart3 className="h-4 w-4" /> Benchmarking
        </button>
      </div>

      {/* Connect Store Tab */}
      {activeTab === "connect" && (
        <div className="space-y-6 animate-slide-up">
          {connectedCount > 0 && (
            <div className="glass rounded-2xl p-6">
              <h3 className="font-display text-sm font-semibold text-foreground mb-4">Connected Stores</h3>
              <div className="space-y-3">
                {connectedStores.filter((p) => p.connected).map((platform) => (
                  <div key={platform.id} className="flex items-center gap-4 p-4 rounded-xl bg-surface/50 border border-border">
                    <span className="text-2xl">{platform.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-display text-sm font-semibold text-foreground">{platform.name}</h4>
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-400/10 text-emerald-400 text-[10px] font-bold">
                          <CheckCircle2 className="h-3 w-3" /> Connected
                        </span>
                        {platform.isCustom && (
                          <span className="px-2 py-0.5 rounded-md bg-purple-400/10 text-purple-400 text-[10px] font-bold">
                            Custom
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        {platform.customUrl && <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{platform.customUrl}</span>}
                        <span>{platform.products} products</span>
                        <span>{platform.orders} orders</span>
                        <span>${platform.revenue?.toLocaleString()} revenue</span>
                        <span>Last sync: {platform.lastSync}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <Settings className="h-3 w-3 inline mr-1" /> Sync
                      </button>
                      <button onClick={() => handleDisconnect(platform.id)}
                        className="px-3 py-1.5 rounded-lg bg-red-400/10 border border-red-400/20 text-xs text-red-400 hover:bg-red-400/20 transition-colors">
                        Disconnect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="glass rounded-2xl p-6">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4">Available Platforms</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {connectedStores.filter((p) => !p.connected && !p.isCustom).map((platform) => (
                <div key={platform.id} className="p-5 rounded-xl bg-surface/50 border border-border hover:border-accent/20 transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{platform.icon}</span>
                    <div>
                      <h4 className="font-display text-sm font-semibold text-foreground">{platform.name}</h4>
                      <p className="text-xs text-muted-foreground">Connect your {platform.name} store</p>
                    </div>
                  </div>
                  <button onClick={() => handleConnect(platform.id)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent text-sm font-medium hover:bg-accent/20 transition-all">
                    <ExternalLink className="h-4 w-4" /> Connect {platform.name}
                  </button>
                </div>
              ))}

              {/* Custom Store Card */}
              <div className="p-5 rounded-xl bg-surface/50 border border-dashed border-accent/30 hover:border-accent/50 transition-all">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                    <Link2 className="h-6 w-6 text-accent" />
                  </div>
                  <div>
                    <h4 className="font-display text-sm font-semibold text-foreground">Custom Store</h4>
                    <p className="text-xs text-muted-foreground">Connect any store built from scratch</p>
                  </div>
                </div>
                <button onClick={() => setShowCustomModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent text-sm font-medium hover:bg-accent/20 transition-all">
                  <Link2 className="h-4 w-4" /> Connect Custom Store
                </button>
              </div>
            </div>
          </div>

          {/* Store Stats Summary */}
          <div className="glass rounded-2xl p-6">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4">Store Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { icon: ShoppingCart, label: "Total Orders", value: "0", color: "bg-accent/10 text-accent" },
                { icon: DollarSign, label: "Total Revenue", value: "$0", color: "bg-emerald-400/10 text-emerald-400" },
                { icon: Package, label: "Products Listed", value: "0", color: "bg-purple-400/10 text-purple-400" },
                { icon: Users, label: "Customers", value: "0", color: "bg-amber-400/10 text-amber-400" },
              ].map((stat) => (
                <div key={stat.label} className="p-4 rounded-xl bg-surface/50 border border-border text-center">
                  <div className={`inline-flex p-2 rounded-xl ${stat.color} mb-2`}>
                    <stat.icon className="h-4 w-4" />
                  </div>
                  <p className="text-lg font-bold font-display text-foreground">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Benchmark Tab */}
      {activeTab === "benchmark" && (
        <div className="space-y-6 animate-slide-up">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="h-5 w-5 text-accent" />
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground">Industry Benchmarks</h3>
                <p className="text-xs text-muted-foreground">Compare your metrics against dropshipping industry averages and top performers.</p>
              </div>
            </div>

            <div className="space-y-3">
              {benchmarks.map((b) => (
                <div key={b.label} className="p-4 rounded-xl bg-surface/50 border border-border">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-foreground">{b.label}</h4>
                    </div>
                    <div className="flex items-center gap-6 text-xs">
                      <div className="text-center">
                        <p className="text-muted-foreground mb-0.5">You</p>
                        <p className="font-bold text-foreground">{b.yourValue}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground mb-0.5">Industry Avg</p>
                        <p className="font-bold text-amber-400">{b.industryAvg}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-muted-foreground mb-0.5">Top 10%</p>
                        <p className="font-bold text-emerald-400">{b.topPerformer}</p>
                      </div>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-surface overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-accent/30 to-accent transition-all" style={{ width: `${b.percentile}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Improvement Tips */}
          <div className="glass rounded-2xl p-6">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" /> Improvement Tips
            </h3>
            <div className="space-y-2">
              {[
                { tip: "Connect your store to see personalized benchmarks", priority: "high" },
                { tip: "Focus on conversion rate optimization first — it has the highest ROI", priority: "high" },
                { tip: "Reduce cart abandonment with exit-intent popups and email recovery", priority: "medium" },
                { tip: "Increase AOV with product bundles and free shipping thresholds", priority: "medium" },
                { tip: "Build repeat purchases with loyalty programs and email marketing", priority: "low" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-surface/50">
                  <div className={`p-1.5 rounded-lg ${item.priority === "high" ? "bg-red-400/10" : item.priority === "medium" ? "bg-amber-400/10" : "bg-surface"}`}>
                    <AlertTriangle className={`h-3 w-3 ${item.priority === "high" ? "text-red-400" : item.priority === "medium" ? "text-amber-400" : "text-muted-foreground"}`} />
                  </div>
                  <span className="text-sm text-foreground flex-1">{item.tip}</span>
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${item.priority === "high" ? "bg-red-400/10 text-red-400" : item.priority === "medium" ? "bg-amber-400/10 text-amber-400" : "bg-surface text-muted-foreground"}`}>
                    {item.priority}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Custom Store Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass rounded-2xl border border-border w-full max-w-lg p-6 space-y-5 animate-slide-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-accent/10 border border-accent/20">
                  <Link2 className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold text-foreground">Connect Custom Store</h2>
                  <p className="text-xs text-muted-foreground">Link any store you built from scratch</p>
                </div>
              </div>
              <button onClick={() => { setShowCustomModal(false); setTestResult(null); }}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Store Name</label>
                <input
                  type="text"
                  value={customConfig.name}
                  onChange={(e) => setCustomConfig((p) => ({ ...p, name: e.target.value }))}
                  placeholder="My Custom Store"
                  className="w-full px-4 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Store URL</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="url"
                    value={customConfig.url}
                    onChange={(e) => setCustomConfig((p) => ({ ...p, url: e.target.value }))}
                    placeholder="https://my-store.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">API Key / Token</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="password"
                    value={customConfig.apiKey}
                    onChange={(e) => setCustomConfig((p) => ({ ...p, apiKey: e.target.value }))}
                    placeholder="sk_xxxxxxxxxxxxxxxxxxxx"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
                  />
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">API Endpoints (optional)</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Products Endpoint</label>
                    <input
                      type="text"
                      value={customConfig.productsEndpoint}
                      onChange={(e) => setCustomConfig((p) => ({ ...p, productsEndpoint: e.target.value }))}
                      placeholder="/api/products"
                      className="w-full px-4 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 transition-all font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Orders Endpoint</label>
                    <input
                      type="text"
                      value={customConfig.ordersEndpoint}
                      onChange={(e) => setCustomConfig((p) => ({ ...p, ordersEndpoint: e.target.value }))}
                      placeholder="/api/orders"
                      className="w-full px-4 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 transition-all font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Customers Endpoint</label>
                    <input
                      type="text"
                      value={customConfig.customersEndpoint}
                      onChange={(e) => setCustomConfig((p) => ({ ...p, customersEndpoint: e.target.value }))}
                      placeholder="/api/customers"
                      className="w-full px-4 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 transition-all font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Test Result */}
              {testResult && (
                <div className={`px-4 py-3 rounded-xl text-sm ${testResult.success ? "bg-emerald-400/10 border border-emerald-400/20 text-emerald-400" : "bg-red-400/10 border border-red-400/20 text-red-400"}`}>
                  {testResult.message}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleTestCustomStore}
                  disabled={testing || !customConfig.url}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
                >
                  {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                  Test Connection
                </button>
                <button
                  onClick={handleConnectCustomStore}
                  disabled={!customConfig.name || !customConfig.url}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-hover transition-all disabled:opacity-50"
                >
                  <Link2 className="h-4 w-4" />
                  Connect Store
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
