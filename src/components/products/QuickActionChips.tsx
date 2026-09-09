"use client";

import { Sparkles, Search, Check, FileText, BarChart3, TrendingUp, Truck } from "lucide-react";

interface QuickAction {
  id: string;
  label: string;
  icon: typeof Sparkles;
  color: string;
  bg: string;
  prompt: string;
}

interface QuickActionChipsProps {
  query: string;
  onAction: (prompt: string) => void;
  disabled?: boolean;
}

const ACTIONS: QuickAction[] = [
  {
    id: "validate",
    label: "Validate Products",
    icon: Check,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10 border-emerald-400/20",
    prompt: "Validate the search results for \"{query}\" - check quality, market demand, competition level, and give each product a Golden Score",
  },
  {
    id: "find-suppliers",
    label: "Find Suppliers",
    icon: Truck,
    color: "text-blue-400",
    bg: "bg-blue-400/10 border-blue-400/20",
    prompt: "Find the best suppliers for \"{query}\" products - compare pricing, shipping times, reliability, and MOQ across CJ, AliExpress, and other sources",
  },
  {
    id: "generate-listing",
    label: "Generate Listings",
    icon: FileText,
    color: "text-violet-400",
    bg: "bg-violet-400/10 border-violet-400/20",
    prompt: "Generate optimized product listings for the top \"{query}\" results - include title, description, bullet points, and SEO tags",
  },
  {
    id: "analyze-market",
    label: "Market Analysis",
    icon: BarChart3,
    color: "text-amber-400",
    bg: "bg-amber-400/10 border-amber-400/20",
    prompt: "Analyze the market for \"{query}\" - search volume trends, competition landscape, price range analysis, and saturation level",
  },
  {
    id: "find-similar",
    label: "Find Similar",
    icon: Search,
    color: "text-cyan-400",
    bg: "bg-cyan-400/10 border-cyan-400/20",
    prompt: "Find similar products to \"{query}\" across all platforms - look for alternatives, variations, and related items",
  },
  {
    id: "profit-calc",
    label: "Calculate Profit",
    icon: TrendingUp,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10 border-emerald-400/20",
    prompt: "Calculate profit margins for \"{query}\" products - estimate selling price, shipping cost, platform fees, and net profit for each",
  },
];

export default function QuickActionChips({ query, onAction, disabled }: QuickActionChipsProps) {
  if (!query) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground font-medium">Quick AI Actions</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ACTIONS.map((action) => (
          <button
            key={action.id}
            onClick={() => onAction(action.prompt.replace(/\{query\}/g, query))}
            disabled={disabled}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${action.bg} ${action.color}`}
          >
            <action.icon className="h-3 w-3" />
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
