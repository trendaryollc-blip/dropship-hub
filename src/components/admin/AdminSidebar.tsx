"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Globe,
  Key,
  Users,
  BarChart3,
  Settings,
  HeartPulse,
  Shield,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

const mainNavItems = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
];

const managementItems = [
  { label: "Platforms", href: "/admin/platforms", icon: Globe },
  { label: "API Keys", href: "/admin/api-keys", icon: Key },
  { label: "Users", href: "/admin/users", icon: Users },
];

const monitoringItems = [
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Health", href: "/admin/health", icon: HeartPulse },
];

const systemItems = [
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function NavItem({
  item,
  active,
  collapsed,
  isOpen,
  onClose,
}: {
  item: { label: string; href: string; icon: typeof LayoutDashboard };
  active: boolean;
  collapsed: boolean;
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onClose}
      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
        active
          ? "bg-red-400/10 text-red-400 border border-red-400/20"
          : "text-muted-foreground hover:text-foreground hover:bg-surface-hover border border-transparent"
      }`}
      title={collapsed && !isOpen ? item.label : undefined}
    >
      <item.icon className={`h-4 w-4 shrink-0 ${active ? "text-red-400" : ""}`} />
      {!(collapsed && !isOpen) && <span>{item.label}</span>}
    </Link>
  );
}

function SectionLabel({
  children,
  collapsed,
  isOpen,
}: {
  children: React.ReactNode;
  collapsed: boolean;
  isOpen: boolean;
}) {
  if (collapsed && !isOpen) return null;
  return (
    <p className="px-3 mb-1.5 mt-5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 first:mt-0">
      {children}
    </p>
  );
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href);

  const navContent = (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-14 border-b border-white/[0.04]">
        <Link href="/admin/dashboard" className="flex items-center gap-2.5" onClick={onClose}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-400/10 border border-red-400/20">
            <Shield className="h-4 w-4 text-red-400" />
          </div>
          {!(collapsed && !isOpen) && (
            <span className="font-display text-sm font-bold tracking-tight text-foreground whitespace-nowrap">
              Admin<span className="text-red-400">Panel</span>
            </span>
          )}
        </Link>
        <button
          onClick={onClose}
          className="md:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <SectionLabel collapsed={collapsed} isOpen={isOpen}>Overview</SectionLabel>
        {mainNavItems.map((item) => <NavItem key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed} isOpen={isOpen} onClose={onClose} />)}

        <SectionLabel collapsed={collapsed} isOpen={isOpen}>Management</SectionLabel>
        {managementItems.map((item) => <NavItem key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed} isOpen={isOpen} onClose={onClose} />)}

        <SectionLabel collapsed={collapsed} isOpen={isOpen}>Monitoring</SectionLabel>
        {monitoringItems.map((item) => <NavItem key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed} isOpen={isOpen} onClose={onClose} />)}

        <SectionLabel collapsed={collapsed} isOpen={isOpen}>System</SectionLabel>
        {systemItems.map((item) => <NavItem key={item.href} item={item} active={isActive(item.href)} collapsed={collapsed} isOpen={isOpen} onClose={onClose} />)}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 border-t border-white/[0.04] pt-3">
        <Link
          href="/dashboard"
          onClick={onClose}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-surface-hover border border-transparent transition-all"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          {!(collapsed && !isOpen) && <span>Back to App</span>}
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
          className="absolute -right-3 top-16 flex h-6 w-6 items-center justify-center rounded-full border border-white/[0.06] text-muted-foreground hover:text-foreground transition-colors bg-background"
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
          <aside
            ref={dialogRef}
            className="absolute left-0 top-0 bottom-0 w-[280px] flex flex-col border-r border-white/[0.04] backdrop-blur-xl animate-in slide-in-from-left duration-300"
            style={{ backgroundColor: "var(--sidebar)" }}
          >
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
