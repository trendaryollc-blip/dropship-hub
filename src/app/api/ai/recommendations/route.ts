import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { DocumentData } from "firebase-admin/firestore";
import { safeNum, safeStr } from "@/lib/utils-helpers";

interface ProductRecommendation {
  id: string;
  title: string;
  category: string;
  sourcePrice: number;
  suggestedSellPrice: number;
  estimatedMargin: number;
  confidence: number;
  reason: string;
  matchType: "niche-expansion" | "trending" | "high-margin" | "gap-fill" | "seasonal";
  reasoning: string;
  riskLevel: "low" | "medium" | "high";
  competitionLevel: "low" | "medium" | "high";
  matchScore: number;
  tags: string[];
}

// Simulated product catalog for recommendations
const PRODUCT_CATALOG: Omit<ProductRecommendation, "matchScore" | "reasoning">[] = [
  { id: "rec-1", title: "Smart Posture Corrector with vibration alert", category: "Health & Wellness", sourcePrice: 12.50, suggestedSellPrice: 34.99, estimatedMargin: 64, confidence: 88, reason: "High demand, low competition in smart health devices", matchType: "trending", riskLevel: "low", competitionLevel: "medium", tags: ["health", "wearable", "smart"] },
  { id: "rec-2", title: "Portable Blender USB Rechargeable", category: "Kitchen Gadgets", sourcePrice: 8.90, suggestedSellPrice: 29.99, estimatedMargin: 70, confidence: 85, reason: "Trending on social media, high impulse buy potential", matchType: "trending", riskLevel: "low", competitionLevel: "medium", tags: ["kitchen", "portable", "fitness"] },
  { id: "rec-3", title: "LED Galaxy Projector with WiFi", category: "Home & Decor", sourcePrice: 15.00, suggestedSellPrice: 49.99, estimatedMargin: 70, confidence: 82, reason: "Consistent seller, great for TikTok content", matchType: "high-margin", riskLevel: "low", competitionLevel: "medium", tags: ["home", "decor", "led"] },
  { id: "rec-4", title: "Pet GPS Tracker Mini", category: "Pet Supplies", sourcePrice: 9.50, suggestedSellPrice: 34.99, estimatedMargin: 73, confidence: 90, reason: "Pet niche growing 340% — massive opportunity", matchType: "niche-expansion", riskLevel: "low", competitionLevel: "low", tags: ["pet", "gps", "tracker"] },
  { id: "rec-5", title: "Car Phone Mount MagSafe Compatible", category: "Automotive", sourcePrice: 4.50, suggestedSellPrice: 19.99, estimatedMargin: 77, confidence: 80, reason: "Universal compatibility, high repeat purchase", matchType: "gap-fill", riskLevel: "low", competitionLevel: "high", tags: ["car", "phone", "magnetic"] },
  { id: "rec-6", title: "Mini Portable Projector 1080p", category: "Electronics", sourcePrice: 22.00, suggestedSellPrice: 69.99, estimatedMargin: 69, confidence: 78, reason: "Home entertainment trending, good margins", matchType: "trending", riskLevel: "medium", competitionLevel: "medium", tags: ["projector", "entertainment", "portable"] },
  { id: "rec-7", title: "Resistance Bands Set with Door Anchor", category: "Fitness", sourcePrice: 3.50, suggestedSellPrice: 14.99, estimatedMargin: 77, confidence: 84, reason: "Home fitness evergreen, low cost high margin", matchType: "high-margin", riskLevel: "low", competitionLevel: "high", tags: ["fitness", "bands", "home-gym"] },
  { id: "rec-8", title: "Smart Water Bottle with Temperature Display", category: "Lifestyle", sourcePrice: 7.00, suggestedSellPrice: 24.99, estimatedMargin: 72, confidence: 79, reason: "Health-conscious buyers, Instagram-worthy", matchType: "seasonal", riskLevel: "low", competitionLevel: "medium", tags: ["health", "bottle", "smart"] },
  { id: "rec-9", title: "Aromatherapy Essential Oil Diffuser", category: "Home & Wellness", sourcePrice: 6.50, suggestedSellPrice: 29.99, estimatedMargin: 78, confidence: 86, reason: "Year-round demand, great for bundles", matchType: "high-margin", riskLevel: "low", competitionLevel: "medium", tags: ["aromatherapy", "diffuser", "wellness"] },
  { id: "rec-10", title: "Wireless Earbuds ANC Pro", category: "Electronics", sourcePrice: 11.00, suggestedSellPrice: 39.99, estimatedMargin: 72, confidence: 75, reason: "High volume, but competitive — needs differentiation", matchType: "trending", riskLevel: "medium", competitionLevel: "high", tags: ["earbuds", "wireless", "anc"] },
  { id: "rec-11", title: "Bamboo Desk Organizer Set", category: "Home Office", sourcePrice: 5.00, suggestedSellPrice: 22.99, estimatedMargin: 78, confidence: 83, reason: "Remote work trend, eco-friendly angle", matchType: "niche-expansion", riskLevel: "low", competitionLevel: "low", tags: ["office", "bamboo", "eco"] },
  { id: "rec-12", title: "Car Air Purifier HEPA", category: "Automotive", sourcePrice: 8.00, suggestedSellPrice: 29.99, estimatedMargin: 73, confidence: 81, reason: "Health + auto niche crossover, seasonal summer demand", matchType: "seasonal", riskLevel: "low", competitionLevel: "medium", tags: ["car", "purifier", "health"] },
  { id: "rec-13", title: "UV Phone Sanitizer Box", category: "Health & Tech", sourcePrice: 6.00, suggestedSellPrice: 24.99, estimatedMargin: 76, confidence: 77, reason: "Health awareness trending, gift-worthy", matchType: "gap-fill", riskLevel: "low", competitionLevel: "medium", tags: ["uv", "sanitizer", "phone"] },
  { id: "rec-14", title: "Smart Soil Monitor for Plants", category: "Garden", sourcePrice: 9.00, suggestedSellPrice: 32.99, estimatedMargin: 73, confidence: 82, reason: "Plant parent trend, smart garden niche growing", matchType: "niche-expansion", riskLevel: "low", competitionLevel: "low", tags: ["garden", "smart", "plants"] },
  { id: "rec-15", title: "Electric Milk Frother Handheld", category: "Kitchen", sourcePrice: 3.00, suggestedSellPrice: 12.99, estimatedMargin: 77, confidence: 87, reason: "Coffee culture, impulse buy, great for bundles", matchType: "high-margin", riskLevel: "low", competitionLevel: "medium", tags: ["kitchen", "coffee", "frother"] },
];

function computeMatchScore(
  product: Omit<ProductRecommendation, "matchScore" | "reasoning">,
  userNiches: string[],
  userCategories: string[],
  topMargins: number[],
): { score: number; reasoning: string } {
  let score = 50; // Base score
  const reasons: string[] = [];

  // Niche alignment bonus
  const productTags = product.tags.map((t) => t.toLowerCase());
  const nicheOverlap = userNiches.filter((n) => productTags.includes(n.toLowerCase()));
  if (nicheOverlap.length > 0) {
    score += 20;
    reasons.push(`Matches your ${nicheOverlap.join(", ")} niche`);
  }

  // Category alignment
  const categoryMatch = userCategories.some((c) =>
    product.category.toLowerCase().includes(c.toLowerCase())
  );
  if (categoryMatch) {
    score += 10;
    reasons.push("Aligns with your active categories");
  }

  // Margin bonus
  if (product.estimatedMargin >= 70) {
    score += 10;
    reasons.push(`${product.estimatedMargin}% estimated margin`);
  }

  // Competition bonus
  if (product.competitionLevel === "low") {
    score += 10;
    reasons.push("Low competition — easier entry");
  }

  // Risk penalty
  if (product.riskLevel === "high") {
    score -= 10;
  }

  // Confidence bonus
  score += Math.round(product.confidence * 0.1);

  return {
    score: Math.min(98, Math.max(30, score)),
    reasoning: reasons.length > 0 ? reasons.join(". ") + ". " + product.reason : product.reason,
  };
}

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const userRef = db.collection("users").doc(uid);

    // Fetch user's product portfolio and search history
    const [lifecycleSnap, searchSnap, favoritesSnap] = await Promise.all([
      userRef.collection("productLifecycle").limit(20).get(),
      userRef.collection("searchHistory").orderBy("createdAt", "desc").limit(20).get(),
      userRef.collection("favorites").limit(20).get(),
    ]);

    const lifecycle = lifecycleSnap.docs.map((d) => d.data() as DocumentData);
    const searches = searchSnap.docs.map((d) => d.data() as DocumentData);
    const favorites = favoritesSnap.docs.map((d) => d.data() as DocumentData);

    // Extract user's niches and categories from their data
    const userNiches = [
      ...new Set(searches.map((s) => safeStr(s.query).toLowerCase().split(" ")[0])),
    ].filter(Boolean);

    const userCategories = [
      ...new Set(lifecycle.map((p) => safeStr(p.productTitle).toLowerCase().split(" ").slice(0, 2).join(" "))),
    ].filter(Boolean);

    // Compute average margin from their products
    const topMargins = lifecycle.map((p) => safeNum(p.profitMargin, 25));

    // Score all products
    const recommendations: ProductRecommendation[] = PRODUCT_CATALOG.map((product) => {
      const { score, reasoning } = computeMatchScore(product, userNiches, userCategories, topMargins);
      return {
        ...product,
        matchScore: score,
        reasoning,
      };
    })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 8);

    return NextResponse.json({
      recommendations,
      userProfile: {
        niches: userNiches.slice(0, 5),
        categories: userCategories.slice(0, 5),
        productCount: lifecycle.length,
        avgMargin: topMargins.length > 0 ? Math.round(topMargins.reduce((a, b) => a + b, 0) / topMargins.length) : 0,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate recommendations", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, LIMITS.AI_CHAT);
