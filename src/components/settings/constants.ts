import {
  Brain,
  Package,
  ShoppingCart,
  Store,
} from "lucide-react";

export interface AIProvider {
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

export const allProviders: AIProvider[] = [
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
    id: "deepseek", name: "DeepSeek", description: "Strong reasoning, very cheap",
    envKey: "DEEPSEEK_API_KEY", configured: false, active: true,
    features: ["Code analysis", "Reasoning"], freeTier: "Pay per use", priority: 4,
    website: "https://platform.deepseek.com", usedFor: "Budget-friendly analysis", href: "/ai",
  },
  {
    id: "mistral", name: "Mistral AI", description: "European open-source models",
    envKey: "MISTRAL_API_KEY", configured: false, active: true,
    features: ["Open source", "Fast inference"], freeTier: "1,000 req/month", priority: 5,
    website: "https://console.mistral.ai", usedFor: "Fast open-source inference", href: "/ai",
  },
  {
    id: "cohere", name: "Cohere", description: "Enterprise NLP, great for search",
    envKey: "COHERE_API_KEY", configured: false, active: true,
    features: ["NLP", "Search"], freeTier: "Pay per use", priority: 6,
    website: "https://dashboard.cohere.com", usedFor: "Product search & NLP", href: "/products",
  },
  {
    id: "together", name: "Together AI", description: "Open-source model hosting",
    envKey: "TOGETHER_API_KEY", configured: false, active: true,
    features: ["Open models", "Fine-tuning"], freeTier: "Free credits", priority: 7,
    website: "https://api.together.xyz", usedFor: "Open-source model hosting", href: "/ai",
  },
  {
    id: "fireworks", name: "Fireworks AI", description: "Fast open-source inference",
    envKey: "FIREWORKS_API_KEY", configured: false, active: true,
    features: ["Low latency", "Open models"], freeTier: "Free credits", priority: 8,
    website: "https://fireworks.ai", usedFor: "Low-latency inference", href: "/ai",
  },
  {
    id: "openrouter", name: "OpenRouter", description: "Multi-provider gateway",
    envKey: "OPENROUTER_API_KEY", configured: false, active: true,
    features: ["100+ models", "Fallback"], freeTier: "Free models", priority: 9,
    website: "https://openrouter.ai", usedFor: "Multi-provider fallback", href: "/ai",
  },
  {
    id: "huggingface", name: "Hugging Face", description: "Open-source model hub",
    envKey: "HUGGINGFACE_API_KEY", configured: false, active: true,
    features: ["100K+ models", "Community"], freeTier: "Free inference", priority: 10,
    website: "https://huggingface.co", usedFor: "Open-source model hub", href: "/ai",
  },
  {
    id: "hpc", name: "HPC AI", description: "High-performance computing AI",
    envKey: "HPC_API_KEY", configured: false, active: true,
    features: ["Enterprise", "High throughput"], freeTier: "Pay per use", priority: 11,
    website: "https://hpc-ai.com", usedFor: "Enterprise-grade AI", href: "/ai",
  },
];

export interface PlatformConnector {
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

export const platformConnectors: PlatformConnector[] = [
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
