"use client";

import { useEffect, useState } from "react";
import {
  Package, Truck, Store, ShoppingCart, ArrowRight, RefreshCw,
  AlertTriangle, CheckCircle2, Activity, Boxes,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { safeFetch } from "@/lib/safe-fetch";

interface SourcingMetrics {
  pipeline: {
    catalogProducts: number | null;
    supplierAssignments: number | null;
    listingsPushed: number | null;
    ordersReceived: number | null;
  };
  orderRouting: { routed: number; unassigned: number; sampled: number } | null;
  topSuppliers: { name: string; assignments: number; listings: number }[];
  recentAssignments: { productId: string; supplierName: string; source: string; aliased: boolean; updatedAt: string | null }[];
  recentPushes: { productTitle: string; storeName: string; supplierName: string | null; platformProductId: string | null; pushedAt: string | null }[];
  estimates: { pipeline: boolean; orderRouting: boolean; breakdowns: boolean };
  generatedAt: string;
}

function fmtCount(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString();
}

function fmtDate(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

export default function AdminSourcingPage() {
  const { user } = useAuth();
  const [data, setData] = useState<SourcingMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const token = await user.getIdToken();
        const result = await safeFetch<SourcingMetrics>("/api/admin/sourcing", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        if (!result || typeof result !== "object" || !result.pipeline) {
          setFetchError(true);
          setData(null);
          return;
        }
        setData(result);
        setFetchError(false);
      } catch {
        if (!cancelled) setFetchError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user, reloadKey]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading sourcing operations...</p>
        </div>
      </div>
    );
  }

  const p = data?.pipeline;
  const funnel = [
    { label: "Products cataloged", value: p?.catalogProducts ?? null, icon: Package, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
    { label: "Suppliers selected", value: p?.supplierAssignments ?? null, icon: Truck, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
    { label: "Listed on store", value: p?.listingsPushed ?? null, icon: Store, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
    { label: "Orders received", value: p?.ordersReceived ?? null, icon: ShoppingCart, color: "text-pink-400", bg: "bg-pink-400/10", border: "border-pink-400/20" },
  ];

  const routing = data?.orderRouting;
  const routedPct = routing && routing.sampled > 0 ? Math.round((routing.routed / routing.sampled) * 100) : null;

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">Sourcing Operations</h1>
          <p className="text-sm text-muted-foreground">
            The product → supplier → store → order pipeline across all users.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setReloadKey((k) => k + 1)}
          disabled={loading}
          aria-label="Refresh sourcing metrics"
          className="self-start p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {fetchError && (
        <div role="status" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-400/10 border border-red-400/20 text-red-400 text-xs">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">Couldn&apos;t load sourcing metrics — values are unavailable.</span>
          <button onClick={() => setReloadKey((k) => k + 1)} className="font-semibold underline underline-offset-2 hover:text-red-300 shrink-0">Retry</button>
        </div>
      )}

      {data?.estimates.pipeline && (
        <p className="text-[11px] text-amber-400/90">
          Some pipeline counts are unavailable (missing index or aggregation support) — shown as —.
        </p>
      )}

      {/* Pipeline funnel */}
      <div className="glass rounded-2xl border border-border p-6">
        <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-accent" /> Workflow pipeline
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-7 gap-3 items-center">
          {funnel.map((step, i) => (
            <div key={step.label} className="contents">
              <div className="glass rounded-xl p-4 border border-border">
                <div className={`inline-flex p-2 rounded-lg ${step.bg} border ${step.border} mb-3`}>
                  <step.icon className={`h-4 w-4 ${step.color}`} />
                </div>
                <p className="text-2xl font-bold text-foreground">{fmtCount(step.value)}</p>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{step.label}</p>
              </div>
              {i < funnel.length - 1 && (
                <div className="hidden lg:flex justify-center text-muted-foreground/40">
                  <ArrowRight className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Order routing health */}
      <div className="glass rounded-2xl border border-border p-6">
        <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Boxes className="h-4 w-4 text-emerald-400" /> Order → supplier routing
        </h3>
        {!routing || routing.sampled === 0 ? (
          <p className="text-xs text-muted-foreground">
            No orders sampled yet. Routing health appears once store orders arrive.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {routing.routed} of {routing.sampled} sampled orders routed to a chosen supplier
                {data?.estimates.orderRouting ? " (partial sample)" : ""}
              </span>
              <span className={routedPct != null && routedPct >= 80 ? "text-emerald-400" : "text-amber-400"}>
                {routedPct ?? 0}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-surface overflow-hidden">
              <div
                className={`h-full rounded-full ${routedPct != null && routedPct >= 80 ? "bg-emerald-400" : "bg-amber-400"}`}
                style={{ width: `${routedPct ?? 0}%` }}
              />
            </div>
            {routing.unassigned > 0 && (
              <p className="text-[11px] text-amber-400/90 flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3" /> {routing.unassigned} order(s) have no supplier assigned — these will need manual sourcing.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Top suppliers */}
      <div className="glass rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-display text-sm font-semibold text-foreground">Top suppliers</h3>
        </div>
        {data && data.topSuppliers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground bg-surface/40">
                  <th className="px-6 py-2 font-medium">Supplier</th>
                  <th className="px-6 py-2 font-medium text-right">Assignments</th>
                  <th className="px-6 py-2 font-medium text-right">Listings</th>
                  <th className="px-6 py-2 font-medium text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.topSuppliers.map((s) => (
                  <tr key={s.name} className="border-t border-border/50">
                    <td className="px-6 py-2.5 text-foreground">{s.name}</td>
                    <td className="px-6 py-2.5 text-right text-muted-foreground">{s.assignments}</td>
                    <td className="px-6 py-2.5 text-right text-muted-foreground">{s.listings}</td>
                    <td className="px-6 py-2.5 text-right font-medium text-foreground">{s.assignments + s.listings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-6 py-6 text-xs text-muted-foreground">No supplier assignments yet.</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent listings */}
        <div className="glass rounded-2xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="font-display text-sm font-semibold text-foreground">Recent store listings</h3>
          </div>
          {data && data.recentPushes.length > 0 ? (
            <ul className="divide-y divide-border/50">
              {data.recentPushes.map((row, i) => (
                <li key={`${row.platformProductId}-${i}`} className="px-6 py-3">
                  <p className="text-xs text-foreground truncate">{row.productTitle}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {row.storeName} · {row.supplierName || "supplier unknown"} · {fmtDate(row.pushedAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-6 py-6 text-xs text-muted-foreground">No listings pushed yet.</p>
          )}
        </div>

        {/* Recent assignments */}
        <div className="glass rounded-2xl border border-border overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="font-display text-sm font-semibold text-foreground">Recent supplier selections</h3>
          </div>
          {data && data.recentAssignments.length > 0 ? (
            <ul className="divide-y divide-border/50">
              {data.recentAssignments.map((row, i) => (
                <li key={`${row.productId}-${i}`} className="px-6 py-3 flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-foreground truncate">{row.supplierName}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {row.productId} · {row.source}
                      {row.aliased ? " · store alias" : ""}
                    </p>
                  </div>
                  {!row.aliased && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />}
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-6 py-6 text-xs text-muted-foreground">No supplier selections yet.</p>
          )}
        </div>
      </div>

      {data && (
        <p className="text-[10px] text-muted-foreground/60">
          Generated {fmtDate(data.generatedAt)} · counts from Firestore, breakdowns from up to 1,000 sampled documents.
        </p>
      )}
    </div>
  );
}
