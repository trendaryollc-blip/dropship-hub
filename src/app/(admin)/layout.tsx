"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { safeFetch } from "@/lib/safe-fetch";
import AdminSidebar from "@/components/admin/AdminSidebar";
import {
  Menu,
  ArrowLeft,
  LogOut,
  ChevronDown,
  Shield,
  Loader2,
} from "lucide-react";

function AdminAuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;

    const checkAccess = async () => {
      try {
        const token = await user.getIdToken();
        const data = await safeFetch<{ isOwner: boolean }>("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (active) setIsAuthorized(data?.isOwner ?? false);
      } catch {
        if (active) setIsAuthorized(false);
      } finally {
        if (active) setChecking(false);
      }
    };

    checkAccess();
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      router.push(`/sign-in?callbackUrl=${encodeURIComponent("/admin/dashboard")}`);
    }
  }, [user, loading, router]);

  if (loading || checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="h-12 w-12 border-2 border-red-400/20 rounded-full mx-auto" />
            <div className="absolute inset-0 h-12 w-12 border-2 border-red-400 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
          <p className="text-sm text-muted-foreground mt-4">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (isAuthorized === false) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="glass rounded-3xl p-12 border border-red-400/20 text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-400/10 border border-red-400/20 flex items-center justify-center mx-auto mb-6">
            <Shield className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="font-display text-xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
            You don&apos;t have permission to access the admin dashboard. This area is restricted to authorized administrators only.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-hover transition-all shadow-[0_0_20px_rgba(var(--glow-color),0.15)]"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <AdminShell user={user} signOut={signOut} router={router}>{children}</AdminShell>;
}

function AdminShell({
  children,
  user,
  signOut,
  router,
}: {
  children: React.ReactNode;
  user: { email?: string | null; displayName?: string | null };
  signOut: () => Promise<void>;
  router: ReturnType<typeof useRouter>;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const initials = user?.email
    ? user.email.slice(0, 2).toUpperCase()
    : "A";

  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 md:ml-[240px] flex flex-col min-h-screen">
        {/* Admin Topbar */}
        <header className="sticky top-0 z-30 h-14 flex items-center gap-3 px-4 md:px-6 border-b border-white/[0.04] bg-background/80 backdrop-blur-xl">
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-red-500/20 to-transparent" />

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all"
            aria-label="Toggle menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-2 text-xs font-medium text-red-400 bg-red-400/10 px-2.5 py-1 rounded-lg border border-red-400/20">
            <Shield className="h-3 w-3" />
            Admin
          </div>

          <div className="flex-1" />

          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Back to App</span>
          </button>

          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-surface-hover transition-all"
            >
              <div className="h-7 w-7 rounded-lg bg-red-400/10 border border-red-400/20 flex items-center justify-center text-[10px] font-bold text-red-400">
                {initials}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-medium text-foreground leading-none">
                  {user?.displayName || user?.email?.split("@")[0] || "Admin"}
                </p>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground hidden md:block" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 glass rounded-xl py-2 border border-border shadow-2xl animate-slide-up">
                <div className="px-3 py-2 mb-1">
                  <p className="text-sm font-medium text-foreground">{user?.displayName || "Admin"}</p>
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
        </header>

        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminAuthGuard>{children}</AdminAuthGuard>;
}
