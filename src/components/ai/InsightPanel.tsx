"use client";

import { type BusinessContext } from "@/app/api/ai/context/route";
import {
  AlertTriangle, TrendingUp, Zap, DollarSign,
  ArrowRight, ShoppingCart, Truck, MessageSquare,
  Store, Package, Target, Activity,
} from "lucide-react";

interface InsightPanelProps {
  context: BusinessContext | null;
  onNavigate: (href: string) => void;
}

function InsightCard({
  icon: Icon,
  title,
  value,
  detail,
  color,
  href,
  onNavigate,
}: {
  icon: typeof AlertTriangle;
  title: string;
  value: string | number;
  detail?: string;
  color: string;
  href?: string;
  onNavigate: (href: string) => void;
}) {
  return (
    <button
      onClick={() => href && onNavigate(href)}
      className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors text-left group"
    >
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{title}</p>
        {detail && <p className="text-[10px] text-muted-foreground truncate">{detail}</p>}
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-semibold text-foreground">{value}</span>
        {href && <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>
    </button>
  );
}

export default function InsightPanel({ context, onNavigate }: InsightPanelProps) {
  if (!context) {
    return (
      <div className="space-y-3">
        <div className="h-4 bg-white/[0.04] rounded w-24 animate-pulse" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 bg-white/[0.03] rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const criticalCount = context.alerts.critical.length + context.customerService.escalatedQueue;

  return (
    <div className="space-y-4">
      {/* Critical Issues */}
      {criticalCount > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-red-500/10">
              <AlertTriangle className="h-3 w-3 text-red-400" />
            </div>
            <h3 className="text-[11px] font-semibold text-red-400 uppercase tracking-wider">
              Critical Issues ({criticalCount})
            </h3>
          </div>
          <div className="space-y-1.5">
            {context.alerts.critical.slice(0, 3).map((alert, i) => (
              <InsightCard
                key={`alert-${i}`}
                icon={AlertTriangle}
                title={alert.title}
                detail={alert.description.slice(0, 60)}
                value={alert.type}
                color="bg-red-500/10 text-red-400"
                onNavigate={onNavigate}
              />
            ))}
            {context.customerService.recentEscalations.slice(0, 2).map((esc, i) => (
              <InsightCard
                key={`esc-${i}`}
                icon={MessageSquare}
                title={`${esc.customerName} — Escalated`}
                detail={esc.reason.slice(0, 60)}
                value="CS"
                color="bg-red-500/10 text-red-400"
                href="/customer-service"
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      )}

      {/* Opportunities */}
      {context.alerts.opportunities.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-500/10">
              <TrendingUp className="h-3 w-3 text-emerald-400" />
            </div>
            <h3 className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">
              Opportunities ({context.alerts.opportunities.length})
            </h3>
          </div>
          <div className="space-y-1.5">
            {context.alerts.opportunities.slice(0, 3).map((opp, i) => (
              <InsightCard
                key={i}
                icon={Zap}
                title={opp.title}
                detail={opp.description.slice(0, 60)}
                value="New"
                color="bg-emerald-500/10 text-emerald-400"
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      )}

      {/* Today's Numbers */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-500/10">
            <DollarSign className="h-3 w-3 text-blue-400" />
          </div>
          <h3 className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">
            Today&apos;s Numbers
          </h3>
        </div>
        <div className="space-y-1.5">
          <InsightCard
            icon={DollarSign}
            title="Revenue"
            value={`$${context.revenue.today}`}
            detail={`${context.revenue.totalOrders} orders`}
            color="bg-emerald-500/10 text-emerald-400"
            href="/revenue"
            onNavigate={onNavigate}
          />
          <InsightCard
            icon={Target}
            title="Profit Margin"
            value={`${context.revenue.profitMargin}%`}
            detail={context.revenue.trend === "up" ? "Trending up" : context.revenue.trend === "down" ? "Trending down" : "Stable"}
            color={context.revenue.profitMargin >= 20 ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}
            href="/profit-tracker"
            onNavigate={onNavigate}
          />
          <InsightCard
            icon={Package}
            title="Products Tracked"
            value={context.products.totalTracked}
            detail={`${context.products.byStage.winning} winning, ${context.products.byStage.scaling} scaling`}
            color="bg-purple-500/10 text-purple-400"
            href="/product-lifecycle"
            onNavigate={onNavigate}
          />
        </div>
      </div>

      {/* Quick Navigation */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-md bg-white/[0.06]">
            <Activity className="h-3 w-3 text-muted-foreground" />
          </div>
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            Quick Navigate
          </h3>
        </div>
        <div className="space-y-1.5">
          <InsightCard
            icon={Truck}
            title="Suppliers"
            value={`${context.suppliers.totalActive}`}
            detail={`Avg reliability: ${context.suppliers.avgReliability}%`}
            color="bg-amber-500/10 text-amber-400"
            href="/supplier-performance"
            onNavigate={onNavigate}
          />
          <InsightCard
            icon={MessageSquare}
            title="Customer Service"
            value={`${context.customerService.activeConversations}`}
            detail={`${context.customerService.resolutionRate}% resolution`}
            color="bg-cyan-500/10 text-cyan-400"
            href="/customer-service"
            onNavigate={onNavigate}
          />
          <InsightCard
            icon={Store}
            title="Stores"
            value={`${context.store.connected}`}
            detail={`${context.store.productsLive} live, ${context.store.productsErrored} errored`}
            color="bg-pink-500/10 text-pink-400"
            href="/store"
            onNavigate={onNavigate}
          />
          <InsightCard
            icon={ShoppingCart}
            title="Orders"
            value={`${context.orders.totalRouted}`}
            detail={`${context.orders.pendingRouting} pending`}
            color="bg-blue-500/10 text-blue-400"
            href="/order-router"
            onNavigate={onNavigate}
          />
        </div>
      </div>
    </div>
  );
}
