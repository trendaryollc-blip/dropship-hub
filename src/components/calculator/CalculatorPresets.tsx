"use client";

import { useState } from "react";
import { Zap, Store, Tag, Truck, ChevronDown, ChevronUp, Check } from "lucide-react";

interface PlatformPreset {
  id: string;
  name: string;
  icon: string;
  fee: number;
  extraFee?: string;
  color: string;
}

interface CategoryPreset {
  id: string;
  name: string;
  icon: string;
  avgCost: number;
  avgSellPrice: number;
  avgShipping: number;
}

interface ShippingPreset {
  id: string;
  name: string;
  route: string;
  avgDays: number;
  avgCost: number;
  weight: number;
}

const PLATFORM_PRESETS: PlatformPreset[] = [
  { id: "amazon-fba", name: "Amazon FBA", icon: "\ud83d\udce6", fee: 15, extraFee: "+$3.00/unit", color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  { id: "shopify", name: "Shopify", icon: "\ud83d\udced", fee: 2.9, extraFee: "+$0.30", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  { id: "ebay", name: "eBay", icon: "\ud83c\udff7\ufe0f", fee: 13, color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  { id: "walmart", name: "Walmart", icon: "\ud83c\udfea", fee: 15, color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  { id: "etsy", name: "Etsy", icon: "\ud83c\udfa8", fee: 6.5, extraFee: "+$0.20", color: "text-orange-400 bg-orange-400/10 border-orange-400/20" },
  { id: "woocommerce", name: "WooCommerce", icon: "\ud83d\udd27", fee: 0, extraFee: "Payment only", color: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
];

const CATEGORY_PRESETS: CategoryPreset[] = [
  { id: "electronics", name: "Electronics", icon: "\ud83d\udcbb", avgCost: 8, avgSellPrice: 35, avgShipping: 5 },
  { id: "fashion", name: "Fashion", icon: "\ud83d\udc57", avgCost: 5, avgSellPrice: 25, avgShipping: 4 },
  { id: "home-garden", name: "Home & Garden", icon: "\ud83c\udfe0", avgCost: 6, avgSellPrice: 28, avgShipping: 6 },
  { id: "beauty", name: "Beauty", icon: "\ud83d\udc84", avgCost: 3, avgSellPrice: 18, avgShipping: 3 },
  { id: "pet-supplies", name: "Pet Supplies", icon: "\ud83d\udc3e", avgCost: 4, avgSellPrice: 22, avgShipping: 4 },
  { id: "toys", name: "Toys & Games", icon: "\ud83c\udfaf", avgCost: 5, avgSellPrice: 24, avgShipping: 5 },
];

const SHIPPING_PRESETS: ShippingPreset[] = [
  { id: "epacket-us", name: "ePacket to US", route: "China \u2192 US", avgDays: 15, avgCost: 3.5, weight: 0.3 },
  { id: "aliexpress-standard", name: "AliExpress Standard", route: "China \u2192 US", avgDays: 20, avgCost: 2.8, weight: 0.5 },
  { id: "amazon-fba-inbound", name: "Amazon FBA Inbound", route: "China \u2192 FBA", avgDays: 30, avgCost: 1.5, weight: 1.0 },
  { id: "express-dhl", name: "DHL Express", route: "China \u2192 US", avgDays: 5, avgCost: 12, weight: 0.5 },
  { id: "sea-freight", name: "Sea Freight", route: "China \u2192 US", avgDays: 45, avgCost: 0.8, weight: 5.0 },
];

interface CalculatorPresetsProps {
  activeTab: string;
  onApplyPlatformFee: (fee: number) => void;
  onApplyCategory: (cost: number, price: number, shipping: number) => void;
  onApplyShipping: (shipping: number, weight: number) => void;
}

export default function CalculatorPresets({
  activeTab,
  onApplyPlatformFee,
  onApplyCategory,
  onApplyShipping,
}: CalculatorPresetsProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>("platforms");
  const [appliedPreset, setAppliedPreset] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleApplyPlatform = (preset: PlatformPreset) => {
    onApplyPlatformFee(preset.fee);
    setAppliedPreset(preset.id);
    setTimeout(() => setAppliedPreset(null), 1500);
  };

  const handleApplyCategory = (preset: CategoryPreset) => {
    onApplyCategory(preset.avgCost, preset.avgSellPrice, preset.avgShipping);
    setAppliedPreset(preset.id);
    setTimeout(() => setAppliedPreset(null), 1500);
  };

  const handleApplyShipping = (preset: ShippingPreset) => {
    onApplyShipping(preset.avgCost, preset.weight);
    setAppliedPreset(preset.id);
    setTimeout(() => setAppliedPreset(null), 1500);
  };

  const sections = [
    {
      id: "platforms",
      label: "Platform Fees",
      icon: Store,
      showOn: ["profit", "landed"],
    },
    {
      id: "categories",
      label: "Product Categories",
      icon: Tag,
      showOn: ["profit", "margin"],
    },
    {
      id: "shipping",
      label: "Shipping Routes",
      icon: Truck,
      showOn: ["shipping", "profit"],
    },
  ];

  const visibleSections = sections.filter((s) => s.showOn.includes(activeTab));

  if (visibleSections.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-4 space-y-2">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="h-4 w-4 text-accent" />
        <span className="text-sm font-semibold text-foreground">Quick Presets</span>
      </div>

      {visibleSections.map((section) => (
        <div key={section.id}>
          <button
            onClick={() => toggleSection(section.id)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-surface/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <section.icon className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">{section.label}</span>
            </div>
            {expandedSection === section.id ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>

          {expandedSection === section.id && (
            <div className="px-2 pb-2 space-y-1.5">
              {section.id === "platforms" && PLATFORM_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleApplyPlatform(preset)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all ${
                    appliedPreset === preset.id
                      ? "bg-emerald-400/10 border border-emerald-400/20 text-emerald-400"
                      : "bg-surface/50 border border-transparent hover:border-accent/20 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="text-sm">{preset.icon}</span>
                  <span className="flex-1 text-left font-medium">{preset.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${preset.color}`}>
                    {preset.fee}%
                  </span>
                  {preset.extraFee && (
                    <span className="text-[9px] text-muted-foreground">{preset.extraFee}</span>
                  )}
                  {appliedPreset === preset.id && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                </button>
              ))}

              {section.id === "categories" && CATEGORY_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleApplyCategory(preset)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all ${
                    appliedPreset === preset.id
                      ? "bg-emerald-400/10 border border-emerald-400/20 text-emerald-400"
                      : "bg-surface/50 border border-transparent hover:border-accent/20 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="text-sm">{preset.icon}</span>
                  <span className="flex-1 text-left font-medium">{preset.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    ~${preset.avgCost} cost / ${preset.avgSellPrice} sell
                  </span>
                  {appliedPreset === preset.id && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                </button>
              ))}

              {section.id === "shipping" && SHIPPING_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleApplyShipping(preset)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all ${
                    appliedPreset === preset.id
                      ? "bg-emerald-400/10 border border-emerald-400/20 text-emerald-400"
                      : "bg-surface/50 border border-transparent hover:border-accent/20 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="flex-1 text-left">
                    <span className="font-medium">{preset.name}</span>
                    <span className="text-[9px] text-muted-foreground ml-1.5">{preset.route}</span>
                  </span>
                  <span className="text-[10px] text-muted-foreground">{preset.avgDays}d</span>
                  <span className="text-[10px] font-mono font-medium">${preset.avgCost}</span>
                  {appliedPreset === preset.id && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
