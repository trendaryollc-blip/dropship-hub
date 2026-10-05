"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { safeFetch } from "@/lib/safe-fetch";
import { useAPI } from "@/hooks/useAPI";
import type { NormalizedSupplierOffer } from "@/types/supplier-offers";

interface SupplierOffersTableProps {
  productId: string;
  offers: NormalizedSupplierOffer[];
  autoLink: { offer: NormalizedSupplierOffer; confidence: number } | null;
  onSelect?: (offer: NormalizedSupplierOffer) => void;
}

/**
 * Reliability-first ordering: offers backed by live supplier data come first,
 * then by match confidence and rating. Scraped/estimated offers are kept but
 * clearly labelled so a user never mistakes "unknown" for "verified".
 */
function rankOffers(offers: NormalizedSupplierOffer[]): NormalizedSupplierOffer[] {
  return [...offers].sort((a, b) => {
    if (a.dataSource !== b.dataSource) return a.dataSource === "live" ? -1 : 1;
    if ((b.confidence ?? 0) !== (a.confidence ?? 0)) return (b.confidence ?? 0) - (a.confidence ?? 0);
    return (b.rating ?? 0) - (a.rating ?? 0);
  });
}

function fmtMoney(value: number | null): string {
  return typeof value === "number" ? `$${value.toFixed(2)}` : "—";
}

export function SupplierOffersTable({ productId, offers, autoLink, onSelect }: SupplierOffersTableProps) {
  const { user } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [dismissedAuto, setDismissedAuto] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Restore the supplier already saved for this product so the workflow shows
  // "Selected" instead of asking the user to pick again after a reload.
  const { data: assignment } = useAPI<{ assignment?: { selectedSupplierId?: string; supplierId?: string } }>(
    user && productId ? `/api/fulfillment/suppliers?productId=${encodeURIComponent(productId)}` : null
  );
  useEffect(() => {
    const restored = assignment?.assignment?.selectedSupplierId || assignment?.assignment?.supplierId;
    if (restored) setSelectedId(restored);
  }, [assignment]);

  const rankedOffers = useMemo(() => rankOffers(offers), [offers]);

  if (offers.length === 0) return null;

  const postAssignment = async (offer: NormalizedSupplierOffer, source: string) => {
    if (!user) return;
    setBusy(offer.supplierId);
    try {
      const token = await user.getIdToken();
      await safeFetch("/api/fulfillment/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          productId,
          supplierId: offer.supplierId,
          supplierName: offer.supplierName,
          unitCost: offer.unitCost ?? 0,
          shippingCost: offer.shippingCost ?? 0,
          source,
          confidence: offer.confidence,
          needsAttention: false,
        }),
      });
      setSelectedId(offer.supplierId);
      onSelect?.(offer);
    } catch (e) {
      console.warn("[SupplierOffersTable] Error:", e instanceof Error ? e.message : e);
    }
    setBusy(null);
  };

  const rejectAuto = async () => {
    if (!user || !autoLink) return;
    setBusy("reject");
    try {
      const token = await user.getIdToken();
      await safeFetch("/api/fulfillment/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          productId,
          supplierId: autoLink.offer.supplierId,
          supplierName: autoLink.offer.supplierName,
          unitCost: autoLink.offer.unitCost ?? 0,
          shippingCost: autoLink.offer.shippingCost ?? 0,
          source: "auto_rejected",
          confidence: autoLink.confidence,
          needsAttention: false,
        }),
      });
      setDismissedAuto(true);
    } catch (e) {
      console.warn("[SupplierOffersTable] Error:", e instanceof Error ? e.message : e);
    }
    setBusy(null);
  };

  return (
    <div className="space-y-3">
      {autoLink && !dismissedAuto && (
        <div className="flex items-center gap-3 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-xs">
          <p className="flex-1 text-foreground">
            Auto-matched <span className="font-medium">{autoLink.offer.supplierName}</span>
            <span className="text-muted-foreground"> @ {autoLink.confidence.toFixed(2)} (Estimated)</span>
          </p>
          <button
            onClick={() => postAssignment(autoLink.offer, "auto_accepted")}
            disabled={busy !== null}
            className="flex items-center gap-1 rounded-md bg-accent px-2 py-1 font-medium text-white disabled:opacity-50"
          >
            {busy === autoLink.offer.supplierId ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            Accept
          </button>
          <button
            onClick={rejectAuto}
            disabled={busy !== null}
            className="flex items-center gap-1 rounded-md border border-white/15 px-2 py-1 text-muted-foreground disabled:opacity-50"
          >
            <X className="h-3 w-3" /> Reject
          </button>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        Sorted with <span className="text-emerald-400">live-data</span> suppliers first. Rows marked{" "}
        <span className="text-amber-400">estimated · unverified</span> come from scraped listings and have no measured
        reliability — verify before ordering.
      </p>

      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-white/5 text-left text-muted-foreground">
              <th className="px-3 py-2 font-medium">Supplier</th>
              <th className="px-3 py-2 font-medium">Cost</th>
              <th className="px-3 py-2 font-medium">Rating</th>
              <th className="px-3 py-2 font-medium">Source</th>
              <th className="px-3 py-2 font-medium">Match</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rankedOffers.slice(0, 10).map((o) => (
              <tr key={o.supplierId + o.url} className="border-t border-white/5">
                <td className="px-3 py-2">
                  <a href={o.url} target="_blank" rel="noreferrer" className="font-medium text-foreground hover:text-accent">
                    {o.supplierName}
                  </a>
                  <p className="max-w-56 truncate text-muted-foreground">{o.title}</p>
                </td>
                <td className="px-3 py-2">{fmtMoney(o.unitCost)}</td>
                <td className="px-3 py-2">{o.rating != null ? `${o.rating} (${o.reviews ?? 0})` : "—"}</td>
                <td className="px-3 py-2">
                  <span className={`rounded px-1.5 py-0.5 ${o.dataSource === "live" ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
                    {o.dataSource === "live" ? "live" : "estimated · unverified"}
                  </span>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {o.confidence > 0 ? `${o.confidence.toFixed(2)} (Estimated)` : "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  {selectedId === o.supplierId ? (
                    <span className="font-medium text-emerald-400">Selected</span>
                  ) : (
                    <button
                      onClick={() => postAssignment(o, "manual")}
                      disabled={busy !== null}
                      className="rounded-md border border-white/15 px-2 py-1 hover:border-accent hover:text-accent disabled:opacity-50"
                    >
                      {busy === o.supplierId ? <Loader2 className="h-3 w-3 animate-spin" /> : "Select"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
