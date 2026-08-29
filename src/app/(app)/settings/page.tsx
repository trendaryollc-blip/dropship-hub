"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Brain,
  Key,
  Shield,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  ExternalLink,
  Globe,
  Package,
  ShoppingCart,
  Store,
  DollarSign,
  BarChart3,
  ArrowUpRight,
  LayoutDashboard,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";

interface AIProvider {
  id: string;
  name: string;
  description: string;
  envKey: string;
  configured: boolean;
  active: boolean;
  features: string[];
  freeTier: string;
  priority: number;
  website: string;
  usedFor: string;
  href: string;
}

const allProviders: AIProvider[] = [
  {
    id: "groq", name: "Groq", description: "Ultra-fast inference, free tier",
    envKey: "GROQ_API_KEY", configured: false, active: true,
    features: ["Quick analysis", "Price optimization"], freeTier: "14,400 req/day", priority: 1,
    website: "https://groq.com", usedFor: "Real-time price optimization", href: "/ai",
  },
  {
    id: "gemini", name: "Google Gemini", description: "Google's flagship AI, generous free tier",
    envKey: "GOOGLE_AI_API_KEY", configured: false, active: true,
    features: ["Product analysis", "Market trends"], freeTier: "1,500 req/day", priority: 2,
    website: "https://ai.google.dev", usedFor: "Product & market analysis", href: "/ai",
  },
  {
    id: "openai", name: "OpenAI", description: "GPT-4o-mini - powerful and affordable",
    envKey: "OPENAI_API_KEY", configured: false, active: true,
    features: ["Advanced reasoning", "Code generation"], freeTier: "Pay per use", priority: 3,
    website: "https://platform.openai.com", usedFor: "Advanced reasoning & analysis", href: "/ai",
  },
  {
    id: "anthropic", name: "Anthropic (Claude)", description: "Claude - excellent at analysis",
    envKey: "ANTHROPIC_API_KEY", configured: false, active: true,
    features: ["Deep analysis", "Long context"], freeTier: "Pay per use", priority: 4,
    website: "https://console.anthropic.com", usedFor: "Deep product analysis", href: "/ai",
  },
  {
    id: "deepseek", name: "DeepSeek", description: "Strong reasoning, very cheap",
    envKey: "DEEPSEEK_API_KEY", configured: false, active: true,
    features: ["Code analysis", "Reasoning"], freeTier: "Pay per use", priority: 5,
    website: "https://platform.deepseek.com", usedFor: "Budget-friendly analysis", href: "/ai",
  },
  {
    id: "mistral", name: "Mistral AI", description: "European open-source models",
    envKey: "MISTRAL_API_KEY", configured: false, active: true,
    features: ["Open source", "Fast inference"], freeTier: "1,000 req/month", priority: 6,
    website: "https://console.mistral.ai", usedFor: "Fast open-source inference", href: "/ai",
  },
  {
    id: "cohere", name: "Cohere", description: "Enterprise NLP, great for search",
    envKey: "COHERE_API_KEY", configured: false, active: true,
    features: ["NLP", "Search"], freeTier: "Pay per use", priority: 7,
    website: "https://dashboard.cohere.com", usedFor: "Product search & NLP", href: "/products",
  },
  {
    id: "together", name: "Together AI", description: "Open-source model hosting",
    envKey: "TOGETHER_API_KEY", configured: false, active: true,
    features: ["Open models", "Fine-tuning"], freeTier: "Free credits", priority: 8,
    website: "https://api.together.xyz", usedFor: "Open-source model hosting", href: "/ai",
  },
  {
    id: "fireworks", name: "Fireworks AI", description: "Fast open-source inference",
    envKey: "FIREWORKS_API_KEY", configured: false, active: true,
    features: ["Low latency", "Open models"], freeTier: "Free credits", priority: 9,
    website: "https://fireworks.ai", usedFor: "Low-latency inference", href: "/ai",
  },
  {
    id: "openrouter", name: "OpenRouter", description: "Multi-provider gateway",
    envKey: "OPENROUTER_API_KEY", configured: false, active: true,
    features: ["100+ models", "Fallback"], freeTier: "Free models", priority: 10,
    website: "https://openrouter.ai", usedFor: "Multi-provider fallback", href: "/ai",
  },
  {
    id: "huggingface", name: "Hugging Face", description: "Open-source model hub",
    envKey: "HUGGINGFACE_API_KEY", configured: false, active: true,
    features: ["100K+ models", "Community"], freeTier: "Free inference", priority: 11,
    website: "https://huggingface.co", usedFor: "Open-source model hub", href: "/ai",
  },
  {
    id: "hpc", name: "HPC AI", description: "High-performance computing AI",
    envKey: "HPC_API_KEY", configured: false, active: true,
    features: ["Enterprise", "High throughput"], freeTier: "Pay per use", priority: 12,
    website: "#", usedFor: "Enterprise-grade AI", href: "/ai",
  },
];

interface PlatformConnector {
  id: string;
  name: string;
  description: string;
  envKey: string;
  configured: boolean;
  icon: typeof Brain;
  apiEndpoint: string;
  features: string[];
  href: string;
  hrefLabel: string;
}

const platformConnectors: PlatformConnector[] = [
  {
    id: "aliexpress", name: "AliExpress", description: "Direct product search via Rainforest API or Scraper",
    envKey: "RAINFOREST_API_KEY", configured: false, icon: Store,
    apiEndpoint: "/api/platforms/aliexpress",
    features: ["Product search", "Price comparison", "Supplier info"],
    href: "/products", hrefLabel: "Search Products",
  },
  {
    id: "cj", name: "CJ Dropshipping", description: "Official CJ Dropshipping API integration",
    envKey: "CJ_API_KEY", configured: false, icon: Package,
    apiEndpoint: "/api/platforms/cj",
    features: ["Product catalog", "Order management", "Category browsing"],
    href: "/suppliers", hrefLabel: "Find Suppliers",
  },
  {
    id: "rainforest", name: "Rainforest API (Amazon)", description: "Amazon product data via Rainforest API",
    envKey: "RAINFOREST_API_KEY", configured: false, icon: ShoppingCart,
    apiEndpoint: "/api/platforms/rainforest",
    features: ["Amazon search", "Product details", "Price tracking"],
    href: "/products", hrefLabel: "Search Amazon",
  },
];

export default function AISettingsPage() {
  const [providers, setProviders] = useState<AIProvider[]>(allProviders);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"providers" | "features" | "platforms">("providers");

  useEffect(() => {
    fetch("/api/ai")
      .then((res) => res.json())
      .then((data) => {
        if (data.providers) {
          setProviders((prev) =>
            prev.map((p) => ({
              ...p,
              configured: data.providers[p.id]?.configured ?? false,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  const handleToggleActive = (id: string) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p))
    );
  };

  const handlePriorityChange = (id: string, newPriority: number) => {
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, priority: newPriority } : p))
    );
  };

  const configuredCount = providers.filter((p) => p.configured).length;

  const aiFeatures = [
    {
      name: "Price Optimization", description: "AI-powered pricing recommendations based on market data",
      icon: DollarSign, color: "text-emerald-400", bgColor: "bg-emerald-400/10", href: "/calculator", hrefLabel: "Open Calculator",
    },
    {
      name: "Product Analysis", description: "Deep analysis of product potential and competition",
      icon: Search, color: "text-blue-400", bgColor: "bg-blue-400/10", href: "/products", hrefLabel: "Search Products",
    },
    {
      name: "Market Trends", description: "Trend detection and forecasting for niches",
      icon: TrendingUp, color: "text-purple-400", bgColor: "bg-purple-400/10", href: "/competitors", hrefLabel: "Analyze Market",
    },
    {
      name: "Listing Optimization", description: "SEO-optimized titles, descriptions, and tags",
      icon: Sparkles, color: "text-amber-400", bgColor: "bg-amber-400/10", href: "/products", hrefLabel: "Optimize Listings",
    },
    {
      name: "Supplier Verification", description: "AI-powered supplier risk assessment",
      icon: Shield, color: "text-emerald-400", bgColor: "bg-emerald-400/10", href: "/suppliers", hrefLabel: "Verify Suppliers",
    },
    {
      name: "Competitor Intelligence", description: "Automated competitor analysis and insights",
      icon: BarChart3, color: "text-pink-400", bgColor: "bg-pink-400/10", href: "/competitors", hrefLabel: "Spy Competitors",
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-accent">
            <Brain className="w-6 h-6 text-white" />
          </div>
          Settings
        </h1>
        <p className="text-muted-foreground">
          Configure your AI providers, platform integrations, and account settings.
        </p>
      </div>

      {/* Quick Links */}
      <div className="flex flex-wrap gap-2">
        {[
          { href: "/ai", label: "Try AI Assistant", icon: Brain, color: "text-accent" },
          { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, color: "text-muted-foreground" },
          { href: "/products", label: "Products", icon: Search, color: "text-blue-400" },
          { href: "/suppliers", label: "Suppliers", icon: Package, color: "text-emerald-400" },
          { href: "/calculator", label: "Calculator", icon: DollarSign, color: "text-amber-400" },
          { href: "/competitors", label: "Competitors", icon: BarChart3, color: "text-purple-400" },
        ].map((link) => (
          <Link key={link.href} href={link.href}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-muted-foreground hover:text-foreground hover:border-accent/20 transition-all">
            <link.icon className={`h-3 w-3 ${link.color}`} /> {link.label}
          </Link>
        ))}
      </div>

      {/* Status Bar */}
      <div className="glass rounded-2xl p-4 border border-border">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            {configuredCount > 0 ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            )}
            <span className="text-sm text-foreground">
              <span className="font-bold">{configuredCount}</span> of <span className="font-bold">{providers.length}</span> providers configured
            </span>
          </div>
          <Link href="/ai"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-xs font-medium text-accent hover:bg-accent/20 transition-all">
            Test in AI Assistant <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2 overflow-x-auto">
        {[
          { id: "providers" as const, label: "API Providers", icon: Key },
          { id: "features" as const, label: "AI Features", icon: Zap },
          { id: "platforms" as const, label: "Platforms", icon: Globe },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${activeTab === tab.id ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground hover:bg-surface"}`}>
            <tab.icon className="h-4 w-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Providers Tab */}
      {activeTab === "providers" && (
        <div className="space-y-4 animate-slide-up">
          {[...providers]
            .sort((a, b) => a.priority - b.priority)
            .map((provider) => (
              <div key={provider.id} className="glass rounded-2xl p-6 border border-border space-y-4 group hover:border-accent/10 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display font-semibold text-foreground">{provider.name}</h3>
                      {provider.configured ? (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Configured
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-amber-400/10 text-amber-400 border border-amber-400/20">
                          Not configured
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">Priority: {provider.priority}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{provider.description}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                      Used for: <span className="text-foreground/70">{provider.usedFor}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a href={provider.website} target="_blank" rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl text-xs font-medium bg-surface border border-border text-muted-foreground hover:text-foreground hover:border-accent/20 transition-colors flex items-center gap-1.5">
                      Get API Key <ExternalLink className="h-3 w-3" />
                    </a>
                    <button onClick={() => handleToggleActive(provider.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${provider.active ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20" : "bg-surface text-muted-foreground border border-border"}`}>
                      {provider.active ? "Active" : "Disabled"}
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {provider.features.map((feature) => (
                    <span key={feature} className="px-2 py-1 rounded-lg text-xs bg-surface text-muted-foreground border border-border">{feature}</span>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-border/50">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Key className="w-3 h-3" />
                    <span className="font-mono text-[11px]">{provider.envKey}</span>
                    <button onClick={() => setShowKeys((prev) => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                      className="text-muted-foreground hover:text-foreground transition-colors">
                      {showKeys[provider.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs text-muted-foreground">Free tier: <span className="text-foreground">{provider.freeTier}</span></span>
                    <select value={provider.priority}
                      onChange={(e) => handlePriorityChange(provider.id, Number(e.target.value))}
                      className="px-2 py-1 rounded-lg text-xs bg-surface border border-border text-foreground">
                      {Array.from({ length: providers.length }, (_, i) => i + 1).map((num) => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                    <Link href={provider.href}
                      className="flex items-center gap-1 text-[10px] text-accent hover:text-accent/80 transition-colors">
                      Use it <ArrowUpRight className="h-2.5 w-2.5" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Features Tab */}
      {activeTab === "features" && (
        <div className="space-y-4 animate-slide-up">
          <div className="glass rounded-2xl p-5 border border-accent/10">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">AI-Powered Features</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Each feature below uses AI providers from the API Providers tab. Configure at least one provider to unlock these features. Click any feature to go to the page where it&apos;s used.
                </p>
              </div>
            </div>
          </div>

          {aiFeatures.map((feature) => (
            <Link key={feature.name} href={feature.href}
              className="glass rounded-2xl p-6 border border-border hover:border-accent/20 transition-all group block">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${feature.bgColor} shrink-0`}>
                  <feature.icon className={`w-5 h-5 ${feature.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-semibold text-foreground group-hover:text-accent transition-colors">{feature.name}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-accent opacity-0 group-hover:opacity-100 transition-opacity">{feature.hrefLabel}</span>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors" />
                </div>
              </div>
            </Link>
          ))}

          <div className="glass rounded-2xl p-5 border border-purple-400/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-400/10">
                  <Brain className="h-4 w-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Want AI-powered insights?</p>
                  <p className="text-xs text-muted-foreground">Chat with the AI Assistant for personalized recommendations.</p>
                </div>
              </div>
              <Link href="/ai"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-400/10 border border-purple-400/20 text-xs font-medium text-purple-400 hover:bg-purple-400/20 transition-all shrink-0">
                Try AI <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Platforms Tab */}
      {activeTab === "platforms" && (
        <div className="space-y-4 animate-slide-up">
          <div className="glass rounded-2xl p-5 border border-accent/10">
            <div className="flex items-start gap-3">
              <Globe className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">Platform Integrations</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  These connectors power the product search and supplier intelligence features. Advanced configuration — API keys are set in environment variables.
                </p>
              </div>
            </div>
          </div>

          {platformConnectors.map((platform) => (
            <div key={platform.id} className="glass rounded-2xl p-6 border border-border space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-accent/10 border border-accent/20">
                      <platform.icon className="w-5 h-5 text-accent" />
                    </div>
                    <h3 className="font-display font-semibold text-foreground">{platform.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${
                      platform.configured
                        ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"
                        : "bg-amber-400/10 text-amber-400 border border-amber-400/20"
                    }`}>
                      {platform.configured
                        ? <><CheckCircle2 className="h-3 w-3" /> Connected</>
                        : <><AlertTriangle className="h-3 w-3" /> Not Configured</>
                      }
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{platform.description}</p>
                </div>
                <Link href={platform.href}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent/10 border border-accent/20 text-xs font-medium text-accent hover:bg-accent/20 transition-all shrink-0">
                  {platform.hrefLabel} <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              <div className="flex flex-wrap gap-2">
                {platform.features.map((feature) => (
                  <span key={feature} className="px-2 py-1 rounded-lg text-xs bg-surface text-muted-foreground border border-border">{feature}</span>
                ))}
              </div>
            </div>
          ))}

          <Link href="/store"
            className="glass rounded-2xl p-5 border border-border hover:border-accent/20 transition-all group block">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-accent/10 border border-accent/20">
                  <Store className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors">Need to connect your store?</p>
                  <p className="text-xs text-muted-foreground">Link Shopify, WooCommerce, or custom stores in My Store.</p>
                </div>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors shrink-0" />
            </div>
          </Link>
        </div>
      )}

      {/* How It Works */}
      <div className="glass rounded-2xl p-6 border border-border space-y-4">
        <h2 className="font-display font-semibold text-foreground">How It Works</h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <Zap className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
            <span>
              <strong className="text-foreground">Fallback Chain:</strong> If provider #1 fails, automatically try #2, then #3, and so on.{" "}
              <Link href="/ai" className="text-accent hover:text-accent/80 inline-flex items-center gap-1">
                Test it <ArrowUpRight className="h-3 w-3" />
              </Link>
            </span>
          </div>
          <div className="flex items-start gap-3">
            <Globe className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
            <span>
              <strong className="text-foreground">Free Tiers:</strong> Start with free tiers, upgrade to paid only when needed. Groq offers 14,400 requests/day for free.
            </span>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
            <span>
              <strong className="text-foreground">Security:</strong> API keys are stored server-side only in <code className="px-1 py-0.5 rounded bg-surface text-[11px] text-foreground font-mono">.env.local</code>, never exposed to the client.
            </span>
          </div>
        </div>
      </div>

      {/* Quick Start Guide */}
      <div className="glass rounded-2xl p-6 border border-border">
        <h2 className="font-display font-semibold text-foreground mb-4">Quick Start</h2>
        <div className="space-y-3">
          {[
            { step: 1, text: "Get a free API key from Groq (fastest setup)", href: "https://groq.com", external: true },
            { step: 2, text: 'Add GROQ_API_KEY=your_key to .env.local', href: null, external: false },
            { step: 3, text: "Test it in the AI Assistant", href: "/ai", external: false },
            { step: 4, text: "Search for products with AI-powered insights", href: "/products", external: false },
          ].map((item) => (
            <div key={item.step} className="flex items-center gap-3 p-3 rounded-xl bg-surface/50">
              <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center text-xs font-bold text-accent shrink-0">
                {item.step}
              </div>
              <span className="text-sm text-foreground flex-1">{item.text}</span>
              {item.href && (
                item.external ? (
                  <a href={item.href} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] text-accent hover:text-accent/80 transition-colors shrink-0">
                    Open <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                ) : (
                  <Link href={item.href}
                    className="flex items-center gap-1 text-[10px] text-accent hover:text-accent/80 transition-colors shrink-0">
                    Go <ArrowUpRight className="h-2.5 w-2.5" />
                  </Link>
                )
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
