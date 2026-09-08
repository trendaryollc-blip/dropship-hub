"use client";

import { useState } from "react";
import { Package, Truck, CheckCircle, Star, Clock, Plus, Loader2 } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useAPI, useMutation, revalidate } from "@/hooks/useAPI";
import type { SampleOrder } from "@/types/supplier";

const STATUS_CONFIG = {
  requested: { label: "Requested", color: "text-amber-400 bg-amber-400/10", icon: Clock },
  ordered: { label: "Ordered", color: "text-blue-400 bg-blue-400/10", icon: Package },
  shipped: { label: "Shipped", color: "text-purple-400 bg-purple-400/10", icon: Truck },
  delivered: { label: "Delivered", color: "text-emerald-400 bg-emerald-400/10", icon: CheckCircle },
  reviewed: { label: "Reviewed", color: "text-cyan-400 bg-cyan-400/10", icon: Star },
};

function StatusTracker({ status }: { status: string }) {
  const steps = ["requested", "ordered", "shipped", "delivered", "reviewed"];
  const currentIndex = steps.indexOf(status);

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => {
        const isActive = i <= currentIndex;
        const isCurrent = i === currentIndex;
        return (
          <div key={step} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${isActive ? "bg-accent" : "bg-white/10"} ${isCurrent ? "ring-2 ring-accent/30" : ""}`} />
            {i < steps.length - 1 && <div className={`w-4 h-0.5 ${i < currentIndex ? "bg-accent" : "bg-white/10"}`} />}
          </div>
        );
      })}
    </div>
  );
}

function QualityDisplay({ order }: { order: SampleOrder & { id: string } }) {
  if (!order.qualityBreakdown) return null;

  const categories = [
    { label: "Packaging", value: order.qualityBreakdown.packaging },
    { label: "Match", value: order.qualityBreakdown.productMatch },
    { label: "Material", value: order.qualityBreakdown.materialQuality },
    { label: "Craft", value: order.qualityBreakdown.craftsmanship },
  ];

  return (
    <div className="mt-2 p-2 rounded-lg bg-white/5">
      <div className="flex items-center gap-1 mb-1">
        <Star className="h-3 w-3 text-amber-400" />
        <span className="text-[10px] font-medium text-foreground">Quality: {order.qualityRating}/5</span>
      </div>
      <div className="grid grid-cols-4 gap-1">
        {categories.map((cat) => (
          <div key={cat.label} className="text-center">
            <div className="h-1 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-accent rounded-full" style={{ width: `${(cat.value / 5) * 100}%` }} />
            </div>
            <p className="text-[8px] text-muted-foreground mt-0.5">{cat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrderForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ supplierId: "", productName: "", samplePrice: "" });
  const { trigger, isMutating } = useMutation("/api/suppliers/samples", {
    onSuccess: () => { revalidate("/api/suppliers/samples"); onClose(); },
  });

  const handleSubmit = async () => {
    if (!form.supplierId || !form.productName) return;
    await trigger({
      body: {
        supplierId: form.supplierId,
        supplierName: form.supplierId,
        productName: form.productName,
        samplePrice: parseFloat(form.samplePrice) || 0,
      },
    });
  };

  return (
    <div className="glass rounded-xl p-4 border border-accent/20">
      <p className="text-xs font-semibold text-foreground mb-3">Order Sample</p>
      <div className="space-y-2">
        <input
          placeholder="Supplier ID"
          value={form.supplierId}
          onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
          className="w-full text-xs bg-white/5 border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground"
        />
        <input
          placeholder="Product Name"
          value={form.productName}
          onChange={(e) => setForm({ ...form, productName: e.target.value })}
          className="w-full text-xs bg-white/5 border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground"
        />
        <input
          placeholder="Sample Price ($)"
          type="number"
          value={form.samplePrice}
          onChange={(e) => setForm({ ...form, samplePrice: e.target.value })}
          className="w-full text-xs bg-white/5 border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground"
        />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 text-xs py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isMutating || !form.supplierId || !form.productName}
            className="flex-1 text-xs py-2 rounded-lg bg-accent text-white font-medium hover:opacity-90 transition-all disabled:opacity-50"
          >
            {isMutating ? <Loader2 className="h-3.5 w-3.5 animate-spin mx-auto" /> : "Order"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SampleOrderPanel() {
  const { ref, isInView } = useInView();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useAPI<{ orders: (SampleOrder & { id: string })[] }>(
    isInView ? "/api/suppliers/samples" : null
  );

  const orders = data?.orders || [];

  return (
    <div ref={ref} className="space-y-4">
      <div className="glass rounded-2xl border border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">Sample Orders</h3>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent/15 text-accent text-[10px] font-medium hover:bg-accent/25 transition-colors"
          >
            <Plus className="h-3 w-3" />
            New Order
          </button>
        </div>

        {showForm && <OrderForm onClose={() => setShowForm(false)} />}

        {isLoading ? (
          <div className="space-y-3 mt-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No sample orders yet. Order samples to test supplier quality.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => {
              const config = STATUS_CONFIG[order.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.requested;
              const StatusIcon = config.icon;
              return (
                <div key={order.id} className="glass rounded-xl p-3 border border-border">
                  <div className="flex items-start justify-between mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground truncate">{order.productName}</p>
                      <p className="text-[10px] text-muted-foreground">{order.supplierName}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium ${config.color}`}>
                      <StatusIcon className="h-2.5 w-2.5" />
                      {config.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <StatusTracker status={order.status} />
                    <span className="text-[10px] font-medium text-foreground">${order.samplePrice}</span>
                  </div>
                  {order.trackingNumber && (
                    <p className="text-[9px] text-muted-foreground mt-1">Tracking: {order.trackingNumber}</p>
                  )}
                  <QualityDisplay order={order} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
