"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { Bell, Search, LogOut, ChevronDown, Menu, ArrowLeft, TrendingUp, AlertTriangle, Sparkles, AlertCircle, Info, Clock, X } from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import ThemeGallery from "@/components/theme/ThemeGallery";
import { safeFetch } from "@/lib/safe-fetch";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useAPI } from "@/hooks/useAPI";

interface NotificationItem {
  id: string;
  title: string;
  body?: string;
  icon?: string;
  url?: string;
  severity?: "info" | "warning" | "critical";
  read: boolean;
  createdAt: string;
}

const severityConfig: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  critical: { icon: AlertCircle, color: "text-red-400", bg: "bg-red-400/10" },
  warning: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-400/10" },
  info: { icon: Info, color: "text-blue-400", bg: "bg-blue-400/10" },
};

const iconMap: Record<string, { icon: typeof Bell; color: string; bg: string }> = {
  "customer-service": { icon: AlertCircle, color: "text-red-400", bg: "bg-red-400/10" },
  supplier: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-400/10" },
  revenue: { icon: TrendingUp, color: "text-emerald-400", bg: "text-emerald-400/10" },
  store: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-400/10" },
  alert: { icon: Sparkles, color: "text-accent", bg: "bg-accent/10" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface TopbarProps {
  onMenuToggle: () => void;
}

export default function Topbar({ onMenuToggle }: TopbarProps) {
  const { user, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const { data: notifData, mutate: refetchNotifs } = useAPI<{ notifications: NotificationItem[]; unreadCount: number }>("/api/ai/notifications", {
    refreshInterval: 60000,
  });
  const notifications = notifData?.notifications || [];
  const unreadCount = notifData?.unreadCount || 0;

  const searchHistoryUrl = searchFocused ? "/api/search-history" : null;
  const { data: searchHistData, isLoading: searchLoading } = useAPI<{ entries: { id: string; query: string }[] }>(searchHistoryUrl);

  const searchHistory = useMemo(() => {
    if (!searchHistData?.entries) return [];
    if (debouncedSearch.trim().length >= 2) {
      return searchHistData.entries
        .filter((e) => e.query.toLowerCase().includes(debouncedSearch.toLowerCase()))
        .slice(0, 8);
    }
    return searchHistData.entries;
  }, [searchHistData, debouncedSearch]);

  const searchConfig = useMemo(() => {
    if (pathname.startsWith("/suppliers")) {
      return { placeholder: "Search suppliers by name, category...", destination: "/suppliers", paramName: "q" };
    }
    if (pathname.startsWith("/competitors")) {
      return { placeholder: "Search competitors to analyze...", destination: "/competitors", paramName: "q" };
    }
    if (pathname.startsWith("/fulfillment")) {
      return { placeholder: "Search orders, customers, products...", destination: "/fulfillment", paramName: "q" };
    }
    if (pathname.startsWith("/products")) {
      return { placeholder: "Search products across all platforms...", destination: "/products", paramName: "q" };
    }
    return { placeholder: "Search products, suppliers, anything...", destination: "/products", paramName: "q" };
  }, [pathname]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await safeFetch("/api/ai/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      refetchNotifs();
    } catch {
      // Silently fail
    }
  };

  const handleMarkRead = async (notifId: string) => {
    try {
      await safeFetch("/api/ai/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds: [notifId] }),
      });
      refetchNotifs();
    } catch {
      // Silently fail
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      safeFetch("/api/search-history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery.trim(), source: "topbar" }),
      }).catch((e) => { if (process.env.NODE_ENV === "development") console.warn("[Topbar] silently caught", e); });
      router.push(`${searchConfig.destination}?${searchConfig.paramName}=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
      setSearchFocused(false);
    }
  };

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : "U";

  return (
    <header className="sticky top-0 z-30 h-16 flex items-center gap-3 px-4 md:px-6 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />

      <button
        onClick={() => router.back()}
        className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all"
        aria-label="Go back"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>

      <button
        onClick={onMenuToggle}
        className="md:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all"
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1 max-w-md" ref={searchRef}>
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            placeholder={searchConfig.placeholder}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/30 focus:ring-1 focus:ring-accent/10 transition-all"
          />
          {searchFocused && (
            <div className="absolute left-0 right-0 top-full mt-1 glass rounded-xl border border-border shadow-2xl z-50 overflow-hidden animate-slide-up">
              {searchLoading && searchQuery.trim().length >= 2 ? (
                <div className="px-3 py-4 text-center">
                  <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                  <p className="text-[11px] text-muted-foreground mt-1">Searching...</p>
                </div>
              ) : searchHistory.length > 0 ? (
                <div className="py-1">
                  <p className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    {searchQuery.trim().length >= 2 ? "Suggestions" : "Recent searches"}
                  </p>
                  {searchHistory.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSearchQuery(item.query);
                        router.push(`${searchConfig.destination}?${searchConfig.paramName}=${encodeURIComponent(item.query)}`);
                        setSearchFocused(false);
                        setSearchQuery("");
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-surface-hover transition-colors text-left"
                    >
                      <Clock className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                      <span className="text-xs text-foreground truncate">{item.query}</span>
                    </button>
                  ))}
                </div>
              ) : searchQuery.trim().length === 0 ? (
                <div className="px-3 py-4 text-center">
                  <Search className="h-6 w-6 text-muted-foreground/30 mx-auto mb-1" />
                  <p className="text-[11px] text-muted-foreground">Start typing to search</p>
                </div>
              ) : (
                <div className="px-3 py-4 text-center">
                  <p className="text-[11px] text-muted-foreground">No matches found</p>
                </div>
              )}
            </div>
          )}
        </form>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <ThemeGallery />

        <div ref={notificationsRef} className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 h-2 w-2 bg-accent rounded-full">
                <span className="absolute inset-0 rounded-full bg-accent animate-ping opacity-75" />
              </span>
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 glass rounded-xl py-2 border border-border shadow-2xl animate-slide-up z-50">
              <div className="px-3 py-2 mb-1 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Notifications</p>
                {unreadCount > 0 && (
                  <span className="text-[10px] text-accent font-medium">{unreadCount} new</span>
                )}
              </div>
              <div className="border-t border-border my-1" />
              {notifications.length === 0 ? (
                <div className="px-3 py-6 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No notifications yet</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const severity = n.severity || "info";
                  const cfg = iconMap[n.icon || ""] || severityConfig[severity] || severityConfig.info;
                  const IconComp = cfg.icon;
                  return (
                    <button
                      key={n.id}
                      onClick={() => {
                        if (!n.read) handleMarkRead(n.id);
                        setNotificationsOpen(false);
                        if (n.url) router.push(n.url);
                      }}
                      className={`w-full flex items-start gap-3 px-3 py-2.5 hover:bg-surface-hover transition-colors text-left ${!n.read ? "bg-accent/5" : ""}`}
                    >
                      <div className={`p-1.5 rounded-lg ${cfg.bg} shrink-0 mt-0.5`}>
                        <IconComp className={`h-3.5 w-3.5 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">{n.title}</p>
                        {n.body && <p className="text-[11px] text-muted-foreground truncate">{n.body}</p>}
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">{timeAgo(n.createdAt)}</p>
                      </div>
                      {!n.read && <div className="h-2 w-2 rounded-full bg-accent shrink-0 mt-1" />}
                    </button>
                  );
                })
              )}
              <div className="border-t border-border my-1" />
              <button
                onClick={() => { handleMarkAllRead(); setNotificationsOpen(false); }}
                className="w-full text-center px-3 py-2 text-xs text-accent hover:text-accent/80 transition-colors"
              >
                Mark all as read
              </button>
            </div>
          )}
        </div>

        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-xl hover:bg-surface-hover transition-all"
          >
            <div className="h-8 w-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-xs font-bold text-accent">
              {initials}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-medium text-foreground leading-none mb-0.5">
                {user?.displayName || user?.email?.split("@")[0] || "User"}
              </p>
              <p className="text-[11px] text-muted-foreground leading-none">
                {user?.email || "user@dropshiphub.com"}
              </p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden md:block" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 glass rounded-xl py-2 border border-border shadow-2xl animate-slide-up">
              <div className="px-3 py-2 mb-1">
                <p className="text-sm font-medium text-foreground">{user?.displayName || "User"}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <div className="border-t border-border my-1" />
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
