export interface CompetitorListing {
  id: string;
  title: string;
  price: number;
  source: string;
  seller: string;
  sellerRating: number;
  sellerProducts: number;
  link: string;
  shipping: string;
  condition: "New" | "Used" | "Refurbished";
  daysAgo: number;
}

export interface PlatformData {
  platform: string;
  icon: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  sellerCount: number;
  trend: "up" | "down" | "stable";
  trendPercent: number;
  sparkline: number[];
  listings: CompetitorListing[];
}

export interface SellerProfile {
  name: string;
  platform: string;
  rating: number;
  totalProducts: number;
  price: number;
  threatLevel: "low" | "medium" | "high";
  isDropshipper: boolean;
  otherProducts: { name: string; price: number }[];
  responseTime: string;
  returnPolicy: string;
}

export interface PriceTier {
  range: string;
  count: number;
  percent: number;
  isSweetSpot: boolean;
}

export interface Opportunity {
  type: "opportunity" | "gap" | "avoid";
  title: string;
  description: string;
  count: number;
  potentialMargin?: number;
  actionLabel: string;
}

export interface PricingOption {
  label: string;
  icon: string;
  price: number;
  margin: number;
  description: string;
  tradeoff: string;
  isRecommended: boolean;
  color: string;
}

export interface MarketData {
  query: string;
  totalListings: number;
  avgPrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  profitZone: { min: number; max: number; label: string };
  priceDistribution: PriceTier[];
  platforms: PlatformData[];
  topSellers: SellerProfile[];
  opportunities: Opportunity[];
  pricingOptions: PricingOption[];
  priceHistory: { date: string; avg: number; min: number; max: number }[];
  insights: string[];
}

const sellerNames = [
  "TechGadgets Store", "DirectSales Co", "BudgetFinds Shop", "PremiumTech Hub",
  "QuickDrop Supply", "QualityGoods Plus", "MegaMart Deals", "ValueZone Store",
  "PrimeSelect Shop", "TopSeller Express", "SmartBuy outlet", "BestDeal Central",
];

const platformIcons: Record<string, string> = {
  Amazon: "\ud83d\udce6", eBay: "\ud83c\udff7\ufe0f", Walmart: "\ud83c\udfea",
  Shopify: "\ud83d\udd25", AliExpress: "\ud83c\udde8\ud83c\uddf3", Target: "\ud83c\udfaf",
};

function seededRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  return Math.abs(h) / 2147483647;
}

export function generateMarketData(query: string): MarketData {
  const basePrice = 15 + seededRandom(query) * 60;

  const platforms: PlatformData[] = [
    { platform: "Amazon", icon: platformIcons.Amazon, avgPrice: +(basePrice * (0.9 + seededRandom(query + "amz") * 0.3)).toFixed(2), minPrice: +(basePrice * 0.6).toFixed(2), maxPrice: +(basePrice * 1.8).toFixed(2), sellerCount: Math.round(8 + seededRandom(query + "amzc") * 20), trend: "up", trendPercent: +(seededRandom(query + "amzt") * 8 - 2).toFixed(1), sparkline: Array.from({ length: 7 }, (_, i) => +(basePrice * (0.85 + seededRandom(query + "amzs" + i) * 0.3)).toFixed(2)), listings: [] },
    { platform: "eBay", icon: platformIcons.eBay, avgPrice: +(basePrice * (0.75 + seededRandom(query + "eb") * 0.25)).toFixed(2), minPrice: +(basePrice * 0.45).toFixed(2), maxPrice: +(basePrice * 1.5).toFixed(2), sellerCount: Math.round(12 + seededRandom(query + "ebc") * 25), trend: "down", trendPercent: -(seededRandom(query + "ebt") * 5).toFixed(1), sparkline: Array.from({ length: 7 }, (_, i) => +(basePrice * (0.7 + seededRandom(query + "ebs" + i) * 0.3)).toFixed(2)), listings: [] },
    { platform: "Walmart", icon: platformIcons.Walmart, avgPrice: +(basePrice * (0.95 + seededRandom(query + "wm") * 0.2)).toFixed(2), minPrice: +(basePrice * 0.7).toFixed(2), maxPrice: +(basePrice * 1.6).toFixed(2), sellerCount: Math.round(5 + seededRandom(query + "wmc") * 10), trend: "stable", trendPercent: +(seededRandom(query + "wmt") * 2 - 1).toFixed(1), sparkline: Array.from({ length: 7 }, (_, i) => +(basePrice * (0.9 + seededRandom(query + "wms" + i) * 0.15)).toFixed(2)), listings: [] },
    { platform: "Shopify Stores", icon: platformIcons.Shopify, avgPrice: +(basePrice * (1.1 + seededRandom(query + "sh") * 0.4)).toFixed(2), minPrice: +(basePrice * 0.8).toFixed(2), maxPrice: +(basePrice * 2.2).toFixed(2), sellerCount: Math.round(15 + seededRandom(query + "shc") * 30), trend: "up", trendPercent: +(seededRandom(query + "sht") * 10).toFixed(1), sparkline: Array.from({ length: 7 }, (_, i) => +(basePrice * (1.0 + seededRandom(query + "shs" + i) * 0.4)).toFixed(2)), listings: [] },
  ];

  const allListings: CompetitorListing[] = [];
  platforms.forEach((p) => {
    const count = 5 + Math.floor(seededRandom(query + p.platform) * 8);
    for (let i = 0; i < count; i++) {
      const sellerIdx = Math.floor(seededRandom(query + p.platform + i) * sellerNames.length);
      const priceOffset = 0.6 + seededRandom(query + p.platform + "p" + i) * 1.2;
      allListings.push({
        id: `${p.platform.toLowerCase()}-${i}`,
        title: `${query} - ${p.platform} Listing ${i + 1}`,
        price: +(basePrice * priceOffset).toFixed(2),
        source: p.platform,
        seller: sellerNames[sellerIdx],
        sellerRating: +(3.5 + seededRandom(query + "sr" + i) * 1.5).toFixed(1),
        sellerProducts: Math.round(50 + seededRandom(query + "sp" + i) * 5000),
        link: "#",
        shipping: seededRandom(query + "shp" + i) > 0.4 ? "Free" : `$${(3 + seededRandom(query + "shc" + i) * 8).toFixed(2)}`,
        condition: seededRandom(query + "cond" + i) > 0.15 ? "New" : seededRandom(query + "cond" + i) > 0.5 ? "Refurbished" : "Used",
        daysAgo: Math.floor(seededRandom(query + "days" + i) * 30),
      });
    }
  });

  const prices = allListings.map((l) => l.price).sort((a, b) => a - b);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const medianPrice = prices[Math.floor(prices.length / 2)];
  const minPrice = prices[0];
  const maxPrice = prices[prices.length - 1];

  const tiers = [
    { range: `$0-$${(avgPrice * 0.5).toFixed(0)}`, min: 0, max: avgPrice * 0.5 },
    { range: `$${(avgPrice * 0.5).toFixed(0)}-$${(avgPrice * 0.8).toFixed(0)}`, min: avgPrice * 0.5, max: avgPrice * 0.8 },
    { range: `$${(avgPrice * 0.8).toFixed(0)}-$${(avgPrice * 1.1).toFixed(0)}`, min: avgPrice * 0.8, max: avgPrice * 1.1 },
    { range: `$${(avgPrice * 1.1).toFixed(0)}-$${(avgPrice * 1.5).toFixed(0)}`, min: avgPrice * 1.1, max: avgPrice * 1.5 },
    { range: `$${(avgPrice * 1.5).toFixed(0)}+`, min: avgPrice * 1.5, max: Infinity },
  ];

  const distribution: PriceTier[] = tiers.map((t, i) => {
    const count = prices.filter((p) => p >= t.min && p < t.max).length;
    return {
      range: t.range,
      count,
      percent: Math.round((count / prices.length) * 100),
      isSweetSpot: i === 2,
    };
  });

  const uniqueSellers = [...new Set(allListings.map((l) => l.seller))];
  const topSellers: SellerProfile[] = uniqueSellers.slice(0, 6).map((name) => {
    const sellerListings = allListings.filter((l) => l.seller === name);
    const avgSellerPrice = sellerListings.reduce((a, l) => a + l.price, 0) / sellerListings.length;
    const isCheap = avgSellerPrice < avgPrice * 0.8;
    const isExpensive = avgSellerPrice > avgPrice * 1.2;
    return {
      name,
      platform: sellerListings[0].source,
      rating: sellerListings[0].sellerRating,
      totalProducts: sellerListings[0].sellerProducts,
      price: +avgSellerPrice.toFixed(2),
      threatLevel: (isCheap ? "high" : isExpensive ? "low" : "medium") as "low" | "medium" | "high",
      isDropshipper: sellerListings[0].sellerProducts > 500,
      otherProducts: [
        { name: `${query} Accessory A`, price: +(avgSellerPrice * 0.4).toFixed(2) },
        { name: `${query} Accessory B`, price: +(avgSellerPrice * 0.25).toFixed(2) },
        { name: `${query} Case Pro`, price: +(avgSellerPrice * 0.3).toFixed(2) },
      ],
      responseTime: seededRandom(name) > 0.5 ? "< 4 hours" : "< 24 hours",
      returnPolicy: seededRandom(name + "ret") > 0.5 ? "30-day returns" : "14-day returns",
    };
  }).sort((a, b) => a.price - b.price);

  const opportunities: Opportunity[] = [
    {
      type: "opportunity",
      title: "Underpriced Listings Found",
      description: `${Math.round(seededRandom(query + "opp1") * 5) + 2} products priced 30%+ below average. Quick flip potential.`,
      count: Math.round(seededRandom(query + "opp1") * 5) + 2,
      potentialMargin: Math.round(40 + seededRandom(query + "opp1m") * 20),
      actionLabel: "View Products",
    },
    {
      type: "gap",
      title: "Profit Gap Available",
      description: `Price between $${(avgPrice * 0.7).toFixed(2)} and $${(avgPrice * 0.9).toFixed(2)} for 25-40% margins with minimal competition.`,
      count: Math.round(seededRandom(query + "opp2") * 3) + 1,
      potentialMargin: Math.round(25 + seededRandom(query + "opp2m") * 15),
      actionLabel: "See Strategy",
    },
    {
      type: "avoid",
      title: "Price War Zone",
      description: `${Math.round(seededRandom(query + "opp3") * 8) + 3} sellers in aggressive pricing. Margins below 10%. Avoid this segment.`,
      count: Math.round(seededRandom(query + "opp3") * 8) + 3,
      actionLabel: "Learn Why",
    },
  ];

  const pricingOptions: PricingOption[] = [
    { label: "Minimum", icon: "\ud83d\udcb0", price: +(avgPrice * 0.72).toFixed(2), margin: 15, description: "Beat everyone on price", tradeoff: "Low profit, high volume", isRecommended: false, color: "blue" },
    { label: "Recommended", icon: "\u26a1", price: +(avgPrice * 0.95).toFixed(2), margin: 35, description: "Best balance of profit & volume", tradeoff: "Sweet spot for most sellers", isRecommended: true, color: "emerald" },
    { label: "Premium", icon: "\ud83d\udc51", price: +(avgPrice * 1.3).toFixed(2), margin: 55, description: "Premium positioning", tradeoff: "High margin, lower volume", isRecommended: false, color: "purple" },
  ];

  const priceHistory = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      avg: +(avgPrice * (0.92 + seededRandom(query + "hist" + i) * 0.16)).toFixed(2),
      min: +(minPrice * (0.9 + seededRandom(query + "histmin" + i) * 0.2)).toFixed(2),
      max: +(maxPrice * (0.85 + seededRandom(query + "histmax" + i) * 0.3)).toFixed(2),
    };
  });

  const insights = [
    `Average competitor price is $${avgPrice.toFixed(2)}. Median is $${medianPrice.toFixed(2)} — ${medianPrice < avgPrice ? "a few high-priced outliers are skewing the average up" : "prices are fairly evenly distributed"}.`,
    `Amazon has the most sellers (${platforms[0].sellerCount}) but ${platforms[2].platform} has the highest avg price ($${platforms[2].avgPrice.toFixed(2)}).`,
    `${topSellers[0]?.name || "Top seller"} is the cheapest at $${topSellers[0]?.price.toFixed(2)} but has ${topSellers[0]?.threatLevel} threat level.`,
    `The price sweet spot is $${(avgPrice * 0.8).toFixed(2)}-$${(avgPrice * 1.1).toFixed(2)} where ${distribution[2]?.count || 0} sellers compete.`,
    `Shopify stores charge ${((platforms[3].avgPrice / avgPrice - 1) * 100).toFixed(0)}% more than average — customers pay premium for branded stores.`,
  ];

  return {
    query,
    totalListings: allListings.length,
    avgPrice: +avgPrice.toFixed(2),
    medianPrice: +medianPrice.toFixed(2),
    minPrice: +minPrice.toFixed(2),
    maxPrice: +maxPrice.toFixed(2),
    profitZone: { min: +(avgPrice * 0.65).toFixed(2), max: +(avgPrice * 0.95).toFixed(2), label: "Your Profit Zone" },
    priceDistribution: distribution,
    platforms,
    topSellers,
    opportunities,
    pricingOptions,
    priceHistory,
    insights,
  };
}
