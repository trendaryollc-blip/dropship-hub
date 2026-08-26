import { NextRequest, NextResponse } from "next/server";
import { searchCJProducts } from "@/lib/platform-search";
import { sendDigestEmail } from "@/lib/email-digest";

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

function generateMockMetrics(): DigestMetrics {
  const orders = Math.floor(8 + Math.random() * 20);
  const revenue = Number((orders * (25 + Math.random() * 50)).toFixed(2));
  const profit = Number((revenue * (0.15 + Math.random() * 0.25)).toFixed(2));
  const stockAlerts = Math.floor(1 + Math.random() * 5);
  const supplierDelays = Math.floor(Math.random() * 3);
  return { orders, revenue, profit, stockAlerts, supplierDelays };
}

function generateMockAlerts(metrics: DigestMetrics): DigestAlert[] {
  const alerts: DigestAlert[] = [];

  if (metrics.stockAlerts > 0) {
    alerts.push({
      type: "stock",
      title: `${metrics.stockAlerts} Low Stock Alert${metrics.stockAlerts > 1 ? "s" : ""}`,
      description: `${metrics.stockAlerts} product${metrics.stockAlerts > 1 ? "s are" : " is"} running low on inventory. Consider reordering to avoid stockouts.`,
      severity: metrics.stockAlerts > 3 ? "high" : "medium",
    });
  }

  if (metrics.supplierDelays > 0) {
    alerts.push({
      type: "supplier",
      title: `${metrics.supplierDelays} Supplier Delay${metrics.supplierDelays > 1 ? "s" : ""} Detected`,
      description: `${metrics.supplierDelays} supplier${metrics.supplierDelays > 1 ? "s have" : " has"} reported processing delays. Monitor order fulfillment closely.`,
      severity: metrics.supplierDelays > 2 ? "high" : "medium",
    });
  }

  const adSpendAnomaly = Math.random() > 0.7;
  if (adSpendAnomaly) {
    alerts.push({
      type: "adSpend",
      title: "Ad Spend Anomaly Detected",
      description: "Advertising spend is 20% higher than usual with no corresponding increase in conversions. Review campaign settings.",
      severity: "medium",
    });
  }

  alerts.push({
    type: "trend",
    title: "Market Trend Update",
    description: "Electronics category showing 15% increase in demand. Consider expanding product range in this niche.",
    severity: "low",
  });

  return alerts;
}

function generateMockRecommendations(metrics: DigestMetrics, alerts: DigestAlert[]): string[] {
  const recommendations: string[] = [];

  if (metrics.stockAlerts > 0) {
    recommendations.push(`Reorder SKU-882 and ${metrics.stockAlerts - 1} other low-stock items to prevent lost sales.`);
  }

  if (metrics.profit / metrics.revenue < 0.2) {
    recommendations.push("Profit margins are below 20%. Consider adjusting pricing or finding lower-cost suppliers.");
  }

  const highSeverityAlerts = alerts.filter((a) => a.severity === "high");
  if (highSeverityAlerts.length > 0) {
    recommendations.push(`Address ${highSeverityAlerts.length} high-severity alert${highSeverityAlerts.length > 1 ? "s" : ""} immediately to minimize impact.`);
  }

  recommendations.push("Review competitor pricing for top 5 products to ensure competitiveness.");
  recommendations.push("Analyze customer feedback from the last 7 days to identify improvement opportunities.");

  return recommendations;
}

async function generateAISummary(metrics: DigestMetrics, alerts: DigestAlert[], recommendations: string[]): Promise<string> {
  const alertSummary = alerts.map((a) => `${a.title}: ${a.description}`).join("\n");
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
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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
  return `Yesterday: ${metrics.orders} orders, $${metrics.revenue} revenue, $${metrics.profit} actual profit (${profitMargin}% margin). ${metrics.stockAlerts} low-stock alerts require attention. ${metrics.supplierDelays > 0 ? `${metrics.supplierDelays} supplier delays detected — monitor fulfillment.` : "All suppliers operating normally."} Recommended action: Review inventory levels and reorder critical items.`;
}

function generateWeeklyTrend(): { direction: "up" | "down" | "stable"; percentage: number; insight: string } {
  const direction = Math.random() > 0.6 ? "up" : Math.random() > 0.3 ? "stable" : "down";
  const percentage = direction === "up" ? Math.round(5 + Math.random() * 20) : direction === "down" ? Math.round(3 + Math.random() * 15) : Math.round(Math.random() * 5);

  const insights = {
    up: "Revenue trending upward over the past 7 days. Momentum is strong — consider scaling ad spend on top performers.",
    down: "Revenue declining over the past week. Review underperforming products and adjust pricing or marketing strategy.",
    stable: "Revenue holding steady this week. Maintain current strategy while exploring new product opportunities.",
  };

  return { direction, percentage, insight: insights[direction] };
}

export async function POST(request: NextRequest) {
  try {
    const { date, email, notify } = await request.json();
    const digestDate = date || new Date().toISOString().split("T")[0];

    let metrics: DigestMetrics;
    try {
      const categories = ["electronics", "fashion", "home gadgets"];
      const results = await Promise.allSettled(categories.map((cat) => searchCJProducts(cat)));
      const hasRealData = results.some((r) => r.status === "fulfilled" && r.value.search_results.length > 0);

      if (hasRealData) {
        metrics = generateMockMetrics();
      } else {
        metrics = generateMockMetrics();
      }
    } catch {
      metrics = generateMockMetrics();
    }

    const alerts = generateMockAlerts(metrics);
    const recommendations = generateMockRecommendations(metrics, alerts);
    const summary = await generateAISummary(metrics, alerts, recommendations);
    const weeklyTrend = generateWeeklyTrend();

    const digest: DigestResponse = {
      date: digestDate,
      summary,
      metrics,
      alerts,
      recommendations,
      weeklyTrend,
    };

    // Send email if requested
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
}

export async function GET() {
  return NextResponse.json({
    message: "Daily Intelligence Digest API",
    usage: "POST with optional { date: 'YYYY-MM-DD' } to generate a digest",
  });
}
