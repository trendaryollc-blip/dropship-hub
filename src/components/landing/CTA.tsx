"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, Brain, Target, Flame, Check, Loader2 } from "lucide-react";
import { track } from "@/lib/analytics";

const pills = [
  { icon: Brain, label: "Daily Pick", href: "/dashboard" },
  { icon: Target, label: "Niche Radar", href: "/products/niches" },
  { icon: Sparkles, label: "Market Intelligence", href: "/dashboard" },
  { icon: Flame, label: "Trending Scores", href: "/products" },
];

function EmailCaptureForm() {
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "saving" || !email.trim()) return;
    setStatus("saving");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "landing-cta", website: honeypot }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus("done");
        setEmail("");
        track("email_subscribed", { source: "landing-cta" });
      } else {
        setStatus("error");
        setMessage(data.error || "Could not subscribe — please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Could not subscribe — please try again.");
    }
  };

  if (status === "done") {
    return (
      <p className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-400">
        <Check className="h-4 w-4" /> You&apos;re on the list — we&apos;ll be in touch.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md mx-auto">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        aria-label="Email address"
        className="flex-1 w-full px-4 py-3 rounded-xl bg-surface/80 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50"
      />
      {/* Honeypot — hidden from humans, bots fill it */}
      <input
        type="text"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        placeholder="Website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />
      <button
        type="submit"
        disabled={status === "saving"}
        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold btn-accent transition-all active:scale-[0.97] disabled:opacity-60"
      >
        {status === "saving" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
        Notify me
      </button>
      {status === "error" && <p className="text-xs text-red-400 sm:absolute sm:mt-16">{message}</p>}
    </form>
  );
}

export default function CTA() {
  return (
    <section className="relative py-24 md:py-32">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="mx-auto max-w-7xl px-6">
        <div className="relative glass rounded-3xl p-6 sm:p-10 md:p-16 text-center overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[400px] h-[300px] bg-accent/[0.06] rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-1/4 w-[300px] h-[200px] bg-accent-warm/[0.04] rounded-full blur-[80px]" />

          <div className="relative z-10">
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
              Your Next Winning Product is{" "}
              <span className="gradient-text">One Click Away</span>
            </h2>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Data picks your winners. Radar finds your niches. Missions keep
              you sharp. Join dropshippers who moved from guesswork to
              data-driven decisions.
            </p>

            {/* Mini feature pills */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
              {pills.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-2 px-4 py-2 rounded-full glass border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-accent/20 transition-all"
                >
                  <item.icon className="h-3.5 w-3.5 text-accent" />
                  {item.label}
                </Link>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/sign-up"
                className="group relative inline-flex items-center gap-2 px-8 py-4 text-base font-semibold rounded-2xl btn-accent transition-all hover:shadow-[0_0_30px_rgba(var(--glow-color),0.4)] active:scale-[0.97]"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                <div className="absolute inset-0 rounded-2xl bg-accent/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <p className="text-sm text-muted-foreground">
                Free forever — No credit card required
              </p>
            </div>

            <div className="mt-8 pt-8 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-3">Not ready yet? Get product drops and growth tactics:</p>
              <EmailCaptureForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
