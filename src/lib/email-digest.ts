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

interface DigestData {
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

import { logger } from "@/lib/logger";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const severityColors: Record<string, string> = {
  low: "#3b82f6",
  medium: "#f59e0b",
  high: "#ef4444",
};

const typeLabels: Record<string, string> = {
  stock: "Low Stock",
  supplier: "Supplier Delay",
  adSpend: "Ad Spend",
  trend: "Market Trend",
};

function generateEmailHTML(digest: DigestData): string {
  const trendArrow = digest.weeklyTrend.direction === "up" ? "↑" : digest.weeklyTrend.direction === "down" ? "↓" : "→";
  const trendColor = digest.weeklyTrend.direction === "up" ? "#22c55e" : digest.weeklyTrend.direction === "down" ? "#ef4444" : "#f59e0b";

  const alertsHTML = digest.alerts.map((alert) => `
    <tr>
      <td style="padding:12px;border-bottom:1px solid #1f2937;">
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${severityColors[alert.severity]};"></span>
          <span style="color:#f3f4f6;font-size:14px;font-weight:600;">${escapeHtml(alert.title)}</span>
          <span style="color:#9ca3af;font-size:11px;background:#374151;padding:2px 6px;border-radius:4px;">${typeLabels[alert.type]}</span>
        </div>
        <p style="color:#9ca3af;font-size:13px;margin:6px 0 0 16px;">${escapeHtml(alert.description)}</p>
      </td>
    </tr>
  `).join("");

  const recommendationsHTML = digest.recommendations.map((rec) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #1f2937;">
        <div style="display:flex;align-items:flex-start;gap:8px;">
          <span style="color:#a78bfa;font-size:14px;">⚡</span>
          <span style="color:#d1d5db;font-size:13px;line-height:1.5;">${escapeHtml(rec)}</span>
        </div>
      </td>
    </tr>
  `).join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:24px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#f3f4f6;font-size:24px;margin:0;">🧠 Daily Intelligence Digest</h1>
      <p style="color:#6b7280;font-size:13px;margin:8px 0 0;">${new Date(digest.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
    </div>

    <!-- Summary -->
    <div style="background:#111827;border:1px solid #1f2937;border-radius:12px;padding:20px;margin-bottom:24px;">
      <h2 style="color:#a78bfa;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">AI Summary</h2>
      <p style="color:#d1d5db;font-size:14px;line-height:1.6;margin:0;">${escapeHtml(digest.summary)}</p>
    </div>

    <!-- Metrics -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px;">
      <div style="background:#111827;border:1px solid #1f2937;border-radius:12px;padding:16px;text-align:center;">
        <p style="color:#6b7280;font-size:11px;margin:0;text-transform:uppercase;">Orders</p>
        <p style="color:#3b82f6;font-size:24px;font-weight:700;margin:4px 0 0;">${digest.metrics.orders}</p>
      </div>
      <div style="background:#111827;border:1px solid #1f2937;border-radius:12px;padding:16px;text-align:center;">
        <p style="color:#6b7280;font-size:11px;margin:0;text-transform:uppercase;">Revenue</p>
        <p style="color:#22c55e;font-size:24px;font-weight:700;margin:4px 0 0;">$${digest.metrics.revenue.toLocaleString()}</p>
      </div>
      <div style="background:#111827;border:1px solid #1f2937;border-radius:12px;padding:16px;text-align:center;">
        <p style="color:#6b7280;font-size:11px;margin:0;text-transform:uppercase;">Profit</p>
        <p style="color:#f59e0b;font-size:24px;font-weight:700;margin:4px 0 0;">$${digest.metrics.profit.toLocaleString()}</p>
      </div>
    </div>

    <!-- Weekly Trend -->
    <div style="background:#111827;border:1px solid #1f2937;border-radius:12px;padding:16px;margin-bottom:24px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:20px;color:${trendColor};">${trendArrow}</span>
        <div>
          <span style="color:${trendColor};font-size:18px;font-weight:700;">${digest.weeklyTrend.direction === "up" ? "+" : ""}${digest.weeklyTrend.percentage}%</span>
          <span style="color:#6b7280;font-size:12px;margin-left:6px;">vs last week</span>
        </div>
      </div>
      <p style="color:#9ca3af;font-size:13px;margin:8px 0 0;line-height:1.5;">${escapeHtml(digest.weeklyTrend.insight)}</p>
    </div>

    ${digest.alerts.length > 0 ? `
    <!-- Alerts -->
    <div style="margin-bottom:24px;">
      <h2 style="color:#f59e0b;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">⚠️ Proactive Alerts (${digest.alerts.length})</h2>
      <table style="width:100%;border-collapse:collapse;background:#111827;border:1px solid #1f2937;border-radius:12px;overflow:hidden;">
        ${alertsHTML}
      </table>
    </div>
    ` : ""}

    <!-- Recommendations -->
    <div style="margin-bottom:24px;">
      <h2 style="color:#a78bfa;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">🎯 Suggested Actions</h2>
      <table style="width:100%;border-collapse:collapse;background:#111827;border:1px solid #1f2937;border-radius:12px;overflow:hidden;">
        ${recommendationsHTML}
      </table>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:24px 0;border-top:1px solid #1f2937;">
      <p style="color:#4b5563;font-size:12px;margin:0;">Generated by DropShip Hub Intelligence Engine</p>
      <p style="color:#374151;font-size:11px;margin:8px 0 0;">Unsubscribe from daily digests in Settings → Digest Preferences</p>
    </div>

  </div>
</body>
</html>
  `.trim();
}

export async function sendDigestEmail(to: string, digest: DigestData): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.error("RESEND_API_KEY not configured");
    return false;
  }

  try {
    const html = generateEmailHTML(digest);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "DropShip Hub <onboarding@resend.dev>",
        to: [to],
        subject: `🧠 Daily Digest — ${new Date(digest.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      logger.error("Resend error", { error: typeof err === "string" ? err : JSON.stringify(err) });
      return false;
    }

    return true;
  } catch (err) {
    logger.error("Email send failed", { error: err instanceof Error ? err.message : String(err) });
    return false;
  }
}
