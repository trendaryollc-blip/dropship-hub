"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Route, Clock, DollarSign, TrendingUp,
  ArrowRight, MapPin, Truck, Settings, Search,
  ChevronLeft, ChevronRight, Download, RefreshCw,
  Plus, ArrowUpDown, X, Loader2,
  Trash2, AlertCircle,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAPI, useMutation, revalidate } from "@/hooks/useAPI";
import { useToast } from "@/components/ui/Toast";
import type { RoutingDecision, RoutingPreferences, RoutingAnalytics, RoutingHistory } from "@/types/order";
import { cn } from "@/lib/utils";
import { formatDate, formatDateTime } from "@/lib/dates";

// ─── Helpers ─────────────────────────────────────────────────────

function buildQueryParams(params: Record<string, string>) {
  const entries = Object.entries(params).filter(([, v]) => v);
  return entries.length > 0 ? "?" + new URLSearchParams(entries).toString() : "";
}

function getPageNumbers(current: number, total: number): number[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  const start = Math.max(1, Math.min(current - 2, total - 4));
  const end = Math.min(total, start + 4);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function exportToCSV(data: RoutingHistory[]) {
  const headers = ["Order ID", "Product", "Location", "Supplier", "Days", "Cost", "Status", "Date"];
  const rows = data.map((h) => [
    h.orderId, h.productTitle, h.customerLocation, h.selectedSupplier,
    h.shippingDays != null ? String(h.shippingDays) : "",
    h.totalCost != null ? `$${h.totalCost.toFixed(2)}` : h.shippingCost != null ? `$${h.shippingCost.toFixed(2)}` : "",
    h.status || "routed",
    formatDate(h.routedAt),
  ]);
  const csv = [headers, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `routing-history-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Sub-components ──────────────────────────────────────────────

function MiniSparkline({ points, color }: { points: number[]; color: string }) {
  if (points.length < 2) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const w = 70;
  const h = 24;
  const path = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((p - min) / range) * h;
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function KPICard({ label, value, prefix, suffix, icon: Icon, color, sparkline, delay }: {
  label: string; value: number | null; prefix?: string; suffix?: string; icon: typeof Route; color: string; sparkline?: number[]; delay: number;
}) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const count = useAnimatedCounter(value ?? 0, 1500, isInView);
  const colorMap: Record<string, string> = {
    "text-emerald-400": "#22c55e",
    "text-blue-400": "#3b82f6",
    "text-purple-400": "#a855f7",
    "text-amber-400": "#f59e0b",
  };
  return (
    <div ref={ref} className={cn("glass rounded-xl p-3 sm:p-4 transition-all duration-500 hover:border-accent/20 hover:bg-surface-hover", isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")} style={{ transitionDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between mb-2">
        <div className={cn("flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg", `${color}/10`)}>
          <Icon className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", color)} />
        </div>
        {sparkline && sparkline.length > 0 && <MiniSparkline points={sparkline} color={colorMap[color] || "#3b82f6"} />}
      </div>
      <p className="font-display text-lg sm:text-2xl font-bold text-foreground">{value == null ? "—" : `${prefix || ""}${count.toLocaleString()}${suffix || ""}`}</p>
      <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function supplierLabel(selected: RoutingDecision["selectedSupplier"]): string {
  if (selected && typeof selected === "object") return selected.supplierName;
  if (typeof selected === "string" && selected) return selected;
  return "Pending routing";
}

function formatMoney(value: number | null | undefined): string {
  return value != null ? `$${value.toFixed(2)}` : "—";
}

function DecisionCard({ decision, delay, onClick, onReRoute, onDelete }: {
  decision: RoutingDecision; delay: number; onClick: () => void; onReRoute: () => void; onDelete: () => void;
}) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const statusColors: Record<string, string> = {
    routed: "text-emerald-400 bg-emerald-400/10",
    pending: "text-amber-400 bg-amber-400/10",
    fallback: "text-blue-400 bg-blue-400/10",
    failed: "text-red-400 bg-red-400/10",
  };
  const supplier = decision.selectedSupplier && typeof decision.selectedSupplier === "object" ? decision.selectedSupplier : null;
  const supplierName = supplierLabel(decision.selectedSupplier);
  const legacyDays = (decision as unknown as { shippingDays?: number | null }).shippingDays;
  const shippingDays = supplier ? supplier.shippingDays : typeof legacyDays === "number" ? legacyDays : null;
  const qualityScore = supplier ? supplier.qualityScore : null;
  const stockLevel = supplier ? supplier.stockLevel : null;

  return (
    <div ref={ref} className={cn("glass rounded-xl p-3 sm:p-4 transition-all duration-500 hover:border-accent/20 hover:bg-surface-hover cursor-pointer group", isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4")} style={{ transitionDelay: `${delay}ms` }} onClick={onClick}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-xl sm:text-2xl">{decision.productImage || "📦"}</span>
          <div>
            <h4 className="font-display text-xs sm:text-sm font-semibold text-foreground">{decision.productTitle}</h4>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground">{decision.orderId} &middot; {decision.customerName || "Customer"} &middot; {decision.customerLocation}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className={cn("px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold", statusColors[decision.status] || statusColors.routed)}>{decision.status}</span>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <button onClick={onReRoute} className="p-1 rounded hover:bg-surface-hover" title="Re-route">
              <RefreshCw className="h-3 w-3 text-muted-foreground hover:text-foreground" />
            </button>
            <button onClick={onDelete} className="p-1 rounded hover:bg-surface-hover" title="Delete">
              <Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-400" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 p-2 rounded-lg bg-surface text-center">
          <MapPin className="h-3 w-3 text-muted-foreground mx-auto mb-0.5" />
          <p className="text-[8px] sm:text-[9px] text-muted-foreground">Customer</p>
          <p className="text-[9px] sm:text-[10px] font-semibold text-foreground">{decision.customerLocation}</p>
        </div>
        <ArrowRight className="h-3 w-3 text-accent shrink-0" />
        <div className="flex-1 p-2 rounded-lg bg-accent/10 border border-accent/20 text-center">
          <Truck className="h-3 w-3 text-accent mx-auto mb-0.5" />
          <p className="text-[8px] sm:text-[9px] text-muted-foreground">Supplier</p>
          <p className="text-[9px] sm:text-[10px] font-semibold text-accent">{supplierName}</p>
        </div>
        <ArrowRight className="h-3 w-3 text-accent shrink-0" />
        <div className="flex-1 p-2 rounded-lg bg-surface text-center">
          <Clock className="h-3 w-3 text-muted-foreground mx-auto mb-0.5" />
          <p className="text-[8px] sm:text-[9px] text-muted-foreground">Delivery</p>
          <p className="text-[9px] sm:text-[10px] font-semibold text-foreground">{shippingDays != null ? `${shippingDays}d` : "—"}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 mb-3">
        <div className="p-1.5 rounded-lg bg-surface text-center">
          <p className="text-[8px] text-muted-foreground">Quality</p>
          <p className="text-[9px] sm:text-[10px] font-bold text-foreground">{qualityScore != null ? `${qualityScore}/100` : "—"}</p>
        </div>
        <div className="p-1.5 rounded-lg bg-surface text-center">
          <p className="text-[8px] text-muted-foreground">Stock</p>
          <p className="text-[9px] sm:text-[10px] font-bold text-foreground">{stockLevel != null ? stockLevel : "—"}</p>
        </div>
        <div className="p-1.5 rounded-lg bg-surface text-center">
          <p className="text-[8px] text-muted-foreground">Cost</p>
          <p className="text-[9px] sm:text-[10px] font-bold text-emerald-400">{decision.totalCost != null ? `$${decision.totalCost.toFixed(2)}` : "—"}</p>
        </div>
      </div>

      <div className="p-2 rounded-lg bg-surface">
        <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{decision.reasoning}</p>
      </div>

      {decision.alternativeSuppliers && decision.alternativeSuppliers.length > 0 && (
        <div className="mt-2">
          <p className="text-[8px] sm:text-[9px] text-muted-foreground mb-1">Alternatives considered:</p>
          <div className="flex flex-wrap gap-1">
            {decision.alternativeSuppliers.map((alt) => (
              <span key={alt.supplierId} className="px-1.5 py-0.5 rounded bg-surface text-[8px] text-muted-foreground">
                {alt.supplierName} ({alt.shippingDays}d, ${alt.totalCost.toFixed(2)})
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OrderDetailModal({ decision, onClose }: { decision: RoutingDecision | null; onClose: () => void }) {
  if (!decision) return null;
  const supplier = typeof decision.selectedSupplier === "object" ? decision.selectedSupplier : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-2xl mx-4 bg-surface border border-border rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 flex items-center justify-between p-4 border-b border-border bg-surface rounded-t-2xl">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{decision.productImage || "📦"}</span>
            <div>
              <h3 className="font-display text-sm font-semibold text-foreground">{decision.productTitle}</h3>
              <p className="text-[10px] text-muted-foreground">{decision.orderId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover"><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="p-2 rounded-lg bg-surface text-center">
              <p className="text-[9px] text-muted-foreground">Status</p>
              <p className={cn("text-xs font-bold capitalize", decision.status === "routed" ? "text-emerald-400" : decision.status === "pending" ? "text-amber-400" : decision.status === "failed" ? "text-red-400" : "text-blue-400")}>{decision.status}</p>
            </div>
            <div className="p-2 rounded-lg bg-surface text-center">
              <p className="text-[9px] text-muted-foreground">Total Cost</p>
              <p className="text-xs font-bold text-emerald-400">{decision.totalCost != null ? `$${decision.totalCost.toFixed(2)}` : "—"}</p>
            </div>
            <div className="p-2 rounded-lg bg-surface text-center">
              <p className="text-[9px] text-muted-foreground">Shipping</p>
              <p className="text-xs font-bold text-foreground">{supplier?.shippingDays != null ? `${supplier.shippingDays}d` : "—"}</p>
            </div>
            <div className="p-2 rounded-lg bg-surface text-center">
              <p className="text-[9px] text-muted-foreground">Quality</p>
              <p className="text-xs font-bold text-foreground">{supplier?.qualityScore != null ? `${supplier.qualityScore}/100` : "—"}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 p-3 rounded-lg bg-surface text-center">
              <MapPin className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
              <p className="text-[9px] text-muted-foreground">Customer</p>
              <p className="text-[10px] font-semibold text-foreground">{decision.customerName || "Customer"}</p>
              <p className="text-[10px] text-muted-foreground">{decision.customerLocation}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-accent shrink-0" />
            <div className="flex-1 p-3 rounded-lg bg-accent/10 border border-accent/20 text-center">
              <Truck className="h-4 w-4 text-accent mx-auto mb-1" />
              <p className="text-[9px] text-muted-foreground">Supplier</p>
              <p className="text-[10px] font-semibold text-accent">{supplierLabel(decision.selectedSupplier)}</p>
              <p className="text-[10px] text-muted-foreground">{supplier?.location || ""}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-accent shrink-0" />
            <div className="flex-1 p-3 rounded-lg bg-surface text-center">
              <Clock className="h-4 w-4 text-muted-foreground mx-auto mb-1" />
              <p className="text-[9px] text-muted-foreground">Est. Delivery</p>
              <p className="text-[10px] font-semibold text-foreground">{decision.estimatedDelivery || (supplier?.shippingDays != null ? `${supplier.shippingDays} days` : "—")}</p>
            </div>
          </div>

          {supplier && (
            <div className="p-3 rounded-lg bg-surface">
              <h4 className="text-[10px] font-semibold text-foreground mb-2">Supplier Details</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[9px]">
                <div><span className="text-muted-foreground">Unit Cost:</span> <span className="font-semibold text-foreground">${supplier.unitCost?.toFixed(2)}</span></div>
                <div><span className="text-muted-foreground">Shipping Cost:</span> <span className="font-semibold text-foreground">${supplier.shippingCost?.toFixed(2)}</span></div>
                <div><span className="text-muted-foreground">Stock Level:</span> <span className="font-semibold text-foreground">{supplier.stockLevel}</span></div>
                <div><span className="text-muted-foreground">Reliability:</span> <span className="font-semibold text-foreground">{supplier.reliabilityScore}%</span></div>
                <div><span className="text-muted-foreground">Total Score:</span> <span className="font-semibold text-foreground">{supplier.totalScore}</span></div>
                <div><span className="text-muted-foreground">In Stock:</span> <span className={cn("font-semibold", supplier.inStock ? "text-emerald-400" : "text-red-400")}>{supplier.inStock ? "Yes" : "No"}</span></div>
              </div>
            </div>
          )}

          <div className="p-3 rounded-lg bg-surface">
            <h4 className="text-[10px] font-semibold text-foreground mb-1">Routing Reasoning</h4>
            <p className="text-[10px] text-muted-foreground leading-relaxed">{decision.reasoning}</p>
          </div>

          {decision.alternativeSuppliers && decision.alternativeSuppliers.length > 0 && (
            <div className="p-3 rounded-lg bg-surface">
              <h4 className="text-[10px] font-semibold text-foreground mb-2">Alternative Suppliers</h4>
              <div className="space-y-1.5">
                {decision.alternativeSuppliers.map((alt) => (
                  <div key={alt.supplierId} className="flex items-center justify-between text-[9px]">
                    <span className="text-foreground">{alt.supplierName}</span>
                    <div className="flex gap-2 text-muted-foreground">
                      <span>{alt.shippingDays}d</span>
                      <span>${alt.totalCost.toFixed(2)}</span>
                      <span>{alt.qualityScore}/100</span>
                      {alt.rejectionReason && <span className="text-red-400">{alt.rejectionReason}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-[9px] text-muted-foreground">
            <span>Routed: {formatDateTime(decision.routedAt) || "N/A"}</span>
            {decision.orderDate && <span>Order Date: {decision.orderDate}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function EditableSettingsPanel({ preferences, onSave, prefsLoaded }: { preferences: RoutingPreferences | null; onSave: () => void; prefsLoaded?: boolean }) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [opt, setOpt] = useState<"speed" | "cost" | "balanced">(preferences?.optimization || "balanced");
  const [maxShip, setMaxShip] = useState(preferences?.maxShippingDays || 14);
  const [minQuality, setMinQuality] = useState(preferences?.minQualityScore || 70);
  const [localWh, setLocalWh] = useState(preferences?.preferLocalWarehouse || false);
  const [autoFB, setAutoFB] = useState(preferences?.autoFallback !== false);

  // Server preferences arrive async — keep the form in sync with them so an
  // early edit never saves stale defaults over the user's real settings.
  useEffect(() => {
    if (!preferences || editing) return;
    setOpt(preferences.optimization);
    setMaxShip(preferences.maxShippingDays);
    setMinQuality(preferences.minQualityScore);
    setLocalWh(preferences.preferLocalWarehouse);
    setAutoFB(preferences.autoFallback);
  }, [preferences, editing]);

  const saveMutation = useMutation<{ success: boolean; message: string }>("/api/orders", {
    onSuccess: () => {
      toast.success("Routing preferences saved");
      onSave();
      setEditing(false);
    },
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveMutation.trigger({
        method: "PUT",
        body: { optimization: opt, maxShippingDays: maxShip, minQualityScore: minQuality, preferLocalWarehouse: localWh, autoFallback: autoFB },
      });
    } catch {
      toast.error("Failed to save preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const optColors: Record<string, string> = {
    speed: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    cost: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    balanced: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  };

  return (
    <div ref={ref} className={cn("glass rounded-2xl p-4 sm:p-5 transition-all duration-700", isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6")}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-accent" />
          <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Routing Preferences</h3>
        </div>
        {!editing ? (
          <button onClick={() => setEditing(true)} disabled={prefsLoaded === false} className="px-3 py-1.5 rounded-xl text-[10px] sm:text-[11px] font-medium text-accent hover:bg-accent/10 border border-accent/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            Edit Settings
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-xl text-[10px] sm:text-[11px] font-medium text-muted-foreground hover:bg-surface-hover border border-border transition-all">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving || prefsLoaded === false} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] sm:text-[11px] font-medium text-white bg-accent hover:bg-accent/80 transition-all disabled:opacity-50">
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Save
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <div>
            <label className="text-[9px] sm:text-[10px] text-muted-foreground mb-1 block">Optimization Mode</label>
            <div className="flex gap-1.5">
              {(["speed", "cost", "balanced"] as const).map((m) => (
                <button key={m} onClick={() => setOpt(m)} className={cn("flex-1 px-2 py-2 rounded-lg text-[10px] sm:text-[11px] font-semibold border transition-all capitalize", opt === m ? optColors[m] : "text-muted-foreground bg-surface border-border")}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] sm:text-[10px] text-muted-foreground mb-1 block">Max Shipping Days</label>
              <input type="number" value={maxShip} onChange={(e) => setMaxShip(parseInt(e.target.value) || 1)} min={1} max={365} className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:border-accent/30 transition-all" />
            </div>
            <div>
              <label className="text-[9px] sm:text-[10px] text-muted-foreground mb-1 block">Min Quality Score</label>
              <input type="number" value={minQuality} onChange={(e) => setMinQuality(parseInt(e.target.value) || 0)} min={0} max={100} className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:border-accent/30 transition-all" />
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-surface">
            <div>
              <p className="text-[10px] font-semibold text-foreground">Prefer Local Warehouse</p>
              <p className="text-[9px] text-muted-foreground">Prioritize suppliers in the customer&apos;s region</p>
            </div>
            <button onClick={() => setLocalWh(!localWh)} className={cn("w-10 h-5 rounded-full transition-all relative", localWh ? "bg-accent" : "bg-surface-hover border border-border")}>
              <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all", localWh ? "left-[22px]" : "left-0.5")} />
            </button>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-surface">
            <div>
              <p className="text-[10px] font-semibold text-foreground">Auto Fallback</p>
              <p className="text-[9px] text-muted-foreground">Automatically try alternative suppliers if primary fails</p>
            </div>
            <button onClick={() => setAutoFB(!autoFB)} className={cn("w-10 h-5 rounded-full transition-all relative", autoFB ? "bg-accent" : "bg-surface-hover border border-border")}>
              <span className={cn("absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all", autoFB ? "left-[22px]" : "left-0.5")} />
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-surface">
            <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-1">Optimization</p>
            <span className={cn("px-2 py-1 rounded-lg text-[10px] sm:text-[11px] font-semibold border", optColors[preferences?.optimization || "balanced"])}>{preferences?.optimization || "balanced"}</span>
          </div>
          <div className="p-3 rounded-xl bg-surface">
            <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-1">Max Shipping</p>
            <p className="text-xs sm:text-sm font-bold text-foreground">{preferences?.maxShippingDays || 14} days</p>
          </div>
          <div className="p-3 rounded-xl bg-surface">
            <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-1">Min Quality</p>
            <p className="text-xs sm:text-sm font-bold text-foreground">{preferences?.minQualityScore || 70}/100</p>
          </div>
          <div className="p-3 rounded-xl bg-surface">
            <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-1">Auto Fallback</p>
            <p className={cn("text-xs sm:text-sm font-bold", preferences?.autoFallback ? "text-emerald-400" : "text-red-400")}>{preferences?.autoFallback ? "Enabled" : "Disabled"}</p>
          </div>
          <div className="p-3 rounded-xl bg-surface col-span-2">
            <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-1">Local Warehouse Preference</p>
            <p className={cn("text-xs sm:text-sm font-bold", preferences?.preferLocalWarehouse ? "text-emerald-400" : "text-red-400")}>{preferences?.preferLocalWarehouse ? "Enabled" : "Disabled"}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function AnalyticsPanel({ analytics, dateRange, onDateRangeChange }: { analytics: RoutingAnalytics; dateRange: string; onDateRangeChange: (v: string) => void }) {
  const { ref, isInView } = useInView({ threshold: 0.2 });
  const total = analytics.supplierDistribution.reduce((sum, s) => sum + s.count, 0) || 1;

  return (
    <div ref={ref} className={cn("glass rounded-2xl p-4 sm:p-5 transition-all duration-700", isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6")}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Routing Analytics</h3>
        <select value={dateRange} onChange={(e) => onDateRangeChange(e.target.value)} className="px-2 py-1 rounded-lg text-[10px] bg-surface border border-border text-foreground focus:outline-none cursor-pointer">
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">All time</option>
        </select>
      </div>

      <div className="space-y-3">
        {analytics.supplierDistribution.map((s) => {
          const pct = (s.count / total) * 100;
          return (
            <div key={s.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] sm:text-[11px] text-muted-foreground">{s.name}</span>
                <span className="text-[10px] sm:text-[11px] font-semibold text-foreground">{s.count} ({pct.toFixed(0)}%)</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${pct}%`, backgroundColor: s.color }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="p-2 rounded-lg bg-surface text-center">
          <p className="text-[9px] text-muted-foreground">Cost Savings</p>
          <p className="text-xs sm:text-sm font-bold text-muted-foreground">{analytics.costSavings != null ? `$${analytics.costSavings.toFixed(2)}` : "Not tracked"}</p>
        </div>
        <div className="p-2 rounded-lg bg-surface text-center">
          <p className="text-[9px] text-muted-foreground">Avg Time Saved</p>
          <p className="text-xs sm:text-sm font-bold text-muted-foreground">{analytics.timeSavings != null ? `${analytics.timeSavings}d` : "Not tracked"}</p>
        </div>
      </div>

      {analytics.optimizationBreakdown && analytics.optimizationBreakdown.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-surface">
          <p className="text-[9px] text-muted-foreground mb-2">Optimization Distribution</p>
          <div className="flex gap-2">
            {analytics.optimizationBreakdown.map((o) => (
              <div key={o.type} className="flex-1 text-center">
                <p className="text-[10px] font-bold text-foreground">{o.count}</p>
                <p className="text-[8px] text-muted-foreground">{o.type}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SortHeader({ field, sortField, onSort, children }: {
  field: string; sortField: string; onSort: (field: string) => void; children: React.ReactNode;
}) {
  return (
    <th className="py-2 text-[10px] sm:text-[11px] font-semibold text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none" onClick={() => onSort(field)}>
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className={cn("h-2.5 w-2.5", sortField === field ? "text-accent" : "opacity-30")} />
      </div>
    </th>
  );
}

function HistoryTable({ history, onSearch, search, onExport, onDelete, error, onRetry }: {
  history: RoutingHistory[]; onSearch: (s: string) => void; search: string; onExport: () => void; onDelete: (id: string) => void; error?: unknown; onRetry?: () => void;
}) {
  const { ref, isInView } = useInView({ threshold: 0.2 });
  const [sortField, setSortField] = useState<string>("routedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const arr = [...history];
    arr.sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";
      if (sortField === "orderId") { aVal = a.orderId; bVal = b.orderId; }
      else if (sortField === "productTitle") { aVal = a.productTitle; bVal = b.productTitle; }
      else if (sortField === "selectedSupplier") { aVal = a.selectedSupplier; bVal = b.selectedSupplier; }
      else if (sortField === "shippingDays") { aVal = a.shippingDays ?? 0; bVal = b.shippingDays ?? 0; }
      else if (sortField === "totalCost") { aVal = a.totalCost ?? a.shippingCost ?? 0; bVal = b.totalCost ?? b.shippingCost ?? 0; }
      else if (sortField === "status") { aVal = a.status || ""; bVal = b.status || ""; }
      else { aVal = a.routedAt || ""; bVal = b.routedAt || ""; }
      if (typeof aVal === "string") return sortDir === "asc" ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      return sortDir === "asc" ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
    return arr;
  }, [history, sortField, sortDir]);

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  };

  return (
    <div ref={ref} className={cn("glass rounded-2xl p-3 sm:p-5 transition-all duration-700 overflow-x-auto", isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6")}>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Routing History</h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
            <input type="text" placeholder="Search orders..." value={search} onChange={(e) => onSearch(e.target.value)} className="pl-7 pr-3 py-1.5 rounded-lg text-[10px] bg-surface border border-border text-foreground w-40 focus:outline-none focus:border-accent/30 transition-all" />
          </div>
          <button onClick={onExport} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-surface-hover border border-border transition-all">
            <Download className="h-3 w-3" /> Export
          </button>
        </div>
      </div>

      <table className="w-full min-w-[700px]">
        <thead>
          <tr className="border-b border-border">
            <SortHeader field="orderId" sortField={sortField} onSort={toggleSort}>Order</SortHeader>
            <SortHeader field="productTitle" sortField={sortField} onSort={toggleSort}>Product</SortHeader>
            <th className="py-2 text-[10px] sm:text-[11px] font-semibold text-muted-foreground text-left">Location</th>
            <SortHeader field="selectedSupplier" sortField={sortField} onSort={toggleSort}>Supplier</SortHeader>
            <SortHeader field="shippingDays" sortField={sortField} onSort={toggleSort}>Days</SortHeader>
            <SortHeader field="totalCost" sortField={sortField} onSort={toggleSort}>Cost</SortHeader>
            <SortHeader field="status" sortField={sortField} onSort={toggleSort}>Status</SortHeader>
            <th className="py-2 text-[10px] sm:text-[11px] font-semibold text-muted-foreground text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((h) => (
            <tr key={h.id} className="border-b border-border/50 hover:bg-surface-hover transition-colors">
              <td className="py-2 text-[10px] sm:text-[11px] font-semibold text-foreground">{h.orderId}</td>
              <td className="py-2 text-[10px] sm:text-[11px] text-foreground max-w-[150px] truncate">{h.productTitle}</td>
              <td className="py-2 text-[10px] sm:text-[11px] text-muted-foreground">{h.customerLocation}</td>
              <td className="py-2 text-[10px] sm:text-[11px] text-accent">{h.selectedSupplier}</td>
              <td className="py-2 text-[10px] sm:text-[11px] text-center text-foreground">{h.shippingDays != null ? `${h.shippingDays}d` : "—"}</td>
              <td className="py-2 text-[10px] sm:text-[11px] text-center text-emerald-400">{formatMoney(h.totalCost ?? h.shippingCost)}</td>
              <td className="py-2 text-center">
                <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-semibold", h.status === "routed" ? "text-emerald-400 bg-emerald-400/10" : h.status === "pending" ? "text-amber-400 bg-amber-400/10" : h.status === "failed" ? "text-red-400 bg-red-400/10" : "text-blue-400 bg-blue-400/10")}>
                  {h.status || "routed"}
                </span>
              </td>
              <td className="py-2 text-center">
                <button onClick={() => onDelete(h.id)} className="p-1 rounded hover:bg-surface-hover" title="Delete">
                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-red-400" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {error && sorted.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-xs text-muted-foreground mb-3">Couldn&apos;t load routing history.</p>
          {onRetry && (
            <button onClick={onRetry} className="px-3 py-1.5 rounded-xl bg-surface border border-border text-[10px] font-semibold text-foreground hover:bg-surface-hover transition-all">
              Retry
            </button>
          )}
        </div>
      ) : sorted.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-xs text-muted-foreground">{search ? "No history entries match your search" : "No history entries found"}</p>
        </div>
      ) : null}
    </div>
  );
}

function RouteOrderModal({ open, onClose, onRoute }: { open: boolean; onClose: () => void; onRoute: (data: { orderId: string; customerLocation: string; productTitle: string; customerName: string; quantity: number; totalPrice: number }) => void }) {
  const [orderId, setOrderId] = useState("");
  const [location, setLocation] = useState("");
  const [product, setProduct] = useState("");
  const [customer, setCustomer] = useState("");
  const [qty, setQty] = useState(1);
  const [price, setPrice] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!orderId.trim() || !location.trim() || !product.trim()) return;
    setLoading(true);
    try {
      await onRoute({ orderId: orderId.trim(), customerLocation: location.trim(), productTitle: product.trim(), customerName: customer.trim() || "Customer", quantity: qty, totalPrice: price });
      setOrderId(""); setLocation(""); setProduct(""); setCustomer(""); setQty(1); setPrice(0);
      onClose();
    } catch {
      // Parent already toasted the failure — keep the form filled so input isn't lost.
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-md mx-4 bg-surface border border-border rounded-2xl shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-accent" />
            <h3 className="font-display text-sm font-semibold text-foreground">Route New Order</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover"><X className="h-4 w-4 text-muted-foreground" /></button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[9px] text-muted-foreground mb-1 block">Order ID *</label>
            <input type="text" value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="ORD-001" className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/30 transition-all" />
          </div>
          <div>
            <label className="text-[9px] text-muted-foreground mb-1 block">Product Title *</label>
            <input type="text" value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Product name" className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/30 transition-all" />
          </div>
          <div>
            <label className="text-[9px] text-muted-foreground mb-1 block">Customer Location *</label>
            <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="New York, US" className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/30 transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[9px] text-muted-foreground mb-1 block">Customer Name</label>
              <input type="text" value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="John Doe" className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/30 transition-all" />
            </div>
            <div>
              <label className="text-[9px] text-muted-foreground mb-1 block">Quantity</label>
              <input type="number" value={qty} onChange={(e) => setQty(parseInt(e.target.value) || 1)} min={1} className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:border-accent/30 transition-all" />
            </div>
          </div>
          <div>
            <label className="text-[9px] text-muted-foreground mb-1 block">Total Price ($)</label>
            <input type="number" value={price} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} min={0} step={0.01} className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:border-accent/30 transition-all" />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:bg-surface-hover border border-border transition-all">Cancel</button>
          <button onClick={handleSubmit} disabled={loading || !orderId.trim() || !location.trim() || !product.trim()} className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-medium text-white bg-accent hover:bg-accent/80 transition-all disabled:opacity-50">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Route className="h-3 w-3" />}
            Route Order
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────

export default function OrderRouterPage() {
  const { user } = useAuth();
  const uid = user?.uid || "";
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"queue" | "analytics" | "history" | "settings">("queue");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [page, setPage] = useState(1);
  const [dateRange, setDateRange] = useState("30");
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [detailDecision, setDetailDecision] = useState<RoutingDecision | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const pageSize = 12;
  const baseParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (search) p.search = search;
    if (statusFilter) p.status = statusFilter;
    if (supplierFilter) p.supplier = supplierFilter;
    return p;
  }, [search, statusFilter, supplierFilter]);

  const { data: dData, error: dError, isLoading: dLoading, mutate: mutateDecisions } = useAPI<{ decisions?: RoutingDecision[]; totalCount?: number; page?: number; limit?: number; totalPages?: number }>(
    uid ? `/api/orders?type=decisions&page=${page}&limit=${pageSize}&${buildQueryParams(baseParams)}` : null
  );
  const { data: pData, error: pError } = useAPI<{ preferences?: RoutingPreferences }>(
    uid ? `/api/orders?type=preferences` : null
  );
  const { data: aData, error: aError, isLoading: aLoading, mutate: mutateAnalytics } = useAPI<{ analytics?: RoutingAnalytics }>(
    uid ? `/api/orders?type=analytics&days=${dateRange}` : null
  );
  const { data: hData, error: hError, mutate: mutateHistory } = useAPI<{ history?: RoutingHistory[] }>(
    uid ? `/api/orders?type=history&limit=100&${buildQueryParams(baseParams)}` : null
  );
  const { data: sData } = useAPI<{ suppliers?: string[] }>(
    uid ? `/api/orders?type=suppliers` : null
  );

  const decisions = dData?.decisions || [];
  const preferences = pData?.preferences || null;
  const analytics = aData?.analytics || null;
  const history = hData?.history || [];
  const suppliers = sData?.suppliers || [];
  const totalPages = dData?.totalPages || 1;
  const totalCount = dData?.totalCount || 0;
  const prefsLoaded = pData !== undefined || pError != null;
  const loading = !user || (dLoading && !dData);

  const routeMutation = useMutation<{ success: boolean; message: string }>("/api/orders", {
    onSuccess: () => {
      toast.success("Order queued for routing");
      revalidate("/api/orders?type=decisions");
      revalidate("/api/orders?type=analytics");
      revalidate("/api/orders?type=history");
    },
  });

  const deleteMutation = useMutation<{ success: boolean; message: string }>("/api/orders", {
    onSuccess: () => {
      toast.success("Routing decision deleted");
      revalidate("/api/orders?type=decisions");
      revalidate("/api/orders?type=history");
      revalidate("/api/orders?type=analytics");
    },
  });

  const handleRouteOrder = async (data: { orderId: string; customerLocation: string; productTitle: string; customerName: string; quantity: number; totalPrice: number }) => {
    try {
      await routeMutation.trigger({
        body: { action: "route", ...data },
        method: "POST",
      });
    } catch (e) {
      toast.error("Failed to route order. Please try again.");
      throw e;
    }
  };

  const handleReRoute = async (decisionId: string) => {
    try {
      await routeMutation.trigger({
        body: { decisionId, reason: "Re-routed by user" },
        method: "PATCH",
        url: "/api/orders",
      });
      toast.success("Order queued for re-routing");
      revalidate("/api/orders?type=decisions");
    } catch {
      toast.error("Failed to re-route order");
    }
  };

  const handleDelete = async (decisionId: string) => {
    try {
      await deleteMutation.trigger({ method: "DELETE", url: `/api/orders?id=${decisionId}` });
    } catch {
      toast.error("Failed to delete decision");
    }
  };

  const handleSavePreferences = () => {
    // The panel's own saveMutation already toasted success; just refresh the cached prefs.
    revalidate("/api/orders?type=preferences");
  };

  const pendingCount = decisions.filter((d) => d.status === "pending").length;

  // Only the orders KPI has a real daily series in the API — never fabricate
  // sparkline shapes for shipping/cost/savings.
  const ordersSparkline = useMemo(() => {
    const daily = analytics?.dailyCounts;
    if (!daily || daily.length < 2) return [];
    return daily.slice(-7).map((d) => d.count);
  }, [analytics]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 px-3 sm:px-4 lg:px-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Order Router</h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">Multi-channel order routing. New orders are queued, then suppliers are ranked by your routing preferences across location, stock, speed, and cost.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-400/10 border border-amber-400/20 text-[10px] sm:text-[11px] font-semibold text-amber-400">
              <Clock className="h-3 w-3" />
              {pendingCount} Pending
            </span>
          )}
          <button onClick={() => setShowRouteModal(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] sm:text-[11px] font-semibold text-white bg-accent hover:bg-accent/80 transition-all shadow-lg shadow-accent/20">
            <Plus className="h-3 w-3" />
            Route Order
          </button>
          <div className="flex items-center bg-surface rounded-xl border border-border p-0.5">
            {(["queue", "analytics", "history", "settings"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={cn("px-2 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-semibold capitalize transition-all", activeTab === tab ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-muted-foreground hover:text-foreground")}>
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="glass rounded-2xl p-12 text-center">
          <div className="h-10 w-10 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading routing data...</p>
        </div>
      ) : dError && !dData ? (
        <div className="glass rounded-2xl p-12 text-center">
          <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-1">Couldn&apos;t load routing data.</p>
          <p className="text-xs text-muted-foreground/70 mb-4">{dError instanceof Error ? dError.message : "Something went wrong."}</p>
          <button onClick={() => mutateDecisions()} className="px-4 py-2 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground hover:bg-surface-hover transition-all">
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Queue Tab */}
          {activeTab === "queue" && (
            <>
              {analytics && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
                  <KPICard label="Orders Routed" value={analytics.totalRouted} icon={Route} color="text-emerald-400" sparkline={ordersSparkline} delay={0} />
                  <KPICard label="Avg Shipping" value={analytics.avgShippingDays} suffix="d" icon={Clock} color="text-blue-400" delay={100} />
                  <KPICard label="Avg Cost" value={analytics.avgCost} prefix="$" icon={DollarSign} color="text-purple-400" delay={200} />
                  <KPICard label="Cost Savings" value={analytics.costSavings} prefix="$" icon={TrendingUp} color="text-amber-400" delay={300} />
                </div>
              )}

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input type="text" placeholder="Search orders, products, suppliers..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="w-full pl-8 pr-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/30 transition-all" />
                </div>
                <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2 rounded-xl text-[10px] sm:text-[11px] font-medium bg-surface border border-border text-foreground focus:outline-none cursor-pointer">
                  <option value="">All Statuses</option>
                  <option value="routed">Routed</option>
                  <option value="pending">Pending</option>
                  <option value="fallback">Fallback</option>
                  <option value="failed">Failed</option>
                </select>
                <select value={supplierFilter} onChange={(e) => { setSupplierFilter(e.target.value); setPage(1); }} className="px-3 py-2 rounded-xl text-[10px] sm:text-[11px] font-medium bg-surface border border-border text-foreground focus:outline-none cursor-pointer">
                  <option value="">All Suppliers</option>
                  {suppliers.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {decisions.length === 0 ? (
                <div className="text-center py-16 glass rounded-2xl">
                  <Route className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="font-display text-lg font-semibold text-foreground mb-2">No routing decisions yet</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-4">Orders will appear here once they are routed to suppliers.</p>
                  <button onClick={() => setShowRouteModal(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium text-white bg-accent hover:bg-accent/80 transition-all">
                    <Plus className="h-3 w-3" /> Route Your First Order
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                    <div className="lg:col-span-2 space-y-3">
                      {decisions.map((d, i) => (
                        <DecisionCard
                          key={d.id}
                          decision={d}
                          delay={i * 80}
                          onClick={() => setDetailDecision(d)}
                          onReRoute={() => handleReRoute(d.id)}
                          onDelete={() => setDeleteConfirmId(d.id)}
                        />
                      ))}
                    </div>
                    <div className="space-y-4">
                      <EditableSettingsPanel preferences={preferences} onSave={handleSavePreferences} prefsLoaded={prefsLoaded} />
                      {analytics && <AnalyticsPanel analytics={analytics} dateRange={dateRange} onDateRangeChange={setDateRange} />}
                    </div>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-muted-foreground">Showing {((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, totalCount)} of {totalCount} orders</p>
                      <div className="flex items-center gap-1">
                        <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="p-1.5 rounded-lg hover:bg-surface-hover border border-border disabled:opacity-30 transition-all">
                          <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                        {getPageNumbers(page, totalPages).map((p) => (
                          <button key={p} onClick={() => setPage(p)} className={cn("w-7 h-7 rounded-lg text-[10px] font-semibold transition-all", page === p ? "bg-accent text-white" : "text-muted-foreground hover:bg-surface-hover")}>
                            {p}
                          </button>
                        ))}
                        <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="p-1.5 rounded-lg hover:bg-surface-hover border border-border disabled:opacity-30 transition-all">
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* Analytics Tab */}
          {activeTab === "analytics" && (analytics ? (
            <AnalyticsPanel analytics={analytics} dateRange={dateRange} onDateRangeChange={setDateRange} />
          ) : aLoading ? (
            <div className="glass rounded-2xl p-12 text-center">
              <div className="h-10 w-10 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm text-muted-foreground">Loading analytics...</p>
            </div>
          ) : (
            <div className="glass rounded-2xl p-12 text-center">
              <p className="text-sm text-muted-foreground mb-1">Couldn&apos;t load analytics.</p>
              {aError && <p className="text-xs text-muted-foreground/70 mb-4">{aError instanceof Error ? aError.message : "Something went wrong."}</p>}
              <button onClick={() => mutateAnalytics()} className="px-4 py-2 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground hover:bg-surface-hover transition-all">
                Retry
              </button>
            </div>
          ))}

          {/* History Tab */}
          {activeTab === "history" && (
            <HistoryTable
              history={history}
              search={search}
              onSearch={(s) => { setSearch(s); setPage(1); }}
              onExport={() => exportToCSV(history)}
              onDelete={handleDelete}
              error={hError}
              onRetry={() => mutateHistory()}
            />
          )}

          {/* Settings Tab */}
          {activeTab === "settings" && (
            <div className="max-w-2xl mx-auto">
              <EditableSettingsPanel preferences={preferences} onSave={handleSavePreferences} prefsLoaded={prefsLoaded} />
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <RouteOrderModal open={showRouteModal} onClose={() => setShowRouteModal(false)} onRoute={handleRouteOrder} />
      <OrderDetailModal decision={detailDecision} onClose={() => setDetailDecision(null)} />

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setDeleteConfirmId(null)}>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-sm mx-4 p-5 rounded-2xl bg-surface border border-border shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10 shrink-0">
                <AlertCircle className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <h3 className="font-display text-sm font-semibold text-foreground">Delete Routing Decision?</h3>
                <p className="text-xs text-muted-foreground mt-1">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => setDeleteConfirmId(null)} className="px-3 py-1.5 rounded-xl text-xs font-medium text-muted-foreground hover:bg-surface-hover border border-border transition-all">Cancel</button>
              <button onClick={() => { handleDelete(deleteConfirmId); setDeleteConfirmId(null); }} className="px-3 py-1.5 rounded-xl text-xs font-medium text-white bg-red-500 hover:bg-red-600 transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
