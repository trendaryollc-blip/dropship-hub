"use client";

import { useEffect, useState } from "react";
import { DollarSign, Check, X, Clock } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import { useAPI } from "@/hooks/useAPI";

interface RepriceAuditEntry {
  id: string;
  productId: string;
  productTitle: string;
  oldSellPrice: number;
  newSellPrice: number;
  supplierPrice: number;
  ruleType: string;
  ruleValue: number;
  storeUpdated: boolean;
  storePlatform?: string;
  error?: string;
  createdAt: string;
}

export default function RepriceAuditLog() {
  const { data, isLoading } = useAPI<{ auditLog: RepriceAuditEntry[] }>("/api/monitoring?type=audit");
  const [auditLog, setAuditLog] = useState<RepriceAuditEntry[]>([]);

  useEffect(() => {
    if (data?.auditLog) setAuditLog(data.auditLog);
  }, [data]);

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <p className="text-xs text-muted-foreground mt-2">Loading audit log...</p>
      </div>
    );
  }

  if (auditLog.length === 0) {
    return (
      <EmptyState
        icon={DollarSign}
        title="No repricing history"
        description="Repricing audit entries will appear here once automatic repricing rules are triggered."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Product</th>
                <th className="text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Old Price</th>
                <th className="text-right text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">New Price</th>
                <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Rule</th>
                <th className="text-center text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Store</th>
                <th className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {auditLog.map((entry) => (
                <tr key={entry.id} className="border-b border-border/30 hover:bg-surface-hover transition-colors">
                  <td className="px-4 py-3 text-sm text-foreground truncate max-w-[200px]">{entry.productTitle}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground text-right">${entry.oldSellPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-foreground text-right font-medium">${entry.newSellPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-[11px] text-muted-foreground">
                    {entry.ruleType === "maintain_margin" ? `${entry.ruleValue}% margin` :
                     entry.ruleType === "undercut" ? `${entry.ruleValue}% undercut` :
                     `$${entry.ruleValue} fixed`}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {entry.error ? (
                      <X className="h-3.5 w-3.5 text-red-400 mx-auto" />
                    ) : entry.storeUpdated ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400 mx-auto" />
                    ) : (
                      <span className="text-[10px] text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(entry.createdAt).toLocaleString()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
