"use client";

import { useInView } from "@/hooks/useInView";

const brands = [
  { name: "Amazon", width: "w-20" },
  { name: "AliExpress", width: "w-24" },
  { name: "eBay", width: "w-14" },
  { name: "Walmart", width: "w-22" },
  { name: "Shopify", width: "w-20" },
  { name: "CJ Dropshipping", width: "w-28" },
  { name: "Google Shopping", width: "w-28" },
  { name: "Alibaba", width: "w-22" },
];

export default function TrustBar() {
  const { ref, isInView } = useInView({ threshold: 0.2 });

  return (
    <section className="relative py-16 overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute inset-0 bg-accent/[0.02]" />

      <div className="mx-auto max-w-7xl px-6" ref={ref}>
        <div className={`text-center mb-10 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
          <p className="text-sm font-semibold text-accent uppercase tracking-widest mb-3">
            Integrated With
          </p>
          <p className="text-muted-foreground text-sm">
            Real-time data from the platforms you already use
          </p>
        </div>

        <div className="relative">
          {/* Gradient fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />

          {/* Scrolling brand row */}
          <div className="flex overflow-hidden">
            <div className={`flex items-center gap-12 whitespace-nowrap ${isInView ? "animate-scroll" : ""}`}>
              {[...brands, ...brands].map((brand, i) => (
                <div
                  key={`${brand.name}-${i}`}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl glass border border-border/50 hover:border-accent/20 transition-all cursor-default shrink-0"
                >
                  <div className="w-6 h-6 rounded bg-accent/10 flex items-center justify-center">
                    <span className="text-[10px] font-bold text-accent">{brand.name[0]}</span>
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">{brand.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
