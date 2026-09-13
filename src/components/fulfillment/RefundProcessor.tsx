"use client";

import { useState } from "react";
import { Loader2, X, DollarSign } from "lucide-react";
import type { ReturnRequest } from "@/types/fulfillment";

interface RefundProcessorProps {
  returnRequest: ReturnRequest;
  onRefund: (returnId: string, data: { refundMethod: string; refundAmount: number; note?: string }) => Promise<void>;
  onClose: () => void;
}

export default function RefundProcessor({ returnRequest, onRefund, onClose }: RefundProcessorProps) {
  const [method, setMethod] = useState<"original" | "store_credit" | "manual">("original");
  const [amount, setAmount] = useState(returnRequest.refundAmount || 0);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRefund = async () => {
    setLoading(true);
    try {
      await onRefund(returnRequest.id, {
        refundMethod: method,
        refundAmount: amount,
        note: note.trim() || undefined,
      });
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h3 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-accent" /> Process Refund
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Order Info */}
          <div className="p-3 rounded-lg bg-surface/50 border border-white/5">
            <p className="text-xs text-muted-foreground">Refunding for order</p>
            <p className="text-sm font-medium text-foreground">{returnRequest.orderId}</p>
          </div>

          {/* Refund Amount */}
          <div>
            <label className="text-xs font-medium text-foreground mb-2 block">Refund Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <input
                type="number"
                step="0.01"
                min={0}
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full pl-7 pr-3 py-2.5 bg-surface border border-white/10 rounded-lg text-sm text-foreground focus:outline-none focus:border-accent"
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Max refund: ${(returnRequest.refundAmount || 0).toFixed(2)}
            </p>
          </div>

          {/* Refund Method */}
          <div>
            <label className="text-xs font-medium text-foreground mb-2 block">Refund Method</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "original" as const, label: "Original", desc: "Back to source" },
                { id: "store_credit" as const, label: "Store Credit", desc: "Credit balance" },
                { id: "manual" as const, label: "Manual", desc: "Outside system" },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMethod(m.id)}
                  className={`p-2.5 rounded-lg border text-center transition-all ${
                    method === m.id
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-white/10 bg-surface/50 text-muted-foreground hover:border-white/20"
                  }`}
                >
                  <p className="text-xs font-medium">{m.label}</p>
                  <p className="text-[10px] text-muted-foreground">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="text-xs font-medium text-foreground mb-2 block">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason for refund amount..."
              rows={2}
              className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent resize-none"
            />
          </div>
        </div>

        <div className="p-5 border-t border-white/10 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleRefund}
            disabled={loading || amount <= 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-xs font-medium hover:bg-emerald-600 transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <DollarSign className="h-3 w-3" />}
            Refund ${amount.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}
