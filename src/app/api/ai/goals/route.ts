import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { DocumentData } from "firebase-admin/firestore";

interface BusinessGoal {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  category: string;
  deadline: string;
  progress: number;
  status: "on-track" | "behind" | "achieved" | "at-risk";
  aiInsight: string;
}

interface GoalsResult {
  goals: BusinessGoal[];
  summary: {
    totalGoals: number;
    achieved: number;
    onTrack: number;
    behind: number;
    overallProgress: number;
  };
  suggestions: string[];
  generatedAt: string;
}

function safeNum(val: unknown, fallback = 0): number {
  return typeof val === "number" ? val : fallback;
}

function safeStr(val: unknown, fallback = ""): string {
  return typeof val === "string" ? val : fallback;
}

function computeGoalsFromData(
  revenue: DocumentData[],
  products: DocumentData[],
  profit: DocumentData[],
  csConversations: DocumentData[],
): BusinessGoal[] {
  const goals: BusinessGoal[] = [];
  const today = new Date();
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const daysLeft = Math.ceil((endOfMonth.getTime() - today.getTime()) / 86400000);

  // Revenue goal
  const monthRevenue = revenue
    .filter((e) => {
      const d = safeStr(e.date);
      return d && d >= `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
    })
    .reduce((s, e) => s + safeNum(e.amount), 0);

  const revenueTarget = Math.max(monthRevenue * 1.3, 1000); // 30% growth or min $1000
  const revenueProgress = Math.min(100, +((monthRevenue / revenueTarget) * 100).toFixed(0));
  const revenueStatus: BusinessGoal["status"] = revenueProgress >= 80 ? "on-track" : revenueProgress >= 50 ? "behind" : "at-risk";

  goals.push({
    id: "goal-revenue",
    title: "Monthly Revenue Target",
    target: +revenueTarget.toFixed(0),
    current: +monthRevenue.toFixed(0),
    unit: "$",
    category: "revenue",
    deadline: endOfMonth.toISOString().split("T")[0],
    progress: revenueProgress,
    status: revenueStatus,
    aiInsight: revenueStatus === "on-track"
      ? `Great progress! You're at ${revenueProgress}% of your target with ${daysLeft} days left.`
      : `You need $${(revenueTarget - monthRevenue).toFixed(0)} more in ${daysLeft} days. Consider running promotions or increasing ad spend.`,
  });

  // Profit margin goal
  const totalProfit = profit.reduce((s, e) => s + safeNum(e.netProfit), 0);
  const totalRevenue = profit.reduce((s, e) => s + safeNum(e.revenue), 0);
  const currentMargin = totalRevenue > 0 ? +((totalProfit / totalRevenue) * 100).toFixed(1) : 0;
  const marginTarget = 25;
  const marginProgress = Math.min(100, +((currentMargin / marginTarget) * 100).toFixed(0));

  goals.push({
    id: "goal-margin",
    title: "Profit Margin Target",
    target: marginTarget,
    current: currentMargin,
    unit: "%",
    category: "profitability",
    deadline: endOfMonth.toISOString().split("T")[0],
    progress: marginProgress,
    status: marginProgress >= 80 ? "on-track" : marginProgress >= 60 ? "behind" : "at-risk",
    aiInsight: currentMargin >= marginTarget
      ? `Excellent! Your ${currentMargin}% margin meets the ${marginTarget}% target.`
      : `At ${currentMargin}% margin, you're ${marginTarget - currentMargin} points below target. Review pricing and costs.`,
  });

  // Product portfolio goal
  const activeProducts = products.filter((p) => {
    const stage = safeStr(p.currentStage);
    return stage === "winning" || stage === "scaling";
  }).length;

  const productTarget = 5;
  const productProgress = Math.min(100, +((activeProducts / productTarget) * 100).toFixed(0));

  goals.push({
    id: "goal-products",
    title: "Active Product Portfolio",
    target: productTarget,
    current: activeProducts,
    unit: "products",
    category: "products",
    deadline: endOfMonth.toISOString().split("T")[0],
    progress: productProgress,
    status: productProgress >= 80 ? "on-track" : productProgress >= 50 ? "behind" : "at-risk",
    aiInsight: activeProducts >= productTarget
      ? `Strong portfolio with ${activeProducts} active products. Focus on scaling the best performers.`
      : `You have ${activeProducts} active products. Add ${productTarget - activeProducts} more to diversify risk.`,
  });

  // CS resolution goal
  const totalCS = csConversations.length;
  const resolvedCS = csConversations.filter((c) => safeStr(c.status) === "resolved").length;
  const resolutionRate = totalCS > 0 ? +((resolvedCS / totalCS) * 100).toFixed(0) : 0;
  const csTarget = 80;

  goals.push({
    id: "goal-cs",
    title: "Customer Satisfaction Rate",
    target: csTarget,
    current: resolutionRate,
    unit: "%",
    category: "customer-service",
    deadline: endOfMonth.toISOString().split("T")[0],
    progress: Math.min(100, +((resolutionRate / csTarget) * 100).toFixed(0)),
    status: resolutionRate >= csTarget ? "achieved" : resolutionRate >= csTarget * 0.7 ? "on-track" : "behind",
    aiInsight: resolutionRate >= csTarget
      ? `${resolutionRate}% resolution rate — excellent customer service!`
      : `At ${resolutionRate}% resolution, focus on faster responses and better templates.`,
  });

  return goals;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { uid } = body;

    if (!uid) {
      return NextResponse.json({ error: "uid is required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const userRef = db.collection("users").doc(uid);

    const [revenueSnap, productsSnap, profitSnap, csSnap] = await Promise.all([
      userRef.collection("revenue").orderBy("createdAt", "desc").limit(60).get(),
      userRef.collection("productLifecycle").limit(20).get(),
      userRef.collection("profitEntries").orderBy("createdAt", "desc").limit(60).get(),
      userRef.collection("csConversations").limit(30).get(),
    ]);

    const revenue = revenueSnap.docs.map((d) => d.data() as DocumentData);
    const products = productsSnap.docs.map((d) => d.data() as DocumentData);
    const profit = profitSnap.docs.map((d) => d.data() as DocumentData);
    const csConversations = csSnap.docs.map((d) => d.data() as DocumentData);

    const goals = computeGoalsFromData(revenue, products, profit, csConversations);

    const achieved = goals.filter((g) => g.status === "achieved").length;
    const onTrack = goals.filter((g) => g.status === "on-track").length;
    const behind = goals.filter((g) => g.status === "behind" || g.status === "at-risk").length;
    const overallProgress = goals.length > 0
      ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length)
      : 0;

    const suggestions: string[] = [];
    if (behind > 0) suggestions.push(`You have ${behind} goal${behind > 1 ? "s" : ""} falling behind — review and adjust your strategy.`);
    if (achieved > 0) suggestions.push(`Amazing! ${achieved} goal${achieved > 1 ? "s" : ""} already achieved. Set new stretch goals.`);
    if (overallProgress >= 70) suggestions.push(`Overall progress is strong at ${overallProgress}%. Keep the momentum going.`);
    if (overallProgress < 50) suggestions.push(`At ${overallProgress}% overall progress, focus on the highest-impact goals first.`);

    return NextResponse.json({
      goals,
      summary: { totalGoals: goals.length, achieved, onTrack, behind, overallProgress },
      suggestions,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to compute goals", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
