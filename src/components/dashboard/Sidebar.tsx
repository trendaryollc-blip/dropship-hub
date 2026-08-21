"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Search,
  Truck,
  Calculator,
  Swords,
  Store,
  Brain,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  Target,
  Globe,
} from "lucide-react";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    section: null,
  },
  {
    label: "Products",
    href: "/products",
    icon: Search,
    section: "discover",
  },
  {
    label: "Niches",
    href: "/products/niches",
    icon: Target,
    section: "discover",
  },
  {
    label: "Suppliers",
    href: "/suppliers",
    icon: Truck,
    section: "discover",
  },
  {
    label: "Calculator",
    href: "/calculator",
    icon: Calculator,
    section: "analyze",
  },
  {
    label: "Competitors",
    href: "/competitors",
    icon: Swords,
    section: "analyze",
  },
  {
    label: "Health Score",
    href: "/health",
    icon: Zap,
    section: "analyze",
  },
  {
    label: "Ad ROI",
    href: "/ad-roi",
    icon: Target,
    section: "analyze",
  },
  {
    label: "My Store",
    href: "/store",
    icon: Store,
    section: "manage",
  },
  {
    label: "AI Assistant",
    href: "/ai",
    icon: Brain,
    section: "manage",
  },
  {
    label: "Platforms",
    href: "/platforms",
    icon: Globe,
    section: "manage",
  },
];

const sections = [
  { id: "discover", label: "Discover" },
  { id: "analyze", label: "Analyze" },
  { id: "manage", label: "Manage" },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const grouped = sections.map((s) => ({
    ...s,
    items: navItems.filter((i) => i.section === s.id),
  }));

  return (
    <aside
      className={`fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r border-border bg-surface/50 backdrop-blur-xl transition-all duration-300 ${
        collapsed ? "w-[68px]" : "w-[240px]"
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-border">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 border border-accent/20">
          <Zap className="h-4 w-4 text-accent" />
        </div>
        {!collapsed && (
          <span className="font-display text-base font-bold tracking-tight text-foreground whitespace-nowrap">
            DropShip<span className="text-accent">Hub</span>
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {grouped.map((section) => (
          <div key={section.id} className="mb-4">
            {!collapsed && (
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                {section.label}
              </p>
            )}
            {section.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-0.5 ${
                    active
                      ? "bg-accent/10 text-accent border border-accent/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface-hover border border-transparent"
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-accent" : ""}`} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Settings */}
      <div className="px-3 pb-4">
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            pathname === "/settings"
              ? "bg-accent/10 text-accent border border-accent/20"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-hover border border-transparent"
          }`}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full bg-surface border border-border text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>
  );
}
