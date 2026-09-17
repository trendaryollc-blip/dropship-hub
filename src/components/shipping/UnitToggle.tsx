"use client";

interface UnitToggleProps {
  weightUnit: "kg" | "lbs";
  onWeightUnitChange: (unit: "kg" | "lbs") => void;
  dimensionUnit: "cm" | "in";
  onDimensionUnitChange: (unit: "cm" | "in") => void;
}

export default function UnitToggle({ weightUnit, onWeightUnitChange, dimensionUnit, onDimensionUnitChange }: UnitToggleProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Weight Unit */}
      <div className="flex items-center gap-0.5 bg-surface rounded-lg p-0.5 border border-white/5">
        <button
          onClick={() => onWeightUnitChange("kg")}
          className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
            weightUnit === "kg" ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          kg
        </button>
        <button
          onClick={() => onWeightUnitChange("lbs")}
          className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
            weightUnit === "lbs" ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          lbs
        </button>
      </div>

      {/* Dimension Unit */}
      <div className="flex items-center gap-0.5 bg-surface rounded-lg p-0.5 border border-white/5">
        <button
          onClick={() => onDimensionUnitChange("cm")}
          className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
            dimensionUnit === "cm" ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          cm
        </button>
        <button
          onClick={() => onDimensionUnitChange("in")}
          className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
            dimensionUnit === "in" ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          in
        </button>
      </div>
    </div>
  );
}

export function convertWeight(value: number, from: "kg" | "lbs"): number {
  return from === "lbs" ? value * 2.20462 : value / 2.20462;
}

export function convertDimension(value: number, from: "cm" | "in"): number {
  return from === "in" ? value * 0.393701 : value / 0.393701;
}
