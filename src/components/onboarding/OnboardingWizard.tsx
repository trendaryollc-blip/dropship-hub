"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Zap, ArrowRight, ArrowLeft, CheckCircle2,
  Search, DollarSign, Store, Target, Rocket,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";

interface OnboardingWizardProps {
  onComplete: () => void;
}

const niches = [
  { id: "pets", label: "Pet Supplies", icon: "🐾" },
  { id: "home", label: "Home & Kitchen", icon: "🏠" },
  { id: "tech", label: "Electronics & Tech", icon: "📱" },
  { id: "fitness", label: "Fitness & Health", icon: "💪" },
  { id: "fashion", label: "Fashion & Accessories", icon: "👗" },
  { id: "beauty", label: "Beauty & Skincare", icon: "✨" },
  { id: "automotive", label: "Automotive", icon: "🚗" },
  { id: "outdoors", label: "Outdoor & Travel", icon: "🏕️" },
];

const budgets = [
  { id: "starter", label: "Starter", range: "$0 - $500/mo", desc: "Just getting started" },
  { id: "growing", label: "Growing", range: "$500 - $2,000/mo", desc: "Already making sales" },
  { id: "scaling", label: "Scaling", range: "$2,000 - $10,000/mo", desc: "Ready to scale up" },
  { id: "pro", label: "Pro", range: "$10,000+/mo", desc: "Full-time operation" },
];

const stores = [
  { id: "shopify", label: "Shopify", icon: "🛍️" },
  { id: "woocommerce", label: "WooCommerce", icon: "🛒" },
  { id: "amazon", label: "Amazon", icon: "📦" },
  { id: "none", label: "Not yet", icon: "🚀" },
];

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const [selectedNiche, setSelectedNiche] = useState<string | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const { user } = useAuth();

  const canNext = () => {
    if (step === 0) return selectedNiche !== null;
    if (step === 1) return selectedBudget !== null;
    if (step === 2) return selectedStore !== null;
    return false;
  };

  const handleFinish = async () => {
    const profile = { niche: selectedNiche, budget: selectedBudget, store: selectedStore };
    localStorage.setItem("userProfile", JSON.stringify(profile));
    if (user) {
      try {
        await setDoc(doc(db, "users", user.uid), { profile }, { merge: true });
      } catch (err) {
        console.error("Failed to save profile to Firestore:", err);
      }
    }
    onComplete();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 border border-accent/20">
            <Zap className="h-5 w-5 text-accent" />
          </div>
          <span className="font-display text-xl font-bold tracking-tight text-foreground">
            DropShip<span className="text-accent">Hub</span>
          </span>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex-1 h-1.5 rounded-full overflow-hidden bg-surface">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  i <= step ? "bg-accent" : "bg-transparent"
                }`}
              />
            </div>
          ))}
        </div>

        {/* Step 0: Niche */}
        {step === 0 && (
          <div className="animate-slide-up">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/10 border border-accent/20 mb-4">
                <Target className="h-7 w-7 text-accent" />
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground mb-2">
                What do you sell?
              </h1>
              <p className="text-sm text-muted-foreground">
                Pick your main niche so we can personalize your dashboard.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {niches.map((niche) => (
                <button
                  key={niche.id}
                  onClick={() => setSelectedNiche(niche.id)}
                  className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                    selectedNiche === niche.id
                      ? "bg-accent/10 border-accent/30 ring-1 ring-accent/20"
                      : "bg-surface/50 border-border hover:border-accent/20 hover:bg-surface-hover"
                  }`}
                >
                  <span className="text-2xl">{niche.icon}</span>
                  <span className="text-sm font-medium text-foreground">{niche.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Budget */}
        {step === 1 && (
          <div className="animate-slide-up">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-400/10 border border-emerald-400/20 mb-4">
                <DollarSign className="h-7 w-7 text-emerald-400" />
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground mb-2">
                Monthly ad budget?
              </h1>
              <p className="text-sm text-muted-foreground">
                This helps us show relevant profit calculations and recommendations.
              </p>
            </div>
            <div className="space-y-3">
              {budgets.map((budget) => (
                <button
                  key={budget.id}
                  onClick={() => setSelectedBudget(budget.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                    selectedBudget === budget.id
                      ? "bg-accent/10 border-accent/30 ring-1 ring-accent/20"
                      : "bg-surface/50 border-border hover:border-accent/20 hover:bg-surface-hover"
                  }`}
                >
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{budget.label}</p>
                    <p className="text-xs text-muted-foreground">{budget.desc}</p>
                  </div>
                  <span className="text-sm font-mono font-medium text-accent">{budget.range}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Store */}
        {step === 2 && (
          <div className="animate-slide-up">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-purple-400/10 border border-purple-400/20 mb-4">
                <Store className="h-7 w-7 text-purple-400" />
              </div>
              <h1 className="font-display text-2xl font-bold text-foreground mb-2">
                Where do you sell?
              </h1>
              <p className="text-sm text-muted-foreground">
                Connect your store later in Settings. For now, just tell us your platform.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {stores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => setSelectedStore(store.id)}
                  className={`flex items-center gap-3 p-4 rounded-xl border transition-all text-left ${
                    selectedStore === store.id
                      ? "bg-accent/10 border-accent/30 ring-1 ring-accent/20"
                      : "bg-surface/50 border-border hover:border-accent/20 hover:bg-surface-hover"
                  }`}
                >
                  <span className="text-2xl">{store.icon}</span>
                  <span className="text-sm font-medium text-foreground">{store.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Ready */}
        {step === 3 && (
          <div className="animate-slide-up text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-400/10 border border-emerald-400/20 mb-6">
              <Rocket className="h-8 w-8 text-emerald-400" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground mb-3">
              You&apos;re all set!
            </h1>
            <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto">
              Your dashboard is personalized. Here&apos;s what you can do first:
            </p>
            <div className="space-y-3 text-left max-w-sm mx-auto mb-8">
              <Link
                href="/products"
                onClick={handleFinish}
                className="flex items-center gap-3 p-3 rounded-xl bg-surface/50 border border-border hover:border-accent/20 hover:bg-surface-hover transition-all group"
              >
                <Search className="h-4 w-4 text-blue-400 shrink-0" />
                <span className="text-sm text-foreground group-hover:text-accent transition-colors">Search for winning products</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link
                href="/calculator"
                onClick={handleFinish}
                className="flex items-center gap-3 p-3 rounded-xl bg-surface/50 border border-border hover:border-accent/20 hover:bg-surface-hover transition-all group"
              >
                <DollarSign className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="text-sm text-foreground group-hover:text-accent transition-colors">Calculate your profit margins</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <Link
                href="/suppliers"
                onClick={handleFinish}
                className="flex items-center gap-3 p-3 rounded-xl bg-surface/50 border border-border hover:border-accent/20 hover:bg-surface-hover transition-all group"
              >
                <Target className="h-4 w-4 text-amber-400 shrink-0" />
                <span className="text-sm text-foreground group-hover:text-accent transition-colors">Find reliable suppliers</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          {step > 0 && step < 3 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={() => canNext() && setStep(step + 1)}
              disabled={!canNext()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition-all hover:shadow-[0_0_20px_rgba(var(--glow-color),0.3)] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition-all hover:shadow-[0_0_20px_rgba(var(--glow-color),0.3)] active:scale-[0.98] mx-auto"
            >
              <Rocket className="h-4 w-4" /> Go to Dashboard
            </button>
          )}
        </div>

        {/* Skip */}
        {step < 3 && (
          <button
            onClick={onComplete}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground mt-4 transition-colors"
          >
            Skip setup
          </button>
        )}
      </div>
    </div>
  );
}
