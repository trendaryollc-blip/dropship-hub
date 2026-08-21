const stats = [
  { value: "10+", label: "Platforms Connected", sublabel: "Amazon, AliExpress, eBay..." },
  { value: "50M+", label: "Products Indexed", sublabel: "Updated in real-time" },
  { value: "99.9%", label: "Calculation Accuracy", sublabel: "Precise to the cent" },
  { value: "Free", label: "To Get Started", sublabel: "No credit card required" },
];

export default function Stats() {
  return (
    <section className="relative py-24 md:py-32">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute inset-0 bg-accent/[0.02]" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="font-display text-4xl md:text-5xl font-bold gradient-text mb-2">
                {stat.value}
              </p>
              <p className="font-display text-sm font-semibold text-foreground mb-1">
                {stat.label}
              </p>
              <p className="text-xs text-muted-foreground">{stat.sublabel}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
