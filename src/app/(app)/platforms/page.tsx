"use client";

import { useState } from "react";
import {
  Globe, CheckCircle2, AlertTriangle, ExternalLink, Search,
  Loader2, X, Package, ShoppingCart, Store, Zap, Key,
  TrendingUp, DollarSign, BarChart3,
} from "lucide-react";

interface Platform {
  id: string;
  name: string;
  description: string;
  category: "marketplace" | "supplier" | "search" | "analytics";
  icon: string;
  dataSource: string;
  envKey: string;
  configured: boolean;
  active: boolean;
  features: string[];
  freeTier: string;
  apiType: "third-party" | "affiliate" | "scraper";
  searchEndpoint: string;
}

const allPlatforms: Platform[] = [
  // Marketplaces
  {
    id: "amazon",
    name: "Amazon",
    description: "World's largest marketplace via Rainforest API",
    category: "marketplace",
    icon: "📦",
    dataSource: "Rainforest API",
    envKey: "RAINFOREST_API_KEY",
    configured: false,
    active: true,
    features: ["Product search", "Price history", "Reviews", "BSR ranking"],
    freeTier: "100 req/mo (Rainforest)",
    apiType: "third-party",
    searchEndpoint: "/api/platforms/amazon",
  },
  {
    id: "ebay",
    name: "eBay",
    description: "Auction & fixed-price marketplace via Browse API",
    category: "marketplace",
    icon: "🏷️",
    dataSource: "eBay Browse API",
    envKey: "EBAY_APP_ID",
    configured: false,
    active: true,
    features: ["Product search", "Completed listings", "Price comparison"],
    freeTier: "5,000 calls/day",
    apiType: "affiliate",
    searchEndpoint: "/api/platforms/ebay",
  },
  {
    id: "aliexpress",
    name: "AliExpress",
    description: "Chinese wholesale marketplace via Rainforest + Scraper",
    category: "marketplace",
    icon: "🇨🇳",
    dataSource: "Rainforest + ScraperAPI",
    envKey: "RAINFOREST_API_KEY",
    configured: false,
    active: true,
    features: ["Product search", "Supplier ratings", "Bulk pricing"],
    freeTier: "Multiple sources",
    apiType: "third-party",
    searchEndpoint: "/api/platforms/aliexpress",
  },
  {
    id: "walmart",
    name: "Walmart",
    description: "Major US retailer via SerpAPI + Scraper",
    category: "marketplace",
    icon: "🏪",
    dataSource: "SerpAPI + ScraperAPI",
    envKey: "SERP_API_KEY",
    configured: false,
    active: true,
    features: ["Product search", "Price tracking", "Availability"],
    freeTier: "100 req/mo (SerpAPI)",
    apiType: "third-party",
    searchEndpoint: "/api/platforms/walmart",
  },
  {
    id: "temu",
    name: "Temu",
    description: "Ultra-low-price Chinese marketplace via Scraper",
    category: "marketplace",
    icon: "🔥",
    dataSource: "ScraperAPI",
    envKey: "SCRAPER_API_KEY",
    configured: false,
    active: true,
    features: ["Product search", "Price comparison", "Deals"],
    freeTier: "5,000 req/mo",
    apiType: "scraper",
    searchEndpoint: "/api/platforms/temu",
  },
  {
    id: "shein",
    name: "SHEIN",
    description: "Fast fashion marketplace via Scraper",
    category: "marketplace",
    icon: "👗",
    dataSource: "ScraperAPI",
    envKey: "SCRAPER_API_KEY",
    configured: false,
    active: true,
    features: ["Product search", "Trending items", "Price tracking"],
    freeTier: "5,000 req/mo",
    apiType: "scraper",
    searchEndpoint: "/api/platforms/shein",
  },
  {
    id: "etsy",
    name: "Etsy",
    description: "Handmade & vintage marketplace via Scraper",
    category: "marketplace",
    icon: "🎨",
    dataSource: "ScraperAPI",
    envKey: "SCRAPER_API_KEY",
    configured: false,
    active: true,
    features: ["Product search", "Shop analytics", "Trending items"],
    freeTier: "5,000 req/mo",
    apiType: "scraper",
    searchEndpoint: "/api/platforms/etsy",
  },
  // Suppliers
  {
    id: "cj",
    name: "CJ Dropshipping",
    description: "Direct dropship supplier with API",
    category: "supplier",
    icon: "🚚",
    dataSource: "CJ Official API",
    envKey: "CJ_API_KEY",
    configured: false,
    active: true,
    features: ["Product catalog", "Order management", "Categories"],
    freeTier: "Free to use",
    apiType: "third-party",
    searchEndpoint: "/api/platforms/cj",
  },
  {
    id: "alibaba",
    name: "Alibaba",
    description: "B2B wholesale marketplace via Scraper",
    category: "supplier",
    icon: "🏭",
    dataSource: "ScraperAPI + ZenRows",
    envKey: "SCRAPER_API_KEY",
    configured: false,
    active: true,
    features: ["Supplier search", "MOQ info", "Bulk pricing"],
    freeTier: "Multiple scrapers",
    apiType: "scraper",
    searchEndpoint: "/api/platforms/alibaba",
  },
  {
    id: "banggood",
    name: "Banggood",
    description: "Chinese wholesale via Scraper",
    category: "supplier",
    icon: "⚡",
    dataSource: "ScraperAPI",
    envKey: "SCRAPER_API_KEY",
    configured: false,
    active: true,
    features: ["Product search", "Wholesale prices", "Deals"],
    freeTier: "5,000 req/mo",
    apiType: "scraper",
    searchEndpoint: "/api/platforms/banggood",
  },
  {
    id: "dhgate",
    name: "DHgate",
    description: "Chinese wholesale marketplace via Scraper",
    category: "supplier",
    icon: "🔗",
    dataSource: "ScraperAPI",
    envKey: "SCRAPER_API_KEY",
    configured: false,
    active: true,
    features: ["Product search", "Supplier ratings", "Bulk deals"],
    freeTier: "5,000 req/mo",
    apiType: "scraper",
    searchEndpoint: "/api/platforms/dhgate",
  },
  // Search & Analytics
  {
    id: "google_shopping",
    name: "Google Shopping",
    description: "Product search engine via SerpAPI",
    category: "search",
    icon: "🔍",
    dataSource: "SerpAPI",
    envKey: "SERP_API_KEY",
    configured: false,
    active: true,
    features: ["Multi-platform search", "Price comparison", "Shopping ads data"],
    freeTier: "100 req/mo",
    apiType: "third-party",
    searchEndpoint: "/api/platforms/google-shopping",
  },
  {
    id: "keepa",
    name: "Keepa",
    description: "Amazon price history & analytics",
    category: "analytics",
    icon: "📊",
    dataSource: "Keepa API",
    envKey: "KEEPA_API_KEY",
    configured: false,
    active: true,
    features: ["Price history", "Sales rank tracking", "Deal alerts"],
    freeTier: "1 req/sec",
    apiType: "third-party",
    searchEndpoint: "/api/platforms/keepa",
  },
  {
    id: "pricecharting",
    name: "PriceCharting",
    description: "Electronics & gaming price data",
    category: "analytics",
    icon: "🎮",
    dataSource: "PriceCharting API",
    envKey: "PRICECHARTING_API_KEY",
    configured: false,
    active: true,
    features: ["Price data", "Market value", "Historical prices"],
    freeTier: "Free tier available",
    apiType: "third-party",
    searchEndpoint: "/api/platforms/pricecharting",
  },
];

const categories = [
  { id: "all", label: "All Platforms", icon: Globe },
  { id: "marketplace", label: "Marketplaces", icon: ShoppingCart },
  { id: "supplier", label: "Suppliers", icon: Package },
  { id: "search", label: "Search Engines", icon: Search },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
];

export default function PlatformsPage() {
  const [platforms, setPlatforms] = useState<Platform[]>(allPlatforms);
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showConnectModal, setShowConnectModal] = useState<Platform | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [searching, setSearching] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<Record<string, unknown>[]>([]);
  const [searchPlatform, setSearchPlatform] = useState<string | null>(null);

  const filtered = platforms.filter((p) => {
    const matchesCategory = activeCategory === "all" || p.category === activeCategory;
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const configuredCount = platforms.filter((p) => p.configured).length;
  const activeCount = platforms.filter((p) => p.active).length;

  const handleConnect = async (platform: Platform) => {
    setConnecting(true);
    // Simulate connection check
    await new Promise((r) => setTimeout(r, 1500));
    setPlatforms((prev) =>
      prev.map((p) => (p.id === platform.id ? { ...p, configured: true } : p))
    );
    setConnecting(false);
    setShowConnectModal(null);
  };

  const handleDisconnect = (platformId: string) => {
    setPlatforms((prev) =>
      prev.map((p) => (p.id === platformId ? { ...p, configured: false } : p))
    );
  };

  const handleToggleActive = (platformId: string) => {
    setPlatforms((prev) =>
      prev.map((p) => (p.id === platformId ? { ...p, active: !p.active } : p))
    );
  };

  const handleSearch = async (platform: Platform) => {
    if (!searchQuery.trim()) return;
    setSearching(platform.id);
    setSearchResults([]);
    setSearchPlatform(null);

    try {
      const res = await fetch(platform.searchEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.data) {
        const results = Array.isArray(data.data)
          ? data.data
          : data.data.search_results ?? data.data.data ?? data.data.products ?? [data.data];
        setSearchResults(results.slice(0, 10));
        setSearchPlatform(platform.name);
      }
    } catch {
      // silent
    } finally {
      setSearching(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Globe className="h-7 w-7 text-accent" /> Platform Connectors
        </h1>
        <p className="text-muted-foreground">
          Connect to {platforms.length}+ platforms using third-party data APIs. No direct API keys needed.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Globe className="h-4 w-4 text-accent" />
            <span className="text-xs text-muted-foreground">Total Platforms</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{platforms.length}</p>
        </div>
        <div className="glass rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span className="text-xs text-muted-foreground">Configured</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{configuredCount}</p>
        </div>
        <div className="glass rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-amber-400" />
            <span className="text-xs text-muted-foreground">Active</span>
          </div>
          <p className="text-2xl font-bold text-amber-400">{activeCount}</p>
        </div>
        <div className="glass rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 mb-2">
            <Key className="h-4 w-4 text-purple-400" />
            <span className="text-xs text-muted-foreground">APIs Used</span>
          </div>
          <p className="text-2xl font-bold text-purple-400">8</p>
        </div>
      </div>

      {/* Search bar */}
      <div className="glass rounded-xl p-4 border border-border">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search platforms or search products across all platforms..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 transition-all text-sm"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setSearchResults([]); setSearchPlatform(null); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeCategory === cat.id
                ? "bg-accent text-white shadow-[0_0_15px_rgba(var(--glow-color),0.3)]"
                : "bg-surface border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            <cat.icon className="h-4 w-4" />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && searchPlatform && (
        <div className="glass rounded-2xl p-6 border border-border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-semibold text-foreground">
              Results from {searchPlatform}
            </h3>
            <button onClick={() => { setSearchResults([]); setSearchPlatform(null); }}
              className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {searchResults.map((item: Record<string, unknown>, i: number) => (
              <div key={i} className="p-4 rounded-xl bg-surface/50 border border-border">
                <h4 className="text-sm font-medium text-foreground line-clamp-2 mb-2">
                  {String(item.title || item.productName || "Product")}
                </h4>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {item.price != null && (
                    <span className="text-accent font-bold">${Number(item.price)}</span>
                  )}
                  {item.sellPrice != null && item.price == null && (
                    <span className="text-accent font-bold">${Number(item.sellPrice)}</span>
                  )}
                  {item.rating != null && <span>★ {Number(item.rating)}</span>}
                  {item.reviews != null && <span>({Number(item.reviews)})</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Platform grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((platform) => (
          <div
            key={platform.id}
            className="glass rounded-2xl border border-border overflow-hidden hover:border-accent/30 transition-all"
          >
            <div className="p-6 space-y-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{platform.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-semibold text-foreground">{platform.name}</h3>
                      {platform.configured ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                          Connected
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/10 text-amber-400 border border-amber-400/20">
                          Not connected
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{platform.description}</p>
                  </div>
                </div>
              </div>

              {/* Data source badge */}
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-surface border border-border text-muted-foreground uppercase">
                  {platform.apiType}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  via {platform.dataSource}
                </span>
              </div>

              {/* Features */}
              <div className="flex flex-wrap gap-1.5">
                {platform.features.map((f) => (
                  <span key={f} className="px-2 py-0.5 rounded text-[10px] bg-surface border border-border text-muted-foreground">
                    {f}
                  </span>
                ))}
              </div>

              {/* Free tier */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <DollarSign className="h-3 w-3" />
                <span>{platform.freeTier}</span>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2">
                {platform.configured ? (
                  <>
                    <button
                      onClick={() => handleSearch(platform)}
                      disabled={!searchQuery.trim() || searching === platform.id}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-accent/10 border border-accent/20 text-accent text-xs font-medium hover:bg-accent/20 transition-all disabled:opacity-50"
                    >
                      {searching === platform.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Search className="h-3 w-3" />
                      )}
                      Search
                    </button>
                    <button
                      onClick={() => handleToggleActive(platform.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                        platform.active
                          ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"
                          : "bg-surface border border-border text-muted-foreground"
                      }`}
                    >
                      {platform.active ? "Active" : "Off"}
                    </button>
                    <button
                      onClick={() => handleDisconnect(platform.id)}
                      className="px-3 py-2 rounded-xl bg-red-400/10 border border-red-400/20 text-xs text-red-400 hover:bg-red-400/20 transition-colors"
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setShowConnectModal(platform)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-accent/10 border border-accent/20 text-accent text-xs font-medium hover:bg-accent/20 transition-all"
                  >
                    <Zap className="h-3 w-3" /> Connect
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* How it works */}
      <div className="glass rounded-2xl p-6 border border-border">
        <h3 className="font-display text-lg font-semibold text-foreground mb-4">How Platform Connectors Work</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-surface/50 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-accent/10">
                <Key className="h-4 w-4 text-accent" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">1. Third-Party APIs</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              We use services like Rainforest, SerpAPI, and ScraperAPI that already have access to platform data. No direct API keys needed.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-surface/50 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-emerald-400/10">
                <Globe className="h-4 w-4 text-emerald-400" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">2. Unified Search</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Search across all platforms with one query. Results are normalized and displayed in a consistent format.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-surface/50 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-amber-400/10">
                <TrendingUp className="h-4 w-4 text-amber-400" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">3. Price Comparison</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Compare prices across platforms instantly. Find the best sourcing option for your products.
            </p>
          </div>
        </div>
      </div>

      {/* Connect Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass rounded-2xl border border-border w-full max-w-md p-6 space-y-5 animate-slide-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{showConnectModal.icon}</span>
                <div>
                  <h2 className="font-display text-lg font-semibold text-foreground">Connect {showConnectModal.name}</h2>
                  <p className="text-xs text-muted-foreground">{showConnectModal.dataSource}</p>
                </div>
              </div>
              <button onClick={() => setShowConnectModal(null)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-surface/50 border border-border">
              <p className="text-sm text-foreground mb-2">This platform uses:</p>
              <p className="text-sm text-accent font-medium">{showConnectModal.dataSource}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {showConnectModal.apiType === "third-party" && "Data is fetched via a third-party API service. No direct platform account needed."}
                {showConnectModal.apiType === "affiliate" && "This uses an affiliate/partner API with limited access."}
                {showConnectModal.apiType === "scraper" && "Data is scraped from the platform using web scraping services."}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-surface/50 border border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Environment Key</p>
              <code className="text-xs text-accent font-mono">{showConnectModal.envKey}</code>
            </div>

            <button
              onClick={() => handleConnect(showConnectModal)}
              disabled={connecting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-hover transition-all disabled:opacity-50"
            >
              {connecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Connect {showConnectModal.name}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
