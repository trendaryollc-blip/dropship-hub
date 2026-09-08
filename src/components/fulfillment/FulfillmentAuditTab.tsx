"use client";

import { useState } from "react";
import { Search, Loader2, FileText } from "lucide-react";
import type { AuditLogEntry } from "@/types/automation";

export default function AuditTab({ auditLog, loading }: { auditLog: AuditLogEntry[]; loading: boolean }) {
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = auditLog.filter((entry) => {
    const matchesFilter = filter === "all" || entry.action === filter;
    const matchesSearch = !searchQuery ||
      entry.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.details.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const actionTypes = [...new Set(auditLog.map((e) => e.action))];

  const actionColors: Record<string, { color: string; bg: string }> = {
    order_detected: { color: "text-blue-400", bg: "bg-blue-400/10" },
    order_routed: { color: "text-purple-400", bg: "bg-purple-400/10" },
    order_approved: { color: "text-emerald-400", bg: "bg-emerald-400/10" },
    order_placed: { color: "text-emerald-400", bg: "bg-emerald-400/10" },
    order_failed: { color: "text-red-400", bg: "bg-red-400/10" },
    order_cancelled: { color: "text-red-400", bg: "bg-red-400/10" },
    tracking_synced: { color: "text-purple-400", bg: "bg-purple-400/10" },
    tracking_detected: { color: "text-blue-400", bg: "bg-blue-400/10" },
    fallback_triggered: { color: "text-amber-400", bg: "bg-amber-400/10" },
    profit_rejected: { color: "text-red-400", bg: "bg-red-400/10" },
    inventory_unavailable: { color: "text-amber-400", bg: "bg-amber-400/10" },
    sla_breach: { color: "text-red-400", bg: "bg-red-400/10" },
    bulk_started: { color: "text-blue-400", bg: "bg-blue-400/10" },
    bulk_completed: { color: "text-emerald-400", bg: "bg-emerald-400/10" },
    bulk_partial: { color: "text-amber-400", bg: "bg-amber-400/10" },
    rules_updated: { color: "text-cyan-400", bg: "bg-cyan-400/10" },
    settings_updated: { color: "text-cyan-400", bg: "bg-cyan-400/10" },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search audit log..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground focus:outline-none focus:border-accent"
        >
          <option value="all">All Actions</option>
          {actionTypes.map((a) => (
            <option key={a} value={a}>{a.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 text-accent animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No audit entries found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => {
            const ac = actionColors[entry.action] || { color: "text-gray-400", bg: "bg-gray-400/10" };
            return (
              <div key={entry.id} className="glass rounded-lg p-3 flex items-start gap-3">
                <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-1.5 ${ac.bg} ${ac.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${ac.bg} ${ac.color}`}>
                      {entry.action.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">#{entry.orderId}</span>
                  </div>
                  <p className="text-xs text-foreground">{entry.details}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(entry.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
