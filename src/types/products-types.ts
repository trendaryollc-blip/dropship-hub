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
