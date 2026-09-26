"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAPI } from "@/hooks/useAPI";
import { authJson } from "@/lib/auth-headers";
import { track } from "@/lib/analytics";
import { BILLING_PLANS, type BillingTier } from "@/lib/billing/types";

function priceLabel(priceMonthly: number, priceYearly: number, interval: "month" | "year") {
  if (priceMonthly === 0) return { price: "$0", suffix: "forever" };
  if (interval === "year") {
    const perMonth = Math.round(priceYearly / 12);
    return { price: `$${perMonth}`, suffix: `/mo billed $${priceYearly}/yr` };
  }
  return { price: `$${priceMonthly}`, suffix: "/month" };
}

const LIMIT_ROWS: { label: string; key: keyof (typeof BILLING_PLANS)[0]["limits"] }[] = [
  { label: "Products", key: "maxProducts" },
  { label: "Store connections", key: "maxStores" },
  { label: "API calls / month", key: "maxApiCalls" },
  { label: "AI chat messages / month", key: "maxAiCalls" },
  { label: "Outgoing webhooks", key: "maxWebhooks" },
  { label: "Team members", key: "maxTeamMembers" },
];

function limitValue(v: number): string {
  return v === -1 ? "Unlimited" : v.toLocaleString();
}

export default function PricingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [checkoutTier, setCheckoutTier] = useState<BillingTier | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const { data: subData } = useAPI<{ plan?: { tier: BillingTier } }>(
    !loading && user ? "/api/billing/subscription" : null
  );
  const currentTier = user ? (subData?.plan?.tier ?? "free") : null;

  const handleSelect = async (tier: BillingTier) => {
    setCheckoutError(null);
    if (tier === "free") {
      router.push(user ? "/dashboard" : "/sign-up");
      return;
    }
    if (!user) {
      router.push(`/sign-up?callbackUrl=${encodeURIComponent("/pricing")}`);
      return;
    }
    setCheckoutTier(tier);
    track("checkout_started", { tier, interval });
    try {
      const data = await authJson<{ url?: string }>("/api/billing/checkout", { tier, interval });
      if (data.url) window.location.assign(data.url);
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : "Could not start checkout");
    } finally {
      setCheckoutTier(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-6 pt-32 pb-24">
      <div className="text-center mb-12">
        <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-4">
          Simple, transparent <span className="text-accent">pricing</span>
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto">
          Start free. Upgrade when your business grows. Cancel anytime from your billing settings.
        </p>

        <div className="inline-flex items-center gap-1 mt-8 p-1 rounded-xl bg-surface border border-border">
          {(["month", "year"] as const).map((iv) => (
            <button
              key={iv}
              onClick={() => setInterval(iv)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                interval === iv ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {iv === "month" ? "Monthly" : "Yearly"}
              {iv === "year" && <span className="ml-1.5 text-[10px] opacity-80">save ~17%</span>}
            </button>
          ))}
        </div>

        {checkoutError && (
          <p className="mt-4 text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 inline-block">
            {checkoutError}
          </p>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {BILLING_PLANS.map((plan) => {
          const isCurrent = currentTier === plan.tier;
          const isPopular = plan.tier === "pro";
          const { price, suffix } = priceLabel(plan.priceMonthly, plan.priceYearly, interval);
          return (
            <div
              key={plan.tier}
              className={`relative rounded-2xl border p-6 flex flex-col transition-all ${
                isPopular
                  ? "border-accent/60 bg-surface shadow-[0_0_40px_rgba(var(--glow-color),0.08)]"
                  : "border-border bg-surface/60"
              }`}
            >
              {isPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-accent text-white text-[10px] font-bold tracking-wide">
                  MOST POPULAR
                </span>
              )}
              {isCurrent && (
                <span className="absolute top-4 right-4 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                  CURRENT PLAN
                </span>
              )}

              <h2 className="font-display text-lg font-bold text-foreground">{plan.name}</h2>
              <p className="text-xs text-muted-foreground mt-1 mb-5 min-h-[2rem]">{plan.description}</p>

              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="font-display text-4xl font-bold text-foreground">{price}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mb-6">{suffix}</p>

              <ul className="space-y-2.5 mb-7 flex-1">
                {plan.features.map((f) => (
                  <li key={f.name} className="flex items-start gap-2 text-xs text-foreground">
                    <Check className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${f.included ? "text-emerald-400" : "text-muted-foreground"}`} />
                    <span className={f.included ? "" : "text-muted-foreground line-through"}>
                      {f.name}
                      {typeof f.limit === "number" && ` (${f.limit.toLocaleString()}/mo)`}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelect(plan.tier)}
                disabled={checkoutTier !== null || isCurrent}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-60 ${
                  isPopular && !isCurrent
                    ? "btn-accent hover:shadow-[0_0_20px_rgba(var(--glow-color),0.3)] active:scale-[0.97]"
                    : "border border-border text-foreground hover:bg-surface"
                }`}
              >
                {checkoutTier === plan.tier ? (
                  <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Redirecting…</span>
                ) : isCurrent ? (
                  "Your plan"
                ) : plan.tier === "free" ? (
                  user ? "Go to Dashboard" : "Get Started Free"
                ) : (
                  <>
                    Upgrade to {plan.name}
                    <Sparkles className="inline h-3.5 w-3.5 ml-1 -mt-0.5" />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Limits comparison */}
      <div className="mt-16 overflow-x-auto">
        <table className="w-full text-xs min-w-[540px]">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 pr-4 font-semibold text-muted-foreground">Limits</th>
              {BILLING_PLANS.map((p) => (
                <th key={p.tier} className="text-center py-3 px-4 font-semibold text-foreground">{p.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LIMIT_ROWS.map((row) => (
              <tr key={row.key} className="border-b border-border/50">
                <td className="py-3 pr-4 text-muted-foreground">{row.label}</td>
                {BILLING_PLANS.map((p) => (
                  <td key={p.tier} className="text-center py-3 px-4 text-foreground">
                    {limitValue(p.limits[row.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-12 grid sm:grid-cols-3 gap-4 text-center">
        {[
          ["Cancel anytime", "Manage or cancel in Settings → Billing. Access continues until the period ends."],
          ["Secure payments", "Payments are processed by Stripe. Card details never touch our servers."],
          ["No hidden fees", "The price you see is the price you pay. Taxes calculated at checkout where applicable."],
        ].map(([title, body]) => (
          <div key={title} className="p-4 rounded-xl bg-surface/60 border border-border">
            <p className="text-xs font-semibold text-foreground mb-1">{title}</p>
            <p className="text-[11px] text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        Questions about plans?{" "}
        <Link href="/sign-up" className="text-accent hover:underline">Create a free account</Link> and reach out from settings — or start free and upgrade later.
      </p>
    </div>
  );
}
