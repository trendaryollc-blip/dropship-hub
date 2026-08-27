"use client";

import { type BusinessContext } from "@/app/api/ai/context/route";
import {
  Sun, Heart, AlertTriangle, ClipboardList,
  DollarSign, Truck, Package, MessageSquare,
  Eye, Store, Scan, TrendingUp, BarChart3, Target,
} from "lucide-react";
import PromptCard from "./PromptCard";

interface PromptCardGridProps {
  context: BusinessContext | null;
  onSendPrompt: (prompt: string) => void;
  loading?: boolean;
}

interface CardDef {
  id: string;
  title: string;
  subtitle: string;
  icon: typeof Sun;
  gradient: string;
  border: string;
  colorClass: string;
  prompt: string;
  badge?: (ctx: BusinessContext) => string;
}

const cards: CardDef[] = [
  {
    id: "daily-briefing",
    title: "Morning Briefing",
    subtitle: "Everything you need to know today",
    icon: Sun,
    gradient: "bg-gradient-to-br from-amber-500/15 to-orange-500/10",
    border: "border-amber-500/20",
    colorClass: "text-amber-400",
    prompt: "Give me my morning briefing. What happened yesterday, what's the status today, and what are my top 3 priorities?",
    badge: (ctx) => ctx.revenue.yesterday > 0 ? `$${ctx.revenue.yesterday} yesterday` : "No data yet",
  },
  {
    id: "health-check",
    title: "Business Health",
    subtitle: "How healthy is your business overall",
    icon: Heart,
    gradient: "bg-gradient-to-br from-red-500/15 to-pink-500/10",
    border: "border-red-500/20",
    colorClass: "text-red-400",
    prompt: "Analyze my overall business health. Give me a score out of 100 and break down what's working and what needs fixing in each area.",
    badge: (ctx) => `${ctx.healthScore.overall}/100`,
  },
  {
    id: "critical-issues",
    title: "Critical Issues",
    subtitle: "What needs immediate attention right now",
    icon: AlertTriangle,
    gradient: "bg-gradient-to-br from-red-600/15 to-red-400/10",
    border: "border-red-600/20",
    colorClass: "text-red-400",
    prompt: "Show me ALL critical issues across my entire business — alerts, supplier problems, customer escalations, product issues, store errors. Rank them by urgency and tell me exactly how to fix each one.",
    badge: (ctx) => {
      const total = ctx.alerts.critical.length + ctx.customerService.escalatedQueue;
      return total > 0 ? `${total} issues` : "All clear";
    },
  },
  {
    id: "what-to-do",
    title: "What Should I Do?",
    subtitle: "AI-prioritized action items for today",
    icon: ClipboardList,
    gradient: "bg-gradient-to-br from-blue-500/15 to-cyan-500/10",
    border: "border-blue-500/20",
    colorClass: "text-blue-400",
    prompt: "Based on ALL my business data right now, give me a prioritized to-do list for today. Include specific actions with the exact pages to go to. Rank by impact.",
    badge: (ctx) => `${ctx.missions.completedToday}/${ctx.missions.totalToday} missions done`,
  },
  {
    id: "revenue-deep",
    title: "Revenue Analysis",
    subtitle: "Money in, money out, margins",
    icon: DollarSign,
    gradient: "bg-gradient-to-br from-emerald-500/15 to-green-500/10",
    border: "border-emerald-500/20",
    colorClass: "text-emerald-400",
    prompt: "Analyze my revenue and profit in detail. Compare today vs yesterday, identify my most and least profitable products, spot any margin issues, and suggest how to increase revenue.",
    badge: (ctx) => `$${ctx.revenue.today} today`,
  },
  {
    id: "supplier-health",
    title: "Supplier Report",
    subtitle: "Who's performing, who's not",
    icon: Truck,
    gradient: "bg-gradient-to-br from-amber-500/15 to-yellow-500/10",
    border: "border-amber-500/20",
    colorClass: "text-amber-400",
    prompt: "Give me a full supplier health report. Which suppliers are reliable, which have high refund rates, who's slowing down shipping, and which should I consider replacing?",
    badge: (ctx) => `${ctx.suppliers.totalActive} active`,
  },
  {
    id: "product-strategy",
    title: "Product Strategy",
    subtitle: "What to scale, test, or drop",
    icon: Package,
    gradient: "bg-gradient-to-br from-purple-500/15 to-violet-500/10",
    border: "border-purple-500/20",
    colorClass: "text-purple-400",
    prompt: "Analyze my product portfolio. Which products should I scale, which are declining, which should I drop? What new products should I explore based on my current niche?",
    badge: (ctx) => `${ctx.products.totalTracked} tracked`,
  },
  {
    id: "cs-overview",
    title: "Customer Service",
    subtitle: "Happy customers = repeat business",
    icon: MessageSquare,
    gradient: "bg-gradient-to-br from-cyan-500/15 to-blue-500/10",
    border: "border-cyan-500/20",
    colorClass: "text-cyan-400",
    prompt: "Review my customer service status. How are my response times, resolution rates, and AI confidence? What escalations need immediate attention and how should I handle them?",
    badge: (ctx) => `${ctx.customerService.escalatedQueue} escalated`,
  },
  {
    id: "competitor-scan",
    title: "Competitor Intel",
    subtitle: "What the market looks like",
    icon: Eye,
    gradient: "bg-gradient-to-br from-indigo-500/15 to-blue-500/10",
    border: "border-indigo-500/20",
    colorClass: "text-indigo-400",
    prompt: "Analyze my competitive landscape. Based on my recent competitor searches and market data, what threats do I face, where are the gaps, and how should I position myself?",
    badge: (ctx) => `${ctx.competitors.recentlyAnalyzed} analyzed`,
  },
  {
    id: "store-status",
    title: "Store Operations",
    subtitle: "Is everything running smooth?",
    icon: Store,
    gradient: "bg-gradient-to-br from-pink-500/15 to-rose-500/10",
    border: "border-pink-500/20",
    colorClass: "text-pink-400",
    prompt: "Check my store operations. Are all my stores connected properly? Any products with errors? How many are live? What needs fixing?",
    badge: (ctx) => `${ctx.store.connected} stores`,
  },
  {
    id: "full-scan",
    title: "Deep Business Scan",
    subtitle: "AI reads EVERYTHING and gives you a full report",
    icon: Scan,
    gradient: "bg-gradient-to-br from-accent/15 to-accent/5",
    border: "border-accent/20",
    colorClass: "text-accent",
    prompt: "Perform a complete deep scan of my entire business. Read every page, every metric, every alert. Give me a comprehensive report covering revenue, products, suppliers, orders, customer service, store health, and competition. End with your top 5 recommended actions ranked by potential impact.",
    badge: (ctx) => `Score: ${ctx.healthScore.overall}/100`,
  },
  // Phase 4: Intelligence cards
  {
    id: "find-products",
    title: "Find My Next Winner",
    subtitle: "AI recommends products based on your portfolio",
    icon: Target,
    gradient: "bg-gradient-to-br from-violet-500/15 to-purple-500/10",
    border: "border-violet-500/20",
    colorClass: "text-violet-400",
    prompt: "Based on my current product portfolio, niches, and search history, recommend 5 winning products I should add to my store. Explain why each one matches my business.",
    badge: () => "Personalized",
  },
  {
    id: "revenue-forecast",
    title: "Revenue Forecast",
    subtitle: "AI predicts your future revenue",
    icon: BarChart3,
    gradient: "bg-gradient-to-br from-indigo-500/15 to-blue-500/10",
    border: "border-indigo-500/20",
    colorClass: "text-indigo-400",
    prompt: "Based on my revenue history, predict my revenue for the next 7 and 30 days. What trends do you see? What should I do to improve the forecast?",
    badge: (ctx) => `$${ctx.revenue.thisWeek} this week`,
  },
  {
    id: "competitor-watch",
    title: "Competitor Changes",
    subtitle: "What your competitors are doing right now",
    icon: Eye,
    gradient: "bg-gradient-to-br from-cyan-500/15 to-teal-500/10",
    border: "border-cyan-500/20",
    colorClass: "text-cyan-400",
    prompt: "Analyze my competitive landscape. What changes have competitors made recently? Where are the gaps I can exploit? How should I respond to competitor moves?",
    badge: (ctx) => `${ctx.competitors.recentlyAnalyzed} tracked`,
  },
  {
    id: "price-optimize",
    title: "Price Optimization",
    subtitle: "AI suggests optimal pricing",
    icon: DollarSign,
    gradient: "bg-gradient-to-br from-emerald-500/15 to-green-500/10",
    border: "border-emerald-500/20",
    colorClass: "text-emerald-400",
    prompt: "Analyze my product pricing strategy. Which products should I repricing? Should I raise or lower prices? What's the optimal price point for maximum profit?",
    badge: (ctx) => `${ctx.revenue.profitMargin}% margin`,
  },
];

export default function PromptCardGrid({ context, onSendPrompt, loading = false }: PromptCardGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {cards.map((card) => (
        <PromptCard
          key={card.id}
          title={card.title}
          subtitle={card.subtitle}
          icon={card.icon}
          gradient={card.gradient}
          border={card.border}
          colorClass={card.colorClass}
          liveBadge={context ? card.badge?.(context) : undefined}
          onClick={() => onSendPrompt(card.prompt)}
          disabled={loading}
        />
      ))}
    </div>
  );
}
