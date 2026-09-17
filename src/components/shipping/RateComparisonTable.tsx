"use client";

import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, CheckCircle2, AlertCircle, Clock, Zap } from "lucide-react";
import type { CarrierRateResponse } from "@/types/shipping";
import { CARRIER_MAP } from "@/types/shipping";

type SortKey = "cost" | "days" | "reliability" | "carrier";
type SortDir = "asc" | "desc";

interface RateComparisonTableProps {
  rates: CarrierRateResponse[];
  cheapest: CarrierRateResponse | null;
  fastest: CarrierRateResponse | null;
  onSelect?: (rate: CarrierRateResponse) => void;
  selectedId?: string;
}

const serviceLevelColors: Record<string, string> = {
  economy: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  standard: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  express: "text-purple-400 bg-purple-400/10 border-purple-400/20",
  priority: "text-amber-400 bg-amber-400/10 border-amber-400/20",
};

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <ArrowUpDown className="h-3 w-3 text-muted-foreground" />;
  return dir === "asc" ? <ArrowUp className="h-3 w-3 text-accent" /> : <ArrowDown className="h-3 w-3 text-accent" />;
}

export default function RateComparisonTable({ rates, cheapest, fastest, onSelect, selectedId }: RateComparisonTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("cost");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const sorted = useMemo(() => {
    const copy = [...rates];
    copy.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "cost": cmp = a.cost - b.cost; break;
        case "days": cmp = a.estimatedDays.min - b.estimatedDays.min; break;
        case "reliability": cmp = a.reliabilityScore - b.reliabilityScore; break;
        case "carrier": cmp = a.carrierName.localeCompare(b.carrierName); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rates, sortKey, sortDir]);

  const getRowId = (r: CarrierRateResponse) => `${r.carrierId}-${r.serviceLevel}`;

  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Table Header */}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5">
              {[
                { key: "carrier" as SortKey, label: "Carrier", width: "w-[280px]" },
                { key: "cost" as SortKey, label: "Cost", width: "w-[120px]" },
                { key: "days" as SortKey, label: "Delivery", width: "w-[140px]" },
                { key: "reliability" as SortKey, label: "Reliability", width: "w-[110px]" },
                { key: "features" as const, label: "Features", width: "w-[200px]" },
                { key: "badge" as const, label: "", width: "w-[80px]" },
              ].map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider ${col.width} ${
                    "key" in col && ["cost", "days", "reliability", "carrier"].includes(col.key) ? "cursor-pointer hover:text-foreground select-none" : ""
                  }`}
                  onClick={() => "key" in col && typeof col.key === "string" && ["cost", "days", "reliability", "carrier"].includes(col.key) ? handleSort(col.key as SortKey) : undefined}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {"key" in col && typeof col.key === "string" && ["cost", "days", "reliability", "carrier"].includes(col.key) && (
                      <SortIcon active={sortKey === col.key} dir={sortDir} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((rate) => {
              const id = getRowId(rate);
              const carrier = CARRIER_MAP[rate.carrierId];
              const isCheapest = cheapest?.carrierId === rate.carrierId && cheapest?.serviceLevel === rate.serviceLevel;
              const isFastest = fastest?.carrierId === rate.carrierId && fastest?.serviceLevel === rate.serviceLevel;
              const isSelected = selectedId === id;

              return (
                <tr
                  key={id}
                  className={`border-b border-white/5 transition-all hover:bg-surface/30 cursor-pointer ${
                    isSelected ? "bg-accent/5 ring-1 ring-accent/20" : ""
                  }`}
                  onClick={() => onSelect?.(rate)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-lg">{carrier?.icon || "📦"}</span>
                      <div>
                        <p className="text-xs font-semibold text-foreground">{rate.carrierName}</p>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-semibold border ${serviceLevelColors[rate.serviceLevel] || serviceLevelColors.standard}`}>
                          {rate.serviceLevel}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-bold text-foreground">${rate.cost.toFixed(2)}</p>
                    <p className="text-[9px] text-muted-foreground">{rate.currency}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold text-foreground">{rate.estimatedDays.min}-{rate.estimatedDays.max} days</p>
                    <p className="text-[9px] text-muted-foreground">
                      {rate.estimatedDays.min === rate.estimatedDays.max ? "Guaranteed" : `~${Math.round((rate.estimatedDays.min + rate.estimatedDays.max) / 2)} days avg`}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-1.5 rounded-full bg-surface overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            rate.reliabilityScore >= 90 ? "bg-emerald-400" : rate.reliabilityScore >= 80 ? "bg-blue-400" : "bg-amber-400"
                          }`}
                          style={{ width: `${rate.reliabilityScore}%` }}
                        />
                      </div>
                      <span className={`text-[10px] font-semibold ${
                        rate.reliabilityScore >= 90 ? "text-emerald-400" : rate.reliabilityScore >= 80 ? "text-blue-400" : "text-amber-400"
                      }`}>
                        {rate.reliabilityScore}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {rate.trackingIncluded && (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] text-emerald-400 bg-emerald-400/5">
                          <CheckCircle2 className="h-2 w-2" /> Track
                        </span>
                      )}
                      {rate.insuranceIncluded && (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] text-blue-400 bg-blue-400/5">
                          <CheckCircle2 className="h-2 w-2" /> Insure
                        </span>
                      )}
                      {rate.guaranteedDelivery && (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] text-purple-400 bg-purple-400/5">
                          <CheckCircle2 className="h-2 w-2" /> Guarantee
                        </span>
                      )}
                      {rate.customsHandled && (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] text-amber-400 bg-amber-400/5">
                          <CheckCircle2 className="h-2 w-2" /> Customs
                        </span>
                      )}
                      {!rate.trackingIncluded && (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] text-muted-foreground bg-surface">
                          <AlertCircle className="h-2 w-2" /> No Track
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {isCheapest && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-semibold bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                          <Zap className="h-2 w-2" /> Cheap
                        </span>
                      )}
                      {isFastest && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-semibold bg-blue-400/10 text-blue-400 border border-blue-400/20">
                          <Clock className="h-2 w-2" /> Fast
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
