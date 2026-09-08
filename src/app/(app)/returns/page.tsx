"use client";

import { useState } from "react";
import {
  RotateCcw, Package, AlertTriangle, CheckCircle2, Clock,
  DollarSign, Shield, Loader2, Search, RefreshCw,
  Eye, ChevronRight, X, Send, TrendingDown,
  Tag, Truck,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAPI } from "@/hooks/useAPI";
import { safeFetch } from "@/lib/safe-fetch";
import { useToast } from "@/components/ui/Toast";
import { useInView } from "@/hooks/useInView";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import type {
  ReturnRequest, RefundCalculation,
  DefectReport, DefectAnalytics,
  ReturnReason,
} from "@/types/returns";
import {
  RETURN_REASON_LABELS, RETURN_STATUS_LABELS, RETURN_STATUS_COLORS,
  DEFECT_SEVERITY_LABELS, DEFECT_SEVERITY_COLORS,
  DEFECT_RESOLUTION_LABELS,
} from "@/types/returns";

function KPICard({ label, value, prefix, suffix, icon: Icon, color, delay }: {
  label: string; value: number; prefix?: string; suffix?: string; icon: typeof RotateCcw; color: string; delay: number;
}) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const count = useAnimatedCounter(value, 1500, isInView);
  return (
    <div ref={ref} className={`glass rounded-xl p-3 sm:p-4 transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="flex items-center gap-2 sm:gap-3 mb-2">
        <div className={`flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg ${color}/10`}>
          <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${color}`} />
        </div>
      </div>
      <p className="font-display text-lg sm:text-2xl font-bold text-foreground">{prefix || ""}{count.toLocaleString()}{suffix || ""}</p>
      <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function ReturnCard({ ret, onAction, selected, onSelect, loading }: {
  ret: ReturnRequest; onAction: (id: string, action: string, data?: Record<string, unknown>) => void;
  selected: boolean; onSelect: (id: string) => void;
  loading: boolean;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const statusColor = RETURN_STATUS_COLORS[ret.status] || "text-gray-400 bg-gray-400/10";
  const totalItems = ret.items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = ret.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  return (
    <div
      className={`glass rounded-xl p-4 transition-all cursor-pointer border ${
        selected ? "border-accent/40 bg-accent/5" : "border-transparent hover:border-accent/20"
      }`}
      onClick={() => onSelect(ret.id)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-semibold text-foreground font-mono">#{ret.orderNumber}</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold ${statusColor}`}>
              {RETURN_STATUS_LABELS[ret.status] || ret.status}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {ret.customerName} · {ret.supplierName} · {ret.platform}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-accent">${subtotal.toFixed(2)}</p>
          <p className="text-[9px] text-muted-foreground">{totalItems} item{totalItems !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-surface text-muted-foreground">
          {RETURN_REASON_LABELS[ret.reason] || ret.reason}
        </span>
        {ret.refundAmount > 0 && (
          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-emerald-400/10 text-emerald-400">
            Refunded: ${ret.refundAmount.toFixed(2)}
          </span>
        )}
      </div>

      {ret.returnLabel && (
        <div className="p-2 rounded-lg bg-surface/50 mb-3">
          <div className="flex items-center gap-2">
            <Truck className="h-3 w-3 text-purple-400" />
            <span className="text-[9px] text-muted-foreground">
              {ret.returnLabel.carrier} · {ret.returnLabel.trackingNumber}
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {ret.status === "pending" && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); onAction(ret.id, "approve"); }}
              disabled={loading}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-medium hover:bg-emerald-500/30 transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="h-3 w-3" /> Approve
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onAction(ret.id, "deny"); }}
              disabled={loading}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-[10px] font-medium hover:bg-red-500/30 transition-all disabled:opacity-50"
            >
              <X className="h-3 w-3" /> Deny
            </button>
          </>
        )}
        {ret.status === "approved" && (
          <button
            onClick={(e) => { e.stopPropagation(); onAction(ret.id, "generateLabel"); }}
            disabled={loading}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-[10px] font-medium hover:bg-purple-500/30 transition-all disabled:opacity-50"
          >
            <Tag className="h-3 w-3" /> Generate Label
          </button>
        )}
        {ret.status === "label_generated" && (
          <button
            onClick={(e) => { e.stopPropagation(); onAction(ret.id, "updateStatus", { status: "shipped_back" }); }}
            disabled={loading}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-[10px] font-medium hover:bg-blue-500/30 transition-all disabled:opacity-50"
          >
            <Send className="h-3 w-3" /> Mark Shipped
          </button>
        )}
        {ret.status === "shipped_back" && (
          <button
            onClick={(e) => { e.stopPropagation(); onAction(ret.id, "updateStatus", { status: "received" }); }}
            disabled={loading}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg text-[10px] font-medium hover:bg-cyan-500/30 transition-all disabled:opacity-50"
          >
            <Package className="h-3 w-3" /> Mark Received
          </button>
        )}
        {ret.status === "received" && (
          <button
            onClick={(e) => { e.stopPropagation(); onAction(ret.id, "updateStatus", { status: "inspected" }); }}
            disabled={loading}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-orange-500/20 text-orange-400 rounded-lg text-[10px] font-medium hover:bg-orange-500/30 transition-all disabled:opacity-50"
          >
            <Eye className="h-3 w-3" /> Mark Inspected
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); setShowDetails(!showDetails); }}
          className="flex items-center gap-1 px-2.5 py-1.5 text-muted-foreground hover:text-foreground rounded-lg text-[10px] font-medium hover:bg-surface transition-all ml-auto"
        >
          <ChevronRight className={`h-3 w-3 transition-transform ${showDetails ? "rotate-90" : ""}`} />
        </button>
      </div>

      {showDetails && (
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          <div>
            <p className="text-[9px] font-semibold text-muted-foreground mb-1">Reason Details</p>
            <p className="text-[10px] text-foreground">{ret.reasonDetails}</p>
          </div>
          <div>
            <p className="text-[9px] font-semibold text-muted-foreground mb-1">Items</p>
            {ret.items.map((item, i) => (
              <div key={i} className="flex items-center gap-2 py-1">
                {item.imageUrl && <img src={item.imageUrl} alt="" className="w-6 h-6 rounded object-cover" />}
                <span className="text-[10px] text-foreground flex-1 truncate">{item.productName}</span>
                <span className="text-[10px] text-muted-foreground">x{item.quantity}</span>
                <span className="text-[10px] text-foreground">${(item.unitPrice * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          {ret.returnLabel?.instructions && (
            <div>
              <p className="text-[9px] font-semibold text-muted-foreground mb-1">Return Instructions</p>
              <p className="text-[10px] text-foreground whitespace-pre-line">{ret.returnLabel.instructions}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DefectCard({ defect, onAction, loading }: { defect: DefectReport; onAction: (id: string, action: string, data?: Record<string, unknown>) => void; loading: boolean }) {
  const severityColor = DEFECT_SEVERITY_COLORS[defect.severity] || "text-gray-400 bg-gray-400/10";

  return (
    <div className="glass rounded-xl p-4 border border-transparent hover:border-accent/20 transition-all">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-semibold text-foreground truncate max-w-[200px]">{defect.productName}</span>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${severityColor}`}>
              {DEFECT_SEVERITY_LABELS[defect.severity]}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">{defect.supplierName} · {defect.defectType.replace(/_/g, " ")}</p>
        </div>
        <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
          defect.resolved ? "text-emerald-400 bg-emerald-400/10" : "text-amber-400 bg-amber-400/10"
        }`}>
          {defect.resolved ? "Resolved" : DEFECT_RESOLUTION_LABELS[defect.resolution]}
        </span>
      </div>

      <p className="text-[10px] text-muted-foreground mb-3 line-clamp-2">{defect.description}</p>

      <div className="flex items-center justify-between">
        <span className="text-[9px] text-muted-foreground">
          Reported by {defect.reportedBy.replace(/_/g, " ")} · {new Date(defect.createdAt).toLocaleDateString()}
        </span>
        {!defect.resolved && (
          <div className="flex gap-1.5">
            <button
              onClick={() => onAction(defect.id, "resolve", { resolution: "replacement_sent" })}
              disabled={loading}
              className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-[9px] font-medium hover:bg-blue-500/30 transition-all disabled:opacity-50"
            >
              Replace
            </button>
            <button
              onClick={() => onAction(defect.id, "resolve", { resolution: "refund_issued" })}
              disabled={loading}
              className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-[9px] font-medium hover:bg-emerald-500/30 transition-all disabled:opacity-50"
            >
              Refund
            </button>
            <button
              onClick={() => onAction(defect.id, "resolve", { resolution: "escalated" })}
              disabled={loading}
              className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded text-[9px] font-medium hover:bg-amber-500/30 transition-all"
            >
              Escalate
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SupplierDefectRow({ supplier }: { supplier: { supplierId: string; supplierName: string; totalDefects: number; defectRate: number; severity: string; topDefectTypes: { type: string; count: number }[] } }) {
  const severityColor: Record<string, string> = {
    low: "text-gray-400 bg-gray-400/10",
    medium: "text-yellow-400 bg-yellow-400/10",
    high: "text-orange-400 bg-orange-400/10",
    critical: "text-red-400 bg-red-400/10",
  };

  return (
    <div className="p-3 rounded-xl bg-surface/50 border border-white/5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-foreground">{supplier.supplierName}</span>
        <div className="flex items-center gap-2">
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${severityColor[supplier.severity] || "text-gray-400 bg-gray-400/10"}`}>
            {supplier.severity}
          </span>
          <span className="text-[10px] font-bold text-foreground">{supplier.totalDefects} defects</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {supplier.topDefectTypes.slice(0, 3).map((dt, i) => (
          <span key={i} className="px-1.5 py-0.5 rounded text-[8px] bg-surface text-muted-foreground">
            {dt.type.replace(/_/g, " ")} ({dt.count})
          </span>
        ))}
      </div>
    </div>
  );
}

export default function ReturnsPage() {
  const { user } = useAuth();
  const uid = user?.uid || "";
  const { error: toastError } = useToast();

  const returnsUrl = uid ? `/api/returns?uid=${uid}` : null;
  const defectsUrl = uid ? `/api/returns/defects?type=analytics&uid=${uid}` : null;
  const refundsUrl = uid ? `/api/returns/refund?uid=${uid}` : null;

  const { data: returnsData, isLoading: returnsLoading, mutate: mutateReturns } = useAPI<{ returns?: ReturnRequest[] }>(returnsUrl);
  const { data: defectsData, isLoading: defectsLoading, mutate: mutateDefects } = useAPI<{ defects?: DefectReport[] }>(uid ? `/api/returns/defects?uid=${uid}` : null);
  const { data: analyticsData, isLoading: analyticsLoading } = useAPI<{ suppliers?: DefectAnalytics["suppliers"]; totalDefects?: number; severityBreakdown?: Record<string, number>; topDefectProducts?: { productId: string; productName: string; defectCount: number; supplierName: string }[] }>(defectsUrl);
  const { data: refundsData, isLoading: refundsLoading, mutate: mutateRefunds } = useAPI<{ refunds?: RefundCalculation[] }>(refundsUrl);

  const returns = returnsData?.returns ?? [];
  const defects = defectsData?.defects ?? [];
  const refunds = refundsData?.refunds ?? [];
  const analytics: {
    suppliers?: DefectAnalytics["suppliers"];
    totalDefects?: number;
    severityBreakdown?: Record<string, number>;
    topDefectProducts?: { productId: string; productName: string; defectCount: number; supplierName: string }[];
  } | null = analyticsData ?? null;

  const loading = returnsLoading || defectsLoading;

  const [activeTab, setActiveTab] = useState<"returns" | "refunds" | "defects" | "analytics">("returns");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDetect, setShowDetect] = useState(false);
  const [detectResults, setDetectResults] = useState<Array<{ orderId: string; orderNumber: string; customerName: string }>>([]);

  const filteredReturns = returns.filter((r) => {
    const matchesStatus = statusFilter === "all" || r.status === statusFilter;
    const matchesSearch = !searchQuery ||
      r.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.supplierName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const statusCounts: Record<string, number> = {};
  for (const r of returns) {
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
  }

  const pendingReturns = returns.filter((r) => r.status === "pending").length;
  const processedToday = returns.filter((r) => {
    const today = new Date().toDateString();
    return new Date(r.updatedAt).toDateString() === today && r.status !== "pending";
  }).length;
  const totalRefunds = refunds.filter((r) => r.processed).reduce((sum, r) => sum + r.totalRefund, 0);
  const totalDefectCount = defects.length;

  const handleAction = async (id: string, action: string, data?: Record<string, unknown>) => {
    if (!user) return;
    setActionLoading(id);
    try {
      if (action === "approve" || action === "deny") {
        const status = action === "approve" ? "approved" : "denied";
        await safeFetch<unknown>("/api/returns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: user.uid, action: "updateStatus", returnId: id, status }),
        });
      } else if (action === "generateLabel") {
        await safeFetch<unknown>("/api/returns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: user.uid, action: "generateLabel", returnId: id }),
        });
      } else if (action === "updateStatus") {
        await safeFetch<unknown>("/api/returns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: user.uid, action: "updateStatus", returnId: id, status: data?.status }),
        });
      } else if (action === "resolve") {
        await safeFetch<unknown>("/api/returns/defects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: user.uid, action: "resolve", defectId: id, resolution: data?.resolution }),
        });
      }
      mutateReturns();
      mutateDefects();
      mutateRefunds();
    } catch {
      toastError("Action failed. Please try again.");
    }
    setActionLoading(null);
  };

  const handleDetect = async () => {
    if (!user) return;
    setShowDetect(true);
    try {
      const res = await safeFetch<{ candidates?: Array<{ orderId: string; orderNumber: string; customerName: string }> }>("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, action: "detect" }),
      });
      setDetectResults(res?.candidates || []);
    } catch {
      setDetectResults([]);
    }
  };

  const tabs = [
    { id: "returns" as const, label: "Returns", icon: RotateCcw, count: returns.length },
    { id: "refunds" as const, label: "Refunds", icon: DollarSign, count: refunds.length },
    { id: "defects" as const, label: "Defects", icon: AlertTriangle, count: defects.length },
    { id: "analytics" as const, label: "Analytics", icon: TrendingDown, count: 0 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 px-3 sm:px-4 lg:px-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Returns & Refunds</h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
            Manage return requests, process refunds, and track product defects across suppliers.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {pendingReturns > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-400/10 border border-amber-400/20 text-[10px] sm:text-[11px] font-semibold text-amber-400">
              <Clock className="h-3 w-3" />
              {pendingReturns} Pending
            </span>
          )}
          <button
            onClick={handleDetect}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent/20 text-accent rounded-xl text-[10px] sm:text-[11px] font-semibold hover:bg-accent/30 transition-all"
          >
            <RefreshCw className="h-3 w-3" /> Auto-Detect
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <KPICard label="Pending Returns" value={pendingReturns} icon={Clock} color="text-amber-400" delay={0} />
        <KPICard label="Processed Today" value={processedToday} icon={CheckCircle2} color="text-emerald-400" delay={100} />
        <KPICard label="Total Refunds" value={totalRefunds} prefix="$" icon={DollarSign} color="text-accent" delay={200} />
        <KPICard label="Defect Reports" value={totalDefectCount} icon={AlertTriangle} color="text-red-400" delay={300} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface/50 rounded-xl p-1 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-accent text-white shadow-lg"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
              {tab.count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${activeTab === tab.id ? "bg-white/20" : "bg-surface"}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Returns Tab */}
      {activeTab === "returns" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by order, customer, supplier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground focus:outline-none focus:border-accent"
            >
              <option value="all">All Statuses</option>
              {Object.entries(RETURN_STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}{statusCounts[key] ? ` (${statusCounts[key]})` : ""}</option>
              ))}
            </select>
          </div>

          {/* Returns List */}
          {filteredReturns.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-surface/80 border border-white/5 flex items-center justify-center mx-auto mb-4">
                <RotateCcw className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">No returns found</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                {searchQuery || statusFilter !== "all" ? "Try adjusting your filters" : "No return requests yet. Use Auto-Detect to scan for potential returns."}
              </p>
              <button
                onClick={handleDetect}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-xl text-xs font-medium hover:bg-accent/90 transition-all"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Auto-Detect Returns
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReturns.map((ret) => (
                <ReturnCard
                  key={ret.id}
                  ret={ret}
                  onAction={handleAction}
                  loading={actionLoading === ret.id}
                  selected={selectedReturnId === ret.id}
                  onSelect={(id) => setSelectedReturnId(selectedReturnId === id ? null : id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Refunds Tab */}
      {activeTab === "refunds" && (
        <div className="space-y-3">
          {refundsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 text-accent animate-spin" /></div>
          ) : refunds.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-surface/80 border border-white/5 flex items-center justify-center mx-auto mb-4">
                <DollarSign className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">No refunds yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Process refunds from approved return requests.
              </p>
            </div>
          ) : (
            refunds.map((refund) => (
              <div key={refund.id} className="glass rounded-xl p-4 border border-transparent hover:border-accent/20 transition-all">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Refund #{refund.id.slice(0, 8)}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Return: {refund.returnRequestId.slice(0, 8)} · {refund.refundMethod}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-accent">${refund.totalRefund.toFixed(2)}</p>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                      refund.processed ? "text-emerald-400 bg-emerald-400/10" : "text-amber-400 bg-amber-400/10"
                    }`}>
                      {refund.processed ? "Processed" : "Pending"}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 p-2 rounded-lg bg-surface/50">
                  <div className="text-center">
                    <p className="text-[9px] text-muted-foreground">Subtotal</p>
                    <p className="text-[10px] font-bold text-foreground">${refund.subtotal.toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] text-muted-foreground">Supplier Refund</p>
                    <p className="text-[10px] font-bold text-foreground">${refund.supplierRefundAmount.toFixed(2)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] text-muted-foreground">Total Refund</p>
                    <p className="text-[10px] font-bold text-accent">${refund.totalRefund.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Defects Tab */}
      {activeTab === "defects" && (
        <div className="space-y-3">
          {defects.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-surface/80 border border-white/5 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">No defect reports</h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                Product defects will appear here when reported by customers or detected during quality checks.
              </p>
            </div>
          ) : (
            defects.map((defect) => (
              <DefectCard key={defect.id} defect={defect} onAction={handleAction} loading={actionLoading === defect.id} />
            ))
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {analyticsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 text-accent animate-spin" /></div>
          ) : (
            <>
              {/* Severity Breakdown */}
              <div className="glass rounded-2xl p-4 sm:p-5">
                <h3 className="font-display text-sm sm:text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-accent" /> Severity Breakdown
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(["low", "medium", "high", "critical"] as const).map((sev) => {
                    const count = analytics?.severityBreakdown?.[sev] || 0;
                    const color = DEFECT_SEVERITY_COLORS[sev];
                    return (
                      <div key={sev} className={`p-3 rounded-xl text-center ${color.split(" ")[1]}`}>
                        <p className={`text-xl font-bold ${color.split(" ")[0]}`}>{count}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">{DEFECT_SEVERITY_LABELS[sev]}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Supplier Defect Summary */}
              <div className="glass rounded-2xl p-4 sm:p-5">
                <h3 className="font-display text-sm sm:text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-accent" /> Supplier Defect Summary
                </h3>
                {(!analytics?.suppliers || analytics.suppliers.length === 0) ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No supplier defect data available</p>
                ) : (
                  <div className="space-y-2">
                    {analytics.suppliers.map((supplier) => (
                      <SupplierDefectRow key={supplier.supplierId} supplier={supplier} />
                    ))}
                  </div>
                )}
              </div>

              {/* Top Defect Products */}
              <div className="glass rounded-2xl p-4 sm:p-5">
                <h3 className="font-display text-sm sm:text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Package className="h-4 w-4 text-accent" /> Top Defective Products
                </h3>
                {(!analytics?.topDefectProducts || analytics.topDefectProducts.length === 0) ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No defect product data available</p>
                ) : (
                  <div className="space-y-2">
                    {analytics.topDefectProducts.map((product, i) => (
                      <div key={product.productId} className="flex items-center gap-3 p-3 rounded-xl bg-surface/50 border border-white/5">
                        <span className="text-xs font-bold text-muted-foreground w-5 text-center">#{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{product.productName}</p>
                          <p className="text-[10px] text-muted-foreground">{product.supplierName}</p>
                        </div>
                        <span className="text-xs font-bold text-red-400">{product.defectCount} defects</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* Auto-Detect Modal */}
      {showDetect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden border border-white/10">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-accent" /> Auto-Detect Returns
              </h3>
              <button onClick={() => { setShowDetect(false); setDetectResults([]); }} className="p-1 rounded-lg hover:bg-surface transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {detectResults.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-3" />
                  <p className="text-sm text-foreground font-medium">No new returns detected</p>
                  <p className="text-xs text-muted-foreground mt-1">All cancelled/refunded orders are already being tracked.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-3">
                    Found {detectResults.length} potential return{detectResults.length !== 1 ? "s" : ""} from cancelled orders:
                  </p>
                  {detectResults.map((candidate) => (
                    <div key={candidate.orderId} className="flex items-center justify-between p-3 rounded-xl bg-surface/50 border border-white/5">
                      <div>
                        <p className="text-xs font-medium text-foreground">{candidate.orderNumber}</p>
                        <p className="text-[10px] text-muted-foreground">{candidate.customerName}</p>
                      </div>
                      <button
                        onClick={async () => {
                          if (!user) return;
                          await safeFetch<unknown>("/api/returns", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              uid: user.uid,
                              action: "create",
                              orderId: candidate.orderId,
                              orderNumber: candidate.orderNumber,
                              customerId: "",
                              customerName: candidate.customerName,
                              customerEmail: "",
                              items: [],
                              reason: "other" as ReturnReason,
                              reasonDetails: "Auto-detected from cancelled order",
                              supplierId: "unknown",
                              supplierName: "Unknown",
                              platform: "unknown",
                              storePlatform: "custom",
                            }),
                          });
                          setDetectResults((prev) => prev.filter((c) => c.orderId !== candidate.orderId));
                          mutateReturns();
                        }}
                        className="px-2.5 py-1.5 bg-accent/20 text-accent rounded-lg text-[10px] font-medium hover:bg-accent/30 transition-all"
                      >
                        Create Return
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
