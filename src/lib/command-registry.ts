import {
  Search, Truck, Calculator, Sparkles, TrendingUp,
  ShoppingCart, BarChart3, DollarSign, Package,
  Globe, Zap, Settings, LayoutGrid,
  Target, Heart, FileText, Users,
  Shield, Bell, Store, Layers,
} from "lucide-react";

export interface Command {
  id: string;
  label: string;
  description?: string;
  href?: string;
  icon: typeof Search;
  category: "pages" | "actions" | "products" | "settings";
  keywords?: string[];
}

export const commands: Command[] = [
  // Pages
  { id: "dashboard", label: "Dashboard", description: "Your command center", href: "/dashboard", icon: LayoutGrid, category: "pages" },
  { id: "search-products", label: "Search Products", description: "Find winning products across 15+ platforms", href: "/products", icon: Search, category: "pages", keywords: ["find", "discover"] },
  { id: "find-suppliers", label: "Find Suppliers", description: "Discover reliable suppliers worldwide", href: "/suppliers", icon: Truck, category: "pages", keywords: ["source", "vendor"] },
  { id: "calculator", label: "Profit Calculator", description: "Estimate margins and ROI instantly", href: "/calculator", icon: Calculator, category: "pages", keywords: ["margin", "profit", "cost"] },
  { id: "ai-assistant", label: "AI Assistant", description: "Get smart recommendations & insights", href: "/ai", icon: Sparkles, category: "pages", keywords: ["chat", "help", "recommend"] },
  { id: "trends", label: "Trend Predictor", description: "Spot emerging product trends early", href: "/trends", icon: TrendingUp, category: "pages", keywords: ["market", "hot", "rising"] },
  { id: "orders", label: "Bulk Orders", description: "Track orders and fulfillment status", href: "/bulk-orders", icon: ShoppingCart, category: "pages" },
  { id: "competitors", label: "Competitor Analysis", description: "Analyze your competition", href: "/competitors", icon: BarChart3, category: "pages", keywords: ["rival", "compare"] },
  { id: "revenue", label: "Revenue Tracker", description: "Track your revenue and profit", href: "/revenue", icon: DollarSign, category: "pages", keywords: ["money", "income"] },
  { id: "niches", label: "Niche Explorer", description: "Discover profitable niches", href: "/niches", icon: Globe, category: "pages", keywords: ["category", "market"] },
  { id: "saved", label: "Saved Products", description: "Your watchlist and favorites", href: "/saved", icon: Heart, category: "pages", keywords: ["watchlist", "bookmark"] },
  { id: "store", label: "My Store", description: "Manage your connected stores", href: "/store", icon: Store, category: "pages" },
  { id: "multi-store", label: "Multi-Store", description: "Manage multiple stores", href: "/multi-store", icon: Layers, category: "pages" },
  { id: "fulfillment", label: "Fulfillment", description: "Order fulfillment and tracking", href: "/fulfillment", icon: Package, category: "pages" },
  { id: "listings", label: "AI Listings", description: "Generate optimized product listings", href: "/listings", icon: FileText, category: "pages" },
  { id: "health", label: "Health Score", description: "Your business health metrics", href: "/health", icon: Shield, category: "pages" },
  { id: "missions", label: "Daily Missions", description: "Complete tasks, earn XP", href: "/missions", icon: Target, category: "pages" },
  { id: "reports", label: "Financial Reports", description: "Detailed financial analytics", href: "/reports", icon: BarChart3, category: "pages" },

  // Actions
  { id: "action-calc-profit", label: "Calculate Profit", description: "Quick profit calculation", href: "/calculator", icon: Calculator, category: "actions" },
  { id: "action-scan-product", label: "Scan Product URL", description: "Analyze any product URL", href: "/products", icon: Search, category: "actions" },
  { id: "action-generate-listing", label: "Generate Listing", description: "AI-powered product listing", href: "/listings", icon: Sparkles, category: "actions" },
  { id: "action-check-suppliers", label: "Compare Suppliers", description: "Compare supplier prices and ratings", href: "/suppliers", icon: Users, category: "actions" },
  { id: "action-price-war", label: "Price War Bot", description: "Automated price monitoring", href: "/price-war", icon: Zap, category: "actions" },
  { id: "action-bulk-process", label: "Bulk Process Orders", description: "Process multiple orders at once", href: "/bulk-orders", icon: Package, category: "actions" },

  // Settings
  { id: "settings", label: "Settings", description: "Account and app settings", href: "/settings", icon: Settings, category: "settings" },
  { id: "settings-notifications", label: "Notifications", description: "Manage notification preferences", href: "/settings", icon: Bell, category: "settings" },
  { id: "settings-theme", label: "Change Theme", description: "Switch dashboard theme", href: "/settings", icon: Sparkles, category: "settings" },
];

export function searchCommands(query: string): Command[] {
  if (!query.trim()) return commands;

  const lower = query.toLowerCase();
  return commands.filter((cmd) => {
    const labelMatch = cmd.label.toLowerCase().includes(lower);
    const descMatch = cmd.description?.toLowerCase().includes(lower);
    const keywordMatch = cmd.keywords?.some((kw) => kw.toLowerCase().includes(lower));
    return labelMatch || descMatch || keywordMatch;
  });
}
