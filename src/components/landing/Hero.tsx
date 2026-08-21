import Link from "next/link";
import {
  ArrowRight,
  Search,
  TrendingUp,
  DollarSign,
  BarChart3,
} from "lucide-react";

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 grid-pattern" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-accent/[0.07] rounded-full blur-[120px]" />
      <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-accent-warm/[0.04] rounded-full blur-[100px]" />

      <div className="relative mx-auto max-w-7xl px-6">
        {/* Announcement badge */}
        <div className="animate-slide-up flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-accent/20 text-xs font-medium text-accent">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            Now in Early Access — Join 2,000+ dropshippers
          </div>
        </div>

        {/* Headline */}
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="animate-slide-up font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            <span className="text-foreground">The Only Tool</span>
            <br />
            <span className="gradient-text">Dropshippers Need</span>
          </h1>

          <p className="animate-slide-up-delay-1 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Find winning products, compare suppliers, calculate real-time
            profits, and outsmart competitors — all from one dashboard. Built
            for modern ecommerce sellers.
          </p>

          {/* CTA buttons */}
          <div className="animate-slide-up-delay-2 flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/sign-up"
              className="group relative inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-white rounded-2xl bg-accent hover:bg-accent-hover transition-all hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] active:scale-[0.97]"
            >
              Start For Free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              <div className="absolute inset-0 rounded-2xl bg-accent/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex items-center gap-2 px-8 py-4 text-base font-medium text-muted-foreground hover:text-foreground rounded-2xl border border-border hover:border-muted-foreground/30 hover:bg-surface transition-all"
            >
              See How It Works
            </Link>
          </div>
        </div>

        {/* Floating feature cards */}
        <div className="animate-slide-up-delay-3 relative max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[
              {
                icon: Search,
                label: "Product Search",
                desc: "Across 10+ platforms",
                color: "text-accent",
                bg: "bg-accent/10",
              },
              {
                icon: TrendingUp,
                label: "Supplier Finder",
                desc: "Reliability scored",
                color: "text-emerald-400",
                bg: "bg-emerald-400/10",
              },
              {
                icon: DollarSign,
                label: "Profit Calculator",
                desc: "Real-time margins",
                color: "text-amber-400",
                bg: "bg-amber-400/10",
              },
              {
                icon: BarChart3,
                label: "Competitor Intel",
                desc: "Stay ahead",
                color: "text-purple-400",
                bg: "bg-purple-400/10",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="group glass rounded-2xl p-4 md:p-5 hover:border-accent/20 transition-all hover:bg-surface-hover cursor-default"
              >
                <div
                  className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${item.bg} mb-3`}
                >
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                </div>
                <p className="font-display text-sm font-semibold text-foreground mb-1">
                  {item.label}
                </p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Glow behind cards */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-16 bg-accent/[0.06] blur-[60px] rounded-full" />
        </div>
      </div>
    </section>
  );
}
