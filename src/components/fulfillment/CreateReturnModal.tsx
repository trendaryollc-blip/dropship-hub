"use client";

import { useState } from "react";
import {
  Loader2, X, Search,
} from "lucide-react";
import type { FulfillmentOrder, ReturnReason } from "@/types/fulfillment";
import { RETURN_REASON_CONFIG } from "@/types/fulfillment";

interface CreateReturnModalProps {
  orders: FulfillmentOrder[];
  onSubmit: (data: {
    orderId: string;
    reason: ReturnReason;
    reasonDescription: string;
    items: Array<{ productId: string; quantity: number; condition?: string }>;
  }) => Promise<void>;
  onClose: () => void;
}

export default function CreateReturnModal({ orders, onSubmit, onClose }: CreateReturnModalProps) {
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<FulfillmentOrder | null>(null);
  const [reason, setReason] = useState<ReturnReason>("defective");
  const [description, setDescription] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<string, { quantity: number; condition: string }>>({});
  const [loading, setLoading] = useState(false);

  const deliveredOrders = orders.filter((o) => o.status === "delivered");
  const filteredOrders = deliveredOrders.filter(
    (o) =>
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase())
  );

  const handleItemToggle = (productId: string, _maxQty: number) => {
    setSelectedItems((prev) => {
      if (prev[productId]) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return { ...prev, [productId]: { quantity: 1, condition: "unused" } };
    });
  };

  const handleQuantityChange = (productId: string, qty: number) => {
    setSelectedItems((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], quantity: qty },
    }));
  };

  const handleSubmit = async () => {
    if (!selectedOrder || !description.trim() || Object.keys(selectedItems).length === 0) return;
    setLoading(true);
    try {
      await onSubmit({
        orderId: selectedOrder.id,
        reason,
        reasonDescription: description.trim(),
        items: Object.entries(selectedItems).map(([productId, data]) => ({
          productId,
          quantity: data.quantity,
          condition: data.condition,
        })),
      });
    } finally {
      setLoading(false);
    }
  };

  const totalRefund = selectedOrder
    ? Object.entries(selectedItems).reduce((sum, [pid, data]) => {
        const item = selectedOrder.items.find((i) => i.productId === pid);
        return sum + (item?.price || 0) * data.quantity;
      }, 0)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="font-display text-lg font-bold text-foreground">Create Return Request</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Order Selection */}
          {!selectedOrder ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search delivered orders..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-surface border border-white/10 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
                />
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {filteredOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No delivered orders found</p>
                ) : (
                  filteredOrders.map((order) => (
                    <button
                      key={order.id}
                      onClick={() => setSelectedOrder(order)}
                      className="w-full text-left p-3 rounded-lg bg-surface/50 border border-white/5 hover:border-accent/30 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">{order.orderNumber}</p>
                          <p className="text-xs text-muted-foreground">{order.customerName} · {order.items.length} item{order.items.length !== 1 ? "s" : ""}</p>
                        </div>
                        <p className="text-sm font-semibold text-foreground">${order.totalRevenue.toFixed(2)}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              {/* Selected Order */}
              <div className="p-3 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{selectedOrder.orderNumber}</p>
                  <p className="text-xs text-muted-foreground">{selectedOrder.customerName}</p>
                </div>
                <button onClick={() => { setSelectedOrder(null); setSelectedItems({}); }} className="text-xs text-accent hover:underline">
                  Change
                </button>
              </div>

              {/* Reason */}
              <div>
                <label className="text-xs font-medium text-foreground mb-2 block">Reason for Return</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.entries(RETURN_REASON_CONFIG) as [ReturnReason, { label: string; icon: string }][]).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => setReason(key)}
                      className={`p-2.5 rounded-lg border text-xs font-medium text-left transition-all ${
                        reason === key
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-white/10 bg-surface/50 text-muted-foreground hover:border-white/20"
                      }`}
                    >
                      <span className="mr-1.5">{config.icon}</span> {config.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-medium text-foreground mb-2 block">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue in detail..."
                  rows={3}
                  className="w-full px-3 py-2.5 bg-surface border border-white/10 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent resize-none"
                />
              </div>

              {/* Items */}
              <div>
                <label className="text-xs font-medium text-foreground mb-2 block">Select Items to Return</label>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, i) => {
                    const isSelected = !!selectedItems[item.productId];
                    return (
                      <div key={i} className={`p-3 rounded-lg border transition-all ${isSelected ? "border-accent/30 bg-accent/5" : "border-white/10 bg-surface/50"}`}>
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleItemToggle(item.productId, item.quantity)}
                            className="rounded border-white/20 accent-accent"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">${item.price.toFixed(2)} × {item.quantity}</p>
                          </div>
                          {isSelected && (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={1}
                                max={item.quantity}
                                value={selectedItems[item.productId]?.quantity || 1}
                                onChange={(e) => handleQuantityChange(item.productId, parseInt(e.target.value) || 1)}
                                className="w-14 px-2 py-1 bg-surface border border-white/10 rounded text-xs text-foreground text-center focus:outline-none focus:border-accent"
                              />
                              <select
                                value={selectedItems[item.productId]?.condition || "unused"}
                                onChange={(e) => setSelectedItems((prev) => ({ ...prev, [item.productId]: { ...prev[item.productId], condition: e.target.value } }))}
                                className="px-2 py-1 bg-surface border border-white/10 rounded text-xs text-foreground focus:outline-none focus:border-accent"
                              >
                                <option value="unused">Unused</option>
                                <option value="opened">Opened</option>
                                <option value="damaged">Damaged</option>
                                <option value="defective">Defective</option>
                              </select>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Refund Summary */}
              {Object.keys(selectedItems).length > 0 && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Estimated Refund</span>
                    <span className="text-lg font-bold text-emerald-400">${totalRefund.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {selectedOrder && (
          <div className="p-5 border-t border-white/10 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !description.trim() || Object.keys(selectedItems).length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent/90 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Submit Return Request
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
