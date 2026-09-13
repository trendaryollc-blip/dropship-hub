"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  Package, Loader2, Search, Plus,
} from "lucide-react";
import { safeFetch } from "@/lib/safe-fetch";
import type { FulfillmentOrder, ReturnRequest, ReturnStatus } from "@/types/fulfillment";
import { RETURN_STATUS_CONFIG } from "@/types/fulfillment";
import ReturnRequestCard from "./ReturnRequestCard";
import CreateReturnModal from "./CreateReturnModal";

interface ReturnsTabProps {
  orders: FulfillmentOrder[];
}

export default function ReturnsTab({ orders }: ReturnsTabProps) {
  const { user } = useAuth();
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReturnStatus | "all">("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchReturns = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ uid: user.uid });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);

      const data = await safeFetch<{ returns?: ReturnRequest[]; counts?: Record<string, number> }>(
        `/api/fulfillment/returns?${params.toString()}`
      );
      if (data?.returns) setReturns(data.returns);
      if (data?.counts) setCounts(data.counts);
    } catch {
      setReturns([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReturns();
  }, [user, statusFilter, search]);

  const handleUpdate = async (returnId: string, updateData: { status?: ReturnStatus; note?: string; rmaNumber?: string; returnTrackingNumber?: string }) => {
    if (!user) return;
    setActionLoading(returnId);
    try {
      await safeFetch(`/api/fulfillment/returns/${returnId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, ...updateData }),
      });
      await fetchReturns();
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefund = async (returnId: string, data: { refundMethod: string; refundAmount: number; note?: string }) => {
    if (!user) return;
    setActionLoading(returnId);
    try {
      await safeFetch(`/api/fulfillment/returns/${returnId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, ...data }),
      });
      await fetchReturns();
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateReturn = async (data: { orderId: string; reason: string; reasonDescription: string; items: Array<{ productId: string; quantity: number; condition?: string }> }) => {
    if (!user) return;
    setActionLoading("create");
    try {
      await safeFetch("/api/fulfillment/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, ...data }),
      });
      setShowCreateModal(false);
      await fetchReturns();
    } finally {
      setActionLoading(null);
    }
  };

  const filteredReturns = returns.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        r.orderId.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalReturns = Object.values(counts).reduce((a, b) => a + b, 0);
  const openReturns = (counts.requested || 0) + (counts.approved || 0) + (counts.return_in_transit || 0) + (counts.return_received || 0) + (counts.refund_processing || 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-sm font-semibold text-foreground">Returns & Refunds</h3>
          <p className="text-[10px] text-muted-foreground">
            {totalReturns} total · {openReturns} open
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={orders.filter((o) => o.status === "delivered").length === 0}
          className="flex items-center gap-1.5 px-3 py-2 bg-accent text-white rounded-lg text-xs font-medium hover:bg-accent/90 transition-all disabled:opacity-50"
        >
          <Plus className="h-3 w-3" /> New Return
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search returns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {(["all", "requested", "approved", "return_in_transit", "refunded", "denied"] as const).map((status) => {
            const count = status === "all" ? totalReturns : (counts[status] || 0);
            const config = status !== "all" ? RETURN_STATUS_CONFIG[status] : null;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap ${
                  statusFilter === status
                    ? "bg-accent text-white"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface"
                }`}
              >
                {config?.icon && <span>{config.icon}</span>}
                {status === "all" ? "All" : config?.label || status}
                <span className={`px-1 py-0.5 rounded text-[9px] ${statusFilter === status ? "bg-white/20" : "bg-surface"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Returns List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 text-accent animate-spin" />
        </div>
      ) : filteredReturns.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No returns found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReturns.map((rr) => (
            <div key={rr.id} className={actionLoading === rr.id ? "opacity-50 pointer-events-none" : ""}>
              <ReturnRequestCard
                returnRequest={rr}
                onUpdate={handleUpdate}
                onRefund={handleRefund}
              />
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateReturnModal
          orders={orders}
          onSubmit={handleCreateReturn}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
