"use client";

import { useState, useCallback, useEffect } from "react";
import {
  RotateCcw,
  Loader2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MessageSquare,
  DollarSign,
  Send,
  Trash2,
  RefreshCw,
  History,
} from "lucide-react";
import { useAPI } from "@/hooks/useAPI";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { authJson } from "@/lib/auth-headers";
import type { RefundCascade, RefundReason, RefundStatus, RefundStats } from "@/types/refund-cascade";

const REASONS: { id: RefundReason; label: string; icon: string }[] = [
  { id: "defective", label: "Defective Product", icon: "🔴" },
  { id: "wrong_item", label: "Wrong Item Sent", icon: "📦" },
  { id: "not_as_described", label: "Not As Described", icon: "📝" },
  { id: "damaged", label: "Damaged in Shipping", icon: "💥" },
  { id: "late_delivery", label: "Late Delivery", icon: "⏰" },
  { id: "customer_changed_mind", label: "Customer Changed Mind", icon: "🤔" },
  { id: "quality_issue", label: "Quality Issue", icon: "⚠️" },
  { id: "other", label: "Other", icon: "📋" },
];

const STATUS_CONFIG: Record<RefundStatus, { label: string; color: string; bg: string }> = {
  initiated: { label: "Initiated", color: "text-blue-400", bg: "bg-blue-500/10" },
  supplier_claimed: { label: "Claim Filed", color: "text-amber-400", bg: "bg-amber-500/10" },
  supplier_approved: { label: "Supplier Approved", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  supplier_denied: { label: "Supplier Denied", color: "text-red-400", bg: "bg-red-500/10" },
  store_refunded: { label: "Store Refunded", color: "text-purple-400", bg: "bg-purple-500/10" },
  payment_refunded: { label: "Payment Refunded", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  completed: { label: "Completed", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  disputed: { label: "Disputed", color: "text-red-400", bg: "bg-red-500/10" },
  escalated: { label: "Escalated", color: "text-orange-400", bg: "bg-orange-500/10" },
};

const inputClass =
  "w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all";

const fmtUSD = (v: number): string =>
  `$${(Number.isFinite(v) ? v : 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function DataState({ isLoading, error, label, onRetry }: { isLoading: boolean; error: unknown; label: string; onRetry: () => void }) {
  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-10 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent mx-auto" />
        <p className="text-sm text-muted-foreground mt-2">Loading {label}…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="glass rounded-2xl p-6 text-center border border-red-500/20">
        <AlertTriangle className="h-6 w-6 text-red-400 mx-auto mb-2" />
        <p className="text-sm text-foreground">Couldn&apos;t load {label}.</p>
        <button onClick={onRetry} className="mt-3 px-4 py-1.5 rounded-lg bg-surface border border-border text-xs font-medium text-muted-foreground hover:text-foreground transition-all inline-flex items-center gap-1.5">
          <RefreshCw className="h-3 w-3" /> Retry
        </button>
      </div>
    );
  }
  return null;
}

interface AdvanceTarget {
  cascade: RefundCascade;
  stepIndex: number;
  success: boolean;
  notes?: string;
  confirmTitle: string;
  confirmDescription: string;
}

export default function RefundCascadePage() {
  const [selected, setSelected] = useState<RefundCascade | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedTimeline, setExpandedTimeline] = useState<string | null>(null);
  const [disputeResponse, setDisputeResponse] = useState("");
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [advanceTarget, setAdvanceTarget] = useState<AdvanceTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RefundCascade | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { success, error: showError } = useToast();

  const {
    data: listData,
    mutate: mutateList,
    isLoading: listLoading,
    error: listError,
  } = useAPI<{ cascades: RefundCascade[] }>("/api/refund-cascade");
  const { data: statsData, mutate: mutateStats, isLoading: statsLoading, error: statsError } = useAPI<{ stats: RefundStats }>("/api/refund-cascade?type=stats");

  const cascades = listData?.cascades || [];
  const stats = statsData?.stats;

  // Create form
  const [form, setForm] = useState({
    orderId: "",
    orderNumber: "",
    customerName: "",
    customerEmail: "",
    productTitle: "",
    orderAmount: "",
    reason: "defective" as RefundReason,
    reasonDetails: "",
  });
  const [creating, setCreating] = useState(false);

  // Clear stale dispute text whenever a different cascade is opened.
  useEffect(() => {
    setDisputeResponse("");
    setExpandedTimeline(null);
  }, [selected?.id]);

  const handleCreate = useCallback(async () => {
    const parsedAmount = Number(form.orderAmount);
    if (!form.orderId.trim() || !form.orderNumber.trim() || !form.customerName.trim() || !form.productTitle.trim() || form.orderAmount.trim() === "" || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError("Fill all required fields with a positive order amount.");
      return;
    }
    setFormError(null);
    setCreating(true);
    try {
      const data = await authJson<{ success: boolean; cascade: RefundCascade }>("/api/refund-cascade", {
        action: "create",
        orderId: form.orderId.trim(),
        orderNumber: form.orderNumber.trim(),
        customerName: form.customerName.trim(),
        customerEmail: form.customerEmail.trim(),
        productTitle: form.productTitle.trim(),
        orderAmount: parsedAmount,
        reason: form.reason,
        reasonDetails: form.reasonDetails.trim(),
      });
      if (!data.success || !data.cascade) throw new Error("Failed to create refund cascade");
      mutateList();
      mutateStats();
      setSelected(data.cascade);
      setShowCreate(false);
      setForm({ orderId: "", orderNumber: "", customerName: "", customerEmail: "", productTitle: "", orderAmount: "", reason: "defective", reasonDetails: "" });
      success("Refund cascade created");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to create refund cascade");
    } finally {
      setCreating(false);
    }
  }, [form, mutateList, mutateStats, success, showError]);

  function requestAdvance(cascade: RefundCascade, stepIndex: number, successStep: boolean, notes?: string) {
    // Monetary/irreversible steps (store refund onward) require explicit confirmation.
    const monetary = stepIndex >= 3;
    if (monetary) {
      setAdvanceTarget({
        cascade,
        stepIndex,
        success: successStep,
        notes,
        confirmTitle: successStep ? "Process refund?" : "Record failure?",
        confirmDescription: `This will mark step ${stepIndex + 1} of "${cascade.orderNumber}" as ${successStep ? "completed and move funds forward" : "failed"}. This action is recorded in the timeline.`,
      });
    } else {
      void runAdvance(cascade, stepIndex, successStep, notes);
    }
  }

  async function runAdvance(cascade: RefundCascade, stepIndex: number, successStep: boolean, notes?: string) {
    setAdvancing(true);
    try {
      const data = await authJson<{ success: boolean; cascade: RefundCascade }>("/api/refund-cascade", {
        action: "advance",
        id: cascade.id,
        stepIndex,
        success: successStep,
        notes,
      });
      if (!data.success || !data.cascade) throw new Error("Failed to advance step");
      setSelected(data.cascade);
      mutateList();
      mutateStats();
      success(successStep ? "Step completed" : "Step marked as failed");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to advance step");
    } finally {
      setAdvancing(false);
    }
  }

  async function confirmAdvance() {
    if (!advanceTarget) return;
    const { cascade, stepIndex, success: successStep, notes } = advanceTarget;
    setAdvanceTarget(null);
    await runAdvance(cascade, stepIndex, successStep, notes);
  }

  const handleGetDisputeResponse = useCallback(
    async (cascade: RefundCascade) => {
      setDisputeLoading(true);
      try {
        const data = await authJson<{ success: boolean; response: string }>("/api/refund-cascade", {
          action: "dispute-response",
          id: cascade.id,
        });
        if (!data.success) throw new Error("Failed to generate response");
        setDisputeResponse(data.response);
        success("Response email generated");
      } catch (err) {
        showError(err instanceof Error ? err.message : "Failed to generate response");
      } finally {
        setDisputeLoading(false);
      }
    },
    [success, showError]
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setDeletingId(target.id);
    try {
      await authJson(`/api/refund-cascade?id=${encodeURIComponent(target.id)}`, undefined, "DELETE");
      success("Refund cascade deleted");
      if (selected?.id === target.id) setSelected(null);
      mutateList();
      mutateStats();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }, [deleteTarget, selected, mutateList, mutateStats, success, showError]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-3 sm:px-4 lg:px-6 pb-24">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <RotateCcw className="h-6 w-6 text-accent" />
            Refund Cascade
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automate refund processing across supplier, store, and payment processor.
          </p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          aria-pressed={showCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition-all"
        >
          <RotateCcw className="h-4 w-4" />
          {showCreate ? "Close" : "New Refund"}
        </button>
      </div>

      {/* Stats */}
      <DataState isLoading={statsLoading} error={statsError} label="refund stats" onRetry={() => mutateStats()} />
      {!statsLoading && !statsError && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Refunds", value: String(stats.totalRefunds), color: "text-accent" },
            { label: "Refund Amount", value: fmtUSD(stats.totalRefundAmount), color: "text-foreground" },
            { label: "Supplier Recovery", value: fmtUSD(stats.supplierRecovery), color: "text-emerald-400" },
            { label: "Net Loss", value: fmtUSD(stats.netLoss), color: "text-red-400" },
          ].map((s) => (
            <div key={s.label} className="glass rounded-xl p-3">
              <span className="text-[10px] text-muted-foreground uppercase">{s.label}</span>
              <div className={`font-display text-lg font-bold ${s.color} mt-0.5`}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Create Form */}
      {showCreate && (
        <div className="glass rounded-2xl p-5 space-y-4">
          <h3 className="font-display text-sm font-semibold text-foreground">Create Refund Cascade</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="rc-order-id" className="block text-xs font-medium text-muted-foreground mb-1.5">Order ID *</label>
              <input id="rc-order-id" type="text" value={form.orderId} maxLength={100} onChange={(e) => setForm({ ...form, orderId: e.target.value })}
                placeholder="ORD-12345" className={inputClass} />
            </div>
            <div>
              <label htmlFor="rc-order-number" className="block text-xs font-medium text-muted-foreground mb-1.5">Order Number *</label>
              <input id="rc-order-number" type="text" value={form.orderNumber} maxLength={100} onChange={(e) => setForm({ ...form, orderNumber: e.target.value })}
                placeholder="#12345" className={inputClass} />
            </div>
            <div>
              <label htmlFor="rc-customer-name" className="block text-xs font-medium text-muted-foreground mb-1.5">Customer Name *</label>
              <input id="rc-customer-name" type="text" value={form.customerName} maxLength={120} onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                placeholder="John Doe" className={inputClass} />
            </div>
            <div>
              <label htmlFor="rc-customer-email" className="block text-xs font-medium text-muted-foreground mb-1.5">Customer Email</label>
              <input id="rc-customer-email" type="email" value={form.customerEmail} maxLength={200} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                placeholder="john@example.com" className={inputClass} />
            </div>
            <div>
              <label htmlFor="rc-product" className="block text-xs font-medium text-muted-foreground mb-1.5">Product Title *</label>
              <input id="rc-product" type="text" value={form.productTitle} maxLength={200} onChange={(e) => setForm({ ...form, productTitle: e.target.value })}
                placeholder="Wireless Bluetooth Earbuds" className={inputClass} />
            </div>
            <div>
              <label htmlFor="rc-amount" className="block text-xs font-medium text-muted-foreground mb-1.5">Order Amount ($) *</label>
              <input id="rc-amount" type="number" value={form.orderAmount} min={0.01} step="0.01" onChange={(e) => setForm({ ...form, orderAmount: e.target.value })}
                placeholder="29.99" className={inputClass} />
            </div>
          </div>
          <div>
            <span className="block text-xs font-medium text-muted-foreground mb-2">Reason *</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="group" aria-label="Refund reason">
              {REASONS.map((r) => (
                <button key={r.id} type="button" onClick={() => setForm({ ...form, reason: r.id })} aria-pressed={form.reason === r.id}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-sm transition-all ${
                    form.reason === r.id ? "bg-accent/10 border-accent/20 text-accent" : "bg-surface border-border text-muted-foreground hover:text-foreground"
                  }`}>
                  <span aria-hidden="true">{r.icon}</span>
                  <span className="font-medium">{r.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="rc-details" className="block text-xs font-medium text-muted-foreground mb-1.5">Reason Details</label>
            <textarea id="rc-details" rows={3} value={form.reasonDetails} maxLength={1000} onChange={(e) => setForm({ ...form, reasonDetails: e.target.value })}
              placeholder="What happened?" className={inputClass} />
          </div>
          {formError && (
            <p className="text-xs text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3" /> {formError}
            </p>
          )}
          <button onClick={handleCreate} disabled={creating}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition-all disabled:opacity-50">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            Create Refund Cascade
          </button>
        </div>
      )}

      {/* Saved cascades list */}
      <DataState isLoading={listLoading} error={listError} label="your refund cascades" onRetry={() => mutateList()} />
      {!listLoading && !listError && !showCreate && cascades.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <History className="h-4 w-4 text-accent" />
            Saved Refund Cascades ({cascades.length})
          </h3>
          <div className="space-y-2">
            {cascades.map((cascade) => {
              const status = STATUS_CONFIG[cascade.status] || STATUS_CONFIG.initiated;
              return (
                <div key={cascade.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface/50 border border-border/50 group">
                  <button onClick={() => setSelected(cascade)} className="min-w-0 text-left flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{cascade.orderNumber} — {cascade.productTitle}</p>
                    <p className="text-xs text-muted-foreground">
                      {cascade.customerName} • {fmtUSD(cascade.refundAmount)} • {fmtUSD(cascade.netLoss)} net loss
                    </p>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${status.bg} ${status.color}`}>{status.label}</span>
                    <button
                      onClick={() => setDeleteTarget(cascade)}
                      disabled={deletingId === cascade.id}
                      aria-label="Delete this refund cascade"
                      title="Delete"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                    >
                      {deletingId === cascade.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected cascade detail */}
      {selected && (
        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-display text-base font-semibold text-foreground truncate">
                {selected.orderNumber} — {selected.productTitle}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {selected.customerName}{selected.customerEmail ? ` • ${selected.customerEmail}` : ""} • {fmtUSD(selected.refundAmount)}
              </p>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded font-medium shrink-0 ${(STATUS_CONFIG[selected.status] || STATUS_CONFIG.initiated).bg} ${(STATUS_CONFIG[selected.status] || STATUS_CONFIG.initiated).color}`}>
              {(STATUS_CONFIG[selected.status] || STATUS_CONFIG.initiated).label}
            </span>
          </div>

          {/* Steps */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {selected.steps.map((step, i) => (
              <div key={step.id} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border font-medium ${
                  step.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                  step.status === "in_progress" ? "bg-accent/10 text-accent border-accent/20 animate-pulse" :
                  step.status === "failed" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                  "bg-surface border border-border text-muted-foreground"
                }`}>
                  {step.status === "completed" ? <CheckCircle2 className="h-3.5 w-3.5" /> :
                   step.status === "in_progress" ? <Clock className="h-3.5 w-3.5" /> :
                   step.status === "failed" ? <X className="h-3.5 w-3.5" /> :
                   <span className="w-3.5 h-3.5 rounded-full border border-current opacity-40" />}
                  {step.name}
                </div>
                {i < selected.steps.length - 1 && <span className="text-muted-foreground/30">→</span>}
              </div>
            ))}
          </div>

          {/* Actions */}
          {selected.status === "initiated" && (
            <div className="flex gap-2">
              <button onClick={() => requestAdvance(selected, 1, true)} disabled={advancing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent/10 text-accent border border-accent/20 text-sm font-medium hover:bg-accent/20 transition-all disabled:opacity-50">
                <Send className="h-3.5 w-3.5" /> File Supplier Claim
              </button>
            </div>
          )}
          {selected.status === "supplier_claimed" && (
            <div className="flex gap-2">
              <button onClick={() => requestAdvance(selected, 2, true)} disabled={advancing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm font-medium hover:bg-emerald-500/20 transition-all disabled:opacity-50">
                <Check className="h-3.5 w-3.5" /> Mark Approved
              </button>
              <button onClick={() => requestAdvance(selected, 2, false, "Supplier denied the claim")} disabled={advancing}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-sm font-medium hover:bg-red-500/20 transition-all disabled:opacity-50">
                <X className="h-3.5 w-3.5" /> Mark Denied
              </button>
            </div>
          )}
          {selected.status === "supplier_approved" && (
            <button onClick={() => requestAdvance(selected, 3, true)} disabled={advancing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent/10 text-accent border border-accent/20 text-sm font-medium hover:bg-accent/20 transition-all disabled:opacity-50">
              <DollarSign className="h-3.5 w-3.5" /> Process Store Refund
            </button>
          )}
          {selected.status === "store_refunded" && (
            <button onClick={() => requestAdvance(selected, 4, true)} disabled={advancing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent/10 text-accent border border-accent/20 text-sm font-medium hover:bg-accent/20 transition-all disabled:opacity-50">
              <RotateCcw className="h-3.5 w-3.5" /> Process Payment Refund
            </button>
          )}
          {selected.status === "payment_refunded" && (
            <button onClick={() => requestAdvance(selected, 5, true)} disabled={advancing}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm font-medium hover:bg-emerald-500/20 transition-all disabled:opacity-50">
              <CheckCircle2 className="h-3.5 w-3.5" /> Complete &amp; Close
            </button>
          )}

          {/* Financial Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase">Total Refund</p>
              <p className="font-display text-lg font-bold text-foreground">{fmtUSD(selected.totalRefundCost)}</p>
            </div>
            <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase">Supplier Recovery</p>
              <p className="font-display text-lg font-bold text-emerald-400">{fmtUSD(selected.supplierRefundReceived)}</p>
            </div>
            <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase">Net Loss</p>
              <p className="font-display text-lg font-bold text-red-400">{fmtUSD(selected.netLoss)}</p>
            </div>
          </div>

          {/* Dispute Response */}
          <div className="space-y-2">
            <button onClick={() => handleGetDisputeResponse(selected)} disabled={disputeLoading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface border border-border text-sm text-muted-foreground hover:text-foreground transition-all disabled:opacity-50">
              {disputeLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
              Generate Response Email
            </button>
            {disputeResponse && (
              <div className="p-4 rounded-xl bg-surface/50 border border-border/50">
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{disputeResponse}</p>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div>
            <button onClick={() => setExpandedTimeline(expandedTimeline === selected.id ? null : selected.id)}
              aria-expanded={expandedTimeline === selected.id}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
              {expandedTimeline === selected.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              Timeline ({selected.timeline.length} events)
            </button>
            {expandedTimeline === selected.id && (
              <div className="mt-2 space-y-1.5">
                {selected.timeline.map((evt) => (
                  <div key={evt.id} className="flex items-start gap-2 p-2 rounded-lg bg-surface/30">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                    <div>
                      <p className="text-sm text-foreground">{evt.action}</p>
                      <p className="text-xs text-muted-foreground">{evt.details}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">{new Date(evt.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selected && !showCreate && !listLoading && !listError && cascades.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <RotateCcw className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No refund cascades yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Click &quot;New Refund&quot; to start processing a refund</p>
        </div>
      )}

      <ConfirmDialog
        open={!!advanceTarget}
        title={advanceTarget?.confirmTitle || "Confirm"}
        description={advanceTarget?.confirmDescription || ""}
        confirmLabel="Confirm"
        danger
        onConfirm={confirmAdvance}
        onCancel={() => setAdvanceTarget(null)}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete refund cascade?"
        description={`This permanently removes the refund cascade for order "${deleteTarget?.orderNumber}". This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}


