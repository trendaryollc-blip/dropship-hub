import { NextResponse } from "next/server";
import { searchCJProducts } from "@/lib/platform-search";

interface TrendingProduct {
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

let cachedTrending: { products: TrendingProduct[]; timestamp: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000;

const TRENDING_QUERIES = [
  "wireless earbuds",
  "phone accessories",
  "led strip lights",
  "pet tracker",
  "kitchen gadget",
  "yoga mat",
  "posture corrector",
  "car phone mount",
];

function estimateDemand(orders: number): "low" | "medium" | "high" {
  if (orders > 300) return "high";
  if (orders > 100) return "medium";
  return "low";
}

function estimateCompetition(price: number): "low" | "medium" | "high" {
  if (price < 5) return "high";
  if (price < 15) return "medium";
  return "low";
}

function generateSparkline(price: number): number[] {
  const base = Math.min(price * 3, 60);
  return Array.from({ length: 7 }, (_, i) => Math.round(base + Math.sin(i * 0.8) * 8 + (Math.random() * 4 - 2)));
}

export async function GET() {
  try {
    if (cachedTrending && Date.now() - cachedTrending.timestamp < CACHE_TTL) {
      return NextResponse.json({ products: cachedTrending.products, cached: true });
    }

    const results = await Promise.allSettled(
      TRENDING_QUERIES.map((q) => searchCJProducts(q))
    );

    const allProducts: TrendingProduct[] = [];
    let id = 0;

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status !== "fulfilled") continue;

      const items = r.value.search_results.filter((p) => p.price !== null && p.price > 0);
      const top = items.slice(0, 2);

      for (const item of top) {
        const price = item.price!;
        const sellPrice = Math.round(price * 2.5 * 100) / 100;
        const profit = Math.round((sellPrice - price) * 100) / 100;
        const margin = sellPrice > 0 ? Math.round((profit / sellPrice) * 100) : 0;
        const growth = Math.round(Math.random() * 35 + 5);

        allProducts.push({
          id: `trending-${id++}`,
          name: item.title.length > 60 ? item.title.slice(0, 57) + "..." : item.title,
          category: TRENDING_QUERIES[i].split(" ").slice(0, 2).join(" "),
          price,
          sellPrice,
          profit,
          margin,
          platform: "CJ Dropshipping",
          trend: growth,
          sparkline: generateSparkline(price),
          confidence: Math.min(95, Math.round(60 + margin * 0.4 + Math.random() * 10)),
          demandLevel: estimateDemand(Math.round(100 + Math.random() * 400)),
          competitionLevel: estimateCompetition(price),
          image: item.image || "",
          tags: TRENDING_QUERIES[i].split(" ").slice(0, 3),
        });
      }
    }

    const sorted = allProducts
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 8);

    cachedTrending = { products: sorted, timestamp: Date.now() };
    return NextResponse.json({ products: sorted, count: sorted.length });
  } catch (error) {
    return NextResponse.json(
      { products: [], error: error instanceof Error ? error.message : "Unknown error" },
    );
  }
}
