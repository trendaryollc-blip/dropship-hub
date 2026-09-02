"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  Package, Loader2, AlertCircle, CheckCircle2, X, Search,
  PlayCircle, Clock, Zap, FileText,
} from "lucide-react";
import { useAPI } from "@/hooks/useAPI";
import { safeFetch } from "@/lib/safe-fetch";
import { logger } from "@/lib/logger";
import type { BulkOperation } from "@/types/automation";
import type { FulfillmentOrder } from "@/types/fulfillment";

const statusConfig: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  pending: { color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20", icon: <Clock className="h-3 w-3" /> },
  running: { color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20", icon: <Zap className="h-3 w-3" /> },
  completed: { color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20", icon: <CheckCircle2 className="h-3 w-3" /> },
  partial: { color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20", icon: <AlertCircle className="h-3 w-3" /> },
  failed: { color: "text-red-400", bg: "bg-red-400/10 border-red-400/20", icon: <X className="h-3 w-3" /> },
};

const actionLabels: Record<string, string> = {
  fulfill: "Fulfill Orders",
  cancel: "Cancel Orders",
  sync_tracking: "Sync Tracking",
  check_status: "Check Status",
};

function BulkOperationCard({ operation }: { operation: BulkOperation }) {
  const st = statusConfig[operation.status] || statusConfig.pending;
  const progress = operation.totalOrders > 0
    ? Math.round((operation.processedOrders / operation.totalOrders) * 100)
    : 0;

  return (
    <div className="glass rounded-xl p-4 border border-white/5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${st.bg} ${st.color}`}>
              {st.icon} {operation.status}
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
            operation.status === "partial" ? "bg-amber-400" : "bg-accent"
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center">
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

      {operation.completedAt && (
        <p className="text-[10px] text-muted-foreground mt-2">
          Completed {new Date(operation.completedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}

export default function BulkOrdersPage() {
  const { user } = useAuth();
  const ordersUrl = user ? `/api/fulfillment?uid=${user.uid}` : null;
  const bulkUrl = user ? `/api/fulfillment/bulk?uid=${user.uid}` : null;

  const { data: ordersData, isLoading: ordersLoading } = useAPI<{ orders?: FulfillmentOrder[] }>(ordersUrl);
  const { data: bulkData, isLoading: bulkLoading, mutate: mutateBulk } = useAPI<{ operations?: BulkOperation[] }>(bulkUrl);

  const orders = ordersData?.orders ?? [];
  const operations = bulkData?.operations ?? [];

  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<string>("fulfill");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const inProgressOrders = orders.filter((o) => o.status === "in_progress");
  const availableOrders = [...pendingOrders, ...inProgressOrders];

  const filteredOrders = availableOrders.filter((o) => {
    const matchesSearch = !searchQuery ||
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const toggleSelect = (orderId: string) => {
    setSelectedOrders((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map((o) => o.id)));
    }
  };

  const handleBulkAction = async () => {
    if (!user || selectedOrders.size === 0) return;
    setProcessing(true);
    setError(null);
    try {
      await safeFetch("/api/fulfillment/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          orderIds: Array.from(selectedOrders),
          action: bulkAction,
        }),
      });
      setSelectedOrders(new Set());
      mutateBulk();
    } catch (err) {
      logger.error("Bulk action failed", { error: err instanceof Error ? err.message : String(err) });
      setError("Bulk action failed. Please try again.");
    }
    setProcessing(false);
  };

  if (ordersLoading || bulkLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-xs underline">Dismiss</button>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="font-display text-xl font-bold text-foreground flex items-center gap-3">
          <Package className="h-6 w-6 text-accent" />
          Bulk Orders
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Process multiple orders at once with bulk actions
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Pending", value: pendingOrders.length, gradient: "from-amber-500/15 to-amber-500/5", border: "border-amber-500/20", textColor: "text-amber-400" },
          { label: "In Progress", value: inProgressOrders.length, gradient: "from-blue-500/15 to-blue-500/5", border: "border-blue-500/20", textColor: "text-blue-400" },
          { label: "Selected", value: selectedOrders.size, gradient: "from-accent/15 to-accent/5", border: "border-accent/20", textColor: "text-accent" },
          { label: "Operations", value: operations.length, gradient: "from-purple-500/15 to-purple-500/5", border: "border-purple-500/20", textColor: "text-purple-400" },
        ].map((stat) => (
          <div key={stat.label} className={`bg-gradient-to-br ${stat.gradient} border ${stat.border} rounded-xl p-3 text-center`}>
            <p className={`text-xl font-bold ${stat.textColor}`}>{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Bulk Action Bar */}
      <div className="glass rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground hover:bg-surface/80 transition-colors"
            >
              {selectedOrders.size === filteredOrders.length ? "Deselect All" : "Select All"}
            </button>
            <span className="text-[10px] text-muted-foreground">
              {selectedOrders.size} selected
            </span>
          </div>

          <select
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value)}
            className="px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground focus:outline-none focus:border-accent"
          >
            <option value="fulfill">Fulfill Orders</option>
            <option value="cancel">Cancel Orders</option>
            <option value="sync_tracking">Sync Tracking</option>
            <option value="check_status">Check Status</option>
          </select>

          <button
            onClick={handleBulkAction}
            disabled={selectedOrders.size === 0 || processing}
            className="flex items-center gap-1.5 px-4 py-2 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent/90 transition-all disabled:opacity-50"
          >
            {processing ? <Loader2 className="h-3 w-3 animate-spin" /> : <PlayCircle className="h-3 w-3" />}
            Run Bulk Action
          </button>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search orders..."
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
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
          </select>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-foreground font-medium">No orders available for bulk actions</p>
            <p className="text-xs text-muted-foreground mt-1">Orders must be pending or in-progress to be included</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div
              key={order.id}
              onClick={() => toggleSelect(order.id)}
              className={`glass rounded-xl p-3 cursor-pointer transition-all border ${
                selectedOrders.has(order.id)
                  ? "border-accent/40 bg-accent/5"
                  : "border-white/5 hover:border-white/10"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
                  selectedOrders.has(order.id)
                    ? "bg-accent border-accent"
                    : "border-white/20"
                }`}>
                  {selectedOrders.has(order.id) && <CheckCircle2 className="h-3 w-3 text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{order.orderNumber}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      order.status === "pending" ? "bg-amber-400/10 text-amber-400" : "bg-blue-400/10 text-blue-400"
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {order.customerName} · {order.items.length} item{order.items.length !== 1 ? "s" : ""} · ${order.totalRevenue.toFixed(2)}
                  </p>
                </div>
                <p className="text-xs font-bold text-accent">${order.profit.toFixed(2)}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Recent Operations */}
      {operations.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-accent" /> Recent Operations
          </h3>
          {operations.map((op) => (
            <BulkOperationCard key={op.id} operation={op} />
          ))}
        </div>
      )}
    </div>
  );
}
