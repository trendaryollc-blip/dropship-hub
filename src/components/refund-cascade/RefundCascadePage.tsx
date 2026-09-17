"use client";

import { useState, useCallback } from "react";
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
} from "lucide-react";
import type { RefundCascade, RefundReason, RefundStatus } from "@/types/refund-cascade";

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

export default function RefundCascadePage() {
  const [cascades, setCascades] = useState<RefundCascade[]>([]);
  const [selected, setSelected] = useState<RefundCascade | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedTimeline, setExpandedTimeline] = useState<string | null>(null);
  const [disputeResponse, setDisputeResponse] = useState("");

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

  const handleCreate = useCallback(async () => {
    if (!form.orderId || !form.orderNumber || !form.customerName || !form.productTitle || !form.orderAmount) return;
    setLoading(true);
    try {
      const res = await fetch("/api/refund-cascade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          ...form,
          orderAmount: Number(form.orderAmount),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCascades((prev) => [data.cascade, ...prev]);
      setSelected(data.cascade);
      setShowCreate(false);
      setForm({ orderId: "", orderNumber: "", customerName: "", customerEmail: "", productTitle: "", orderAmount: "", reason: "defective", reasonDetails: "" });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [form]);

  const handleAdvanceStep = useCallback(async (cascade: RefundCascade, stepIndex: number, success: boolean, notes?: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/refund-cascade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "advance", cascade, stepIndex, success }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSelected(data.cascade);
      setCascades((prev) => prev.map((c) => c.id === data.cascade.id ? data.cascade : c));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleGetDisputeResponse = useCallback(async (cascade: RefundCascade) => {
    try {
      const res = await fetch("/api/refund-cascade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dispute-response", cascade }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDisputeResponse(data.response);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-3 sm:px-4 lg:px-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <RotateCcw className="h-6 w-6 text-accent" />
            Refund Cascade
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Automate refund processing across supplier, store, and payment processor.
          </p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition-all">
          <RotateCcw className="h-4 w-4" />
          New Refund
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="glass rounded-2xl p-5 space-y-4">
          <h3 className="font-display text-sm font-semibold text-foreground">Create Refund Cascade</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Order ID *</label>
              <input type="text" value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })}
                placeholder="ORD-12345"
                className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Order Number *</label>
              <input type="text" value={form.orderNumber} onChange={(e) => setForm({ ...form, orderNumber: e.target.value })}
                placeholder="#12345"
                className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Customer Name *</label>
              <input type="text" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                placeholder="John Doe"
                className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Customer Email</label>
              <input type="email" value={form.customerEmail} onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                placeholder="john@example.com"
                className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Product Title *</label>
              <input type="text" value={form.productTitle} onChange={(e) => setForm({ ...form, productTitle: e.target.value })}
                placeholder="Wireless Bluetooth Earbuds"
                className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Order Amount ($) *</label>
              <input type="number" value={form.orderAmount} onChange={(e) => setForm({ ...form, orderAmount: e.target.value })}
                placeholder="29.99" min="0" step="0.01"
                className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">Reason *</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {REASONS.map((r) => (
                <button key={r.id} onClick={() => setForm({ ...form, reason: r.id })}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-sm transition-all ${
                    form.reason === r.id ? "bg-accent/10 border-accent/20 text-accent" : "bg-surface border-border text-muted-foreground hover:text-foreground"
                  }`}>
                  <span>{r.icon}</span>
                  <span className="font-medium">{r.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Details</label>
            <textarea value={form.reasonDetails} onChange={(e) => setForm({ ...form, reasonDetails: e.target.value })}
              placeholder="Additional details about the refund reason..." rows={2}
              className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all resize-none" />
          </div>
          <button onClick={handleCreate} disabled={loading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition-all disabled:opacity-50">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            Create Refund Cascade
          </button>
        </div>
      )}

      {/* Active Cascades */}
      {selected && (
        <div className="glass rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-foreground">Active Refund — {selected.orderNumber}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-lg font-medium ${STATUS_CONFIG[selected.status].bg} ${STATUS_CONFIG[selected.status].color}`}>
              {STATUS_CONFIG[selected.status].label}
            </span>
          </div>

          {/* Steps Pipeline */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {selected.steps.map((step, i) => (
              <div key={step.id} className="flex items-center gap-1">
                <div className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap ${
                  step.status === "completed" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                  step.status === "in_progress" ? "bg-accent/10 text-accent border border-accent/20 animate-pulse" :
                  step.status === "failed" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
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
              <button onClick={() => handleAdvanceStep(selected, 1, true)} disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent/10 text-accent border border-accent/20 text-sm font-medium hover:bg-accent/20 transition-all">
                <Send className="h-3.5 w-3.5" /> File Supplier Claim
              </button>
            </div>
          )}
          {selected.status === "supplier_claimed" && (
            <div className="flex gap-2">
              <button onClick={() => handleAdvanceStep(selected, 2, true)} disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm font-medium hover:bg-emerald-500/20 transition-all">
                <Check className="h-3.5 w-3.5" /> Mark Approved
              </button>
              <button onClick={() => handleAdvanceStep(selected, 2, false, "Supplier denied the claim")} disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-sm font-medium hover:bg-red-500/20 transition-all">
                <X className="h-3.5 w-3.5" /> Mark Denied
              </button>
            </div>
          )}
          {selected.status === "supplier_approved" && (
            <button onClick={() => handleAdvanceStep(selected, 3, true)} disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent/10 text-accent border border-accent/20 text-sm font-medium hover:bg-accent/20 transition-all">
              <DollarSign className="h-3.5 w-3.5" /> Process Store Refund
            </button>
          )}
          {selected.status === "store_refunded" && (
            <button onClick={() => handleAdvanceStep(selected, 4, true)} disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent/10 text-accent border border-accent/20 text-sm font-medium hover:bg-accent/20 transition-all">
              <RotateCcw className="h-3.5 w-3.5" /> Process Payment Refund
            </button>
          )}
          {selected.status === "payment_refunded" && (
            <button onClick={() => handleAdvanceStep(selected, 5, true)} disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-sm font-medium hover:bg-emerald-500/20 transition-all">
              <CheckCircle2 className="h-3.5 w-3.5" /> Complete & Close
            </button>
          )}

          {/* Financial Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase">Total Refund</p>
              <p className="font-display text-lg font-bold text-foreground">${selected.totalRefundCost.toFixed(2)}</p>
            </div>
            <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase">Supplier Recovery</p>
              <p className="font-display text-lg font-bold text-emerald-400">${selected.supplierRefundReceived.toFixed(2)}</p>
            </div>
            <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
              <p className="text-[10px] text-muted-foreground uppercase">Net Loss</p>
              <p className="font-display text-lg font-bold text-red-400">${selected.netLoss.toFixed(2)}</p>
            </div>
          </div>

          {/* Dispute Response */}
          <div className="space-y-2">
            <button onClick={() => handleGetDisputeResponse(selected)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface border border-border text-sm text-muted-foreground hover:text-foreground transition-all">
              <MessageSquare className="h-3.5 w-3.5" /> Generate Response Email
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
      {!selected && !showCreate && (
        <div className="glass rounded-2xl p-12 text-center">
          <RotateCcw className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No active refund cascades</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Click "New Refund" to start processing a refund</p>
        </div>
      )}
    </div>
  );
}
