"use client";

import { useState } from "react";
import { HeartPulse, Wand2, CalendarDays, Tag, Radar, Compass } from "lucide-react";
import SupplierHealthPanel from "@/components/suppliers/SupplierHealthPanel";
import SmartMatchWizard from "@/components/suppliers/SmartMatchWizard";
import SeasonalCalendar from "@/components/suppliers/SeasonalCalendar";
import PriceComparisonTable from "@/components/suppliers/PriceComparisonTable";
import RadarComparisonChart from "@/components/suppliers/RadarComparisonChart";
import NicheDiscoveryPanel from "@/components/suppliers/NicheDiscoveryPanel";

type ToolId = "health" | "match" | "seasonal" | "price" | "radar" | "niches";

const TOOLS: { id: ToolId; label: string; icon: typeof HeartPulse }[] = [
  { id: "health", label: "Health", icon: HeartPulse },
  { id: "match", label: "Smart Match", icon: Wand2 },
  { id: "seasonal", label: "Seasonal", icon: CalendarDays },
  { id: "price", label: "Price Intel", icon: Tag },
  { id: "radar", label: "Radar", icon: Radar },
  { id: "niches", label: "Niches", icon: Compass },
];

export default function ToolsTab() {
  const [tool, setTool] = useState<ToolId>("health");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 p-1 rounded-2xl bg-surface border border-border">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          const active = tool === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                active
                  ? "bg-accent text-white shadow-lg shadow-accent/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {tool === "health" && <SupplierHealthPanel />}
      {tool === "match" && <SmartMatchWizard />}
      {tool === "seasonal" && <SeasonalCalendar />}
      {tool === "price" && <PriceComparisonTable />}
      {tool === "radar" && <RadarComparisonChart />}
      {tool === "niches" && <NicheDiscoveryPanel />}
    </div>
  );
}
