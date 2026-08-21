import {
  Search,
  Truck,
  Calculator,
  BarChart3,
  Brain,
  Store,
  Globe,
  Shield,
  Zap,
  LineChart,
  Users,
  Layers,
} from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Product Discovery",
    description:
      "Search millions of products across Amazon, AliExpress, eBay, Walmart, and more. Filter by price, rating, margin potential, and trend score.",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "hover:border-blue-400/20",
  },
  {
    icon: Truck,
    title: "Supplier Intelligence",
    description:
      "Every supplier scored on reliability, shipping speed, and trustworthiness. See real reviews, delivery times, and dispute rates before you commit.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "hover:border-emerald-400/20",
  },
  {
    icon: Calculator,
    title: "Profit Calculator",
    description:
      "Real-time profit margins, shipping costs, platform fees, and ROI all calculated instantly. Know your numbers before you sell.",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "hover:border-amber-400/20",
  },
  {
    icon: BarChart3,
    title: "Competitor Analysis",
    description:
      "See what your competitors sell, their pricing strategy, review volume, and estimated revenue. Find gaps they are missing.",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    border: "hover:border-purple-400/20",
  },
  {
    icon: Brain,
    title: "AI Assistant",
    description:
      "Get product recommendations, niche suggestions, and profit optimization tips powered by multiple AI providers with automatic fallback.",
    color: "text-pink-400",
    bg: "bg-pink-400/10",
    border: "hover:border-pink-400/20",
  },
  {
    icon: Store,
    title: "Store Integration",
    description:
      "Connect Shopify, WooCommerce, or any store. Push products directly, sync inventory, and manage everything from one place.",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
    border: "hover:border-cyan-400/20",
  },
  {
    icon: Globe,
    title: "Multi-Platform Pricing",
    description:
      "Compare product prices across every major platform in real-time. Find the best sourcing price and maximize your margin.",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "hover:border-orange-400/20",
  },
  {
    icon: Shield,
    title: "Risk Assessment",
    description:
      "AI-powered product risk scoring based on competition level, market saturation, supplier reliability, and trend stability.",
    color: "text-red-400",
    bg: "bg-red-400/10",
    border: "hover:border-red-400/20",
  },
  {
    icon: Zap,
    title: "Trend Detection",
    description:
      "Spot trending products before everyone else. Track social media signals, search volume changes, and sales velocity in real-time.",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    border: "hover:border-yellow-400/20",
  },
  {
    icon: LineChart,
    title: "Profitability Forecasting",
    description:
      "Predict future product profitability using historical data, seasonal trends, and market analysis. Plan your inventory with confidence.",
    color: "text-teal-400",
    bg: "bg-teal-400/10",
    border: "hover:border-teal-400/20",
  },
  {
    icon: Users,
    title: "Market Insights",
    description:
      "Understand your market with demographics, buying patterns, geographic demand, and customer behavior analytics.",
    color: "text-indigo-400",
    bg: "bg-indigo-400/10",
    border: "hover:border-indigo-400/20",
  },
  {
    icon: Layers,
    title: "Bulk Operations",
    description:
      "Import, export, and manage thousands of products at once. Bulk pricing updates, inventory sync, and one-click store pushes.",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    border: "hover:border-violet-400/20",
  },
];

export default function Features() {
  return (
    <section id="features" className="relative py-24 md:py-32">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center max-w-3xl mx-auto mb-16 md:mb-20">
          <p className="text-sm font-semibold text-accent uppercase tracking-widest mb-4">
            Features
          </p>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
            Everything You Need to{" "}
            <span className="gradient-text">Dominate Dropshipping</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Stop juggling 10 different tools. DropShip Hub combines product
            research, supplier analysis, profit calculations, and competitor
            intelligence into one seamless platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature) => (
            <div
              key={feature.title}
              className={`group glass rounded-2xl p-6 transition-all duration-300 ${feature.border} hover:bg-surface-hover cursor-default`}
            >
              <div
                className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${feature.bg} mb-4`}
              >
                <feature.icon className={`h-6 w-6 ${feature.color}`} />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
