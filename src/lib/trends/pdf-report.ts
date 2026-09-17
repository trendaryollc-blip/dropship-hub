import type { TrendPrediction, RisingStar } from "@/types/trend-predictor";

interface PDFSection {
  title: string;
  content: string;
  type?: "text" | "table" | "chart";
}

interface PDFReportData {
  title: string;
  subtitle?: string;
  sections: PDFSection[];
  predictions?: TrendPrediction[];
  risingStars?: RisingStar[];
  accuracyStats?: {
    overallAccuracy: number;
    directionAccuracy: number;
    peakAccuracy: number;
    totalPredictions: number;
  };
  generatedAt: string;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildPredictionTable(predictions: TrendPrediction[]): string {
  if (predictions.length === 0) return "";

  const rows = predictions.map((p) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee;font-size:12px;">${escapeHtml(p.productIdea)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;font-size:12px;text-align:center;">${escapeHtml(p.direction)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;font-size:12px;text-align:center;font-weight:bold;">${p.trendScore}%</td>
      <td style="padding:8px;border-bottom:1px solid #eee;font-size:12px;text-align:center;">${p.confidence}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;font-size:12px;text-align:center;">${escapeHtml(p.timeToPeak)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;font-size:12px;text-align:center;color:#16a34a;">${p.estimatedMargin}%</td>
      <td style="padding:8px;border-bottom:1px solid #eee;font-size:12px;text-align:center;">${escapeHtml(p.competitionLevel.replace("_", " "))}</td>
    </tr>
  `).join("");

  return `
    <table style="width:100%;border-collapse:collapse;margin:8px 0;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="padding:8px;text-align:left;font-size:11px;color:#666;border-bottom:2px solid #ddd;">Keyword</th>
          <th style="padding:8px;text-align:center;font-size:11px;color:#666;border-bottom:2px solid #ddd;">Direction</th>
          <th style="padding:8px;text-align:center;font-size:11px;color:#666;border-bottom:2px solid #ddd;">Score</th>
          <th style="padding:8px;text-align:center;font-size:11px;color:#666;border-bottom:2px solid #ddd;">Confidence</th>
          <th style="padding:8px;text-align:center;font-size:11px;color:#666;border-bottom:2px solid #ddd;">Peak</th>
          <th style="padding:8px;text-align:center;font-size:11px;color:#666;border-bottom:2px solid #ddd;">Margin</th>
          <th style="padding:8px;text-align:center;font-size:11px;color:#666;border-bottom:2px solid #ddd;">Competition</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function buildRisingStarsTable(stars: RisingStar[]): string {
  if (stars.length === 0) return "";

  const rows = stars.map((s) => `
    <tr>
      <td style="padding:8px;border-bottom:1px solid #eee;font-size:12px;">${escapeHtml(s.productKeyword)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;font-size:12px;">${escapeHtml(s.category)}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;font-size:12px;text-align:center;color:#a855f7;">${s.status}</td>
      <td style="padding:8px;border-bottom:1px solid #eee;font-size:12px;text-align:center;">${s.growthVelocity.toFixed(0)}%</td>
      <td style="padding:8px;border-bottom:1px solid #eee;font-size:12px;text-align:center;color:#16a34a;">${s.opportunityScore}%</td>
    </tr>
  `).join("");

  return `
    <table style="width:100%;border-collapse:collapse;margin:8px 0;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="padding:8px;text-align:left;font-size:11px;color:#666;border-bottom:2px solid #ddd;">Keyword</th>
          <th style="padding:8px;text-align:left;font-size:11px;color:#666;border-bottom:2px solid #ddd;">Category</th>
          <th style="padding:8px;text-align:center;font-size:11px;color:#666;border-bottom:2px solid #ddd;">Status</th>
          <th style="padding:8px;text-align:center;font-size:11px;color:#666;border-bottom:2px solid #ddd;">Velocity</th>
          <th style="padding:8px;text-align:center;font-size:11px;color:#666;border-bottom:2px solid #ddd;">Opportunity</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

function buildAccuracySection(stats: PDFReportData["accuracyStats"]): string {
  if (!stats) return "";

  return `
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:12px 0;">
      <h3 style="margin:0 0 12px;font-size:14px;color:#166534;">Prediction Accuracy</h3>
      <div style="display:flex;gap:24px;">
        <div style="text-align:center;">
          <div style="font-size:28px;font-weight:bold;color:#16a34a;">${stats.overallAccuracy}%</div>
          <div style="font-size:11px;color:#666;">Overall</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:28px;font-weight:bold;color:#2563eb;">${stats.directionAccuracy}%</div>
          <div style="font-size:11px;color:#666;">Direction</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:28px;font-weight:bold;color:#9333ea;">${stats.peakAccuracy}%</div>
          <div style="font-size:11px;color:#666;">Peak Timing</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:28px;font-weight:bold;color:#ea580c;">${stats.totalPredictions}</div>
          <div style="font-size:11px;color:#666;">Total</div>
        </div>
      </div>
    </div>`;
}

export function generatePDFHTML(data: PDFReportData): string {
  const sections = data.sections.map((section) => `
    <div style="margin:16px 0;">
      <h2 style="font-size:16px;color:#111;border-bottom:2px solid #e5e7eb;padding-bottom:6px;margin:0 0 8px;">${escapeHtml(section.title)}</h2>
      <p style="font-size:13px;color:#444;line-height:1.6;margin:0;">${escapeHtml(section.content)}</p>
    </div>
  `).join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(data.title)}</title>
  <style>
    @page { margin: 40px; size: A4; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111; line-height: 1.5; }
    * { box-sizing: border-box; }
  </style>
</head>
<body>
  <div style="max-width:100%;padding:0;">
    <div style="text-align:center;padding:20px 0;border-bottom:3px solid #111;margin-bottom:20px;">
      <h1 style="font-size:28px;margin:0;color:#111;">${escapeHtml(data.title)}</h1>
      ${data.subtitle ? `<p style="font-size:14px;color:#666;margin:6px 0 0;">${escapeHtml(data.subtitle)}</p>` : ""}
      <p style="font-size:11px;color:#999;margin:4px 0 0;">Generated ${data.generatedAt}</p>
    </div>

    ${data.accuracyStats ? buildAccuracySection(data.accuracyStats) : ""}

    ${data.predictions && data.predictions.length > 0 ? `
    <div style="margin:16px 0;">
      <h2 style="font-size:16px;color:#111;border-bottom:2px solid #e5e7eb;padding-bottom:6px;margin:0 0 8px;">Trend Predictions</h2>
      ${buildPredictionTable(data.predictions)}
    </div>
    ` : ""}

    ${data.risingStars && data.risingStars.length > 0 ? `
    <div style="margin:16px 0;">
      <h2 style="font-size:16px;color:#111;border-bottom:2px solid #e5e7eb;padding-bottom:6px;margin:0 0 8px;">Rising Stars</h2>
      ${buildRisingStarsTable(data.risingStars)}
    </div>
    ` : ""}

    ${sections}

    <div style="margin-top:40px;padding-top:16px;border-top:1px solid #ddd;text-align:center;">
      <p style="font-size:10px;color:#999;margin:0;">Dropship Hub Trend Predictor Report</p>
    </div>
  </div>
</body>
</html>`;
}

export function downloadPDFHTML(html: string, filename: string): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.onload = () => {
    printWindow.print();
  };
}

export function createReportData(options: {
  title?: string;
  predictions?: TrendPrediction[];
  risingStars?: RisingStar[];
  accuracyStats?: PDFReportData["accuracyStats"];
}): PDFReportData {
  const now = new Date();
  return {
    title: options.title || "Trend Predictor Report",
    subtitle: `Comprehensive trend analysis report`,
    generatedAt: now.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    predictions: options.predictions || [],
    risingStars: options.risingStars || [],
    accuracyStats: options.accuracyStats,
    sections: [
      {
        title: "Executive Summary",
        content: `This report contains ${options.predictions?.length || 0} trend predictions and ${(options.risingStars?.length || 0)} rising star opportunities identified by the AI Trend Predictor. All predictions are based on multi-source data aggregation from Google Trends, Amazon, TikTok, Instagram, and Reddit.`,
      },
    ],
  };
}
