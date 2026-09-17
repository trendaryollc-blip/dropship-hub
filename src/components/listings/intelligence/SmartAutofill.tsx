"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Wand2, Loader2, RefreshCw } from "lucide-react";
import type { SmartAutofillSuggestion } from "@/types/listing-intelligence";

interface SmartAutofillProps {
  title: string;
  description: string;
  price: string;
  category: string;
  onSuggestion: (field: string, value: string) => void;
}

const CATEGORY_SUGGESTIONS: Record<string, { specs: Record<string, string>; audience: string; tags: string[] }> = {
  electronics: {
    specs: { "Connectivity": "Bluetooth 5.0", "Battery Life": "8 hours", "Weight": "50g", "Waterproof": "IPX4" },
    audience: "Tech enthusiasts, professionals",
    tags: ["wireless", "bluetooth", "portable", "tech", "gadget"],
  },
  clothing: {
    specs: { Material: "100% Cotton", Size: "S/M/L/XL", Care: "Machine washable", Origin: "Imported" },
    audience: "Fashion-conscious buyers",
    tags: ["fashion", "trendy", "comfortable", "stylish"],
  },
  home: {
    specs: { Dimensions: '12" x 8" x 6"', Material: "ABS Plastic", Weight: "1.2 lbs", Assembly: "Required" },
    audience: "Homeowners, renters",
    tags: ["home", "kitchen", "decor", "organization"],
  },
  beauty: {
    specs: { "Skin Type": "All skin types", Size: "100ml", "Shelf Life": "24 months", Ingredients: "Natural" },
    audience: "Beauty enthusiasts",
    tags: ["beauty", "skincare", "natural", "organic"],
  },
  sports: {
    specs: { "Sport Type": "Multi-sport", Material: "Polyester", "Size Range": "One size", "Care": "Hand wash" },
    audience: "Athletes, fitness enthusiasts",
    tags: ["fitness", "sports", "outdoor", "active"],
  },
};

function generateSpecSuggestions(title: string, category: string): SmartAutofillSuggestion[] {
  const suggestions: SmartAutofillSuggestion[] = [];
  const lower = `${title} ${category}`.toLowerCase();

  const categoryKey = Object.keys(CATEGORY_SUGGESTIONS).find((k) => lower.includes(k)) || "electronics";
  const catData = CATEGORY_SUGGESTIONS[categoryKey];

  for (const [key, value] of Object.entries(catData.specs)) {
    if (!lower.includes(key.toLowerCase())) {
      suggestions.push({
        field: `spec:${key}`,
        value,
        confidence: 0.75,
        source: "pattern",
      });
    }
  }

  if (!category) {
    suggestions.push({
      field: "category",
      value: categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1),
      confidence: 0.6,
      source: "ai",
    });
  }

  return suggestions;
}

function generateTitleSuggestions(title: string): SmartAutofillSuggestion[] {
  const suggestions: SmartAutofillSuggestion[] = [];
  if (title.length < 20) {
    suggestions.push({
      field: "title",
      value: `Premium ${title} - High Quality, Fast Shipping`,
      confidence: 0.5,
      source: "ai",
    });
  }
  if (!title.toLowerCase().includes("gift") && title.length > 0) {
    suggestions.push({
      field: "title",
      value: `${title} - Perfect Gift Idea`,
      confidence: 0.4,
      source: "competitor",
    });
  }
  return suggestions;
}

export default function SmartAutofill({ title, description, price: _price, category, onSuggestion }: SmartAutofillProps) {
  const [suggestions, setSuggestions] = useState<SmartAutofillSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const generateSuggestions = useCallback(() => {
    if (!title.trim()) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    const allSuggestions: SmartAutofillSuggestion[] = [];

    allSuggestions.push(...generateTitleSuggestions(title));
    allSuggestions.push(...generateSpecSuggestions(title, category));

    if (!description && title) {
      allSuggestions.push({
        field: "description",
        value: `High-quality ${title} designed for everyday use. Features premium materials and modern design. Perfect for personal use or as a gift.`,
        confidence: 0.5,
        source: "ai",
      });
    }

    setSuggestions(allSuggestions.filter((s) => s.confidence >= 0.4));
    setLoading(false);
  }, [title, description, category]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(generateSuggestions, 800);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [generateSuggestions]);

  if (suggestions.length === 0 && !loading) return null;

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-400/10 flex items-center justify-center">
            <Wand2 className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">Smart Suggestions</p>
            <p className="text-[10px] text-muted-foreground">AI-powered autofill ideas</p>
          </div>
        </div>
        <button onClick={generateSuggestions} className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors">
          <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => {
                const field = s.field.startsWith("spec:") ? "specification" : s.field;
                const value = s.field.startsWith("spec:") ? `${s.field.replace("spec:", "")}: ${s.value}` : s.value;
                onSuggestion(field, value);
              }}
              className="w-full glass rounded-xl p-2.5 text-left hover:border-accent/20 transition-all group"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-[10px] font-semibold text-accent uppercase">{s.field.replace("spec:", "")}</span>
                <span className={`text-[8px] px-1.5 py-0.5 rounded ${s.source === "ai" ? "bg-purple-500/10 text-purple-400" : s.source === "competitor" ? "bg-blue-500/10 text-blue-400" : "bg-emerald-500/10 text-emerald-400"}`}>
                  {s.source}
                </span>
              </div>
              <p className="text-[10px] text-foreground line-clamp-2">{s.value}</p>
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-1">
                  <div className="h-1 w-12 rounded-full bg-surface overflow-hidden">
                    <div className="h-full bg-accent rounded-full" style={{ width: `${s.confidence * 100}%` }} />
                  </div>
                  <span className="text-[8px] text-muted-foreground">{Math.round(s.confidence * 100)}%</span>
                </div>
                <span className="text-[9px] text-accent opacity-0 group-hover:opacity-100 transition-opacity">Click to apply</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
