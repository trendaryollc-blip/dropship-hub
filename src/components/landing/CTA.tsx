import Link from "next/link";
import { ArrowRight, Sparkles, Brain, Target, Flame } from "lucide-react";

const pills = [
  { icon: Brain, label: "AI Daily Pick", href: "/dashboard" },
  { icon: Target, label: "Niche Radar", href: "/products/niches" },
  { icon: Sparkles, label: "Live Intelligence", href: "/dashboard" },
  { icon: Flame, label: "Trending Scores", href: "/products" },
];

export default function CTA() {
  return (
    <section className="relative py-24 md:py-32">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="mx-auto max-w-7xl px-6">
        <div className="relative glass rounded-3xl p-12 md:p-16 text-center overflow-hidden">
          <div className="absolute top-0 left-1/4 w-[400px] h-[300px] bg-accent/[0.06] rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-1/4 w-[300px] h-[200px] bg-accent-warm/[0.04] rounded-full blur-[80px]" />

          <div className="relative z-10">
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
              Your Next Winning Product is{" "}
              <span className="gradient-text">One Click Away</span>
            </h2>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              AI picks your winners. Radar finds your niches. Missions keep
              you sharp. Join thousands of dropshippers who moved from
              guesswork to data-driven decisions.
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
                className="group relative inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-white rounded-2xl bg-accent hover:bg-accent-hover transition-all hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] active:scale-[0.97]"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                <div className="absolute inset-0 rounded-2xl bg-accent/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              <p className="text-sm text-muted-foreground">
                Free forever — No credit card required
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
