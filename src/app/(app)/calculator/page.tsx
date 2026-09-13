"use client";

import { Calculator } from "lucide-react";
import {
  DollarSign, Percent, Target, Truck, Globe, FileSearch,
  TrendingUp, RotateCcw, Package, BarChart3,
} from "lucide-react";
import { calculatorCategories } from "@/components/calculator/calculatorhub/hub-data";
import CalculatorCard from "@/components/calculator/CalculatorCard";

const iconMap: Record<string, typeof DollarSign> = {
  DollarSign, Percent, Target, Truck, Globe, FileSearch,
  TrendingUp, RotateCcw, Package, BarChart3,
};

export default function CalculatorHubPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Calculator className="h-7 w-7 text-accent" /> Calculator Suite
        </h1>
        <p className="text-muted-foreground">
          Every calculation you need to run a profitable dropshipping business.
        </p>
      </div>

      <div className="space-y-10">
        {calculatorCategories.map((category) => {
          const CategoryIcon = iconMap[category.icon] || Calculator;
          return (
            <div key={category.id}>
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-lg border"
                  style={{
                    backgroundColor: `${category.color}10`,
                    borderColor: `${category.color}30`,
                  }}
                >
                  <CategoryIcon className="h-4 w-4" style={{ color: category.color }} />
                </div>
                <div>
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    {category.label}
                  </h2>
                  <p className="text-xs text-muted-foreground">{category.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.calculators.map((calc) => (
                  <CalculatorCard key={calc.id} calculator={calc} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
