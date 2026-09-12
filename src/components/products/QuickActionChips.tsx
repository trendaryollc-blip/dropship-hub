"use client";

import { useRouter } from "next/navigation";
import { Sparkles, Search, Check, FileText, BarChart3, TrendingUp, Truck, GitCompare, Bell } from "lucide-react";

interface Product {
  id: string;
  title: string;
  price: number | null;
  image: string | null;
  link: string;
  source: string;
  rating?: number;
  reviews?: number;
  [key: string]: unknown;
}

interface QuickAction {
  id: string;
  label: string;
  icon: typeof Sparkles;
  color: string;
  bg: string;
  action?: "compare" | "alert" | "navigate";
  destination?: string;
}

interface QuickActionChipsProps {
  query: string;
  onAction: (prompt: string) => void;
  disabled?: boolean;
  hasResults?: boolean;
  compareMode?: boolean;
  toggleCompareMode?: () => void;
  onCreateAlert?: () => void;
  selectedProduct?: Product | null;
}

const ACTIONS: QuickAction[] = [
  {
    id: "validate",
    label: "Validate Products",
    icon: Check,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10 border-emerald-400/20",
    action: "navigate",
    destination: "/product-validation",
  },
  {
    id: "find-suppliers",
    label: "Find Suppliers",
    icon: Truck,
    color: "text-blue-400",
    bg: "bg-blue-400/10 border-blue-400/20",
    action: "navigate",
    destination: "/suppliers",
  },
  {
    id: "generate-listing",
    label: "Generate Listings",
    icon: FileText,
    color: "text-violet-400",
    bg: "bg-violet-400/10 border-violet-400/20",
    action: "navigate",
    destination: "/product-listings",
  },
  {
    id: "analyze-market",
    label: "Market Analysis",
    icon: BarChart3,
    color: "text-amber-400",
    bg: "bg-amber-400/10 border-amber-400/20",
    action: "navigate",
    destination: "/competitors",
  },
  {
    id: "find-similar",
    label: "Find Similar",
    icon: Search,
    color: "text-cyan-400",
    bg: "bg-cyan-400/10 border-cyan-400/20",
    action: "navigate",
    destination: "/products",
  },
  {
    id: "profit-calc",
    label: "Calculate Profit",
    icon: TrendingUp,
    color: "text-emerald-400",
    bg: "bg-emerald-400/10 border-emerald-400/20",
    action: "navigate",
    destination: "/calculator",
  },
  {
    id: "compare",
    label: "Compare Products",
    icon: GitCompare,
    color: "text-blue-400",
    bg: "bg-blue-400/10 border-blue-400/20",
    action: "compare",
  },
  {
    id: "alert",
    label: "Create Alert",
    icon: Bell,
    color: "text-amber-400",
    bg: "bg-amber-400/10 border-amber-400/20",
    action: "alert",
  },
];

function buildProductParams(product: Product, destination: string): string {
  const params = new URLSearchParams();

  if (destination === "/product-validation") {
    if (product.title) params.set("productTitle", product.title);
    if (product.price != null) params.set("currentPrice", String(product.price));
    if (product.image) params.set("productImage", product.image);
    if (product.link) params.set("productUrl", product.link);
    if (product.source) params.set("category", product.source);
  } else if (destination === "/suppliers") {
    if (product.title) params.set("product", product.title);
    if (product.source) params.set("source", product.source);
    if (product.price != null) params.set("price", String(product.price));
    if (product.image) params.set("img", product.image);
  } else if (destination === "/product-listings") {
    if (product.title) params.set("title", product.title);
    if (product.price != null) params.set("price", String(product.price));
    if (product.source) params.set("category", product.source);
    if (product.link) params.set("description", `Product from ${product.source}: ${product.title}`);
  } else if (destination === "/competitors") {
    if (product.title) params.set("q", product.title);
  } else if (destination === "/products") {
    if (product.title) params.set("q", product.title);
  } else if (destination === "/calculator") {
    if (product.title) params.set("title", product.title);
    if (product.price != null) params.set("cost", String(product.price));
  }

  return params.toString();
}

export default function QuickActionChips({
  query, onAction, disabled, hasResults, compareMode, toggleCompareMode,
  onCreateAlert, selectedProduct,
}: QuickActionChipsProps) {
  const router = useRouter();

  if (!query) return null;

  const handleAction = (action: QuickAction) => {
    if (action.action === "compare" && toggleCompareMode) {
      toggleCompareMode();
      return;
    }
    if (action.action === "alert" && onCreateAlert) {
      onCreateAlert();
      return;
    }
    if (action.action === "navigate" && action.destination && selectedProduct) {
      const paramString = buildProductParams(selectedProduct, action.destination);
      router.push(`${action.destination}?${paramString}`);
      return;
    }
  };

  const needsProduct = (action: QuickAction) => {
    return action.action === "navigate" && !selectedProduct;
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground font-medium">Quick AI Actions</span>
        {selectedProduct && (
          <span className="text-[10px] text-accent font-medium ml-1 truncate max-w-[200px]">
            for &ldquo;{selectedProduct.title}&rdquo;
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {ACTIONS.map((action) => {
          if ((action.id === "compare" || action.id === "alert") && !hasResults) return null;

          const isCompareActive = action.id === "compare" && compareMode;
          const missingProduct = needsProduct(action);

          return (
            <button
              key={action.id}
              onClick={() => handleAction(action)}
              disabled={disabled || missingProduct}
              title={missingProduct ? "Select a product first" : undefined}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 ${isCompareActive ? "bg-accent/15 text-accent border-accent/25" : action.bg} ${action.color}`}
            >
              <action.icon className="h-3 w-3" />
              {action.id === "compare" && compareMode ? "Exit Compare" : action.label}
            </button>
          );
        })}
      </div>
      {!selectedProduct && hasResults && (
        <p className="text-[10px] text-muted-foreground/50">Select a product card to enable actions</p>
      )}
    </div>
  );
}
