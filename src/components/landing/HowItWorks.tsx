import { Search, Settings, Rocket } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Search,
    title: "Search & Discover",
    description:
      "Enter a product keyword or niche. Our engine searches across 10+ platforms and supplier networks to find the best matches with real-time pricing data.",
    color: "text-accent",
    bg: "bg-accent/10",
    border: "border-accent/20",
  },
  {
    number: "02",
    icon: Settings,
    title: "Analyze & Calculate",
    description:
      "Get instant profit calculations, supplier reliability scores, competitor analysis, and AI-powered recommendations. Know exactly what will sell and at what price.",
    color: "text-accent-warm",
    bg: "bg-accent-warm/10",
    border: "border-accent-warm/20",
  },
  {
    number: "03",
    icon: Rocket,
    title: "Launch & Scale",
    description:
      "Push winning products directly to your Shopify or WooCommerce store with one click. Automate pricing, inventory sync, and order fulfillment.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 md:py-32">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <p className="text-sm font-semibold text-accent uppercase tracking-widest mb-4">
            How It Works
          </p>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
            From Idea to{" "}
            <span className="gradient-text">Profit in 3 Steps</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            No complex setup. No learning curve. Just search, analyze, and
            launch your next winning product in minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[calc(50%+80px)] right-[calc(-50%+80px)] h-px bg-gradient-to-r from-border via-border to-transparent" />
              )}

              <div className="glass rounded-2xl p-8 text-center relative">
                {/* Step number */}
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-background border border-border text-xs font-mono text-muted-foreground">
                  {step.number}
                </div>

                <div
                  className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${step.bg} border ${step.border} mb-6 mt-4`}
                >
                  <step.icon className={`h-8 w-8 ${step.color}`} />
                </div>

                <h3 className="font-display text-xl font-semibold text-foreground mb-3">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
