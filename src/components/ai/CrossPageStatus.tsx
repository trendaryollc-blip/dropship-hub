"use client";

import { type BusinessContext } from "@/app/api/ai/context/route";
import {
  LayoutDashboard, Package, Truck, DollarSign,
  ShoppingCart, MessageSquare, Store, Activity,
} from "lucide-react";

interface CrossPageStatusProps {
  context: BusinessContext | null;
}

interface PageStatus {
  name: string;
  icon: typeof LayoutDashboard;
  status: "healthy" | "warning" | "critical" | "info" | "inactive";
  detail: string;
  href: string;
}

function getStatusColor(status: PageStatus["status"]): string {
  switch (status) {
    case "healthy": return "bg-emerald-500";
    case "warning": return "bg-amber-500";
    case "critical": return "bg-red-500";
    case "info": return "bg-blue-500";
    case "inactive": return "bg-white/20";
  }
}

function getStatusBorderColor(status: PageStatus["status"]): string {
  switch (status) {
    case "healthy": return "border-emerald-500/20";
    case "warning": return "border-amber-500/20";
    case "critical": return "border-red-500/20";
    case "info": return "border-blue-500/20";
    case "inactive": return "border-white/10";
  }
}

export default function CrossPageStatus({ context }: CrossPageStatusProps) {
  if (!context) {
    return (
      <div className="flex gap-2 px-4 md:px-6 py-2">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="h-8 w-20 bg-white/[0.03] rounded-full animate-pulse shrink-0" />
        ))}
      </div>
    );
  }

  const pages: PageStatus[] = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
      status: context.alerts.critical.length > 0 ? "critical" : context.alerts.unread > 0 ? "warning" : "healthy",
      detail: `${context.alerts.unread} alerts`,
      href: "/dashboard",
    },
    {
      name: "Products",
      icon: Package,
      status: context.products.byStage.saturation > 2 ? "warning" : context.products.totalTracked > 0 ? "healthy" : "inactive",
      detail: `${context.products.totalTracked} tracked`,
      href: "/products",
    },
    {
      name: "Suppliers",
      icon: Truck,
      status: context.suppliers.criticalAlerts.length > 0 ? "critical" : context.suppliers.avgReliability >= 70 ? "healthy" : "warning",
      detail: `${context.suppliers.avgReliability}% reliable`,
      href: "/supplier-performance",
    },
    {
      name: "Revenue",
      icon: DollarSign,
      status: context.revenue.profitMargin >= 20 ? "healthy" : context.revenue.profitMargin >= 10 ? "warning" : context.revenue.today > 0 ? "info" : "inactive",
      detail: `$${context.revenue.today}`,
      href: "/revenue",
    },
    {
      name: "Orders",
      icon: ShoppingCart,
      status: context.orders.pendingRouting > 3 ? "warning" : context.orders.totalRouted > 0 ? "healthy" : "inactive",
      detail: `${context.orders.totalRouted} routed`,
      href: "/order-router",
    },
    {
      name: "CS",
      icon: MessageSquare,
      status: context.customerService.escalatedQueue > 0 ? "critical" : context.customerService.activeConversations > 0 ? "warning" : "healthy",
      detail: `${context.customerService.escalatedQueue} escalated`,
      href: "/customer-service",
    },
    {
      name: "Store",
      icon: Store,
      status: context.store.productsErrored > 0 ? "critical" : context.store.connected > 0 ? "healthy" : "inactive",
      detail: `${context.store.connected} connected`,
      href: "/store",
    },
    {
      name: "Lifecycle",
      icon: Activity,
      status: context.products.byStage.sunset > 2 ? "warning" : context.products.byStage.winning > 0 ? "healthy" : "info",
      detail: `${context.products.byStage.winning} winning`,
      href: "/product-lifecycle",
    },
  ];

  return (
    <div className="flex gap-2 px-4 md:px-6 py-2 w-max">
      {pages.map((page) => (
        <a
          key={page.name}
          href={page.href}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${getStatusBorderColor(page.status)} bg-white/[0.02] hover:bg-white/[0.05] transition-colors shrink-0 group`}
        >
          <div className={`w-1.5 h-1.5 rounded-full ${getStatusColor(page.status)} shrink-0`} />
          <page.icon className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
          <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors whitespace-nowrap">
            {page.name}
          </span>
          <span className="text-[9px] text-muted-foreground/60 whitespace-nowrap">{page.detail}</span>
        </a>
      ))}
    </div>
  );
}
