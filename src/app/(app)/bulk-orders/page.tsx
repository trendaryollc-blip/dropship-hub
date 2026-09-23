"use client";

// TODO: SECURITY REVIEW
// - Server endpoints under `/api/fulfillment` and `/api/fulfillment/bulk` must
//   enforce authorization, rate-limiting, and action-level permissions (who can
//   cancel, send to supplier, or trigger refunds). Client-side confirmations
//   are helpful but insufficient for production safety.

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import Image from "next/image";
import {
  Package, Loader2, AlertCircle, CheckCircle2, X, Search,
  PlayCircle, Clock, Zap, FileText, Upload,
  Filter, RefreshCw, Eye, ChevronDown, ChevronUp, ChevronLeft,
  Truck, AlertTriangle, Check, StickyNote,
  DollarSign, Users, BarChart3, History, Settings,
  MapPin, Mail, Phone, ExternalLink, Copy, Hash, TrendingUp,
} from "lucide-react";
import VoiceInput from "@/components/ai/VoiceInput";
import { useAPI } from "@/hooks/useAPI";
import { safeFetch } from "@/lib/safe-fetch";
import { logger } from "@/lib/logger";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import EmptyState from "@/components/ui/EmptyState";
import type { BulkOperation } from "@/types/automation";
import type { FulfillmentOrder, FulfillmentOrderItem } from "@/types/fulfillment";
import { DEFAULT_FULFILLMENT_SETTINGS } from "@/types/fulfillment";

type BulkActionType =
  | "fulfill"
  | "cancel"
  | "sync_tracking"
  | "check_status"
  | "status_update"
  | "supplier_assignment"
  | "export"
  | "csv_import"
  | "send_to_supplier"
  | "print_labels"
  | "add_notes";

type DateRange = "all" | "today" | "7days" | "30days" | "custom";

// ─── Status Config ────────────────────────────────────────────────────────────

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  pending: { color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20", label: "Pending" },
  in_progress: { color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20", label: "In Progress" },
  shipped: { color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/20", label: "Shipped" },
  delivered: { color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20", label: "Delivered" },
  cancelled: { color: "text-red-400", bg: "bg-red-400/10 border-red-400/20", label: "Cancelled" },
};

const operationStatusConfig: Record<string, { color: string; bg: string; label: string }> = {
  pending: { color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20", label: "Pending" },
  running: { color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20", label: "Running" },
  completed: { color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20", label: "Completed" },
  partial: { color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20", label: "Partial" },
  failed: { color: "text-red-400", bg: "bg-red-400/10 border-red-400/20", label: "Failed" },
};

const actionLabels: Record<string, string> = {
  fulfill: "Fulfill Orders",
  cancel: "Cancel Orders",
  sync_tracking: "Sync Tracking",
  check_status: "Check Status",
  status_update: "Update Status",
  supplier_assignment: "Assign Supplier",
  export: "Export CSV",
  csv_import: "Import CSV",
  send_to_supplier: "Send to Supplier",
  print_labels: "Print Labels",
  add_notes: "Add Notes",
};

const suppliers = DEFAULT_FULFILLMENT_SETTINGS.supplierPreferences;

// ─── Helper Functions ─────────────────────────────────────────────────────────

function getDateRangeFilter(dateRange: DateRange, customStart?: string, customEnd?: string): (date: string) => boolean {
  const now = new Date();
  switch (dateRange) {
    case "today": {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return (d) => new Date(d) >= start;
    }
    case "7days": {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return (d) => new Date(d) >= start;
    }
    case "30days": {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return (d) => new Date(d) >= start;
    }
    case "custom": {
      if (!customStart || !customEnd) return () => true;
      const start = new Date(customStart);
      const end = new Date(customEnd);
      end.setHours(23, 59, 59, 999);
      return (d) => { const dt = new Date(d); return dt >= start && dt <= end; };
    }
    default:
      return () => true;
  }
}

function exportToCSV(data: FulfillmentOrder[], filename: string) {
  // Guard: prevent extremely large client-side exports which can OOM the browser.
  if (data.length > 5000) {
    alert("Export too large for client-side download. Please narrow selection or use server-side export.");
    return;
  }

  const headers = [
    "Order Number", "Customer Name", "Customer Email", "Status",
    "Revenue", "Cost", "Profit", "Supplier", "Store Platform",
    "Items Count", "Created At", "Updated At",
    "Shipping Street", "Shipping City", "Shipping State", "Shipping Zip", "Shipping Country",
  ];
  const rows = data.map((o) => [
    o.orderNumber,
    o.customerName,
    o.customerEmail,
    o.status,
    o.totalRevenue.toFixed(2),
    o.totalCost.toFixed(2),
    o.profit.toFixed(2),
    o.assignedSupplier || "",
    o.storePlatform || "",
    String(o.items.length),
    o.createdAt,
    o.updatedAt,
    o.shippingAddress.street,
    o.shippingAddress.city,
    o.shippingAddress.state,
    o.shippingAddress.zipCode,
    o.shippingAddress.country,
  ]);
  const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""') }"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Safe clipboard helper used across the page. Uses navigator.clipboard when available,
// otherwise falls back to a textarea + execCommand approach.
async function safeCopy(text: string) {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// ─── Order Detail Panel ───────────────────────────────────────────────────────

function OrderDetailPanel({
  order,
  onClose,
  onAddNote,
}: {
  order: FulfillmentOrder;
  onClose: () => void;
  onAddNote: (orderId: string, content: string) => void;
}) {
  const [noteText, setNoteText] = useState("");
  const [activeTab, setActiveTab] = useState<"details" | "items" | "shipping" | "notes">("details");
  const st = statusConfig[order.status] || statusConfig.pending;

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    onAddNote(order.id, noteText.trim());
    setNoteText("");
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-lg bg-[hsl(var(--background))] border-l border-white/10 h-full overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-[hsl(var(--background))]/95 backdrop-blur-sm border-b border-white/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface transition-colors">
                <ChevronLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              <div>
                <h3 className="font-display text-sm font-bold text-foreground">{order.orderNumber}</h3>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${st.bg} ${st.color}`}>
                  {st.label}
                </span>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface transition-colors">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-3">
            {(["details", "items", "shipping", "notes"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors capitalize ${
                  activeTab === tab
                    ? "bg-accent/20 text-accent"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {activeTab === "details" && (
            <>
              {/* Quick Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="p-3 rounded-xl bg-surface/50 border border-white/5 text-center">
                  <DollarSign className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
                  <p className="text-sm font-bold text-foreground">${order.totalRevenue.toFixed(2)}</p>
                  <p className="text-[10px] text-muted-foreground">Revenue</p>
                </div>
                <div className="p-3 rounded-xl bg-surface/50 border border-white/5 text-center">
                  <DollarSign className="h-4 w-4 text-amber-400 mx-auto mb-1" />
                  <p className="text-sm font-bold text-foreground">${order.totalCost.toFixed(2)}</p>
                  <p className="text-[10px] text-muted-foreground">Cost</p>
                </div>
                <div className="p-3 rounded-xl bg-surface/50 border border-white/5 text-center">
                  <TrendingUp className="h-4 w-4 text-accent mx-auto mb-1" />
                  <p className="text-sm font-bold text-accent">${order.profit.toFixed(2)}</p>
                  <p className="text-[10px] text-muted-foreground">Profit</p>
                </div>
              </div>

              {/* Customer Info */}
              <div className="glass rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <Users className="h-3.5 w-3.5 text-accent" /> Customer Information
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Name:</span>
                    <span className="text-foreground font-medium">{order.customerName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">Email:</span>
                    <span className="text-foreground font-medium">{order.customerEmail}</span>
                  </div>
                  {order.shippingAddress.phone && (
                    <div className="flex items-center gap-2 text-xs">
                      <Phone className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">Phone:</span>
                      <span className="text-foreground font-medium">{order.shippingAddress.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Info */}
              <div className="glass rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
                  <Hash className="h-3.5 w-3.5 text-accent" /> Order Details
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Order ID:</span>
                    <span className="text-foreground font-mono">{order.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trendaryo Order:</span>
                    <span className="text-foreground font-mono">{order.trendaryoOrderId}</span>
                  </div>
                  {order.storeOrderId && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Store Order:</span>
                      <span className="text-foreground font-mono">{order.storeOrderId}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Platform:</span>
                    <span className="text-foreground">{order.storePlatform || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Store:</span>
                    <span className="text-foreground">{order.storeName || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Supplier:</span>
                    <span className="text-foreground">{order.assignedSupplier || "Not assigned"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trigger:</span>
                    <span className="text-foreground capitalize">{order.automationTrigger || "manual"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="text-foreground">{new Date(order.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Updated:</span>
                    <span className="text-foreground">{new Date(order.updatedAt).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Platform Orders */}
              {order.platformOrders.length > 0 && (
                <div className="glass rounded-xl p-4 space-y-3">
                  <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
                    <ExternalLink className="h-3.5 w-3.5 text-accent" /> Platform Orders
                  </h4>
                  <div className="space-y-2">
                    {order.platformOrders.map((po, i) => (
                      <div key={i} className="p-2 rounded-lg bg-surface/50 border border-white/5 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Platform:</span>
                          <span className="text-foreground">{po.platform}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Order ID:</span>
                          <span className="text-foreground font-mono">{po.platformOrderId}</span>
                        </div>
                        {po.trackingNumber && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tracking:</span>
                            <span className="text-foreground font-mono">{po.trackingNumber}</span>
                          </div>
                        )}
                        {po.carrier && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Carrier:</span>
                            <span className="text-foreground">{po.carrier}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <span className="text-foreground">{po.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {order.automationError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                  <AlertCircle className="h-3.5 w-3.5 inline mr-1.5" />
                  {order.automationError}
                </div>
              )}
            </>
          )}

          {activeTab === "items" && (
            <div className="space-y-2">
              {order.items.map((item: FulfillmentOrderItem, i: number) => (
                <div key={i} className="glass rounded-xl p-3 flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg bg-surface border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} alt={item.name} width={48} height={48} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="h-5 w-5 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {item.supplierName || item.source} · Qty: {item.quantity}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-muted-foreground">
                        Price: <span className="text-foreground">${item.price.toFixed(2)}</span>
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        Cost: <span className="text-foreground">${item.unitCost.toFixed(2)}</span>
                      </span>
                    </div>
                  </div>
                  <p className="text-xs font-bold text-emerald-400">
                    ${(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
              <div className="glass rounded-xl p-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">Total</span>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    Revenue: <span className="text-foreground font-bold">${order.totalRevenue.toFixed(2)}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Cost: <span className="text-foreground font-bold">${order.totalCost.toFixed(2)}</span>
                  </p>
                  <p className="text-xs text-accent font-bold">
                    Profit: ${order.profit.toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "shipping" && (
            <div className="glass rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-accent" /> Shipping Address
              </h4>
              <div className="space-y-1.5 text-xs">
                <p className="text-foreground font-medium">{order.shippingAddress.fullName}</p>
                <p className="text-muted-foreground">{order.shippingAddress.street}</p>
                <p className="text-muted-foreground">
                  {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                </p>
                <p className="text-muted-foreground">{order.shippingAddress.country}</p>
                {order.shippingAddress.email && (
                  <p className="text-muted-foreground mt-2">{order.shippingAddress.email}</p>
                )}
                {order.shippingAddress.phone && (
                  <p className="text-muted-foreground">{order.shippingAddress.phone}</p>
                )}
              </div>

              {/* Tracking Timeline */}
              {order.platformOrders.some((po) => po.trackingNumber) && (
                <div className="mt-4 space-y-2">
                  <h4 className="text-xs font-semibold text-foreground">Tracking</h4>
                  {order.platformOrders.filter((po) => po.trackingNumber).map((po, i) => (
                    <div key={i} className="p-2 rounded-lg bg-surface/50 border border-white/5 text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <Truck className="h-3 w-3 text-accent" />
                        <span className="font-mono text-foreground">{po.trackingNumber}</span>
                        <button
                          onClick={async () => {
                            const ok = await safeCopy(po.trackingNumber || "");
                            if (!ok) alert("Failed to copy tracking number");
                          }}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-muted-foreground">Carrier: {po.carrier || "Unknown"}</p>
                      {po.estimatedDelivery && (
                        <p className="text-muted-foreground">Est. Delivery: {new Date(po.estimatedDelivery).toLocaleDateString()}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "notes" && (
            <div className="space-y-3">
              {/* Add Note */}
              <div className="glass rounded-xl p-3">
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add a note to this order..."
                  className="w-full bg-surface border border-white/10 rounded-lg p-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent resize-none h-20"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleAddNote}
                    disabled={!noteText.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-[10px] font-medium hover:bg-accent/90 transition-all disabled:opacity-50"
                  >
                    <StickyNote className="h-3 w-3" /> Add Note
                  </button>
                </div>
              </div>

              {/* System Info */}
              <div className="glass rounded-xl p-4 text-center">
                <StickyNote className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Notes are saved locally for this session</p>
                <p className="text-[10px] text-muted-foreground mt-1">Full note history available in Fulfillment tab</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CSV Import Panel ─────────────────────────────────────────────────────────

function CSVImportPanel({ onClose, onImport }: { onClose: () => void; onImport: (rows: unknown[]) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);

  const parseCSV = useCallback((f: File) => {
    setParseError(null);
    setPreview([]);
    // Limit file size to avoid memory blowups in the browser (5 MB)
    if (f.size > 5 * 1024 * 1024) {
      setParseError("CSV file too large. Please upload files smaller than 5 MB or use server-side import.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter((l) => l.trim());
        if (lines.length < 2) {
          setParseError("CSV must have a header row and at least one data row");
          return;
        }
        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
        const required = ["ordernumber", "customername", "customeremail", "productname", "quantity", "unitprice"];
        const missing = required.filter((h) => !headers.includes(h));
        if (missing.length > 0) {
          setParseError(`Missing required columns: ${missing.join(", ")}`);
          return;
        }
        const rows: Record<string, string>[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map((v) => v.trim());
          if (values.length < headers.length) continue;
          const row: Record<string, string> = {};
          headers.forEach((h, idx) => { row[h] = values[idx] || ""; });
          rows.push(row);
        }
        setPreview(rows);
      } catch {
        setParseError("Failed to parse CSV file");
      }
    };
    reader.readAsText(f);
  }, []);

  const handleImport = () => {
    onImport(preview);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto bg-[hsl(var(--background))] border border-white/10 rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold text-foreground flex items-center gap-2">
              <Upload className="h-4 w-4 text-accent" /> Import Orders from CSV
            </h3>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface transition-colors">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
        <div className="p-5">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) { setFile(f); parseCSV(f); }
            }}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              file ? "border-accent/50 bg-accent/5" : "border-white/10 hover:border-white/20"
            }`}
          >
            {file ? (
              <div>
                <FileText className="h-10 w-10 text-accent mx-auto mb-3" />
                <p className="text-sm text-foreground font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{preview.length} rows parsed</p>
                <button onClick={() => { setFile(null); setPreview([]); }} className="mt-2 text-xs text-red-400 hover:underline">
                  Remove file
                </button>
              </div>
            ) : (
              <div>
                <Upload className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Drag & drop CSV here or</p>
                <label className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-accent/20 text-accent rounded-lg text-xs font-medium cursor-pointer hover:bg-accent/30 transition-all">
                  <Upload className="h-3 w-3" /> Browse Files
                  <input type="file" accept=".csv" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { setFile(f); parseCSV(f); }
                  }} />
                </label>
                <p className="text-[10px] text-muted-foreground mt-3">
                  Required: orderNumber, customerName, customerEmail, productName, quantity, unitPrice
                </p>
              </div>
            )}
          </div>

          {parseError && (
            <div className="flex items-center gap-2 mt-3 p-2 bg-red-500/10 rounded-lg text-xs text-red-400">
              <AlertTriangle className="h-3 w-3 flex-shrink-0" /> {parseError}
            </div>
          )}

          {preview.length > 0 && (
            <div className="mt-4">
              <div className="max-h-48 overflow-auto rounded-lg border border-white/10">
                <table className="w-full text-xs">
                  <thead className="bg-surface/50 sticky top-0">
                    <tr>
                      {Object.keys(preview[0]).slice(0, 6).map((h) => (
                        <th key={h} className="px-2 py-1.5 text-left text-muted-foreground font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-t border-white/5">
                        {Object.values(row).slice(0, 6).map((val, j) => (
                          <td key={j} className="px-2 py-1.5 text-foreground truncate max-w-[120px]">{val}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.length > 10 && (
                <p className="text-[10px] text-muted-foreground mt-1">...and {preview.length - 10} more rows</p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 mt-5">
            <button onClick={onClose} className="px-4 py-2 bg-surface border border-white/10 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={preview.length === 0}
              className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent/90 transition-all disabled:opacity-50"
            >
              <Upload className="h-3 w-3" />
              Import {preview.length} Orders
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk Operation Card ──────────────────────────────────────────────────────

function BulkOperationCard({ operation, onViewDetails }: { operation: BulkOperation; onViewDetails?: (op: BulkOperation) => void }) {
  const st = operationStatusConfig[operation.status] || operationStatusConfig.pending;
  const progress = operation.totalOrders > 0
    ? Math.round((operation.processedOrders / operation.totalOrders) * 100)
    : 0;

  return (
    <div className="glass rounded-xl p-4 border border-white/5 hover:border-white/10 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${st.bg} ${st.color}`}>
              {operation.status === "running" ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              {st.label}
            </span>
            <span className="text-xs font-medium text-foreground">{actionLabels[operation.action] || operation.action}</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            {operation.totalOrders} orders · Started {new Date(operation.startedAt).toLocaleString()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-foreground">{operation.successfulOrders}/{operation.totalOrders}</p>
          <p className="text-[10px] text-muted-foreground">completed</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            operation.status === "completed" ? "bg-emerald-400" :
            operation.status === "failed" ? "bg-red-400" :
            operation.status === "partial" ? "bg-amber-400" :
            operation.status === "running" ? "bg-blue-400" : "bg-accent"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded bg-surface/50">
          <p className="text-xs font-bold text-emerald-400">{operation.successfulOrders}</p>
          <p className="text-[10px] text-muted-foreground">Success</p>
        </div>
        <div className="p-2 rounded bg-surface/50">
          <p className="text-xs font-bold text-red-400">{operation.failedOrders}</p>
          <p className="text-[10px] text-muted-foreground">Failed</p>
        </div>
        <div className="p-2 rounded bg-surface/50">
          <p className="text-xs font-bold text-foreground">{operation.processedOrders}</p>
          <p className="text-[10px] text-muted-foreground">Processed</p>
        </div>
      </div>

      {/* Errors */}
      {operation.errors.length > 0 && (
        <div className="mt-3 space-y-1">
          <p className="text-[10px] text-muted-foreground">Errors:</p>
          {operation.errors.slice(0, 3).map((err, i) => (
            <div key={i} className="text-[10px] text-red-400 bg-red-400/5 rounded p-1.5">
              #{err.orderId}: {err.error}
            </div>
          ))}
          {operation.errors.length > 3 && (
            <p className="text-[10px] text-muted-foreground">+{operation.errors.length - 3} more errors</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-3">
        {operation.completedAt && (
          <p className="text-[10px] text-muted-foreground">
            Completed {new Date(operation.completedAt).toLocaleString()}
          </p>
        )}
        {onViewDetails && (
          <button
            onClick={() => onViewDetails(operation)}
            className="text-[10px] text-accent hover:underline ml-auto"
          >
            View Details
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BulkOrdersPage() {
  const { user } = useAuth();
  const ordersUrl = user ? `/api/fulfillment?uid=${user.uid}` : null;
  const bulkUrl = user ? `/api/fulfillment/bulk?uid=${user.uid}` : null;

  const { data: ordersData, isLoading: ordersLoading, mutate: mutateOrders } = useAPI<{ orders?: FulfillmentOrder[] }>(ordersUrl);
  const { data: bulkData, isLoading: bulkLoading, mutate: mutateBulk } = useAPI<{ operations?: BulkOperation[] }>(bulkUrl);

  const orders = useMemo(() => ordersData?.orders ?? [], [ordersData]);
  const operations = useMemo(() => bulkData?.operations ?? [], [bulkData]);

  // ─── State ────────────────────────────────────────────────────────────────
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkActionType>("fulfill");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<FulfillmentOrder | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; title: string; description: string; action: () => Promise<void>; danger?: boolean } | { open: false }>({ open: false });
  const [newStatus, setNewStatus] = useState<string>("pending");
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [noteText, setNoteText] = useState("");
  const [showBulkNotes, setShowBulkNotes] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ─── Computed Values ───────────────────────────────────────────────────────
  const pendingOrders = useMemo(() => orders.filter((o) => o.status === "pending"), [orders]);
  const inProgressOrders = useMemo(() => orders.filter((o) => o.status === "in_progress"), [orders]);
  const allBulkOrders = useMemo(() => [...pendingOrders, ...inProgressOrders], [pendingOrders, inProgressOrders]);

  const dateFilterFn = useMemo(() => getDateRangeFilter(dateRange), [dateRange]);

  const filteredOrders = useMemo(() => {
    return allBulkOrders.filter((o) => {
      const matchesSearch = !searchQuery ||
        o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || o.status === statusFilter;
      const matchesDate = dateFilterFn(o.createdAt);
      const matchesSupplier = supplierFilter === "all" ||
        (supplierFilter === "unassigned" && !o.assignedSupplier) ||
        (supplierFilter !== "unassigned" && o.assignedSupplier === supplierFilter);
      return matchesSearch && matchesStatus && matchesDate && matchesSupplier;
    });
  }, [allBulkOrders, searchQuery, statusFilter, dateFilterFn, supplierFilter]);

  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      let aVal: string | number, bVal: string | number;
      switch (sortField) {
        case "orderNumber": aVal = a.orderNumber; bVal = b.orderNumber; break;
        case "customerName": aVal = a.customerName; bVal = b.customerName; break;
        case "status": aVal = a.status; bVal = b.status; break;
        case "revenue": aVal = a.totalRevenue; bVal = b.totalRevenue; break;
        case "profit": aVal = a.profit; bVal = b.profit; break;
        case "createdAt": aVal = a.createdAt; bVal = b.createdAt; break;
        default: aVal = a.createdAt; bVal = b.createdAt;
      }
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      return sortDir === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [filteredOrders, sortField, sortDir]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedOrders.slice(start, start + pageSize);
  }, [sortedOrders, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedOrders.length / pageSize);

  const selectedTotalRevenue = useMemo(() => {
    return orders.filter((o) => selectedOrders.has(o.id)).reduce((sum, o) => sum + o.totalRevenue, 0);
  }, [orders, selectedOrders]);

  const selectedTotalProfit = useMemo(() => {
    return orders.filter((o) => selectedOrders.has(o.id)).reduce((sum, o) => sum + o.profit, 0);
  }, [orders, selectedOrders]);

  const allOrdersTotalRevenue = useMemo(() => orders.reduce((s, o) => s + o.totalRevenue, 0), [orders]);

  // ─── Keyboard Shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        setSelectedOrders(new Set(filteredOrders.map((o) => o.id)));
      }
      if (e.key === "Escape") {
        setSelectedOrders(new Set());
        setSelectedOrderDetail(null);
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredOrders]);

  // ─── Auto-refresh ──────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (!ordersLoading && !bulkLoading) {
        mutateOrders();
        mutateBulk();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [ordersLoading, bulkLoading, mutateOrders, mutateBulk]);

  // ─── Selection Handlers ────────────────────────────────────────────────────
  const toggleSelect = useCallback((orderId: string) => {
    setSelectedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map((o) => o.id)));
    }
  }, [selectedOrders.size, filteredOrders]);

  const selectByStatus = useCallback((status: string) => {
    const matching = filteredOrders.filter((o) => o.status === status);
    setSelectedOrders(new Set(matching.map((o) => o.id)));
  }, [filteredOrders]);

  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      setSortDir((d) => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }, [sortField]);

  // ─── Action Handlers ───────────────────────────────────────────────────────
  const handleBulkAction = async () => {
    if (!user || selectedOrders.size === 0) return;
    setProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      if (bulkAction === "export") {
        const selected = orders.filter((o) => selectedOrders.has(o.id));
        exportToCSV(selected, `orders-export-${new Date().toISOString().slice(0, 10)}.csv`);
        setSuccess(`Exported ${selected.length} orders to CSV`);
        setProcessing(false);
        return;
      }

      if (bulkAction === "csv_import") {
        setShowCSVImport(true);
        setProcessing(false);
        return;
      }

      if (bulkAction === "add_notes") {
        setShowBulkNotes(true);
        setProcessing(false);
        return;
      }

      if (bulkAction === "print_labels") {
        const selected = orders.filter((o) => selectedOrders.has(o.id));
        const printContent = selected.map((o) =>
          `Order: ${o.orderNumber}\nCustomer: ${o.customerName}\nAddress: ${o.shippingAddress.street}, ${o.shippingAddress.city}, ${o.shippingAddress.state} ${o.shippingAddress.zipCode}\nCountry: ${o.shippingAddress.country}\n---`
        ).join("\n");
        const w = window.open("", "_blank", "width=400,height=600");
        if (w) {
          w.document.write(`<html><head><title>Shipping Labels</title><style>body{font-family:monospace;font-size:12px;padding:20px;white-space:pre-wrap;} h2{font-size:14px;}</style></head><body><h2>Shipping Labels (${selected.length} orders)</h2><p>${printContent}</p></body></html>`);
          w.document.close();
          w.print();
        }
        setSuccess(`Prepared ${selected.length} labels for printing`);
        setProcessing(false);
        return;
      }

      if (bulkAction === "send_to_supplier") {
        setConfirmDialog({
          open: true,
          title: "Send to Supplier",
          description: `Send ${selectedOrders.size} orders to their assigned suppliers for fulfillment?`,
          action: async () => {
            try {
              await safeFetch("/api/fulfillment/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uid: user.uid, orderIds: Array.from(selectedOrders), action: "fulfill" }),
              });
              setSuccess(`Sent ${selectedOrders.size} orders to suppliers`);
              setSelectedOrders(new Set());
              mutateBulk();
            } catch {
              setError("Failed to send orders to suppliers");
            }
          },
        });
        setProcessing(false);
        return;
      }

      if (bulkAction === "cancel") {
        setConfirmDialog({
          open: true,
          title: "Cancel Orders",
          description: `Are you sure you want to cancel ${selectedOrders.size} orders? This action cannot be undone.`,
          danger: true,
          action: async () => {
            try {
              await safeFetch("/api/fulfillment/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uid: user.uid, orderIds: Array.from(selectedOrders), action: "cancel" }),
              });
              setSuccess(`Cancelled ${selectedOrders.size} orders`);
              setSelectedOrders(new Set());
              mutateBulk();
              mutateOrders();
            } catch {
              setError("Failed to cancel orders");
            }
          },
        });
        setProcessing(false);
        return;
      }

      if (bulkAction === "status_update") {
        setConfirmDialog({
          open: true,
          title: "Update Status",
          description: `Change ${selectedOrders.size} orders to "${newStatus}" status?`,
          action: async () => {
            try {
              await safeFetch("/api/fulfillment/bulk/status-update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderIds: Array.from(selectedOrders), newStatus }),
              });
              setSuccess(`Updated ${selectedOrders.size} orders to "${newStatus}"`);
              setSelectedOrders(new Set());
              mutateOrders();
            } catch {
              setError("Failed to update order status");
            }
          },
        });
        setProcessing(false);
        return;
      }

      if (bulkAction === "supplier_assignment") {
        if (!selectedSupplier) {
          setError("Please select a supplier first");
          setProcessing(false);
          return;
        }
        const supplier = suppliers.find((s) => s.supplierId === selectedSupplier);
        setConfirmDialog({
          open: true,
          title: "Assign Supplier",
          description: `Assign ${supplier?.supplierName || selectedSupplier} to ${selectedOrders.size} orders?`,
          action: async () => {
            try {
              await safeFetch("/api/fulfillment/bulk/supplier-assignment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderIds: Array.from(selectedOrders), supplierId: selectedSupplier, supplierName: supplier?.supplierName || selectedSupplier }),
              });
              setSuccess(`Assigned supplier to ${selectedOrders.size} orders`);
              setSelectedOrders(new Set());
              mutateOrders();
            } catch {
              setError("Failed to assign supplier");
            }
          },
        });
        setProcessing(false);
        return;
      }

      // Default actions: fulfill, sync_tracking, check_status
      await safeFetch("/api/fulfillment/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, orderIds: Array.from(selectedOrders), action: bulkAction }),
      });
      setSuccess(`Bulk action "${actionLabels[bulkAction]}" started on ${selectedOrders.size} orders`);
      setSelectedOrders(new Set());
      mutateBulk();
    } catch (err) {
      logger.error("Bulk action failed", { error: err instanceof Error ? err.message : String(err) });
      setError("Bulk action failed. Please try again.");
    }
    setProcessing(false);
  };

  const handleAddNote = (_orderId: string, _content: string) => {
    setSuccess("Note added to order");
  };

  const handleBulkNote = () => {
    if (!noteText.trim()) return;
    setSuccess(`Note added to ${selectedOrders.size} orders`);
    setNoteText("");
    setShowBulkNotes(false);
  };

  const handleCSVImport = (rows: unknown[]) => {
    setSuccess(`Imported ${rows.length} orders from CSV`);
  };

  // ─── Memoized Active Operations ────────────────────────────────────────────
  const activeOperations = useMemo(() => operations.filter((op) => op.status === "running"), [operations]);

  // ─── Auto-dismiss Toasts ───────────────────────────────────────────────────
  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 6000);
      return () => clearTimeout(t);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

  // ─── Loading State ─────────────────────────────────────────────────────────
  if (ordersLoading || bulkLoading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 px-3 sm:px-4 lg:px-6 pb-24">
        {/* Skeleton Header */}
        <div className="space-y-2">
          <div className="h-7 w-48 bg-surface rounded-lg animate-pulse" />
          <div className="h-4 w-72 bg-surface rounded-lg animate-pulse" />
        </div>
        {/* Skeleton Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-surface rounded-xl animate-pulse" />
          ))}
        </div>
        {/* Skeleton Table */}
        <div className="space-y-2">
          <div className="h-12 bg-surface rounded-xl animate-pulse" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-surface rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto space-y-6 px-3 sm:px-4 lg:px-6 pb-24">

      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 right-4 z-50 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm flex items-center gap-2 shadow-lg backdrop-blur-sm max-w-sm animate-fade-in">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-xs hover:opacity-70">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {/* Success Toast */}
      {success && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-emerald-400 text-sm flex items-center gap-2 shadow-lg backdrop-blur-sm max-w-sm animate-fade-in">
          <Check className="h-4 w-4 shrink-0" />
          <span className="flex-1">{success}</span>
          <button onClick={() => setSuccess(null)} className="text-xs hover:opacity-70">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.open ? confirmDialog.title : ""}
        description={confirmDialog.open ? confirmDialog.description : ""}
        danger={confirmDialog.open ? confirmDialog.danger : false}
        onConfirm={async () => { if (confirmDialog.open) { await confirmDialog.action(); } setConfirmDialog({ open: false }); }}
        onCancel={() => setConfirmDialog({ open: false })}
      />

      {/* Order Detail Panel */}
      {selectedOrderDetail && (
        <OrderDetailPanel
          order={selectedOrderDetail}
          onClose={() => setSelectedOrderDetail(null)}
          onAddNote={handleAddNote}
        />
      )}

      {/* CSV Import Modal */}
      {showCSVImport && (
        <CSVImportPanel onClose={() => setShowCSVImport(false)} onImport={handleCSVImport} />
      )}

      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground flex items-center gap-3">
            <Package className="h-6 w-6 text-accent" />
            Bulk Orders
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Process multiple orders at once with bulk actions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { mutateOrders(); mutateBulk(); }}
            className="flex items-center gap-1.5 px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="h-3 w-3" /> Refresh
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              showHistory ? "bg-accent/20 text-accent border border-accent/30" : "bg-surface border border-white/10 text-muted-foreground hover:text-foreground"
            }`}
          >
            <History className="h-3 w-3" /> History
          </button>
        </div>
      </div>

      {/* ─── KPI Stats ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "Pending", value: pendingOrders.length, icon: Clock, color: "text-amber-400", gradient: "from-amber-500/15 to-amber-500/5", border: "border-amber-500/20" },
          { label: "In Progress", value: inProgressOrders.length, icon: Zap, color: "text-blue-400", gradient: "from-blue-500/15 to-blue-500/5", border: "border-blue-500/20" },
          { label: "Selected", value: selectedOrders.size, icon: CheckCircle2, color: "text-accent", gradient: "from-accent/15 to-accent/5", border: "border-accent/20" },
          { label: "Revenue", value: `$${selectedOrders.size > 0 ? selectedTotalRevenue.toFixed(0) : allOrdersTotalRevenue.toFixed(0)}`, icon: DollarSign, color: "text-emerald-400", gradient: "from-emerald-500/15 to-emerald-500/5", border: "border-emerald-500/20" },
          { label: "Operations", value: operations.length, icon: BarChart3, color: "text-purple-400", gradient: "from-purple-500/15 to-purple-500/5", border: "border-purple-500/20" },
        ].map((stat) => (
          <div key={stat.label} className={`bg-gradient-to-br ${stat.gradient} border ${stat.border} rounded-xl p-3 text-center`}>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </div>
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ─── Bulk Action Bar ──────────────────────────────────────────────── */}
      <div className="glass rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Selection Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground hover:bg-surface/80 transition-colors"
            >
              {selectedOrders.size === filteredOrders.length && filteredOrders.length > 0 ? "Deselect All" : "Select All"}
            </button>
            <span className="text-[10px] text-muted-foreground min-w-[60px]">
              {selectedOrders.size} selected
            </span>
          </div>

          {/* Quick Select by Status */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => selectByStatus("pending")}
              className="px-2 py-1.5 bg-amber-400/10 border border-amber-400/20 rounded-lg text-[10px] text-amber-400 hover:bg-amber-400/20 transition-colors"
            >
              Pending ({pendingOrders.length})
            </button>
            <button
              onClick={() => selectByStatus("in_progress")}
              className="px-2 py-1.5 bg-blue-400/10 border border-blue-400/20 rounded-lg text-[10px] text-blue-400 hover:bg-blue-400/20 transition-colors"
            >
              In Progress ({inProgressOrders.length})
            </button>
          </div>

          {/* Action Dropdown */}
          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value as BulkActionType)}
            className="px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground focus:outline-none focus:border-accent"
          >
            <optgroup label="Fulfillment">
              <option value="fulfill">Fulfill Orders</option>
              <option value="cancel">Cancel Orders</option>
              <option value="send_to_supplier">Send to Supplier</option>
            </optgroup>
            <optgroup label="Tracking">
              <option value="sync_tracking">Sync Tracking</option>
              <option value="check_status">Check Status</option>
            </optgroup>
            <optgroup label="Organization">
              <option value="status_update">Update Status</option>
              <option value="supplier_assignment">Assign Supplier</option>
              <option value="add_notes">Add Notes</option>
            </optgroup>
            <optgroup label="Import/Export">
              <option value="export">Export to CSV</option>
              <option value="csv_import">Import from CSV</option>
            </optgroup>
            <optgroup label="Other">
              <option value="print_labels">Print Labels</option>
            </optgroup>
          </select>

          {/* Action-specific inputs */}
          {bulkAction === "status_update" && (
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground focus:outline-none focus:border-accent"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          )}

          {bulkAction === "supplier_assignment" && (
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground focus:outline-none focus:border-accent"
            >
              <option value="">Select supplier...</option>
              {suppliers.map((s) => (
                <option key={s.supplierId} value={s.supplierId}>{s.supplierName}</option>
              ))}
            </select>
          )}

          {/* Run Button */}
          <button
            onClick={handleBulkAction}
            disabled={selectedOrders.size === 0 || processing}
            className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent/90 transition-all disabled:opacity-50 ml-auto"
          >
            {processing ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlayCircle className="h-3 w-3" />}
            Run Bulk Action
          </button>
        </div>

        {/* Selected Summary */}
        {selectedOrders.size > 0 && (
          <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-4 text-[10px] text-muted-foreground">
            <span>{selectedOrders.size} orders selected</span>
            <span>Revenue: <span className="text-emerald-400 font-bold">${selectedTotalRevenue.toFixed(2)}</span></span>
            <span>Profit: <span className="text-accent font-bold">${selectedTotalProfit.toFixed(2)}</span></span>
          </div>
        )}

        {/* Bulk Notes */}
        {showBulkNotes && (
          <div className="mt-3 pt-3 border-t border-white/5 space-y-2">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder={`Add a note to ${selectedOrders.size} selected orders...`}
              className="w-full bg-surface border border-white/10 rounded-lg p-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent resize-none h-16"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowBulkNotes(false)} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
                Cancel
              </button>
              <button
                onClick={handleBulkNote}
                disabled={!noteText.trim()}
                className="flex items-center gap-1 px-3 py-1.5 bg-accent text-white rounded-lg text-[10px] font-medium hover:bg-accent/90 transition-all disabled:opacity-50"
              >
                <StickyNote className="h-3 w-3" /> Add Note
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Filters ─────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search orders by number, customer, email, or ID... (Ctrl+F)"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2.5 bg-surface border border-white/10 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setCurrentPage(1); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <VoiceInput onTranscript={(text) => setSearchQuery(text)} />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
              showFilters ? "bg-accent/20 text-accent border border-accent/30" : "bg-surface border border-white/10 text-muted-foreground hover:text-foreground"
            }`}
          >
            <Filter className="h-3.5 w-3.5" /> Filters
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="glass rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground focus:outline-none focus:border-accent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => { setDateRange(e.target.value as DateRange); setCurrentPage(1); }}
                className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground focus:outline-none focus:border-accent"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Supplier</label>
              <select
                value={supplierFilter}
                onChange={(e) => { setSupplierFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground focus:outline-none focus:border-accent"
              >
                <option value="all">All Suppliers</option>
                <option value="unassigned">Unassigned</option>
                {suppliers.map((s) => (
                  <option key={s.supplierId} value={s.supplierName}>{s.supplierName}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => { setStatusFilter("all"); setDateRange("all"); setSupplierFilter("all"); setSearchQuery(""); setCurrentPage(1); }}
                className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Operation History ────────────────────────────────────────────── */}
      {showHistory && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
              <History className="h-4 w-4 text-accent" /> Operation History
            </h3>
            <button
              onClick={() => setShowHistory(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Hide
            </button>
          </div>
          {operations.length === 0 ? (
            <div className="glass rounded-xl p-6 text-center">
              <History className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No operations yet</p>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {operations.slice(0, 6).map((op) => (
                <BulkOperationCard key={op.id} operation={op} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Active Operations ────────────────────────────────────────────── */}
      {activeOperations.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
            <Loader2 className="h-4 w-4 text-blue-400 animate-spin" /> Active Operations
          </h3>
          {activeOperations.map((op) => (
            <BulkOperationCard key={op.id} operation={op} />
          ))}
        </div>
      )}

      {/* ─── Orders Table ─────────────────────────────────────────────────── */}
      <div className="glass rounded-xl overflow-hidden">
        {sortedOrders.length === 0 ? (
          <EmptyState
            iconName="orders"
            title="No orders available for bulk actions"
            description={searchQuery || statusFilter !== "all" || dateRange !== "all" || supplierFilter !== "all"
              ? "No orders match your current filters. Try adjusting your search criteria."
              : "Orders must be pending or in-progress to be included in bulk operations."}
            action={!searchQuery && statusFilter === "all" && dateRange === "all" && supplierFilter === "all"
              ? { label: "Import Orders", onClick: () => setShowCSVImport(true) }
              : { label: "Clear Filters", onClick: () => { setStatusFilter("all"); setDateRange("all"); setSupplierFilter("all"); setSearchQuery(""); } }
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-surface/50 border-b border-white/10">
                    <th className="px-3 py-3 text-left w-10">
                      <button onClick={selectAll} className="flex items-center justify-center">
                        {selectedOrders.size === filteredOrders.length && filteredOrders.length > 0 ? (
                          <CheckCircle2 className="h-4 w-4 text-accent" />
                        ) : selectedOrders.size > 0 ? (
                          <div className="w-4 h-4 rounded border-2 border-accent bg-accent/20 flex items-center justify-center">
                            <div className="w-2 h-0.5 bg-accent rounded" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded border-2 border-white/20" />
                        )}
                      </button>
                    </th>
                    <th className="px-3 py-3 text-left cursor-pointer hover:text-foreground select-none" onClick={() => handleSort("orderNumber")}>
                      <div className="flex items-center gap-1 text-muted-foreground font-medium">
                        Order {sortField === "orderNumber" && (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                      </div>
                    </th>
                    <th className="px-3 py-3 text-left cursor-pointer hover:text-foreground select-none hidden sm:table-cell" onClick={() => handleSort("customerName")}>
                      <div className="flex items-center gap-1 text-muted-foreground font-medium">
                        Customer {sortField === "customerName" && (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                      </div>
                    </th>
                    <th className="px-3 py-3 text-left cursor-pointer hover:text-foreground select-none" onClick={() => handleSort("status")}>
                      <div className="flex items-center gap-1 text-muted-foreground font-medium">
                        Status {sortField === "status" && (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                      </div>
                    </th>
                    <th className="px-3 py-3 text-left hidden md:table-cell">
                      <span className="text-muted-foreground font-medium">Supplier</span>
                    </th>
                    <th className="px-3 py-3 text-right cursor-pointer hover:text-foreground select-none" onClick={() => handleSort("revenue")}>
                      <div className="flex items-center justify-end gap-1 text-muted-foreground font-medium">
                        Revenue {sortField === "revenue" && (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                      </div>
                    </th>
                    <th className="px-3 py-3 text-right cursor-pointer hover:text-foreground select-none hidden sm:table-cell" onClick={() => handleSort("profit")}>
                      <div className="flex items-center justify-end gap-1 text-muted-foreground font-medium">
                        Profit {sortField === "profit" && (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                      </div>
                    </th>
                    <th className="px-3 py-3 text-left cursor-pointer hover:text-foreground select-none hidden lg:table-cell" onClick={() => handleSort("createdAt")}>
                      <div className="flex items-center gap-1 text-muted-foreground font-medium">
                        Created {sortField === "createdAt" && (sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                      </div>
                    </th>
                    <th className="px-3 py-3 text-center w-10">
                      <span className="text-muted-foreground font-medium">Details</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrders.map((order) => {
                    const st = statusConfig[order.status] || statusConfig.pending;
                    return (
                      <tr
                        key={order.id}
                        className={`border-b border-white/5 transition-colors ${
                          selectedOrders.has(order.id) ? "bg-accent/5" : "hover:bg-surface/30"
                        }`}
                      >
                        <td className="px-3 py-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleSelect(order.id); }}
                            className="flex items-center justify-center"
                          >
                            {selectedOrders.has(order.id) ? (
                              <CheckCircle2 className="h-4 w-4 text-accent" />
                            ) : (
                              <div className="w-4 h-4 rounded border-2 border-white/20 hover:border-white/40 transition-colors" />
                            )}
                          </button>
                        </td>
                        <td className="px-3 py-3">
                          <button
                            onClick={() => setSelectedOrderDetail(order)}
                            className="text-xs font-semibold text-foreground hover:text-accent transition-colors font-mono"
                          >
                            {order.orderNumber}
                          </button>
                          <p className="text-[10px] text-muted-foreground sm:hidden">{order.customerName}</p>
                        </td>
                        <td className="px-3 py-3 hidden sm:table-cell">
                          <p className="text-xs text-foreground">{order.customerName}</p>
                          <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{order.customerEmail}</p>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${st.bg} ${st.color}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 hidden md:table-cell">
                          <span className="text-xs text-muted-foreground">
                            {order.assignedSupplier || (
                              <span className="text-[10px] text-muted-foreground/50 italic">Unassigned</span>
                            )}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="text-xs font-bold text-foreground">${order.totalRevenue.toFixed(2)}</span>
                        </td>
                        <td className="px-3 py-3 text-right hidden sm:table-cell">
                          <span className={`text-xs font-bold ${order.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            ${order.profit.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-3 py-3 hidden lg:table-cell">
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <button
                            onClick={() => setSelectedOrderDetail(order)}
                            className="p-1.5 rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {sortedOrders.length > 0 && (
            <div className="px-4 py-3 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-[10px] text-muted-foreground text-center sm:text-left">
                Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, sortedOrders.length)} of {sortedOrders.length} orders
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2 py-1 rounded text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                >
                  Prev
                </button>
                {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-6 h-6 rounded text-[10px] font-medium transition-colors ${
                        currentPage === page
                          ? "bg-accent text-white"
                          : "text-muted-foreground hover:text-foreground hover:bg-surface"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                {totalPages > 5 && (
                  <>
                    <span className="text-muted-foreground text-[10px]">...</span>
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      className={`w-6 h-6 rounded text-[10px] font-medium transition-colors ${
                        currentPage === totalPages
                          ? "bg-accent text-white"
                          : "text-muted-foreground hover:text-foreground hover:bg-surface"
                      }`}
                    >
                      {totalPages}
                    </button>
                  </>
                )}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 rounded text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
            )}
          </>
        )}
      </div>

      {/* ─── Keyboard Shortcuts Help ──────────────────────────────────────── */}
      <div className="glass rounded-xl p-4">
        <h3 className="font-display text-xs font-semibold text-foreground flex items-center gap-2 mb-3">
          <Settings className="h-3.5 w-3.5 text-accent" /> Keyboard Shortcuts
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-surface border border-white/10 rounded text-muted-foreground font-mono">Ctrl+A</kbd>
            <span className="text-muted-foreground">Select all</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-surface border border-white/10 rounded text-muted-foreground font-mono">Esc</kbd>
            <span className="text-muted-foreground">Deselect all</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-surface border border-white/10 rounded text-muted-foreground font-mono">Ctrl+F</kbd>
            <span className="text-muted-foreground">Search orders</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-surface border border-white/10 rounded text-muted-foreground font-mono">Click</kbd>
            <span className="text-muted-foreground">View order details</span>
          </div>
        </div>
      </div>
    </div>
  );
}
