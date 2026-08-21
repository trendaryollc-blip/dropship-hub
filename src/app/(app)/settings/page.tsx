"use client";

import { useState, useEffect } from "react";
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
}

const allProviders: AIProvider[] = [
  {
    id: "groq",
    name: "Groq",
    description: "Ultra-fast inference, free tier",
    envKey: "GROQ_API_KEY",
    configured: false,
    active: true,
    features: ["Quick analysis", "Price optimization"],
    freeTier: "14,400 req/day",
    priority: 1,
  },
  {
    id: "gemini",
    name: "Google Gemini",
    description: "Google's flagship AI, generous free tier",
    envKey: "GOOGLE_AI_API_KEY",
    configured: false,
    active: true,
    features: ["Product analysis", "Market trends"],
    freeTier: "1,500 req/day",
    priority: 2,
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT-4o-mini - powerful and affordable",
    envKey: "OPENAI_API_KEY",
    configured: false,
    active: true,
    features: ["Advanced reasoning", "Code generation"],
    freeTier: "Pay per use",
    priority: 3,
  },
  {
    id: "anthropic",
    name: "Anthropic (Claude)",
    description: "Claude - excellent at analysis",
    envKey: "ANTHROPIC_API_KEY",
    configured: false,
    active: true,
    features: ["Deep analysis", "Long context"],
    freeTier: "Pay per use",
    priority: 4,
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    description: "Strong reasoning, very cheap",
    envKey: "DEEPSEEK_API_KEY",
    configured: false,
    active: true,
    features: ["Code analysis", "Reasoning"],
    freeTier: "Pay per use",
    priority: 5,
  },
  {
    id: "mistral",
    name: "Mistral AI",
    description: "European open-source models",
    envKey: "MISTRAL_API_KEY",
    configured: false,
    active: true,
    features: ["Open source", "Fast inference"],
    freeTier: "1,000 req/month",
    priority: 6,
  },
  {
    id: "cohere",
    name: "Cohere",
    description: "Enterprise NLP, great for search",
    envKey: "COHERE_API_KEY",
    configured: false,
    active: true,
    features: ["NLP", "Search"],
    freeTier: "Pay per use",
    priority: 7,
  },
  {
    id: "together",
    name: "Together AI",
    description: "Open-source model hosting",
    envKey: "TOGETHER_API_KEY",
    configured: false,
    active: true,
    features: ["Open models", "Fine-tuning"],
    freeTier: "Free credits",
    priority: 8,
  },
  {
    id: "fireworks",
    name: "Fireworks AI",
    description: "Fast open-source inference",
    envKey: "FIREWORKS_API_KEY",
    configured: false,
    active: true,
    features: ["Low latency", "Open models"],
    freeTier: "Free credits",
    priority: 9,
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    description: "Multi-provider gateway",
    envKey: "OPENROUTER_API_KEY",
    configured: false,
    active: true,
    features: ["100+ models", "Fallback"],
    freeTier: "Free models",
    priority: 10,
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    description: "Open-source model hub",
    envKey: "HUGGINGFACE_API_KEY",
    configured: false,
    active: true,
    features: ["100K+ models", "Community"],
    freeTier: "Free inference",
    priority: 11,
  },
  {
    id: "hpc",
    name: "HPC AI",
    description: "High-performance computing AI",
    envKey: "HPC_API_KEY",
    configured: false,
    active: true,
    features: ["Enterprise", "High throughput"],
    freeTier: "Pay per use",
    priority: 12,
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
}

const platformConnectors: PlatformConnector[] = [
  {
    id: "aliexpress",
    name: "AliExpress",
    description: "Direct product search via Rainforest API or Scraper",
    envKey: "RAINFOREST_API_KEY",
    configured: false,
    icon: Store,
    apiEndpoint: "/api/platforms/aliexpress",
    features: ["Product search", "Price comparison", "Supplier info"],
  },
  {
    id: "cj",
    name: "CJ Dropshipping",
    description: "Official CJ Dropshipping API integration",
    envKey: "CJ_API_KEY",
    configured: false,
    icon: Package,
    apiEndpoint: "/api/platforms/cj",
    features: ["Product catalog", "Order management", "Category browsing"],
  },
  {
    id: "rainforest",
    name: "Rainforest API (Amazon)",
    description: "Amazon product data via Rainforest API",
    envKey: "RAINFOREST_API_KEY",
    configured: false,
    icon: ShoppingCart,
    apiEndpoint: "/api/platforms/rainforest",
    features: ["Amazon search", "Product details", "Price tracking"],
  },
];

export default function AISettingsPage() {
  const [providers, setProviders] = useState<AIProvider[]>(allProviders);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"providers" | "features" | "platforms">(
    "providers"
  );

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
      name: "Price Optimization",
      description: "AI-powered pricing recommendations based on market data",
      icon: Zap,
    },
    {
      name: "Product Analysis",
      description: "Deep analysis of product potential and competition",
      icon: Brain,
    },
    {
      name: "Market Trends",
      description: "Trend detection and forecasting for niches",
      icon: Globe,
    },
    {
      name: "Listing Optimization",
      description: "SEO-optimized titles, descriptions, and tags",
      icon: CheckCircle2,
    },
    {
      name: "Supplier Verification",
      description: "AI-powered supplier risk assessment",
      icon: Shield,
    },
    {
      name: "Competitor Intelligence",
      description: "Automated competitor analysis and insights",
      icon: AlertTriangle,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-accent">
          <Brain className="w-6 h-6 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            AI Settings
          </h1>
          <p className="text-muted-foreground">
            12 AI providers with automatic fallback chain.
          </p>
        </div>
      </div>

      <div className="glass rounded-2xl p-4 border border-border">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-sm text-foreground">
            {configuredCount} of {providers.length} providers configured
          </span>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("providers")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            activeTab === "providers"
              ? "bg-accent text-accent"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          API Providers
        </button>
        <button
          onClick={() => setActiveTab("features")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            activeTab === "features"
              ? "bg-accent text-accent"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          AI Features
        </button>
        <button
          onClick={() => setActiveTab("platforms")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            activeTab === "platforms"
              ? "bg-accent text-accent"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Platforms
        </button>
      </div>

      {activeTab === "providers" && (
        <div className="space-y-4">
          {providers
            .sort((a, b) => a.priority - b.priority)
            .map((provider) => (
              <div
                key={provider.id}
                className="glass rounded-2xl p-6 border border-border space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display font-semibold text-foreground">
                        {provider.name}
                      </h3>
                      {provider.configured ? (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                          Configured
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-amber-400/10 text-amber-400 border border-amber-400/20">
                          Not configured
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Priority: {provider.priority}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {provider.description}
                    </p>
                  </div>
                  <button
                    onClick={() => handleToggleActive(provider.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                      provider.active
                        ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"
                        : "bg-surface text-muted-foreground border border-border"
                    }`}
                  >
                    {provider.active ? "Active" : "Disabled"}
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {provider.features.map((feature) => (
                    <span
                      key={feature}
                      className="px-2 py-1 rounded-lg text-xs bg-surface text-muted-foreground border border-border"
                    >
                      {feature}
                    </span>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Key className="w-3 h-3" />
                    <span>{provider.envKey}</span>
                    <button
                      onClick={() =>
                        setShowKeys((prev) => ({
                          ...prev,
                          [provider.id]: !prev[provider.id],
                        }))
                      }
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {showKeys[provider.id] ? (
                        <EyeOff className="w-3 h-3" />
                      ) : (
                        <Eye className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      Free tier: {provider.freeTier}
                    </span>
                    <select
                      value={provider.priority}
                      onChange={(e) =>
                        handlePriorityChange(provider.id, Number(e.target.value))
                      }
                      className="px-2 py-1 rounded-lg text-xs bg-surface border border-border text-foreground"
                    >
                      {Array.from({ length: providers.length }, (_, i) => i + 1).map(
                        (num) => (
                          <option key={num} value={num}>
                            {num}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {activeTab === "features" && (
        <div className="space-y-4">
          {aiFeatures.map((feature) => (
            <div
              key={feature.name}
              className="glass rounded-2xl p-6 border border-border"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-accent">
                  <feature.icon className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground">
                    {feature.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "platforms" && (
        <div className="space-y-4">
          {platformConnectors.map((platform) => (
            <div
              key={platform.id}
              className="glass rounded-2xl p-6 border border-border space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-accent">
                      <platform.icon className="w-5 h-5 text-accent" />
                    </div>
                    <h3 className="font-display font-semibold text-foreground">
                      {platform.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                      Connected
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {platform.description}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {platform.features.map((feature) => (
                  <span
                    key={feature}
                    className="px-2 py-1 rounded-lg text-xs bg-surface text-muted-foreground border border-border"
                  >
                    {feature}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Key className="w-3 h-3" />
                <span>{platform.envKey}</span>
                <span className="text-emerald-400">•</span>
                <span>Endpoint: {platform.apiEndpoint}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="glass rounded-2xl p-6 border border-border space-y-4">
        <h2 className="font-display font-semibold text-foreground">
          How It Works
        </h2>
        <div className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <Zap className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
            <span>
              <strong className="text-foreground">Fallback Chain:</strong> If
              provider #1 fails, automatically try #2, then #3, and so on.
            </span>
          </div>
          <div className="flex items-start gap-3">
            <Globe className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
            <span>
              <strong className="text-foreground">Free Tiers:</strong> Start with
              free tiers, upgrade to paid only when needed.
            </span>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
            <span>
              <strong className="text-foreground">Security:</strong> API keys are
              stored server-side only, never exposed to the client.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
