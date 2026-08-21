export interface Competitor {
  id: string;
  storeName: string;
  platform: "Shopify" | "WooCommerce" | "BigCommerce" | "Squarespace" | "Custom";
  niche: string;
  monthlyTraffic: number;
  domainAuthority: number;
  socialFollowers: { platform: string; count: number }[];
  avgProductPrice: number;
  bestSellers: { name: string; price: number; sales: number; reviews: number }[];
  pricingStrategy: "premium" | "competitive" | "budget";
  fulfillmentMethod: "self-fulfilled" | "3pl" | "supplier-direct" | "hybrid";
  strengths: string[];
  weaknesses: string[];
  adPlatforms: string[];
  estimatedRevenue: number;
  growthRate: number;
  founded: number;
  country: string;
}

export const mockCompetitors: Competitor[] = [
  {
    id: "c1", storeName: "GadgetZone Pro", platform: "Shopify", niche: "Consumer Electronics",
    monthlyTraffic: 320000, domainAuthority: 62,
    socialFollowers: [{ platform: "Instagram", count: 45000 }, { platform: "TikTok", count: 128000 }, { platform: "Facebook", count: 32000 }],
    avgProductPrice: 34.99,
    bestSellers: [
      { name: "Wireless Earbuds X1", price: 29.99, sales: 12400, reviews: 3200 },
      { name: "LED Desk Lamp Pro", price: 44.99, sales: 8700, reviews: 1900 },
      { name: "Phone Stand Magnetic", price: 19.99, sales: 15600, reviews: 4100 },
    ],
    pricingStrategy: "competitive", fulfillmentMethod: "3pl",
    strengths: ["Strong brand identity", "Fast shipping (2-3 days)", "Excellent product photography"],
    weaknesses: ["Limited product range", "No loyalty program", "High return rate on electronics"],
    adPlatforms: ["Facebook Ads", "Google Shopping", "TikTok Ads"],
    estimatedRevenue: 185000, growthRate: 24, founded: 2021, country: "US",
  },
  {
    id: "c2", storeName: "HomeGlow Essentials", platform: "Shopify", niche: "Home & Kitchen",
    monthlyTraffic: 180000, domainAuthority: 48,
    socialFollowers: [{ platform: "Instagram", count: 28000 }, { platform: "Pinterest", count: 95000 }, { platform: "YouTube", count: 12000 }],
    avgProductPrice: 27.50,
    bestSellers: [
      { name: "Aroma Diffuser Set", price: 32.99, sales: 9800, reviews: 2400 },
      { name: "Bamboo Cutting Board", price: 18.99, sales: 7200, reviews: 1800 },
      { name: "LED Candle Pack", price: 22.99, sales: 11300, reviews: 3100 },
    ],
    pricingStrategy: "premium", fulfillmentMethod: "supplier-direct",
    strengths: ["Beautiful brand aesthetic", "Strong Pinterest presence", "High AOV"],
    weaknesses: ["Slow shipping (7-14 days)", "No email marketing", "Weak customer support"],
    adPlatforms: ["Pinterest Ads", "Instagram Ads", "Google Display"],
    estimatedRevenue: 92000, growthRate: 18, founded: 2022, country: "US",
  },
  {
    id: "c3", storeName: "FitLife Arsenal", platform: "WooCommerce", niche: "Fitness & Health",
    monthlyTraffic: 520000, domainAuthority: 71,
    socialFollowers: [{ platform: "Instagram", count: 185000 }, { platform: "TikTok", count: 340000 }, { platform: "YouTube", count: 67000 }],
    avgProductPrice: 38.00,
    bestSellers: [
      { name: "Resistance Band Set", price: 24.99, sales: 28000, reviews: 8900 },
      { name: "Foam Roller Pro", price: 34.99, sales: 16500, reviews: 5200 },
      { name: "Yoga Block 2-Pack", price: 14.99, sales: 22000, reviews: 6100 },
    ],
    pricingStrategy: "competitive", fulfillmentMethod: "3pl",
    strengths: ["Massive social following", "Strong community", "Excellent content marketing"],
    weaknesses: ["Saturated market", "Low margins", "Heavy reliance on paid ads"],
    adPlatforms: ["Facebook Ads", "TikTok Ads", "YouTube Ads"],
    estimatedRevenue: 420000, growthRate: 32, founded: 2020, country: "US",
  },
  {
    id: "c4", storeName: "PetPamper Co", platform: "BigCommerce", niche: "Pet Supplies",
    monthlyTraffic: 95000, domainAuthority: 38,
    socialFollowers: [{ platform: "Instagram", count: 22000 }, { platform: "TikTok", count: 45000 }, { platform: "Facebook", count: 18000 }],
    avgProductPrice: 29.99,
    bestSellers: [
      { name: "GPS Smart Collar", price: 49.99, sales: 3200, reviews: 890 },
      { name: "Interactive Cat Toy", price: 19.99, sales: 5600, reviews: 1400 },
      { name: "Pet Water Fountain", price: 34.99, sales: 4100, reviews: 1100 },
    ],
    pricingStrategy: "premium", fulfillmentMethod: "supplier-direct",
    strengths: ["Niche focus", "High customer LTV", "Viral TikTok content"],
    weaknesses: ["Small team", "Limited inventory", "No international shipping"],
    adPlatforms: ["TikTok Ads", "Instagram Ads", "Google Shopping"],
    estimatedRevenue: 68000, growthRate: 45, founded: 2023, country: "US",
  },
  {
    id: "c5", storeName: "StyleVault", platform: "Shopify", niche: "Fashion Accessories",
    monthlyTraffic: 280000, domainAuthority: 55,
    socialFollowers: [{ platform: "Instagram", count: 92000 }, { platform: "TikTok", count: 180000 }, { platform: "Pinterest", count: 45000 }],
    avgProductPrice: 22.00,
    bestSellers: [
      { name: "Minimalist Wallet", price: 24.99, sales: 18000, reviews: 4500 },
      { name: "Sunglasses Retro", price: 19.99, sales: 22000, reviews: 5800 },
      { name: "Chain Necklace Gold", price: 16.99, sales: 14000, reviews: 3200 },
    ],
    pricingStrategy: "budget", fulfillmentMethod: "hybrid",
    strengths: ["Trendy products", "Fast trend response", "Strong influencer partnerships"],
    weaknesses: ["Low quality perception", "High returns", "No brand differentiation"],
    adPlatforms: ["Instagram Ads", "TikTok Ads", "Facebook Ads"],
    estimatedRevenue: 156000, growthRate: 15, founded: 2021, country: "US",
  },
  {
    id: "c6", storeName: "TechNest Hub", platform: "Shopify", niche: "Smart Home",
    monthlyTraffic: 145000, domainAuthority: 44,
    socialFollowers: [{ platform: "YouTube", count: 38000 }, { platform: "Instagram", count: 25000 }, { platform: "Reddit", count: 15000 }],
    avgProductPrice: 42.00,
    bestSellers: [
      { name: "Smart Plug 4-Pack", price: 29.99, sales: 9200, reviews: 2800 },
      { name: "WiFi Door Sensor", price: 19.99, sales: 6800, reviews: 1900 },
      { name: "Smart LED Bulb Set", price: 34.99, sales: 11400, reviews: 3400 },
    ],
    pricingStrategy: "competitive", fulfillmentMethod: "3pl",
    strengths: ["Tech-savvy audience", "YouTube reviews driving traffic", "Bundling strategy"],
    weaknesses: ["Complex products", "High support costs", "Long shipping from China"],
    adPlatforms: ["YouTube Ads", "Google Shopping", "Reddit Ads"],
    estimatedRevenue: 112000, growthRate: 28, founded: 2022, country: "US",
  },
];

export function getCompetitorById(id: string): Competitor | undefined {
  return mockCompetitors.find((c) => c.id === id);
}

export function getCompetitorsByNiche(niche: string): Competitor[] {
  return mockCompetitors.filter((c) => c.niche.toLowerCase().includes(niche.toLowerCase()));
}
