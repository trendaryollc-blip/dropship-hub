import type { RefundCascade, RefundStep, RefundEvent, RefundStatus, RefundReason } from "@/types/refund-cascade";

// ── Default Steps for a Refund Cascade ───────────────────────────────────────

function getDefaultSteps(): RefundStep[] {
  return [
    { id: "step-1", name: "Customer Refund Request", status: "completed", startedAt: new Date().toISOString(), completedAt: new Date().toISOString() },
    { id: "step-2", name: "File Supplier Claim", status: "pending" },
    { id: "step-3", name: "Supplier Responds", status: "pending" },
    { id: "step-4", name: "Process Store Refund", status: "pending" },
    { id: "step-5", name: "Process Payment Refund", status: "pending" },
    { id: "step-6", name: "Reconcile & Close", status: "pending" },
  ];
}

// ── Create Refund Cascade ────────────────────────────────────────────────────

export function createRefundCascade(params: {
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  productTitle: string;
  productImage?: string;
  orderAmount: number;
  reason: RefundReason;
  reasonDetails: string;
}): RefundCascade {
  const { orderId, orderNumber, customerName, customerEmail, productTitle, productImage, orderAmount, reason, reasonDetails } = params;

  const now = new Date().toISOString();

  return {
    id: "",
    orderId,
    orderNumber,
    customerName,
    customerEmail,
    productTitle,
    productImage,
    orderAmount,
    refundAmount: orderAmount,
    reason,
    reasonDetails,
    status: "initiated",
    steps: getDefaultSteps(),
    supplierClaim: {
      status: "not_submitted",
      amount: orderAmount * 0.8, // typically recover ~80% from supplier
      evidence: [],
    },
    storeRefund: {
      status: "not_processed",
      amount: orderAmount,
      method: "original",
    },
    paymentRefund: {
      status: "not_initiated",
      amount: orderAmount,
      processor: "stripe",
    },
    dispute: {
      status: "none",
      platform: "",
    },
    totalRefundCost: orderAmount,
    supplierRefundReceived: 0,
    netLoss: orderAmount,
    timeline: [
      {
        id: `evt-${Date.now()}`,
        action: "Refund initiated",
        actor: "admin",
        details: `Refund request created for order ${orderNumber}. Reason: ${reason}`,
        timestamp: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

// ── Advance Refund Step ──────────────────────────────────────────────────────

export function advanceRefundStep(cascade: RefundCascade, stepIndex: number, success: boolean, notes?: string): RefundCascade {
  const updated = { ...cascade };
  const steps = [...updated.steps];
  const now = new Date().toISOString();

  if (stepIndex >= steps.length) return cascade;

  // Complete current step
  steps[stepIndex] = {
    ...steps[stepIndex],
    status: success ? "completed" : "failed",
    completedAt: now,
    notes,
  };

  // Start next step if current succeeded
  if (success && stepIndex + 1 < steps.length) {
    steps[stepIndex + 1] = {
      ...steps[stepIndex + 1],
      status: "in_progress",
      startedAt: now,
    };
  }

  updated.steps = steps;
  updated.updatedAt = now;

  // Update status based on step
  const statusMap: Record<number, RefundStatus> = {
    0: "initiated",
    1: "supplier_claimed",
    2: "supplier_approved",
    3: "store_refunded",
    4: "payment_refunded",
    5: "completed",
  };

  if (success) {
    updated.status = statusMap[stepIndex + 1] || statusMap[stepIndex] || "initiated";
  } else {
    updated.status = stepIndex === 2 ? "supplier_denied" : "disputed";
  }

  // Add timeline event
  updated.timeline = [
    ...updated.timeline,
    {
      id: `evt-${Date.now()}`,
      action: steps[stepIndex].name,
      actor: "system",
      details: success ? `${steps[stepIndex].name} completed successfully` : `${steps[stepIndex].name} failed${notes ? `: ${notes}` : ""}`,
      timestamp: now,
    },
  ];

  // Update financials
  if (stepIndex === 2 && success) {
    updated.supplierRefundReceived = updated.supplierClaim.amount;
  }
  updated.netLoss = updated.totalRefundCost - updated.supplierRefundReceived;

  return updated;
}

// ── Generate Dispute Response Template ───────────────────────────────────────

export function generateDisputeResponse(cascade: RefundCascade): string {
  const templates: Record<RefundReason, string> = {
    defective: `Dear ${cascade.customerName},\n\nWe sincerely apologize for the defective product. This is not the quality standard we hold ourselves to.\n\nWe have initiated a full refund of $${cascade.refundAmount.toFixed(2)} to your original payment method. You should see the refund within 5-10 business days.\n\nYou do not need to return the item.\n\nAs a gesture of goodwill, we'd like to offer you a 15% discount code for your next purchase: SORRY15\n\nIf you have any questions, please don't hesitate to reach out.\n\nBest regards,\nCustomer Support Team`,
    wrong_item: `Dear ${cascade.customerName},\n\nWe're sorry you received the wrong item. We've identified the error and are shipping the correct item to you immediately.\n\nIn the meantime, we've processed a full refund of $${cascade.refundAmount.toFixed(2)}.\n\nPlease keep the incorrect item as a gift from us.\n\nWe apologize for the inconvenience.\n\nBest regards,\nCustomer Support Team`,
    not_as_described: `Dear ${cascade.customerName},\n\nWe're sorry the product didn't match the description. We take product accuracy very seriously.\n\nWe've processed a full refund of $${cascade.refundAmount.toFixed(2)}.\n\nYour feedback helps us improve our listings. Thank you for letting us know.\n\nBest regards,\nCustomer Support Team`,
    damaged: `Dear ${cascade.customerName},\n\nWe're sorry your item arrived damaged. This is unacceptable and we apologize.\n\nWe've initiated a full refund of $${cascade.refundAmount.toFixed(2)}. No return necessary.\n\nWe'll also be reviewing our packaging process to prevent this from happening again.\n\nBest regards,\nCustomer Support Team`,
    late_delivery: `Dear ${cascade.customerName},\n\nWe apologize for the delayed delivery. We understand how frustrating this is.\n\nWe've processed a full refund of $${cascade.refundAmount.toFixed(2)} for the inconvenience.\n\nWe're working with our shipping partners to improve delivery times.\n\nBest regards,\nCustomer Support Team`,
    customer_changed_mind: `Dear ${cascade.customerName},\n\nWe understand that sometimes purchases don't work out.\n\nWe've processed a refund of $${cascade.refundAmount.toFixed(2)} to your original payment method.\n\nPlease note: return shipping may be required. We'll send instructions if applicable.\n\nBest regards,\nCustomer Support Team`,
    quality_issue: `Dear ${cascade.customerName},\n\nWe're sorry the product quality didn't meet your expectations.\n\nWe've initiated a full refund of $${cascade.refundAmount.toFixed(2)}.\n\nYour feedback helps us maintain high quality standards.\n\nBest regards,\nCustomer Support Team`,
    other: `Dear ${cascade.customerName},\n\nWe've received your concern and have processed a refund of $${cascade.refundAmount.toFixed(2)}.\n\nIf you have any additional questions, please don't hesitate to contact us.\n\nBest regards,\nCustomer Support Team`,
  };

  return templates[cascade.reason] || templates.other;
}

// ── Calculate Refund Stats ───────────────────────────────────────────────────

export function calculateRefundStats(refunds: RefundCascade[]): {
  totalRefunds: number;
  totalRefundAmount: number;
  supplierRecovery: number;
  netLoss: number;
  avgProcessingDays: number;
  topReasons: { reason: string; count: number }[];
} {
  const total = refunds.length;
  const totalAmount = refunds.reduce((s, r) => s + r.refundAmount, 0);
  const recovery = refunds.reduce((s, r) => s + r.supplierRefundReceived, 0);
  const loss = totalAmount - recovery;

  const avgDays = total > 0
    ? refunds.reduce((s, r) => {
        const created = new Date(r.createdAt);
        const updated = new Date(r.updatedAt);
        return s + (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      }, 0) / total
    : 0;

  const reasonCounts: Record<string, number> = {};
  refunds.forEach((r) => { reasonCounts[r.reason] = (reasonCounts[r.reason] || 0) + 1; });
  const topReasons = Object.entries(reasonCounts).sort((a, b) => b[1] - a[1]).map(([reason, count]) => ({ reason, count }));

  return {
    totalRefunds: total,
    totalRefundAmount: totalAmount,
    supplierRecovery: recovery,
    netLoss: loss,
    avgProcessingDays: Math.round(avgDays * 10) / 10,
    topReasons,
  };
}
