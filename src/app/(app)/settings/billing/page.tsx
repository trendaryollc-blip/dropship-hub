"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAPI } from "@/hooks/useAPI";
import { useToast } from "@/components/ui/Toast";
import { authJson } from "@/lib/auth-headers";
import type { Subscription, BillingPlan, Invoice } from "@/lib/billing/types";

type UsageMap = Record<string, { used: number; limit: number | null; percentage: number }>;

const METRIC_LABELS: Record<string, string> = {
  ai_calls: "AI messages",
  api_calls: "API calls",
  webhook_calls: "Webhook events",
  products: "Products",
  store_pushes: "Store pushes",
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400",
  trialing: "bg-blue-500/10 text-blue-400",
  past_due: "bg-amber-500/10 text-amber-400",
  canceled: "bg-red-500/10 text-red-400",
  unpaid: "bg-red-500/10 text-red-400",
  incomplete: "bg-amber-500/10 text-amber-400",
};

export default function BillingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { error: toastError, info } = useToast();
  const [portalBusy, setPortalBusy] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("session_id")) setCheckoutSuccess(true);
  }, []);

  const ready = !loading && !!user;
  const { data: subData, mutate: mutateSub } = useAPI<{ subscription: Subscription | null; plan: BillingPlan }>(
    ready ? "/api/billing/subscription" : null
  );
  const { data: usageData } = useAPI<{ tier: string; usage: UsageMap }>(ready ? "/api/billing/usage" : null);
  const { data: invData } = useAPI<{ invoices: Invoice[] }>(ready ? "/api/billing/invoices?limit=10" : null);

  const sub = subData?.subscription ?? null;
  const plan = subData?.plan;
  const status = sub?.status ?? "active";

  const openPortal = async () => {
    setPortalBusy(true);
    try {
      const data = await authJson<{ url?: string }>("/api/billing/portal", {});
      if (data.url) window.location.href = data.url;
    } catch (e) {
      toastError(e instanceof Error ? e.message : "Could not open billing portal");
    } finally {
      setPortalBusy(false);
    }
  };

  if (ready && !subData) {
    return (
      <div className="max-w-3xl mx-auto px-4 pt-28 pb-24">
        <p className="text-sm text-muted-foreground">Loading billing…</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pt-28 pb-24 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Billing</h1>
          <p className="text-xs text-muted-foreground mt-1">Plan, usage, and invoices for your account.</p>
        </div>
        <Link
          href="/pricing"
          className="px-4 py-2 rounded-xl btn-accent text-sm font-semibold hover:shadow-[0_0_20px_rgba(var(--glow-color),0.3)] transition-all"
        >
          {sub ? "Change plan" : "Upgrade"}
        </Link>
      </div>

      {checkoutSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400">
          Checkout complete — your plan updates within a few seconds of Stripe confirming payment.
        </div>
      )}
      {!checkoutSuccess && sub?.cancelAtPeriodEnd && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-400">
          Your subscription is set to cancel
          {sub.currentPeriodEnd ? ` on ${new Date(sub.currentPeriodEnd).toLocaleDateString()}` : " at period end"}.
          You keep access until then.
        </div>
      )}
      {!checkoutSuccess && status === "past_due" && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
          Your last payment failed. Update your card in the billing portal to keep paid features.
        </div>
      )}

      {/* Current plan */}
      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">{plan?.name ?? "Free"}</h2>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${STATUS_STYLES[status] ?? STATUS_STYLES.active}`}>
                {(status ?? "active").toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {sub
                ? sub.currentPeriodEnd
                  ? `${sub.cancelAtPeriodEnd ? "Ends" : "Renews"} ${new Date(sub.currentPeriodEnd).toLocaleDateString()}`
                  : "Active subscription"
                : "Free plan — no credit card required."}
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              {sub
                ? `Stripe subscription ${sub.stripeSubscriptionId}`
                : "Upgrade any time from the pricing page."}
            </p>
          </div>
          {sub && (
            <button
              onClick={openPortal}
              disabled={portalBusy}
              className="px-3.5 py-2 rounded-xl border border-border text-xs font-semibold text-foreground hover:bg-surface transition-all disabled:opacity-50"
            >
              {portalBusy ? "Opening…" : "Manage billing"}
            </button>
          )}
        </div>
      </section>

      {/* Usage */}
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-foreground mb-4">Usage this period</h2>
        {usageData?.usage ? (
          <div className="space-y-4">
            {Object.entries(usageData.usage).map(([metric, u]) => {
              const label = METRIC_LABELS[metric] ?? metric;
              const unlimited = u.limit === null;
              const pct = unlimited ? 0 : u.percentage;
              return (
                <div key={metric}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-foreground">{label}</span>
                    <span className="text-muted-foreground">
                      {u.used.toLocaleString()} / {u.limit === null ? "Unlimited" : u.limit.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-surface-hover overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct >= 90 ? "bg-red-400" : pct >= 70 ? "bg-amber-400" : "bg-accent"}`}
                      style={{ width: `${unlimited ? 0 : Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Usage data unavailable right now.</p>
        )}
      </section>

      {/* Invoices */}
      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">Recent invoices</h2>
        {invData?.invoices?.length ? (
          <div className="divide-y divide-border/50">
            {invData.invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between py-2.5 text-xs">
                <div>
                  <span className="text-foreground">${(inv.amount / 100).toFixed(2)} {inv.currency.toUpperCase()}</span>
                  <span className="text-muted-foreground ml-2">
                    {new Date(inv.createdAt).toLocaleDateString()} · {inv.status}
                  </span>
                </div>
                {inv.invoiceUrl && (
                  <a href={inv.invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                    View
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {sub ? "No invoices yet — they appear after your first paid invoice." : "No invoices yet — you are on the Free plan."}
          </p>
        )}
      </section>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <button onClick={() => router.push("/settings")} className="hover:text-foreground transition-colors">
          ← Back to settings
        </button>
        <button onClick={() => { mutateSub(); info("Billing refreshed"); }} className="hover:text-foreground transition-colors">
          Refresh
        </button>
      </div>
    </div>
  );
}
