"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { Bell, Search, LogOut, ChevronDown, Menu, ArrowLeft, TrendingUp, AlertTriangle, Sparkles } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

interface TopbarProps {
  onMenuToggle: () => void;
}

export default function Topbar({ onMenuToggle }: TopbarProps) {
  const { user, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const notifications = [
    { id: 1, icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-400/10", title: "Product trending +41%", desc: "Pet GPS Tracker Mini shows strong buy signal", time: "2m ago" },
    { id: 2, icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-400/10", title: "Price drop detected", desc: "Smart LED Strip 5m dropped 12% on AliExpress", time: "15m ago" },
    { id: 3, icon: Sparkles, color: "text-accent", bg: "bg-accent/10", title: "New AI pick ready", desc: "Your daily product recommendation is available", time: "1h ago" },
  ];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
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

      <div className="flex-1 max-w-md">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products, suppliers, anything..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/30 focus:ring-1 focus:ring-accent/10 transition-all"
          />
        </form>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <div ref={notificationsRef} className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2 h-2 w-2 bg-accent rounded-full">
              <span className="absolute inset-0 rounded-full bg-accent animate-ping opacity-75" />
            </span>
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 glass rounded-xl py-2 border border-border shadow-2xl animate-slide-up z-50">
              <div className="px-3 py-2 mb-1 flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">Notifications</p>
                <span className="text-[10px] text-accent font-medium">{notifications.length} new</span>
              </div>
              <div className="border-t border-border my-1" />
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => { setNotificationsOpen(false); }}
                  className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-surface-hover transition-colors text-left"
                >
                  <div className={`p-1.5 rounded-lg ${n.bg} shrink-0 mt-0.5`}>
                    <n.icon className={`h-3.5 w-3.5 ${n.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground">{n.title}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{n.desc}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">{n.time}</p>
                  </div>
                </button>
              ))}
              <div className="border-t border-border my-1" />
              <button
                onClick={() => { setNotificationsOpen(false); }}
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
