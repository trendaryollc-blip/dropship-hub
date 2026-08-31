import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();

    // Fetch user context data to generate smart suggestions
    const [productsSnap, storesSnap, profitSnap] = await Promise.all([
      db.collection("users").doc(uid).collection("productLifecycle").limit(10).get(),
      db.collection("users").doc(uid).collection("storeConnections").limit(5).get(),
      db.collection("users").doc(uid).collection("profitEntries").orderBy("createdAt", "desc").limit(5).get(),
    ]);

    const suggestions: {
      id: string;
      type: string;
      title: string;
      description: string;
      action: string;
      href: string;
      icon: string;
      color: string;
      bgColor: string;
      timestamp: string;
    }[] = [];

    // Context-aware suggestions based on user data
    const hasProducts = productsSnap.size > 0;
    const hasStores = storesSnap.size > 0;
    const hasProfitData = profitSnap.size > 0;

    if (!hasProducts) {
      suggestions.push({
        id: "first-product",
        type: "opportunity",
        title: "Start your product research",
        description: "Search for winning products to begin your dropshipping journey.",
        action: "Find Products",
        href: "/products",
        icon: "sparkles",
        color: "text-purple-400",
        bgColor: "bg-purple-400/10 border-purple-400/20",
        timestamp: "Just now",
      });
    }

    if (!hasStores) {
      suggestions.push({
        id: "connect-store",
        type: "store",
        title: "Connect your first store",
        description: "Push products directly to Shopify, WooCommerce, or your own store.",
        action: "Connect Store",
        href: "/store",
        icon: "store",
        color: "text-cyan-400",
        bgColor: "bg-cyan-400/10 border-cyan-400/20",
        timestamp: "Today",
      });
    }

    if (hasProducts && !hasProfitData) {
      suggestions.push({
        id: "track-profit",
        type: "opportunity",
        title: "Track your profit margins",
        description: "Use the calculator to ensure every product is profitable.",
        action: "Open Calculator",
        href: "/calculator",
        icon: "dollar",
        color: "text-emerald-400",
        bgColor: "bg-emerald-400/10 border-emerald-400/20",
        timestamp: "Today",
      });
    }

  return NextResponse.json({ suggestions });
} catch {
  return NextResponse.json({ suggestions: [] });
}
}, LIMITS.AI_CHAT);
