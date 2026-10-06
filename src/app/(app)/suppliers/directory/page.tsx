"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BookMarked,
  ExternalLink,
  FolderSearch,
  RefreshCw,
  Search,
} from "lucide-react";
import { useAPI } from "@/hooks/useAPI";

export interface SupplierDirectoryEntry {
  id: string;
  supplierId: string;
  name: string;
  platformId: string;
  storeUrl: string | null;
  dataSource: "live" | "estimated";
  specializations: string[];
  listingCount: number;
  priceRange: { min: number; max: number; currency?: string | null } | null;
  source: "discovery" | "manual-selection" | "auto-link";
  firstSeenAt: string;
  lastSeenAt: string;
}

type SourceFilter = "all" | "discovery" | "chosen" | "auto-link";
type SortKey = "lastSeenAt" | "listingCount" | "name";

const sourceConfig: Record<
  SupplierDirectoryEntry["source"],
  { label: string; className: string }
> = {
  discovery: {
    label: "Discovered",
    className: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  },
  "manual-selection": {
    label: "Chosen",
    className: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  },
  "auto-link": {
    label: "Auto-linked",
    className: "bg-violet-400/10 text-violet-400 border-violet-400/20",
  },
};

const dataSourceConfig: Record<string, { label: string; className: string }> = {
  live: { label: "live", className: "bg-emerald-500/15 text-emerald-400" },
  estimated: { label: "estimated · unverified", className: "bg-amber-500/15 text-amber-400" },
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  CNY: "¥",
  JPY: "¥",
};

function formatMoney(value: number, currency?: string | null): string {
  const code = currency ? currency.toUpperCase() : null;
  const symbol = code ? (CURRENCY_SYMBOLS[code] ?? `${code} `) : "";
  return `${symbol}${value.toFixed(2)}`;
}

function formatPriceRange(range: SupplierDirectoryEntry["priceRange"]): string | null {
  if (!range || !(range.min > 0) || !(range.max > 0)) return null;
  if (range.min === range.max) return formatMoney(range.min, range.currency);
  return `${formatMoney(range.min, range.currency)} – ${formatMoney(range.max, range.currency)}`;
}

function relativeTime(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  const diff = Date.now() - ms;
  if (diff < 0) return "just now";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ms).toLocaleDateString();
}

function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="glass rounded-xl p-4">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-xl font-bold text-foreground mt-1">{value}</p>
      {hint ? <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p> : null}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="h-11 rounded-lg bg-white/5 animate-pulse" data-testid="skeleton-row" />
  );
}

export default function SupplierDirectoryPage() {
  const { data, error, isLoading, mutate } = useAPI<{ directory?: SupplierDirectoryEntry[] }>(
    "/api/fulfillment/suppliers?view=directory"
  );
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<SourceFilter>("all");
  const [sortBy, setSortBy] = useState<SortKey>("lastSeenAt");

  const entries = useMemo(() => data?.directory ?? [], [data]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = entries.filter((entry) => {
      const matchesQuery =
        q.length === 0 ||
        entry.name.toLowerCase().includes(q) ||
        entry.platformId.toLowerCase().includes(q) ||
        entry.specializations.some((s) => s.toLowerCase().includes(q));
      const matchesSource =
        source === "all" ||
        (source === "chosen"
          ? entry.source === "manual-selection" || entry.source === "auto-link"
          : entry.source === source);
      return matchesQuery && matchesSource;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "listingCount") return (b.listingCount ?? 0) - (a.listingCount ?? 0);
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return String(b.lastSeenAt ?? "").localeCompare(String(a.lastSeenAt ?? ""));
    });
  }, [entries, query, source, sortBy]);

  const stats = useMemo(() => {
    const platforms = new Set(entries.map((e) => e.platformId)).size;
    const discovered = entries.filter((e) => e.source === "discovery").length;
    const chosen = entries.length - discovered;
    return { total: entries.length, platforms, discovered, chosen };
  }, [entries]);

  const sourceChips: Array<{ id: SourceFilter; label: string }> = [
    { id: "all", label: "All" },
    { id: "discovery", label: "Discovered" },
    { id: "chosen", label: "Chosen" },
    { id: "auto-link", label: "Auto-linked" },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-5 md:space-y-6 pb-16 md:pb-24">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Link
            href="/suppliers"
            className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3 w-3" /> Back to suppliers
          </Link>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
            <BookMarked className="h-7 w-7 text-accent" /> Supplier Directory
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Every supplier you have discovered or chosen, kept as one row per supplier and merged
            across sessions so performance can accumulate against a stable id.
          </p>
        </div>
        <button
          onClick={() => mutate()}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:border-accent/40 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Suppliers" value={String(stats.total)} />
        <StatCard label="Platforms" value={String(stats.platforms)} />
        <StatCard label="Discovered" value={String(stats.discovered)} hint="from supplier search" />
        <StatCard label="Chosen" value={String(stats.chosen)} hint="manual or auto-linked" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by supplier, platform or specialization"
            aria-label="Search the supplier directory"
            className="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50"
          />
        </div>

        <div className="flex gap-1 p-1 rounded-xl bg-surface border border-border">
          {sourceChips.map((chip) => (
            <button
              key={chip.id}
              onClick={() => setSource(chip.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                source === chip.id
                  ? "bg-accent text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Sort
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            aria-label="Sort directory entries"
            className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-accent/50"
          >
            <option value="lastSeenAt">Last seen</option>
            <option value="listingCount">Listings</option>
            <option value="name">Name (A–Z)</option>
          </select>
        </label>
      </div>

      {error ? (
        <div className="glass rounded-xl p-6 text-center space-y-2">
          <p className="text-sm font-medium text-foreground">Could not load your directory</p>
          <p className="text-xs text-muted-foreground">{error}</p>
          <button
            onClick={() => mutate()}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white"
          >
            Try again
          </button>
        </div>
      ) : isLoading && entries.length === 0 ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading directory">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      ) : entries.length === 0 ? (
        <div className="glass rounded-xl p-10 text-center space-y-3">
          <FolderSearch className="h-10 w-10 text-muted-foreground mx-auto" />
          <div>
            <p className="text-sm font-semibold text-foreground">Your directory is empty</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
              Suppliers land here the moment a search discovers them or you assign one to a
              product. Nothing is invented — an empty row of data beats a made-up one.
            </p>
          </div>
          <Link
            href="/suppliers?tab=discover"
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-xs font-medium text-white"
          >
            <Search className="h-3.5 w-3.5" /> Find suppliers
          </Link>
        </div>
      ) : visible.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No directory entries match “{query}”.
          </p>
        </div>
      ) : (
        <div className="glass rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-4 py-3 font-medium">Supplier</th>
                <th className="px-4 py-3 font-medium">Platform</th>
                <th className="px-4 py-3 font-medium">How it got here</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium text-right">Listings</th>
                <th className="px-4 py-3 font-medium text-right">Price range</th>
                <th className="px-4 py-3 font-medium text-right">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((entry) => {
                const sourceStyle = sourceConfig[entry.source] ?? sourceConfig.discovery;
                const dataStyle = dataSourceConfig[entry.dataSource] ?? dataSourceConfig.estimated;
                const priceRange = formatPriceRange(entry.priceRange);
                const lastSeen = relativeTime(entry.lastSeenAt);
                return (
                  <tr
                    key={entry.id || entry.supplierId}
                    className="border-b border-border/50 last:border-0 hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{entry.name}</span>
                        {entry.storeUrl ? (
                          <a
                            href={entry.storeUrl}
                            target="_blank"
                            rel="noreferrer"
                            title="Open supplier store"
                            className="text-muted-foreground hover:text-accent transition-colors"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        ) : null}
                      </div>
                      {entry.specializations.length > 0 ? (
                        <p className="text-[11px] text-muted-foreground truncate max-w-[240px]">
                          {entry.specializations.slice(0, 4).join(" · ")}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {entry.platformId}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${sourceStyle.className}`}
                        title={
                          entry.source === "discovery"
                            ? "Surfaced by a supplier search"
                            : "Assigned to one of your products"
                        }
                      >
                        {sourceStyle.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${dataStyle.className}`}>
                        {dataStyle.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground">
                      {entry.listingCount > 0 ? (
                        entry.listingCount.toLocaleString()
                      ) : (
                        <span title="Not tracked for this entry">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-foreground">
                      {priceRange ?? <span title="No price observed yet">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs">
                      {lastSeen ?? "—"}
                      <span className="block text-[10px] opacity-70">
                        first seen {relativeTime(entry.firstSeenAt) ?? "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        A dash means the value was never measured — the directory never fills gaps with zeroes.
      </p>
    </div>
  );
}
