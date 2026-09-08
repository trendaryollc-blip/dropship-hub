"use client";

import { Sparkles, BarChart3, Package, MessageSquare, TrendingUp, FileText, Shield } from "lucide-react";
import type { SupplierProfile } from "@/types/supplier";

interface QuickAction {
  id: string;
  label: string;
  icon: typeof Sparkles;
  color: string;
  bg: string;
  getPrompt: (suppliers: SupplierProfile[], query: string) => string;
}

interface SupplierQuickActionsProps {
  query: string;
  supplierCount: number;
  suppliers: SupplierProfile[];
  onAction: (actionId: string, label: string, prompt: string) => void;
  activeActionId?: string | null;
  disabled?: boolean;
}

const ACTIONS: QuickAction[] = [
  {
    id: "analyze",
    label: "Analyze Suppliers",
    icon: BarChart3,
    color: "text-blue-400",
    bg: "bg-blue-400/10 border-blue-400/20",
    getPrompt: (suppliers, query) => {
      const names = suppliers.slice(0, 5).map((s) => `${s.name} (${s.trustBadge} badge, ${s.stats.reliabilityScore}% reliability, ${s.stats.rating} rating, ${s.stats.shippingDays}d shipping)`).join(", ");
      return `Analyze these suppliers in detail: ${names}. Compare their reliability, pricing, shipping speeds, quality scores, and give me a ranked recommendation of which suppliers to use for my dropshipping store. Include pros and cons for each.`;
    },
  },
  {
    id: "find-products",
    label: "Find Their Products",
    icon: Package,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10 border-emerald-400/20",
    getPrompt: (suppliers, query) => {
      const names = suppliers.slice(0, 3).map((s) => s.name).join(", ");
      const specs = suppliers.flatMap((s) => s.specializations).filter((v, i, a) => a.indexOf(v) === i).slice(0, 5).join(", ");
      return `Find the best products from ${names} suppliers. They specialize in: ${specs}. Look at trending items, high-margin products, and items with fast shipping. Give me a list of top 10 product opportunities with estimated margins.`;
    },
  },
  {
    id: "negotiate",
    label: "Start Negotiation",
    icon: MessageSquare,
    color: "text-violet-400",
    bg: "bg-violet-400/10 border-violet-400/20",
    getPrompt: (suppliers, query) => {
      const top = suppliers[0];
      if (!top) return "Help me draft a professional negotiation message to a supplier about bulk pricing and MOQ flexibility.";
      return `Help me draft a professional negotiation message to ${top.name}. I want to discuss: bulk pricing discounts, MOQ flexibility, exclusive deal terms, and payment terms. They are located in ${top.location} and specialize in ${top.specializations.slice(0, 3).join(", ")}. Draft a compelling message that shows I'm serious but also highlights mutual benefits.`;
    },
  },
  {
    id: "compare-pricing",
    label: "Compare Pricing",
    icon: TrendingUp,
    color: "text-amber-400",
    bg: "bg-amber-400/10 border-amber-400/20",
    getPrompt: (suppliers, query) => {
      const details = suppliers.slice(0, 5).map((s) => `${s.name}: price competitiveness ${s.stats.priceCompetitiveness}%, MOQ ${s.catalog.moq}, price range $${s.catalog.priceRange.min}-$${s.catalog.priceRange.max}`).join("; ");
      return `Compare the pricing across these suppliers: ${details}. Who offers the best rates, bulk discounts, and lowest MOQ? Give me a cost breakdown and recommendation for ordering 100, 500, and 1000 units.`;
    },
  },
  {
    id: "request-samples",
    label: "Request Samples",
    icon: FileText,
    color: "text-cyan-400",
    bg: "bg-cyan-400/10 border-cyan-400/20",
    getPrompt: (suppliers, query) => {
      const top = suppliers.slice(0, 3).map((s) => `${s.name} (${s.specializations.slice(0, 2).join(", ")}, sample price: $${s.catalog.samplePrice})`).join("; ");
      return `Help me draft sample request messages for these suppliers: ${top}. Include: specific products to sample, quantity requests, questions about quality control, shipping timeline expectations, and whether they offer sample refunds on bulk orders. Draft professional messages for each.`;
    },
  },
  {
    id: "check-performance",
    label: "Deep Performance Check",
    icon: Shield,
    color: "text-pink-400",
    bg: "bg-pink-400/10 border-pink-400/20",
    getPrompt: (suppliers, query) => {
      const details = suppliers.slice(0, 3).map((s) => `${s.name}: reliability ${s.stats.reliabilityScore}%, completion rate ${s.stats.orderCompletionRate}%, dispute rate ${s.stats.disputeRate}%, communication ${s.stats.communicationScore}/100`).join("; ");
      return `Run a deep performance check on these suppliers: ${details}. Analyze: reliability trends, refund rates, shipping consistency, communication quality, order completion rates, and dispute resolution. Flag any red flags and give me a risk assessment for each supplier.`;
    },
  },
];

export default function SupplierQuickActions({
  query,
  supplierCount,
  suppliers,
  onAction,
  activeActionId,
  disabled,
}: SupplierQuickActionsProps) {
  if (!query && supplierCount === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground font-medium">Quick AI Actions</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ACTIONS.map((action) => {
          const isActive = activeActionId === action.id;
          return (
            <button
              key={action.id}
              onClick={() => {
                const prompt = action.getPrompt(suppliers, query);
                onAction(action.id, action.label, prompt);
              }}
              disabled={disabled || isActive}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
                isActive
                  ? `${action.bg} ${action.color} ring-1 ring-current/30`
                  : `${action.bg} ${action.color}`
              }`}
            >
              <action.icon className="h-3 w-3" />
              {action.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
