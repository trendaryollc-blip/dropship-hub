export interface NicheData {
  id: string;
  name: string;
  icon: string;
  image: string;
  category: string;
  heat: number;
  productCount: number;
  avgMargin: number;
  growth: number;
  trend: "up" | "down" | "stable";
  trendDirection: "rising" | "stable" | "declining";
  weeklyData: number[];
  demandSparkline: number[];
  scores: { demand: number; profit: number; competition: number; trend: number; seasonality: number };
  overallScore: number;
  grade: "A+" | "A" | "B+" | "B" | "C+" | "C";
  topProduct: string;
  topProductPrice: number;
  topProductMargin: number;
  aiInsight: string;
  competitionLevel: "low" | "medium" | "high" | "very-high";
  saturation: number;
  avgSellingPrice: number;
  bestPlatforms: string[];
  seasonality: string;
  riskLevel: "low" | "medium" | "high";
  topSuppliers: { name: string; badge: "gold" | "silver" | "bronze"; reliability: number }[];
  relatedNiches: string[];
  keywords: string[];
}

export const allNiches: NicheData[] = [
  {
    id: "n1", name: "Pet Tech & Wearables", icon: "\ud83d\udc1e", image: "https://placehold.co/400x250/0f172a/f59e0b?text=Pet+Tech", category: "Pets",
    heat: 92, productCount: 342, avgMargin: 58, growth: 22, trend: "up", trendDirection: "rising",
    weeklyData: [65, 70, 75, 82, 88, 90, 92],
    demandSparkline: [65, 70, 75, 82, 88, 90, 92],
    scores: { demand: 85, profit: 78, competition: 72, trend: 90, seasonality: 80 },
    overallScore: 81, grade: "A",
    topProduct: "Pet GPS Tracker", topProductPrice: 14.80, topProductMargin: 58,
    aiInsight: "Pet ownership booming + GPS trackers surging. Low competition for smart collars. TikTok driving viral pet tech.",
    competitionLevel: "medium", saturation: 34,
    avgSellingPrice: 34.99, bestPlatforms: ["Amazon", "Shopify", "eBay"],
    seasonality: "Year-round with summer peak (lost pet season)",
    riskLevel: "low",
    topSuppliers: [
      { name: "TechSource Global", badge: "gold", reliability: 92 },
      { name: "CJ Direct", badge: "silver", reliability: 85 },
    ],
    relatedNiches: ["Home Office Ergonomics", "Fitness Trackers"],
    keywords: ["pet gps", "smart collar", "pet tracker", "dog tracker", "cat gps"],
  },
  {
    id: "n2", name: "Home Office Ergonomics", icon: "\ud83d\udcbb", image: "https://placehold.co/400x250/0f172a/3b82f6?text=Office", category: "Office",
    heat: 78, productCount: 256, avgMargin: 62, growth: 15, trend: "up", trendDirection: "rising",
    weeklyData: [55, 60, 65, 68, 72, 75, 78],
    demandSparkline: [55, 60, 65, 68, 72, 75, 78],
    scores: { demand: 75, profit: 82, competition: 68, trend: 70, seasonality: 85 },
    overallScore: 76, grade: "B+",
    topProduct: "Monitor Arm Mount", topProductPrice: 29.99, topProductMargin: 65,
    aiInsight: "Remote work permanent. Standing desks and monitor arms trending up. High margins on premium ergonomic products.",
    competitionLevel: "medium", saturation: 42,
    avgSellingPrice: 44.99, bestPlatforms: ["Amazon", "Shopify"],
    seasonality: "Back-to-school and New Year resolution peaks",
    riskLevel: "low",
    topSuppliers: [
      { name: "PrimeDrop Fulfillment", badge: "gold", reliability: 96 },
      { name: "TechSource Global", badge: "gold", reliability: 92 },
    ],
    relatedNiches: ["Smart Kitchen Gadgets", "Car Accessories Tech"],
    keywords: ["monitor arm", "standing desk", "ergonomic", "desk organizer", "posture"],
  },
  {
    id: "n3", name: "Smart Kitchen Gadgets", icon: "\ud83c\udf73", image: "https://placehold.co/400x250/0f172a/f97316?text=Kitchen", category: "Kitchen",
    heat: 85, productCount: 412, avgMargin: 45, growth: 18, trend: "stable", trendDirection: "stable",
    weeklyData: [80, 82, 83, 84, 85, 85, 85],
    demandSparkline: [80, 82, 83, 84, 85, 85, 85],
    scores: { demand: 80, profit: 70, competition: 55, trend: 75, seasonality: 90 },
    overallScore: 74, grade: "B+",
    topProduct: "Silicone Air Fryer Mat", topProductPrice: 8.99, topProductMargin: 52,
    aiInsight: "Viral TikTok kitchen hacks driving impulse buys. Air fryer accessories peak. High volume, moderate margins.",
    competitionLevel: "high", saturation: 58,
    avgSellingPrice: 19.99, bestPlatforms: ["Amazon", "TikTok Shop", "eBay"],
    seasonality: "Holiday season peak (Nov-Dec), steady rest of year",
    riskLevel: "medium",
    topSuppliers: [
      { name: "CJ Direct", badge: "silver", reliability: 85 },
      { name: "AsiaMart Direct", badge: "bronze", reliability: 80 },
    ],
    relatedNiches: ["Beauty & Health", "Pet Tech & Wearables"],
    keywords: ["kitchen gadget", "air fryer", "silicone mat", "kitchen tool", "cooking"],
  },
  {
    id: "n4", name: "Outdoor Adventure Gear", icon: "\u26fa\ufe0f", image: "https://placehold.co/400x250/0f172a/22c55e?text=Outdoor", category: "Sports",
    heat: 70, productCount: 189, avgMargin: 52, growth: 12, trend: "up", trendDirection: "rising",
    weeklyData: [45, 50, 55, 60, 64, 68, 70],
    demandSparkline: [45, 50, 55, 60, 64, 68, 70],
    scores: { demand: 70, profit: 85, competition: 60, trend: 82, seasonality: 65 },
    overallScore: 72, grade: "B",
    topProduct: "Portable Espresso Mini", topProductPrice: 29.99, topProductMargin: 55,
    aiInsight: "Camping season starting early. Portable espresso and hammocks rising. Strong margins on adventure gear.",
    competitionLevel: "low", saturation: 28,
    avgSellingPrice: 39.99, bestPlatforms: ["Amazon", "Shopify"],
    seasonality: "Spring-summer peak (Mar-Aug)",
    riskLevel: "medium",
    topSuppliers: [
      { name: "NordicTrade Co", badge: "gold", reliability: 90 },
      { name: "Pacific Rim Trading", badge: "silver", reliability: 87 },
    ],
    relatedNiches: ["Fitness & Yoga", "Car Accessories Tech"],
    keywords: ["camping", "portable espresso", "hammock", "hiking", "outdoor"],
  },
  {
    id: "n5", name: "Car Accessories Tech", icon: "\ud83d\ude97", image: "https://placehold.co/400x250/0f172a/ef4444?text=Cars", category: "Automotive",
    heat: 65, productCount: 298, avgMargin: 48, growth: 8, trend: "stable", trendDirection: "stable",
    weeklyData: [60, 62, 63, 64, 65, 65, 65],
    demandSparkline: [60, 62, 63, 64, 65, 65, 65],
    scores: { demand: 82, profit: 65, competition: 45, trend: 68, seasonality: 75 },
    overallScore: 67, grade: "B",
    topProduct: "Car Dash Cam 4K", topProductPrice: 22.50, topProductMargin: 42,
    aiInsight: "Dash cams and magnetic mounts steady sellers. Low saturation, consistent demand. Good for beginners.",
    competitionLevel: "low", saturation: 22,
    avgSellingPrice: 34.99, bestPlatforms: ["Amazon", "eBay"],
    seasonality: "Road trip season (summer), steady year-round",
    riskLevel: "low",
    topSuppliers: [
      { name: "TechSource Global", badge: "gold", reliability: 92 },
      { name: "AsiaMart Direct", badge: "bronze", reliability: 80 },
    ],
    relatedNiches: ["Smart Kitchen Gadgets", "Home Office Ergonomics"],
    keywords: ["dash cam", "car mount", "car accessories", "magnetic mount", "car tech"],
  },
  {
    id: "n6", name: "Beauty & Health", icon: "\ud83d\udc84", image: "https://placehold.co/400x250/0f172a/ec4899?text=Beauty", category: "Beauty",
    heat: 72, productCount: 520, avgMargin: 55, growth: 16, trend: "up", trendDirection: "rising",
    weeklyData: [50, 55, 58, 62, 66, 70, 72],
    demandSparkline: [50, 55, 58, 62, 66, 70, 72],
    scores: { demand: 78, profit: 72, competition: 62, trend: 78, seasonality: 70 },
    overallScore: 72, grade: "B",
    topProduct: "LED Face Mask", topProductPrice: 18.99, topProductMargin: 72,
    aiInsight: "Skincare routine trend + influencer push. LED masks and serums trending. High margin on beauty tech.",
    competitionLevel: "medium", saturation: 38,
    avgSellingPrice: 29.99, bestPlatforms: ["Shopify", "TikTok Shop", "Amazon"],
    seasonality: "Valentine's Day, Mother's Day peaks",
    riskLevel: "medium",
    topSuppliers: [
      { name: "Pacific Rim Trading", badge: "silver", reliability: 87 },
      { name: "Tokyo Tech Supply", badge: "gold", reliability: 91 },
    ],
    relatedNiches: ["Smart Kitchen Gadgets", "Pet Tech & Wearables"],
    keywords: ["led face mask", "skincare", "beauty device", "serum", "beauty tech"],
  },
  {
    id: "n7", name: "Fitness & Yoga", icon: "\ud83c\udfcb\ufe0f", image: "https://placehold.co/400x250/0f172a/10b981?text=Fitness", category: "Fitness",
    heat: 70, productCount: 189, avgMargin: 52, growth: 14, trend: "up", trendDirection: "rising",
    weeklyData: [45, 50, 55, 60, 64, 68, 70],
    demandSparkline: [45, 50, 55, 60, 64, 68, 70],
    scores: { demand: 72, profit: 68, competition: 58, trend: 72, seasonality: 80 },
    overallScore: 68, grade: "B",
    topProduct: "Resistance Bands Set", topProductPrice: 12.99, topProductMargin: 68,
    aiInsight: "January fitness rush starting early. Resistance bands and yoga mats steady sellers. Bundle opportunities.",
    competitionLevel: "medium", saturation: 45,
    avgSellingPrice: 24.99, bestPlatforms: ["Amazon", "Shopify"],
    seasonality: "New Year peak (Dec-Jan), summer body season (Mar-May)",
    riskLevel: "low",
    topSuppliers: [
      { name: "PrimeDrop Fulfillment", badge: "gold", reliability: 96 },
      { name: "EuropaSupply", badge: "silver", reliability: 88 },
    ],
    relatedNiches: ["Outdoor Adventure Gear", "Beauty & Health"],
    keywords: ["yoga mat", "resistance bands", "fitness", "workout", "gym"],
  },
  {
    id: "n8", name: "Phone Accessories", icon: "\ud83d\udcf1", image: "https://placehold.co/400x250/0f172a/a855f7?text=Phone", category: "Electronics",
    heat: 55, productCount: 890, avgMargin: 38, growth: 5, trend: "down", trendDirection: "declining",
    weeklyData: [70, 65, 60, 58, 56, 55, 55],
    demandSparkline: [70, 65, 60, 58, 56, 55, 55],
    scores: { demand: 75, profit: 42, competition: 85, trend: 45, seasonality: 60 },
    overallScore: 52, grade: "C+",
    topProduct: "Magnetic Phone Mount", topProductPrice: 9.99, topProductMargin: 35,
    aiInsight: "Highly saturated. Price wars eroding margins. Only viable with unique designs or bundling strategy.",
    competitionLevel: "very-high", saturation: 78,
    avgSellingPrice: 14.99, bestPlatforms: ["Amazon", "eBay"],
    seasonality: "iPhone launch season (Sep-Oct) minor peak",
    riskLevel: "high",
    topSuppliers: [
      { name: "AsiaMart Direct", badge: "bronze", reliability: 80 },
      { name: "CJ Direct", badge: "silver", reliability: 85 },
    ],
    relatedNiches: ["Car Accessories Tech", "Smart Kitchen Gadgets"],
    keywords: ["phone mount", "phone case", "charger", "phone accessory", "magnetic"],
  },
];

export function getNicheById(id: string): NicheData | undefined {
  return allNiches.find((n) => n.id === id);
}

export function searchNiches(query: string): NicheData[] {
  const q = query.toLowerCase();
  return allNiches.filter((n) =>
    n.name.toLowerCase().includes(q) ||
    n.category.toLowerCase().includes(q) ||
    n.keywords.some((k) => k.includes(q))
  );
}
