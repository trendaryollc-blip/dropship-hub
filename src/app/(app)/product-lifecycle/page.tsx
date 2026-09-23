"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Zap, ArrowRight, Search, Rocket, Sunset, Plus, X, Trash2,
  ExternalLink, Package, DollarSign, BarChart3,
  ArrowUpDown, Grid3X3, List, Columns3, Download,
  Globe,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useAuth } from "@/components/auth/AuthProvider";
import type { ProductLifecycle, LifecycleAlert, LifecycleStage, LifecycleStageInfo } from "@/types/product";
import { useAPI } from "@/hooks/useAPI";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";

const stageInfo: Record<LifecycleStage, LifecycleStageInfo> = {
  discovery: { stage: "discovery", label: "Discovery", color: "text-blue-400", bgColor: "bg-blue-400/10 border-blue-400/20", description: "Initial research and data collection", typicalDuration: "1-2 weeks" },
  testing: { stage: "testing", label: "Testing", color: "text-amber-400", bgColor: "bg-amber-400/10 border-amber-400/20", description: "Validating demand with test ads", typicalDuration: "2-3 weeks" },
  winning: { stage: "winning", label: "Winning", color: "text-emerald-400", bgColor: "bg-emerald-400/10 border-emerald-400/20", description: "Consistent profitable orders", typicalDuration: "4-8 weeks" },
  scaling: { stage: "scaling", label: "Scaling", color: "text-purple-400", bgColor: "bg-purple-400/10 border-purple-400/20", description: "Aggressive growth phase", typicalDuration: "4-12 weeks" },
  saturation: { stage: "saturation", label: "Saturation", color: "text-orange-400", bgColor: "bg-orange-400/10 border-orange-400/20", description: "High competition, declining margins", typicalDuration: "2-4 weeks" },
  sunset: { stage: "sunset", label: "Sunset", color: "text-red-400", bgColor: "bg-red-400/10 border-red-400/20", description: "Phase out and find replacement", typicalDuration: "2-4 weeks" },
};

const stageIcons: Record<LifecycleStage, typeof Activity> = {
  discovery: Search, testing: Zap, winning: CheckCircle2, scaling: Rocket, saturation: AlertTriangle, sunset: Sunset,
};

const stageOrder: LifecycleStage[] = ["discovery", "testing", "winning", "scaling", "saturation", "sunset"];

type SortKey = "title" | "revenue" | "orders" | "margin" | "days" | "stage" | "date";
type SortDir = "asc" | "desc";
type ViewMode = "grid" | "list" | "kanban";

function parseDate(dateStr: string | undefined): number {
  if (!dateStr) return 0;
  if (typeof dateStr === "object" && "toDate" in (dateStr as Record<string, unknown>)) {
    return (dateStr as { toDate: () => Date }).toDate().getTime();
  }
  const t = new Date(dateStr).getTime();
  return isNaN(t) ? 0 : t;
}

// ─── Add Product Modal ──────────────────────────────────────────

function AddProductModal({ open, onClose, onAdd }: {
  open: boolean;
  onClose: () => void;
  onAdd: (data: { productTitle: string; productImage: string; category: string; currentStage: LifecycleStage; supplierUrl: string; storeUrl: string; notes: string }) => void;
}) {
  const [title, setTitle] = useState("");
  const [image, setImage] = useState("");
  const [category, setCategory] = useState("");
  const [stage, setStage] = useState<LifecycleStage>("discovery");
  const [supplierUrl, setSupplierUrl] = useState("");
  const [storeUrl, setStoreUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const reset = () => {
    setTitle(""); setImage(""); setCategory(""); setStage("discovery"); setSupplierUrl(""); setStoreUrl(""); setNotes("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    onAdd({ productTitle: title.trim(), productImage: image.trim(), category: category.trim(), currentStage: stage, supplierUrl: supplierUrl.trim(), storeUrl: storeUrl.trim(), notes: notes.trim() });
    reset();
    setSubmitting(false);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-lg mx-4 p-6 rounded-2xl bg-surface border border-border shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-bold text-foreground">Add Product to Lifecycle</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-all">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Product Name *</label>
            <input ref={inputRef} type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Smart Fitness Band" required className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/30 focus:ring-1 focus:ring-accent/10 transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Category</label>
              <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Electronics" className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/30 focus:ring-1 focus:ring-accent/10 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Starting Stage</label>
              <select value={stage} onChange={(e) => setStage(e.target.value as LifecycleStage)} className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:border-accent/30 transition-all cursor-pointer">
                {stageOrder.map((s) => <option key={s} value={s}>{stageInfo[s].label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Product Image URL</label>
            <input type="url" value={image} onChange={(e) => setImage(e.target.value)} placeholder="https://..." className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/30 focus:ring-1 focus:ring-accent/10 transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Supplier URL</label>
              <input type="url" value={supplierUrl} onChange={(e) => setSupplierUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/30 focus:ring-1 focus:ring-accent/10 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Store URL</label>
              <input type="url" value={storeUrl} onChange={(e) => setStoreUrl(e.target.value)} placeholder="https://..." className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/30 focus:ring-1 focus:ring-accent/10 transition-all" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Any notes about this product..." className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/30 focus:ring-1 focus:ring-accent/10 transition-all resize-none" />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface-hover border border-border transition-all">Cancel</button>
            <button type="submit" disabled={submitting || !title.trim()} className="px-4 py-2 rounded-xl text-xs font-medium text-white bg-accent hover:bg-accent/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
              <Plus className="h-3.5 w-3.5" />
              {submitting ? "Adding..." : "Add Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Product Detail Modal ───────────────────────────────────────

function ProductDetailModal({ product, open, onClose, onStageChange, onDelete }: {
  product: ProductLifecycle | null;
  open: boolean;
  onClose: () => void;
  onStageChange: (productId: string, newStage: LifecycleStage) => void;
  onDelete: (productId: string) => void;
}) {
  const [activeDetailTab, setActiveDetailTab] = useState<"overview" | "metrics" | "history" | "notes">("overview");

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) setActiveDetailTab("overview");
  }, [open]);

  if (!open || !product) return null;

  const info = stageInfo[product.currentStage];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-2xl mx-4 rounded-2xl bg-surface border border-border shadow-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{product.productImage || "📦"}</span>
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">{product.productTitle}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-semibold ${info.bgColor} ${info.color}`}>
                  {React.createElement(stageIcons[product.currentStage], { className: "h-2.5 w-2.5" })}
                  {info.label}
                </span>
                {product.category && <span className="text-[10px] text-muted-foreground">{product.category}</span>}
                <span className="text-[10px] text-muted-foreground">{product.totalDaysTracked} days tracked</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-all">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Stage Pipeline */}
        <div className="px-5 py-3 border-b border-border">
          <div className="flex items-center gap-1">
            {stageOrder.map((s, i) => {
              const sIdx = stageOrder.indexOf(product.currentStage);
              const isActive = i <= sIdx;
              return (
                <button key={s} onClick={() => onStageChange(product.productId, s)} className={`flex-1 h-2 rounded-full transition-all cursor-pointer hover:opacity-80 ${isActive ? stageInfo[s].color.replace("text-", "bg-") : "bg-surface"}`} title={`Move to ${stageInfo[s].label}`} />
              );
            })}
          </div>
          <div className="flex items-center justify-between mt-1.5">
            {stageOrder.map((s) => (
              <span key={s} className={`text-[8px] ${s === product.currentStage ? stageInfo[s].color + " font-bold" : "text-muted-foreground"}`}>{stageInfo[s].label}</span>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-border">
          {(["overview", "metrics", "history", "notes"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveDetailTab(tab)} className={`px-3 py-2 text-[11px] font-semibold capitalize rounded-t-lg transition-all ${activeDetailTab === tab ? "bg-surface text-foreground border-b-2 border-accent" : "text-muted-foreground hover:text-foreground"}`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {activeDetailTab === "overview" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-surface">
                  <p className="text-[10px] text-muted-foreground mb-1">Orders</p>
                  <p className="text-lg font-bold text-foreground">{product.metrics.totalOrders}</p>
                </div>
                <div className="p-3 rounded-xl bg-surface">
                  <p className="text-[10px] text-muted-foreground mb-1">Revenue</p>
                  <p className="text-lg font-bold text-emerald-400">${product.metrics.totalRevenue.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl bg-surface">
                  <p className="text-[10px] text-muted-foreground mb-1">Profit</p>
                  <p className="text-lg font-bold text-foreground">${product.metrics.totalProfit.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl bg-surface">
                  <p className="text-[10px] text-muted-foreground mb-1">Margin</p>
                  <p className={`text-lg font-bold ${product.metrics.avgProfitMargin > 20 ? "text-emerald-400" : product.metrics.avgProfitMargin > 10 ? "text-amber-400" : "text-red-400"}`}>{product.metrics.avgProfitMargin}%</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-surface">
                  <p className="text-[10px] text-muted-foreground mb-1">Competition</p>
                  <p className={`text-sm font-bold ${product.metrics.competitionCount > 40 ? "text-red-400" : product.metrics.competitionCount > 20 ? "text-amber-400" : "text-emerald-400"}`}>{product.metrics.competitionCount}</p>
                </div>
                <div className="p-3 rounded-xl bg-surface">
                  <p className="text-[10px] text-muted-foreground mb-1">Search Volume</p>
                  <p className="text-sm font-bold text-foreground">{product.metrics.searchVolume.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl bg-surface">
                  <p className="text-[10px] text-muted-foreground mb-1">Trend</p>
                  <div className="flex items-center gap-1">
                    {product.metrics.trendDirection === "rising" ? <TrendingUp className="h-3 w-3 text-emerald-400" /> : product.metrics.trendDirection === "declining" ? <TrendingDown className="h-3 w-3 text-red-400" /> : <Activity className="h-3 w-3 text-amber-400" />}
                    <p className={`text-sm font-bold capitalize ${product.metrics.trendDirection === "rising" ? "text-emerald-400" : product.metrics.trendDirection === "declining" ? "text-red-400" : "text-amber-400"}`}>{product.metrics.trendDirection}</p>
                  </div>
                </div>
              </div>

              {(product.supplierUrl || product.storeUrl) && (
                <div className="flex items-center gap-3">
                  {product.supplierUrl && (
                    <a href={product.supplierUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface border border-border text-xs font-medium text-foreground hover:border-accent/30 transition-all">
                      <ExternalLink className="h-3 w-3" /> Supplier Link
                    </a>
                  )}
                  {product.storeUrl && (
                    <a href={product.storeUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface border border-border text-xs font-medium text-foreground hover:border-accent/30 transition-all">
                      <Globe className="h-3 w-3" /> Store Link
                    </a>
                  )}
                </div>
              )}

              {product.recommendations.length > 0 && (
                <div className="p-3 rounded-xl bg-surface">
                  <p className="text-[11px] font-semibold text-foreground mb-2">Recommendations</p>
                  {product.recommendations.map((r, i) => (
                    <p key={i} className="text-[10px] text-muted-foreground flex items-start gap-1.5 mb-1">
                      <ArrowRight className="h-2.5 w-2.5 mt-0.5 shrink-0 text-accent" />
                      {r}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeDetailTab === "metrics" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-surface">
                <h4 className="text-xs font-semibold text-foreground mb-3">Performance Overview</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Total Revenue</p>
                    <p className="text-xl font-bold text-emerald-400">${product.metrics.totalRevenue.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Total Profit</p>
                    <p className="text-xl font-bold text-foreground">${product.metrics.totalProfit.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Total Orders</p>
                    <p className="text-xl font-bold text-foreground">{product.metrics.totalOrders}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Avg Profit/Order</p>
                    <p className="text-xl font-bold text-foreground">
                      ${product.metrics.totalOrders > 0 ? (product.metrics.totalProfit / product.metrics.totalOrders).toFixed(2) : "0.00"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-surface">
                <h4 className="text-xs font-semibold text-foreground mb-2">Market Data</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">Search Volume</span>
                    <span className="text-xs font-bold text-foreground">{product.metrics.searchVolume.toLocaleString()}/mo</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">Competition</span>
                    <span className={`text-xs font-bold ${product.metrics.competitionCount > 40 ? "text-red-400" : product.metrics.competitionCount > 20 ? "text-amber-400" : "text-emerald-400"}`}>{product.metrics.competitionCount} sellers</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">Trend Direction</span>
                    <span className={`text-xs font-bold capitalize ${product.metrics.trendDirection === "rising" ? "text-emerald-400" : product.metrics.trendDirection === "declining" ? "text-red-400" : "text-amber-400"}`}>{product.metrics.trendDirection}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeDetailTab === "history" && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-surface">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-muted-foreground">Current Stage</span>
                  <span className={`text-xs font-bold ${info.color}`}>{info.label}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-muted-foreground">Days in Stage</span>
                  <span className="text-xs font-bold text-foreground">{product.daysInStage}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-muted-foreground">Total Days Tracked</span>
                  <span className="text-xs font-bold text-foreground">{product.totalDaysTracked}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">Stage Entered</span>
                  <span className="text-xs font-bold text-foreground">{new Date(product.stageEnteredAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-surface text-center">
                <BarChart3 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Historical chart coming soon</p>
              </div>
            </div>
          )}

          {activeDetailTab === "notes" && (
            <div className="space-y-3">
              <textarea
                readOnly
                value={product.notes || "No notes yet."}
                className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none"
                rows={6}
              />
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t border-border">
          <div className="flex items-center gap-2">
            <select
              value={product.currentStage}
              onChange={(e) => onStageChange(product.productId, e.target.value as LifecycleStage)}
              className="px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-medium text-foreground focus:outline-none focus:border-accent/30 transition-all cursor-pointer"
            >
              {stageOrder.map((s) => <option key={s} value={s}>{stageInfo[s].label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onDelete(product.productId)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-red-400 hover:bg-red-400/10 border border-red-400/20 transition-all">
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Kanban View ────────────────────────────────────────────────

function KanbanView({ products, onProductClick }: {
  products: ProductLifecycle[];
  onProductClick: (p: ProductLifecycle) => void;
}) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {stageOrder.map((stage) => {
        const stageProducts = products.filter((p) => p.currentStage === stage);
        const info = stageInfo[stage];
        const Icon = stageIcons[stage];
        return (
          <div key={stage} className="flex-shrink-0 w-72">
            <div className={`p-3 rounded-xl border ${info.bgColor} mb-3`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${info.color}`} />
                  <span className={`text-xs font-bold ${info.color}`}>{info.label}</span>
                </div>
                <span className={`text-xs font-bold ${info.color}`}>{stageProducts.length}</span>
              </div>
            </div>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {stageProducts.map((product) => (
                <div key={product.id} onClick={() => onProductClick(product)} className="glass rounded-xl p-3 cursor-pointer hover:border-accent/20 hover:bg-surface-hover transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{product.productImage || "📦"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-foreground truncate">{product.productTitle}</p>
                      <p className="text-[9px] text-muted-foreground">{product.category}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="p-1.5 rounded-lg bg-surface">
                      <p className="text-[8px] text-muted-foreground">Revenue</p>
                      <p className="text-[10px] font-bold text-emerald-400">${product.metrics.totalRevenue.toLocaleString()}</p>
                    </div>
                    <div className="p-1.5 rounded-lg bg-surface">
                      <p className="text-[8px] text-muted-foreground">Orders</p>
                      <p className="text-[10px] font-bold text-foreground">{product.metrics.totalOrders}</p>
                    </div>
                  </div>
                </div>
              ))}
              {stageProducts.length === 0 && (
                <div className="p-4 rounded-xl bg-surface text-center">
                  <p className="text-[10px] text-muted-foreground">No products</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── List Row ───────────────────────────────────────────────────

function ProductListRow({ product, delay, onClick, onStageChange }: {
  product: ProductLifecycle;
  delay: number;
  onClick: () => void;
  onStageChange: (productId: string, newStage: LifecycleStage) => void;
}) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const info = stageInfo[product.currentStage];
  const Icon = stageIcons[product.currentStage];

  return (
    <div ref={ref} onClick={onClick} className={`flex flex-wrap items-center gap-2 sm:gap-4 p-3 rounded-xl glass cursor-pointer hover:border-accent/20 hover:bg-surface-hover transition-all ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`} style={{ transitionDelay: `${delay}ms` }}>
      <span className="text-2xl shrink-0">{product.productImage || "📦"}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate">{product.productTitle}</p>
        <p className="text-[9px] text-muted-foreground">{product.category} &middot; {product.totalDaysTracked} days</p>
      </div>
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[9px] font-semibold shrink-0 ${info.bgColor} ${info.color}`}>
        <Icon className="h-2.5 w-2.5" />{info.label}
      </span>
      <div className="text-right shrink-0 w-20">
        <p className="text-[10px] font-bold text-emerald-400">${product.metrics.totalRevenue.toLocaleString()}</p>
        <p className="text-[8px] text-muted-foreground">{product.metrics.totalOrders} orders</p>
      </div>
      <div className="text-right shrink-0 w-16">
        <p className={`text-[10px] font-bold ${product.metrics.avgProfitMargin > 20 ? "text-emerald-400" : product.metrics.avgProfitMargin > 10 ? "text-amber-400" : "text-red-400"}`}>{product.metrics.avgProfitMargin}%</p>
        <p className="text-[8px] text-muted-foreground">margin</p>
      </div>
      <div className="shrink-0">
        <select
          value={product.currentStage}
          onChange={(e) => { e.stopPropagation(); onStageChange(product.productId, e.target.value as LifecycleStage); }}
          onClick={(e) => e.stopPropagation()}
          className="px-2 py-1 rounded-lg bg-surface border border-border text-[9px] font-medium text-foreground focus:outline-none cursor-pointer"
        >
          {stageOrder.map((s) => <option key={s} value={s}>{stageInfo[s].label}</option>)}
        </select>
      </div>
    </div>
  );
}

// ─── Lifecycle Card (Grid View) ─────────────────────────────────

function LifecycleCard({ product, delay, onClick, onStageChange }: {
  product: ProductLifecycle;
  delay: number;
  onClick: () => void;
  onStageChange: (productId: string, newStage: LifecycleStage) => void;
}) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const info = stageInfo[product.currentStage];
  const Icon = stageIcons[product.currentStage];
  const sIdx = stageOrder.indexOf(product.currentStage);

  return (
    <div ref={ref} onClick={onClick} className={`glass rounded-xl p-4 transition-all duration-500 hover:border-accent/20 hover:bg-surface-hover cursor-pointer group ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-2xl shrink-0">{product.productImage || "📦"}</span>
          <div className="min-w-0">
            <h4 className="font-display text-sm font-semibold text-foreground truncate">{product.productTitle}</h4>
            <p className="text-[10px] text-muted-foreground truncate">{product.category} &middot; {product.totalDaysTracked} days tracked</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-semibold shrink-0 ${info.bgColor} ${info.color}`}>
          <Icon className="h-2.5 w-2.5" />{info.label}
        </span>
      </div>

      {/* Stage Pipeline */}
      <div className="flex items-center gap-0.5 mb-3">
        {stageOrder.map((s, i) => (
          <div key={s} className={`flex-1 h-1 rounded-full transition-all ${i <= sIdx ? stageInfo[s].color.replace("text-", "bg-") : "bg-surface"}`} />
        ))}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-surface">
          <p className="text-[9px] text-muted-foreground">Orders</p>
          <p className="text-xs font-bold text-foreground">{product.metrics.totalOrders}</p>
        </div>
        <div className="p-1.5 rounded-lg bg-surface">
          <p className="text-[9px] text-muted-foreground">Revenue</p>
          <p className="text-xs font-bold text-emerald-400">${product.metrics.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="p-1.5 rounded-lg bg-surface">
          <p className="text-[9px] text-muted-foreground">Margin</p>
          <p className={`text-xs font-bold ${product.metrics.avgProfitMargin > 20 ? "text-emerald-400" : product.metrics.avgProfitMargin > 10 ? "text-amber-400" : "text-red-400"}`}>{product.metrics.avgProfitMargin}%</p>
        </div>
        <div className="p-1.5 rounded-lg bg-surface">
          <p className="text-[9px] text-muted-foreground">Competition</p>
          <p className={`text-xs font-bold ${product.metrics.competitionCount > 40 ? "text-red-400" : product.metrics.competitionCount > 20 ? "text-amber-400" : "text-emerald-400"}`}>{product.metrics.competitionCount}</p>
        </div>
      </div>

      {/* Trend */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {product.metrics.trendDirection === "rising" ? <TrendingUp className="h-3 w-3 text-emerald-400" /> : product.metrics.trendDirection === "declining" ? <TrendingDown className="h-3 w-3 text-red-400" /> : <Activity className="h-3 w-3 text-amber-400" />}
          <span className={`text-[10px] font-semibold ${product.metrics.trendDirection === "rising" ? "text-emerald-400" : product.metrics.trendDirection === "declining" ? "text-red-400" : "text-amber-400"}`}>{product.metrics.trendDirection}</span>
          <span className="text-[9px] text-muted-foreground">&middot; {product.metrics.searchVolume.toLocaleString()} searches</span>
        </div>
        <div className="flex items-center gap-1">
          {product.supplierUrl && <a href={product.supplierUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="p-1 rounded hover:bg-surface text-muted-foreground hover:text-foreground transition-all"><ExternalLink className="h-3 w-3" /></a>}
          {product.storeUrl && <a href={product.storeUrl} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="p-1 rounded hover:bg-surface text-muted-foreground hover:text-foreground transition-all"><Globe className="h-3 w-3" /></a>}
        </div>
      </div>

      {/* Alerts */}
      {product.alerts.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {product.alerts.slice(0, 2).map((a) => (
            <div key={a.id} className={`p-2 rounded-lg ${a.severity === "critical" ? "bg-red-400/10 border border-red-400/20" : a.severity === "warning" ? "bg-amber-400/10 border border-amber-400/20" : "bg-blue-400/10 border border-blue-400/20"}`}>
              <p className={`text-[10px] font-semibold ${a.severity === "critical" ? "text-red-400" : a.severity === "warning" ? "text-amber-400" : "text-blue-400"}`}>{a.title}</p>
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {product.recommendations.length > 0 && (
        <div className="p-2 rounded-lg bg-surface">
          {product.recommendations.slice(0, 2).map((r, i) => (
            <p key={i} className="text-[9px] text-muted-foreground flex items-start gap-1 mb-0.5">
              <ArrowRight className="h-2.5 w-2.5 mt-0.5 shrink-0 text-accent" />{r}
            </p>
          ))}
        </div>
      )}

      {/* Stage Quick Change */}
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        <span className="text-[9px] text-muted-foreground">Move to:</span>
        <div className="flex items-center gap-1">
          {stageOrder.filter((s) => s !== product.currentStage).slice(0, 3).map((s) => (
            <button key={s} onClick={(e) => { e.stopPropagation(); onStageChange(product.productId, s); }} className={`px-2 py-0.5 rounded text-[8px] font-semibold border transition-all hover:opacity-80 ${stageInfo[s].bgColor} ${stageInfo[s].color}`}>
              {stageInfo[s].label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Alert Row ──────────────────────────────────────────────────

function AlertRow({ alert, delay, onMarkRead }: {
  alert: LifecycleAlert & { productTitle: string; productImage: string };
  delay: number;
  onMarkRead: (id: string) => void;
}) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const sevColors = {
    info: { bg: "bg-blue-400/10", border: "border-blue-400/20", text: "text-blue-400" },
    warning: { bg: "bg-amber-400/10", border: "border-amber-400/20", text: "text-amber-400" },
    critical: { bg: "bg-red-400/10", border: "border-red-400/20", text: "text-red-400" },
  };
  const c = sevColors[alert.severity];
  const typeIcons: Record<string, typeof Activity> = { stage_transition: Activity, competition_spike: AlertTriangle, profit_decline: TrendingDown, trend_shift: TrendingUp, sunset_warning: Sunset };
  const TypeIcon = typeIcons[alert.type] || AlertTriangle;

  return (
    <div ref={ref} className={`flex items-start gap-3 p-3 rounded-xl ${c.bg} border ${c.border} transition-all duration-500 ${isInView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`} style={{ transitionDelay: `${delay}ms` }}>
      <span className="text-lg shrink-0">{alert.productImage || "📦"}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <TypeIcon className={`h-3 w-3 ${c.text}`} />
          <p className="text-[11px] font-semibold text-foreground truncate">{alert.title}</p>
          <span className={`px-1 py-0.5 rounded text-[8px] font-semibold ${c.bg} ${c.text}`}>{alert.severity}</span>
        </div>
        <p className="text-[10px] text-muted-foreground">{alert.productTitle}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">{alert.description}</p>
      </div>
      <button onClick={() => onMarkRead(alert.id)} className="p-1.5 rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground transition-all shrink-0" title="Mark as read">
        <CheckCircle2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Stage Pipeline ─────────────────────────────────────────────

function StagePipeline({ distribution }: { distribution: { stage: LifecycleStage; count: number; products: string[] }[] }) {
  const { ref, isInView } = useInView({ threshold: 0.2 });
  const colors: Record<LifecycleStage, string> = {
    discovery: "#3b82f6", testing: "#f59e0b", winning: "#22c55e",
    scaling: "#a855f7", saturation: "#f97316", sunset: "#ef4444",
  };
  const total = distribution.reduce((sum, d) => sum + d.count, 0) || 1;

  return (
    <div ref={ref} className={`glass rounded-2xl p-4 sm:p-5 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="mb-4">
        <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Lifecycle Pipeline</h3>
        <p className="text-[10px] sm:text-[11px] text-muted-foreground">Products at each stage</p>
      </div>
      <div className="flex items-center gap-1 sm:gap-1.5 h-6 sm:h-8 rounded-full overflow-hidden mb-4">
        {distribution.map((d, i) => {
          const width = (d.count / total) * 100;
          return (
            <div key={d.stage} className="h-full rounded-full transition-all duration-1000" style={{ width: isInView ? `${width}%` : "0%", backgroundColor: colors[d.stage], transitionDelay: `${i * 150}ms` }} />
          );
        })}
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {distribution.map((d) => {
          const info = stageInfo[d.stage];
          const Icon = stageIcons[d.stage];
          return (
            <div key={d.stage} className={`p-2 rounded-lg border ${info.bgColor} text-center`}>
              <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${info.color} mx-auto mb-1`} />
              <p className={`text-xs sm:text-sm font-bold ${info.color}`}>{d.count}</p>
              <p className="text-[8px] sm:text-[9px] text-muted-foreground">{info.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────

export default function ProductLifecyclePage() {
  const { user } = useAuth();
  const { success, error: showError } = useToast();
  const uid = user?.uid || "";

  const { data: pData, mutate: mutateProducts } = useAPI<{ products?: ProductLifecycle[] }>(uid ? `/api/products/lifecycle?type=overview&uid=${uid}` : null);
  const { data: aData, mutate: mutateAlerts } = useAPI<{ alerts?: (LifecycleAlert & { productTitle: string; productImage: string })[] }>(uid ? `/api/products/lifecycle?type=alerts&uid=${uid}` : null);
  const { data: sData } = useAPI<{ stages?: { stage: LifecycleStage; count: number; products: string[] }[] }>(uid ? `/api/products/lifecycle?type=stages&uid=${uid}` : null);

  const products = useMemo(() => pData?.products || [], [pData]);
  const alerts = useMemo(() => aData?.alerts || [], [aData]);
  const stages = useMemo(() => sData?.stages || [], [sData]);
  const isLoading = !user || (!pData && !sData);

  const [activeTab, setActiveTab] = useState<"pipeline" | "products" | "alerts">("pipeline");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filterStage, setFilterStage] = useState<LifecycleStage | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductLifecycle | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Filtered & sorted products
  const filtered = useMemo(() => {
    let result = products.filter((p) => !p.archived);
    if (filterStage !== "all") result = result.filter((p) => p.currentStage === filterStage);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((p) => p.productTitle.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    }
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "title": cmp = a.productTitle.localeCompare(b.productTitle); break;
        case "revenue": cmp = a.metrics.totalRevenue - b.metrics.totalRevenue; break;
        case "orders": cmp = a.metrics.totalOrders - b.metrics.totalOrders; break;
        case "margin": cmp = a.metrics.avgProfitMargin - b.metrics.avgProfitMargin; break;
        case "days": cmp = a.totalDaysTracked - b.totalDaysTracked; break;
        case "stage": cmp = stageOrder.indexOf(a.currentStage) - stageOrder.indexOf(b.currentStage); break;
        case "date": cmp = parseDate(a.createdAt) - parseDate(b.createdAt); break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });
    return result;
  }, [products, filterStage, searchQuery, sortKey, sortDir]);

  const criticalAlerts = useMemo(() => alerts.filter((a) => a.severity === "critical").length, [alerts]);
  const unreadAlerts = useMemo(() => alerts.filter((a) => !a.read).length, [alerts]);

  // KPI calculations
  const kpis = useMemo(() => {
    const active = products.filter((p) => !p.archived);
    const totalRevenue = active.reduce((sum, p) => sum + p.metrics.totalRevenue, 0);
    const totalProfit = active.reduce((sum, p) => sum + p.metrics.totalProfit, 0);
    const totalOrders = active.reduce((sum, p) => sum + p.metrics.totalOrders, 0);
    const avgMargin = active.length > 0 ? active.reduce((sum, p) => sum + p.metrics.avgProfitMargin, 0) / active.length : 0;
    return { totalRevenue, totalProfit, totalOrders, avgMargin, totalProducts: active.length };
  }, [products]);

  const handleAddProduct = useCallback(async (data: { productTitle: string; productImage: string; category: string; currentStage: LifecycleStage; supplierUrl: string; storeUrl: string; notes: string }) => {
    try {
      const res = await fetch("/api/products/lifecycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: `prod_${Date.now()}`,
          productTitle: data.productTitle,
          productImage: data.productImage,
          category: data.category,
          currentStage: data.currentStage,
          stageEnteredAt: new Date().toISOString(),
          totalDaysTracked: 0,
          supplierUrl: data.supplierUrl,
          storeUrl: data.storeUrl,
          notes: data.notes,
        }),
      });
      if (res.ok) {
        success("Product added to lifecycle");
        mutateProducts();
      } else {
        const err = await res.json().catch(() => ({}));
        showError(err.error || "Failed to add product");
      }
    } catch {
      showError("Failed to add product");
    }
  }, [mutateProducts, success, showError]);

  const handleStageChange = useCallback(async (productId: string, newStage: LifecycleStage) => {
    try {
      const res = await fetch("/api/products/lifecycle?action=stage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, newStage }),
      });
      if (res.ok) {
        success(`Product moved to ${stageInfo[newStage].label}`);
        mutateProducts();
        mutateAlerts();
        // Update selected product in detail modal
        setSelectedProduct((prev) => prev?.productId === productId ? { ...prev, currentStage: newStage } : prev);
      } else {
        const err = await res.json().catch(() => ({}));
        showError(err.error || "Failed to update stage");
      }
    } catch {
      showError("Failed to update stage");
    }
  }, [mutateProducts, mutateAlerts, success, showError]);

  const handleDelete = useCallback(async (productId: string) => {
    try {
      const res = await fetch("/api/products/lifecycle", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (res.ok) {
        success("Product deleted");
        mutateProducts();
        setShowDetailModal(false);
        setSelectedProduct(null);
      } else {
        const err = await res.json().catch(() => ({}));
        showError(err.error || "Failed to delete product");
      }
    } catch {
      showError("Failed to delete product");
    }
  }, [mutateProducts, success, showError]);

  const handleMarkAlertsRead = useCallback(async (alertIds: string[]) => {
    try {
      const res = await fetch("/api/products/lifecycle?action=alerts-read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertIds }),
      });
      if (res.ok) {
        mutateAlerts();
      }
    } catch {
      // silent
    }
  }, [mutateAlerts]);

  const handleExport = useCallback(() => {
    const csv = [
      ["Product", "Category", "Stage", "Revenue", "Profit", "Orders", "Margin", "Competition", "Days Tracked"].join(","),
      ...filtered.map((p) => [
        `"${p.productTitle.replace(/"/g, '""')}"`,
        `"${p.category.replace(/"/g, '""')}"`,
        p.currentStage,
        p.metrics.totalRevenue,
        p.metrics.totalProfit,
        p.metrics.totalOrders,
        p.metrics.avgProfitMargin,
        p.metrics.competitionCount,
        p.totalDaysTracked,
      ].join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `product-lifecycle-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    success("Exported to CSV");
  }, [filtered, success]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-3 sm:px-4 lg:px-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Product Lifecycle</h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">Track products from discovery to sunset. AI-powered stage transitions and recommendations.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {criticalAlerts > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-400/10 border border-red-400/20 text-[10px] sm:text-[11px] font-semibold text-red-400">
              <AlertTriangle className="h-3 w-3" />{criticalAlerts} Critical
            </span>
          )}
          <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface border border-border text-xs font-medium text-foreground hover:border-accent/30 transition-all">
            <Download className="h-3.5 w-3.5" />Export
          </button>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent/80 transition-all shadow-lg shadow-accent/20">
            <Plus className="h-3.5 w-3.5" />Add Product
          </button>
          <div className="flex items-center bg-surface rounded-xl border border-border p-0.5">
            {(["pipeline", "products", "alerts"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`relative px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-semibold capitalize transition-all ${activeTab === tab ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-muted-foreground hover:text-foreground"}`}>
                {tab}
                {tab === "alerts" && unreadAlerts > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[8px] text-white flex items-center justify-center font-bold">{unreadAlerts > 99 ? "99+" : unreadAlerts}</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="glass rounded-2xl p-12 text-center">
          <div className="h-10 w-10 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading lifecycle data...</p>
        </div>
      ) : (
        <>
          {/* Pipeline Tab */}
          {activeTab === "pipeline" && (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: "Total Products", value: kpis.totalProducts, icon: Package, color: "text-blue-400" },
                  { label: "Total Revenue", value: `$${kpis.totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-emerald-400" },
                  { label: "Total Profit", value: `$${kpis.totalProfit.toLocaleString()}`, icon: TrendingUp, color: "text-emerald-400" },
                  { label: "Total Orders", value: kpis.totalOrders.toLocaleString(), icon: BarChart3, color: "text-purple-400" },
                  { label: "Avg Margin", value: `${kpis.avgMargin.toFixed(1)}%`, icon: Activity, color: "text-amber-400" },
                ].map((kpi) => (
                  <div key={kpi.label} className="glass rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-medium text-muted-foreground">{kpi.label}</span>
                      <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                    </div>
                    <p className="font-display text-lg font-bold text-foreground">{kpi.value}</p>
                  </div>
                ))}
              </div>

              {/* Stage Pipeline */}
              <StagePipeline distribution={stages} />

              {/* Recent Alerts */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display text-sm font-semibold text-foreground">Recent Alerts</h3>
                  {alerts.length > 0 && (
                    <button onClick={() => setActiveTab("alerts")} className="text-[10px] text-accent hover:text-accent/80 font-semibold transition-all">View all</button>
                  )}
                </div>
                <div className="space-y-2">
                  {alerts.length === 0 ? (
                    <div className="glass rounded-xl p-6 text-center">
                      <CheckCircle2 className="h-8 w-8 text-emerald-400/30 mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">No alerts - all clear!</p>
                    </div>
                  ) : (
                    alerts.slice(0, 5).map((a, i) => (
                      <AlertRow key={a.id} alert={a} delay={i * 60} onMarkRead={(id) => handleMarkAlertsRead([id])} />
                    ))
                  )}
                </div>
              </div>
            </>
          )}

          {/* Products Tab */}
          {activeTab === "products" && (
            <>
              {/* Search, Filters, Sort, View */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="relative flex-1 w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search products..." className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/30 focus:ring-1 focus:ring-accent/10 transition-all" />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Stage Filter */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <button onClick={() => setFilterStage("all")} className={`px-2.5 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-semibold whitespace-nowrap transition-all ${filterStage === "all" ? "bg-accent text-white" : "bg-surface text-muted-foreground hover:text-foreground"}`}>
                    All ({products.filter((p) => !p.archived).length})
                  </button>
                  {stageOrder.map((s) => {
                    const count = products.filter((p) => p.currentStage === s && !p.archived).length;
                    const info = stageInfo[s];
                    return (
                      <button key={s} onClick={() => setFilterStage(s)} className={`px-2.5 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-semibold whitespace-nowrap transition-all ${filterStage === s ? `${info.bgColor} ${info.color}` : "bg-surface text-muted-foreground hover:text-foreground"}`}>
                        {info.label} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Sort & View */}
                <div className="flex items-center gap-2">
                  <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="px-3 py-2 rounded-xl bg-surface border border-border text-xs font-medium text-foreground focus:outline-none cursor-pointer">
                    <option value="date">Date Added</option>
                    <option value="title">Name</option>
                    <option value="revenue">Revenue</option>
                    <option value="orders">Orders</option>
                    <option value="margin">Margin</option>
                    <option value="days">Days Tracked</option>
                    <option value="stage">Stage</option>
                  </select>
                  <button onClick={() => setSortDir((d) => d === "asc" ? "desc" : "asc")} className="p-2 rounded-xl bg-surface border border-border text-muted-foreground hover:text-foreground transition-all" title={`Sort ${sortDir === "asc" ? "descending" : "ascending"}`}>
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                  <div className="flex items-center bg-surface rounded-xl border border-border p-0.5">
                    {([["grid", Grid3X3, "Grid"], ["list", List, "List"], ["kanban", Columns3, "Kanban"]] as const).map(([mode, Icon, label]) => (
                      <button key={mode} onClick={() => setViewMode(mode)} title={label} className={`p-1.5 rounded-lg transition-all ${viewMode === mode ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Products Display */}
              {filtered.length === 0 ? (
                <EmptyState
                  icon={Package}
                  title="No products found"
                  description={searchQuery || filterStage !== "all" ? "Try adjusting your filters" : "Add your first product to start tracking its lifecycle"}
                  action={searchQuery || filterStage !== "all" ? { label: "Clear Filters", onClick: () => { setSearchQuery(""); setFilterStage("all"); } } : { label: "Add Product", onClick: () => setShowAddModal(true) }}
                />
              ) : (
                <>
                  <p className="text-[10px] text-muted-foreground">{filtered.length} product{filtered.length !== 1 ? "s" : ""}</p>
                  {viewMode === "grid" && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
                      {filtered.map((p, i) => (
                        <LifecycleCard key={p.id} product={p} delay={i * 60} onClick={() => { setSelectedProduct(p); setShowDetailModal(true); }} onStageChange={handleStageChange} />
                      ))}
                    </div>
                  )}
                  {viewMode === "list" && (
                    <div className="space-y-2">
                      {filtered.map((p, i) => (
                        <ProductListRow key={p.id} product={p} delay={i * 40} onClick={() => { setSelectedProduct(p); setShowDetailModal(true); }} onStageChange={handleStageChange} />
                      ))}
                    </div>
                  )}
                  {viewMode === "kanban" && (
                    <KanbanView products={filtered} onProductClick={(p) => { setSelectedProduct(p); setShowDetailModal(true); }} />
                  )}
                </>
              )}
            </>
          )}

          {/* Alerts Tab */}
          {activeTab === "alerts" && (
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="glass rounded-2xl p-8 text-center">
                  <CheckCircle2 className="h-12 w-12 text-emerald-400/30 mx-auto mb-4" />
                  <h3 className="font-display text-lg font-semibold text-foreground mb-2">All Clear</h3>
                  <p className="text-sm text-muted-foreground">No lifecycle alerts at this time</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{alerts.length} alert{alerts.length !== 1 ? "s" : ""} &middot; {unreadAlerts} unread</p>
                    {unreadAlerts > 0 && (
                      <button onClick={() => handleMarkAlertsRead(alerts.filter((a) => !a.read).map((a) => a.id))} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-foreground bg-surface border border-border hover:border-accent/30 transition-all">
                        <CheckCircle2 className="h-3 w-3" />Mark all read
                      </button>
                    )}
                  </div>
                  {alerts.map((a, i) => (
                    <AlertRow key={a.id} alert={a} delay={i * 50} onMarkRead={(id) => handleMarkAlertsRead([id])} />
                  ))}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <AddProductModal open={showAddModal} onClose={() => setShowAddModal(false)} onAdd={handleAddProduct} />
      <ProductDetailModal
        product={selectedProduct}
        open={showDetailModal}
        onClose={() => { setShowDetailModal(false); setSelectedProduct(null); }}
        onStageChange={handleStageChange}
        onDelete={(id) => { setDeleteTarget(id); setShowDeleteConfirm(true); }}
      />
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Product"
        description="This will permanently remove this product and all its data from the lifecycle tracker. This action cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={() => { if (deleteTarget) handleDelete(deleteTarget); setShowDeleteConfirm(false); setDeleteTarget(null); }}
        onCancel={() => { setShowDeleteConfirm(false); setDeleteTarget(null); }}
      />
    </div>
  );
}
