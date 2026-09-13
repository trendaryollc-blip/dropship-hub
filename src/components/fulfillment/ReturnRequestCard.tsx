"use client";

import { useState } from "react";
import {
  ChevronDown, ChevronUp, Loader2, Check, X, Package, Clock,
} from "lucide-react";
import type { ReturnRequest, ReturnStatus } from "@/types/fulfillment";
import { RETURN_STATUS_CONFIG, RETURN_REASON_CONFIG } from "@/types/fulfillment";
import ReturnStatusBadge from "./ReturnStatusBadge";
import RefundProcessor from "./RefundProcessor";

interface ReturnRequestCardProps {
  returnRequest: ReturnRequest;
  onUpdate: (returnId: string, data: { status?: ReturnStatus; note?: string; rmaNumber?: string; returnTrackingNumber?: string }) => Promise<void>;
  onRefund: (returnId: string, data: { refundMethod: string; refundAmount: number; note?: string }) => Promise<void>;
}

export default function ReturnRequestCard({ returnRequest, onUpdate, onRefund }: ReturnRequestCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rmaInput, setRmaInput] = useState("");
  const [trackingInput, setTrackingInput] = useState("");
  const [noteInput, setNoteInput] = useState("");
  const [showRefund, setShowRefund] = useState(false);

  const rr = returnRequest;
  const reasonConfig = RETURN_REASON_CONFIG[rr.reason];

  const handleAction = async (action: string, data?: Record<string, string>) => {
    setActionLoading(action);
    try {
      if (action === "refund") {
        setShowRefund(true);
        setActionLoading(null);
        return;
      }
      await onUpdate(rr.id, data || {});
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{reasonConfig?.icon || "❓"}</span>
            <div>
              <p className="text-sm font-semibold text-foreground">{rr.orderId}</p>
              <p className="text-[10px] text-muted-foreground">
                {new Date(rr.requestedAt).toLocaleDateString()} · {rr.customerName}
              </p>
            </div>
          </div>
          <div className="text-right">
            <ReturnStatusBadge status={rr.status} />
            <p className="text-sm font-bold text-accent mt-1">${(rr.refundAmount || 0).toFixed(2)}</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mt-1">
          <span className="font-medium text-foreground">{reasonConfig?.label}:</span> {rr.reasonDescription}
        </p>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mt-3">
          {rr.status === "requested" && (
            <>
              <button
                onClick={() => handleAction("approve", { status: "approved" })}
                disabled={!!actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-400/20 rounded-lg text-[11px] font-medium hover:bg-emerald-500/30 transition-all disabled:opacity-50"
              >
                {actionLoading === "approve" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                Approve
              </button>
              <button
                onClick={() => handleAction("deny", { status: "denied", note: "Return denied" })}
                disabled={!!actionLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-[11px] font-medium hover:bg-red-500/20 transition-all disabled:opacity-50"
              >
                {actionLoading === "deny" ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                Deny
              </button>
            </>
          )}
          {rr.status === "approved" && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="RMA #"
                value={rmaInput}
                onChange={(e) => setRmaInput(e.target.value)}
                className="px-2 py-1 bg-surface border border-white/10 rounded text-[11px] text-foreground w-24 focus:outline-none focus:border-accent"
              />
              <input
                type="text"
                placeholder="Return tracking #"
                value={trackingInput}
                onChange={(e) => setTrackingInput(e.target.value)}
                className="px-2 py-1 bg-surface border border-white/10 rounded text-[11px] text-foreground flex-1 focus:outline-none focus:border-accent"
              />
              <button
                onClick={() => handleAction("transit", { status: "return_in_transit", rmaNumber: rmaInput, returnTrackingNumber: trackingInput })}
                disabled={!!actionLoading || !trackingInput.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 text-purple-400 border border-purple-400/20 rounded-lg text-[11px] font-medium hover:bg-purple-500/30 transition-all disabled:opacity-50"
              >
                {actionLoading === "transit" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Package className="h-3 w-3" />}
                Mark In Transit
              </button>
            </div>
          )}
          {rr.status === "return_in_transit" && (
            <button
              onClick={() => handleAction("received", { status: "return_received" })}
              disabled={!!actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-400/20 rounded-lg text-[11px] font-medium hover:bg-blue-500/30 transition-all disabled:opacity-50"
            >
              {actionLoading === "received" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Package className="h-3 w-3" />}
              Mark Received
            </button>
          )}
          {rr.status === "return_received" && (
            <button
              onClick={() => handleAction("refund")}
              disabled={!!actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-400/20 rounded-lg text-[11px] font-medium hover:bg-emerald-500/30 transition-all disabled:opacity-50"
            >
              Process Refund
            </button>
          )}
          {rr.status === "refunded" && (
            <button
              onClick={() => handleAction("close", { status: "closed" })}
              disabled={!!actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface text-muted-foreground border border-white/10 rounded-lg text-[11px] font-medium hover:bg-surface/80 transition-all disabled:opacity-50"
            >
              Close Return
            </button>
          )}
        </div>
      </div>

      {/* Expandable Details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2 border-t border-white/5 flex items-center justify-between text-[11px] text-muted-foreground hover:bg-surface/30 transition-all"
      >
        <span>{expanded ? "Hide details" : "Show details"}</span>
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          {/* Items */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase mb-1">Items</p>
            <div className="space-y-1">
              {rr.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-foreground">{item.productName} × {item.quantity}</span>
                  <span className="text-muted-foreground">${(item.unitPrice * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Status History */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase mb-1">History</p>
            <div className="space-y-1.5">
              {(rr.statusHistory || []).map((entry, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px]">
                  <Clock className="h-3 w-3 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium text-foreground">{RETURN_STATUS_CONFIG[entry.status]?.label || entry.status}</span>
                    <span className="text-muted-foreground ml-1">{new Date(entry.timestamp).toLocaleString()}</span>
                    {entry.note && <p className="text-muted-foreground mt-0.5">{entry.note}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Internal Notes */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase mb-1">Internal Notes</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add a note..."
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && noteInput.trim()) {
                    handleAction("note", { note: noteInput.trim() });
                    setNoteInput("");
                  }
                }}
                className="flex-1 px-2 py-1 bg-surface border border-white/10 rounded text-[11px] text-foreground focus:outline-none focus:border-accent"
              />
              <button
                onClick={() => {
                  if (noteInput.trim()) {
                    handleAction("note", { note: noteInput.trim() });
                    setNoteInput("");
                  }
                }}
                disabled={!noteInput.trim()}
                className="px-2 py-1 bg-accent/20 text-accent rounded text-[11px] font-medium hover:bg-accent/30 transition-all disabled:opacity-50"
              >
                Add
              </button>
            </div>
            {rr.internalNotes && (
              <p className="text-[11px] text-muted-foreground mt-1.5 whitespace-pre-wrap">{rr.internalNotes}</p>
            )}
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {showRefund && (
        <RefundProcessor
          returnRequest={rr}
          onRefund={onRefund}
          onClose={() => setShowRefund(false)}
        />
      )}
    </div>
  );
}
