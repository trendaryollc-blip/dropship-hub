"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Zap } from "lucide-react";
import ThemeGallery from "@/components/theme/ThemeGallery";
import { useAuth } from "@/components/auth/AuthProvider";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const { user, loading } = useAuth();
  const isSignedIn = !loading && user != null;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Body scroll lock + Escape close (with focus return) + outside click
  useEffect(() => {
    if (!mobileOpen) return;

    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
        toggleRef.current?.focus();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };
    // Reset if resized up to desktop breakpoint where menu is hidden
    const mq = window.matchMedia("(min-width: 1024px)");
    const onBreakpoint = () => {
      if (mq.matches) setMobileOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    mq.addEventListener("change", onBreakpoint);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      mq.removeEventListener("change", onBreakpoint);
    };
  }, [mobileOpen]);

  const navLinks = [
    { label: "Features", href: "/#features" },
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Pricing", href: "/pricing" },
  ];

  return (
    <nav
      ref={navRef}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "glass border-b border-border py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className="flex items-center gap-2.5 group"
        >
          <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 border border-accent/20 group-hover:bg-accent/20 transition-colors">
            <Zap className="h-5 w-5 text-accent" />
            <div className="absolute inset-0 rounded-lg bg-accent/5 blur-md" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-foreground">
            DropShip<span className="text-accent">Hub</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-surface"
            >
              {link.label}
            </Link>
          ))}
          {/* Dashboard menu entry — signed-in only */}
          {isSignedIn && (
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-surface"
            >
              Dashboard
            </Link>
          )}
        </div>

        {/* Desktop CTA — session-aware (hidden until auth resolves) */}
        <div className="hidden lg:flex items-center gap-3">
          <ThemeGallery />
          {!loading &&
            (isSignedIn ? (
              <Link
                href="/dashboard"
                className="relative px-5 py-2.5 text-sm font-semibold rounded-xl btn-accent transition-all hover:shadow-[0_0_20px_rgba(var(--glow-color),0.3)] active:scale-[0.97]"
              >
                Open Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="relative px-5 py-2.5 text-sm font-semibold rounded-xl btn-accent transition-all hover:shadow-[0_0_20px_rgba(var(--glow-color),0.3)] active:scale-[0.97]"
                >
                  Get Started Free
                </Link>
              </>
            ))}
        </div>

        {/* Mobile toggle */}
        <button
          ref={toggleRef}
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-expanded={mobileOpen}
          aria-controls={mobileOpen ? "mobile-menu" : undefined}
          className="lg:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          id="mobile-menu"
          className="lg:hidden glass border-t border-border animate-slide-up max-h-[calc(100dvh-4.5rem)] overflow-y-auto overscroll-contain"
        >
          <div className="px-6 py-4 flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-surface"
              >
                {link.label}
              </Link>
            ))}
            {isSignedIn && (
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-surface"
              >
                Dashboard
              </Link>
            )}
            <div className="border-t border-border my-2" />
            <div className="relative flex items-center justify-end py-2">
              <ThemeGallery />
            </div>
            {!loading &&
              (isSignedIn ? (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 text-sm font-semibold text-center rounded-xl btn-accent transition-all"
                >
                  Open Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/sign-in"
                    onClick={() => setMobileOpen(false)}
                    className="px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-surface"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/sign-up"
                    onClick={() => setMobileOpen(false)}
                    className="px-4 py-3 text-sm font-semibold text-center rounded-xl btn-accent transition-all"
                  >
                    Get Started Free
                  </Link>
                </>
              ))}
          </div>
        </div>
      )}
    </nav>
  );
}
