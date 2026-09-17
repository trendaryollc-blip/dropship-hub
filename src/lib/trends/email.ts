import { Resend } from "resend";
import type { TrendPrediction, RisingStar, TrendAlert } from "@/types/trend-predictor";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.EMAIL_FROM || "Dropship Hub <trends@dropshiphub.app>";

interface TrendEmailData {
  predictions: TrendPrediction[];
  risingStars: RisingStar[];
  alerts: TrendAlert[];
  accuracyStats?: {
    overallAccuracy: number;
    directionAccuracy: number;
    totalPredictions: number;
  };
}

function buildDigestHTML(data: TrendEmailData): string {
  const predictionRows = data.predictions.slice(0, 5).map((p) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #333;font-size:14px;color:#fff;">${p.productIdea}</td>
      <td style="padding:8px;border-bottom:1px solid #333;font-size:14px;color:${p.direction === "rising" ? "#22c55e" : p.direction === "peaking" ? "#f59e0b" : "#ef4444"};">${p.direction}</td>
      <td style="padding:8px;border-bottom:1px solid #333;font-size:14px;color:#fff;">${p.trendScore}%</td>
      <td style="padding:8px;border-bottom:1px solid #333;font-size:14px;color:#22c55e;">${p.estimatedMargin}%</td>
      <td style="padding:8px;border-bottom:1px solid #333;font-size:14px;color:#fff;">${p.timeToPeak}</td>
    </tr>
  `).join("");

  const risingStarRows = data.risingStars.slice(0, 5).map((rs) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #333;font-size:14px;color:#fff;">${rs.productKeyword}</td>
      <td style="padding:8px;border-bottom:1px solid #333;font-size:14px;color:#a855f7;">${rs.status}</td>
      <td style="padding:8px;border-bottom:1px solid #333;font-size:14px;color:#fff;">${rs.growthVelocity.toFixed(0)}%</td>
      <td style="padding:8px;border-bottom:1px solid #333;font-size:14px;color:#22c55e;">${rs.opportunityScore}%</td>
    </tr>
  `).join("");

  const alertRows = data.alerts.slice(0, 5).map((a) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #333;font-size:14px;color:${a.severity === "critical" ? "#ef4444" : a.severity === "warning" ? "#f59e0b" : "#3b82f6"};">${a.title}</td>
      <td style="padding:8px;border-bottom:1px solid #333;font-size:14px;color:#aaa;">${a.message}</td>
    </tr>
  `).join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="text-align:center;padding:20px 0;border-bottom:1px solid #333;">
      <h1 style="color:#fff;font-size:24px;margin:0;">Trend Predictor Digest</h1>
      <p style="color:#888;font-size:12px;margin:5px 0 0;">${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
    </div>

    ${data.accuracyStats ? `
    <div style="background:#1a1a1a;border-radius:12px;padding:16px;margin:16px 0;">
      <h2 style="color:#fff;font-size:16px;margin:0 0 12px;">Accuracy Stats</h2>
      <div style="display:flex;gap:16px;">
        <div style="flex:1;text-align:center;">
          <div style="font-size:24px;font-weight:bold;color:#22c55e;">${data.accuracyStats.overallAccuracy}%</div>
          <div style="font-size:11px;color:#888;">Overall</div>
        </div>
        <div style="flex:1;text-align:center;">
          <div style="font-size:24px;font-weight:bold;color:#3b82f6;">${data.accuracyStats.directionAccuracy}%</div>
          <div style="font-size:11px;color:#888;">Direction</div>
        </div>
        <div style="flex:1;text-align:center;">
          <div style="font-size:24px;font-weight:bold;color:#a855f7;">${data.accuracyStats.totalPredictions}</div>
          <div style="font-size:11px;color:#888;">Predictions</div>
        </div>
      </div>
    </div>
    ` : ""}

    ${data.predictions.length > 0 ? `
    <div style="background:#1a1a1a;border-radius:12px;padding:16px;margin:16px 0;">
      <h2 style="color:#fff;font-size:16px;margin:0 0 12px;">Top Predictions</h2>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="padding:8px;text-align:left;font-size:11px;color:#888;border-bottom:1px solid #333;">Keyword</th>
            <th style="padding:8px;text-align:left;font-size:11px;color:#888;border-bottom:1px solid #333;">Direction</th>
            <th style="padding:8px;text-align:left;font-size:11px;color:#888;border-bottom:1px solid #333;">Score</th>
            <th style="padding:8px;text-align:left;font-size:11px;color:#888;border-bottom:1px solid #333;">Margin</th>
            <th style="padding:8px;text-align:left;font-size:11px;color:#888;border-bottom:1px solid #333;">Peak</th>
          </tr>
        </thead>
        <tbody>${predictionRows}</tbody>
      </table>
    </div>
    ` : ""}

    ${data.risingStars.length > 0 ? `
    <div style="background:#1a1a1a;border-radius:12px;padding:16px;margin:16px 0;">
      <h2 style="color:#fff;font-size:16px;margin:0 0 12px;">Rising Stars</h2>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="padding:8px;text-align:left;font-size:11px;color:#888;border-bottom:1px solid #333;">Keyword</th>
            <th style="padding:8px;text-align:left;font-size:11px;color:#888;border-bottom:1px solid #333;">Status</th>
            <th style="padding:8px;text-align:left;font-size:11px;color:#888;border-bottom:1px solid #333;">Velocity</th>
            <th style="padding:8px;text-align:left;font-size:11px;color:#888;border-bottom:1px solid #333;">Opportunity</th>
          </tr>
        </thead>
        <tbody>${risingStarRows}</tbody>
      </table>
    </div>
    ` : ""}

    ${data.alerts.length > 0 ? `
    <div style="background:#1a1a1a;border-radius:12px;padding:16px;margin:16px 0;">
      <h2 style="color:#fff;font-size:16px;margin:0 0 12px;">Alerts</h2>
      <table style="width:100%;border-collapse:collapse;">
        <tbody>${alertRows}</tbody>
      </table>
    </div>
    ` : ""}

    <div style="text-align:center;padding:20px 0;border-top:1px solid #333;margin-top:16px;">
      <p style="color:#888;font-size:11px;margin:0;">Sent by Dropship Hub Trend Predictor</p>
      <p style="color:#666;font-size:10px;margin:4px 0 0;">Unsubscribe from daily digests in your notification settings</p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendTrendDigest(
  toEmail: string,
  data: TrendEmailData
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    return { success: false, error: "Resend API not configured" };
  }

  try {
    const hasContent = data.predictions.length > 0 || data.risingStars.length > 0 || data.alerts.length > 0;
    if (!hasContent) {
      return { success: true };
    }

    const subject = `Trend Digest: ${data.predictions.length} predictions, ${data.risingStars.length} rising stars`;

    await resend.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject,
      html: buildDigestHTML(data),
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to send email" };
  }
}

export async function sendAlertEmail(
  toEmail: string,
  alert: TrendAlert
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    return { success: false, error: "Resend API not configured" };
  }

  try {
    const severityColor = alert.severity === "critical" ? "#ef4444" : alert.severity === "warning" ? "#f59e0b" : "#3b82f6";

    await resend.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject: `[Trend Alert] ${alert.title}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="background:#1a1a1a;border-radius:12px;padding:20px;border-left:4px solid ${severityColor};">
      <h2 style="color:#fff;font-size:18px;margin:0 0 8px;">${alert.title}</h2>
      <p style="color:#aaa;font-size:14px;margin:0 0 12px;">${alert.message}</p>
      ${alert.keyword ? `<p style="color:#888;font-size:12px;margin:0;">Keyword: <span style="color:#fff;">${alert.keyword}</span></p>` : ""}
      <p style="color:#666;font-size:11px;margin:12px 0 0;">${new Date().toLocaleString()}</p>
    </div>
    <div style="text-align:center;padding:16px 0;">
      <p style="color:#888;font-size:11px;margin:0;">Dropship Hub Trend Predictor</p>
    </div>
  </div>
</body>
</html>`,
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to send alert email" };
  }
}

export async function sendWeeklyReport(
  toEmail: string,
  data: TrendEmailData & {
    weekStart: string;
    weekEnd: string;
    topPerformers: { keyword: string; accuracy: number }[];
  }
): Promise<{ success: boolean; error?: string }> {
  if (!resend) {
    return { success: false, error: "Resend API not configured" };
  }

  try {
    const performerRows = data.topPerformers.slice(0, 5).map((p) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #333;font-size:14px;color:#fff;">${p.keyword}</td>
        <td style="padding:8px;border-bottom:1px solid #333;font-size:14px;color:#22c55e;">${p.accuracy}%</td>
      </tr>
    `).join("");

    await resend.emails.send({
      from: FROM_EMAIL,
      to: toEmail,
      subject: `Weekly Trend Report: ${data.weekStart} - ${data.weekEnd}`,
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">
    <div style="text-align:center;padding:20px 0;border-bottom:1px solid #333;">
      <h1 style="color:#fff;font-size:24px;margin:0;">Weekly Trend Report</h1>
      <p style="color:#888;font-size:12px;margin:5px 0 0;">${data.weekStart} - ${data.weekEnd}</p>
    </div>

    ${data.accuracyStats ? `
    <div style="background:#1a1a1a;border-radius:12px;padding:16px;margin:16px 0;text-align:center;">
      <div style="font-size:36px;font-weight:bold;color:#22c55e;">${data.accuracyStats.overallAccuracy}%</div>
      <div style="color:#888;font-size:12px;">Prediction Accuracy This Week</div>
    </div>
    ` : ""}

    ${data.topPerformers.length > 0 ? `
    <div style="background:#1a1a1a;border-radius:12px;padding:16px;margin:16px 0;">
      <h2 style="color:#fff;font-size:16px;margin:0 0 12px;">Top Performers</h2>
      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <th style="padding:8px;text-align:left;font-size:11px;color:#888;border-bottom:1px solid #333;">Keyword</th>
            <th style="padding:8px;text-align:left;font-size:11px;color:#888;border-bottom:1px solid #333;">Accuracy</th>
          </tr>
        </thead>
        <tbody>${performerRows}</tbody>
      </table>
    </div>
    ` : ""}

    <div style="text-align:center;padding:20px 0;border-top:1px solid #333;margin-top:16px;">
      <p style="color:#888;font-size:11px;margin:0;">Dropship Hub Trend Predictor</p>
    </div>
  </div>
</body>
</html>`,
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to send weekly report" };
  }
}
