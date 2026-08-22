export interface TrendingSearchProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  sellPrice: number;
  profit: number;
  margin: number;
  platform: string;
  trend: number;
  sparkline: number[];
  confidence: number;
  demandLevel: "low" | "medium" | "high";
  competitionLevel: "low" | "medium" | "high";
  image: string;
  tags: string[];
}

export interface ProductCategory {
  id: string;
  name: string;
  icon: string;
  image: string;
  color: string;
  gradient: string;
  productCount: number;
  avgMargin: number;
  trending: boolean;
}

export interface NicheQuickCard {
  name: string;
  icon: string;
  image: string;
  query: string;
  productCount: number;
  avgPrice: string;
  trend: "up" | "stable" | "down";
  trendPercent: number;
  color: string;
}

export const trendingSearchProducts: TrendingSearchProduct[] = [
  {
    id: "ts1", name: "Pet GPS Tracker Mini", category: "Pet Supplies",
    price: 14.80, sellPrice: 34.99, profit: 20.19, margin: 58, platform: "AliExpress",
    trend: 41, sparkline: [20, 25, 30, 35, 38, 42, 48], confidence: 92,
    demandLevel: "high", competitionLevel: "medium",
    image: "https://placehold.co/400x400/0f0f17/06b6d4?text=GPS+Tracker",
    tags: ["pet", "gps", "tracker", "smart"],
  },
  {
    id: "ts2", name: "Smart LED Strip 5m RGB", category: "Home & Kitchen",
    price: 6.50, sellPrice: 19.99, profit: 13.49, margin: 74, platform: "CJ Dropshipping",
    trend: 32, sparkline: [30, 33, 36, 40, 44, 48, 52], confidence: 87,
    demandLevel: "high", competitionLevel: "high",
    image: "https://placehold.co/400x400/0f0f17/a855f7?text=LED+Strip",
    tags: ["led", "smart-home", "rgb", "decor"],
  },
  {
    id: "ts3", name: "Portable Espresso Maker", category: "Kitchen",
    price: 12.50, sellPrice: 29.99, profit: 17.49, margin: 58, platform: "Amazon",
    trend: 28, sparkline: [22, 26, 30, 34, 38, 42, 46], confidence: 85,
    demandLevel: "high", competitionLevel: "low",
    image: "https://placehold.co/400x400/0f0f17/f97316?text=Espresso",
    tags: ["coffee", "espresso", "portable", "travel"],
  },
  {
    id: "ts4", name: "Posture Corrector V3", category: "Health & Wellness",
    price: 4.20, sellPrice: 24.99, profit: 15.79, margin: 79, platform: "AliExpress",
    trend: 15, sparkline: [45, 46, 47, 48, 49, 50, 52], confidence: 78,
    demandLevel: "medium", competitionLevel: "medium",
    image: "https://placehold.co/400x400/0f0f17/22c55e?text=Posture",
    tags: ["health", "posture", "wellness", "office"],
  },
  {
    id: "ts5", name: "Magnetic Phone Mount", category: "Automotive",
    price: 2.80, sellPrice: 14.99, profit: 12.19, margin: 81, platform: "AliExpress",
    trend: 18, sparkline: [40, 42, 43, 44, 45, 46, 48], confidence: 80,
    demandLevel: "medium", competitionLevel: "high",
    image: "https://placehold.co/400x400/0f0f17/eab308?text=Phone+Mount",
    tags: ["phone", "car", "mount", "magnetic"],
  },
  {
    id: "ts6", name: "Yoga Mat Premium 6mm", category: "Sports & Outdoors",
    price: 6.90, sellPrice: 22.99, profit: 16.09, margin: 70, platform: "AliExpress",
    trend: 22, sparkline: [35, 38, 40, 42, 44, 46, 49], confidence: 82,
    demandLevel: "high", competitionLevel: "medium",
    image: "https://placehold.co/400x400/0f0f17/ec4899?text=Yoga+Mat",
    tags: ["yoga", "fitness", "mat", "exercise"],
  },
];

export const productCategories: ProductCategory[] = [
  { id: "electronics", name: "Electronics", icon: "\ud83d\udcf1", image: "https://placehold.co/400x250/0f172a/3b82f6?text=Electronics", color: "text-blue-400", gradient: "from-blue-400/20 to-blue-500/5", productCount: 2840, avgMargin: 35, trending: true },
  { id: "home-kitchen", name: "Home & Kitchen", icon: "\ud83c\udfe0", image: "https://placehold.co/400x250/0f172a/10b981?text=Home+%26+Kitchen", color: "text-emerald-400", gradient: "from-emerald-400/20 to-emerald-500/5", productCount: 1920, avgMargin: 42, trending: true },
  { id: "fashion", name: "Fashion", icon: "\ud83d\udc57", image: "https://placehold.co/400x250/0f172a/a855f7?text=Fashion", color: "text-purple-400", gradient: "from-purple-400/20 to-purple-500/5", productCount: 3100, avgMargin: 28, trending: false },
  { id: "health", name: "Health & Wellness", icon: "\ud83d\udc8a", image: "https://placehold.co/400x250/0f172a/14b8a6?text=Health", color: "text-teal-400", gradient: "from-teal-400/20 to-emerald-500/5", productCount: 1450, avgMargin: 55, trending: true },
  { id: "pet", name: "Pet Supplies", icon: "\ud83d\udc15", image: "https://placehold.co/400x250/0f172a/f59e0b?text=Pets", color: "text-amber-400", gradient: "from-amber-400/20 to-orange-500/5", productCount: 890, avgMargin: 48, trending: true },
  { id: "automotive", name: "Automotive", icon: "\ud83d\ude97", image: "https://placehold.co/400x250/0f172a/ef4444?text=Automotive", color: "text-red-400", gradient: "from-red-400/20 to-rose-500/5", productCount: 1680, avgMargin: 38, trending: false },
  { id: "sports", name: "Sports & Outdoors", icon: "\u26bd", image: "https://placehold.co/400x250/0f172a/06b6d4?text=Sports", color: "text-cyan-400", gradient: "from-cyan-400/20 to-blue-500/5", productCount: 1240, avgMargin: 40, trending: false },
  { id: "beauty", name: "Beauty & Care", icon: "\ud83d\udc84", image: "https://placehold.co/400x250/0f172a/ec4899?text=Beauty", color: "text-pink-400", gradient: "from-pink-400/20 to-rose-500/5", productCount: 980, avgMargin: 62, trending: true },
];

export const nicheQuickCards: NicheQuickCard[] = [
  { name: "Smart Home Gadgets", icon: "\ud83c\udfe0", image: "https://placehold.co/400x250/0f172a/3b82f6?text=Smart+Home", query: "smart home gadgets", productCount: 420, avgPrice: "$15-$45", trend: "up", trendPercent: 24, color: "text-blue-400" },
  { name: "Fitness Trackers", icon: "\u231a", image: "https://placehold.co/400x250/0f172a/10b981?text=Fitness", query: "fitness tracker", productCount: 180, avgPrice: "$20-$60", trend: "up", trendPercent: 18, color: "text-emerald-400" },
  { name: "Pet Supplies", icon: "\ud83d\udc15", image: "https://placehold.co/400x250/0f172a/f59e0b?text=Pets", query: "pet supplies", productCount: 340, avgPrice: "$10-$35", trend: "up", trendPercent: 32, color: "text-amber-400" },
  { name: "Kitchen Tools", icon: "\ud83c\udf73", image: "https://placehold.co/400x250/0f172a/f97316?text=Kitchen", query: "kitchen gadgets", productCount: 560, avgPrice: "$8-$30", trend: "stable", trendPercent: 5, color: "text-orange-400" },
  { name: "Phone Accessories", icon: "\ud83d\udcf1", image: "https://placehold.co/400x250/0f172a/a855f7?text=Phone", query: "phone accessories", productCount: 890, avgPrice: "$5-$25", trend: "up", trendPercent: 12, color: "text-purple-400" },
  { name: "Beauty Products", icon: "\ud83d\udc84", image: "https://placehold.co/400x250/0f172a/ec4899?text=Beauty", query: "beauty products", productCount: 280, avgPrice: "$10-$40", trend: "up", trendPercent: 28, color: "text-pink-400" },
  { name: "Car Accessories", icon: "\ud83d\ude97", image: "https://placehold.co/400x250/0f172a/ef4444?text=Cars", query: "car accessories", productCount: 450, avgPrice: "$8-$35", trend: "stable", trendPercent: 8, color: "text-red-400" },
  { name: "Office Supplies", icon: "\ud83d\udcbc", image: "https://placehold.co/400x250/0f172a/06b6d4?text=Office", query: "office supplies", productCount: 320, avgPrice: "$5-$20", trend: "down", trendPercent: -3, color: "text-cyan-400" },
];
