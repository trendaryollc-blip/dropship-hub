"use client";

import { useState } from "react";
import { SplitSquareHorizontal, Loader2, X, Check, AlertCircle } from "lucide-react";
import type { FulfillmentOrder } from "@/types/fulfillment";

interface OrderSplitterProps {
  order: FulfillmentOrder;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  authFetch: any;
  onSplitComplete: (newOrderIds: string[]) => void;
}

interface Split {
  id: string;
  itemIndices: number[];
  label: string;
}

export default function OrderSplitter({ order, authFetch, onSplitComplete }: OrderSplitterProps) {
  const [splits, setSplits] = useState<Split[]>([
    { id: "split-1", itemIndices: [], label: "Split A" },
    { id: "split-2", itemIndices: [], label: "Split B" },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ originalOrderId: string; newOrderIds: string[]; splits: Array<{ orderId: string; items: number; totalRevenue: number }> } | null>(null);

  const items = order.items || [];
  const assignedIndices = new Set(splits.flatMap((s) => s.itemIndices));
  const unassignedIndices = items.map((_, i) => i).filter((i) => !assignedIndices.has(i));

  const addItemToSplit = (splitId: string, itemIndex: number) => {
    setSplits((prev) =>
      prev.map((s) => {
        if (s.id === splitId && !s.itemIndices.includes(itemIndex)) {
          return { ...s, itemIndices: [...s.itemIndices, itemIndex] };
        }
        return s;
      })
    );
    setError(null);
  };

  const removeItemFromSplit = (splitId: string, itemIndex: number) => {
    setSplits((prev) =>
      prev.map((s) => {
        if (s.id === splitId) {
          return { ...s, itemIndices: s.itemIndices.filter((i) => i !== itemIndex) };
        }
        return s;
      })
    );
  };

  const addSplit = () => {
    const newId = `split-${Date.now().toString(36)}`;
    const label = String.fromCharCode(65 + splits.length); // C, D, E...
    setSplits((prev) => [...prev, { id: newId, itemIndices: [], label: `Split ${label}` }]);
  };

  const removeSplit = (splitId: string) => {
    if (splits.length <= 2) return;
    setSplits((prev) => prev.filter((s) => s.id !== splitId));
  };

  const getSplitTotal = (itemIndices: number[]) => {
    return itemIndices.reduce((sum, idx) => {
      const item = items[idx];
      return sum + (item?.price || 0) * (item?.quantity || 0);
    }, 0);
  };

  const canSubmit = () => {
    const nonEmptySplits = splits.filter((s) => s.itemIndices.length > 0);
    return nonEmptySplits.length >= 2 && unassignedIndices.length === 0;
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;

    setLoading(true);
    setError(null);
    try {
      const splitPayload = splits
        .filter((s) => s.itemIndices.length > 0)
        .map((s) => ({ itemIndices: s.itemIndices }));

      const res = await authFetch("/api/fulfillment/split-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          splits: splitPayload,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to split order");
      }

      const data = await res.json();
      setResult(data);
      onSplitComplete(data.newOrderIds || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to split order");
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (result) {
    return (
      <div className="glass rounded-xl p-5">
        <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Check className="h-4 w-4 text-emerald-400" /> Order Split Complete
        </h3>
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-4">
          <p className="text-xs text-emerald-400 mb-2">Order successfully split into {result.splits.length} orders:</p>
          <div className="space-y-1">
            {result.splits.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-foreground font-mono">{s.orderId}</span>
                <span className="text-muted-foreground">{s.items} items · ${s.totalRevenue.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-5">
      <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <SplitSquareHorizontal className="h-4 w-4 text-accent" /> Split Order
      </h3>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
          <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Unassigned items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Unassigned Items</span>
            <span className="text-[10px] text-muted-foreground">{unassignedIndices.length} remaining</span>
          </div>
          <div className="space-y-2 min-h-[80px] p-3 rounded-lg bg-surface/50 border border-white/5 border-dashed">
            {unassignedIndices.length === 0 ? (
              <div className="flex items-center justify-center h-16">
                <p className="text-xs text-muted-foreground">All items assigned</p>
              </div>
            ) : (
              unassignedIndices.map((idx) => {
                const item = items[idx];
                return (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-surface/80 border border-white/5">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        ${item.price.toFixed(2)} × {item.quantity}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {splits.map((split) => (
                        <button
                          key={split.id}
                          onClick={() => addItemToSplit(split.id, idx)}
                          className="px-2 py-1 rounded text-[10px] font-medium bg-accent/20 text-accent hover:bg-accent/30 transition-all"
                        >
                          {split.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Splits */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Splits</span>
            <button
              onClick={addSplit}
              className="text-[10px] text-accent hover:underline"
            >
              + Add split
            </button>
          </div>
          <div className="space-y-3">
            {splits.map((split) => {
              const total = getSplitTotal(split.itemIndices);
              return (
                <div key={split.id} className="p-3 rounded-lg bg-surface/50 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-foreground">{split.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground">
                        ${total.toFixed(2)}
                      </span>
                      {splits.length > 2 && (
                        <button
                          onClick={() => removeSplit(split.id)}
                          className="p-1 rounded text-muted-foreground hover:text-red-400 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  {split.itemIndices.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground text-center py-3 border border-dashed border-white/5 rounded-lg">
                      No items assigned
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {split.itemIndices.map((idx) => {
                        const item = items[idx];
                        return (
                          <div key={idx} className="flex items-center gap-2 p-1.5 rounded bg-surface/80">
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-medium text-foreground truncate">{item.name}</p>
                            </div>
                            <button
                              onClick={() => removeItemFromSplit(split.id, idx)}
                              className="p-0.5 rounded text-muted-foreground hover:text-red-400 transition-colors"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="mt-4 pt-4 border-t border-white/10 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={loading || !canSubmit()}
          className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent/90 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <SplitSquareHorizontal className="h-3 w-3" />}
          {loading ? "Splitting..." : "Create Split"}
        </button>
      </div>
    </div>
  );
}
