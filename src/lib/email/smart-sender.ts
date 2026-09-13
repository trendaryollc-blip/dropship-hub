import { sendWithResend, isResendAvailable, type SendEmailInput } from "./resend-client";
import { sendWithSendGrid, isSendGridAvailable } from "./sendgrid-client";

export interface SmartSendResult {
  success: boolean;
  provider: "resend" | "sendgrid";
  messageId?: string;
  error?: string;
}

function isRateLimitError(error: string | undefined): boolean {
  if (!error) return false;
  const lower = error.toLowerCase();
  return (
    lower.includes("rate_limit") ||
    lower.includes("quota") ||
    lower.includes("too many") ||
    lower.includes("429") ||
    lower.includes("daily limit") ||
    lower.includes("monthly limit")
  );
}

export async function smartSendEmail(input: SendEmailInput): Promise<SmartSendResult> {
  const resendAvailable = isResendAvailable();
  const sendgridAvailable = isSendGridAvailable();

  if (!resendAvailable && !sendgridAvailable) {
    console.error("[email] No email provider configured. Set RESEND_API_KEY or SENDGRID_API_KEY.");
    return { success: false, provider: "resend", error: "No email provider configured" };
  }

  if (resendAvailable) {
    const result = await sendWithResend(input);
    if (result.success) {
      return { success: true, provider: "resend", messageId: result.messageId };
    }

    if (isRateLimitError(result.error)) {
      console.warn("[email] Resend rate limited, falling back to SendGrid");
      if (sendgridAvailable) {
        const fallback = await sendWithSendGrid(input);
        if (fallback.success) {
          return { success: true, provider: "sendgrid", messageId: fallback.messageId };
        }
        return { success: false, provider: "sendgrid", error: fallback.error };
      }
    }

    return { success: false, provider: "resend", error: result.error };
  }

  if (sendgridAvailable) {
    const result = await sendWithSendGrid(input);
    return { success: result.success, provider: "sendgrid", messageId: result.messageId, error: result.error };
  }

  return { success: false, provider: "resend", error: "No email provider available" };
}

// ─── Email Template Renderers ────────────────────────────────────────────────

function baseTemplate(title: string, content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #e5e5e5; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 32px 24px; }
    .header { text-align: center; margin-bottom: 32px; }
    .logo { font-size: 24px; font-weight: 700; color: #ff2348; }
    .card { background: #1a1a1a; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 24px; margin-bottom: 16px; }
    .btn { display: inline-block; padding: 12px 24px; background: #ff2348; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; }
    .label { font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
    .value { font-size: 16px; font-weight: 600; color: #fff; }
    .divider { border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 16px 0; }
    .footer { text-align: center; font-size: 12px; color: #666; margin-top: 32px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">DropShip Hub</div>
    </div>
    ${content}
    <div class="footer">
      <p>DropShip Hub — Your Dropshipping OS</p>
    </div>
  </div>
</body>
</html>`;
}

export function renderOrderShippedEmail(data: {
  customerName: string;
  orderNumber: string;
  trackingNumber: string;
  carrier: string;
  estimatedDelivery?: string;
  items: Array<{ name: string; quantity: number }>;
  trackingUrl: string;
}): string {
  const itemList = data.items.map((i) => `<li>${i.name} × ${i.quantity}</li>`).join("");
  const deliveryText = data.estimatedDelivery ? `<p style="color:#888;font-size:14px;">Estimated delivery: <strong style="color:#fff;">${data.estimatedDelivery}</strong></p>` : "";

  return baseTemplate("Order Shipped", `
    <div class="card">
      <p style="font-size:18px;font-weight:600;color:#fff;margin:0 0 8px;">Your order has shipped!</p>
      <p style="color:#888;font-size:14px;margin:0 0 24px;">Hi ${data.customerName}, your order is on its way.</p>

      <div style="margin-bottom:16px;">
        <div class="label">Order Number</div>
        <div class="value">${data.orderNumber}</div>
      </div>

      <div style="margin-bottom:16px;">
        <div class="label">Tracking Number</div>
        <div class="value" style="color:#ff2348;">${data.trackingNumber}</div>
      </div>

      <div style="margin-bottom:16px;">
        <div class="label">Carrier</div>
        <div class="value">${data.carrier}</div>
      </div>

      ${deliveryText}

      <hr class="divider">

      <div style="margin-bottom:16px;">
        <div class="label">Items</div>
        <ul style="margin:8px 0 0;padding-left:20px;font-size:14px;color:#ccc;">${itemList}</ul>
      </div>

      <div style="text-align:center;margin-top:24px;">
        <a href="${data.trackingUrl}" class="btn">Track Your Order</a>
      </div>
    </div>
  `);
}

export function renderOrderDeliveredEmail(data: {
  customerName: string;
  orderNumber: string;
  items: Array<{ name: string; quantity: number }>;
}): string {
  const itemList = data.items.map((i) => `<li>${i.name} × ${i.quantity}</li>`).join("");

  return baseTemplate("Order Delivered", `
    <div class="card">
      <p style="font-size:18px;font-weight:600;color:#22c55e;margin:0 0 8px;">Your order has been delivered!</p>
      <p style="color:#888;font-size:14px;margin:0 0 24px;">Hi ${data.customerName}, your package has arrived.</p>

      <div style="margin-bottom:16px;">
        <div class="label">Order Number</div>
        <div class="value">${data.orderNumber}</div>
      </div>

      <hr class="divider">

      <div style="margin-bottom:16px;">
        <div class="label">Items Delivered</div>
        <ul style="margin:8px 0 0;padding-left:20px;font-size:14px;color:#ccc;">${itemList}</ul>
      </div>

      <p style="color:#888;font-size:14px;text-align:center;margin-top:24px;">
        We hope you love your purchase! If you have any issues, please don't hesitate to reach out.
      </p>
    </div>
  `);
}

export function renderTrackingUpdateEmail(data: {
  customerName: string;
  orderNumber: string;
  status: string;
  trackingNumber: string;
  carrier: string;
  location?: string;
  trackingUrl: string;
}): string {
  return baseTemplate("Tracking Update", `
    <div class="card">
      <p style="font-size:18px;font-weight:600;color:#fff;margin:0 0 8px;">Tracking Update</p>
      <p style="color:#888;font-size:14px;margin:0 0 24px;">Hi ${data.customerName}, here's the latest on your order.</p>

      <div style="margin-bottom:16px;">
        <div class="label">Order Number</div>
        <div class="value">${data.orderNumber}</div>
      </div>

      <div style="margin-bottom:16px;">
        <div class="label">Status</div>
        <div class="value" style="color:#f59e0b;">${data.status}</div>
      </div>

      ${data.location ? `
      <div style="margin-bottom:16px;">
        <div class="label">Location</div>
        <div class="value">${data.location}</div>
      </div>` : ""}

      <div style="margin-bottom:16px;">
        <div class="label">Tracking Number</div>
        <div class="value">${data.trackingNumber} (${data.carrier})</div>
      </div>

      <div style="text-align:center;margin-top:24px;">
        <a href="${data.trackingUrl}" class="btn">Track Your Order</a>
      </div>
    </div>
  `);
}

export function renderReturnStatusEmail(data: {
  customerName: string;
  orderNumber: string;
  status: "requested" | "approved" | "denied" | "refund_processed";
  returnId: string;
  refundAmount?: number;
  denyReason?: string;
}): string {
  const statusMessages: Record<string, { title: string; color: string; message: string }> = {
    requested: { title: "Return Request Received", color: "#f59e0b", message: "We've received your return request and will review it shortly." },
    approved: { title: "Return Approved", color: "#22c55e", message: "Your return has been approved. Please follow the instructions below to send your item back." },
    denied: { title: "Return Denied", color: "#ef4444", message: `Your return request has been denied.${data.denyReason ? ` Reason: ${data.denyReason}` : ""}` },
    refund_processed: { title: "Refund Processed", color: "#22c55e", message: `Your refund of $${data.refundAmount?.toFixed(2)} has been processed. It may take 5-10 business days to appear on your statement.` },
  };

  const s = statusMessages[data.status];

  return baseTemplate(s.title, `
    <div class="card">
      <p style="font-size:18px;font-weight:600;color:${s.color};margin:0 0 8px;">${s.title}</p>
      <p style="color:#888;font-size:14px;margin:0 0 24px;">Hi ${data.customerName}, ${s.message}</p>

      <div style="margin-bottom:16px;">
        <div class="label">Order Number</div>
        <div class="value">${data.orderNumber}</div>
      </div>

      <div style="margin-bottom:16px;">
        <div class="label">Return ID</div>
        <div class="value">${data.returnId}</div>
      </div>

      ${data.status === "refund_processed" && data.refundAmount ? `
      <div style="margin-bottom:16px;">
        <div class="label">Refund Amount</div>
        <div class="value" style="color:#22c55e;">$${data.refundAmount.toFixed(2)}</div>
      </div>` : ""}
    </div>
  `);
}

export function renderOrderConfirmedEmail(data: {
  customerName: string;
  orderNumber: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  total: number;
}): string {
  const itemList = data.items
    .map((i) => `<tr><td style="padding:8px 0;font-size:14px;color:#ccc;">${i.name} × ${i.quantity}</td><td style="padding:8px 0;font-size:14px;color:#fff;text-align:right;">$${(i.price * i.quantity).toFixed(2)}</td></tr>`)
    .join("");

  return baseTemplate("Order Confirmed", `
    <div class="card">
      <p style="font-size:18px;font-weight:600;color:#fff;margin:0 0 8px;">Order Confirmed!</p>
      <p style="color:#888;font-size:14px;margin:0 0 24px;">Hi ${data.customerName}, we've received your order.</p>

      <div style="margin-bottom:16px;">
        <div class="label">Order Number</div>
        <div class="value">${data.orderNumber}</div>
      </div>

      <hr class="divider">

      <table style="width:100%;border-collapse:collapse;">
        <thead>
          <tr>
            <td style="padding:8px 0;font-size:12px;color:#888;text-transform:uppercase;">Item</td>
            <td style="padding:8px 0;font-size:12px;color:#888;text-align:right;text-transform:uppercase;">Price</td>
          </tr>
        </thead>
        <tbody>${itemList}</tbody>
        <tfoot>
          <tr>
            <td style="padding:12px 0 0;font-size:16px;font-weight:700;color:#fff;border-top:1px solid rgba(255,255,255,0.1);">Total</td>
            <td style="padding:12px 0 0;font-size:16px;font-weight:700;color:#ff2348;text-align:right;border-top:1px solid rgba(255,255,255,0.1);">$${data.total.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      <p style="color:#888;font-size:14px;text-align:center;margin-top:24px;">
        You'll receive another email when your order ships.
      </p>
    </div>
  `);
}
