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
  X,
  MoreHorizontal,
} from "lucide-react";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    section: null,
  },
  {
    label: "Find Products",
    href: "/products",
    icon: Search,
    section: "core",
  },
  {
    label: "Find Suppliers",
    href: "/suppliers",
    icon: Truck,
    section: "core",
  },
  {
    label: "Calculator",
    href: "/calculator",
    icon: Calculator,
    section: "core",
  },
  {
    label: "Competitors",
    href: "/competitors",
    icon: Swords,
    section: "core",
  },
  {
    label: "My Store",
    href: "/store",
    icon: Store,
    section: "tools",
  },
  {
    label: "AI Assistant",
    href: "/ai",
    icon: Brain,
    section: "tools",
  },
];

const moreItems = [
  { label: "Niches", href: "/products/niches", icon: Search },
  { label: "Revenue", href: "/revenue", icon: Store },
  { label: "Ad ROI", href: "/ad-roi", icon: Calculator },
  { label: "Profit Tracker", href: "/profit-tracker", icon: Store },
  { label: "Supplier Intel", href: "/supplier-performance", icon: Truck },
  { label: "Lifecycle", href: "/product-lifecycle", icon: Zap },
  { label: "Health Score", href: "/health", icon: Zap },
  { label: "Order Router", href: "/order-router", icon: Store },
  { label: "Missions", href: "/missions", icon: Store },
  { label: "Platforms", href: "/platforms", icon: Store },
  { label: "Daily Digest", href: "/digest", icon: Store },
  { label: "Support", href: "/customer-service", icon: Store },
];

const sections = [
  { id: "core", label: "Essentials" },
  { id: "tools", label: "Tools" },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const pathname = usePathname();

  const grouped = sections.map((s) => ({
    ...s,
    items: navItems.filter((i) => i.section === s.id),
  }));

  const isMoreActive = moreItems.some((item) => pathname === item.href || pathname.startsWith(item.href + "/"));

  const NavItem = ({ item }: { item: typeof navItems[0] }) => {
    const active = pathname === item.href || pathname.startsWith(item.href + "/");
    return (
      <Link
        href={item.href}
        onClick={onClose}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-0.5 ${
          active
            ? "bg-accent/10 text-accent border border-accent/20"
            : "text-muted-foreground hover:text-foreground hover:bg-surface-hover border border-transparent"
        }`}
        title={collapsed && !isOpen ? item.label : undefined}
      >
        <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-accent" : ""}`} />
        {!(collapsed && !isOpen) && <span>{item.label}</span>}
      </Link>
    );
  };

  const navContent = (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-white/[0.04]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 border border-accent/20">
            <Zap className="h-4 w-4 text-accent" />
          </div>
          {!(collapsed && !isOpen) && (
            <span className="font-display text-base font-bold tracking-tight text-foreground whitespace-nowrap">
              DropShip<span className="text-accent">Hub</span>
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {/* Dashboard */}
        {(() => {
          const dashItem = navItems.find((i) => i.section === null);
          if (!dashItem) return null;
          const active = pathname === dashItem.href || pathname.startsWith(dashItem.href + "/");
          return (
            <Link
              href={dashItem.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-4 ${
                active
                  ? "bg-accent/10 text-accent border border-accent/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-hover border border-transparent"
              }`}
              title={collapsed && !isOpen ? dashItem.label : undefined}
            >
              <dashItem.icon className={`h-4 w-4 shrink-0 ${active ? "text-accent" : ""}`} />
              {!(collapsed && !isOpen) && <span>{dashItem.label}</span>}
            </Link>
          );
        })()}

        {/* Essentials */}
        {!(collapsed && !isOpen) && (
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            Essentials
          </p>
        )}
        {navItems.filter((i) => i.section === "core").map((item) => (
          <NavItem key={item.href} item={item} />
        ))}

        {/* Tools */}
        {!(collapsed && !isOpen) && (
          <p className="px-3 mb-2 mt-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
            Tools
          </p>
        )}
        {navItems.filter((i) => i.section === "tools").map((item) => (
          <NavItem key={item.href} item={item} />
        ))}

        {/* More */}
        {!(collapsed && !isOpen) && (
          <div className="mt-4">
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isMoreActive || moreOpen
                  ? "bg-accent/10 text-accent border border-accent/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-hover border border-transparent"
              }`}
            >
              <MoreHorizontal className="h-4 w-4 shrink-0" />
              <span>More</span>
              <ChevronRight className={`h-3 w-3 ml-auto transition-transform ${moreOpen ? "rotate-90" : ""}`} />
            </button>
            {moreOpen && (
              <div className="ml-2 mt-1 space-y-0.5 animate-slide-up">
                {moreItems.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        active
                          ? "text-accent bg-accent/5"
                          : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                      }`}
                    >
                      <item.icon className="h-3.5 w-3.5 shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* Settings */}
      <div className="px-3 pb-4">
        <Link
          href="/settings"
          onClick={onClose}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            pathname === "/settings"
              ? "bg-accent/10 text-accent border border-accent/20"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-hover border border-transparent"
          }`}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!(collapsed && !isOpen) && <span>Settings</span>}
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden md:flex fixed left-0 top-0 bottom-0 z-40 flex-col border-r border-white/[0.04] backdrop-blur-xl transition-all duration-300 ${
          collapsed ? "w-[68px]" : "w-[240px]"
        }`}
        style={{ backgroundColor: "var(--sidebar)" }}
      >
        {navContent}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.06] text-muted-foreground hover:text-foreground transition-colors"
          style={{ backgroundColor: "var(--sidebar)" }}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-[280px] flex flex-col border-r border-white/[0.04] backdrop-blur-xl animate-in slide-in-from-left duration-300" style={{ backgroundColor: "var(--sidebar)" }}>
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
