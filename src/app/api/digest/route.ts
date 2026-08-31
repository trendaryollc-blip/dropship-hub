import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { sendDigestEmail } from "@/lib/email-digest";
import { withAuth } from "@/lib/auth";
import { DocumentData } from "firebase-admin/firestore";

interface DigestMetrics {
  orders: number;
  revenue: number;
  profit: number;
  stockAlerts: number;
  supplierDelays: number;
}

interface DigestAlert {
  type: "stock" | "supplier" | "adSpend" | "trend";
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
}

interface DigestResponse {
  date: string;
  summary: string;
  metrics: DigestMetrics;
  alerts: DigestAlert[];
  recommendations: string[];
  weeklyTrend: {
    direction: "up" | "down" | "stable";
    percentage: number;
    insight: string;
  };
}

async function fetchRealMetrics(db: Awaited<ReturnType<typeof getAdminDB>>, uid: string, digestDate: string): Promise<DigestMetrics> {
  const userRef = db.collection("users").doc(uid);
  const dayAgo = new Date(Date.now() - 86400000).toISOString();

  const [ordersSnap, profitSnap, monitoredSnap, supplierAlertsSnap] = await Promise.all([
    userRef.collection("fulfillmentOrders").where("createdAt", ">=", dayAgo).get(),
    userRef.collection("profitEntries").where("date", "==", digestDate).get(),
    userRef.collection("monitoredProducts").get(),
    userRef.collection("supplierAlerts").where("read", "==", false).get(),
  ]);

  const orders = ordersSnap.size;
  const revenue = profitSnap.docs.reduce((sum, doc) => {
    const data = doc.data() as DocumentData;
    return sum + (typeof data.revenue === "number" ? data.revenue : 0);
  }, 0);
  const profit = profitSnap.docs.reduce((sum, doc) => {
    const data = doc.data() as DocumentData;
    return sum + (typeof data.profit === "number" ? data.profit : 0);
  }, 0);

  const stockAlerts = monitoredSnap.docs.filter((doc) => {
    const data = doc.data() as DocumentData;
    return data.stockStatus === "out_of_stock";
  }).length;

  const supplierDelays = supplierAlertsSnap.size;

  return { orders, revenue: Number(revenue.toFixed(2)), profit: Number(profit.toFixed(2)), stockAlerts, supplierDelays };
}

function generateAlertsFromMetrics(metrics: DigestMetrics): DigestAlert[] {
  const alerts: DigestAlert[] = [];

  if (metrics.stockAlerts > 0) {
    alerts.push({
      type: "stock",
      title: `${metrics.stockAlerts} Out-of-Stock Product${metrics.stockAlerts > 1 ? "s" : ""}`,
      description: `${metrics.stockAlerts} monitored product${metrics.stockAlerts > 1 ? "s are" : " is"} out of stock at the supplier. Consider finding alternatives or delisting.`,
      severity: metrics.stockAlerts > 3 ? "high" : "medium",
    });
  }

  if (metrics.supplierDelays > 0) {
    alerts.push({
      type: "supplier",
      title: `${metrics.supplierDelays} Supplier Alert${metrics.supplierDelays > 1 ? "s" : ""}`,
      description: `${metrics.supplierDelays} unresolved supplier alert${metrics.supplierDelays > 1 ? "s" : ""} require${metrics.supplierDelays === 1 ? "s" : ""} attention.`,
      severity: metrics.supplierDelays > 2 ? "high" : "medium",
    });
  }

  if (metrics.orders === 0 && metrics.revenue === 0) {
    alerts.push({
      type: "trend",
      title: "No Activity Today",
      description: "No orders or revenue recorded for this period. Review your product listings and marketing strategy.",
      severity: "medium",
    });
  }

  if (metrics.revenue > 0 && metrics.profit / metrics.revenue < 0.15) {
    alerts.push({
      type: "adSpend",
      title: "Low Profit Margin",
      description: `Current margin is ${((metrics.profit / metrics.revenue) * 100).toFixed(1)}%. Consider adjusting pricing or reducing costs.`,
      severity: "medium",
    });
  }

  return alerts;
}

function generateRecommendations(metrics: DigestMetrics, alerts: DigestAlert[]): string[] {
  const recommendations: string[] = [];

  if (metrics.stockAlerts > 0) {
    recommendations.push(`Review ${metrics.stockAlerts} out-of-stock product${metrics.stockAlerts > 1 ? "s" : ""} and find alternative suppliers or delist.`);
  }

  if (metrics.orders > 0 && metrics.profit / metrics.revenue < 0.2) {
    recommendations.push("Profit margins are below 20%. Consider adjusting pricing or finding lower-cost suppliers.");
  }

  if (metrics.orders === 0) {
    recommendations.push("No orders today. Check product visibility, pricing competitiveness, and marketing campaigns.");
  }

  const highSeverityAlerts = alerts.filter((a) => a.severity === "high");
  if (highSeverityAlerts.length > 0) {
    recommendations.push(`Address ${highSeverityAlerts.length} high-severity alert${highSeverityAlerts.length > 1 ? "s" : ""} immediately.`);
  }

  if (metrics.orders > 5) {
    recommendations.push("Strong order volume — consider expanding your product range in top-performing categories.");
  }

  return recommendations;
}

async function generateAISummary(metrics: DigestMetrics, alerts: DigestAlert[], recommendations: string[]): Promise<string> {
  const alertSummary = alerts.length > 0 ? alerts.map((a) => `${a.title}: ${a.description}`).join("\n") : "No alerts.";
  const recommendationSummary = recommendations.map((r) => `- ${r}`).join("\n");

  const prompt = `Generate a concise daily business intelligence summary for a dropshipping store. Use these metrics and alerts:

Metrics:
- Orders: ${metrics.orders}
- Revenue: $${metrics.revenue}
- Profit: $${metrics.profit}
- Stock Alerts: ${metrics.stockAlerts}
- Supplier Delays: ${metrics.supplierDelays}

Alerts:
${alertSummary}

Recommendations:
${recommendationSummary}

Provide a 2-3 sentence executive summary highlighting the most important insights and actions needed.`;

  try {
    const providers = [
      { envKey: "GROQ_API_KEY", name: "Groq" },
      { envKey: "GOOGLE_AI_API_KEY", name: "Gemini" },
      { envKey: "OPENAI_API_KEY", name: "OpenAI" },
    ];

    for (const provider of providers) {
      const apiKey = process.env[provider.envKey];
      if (!apiKey) continue;

      try {
        if (provider.name === "Groq") {
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: [{ role: "system", content: "You are a dropshipping business analyst. Provide concise, actionable summaries." }, { role: "user", content: prompt }],
              temperature: 0.5,
              max_tokens: 200,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            return data.choices?.[0]?.message?.content || generateFallbackSummary(metrics);
          }
        } else if (provider.name === "Gemini") {
          const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent", {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.5, maxOutputTokens: 200 },
            }),
          });
          if (res.ok) {
            const data = await res.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || generateFallbackSummary(metrics);
          }
        } else if (provider.name === "OpenAI") {
          const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [{ role: "system", content: "You are a dropshipping business analyst. Provide concise, actionable summaries." }, { role: "user", content: prompt }],
              temperature: 0.5,
              max_tokens: 200,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            return data.choices?.[0]?.message?.content || generateFallbackSummary(metrics);
          }
        }
      } catch {
        continue;
      }
    }

    return generateFallbackSummary(metrics);
  } catch {
    return generateFallbackSummary(metrics);
  }
}

function generateFallbackSummary(metrics: DigestMetrics): string {
  const profitMargin = metrics.revenue > 0 ? ((metrics.profit / metrics.revenue) * 100).toFixed(1) : "0";
  return `Yesterday: ${metrics.orders} orders, $${metrics.revenue} revenue, $${metrics.profit} actual profit (${profitMargin}% margin). ${metrics.stockAlerts} out-of-stock products require attention. ${metrics.supplierDelays > 0 ? `${metrics.supplierDelays} supplier alert${metrics.supplierDelays > 1 ? "s" : ""} pending.` : "All suppliers operating normally."} Recommended action: Review inventory levels and address outstanding alerts.`;
}

async function computeWeeklyTrend(db: Awaited<ReturnType<typeof getAdminDB>>, uid: string): Promise<{ direction: "up" | "down" | "stable"; percentage: number; insight: string }> {
  const userRef = db.collection("users").doc(uid);

  const [thisWeekSnap, lastWeekSnap] = await Promise.all([
    userRef.collection("profitEntries").where("date", ">=", new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]).get(),
    userRef.collection("profitEntries").where("date", ">=", new Date(Date.now() - 14 * 86400000).toISOString().split("T")[0]).where("date", "<", new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0]).get(),
  ]);

  const thisWeekRevenue = thisWeekSnap.docs.reduce((sum, doc) => {
    const data = doc.data() as DocumentData;
    return sum + (typeof data.revenue === "number" ? data.revenue : 0);
  }, 0);

  const lastWeekRevenue = lastWeekSnap.docs.reduce((sum, doc) => {
    const data = doc.data() as DocumentData;
    return sum + (typeof data.revenue === "number" ? data.revenue : 0);
  }, 0);

  if (lastWeekRevenue === 0 && thisWeekRevenue === 0) {
    return { direction: "stable", percentage: 0, insight: "No revenue data for the past two weeks. Focus on driving traffic and conversions." };
  }

  if (lastWeekRevenue === 0) {
    return { direction: "up", percentage: 100, insight: `Revenue started at $${thisWeekRevenue.toFixed(0)} this week. Keep building momentum.` };
  }

  const changePercent = Math.round(((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100);

  if (changePercent > 5) {
    return { direction: "up", percentage: changePercent, insight: `Revenue trending upward (+${changePercent}%). Momentum is strong — consider scaling top performers.` };
  }
  if (changePercent < -5) {
    return { direction: "down", percentage: Math.abs(changePercent), insight: `Revenue declining (${changePercent}%). Review underperforming products and adjust strategy.` };
  }
  return { direction: "stable", percentage: Math.abs(changePercent), insight: "Revenue holding steady. Maintain current strategy while exploring new opportunities." };
}

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { date, email, notify } = await request.json();
    const digestDate = date || new Date().toISOString().split("T")[0];
    const db = await getAdminDB();

    const metrics = await fetchRealMetrics(db, uid, digestDate);
    const alerts = generateAlertsFromMetrics(metrics);
    const recommendations = generateRecommendations(metrics, alerts);
    const summary = await generateAISummary(metrics, alerts, recommendations);
    const weeklyTrend = await computeWeeklyTrend(db, uid);

    const digest: DigestResponse = {
      date: digestDate,
      summary,
      metrics,
      alerts,
      recommendations,
      weeklyTrend,
    };

    const userRef = db.collection("users").doc(uid);
    await userRef.collection("digests").doc(digestDate).set({
      ...digest,
      createdAt: new Date().toISOString(),
    });

    let emailSent = false;
    if (email) {
      emailSent = await sendDigestEmail(email, digest);
    }

    return NextResponse.json({
      ...digest,
      notifications: {
        emailSent,
        pushTriggered: notify === true,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate digest" }, { status: 500 });
  }
});

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const db = await getAdminDB();
    const userRef = db.collection("users").doc(uid);

    const url = new URL(request.url);
    const date = url.searchParams.get("date");

    if (date) {
      const doc = await userRef.collection("digests").doc(date).get();
      if (!doc.exists) {
        return NextResponse.json({ error: "No digest found for this date" }, { status: 404 });
      }
      return NextResponse.json({ digest: { id: doc.id, ...doc.data() } });
    }

    const snap = await userRef.collection("digests").orderBy("date", "desc").limit(30).get();
    const digests = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return NextResponse.json({ digests });
  } catch {
    return NextResponse.json({ error: "Failed to fetch digests" }, { status: 500 });
  }
});
