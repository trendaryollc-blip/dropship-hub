"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { User } from "firebase/auth";
import { AuthProvider, useAuth } from "@/components/auth/AuthProvider";
import { SavedProductsProvider } from "@/components/saved/SavedProductsProvider";
import { ToastProvider } from "@/components/ui/Toast";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import OnboardingWizard from "@/components/onboarding/OnboardingWizard";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const prevUserRef = useRef<User | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      if (prevUserRef.current !== null) {
        router.push(`/sign-in?expired=1&callbackUrl=${encodeURIComponent(pathname)}`);
      } else {
        router.push(`/sign-in?callbackUrl=${encodeURIComponent(pathname)}`);
      }
    }
    prevUserRef.current = user;
  }, [user, loading, router, pathname]);

  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => {
      if (loading) {
        router.push("/sign-in");
      }
    }, 10_000);
    return () => clearTimeout(timer);
  }, [loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-10 w-10 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <AppShell>{children}</AppShell>;
}

function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      const onboardingDone = localStorage.getItem(`onboarding_${user.uid}`);
      if (!onboardingDone) {
        setShowOnboarding(true);
      }
    }
  }, [user]);

  const handleOnboardingComplete = () => {
    if (user) {
      localStorage.setItem(`onboarding_${user.uid}`, "done");
    }
    setShowOnboarding(false);
  };

  if (showOnboarding) {
    return <OnboardingWizard onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="md:pl-[240px] transition-all duration-300">
        <Topbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <SavedProductsProvider>
        <ToastProvider>
          <ErrorBoundary>
            <AuthGuard>{children}</AuthGuard>
          </ErrorBoundary>
        </ToastProvider>
      </SavedProductsProvider>
    </AuthProvider>
  );
}
