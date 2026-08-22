export interface TickerItem {
  name: string;
  platform: string;
  price: number;
  change: number;
  sparkline: number[];
}

export interface AIRadarScores {
  margin: number;
  demand: number;
  competition: number;
  trend: number;
  supplier: number;
}

export interface AIDailyPick {
  title: string;
  category: string;
  image: string;
  description: string;
  radarScores: AIRadarScores;
  sourcePrice: number;
  sellPrice: number;
  margin: number;
  risk: "low" | "medium" | "high";
  reason: string;
  platform: string;
  ordersPerMonth: number;
  saturation: number;
  overallScore: number;
  earningsPreview: { profitPerOrder: number; ordersPerMonth: number; monthlyRevenue: number };
  reasonPoints: string[];
  expiresAt: string;
  yesterdayPick?: { title: string; result: string; up: boolean };
}

export interface RevenuePoint {
  date: string;
  value: number;
}

export interface RevenueStat {
  label: string;
  value: number;
  change: string;
  up: boolean;
  icon: string;
  color: string;
  prefix?: string;
  sparkline: number[];
}

export interface SmartAlert {
  id: string;
  type: "opportunity" | "risk" | "info" | "warning";
  title: string;
  description: string;
  action: string;
  actionHref: string;
  timestamp: string;
  read: boolean;
  confidence: number;
  aiAnalysis: string;
  sparkline: number[];
}

export interface AIBriefing {
  insights: string[];
  sentiment: number;
  sentimentLabel: string;
  opportunities: number;
  risks: number;
  trends: number;
  lastScan: string;
}

export interface MarketPulseCard {
  label: string;
  value: string;
  change: string;
  up: boolean;
  sparkline: number[];
  icon: string;
  color: string;
}

export interface QuickActionStat {
  label: string;
  description: string;
  href: string;
  color: string;
  stat: string;
  statLabel: string;
}

export interface NicheRadarScores {
  demand: number;
  profit: number;
  competition: number;
  trend: number;
  seasonality: number;
}

export interface NicheCard {
  name: string;
  category: string;
  scores: NicheRadarScores;
  overallScore: number;
  grade: "A+" | "A" | "B+" | "B" | "C+" | "C";
  productCount: number;
  avgMargin: number;
  growth: number;
  aiInsight: string;
  demandSparkline: number[];
  topProduct: string;
}

export interface SupplierStatus {
  name: string;
  trustBadge: "gold" | "silver" | "bronze";
  responseTime: string;
  responseLevel: "fast" | "moderate" | "slow";
  completionRate: number;
  status: "online" | "busy" | "offline";
  rating: number;
  location: string;
}

export interface MissionBadge {
  name: string;
  icon: string;
  earned: boolean;
}

export interface DailyMission {
  challenge: string;
  xpReward: number;
  streak: number;
  badges: MissionBadge[];
  level: number;
  currentXP: number;
  nextLevelXP: number;
}

export interface HeatmapCategory {
  category: string;
  heat: number;
  productCount: number;
  avgMargin: number;
  trend: "up" | "down" | "stable";
  weeklyData: number[];
  topProduct: string;
  topProductMargin: number;
  aiInsight: string;
  velocity: number;
}

export const tickerItems: TickerItem[] = [
  { name: "Wireless Earbuds Pro", platform: "AliExpress", price: 8.50, change: -3.2, sparkline: [40, 42, 38, 35, 33, 36, 34] },
  { name: "Smart LED Strip 10M", platform: "Amazon", price: 19.99, change: 5.1, sparkline: [30, 32, 35, 38, 40, 42, 44] },
  { name: "Pet GPS Tracker", platform: "CJ", price: 14.80, change: 12.4, sparkline: [20, 25, 28, 32, 38, 42, 48] },
  { name: "Posture Corrector V3", platform: "AliExpress", price: 4.20, change: -1.8, sparkline: [50, 48, 46, 45, 44, 43, 42] },
  { name: "Portable Espresso Mini", platform: "Amazon", price: 29.99, change: 8.7, sparkline: [25, 28, 30, 34, 36, 40, 42] },
  { name: "Magnetic Phone Mount", platform: "eBay", price: 9.99, change: 2.3, sparkline: [45, 44, 46, 47, 48, 49, 50] },
  { name: "Yoga Mat Premium 6mm", platform: "Walmart", price: 19.99, change: -5.4, sparkline: [55, 52, 50, 48, 46, 44, 42] },
  { name: "RFID Minimalist Wallet", platform: "AliExpress", price: 3.50, change: 1.2, sparkline: [38, 39, 40, 40, 41, 42, 42] },
  { name: "Mini Ring Light 10\"", platform: "CJ", price: 5.80, change: 15.6, sparkline: [15, 20, 25, 30, 35, 40, 48] },
  { name: "Silicone Kitchen Set", platform: "Amazon", price: 12.99, change: -2.1, sparkline: [44, 43, 42, 41, 40, 40, 39] },
  { name: "Car Dash Cam 4K", platform: "AliExpress", price: 22.50, change: 6.8, sparkline: [28, 30, 33, 36, 38, 40, 43] },
  { name: "Bamboo Desk Organizer", platform: "Etsy", price: 8.90, change: 3.4, sparkline: [35, 36, 37, 38, 39, 40, 41] },
];

export const aiDailyPick: AIDailyPick = {
  title: "Pet GPS Tracker Smart Collar",
  category: "Pet Supplies",
  image: "https://placehold.co/600x600/0f0f17/06b6d4?text=GPS+Collar",
  description: "Real-time tracking, geofencing alerts, activity monitoring. Waterproof IP67, 7-day battery. Works with iOS and Android app.",
  radarScores: { margin: 85, demand: 78, competition: 92, trend: 88, supplier: 75 },
  sourcePrice: 15.99,
  sellPrice: 39.99,
  margin: 58,
  risk: "medium",
  reason: "Pet tech is a $8B market growing 22% YoY. This product has strong margins ($24/unit), low competition on Amazon for GPS collars specifically, and rising search volume (+41% month-over-month). CJ Dropshipping has verified suppliers with 4.8 rating.",
  platform: "Amazon",
  ordersPerMonth: 2400,
  saturation: 34,
  overallScore: 87,
  earningsPreview: { profitPerOrder: 24.00, ordersPerMonth: 100, monthlyRevenue: 2400 },
  reasonPoints: [
    "Pet tech market worth $8B, growing 22% YoY — strong niche tailwind",
    "Search volume up 41% MoM with only 34% market saturation",
    "Verified CJ supplier (4.8 rating) with 2-day shipping to US",
  ],
  expiresAt: "2026-08-22T16:00:00",
  yesterdayPick: { title: "Portable Espresso Maker", result: "+$1,840 revenue", up: true },
};

function generateRevenueData(): { actual: RevenuePoint[]; predicted: RevenuePoint[] } {
  const actual: RevenuePoint[] = [];
  const predicted: RevenuePoint[] = [];
  const baseValue = 120;
  const now = new Date("2026-08-22");
  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dayStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const noise = Math.sin(i * 0.3) * 15 + Math.sin(i * 1.7) * 5;
    const trend = (30 - i) * 2.5;
    actual.push({ date: dayStr, value: Math.round(baseValue + trend + noise) });
  }
  for (let i = 1; i <= 14; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    const dayStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const predictedVal = 120 + 30 * 2.5 + i * 3 + Math.sin(i * 0.4) * 10;
    predicted.push({ date: dayStr, value: Math.round(predictedVal) });
  }
  return { actual, predicted };
}

const { actual: revenueActual, predicted: revenuePredicted } = generateRevenueData();

export const revenueData = {
  actual: revenueActual,
  predicted: revenuePredicted,
  stats: [
    { label: "Revenue This Month", value: 4250, change: "+18%", up: true, icon: "dollar", color: "text-emerald-400", prefix: "$", sparkline: [3200, 3400, 3600, 3800, 3900, 4100, 4250] },
    { label: "Products Analyzed", value: 847, change: "+12%", up: true, icon: "package", color: "text-blue-400", sparkline: [650, 700, 720, 760, 790, 820, 847] },
    { label: "Active Orders", value: 23, change: "+24%", up: true, icon: "cart", color: "text-amber-400", sparkline: [12, 14, 16, 18, 19, 21, 23] },
    { label: "Est. Profit", value: 2847, change: "+8%", up: true, icon: "trending", color: "text-purple-400", prefix: "$", sparkline: [2400, 2500, 2550, 2600, 2700, 2780, 2847] },
  ] as RevenueStat[],
};

export const smartAlerts: SmartAlert[] = [
  {
    id: "a1", type: "opportunity",
    title: "Price Drop Detected — Posture Corrector",
    description: "AliExpress price dropped from $5.80 to $4.20 (27% off). Historical low. Good time to stock up.",
    action: "View Deal", actionHref: "/products/p3", timestamp: "12m ago", read: false,
    confidence: 94,
    aiAnalysis: "This is the lowest price in 6 months. Historical data shows prices rebound within 2-3 weeks. With your current sell price of $24.99, margin jumps from 77% to 83%. Recommend stocking 50+ units.",
    sparkline: [5.80, 5.60, 5.20, 4.80, 4.50, 4.30, 4.20],
  },
  {
    id: "a2", type: "risk",
    title: "Supplier Response Time Increased",
    description: "CJ Direct response time increased to 8+ hours (was 4h). Consider backup suppliers for urgent orders.",
    action: "Check Suppliers", actionHref: "/suppliers", timestamp: "1h ago", read: false,
    confidence: 87,
    aiAnalysis: "CJ Direct has had 3 slow days this week. Their completion rate dropped from 99.2% to 96.8%. TechSource Global (gold tier, <2h response) is a strong backup. Switching risk: low.",
    sparkline: [4, 4, 5, 6, 7, 8, 8],
  },
  {
    id: "a3", type: "info",
    title: "Seasonal Trend Starting — Fitness Products",
    description: "Search volume for yoga mats and resistance bands up 34% this week. January fitness rush is beginning.",
    action: "Explore Niche", actionHref: "/products/niches", timestamp: "3h ago", read: true,
    confidence: 91,
    aiAnalysis: "Fitness niche historically peaks Jan-Feb. Early movers capture 40% more sales. Top products: resistance bands ($3.20 source, $18.99 sell, 83% margin), yoga mats ($5.50, $24.99, 78%).",
    sparkline: [45, 50, 55, 60, 68, 75, 79],
  },
  {
    id: "a4", type: "warning",
    title: "Competitor Price War — LED Strips",
    description: "3 new Amazon sellers listed Smart LED Strips at $14.99 (below your $19.99). Monitor closely.",
    action: "Analyze", actionHref: "/competitors", timestamp: "5h ago", read: true,
    confidence: 82,
    aiAnalysis: "New sellers are likely undercutting to gain reviews. Your product has 4.7 stars vs their 3.9. Strategy: maintain price, emphasize quality in listing. Expected stabilization in 2-3 weeks.",
    sparkline: [19.99, 19.99, 18.50, 17.00, 16.00, 15.50, 14.99],
  },
  {
    id: "a5", type: "opportunity",
    title: "High-Margin Product Found — Ring Light",
    description: "AI found Mini Ring Light with 74% margin potential. Low competition, rising TikTok trend.",
    action: "View Product", actionHref: "/products", timestamp: "8h ago", read: true,
    confidence: 89,
    aiAnalysis: "Ring light searches up 67% MoM on TikTok. Only 12 Amazon sellers with <200 reviews. Source: $5.80 (CJ), Sell: $22.99. Projected monthly revenue: $3,200 with 100 orders.",
    sparkline: [20, 28, 35, 42, 50, 58, 67],
  },
];

export const aiBriefing: AIBriefing = {
  insights: [
    "Pet GPS Collar trending +41% this week — strong buy signal with 58% margin",
    "3 new competitor price drops detected — monitor LED Strips and Posture Corrector",
    "Fitness niche heating up early — January rush started 2 weeks ahead of schedule",
    "CJ Direct slowing down — consider TechSource Global as backup supplier",
  ],
  sentiment: 72,
  sentimentLabel: "Bullish",
  opportunities: 5,
  risks: 2,
  trends: 3,
  lastScan: "12 min ago",
};

export const marketPulseCards: MarketPulseCard[] = [
  { label: "Trending Products", value: "24", change: "+6 this week", up: true, sparkline: [14, 16, 17, 19, 20, 22, 24], icon: "flame", color: "text-orange-400" },
  { label: "Supplier Activity", value: "4/5", change: "online now", up: true, sparkline: [3, 4, 4, 5, 4, 4, 4], icon: "truck", color: "text-emerald-400" },
  { label: "Price Changes", value: "12", change: "8 down, 4 up", up: false, sparkline: [5, 7, 8, 9, 10, 11, 12], icon: "trending", color: "text-amber-400" },
  { label: "Niche Momentum", value: "Pet Tech", change: "+22% demand", up: true, sparkline: [70, 73, 76, 80, 83, 86, 90], icon: "target", color: "text-purple-400" },
];

export const quickActionStats: QuickActionStat[] = [
  { label: "Search Products", description: "Find winning products across 10+ platforms", href: "/products", color: "blue", stat: "847", statLabel: "searched this week" },
  { label: "Find Suppliers", description: "Discover reliable suppliers with AI scoring", href: "/suppliers", color: "emerald", stat: "4/5", statLabel: "suppliers online" },
  { label: "Calculate Profit", description: "Real-time margins, shipping, and ROI", href: "/calculator", color: "amber", stat: "23", statLabel: "calcs today" },
  { label: "AI Assistant", description: "Get recommendations and optimization tips", href: "/ai", color: "purple", stat: "5", statLabel: "new suggestions" },
];

export const nicheCards: NicheCard[] = [
  {
    name: "Pet Tech & Wearables", category: "Pets",
    scores: { demand: 85, profit: 78, competition: 72, trend: 90, seasonality: 80 },
    overallScore: 81, grade: "A",
    productCount: 342, avgMargin: 58, growth: 22,
    aiInsight: "Pet ownership booming + GPS trackers surging. Low competition for smart collars.",
    demandSparkline: [65, 70, 75, 82, 88, 90, 92],
    topProduct: "Pet GPS Tracker",
  },
  {
    name: "Home Office Ergonomics", category: "Office",
    scores: { demand: 75, profit: 82, competition: 68, trend: 70, seasonality: 85 },
    overallScore: 76, grade: "B+",
    productCount: 256, avgMargin: 62, growth: 15,
    aiInsight: "Remote work permanent. Standing desks and monitor arms trending up.",
    demandSparkline: [55, 60, 65, 68, 72, 75, 78],
    topProduct: "Monitor Arm Mount",
  },
  {
    name: "Smart Kitchen Gadgets", category: "Kitchen",
    scores: { demand: 80, profit: 70, competition: 55, trend: 75, seasonality: 90 },
    overallScore: 74, grade: "B+",
    productCount: 412, avgMargin: 45, growth: 18,
    aiInsight: "Viral TikTok kitchen hacks driving impulse buys. Air fryer accessories peak.",
    demandSparkline: [80, 82, 83, 84, 85, 85, 85],
    topProduct: "Silicone Air Fryer Mat",
  },
  {
    name: "Outdoor Adventure Gear", category: "Sports",
    scores: { demand: 70, profit: 85, competition: 60, trend: 82, seasonality: 65 },
    overallScore: 72, grade: "B",
    productCount: 189, avgMargin: 52, growth: 12,
    aiInsight: "Camping season starting early. Portable espresso and hammocks rising.",
    demandSparkline: [45, 50, 55, 60, 64, 68, 70],
    topProduct: "Portable Espresso Mini",
  },
  {
    name: "Car Accessories Tech", category: "Automotive",
    scores: { demand: 82, profit: 65, competition: 45, trend: 68, seasonality: 75 },
    overallScore: 67, grade: "B",
    productCount: 298, avgMargin: 48, growth: 8,
    aiInsight: "Dash cams and magnetic mounts steady sellers. Low saturation, consistent demand.",
    demandSparkline: [60, 62, 63, 64, 65, 65, 65],
    topProduct: "Car Dash Cam 4K",
  },
];

export const supplierStatuses: SupplierStatus[] = [
  { name: "TechSource Global", trustBadge: "gold", responseTime: "< 2h", responseLevel: "fast", completionRate: 98.5, status: "online", rating: 4.8, location: "Shenzhen" },
  { name: "PrimeDrop Fulfillment", trustBadge: "gold", responseTime: "< 1h", responseLevel: "fast", completionRate: 99.2, status: "online", rating: 4.9, location: "Los Angeles" },
  { name: "EuropaSupply", trustBadge: "silver", responseTime: "< 6h", responseLevel: "moderate", completionRate: 97.1, status: "busy", rating: 4.6, location: "Berlin" },
  { name: "CJ Direct", trustBadge: "silver", responseTime: "< 8h", responseLevel: "slow", completionRate: 96.8, status: "busy", rating: 4.5, location: "Yiwu" },
  { name: "NordicTrade Co", trustBadge: "gold", responseTime: "< 3h", responseLevel: "fast", completionRate: 98.9, status: "online", rating: 4.7, location: "Stockholm" },
];

export const dailyMission: DailyMission = {
  challenge: "Find a product with 70%+ profit margin from a gold-tier supplier",
  xpReward: 75,
  streak: 12,
  badges: [
    { name: "First Search", icon: "search", earned: true },
    { name: "Profit Master", icon: "dollar", earned: true },
    { name: "Trend Spotter", icon: "trending", earned: true },
    { name: "Supply Chain Pro", icon: "truck", earned: false },
    { name: "10-Day Streak", icon: "flame", earned: false },
  ],
  level: 14,
  currentXP: 3420,
  nextLevelXP: 4000,
};

export const heatmapCategories: HeatmapCategory[] = [
  { category: "Pet Supplies", heat: 92, productCount: 342, avgMargin: 58, trend: "up", weeklyData: [65, 70, 75, 82, 88, 90, 92], topProduct: "Pet GPS Tracker", topProductMargin: 58, aiInsight: "Pet ownership surge + TikTok viral pet tech", velocity: 5 },
  { category: "Home Office", heat: 78, productCount: 256, avgMargin: 62, trend: "up", weeklyData: [55, 60, 65, 68, 72, 75, 78], topProduct: "Monitor Arm Mount", topProductMargin: 65, aiInsight: "Remote work permanent — ergonomic demand steady", velocity: 3 },
  { category: "Kitchen Gadgets", heat: 85, productCount: 412, avgMargin: 45, trend: "stable", weeklyData: [80, 82, 83, 84, 85, 85, 85], topProduct: "Air Fryer Accessories", topProductMargin: 52, aiInsight: "Viral kitchen hacks driving impulse purchases", velocity: 1 },
  { category: "Fitness & Yoga", heat: 70, productCount: 189, avgMargin: 52, trend: "up", weeklyData: [45, 50, 55, 60, 64, 68, 70], topProduct: "Resistance Bands Set", topProductMargin: 68, aiInsight: "January fitness rush starting 2 weeks early", velocity: 4 },
  { category: "Car Accessories", heat: 65, productCount: 298, avgMargin: 48, trend: "stable", weeklyData: [60, 62, 63, 64, 65, 65, 65], topProduct: "Car Dash Cam 4K", topProductMargin: 42, aiInsight: "Steady demand — dash cams consistent sellers", velocity: 0 },
  { category: "Electronics", heat: 45, productCount: 890, avgMargin: 32, trend: "down", weeklyData: [70, 65, 60, 55, 50, 47, 45], topProduct: "Wireless Earbuds", topProductMargin: 28, aiInsight: "Saturated market — price wars eroding margins", velocity: -4 },
  { category: "Fashion", heat: 38, productCount: 1200, avgMargin: 28, trend: "down", weeklyData: [60, 55, 50, 45, 42, 40, 38], topProduct: "Minimalist Watch", topProductMargin: 35, aiInsight: "High competition + returns making this risky", velocity: -3 },
  { category: "Beauty & Health", heat: 72, productCount: 520, avgMargin: 55, trend: "up", weeklyData: [50, 55, 58, 62, 66, 70, 72], topProduct: "LED Face Mask", topProductMargin: 72, aiInsight: "Skincare routine trend + influencer push", velocity: 3 },
];

export const quickActions = [
  { label: "Search Products", description: "Find winning products across 10+ platforms", href: "/products", color: "blue" },
  { label: "Find Suppliers", description: "Discover reliable suppliers with AI scoring", href: "/suppliers", color: "emerald" },
  { label: "Calculate Profit", description: "Real-time margins, shipping, and ROI", href: "/calculator", color: "amber" },
  { label: "AI Assistant", description: "Get recommendations and optimization tips", href: "/ai", color: "purple" },
];

export interface TrendingProduct {
  name: string;
  platform: string;
  price: number;
  sellPrice: number;
  profit: number;
  margin: number;
  trend: number;
  sparkline: number[];
  confidence: number;
  whyTrending: string;
  demandLevel: "low" | "medium" | "high";
  competitionLevel: "low" | "medium" | "high";
  supplierReliability: number;
  monthlyVolume: number;
  shippingDays: string;
  sourceUrl: string;
  competitors: { name: string; price: number }[];
  listingSuggestion: { title: string; description: string };
}

export const trendingProducts: TrendingProduct[] = [
  {
    name: "Pet GPS Tracker Mini",
    platform: "AliExpress",
    price: 14.80,
    sellPrice: 34.99,
    profit: 20.19,
    margin: 58,
    trend: 41,
    sparkline: [20, 25, 30, 35, 38, 42, 48],
    confidence: 92,
    whyTrending: "Pet tech booming — GPS trackers up 120% YoY. Summer = peak lost-pet season.",
    demandLevel: "high",
    competitionLevel: "medium",
    supplierReliability: 96,
    monthlyVolume: 3200,
    shippingDays: "8-15",
    sourceUrl: "#",
    competitors: [
      { name: "Tractive GPS", price: 49.99 },
      { name: "Fi Series 3", price: 149.00 },
      { name: "Apple AirTag", price: 29.00 },
    ],
    listingSuggestion: {
      title: "Mini GPS Pet Tracker — Live Location, No Monthly Fee",
      description: "Track your pet in real-time. Lightweight, waterproof, 30-day battery. Works worldwide with free app.",
    },
  },
  {
    name: "Smart LED Strip 5m",
    platform: "CJ Dropshipping",
    price: 6.50,
    sellPrice: 19.99,
    profit: 13.49,
    margin: 74,
    trend: 32,
    sparkline: [30, 33, 36, 40, 44, 48, 52],
    confidence: 87,
    whyTrending: "Home décor + gaming setup trend. Music sync feature drives viral TikTok content.",
    demandLevel: "high",
    competitionLevel: "high",
    supplierReliability: 91,
    monthlyVolume: 5800,
    shippingDays: "7-12",
    sourceUrl: "#",
    competitors: [
      { name: "Govee 5m", price: 24.99 },
      { name: "Philips Hue Strip", price: 89.99 },
      { name: "LIFX Z Strip", price: 99.99 },
    ],
    listingSuggestion: {
      title: "Smart LED Strip 5m — App + Voice Control, Music Sync",
      description: "16M colors, works with Alexa & Google. Cut-to-size, adhesive backing. No hub required.",
    },
  },
  {
    name: "Posture Corrector V3",
    platform: "AliExpress",
    price: 4.20,
    sellPrice: 24.99,
    profit: 15.79,
    margin: 79,
    trend: 15,
    sparkline: [45, 46, 47, 48, 49, 50, 52],
    confidence: 78,
    whyTrending: "Remote work permanent. 'Desk job back pain' searches steady at 90K/mo.",
    demandLevel: "medium",
    competitionLevel: "medium",
    supplierReliability: 88,
    monthlyVolume: 2100,
    shippingDays: "10-18",
    sourceUrl: "#",
    competitors: [
      { name: "Comfy Brace", price: 19.99 },
      { name: "BackEmbrace", price: 68.00 },
      { name: "UPRIGHT GO 2", price: 99.95 },
    ],
    listingSuggestion: {
      title: "Posture Corrector — Invisible Under Clothes, Medical Grade",
      description: "Comfortable all-day wear. Adjustable straps. Recommended by chiropractors.",
    },
  },
  {
    name: "Portable Espresso Maker",
    platform: "Amazon",
    price: 12.50,
    sellPrice: 29.99,
    profit: 17.49,
    margin: 58,
    trend: 28,
    sparkline: [22, 26, 30, 34, 38, 42, 46],
    confidence: 85,
    whyTrending: "Travel season + 'camping coffee' searches +180%. Outdoor lifestyle niche exploding.",
    demandLevel: "high",
    competitionLevel: "low",
    supplierReliability: 93,
    monthlyVolume: 1800,
    shippingDays: "5-10",
    sourceUrl: "#",
    competitors: [
      { name: "WACACO Minipresso", price: 59.90 },
      { name: "Staresso Mini", price: 39.99 },
      { name: "Outin Nano", price: 79.99 },
    ],
    listingSuggestion: {
      title: "Portable Espresso Maker — Hand-Powered, No Electricity",
      description: "Barista-quality espresso anywhere. 15-20 bar pressure. Weighs only 350g.",
    },
  },
  {
    name: "Magnetic Phone Mount",
    platform: "AliExpress",
    price: 2.80,
    sellPrice: 14.99,
    profit: 12.19,
    margin: 81,
    trend: 18,
    sparkline: [40, 42, 43, 44, 45, 46, 48],
    confidence: 80,
    whyTrending: "Every car needs one. Repeat purchase + gift potential. Low return rate (3%).",
    demandLevel: "medium",
    competitionLevel: "high",
    supplierReliability: 94,
    monthlyVolume: 4500,
    shippingDays: "7-12",
    sourceUrl: "#",
    competitors: [
      { name: "iOttie Easy One Touch", price: 24.95 },
      { name: "ESR HaloLock", price: 35.99 },
      { name: "Belkin BoostCharge", price: 29.99 },
    ],
    listingSuggestion: {
      title: "Magnetic Car Phone Mount — 360° Rotate, One-Hand Use",
      description: "Super strong N52 magnets. Dashboard + vent clip. Ultra-slim design.",
    },
  },
];

export const gettingStartedTasks = [
  { done: true, text: "Create your account", href: "/settings" },
  { done: false, text: "Search for your first product", href: "/products" },
  { done: false, text: "Calculate profit margins", href: "/calculator" },
  { done: false, text: "Find reliable suppliers", href: "/suppliers" },
  { done: false, text: "Analyze your competitors", href: "/competitors" },
  { done: false, text: "Connect your online store", href: "/store" },
];
